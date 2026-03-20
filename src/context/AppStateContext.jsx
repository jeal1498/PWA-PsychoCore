// ─────────────────────────────────────────────────────────────────────────────
// src/context/AppStateContext.jsx
//
// CAMBIO v2: resuelve la sesión UNA sola vez aquí y pasa `userId` a cada
// useSupabaseStorage. Elimina el race condition de 11 getSession() simultáneos.
// ─────────────────────────────────────────────────────────────────────────────
import { createContext, useContext, useMemo, useState, useEffect } from "react";
import { useSupabaseStorage } from "../hooks/useSupabaseStorage.js";
import { supabase }           from "../lib/supabase.js";
import { DEFAULT_PROFILE }    from "../sampleData.js";

const AppStateContext = createContext(null);

// ── Provider ─────────────────────────────────────────────────────────────────
export function AppStateProvider({ children }) {

  // ── Auth — fuente única de userId para todos los hooks ───────────────────
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    // Carga inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });

    // Escuchar cambios (login / logout / token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "INITIAL_SESSION") return;
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

  // Muestra la app en cuanto cargue el primer dato crítico (pacientes o perfil).
  const dataReady  = pLoaded || prLoaded;
  const dataLoaded = pLoaded && aLoaded && sLoaded && pyLoaded && prLoaded
                  && raLoaded && scLoaded && tpLoaded && isLoaded && medLoaded && svLoaded;

  // Timeout de seguridad — si en 8s dataReady sigue false, mostrar igual
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

  // Objeto plano "mp" para spread props en módulos
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

// ── Hook de consumo ───────────────────────────────────────────────────────────
export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
