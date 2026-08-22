import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function deliverWebhook(webhookUrl, payload) {
    const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error(`Webhook delivery failed: ${response.status}`);
    }
}

export async function deliverEmail(toEmail, payload) {
    const { error } = await resend.emails.send({
        from: process.env.ALERT_FROM_EMAIL,
        to: toEmail,
        subject: `Endpoint degraded: ${payload.endpoint_url}`,
        text: payload.message,
    });

    if (error) {
        throw new Error(`Email delivery failed: ${error.message}`);
    }
}

export const CHANNELS = {
    webhook: deliverWebhook,
    email: deliverEmail,
}