// ─────────────────────────────────────────────────────────────────────────────
// src/hooks/useSupabaseStorage.js
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/supabase.js";

const TABLE_MAP = {
  pc_patients:         "pc_patients",
  pc_appointments:     "pc_appointments",
  pc_sessions:         "pc_sessions",
  pc_payments:         "pc_payments",
  pc_profile:          "pc_profile",
  pc_risk_assessments: "pc_risk_assessments",
  pc_scale_results:    "pc_scale_results",
  pc_treatment_plans:  "pc_treatment_plans",
  pc_inter_sessions:   "pc_inter_sessions",
  pc_medications:      "pc_medications",
  pc_services:         "pc_services",
};

// ── Caché de sesión compartida ────────────────────────────────────────────────
// _sessionTimedOut permite distinguir "timeout" de "usuario no logueado".
let _sessionPromise  = null;
let _sessionTimedOut = false;

function getCachedSession() {
  if (!_sessionPromise) {
    _sessionTimedOut = false;
    const timeout = new Promise(resolve =>
      setTimeout(() => { _sessionTimedOut = true; resolve(null); }, 8000)
    );
    _sessionPromise = Promise.race([
      supabase.auth.getSession()
        .then(({ data: { session } }) => session)
        .catch(() => null),
      timeout,
    ]);
  }
  return _sessionPromise;
}

supabase.auth.onAuthStateChange((event) => {
  if (event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
    _sessionPromise  = null;
    _sessionTimedOut = false;
  }
});

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useSupabaseStorage(key, initialValue) {
  const [value,    setValue_] = useState(initialValue);
  const [loaded,   setLoaded] = useState(false);
  const userIdRef    = useRef(null);
  const saveTimerRef = useRef(null);
  const firstLoad    = useRef(true);
  const dataFetched  = useRef(false);

  const table = TABLE_MAP[key];

  // ── Carga desde Supabase ──────────────────────────────────────────────────
  const loadFromSupabase = useCallback(async (uid) => {
    if (!uid || !table) return;
    try {
      const { data, error } = await supabase
        .from(table)
        .select("data")
        .eq("psychologist_id", uid)
        .maybeSingle();

      if (!error && data?.data !== undefined && data.data !== null) {
        setValue_(data.data);
        dataFetched.current = true;
      }
    } catch (e) {
      console.warn(`[storage] Error cargando ${key}:`, e);
    } finally {
      setLoaded(true);
    }
  }, [key, table]);

  // ── Carga inicial ─────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const session = await getCachedSession();
        if (cancelled) return;

        if (session?.user) {
          // Sesión llegó a tiempo — cargar datos
          userIdRef.current = session.user.id;
          await loadFromSupabase(session.user.id);
        } else if (!_sessionTimedOut) {
          // getSession() devolvió null rápido → usuario no logueado → OK marcar cargado
          setLoaded(true);
        }
        // Si fue timeout (_sessionTimedOut === true): NO marcar cargado.
        // El listener de onAuthStateChange se encargará cuando llegue la sesión.
      } catch (e) {
        console.warn(`[storage] Error en carga inicial ${key}:`, e);
        if (!cancelled) setLoaded(true);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [key, table, loadFromSupabase]);

  // ── Re-lectura cuando la sesión llega tarde ───────────────────────────────
  // Cubre el caso: timeout en carga inicial → onAuthStateChange llega después
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const uid = session.user.id;
        userIdRef.current = uid;

        if (!dataFetched.current) {
          // No tenemos datos reales → cargar ahora (incluye el caso timeout)
          firstLoad.current = true; // evitar que el save se dispare por este set
          await loadFromSupabase(uid);
        }
      } else {
        userIdRef.current  = null;
        dataFetched.current = false;
        setLoaded(true); // usuario salió → marcar cargado con datos vacíos
      }
    });
    return () => subscription.unsubscribe();
  }, [loadFromSupabase]);

  // ── Guardado en Supabase (debounced 800ms) ────────────────────────────────
  useEffect(() => {
    if (!loaded) return;
    if (firstLoad.current) { firstLoad.current = false; return; }
    if (!userIdRef.current) return;

    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const uid = userIdRef.current;
      if (!uid) return;
      await supabase
        .from(table)
        .upsert({ psychologist_id: uid, data: value }, { onConflict: "psychologist_id" });
    }, 800);

    return () => clearTimeout(saveTimerRef.current);
  }, [value, loaded, table]);

  const setValue = useCallback((newVal) => {
    setValue_(prev => typeof newVal === "function" ? newVal(prev) : newVal);
  }, []);

  return [value, setValue, loaded];
}
