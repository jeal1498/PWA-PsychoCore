// ─────────────────────────────────────────────────────────────────────────────
// src/hooks/useSupabaseStorage.js
//
// PATRÓN ROBUSTO:
// - Mount: getSession() directo — sin depender de INITIAL_SESSION
// - onAuthStateChange: solo para manejar login/logout después del mount
// - Esto elimina la race condition con las 11 instancias simultáneas
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

  const userIdRef      = useRef(null);
  const saveTimerRef   = useRef(null);
  const pendingSave    = useRef(false);
  const initialValueRef = useRef(initialValue);

  const table = TABLE_MAP[key];

  // ── Carga datos de Supabase para el uid dado ──────────────────────────────
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
      } else if (data?.data !== undefined && data.data !== null) {
        setValue_(data.data);
      }
    } catch (e) {
      console.warn(`[storage] Excepción cargando ${key}:`, e);
    } finally {
      setLoaded(true);
    }
  }, [key, table]);

  // ── Mount: obtener sesión actual directamente ─────────────────────────────
  // getSession() lee de localStorage de forma síncrona — es inmediato
  // y no depende del bus de eventos de auth.
  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session?.user) {
        userIdRef.current = session.user.id;
        loadFromSupabase(session.user.id);
      } else {
        // Sin sesión — marcar como loaded con valor vacío
        setValue_(initialValueRef.current);
        setLoaded(true);
      }
    });

    return () => { cancelled = true; };
  }, [loadFromSupabase]);

  // ── Suscripción auth — solo para login/logout DESPUÉS del mount ───────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // INITIAL_SESSION ya fue manejado por getSession() arriba
        if (event === "INITIAL_SESSION") return;

        if (session?.user) {
          const uid = session.user.id;
          const wasLoggedOut = !userIdRef.current;
          userIdRef.current = uid;

          // Solo recargar si acababa de hacer login (no en refresh de token)
          if (wasLoggedOut) {
            pendingSave.current = false;
            await loadFromSupabase(uid);
          }
        } else {
          // Logout — limpiar
          userIdRef.current = null;
          pendingSave.current = false;
          clearTimeout(saveTimerRef.current);
          setValue_(initialValueRef.current);
          setLoaded(true);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [loadFromSupabase]);

  // ── Guardado en Supabase (debounced 800ms) ────────────────────────────────
  // pendingSave evita guardar el valor inicial que llega del load
  useEffect(() => {
    if (!loaded) return;
    if (!userIdRef.current) return;

    // Primer disparo después de load — solo marcar y salir
    if (!pendingSave.current) {
      pendingSave.current = true;
      return;
    }

    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const uid = userIdRef.current;
      if (!uid) return;
      const { error } = await supabase
        .from(table)
        .upsert(
          { psychologist_id: uid, data: value },
          { onConflict: "psychologist_id" }
        );
      if (error) console.error(`[storage] ❌ Error guardando ${key}:`, error.message);
      else console.log(`[storage] ✅ Guardado OK: ${key}`);
    }, 800);

    return () => clearTimeout(saveTimerRef.current);
  }, [value, loaded, table, key]);

  const setValue = useCallback((newVal) => {
    setValue_(prev => typeof newVal === "function" ? newVal(prev) : newVal);
  }, []);

  return [value, setValue, loaded];
}
