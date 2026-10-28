import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { validatePassword } from '@/lib/password';
import { hashResetToken } from '@/lib/passwordReset';

const invalid = () => NextResponse.json(
  { error: 'This reset link is invalid or has expired. Request a new one.' },
  { status: 400 },
);

async function findValid(token: unknown) {
  if (typeof token !== 'string' || !token) return null;
  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(token) },
    include: { user: { select: { email: true } } },
  });
  return row && row.expires > new Date() ? row : null;
}

// Lets the page say up front that a link is dead instead of after the user types a password.
export async function GET(req: NextRequest) {
  const row = await findValid(req.nextUrl.searchParams.get('token'));
  return row ? NextResponse.json({ ok: true }) : invalid();
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const password = typeof body.password === 'string' ? body.password : '';

  const passwordError = validatePassword(password);
  if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });

  const row = await findValid(body.token);
  if (!row) return invalid();

  // Deleting by hash makes the link single-use even if two requests race.
  const passwordHash = await bcrypt.hash(password, 12);
  const used = await prisma.$transaction(async tx => {
    const { count } = await tx.passwordResetToken.deleteMany({ where: { tokenHash: row.tokenHash } });
    if (count === 0) return false;
    await tx.user.update({ where: { id: row.userId }, data: { passwordHash } });
    await tx.passwordResetToken.deleteMany({ where: { userId: row.userId } });
    return true;
  });
  if (!used) return invalid();

  return NextResponse.json({ ok: true, email: row.user.email });
}
