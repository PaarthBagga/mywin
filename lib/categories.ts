// The fixed category list (design decision 6). The AI may only pick from
// these, which keeps streaks and recaps clean.
//
// Vision Twins is planned but left out until it has a description.
// Later, onboarding will replace this constant with a per-user list.

export const CATEGORIES = [
  "Gym",
  "School",
  "Career",
  "Health",
  "Social",
  "Personal",
] as const;

// "Gym" | "School" | ... built from the list above, so they never drift apart.
export type Category = (typeof CATEGORIES)[number];

// One line per category. These go straight into the AI prompt.
export const DESCRIPTIONS: Record<Category, string> = {
  Gym: "lifting, running, sports, any workout",
  School: "classes, assignments, studying, exams, discussion posts",
  Career: "job, internship, applications, interviews, networking",
  Health: "sleep, food, water, meditation, doctor or dentist, mental health",
  Social: "friends, family, reaching out, events, being there for someone",
  Personal: "chores, errands, money, hobbies, habits, anything else (the fallback)",
};
