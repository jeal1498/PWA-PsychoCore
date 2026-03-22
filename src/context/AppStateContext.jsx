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
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) setUserId(session?.user?.id ?? null);
      } catch (err) {
        console.error("[auth] Error en getSession:", err);
      } finally {
        if (mounted) setAuthReady(true);
      }
    };

    initAuth();

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

  // Timeout de seguridad — LATCH + timer de una sola vez (v12).
  //
  // BUG (v11): essentialDataLoaded en el array de dependencias causaba que
  // React cancelara y reiniciara el timer cada vez que oscillaba true→false.
  // Con queries lentas o re-renders frecuentes, el timer NUNCA disparaba.
  //
  // FIX (v12): timerStarted ref garantiza que el timer arranca exactamente
  // una vez cuando authReady=true, y nunca se cancela por re-renders.
  // Si los datos llegan antes de 8s, dataReady=true ya desbloquea la UI.
  // Si no llegan, el timer dispara a los 8s sin falta.
  const timedOutRef             = useRef(false);
  const timerStarted            = useRef(false);
  const [dataTimedOut, setDataTimedOut] = useState(false);

  useEffect(() => {
    if (!authReady)           return; // Esperar auth antes de arrancar
    if (timerStarted.current) return; // Solo arrancar el timer una vez

    timerStarted.current = true;
    const t = setTimeout(() => {
      if (!timedOutRef.current) {
        timedOutRef.current = true;
        setDataTimedOut(true);
      }
    }, 8000);

    return () => clearTimeout(t);
  }, [authReady]); // Solo depende de authReady — nunca de essentialDataLoaded

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
