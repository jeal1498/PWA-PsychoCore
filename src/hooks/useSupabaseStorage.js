// ─────────────────────────────────────────────────────────────────────────────
// src/hooks/useSupabaseStorage.js
//
// PATRÓN CORRECTO SUPABASE:
// Un solo useEffect con onAuthStateChange — NO se llama getSession() por separado.
// INITIAL_SESSION dispara inmediatamente al suscribirse con la sesión almacenada.
// Esto elimina la race condition entre getSession() y onAuthStateChange.
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
  const isFirstWrite   = useRef(true);
  const dataFetched    = useRef(false);
  // Guardar initialValue en ref para no ponerlo en deps del effect
  // (evita que el effect se re-suscriba en cada render)
  const initialValueRef = useRef(initialValue);

  const table = TABLE_MAP[key];

  // ── Carga datos de Supabase para el uid dado ──────────────────────────────
  const loadFromSupabase = useCallback(async (uid) => {
    if (!uid || !table) return;
    try {
      const { data, error } = await supabase
        .from(table)
        .select("data")
        .eq("psychologist_id", uid)
        .maybeSingle();

      if (!error && data?.data !== undefined && data.data !== null) {
        // Datos reales encontrados — cargarlos y marcar que no hace falta
        // guardar de vuelta inmediatamente (evita un upsert redundante)
        isFirstWrite.current = true;
        setValue_(data.data);
        dataFetched.current = true;
      } else {
        // Tabla vacía o sin fila para este usuario — la primera edición
        // del usuario SÍ debe guardarse, así que no bloqueamos el save effect
        isFirstWrite.current = false;
      }
    } catch (e) {
      console.warn(`[storage] Error cargando ${key}:`, e);
      isFirstWrite.current = false;
    } finally {
      setLoaded(true);
    }
  }, [key, table]);

  // ── Auth listener — única fuente de verdad ────────────────────────────────
  // onAuthStateChange dispara INITIAL_SESSION inmediatamente al suscribirse,
  // con la sesión actual (incluso si viene de localStorage tras un reload).
  // No necesitamos getSession() por separado.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const uid = session.user.id;
          userIdRef.current = uid;

          // Cargar solo si aún no tenemos datos reales
          if (!dataFetched.current) {
            await loadFromSupabase(uid);
          }
        } else {
          // Sin sesión (logout o sesión expirada sin refresh)
          userIdRef.current  = null;
          dataFetched.current = false;
          setValue_(initialValueRef.current);
          setLoaded(true);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [loadFromSupabase]); // initialValue NO está en deps — usamos la ref

  // ── Guardado en Supabase (debounced 800ms) ────────────────────────────────
  useEffect(() => {
    if (!loaded) return;
    if (isFirstWrite.current) { isFirstWrite.current = false; return; }
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
      if (error) console.error(`[storage] ❌ Error guardando ${key}:`, error);
      else console.log(`[storage] ✅ Guardado OK: ${key}`);
    }, 800);

    return () => clearTimeout(saveTimerRef.current);
  }, [value, loaded, table]);

  const setValue = useCallback((newVal) => {
    setValue_(prev => typeof newVal === "function" ? newVal(prev) : newVal);
  }, []);

  return [value, setValue, loaded];
}
