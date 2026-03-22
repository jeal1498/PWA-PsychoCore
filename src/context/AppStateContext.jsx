// ─────────────────────────────────────────────────────────────────────────────
// src/context/AppStateContext.jsx
//
// v11: Timeout como latch — fix al bug de pantalla de carga infinita.
//
// BUG (v10) — carrera en el ciclo de vida que reiniciaba el timer infinitamente:
//
//   1. Mount: authReady=false, effectiveUserId=null.
//   2. Escenario A: todos los hooks corren con userId=null → setLoaded(true) × 11.
//   3. initAuth resuelve: setAuthReady(true) + setUserId(realId) — batcheados.
//   4. Un render con authReady=true + TODOS los loaders aún en true (Escenario A
//      aún no fue limpiado) → essentialDataLoaded = TRUE brevemente.
//   5. El timeout effect detecta essentialDataLoaded=true →
//      llama setDataTimedOut(false) + no arranca ningún timer.       ← BUG
//   6. Los hooks re-corren con userId real → setLoaded(false) × 11.
//   7. essentialDataLoaded = false → nuevo timer de 8 s arranca.
//   8. Si los fetches son lentos pero terminan en < 8 s → OK.
//      Si la red cuelga → timer dispara después de 8 s → OK.
//      PERO si cualquier fetch efímero causa otro flicker de
//      essentialDataLoaded antes de los 8 s → timer se reinicia → colgado.
//
// FIX — dataTimedOut como latch (una vez true, nunca vuelve a false):
//
//   Se agrega un ref `timedOutRef` que actúa como cerrojo:
//   · El timeout effect ya NO llama setDataTimedOut(false) jamás.
//   · Una vez que dataTimedOut=true, el effect sale inmediatamente (return early).
//   · Esto garantiza que en ≤ 8 s desde que authReady=true, la app SIEMPRE
//     desbloquea la pantalla de carga, sin importar cuántos flickers ocurran.
//
// ARQUITECTURA DE CARGA (heredada de v10 — sin cambios):
//
//   Module-Aware On-Demand Loading: lee pc_last_module de localStorage para
//   determinar qué tablas son bloqueantes en el arranque.
//
//   Último módulo: "dashboard"  → espera pLoaded + aLoaded   → ~300 ms
//   Último módulo: "patients"   → espera pLoaded             → ~200 ms
//   Último módulo: "finance"    → espera pyLoaded + svLoaded → ~200 ms
//   Último módulo: "sessions"   → espera sLoaded + pLoaded   → ~250 ms
//
// GARANTÍAS (acumuladas v6-v11):
//   · initAuth con try/catch/finally → authReady=true siempre, incluso con error.
//   · effectiveUserId=null mientras authReady=false → hooks idle en arranque.
//   · onAuthStateChange cubre login, logout y token refresh posteriores.
//   · useSupabaseStorage garantiza setLoaded(true) en TODOS los paths.
//   · dataTimedOut es un latch → la pantalla de carga nunca puede colgarse.
// ─────────────────────────────────────────────────────────────────────────────
import { createContext, useContext, useMemo, useState, useEffect, useRef } from "react";
import { useSupabaseStorage } from "../hooks/useSupabaseStorage.js";
import { supabase }           from "../lib/supabase.js";
import { DEFAULT_PROFILE }    from "../sampleData.js";

// ── Mapa de módulo → loaders mínimos bloqueantes ──────────────────────────
// Claves   : valores exactos de activeModule usados en App.jsx
// Valores  : array de claves del loaderMap que DEBEN ser true para que
//            la pantalla de carga global ceda paso al módulo en cuestión.
const MODULE_ESSENTIALS = {
  // Vista principal
  "dashboard"  : ["pLoaded", "aLoaded"],

  // Pacientes
  "patients"   : ["pLoaded"],

  // Agenda / citas
  "agenda"     : ["aLoaded", "pLoaded"],

  // Notas clínicas / sesiones
  "sessions"   : ["sLoaded", "pLoaded"],

  // Finanzas / pagos
  "finance"    : ["pyLoaded", "svLoaded"],

  // Tareas
  "tasks"      : ["sLoaded", "pLoaded"],

  // Estadísticas (necesita varios, pero solo bloquea con lo mínimo útil)
  "stats"      : ["pLoaded", "aLoaded"],

  // Evaluación de riesgo
  "risk"       : ["raLoaded", "pLoaded"],

  // Escalas psicológicas
  "scales"     : ["scLoaded", "pLoaded"],

  // Planes de tratamiento
  "treatment"  : ["tpLoaded", "pLoaded"],

  // Reportes
  "reports"    : ["pLoaded", "sLoaded"],

  // Configuración / perfil
  "settings"   : ["prLoaded"],
};

