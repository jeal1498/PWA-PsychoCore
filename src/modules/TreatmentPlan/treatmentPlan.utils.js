import { T } from "../../theme.js";
import { uid, fmt, todayDate, fmtDate } from "../../utils.js";

// ─────────────────────────────────────────────────────────────────────────────
// LOCAL COLOR CONSTANTS (hex only used here, referenced via these names in JSX)
// ─────────────────────────────────────────────────────────────────────────────
export const AZUL     = "#5B8DB8";
export const AZUL_A   = "rgba(91,141,184,0.10)";
export const LAVANDA  = "#6B5B9E";
export const LAVANDA_A = "rgba(107,91,158,0.10)";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG MAPS
// ─────────────────────────────────────────────────────────────────────────────
export const OBJECTIVE_STATUS = {
  pendiente:   { label: "Pendiente",   color: T.tl,  bg: T.bdrL  },
  en_proceso:  { label: "En proceso",  color: T.war, bg: T.warA  },
  logrado:     { label: "Logrado",     color: T.suc, bg: T.sucA  },
  abandonado:  { label: "Abandonado",  color: T.err, bg: T.errA  },
};

export const OBJECTIVE_HORIZON = {
  corto:   { label: "Corto plazo",   color: T.acc,    bg: T.accA    },
  mediano: { label: "Mediano plazo", color: AZUL,     bg: AZUL_A    },
  largo:   { label: "Largo plazo",   color: LAVANDA,  bg: LAVANDA_A },
};

export const PLAN_STATUS = {
  activo:     { label: "Activo",     color: T.suc, bg: T.sucA  },
  revision:   { label: "Revisión",   color: T.war, bg: T.warA  },
  completado: { label: "Listo",      color: T.p,   bg: T.pA    },
  abandonado: { label: "Abandonado", color: T.err, bg: T.errA  },
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
export const FORMULATION_SECTIONS = [
  {
    group: "Historia del problema",
    color: T.p,
    bg: T.pA,
    fields: [
      { key: "historiaPrima",       label: "Historia del problema",              placeholder: "Inicio y descripción del problema principal. ¿Cuándo comenzó? ¿Cómo se presentó?", rows: 3 },
      { key: "evolucion",           label: "Evolución y cronología",             placeholder: "Cómo ha progresado el problema. Períodos de mejoría o agravamiento, eventos importantes...", rows: 3 },
      { key: "tratamientosPrevios", label: "Tratamientos previos",               placeholder: "Atenciones psicológicas o psiquiátricas anteriores. Resultados, adherencia, fármacos previos...", rows: 2 },
    ],
  },
  {
    group: "Modelo biopsicosocial — Factores predisponentes",
    color: AZUL,
    bg: "rgba(91,141,184,0.08)",
    fields: [
      { key: "predisponentesBio",   label: "Biológicos",                         placeholder: "Antecedentes médicos, genéticos, familiares psiquiátricos, temperamento...", rows: 2 },
      { key: "predisponentesPsi",   label: "Psicológicos",                       placeholder: "Estilos de afrontamiento, creencias nucleares, historia de apegos, traumas previos...", rows: 2 },
      { key: "predisponentesSoc",   label: "Sociales / contextuales",            placeholder: "Entorno familiar, red de apoyo, nivel socioeconómico, factores culturales...", rows: 2 },
    ],
  },
  {
    group: "Factores precipitantes y mantenedores",
    color: T.war,
    bg: T.warA,
    fields: [
      { key: "precipitantes",       label: "Factores precipitantes",             placeholder: "¿Qué detonó el episodio actual? Eventos vitales estresantes, pérdidas, cambios...", rows: 2 },
      { key: "mantenedores",        label: "Factores mantenedores",              placeholder: "¿Qué perpetúa el problema? Conductas de evitación, refuerzos, cogniciones, contexto...", rows: 3 },
    ],
  },
  {
    group: "Hipótesis clínica",
    color: T.acc,
    bg: T.accA,
    fields: [
      { key: "recursos",               label: "Recursos y fortalezas del paciente", placeholder: "Habilidades, red de apoyo, motivación, insight, experiencias de éxito previas...", rows: 2 },
      { key: "hipotesis",              label: "Hipótesis clínica integradora",      placeholder: "Síntesis explicativa del caso: cómo se relacionan los factores predisponentes, precipitantes y mantenedores...", rows: 4 },
      { key: "diagnosticoDiferencial", label: "Diagnóstico diferencial",           placeholder: "Diagnósticos a considerar y descartar con sus argumentos clínicos...", rows: 3 },
    ],
  },
];

export const BLANK_PLAN = {
  patientId: "", startDate: fmt(todayDate), status: "activo", modality: "",
  chiefComplaint: "", clinicalFormulation: "", therapeuticApproach: "",
  dischargeCriteria: "", reviewNotes: "", lastReviewDate: null,
  formulation: { ...BLANK_FORMULATION },
  objectives: [],
};

// ─────────────────────────────────────────────────────────────────────────────
// PURE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Cicla el estado de un objetivo: pendiente → en_proceso → logrado → pendiente */
export function cycleObjectiveStatus(obj) {
  const order = ["pendiente", "en_proceso", "logrado"];
  const idx   = order.indexOf(obj.status);
  const next  = order[(idx + 1) % order.length];
  return {
    ...obj,
    status: next,
    achievedDate: next === "logrado" ? fmt(todayDate) : obj.achievedDate,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF EXPORT — Plan de tratamiento
// ─────────────────────────────────────────────────────────────────────────────
export function printPlan(plan, patient, sessions, profile) {
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
// PDF EXPORT — Alta terapéutica
// ─────────────────────────────────────────────────────────────────────────────
export function printAltaPDF(plan, patient, sessions, scaleComps, profile) {
  const w = window.open("", "_blank");
  const today = new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
  const firstS = sessions.length > 0 ? sessions[0] : null;
  const objectives = plan.objectives || [];
  const discharge  = plan.discharge  || {};
  const achieved   = objectives.filter(o => o.status === "logrado").length;
  const pct        = objectives.length > 0 ? Math.round((achieved / objectives.length) * 100) : null;

  const objRows = objectives.map(obj => {
    const st  = OBJECTIVE_STATUS[obj.status] || { label: obj.status, color: T.tm };
    const dot = obj.status === "logrado" ? T.suc : obj.status === "en_proceso" ? T.war : T.tl;
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
}
