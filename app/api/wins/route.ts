import { z } from "zod";
import { isAuthorized, unauthorized } from "@/lib/auth";
import { parseWin } from "@/lib/ai";
import { todayLocal } from "@/lib/dates";
import { createWin, listWins } from "@/lib/wins";

// What a client is allowed to send when logging a win.
const NewWin = z.object({
  text: z.string().trim().min(1).max(500),
  difficulty: z.number().int().min(1).max(5).optional(),
  local_date: z.iso.date().optional(), // "YYYY-MM-DD" in the user's timezone
});

// POST /api/wins: save a new win.
export async function POST(request: Request) {
  if (!isAuthorized(request)) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = NewWin.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { text, difficulty, local_date = todayLocal() } = parsed.data;

  // The AI (or the offline parser) fills in title, category, tags, etc.
  const ai = await parseWin(text);

  const win = await createWin({
    text,
    title: ai.title,
    category: ai.category,
    // A difficulty the user picked always beats the AI's guess.
    difficulty: difficulty ?? ai.difficulty,
    tags: ai.tags,
    question: ai.question,
    options: ai.options,
    localDate: local_date,
  });

  return Response.json({ win }, { status: 201 });
}

// GET /api/wins: the 50 most recent wins, newest first.
export async function GET(request: Request) {
  if (!isAuthorized(request)) return unauthorized();

  const wins = await listWins();
  return Response.json({ wins });
}
