// ─────────────────────────────────────────────────────────────────────────────
// src/lib/eventBus.js
// FASE 2 — Canal de comunicación lateral entre módulos.
// Usa mitt (300 bytes, cero dependencias transitivas).
//
// PATRÓN DE USO:
//   Emisor  → import { emit }  from "../lib/eventBus.js"  → emit.sessionCreated(...)
//   Receptor → import { bus }  from "../lib/eventBus.js"  → bus.on("session:created", fn)
//
// CATÁLOGO DE EVENTOS:
//   session:created   { patientId, patientName, sessionId, date }
//   risk:elevated     { patientId, patientName, sessionId, level }  level: "bajo"|"moderado"|"alto"
//   task:assigned     { patientId, patientName, sessionId, count }
//   payment:created   { patientId, patientName, sessionId, amount, method }
// ─────────────────────────────────────────────────────────────────────────────
import mitt from "mitt";

export const bus = mitt();

// ── Helpers semánticos — los módulos usan estos en lugar de bus.emit directo ─
export const emit = {
  sessionCreated: (data) => bus.emit("session:created",  data),
  riskElevated:   (data) => bus.emit("risk:elevated",    data),
  taskAssigned:   (data) => bus.emit("task:assigned",    data),
  paymentCreated: (data) => bus.emit("payment:created",  data),
};
