import { createContext, useContext, useMemo, useState, useEffect, useRef } from "react";
import { useSupabaseStorage } from "../hooks/useSupabaseStorage.js";
import { supabase }           from "../lib/supabase.js";
import { DEFAULT_PROFILE }    from "../sampleData.js";

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

// ── Valor shell: activo mientras auth no está lista o no hay sesión ───────────
// Garantiza que cualquier consumidor de useAppState() tenga valores seguros
// antes de que DataProvider se monte (p.ej. LockScreen, Onboarding).
const noop = () => {};
const EMPTY_DATA = {
  patients: [], appointments: [], sessions: [], payments: [],
  profile: DEFAULT_PROFILE, riskAssessments: [], scaleResults: [],
  treatmentPlans: [], interSessions: [], medications: [], services: [],
  expenses: [], assignments: [],
  activePatientContext: null,
};
function makeShellValue(authReady) {
  return {
    ...EMPTY_DATA,
    setPatients: noop, setAppointments: noop, setSessions: noop,
    setPayments: noop, setProfile: noop, setRiskAssessments: noop,
    setScaleResults: noop, setTreatmentPlans: noop, setInterSessions: noop,
    setMedications: noop, setServices: noop, setExpenses: noop,
    setAssignments: noop,
    activePatientContext: null,
    setActivePatientContext: noop,
    dataReady: false, dataLoaded: false, essentialDataLoaded: false,
    dataTimedOut: false, authReady,
    pLoaded: false, aLoaded: false, sLoaded: false, pyLoaded: false,
    prLoaded: false, raLoaded: false, scLoaded: false, tpLoaded: false,
    isLoaded: false, medLoaded: false, svLoaded: false, exLoaded: false,
    allData: { ...EMPTY_DATA },
    mp: {
      patients: [], setPatients: noop,
      appointments: [], setAppointments: noop,
      sessions: [], setSessions: noop,
      payments: [], setPayments: noop,
      riskAssessments: [], setRiskAssessments: noop,
      scaleResults: [], setScaleResults: noop,
      treatmentPlans: [], setTreatmentPlans: noop,
      interSessions: [], setInterSessions: noop,
      medications: [], setMedications: noop,
      services: [], setServices: noop,
      expenses: [], setExpenses: noop,
      assignments: [], setAssignments: noop,
      activePatientContext: null,
      setActivePatientContext: noop,
    },
  };
}

// ── DataProvider ──────────────────────────────────────────────────────────────
// SOLO se monta cuando userId es un string real y confirmado.
// Esto garantiza que useSupabaseStorage NUNCA reciba userId = null,
// eliminando el bug donde los loaders sobrescriben el estado con datos vacíos.
function DataProvider({ userId, children }) {
  const bootModule = "dashboard";
  const requiredLoaderKeys = MODULE_ESSENTIALS[bootModule] ?? FALLBACK_ESSENTIALS;

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
  const [expenses,        setExpenses,        exLoaded]  = useSupabaseStorage("pc_expenses",          [], userId);
  const [assignments,     setAssignments,     asLoaded]  = useSupabaseStorage("pc_assignments",        [], userId);
  const [activePatientContext, setActivePatientContext] = useState(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem("pc_active_patient_context");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (activePatientContext) {
        localStorage.setItem("pc_active_patient_context", JSON.stringify(activePatientContext));
      } else {
        localStorage.removeItem("pc_active_patient_context");
      }
    } catch {}
  }, [activePatientContext]);

  // Exponer para depuración en consola del navegador
  if (typeof window !== "undefined") {
    window.__debugPatients        = patients;
    window.__debugPatientsLoaded  = pLoaded;
    window.__debugAuthReady       = true;
    window.__debugUserId          = userId;
    window.__debugEffectiveUserId = userId;
  }

  const loaderMap = {
    pLoaded, aLoaded, sLoaded, pyLoaded, prLoaded,
    raLoaded, scLoaded, tpLoaded, isLoaded, medLoaded, svLoaded, exLoaded, asLoaded,
  };

  const essentialDataLoaded = requiredLoaderKeys.every(k => loaderMap[k] === true);
  const dataReady  = essentialDataLoaded;
  const dataLoaded = essentialDataLoaded;

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
    riskAssessments, scaleResults, treatmentPlans, interSessions, medications, services, expenses, assignments,
  }), [patients, appointments, sessions, payments, profile,
       riskAssessments, scaleResults, treatmentPlans, interSessions, medications, services, expenses, assignments]);

  const mp = useMemo(() => ({
    patients,        setPatients,
    appointments,    setAppointments,
    sessions,        setSessions,
    payments,        setPayments,
    riskAssessments, setRiskAssessments,
    scaleResults,    setScaleResults,
    treatmentPlans,  setTreatmentPlans,
    interSessions,   setInterSessions,
    medications,     setMedications,
    services,        setServices,
    expenses,        setExpenses,
    assignments,     setAssignments,
  }), [patients, appointments, sessions, payments,
       riskAssessments, scaleResults, treatmentPlans,
       interSessions, medications, services, expenses, assignments]);

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
    expenses,        setExpenses,
    assignments,     setAssignments,
    activePatientContext, setActivePatientContext,
    dataReady,
    dataLoaded,
    essentialDataLoaded,
    dataTimedOut,
    authReady: true,
    pLoaded, aLoaded, sLoaded, pyLoaded, prLoaded,
    raLoaded, scLoaded, tpLoaded, isLoaded, medLoaded, svLoaded, exLoaded, asLoaded,
    allData,
    mp,
  }), [
    mp, allData, profile,
    dataReady, dataLoaded, essentialDataLoaded, dataTimedOut,
    pLoaded, aLoaded, sLoaded, pyLoaded, prLoaded,
    raLoaded, scLoaded, tpLoaded, isLoaded, medLoaded, svLoaded, exLoaded,
    activePatientContext,
  ]);

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}

