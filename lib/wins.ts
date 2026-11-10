import { getDb, type Win } from "@/lib/db";

// Note: queries select local_date::text so postgres.js returns
// "2026-11-09" as a string instead of turning it into a JS Date.

type NewWin = {
  text: string;
  title: string;
  category: string;
  difficulty: number;
  localDate: string; // "YYYY-MM-DD"
};

// Save one win and return the stored row.
export async function createWin(win: NewWin): Promise<Win> {
  const sql = await getDb();
  const [row] = await sql<Win[]>`
    insert into wins (text, title, category, difficulty, local_date)
    values (${win.text}, ${win.title}, ${win.category}, ${win.difficulty}, ${win.localDate})
    returning id, text, title, category, difficulty, tags, logged_at,
              local_date::text as local_date, question, options, answer
  `;
  return row;
}

// The most recent wins, newest first.
export async function listWins(limit = 50): Promise<Win[]> {
  const sql = await getDb();
  return sql<Win[]>`
    select id, text, title, category, difficulty, tags, logged_at,
           local_date::text as local_date, question, options, answer
    from wins
    order by logged_at desc
    limit ${limit}
  `;
}
