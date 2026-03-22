// ─────────────────────────────────────────────────────────────────────────────
// src/hooks/useSupabaseStorage.js
//
// v10: Mejoras para manejo de refresh — garantiza loaded=true en todos los escenarios
//
// MEJORAS PARA REFRESH:
//   · Cleanup más robusto que asegura loaded=true si el efecto se cancela
//   · Logs adicionales para diagnosticar loaders problemáticos
//   · Manejo explícito de cambios de userId durante refresh
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
  const mountedRef   = useRef(true);
  const fetchIdRef   = useRef(0);

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
      console.log(`[storage] ✅ ${key} synced`);
      bus.emit("sync:done", { key });
    }
  }, [key, table]);

  // ── Carga inicial con mejor manejo de refresh ─────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    const currentFetchId = ++fetchIdRef.current;
    
    // Log para diagnóstico
    console.log(`[storage] ${key} - userId: ${userId}, prevUserId: ${prevUserId.current}`);

    if (!userId) {
      // ESCENARIO SIN USUARIO
      if (prevUserId.current !== null) {
        // Logout real o refresh
        console.log(`[storage] ${key} - Logout/refresh detected, resetting state`);
        prevUserId.current   = null;
        userModified.current = false;
        clearTimeout(saveTimerRef.current);
        setValue_(initialValue);
        setLoaded(true);
      } else {
        // Montaje inicial sin sesión
        console.log(`[storage] ${key} - Initial mount without session`);
        setLoaded(true);
      }
      return;
    }

    // ESCENARIO CON USUARIO
    if (!table) { 
      console.log(`[storage] ${key} - No table mapping, setting loaded=true`);
      setLoaded(true); 
      return;
    }

    // Si hay un cambio de usuario, resetear estado
    if (prevUserId.current !== userId) {
      console.log(`[storage] ${key} - User changed from ${prevUserId.current} to ${userId}`);
      prevUserId.current = userId;
      userModified.current = false;
      setLoaded(false);
      setValue_(initialValue);
    }

    // Iniciar fetch
    setLoaded(false);
    console.log(`[storage] ${key} - Fetching data for user ${userId}`);

    (async () => {
      try {
        const { data, error } = await supabase
          .from(table)
          .select("data")
          .eq("psychologist_id", userId)
          .maybeSingle();

        // Verificar si este fetch sigue siendo relevante
        if (!mountedRef.current || currentFetchId !== fetchIdRef.current) {
          console.log(`[storage] ${key} - Fetch cancelled (stale)`);
          return;
        }

        if (error) {
          console.warn(`[storage] ${key} - Error loading:`, error.message);
          return;
        }

        if (data?.data !== null && data?.data !== undefined) {
          console.log(`[storage] ${key} - Data loaded successfully`);
          setValue_(data.data);
        } else {
          console.log(`[storage] ${key} - No data found, using initial value`);
        }
      } catch (e) {
        if (mountedRef.current && currentFetchId === fetchIdRef.current) {
          console.warn(`[storage] ${key} - Exception loading:`, e);
        }
      } finally {
        // Garantizar que loaded=true siempre se establezca
        if (mountedRef.current && currentFetchId === fetchIdRef.current) {
          console.log(`[storage] ${key} - Setting loaded=true`);
          setLoaded(true);
        }
      }
    })();

    return () => {
      // Cleanup: marcar que el componente se desmontó o el efecto se reinició
      console.log(`[storage] ${key} - Cleanup triggered`);
      mountedRef.current = false;
      // No resetear prevUserId aquí para mantener contexto en refresh
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
