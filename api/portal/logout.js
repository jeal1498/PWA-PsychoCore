import { PORTAL_COOKIE_NAME, json, makeCookie } from "../_lib/portal.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed" });
  }

  res.setHeader("Set-Cookie", makeCookie(PORTAL_COOKIE_NAME, "", 0));
  return json(res, 200, { ok: true });
}
