// ─────────────────────────────────────────────────────────────────────────────
// src/hooks/useSupabaseStorage.js
//
// MODO SUPABASE PURO — sin localStorage.
// Fuente de verdad única: Supabase.
// Sin internet: la app muestra un spinner hasta recuperar conexión.
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

export function useSupabaseStorage(key, initialValue) {
  const [value,  setValue_] = useState(initialValue);
  const [loaded, setLoaded] = useState(false);

  const userIdRef    = useRef(null);
  const saveTimerRef = useRef(null);
  const isSyncing    = useRef(false);

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
    if (error) console.error(`[storage] ❌ Error subiendo ${key}:`, error.message);
    else        console.log(`[storage] ✅ Supabase OK: ${key}`);
  }, [key, table]);

  // ── Carga inicial desde Supabase ──────────────────────────────────────────
  const loadFromSupabase = useCallback(async (uid) => {
    if (!uid || !table) { setLoaded(true); return; }
    try {
      const { data, error } = await supabase
        .from(table)
        .select("data")
        .eq("psychologist_id", uid)
        .maybeSingle();

      if (error) {
        console.warn(`[storage] Error cargando ${key}:`, error.message);
        setLoaded(true);
        return;
      }

      // Solo activar isSyncing si Supabase tiene datos reales.
      // Si está vacío, setValue_ recibe el mismo initialValue → React no
      // re-renderiza → isSyncing nunca se resetea → próximos cambios no se guardan.
      if (data?.data !== null && data?.data !== undefined) {
        isSyncing.current = true;
        setValue_(data.data);
      }
      // Si Supabase vacío: mantener initialValue en estado, isSyncing=false
    } catch (e) {
      console.warn(`[storage] Excepción cargando ${key}:`, e);
    } finally {
      setLoaded(true);
    }
  }, [key, table, initialValue]);

  // ── Auth: sesión en mount + escuchar login/logout ─────────────────────────
  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session?.user) {
        userIdRef.current = session.user.id;
        loadFromSupabase(session.user.id);
      } else {
        setLoaded(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "INITIAL_SESSION") return;

        if (session?.user) {
          const uid = session.user.id;
          const wasLoggedOut = !userIdRef.current;
          userIdRef.current = uid;
          if (wasLoggedOut) await loadFromSupabase(uid);
        } else {
          userIdRef.current = null;
          clearTimeout(saveTimerRef.current);
          isSyncing.current = true;
          setValue_(initialValue);
          setLoaded(false);
        }
      }
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [loadFromSupabase, initialValue]);

  // ── Guardado reactivo — debounced 800ms a Supabase ────────────────────────
  useEffect(() => {
    if (!loaded) return;

    // Si el cambio viene de una carga desde Supabase, no re-subir
    if (isSyncing.current) {
      isSyncing.current = false;
      return;
    }

    if (!userIdRef.current) return;

    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      pushToSupabase(userIdRef.current, value);
    }, 800);

    return () => clearTimeout(saveTimerRef.current);
  }, [value, loaded, pushToSupabase]);

  const setValue = useCallback((newVal) => {
    setValue_(prev => typeof newVal === "function" ? newVal(prev) : newVal);
  }, []);

  return [value, setValue, loaded];
}
