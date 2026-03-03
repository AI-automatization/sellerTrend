import { PrismaClient } from '@prisma/client';

/** Ensure pool_timeout, statement_timeout, and connection_limit are set in DATABASE_URL */
function ensurePoolParams(envUrl?: string): string {
  let url = envUrl ?? 'postgresql://localhost:5432/ventra';
  if (!url.includes('pool_timeout')) {
    const sep = url.includes('?') ? '&' : '?';
    url = `${url}${sep}pool_timeout=10`;
  }
  if (!url.includes('statement_timeout')) {
    url = `${url}&statement_timeout=15000`;
  }
  if (!url.includes('connection_limit')) {
    url = `${url}&connection_limit=10`;
  }
  return url;
}

export const prisma = new PrismaClient({
  datasourceUrl: ensurePoolParams(process.env.DATABASE_URL),
});
