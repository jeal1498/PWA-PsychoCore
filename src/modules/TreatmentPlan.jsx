import { useState, useMemo } from "react";
import { Target, Plus, Printer, Trash2, Check, ChevronDown, ChevronUp, CheckCircle, Circle, Clock, TrendingUp, AlertTriangle, FileText, LogOut, Award, CalendarPlus } from "lucide-react";
import { T } from "../theme.js";
import { uid, fmt, todayDate, fmtDate } from "../utils.js";
import { Card, Badge, Modal, Input, Textarea, Select, Btn, EmptyState, PageHeader, Tabs } from "../components/ui/index.jsx";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────
export const OBJECTIVE_STATUS = {
  pendiente:   { label: "Pendiente",   color: T.tl,  bg: T.bdrL  },
  en_proceso:  { label: "En proceso",  color: T.war, bg: T.warA  },
  logrado:     { label: "Logrado",     color: T.suc, bg: T.sucA  },
  abandonado:  { label: "Abandonado",  color: T.err, bg: T.errA  },
};

export const BLANK_FORMULATION = {
  historiaPrima:          "",
  evolucion:              "",
  tratamientosPrevios:    "",
  predisponentesBio:      "",
  predisponentesPsi:      "",
  predisponentesSoc:      "",
  precipitantes:          "",
  mantenedores:           "",
  recursos:               "",
  hipotesis:              "",
  diagnosticoDiferencial: "",
};

// Secciones de la formulación estructurada
const FORMULATION_SECTIONS = [
  {
    group: "Historia del problema",
    color: T.p,
    bg: T.pA,
    fields: [
      { key: "historiaPrima",       label: "Historia del problema",         placeholder: "Inicio y descripción del problema principal. ¿Cuándo comenzó? ¿Cómo se presentó?", rows: 3 },
      { key: "evolucion",           label: "Evolución y cronología",        placeholder: "Cómo ha progresado el problema. Períodos de mejoría o agravamiento, eventos importantes...", rows: 3 },
      { key: "tratamientosPrevios", label: "Tratamientos previos",          placeholder: "Atenciones psicológicas o psiquiátricas anteriores. Resultados, adherencia, fármacos previos...", rows: 2 },
    ],
  },
  {
    group: "Modelo biopsicosocial — Factores predisponentes",
    color: "#5B8DB8",
    bg: "rgba(91,141,184,0.08)",
    fields: [
      { key: "predisponentesBio",   label: "Biológicos",                    placeholder: "Antecedentes médicos, genéticos, familiares psiquiátricos, temperamento...", rows: 2 },
      { key: "predisponentesPsi",   label: "Psicológicos",                  placeholder: "Estilos de afrontamiento, creencias nucleares, historia de apegos, traumas previos...", rows: 2 },
      { key: "predisponentesSoc",   label: "Sociales / contextuales",       placeholder: "Entorno familiar, red de apoyo, nivel socioeconómico, factores culturales...", rows: 2 },
    ],
  },
  {
    group: "Factores precipitantes y mantenedores",
    color: T.war,
    bg: T.warA,
    fields: [
      { key: "precipitantes",       label: "Factores precipitantes",        placeholder: "¿Qué detonó el episodio actual? Eventos vitales estresantes, pérdidas, cambios...", rows: 2 },
      { key: "mantenedores",        label: "Factores mantenedores",         placeholder: "¿Qué perpetúa el problema? Conductas de evitación, refuerzos, cogniciones, contexto...", rows: 3 },
    ],
  },
  {
    group: "Hipótesis clínica",
    color: T.acc,
    bg: T.accA,
    fields: [
      { key: "recursos",            label: "Recursos y fortalezas del paciente", placeholder: "Habilidades, red de apoyo, motivación, insight, experiencias de éxito previas...", rows: 2 },
      { key: "hipotesis",           label: "Hipótesis clínica integradora", placeholder: "Síntesis explicativa del caso: cómo se relacionan los factores predisponentes, precipitantes y mantenedores...", rows: 4 },
      { key: "diagnosticoDiferencial", label: "Diagnóstico diferencial",   placeholder: "Diagnósticos a considerar y descartar con sus argumentos clínicos...", rows: 3 },
    ],
  },
];

const OBJECTIVE_HORIZON = {
  corto:   { label: "Corto plazo",   color: T.acc,        bg: T.accA                   },
  mediano: { label: "Mediano plazo", color: "#5B8DB8",    bg: "rgba(91,141,184,0.10)"  },
  largo:   { label: "Largo plazo",   color: "#6B5B9E",    bg: "rgba(107,91,158,0.10)"  },
};

const PLAN_STATUS = {
  activo:     { label: "Activo",     color: T.suc, bg: T.sucA  },
  revision:   { label: "Revisión",   color: T.war, bg: T.warA  },
  completado: { label: "Listo",      color: T.p,   bg: T.pA    },
  abandonado: { label: "Abandonado", color: T.err, bg: T.errA  },
};

