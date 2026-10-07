import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/server/db/client";
import type { AuditSink, TokenRow, TokenRowStore } from "@/server/token-store";

/**
 * Postgres adapters for the encrypted token store (SERVER-ONLY, story 3.4).
 * Runs over the direct server connection, which bypasses RLS by design; the
 * tables have RLS on with no client policies (docs/SETUP-supabase.md).
 */

export class DbTokenRowStore implements TokenRowStore {
  async get(userId: string, provider: string): Promise<TokenRow | undefined> {
    const rows = await getDb()
      .select()
      .from(schema.connectorTokens)
      .where(
        and(
          eq(schema.connectorTokens.userId, userId),
          eq(schema.connectorTokens.provider, provider),
        ),
      )
      .limit(1);
    return rows[0];
  }

  async upsert(row: TokenRow): Promise<void> {
    const values = { ...row, updatedAt: new Date() };
    await getDb()
      .insert(schema.connectorTokens)
      .values(values)
      .onConflictDoUpdate({
        target: [schema.connectorTokens.userId, schema.connectorTokens.provider],
        set: {
          ciphertext: values.ciphertext,
          iv: values.iv,
          keyVersion: values.keyVersion,
          expiresAt: values.expiresAt,
          updatedAt: values.updatedAt,
        },
      });
  }

  async delete(userId: string, provider: string): Promise<void> {
    await getDb()
      .delete(schema.connectorTokens)
      .where(
        and(
          eq(schema.connectorTokens.userId, userId),
          eq(schema.connectorTokens.provider, provider),
        ),
      );
  }
}

export class DbAuditSink implements AuditSink {
  async record(event: { userId: string; entity: string; action: string }): Promise<void> {
    await getDb().insert(schema.auditEvents).values(event);
  }
}
