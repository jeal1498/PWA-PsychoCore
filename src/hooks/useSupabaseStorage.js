// ─────────────────────────────────────────────────────────────────────────────
// src/hooks/useSupabaseStorage.js
//
// PATRÓN RESILIENTE — dos capas:
//   1. localStorage  → carga instantánea en cada reload, sin esperar auth
//   2. Supabase      → fuente de verdad, sincroniza en background
//
// Flujo:
//   Mount   → lee localStorage inmediatamente (sync) → muestra datos al instante
//           → getSession() async → carga Supabase → actualiza si es más reciente
//   Cambio  → guarda en localStorage (sync) + debounce 800ms a Supabase
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

const LS_PREFIX = "pc_cache_";

function readLS(key, fallback) {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeLS(key, value) {
  try {
    localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
  } catch {
    // localStorage lleno — continuar sin caché local
  }
}

export function useSupabaseStorage(key, initialValue) {
  // ── Carga inicial desde localStorage (síncrona — sin parpadeo) ────────────
  const [value,  setValue_] = useState(() => readLS(key, initialValue));
  const [loaded, setLoaded] = useState(false);

  const userIdRef    = useRef(null);
  const saveTimerRef = useRef(null);
  const isSyncing    = useRef(false); // evita guardar el valor que acabamos de bajar de Supabase

  const table = TABLE_MAP[key];

  // ── Sincronización con Supabase ───────────────────────────────────────────
  const syncFromSupabase = useCallback(async (uid) => {
    if (!uid || !table) { setLoaded(true); return; }
    try {
      const { data, error } = await supabase
        .from(table)
        .select("data")
        .eq("psychologist_id", uid)
        .maybeSingle();

      if (error) {
        console.warn(`[storage] Error sync ${key}:`, error.message);
        return;
      }

      if (data?.data !== undefined && data.data !== null) {
        // Supabase tiene datos — actualizar estado Y caché local
        isSyncing.current = true;
        setValue_(data.data);
        writeLS(key, data.data);
      }
      // Si Supabase está vacío pero localStorage tenía datos,
      // mantener los datos locales y hacer upsert hacia Supabase
    } catch (e) {
      console.warn(`[storage] Excepción sync ${key}:`, e);
    } finally {
      setLoaded(true);
    }
  }, [key, table]);

  // ── Auth: obtener sesión en mount + escuchar login/logout ─────────────────
  useEffect(() => {
    // Marcar como loaded inmediatamente (localStorage ya tiene datos)
    setLoaded(true);

    let cancelled = false;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session?.user) {
        userIdRef.current = session.user.id;
        syncFromSupabase(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "INITIAL_SESSION") return;

        if (session?.user) {
          const uid = session.user.id;
          const wasLoggedOut = !userIdRef.current;
          userIdRef.current = uid;
          if (wasLoggedOut) {
            await syncFromSupabase(uid);
          }
        } else {
          // Logout — limpiar estado y caché local
          userIdRef.current = null;
          clearTimeout(saveTimerRef.current);
          // Limpiar localStorage al salir
          try { localStorage.removeItem(LS_PREFIX + key); } catch {}
          setValue_(initialValue);
        }
      }
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [syncFromSupabase, key, initialValue]);

  // ── Guardado (localStorage síncrono + Supabase debounced 800ms) ──────────
  useEffect(() => {
    if (!loaded) return;

    // Si el cambio viene de syncFromSupabase, no reescribir a Supabase
    if (isSyncing.current) {
      isSyncing.current = false;
      return;
    }

    // Guardar en localStorage inmediatamente
    writeLS(key, value);

    // Guardar en Supabase solo si hay sesión activa
    if (!userIdRef.current) return;

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
      else console.log(`[storage] ✅ Supabase OK: ${key}`);
    }, 800);

    return () => clearTimeout(saveTimerRef.current);
  }, [value, loaded, key, table]);

  const setValue = useCallback((newVal) => {
    setValue_(prev => typeof newVal === "function" ? newVal(prev) : newVal);
  }, []);

  return [value, setValue, loaded];
}
