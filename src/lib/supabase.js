// ─────────────────────────────────────────────────────────────────────────────
// src/lib/supabase.js
// Cliente Supabase + todas las funciones de tareas
// ─────────────────────────────────────────────────────────────────────────────

// ⚠️  REEMPLAZA estos valores con los tuyos:
// Supabase Dashboard → Settings → API
const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON;

// ── Fetch helper ─────────────────────────────────────────────────────────────
const sb = (path, opts = {}) =>
  fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    headers: {
      "apikey":        SUPABASE_ANON,
      "Authorization": `Bearer ${SUPABASE_ANON}`,
      "Content-Type":  "application/json",
      "Prefer":        opts.prefer || "return=representation",
      ...opts.headers,
    },
    ...opts,
  });

// ── TASK ASSIGNMENTS ─────────────────────────────────────────────────────────

/** Crea una asignación de tarea para un paciente */
export async function createAssignment({ patientId, patientName, patientPhone, templateId, title, notes }) {
  const res = await sb("/task_assignments", {
    method: "POST",
    body: JSON.stringify({ patient_id: patientId, patient_name: patientName, patient_phone: patientPhone, template_id: templateId, title, notes: notes || null }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data[0];
}

/** Trae todas las tareas de un paciente (por patient_id) */
export async function getAssignmentsByPatient(patientId) {
  const res = await sb(`/task_assignments?patient_id=eq.${encodeURIComponent(patientId)}&order=assigned_at.desc`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/** Trae todas las tareas activas de un número de teléfono (portal del paciente) */
export async function getAssignmentsByPhone(phone) {
  const res = await sb(`/task_assignments?patient_phone=eq.${encodeURIComponent(phone)}&order=assigned_at.desc`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/** Marca una asignación como completada */
export async function completeAssignment(assignmentId) {
  const res = await sb(`/task_assignments?id=eq.${assignmentId}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "completed", completed_at: new Date().toISOString() }),
  });
  if (!res.ok) throw new Error(await res.text());
}

/** Elimina una asignación */
export async function deleteAssignment(assignmentId) {
  const res = await sb(`/task_assignments?id=eq.${assignmentId}`, {
    method: "DELETE",
    prefer: "return=minimal",
  });
  if (!res.ok) throw new Error(await res.text());
}

// ── TASK RESPONSES ────────────────────────────────────────────────────────────

/** Guarda las respuestas del paciente */
export async function submitResponse({ assignmentId, patientPhone, responses }) {
  const res = await sb("/task_responses", {
    method: "POST",
    body: JSON.stringify({ assignment_id: assignmentId, patient_phone: patientPhone, responses }),
  });
  if (!res.ok) throw new Error(await res.text());
  // Marcar asignación como completada
  await completeAssignment(assignmentId);
  const data = await res.json();
  return data[0];
}

/** Trae todas las respuestas de una asignación */
export async function getResponsesByAssignment(assignmentId) {
  const res = await sb(`/task_responses?assignment_id=eq.${assignmentId}&order=submitted_at.desc`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/** Trae TODAS las respuestas de un paciente (todos sus assignmentIds) */
export async function getAllResponsesByPhone(phone) {
  const res = await sb(`/task_responses?patient_phone=eq.${encodeURIComponent(phone)}&order=submitted_at.desc`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
