import { Resend } from "resend";

let resendClient: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "Glorb <alerts@glorb.dev>";

export interface AlertEmailParams {
  to: string;
  agentName: string;
  condition: string;
  healthStatus: string;
  errorsLastHour: number;
  agentId: string;
}

export async function sendAlertEmail(params: AlertEmailParams): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;

  const conditionLabels: Record<string, string> = {
    run_failed: "Run Failed",
    error_rate: "High Error Rate",
    offline: "Agent Offline",
    degraded: "Agent Degraded",
  };

  const statusColors: Record<string, string> = {
    healthy: "#22c55e",
    degraded: "#eab308",
    offline: "#ef4444",
    unknown: "#6b7280",
  };

  const conditionLabel = conditionLabels[params.condition] || params.condition;
  const statusColor = statusColors[params.healthStatus] || "#6b7280";

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: `Alert: ${conditionLabel} — ${params.agentName}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto;">
          <div style="border-bottom: 3px solid ${statusColor}; padding: 24px 0 16px;">
            <h2 style="margin: 0; font-size: 20px; color: #111;">
              Agent Alert: ${conditionLabel}
            </h2>
          </div>

          <div style="padding: 24px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666; font-size: 14px;">Agent</td>
                <td style="padding: 8px 0; font-size: 14px; font-weight: 600;">${params.agentName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-size: 14px;">Status</td>
                <td style="padding: 8px 0; font-size: 14px;">
                  <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; background: ${statusColor}20; color: ${statusColor}; font-weight: 600; font-size: 12px;">
                    ${params.healthStatus.toUpperCase()}
                  </span>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-size: 14px;">Errors (1h)</td>
                <td style="padding: 8px 0; font-size: 14px; font-weight: 600; color: ${params.errorsLastHour > 0 ? "#ef4444" : "#111"};">
                  ${params.errorsLastHour}
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-size: 14px;">Condition</td>
                <td style="padding: 8px 0; font-size: 14px;">${conditionLabel}</td>
              </tr>
            </table>
          </div>

          <div style="padding: 16px 0; border-top: 1px solid #e5e7eb;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://glorb.dev"}/agents/${params.agentId}"
               style="display: inline-block; padding: 10px 20px; background: #111; color: #fff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500;">
              View Agent
            </a>
          </div>

          <div style="padding: 16px 0; color: #9ca3af; font-size: 12px;">
            <p style="margin: 0;">
              You're receiving this because you have alert rules configured in Glorb.
              Manage your alerts in <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://glorb.dev"}/analytics" style="color: #6366f1;">Analytics</a>.
            </p>
          </div>
        </div>
      `,
    });
    return true;
  } catch {
    return false;
  }
}

export interface BudgetAlertEmailParams {
  to: string;
  agentName: string | null;
  budgetUsd: number;
  usageUsd: number;
  thresholdPct: number;
}

export async function sendBudgetAlertEmail(params: BudgetAlertEmailParams): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;

  const pctUsed = Math.round((params.usageUsd / params.budgetUsd) * 100);
  const scope = params.agentName || "Account-wide";

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: `Budget Alert: ${scope} at ${pctUsed}% of $${params.budgetUsd.toFixed(2)} limit`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto;">
          <div style="border-bottom: 3px solid #eab308; padding: 24px 0 16px;">
            <h2 style="margin: 0; font-size: 20px; color: #111;">
              Budget Threshold Reached
            </h2>
          </div>

          <div style="padding: 24px 0;">
            <div style="background: #fefce8; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
              <p style="margin: 0; font-size: 14px; color: #854d0e;">
                <strong>${scope}</strong> has used <strong>$${params.usageUsd.toFixed(2)}</strong>
                of the <strong>$${params.budgetUsd.toFixed(2)}</strong> monthly budget
                (${pctUsed}%).
              </p>
            </div>

            <!-- Budget bar -->
            <div style="background: #e5e7eb; border-radius: 4px; height: 8px; margin: 16px 0;">
              <div style="background: ${pctUsed >= 90 ? "#ef4444" : pctUsed >= 70 ? "#eab308" : "#22c55e"}; border-radius: 4px; height: 8px; width: ${Math.min(pctUsed, 100)}%;"></div>
            </div>
          </div>

          <div style="padding: 16px 0; border-top: 1px solid #e5e7eb;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://glorb.dev"}/analytics"
               style="display: inline-block; padding: 10px 20px; background: #111; color: #fff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500;">
              Manage Budget
            </a>
          </div>

          <div style="padding: 16px 0; color: #9ca3af; font-size: 12px;">
            <p style="margin: 0;">Runs will be blocked when the budget is fully consumed.</p>
          </div>
        </div>
      `,
    });
    return true;
  } catch {
    return false;
  }
}
