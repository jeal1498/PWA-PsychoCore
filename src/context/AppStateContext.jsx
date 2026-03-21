// ─────────────────────────────────────────────────────────────────────────────
// src/context/AppStateContext.jsx
//
// v8: Arquitectura de Carga Bajo Demanda (On-Demand Loading).
//
// PROBLEMA (v7):
//   dataLoaded era el AND de los 11 hooks. En redes lentas, la pantalla de
//   carga bloqueaba hasta que la última tabla terminara, aunque el Dashboard
//   solo necesite Pacientes y Agenda para ser funcional.
//
// SOLUCIÓN — dos semáforos independientes:
//
//   essentialDataLoaded  (BLOQUEANTE para la UI)
//     authReady && pLoaded && aLoaded
//     Solo Pacientes + Agenda necesarios para mostrar el Dashboard.
//     Tiempo típico: ~300-600 ms en lugar de 1-3 s.
//
//   dataLoaded  (ALIAS de essentialDataLoaded — compatibilidad hacia atrás)
//     Los componentes que ya leen `dataLoaded` siguen funcionando sin cambios.
//
//   Loaders individuales  (para spinners internos por módulo)
//     sLoaded, pyLoaded, prLoaded, raLoaded, scLoaded, tpLoaded,
//     isLoaded, medLoaded, svLoaded — exportados en el value del Provider.
//     Cada módulo secundario los usa para mostrar su propio spinner sin
//     bloquear la navegación global.
//
// FLUJO AL REFRESCAR:
//   1. Mount          → authReady=false → pantalla verde (Auth)
//   2. getSession()   → authReady=true  → 11 hooks arrancan en paralelo
//   3. pLoaded+aLoaded → essentialDataLoaded=true → ¡entra al Dashboard!
//   4. Las 9 tablas restantes terminan en segundo plano silenciosamente.
//
// FLUJO DE MÓDULO SECUNDARIO (ej. Pagos):
//   El módulo lee `pyLoaded` del contexto. Si false → spinner interno propio.
//   Cuando pyLoaded=true → renderiza datos. Sin re-mostrar la pantalla global.
//
// GARANTÍAS HEREDADAS (v6-v7):
//   · initAuth con try/catch/finally → authReady=true siempre, incluso con error.
//   · effectiveUserId=null mientras authReady=false → hooks idle en arranque.
//   · onAuthStateChange cubre login, logout y token refresh posteriores.
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

  // ── Semáforos de carga ───────────────────────────────────────────────────
  // essentialDataLoaded: BLOQUEANTE para la pantalla de carga global.
  //   Solo requiere Pacientes + Agenda — las dos tablas mínimas para que el
  //   Dashboard sea funcional. El usuario entra al app en ~300-600 ms típicos.
  const essentialDataLoaded = authReady && pLoaded && aLoaded;

  // dataLoaded: alias de essentialDataLoaded para compatibilidad hacia atrás.
  //   Todos los componentes que ya leen `dataLoaded` siguen funcionando sin
  //   ningún cambio. Las 9 tablas secundarias cargan en segundo plano.
  const dataReady  = essentialDataLoaded;
  const dataLoaded = essentialDataLoaded;

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
    // Semáforos globales
    dataReady,
    dataLoaded,
    essentialDataLoaded,
    dataTimedOut,
    authReady,
    // Loaders individuales — para spinners internos en módulos secundarios.
    // Uso en módulo: const { pyLoaded } = useAppState();
    // if (!pyLoaded) return <Spinner />;
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
    // Objetos agrupados
    allData,
    mp,
  }), [mp, allData, profile, dataReady, dataLoaded, essentialDataLoaded, dataTimedOut, authReady,
       pLoaded, aLoaded, sLoaded, pyLoaded, prLoaded, raLoaded, scLoaded, tpLoaded, isLoaded,
       medLoaded, svLoaded]);

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
