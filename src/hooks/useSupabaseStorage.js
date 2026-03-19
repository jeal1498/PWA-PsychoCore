// ─────────────────────────────────────────────────────────────────────────────
// src/hooks/useSupabaseStorage.js
//
// PATRÓN RESILIENTE BIDIRECCIONAL — dos capas con sync inteligente:
//   1. localStorage  → carga instantánea, funciona offline
//   2. Supabase      → fuente de verdad en la nube
//
// Reglas de sincronización al montar:
//   A) Supabase vacío + local con datos  → sube local a Supabase inmediatamente
//   B) Supabase más reciente que local   → baja Supabase, actualiza local
//   C) Local más reciente que Supabase   → sube local a Supabase inmediatamente
//   D) Ambos vacíos                      → no hace nada
//
// Cada entrada en localStorage guarda { data, updatedAt } para poder comparar.
// Cuando no hay internet: funciona con localStorage y encola sync al reconectar.
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

// ── localStorage helpers ──────────────────────────────────────────────────────
// Guarda { data, updatedAt } para poder comparar timestamps con Supabase.

function readLS(key, fallback) {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    if (raw === null) return { data: fallback, updatedAt: null };
    const parsed = JSON.parse(raw);
    // Compatibilidad con formato anterior (solo data, sin envelope)
    if (parsed && typeof parsed === "object" && "updatedAt" in parsed) {
      return parsed;
    }
    return { data: parsed, updatedAt: null };
  } catch {
    return { data: fallback, updatedAt: null };
  }
}

function writeLS(key, data, updatedAt) {
  try {
    localStorage.setItem(LS_PREFIX + key, JSON.stringify({ data, updatedAt }));
  } catch {
    // localStorage lleno — continuar sin caché local
  }
}

function clearLS(key) {
  try { localStorage.removeItem(LS_PREFIX + key); } catch {}
}

// ── Hook principal ────────────────────────────────────────────────────────────

