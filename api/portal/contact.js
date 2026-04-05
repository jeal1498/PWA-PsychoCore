import { getPortalSession, getPsychologistPhone, json } from "../_lib/portal.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return json(res, 405, { error: "Method not allowed" });
  }

  try {
    const context = await getPortalSession(req);
    const phone = await getPsychologistPhone(context.psychologistId);
    return json(res, 200, { phone });
  } catch (error) {
    return json(res, error.statusCode || 401, { error: error.message || "Portal session required" });
  }
}