// Fallback para módulos no listados (ej. módulos nuevos aún no registrados)
const FALLBACK_ESSENTIALS = ["pLoaded"];

const AppStateContext = createContext(null);

export function AppStateProvider({ children }) {

  // ── Módulo de arranque — congelado al montar, nunca cambia ───────────────
  // Lee el último módulo visitado que App.jsx guardó en localStorage.
  // useRef garantiza que el valor no se recalcula en re-renders posteriores.
  // Si no hay valor (primer arranque), usa "dashboard" como defecto.
  const bootModule = useRef(
    localStorage.getItem("pc_last_module") ?? "dashboard"
  ).current;

  const requiredLoaderKeys = MODULE_ESSENTIALS[bootModule] ?? FALLBACK_ESSENTIALS;

  // ── Auth ─────────────────────────────────────────────────────────────────
  const [userId,    setUserId]    = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        // Timeout de 5s — si getSession() se cuelga (frecuente en OAuth redirect),
        // forzar authReady=true para que el timer de datos pueda arrancar.
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("getSession timeout")), 5000)
        );
        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);
        if (mounted) setUserId(session?.user?.id ?? null);
      } catch (err) {
        console.warn("[auth] getSession error/timeout:", err.message);
        // En timeout, intentar recuperar sesión del listener onAuthStateChange
      } finally {
        if (mounted) setAuthReady(true);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (mounted) {
          setUserId(session?.user?.id ?? null);
          setAuthReady(true); // Garantiza authReady=true tras OAuth redirect
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // effectiveUserId — null mientras authReady=false, bloquea los 11 hooks.
  const effectiveUserId = authReady ? userId : null;

  // ── Datos — los 11 hooks arrancan en paralelo en cuanto authReady=true ───
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

  // ── Semáforos de carga ───────────────────────────────────────────────────
  // loaderMap: permite resolver las claves de MODULE_ESSENTIALS a booleans reales.
  const loaderMap = {
    pLoaded, aLoaded, sLoaded, pyLoaded, prLoaded,
    raLoaded, scLoaded, tpLoaded, isLoaded, medLoaded, svLoaded,
  };

  // essentialDataLoaded: BLOQUEANTE para la pantalla de carga global.
  //   Espera authReady + SOLO los loaders del módulo donde se hizo el refresh.
  //   Todos los demás cargan en segundo plano sin bloquear la UI.
  const essentialDataLoaded =
    authReady && requiredLoaderKeys.every(k => loaderMap[k] === true);

  // Alias para compatibilidad con componentes que ya leen dataLoaded/dataReady.
  const dataReady  = essentialDataLoaded;
  const dataLoaded = essentialDataLoaded;

  // Timeout de seguridad — v13: arranca desde el MOUNT, sin depender de auth.
  //
  // BUG (v11-v12): el timer dependía de authReady=true para arrancar.
  // Si supabase.auth.getSession() se cuelga (red lenta, credenciales),
  // authReady nunca se vuelve true → timer nunca arranca → pantalla infinita.
  //
  // FIX (v13): el timer arranca inmediatamente al montar el componente.
  // No depende de authReady ni de essentialDataLoaded.
  // Garantía absoluta: en ≤ 10s desde que la app carga, la UI se desbloquea.
  const timedOutRef             = useRef(false);
  const [dataTimedOut, setDataTimedOut] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!timedOutRef.current) {
        timedOutRef.current = true;
        setDataTimedOut(true);
      }
    }, 10000); // 10s desde el mount — sin condiciones
    return () => clearTimeout(t);
  }, []); // [] — corre exactamente una vez al montar, nunca se reinicia

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
    // ── Datos y setters ──────────────────────────────────────────────────
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
    // ── Semáforos globales ───────────────────────────────────────────────
    dataReady,
    dataLoaded,           // alias de essentialDataLoaded — retrocompatible
    essentialDataLoaded,
    dataTimedOut,
    authReady,
    // ── Loaders individuales — para spinners internos en módulos ─────────
    // Uso: const { pyLoaded } = useAppState();
    //      if (!pyLoaded) return <Spinner />;
    pLoaded,
    aLoaded,
    sLoaded,
    pyLoaded,
    prLoaded,
    raLoaded,
    scLoaded,
    tpLoaded,
    isLoaded,
    medLoaded,
    svLoaded,
    // ── Objetos agrupados ────────────────────────────────────────────────
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
