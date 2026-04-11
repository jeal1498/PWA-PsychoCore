import { useState, useMemo, useEffect } from "react";
import {
  getLatestRisk,
  getPatientScales,
  getPatientSessions,
  getPatientPlan,
  progressPct,
  printEvaluacion,
  printAlta,
  printDerivacion,
} from "./reports.utils.js";

// ─────────────────────────────────────────────────────────────────────────────
// REPORT TYPE CONFIG
// (icons are Lucide component references — passed in from Reports.jsx)
// ─────────────────────────────────────────────────────────────────────────────
export const REPORT_FIELDS = {
  evaluacion: [
    { key: "motivo",       label: "Motivo de consulta",                        hint: "Se prellenará desde el plan de tratamiento si existe.",                    rows: 4 },
    { key: "impresion",    label: "Impresión clínica y recomendaciones *",      hint: "Síntesis del cuadro clínico y plan propuesto.",                           rows: 5 },
    { key: "observaciones",label: "Observaciones adicionales",                  hint: "Información complementaria (opcional).",                                  rows: 3 },
  ],
  alta: [
    { key: "evolucion",    label: "Evolución del paciente",                    hint: "Describe el progreso a lo largo del proceso terapéutico.",                 rows: 5 },
    { key: "estadoAlta",   label: "Estado al alta *",                          hint: "Condición actual del paciente al cierre del proceso.",                     rows: 4 },
    { key: "prevencion",   label: "Plan de prevención de recaídas *",          hint: "Estrategias acordadas con el paciente para mantener los logros.",          rows: 4 },
    { key: "recomendaciones",label: "Recomendaciones post-alta",               hint: "Seguimiento sugerido, recursos, grupos de apoyo, etc.",                   rows: 3 },
    { key: "observaciones",label: "Observaciones adicionales",                  hint: "Opcional.",                                                               rows: 2 },
  ],
  derivacion: [
    { key: "destinatario", label: "Especialidad / Servicio al que se deriva",  hint: "Ej: Psiquiatría, Neurología, Trabajo Social.",                            rows: 1 },
    { key: "profesional",  label: "Nombre del profesional (opcional)",         hint: "",                                                                         rows: 1 },
    { key: "motivo",       label: "Motivo de derivación *",                    hint: "Razón principal por la que se refiere al paciente.",                       rows: 4 },
    { key: "resumenClinico",label: "Resumen clínico",                          hint: "Descripción del cuadro, evolución y estado actual.",                       rows: 5 },
    { key: "informacionAdicional",label: "Información clínica adicional",      hint: "Medicación actual, consideraciones especiales, etc.",                      rows: 3 },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────────────────────
export function useReports({ patients, sessions, scaleResults, treatmentPlans, riskAssessments, profile }) {
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [reportType, setReportType]               = useState("evaluacion");
  const [customFields, setCustomFields]            = useState({});
  const [generated, setGenerated]                 = useState(false);

  const patient = useMemo(
    () => patients.find(p => p.id === selectedPatientId),
    [patients, selectedPatientId]
  );

  const ptData = useMemo(() => {
    if (!patient) return null;
    const ptSessions = getPatientSessions(sessions, patient.id);
    const allScales  = getPatientScales(scaleResults, patient.id);
    const plan       = getPatientPlan(treatmentPlans, patient.id);
    const latestRisk = getLatestRisk(riskAssessments, patient.id);
    return { ptSessions, allScales, plan, latestRisk };
  }, [patient, sessions, scaleResults, treatmentPlans, riskAssessments]);

  // Pre-fill campos desde datos existentes cuando cambia el paciente o tipo
  useEffect(() => {
    if (!patient || !ptData) { setCustomFields({}); setGenerated(false); return; }
    const fills = {};
    if (reportType === "evaluacion") fills.motivo    = ptData.plan?.chiefComplaint || "";
    if (reportType === "alta")       fills.prevencion = ptData.plan?.notes || "";
    setCustomFields(fills);
    setGenerated(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPatientId, reportType]);

  const setField = (key, val) => setCustomFields(prev => ({ ...prev, [key]: val }));

  const hasMinData = useMemo(() => {
    if (!patient) return false;
    if (reportType === "alta") return ptData?.ptSessions?.length > 0;
    return true;
  }, [patient, reportType, ptData]);

  const handleGenerate = () => {
    const args = {
      patient,
      plan:       ptData.plan,
      allScales:  ptData.allScales,
      latestRisk: ptData.latestRisk,
      ptSessions: ptData.ptSessions,
      profile,
      custom:     customFields,
    };
    if (reportType === "evaluacion")  printEvaluacion(args);
    else if (reportType === "alta")   printAlta(args);
    else if (reportType === "derivacion") printDerivacion(args);
    setGenerated(true);
  };

  const handleSelectPatient = (id) => {
    setSelectedPatientId(id);
    setGenerated(false);
  };

  const handleSelectType = (id) => {
    setReportType(id);
    setGenerated(false);
  };

  return {
    // state
    selectedPatientId,
    reportType,
    customFields,
    generated,
    // derived
    patient,
    ptData,
    hasMinData,
    progressPct,
    // handlers
    setField,
    handleGenerate,
    handleSelectPatient,
    handleSelectType,
  };
}
