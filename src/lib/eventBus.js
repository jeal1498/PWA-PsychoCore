// ─────────────────────────────────────────────────────────────────────────────
// src/lib/eventBus.js
// FASE 2 — Event Bus vanilla (sin dependencias externas).
// Reimplementa la API de mitt en ~15 líneas para evitar problemas
// de instalación de paquetes en entornos sin terminal (Vercel + GitHub).
//
// PATRÓN DE USO:
//   Emisor   → import { emit }  from "../lib/eventBus.js"  → emit.sessionCreated(...)
//   Receptor → import { bus }   from "../lib/eventBus.js"  → bus.on("session:created", fn)
//
// CATÁLOGO DE EVENTOS:
//   session:created  { patientId, patientName, sessionId, date }
//   session:save     {}  — dispara guardado desde Ctrl+S global
//   risk:elevated    { patientId, patientName, sessionId, level }
//   task:assigned    { patientId, patientName, sessionId, count }
//   payment:created  { patientId, patientName, sessionId, amount, method }
//   ui:toast         { message: string, type: "success"|"warn"|"error"|"info", duration?: number }
// ─────────────────────────────────────────────────────────────────────────────

function createBus() {
  const listeners = {};

  return {
    on(event, fn) {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(fn);
    },
    off(event, fn) {
      if (!listeners[event]) return;
      listeners[event] = listeners[event].filter(f => f !== fn);
    },
    emit(event, data) {
      (listeners[event] || []).forEach(fn => fn(data));
    },
  };
}

export const bus = createBus();

// ── Helpers semánticos ────────────────────────────────────────────────────────
export const emit = {
  sessionCreated: (data) => bus.emit("session:created",  data),
  sessionSave:   ()     => bus.emit("session:save",      {}),
  riskElevated:   (data) => bus.emit("risk:elevated",    data),
  taskAssigned:   (data) => bus.emit("task:assigned",    data),
  paymentCreated: (data) => bus.emit("payment:created",  data),
  toast: (message, type = "success", duration = 3000) =>
    bus.emit("ui:toast", { message, type, duration }),
};
