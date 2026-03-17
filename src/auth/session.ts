import type { DbAdapter } from "../db/pool.js";

interface Session {
  id: string;
  userId: string;
  strategy: string;
  data: Record<string, unknown>;
  expiresAt: Date;
  createdAt: Date;
}

export interface SessionStore {
  create(
    userId: string,
    strategy: string,
    data?: Record<string, unknown>,
    ttlMs?: number
  ): Promise<Session>;
  get(sessionId: string): Promise<Session | null>;
  delete(sessionId: string): Promise<void>;
  cleanup(): Promise<number>;
}

const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function createSessionStore(db: DbAdapter): SessionStore {
  return {
    async create(userId, strategy, data = {}, ttlMs = DEFAULT_TTL_MS) {
      const expiresAt = new Date(Date.now() + ttlMs);
      const result = await db.query<{
        id: string;
        user_id: string;
        strategy: string;
        data: Record<string, unknown>;
        expires_at: Date;
        created_at: Date;
      }>(
        `INSERT INTO sessions (user_id, strategy, data, expires_at)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [userId, strategy, JSON.stringify(data), expiresAt]
      );
      const row = result.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        strategy: row.strategy,
        data: row.data,
        expiresAt: row.expires_at,
        createdAt: row.created_at,
      };
    },

    async get(sessionId) {
      const result = await db.query<{
        id: string;
        user_id: string;
        strategy: string;
        data: Record<string, unknown>;
        expires_at: Date;
        created_at: Date;
      }>(
        "SELECT * FROM sessions WHERE id = $1 AND expires_at > NOW()",
        [sessionId]
      );
      if (result.rows.length === 0) return null;
      const row = result.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        strategy: row.strategy,
        data: row.data,
        expiresAt: row.expires_at,
        createdAt: row.created_at,
      };
    },

    async delete(sessionId) {
      await db.query("DELETE FROM sessions WHERE id = $1", [sessionId]);
    },

    async cleanup() {
      const result = await db.query(
        "DELETE FROM sessions WHERE expires_at <= NOW()"
      );
      return result.rowCount;
    },
  };
}
