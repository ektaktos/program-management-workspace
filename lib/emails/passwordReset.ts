import { escapeHtml, type EmailMessage } from '@/lib/email';

export function passwordResetEmail(
  user: { email: string; name?: string | null },
  link: string,
  validMinutes: number,
): EmailMessage {
  const greeting = user.name ? `Hi ${user.name.split(/\s+/)[0]},` : 'Hi,';
  const href = escapeHtml(link);

  const text = [
    greeting,
    '',
    'Someone asked to reset the password for your Program Management Workspace account.',
    `Open this link to choose a new password (it expires in ${validMinutes} minutes):`,
    '',
    link,
    '',
    "If you didn't ask for this, ignore this email — your password won't change.",
  ].join('\n');

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f5f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1f1f1f;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
      <tr><td>
        <p style="margin:0 0 16px;font-size:15px;">${escapeHtml(greeting)}</p>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.5;">
          Someone asked to reset the password for your Program Management Workspace account.
          Choose a new one with the button below. The link expires in ${validMinutes} minutes.
        </p>
        <p style="margin:0 0 24px;">
          <a href="${href}" style="display:inline-block;background:#1f1f1f;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 20px;border-radius:8px;">Reset password</a>
        </p>
        <p style="margin:0 0 8px;font-size:13px;color:#6b6b6b;line-height:1.5;">Or paste this link into your browser:</p>
        <p style="margin:0 0 24px;font-size:13px;word-break:break-all;"><a href="${href}" style="color:#1f1f1f;">${href}</a></p>
        <p style="margin:0;font-size:13px;color:#6b6b6b;line-height:1.5;">
          If you didn't ask for this, ignore this email — your password won't change.
        </p>
      </td></tr>
    </table>
  </body>
</html>`;

  return { to: { address: user.email, name: user.name }, subject: 'Reset your password', html, text };
}
