import { getAppointmentsForPatient, getPortalSession, json, readJsonBody, updateAppointment } from "../_lib/portal.js";

export default async function handler(req, res) {
  try {
    const context = await getPortalSession(req);

    if (req.method === "GET") {
      const appointments = await getAppointmentsForPatient(context.psychologistId, context.patientId);
      return json(res, 200, appointments);
    }

    if (req.method === "PATCH") {
      const body = readJsonBody(req);
      await updateAppointment(
        context.psychologistId,
        context.patientId,
        body.appointmentId,
        body.patch || {}
      );
      return json(res, 200, { ok: true });
    }

    return json(res, 405, { error: "Method not allowed" });
  } catch (error) {
    return json(res, error.statusCode || 401, { error: error.message || "Portal session required" });
  }
}
