import {
  PORTAL_COOKIE_NAME,
  getAssignmentsForPatient,
  getPortalSession,
  getSafePatient,
  json,
  makeCookie,
  readJsonBody,
  signToken,
  verifyToken,
} from "../_lib/portal.js";

export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      const body = readJsonBody(req);
      const claims = verifyToken(body.ticket, "portal-ticket");
      const expiresAt = Math.floor(Date.now() / 1000) + 8 * 60 * 60;
      const sessionToken = signToken({
        type: "portal-session",
        psychologistId: claims.psychologistId,
        patientId: claims.patientId,
        patientPhone: claims.patientPhone,
        exp: expiresAt,
      });

      res.setHeader("Set-Cookie", makeCookie(PORTAL_COOKIE_NAME, sessionToken, 8 * 60 * 60));
      return json(res, 200, { ok: true });
    } catch (error) {
      return json(res, error.statusCode || 401, { error: error.message || "Invalid portal ticket" });
    }
  }

  if (req.method === "GET") {
    try {
      const context = await getPortalSession(req);
      const assignments = await getAssignmentsForPatient(context.patientId);
      return json(res, 200, {
        authenticated: true,
        patient: getSafePatient(context.patient),
        assignments,
      });
    } catch (error) {
      return json(res, error.statusCode || 401, { error: error.message || "Portal session required" });
    }
  }

  return json(res, 405, { error: "Method not allowed" });
}
