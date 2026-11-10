import postgres from "postgres";

type Sql = ReturnType<typeof postgres>;

export type Win = {
  id: string;
  text: string;
  title: string;
  category: string;
  difficulty: number;
  tags: string[];
  logged_at: Date;
  local_date: string; // "YYYY-MM-DD"
  question: string | null;
  options: string[] | null;
  answer: string | null;
};

// In dev, Next.js re-runs this file on every hot reload. Keeping the
// connection on globalThis stops each reload from opening a new pool.
const cache = globalThis as unknown as {
  sql?: Sql;
  schemaReady?: Promise<void>;
};

function connect(): Sql {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local.");
  }
  // onnotice: hide Postgres's "already exists, skipping" messages.
  return postgres(url, { onnotice: () => {} });
}

async function createSchema(sql: Sql) {
  await sql`
    create table if not exists wins (
      id          uuid primary key default gen_random_uuid(),
      text        text not null,
      title       text not null,
      category    text not null,
      difficulty  smallint not null check (difficulty between 1 and 5),
      tags        text[] not null default '{}',
      logged_at   timestamptz not null default now(),
      local_date  date not null,
      question    text,
      options     text[],
      answer      text
    )
  `;
  await sql`create index if not exists wins_local_date_idx on wins (local_date)`;
}

// Returns a ready-to-use connection. The table is created once per
// server process, the first time any route needs the database.
export async function getDb(): Promise<Sql> {
  cache.sql ??= connect();
  cache.schemaReady ??= createSchema(cache.sql).catch((err) => {
    cache.schemaReady = undefined; // let the next request try again
    throw err;
  });
  await cache.schemaReady;
  return cache.sql;
}
