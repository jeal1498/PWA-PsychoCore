// ─────────────────────────────────────────────────────────────────────────────
// src/components/DynamicSummary.jsx
// Resumen Dinámico — Sección 5 del Flujo Clínico PsychoCore
//
// Muestra antes de una sesión:
//  · Últimas 3 notas clínicas
//  · Tareas asignadas + estado de cumplimiento (Portal)
//  · Última escala aplicada + comparativa
//  · Nivel de riesgo más reciente
//  · Objetivos del Plan de Tratamiento vigente
//  · Intersesiones registradas
// ─────────────────────────────────────────────────────────────────────────────
import { useMemo } from "react";
import { Modal } from "./ui/index.jsx";
import { T } from "../theme.js";
import { fmtDate } from "../utils.js";
import {
  FileText, ShieldAlert, BarChart2, ClipboardList,
  CheckCircle, Clock, XCircle, Activity, BookOpen
} from "lucide-react";

// ── helpers ───────────────────────────────────────────────────────────────────
const pill = (txt, bg, color) => (
  <span style={{
    display:"inline-flex", alignItems:"center", padding:"2px 9px",
    borderRadius:9999, background:bg, color, fontSize:10,
    fontWeight:700, fontFamily:T.fB,
  }}>{txt}</span>
);

const SectionHead = ({ icon: Icon, label, color = T.p }) => (
  <div style={{
    display:"flex", alignItems:"center", gap:7,
    marginBottom:10, paddingBottom:6,
    borderBottom:`1px solid ${T.bdrL}`,
  }}>
    <Icon size={14} color={color} strokeWidth={1.8}/>
    <span style={{ fontFamily:T.fB, fontSize:11, fontWeight:700, color, textTransform:"uppercase", letterSpacing:"0.07em" }}>
      {label}
    </span>
  </div>
);

const RISK_COLOR = {
  bajo:      { c: "#4CAF7A", bg: "rgba(76,175,122,0.12)"  },
  moderado:  { c: "#B8900A", bg: "rgba(184,144,10,0.12)"  },
  alto:      { c: "#C4622A", bg: "rgba(196,98,42,0.12)"   },
  inminente: { c: "#B85050", bg: "rgba(184,80,80,0.12)"   },
};

const TASK_STATUS = {
  completed:   { icon: CheckCircle, label:"Completada",     color:"#4CAF7A" },
  pending:     { icon: Clock,       label:"Pendiente",      color:"#B8900A" },
  no_response: { icon: XCircle,     label:"Sin respuesta",  color:T.tl },
};

