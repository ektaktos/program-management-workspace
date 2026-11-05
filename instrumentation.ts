// Runs once when the server starts: encrypt any data stored before field encryption was enabled
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { runEncryptionBackfill } = await import('./lib/encryptBackfill');
  runEncryptionBackfill().catch(err => console.error('[encryption] backfill failed:', err));
}
