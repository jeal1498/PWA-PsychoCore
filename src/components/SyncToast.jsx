// ─────────────────────────────────────────────────────────────────────────────
// src/components/SyncToast.jsx
//
// Toast que muestra el estado de sincronización con Supabase.
// Escucha los eventos sync:start / sync:done / sync:error del eventBus.
// Se auto-oculta 2.5s después de sync:done.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from "react";
import { bus } from "../lib/eventBus.js";
import { T }   from "../theme.js";

const STATES = {
  hidden:  "hidden",
  syncing: "syncing",
  done:    "done",
  error:   "error",
};

export default function SyncToast() {
  const [state,   setState]   = useState(STATES.hidden);
  const [visible, setVisible] = useState(false);
  const hideTimer  = useRef(null);
  const syncCount  = useRef(0); // cuántos saves están en vuelo simultáneamente

  useEffect(() => {
    const onStart = () => {
      syncCount.current += 1;
      clearTimeout(hideTimer.current);
      setState(STATES.syncing);
      setVisible(true);
    };

    const onDone = () => {
      syncCount.current = Math.max(0, syncCount.current - 1);
      if (syncCount.current > 0) return; // aún hay saves en vuelo
      setState(STATES.done);
      hideTimer.current = setTimeout(() => {
        setVisible(false);
        setState(STATES.hidden);
      }, 2500);
    };

    const onError = () => {
      syncCount.current = Math.max(0, syncCount.current - 1);
      setState(STATES.error);
      hideTimer.current = setTimeout(() => {
        setVisible(false);
        setState(STATES.hidden);
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
    };
  }, []);

  if (!visible) return null;

  const config = {
    syncing: { bg: T.p,   icon: <Spinner />, text: "Guardando…"     },
    done:    { bg: T.suc, icon: "✓",         text: "Guardado"        },
    error:   { bg: T.err, icon: "✕",         text: "Error al guardar"},
  }[state];

  if (!config) return null;

  return (
    <div style={{
      position:       "fixed",
      bottom:         24,
      right:          24,
      zIndex:         9999,
      display:        "flex",
      alignItems:     "center",
      gap:            8,
      background:     config.bg,
      color:          "#fff",
      padding:        "10px 16px",
      borderRadius:   12,
      fontSize:       13,
      fontFamily:     T.fB,
      fontWeight:     500,
      boxShadow:      "0 4px 20px rgba(0,0,0,0.18)",
      animation:      "syncToastIn 0.2s ease",
      pointerEvents:  "none",
    }}>
      <style>{`
        @keyframes syncToastIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
      `}</style>
      <span style={{ display:"flex", alignItems:"center" }}>{config.icon}</span>
      <span>{config.text}</span>
    </div>
  );
}

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
