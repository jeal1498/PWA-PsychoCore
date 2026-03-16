// ─────────────────────────────────────────────────────────────────────────────
// src/hooks/useSupabaseStorage.js
// Reemplaza useEncryptedStorage — persiste datos en Supabase por psicólogo.
// API idéntica: [value, setValue, isLoaded]
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/supabase.js";

// Mapeo de clave local → nombre de tabla en Supabase
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
};

export function useSupabaseStorage(key, initialValue) {
  const [value,  setValue_]  = useState(initialValue);
  const [loaded, setLoaded]  = useState(false);
  const userIdRef    = useRef(null);
  const saveTimerRef = useRef(null);
  const firstLoad    = useRef(true);

  const table = TABLE_MAP[key];

  // ── Load from Supabase on mount ─────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoaded(true); return; }

      const uid = session.user.id;
      userIdRef.current = uid;

      const { data, error } = await supabase
        .from(table)
        .select("data")
        .eq("psychologist_id", uid)
        .maybeSingle();

      if (!cancelled) {
        if (!error && data?.data !== undefined && data.data !== null) {
          setValue_(data.data);
        }
        // If no row yet, keep initialValue — it will be saved on first write
        setLoaded(true);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [key, table]);

  // ── Save to Supabase (debounced 800ms) ──────────────────────────────────
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

  // ── Listen to auth changes (user signs in/out mid-session) ──────────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        userIdRef.current = session.user.id;
      } else {
        userIdRef.current = null;
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const setValue = useCallback((newVal) => {
    setValue_(prev => typeof newVal === "function" ? newVal(prev) : newVal);
  }, []);

  return [value, setValue, loaded];
}
