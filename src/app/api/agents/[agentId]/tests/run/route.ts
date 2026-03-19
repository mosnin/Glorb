import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { runAgent } from "@/lib/ai/agent-runtime";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { agentId } = await params;
  const body = await req.json();
  const testCaseIds: string[] = body.test_case_ids || [];
  const supabase = await createServerSupabaseClient();
  const adminSupabase = createAdminSupabaseClient();

  // Load test cases
  const { data: testCases } = await supabase
    .from("agent_test_cases")
    .select("*")
    .eq("agent_id", agentId)
    .in("id", testCaseIds);

  if (!testCases || testCases.length === 0) {
    return new Response(JSON.stringify({ error: "No test cases found" }), { status: 404 });
  }

  // Create test run
  const { data: run } = await supabase
    .from("agent_test_runs")
    .insert({
      agent_id: agentId,
      user_id: userId,
      status: "running",
      total_cases: testCases.length,
    })
    .select()
    .single();

  if (!run) return new Response("Failed to create test run", { status: 500 });

  // Create pending results
  for (const tc of testCases) {
    await supabase.from("agent_test_results").insert({
      run_id: run.id,
      test_case_id: tc.id,
      status: "pending",
    });
  }

  // Stream results via SSE
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      send({ type: "run_started", run_id: run.id, total: testCases.length });

      let passed = 0;
      let failed = 0;

      for (const tc of testCases) {
        send({ type: "test_started", test_case_id: tc.id, name: tc.name });

        const startTime = Date.now();
        let response = "";
        let status: "passed" | "failed" | "error" = "passed";

        try {
          // Run the agent with the test input
          for await (const event of runAgent({ agentId, userMessage: tc.input_message })) {
            if (event.type === "text" && event.content) {
              response += event.content;
            }
            if (event.type === "error") {
              status = "error";
              response = event.error || "Unknown error";
              break;
            }
          }

          // Mark as passed if we got a non-empty response without errors
          if (status !== "error") {
            status = response.trim().length > 0 ? "passed" : "failed";
          }
        } catch {
          status = "error";
          response = "Agent execution failed";
        }

        const durationMs = Date.now() - startTime;

        if (status === "passed") passed++;
        else failed++;

        // Update result in DB
        await adminSupabase
          .from("agent_test_results")
          .update({
            status,
            agent_response: response.slice(0, 10000),
            duration_ms: durationMs,
          })
          .eq("run_id", run.id)
          .eq("test_case_id", tc.id);

        send({
          type: "test_completed",
          test_case_id: tc.id,
          name: tc.name,
          status,
          response: response.slice(0, 500),
          duration_ms: durationMs,
        });
      }

      // Finalize run
      const finalStatus = failed === 0 ? "passed" : "failed";
      await adminSupabase
        .from("agent_test_runs")
        .update({
          status: finalStatus,
          passed_cases: passed,
          failed_cases: failed,
          completed_at: new Date().toISOString(),
        })
        .eq("id", run.id);

      send({ type: "run_completed", status: finalStatus, passed, failed });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
