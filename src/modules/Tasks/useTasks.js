// ─────────────────────────────────────────────────────────────────────────────
// src/modules/Tasks/useTasks.js
// Hook de lógica del módulo Tareas — sin JSX ni imports de UI
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from "react";
import { TEMPLATES_LIST } from "../../lib/taskTemplates.js";
import { createAssignment, getAssignmentsByPatient, deleteAssignment, createPortalAccessLink } from "../../lib/supabase.js";
import { emit } from "../../lib/eventBus.js"; // FASE 3
import { useAppState } from "../../context/AppStateContext.jsx";
import { buildTaskMessage } from "./tasks.utils.js";

// ── Acción WhatsApp (fuera del hook, sin estado propio) ───────────────────────
export const openTaskWhatsApp = async (phone, patientName, taskTitle, profile, onError) => {
  if (!phone) return;
  try {
    const { accessUrl } = await createPortalAccessLink(phone);
    const msg = encodeURIComponent(buildTaskMessage(patientName, taskTitle, accessUrl, profile));
    const waUrl = `https://wa.me/${phone.replace(/\D/g, "")}?text=${msg}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  } catch (error) {
    console.error("No se pudo generar el enlace seguro del portal:", error);
    if (onError) {
      onError(true);
      setTimeout(() => onError(false), 4000);
    }
  }
};

// ── Hook principal ────────────────────────────────────────────────────────────
export function useTasks(patients) {
  const { activePatientContext, setActivePatientContext } = useAppState();

  // ── Vista ─────────────────────────────────────────────────────────────────
  const [view,          setView]          = useState("dashboard"); // "dashboard" | "manage"

  // ── Lista de assignments (vista "Por paciente") ───────────────────────────
  const [assignments,   setAssignments]   = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState("");
  const [filterPt,      setFilterPt]      = useState("");

  // ── Modal de respuestas ───────────────────────────────────────────────────
  const [viewResponses, setViewResponses] = useState(null);

  // ── Modal nueva tarea ─────────────────────────────────────────────────────
  const [showAdd,       setShowAdd]       = useState(false);
  const [filterCat,     setFilterCat]     = useState("Todas");
  const [selPatient,    setSelPatient]    = useState("");
  const [selTemplate,   setSelTemplate]   = useState(null);
  const [notes,         setNotes]         = useState("");
  const [saving,        setSaving]        = useState(false);
  const [saveError,     setSaveError]     = useState("");
  const [seededPatientFilter, setSeededPatientFilter] = useState(false);

  // ── Sincronizar contexto activo → filterPt (una sola vez) ────────────────
  useEffect(() => {
    if (activePatientContext?.patientId && !seededPatientFilter && !filterPt) {
      setFilterPt(activePatientContext.patientId);
      setSeededPatientFilter(true);
    }
  }, [activePatientContext?.patientId, seededPatientFilter, filterPt]);

  // ── Pre-seleccionar paciente al abrir modal ───────────────────────────────
  useEffect(() => {
    if (!showAdd || !activePatientContext?.patientId) return;
    setSelPatient(prev => prev || activePatientContext.patientId);
  }, [showAdd, activePatientContext?.patientId]);

  // ── Carga de assignments ──────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!filterPt) { setAssignments([]); return; }
    setLoading(true);
    setError("");
    try {
      const data = await getAssignmentsByPatient(filterPt);
      setAssignments(data);
    } catch {
      setError("No se pudo conectar con Supabase. Verifica la configuración.");
    } finally {
      setLoading(false);
    }
  }, [filterPt]);

  useEffect(() => { load(); }, [load]);

  // ── Guardar nueva asignación ──────────────────────────────────────────────
  const handleSave = async () => {
    if (!selPatient || !selTemplate) return;
    const patient = patients.find(p => p.id === selPatient);
    if (!patient?.phone) {
      setSaveError("Este paciente no tiene número de teléfono registrado. Agrégalo en su expediente.");
      return;
    }
    setSaving(true);
    setSaveError("");
    // Timeout de 8s — si Supabase no responde, desbloquear el botón
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), 8000)
    );
    try {
      await Promise.race([
        createAssignment({
          patientId:    patient.id,
          patientName:  patient.name,
          patientPhone: patient.phone.replace(/\D/g, ""),
          templateId:   selTemplate.id,
          title:        selTemplate.title,
          notes:        notes.trim() || null,
        }),
        timeout,
      ]);
      // FASE 3 — notificar al resto del sistema que se asignó una tarea manualmente
      emit.taskAssigned({ patientId: patient.id, patientName: patient.name, sessionId: null, count: 1 });
      setShowAdd(false);
      setSelTemplate(null);
      setNotes("");
      setFilterPt(patient.id);
    } catch (e) {
      setSaveError(
        e.message === "timeout"
          ? "La conexión tardó demasiado. Verifica tu internet e intenta de nuevo."
          : "Error al guardar. Revisa la conexión con Supabase."
      );
    } finally {
      setSaving(false);
    }
  };

  // ── Eliminar asignación ───────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar esta tarea?")) return;
    try {
      await deleteAssignment(id);
      setAssignments(prev => prev.filter(a => a.id !== id));
    } catch {
      alert("No se pudo eliminar. Intenta de nuevo.");
    }
  };

  // ── Abrir modal nueva tarea (con reset de form) ───────────────────────────
  const openAdd = () => {
    setShowAdd(true);
    setSelPatient("");
    setSelTemplate(null);
    setNotes("");
    setSaveError("");
  };

  // ── Actualizar contexto activo al cambiar paciente en select ─────────────
  const handleSelectPatient = (value) => {
    setSelPatient(value);
    const patient = patients.find(p => p.id === value);
    if (patient) {
      setActivePatientContext({
        patientId:   patient.id,
        patientName: patient.name || "",
        source:      "tasks",
        updatedAt:   new Date().toISOString(),
      });
    }
  };

  // ── Derivados ─────────────────────────────────────────────────────────────
  const filteredTemplates = filterCat === "Todas"
    ? TEMPLATES_LIST
    : TEMPLATES_LIST.filter(t => t.category === filterCat);

  const canSave = !!(selPatient && selTemplate);

  return {
    // vista
    view, setView,
    // lista
    assignments, loading, error, filterPt, setFilterPt, load,
    // modal respuestas
    viewResponses, setViewResponses,
    // modal nueva tarea
    showAdd, setShowAdd, openAdd,
    filterCat, setFilterCat,
    selPatient, setSelPatient, handleSelectPatient,
    selTemplate, setSelTemplate,
    notes, setNotes,
    saving, saveError,
    handleSave, handleDelete,
    // derivados
    filteredTemplates, canSave,
    // contexto
    activePatientContext,
  };
}
