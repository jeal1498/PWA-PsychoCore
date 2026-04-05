import { getPortalSession, json, readJsonBody, updatePatientConsent } from "../_lib/portal.js";

export default async function handler(req, res) {
  try {
    const context = await getPortalSession(req);

    if (req.method === "GET") {
      return json(res, 200, context.patient?.consent || null);
    }

    if (req.method === "PATCH") {
      const body = readJsonBody(req);
      const consent = await updatePatientConsent(
        context.psychologistId,
        context.patientId,
        body.consentData || null
      );
      return json(res, 200, consent);
    }

    return json(res, 405, { error: "Method not allowed" });
  } catch (error) {
    return json(res, error.statusCode || 401, { error: error.message || "Portal session required" });
  }
}
