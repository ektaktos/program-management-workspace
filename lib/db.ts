import { PrismaClient } from '@prisma/client';
import { ENCRYPTED_FIELDS, decryptResult, encryptData } from './fieldCrypto';

const WRITE_OPS = new Set(['create', 'update', 'upsert', 'createMany', 'updateMany']);

function createClients() {
  const base = new PrismaClient({ log: process.env.NODE_ENV === 'development' ? ['error'] : [] });

  // Every query on a model with sensitive fields encrypts them on the way in and decrypts them on
  // the way out, so API routes keep working with plain values (see lib/fieldCrypto.ts).
  const encrypted = base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!ENCRYPTED_FIELDS[model]) return query(args);
          const a = args as Record<string, unknown>;
          if (WRITE_OPS.has(operation)) {
            if (operation === 'upsert') {
              encryptData(model, a.create as Record<string, unknown>);
              encryptData(model, a.update as Record<string, unknown>);
            } else if (Array.isArray(a.data)) {
              (a.data as Record<string, unknown>[]).forEach(d => encryptData(model, d));
            } else {
              encryptData(model, a.data as Record<string, unknown>);
            }
          }
          // Rows are decrypted in place, so the result keeps its Prisma type
          const result = await query(args);
          decryptResult(model, result);
          return result;
        },
      },
    },
  });
  return { base, encrypted };
}

type Clients = ReturnType<typeof createClients>;
const globalForPrisma = globalThis as unknown as { prismaClients?: Clients };
const clients = globalForPrisma.prismaClients ?? createClients();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prismaClients = clients;

/** The app's client: sensitive fields are encrypted at rest and decrypted transparently. */
export const prisma = clients.encrypted;

/** The plain client, for the auth adapter (accounts aren't field-encrypted) and the backfill. */
export const prismaBase = clients.base;
