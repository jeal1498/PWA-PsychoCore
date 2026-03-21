// ─────────────────────────────────────────────────────────────────────────────
// src/context/AppStateContext.jsx
//
// v5: authReady gate — elimina la race condition entre SW autoUpdate y auth.
//
// PROBLEMA RESUELTO:
//   Con registerType:"autoUpdate" + skipWaiting + clientsClaim, el SW puede
//   recargar la página antes de que Supabase haya hidratado el token de sesión.
//   onAuthStateChange dispara INITIAL_SESSION casi sincrónicamente (lee
//   localStorage), pero el cliente Supabase aún no tiene los headers de auth
//   listos para las peticiones. Si los hooks reciben el userId en ese instante,
//   sus fetches fallan por RLS y consolidan un estado vacío.
//
// SOLUCIÓN:
//   authReady actúa como semáforo. Se activa SOLO después de que getSession()
//   resuelve, momento en el que el cliente Supabase garantiza que el token
//   está hidratado y las peticiones RLS tendrán éxito.
//   Los hooks reciben `null` mientras authReady = false, permanecen en idle
//   sin borrar ni fetchear nada, y arrancan solo cuando el auth está listo.
//
// FLUJO GARANTIZADO:
//   1. Mount   → userId=null, authReady=false → hooks idle (effectiveUserId=null)
//   2. getSession() resuelve → userId=real, authReady=true → hooks fetchen ✓
//   3. Login posterior → onAuthStateChange → userId=real (authReady ya=true) ✓
//   4. Logout → onAuthStateChange → userId=null (authReady=true) → hooks reset ✓
// ─────────────────────────────────────────────────────────────────────────────
import { createContext, useContext, useMemo, useState, useEffect } from "react";
import { useSupabaseStorage } from "../hooks/useSupabaseStorage.js";
import { supabase }           from "../lib/supabase.js";
import { DEFAULT_PROFILE }    from "../sampleData.js";

const AppStateContext = createContext(null);

export function AppStateProvider({ children }) {

  // ── Auth ─────────────────────────────────────────────────────────────────
  const [userId,    setUserId]    = useState(null);
  // authReady: false hasta que getSession() haya respondido.
  // Nunca vuelve a false; representa "la hidratación inicial ya terminó".
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    // 1. getSession() es la ÚNICA fuente que activa authReady.
    //    Garantiza que el cliente Supabase tiene el token correctamente
    //    establecido antes de que cualquier hook intente un fetch.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setUserId(session?.user?.id ?? null);
      setAuthReady(true); // ← semáforo verde; jamás vuelve a false
    });

    // 2. Cambios POSTERIORES a la hidratación inicial: login, logout,
    //    token refresh. Para estos eventos authReady ya es true, por lo que
    //    los hooks reaccionan de inmediato al nuevo userId.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (mounted) setUserId(session?.user?.id ?? null);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // effectiveUserId — null mientras authReady=false, bloquea los 11 hooks.
  // Una vez authReady=true, pasa el userId real (o null si no hay sesión).
  const effectiveUserId = authReady ? userId : null;

  // ── Datos — todos reciben el mismo effectiveUserId ya resuelto ───────────
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

  const dataReady  = pLoaded || prLoaded;
  const dataLoaded = pLoaded && aLoaded && sLoaded && pyLoaded && prLoaded
                  && raLoaded && scLoaded && tpLoaded && isLoaded && medLoaded && svLoaded;

  // El timer de timeout solo tiene sentido después de que authReady=true y
  // los hooks hayan arrancado. Sin este guard, el timeout contaría desde el
  // mount y podría marcar un false-positive antes de que los hooks empiecen.
  const [dataTimedOut, setDataTimedOut] = useState(false);
  useEffect(() => {
    if (!authReady) return; // esperar a que los hooks hayan arrancado
    if (dataReady)  { setDataTimedOut(false); return; }
    const t = setTimeout(() => setDataTimedOut(true), 8000);
    return () => clearTimeout(t);
  }, [dataReady, authReady]);

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
    authReady,       // expuesto para que la UI pueda mostrar un estado "checking auth"
    allData,
    mp,
  }), [mp, allData, profile, dataReady, dataLoaded, dataTimedOut, authReady]);

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
