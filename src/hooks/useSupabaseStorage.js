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
  // Usa getSession() directamente sin timeout — el dataTimedOut de
  // AppStateContext se encarga de desbloquear la UI si la red es muy lenta.
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;

        if (session?.user) {
          userIdRef.current = session.user.id;
          await loadFromSupabase(session.user.id);
        } else {
          // Sin sesión → marcar como cargado con valor inicial
          setLoaded(true);
        }
      } catch (e) {
        console.warn(`[storage] Error en carga inicial ${key}:`, e);
        if (!cancelled) setLoaded(true);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [key, table, loadFromSupabase]);

  // ── Reaccionar a cambios de auth (login, logout, token refresh) ───────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "INITIAL_SESSION") return; // ya manejado por getSession() arriba

      if (session?.user) {
        const uid = session.user.id;
        userIdRef.current = uid;

        if (!dataFetched.current) {
          firstLoad.current = true;
          await loadFromSupabase(uid);
        }
      } else {
        userIdRef.current   = null;
        dataFetched.current = false;
        setValue_(initialValue);
        setLoaded(true);
      }
    });
    return () => subscription.unsubscribe();
  }, [loadFromSupabase, initialValue]);

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
