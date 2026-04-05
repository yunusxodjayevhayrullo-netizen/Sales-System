import pg from "pg";

const { Pool } = pg;

if (!process.env["DATABASE_URL"]) {
  throw new Error("DATABASE_URL must be set.");
}

const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });

async function query(sql: string, params?: unknown[]) {
  const client = await pool.connect();
  try {
    const res = await client.query(sql, params);
    return res;
  } finally {
    client.release();
  }
}

export async function initDb(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      state TEXT NOT NULL DEFAULT 'GREETING'
    );

    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      message TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'ai')),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      product TEXT NOT NULL,
      size TEXT NOT NULL,
      phone TEXT NOT NULL,
      address TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

export interface UserRow {
  id: string;
  state: string;
}

export interface MessageRow {
  id: number;
  user_id: string;
  message: string;
  role: "user" | "ai";
  created_at: string;
}

export interface OrderRow {
  id: number;
  user_id: string;
  product: string;
  size: string;
  phone: string;
  address: string;
  status: string;
  created_at: string;
}

export const userRepo = {
  async get(id: string): Promise<UserRow | undefined> {
    const res = await query("SELECT * FROM users WHERE id = $1", [id]);
    return res.rows[0] as UserRow | undefined;
  },
  async upsert(id: string, state: string): Promise<void> {
    await query(
      "INSERT INTO users (id, state) VALUES ($1, $2) ON CONFLICT(id) DO UPDATE SET state = EXCLUDED.state",
      [id, state],
    );
  },
  async setState(id: string, state: string): Promise<void> {
    await query("UPDATE users SET state = $1 WHERE id = $2", [state, id]);
  },
};

export const messageRepo = {
  async insert(user_id: string, message: string, role: "user" | "ai"): Promise<void> {
    await query(
      "INSERT INTO messages (user_id, message, role) VALUES ($1, $2, $3)",
      [user_id, message, role],
    );
  },
  async history(user_id: string, limit = 10): Promise<MessageRow[]> {
    const res = await query(
      `SELECT * FROM (
         SELECT * FROM messages WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2
       ) sub ORDER BY created_at ASC`,
      [user_id, limit],
    );
    return res.rows as MessageRow[];
  },
};

export const orderRepo = {
  async create(data: {
    user_id: string;
    product: string;
    size: string;
    phone: string;
    address: string;
  }): Promise<void> {
    await query(
      "INSERT INTO orders (user_id, product, size, phone, address, status) VALUES ($1, $2, $3, $4, $5, 'pending')",
      [data.user_id, data.product, data.size, data.phone, data.address],
    );
  },
  async getByUser(user_id: string): Promise<OrderRow[]> {
    const res = await query(
      "SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC",
      [user_id],
    );
    return res.rows as OrderRow[];
  },
};
