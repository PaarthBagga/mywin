// The only file that talks to an AI provider (design decision 4).
// parseWin() tries Gemini first. If there is no key, the call fails, or the
// answer doesn't match our schema, the offline keyword parser takes over,
// so logging a win always works.

import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { CATEGORIES, DESCRIPTIONS, type Category } from "@/lib/categories";

const DEFAULT_MODEL = "gemini-3.8-flash";
const TIMEOUT_MS = 8000; // Siri won't wait forever, so give up and fall back.

// The shape every parser must return. Gemini is given this as a JSON schema,
// and its answer is validated against it again (design decision 5).
export const ParsedWinSchema = z.object({
  title: z.string().min(1).max(60),
  category: z.enum(CATEGORIES),
  difficulty: z.number().int().min(1).max(5),
  tags: z.array(z.string()).max(5),
  question: z.string().nullable(),
  options: z.array(z.string()).min(2).max(4).nullable(),
});

export type ParsedWin = z.infer<typeof ParsedWinSchema>;

export async function parseWin(text: string): Promise<ParsedWin> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return parseOffline(text);

  try {
    return await parseWithGemini(text, apiKey);
  } catch (err) {
    console.warn("AI parse failed, using the offline parser:", err);
    return parseOffline(text);
  }
}

// ---------- Gemini ----------

const SYSTEM_PROMPT = `You turn a short note about a personal win into structured data.

title: a short cleaned-up version, at most 60 characters, like "Bench 225" or "Finished stats assignment".

category: exactly one of these.
${CATEGORIES.map((c) => `- ${c}: ${DESCRIPTIONS[c]}`).join("\n")}

difficulty: 1 to 5.
1 Routine: tiny or habitual (made bed, drank water).
2 Small push: normal effort (went to the gym on a regular day).
3 Solid: took real effort or time (finished an assignment).
4 Hard: a stretch, avoided for a while, or a personal best.
5 Big: milestone or breakthrough (PR, aced an exam, got an offer).
Words like "finally", "PR", "first time", "aced", "for weeks" push it up.
Words like "just", "quick", "already" push it down.

tags: 0 to 5 short lowercase words, like ["bench", "pr"].

question and options: usually both null. Ask at most one question, and only when the answer would change the difficulty, category, or a key tag. options are 2 to 4 short answer chips.
Good: "hit 225 on bench" gets question "New PR?" with options ["Yes, PR", "No"], because a PR makes it a 5.
Good: "submitted it" gets question "What was it?" with options ["Assignment", "Job app", "Other"].
If the question decides the category, the options must be exact category names from the list above, like ["Social", "Career", "Gym"].
Bad: "did all my discussion posts already" is clearly School and clearly done, so no question.
Never ask about feelings, details for their own sake, or anything the text already answers.`;

async function parseWithGemini(text: string, apiKey: string): Promise<ParsedWin> {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
    contents: text,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseJsonSchema: z.toJSONSchema(ParsedWinSchema),
      abortSignal: AbortSignal.timeout(TIMEOUT_MS),
    },
  });

  // Never trust raw output: parse the JSON, then check it with zod.
  // Either step throwing sends us to the offline parser.
  const parsed = ParsedWinSchema.parse(JSON.parse(response.text ?? ""));

  return {
    ...parsed,
    tags: parsed.tags.map((t) => t.trim().toLowerCase()),
    // A question without options (or the reverse) is useless, so drop both.
    question: parsed.question && parsed.options ? parsed.question : null,
    options: parsed.question && parsed.options ? parsed.options : null,
  };
}

// ---------- Offline fallback ----------

const KEYWORDS: Record<Category, string[]> = {
  Gym: ["gym", "workout", "lift", "lifted", "bench", "squat", "deadlift", "run",
    "ran", "running", "jog", "miles", "km", "cardio", "swim", "pushups", "pr"],
  School: ["school", "class", "lecture", "assignment", "assignments", "homework",
    "study", "studied", "exam", "midterm", "quiz", "essay", "discussion", "lab"],
  Career: ["job", "work", "interview", "internship", "resume", "application",
    "applied", "offer", "linkedin", "networking", "recruiter", "coffee chat"],
  Health: ["sleep", "slept", "water", "meditate", "meditated", "doctor",
    "dentist", "therapy", "vitamins", "healthy", "walk", "steps"],
  Social: ["friend", "friends", "mom", "dad", "family", "called", "texted",
    "party", "hung out", "birthday"],
  Personal: [], // the fallback, so it needs no keywords
};

const UP_SIGNALS = ["finally", "pr", "first time", "aced", "for weeks"];
const DOWN_SIGNALS = ["just", "quick", "already"];

// "Hit 225 on Bench!" becomes " hit 225 on bench ". The spaces on both ends
// let us match whole words: " pr " matches "new pr" but not "practice".
function normalize(text: string): string {
  return ` ${text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
}

function has(normalized: string, phrase: string): boolean {
  return normalized.includes(` ${phrase} `);
}

export function parseOffline(text: string): ParsedWin {
  const words = normalize(text);

  // Pick the category with the most keyword hits. Ties go to the earlier one.
  let category: Category = "Personal";
  let tags: string[] = [];
  for (const c of CATEGORIES) {
    const hits = KEYWORDS[c].filter((k) => has(words, k));
    if (hits.length > tags.length) {
      category = c;
      tags = hits;
    }
  }

  let difficulty = 2; // "Small push" is the most common kind of win
  if (UP_SIGNALS.some((s) => has(words, s))) difficulty = 4;
  else if (DOWN_SIGNALS.some((s) => has(words, s))) difficulty = 1;

  return {
    title: makeTitle(text),
    category,
    difficulty,
    tags: tags.slice(0, 5),
    question: null, // the keyword parser never asks questions
    options: null,
  };
}

// Capitalize the first letter and cut to 60 characters.
function makeTitle(text: string): string {
  const t = text.trim();
  const title = t.charAt(0).toUpperCase() + t.slice(1);
  return title.length <= 60 ? title : title.slice(0, 57).trimEnd() + "...";
}
