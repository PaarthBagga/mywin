import { timingSafeEqual } from "node:crypto";

// True if the request has "Authorization: Bearer <MYWIN_TOKEN>".
export function isAuthorized(request: Request): boolean {
  const expected = process.env.MYWIN_TOKEN;
  if (!expected) return false; // no token configured = nobody gets in

  const header = request.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return false;

  // Compare in constant time so response timing can't leak the token.
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function unauthorized() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
