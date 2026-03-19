// ─────────────────────────────────────────────────────────────────────────────
// src/hooks/useSupabaseStorage.js
// Persiste datos en Supabase por psicólogo.
// API: [value, setValue, isLoaded]
//
// FIX: Si getCachedSession() expira por timeout (red lenta en móvil),
// el hook ahora escucha onAuthStateChange y re-lee los datos cuando
// el token finalmente llega — en lugar de quedarse con el array vacío.
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
  pc_services:         "pc_services",   // FIX F0-1
};

// ── Caché de sesión compartida entre todas las instancias del hook ──────────
let _sessionPromise = null;

function getCachedSession() {
  if (!_sessionPromise) {
    // Timeout generoso (5s) — redes móviles lentas (H+, 3G) necesitan más tiempo
    const timeout = new Promise(resolve => setTimeout(() => resolve(null), 5000));
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
    _sessionPromise = null;
  }
});

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useSupabaseStorage(key, initialValue) {
  const [value,    setValue_] = useState(initialValue);
  const [loaded,   setLoaded] = useState(false);
  const userIdRef    = useRef(null);
  const saveTimerRef = useRef(null);
  const firstLoad    = useRef(true);
  // Indica si ya cargamos datos reales de Supabase (para evitar re-read innecesario)
  const dataFetched  = useRef(false);

  const table = TABLE_MAP[key];

  // ── Función de carga reutilizable ─────────────────────────────────────────
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
          userIdRef.current = session.user.id;
          await loadFromSupabase(session.user.id);
        }
      } catch (e) {
        console.warn(`[storage] Error en carga inicial ${key}:`, e);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [key, table, loadFromSupabase]);

  // ── Re-lectura cuando auth llega tarde (FIX red lenta) ───────────────────
  // Si getCachedSession() expiró y el hook quedó vacío, este efecto
  // re-dispara la carga cuando onAuthStateChange finalmente notifica al usuario.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const uid = session.user.id;
        userIdRef.current = uid;

        // Solo re-leer si aún no tenemos datos reales de Supabase
        if (!dataFetched.current) {
          firstLoad.current = true; // evitar que el save se dispare por este set
          await loadFromSupabase(uid);
        }
      } else {
        userIdRef.current = null;
        dataFetched.current = false;
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
