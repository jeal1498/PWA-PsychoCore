// ─────────────────────────────────────────────────────────────────────────────
// src/context/AppStateContext.jsx
// v16: Sin localStorage + variables globales para depuración (__debugPatients,
// __debugPatientsLoaded, etc.)
// ─────────────────────────────────────────────────────────────────────────────
import { createContext, useContext, useMemo, useState, useEffect, useRef } from "react";
import { useSupabaseStorage } from "../hooks/useSupabaseStorage.js";
import { supabase }           from "../lib/supabase.js";
import { DEFAULT_PROFILE }    from "../sampleData.js";

// Mapa de módulo → loaders mínimos bloqueantes
const MODULE_ESSENTIALS = {
  "dashboard"  : ["pLoaded", "aLoaded"],
  "patients"   : ["pLoaded"],
  "agenda"     : ["aLoaded", "pLoaded"],
  "sessions"   : ["sLoaded", "pLoaded"],
  "finance"    : ["pyLoaded", "svLoaded"],
  "tasks"      : ["sLoaded", "pLoaded"],
  "stats"      : ["pLoaded", "aLoaded"],
  "risk"       : ["raLoaded", "pLoaded"],
  "scales"     : ["scLoaded", "pLoaded"],
  "treatment"  : ["tpLoaded", "pLoaded"],
  "reports"    : ["pLoaded", "sLoaded"],
  "settings"   : ["prLoaded"],
};

const FALLBACK_ESSENTIALS = ["pLoaded"];

const AppStateContext = createContext(null);

export function AppStateProvider({ children }) {

  // Módulo de arranque fijo: dashboard. No se lee de localStorage.
  const bootModule = "dashboard";
  const requiredLoaderKeys = MODULE_ESSENTIALS[bootModule] ?? FALLBACK_ESSENTIALS;

  // ── Auth: solo Supabase ──────────────────────────────────────────────────
  const [userId,    setUserId]    = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          setUserId(session?.user?.id ?? null);
          setAuthReady(true);
        }
      } catch (err) {
        console.warn("[auth] Error en getSession:", err.message);
        if (mounted) setAuthReady(true);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        if (!["INITIAL_SESSION", "SIGNED_IN", "SIGNED_OUT"].includes(event)) return;
        const newId = session?.user?.id ?? null;
        setUserId(prev => prev === newId ? prev : newId);
        setAuthReady(true);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const effectiveUserId = authReady ? userId : null;

  // ── Datos ──────────────────────────────────────────────────────────────
  const [patients,        setPatients,        pLoaded]   = useSupabaseStorage("pc_patients",         [], effectiveUserId);
  const [appointments,    setAppointments,    aLoaded]   = useSupabaseStorage("pc_appointments",     [], effectiveUserId);
  const [sessions,        setSessions,        sLoaded]   = useSupabaseStorage("pc_sessions",         [], effectiveUserId);
  const [payments,        setPayments,        pyLoaded]  = useSupabaseStorage("pc_payments",         [], effectiveUserId);
  const [profile,         setProfile,         prLoaded]  = useSupabaseStorage("pc_profile",          DEFAULT_PROFILE, effectiveUserId);
  const [riskAssessments, setRiskAssessments, raLoaded]  = useSupabaseStorage("pc_risk_assessments", [], effectiveUserId);
  const [scaleResults,    setScaleResults,    scLoaded]  = useSupabaseStorage("pc_scale_results",    [], effectiveUserId);
  const [treatmentPlans,  setTreatmentPlans,  tpLoaded]  = useSupabaseStorage("pc_treatment_plans",  [], effectiveUserId);
  const [interSessions,   setInterSessions,   isLoaded]  = useSupabaseStorage("pc_inter_sessions",   [], effectiveUserId);
  const [medications,     setMedications,     medLoaded] = useSupabaseStorage("pc_medications",      [], effectiveUserId);
  const [services,        setServices,        svLoaded]  = useSupabaseStorage("pc_services",         [], effectiveUserId);

  // ── Variables globales para depuración (accesibles desde consola Eruda) ──
  if (typeof window !== "undefined") {
    window.__debugPatients = patients;
    window.__debugPatientsLoaded = pLoaded;
    window.__debugAppointments = appointments;
    window.__debugAuthReady = authReady;
    window.__debugUserId = userId;
    // También podemos exponer el estado completo si es necesario
    window.__debugState = {
      patients, pLoaded,
      appointments, aLoaded,
      sessions, sLoaded,
      payments, pyLoaded,
      profile, prLoaded,
      riskAssessments, raLoaded,
      scaleResults, scLoaded,
      treatmentPlans, tpLoaded,
      interSessions, isLoaded,
      medications, medLoaded,
      services, svLoaded,
      authReady,
      userId,
    };
  }

  // ── Semáforos de carga ─────────────────────────────────────────────────
  const loaderMap = {
    pLoaded, aLoaded, sLoaded, pyLoaded, prLoaded,
    raLoaded, scLoaded, tpLoaded, isLoaded, medLoaded, svLoaded,
  };

  const essentialDataLoaded =
    authReady && requiredLoaderKeys.every(k => loaderMap[k] === true);

  const dataReady  = essentialDataLoaded;
  const dataLoaded = essentialDataLoaded;

  // Timeout de seguridad (10s desde montaje)
  const timedOutRef = useRef(false);
  const [dataTimedOut, setDataTimedOut] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!timedOutRef.current) {
        timedOutRef.current = true;
        setDataTimedOut(true);
      }
    }, 10000);
    return () => clearTimeout(t);
  }, []);

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
    essentialDataLoaded,
    dataTimedOut,
    authReady,
    pLoaded, aLoaded, sLoaded, pyLoaded, prLoaded,
    raLoaded, scLoaded, tpLoaded, isLoaded, medLoaded, svLoaded,
    allData,
    mp,
  }), [
    mp, allData, profile,
    dataReady, dataLoaded, essentialDataLoaded, dataTimedOut, authReady,
    pLoaded, aLoaded, sLoaded, pyLoaded, prLoaded,
    raLoaded, scLoaded, tpLoaded, isLoaded, medLoaded, svLoaded,
  ]);

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