// ─────────────────────────────────────────────────────────────────────────────
// PDF EXPORT
// ─────────────────────────────────────────────────────────────────────────────
function printPlan(plan, patient, sessions, profile) {
  const w     = window.open("", "_blank");
  const today = new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
  const ps    = PLAN_STATUS[plan.status];

  const objectiveRows = (plan.objectives || []).map(obj => {
    const hs = OBJECTIVE_STATUS[obj.status];
    const hz = OBJECTIVE_HORIZON[obj.horizon];
    return `
    <div class="obj">
      <div class="obj-header">
        <span class="badge" style="background:${hz.bg};color:${hz.color}">${hz.label}</span>
        <span class="badge" style="background:${hs.bg};color:${hs.color}">${hs.label}</span>
      </div>
      <p class="obj-text">${obj.description}</p>
      ${obj.interventions ? `<div class="obj-meta"><strong>Intervenciones:</strong> ${obj.interventions}</div>` : ""}
      ${obj.criteria ? `<div class="obj-meta"><strong>Criterios de logro:</strong> ${obj.criteria}</div>` : ""}
      ${obj.achievedDate ? `<div class="obj-meta" style="color:#4E8B5F"><strong>Logrado:</strong> ${fmtDate(obj.achievedDate)}</div>` : ""}
    </div>`;
  }).join("");

  const ptSessions = sessions.filter(s => s.patientId === plan.patientId);
  const totalSess  = ptSessions.length;
  const lastSess   = ptSessions.sort((a, b) => b.date.localeCompare(a.date))[0];

  w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Plan de Tratamiento — ${patient?.name}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',sans-serif;max-width:740px;margin:40px auto;color:#1A2B28;font-size:13px;line-height:1.6}
.header{border-bottom:3px solid #3A6B6E;padding-bottom:20px;margin-bottom:28px;display:flex;justify-content:space-between;align-items:flex-start}
h1{font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:600;color:#3A6B6E;margin-bottom:4px}
.sub{font-size:12px;color:#5A7270}
.badge{padding:3px 10px;border-radius:9999px;font-size:11px;font-weight:700;display:inline-block}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:28px}
.info-box{background:#F9F8F5;padding:13px;border-radius:10px}
.info-box label{display:block;font-size:10px;font-weight:700;color:#9BAFAD;text-transform:uppercase;letter-spacing:.08em;margin-bottom:3px}
.info-box p{font-size:13px;font-weight:500}
h2{font-family:'Cormorant Garamond',serif;font-size:19px;color:#3A6B6E;margin:24px 0 14px;padding-bottom:6px;border-bottom:1px solid #EDF1F0}
.box{background:#F9F8F5;padding:16px;border-radius:10px;border-left:4px solid #3A6B6E;margin-bottom:16px;font-size:13px;line-height:1.7;white-space:pre-wrap}
.box.accent{border-left-color:#C4895A}
.form-section{margin-bottom:10px}
.form-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px}
.obj{background:#F9F8F5;padding:14px;border-radius:10px;margin-bottom:10px}
.obj-header{display:flex;gap:8px;margin-bottom:8px}
.obj-text{font-size:13px;line-height:1.6;margin-bottom:6px}
.obj-meta{font-size:12px;color:#5A7270;margin-top:4px}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px}
.sig{margin-top:40px;display:flex;justify-content:flex-end}
.sig-line{width:220px;border-top:1px solid #1A2B28;padding-top:7px;font-size:12px;color:#5A7270}
footer{margin-top:40px;padding-top:14px;border-top:1px solid #D8E2E0;font-size:11px;color:#9BAFAD;display:flex;justify-content:space-between}
@media print{body{margin:0}}
</style></head><body>

<div class="header">
  <div>
    <h1>Plan de Tratamiento</h1>
    <div class="sub">${profile?.clinic || "Consultorio Psicológico"}${profile?.name ? " · " + profile.name : ""}${profile?.cedula ? " · Céd. " + profile.cedula : ""}</div>
  </div>
  <span class="badge" style="background:${ps.bg};color:${ps.color};font-size:12px">${ps.label}</span>
</div>

<div class="grid">
  <div class="info-box"><label>Paciente</label><p>${patient?.name || "—"}</p></div>
  <div class="info-box"><label>Fecha de inicio</label><p>${fmtDate(plan.startDate)}</p></div>
  <div class="info-box"><label>Sesiones realizadas</label><p>${totalSess}</p></div>
  ${patient?.diagnosis ? `<div class="info-box"><label>Diagnóstico</label><p>${patient.diagnosis}</p></div>` : ""}
  ${plan.modality ? `<div class="info-box"><label>Modalidad</label><p>${plan.modality}</p></div>` : ""}
  ${lastSess ? `<div class="info-box"><label>Última sesión</label><p>${fmtDate(lastSess.date)}</p></div>` : ""}
</div>

${plan.chiefComplaint ? `<h2>Motivo de consulta</h2><div class="box">${plan.chiefComplaint}</div>` : ""}

${(() => {
  const fm = plan.formulation;
  if (!fm || !Object.values(fm).some(Boolean)) {
    return plan.clinicalFormulation ? `<h2>Formulación clínica</h2><div class="box">${plan.clinicalFormulation}</div>` : "";
  }
  const section = (title, content, borderColor = "#3A6B6E") =>
    content ? `<div class="form-section"><div class="form-label" style="color:${borderColor}">${title}</div><div class="box" style="border-left-color:${borderColor}">${content}</div></div>` : "";
  return `
<h2>Formulación clínica — Modelo biopsicosocial</h2>
<div style="margin-bottom:8px">
${section("Historia del problema", fm.historiaPrima)}
${section("Evolución y cronología", fm.evolucion)}
${section("Tratamientos previos", fm.tratamientosPrevios)}
${section("Factores predisponentes biológicos", fm.predisponentesBio, "#5B8DB8")}
${section("Factores predisponentes psicológicos", fm.predisponentesPsi, "#5B8DB8")}
${section("Factores predisponentes sociales", fm.predisponentesSoc, "#5B8DB8")}
${section("Factores precipitantes", fm.precipitantes, "#B8900A")}
${section("Factores mantenedores", fm.mantenedores, "#B8900A")}
${section("Recursos y fortalezas", fm.recursos, "#C4895A")}
${section("Hipótesis clínica integradora", fm.hipotesis, "#C4895A")}
${section("Diagnóstico diferencial", fm.diagnosticoDiferencial, "#C4895A")}
</div>`;
})()}

<h2>Objetivos terapéuticos</h2>
${objectiveRows || "<p style='color:#9BAFAD;font-size:13px'>Sin objetivos registrados.</p>"}

${plan.therapeuticApproach ? `<h2>Enfoque y técnicas</h2><div class="box accent">${plan.therapeuticApproach}</div>` : ""}

${plan.dischargeCriteria ? `<h2>Criterios de alta</h2><div class="box">${plan.dischargeCriteria}</div>` : ""}

${plan.reviewNotes ? `<h2>Notas de revisión</h2><div class="box">${plan.reviewNotes}</div>` : ""}

<div class="sig"><div class="sig-line">${profile?.name || "Terapeuta"}${profile?.cedula ? " · Céd. " + profile.cedula : ""}</div></div>
<footer><span>PsychoCore · Plan de Tratamiento</span><span>${today} · Documento confidencial</span></footer>
</body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 500);
}

// ─────────────────────────────────────────────────────────────────────────────
// FORMULACIÓN CLÍNICA ESTRUCTURADA
// ─────────────────────────────────────────────────────────────────────────────
function FormulacionEstructurada({ formulation = {}, onChange }) {
  const f = { ...BLANK_FORMULATION, ...formulation };
  const set = key => e => onChange({ ...f, [key]: e.target.value });
  const filled = Object.values(f).filter(Boolean).length;
  const total  = Object.keys(BLANK_FORMULATION).length;

  return (
    <div>
      {/* Progress indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, padding: "12px 16px", background: T.cardAlt, borderRadius: 12, border: `1px solid ${T.bdrL}` }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontFamily: T.fB, fontSize: 12, fontWeight: 600, color: T.tm }}>Formulación completada</span>
            <span style={{ fontFamily: T.fB, fontSize: 12, fontWeight: 700, color: filled === total ? T.suc : T.p }}>{filled}/{total} secciones</span>
          </div>
          <div style={{ height: 6, background: T.bdrL, borderRadius: 9999, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(filled / total) * 100}%`, background: filled === total ? T.suc : T.p, borderRadius: 9999, transition: "width .3s" }}/>
          </div>
        </div>
      </div>

      {FORMULATION_SECTIONS.map(({ group, color, bg, fields }) => (
        <div key={group} style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color, marginBottom: 12, display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }}/>
            {group}
          </div>
          <div style={{ border: `1.5px solid ${color}30`, borderRadius: 12, overflow: "hidden" }}>
            {fields.map((field, idx) => (
              <div key={field.key} style={{ borderBottom: idx < fields.length - 1 ? `1px solid ${T.bdrL}` : "none" }}>
                <div style={{ padding: "9px 14px 6px", background: bg }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.07em" }}>{field.label}</label>
                </div>
                <textarea
                  value={f[field.key]}
                  onChange={set(field.key)}
                  placeholder={field.placeholder}
                  rows={field.rows}
                  style={{ width: "100%", padding: "11px 14px", border: "none", outline: "none", fontFamily: T.fB, fontSize: 13.5, color: T.t, background: T.card, resize: "vertical", boxSizing: "border-box", lineHeight: 1.65 }}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OBJECTIVE ITEM
// ─────────────────────────────────────────────────────────────────────────────
function ObjectiveItem({ obj, onUpdate, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const hs = OBJECTIVE_STATUS[obj.status];
  const hz = OBJECTIVE_HORIZON[obj.horizon];

  const StatusIcon = obj.status === "logrado" ? CheckCircle
    : obj.status === "en_proceso" ? Clock
    : obj.status === "abandonado" ? AlertTriangle
    : Circle;

  return (
    <div style={{ padding: "14px 16px", background: T.cardAlt, borderRadius: 12, marginBottom: 8, border: `1px solid ${T.bdrL}` }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <button onClick={() => {
          const order = ["pendiente", "en_proceso", "logrado"];
          const idx = order.indexOf(obj.status);
          const next = order[(idx + 1) % order.length];
          onUpdate({ ...obj, status: next, achievedDate: next === "logrado" ? fmt(todayDate) : obj.achievedDate });
        }} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 0", flexShrink: 0, marginTop: 1 }}>
          <StatusIcon size={18} color={hs.color} strokeWidth={1.8}/>
        </button>

        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: T.fB, fontSize: 13.5, color: T.t, lineHeight: 1.55, marginBottom: 8 }}>
            {obj.description}
          </div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            <span style={{ padding: "2px 9px", borderRadius: 9999, background: hz.bg, color: hz.color, fontSize: 10, fontWeight: 700, fontFamily: T.fB }}>{hz.label}</span>
            <span style={{ padding: "2px 9px", borderRadius: 9999, background: hs.bg, color: hs.color, fontSize: 10, fontWeight: 700, fontFamily: T.fB }}>{hs.label}</span>
            {obj.achievedDate && <span style={{ fontSize: 10, color: T.suc, fontFamily: T.fB, fontWeight: 600 }}>✓ {fmtDate(obj.achievedDate)}</span>}
          </div>

          {expanded && (
            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: T.tl, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Intervenciones</label>
                <textarea value={obj.interventions || ""} onChange={e => onUpdate({ ...obj, interventions: e.target.value })}
                  placeholder="Técnicas y estrategias para lograr este objetivo..." rows={2}
                  style={{ width: "100%", padding: "8px 12px", border: `1px solid ${T.bdr}`, borderRadius: 8, fontFamily: T.fB, fontSize: 13, color: T.t, background: T.card, outline: "none", resize: "vertical", boxSizing: "border-box" }}/>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: T.tl, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Criterios de logro</label>
                <textarea value={obj.criteria || ""} onChange={e => onUpdate({ ...obj, criteria: e.target.value })}
                  placeholder="¿Cómo sabremos que este objetivo fue alcanzado?" rows={2}
                  style={{ width: "100%", padding: "8px 12px", border: `1px solid ${T.bdr}`, borderRadius: 8, fontFamily: T.fB, fontSize: 13, color: T.t, background: T.card, outline: "none", resize: "vertical", boxSizing: "border-box" }}/>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: T.tl, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Horizonte</label>
                  <select value={obj.horizon} onChange={e => onUpdate({ ...obj, horizon: e.target.value })}
                    style={{ width: "100%", padding: "7px 10px", border: `1px solid ${T.bdr}`, borderRadius: 8, fontFamily: T.fB, fontSize: 12, color: T.t, background: T.card, outline: "none" }}>
                    {Object.entries(OBJECTIVE_HORIZON).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: T.tl, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Estado</label>
                  <select value={obj.status} onChange={e => onUpdate({ ...obj, status: e.target.value, achievedDate: e.target.value === "logrado" ? fmt(todayDate) : obj.achievedDate })}
                    style={{ width: "100%", padding: "7px 10px", border: `1px solid ${T.bdr}`, borderRadius: 8, fontFamily: T.fB, fontSize: 12, color: T.t, background: T.card, outline: "none" }}>
                    {Object.entries(OBJECTIVE_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          <button onClick={() => setExpanded(e => !e)} style={{ background: T.bdrL, border: "none", borderRadius: 7, padding: 6, cursor: "pointer", color: T.tm }}>
            {expanded ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
          </button>
          <button onClick={() => onDelete(obj.id)} style={{ background: "none", border: "none", color: T.tl, cursor: "pointer", padding: 6 }}>
            <Trash2 size={13}/>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PLAN DETAIL VIEW
// ─────────────────────────────────────────────────────────────────────────────
function PlanDetail({ plan, onUpdate, onDelete, onBack, patient, sessions, profile, setAppointments, scaleResults = [] }) {
  const [tab, setTab]           = useState("objectives");
  const [showAddObj, setShowAddObj] = useState(false);
  const [newObj, setNewObj]     = useState({ description: "", horizon: "corto", status: "pendiente", interventions: "", criteria: "" });

  const ptSessions = sessions.filter(s => s.patientId === plan.patientId);
  const objectives = plan.objectives || [];
  const achieved   = objectives.filter(o => o.status === "logrado").length;
  const inProgress = objectives.filter(o => o.status === "en_proceso").length;

  const set = k => v => onUpdate({ ...plan, [k]: v });

  const addObjective = () => {
    if (!newObj.description.trim()) return;
    onUpdate({ ...plan, objectives: [...objectives, { ...newObj, id: "obj" + uid() }] });
    setNewObj({ description: "", horizon: "corto", status: "pendiente", interventions: "", criteria: "" });
    setShowAddObj(false);
  };

  const updateObjective = (updated) => {
    onUpdate({ ...plan, objectives: objectives.map(o => o.id === updated.id ? updated : o) });
  };

  const deleteObjective = (id) => {
    onUpdate({ ...plan, objectives: objectives.filter(o => o.id !== id) });
  };

  const ps = PLAN_STATUS[plan.status];

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: T.fB, fontSize: 13, color: T.p, padding: 0, display: "flex", alignItems: "center", gap: 5, marginBottom: 10, fontWeight: 600 }}>
            ← Todos los planes
          </button>
          <h1 style={{ fontFamily: T.fH, fontSize: 30, fontWeight: 500, color: T.t, margin: 0 }}>{patient?.name?.split(" ").slice(0, 2).join(" ")}</h1>
          <p style={{ fontFamily: T.fB, fontSize: 13, color: T.tm, margin: "4px 0 0" }}>Iniciado {fmtDate(plan.startDate)} · {ptSessions.length} sesiones</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <select value={plan.status} onChange={e => set("status")(e.target.value)}
            style={{ padding: "8px 14px", border: `1.5px solid ${ps.color}`, borderRadius: 9999, fontFamily: T.fB, fontSize: 12, fontWeight: 700, color: ps.color, background: ps.bg, cursor: "pointer", outline: "none" }}>
            {Object.entries(PLAN_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <Btn small onClick={() => printPlan(plan, patient, sessions, profile)}><Printer size={13}/> PDF</Btn>
          <button onClick={() => onDelete(plan.id)} style={{ background: "none", border: "none", color: T.tl, cursor: "pointer", padding: 6 }}><Trash2 size={15}/></button>
        </div>
      </div>

      {/* Progress bar */}
      {objectives.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontFamily: T.fB, fontSize: 12, color: T.tm }}>{achieved} / {objectives.length} objetivos logrados</span>
            <span style={{ fontFamily: T.fB, fontSize: 12, color: T.tm }}>{inProgress} en proceso</span>
          </div>
          <div style={{ height: 7, background: T.bdrL, borderRadius: 9999, overflow: "hidden", display: "flex", gap: 2 }}>
            <div style={{ height: "100%", width: `${(achieved / objectives.length) * 100}%`, background: T.suc, borderRadius: 9999, transition: "width .4s ease" }}/>
          </div>
        </div>
      )}

      <Tabs
        tabs={[
          { id: "objectives", label: `Objetivos (${objectives.length})` },
          { id: "clinical",   label: "Datos clínicos"                   },
          { id: "review",     label: "Revisiones"                       },
          { id: "alta",       label: plan.status === "completado" ? "✓ Alta registrada" : "Alta terapéutica" },
        ]}
        active={tab} onChange={setTab}
      />

      {/* OBJECTIVES TAB */}
      {tab === "objectives" && (
        <div>
          {/* Group by horizon */}
          {["corto", "mediano", "largo"].map(hz => {
            const group = objectives.filter(o => o.horizon === hz);
            if (group.length === 0) return null;
            const hzCfg = OBJECTIVE_HORIZON[hz];
            return (
              <div key={hz} style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ padding: "3px 12px", borderRadius: 9999, background: hzCfg.bg, color: hzCfg.color, fontSize: 11, fontWeight: 700, fontFamily: T.fB }}>{hzCfg.label}</span>
                  <span style={{ fontSize: 12, color: T.tl, fontFamily: T.fB }}>{group.filter(o => o.status === "logrado").length}/{group.length} logrados</span>
                </div>
                {group.map(obj => (
                  <ObjectiveItem key={obj.id} obj={obj} onUpdate={updateObjective} onDelete={deleteObjective}/>
                ))}
              </div>
            );
          })}

          {objectives.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 0", color: T.tl }}>
              <Target size={36} strokeWidth={1.2} style={{ marginBottom: 12, opacity: 0.3 }}/>
              <div style={{ fontFamily: T.fB, fontSize: 13 }}>Sin objetivos aún. Agrega el primero.</div>
            </div>
          )}

          {/* Add objective */}
          {showAddObj ? (
            <Card style={{ padding: 18, marginTop: 12 }}>
              <div style={{ fontFamily: T.fB, fontSize: 13, fontWeight: 600, color: T.t, marginBottom: 12 }}>Nuevo objetivo</div>
              <div style={{ marginBottom: 12 }}>
                <textarea value={newObj.description} onChange={e => setNewObj(n => ({ ...n, description: e.target.value }))}
                  placeholder="Describe el objetivo terapéutico de forma observable y medible..." rows={2}
                  style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 13.5, color: T.t, background: T.card, outline: "none", resize: "vertical", boxSizing: "border-box" }}/>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.tm, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>Horizonte</label>
                  <select value={newObj.horizon} onChange={e => setNewObj(n => ({ ...n, horizon: e.target.value }))}
                    style={{ width: "100%", padding: "9px 12px", border: `1.5px solid ${T.bdr}`, borderRadius: 9, fontFamily: T.fB, fontSize: 13, color: T.t, background: T.card, outline: "none" }}>
                    {Object.entries(OBJECTIVE_HORIZON).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.tm, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>Estado inicial</label>
                  <select value={newObj.status} onChange={e => setNewObj(n => ({ ...n, status: e.target.value }))}
                    style={{ width: "100%", padding: "9px 12px", border: `1.5px solid ${T.bdr}`, borderRadius: 9, fontFamily: T.fB, fontSize: 13, color: T.t, background: T.card, outline: "none" }}>
                    {Object.entries(OBJECTIVE_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <Btn small variant="ghost" onClick={() => setShowAddObj(false)}>Cancelar</Btn>
                <Btn small onClick={addObjective} disabled={!newObj.description.trim()}><Check size={13}/> Agregar</Btn>
              </div>
            </Card>
          ) : (
            <button onClick={() => setShowAddObj(true)}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 16px", background: T.pA, border: `1.5px dashed ${T.p}`, borderRadius: 10, cursor: "pointer", fontFamily: T.fB, fontSize: 13, color: T.p, fontWeight: 600, width: "100%", marginTop: 8 }}>
              <Plus size={15}/> Agregar objetivo
            </button>
          )}
        </div>
      )}

      {/* CLINICAL DATA TAB */}
      {tab === "clinical" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.tm, marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" }}>Fecha de inicio</label>
              <input type="date" value={plan.startDate} onChange={e => set("startDate")(e.target.value)}
                style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 14, color: T.t, background: T.card, outline: "none", boxSizing: "border-box" }}/>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.tm, marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" }}>Modalidad</label>
              <select value={plan.modality || ""} onChange={e => set("modality")(e.target.value)}
                style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 13.5, color: T.t, background: T.card, outline: "none" }}>
                <option value="">Seleccionar...</option>
                {["Individual", "Pareja", "Familiar", "Grupal"].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {/* Motivo de consulta */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.tm, marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" }}>Motivo de consulta</label>
            <textarea value={plan.chiefComplaint || ""} onChange={e => set("chiefComplaint")(e.target.value)}
              placeholder="Descripción del problema presentado por el paciente al inicio del tratamiento..." rows={3}
              style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 13.5, color: T.t, background: T.card, outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: 1.65 }}/>
          </div>

          {/* Formulación estructurada */}
          <div style={{ marginBottom: 16, padding: "14px 16px 6px", background: T.pA, borderRadius: 12, border: `1.5px solid ${T.p}20` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.p, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
              <FileText size={13}/> Formulación clínica — Modelo biopsicosocial
            </div>
            <FormulacionEstructurada
              formulation={plan.formulation}
              onChange={f => set("formulation")(f)}
            />
          </div>

          {/* Enfoque, criterios de alta */}
          {[
            { key: "therapeuticApproach", label: "Enfoque y técnicas",  placeholder: "Marco teórico aplicado, técnicas principales (TCC, ACT, EMDR, etc.)...", rows: 3 },
            { key: "dischargeCriteria",   label: "Criterios de alta",   placeholder: "Indicadores que señalarán que el tratamiento ha concluido exitosamente...", rows: 3 },
          ].map(({ key, label, placeholder, rows }) => (
            <div key={key} style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.tm, marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</label>
              <textarea value={plan[key] || ""} onChange={e => set(key)(e.target.value)}
                placeholder={placeholder} rows={rows}
                style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 13.5, color: T.t, background: T.card, outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: 1.65 }}/>
            </div>
          ))}
        </div>
      )}

      {/* REVIEW TAB */}
      {tab === "review" && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.tm, marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" }}>Notas de revisión periódica</label>
            <textarea value={plan.reviewNotes || ""} onChange={e => set("reviewNotes")(e.target.value)}
              placeholder={`Última revisión: ${fmtDate(plan.lastReviewDate || plan.startDate)}\n\nRegistra el progreso general, ajustes al plan, cambios en el diagnóstico o en los objetivos...`}
              rows={8}
              style={{ width: "100%", padding: "12px 16px", border: `1.5px solid ${T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 13.5, color: T.t, background: T.card, outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: 1.7 }}/>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn small onClick={() => onUpdate({ ...plan, lastReviewDate: fmt(todayDate) })}>
              <Check size={13}/> Marcar revisión hoy
            </Btn>
          </div>
          {plan.lastReviewDate && (
            <div style={{ marginTop: 12, fontFamily: T.fB, fontSize: 12, color: T.tl }}>
              Última revisión registrada: {fmtDate(plan.lastReviewDate)}
            </div>
          )}

          {/* Session log */}
          {ptSessions.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div style={{ fontFamily: T.fB, fontSize: 11, fontWeight: 700, color: T.tm, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Historial de sesiones ({ptSessions.length})</div>
              {ptSessions.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10).map(s => {
                const fmt_def = s.noteFormat && s.noteFormat !== "libre" ? `[${s.noteFormat}]` : "";
                return (
                  <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderBottom: `1px solid ${T.bdrL}` }}>
                    <span style={{ fontFamily: T.fB, fontSize: 12, color: T.tm, minWidth: 90 }}>{fmtDate(s.date)}</span>
                    {fmt_def && <span style={{ fontFamily: T.fB, fontSize: 10, fontWeight: 700, color: T.p, background: T.pA, padding: "1px 6px", borderRadius: 4 }}>{fmt_def}</span>}
                    <span style={{ fontFamily: T.fB, fontSize: 13, color: T.t, flex: 1 }}>{s.notes?.slice(0, 80)}{s.notes?.length > 80 ? "…" : ""}</span>
                    <span style={{ fontFamily: T.fB, fontSize: 12, color: T.tl }}>{s.duration} min</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── ALTA TERAPÉUTICA TAB ─────────────────────────────────────────── */}
      {tab === "alta" && (
        <AltaTab
          plan={plan}
          patient={patient}
          sessions={ptSessions}
          scaleResults={scaleResults}
          profile={profile}
          onUpdate={onUpdate}
          setAppointments={setAppointments}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ALTA TAB — Flujo guiado de cierre terapéutico
// ─────────────────────────────────────────────────────────────────────────────
function AltaTab({ plan, patient, sessions, scaleResults, profile, onUpdate, setAppointments }) {
  const discharge  = plan.discharge || {};
  const objectives = plan.objectives || [];
  const achieved   = objectives.filter(o => o.status === "logrado").length;
  const pct        = objectives.length > 0 ? Math.round((achieved / objectives.length) * 100) : null;
  const isComplete = plan.status === "completado";

  // Scale comparisons
  const ptScales = scaleResults.filter(r => r.patientId === plan.patientId).sort((a,b) => a.date.localeCompare(b.date));
  const byScale  = {};
  ptScales.forEach(r => { if (!byScale[r.scaleId]) byScale[r.scaleId] = []; byScale[r.scaleId].push(r); });
  const scaleComps = Object.entries(byScale).map(([id, rs]) => ({
    id, first: rs[0], last: rs[rs.length - 1], count: rs.length,
  }));

  const set = k => v => onUpdate({ ...plan, discharge: { ...discharge, [k]: v } });

  // Create follow-up appointments
  const createFollowUps = (months) => {
    if (!setAppointments || !patient) return;
    const today = new Date();
    months.forEach(m => {
      const d = new Date(today);
      d.setMonth(d.getMonth() + m);
      const dateStr = d.toISOString().split("T")[0];
      setAppointments(prev => [...prev, {
        id: "appt" + uid(),
        patientId: patient.id,
        patientName: patient.name,
        date: dateStr,
        time: "09:00",
        type: "Seguimiento post-alta",
        status: "pendiente",
        planId: plan.id,
        followUpMonth: m,
      }]);
    });
  };

  // Confirm discharge
  const confirmAlta = () => {
    onUpdate({
      ...plan,
      status: "completado",
      discharge: {
        ...discharge,
        completedAt: fmt(todayDate),
      },
    });
  };

  // PDF using inline template (quick version)
  const printAltaPDF = () => {
    const w = window.open("", "_blank");
    const today = new Date().toLocaleDateString("es-MX", { day:"numeric", month:"long", year:"numeric" });
    const firstS = sessions.length > 0 ? sessions[0] : null;
    const lastS  = sessions.length > 0 ? sessions[sessions.length - 1] : null;

    const objRows = objectives.map(obj => {
      const st = OBJECTIVE_STATUS[obj.status] || { label: obj.status, color: "#5A7270" };
      const dot = obj.status === "logrado" ? "#4E8B5F" : obj.status === "en_proceso" ? "#B8900A" : "#9BAFAD";
      return `<div style="display:flex;align-items:flex-start;gap:10px;padding:9px 12px;background:#F9F8F5;border-radius:8px;margin-bottom:6px">
        <div style="width:9px;height:9px;border-radius:50%;background:${dot};margin-top:4px;flex-shrink:0"></div>
        <div><div style="font-size:13px;color:#1A2B28">${obj.description}</div>
        <span style="font-size:10px;font-weight:700;color:${st.color};text-transform:uppercase;letter-spacing:.05em">${st.label}</span></div></div>`;
    }).join("");

    const scaleRows = scaleComps.map(sc => {
      const delta = sc.count > 1 ? sc.last.score - sc.first.score : null;
      const arrow = delta === null ? "" : delta < 0 ? "▼" : delta > 0 ? "▲" : "=";
      const color = delta === null ? "#9BAFAD" : delta < 0 ? "#4E8B5F" : delta > 0 ? "#B85050" : "#5A7270";
      return `<tr style="border-bottom:1px solid #EDF1F0">
        <td style="padding:8px 12px;font-size:12px;font-weight:600">${sc.id}</td>
        <td style="padding:8px 12px;font-size:12px;text-align:center">${sc.first.score}</td>
        <td style="padding:8px 12px;font-size:12px;text-align:center">${sc.last.score}</td>
        <td style="padding:8px 12px;font-size:14px;font-weight:700;color:${color};text-align:center">${arrow} ${delta !== null ? Math.abs(delta) : "—"}</td>
      </tr>`;
    }).join("");

    w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Alta Terapéutica — ${patient?.name}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',sans-serif;max-width:740px;margin:40px auto;color:#1A2B28;font-size:13px;line-height:1.65}
.letterhead{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:20px;border-bottom:3px solid #3A6B6E}
.org h1{font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:600;color:#3A6B6E;margin-bottom:3px}
.org p{font-size:11px;color:#5A7270;margin-top:2px}
.doc-title{font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:600;color:#3A6B6E;margin-bottom:20px}
.info-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:24px}
.info-box{background:#F9F8F5;padding:12px 14px;border-radius:9px}
.info-box label{display:block;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#9BAFAD;margin-bottom:2px}
.info-box p{font-size:13px;font-weight:500}
h2{font-family:'Cormorant Garamond',serif;font-size:18px;color:#3A6B6E;margin:24px 0 12px;padding-bottom:6px;border-bottom:1px solid #EDF1F0}
.text-block{background:#F9F8F5;padding:14px 16px;border-radius:9px;border-left:4px solid #3A6B6E;font-size:13px;line-height:1.75;white-space:pre-wrap;margin-bottom:14px}
.text-block.accent{border-left-color:#C4895A}
.pct-bar{height:8px;background:#EDF1F0;border-radius:9999px;overflow:hidden;margin-bottom:6px}
.pct-fill{height:100%;background:#4E8B5F;border-radius:9999px}
table{width:100%;border-collapse:collapse;margin-bottom:16px;border:1px solid #D8E2E0;border-radius:8px;overflow:hidden}
thead tr{background:#3A6B6E}
thead th{padding:9px 12px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:rgba(255,255,255,.9)}
.sig-area{display:grid;grid-template-columns:1fr 1fr;gap:48px;margin-top:48px}
.sig-line{border-top:1px solid #1A2B28;padding-top:7px;margin-top:52px}
.sig-name{font-family:'Cormorant Garamond',serif;font-size:17px;font-weight:500}
.sig-meta{font-size:11px;color:#5A7270;margin-top:2px}
footer{margin-top:40px;padding-top:14px;border-top:1px solid #D8E2E0;font-size:11px;color:#9BAFAD;display:flex;justify-content:space-between}
@media print{body{margin:0;max-width:none}@page{margin:16mm}}
</style></head><body>

<div class="letterhead">
  <div class="org">
    <h1>${profile?.clinic || "Consultorio Psicológico"}</h1>
    <p>${profile?.name || ""}${profile?.specialty ? " · " + profile.specialty : ""}</p>
    ${profile?.cedula ? `<p>Cédula: ${profile.cedula}</p>` : ""}
  </div>
  <div style="text-align:right;font-size:12px;color:#5A7270">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#9BAFAD;margin-bottom:3px">Fecha de alta</div>
    <div style="font-size:13px;color:#1A2B28;font-weight:500">${today}</div>
  </div>
</div>

<div class="doc-title">Informe de Alta Terapéutica</div>

<div class="info-grid">
  <div class="info-box"><label>Paciente</label><p>${patient?.name || "—"}</p></div>
  ${firstS ? `<div class="info-box"><label>Inicio tratamiento</label><p>${fmtDate(firstS.date)}</p></div>` : ""}
  <div class="info-box"><label>Total sesiones</label><p>${sessions.length}</p></div>
  ${plan.therapeuticApproach ? `<div class="info-box"><label>Enfoque</label><p>${plan.therapeuticApproach}</p></div>` : ""}
  ${pct !== null ? `<div class="info-box"><label>Objetivos logrados</label><p style="color:#4E8B5F;font-weight:700">${pct}%</p></div>` : ""}
</div>

${objectives.length > 0 ? `<h2>Objetivos terapéuticos</h2>
${pct !== null ? `<div class="pct-bar"><div class="pct-fill" style="width:${pct}%"></div></div>
<p style="font-size:12px;color:#4E8B5F;font-weight:700;margin-bottom:12px">${achieved}/${objectives.length} objetivos logrados (${pct}%)</p>` : ""}
${objRows}` : ""}

${scaleComps.length > 0 ? `<h2>Evolución en escalas psicométricas</h2>
<table><thead><tr><th>Escala</th><th>Inicio</th><th>Alta</th><th>Cambio</th></tr></thead>
<tbody>${scaleRows}</tbody></table>` : ""}

${plan.dischargeCriteria ? `<h2>Criterios de alta alcanzados</h2><div class="text-block">${plan.dischargeCriteria}</div>` : ""}

${discharge.estadoAlta ? `<h2>Estado al alta</h2><div class="text-block">${discharge.estadoAlta}</div>` : ""}

${discharge.prevencionRecaidas ? `<h2>Plan de prevención de recaídas</h2><div class="text-block">${discharge.prevencionRecaidas}</div>` : ""}

${discharge.recomendaciones ? `<h2>Recomendaciones post-alta</h2><div class="text-block accent">${discharge.recomendaciones}</div>` : ""}

<div class="sig-area">
  <div><div class="sig-line">
    <div class="sig-name">${patient?.name || "Paciente"}</div>
    <div class="sig-meta">Recibió alta terapéutica · ${today}</div>
  </div></div>
  <div><div class="sig-line">
    <div class="sig-name">${profile?.name || "Terapeuta"}</div>
    <div class="sig-meta">${profile?.specialty || "Psicólogo/a"}${profile?.cedula ? " · Céd. " + profile.cedula : ""}</div>
  </div></div>
</div>

<footer><span>PsychoCore · Alta Terapéutica</span><span>Documento confidencial · ${today}</span></footer>
</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 600);
  };

  return (
    <div>
      {/* Estado actual */}
      {isComplete ? (
        <div style={{ padding: "14px 18px", background: T.sucA, borderRadius: 12, border: `1.5px solid rgba(78,139,95,0.3)`, marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: T.fB, fontSize: 13, fontWeight: 700, color: T.suc, marginBottom: 2 }}>
              ✓ Alta registrada el {fmtDate(discharge.completedAt || plan.startDate)}
            </div>
            <div style={{ fontFamily: T.fB, fontSize: 12, color: T.tm }}>
              El plan está marcado como completado. Puedes imprimir el informe o editar los campos abajo.
            </div>
          </div>
          <Btn small onClick={printAltaPDF}><Printer size={13}/> Informe PDF</Btn>
        </div>
      ) : (
        <div style={{ padding: "14px 18px", background: T.pA, borderRadius: 12, border: `1px solid ${T.p}20`, marginBottom: 20 }}>
          <div style={{ fontFamily: T.fB, fontSize: 12, color: T.p, lineHeight: 1.65 }}>
            <strong>Flujo de alta terapéutica</strong> — Completa los campos, luego confirma el alta para marcar el plan como completado y generar el informe.
          </div>
        </div>
      )}

      {/* 1. Resumen automático */}
      <div style={{ background: T.cardAlt, borderRadius: 12, padding: "16px 18px", marginBottom: 16, border: `1px solid ${T.bdrL}` }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.tm, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
          Resumen del proceso (auto-generado)
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px,1fr))", gap: 10, marginBottom: pct !== null ? 14 : 0 }}>
          {sessions.length > 0 && (
            <div style={{ background: T.card, padding: "10px 12px", borderRadius: 9, textAlign: "center" }}>
              <div style={{ fontFamily: T.fH, fontSize: 24, color: T.p }}>{sessions.length}</div>
              <div style={{ fontFamily: T.fB, fontSize: 11, color: T.tm }}>sesiones</div>
            </div>
          )}
          {pct !== null && (
            <div style={{ background: T.card, padding: "10px 12px", borderRadius: 9, textAlign: "center" }}>
              <div style={{ fontFamily: T.fH, fontSize: 24, color: T.suc }}>{pct}%</div>
              <div style={{ fontFamily: T.fB, fontSize: 11, color: T.tm }}>objetivos</div>
            </div>
          )}
          {scaleComps.length > 0 && (
            <div style={{ background: T.card, padding: "10px 12px", borderRadius: 9, textAlign: "center" }}>
              <div style={{ fontFamily: T.fH, fontSize: 24, color: T.acc }}>{scaleComps.length}</div>
              <div style={{ fontFamily: T.fB, fontSize: 11, color: T.tm }}>escalas</div>
            </div>
          )}
        </div>
        {pct !== null && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontFamily: T.fB, fontSize: 11, color: T.tm }}>{achieved}/{objectives.length} objetivos logrados</span>
              <span style={{ fontFamily: T.fB, fontSize: 11, fontWeight: 700, color: pct === 100 ? T.suc : T.p }}>{pct}%</span>
            </div>
            <div style={{ height: 6, background: T.bdrL, borderRadius: 9999, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? T.suc : T.p, borderRadius: 9999 }}/>
            </div>
          </div>
        )}
        {scaleComps.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.tl, marginBottom: 6 }}>Evolución en escalas</div>
            {scaleComps.map(sc => {
              const delta = sc.count > 1 ? sc.last.score - sc.first.score : null;
              const color = delta === null ? T.tm : delta < 0 ? T.suc : delta > 0 ? T.err : T.tm;
              const arrow = delta === null ? "→" : delta < 0 ? "▼" : delta > 0 ? "▲" : "=";
              return (
                <div key={sc.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: `1px solid ${T.bdrL}` }}>
                  <span style={{ fontFamily: T.fB, fontSize: 12, fontWeight: 700, color: T.tm, minWidth: 60 }}>{sc.id}</span>
                  <span style={{ fontFamily: T.fB, fontSize: 12, color: T.tl }}>{sc.first.score}</span>
                  <span style={{ fontFamily: T.fB, fontSize: 12, color: T.tl }}>→</span>
                  <span style={{ fontFamily: T.fB, fontSize: 12, fontWeight: 700, color: T.t }}>{sc.last.score}</span>
                  {delta !== null && (
                    <span style={{ fontFamily: T.fB, fontSize: 11, fontWeight: 700, color, marginLeft: "auto" }}>
                      {arrow} {Math.abs(delta)} pts
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Campos narrativos */}
      {[
        { key: "estadoAlta",         label: "Estado al alta *",                    hint: "Condición del paciente al cierre: funcionamiento, síntomas residuales, capacidades adquiridas.",     rows: 4 },
        { key: "prevencionRecaidas", label: "Plan de prevención de recaídas *",    hint: "Estrategias acordadas para mantener los logros y actuar ante señales de recaída.",                 rows: 4 },
        { key: "recomendaciones",    label: "Recomendaciones post-alta",           hint: "Seguimiento sugerido, grupos de apoyo, recursos, indicaciones de retorno a consulta.",              rows: 3 },
      ].map(field => (
        <div key={field.key} style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.t, marginBottom: 4 }}>{field.label}</label>
          <div style={{ fontSize: 11, color: T.tl, marginBottom: 6 }}>{field.hint}</div>
          <textarea
            value={discharge[field.key] || ""}
            onChange={e => set(field.key)(e.target.value)}
            rows={field.rows}
            style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 13.5, color: T.t, background: T.card, outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: 1.65 }}
          />
        </div>
      ))}

      {/* 3. Seguimiento post-alta */}
      <div style={{ padding: "16px 18px", background: T.cardAlt, borderRadius: 12, border: `1px solid ${T.bdrL}`, marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.tm, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
          <CalendarPlus size={13} color={T.p}/> Programar citas de seguimiento post-alta
        </div>
        <div style={{ fontFamily: T.fB, fontSize: 12, color: T.tm, marginBottom: 12, lineHeight: 1.6 }}>
          Se crearán citas tipo <strong>Seguimiento post-alta</strong> en la agenda del paciente.
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            { label: "1 mes",   months: [1]     },
            { label: "1 + 3",   months: [1,3]   },
            { label: "1 + 3 + 6", months: [1,3,6] },
          ].map(opt => (
            <button key={opt.label} onClick={() => createFollowUps(opt.months)}
              disabled={!setAppointments}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: T.pA, border: `1.5px solid ${T.p}30`, borderRadius: 9999, fontFamily: T.fB, fontSize: 12.5, fontWeight: 600, color: T.p, cursor: "pointer", transition: "all .13s" }}
              onMouseEnter={e => e.currentTarget.style.background = T.p + "20"}
              onMouseLeave={e => e.currentTarget.style.background = T.pA}>
              <CalendarPlus size={12}/> {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Confirmar alta + PDF */}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 16, borderTop: `1px solid ${T.bdrL}` }}>
        <Btn variant="ghost" onClick={printAltaPDF}><Printer size={14}/> Solo PDF</Btn>
        {!isComplete && (
          <Btn
            onClick={() => { confirmAlta(); printAltaPDF(); }}
            disabled={!discharge.estadoAlta?.trim()}>
            <Award size={14}/> Confirmar alta y generar informe
          </Btn>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PLAN CARD (list view)
// ─────────────────────────────────────────────────────────────────────────────
function PlanCard({ plan, patient, sessions, onClick }) {
  const ps  = PLAN_STATUS[plan.status];
  const obj = plan.objectives || [];
  const achieved   = obj.filter(o => o.status === "logrado").length;
  const inProgress = obj.filter(o => o.status === "en_proceso").length;
  const ptSessions = sessions.filter(s => s.patientId === plan.patientId).length;
  const pct = obj.length > 0 ? Math.round((achieved / obj.length) * 100) : 0;

  return (
    <Card style={{ padding: 20, cursor: "pointer", transition: "all .15s" }}
      onClick={onClick}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = T.shM; e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = T.sh;  e.currentTarget.style.transform = "translateY(0)"; }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: ps.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontFamily: T.fH, fontSize: 19, color: ps.color }}>{patient?.name?.[0] || "?"}</span>
        </div>
        <span style={{ padding: "3px 10px", borderRadius: 9999, background: ps.bg, color: ps.color, fontSize: 10, fontWeight: 700, fontFamily: T.fB }}>{ps.label}</span>
      </div>
      <div style={{ fontFamily: T.fH, fontSize: 18, fontWeight: 500, color: T.t, marginBottom: 2 }}>{patient?.name?.split(" ").slice(0, 2).join(" ") || "Paciente"}</div>
      <div style={{ fontFamily: T.fB, fontSize: 12, color: T.tm, marginBottom: 12 }}>Desde {fmtDate(plan.startDate)} · {ptSessions} {ptSessions === 1 ? "sesión" : "sesiones"}</div>

      {obj.length > 0 && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ fontFamily: T.fB, fontSize: 11, color: T.tm }}>{achieved}/{obj.length} objetivos logrados</span>
          </div>
          <div style={{ height: 5, background: T.bdrL, borderRadius: 9999, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? T.suc : T.p, borderRadius: 9999, transition: "width .3s" }}/>
          </div>
          {inProgress > 0 && (
            <div style={{ fontFamily: T.fB, fontSize: 11, color: T.war, marginTop: 6 }}>{inProgress} en proceso</div>
          )}
        </div>
      )}

      {patient?.diagnosis && (
        <div style={{ marginTop: 10 }}>
          <Badge>{patient.diagnosis.split("—")[0].trim()}</Badge>
        </div>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN MODULE
// ─────────────────────────────────────────────────────────────────────────────
const BLANK_PLAN = {
  patientId: "", startDate: fmt(todayDate), status: "activo", modality: "",
  chiefComplaint: "", clinicalFormulation: "", therapeuticApproach: "",
  dischargeCriteria: "", reviewNotes: "", lastReviewDate: null,
  formulation: { ...BLANK_FORMULATION },
  objectives: [],
};

export default function TreatmentPlan({ treatmentPlans, setTreatmentPlans, patients, sessions, profile, scaleResults = [], setAppointments }) {
  const [selected,  setSelected]  = useState(null);
  const [showNew,   setShowNew]   = useState(false);
  const [newForm,   setNewForm]   = useState(BLANK_PLAN);
  const [filterStatus, setFilterStatus] = useState("todos");

  const filtered = useMemo(() =>
    treatmentPlans.filter(p => filterStatus === "todos" || p.status === filterStatus),
    [treatmentPlans, filterStatus]
  );

  // Stats
  const totalActive    = treatmentPlans.filter(p => p.status === "activo").length;
  const totalCompleted = treatmentPlans.filter(p => p.status === "completado").length;
  const patientsWithPlan = new Set(treatmentPlans.map(p => p.patientId)).size;

  const saveNew = () => {
    if (!newForm.patientId) return;
    const pt = patients.find(p => p.id === newForm.patientId);
    setTreatmentPlans(prev => [...prev, { ...newForm, id: "tp" + uid(), patientName: pt?.name || "" }]);
    setNewForm(BLANK_PLAN);
    setShowNew(false);
  };

  const updatePlan = (updated) => {
    setTreatmentPlans(prev => prev.map(p => p.id === updated.id ? updated : p));
    if (selected?.id === updated.id) setSelected(updated);
  };

  const deletePlan = (id) => {
    setTreatmentPlans(prev => prev.filter(p => p.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  // If viewing a plan detail
  if (selected) {
    const patient = patients.find(p => p.id === selected.patientId);
    return (
      <PlanDetail
        plan={selected}
        patient={patient}
        sessions={sessions}
        profile={profile}
        scaleResults={scaleResults}
        setAppointments={setAppointments}
        onUpdate={updatePlan}
        onDelete={(id) => { deletePlan(id); setSelected(null); }}
        onBack={() => setSelected(null)}
      />
    );
  }

  // List view
  return (
    <div>
      <PageHeader
        title="Tratamiento"
        subtitle={`${treatmentPlans.length} plan${treatmentPlans.length !== 1 ? "es" : ""} · ${totalActive} activo${totalActive !== 1 ? "s" : ""} · ${patientsWithPlan} paciente${patientsWithPlan !== 1 ? "s" : ""}`}
        action={<Btn onClick={() => setShowNew(true)}><Plus size={15}/> Nuevo plan</Btn>}
      />

      {/* Summary — una fila de 4 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 20 }}>
        {Object.entries(PLAN_STATUS).map(([k, v]) => {
          const count   = treatmentPlans.filter(p => p.status === k).length;
          const active  = filterStatus === k;
          return (
            <button key={k}
              onClick={() => setFilterStatus(prev => prev === k ? "todos" : k)}
              style={{ padding: "12px 8px", borderRadius: 14, textAlign: "center", cursor: "pointer",
                background: active ? v.bg : T.card,
                border: `2px solid ${active ? v.color+"60" : T.bdrL}`,
                boxShadow: active ? `0 0 0 3px ${v.color}15` : T.sh,
                transition: "all .13s" }}>
              <div style={{ fontFamily: T.fH, fontSize: 24, fontWeight: 500, color: active ? v.color : T.t, lineHeight: 1, marginBottom: 4 }}>{count}</div>
              <div style={{ fontFamily: T.fB, fontSize: 9, fontWeight: 700, color: active ? v.color : T.tl,
                textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{v.label}</div>
            </button>
          );
        })}
      </div>

      {/* Filter clear */}
      {filterStatus !== "todos" && (
        <button onClick={() => setFilterStatus("todos")} style={{ marginBottom: 16, padding: "7px 14px", borderRadius: 9999, border: `1.5px solid ${T.bdr}`, background: T.bdrL, fontFamily: T.fB, fontSize: 12, color: T.tm, cursor: "pointer" }}>
          × Limpiar filtro
        </button>
      )}

      {filtered.length === 0
        ? <EmptyState icon={Target} title="Sin planes de tratamiento" desc="Crea el primer plan con el botón de arriba"/>
        : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))", gap: 14 }}>
            {filtered.map(plan => {
              const patient = patients.find(p => p.id === plan.patientId);
              return (
                <PlanCard key={plan.id} plan={plan} patient={patient} sessions={sessions} onClick={() => setSelected(plan)}/>
              );
            })}
          </div>
      }

      {/* New plan modal */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Nuevo plan de tratamiento" width={560}>
        <Select label="Paciente *" value={newForm.patientId} onChange={v => setNewForm(f => ({ ...f, patientId: v }))}
          options={[{ value: "", label: "Seleccionar paciente..." }, ...patients.map(p => ({ value: p.id, label: p.name }))]}/>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input label="Fecha de inicio" value={newForm.startDate} onChange={v => setNewForm(f => ({ ...f, startDate: v }))} type="date"/>
          <Select label="Modalidad" value={newForm.modality} onChange={v => setNewForm(f => ({ ...f, modality: v }))}
            options={[{ value: "", label: "Seleccionar..." }, ...["Individual", "Pareja", "Familiar", "Grupal"].map(m => ({ value: m, label: m }))]}/>
        </div>
        <Textarea label="Motivo de consulta" value={newForm.chiefComplaint} onChange={v => setNewForm(f => ({ ...f, chiefComplaint: v }))}
          placeholder="Descripción del problema presentado por el paciente..." rows={3}/>
        <Textarea label="Enfoque terapéutico" value={newForm.therapeuticApproach} onChange={v => setNewForm(f => ({ ...f, therapeuticApproach: v }))}
          placeholder="Marco teórico y técnicas principales (TCC, ACT, EMDR, etc.)..." rows={2}/>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Btn variant="ghost" onClick={() => setShowNew(false)}>Cancelar</Btn>
          <Btn onClick={saveNew} disabled={!newForm.patientId}><Check size={15}/> Crear plan</Btn>
        </div>
      </Modal>
    </div>
  );
}
