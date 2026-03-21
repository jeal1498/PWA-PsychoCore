// ─────────────────────────────────────────────────────────────────────────────
// src/hooks/useSupabaseStorage.js
//
// MODO SUPABASE PURO — sin localStorage.
// Fuente de verdad única: Supabase.
//
// v8: Escenario B (logout) ahora llama setLoaded(true).
//
// PROBLEMA RESUELTO (v7 → v8):
//   Al hacer logout, el hook entraba en Escenario B y llamaba setLoaded(false).
//   Como dataLoaded en AppStateContext es un AND de los 11 loaded, esto dejaba
//   dataLoaded=false permanentemente tras cerrar sesión, bloqueando cualquier
//   transición limpia a la pantalla de login / estado sin sesión.
//
// SOLUCIÓN:
//   Escenario B ahora llama setLoaded(true) igual que Escenario A.
//   El reset de los datos (setValue_(initialValue)) ya es suficiente para
//   limpiar la UI. El loaded=true desbloquea el semáforo dataLoaded y permite
//   que la app navegue correctamente tras el logout.
//
// ESCENARIO A — Montaje / sin sesión:
//   userId=null, prevUserId=null → setLoaded(true) → libera el bloqueo.
//
// ESCENARIO B — Logout real:
//   userId=null, prevUserId="abc123" → reset + setLoaded(true) → UI limpia + desbloqueada.
//
// FLUJO PARA USUARIO AUTENTICADO (React 18 batching):
//   getSession() resuelve con sesión válida → setUserId("id") + setAuthReady(true)
//   se batchean en un solo render → effectiveUserId salta null→"id" directamente
//   → Escenario A nunca se ejecuta → el hook va directo al path de fetch.
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
      // Distinguir entre dos escenarios con comportamientos opuestos.
      // CLAVE: el cleanup del efecto anterior NO resetea prevUserId.current,
      // por eso la "evidencia" del logout real está intacta cuando llegamos aquí.

      if (prevUserId.current !== null) {
        // ESCENARIO B — Logout real confirmado:
        //   userId=null Y prevUserId.current tenía un ID válido.
        //   → El usuario SÍ tenía sesión activa y ahora no la tiene.
        //   → Resetear estado para no dejar datos del usuario anterior en pantalla.
        //   → setLoaded(true): IMPRESCINDIBLE para no bloquear dataLoaded.
        //     Si quedara en false, el AND de 11 hooks nunca llegaría a true y
        //     la app quedaría congelada tras el logout.
        prevUserId.current   = null;
        userModified.current = false;
        clearTimeout(saveTimerRef.current);
        setValue_(initialValue);
        setLoaded(true);
      } else {
        // ESCENARIO A — Montaje inicial / sin sesión activa:
        //   userId=null Y prevUserId.current=null.
        //   → El hook nunca ha servido a ningún usuario todavía.
        //   → setLoaded(true): IMPRESCINDIBLE para evitar deadlock.
        //     Si getSession() resuelve con session=null, effectiveUserId queda
        //     en null, las deps [userId, key, table] no cambian, el efecto no
        //     vuelve a ejecutarse, y loaded quedaría en false para siempre.
        //     dataLoaded (AND de 11 hooks) nunca llegaría a true → pantalla
        //     "Cargando..." indefinida para cualquier usuario no autenticado.
        setLoaded(true);
      }
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
      // prevUserId.current=null y el reset (Escenario B) nunca ocurriría.
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
