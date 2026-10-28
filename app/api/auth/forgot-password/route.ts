import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { passwordResetEmail } from '@/lib/emails/passwordReset';
import { RESET_REQUEST_COOLDOWN_MS, RESET_TOKEN_MINUTES, newResetToken, resetLink } from '@/lib/passwordReset';

// Always answers the same way, so the form can't be used to find out who has an account.
const sent = () => NextResponse.json({ ok: true });

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email) return NextResponse.json({ error: 'Enter your email address' }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.email) return sent();

  const recent = await prisma.passwordResetToken.findFirst({
    where: { userId: user.id, createdAt: { gt: new Date(Date.now() - RESET_REQUEST_COOLDOWN_MS) } },
  });
  if (recent) return sent();

  // Only the newest link works
  const { token, tokenHash } = newResetToken();
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
    prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expires: new Date(Date.now() + RESET_TOKEN_MINUTES * 60_000) },
    }),
  ]);

  try {
    await sendEmail(passwordResetEmail({ email: user.email, name: user.name }, resetLink(token), RESET_TOKEN_MINUTES));
  } catch (err) {
    console.error('[forgot-password]', err);
    await prisma.passwordResetToken.deleteMany({ where: { tokenHash } });
    return NextResponse.json({ error: "We couldn't send the email. Please try again in a minute." }, { status: 502 });
  }

  return sent();
}