export function useSupabaseStorage(key, initialValue) {
  const cached              = readLS(key, initialValue);
  const [value,  setValue_] = useState(cached.data);
  const [loaded, setLoaded] = useState(false);

  const userIdRef    = useRef(null);
  const saveTimerRef = useRef(null);
  const isSyncing    = useRef(false); // evita re-subir lo que acabamos de bajar
  const pendingSync  = useRef(false); // sync pendiente mientras no hay internet

  const table = TABLE_MAP[key];

  // ── upsert a Supabase ─────────────────────────────────────────────────────
  const pushToSupabase = useCallback(async (uid, dataToSave) => {
    if (!uid || !table) return;
    const now = new Date().toISOString();
    const { error } = await supabase
      .from(table)
      .upsert(
        { psychologist_id: uid, data: dataToSave },
        { onConflict: "psychologist_id" }
      );
    if (error) {
      console.error(`[storage] ❌ Error subiendo ${key}:`, error.message);
      pendingSync.current = true; // reintentar al reconectar
    } else {
      console.log(`[storage] ✅ Supabase OK: ${key}`);
      writeLS(key, dataToSave, now);
      pendingSync.current = false;
    }
  }, [key, table]);

  // ── Sync bidireccional al montar ──────────────────────────────────────────
  const syncOnMount = useCallback(async (uid) => {
    if (!uid || !table) { setLoaded(true); return; }

    try {
      const { data: remote, error } = await supabase
        .from(table)
        .select("data, updated_at")
        .eq("psychologist_id", uid)
        .maybeSingle();

      if (error) {
        // Sin internet o error — usar localStorage tal cual
        console.warn(`[storage] Sin conexión o error en ${key}:`, error.message);
        setLoaded(true);
        return;
      }

      const localCache  = readLS(key, initialValue);
      const localData   = localCache.data;
      const localTs     = localCache.updatedAt ? new Date(localCache.updatedAt) : null;
      const remoteTs    = remote?.updated_at   ? new Date(remote.updated_at)   : null;

      const isEmpty = (d) => d === null || d === undefined ||
        (Array.isArray(d) ? d.length === 0 : typeof d === "object" && Object.keys(d).length === 0);

      const localHasData  = !isEmpty(localData)  && localData  !== initialValue;
      const remoteHasData = !isEmpty(remote?.data);

      if (!remoteHasData && localHasData) {
        // Caso A — Supabase vacío, local tiene datos → subir inmediatamente
        console.log(`[storage] ⬆️ Caso A — subiendo ${key} a Supabase`);
        await pushToSupabase(uid, localData);
        isSyncing.current = true;
        setValue_(localData);

      } else if (remoteHasData && !localHasData) {
        // Caso B — Supabase tiene datos, local vacío → bajar
        console.log(`[storage] ⬇️ Caso B — bajando ${key} desde Supabase`);
        isSyncing.current = true;
        setValue_(remote.data);
        writeLS(key, remote.data, remote.updated_at);

      } else if (remoteHasData && localHasData) {
        // Determinar quién gana:
        // 1. Si ambos tienen timestamps → gana el más reciente
        // 2. Si falta algún timestamp   → gana el que tenga más registros
        //    (en una app clínica siempre se agrega, raramente se borra)
        const localLen  = Array.isArray(localData)   ? localData.length   : Object.keys(localData   || {}).length;
        const remoteLen = Array.isArray(remote.data) ? remote.data.length : Object.keys(remote.data || {}).length;

        const localWins = (localTs && remoteTs)
          ? localTs > remoteTs      // ambos tienen timestamp → comparar fechas
          : localLen >= remoteLen;  // sin timestamps → gana el que tiene más datos

        if (localWins) {
          // Caso C — local más reciente o con más datos → subir
          console.log(`[storage] ⬆️ Caso C — local gana (${localLen} vs ${remoteLen}), subiendo ${key}`);
          await pushToSupabase(uid, localData);
          isSyncing.current = true;
          setValue_(localData);
        } else {
          // Caso B+ — Supabase más reciente o con más datos → bajar
          console.log(`[storage] ⬇️ Caso B+ — Supabase gana (${remoteLen} vs ${localLen}), bajando ${key}`);
          isSyncing.current = true;
          setValue_(remote.data);
          writeLS(key, remote.data, remote.updated_at);
        }
      }
      // Caso D — ambos vacíos → no hacer nada

    } catch (e) {
      console.warn(`[storage] Excepción sync ${key}:`, e);
    } finally {
      setLoaded(true);
    }
  }, [key, table, initialValue, pushToSupabase]);

  // ── Auth: sesión en mount + escuchar login/logout ─────────────────────────
  useEffect(() => {
    setLoaded(true); // mostrar datos de localStorage inmediatamente

    let cancelled = false;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session?.user) {
        userIdRef.current = session.user.id;
        syncOnMount(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "INITIAL_SESSION") return;

        if (session?.user) {
          const uid = session.user.id;
          const wasLoggedOut = !userIdRef.current;
          userIdRef.current = uid;
          if (wasLoggedOut) await syncOnMount(uid);
        } else {
          // Logout — limpiar estado y caché local
          userIdRef.current = null;
          clearTimeout(saveTimerRef.current);
          clearLS(key);
          setValue_(initialValue);
        }
      }
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [syncOnMount, key, initialValue]);

  // ── Reconexión a internet → subir syncs pendientes ───────────────────────
  useEffect(() => {
    const handleOnline = async () => {
      if (!pendingSync.current || !userIdRef.current) return;
      console.log(`[storage] 🌐 Reconectado — subiendo ${key} pendiente`);
      const localCache = readLS(key, initialValue);
      await pushToSupabase(userIdRef.current, localCache.data);
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [key, initialValue, pushToSupabase]);

  // ── Guardado reactivo (localStorage inmediato + Supabase debounced 800ms) ─
  useEffect(() => {
    if (!loaded) return;

    // Si el cambio viene de syncOnMount, no reescribir a Supabase
    if (isSyncing.current) {
      isSyncing.current = false;
      return;
    }

    // Guardar en localStorage inmediatamente con timestamp
    const now = new Date().toISOString();
    writeLS(key, value, now);

    // Guardar en Supabase solo si hay sesión activa
    if (!userIdRef.current) return;

    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      pushToSupabase(userIdRef.current, value);
    }, 800);

    return () => clearTimeout(saveTimerRef.current);
  }, [value, loaded, key, pushToSupabase]);

  const setValue = useCallback((newVal) => {
    setValue_(prev => typeof newVal === "function" ? newVal(prev) : newVal);
  }, []);

  return [value, setValue, loaded];
}
