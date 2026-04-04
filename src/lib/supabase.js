// ─────────────────────────────────────────────────────────────────────────────
// src/lib/supabase.js
// Cliente Supabase + Auth + funciones de tareas
// ─────────────────────────────────────────────────────────────────────────────
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  ?? "https://mxcmfhxnjcwoueqwvzyb.supabase.co";
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14Y21maHhuamN3b3VlcXd2enliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMjk1NDAsImV4cCI6MjA4OTcwNTU0MH0.gHuDbZPUXSE6ocz0KWPq8G5zdwEzcd4ia2N6kp1x4JU";

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
  const res = await sb("/task_responses", {
    method: "POST",
    prefer: "return=minimal",
    body: JSON.stringify({ assignment_id: assignmentId, patient_phone: patientPhone, responses }),
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error("[submitResponse] POST /task_responses failed:", errText);
    throw new Error(errText);
  }
  await completeAssignment(assignmentId);
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

// ── PORTAL DEL PACIENTE — Consentimiento ──────────────────────────────────────

/** Obtiene el objeto `consent` del paciente identificado por teléfono.
 *  Retorna el objeto consent (puede tener signed:false) o null si no existe. */
export async function getConsentByPhone(phone) {
  const res = await sb(`/patients?phone=eq.${encodeURIComponent(phone)}&select=consent&limit=1`);
  if (!res.ok) throw new Error(await res.text());
  const rows = await res.json();
  return rows[0]?.consent ?? null;
}

/** Guarda (merge) los datos de firma en el campo `consent` del paciente.
 *  consentData debe incluir: { signed, signedAt, signatureDataUrl, signedBy } */
export async function savePatientConsent(phone, consentData) {
  const res = await sb(`/patients?phone=eq.${encodeURIComponent(phone)}`, {
    method:  "PATCH",
    prefer:  "return=minimal",
    body:    JSON.stringify({ consent: consentData }),
  });
  if (!res.ok) throw new Error(await res.text());
}

// ── PORTAL DEL PACIENTE — Citas ───────────────────────────────────────────────

/**
 * Obtiene las citas del paciente identificado por teléfono.
 * Lee pc_appointments (JSONB array) filtrando por patientId,
 * devuelve citas ordenadas cronológicamente.
 */
export async function getAppointmentsByPhone(phone) {
  // 1. Resolver patientId desde pc_patients por teléfono
  const pRes = await sb(`/pc_patients?select=data&limit=100`);
  if (!pRes.ok) throw new Error(await pRes.text());
  const rows = await pRes.json();

  let patientId = null;
  for (const row of rows) {
    const arr = Array.isArray(row.data) ? row.data : [];
    const match = arr.find(p => p.phone === phone);
    if (match) { patientId = match.id; break; }
  }
  if (!patientId) return [];

  // 2. Leer pc_appointments y filtrar por patientId en JS
  const aRes = await sb(`/pc_appointments?select=data&limit=100`);
  if (!aRes.ok) throw new Error(await aRes.text());
  const aRows = await aRes.json();
  const appts = [];
  for (const row of aRows) {
    const arr = Array.isArray(row.data) ? row.data : [];
    arr.forEach(a => {
      if (a.patientId === patientId) appts.push(a);
    });
  }
  appts.sort((a, b) => a.date.localeCompare(b.date) || (a.time||"").localeCompare(b.time||""));
  return appts;
}

/**
 * Actualiza el status de una cita en pc_appointments.
 * Busca el row del psicólogo que contiene la cita por appointmentId,
 * y hace PATCH con el array actualizado.
 */
export async function updateAppointmentStatus(appointmentId, patch) {
  // 1. Encontrar qué row (psychologist) contiene esta cita
  const aRes = await sb(`/pc_appointments?select=psychologist_id,data&limit=100`);
  if (!aRes.ok) throw new Error(await aRes.text());
  const rows = await aRes.json();

  let targetRow = null;
  for (const row of rows) {
    const arr = Array.isArray(row.data) ? row.data : [];
    if (arr.find(a => a.id === appointmentId)) { targetRow = row; break; }
  }
  if (!targetRow) throw new Error("Cita no encontrada");

  // 2. Actualizar el item dentro del array
  const updatedData = targetRow.data.map(a =>
    a.id === appointmentId ? { ...a, ...patch } : a
  );

  // 3. PATCH al row del psicólogo
  const pRes = await sb(
    `/pc_appointments?psychologist_id=eq.${targetRow.psychologist_id}`,
    {
      method: "PATCH",
      prefer: "return=minimal",
      body: JSON.stringify({ data: updatedData }),
    }
  );
  if (!pRes.ok) throw new Error(await pRes.text());
}

/**
 * Obtiene el teléfono del psicólogo dueño del paciente identificado por phone.
 * Necesario para generar el link de WhatsApp de solicitud de cambio.
 */
export async function getPsychologistPhoneByPatientPhone(phone) {
  // 1. Encontrar psychologist_id que tiene este paciente
  const pRes = await sb(`/pc_patients?select=psychologist_id,data&limit=100`);
  if (!pRes.ok) throw new Error(await pRes.text());
  const rows = await pRes.json();

  let psychologistId = null;
  for (const row of rows) {
    const arr = Array.isArray(row.data) ? row.data : [];
    if (arr.find(p => p.phone === phone)) { psychologistId = row.psychologist_id; break; }
  }
  if (!psychologistId) return null;

  // 2. Leer pc_profile de ese psicólogo
  const prRes = await sb(`/pc_profile?psychologist_id=eq.${psychologistId}&select=data&limit=1`);
  if (!prRes.ok) throw new Error(await prRes.text());
  const prRows = await prRes.json();
  return prRows[0]?.data?.phone || null;
}

/**
 * Obtiene los datos de perfil del paciente identificado por teléfono.
 * Solo devuelve campos seguros para mostrar al propio paciente.
 */
export async function getPatientByPhone(phone) {
  const res = await sb(`/pc_patients?select=data&limit=100`);
  if (!res.ok) throw new Error(await res.text());
  const rows = await res.json();

  for (const row of rows) {
    const arr = Array.isArray(row.data) ? row.data : [];
    const match = arr.find(p => p.phone === phone);
    if (match) {
      return {
        name:              match.name              || "",
        phone:             match.phone             || "",
        email:             match.email             || "",
        birthdate:         match.birthdate         || "",
        emergencyName:     match.emergencyName     || "",
        emergencyPhone:    match.emergencyPhone    || "",
        emergencyRelation: match.emergencyRelation || "",
      };
    }
  }
  return null;
}

/**
 * Obtiene los pagos del paciente identificado por teléfono.
 * Cruza pc_patients → patientId → filtra pc_payments.
 */
export async function getPaymentsByPhone(phone) {
  // 1. Resolver patientId desde pc_patients
  const pRes = await sb(`/pc_patients?select=data&limit=100`);
  if (!pRes.ok) throw new Error(await pRes.text());
  const rows = await pRes.json();

  let patientId = null;
  for (const row of rows) {
    const arr = Array.isArray(row.data) ? row.data : [];
    const match = arr.find(p => p.phone === phone);
    if (match) { patientId = match.id; break; }
  }
  if (!patientId) return [];

  // 2. Leer pc_payments y filtrar por patientId
  const payRes = await sb(`/pc_payments?select=data&limit=100`);
  if (!payRes.ok) throw new Error(await payRes.text());
  const payRows = await payRes.json();

  const payments = [];
  for (const row of payRows) {
    const arr = Array.isArray(row.data) ? row.data : [];
    arr.forEach(p => { if (p.patientId === patientId) payments.push(p); });
  }
  payments.sort((a, b) => b.date.localeCompare(a.date));
  return payments;
}

