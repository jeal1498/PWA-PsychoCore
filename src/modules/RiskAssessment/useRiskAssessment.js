import { useState, useMemo } from "react";
import { uid } from "../../utils.js";
import { RISK_CONFIG, suggestRisk, BLANK_FORM } from "./riskAssessment.utils.js";

// ── Hook principal del módulo ─────────────────────────────────────────────────
export function useRiskAssessment({ riskAssessments, setRiskAssessments, patients }) {
  const [showForm,    setShowForm]    = useState(false);
  const [filterPt,   setFilterPt]    = useState("");
  const [filterLevel, setFilterLevel] = useState("todos");
  const [tab,        setTab]         = useState("list");

  // Lista filtrada y ordenada
  const filtered = useMemo(() =>
    riskAssessments
      .filter(a =>
        (!filterPt    || a.patientId  === filterPt) &&
        (filterLevel === "todos" || a.riskLevel === filterLevel)
      )
      .sort((a, b) => b.date.localeCompare(a.date)),
    [riskAssessments, filterPt, filterLevel]
  );

  // Stats de resumen
  const alertCount = riskAssessments.filter(
    a => a.riskLevel === "alto" || a.riskLevel === "inminente"
  ).length;

  const byLevel = Object.fromEntries(
    Object.keys(RISK_CONFIG).map(k => [k, riskAssessments.filter(a => a.riskLevel === k).length])
  );

  // Evaluación más reciente por paciente
  const latestByPatient = useMemo(() => {
    const map = {};
    riskAssessments.forEach(a => {
      if (!map[a.patientId] || a.date > map[a.patientId].date) map[a.patientId] = a;
    });
    return map;
  }, [riskAssessments]);

  // Guardar nueva evaluación
  const save = (data) => {
    const pt = patients.find(p => p.id === data.patientId);
    setRiskAssessments(prev => [
      ...prev,
      { ...data, id: "ra" + uid(), patientName: pt?.name || "" },
    ]);
    setShowForm(false);
  };

  // Eliminar evaluación
  const del = (id) => setRiskAssessments(prev => prev.filter(a => a.id !== id));

  // Toggle de filtro por nivel (tap en summary card)
  const toggleLevelFilter = (k) =>
    setFilterLevel(prev => prev === k ? "todos" : k);

  return {
    // estado UI
    showForm, setShowForm,
    filterPt, setFilterPt,
    filterLevel, setFilterLevel, toggleLevelFilter,
    tab, setTab,
    // datos derivados
    filtered,
    alertCount,
    byLevel,
    latestByPatient,
    // acciones
    save,
    del,
  };
}

// ── Hook del formulario multi-step ───────────────────────────────────────────
export function useAssessmentForm({ onSave, onClose }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(BLANK_FORM);

  const set       = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setSP     = (k, v) => setForm(f => ({ ...f, safetyPlan: { ...f.safetyPlan, [k]: v } }));
  const toggleFactor = (f) => setForm(prev => ({
    ...prev,
    protectiveFactors: prev.protectiveFactors.includes(f)
      ? prev.protectiveFactors.filter(x => x !== f)
      : [...prev.protectiveFactors, f],
  }));

  const suggested     = useMemo(() => suggestRisk(form), [form]);
  const showPlanFields = (form.riskLevel || suggested) !== "bajo";
  const TOTAL_STEPS   = showPlanFields ? 4 : 3;

  const canNext = () => {
    if (step === 0) return !!form.patientId;
    return true;
  };

  const handleSave = () => {
    const finalLevel = form.riskLevel || suggested;
    onSave({ ...form, riskLevel: finalLevel });
  };

  const goBack  = () => (step === 0 ? onClose() : setStep(s => s - 1));
  const goNext  = () => setStep(s => s + 1);

  return {
    step, form,
    set, setSP, toggleFactor,
    suggested, showPlanFields, TOTAL_STEPS,
    canNext, handleSave,
    goBack, goNext,
  };
}