// ─────────────────────────────────────────────────────────────────────────────
export default function DynamicSummary({
  open,
  onClose,
  patient,
  appointment,
  sessions      = [],
  taskAssignments = [],
  scaleResults  = [],
  riskAssessments = [],
  treatmentPlans  = [],
  interSessions   = [],
}) {
  if (!patient) return null;

  const pid = patient.id;

  // ── Últimas 3 sesiones ────────────────────────────────────────────────────
  const lastSessions = useMemo(() =>
    sessions
      .filter(s => s.patientId === pid)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 3),
    [sessions, pid]
  );

  // ── Tareas asignadas (con estado) ─────────────────────────────────────────
  const patientTasks = useMemo(() =>
    taskAssignments
      .filter(t => t.patient_id === pid)
      .sort((a, b) => (b.assigned_at || "").localeCompare(a.assigned_at || ""))
      .slice(0, 5),
    [taskAssignments, pid]
  );

  // ── Última escala + anterior (para comparativa) ───────────────────────────
  const patientScales = useMemo(() =>
    scaleResults
      .filter(r => r.patientId === pid)
      .sort((a, b) => b.date.localeCompare(a.date)),
    [scaleResults, pid]
  );
  const lastScale    = patientScales[0] || null;
  const prevScale    = patientScales.find(r => r.scaleName === lastScale?.scaleName && r.id !== lastScale?.id) || null;

  // ── Riesgo más reciente ───────────────────────────────────────────────────
  const lastRisk = useMemo(() =>
    riskAssessments
      .filter(r => r.patientId === pid)
      .sort((a, b) => (b.date||"").localeCompare(a.date||""))
      [0] || null,
    [riskAssessments, pid]
  );

  // ── Plan de tratamiento vigente ───────────────────────────────────────────
  const activePlan = useMemo(() =>
    treatmentPlans
      .filter(p => p.patientId === pid && p.status !== "cerrado")
      .sort((a, b) => (b.updatedAt||b.createdAt||"").localeCompare(a.updatedAt||a.createdAt||""))
      [0] || null,
    [treatmentPlans, pid]
  );

  // ── Intersesiones recientes ───────────────────────────────────────────────
  const recentInter = useMemo(() =>
    interSessions
      .filter(i => i.patientId === pid)
      .sort((a, b) => (b.date||"").localeCompare(a.date||""))
      .slice(0, 3),
    [interSessions, pid]
  );

  const riskCfg = lastRisk ? (RISK_COLOR[lastRisk.riskLevel] || RISK_COLOR.moderado) : null;

  const section = (children, mb = 20) => (
    <div style={{ marginBottom:mb }}>{children}</div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Resumen — ${patient.name?.split(" ").slice(0,2).join(" ")}`}
      width={560}
    >
      {/* Encabezado de cita */}
      {appointment && (
        <div style={{
          padding:"10px 14px", borderRadius:10, marginBottom:18,
          background:T.pA, border:`1px solid ${T.p}25`,
          display:"flex", alignItems:"center", gap:10,
        }}>
          <Activity size={14} color={T.p}/>
          <span style={{ fontFamily:T.fB, fontSize:12.5, color:T.p, fontWeight:600 }}>
            {fmtDate(appointment.date)} · {appointment.time} · {appointment.type}
          </span>
        </div>
      )}

      {/* ── Nivel de riesgo ───────────────────────────────────────────────── */}
      {lastRisk && riskCfg && section(
        <>
          <SectionHead icon={ShieldAlert} label="Nivel de riesgo" color={riskCfg.c}/>
          <div style={{
            display:"flex", alignItems:"center", gap:10,
            padding:"10px 14px", borderRadius:10, background:riskCfg.bg,
            border:`1px solid ${riskCfg.c}30`,
          }}>
            {pill(lastRisk.riskLevel?.toUpperCase() || "—", riskCfg.bg, riskCfg.c)}
            <span style={{ fontFamily:T.fB, fontSize:12, color:T.tm }}>
              Registrado el {fmtDate(lastRisk.date || lastRisk.createdAt || "")}
            </span>
          </div>
        </>
      )}

      {/* ── Últimas 3 sesiones ────────────────────────────────────────────── */}
      {lastSessions.length > 0 && section(
        <>
          <SectionHead icon={FileText} label="Últimas sesiones"/>
          {lastSessions.map((s, i) => (
            <div key={s.id} style={{
              padding:"10px 14px", marginBottom:6, borderRadius:10,
              background:i===0 ? T.pA : T.cardAlt,
              border:`1px solid ${i===0 ? T.p+"30" : T.bdrL}`,
            }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <span style={{ fontFamily:T.fB, fontSize:12, fontWeight:700, color:T.t }}>
                  {fmtDate(s.date)}
                </span>
                <span style={{ fontFamily:T.fB, fontSize:11, color:T.tl }}>
                  {s.noteFormat?.toUpperCase() || "Libre"} · {s.duration || 50} min
                </span>
              </div>
              <div style={{
                fontFamily:T.fB, fontSize:12.5, color:T.tm, lineHeight:1.55,
                display:"-webkit-box", WebkitLineClamp:3, WebkitBoxOrient:"vertical",
                overflow:"hidden",
              }}>
                {s.notes || "(Sin notas)"}
              </div>
            </div>
          ))}
        </>
      )}

      {/* ── Tareas asignadas ─────────────────────────────────────────────── */}
      {patientTasks.length > 0 && section(
        <>
          <SectionHead icon={ClipboardList} label="Tareas entre sesiones"/>
          {patientTasks.map(t => {
            const statusKey = t.completed_at ? "completed"
              : t.response ? "pending"
              : "no_response";
            const sc = TASK_STATUS[statusKey];
            return (
              <div key={t.id} style={{
                display:"flex", alignItems:"center", gap:10,
                padding:"8px 12px", marginBottom:5, borderRadius:9,
                background:T.cardAlt, border:`1px solid ${T.bdrL}`,
              }}>
                <sc.icon size={14} color={sc.color} style={{ flexShrink:0 }}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:T.fB, fontSize:12.5, color:T.t }}>{t.title || t.template_id || "Tarea"}</div>
                  {t.response && (
                    <div style={{
                      fontFamily:T.fB, fontSize:11, color:T.tm, marginTop:2,
                      display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden",
                    }}>
                      💬 {t.response}
                    </div>
                  )}
                </div>
                {pill(sc.label, `${sc.color}18`, sc.color)}
              </div>
            );
          })}
        </>
      )}

      {/* ── Última escala ────────────────────────────────────────────────── */}
      {lastScale && section(
        <>
          <SectionHead icon={BarChart2} label="Escala más reciente"/>
          <div style={{
            padding:"10px 14px", borderRadius:10,
            background:T.cardAlt, border:`1px solid ${T.bdrL}`,
          }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
              <span style={{ fontFamily:T.fB, fontSize:13, fontWeight:700, color:T.t }}>
                {lastScale.scaleName || lastScale.scale}
              </span>
              <span style={{ fontFamily:T.fB, fontSize:12, fontWeight:700, color:T.p }}>
                {lastScale.totalScore ?? lastScale.score ?? "—"}
              </span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
              <span style={{ fontFamily:T.fB, fontSize:11, color:T.tl }}>
                {fmtDate(lastScale.date)}
              </span>
              {lastScale.interpretation && pill(lastScale.interpretation, T.pA, T.p)}
              {prevScale && (
                <span style={{ fontFamily:T.fB, fontSize:11, color:T.tl }}>
                  Anterior: {prevScale.totalScore ?? prevScale.score ?? "—"} ({fmtDate(prevScale.date)})
                </span>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Plan de tratamiento ───────────────────────────────────────────── */}
      {activePlan && section(
        <>
          <SectionHead icon={BookOpen} label="Plan de tratamiento"/>
          <div style={{
            padding:"10px 14px", borderRadius:10,
            background:T.cardAlt, border:`1px solid ${T.bdrL}`,
          }}>
            {activePlan.objectives?.length > 0 ? (
              activePlan.objectives.slice(0, 3).map((obj, i) => (
                <div key={i} style={{ display:"flex", gap:8, marginBottom:6 }}>
                  <span style={{ fontFamily:T.fB, fontSize:12, fontWeight:700, color:T.p, flexShrink:0 }}>{i+1}.</span>
                  <span style={{ fontFamily:T.fB, fontSize:12.5, color:T.t, lineHeight:1.5 }}>{obj.description || obj.text || obj}</span>
                </div>
              ))
            ) : (
              <span style={{ fontFamily:T.fB, fontSize:12, color:T.tl }}>Sin objetivos registrados</span>
            )}
            {activePlan.objectives?.length > 3 && (
              <div style={{ fontFamily:T.fB, fontSize:11, color:T.tl, marginTop:4 }}>
                +{activePlan.objectives.length - 3} objetivo(s) más
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Intersesiones ────────────────────────────────────────────────── */}
      {recentInter.length > 0 && section(
        <>
          <SectionHead icon={Activity} label="Intersesiones recientes"/>
          {recentInter.map(i => (
            <div key={i.id} style={{
              padding:"8px 12px", marginBottom:5, borderRadius:9,
              background:T.cardAlt, border:`1px solid ${T.bdrL}`,
            }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}>
                <span style={{ fontFamily:T.fB, fontSize:11, fontWeight:700, color:T.tm }}>
                  {fmtDate(i.date || i.createdAt || "")}
                </span>
                {i.type && pill(i.type, T.pA, T.p)}
              </div>
              <div style={{ fontFamily:T.fB, fontSize:12.5, color:T.t, lineHeight:1.5 }}>
                {i.notes || i.content || "(Sin descripción)"}
              </div>
            </div>
          ))}
        </>, 0
      )}

      {/* Estado vacío */}
      {lastSessions.length === 0 && patientTasks.length === 0 && !lastRisk && !activePlan && (
        <div style={{ textAlign:"center", padding:"24px 0", fontFamily:T.fB, fontSize:13, color:T.tl }}>
          Sin historial previo — primera sesión registrada
        </div>
      )}
    </Modal>
  );
}
