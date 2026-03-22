// ─────────────────────────────────────────────────────────────────────────────
// src/lib/supabase.js
// Cliente Supabase + Auth + funciones de tareas
// ─────────────────────────────────────────────────────────────────────────────
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  ?? "https://mxcmfhxnjcwoueqwvzyb.supabase.co";
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14Y21maHhuamN3b3VlcXd2enliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMjk1NDAsImV4cCI6MjA4OTcwNTU0MH0.gHuDbZPUXSE6ocz0KWPq8G5zdwEzcd4ia2N6kp1x4JU";

// ── Cliente oficial (usado para Auth) ─────────────────────────────────────────
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

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
async function getAuthToken() {
  // Timeout de 2s — si getSession() se cuelga, caer al anon key
  // para no bloquear operaciones de tareas
  try {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), 2000)
    );
    const { data: { session } } = await Promise.race([
      supabase.auth.getSession(),
      timeout,
    ]);
    return session?.access_token || SUPABASE_ANON;
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
    body: JSON.stringify({ status: "completed", completed_at: new Date().toISOString() }),
  });
  if (!res.ok) throw new Error(await res.text());
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
  const res = await sb("/task_responses", {
    method: "POST",
    body: JSON.stringify({ assignment_id: assignmentId, patient_phone: patientPhone, responses }),
  });
  if (!res.ok) throw new Error(await res.text());
  await completeAssignment(assignmentId);
  const data = await res.json();
  return data[0];
}

export async function getResponsesByAssignment(assignmentId) {
  const res = await sb(`/task_responses?assignment_id=eq.${assignmentId}&order=submitted_at.desc`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getAllResponsesByPhone(phone) {
  const res = await sb(`/task_responses?patient_phone=eq.${encodeURIComponent(phone)}&order=submitted_at.desc`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
