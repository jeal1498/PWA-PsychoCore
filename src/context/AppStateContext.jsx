// ─────────────────────────────────────────────────────────────────────────────
// src/context/AppStateContext.jsx
//
// v6: authReady gate + initAuth robusto con try/catch/finally.
//
// PROBLEMA ORIGINAL (v5):
//   Con registerType:"autoUpdate" + skipWaiting + clientsClaim, el SW puede
//   recargar la página antes de que Supabase haya hidratado el token de sesión.
//   onAuthStateChange dispara INITIAL_SESSION casi sincrónicamente, pero el
//   cliente Supabase aún no tiene los headers de auth listos. Los fetches de
//   los hooks fallan por RLS y consolidan un estado vacío.
//
// MEJORA EN v6:
//   initAuth usa async/await con try/catch/finally para garantizar que
//   setAuthReady(true) se ejecuta SIEMPRE, incluso si getSession() lanza una
//   excepción (timeout de red, error de configuración, etc.). Sin el finally,
//   un error inesperado dejaría authReady=false permanentemente y la app
//   nunca arrancaría.
//
// FLUJO GARANTIZADO:
//   1. Mount   → userId=null, authReady=false → hooks idle (effectiveUserId=null)
//   2. initAuth resuelve (éxito o error) → authReady=true → hooks arrancan
//   3. Con sesión: effectiveUserId="id" → hooks fetchen datos ✓
//   4. Sin sesión: effectiveUserId=null → hooks reportan loaded=true (Escenario A)
//   5. Login posterior → onAuthStateChange → userId=real → hooks fetchen ✓
//   6. Logout → onAuthStateChange → userId=null → hooks resetean (Escenario B) ✓
// ─────────────────────────────────────────────────────────────────────────────
import { createContext, useContext, useMemo, useState, useEffect } from "react";
import { useSupabaseStorage } from "../hooks/useSupabaseStorage.js";
import { supabase }           from "../lib/supabase.js";
import { DEFAULT_PROFILE }    from "../sampleData.js";

const AppStateContext = createContext(null);

export function AppStateProvider({ children }) {

  // ── Auth ─────────────────────────────────────────────────────────────────
  const [userId,    setUserId]    = useState(null);
  // authReady: false hasta que initAuth haya terminado (con éxito o error).
  // Nunca vuelve a false; representa "la hidratación inicial ya concluyó".
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    // initAuth: async/await con try/catch/finally para garantizar que
    // setAuthReady(true) se llama pase lo que pase. Un error inesperado en
    // getSession() (timeout, red caída) sin el finally dejaría authReady=false
    // y la app nunca arrancaría.
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          setUserId(session?.user?.id ?? null);
        }
      } catch (err) {
        console.error("[auth] Error en getSession:", err);
        // userId permanece null; la app arrancará en estado "sin sesión"
      } finally {
        // Semáforo verde: siempre se activa, incluso tras un error.
        // Garantiza que los hooks reciban su effectiveUserId y puedan
        // reportar loaded=true para desbloquear la UI.
        if (mounted) setAuthReady(true);
      }
    };

    initAuth();

    // Cambios POSTERIORES a la hidratación inicial: login, logout, token refresh.
    // Para estos eventos authReady ya es true, por lo que los hooks reaccionan
    // de inmediato al nuevo userId.
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
    authReady,       // expuesto para que la UI muestre un estado "verificando sesión"
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
