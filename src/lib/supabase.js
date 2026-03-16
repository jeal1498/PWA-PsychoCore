// ─────────────────────────────────────────────────────────────────────────────
// src/lib/supabase.js
// Cliente Supabase + Auth + funciones de tareas
// ─────────────────────────────────────────────────────────────────────────────
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL  = "https://zzujedxzgntvbqrieflu.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6dWplZHh6Z250dmJxcmllZmx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NDQxMDIsImV4cCI6MjA4OTIyMDEwMn0.44IoYvJpk0SUmip1jgrGwyDrAHaT1PXbKrsi1voO9cY";

// ── Cliente oficial (usado para Auth) ─────────────────────────────────────────
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// ── Auth helpers ──────────────────────────────────────────────────────────────
export const signInWithGoogle = () =>
  supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });

export const signOut = () => supabase.auth.signOut();

// ── Fetch helper (para REST directo — tareas) ─────────────────────────────────
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

export async function createAssignment({ patientId, patientName, patientPhone, templateId, title, notes }) {
  const res = await sb("/task_assignments", {
    method: "POST",
    body: JSON.stringify({ patient_id: patientId, patient_name: patientName, patient_phone: patientPhone, template_id: templateId, title, notes: notes || null }),
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
