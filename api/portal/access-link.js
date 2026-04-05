import {
  getOrigin,
  getPatientContext,
  json,
  normalizePhone,
  readJsonBody,
  requirePsychologist,
  signToken,
} from "../_lib/portal.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed" });
  }

  try {
    const psychologist = await requirePsychologist(req);
    const body = readJsonBody(req);
    const patientPhone = normalizePhone(body.patientPhone);

    if (!patientPhone) {
      return json(res, 400, { error: "patientPhone is required" });
    }

    const context = await getPatientContext({
      psychologistId: psychologist.id,
      patientPhone,
    });

    const expiresAt = Math.floor(Date.now() / 1000) + 15 * 60;
    const ticket = signToken({
      type: "portal-ticket",
      psychologistId: psychologist.id,
      patientId: context.patient.id,
      patientPhone: normalizePhone(context.patient.phone),
      exp: expiresAt,
    });

    return json(res, 200, {
      accessUrl: `${getOrigin(req)}/p?t=${encodeURIComponent(ticket)}`,
      expiresAt: new Date(expiresAt * 1000).toISOString(),
    });
  } catch (error) {
    return json(res, error.statusCode || 500, { error: error.message || "Could not create portal link" });
  }
}
