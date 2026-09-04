import { Resend } from "resend";

function getResendClient() {
  return new Resend(process.env.RESEND_API_KEY);
}

export async function deliverWebhook(webhookUrl, payload) {
  if (!webhookUrl || typeof webhookUrl !== 'string') {
    throw new Error('Invalid webhook URL');
  }

  const isSlack = webhookUrl.includes('hooks.slack.com') || webhookUrl.includes('slack.com');
  const isDiscord = webhookUrl.includes('discord.com/api/webhooks');

  let body;
  const headers = { "Content-Type": "application/json" };
  const scoreVal = payload.recent_score ?? payload.recentScore ?? payload.score ?? 0;
  const scoreStr = typeof scoreVal === 'number' ? scoreVal.toFixed(2) : String(scoreVal);

  if (isSlack) {
    const emoji = payload.incident_type === "early_warning" ? "⚠️" : "🚨";
    body = JSON.stringify({
      text: `${emoji} *Harbinger Alert*: ${payload.message}\n• Endpoint: \`${payload.endpoint_url}\`\n• Health Score: *${scoreStr}*`
    });
  } else if (isDiscord) {
    const emoji = payload.incident_type === "early_warning" ? "⚠️" : "🚨";
    body = JSON.stringify({
      content: `${emoji} **Harbinger Alert**: ${payload.message}\nEndpoint: \`${payload.endpoint_url}\`\nHealth Score: **${scoreStr}**`
    });
  } else {
    body = JSON.stringify(payload);
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers,
    body,
  });

  if (!response.ok) {
    throw new Error(`Webhook delivery failed with status: ${response.status}`);
  }
}

export async function deliverEmail(toEmail, payload) {
  if (!process.env.RESEND_API_KEY || !process.env.ALERT_FROM_EMAIL) {
    throw new Error(
      "Resend email delivery is not configured. Set RESEND_API_KEY and ALERT_FROM_EMAIL.",
    );
  }

  const { error } = await getResendClient().emails.send({
    from: process.env.ALERT_FROM_EMAIL,
    to: toEmail,
    subject: `[Harbinger Alert] Endpoint degraded: ${payload.endpoint_url}`,
    text: payload.message,
  });

  if (error) {
    throw new Error(`Email delivery failed: ${error.message}`);
  }
}

export const CHANNELS = {
  webhook: deliverWebhook,
  email: deliverEmail,
};
