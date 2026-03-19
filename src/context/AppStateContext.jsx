// ─────────────────────────────────────────────────────────────────────────────
// src/context/AppStateContext.jsx
// FASE 1 — Centraliza los 11 useSupabaseStorage que antes vivían en App.jsx.
// Expone useAppState() para que cualquier módulo consuma el estado sin
// prop drilling. App.jsx queda limpio: solo maneja auth, UI y navegación.
// ─────────────────────────────────────────────────────────────────────────────
import { createContext, useContext, useMemo, useState, useEffect } from "react";
import { useSupabaseStorage } from "../hooks/useSupabaseStorage.js";
import { DEFAULT_PROFILE }    from "../sampleData.js";

const AppStateContext = createContext(null);

// ── Provider ─────────────────────────────────────────────────────────────────
export function AppStateProvider({ children }) {
  const [patients,        setPatients,        pLoaded]   = useSupabaseStorage("pc_patients",         []);
  const [appointments,    setAppointments,    aLoaded]   = useSupabaseStorage("pc_appointments",     []);
  const [sessions,        setSessions,        sLoaded]   = useSupabaseStorage("pc_sessions",         []);
  const [payments,        setPayments,        pyLoaded]  = useSupabaseStorage("pc_payments",         []);
  const [profile,         setProfile,         prLoaded]  = useSupabaseStorage("pc_profile",          DEFAULT_PROFILE);
  const [riskAssessments, setRiskAssessments, raLoaded]  = useSupabaseStorage("pc_risk_assessments", []);
  const [scaleResults,    setScaleResults,    scLoaded]  = useSupabaseStorage("pc_scale_results",    []);
  const [treatmentPlans,  setTreatmentPlans,  tpLoaded]  = useSupabaseStorage("pc_treatment_plans",  []);
  const [interSessions,   setInterSessions,   isLoaded]  = useSupabaseStorage("pc_inter_sessions",   []);
  const [medications,     setMedications,     medLoaded] = useSupabaseStorage("pc_medications",      []);
  const [services,        setServices,        svLoaded]  = useSupabaseStorage("pc_services",         []);

  // Muestra la app en cuanto cargue el primer dato crítico (pacientes o perfil).
  // El resto llega en segundo plano sin bloquear el render.
  const dataReady  = pLoaded || prLoaded;
  const dataLoaded = pLoaded && aLoaded && sLoaded && pyLoaded && prLoaded
                  && raLoaded && scLoaded && tpLoaded && isLoaded && medLoaded && svLoaded;

  // Timeout de seguridad — si en 3s dataReady sigue false (red lenta,
  // token expirado), la app pasa igual al dashboard con datos vacíos.
  const [dataTimedOut, setDataTimedOut] = useState(false);
  useEffect(() => {
    if (dataReady) { setDataTimedOut(false); return; }
    const t = setTimeout(() => setDataTimedOut(true), 8000);
    return () => clearTimeout(t);
  }, [dataReady]);

  // Snapshot completo para exportar/backup (Settings lo usa)
  const allData = useMemo(() => ({
    patients, appointments, sessions, payments, profile,
    riskAssessments, scaleResults, treatmentPlans, interSessions, medications,
    services,
  }), [patients, appointments, sessions, payments, profile,
       riskAssessments, scaleResults, treatmentPlans, interSessions, medications,
       services]);

  // Objeto plano "mp" que los módulos reciben como spread props.
  // Permite migrar módulo a módulo sin reescribir sus firmas de una vez.
  const mp = useMemo(() => ({
    patients, setPatients,
    appointments, setAppointments,
    sessions, setSessions,
    payments, setPayments,
    riskAssessments, setRiskAssessments,
    scaleResults, setScaleResults,
    treatmentPlans, setTreatmentPlans,
    interSessions, setInterSessions,
    medications, setMedications,
    services, setServices,
  }), [patients, appointments, sessions, payments,
       riskAssessments, scaleResults, treatmentPlans,
       interSessions, medications, services]);

  const value = useMemo(() => ({
    // Estado individual (para consumo selectivo)
    patients,        setPatients,
    appointments,    setAppointments,
    sessions,        setSessions,
    payments,        setPayments,
    profile,         setProfile,
    riskAssessments, setRiskAssessments,
    scaleResults,    setScaleResults,
    treatmentPlans,  setTreatmentPlans,
    interSessions,   setInterSessions,
    medications,     setMedications,
    services,        setServices,
    // Flags de carga
    dataReady,
    dataLoaded,
    dataTimedOut,
    // Helpers compuestos
    allData,
    mp,
  }), [mp, allData, profile, dataReady, dataLoaded, dataTimedOut]);

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}

// ── Hook de acceso ────────────────────────────────────────────────────────────
export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("[PsychoCore] useAppState debe usarse dentro de <AppStateProvider>");
  return ctx;
}
