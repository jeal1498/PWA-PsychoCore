// ─────────────────────────────────────────────────────────────────────────────
// src/hooks/useSupabaseStorage.js
//
// MODO SUPABASE PURO — sin localStorage.
// Fuente de verdad única: Supabase.
//
// v3: agrega `initialLoadDone` ref — ningún save se dispara hasta que
// el primer fetch de Supabase haya completado. Elimina la ventana donde
// loaded=true con value=[] sobreescribía la fila en Supabase.
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

// userId: string | null — viene de AppStateContext (ya resuelto)
export function useSupabaseStorage(key, initialValue, userId) {
  const [value,  setValue_] = useState(initialValue);
  const [loaded, setLoaded] = useState(false);

  const saveTimerRef     = useRef(null);
  const isSyncing        = useRef(false);
  const prevUserId       = useRef(null);
  const initialLoadDone  = useRef(false); // guard: ningún save antes del primer fetch

  const table = TABLE_MAP[key];

  // ── Upsert a Supabase ─────────────────────────────────────────────────────
  const pushToSupabase = useCallback(async (uid, dataToSave) => {
    if (!uid || !table) return;
    const { error } = await supabase
      .from(table)
      .upsert(
        { psychologist_id: uid, data: dataToSave },
        { onConflict: "psychologist_id" }
      );
    if (error) console.error(`[storage] ❌ ${key}:`, error.message);
    else        console.log(`[storage] ✅ ${key}`);
  }, [key, table]);

  // ── Carga inicial — se dispara cuando userId pasa de null a un valor ──────
  useEffect(() => {
    if (!userId) {
      // Logout: resetear estado
      if (prevUserId.current) {
        prevUserId.current      = null;
        initialLoadDone.current = false;
        clearTimeout(saveTimerRef.current);
        isSyncing.current = true;
        setValue_(initialValue);
        setLoaded(false);
      }
      return;
    }

    // Mismo usuario — no recargar
    if (userId === prevUserId.current) return;

    prevUserId.current      = userId;
    initialLoadDone.current = false; // resetear antes del fetch

    if (!table) {
      initialLoadDone.current = true;
      setLoaded(true);
      return;
    }

    let cancelled = false;
    setLoaded(false);

    (async () => {
      try {
        const { data, error } = await supabase
          .from(table)
          .select("data")
          .eq("psychologist_id", userId)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          console.warn(`[storage] Error cargando ${key}:`, error.message);
          return;
        }

        if (data?.data !== null && data?.data !== undefined) {
          isSyncing.current = true;
          setValue_(data.data);
        }
      } catch (e) {
        if (!cancelled) console.warn(`[storage] Excepción cargando ${key}:`, e);
      } finally {
        if (!cancelled) {
          initialLoadDone.current = true; // ahora sí se permiten saves
          setLoaded(true);
        }
      }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, key, table]);

  // ── Guardado reactivo — debounced 800ms ───────────────────────────────────
  useEffect(() => {
    if (!loaded)                  return; // esperar carga
    if (!userId)                  return; // sin sesión
    if (!initialLoadDone.current) return; // guard: no guardar antes del fetch inicial

    if (isSyncing.current) {
      isSyncing.current = false;
      return;
    }

    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      pushToSupabase(userId, value);
    }, 800);

    return () => clearTimeout(saveTimerRef.current);
  }, [value, loaded, userId, pushToSupabase]);

  const setValue = useCallback((newVal) => {
    setValue_(prev => typeof newVal === "function" ? newVal(prev) : newVal);
  }, []);

  return [value, setValue, loaded];
}
