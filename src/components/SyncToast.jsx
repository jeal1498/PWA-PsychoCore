// ─────────────────────────────────────────────────────────────────────────────
// src/components/SyncToast.jsx
//
// AppToast — maneja dos capas de toasts:
//   1. sync:start / sync:done / sync:error  (comportamiento original intacto)
//   2. ui:toast { message, type, duration } (stack genérico, máx. 3 visibles)
//
// Exporta:
//   export default AppToast
//   export { AppToast as SyncToast }   ← alias para no romper App.jsx
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef, useCallback } from "react";
import { bus } from "../lib/eventBus.js";
import { T }   from "../theme.js";

// ── 1. SYNC TOAST (original) ──────────────────────────────────────────────────
const SYNC_STATES = {
  hidden:  "hidden",
  syncing: "syncing",
  done:    "done",
  error:   "error",
};

function SyncIndicator() {
  const [state,   setState]   = useState(SYNC_STATES.hidden);
  const [visible, setVisible] = useState(false);
  const hideTimer    = useRef(null);
  const safetyTimer  = useRef(null);
  const syncCount    = useRef(0);

  useEffect(() => {
    const forceHide = () => {
      syncCount.current = 0;
      setState(SYNC_STATES.error);
      setVisible(true);
      hideTimer.current = setTimeout(() => {
        setVisible(false);
        setState(SYNC_STATES.hidden);
      }, 4000);
    };

    const onStart = () => {
      syncCount.current += 1;
      clearTimeout(hideTimer.current);
      // Safety: si en 12s no llega sync:done/error, forzamos cierre
      clearTimeout(safetyTimer.current);
      safetyTimer.current = setTimeout(forceHide, 12000);
      setState(SYNC_STATES.syncing);
      setVisible(true);
    };

    const onDone = () => {
      syncCount.current = Math.max(0, syncCount.current - 1);
      if (syncCount.current > 0) return;
      clearTimeout(safetyTimer.current);
      setState(SYNC_STATES.done);
      hideTimer.current = setTimeout(() => {
        setVisible(false);
        setState(SYNC_STATES.hidden);
      }, 2500);
    };

    const onError = () => {
      syncCount.current = Math.max(0, syncCount.current - 1);
      clearTimeout(safetyTimer.current);
      setState(SYNC_STATES.error);
      hideTimer.current = setTimeout(() => {
        setVisible(false);
        setState(SYNC_STATES.hidden);
      }, 4000);
    };

    bus.on("sync:start", onStart);
    bus.on("sync:done",  onDone);
    bus.on("sync:error", onError);

    return () => {
      bus.off("sync:start", onStart);
      bus.off("sync:done",  onDone);
      bus.off("sync:error", onError);
      clearTimeout(hideTimer.current);
      clearTimeout(safetyTimer.current);
    };
  }, []);

  if (!visible) return null;

  const config = {
    syncing: { bg: T.p,   icon: <Spinner />, text: "Guardando…"      },
    done:    { bg: T.suc, icon: "✓",         text: "Guardado"         },
    error:   { bg: T.err, icon: "✕",         text: "Error al guardar" },
  }[state];

  if (!config) return null;

  return (
    <div style={{
      display:       "flex",
      alignItems:    "center",
      gap:           8,
      background:    config.bg,
      color:         "#fff",
      padding:       "10px 16px",
      borderRadius:  12,
      fontSize:      13,
      fontFamily:    T.fB,
      fontWeight:    500,
      boxShadow:     "0 4px 20px rgba(0,0,0,0.18)",
      animation:     "syncToastIn 0.2s ease",
      pointerEvents: "none",
    }}>
      <span style={{ display: "flex", alignItems: "center" }}>{config.icon}</span>
      <span>{config.text}</span>
    </div>
  );
}

// ── 2. UI TOAST STACK ─────────────────────────────────────────────────────────
const MAX_TOASTS = 3;
let _toastId = 0;

const TYPE_CONFIG = {
  success: { bg: T.suc, icon: "✓" },
  warn:    { bg: T.war, icon: "!" },
  error:   { bg: T.err, icon: "!" },
  info:    { bg: T.p,   icon: "i" },
};

function UiToastStack() {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    const onToast = ({ message, type = "success", duration = 3000 }) => {
      const id = ++_toastId;
      setToasts(prev => {
        const next = [...prev, { id, message, type }];
        // descarta el más antiguo si supera MAX_TOASTS
        if (next.length > MAX_TOASTS) {
          const removed = next.shift();
          clearTimeout(timers.current[removed.id]);
          delete timers.current[removed.id];
        }
        return next;
      });
      timers.current[id] = setTimeout(() => dismiss(id), duration);
    };

    bus.on("ui:toast", onToast);
    return () => {
      bus.off("ui:toast", onToast);
      Object.values(timers.current).forEach(clearTimeout);
    };
  }, [dismiss]);

  if (toasts.length === 0) return null;

  return (
    <>
      {toasts.map(t => {
        const cfg = TYPE_CONFIG[t.type] || TYPE_CONFIG.info;
        return (
          <div
            key={t.id}
            onClick={() => dismiss(t.id)}
            style={{
              display:       "flex",
              alignItems:    "center",
              gap:           8,
              background:    cfg.bg,
              color:         "#fff",
              padding:       "10px 16px",
              borderRadius:  12,
              fontSize:      13,
              fontFamily:    T.fB,
              fontWeight:    500,
              boxShadow:     "0 4px 20px rgba(0,0,0,0.18)",
              animation:     "syncToastIn 0.2s ease",
              cursor:        "pointer",
              userSelect:    "none",
            }}
          >
            <span style={{
              width: 18, height: 18, borderRadius: "50%",
              background: "rgba(255,255,255,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 800, flexShrink: 0,
            }}>
              {cfg.icon}
            </span>
            <span style={{ flex: 1 }}>{t.message}</span>
          </div>
        );
      })}
    </>
  );
}

// ── 3. SPINNER (igual que el original) ───────────────────────────────────────
function Spinner() {
  return (
    <span style={{
      display:      "inline-block",
      width:        13,
      height:       13,
      border:       "2px solid rgba(255,255,255,0.4)",
      borderTop:    "2px solid #fff",
      borderRadius: "50%",
      animation:    "syncSpin 0.7s linear infinite",
    }}>
      <style>{`@keyframes syncSpin { to { transform: rotate(360deg); } }`}</style>
    </span>
  );
}

// ── 4. COMPONENTE RAÍZ ────────────────────────────────────────────────────────
function AppToast() {
  return (
    <div style={{
      position:      "fixed",
      bottom:        24,
      right:         24,
      zIndex:        9999,
      display:       "flex",
      flexDirection: "column",
      alignItems:    "flex-end",
      gap:           8,
      pointerEvents: "none",  // los toasts de ui:toast sobreescriben con "pointer"
    }}>
      <style>{`
        @keyframes syncToastIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
      `}</style>

      {/* ui:toast stack — aparece encima del sync toast */}
      <div style={{ pointerEvents: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
        <UiToastStack />
      </div>

      {/* sync indicator — siempre al fondo */}
      <div style={{ pointerEvents: "none" }}>
        <SyncIndicator />
      </div>
    </div>
  );
}

export { AppToast as SyncToast };
export default AppToast;
