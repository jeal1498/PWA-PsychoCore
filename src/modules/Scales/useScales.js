import { useState, useMemo } from "react";
import { uid, fmt, todayDate } from "../../utils.js";
import { SCALES, getSeverity, getDASS21Subscores, getASRSPartA, normalizeScaleId } from "./scales.utils.js";

// ─────────────────────────────────────────────────────────────────────────────
// useScales — lógica de estado y handlers del módulo de escalas
// ─────────────────────────────────────────────────────────────────────────────
export function useScales({ scaleResults, setScaleResults, patients }) {
  const [tab,           setTab]           = useState("results");
  const [showForm,      setShowForm]      = useState(false);
  const [activeScale,   setActiveScale]   = useState("PHQ9");
  const [filterPt,      setFilterPt]      = useState("");
  const [filterScale,   setFilterScale]   = useState("todos");
  const [showAllScales, setShowAllScales] = useState(false);

  // ── Filtered + sorted results ──────────────────────────────────────────────
  const filtered = useMemo(() =>
    scaleResults
      .filter(r =>
        (!filterPt || r.patientId === filterPt) &&
        (filterScale === "todos" || normalizeScaleId(r.scaleId) === filterScale)
      )
      .sort((a, b) => b.date.localeCompare(a.date)),
    [scaleResults, filterPt, filterScale]
  );

  // ── Count per scale ────────────────────────────────────────────────────────
  const countByScale = useMemo(() =>
    Object.fromEntries(
      Object.keys(SCALES).map(k => [
        k,
        scaleResults.filter(r => normalizeScaleId(r.scaleId) === k).length,
      ])
    ),
    [scaleResults]
  );

  // ── Patients with at least one result ─────────────────────────────────────
  const patientsWithResults = useMemo(() => {
    const normalizedResults = scaleResults.map(r => ({ ...r, scaleId: normalizeScaleId(r.scaleId) }));
    const ids = new Set(normalizedResults.map(r => r.patientId));
    return patients.filter(p => ids.has(p.id));
  }, [scaleResults, patients]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const saveResult = (data) => {
    const pt = patients.find(p => p.id === data.patientId);
    setScaleResults(prev => [...prev, { ...data, id: "sc" + uid(), patientName: pt?.name || "" }]);
    setShowForm(false);
  };

  const deleteResult = (id) => setScaleResults(prev => prev.filter(r => r.id !== id));

  const toggleFilterScale = (scaleId) =>
    setFilterScale(prev => prev === scaleId ? "todos" : scaleId);

  return {
    // state
    tab, setTab,
    showForm, setShowForm,
    activeScale, setActiveScale,
    filterPt, setFilterPt,
    filterScale, setFilterScale,
    showAllScales, setShowAllScales,
    // derived
    filtered,
    countByScale,
    patientsWithResults,
    // handlers
    saveResult,
    deleteResult,
    toggleFilterScale,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// useScaleForm — estado local del formulario de aplicación de escala
// ─────────────────────────────────────────────────────────────────────────────
export function useScaleForm({ scaleId, onSave, onClose }) {
  const scale    = SCALES[scaleId];
  const totalQ   = scale.questions.length;
  const isAnalog = scale.scaleType === "analog";
  const initVal  = isAnalog ? Array(totalQ).fill(5) : Array(totalQ).fill(null);

  const [patientId, setPatientId] = useState("");
  const [date,      setDate]      = useState(fmt(todayDate));
  const [answers,   setAnswers]   = useState(initVal);
  const [notes,     setNotes]     = useState("");
  const [step,      setStep]      = useState(0);

  const CHUNK      = isAnalog ? totalQ : scaleId === "ASRS" ? 6 : 5;
  const totalPages = Math.ceil(totalQ / CHUNK);
  const pageStart  = step * CHUNK;
  const pageEnd    = Math.min(pageStart + CHUNK, totalQ);
  const pageQ      = scale.questions.slice(pageStart, pageEnd);

  const answered    = isAnalog ? totalQ : answers.filter(a => a !== null).length;
  const allAnswered = answered === totalQ;
  const score       = answers.reduce((s, a) => s + (a ?? 0), 0);
  const sev         = allAnswered ? getSeverity(scaleId, score) : null;
  const pageComplete = isAnalog ? true : pageQ.every((_, i) => answers[pageStart + i] !== null);
  const pct          = (answered / totalQ) * 100;

  const setAnswer = (qi, val) => {
    setAnswers(prev => { const next = [...prev]; next[qi] = val; return next; });
  };

  const handleSave = () => {
    if (!patientId || !allAnswered) return;
    onSave({ patientId, date, scaleId, answers, score, notes });
  };

  const asrsResult  = scaleId === "ASRS"   && allAnswered ? getASRSPartA(answers)       : null;
  const dassResult  = scaleId === "DASS21" && allAnswered ? getDASS21Subscores(answers)  : null;

  return {
    scale, totalQ, isAnalog,
    patientId, setPatientId,
    date, setDate,
    answers, setAnswer,
    notes, setNotes,
    step, setStep,
    totalPages, pageStart, pageEnd, pageQ,
    answered, allAnswered, score, sev,
    pageComplete, pct,
    handleSave,
    asrsResult,
    dassResult,
    onClose,
  };
}
