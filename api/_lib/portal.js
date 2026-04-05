import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PORTAL_TOKEN_SECRET = process.env.PORTAL_TOKEN_SECRET;
const PORTAL_COOKIE_NAME = "psychocore_portal_session";

function requireEnv(name, value) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

requireEnv("VITE_SUPABASE_URL", SUPABASE_URL);
requireEnv("VITE_SUPABASE_ANON_KEY", SUPABASE_ANON_KEY);
requireEnv("SUPABASE_SERVICE_ROLE_KEY", SUPABASE_SERVICE_ROLE_KEY);
requireEnv("PORTAL_TOKEN_SECRET", PORTAL_TOKEN_SECRET);

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function normalizePhone(value = "") {
  return String(value).replace(/\D/g, "");
}

function parseCookies(header = "") {
  return header
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, part) => {
      const eqIndex = part.indexOf("=");
      if (eqIndex === -1) return acc;
      const key = part.slice(0, eqIndex).trim();
      const value = decodeURIComponent(part.slice(eqIndex + 1).trim());
      acc[key] = value;
      return acc;
    }, {});
}

function signToken(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", PORTAL_TOKEN_SECRET)
    .update(body)
    .digest("base64url");
  return `${body}.${signature}`;
}

function verifyToken(token, expectedType) {
  if (!token || !token.includes(".")) {
    throw new Error("Invalid token");
  }

  const [body, signature] = token.split(".");
  const expected = crypto
    .createHmac("sha256", PORTAL_TOKEN_SECRET)
    .update(body)
    .digest();
  const received = Buffer.from(signature, "base64url");

  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    throw new Error("Invalid token signature");
  }

  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  if (expectedType && payload.type !== expectedType) {
    throw new Error("Unexpected token type");
  }
  if (!payload.exp || Date.now() >= payload.exp * 1000) {
    throw new Error("Token expired");
  }
  return payload;
}

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return {};
}

function getOrigin(req) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${proto}://${host}`;
}

async function requirePsychologist(req) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    const error = new Error("Missing psychologist session");
    error.statusCode = 401;
    throw error;
  }

  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data?.user?.id) {
    const authError = new Error("Invalid psychologist session");
    authError.statusCode = 401;
    throw authError;
  }

  return data.user;
}

async function getPatientCatalog(psychologistId) {
  const { data, error } = await admin
    .from("pc_patients")
    .select("psychologist_id, data")
    .eq("psychologist_id", psychologistId)
    .maybeSingle();

  if (error) throw error;

  return {
    row: data,
    patients: Array.isArray(data?.data) ? data.data : [],
  };
}

async function getPatientContext({ psychologistId, patientId, patientPhone }) {
  const { row, patients } = await getPatientCatalog(psychologistId);
  const normalizedTarget = normalizePhone(patientPhone);
  const patient = patients.find((entry) => {
    if (!entry) return false;
    if (patientId && String(entry.id) === String(patientId)) return true;
    if (normalizedTarget && normalizePhone(entry.phone) === normalizedTarget) return true;
    return false;
  });

  if (!patient) {
    const error = new Error("Patient not found for psychologist");
    error.statusCode = 404;
    throw error;
  }

  return {
    row,
    patients,
    patient,
    patientId: patient.id,
    psychologistId,
  };
}

function getSafePatient(patient) {
  return {
    id: patient?.id || "",
    name: patient?.name || "",
    phone: patient?.phone || "",
    email: patient?.email || "",
    birthdate: patient?.birthdate || "",
    emergencyName: patient?.emergencyName || "",
    emergencyPhone: patient?.emergencyPhone || "",
    emergencyRelation: patient?.emergencyRelation || "",
  };
}

async function getPortalSession(req) {
  const cookies = parseCookies(req.headers.cookie || "");
  const token = cookies[PORTAL_COOKIE_NAME];
  if (!token) {
    const error = new Error("Missing portal session");
    error.statusCode = 401;
    throw error;
  }

  const claims = verifyToken(token, "portal-session");
  return getPatientContext({
    psychologistId: claims.psychologistId,
    patientId: claims.patientId,
    patientPhone: claims.patientPhone,
  });
}

function makeCookie(name, value, maxAgeSeconds = 0) {
  const attrs = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
  ];
  if (maxAgeSeconds <= 0) {
    attrs.push("Max-Age=0");
  } else {
    attrs.push(`Max-Age=${maxAgeSeconds}`);
  }
  return attrs.join("; ");
}

