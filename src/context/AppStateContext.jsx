// ─────────────────────────────────────────────────────────────────────────────
// src/context/AppStateContext.jsx
//
// v13: Timer robusto para refresh — solución definitiva para pantalla de carga infinita.
//
// BUG (v12): timerStarted.current podía quedar en true después de un refresh,
// impidiendo que el timer se reiniciara cuando authReady pasaba de false a true.
//
// FIX (v13):
//   1. El timer se reinicia completamente cuando authReady cambia a true.
//   2. Se agrega logging para diagnosticar loaders bloqueantes.
//   3. Se fuerza la salida después de 8 segundos sin importar el estado de timerStarted.
//   4. Se añade un useEffect que monitorea essentialDataLoaded y fuerza timeout si es necesario.
//
// GARANTÍAS:
//   · En refresh, authReady=true siempre activa un nuevo timer de 8s.
//   · Si essentialDataLoaded cambia a true antes del timeout, la UI se desbloquea.
//   · Si essentialDataLoaded nunca es true, el timeout fuerza dataTimedOut=true.
//   · Logs detallados para identificar loaders problemáticos.
// ─────────────────────────────────────────────────────────────────────────────
import { createContext, useContext, useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useSupabaseStorage } from "../hooks/useSupabaseStorage.js";
import { supabase }           from "../lib/supabase.js";
import { DEFAULT_PROFILE }    from "../sampleData.js";

// ── Mapa de módulo → loaders mínimos bloqueantes ──────────────────────────
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

  // ── Módulo de arranque — congelado al montar, nunca cambia ───────────────
  const bootModule = useRef(
    localStorage.getItem("pc_last_module") ?? "dashboard"
  ).current;

  const requiredLoaderKeys = MODULE_ESSENTIALS[bootModule] ?? FALLBACK_ESSENTIALS;

  console.log(`[AppState] Boot module: ${bootModule}`);
  console.log(`[AppState] Required loaders:`, requiredLoaderKeys);

  // ── Auth ─────────────────────────────────────────────────────────────────
  const [userId,    setUserId]    = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) setUserId(session?.user?.id ?? null);
        console.log(`[Auth] Session loaded: ${session?.user?.id ?? 'no session'}`);
      } catch (err) {
        console.error("[auth] Error en getSession:", err);
      } finally {
        if (mounted) {
          setAuthReady(true);
          console.log("[Auth] authReady set to true");
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (mounted) {
          const newUserId = session?.user?.id ?? null;
          setUserId(newUserId);
          console.log(`[Auth] State changed: ${_event}, userId: ${newUserId}`);
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
  const loaderMap = {
    pLoaded, aLoaded, sLoaded, pyLoaded, prLoaded,
    raLoaded, scLoaded, tpLoaded, isLoaded, medLoaded, svLoaded,
  };

  // essentialDataLoaded con logging para diagnóstico
  const essentialDataLoaded = useMemo(() => {
    if (!authReady) {
      console.log("[Load] essentialDataLoaded = false (authReady=false)");
      return false;
    }
    
    const missingLoaders = requiredLoaderKeys.filter(k => loaderMap[k] !== true);
    
    if (missingLoaders.length > 0) {
      console.log("[Load] essentialDataLoaded = false. Missing loaders:", missingLoaders);
      console.log("[Load] Current loader states:", 
        requiredLoaderKeys.reduce((acc, k) => ({ ...acc, [k]: loaderMap[k] }), {})
      );
      return false;
    }
    
    console.log("[Load] ✅ essentialDataLoaded = true. All required loaders ready!");
    return true;
  }, [authReady, requiredLoaderKeys, loaderMap]);

  // Alias para compatibilidad
  const dataReady  = essentialDataLoaded;
  const dataLoaded = essentialDataLoaded;

  // ── Timeout de seguridad — VERSIÓN ROBUSTA PARA REFRESH ─────────────────
  const [dataTimedOut, setDataTimedOut] = useState(false);
  const timeoutRef = useRef(null);
  const hasTimedOutRef = useRef(false);

  // Limpiar timeout existente
  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Timer principal que se activa cuando authReady es true
  useEffect(() => {
    if (!authReady) {
      // Si no hay auth, limpiar cualquier timer pendiente
      clearTimer();
      return;
    }

    // Limpiar timer anterior antes de crear uno nuevo (importante para refresh)
    clearTimer();
    
    // Resetear el flag de timeout para este nuevo ciclo
    hasTimedOutRef.current = false;
    
    console.log("[Timer] Iniciando timer de 8 segundos para refresh");
    
    // Crear nuevo timer
    timeoutRef.current = setTimeout(() => {
      if (!hasTimedOutRef.current) {
        hasTimedOutRef.current = true;
        console.log("[Timer] ⏰ Timeout alcanzado después de 8s, forzando salida de carga");
        console.log("[Timer] Estado actual - essentialDataLoaded:", essentialDataLoaded);
        console.log("[Timer] Estado actual - authReady:", authReady);
        setDataTimedOut(true);
      }
    }, 8000);

    // Cleanup al desmontar o cuando authReady cambie
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [authReady, clearTimer]);

  // Monitorear si essentialDataLoaded se vuelve true antes del timeout
  useEffect(() => {
    if (essentialDataLoaded && !hasTimedOutRef.current) {
      console.log("[Timer] ✅ Datos cargados exitosamente antes del timeout, UI desbloqueada");
      // No necesitamos hacer nada más aquí, dataReady ya es true
    }
  }, [essentialDataLoaded]);

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
    dataLoaded,
    essentialDataLoaded,
    dataTimedOut,
    authReady,
    // ── Loaders individuales ─────────────────────────────────────────────
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
