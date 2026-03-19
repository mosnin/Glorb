import archiver from "archiver";
import { PassThrough } from "stream";
import { createClient } from "@supabase/supabase-js";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function createAgentZip(agentId: string): Promise<Buffer> {
  const supabase = getAdmin();

  const { data: agent } = await supabase
    .from("agents")
    .select("*")
    .eq("id", agentId)
    .single();

  if (!agent) throw new Error("Agent not found");

  const { data: files } = await supabase
    .from("agent_files")
    .select("*")
    .eq("agent_id", agentId);

  const archive = archiver("zip", { zlib: { level: 9 } });
  const passthrough = new PassThrough();
  const chunks: Buffer[] = [];

  passthrough.on("data", (chunk) => chunks.push(chunk));

  archive.pipe(passthrough);

  // Add each file
  for (const file of files || []) {
    const { data: blob } = await supabase.storage
      .from("agent-files")
      .download(file.storage_path);

    if (blob) {
      const content = Buffer.from(await blob.arrayBuffer());
      archive.append(content, { name: `${agent.name}/${file.file_path}` });
    }
  }

  await archive.finalize();
  await new Promise((resolve) => passthrough.on("end", resolve));

  return Buffer.concat(chunks);
}

export async function createClusterZip(clusterId: string): Promise<Buffer> {
  const supabase = getAdmin();

  const { data: cluster } = await supabase
    .from("clusters")
    .select("*, cluster_agents(*, agent:agents(*)), cluster_files(*)")
    .eq("id", clusterId)
    .single();

  if (!cluster) throw new Error("Cluster not found");

  const archive = archiver("zip", { zlib: { level: 9 } });
  const passthrough = new PassThrough();
  const chunks: Buffer[] = [];

  passthrough.on("data", (chunk) => chunks.push(chunk));
  archive.pipe(passthrough);

  const clusterDir = cluster.name;

  // Add cluster-level files
  for (const file of cluster.cluster_files || []) {
    const { data: blob } = await supabase.storage
      .from("agent-files")
      .download(file.storage_path);

    if (blob) {
      const content = Buffer.from(await blob.arrayBuffer());
      archive.append(content, { name: `${clusterDir}/${file.file_path}` });
    }
  }

  // Add each agent's files
  for (const ca of cluster.cluster_agents || []) {
    const agent = ca.agent;
    if (!agent) continue;

    const { data: agentFiles } = await supabase
      .from("agent_files")
      .select("*")
      .eq("agent_id", agent.id);

    for (const file of agentFiles || []) {
      const { data: blob } = await supabase.storage
        .from("agent-files")
        .download(file.storage_path);

      if (blob) {
        const content = Buffer.from(await blob.arrayBuffer());
        archive.append(content, {
          name: `${clusterDir}/agents/${agent.name}/${file.file_path}`,
        });
      }
    }
  }

  await archive.finalize();
  await new Promise((resolve) => passthrough.on("end", resolve));

  return Buffer.concat(chunks);
}
