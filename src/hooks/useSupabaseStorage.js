// ─────────────────────────────────────────────────────────────────────────────
// src/hooks/useSupabaseStorage.js
//
// MODO SUPABASE PURO — sin localStorage.
// Fuente de verdad única: Supabase.
//
// v6: fix race condition + logout detection.
//
// PROBLEMA RESUELTO (bug introducido en v5):
//   La función de limpieza del efecto ejecutaba `prevUserId.current = null`
//   ANTES de que corriera el nuevo efecto con userId=null. Esto destruía la
//   "evidencia" del logout real: el guard `if (prevUserId.current)` siempre
//   veía null y el reset nunca ocurría. Al hacer logout, los datos viejos
//   permanecían en pantalla.
//
// SOLUCIÓN:
//   Se eliminó `prevUserId.current = null` del cleanup.
//   El guard ahora distingue correctamente entre dos escenarios:
//
//   a) Montaje inicial / idle por authReady=false:
//      userId=null, prevUserId.current=null → no-op, retorno silencioso.
//
//   b) Logout real:
//      userId=null, prevUserId.current="abc123" → reset de estado ✓
//      (El cleanup NO borró prevUserId, así que la evidencia está intacta.)
//
// COMPATIBILIDAD CON STRICTMODE:
//   El fetch se re-ejecuta naturalmente cuando userId cambia o cuando React
//   re-invoca el efecto con el mismo userId, ya que el path de fetch no
//   consulta prevUserId (solo lo consulta el path de userId=null).
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

  // ── Carga inicial ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) {
      // Distinguir entre dos escenarios muy distintos:
      //
      // ESCENARIO A — Montaje inicial o idle por authReady=false:
      //   userId=null Y prevUserId.current=null
      //   → El hook aún no ha servido a ningún usuario.
      //   → No hacer NADA: no borrar estado, no cambiar loaded.
      //   → Retorno silencioso; esperar a que authReady active el userId real.
      //
      // ESCENARIO B — Logout real:
      //   userId=null Y prevUserId.current tenía un ID válido
      //   → El usuario SÍ tenía sesión y ahora no la tiene.
      //   → Resetear estado para no dejar datos del usuario anterior en pantalla.
      //
      // NOTA: el cleanup del efecto anterior NO resetea prevUserId.current,
      // por eso la "evidencia" del logout real está intacta cuando llegamos aquí.
      if (prevUserId.current !== null) {
        // Escenario B: logout real confirmado.
        prevUserId.current   = null;
        userModified.current = false;
        clearTimeout(saveTimerRef.current);
        setValue_(initialValue);
        setLoaded(false);
      }
      // Escenario A: no-op silencioso.
      return;
    }

    if (!table) { setLoaded(true); return; }

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

        if (cancelled) return;

        if (error) {
          console.warn(`[storage] Error cargando ${key}:`, error.message);
          return;
        }

        if (data?.data !== null && data?.data !== undefined) {
          setValue_(data.data);
        }
      } catch (e) {
        if (!cancelled) console.warn(`[storage] Excepción cargando ${key}:`, e);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
      // IMPORTANTE: NO reseteamos prevUserId.current aquí.
      //
      // Si lo hiciéramos (como hacía v5), el guard de logout nunca podría
      // distinguir "logout real" de "montaje inicial": ambos llegarían con
      // prevUserId.current=null y el reset nunca ocurriría.
      //
      // StrictMode: el fetch se re-ejecuta igualmente porque el path de
      // fetch (userId no nulo) no consulta prevUserId; siempre arranca un
      // nuevo fetch cuando el efecto corre con un userId válido.
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, key, table]);

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