// ── AppStateProvider ──────────────────────────────────────────────────────────
// Responsabilidad única: resolver auth y pasar userId a DataProvider.
// DataProvider se monta solo cuando userId es un valor real — nunca con null.
export function AppStateProvider({ children }) {
  const [userId,    setUserId]    = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    // ── onAuthStateChange: ÚNICA fuente de verdad para auth ─────────────────
    // setUserId y setAuthReady SOLO se llaman aquí, nunca en getSession().
    // Supabase garantiza que INITIAL_SESSION se dispara siempre al montar,
    // lo que cubre correctamente el caso de refresh con sesión activa.
    const SESSION_EVENTS = [
      "INITIAL_SESSION", "SIGNED_IN", "SIGNED_OUT",
      "TOKEN_REFRESHED", "USER_UPDATED",
    ];

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("[AUTH] event:", event);
        console.log("[AUTH] session:", session);
        if (!mounted) return;
        if (!SESSION_EVENTS.includes(event)) return;
        const newId = session?.user?.id ?? null;
        // Nunca sobrescribir un userId válido con null desde el listener:
        // INITIAL_SESSION puede llegar con session=null en ciertos contextos
        // de PWA aunque getSession() ya haya confirmado una sesión activa.
        setUserId(prev => {
          if (newId === null && prev !== null) return prev;
          return newId;
        });
        setAuthReady(true);
      }
    );

    // ── getSession: fuente inicial confiable ─────────────────────────────────
    // Establece el estado de sesión inmediatamente tras el refresh,
    // antes de que onAuthStateChange tenga oportunidad de dispararse.
    const initAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        console.log("[AUTH] initial session:", data?.session);
        const initialUserId = data?.session?.user?.id ?? null;
        if (mounted) {
          setUserId(initialUserId);
          setAuthReady(true);
        }
      } catch (err) {
        console.warn("[AUTH] getSession error:", err.message);
        if (mounted) setAuthReady(true);
      }
    };

    initAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Auth no resuelta o sin sesión activa → shell vacío
  if (!authReady || !userId) {
    return (
      <AppStateContext.Provider value={makeShellValue(authReady)}>
        {children}
      </AppStateContext.Provider>
    );
  }

  // Auth confirmada + userId real → montar DataProvider
  // key={userId} fuerza remount completo si el usuario cambia de cuenta
  return (
    <DataProvider key={userId} userId={userId}>
      {children}
    </DataProvider>
  );
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