async function getAssignmentsForPatient(patientId) {
  const { data, error } = await admin
    .from("task_assignments")
    .select("*")
    .eq("patient_id", patientId)
    .order("assigned_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

async function getResponsesForPatient(patientId) {
  const assignments = await getAssignmentsForPatient(patientId);
  const assignmentIds = assignments.map((item) => item.id).filter(Boolean);
  if (assignmentIds.length === 0) return [];

  const { data, error } = await admin
    .from("task_responses")
    .select("*")
    .in("assignment_id", assignmentIds)
    .order("submitted_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

async function getAppointmentsForPatient(psychologistId, patientId) {
  const { data, error } = await admin
    .from("pc_appointments")
    .select("psychologist_id, data")
    .eq("psychologist_id", psychologistId)
    .maybeSingle();

  if (error) throw error;

  const appointments = (Array.isArray(data?.data) ? data.data : []).filter(
    (entry) => String(entry?.patientId) === String(patientId)
  );

  return appointments.sort((a, b) =>
    String(a?.date || "").localeCompare(String(b?.date || "")) ||
    String(a?.time || "").localeCompare(String(b?.time || ""))
  );
}

async function getPaymentsForPatient(psychologistId, patientId) {
  const { data, error } = await admin
    .from("pc_payments")
    .select("psychologist_id, data")
    .eq("psychologist_id", psychologistId)
    .maybeSingle();

  if (error) throw error;

  const payments = (Array.isArray(data?.data) ? data.data : []).filter(
    (entry) => String(entry?.patientId) === String(patientId)
  );

  return payments.sort((a, b) => String(b?.date || "").localeCompare(String(a?.date || "")));
}

async function getPsychologistPhone(psychologistId) {
  const { data, error } = await admin
    .from("pc_profile")
    .select("data")
    .eq("psychologist_id", psychologistId)
    .maybeSingle();

  if (error) throw error;
  return data?.data?.phone || null;
}

async function updatePatientConsent(psychologistId, patientId, consentData) {
  const { row, patients } = await getPatientCatalog(psychologistId);
  const updatedPatients = patients.map((entry) =>
    String(entry?.id) === String(patientId)
      ? { ...entry, consent: consentData }
      : entry
  );

  const { error } = await admin
    .from("pc_patients")
    .upsert(
      { psychologist_id: psychologistId, data: updatedPatients },
      { onConflict: "psychologist_id" }
    );

  if (error) throw error;

  const patient = updatedPatients.find((entry) => String(entry?.id) === String(patientId));
  return patient?.consent || null;
}

async function updateAppointment(psychologistId, patientId, appointmentId, patch) {
  const { data, error } = await admin
    .from("pc_appointments")
    .select("psychologist_id, data")
    .eq("psychologist_id", psychologistId)
    .maybeSingle();

  if (error) throw error;

  const currentData = Array.isArray(data?.data) ? data.data : [];
  let found = false;
  const nextData = currentData.map((entry) => {
    if (String(entry?.id) !== String(appointmentId)) return entry;
    if (String(entry?.patientId) !== String(patientId)) return entry;
    found = true;
    return { ...entry, ...patch };
  });

  if (!found) {
    const notFound = new Error("Appointment not found");
    notFound.statusCode = 404;
    throw notFound;
  }

  const { error: updateError } = await admin
    .from("pc_appointments")
    .upsert(
      { psychologist_id: psychologistId, data: nextData },
      { onConflict: "psychologist_id" }
    );

  if (updateError) throw updateError;
}

async function submitPortalResponse({ patient, assignmentId, responses }) {
  const { data: assignment, error: assignmentError } = await admin
    .from("task_assignments")
    .select("id, patient_id")
    .eq("id", assignmentId)
    .maybeSingle();

  if (assignmentError) throw assignmentError;
  if (!assignment || String(assignment.patient_id) !== String(patient.id)) {
    const error = new Error("Assignment does not belong to portal session");
    error.statusCode = 403;
    throw error;
  }

  const normalizedPhone = normalizePhone(patient.phone);
  const { error } = await admin.from("task_responses").insert({
    assignment_id: assignmentId,
    patient_phone: normalizedPhone,
    responses,
  });
  if (error) throw error;

  const { error: assignmentUpdateError } = await admin
    .from("task_assignments")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", assignmentId)
    .eq("patient_id", patient.id);

  if (assignmentUpdateError) throw assignmentUpdateError;
}

export {
  PORTAL_COOKIE_NAME,
  admin,
  getAppointmentsForPatient,
  getAssignmentsForPatient,
  getOrigin,
  getPatientContext,
  getPaymentsForPatient,
  getPortalSession,
  getPsychologistPhone,
  getResponsesForPatient,
  getSafePatient,
  json,
  makeCookie,
  normalizePhone,
  readJsonBody,
  requirePsychologist,
  signToken,
  submitPortalResponse,
  updateAppointment,
  updatePatientConsent,
  verifyToken,
};
