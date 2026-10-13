/**
 * Secure Transactional Email Service for SHENZUN
 * Integrates with Resend (or standard HTTPS transactional endpoint).
 * Truthful delivery status reporting: distinguishes 'sent', 'stored_offline', and 'failed'.
 */

export interface EmailDeliveryResult {
  status: 'sent' | 'stored_offline' | 'failed';
  message: string;
  providerId?: string;
  errorLog?: string;
}

export async function deliverContactEmail(params: {
  name?: string;
  email?: string;
  subject?: string;
  message: string;
  isAnonymous: boolean;
}): Promise<EmailDeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const ownerEmail = process.env.OWNER_EMAIL || process.env.CONTACT_EMAIL || 'shenzun037@gmail.com';
  const fromEmail = process.env.EMAIL_FROM || 'Shenzun Journal <onboarding@resend.dev>';

  // If no email API key is configured on server:
  if (!apiKey) {
    return {
      status: 'stored_offline',
      message: 'Message safely saved to private inbox. (Transactional email forwarding is currently unconfigured on server).',
    };
  }

  const senderName = params.isAnonymous ? 'Anonymous Visitor' : (params.name?.trim() || 'A Reader');
  const senderEmail = params.isAnonymous ? 'anonymous@shenzun.internal' : (params.email?.trim() || 'noreply@shenzun.internal');
  const subjectLine = `[Shenzun Journal Note] ${params.subject?.trim() || 'A quiet reflection'} from ${senderName}`;

  const htmlBody = `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1c1917; background-color: #faf8f5; border-radius: 12px; border: 1px solid #e7e5e4;">
      <h2 style="margin-top: 0; font-weight: normal; color: #44403c; border-bottom: 1px solid #e7e5e4; padding-bottom: 12px;">
        A New Quiet Note on Shenzun
      </h2>
      <p style="font-size: 13px; color: #78716c; margin-bottom: 20px;">
        <strong>From:</strong> ${senderName} &lt;${senderEmail}&gt;<br/>
        <strong>Date:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' })}<br/>
        <strong>Anonymous:</strong> ${params.isAnonymous ? 'Yes' : 'No'}
      </p>
      <div style="padding: 16px; background-color: #ffffff; border-radius: 8px; border: 1px solid #f5f5f4; font-size: 15px; line-height: 1.6; color: #292524; white-space: pre-wrap;">
${params.message}
      </div>
      <p style="font-size: 11px; color: #a8a29e; margin-top: 24px; text-align: center;">
        Sent securely via Shenzun Journal Platform
      </p>
    </div>
  `;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [ownerEmail],
        reply_to: params.isAnonymous || !params.email ? undefined : params.email,
        subject: subjectLine,
        html: htmlBody,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      const errText = data?.message || res.statusText || 'Unknown email provider failure';
      console.error('Email delivery error from Resend:', errText);
      return {
        status: 'failed',
        message: 'Message stored in private inbox, but outbound email notification could not be delivered.',
        errorLog: errText,
      };
    }

    return {
      status: 'sent',
      message: 'Message delivered to owner via email and archived in private inbox.',
      providerId: data.id,
    };
  } catch (err: any) {
    console.error('Network failure delivering email:', err);
    return {
      status: 'failed',
      message: 'Message stored in private inbox, but outbound email delivery failed due to network error.',
      errorLog: err?.message || 'Network exception',
    };
  }
}
