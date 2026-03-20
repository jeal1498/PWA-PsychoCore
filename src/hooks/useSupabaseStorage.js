// ─────────────────────────────────────────────────────────────────────────────
// src/hooks/useSupabaseStorage.js
//
// MODO SUPABASE PURO — sin localStorage.
// Fuente de verdad única: Supabase.
//
// v4: estrategia "userModified" + eventos de sincronización.
// - Save SOLO se dispara cuando la app llama a setValue().
// - Emite sync:start / sync:done / sync:error al bus para el SyncToast.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/supabase.js";
import { bus }      from "../lib/eventBus.js";

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

  const saveTimerRef = useRef(null);
  const prevUserId   = useRef(null);
  const userModified = useRef(false); // true SOLO cuando setValue() es llamado por la app

  const table = TABLE_MAP[key];

  // ── Upsert a Supabase ─────────────────────────────────────────────────────
  const pushToSupabase = useCallback(async (uid, dataToSave) => {
    if (!uid || !table) return;

    bus.emit("sync:start", { key });

    const { error } = await supabase
      .from(table)
      .upsert(
        { psychologist_id: uid, data: dataToSave },
        { onConflict: "psychologist_id" }
      );

    if (error) {
      console.error(`[storage] ❌ ${key}:`, error.message);
      bus.emit("sync:error", { key, message: error.message });
    } else {
      console.log(`[storage] ✅ ${key}`);
      bus.emit("sync:done", { key });
    }
  }, [key, table]);

  // ── Carga inicial — se dispara cuando userId pasa de null a un valor ──────
  useEffect(() => {
    if (!userId) {
      if (prevUserId.current) {
        prevUserId.current   = null;
        userModified.current = false;
        clearTimeout(saveTimerRef.current);
        setValue_(initialValue);
        setLoaded(false);
      }
      return;
    }

    if (userId === prevUserId.current) return;

    prevUserId.current   = userId;
    userModified.current = false;

    if (!table) { setLoaded(true); return; }

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
          setValue_(data.data); // directo — no activa userModified
        }
      } catch (e) {
        if (!cancelled) console.warn(`[storage] Excepción cargando ${key}:`, e);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, key, table]);

  // ── Guardado reactivo — debounced 800ms ───────────────────────────────────
  useEffect(() => {
    if (!loaded)               return;
    if (!userId)               return;
    if (!userModified.current) return; // solo saves explícitos

    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      pushToSupabase(userId, value);
    }, 800);

    return () => clearTimeout(saveTimerRef.current);
  }, [value, loaded, userId, pushToSupabase]);

  // setValue pública — marca userModified antes de actualizar estado
  const setValue = useCallback((newVal) => {
    userModified.current = true;
    setValue_(prev => typeof newVal === "function" ? newVal(prev) : newVal);
  }, []);

  return [value, setValue, loaded];
}
