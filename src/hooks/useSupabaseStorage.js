import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/supabase.js";
import { bus }      from "../lib/eventBus.js";

// Exponer supabase globalmente para pruebas
if (typeof window !== "undefined") {
  window.__supabase = supabase;
}

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

  console.log(`[hook:${key}] render con userId=${userId}, loaded=${loaded}`);

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

  useEffect(() => {
    console.log(`[storage:${key}] useEffect: userId=${userId}, prevUserId=${prevUserId.current}, table=${table}`);

    if (!userId) {
      if (prevUserId.current !== null) {
        console.log(`[storage:${key}] Logout: reset`);
        prevUserId.current   = null;
        userModified.current = false;
        clearTimeout(saveTimerRef.current);
        setValue_(initialValue);
        setLoaded(true);
      } else {
        console.log(`[storage:${key}] Sin userId, loaded=true`);
        setLoaded(true);
      }
      return;
    }

    if (!table) {
      console.log(`[storage:${key}] Sin tabla, loaded=true`);
      setLoaded(true);
      return;
    }

    console.log(`[storage:${key}] Iniciando fetch para userId=${userId}`);
    let cancelled = false;
    prevUserId.current   = userId;
    userModified.current = false;
    setLoaded(false);

    (async () => {
      try {
        const { data, error } = await supabase
          .from(table)
          .select("data")
          .eq("psychologist_id", userId)
          .maybeSingle();

        if (cancelled) {
          console.log(`[storage:${key}] Fetch cancelado`);
          return;
        }

        if (error) {
          console.warn(`[storage:${key}] Error cargando:`, error.message);
          return;
        }

        console.log(`[storage:${key}] Datos recibidos:`, data);
        if (data?.data !== null && data?.data !== undefined) {
          setValue_(data.data);
        }
      } catch (e) {
        if (!cancelled) console.warn(`[storage:${key}] Excepción:`, e);
      } finally {
        if (!cancelled) {
          setLoaded(true);
          console.log(`[storage:${key}] Fetch completado, loaded=true`);
        }
      }
    })();

    return () => {
      cancelled = true;
      console.log(`[storage:${key}] Cleanup: cancelando fetch`);
    };
  }, [userId, key, table]);

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
