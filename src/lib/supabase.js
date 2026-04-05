// ─────────────────────────────────────────────────────────────────────────────
// src/lib/supabase.js
// Cliente Supabase + Auth + funciones de tareas
// ─────────────────────────────────────────────────────────────────────────────
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON) {
  throw new Error(
    "Missing Supabase configuration. Define VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY before booting the app."
  );
}

// ── Cliente oficial (usado para Auth) ─────────────────────────────────────────
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    persistSession:     true,             // guardar sesión entre recargas
    autoRefreshToken:   true,             // renovar token silenciosamente
    detectSessionInUrl: true,             // capturar callback OAuth en la URL
    storage:            window.localStorage, // forzar localStorage (no sessionStorage)
  },
});

// ── Auth helpers ──────────────────────────────────────────────────────────────
export const signInWithGoogle = () =>
  supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });

export const signOut = () => supabase.auth.signOut();

// ── Trial / subscription management ──────────────────────────────────────────

/** Obtiene o crea el registro del psicólogo. Retorna { trial_ends_at, subscription_status } */
export async function getOrCreatePsychologist(userId) {
  // Intentar obtener registro existente
  const { data, error } = await supabase
    .from("psychologists")
    .select("trial_ends_at, subscription_status")
    .eq("id", userId)
    .maybeSingle();

  if (data) return data;

  // Primera vez — crear registro con trial de 30 días
  const { data: created, error: createErr } = await supabase
    .from("psychologists")
    .insert({ id: userId })
    .select("trial_ends_at, subscription_status")
    .single();

  if (createErr) throw createErr;
  return created;
}

/** Retorna true si el psicólogo tiene acceso activo (trial vigente o suscripción activa) */
export function hasActiveAccess(psychologist) {
  if (!psychologist) return false;
  if (psychologist.subscription_status === "active") return true;
  if (psychologist.subscription_status === "trial") {
    return new Date(psychologist.trial_ends_at) > new Date();
  }
  return false;
}

/** Cuántos días quedan en el trial (puede ser negativo si expiró) */
export function trialDaysLeft(psychologist) {
  if (!psychologist) return 0;
  const diff = new Date(psychologist.trial_ends_at) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// ── Fetch helper (para REST directo — tareas) ─────────────────────────────────
// Usa el JWT del usuario autenticado para respetar Row Level Security.
// El portal del paciente (PatientPortal) no tiene sesión activa — en ese
// caso cae al anon key, que es suficiente porque el portal solo consulta
// por phone sin acceder a datos de otros psicólogos.
// Cache del token para evitar llamadas repetidas a getSession()
// que disparan re-renders y cancelan los debounced saves.
let _cachedToken = null;
supabase.auth.onAuthStateChange((_event, session) => {
  _cachedToken = session?.access_token ?? null;
});

async function getAuthToken() {
  if (_cachedToken) return _cachedToken;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    _cachedToken = session?.access_token ?? null;
    return _cachedToken || SUPABASE_ANON;
  } catch {
    return SUPABASE_ANON;
  }
}

const sb = async (path, opts = {}) => {
  const token = await getAuthToken();
  return fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    headers: {
      "apikey":        SUPABASE_ANON,
      "Authorization": `Bearer ${token}`,
      "Content-Type":  "application/json",
      "Prefer":        opts.prefer || "return=representation",
      ...opts.headers,
    },
    ...opts,
  });
};

async function portalFetch(path, opts = {}) {
  const res = await fetch(`/api/portal${path}`, {
    method: opts.method || "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  const contentType = res.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await res.json().catch(() => ({}))
    : await res.text().catch(() => "");

  if (!res.ok) {
    const message =
      typeof payload === "string"
        ? payload
        : payload?.error || "Portal request failed";
    throw new Error(message);
  }

  return payload;
}

async function getPsychologistSessionToken() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Psychologist session required");
  }
  return session.access_token;
}

export async function createPortalAccessLink(patientPhone) {
  const accessToken = await getPsychologistSessionToken();
  const data = await fetch("/api/portal/access-link", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ patientPhone }),
  }).then(async (res) => {
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(payload?.error || "Could not create secure portal link");
    }
    return payload;
  });

  return data;
}

export async function exchangePortalToken(ticket) {
  return portalFetch("/session", {
    method: "POST",
    body: { ticket },
  });
}

export async function getPortalSession() {
  return portalFetch("/session");
}

