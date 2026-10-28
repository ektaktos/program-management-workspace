// Transactional email through Zoho CPaaS (formerly ZeptoMail).
// Docs: https://www.zoho.com/zeptomail/help/api/email-sending.html
//
// Env:
//   ZOHO_CPAAS_TOKEN      Send Mail token from the Agent's SMTP/API → API tab
//   EMAIL_FROM_ADDRESS    a sender address on a domain verified in Zoho CPaaS
//   EMAIL_FROM_NAME       optional display name
//   ZOHO_CPAAS_API_URL    optional, defaults to https://cpaas.zoho.com/v1.1/email
//
// Without a token, development builds print the email to the server log instead of sending it.

const DEFAULT_API_URL = 'https://cpaas.zoho.com/v1.1/email';

export interface EmailMessage {
  to:      { address: string; name?: string | null };
  subject: string;
  html:    string;
  text:    string;
}

export const emailEnabled = Boolean(process.env.ZOHO_CPAAS_TOKEN && process.env.EMAIL_FROM_ADDRESS);

export class EmailError extends Error {}

export async function sendEmail(msg: EmailMessage): Promise<void> {
  if (!emailEnabled) {
    if (process.env.NODE_ENV === 'production') {
      throw new EmailError('Email is not configured: set ZOHO_CPAAS_TOKEN and EMAIL_FROM_ADDRESS');
    }
    console.info(`[email] Not configured — would send to ${msg.to.address}: ${msg.subject}\n${msg.text}`);
    return;
  }

  // The console shows the token with its scheme ("Zoho-enczapikey …"); accept it either way.
  const token = process.env.ZOHO_CPAAS_TOKEN!.trim().replace(/^Zoho-enczapikey\s+/i, '');

  const res = await fetch(process.env.ZOHO_CPAAS_API_URL || DEFAULT_API_URL, {
    method: 'POST',
    headers: {
      Accept:         'application/json',
      'Content-Type': 'application/json',
      Authorization:  `Zoho-enczapikey ${token}`,
    },
    body: JSON.stringify({
      from: { address: process.env.EMAIL_FROM_ADDRESS, name: process.env.EMAIL_FROM_NAME || undefined },
      to: [{ email_address: { address: msg.to.address, name: msg.to.name || undefined } }],
      subject:  msg.subject,
      htmlbody: msg.html,
      textbody: msg.text,
      track_clicks: false,
      track_opens:  false,
    }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const detail = body?.error?.details?.[0]?.message ?? body?.data?.message ?? body?.error?.message ?? res.statusText;
    const code = body?.error?.code ?? body?.data?.error_code ?? res.status;
    throw new EmailError(`Zoho CPaaS rejected the email (${code}): ${detail}`);
  }
}

/** Escapes text for interpolation into an email's HTML. */
export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
