import { getPortalSession, getResponsesForPatient, json, readJsonBody, submitPortalResponse } from "../_lib/portal.js";

export default async function handler(req, res) {
  try {
    const context = await getPortalSession(req);

    if (req.method === "GET") {
      const responses = await getResponsesForPatient(context.patientId);
      return json(res, 200, responses);
    }

    if (req.method === "POST") {
      const body = readJsonBody(req);
      await submitPortalResponse({
        patient: context.patient,
        assignmentId: body.assignmentId,
        responses: body.responses,
      });
      return json(res, 200, { ok: true });
    }

    return json(res, 405, { error: "Method not allowed" });
  } catch (error) {
    return json(res, error.statusCode || 401, { error: error.message || "Portal session required" });
  }
}