export async function logoutPortal() {
  return portalFetch("/logout", { method: "POST" });
}

// ── TASK ASSIGNMENTS ─────────────────────────────────────────────────────────

export async function createAssignment({ patientId, patientName, patientPhone, templateId, title, notes, sessionId }) {
  const res = await sb("/task_assignments", {
    method: "POST",
    body: JSON.stringify({ patient_id: patientId, patient_name: patientName, patient_phone: patientPhone, template_id: templateId, title, notes: notes || null, session_id: sessionId || null }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data[0];
}

export async function getAssignmentsByPatient(patientId) {
  const res = await sb(`/task_assignments?patient_id=eq.${encodeURIComponent(patientId)}&order=assigned_at.desc`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getAllAssignments() {
  const res = await sb(`/task_assignments?order=assigned_at.desc`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getAssignmentsByPhone(phone) {
  const res = await sb(`/task_assignments?patient_phone=eq.${encodeURIComponent(phone)}&order=assigned_at.desc`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function completeAssignment(assignmentId) {
  const res = await sb(`/task_assignments?id=eq.${assignmentId}`, {
    method: "PATCH",
    prefer: "return=minimal",
    body: JSON.stringify({ status: "completed", completed_at: new Date().toISOString() }),
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error("[completeAssignment] PATCH failed:", errText);
    throw new Error(errText);
  }
}

export async function deleteAssignment(assignmentId) {
  const res = await sb(`/task_assignments?id=eq.${assignmentId}`, {
    method: "DELETE",
    prefer: "return=minimal",
  });
  if (!res.ok) throw new Error(await res.text());
}

// ── TASK RESPONSES ────────────────────────────────────────────────────────────

export async function submitResponse({ assignmentId, patientPhone, responses }) {
  void patientPhone;
  await portalFetch("/responses", {
    method: "POST",
    body: { assignmentId, responses },
  });
}

export async function getResponsesByAssignment(assignmentId) {
  const res = await sb(`/task_responses?assignment_id=eq.${assignmentId}&order=submitted_at.desc`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getAllResponsesByPhone(phone) {
  void phone;
  return portalFetch("/responses");
}

// ── PORTAL DEL PACIENTE — Consentimiento ──────────────────────────────────────

/** Obtiene el objeto `consent` del paciente identificado por teléfono.
 *  Retorna el objeto consent (puede tener signed:false) o null si no existe. */
export async function getConsentByPhone(phone) {
  void phone;
  return portalFetch("/consent");
}

/** Guarda (merge) los datos de firma en el campo `consent` del paciente.
 *  consentData debe incluir: { signed, signedAt, signatureDataUrl, signedBy } */
export async function savePatientConsent(phone, consentData) {
  void phone;
  return portalFetch("/consent", {
    method: "PATCH",
    body: { consentData },
  });
}

// ── PORTAL DEL PACIENTE — Citas ───────────────────────────────────────────────

/**
 * Obtiene las citas del paciente identificado por teléfono.
 * Lee pc_appointments (JSONB array) filtrando por patientId,
 * devuelve citas ordenadas cronológicamente.
 */
export async function getAppointmentsByPhone(phone) {
  void phone;
  return portalFetch("/appointments");
}

/**
 * Actualiza el status de una cita en pc_appointments.
 * Busca el row del psicólogo que contiene la cita por appointmentId,
 * y hace PATCH con el array actualizado.
 */
export async function updateAppointmentStatus(appointmentId, patch) {
  return portalFetch("/appointments", {
    method: "PATCH",
    body: { appointmentId, patch },
  });
}

/**
 * Obtiene el teléfono del psicólogo dueño del paciente identificado por phone.
 * Necesario para generar el link de WhatsApp de solicitud de cambio.
 */
export async function getPsychologistPhoneByPatientPhone(phone) {
  void phone;
  const data = await portalFetch("/contact");
  return data?.phone || null;
}

/**
 * Obtiene los datos de perfil del paciente identificado por teléfono.
 * Solo devuelve campos seguros para mostrar al propio paciente.
 */
export async function getPatientByPhone(phone) {
  void phone;
  return portalFetch("/patient");
}

/**
 * Obtiene los pagos del paciente identificado por teléfono.
 * Cruza pc_patients → patientId → filtra pc_payments.
 */
export async function getPaymentsByPhone(phone) {
  void phone;
  return portalFetch("/payments");
}
