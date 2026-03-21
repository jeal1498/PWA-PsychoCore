// ─────────────────────────────────────────────────────────────────────────────
// src/context/AppStateContext.jsx
//
// v9: Carga Bajo Demanda orientada a ruta (Route-Aware On-Demand Loading).
//
// PROBLEMA (v8):
//   essentialDataLoaded siempre esperaba pLoaded && aLoaded sin importar en
//   qué ruta se hiciera el refresh. Si el usuario refrescaba en /pagos, aún
//   tenía que esperar a que cargaran Pacientes + Agenda antes de ver su módulo.
//
// SOLUCIÓN — semáforo dinámico por ruta de arranque:
//
//   BOOT_SEGMENT
//     El primer segmento de window.location.pathname capturado UNA SOLA VEZ
//     al montar el Provider. Se congela en un ref y nunca cambia. Representa
//     "la ruta donde el usuario estaba cuando presionó F5 (o llegó por URL)".
//
//   ROUTE_ESSENTIALS
//     Mapa de segmento → array de claves de loader mínimas para esa ruta.
//     Personalizable: ajusta los nombres de segmento a tus rutas reales.
//     Ruta desconocida → fallback a ['pLoaded'] (solo Pacientes).
//
//   essentialDataLoaded  (BLOQUEANTE para la pantalla de carga global)
//     authReady && AND( loaders requeridos por BOOT_SEGMENT )
//     Solo espera lo que la ruta activa necesita para ser funcional.
//
//   dataLoaded  (ALIAS de essentialDataLoaded — compatibilidad hacia atrás)
//
//   Loaders individuales  (para spinners internos por módulo)
//     Todos exportados en value. Cada módulo muestra su propio spinner
//     si su loader todavía es false, sin bloquear la navegación global.
//
// EJEMPLOS DE FLUJO AL REFRESCAR:
//
//   Refresh en /dashboard  → espera pLoaded + aLoaded  → ~300 ms
//   Refresh en /pacientes  → espera pLoaded            → ~200 ms
//   Refresh en /pagos      → espera pyLoaded           → ~200 ms
//   Refresh en /perfil     → espera prLoaded           → ~200 ms
//   En todos los casos las otras tablas cargan en segundo plano.
//
// PERSONALIZACIÓN (ajusta ROUTE_ESSENTIALS a tus rutas):
//   Si tu ruta es /notas en lugar de /sesiones, cambia la clave 'sesiones'
//   por 'notas'. Los valores son claves del loaderMap definido más abajo.
//
// GARANTÍAS HEREDADAS (v6-v8):
//   · initAuth con try/catch/finally → authReady=true siempre, incluso con error.
//   · effectiveUserId=null mientras authReady=false → hooks idle en arranque.
//   · onAuthStateChange cubre login, logout y token refresh posteriores.
//   · useSupabaseStorage garantiza setLoaded(true) en TODOS los paths.
// ─────────────────────────────────────────────────────────────────────────────
import { createContext, useContext, useMemo, useState, useEffect, useRef } from "react";
import { useSupabaseStorage } from "../hooks/useSupabaseStorage.js";
import { supabase }           from "../lib/supabase.js";
import { DEFAULT_PROFILE }    from "../sampleData.js";

// ── Mapa de ruta → loaders mínimos bloqueantes ────────────────────────────
// Clave   : primer segmento de pathname (lo que va después del primer "/")
// Valor   : array de claves del loaderMap que DEBEN ser true para desbloquear
//           la pantalla de carga cuando se refresca en esa ruta.
//
// ⚠️  PERSONALIZA ESTO según los nombres reales de tus rutas en el router.
//     Ejemplo: si tu ruta de pagos es /finanzas, cambia 'pagos' por 'finanzas'.
const ROUTE_ESSENTIALS = {
  // Rutas principales
  ''              : ['pLoaded', 'aLoaded'],  // / → Dashboard
  'dashboard'     : ['pLoaded', 'aLoaded'],
  // Módulos de pacientes
  'pacientes'     : ['pLoaded'],
  'paciente'      : ['pLoaded'],
  // Agenda / citas
  'agenda'        : ['aLoaded', 'pLoaded'],
  'citas'         : ['aLoaded', 'pLoaded'],
  // Sesiones / notas clínicas
  'sesiones'      : ['sLoaded', 'pLoaded'],
  'notas'         : ['sLoaded', 'pLoaded'],
  // Pagos / finanzas
  'pagos'         : ['pyLoaded'],
  'finanzas'      : ['pyLoaded'],
  // Perfil del psicólogo
  'perfil'        : ['prLoaded'],
  'profile'       : ['prLoaded'],
  // Módulos clínicos secundarios
  'riesgo'        : ['raLoaded', 'pLoaded'],
  'escalas'       : ['scLoaded', 'pLoaded'],
  'planes'        : ['tpLoaded', 'pLoaded'],
  'intersesiones' : ['isLoaded', 'pLoaded'],
  'medicamentos'  : ['medLoaded', 'pLoaded'],
  // Servicios / tarifas
  'servicios'     : ['svLoaded'],
  'tarifas'       : ['svLoaded'],
};

// Fallback si la ruta no está en el mapa (ej. rutas nuevas aún no registradas)
const FALLBACK_ESSENTIALS = ['pLoaded'];

const AppStateContext = createContext(null);

export function AppStateProvider({ children }) {

  // ── Ruta de arranque — congelada al montar, nunca cambia ─────────────────
  // Capturamos el segmento de ruta UNA SOLA VEZ: el momento en que el usuario
  // llegó a la app (refresh, apertura directa por URL, vuelta desde background).
  // useRef garantiza que el valor no se recalcula en re-renders posteriores.
  const bootSegment = useRef(
    window.location.pathname.split('/').filter(Boolean)[0]?.toLowerCase() ?? ''
  ).current;

  const requiredLoaderKeys = ROUTE_ESSENTIALS[bootSegment] ?? FALLBACK_ESSENTIALS;

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
  // loaderMap: permite resolver las claves de ROUTE_ESSENTIALS a booleans reales.
  const loaderMap = {
    pLoaded, aLoaded, sLoaded, pyLoaded, prLoaded,
    raLoaded, scLoaded, tpLoaded, isLoaded, medLoaded, svLoaded,
  };

  // essentialDataLoaded: BLOQUEANTE para la pantalla de carga global.
  //   Espera authReady + SOLO los loaders de la ruta donde se hizo el refresh.
  //   Todos los demás cargan en segundo plano sin bloquear la UI.
  const essentialDataLoaded =
    authReady && requiredLoaderKeys.every(k => loaderMap[k] === true);

  // Alias para compatibilidad con componentes que ya leen dataLoaded/dataReady.
  const dataReady  = essentialDataLoaded;
  const dataLoaded = essentialDataLoaded;

  // Timeout de seguridad: si después de 8 s los esenciales no cargaron,
  // dataTimedOut=true permite que la UI muestre un mensaje de error/reintento.
  const [dataTimedOut, setDataTimedOut] = useState(false);
  useEffect(() => {
    if (!authReady)          return;
    if (essentialDataLoaded) { setDataTimedOut(false); return; }
    const t = setTimeout(() => setDataTimedOut(true), 8000);
    return () => clearTimeout(t);
  }, [essentialDataLoaded, authReady]);

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
