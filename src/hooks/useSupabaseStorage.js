// ─────────────────────────────────────────────────────────────────────────────
// src/hooks/useSupabaseStorage.js
// v10-diagnostic: logs extendidos para ver el flujo de carga después de refresh
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

export function useSupabaseStorage(key, initialValue, userId) {
  const [value,  setValue_] = useState(initialValue);
  const [loaded, setLoaded] = useState(false);

  const saveTimerRef = useRef(null);
  const prevUserId   = useRef(null);
  const userModified = useRef(false);

  const table = TABLE_MAP[key];

  // ── Log inicial para ver cómo se monta el hook
  console.log(`[hook:${key}] Hook ejecutado con userId=${userId}, loaded inicial=${loaded}`);

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

  // ── Carga inicial con logs detallados ─────────────────────────────────────────
  useEffect(() => {
    console.log(`[storage:${key}] useEffect: userId=${userId}, prevUserId=${prevUserId.current}, table=${table}`);

    if (!userId) {
      if (prevUserId.current !== null) {
        console.log(`[storage:${key}] ESCENARIO B: logout/refresh detectado, reseteando estado`);
        prevUserId.current   = null;
        userModified.current = false;
        clearTimeout(saveTimerRef.current);
        setValue_(initialValue);
        setLoaded(true);
        console.log(`[storage:${key}] loaded set to true (logout/reset)`);
      } else {
        console.log(`[storage:${key}] ESCENARIO A: montaje sin userId, loaded=true`);
        setLoaded(true);
      }
      return;
    }

    if (!table) {
      console.log(`[storage:${key}] No table mapping, loaded=true`);
      setLoaded(true);
      return;
    }

    // Tenemos userId y tabla
    console.log(`[storage:${key}] INICIANDO FETCH para userId=${userId}`);

    let cancelled = false;
    prevUserId.current   = userId;
    userModified.current = false;
    setLoaded(false);
    console.log(`[storage:${key}] loaded set to false (iniciando fetch)`);

    (async () => {
      try {
        const { data, error } = await supabase
          .from(table)
          .select("data")
          .eq("psychologist_id", userId)
          .maybeSingle();

        if (cancelled) {
          console.log(`[storage:${key}] Fetch cancelado (cancelled=true)`);
          return;
        }

        if (error) {
          console.warn(`[storage:${key}] Error cargando:`, error.message);
          return;
        }

        console.log(`[storage:${key}] Datos recibidos:`, data);

        if (data?.data !== null && data?.data !== undefined) {
          console.log(`[storage:${key}] Asignando datos a value (${typeof data.data})`);
          setValue_(data.data);
        } else {
          console.log(`[storage:${key}] No se encontraron datos, usando initialValue`);
        }
      } catch (e) {
        if (!cancelled) console.warn(`[storage:${key}] Excepción en fetch:`, e);
      } finally {
        if (!cancelled) {
          setLoaded(true);
          console.log(`[storage:${key}] FINALMENTE: loaded establecido a true`);
        }
      }
    })();

    return () => {
      cancelled = true;
      console.log(`[storage:${key}] Cleanup: fetch cancelado, prevUserId no se resetea`);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, key, table, initialValue]);

  // ── Guardado reactivo — debounced 800ms ───────────────────────────────────
  useEffect(() => {
    if (!loaded)               return;
    if (!userId)               return;
    if (!userModified.current) return;

    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      pushToSupabase(userId, value);
    }, 800);

    return () => clearTimeout(saveTimerRef.current);
  }, [value, loaded, userId, pushToSupabase]);

  const setValue = useCallback((newVal) => {
    userModified.current = true;
    setValue_(prev => typeof newVal === "function" ? newVal(prev) : newVal);
  }, []);

  return [value, setValue, loaded];
}
