// ─────────────────────────────────────────────────────────────────────────────
// src/context/AppStateContext.jsx
//
// v3: fix auth race condition.
// Antes: getSession() + skip INITIAL_SESSION → podía resolver null antes
// de que la sesión OAuth estuviera lista → userId nunca se establecía.
// Ahora: solo onAuthStateChange incluyendo INITIAL_SESSION, que es el
// patrón oficial de Supabase para detectar la sesión al cargar la página.
// ─────────────────────────────────────────────────────────────────────────────
import { createContext, useContext, useMemo, useState, useEffect } from "react";
import { useSupabaseStorage } from "../hooks/useSupabaseStorage.js";
import { supabase }           from "../lib/supabase.js";
import { DEFAULT_PROFILE }    from "../sampleData.js";

const AppStateContext = createContext(null);

export function AppStateProvider({ children }) {

  // ── Auth — fuente única de userId para todos los hooks ───────────────────
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    // onAuthStateChange con INITIAL_SESSION cubre tanto la carga inicial
    // como login/logout posteriores. Es el patrón oficial de Supabase.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUserId(session?.user?.id ?? null);
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  // ── Datos — todos reciben el mismo userId ya resuelto ────────────────────
  const [patients,        setPatients,        pLoaded]   = useSupabaseStorage("pc_patients",         [], userId);
  const [appointments,    setAppointments,    aLoaded]   = useSupabaseStorage("pc_appointments",     [], userId);
  const [sessions,        setSessions,        sLoaded]   = useSupabaseStorage("pc_sessions",         [], userId);
  const [payments,        setPayments,        pyLoaded]  = useSupabaseStorage("pc_payments",         [], userId);
  const [profile,         setProfile,         prLoaded]  = useSupabaseStorage("pc_profile",          DEFAULT_PROFILE, userId);
  const [riskAssessments, setRiskAssessments, raLoaded]  = useSupabaseStorage("pc_risk_assessments", [], userId);
  const [scaleResults,    setScaleResults,    scLoaded]  = useSupabaseStorage("pc_scale_results",    [], userId);
  const [treatmentPlans,  setTreatmentPlans,  tpLoaded]  = useSupabaseStorage("pc_treatment_plans",  [], userId);
  const [interSessions,   setInterSessions,   isLoaded]  = useSupabaseStorage("pc_inter_sessions",   [], userId);
  const [medications,     setMedications,     medLoaded] = useSupabaseStorage("pc_medications",      [], userId);
  const [services,        setServices,        svLoaded]  = useSupabaseStorage("pc_services",         [], userId);

  const dataReady  = pLoaded || prLoaded;
  const dataLoaded = pLoaded && aLoaded && sLoaded && pyLoaded && prLoaded
                  && raLoaded && scLoaded && tpLoaded && isLoaded && medLoaded && svLoaded;

  const [dataTimedOut, setDataTimedOut] = useState(false);
  useEffect(() => {
    if (dataReady) { setDataTimedOut(false); return; }
    const t = setTimeout(() => setDataTimedOut(true), 8000);
    return () => clearTimeout(t);
  }, [dataReady]);

  const allData = useMemo(() => ({
    patients, appointments, sessions, payments, profile,
    riskAssessments, scaleResults, treatmentPlans, interSessions, medications,
    services,
  }), [patients, appointments, sessions, payments, profile,
       riskAssessments, scaleResults, treatmentPlans, interSessions, medications,
       services]);

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
    dataReady,
    dataLoaded,
    dataTimedOut,
    allData,
    mp,
  }), [mp, allData, profile, dataReady, dataLoaded, dataTimedOut]);

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
