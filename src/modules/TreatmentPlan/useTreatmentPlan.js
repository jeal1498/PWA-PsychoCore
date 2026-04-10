import { useState, useMemo } from "react";
import { uid, fmt, todayDate } from "../../utils.js";
import {
  BLANK_PLAN,
  BLANK_FORMULATION,
  OBJECTIVE_STATUS,
  OBJECTIVE_HORIZON,
  PLAN_STATUS,
  FORMULATION_SECTIONS,
  cycleObjectiveStatus,
  printPlan,
  printAltaPDF,
} from "./treatmentPlan.utils.js";

// Re-export configs so UI can import from one place
export {
  BLANK_FORMULATION,
  OBJECTIVE_STATUS,
  OBJECTIVE_HORIZON,
  PLAN_STATUS,
  FORMULATION_SECTIONS,
};

// ─────────────────────────────────────────────────────────────────────────────
// BLANK NEW-OBJECTIVE SHAPE
// ─────────────────────────────────────────────────────────────────────────────
export const BLANK_NEW_OBJ = {
  description: "", horizon: "corto", status: "pendiente",
  interventions: "", criteria: "",
};

// ─────────────────────────────────────────────────────────────────────────────
// HOOK — list view + plan CRUD
// ─────────────────────────────────────────────────────────────────────────────
export function useTreatmentPlan({ treatmentPlans, setTreatmentPlans, patients }) {
  const [selected,     setSelected]     = useState(null);
  const [showNew,      setShowNew]      = useState(false);
  const [newForm,      setNewForm]      = useState({ ...BLANK_PLAN });
  const [filterStatus, setFilterStatus] = useState("todos");

  const filtered = useMemo(() =>
    treatmentPlans.filter(p => filterStatus === "todos" || p.status === filterStatus),
    [treatmentPlans, filterStatus]
  );

  const totalActive      = treatmentPlans.filter(p => p.status === "activo").length;
  const totalCompleted   = treatmentPlans.filter(p => p.status === "completado").length;
  const patientsWithPlan = new Set(treatmentPlans.map(p => p.patientId)).size;

  const saveNew = () => {
    if (!newForm.patientId) return;
    const pt = patients.find(p => p.id === newForm.patientId);
    setTreatmentPlans(prev => [...prev, { ...newForm, id: "tp" + uid(), patientName: pt?.name || "" }]);
    setNewForm({ ...BLANK_PLAN });
    setShowNew(false);
  };

  const updatePlan = (updated) => {
    setTreatmentPlans(prev => prev.map(p => p.id === updated.id ? updated : p));
    if (selected?.id === updated.id) setSelected(updated);
  };

  const deletePlan = (id) => {
    setTreatmentPlans(prev => prev.filter(p => p.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const toggleFilter = (key) =>
    setFilterStatus(prev => prev === key ? "todos" : key);

  const clearFilter = () => setFilterStatus("todos");

  return {
    // state
    selected, setSelected,
    showNew,  setShowNew,
    newForm,  setNewForm,
    filterStatus,
    // derived
    filtered,
    totalActive,
    totalCompleted,
    patientsWithPlan,
    // handlers
    saveNew,
    updatePlan,
    deletePlan,
    toggleFilter,
    clearFilter,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK — plan detail (objectives + tabs)
// ─────────────────────────────────────────────────────────────────────────────
export function usePlanDetail({ plan, onUpdate }) {
  const [tab,        setTab]        = useState("objectives");
  const [showAddObj, setShowAddObj] = useState(false);
  const [newObj,     setNewObj]     = useState({ ...BLANK_NEW_OBJ });

  const objectives = plan.objectives || [];
  const achieved   = objectives.filter(o => o.status === "logrado").length;
  const inProgress = objectives.filter(o => o.status === "en_proceso").length;

  /** Generic field updater for plan top-level keys */
  const setPlanField = (k) => (v) => onUpdate({ ...plan, [k]: v });

  const addObjective = () => {
    if (!newObj.description.trim()) return;
    onUpdate({ ...plan, objectives: [...objectives, { ...newObj, id: "obj" + uid() }] });
    setNewObj({ ...BLANK_NEW_OBJ });
    setShowAddObj(false);
  };

  const updateObjective = (updated) =>
    onUpdate({ ...plan, objectives: objectives.map(o => o.id === updated.id ? updated : o) });

  const deleteObjective = (id) =>
    onUpdate({ ...plan, objectives: objectives.filter(o => o.id !== id) });

  const markReviewToday = () =>
    onUpdate({ ...plan, lastReviewDate: fmt(todayDate) });

  return {
    // state
    tab, setTab,
    showAddObj, setShowAddObj,
    newObj, setNewObj,
    // derived
    objectives,
    achieved,
    inProgress,
    // handlers
    setPlanField,
    addObjective,
    updateObjective,
    deleteObjective,
    markReviewToday,
    // cycle helper (pure fn, re-exported for convenience)
    cycleObjectiveStatus,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK — alta tab
// ─────────────────────────────────────────────────────────────────────────────
export function useAltaTab({ plan, patient, sessions, scaleResults, profile, onUpdate, setAppointments }) {
  const discharge  = plan.discharge || {};
  const objectives = plan.objectives || [];
  const achieved   = objectives.filter(o => o.status === "logrado").length;
  const pct        = objectives.length > 0 ? Math.round((achieved / objectives.length) * 100) : null;
  const isComplete = plan.status === "completado";

  // Scale comparisons
  const ptScales = scaleResults.filter(r => r.patientId === plan.patientId)
    .sort((a, b) => a.date.localeCompare(b.date));
  const byScale = {};
  ptScales.forEach(r => { if (!byScale[r.scaleId]) byScale[r.scaleId] = []; byScale[r.scaleId].push(r); });
  const scaleComps = Object.entries(byScale).map(([id, rs]) => ({
    id, first: rs[0], last: rs[rs.length - 1], count: rs.length,
  }));

  const setDischargeField = (k) => (v) =>
    onUpdate({ ...plan, discharge: { ...discharge, [k]: v } });

  const createFollowUps = (months) => {
    if (!setAppointments || !patient) return;
    const today = new Date();
    months.forEach(m => {
      const d = new Date(today);
      d.setMonth(d.getMonth() + m);
      const dateStr = d.toISOString().split("T")[0];
      setAppointments(prev => [...prev, {
        id: "appt" + uid(),
        patientId: patient.id,
        patientName: patient.name,
        date: dateStr,
        time: "09:00",
        type: "Seguimiento post-alta",
        status: "pendiente",
        planId: plan.id,
        followUpMonth: m,
      }]);
    });
  };

  const confirmAlta = () =>
    onUpdate({
      ...plan,
      status: "completado",
      discharge: { ...discharge, completedAt: fmt(todayDate) },
    });

  const handlePrintAltaPDF = () =>
    printAltaPDF(plan, patient, sessions, scaleComps, profile);

  return {
    // derived
    discharge,
    objectives,
    achieved,
    pct,
    isComplete,
    scaleComps,
    // handlers
    setDischargeField,
    createFollowUps,
    confirmAlta,
    handlePrintAltaPDF,
  };
}

// Re-export printPlan so UI can import from this hook file too
export { printPlan };
