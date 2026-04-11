import { T } from "../../theme.js";
import { fmtDate } from "../../utils.js";
import { SCALES, getSeverity } from "../Scales.jsx";
import { RISK_CONFIG } from "../RiskAssessment.jsx";

// ─────────────────────────────────────────────────────────────────────────────
// OBJECTIVE STATUS MAP
// ─────────────────────────────────────────────────────────────────────────────
export const OBJECTIVE_STATUS = {
  pendiente:   { label: "Pendiente",   color: T.tl,  bg: T.bdrL  },
  en_proceso:  { label: "En proceso",  color: T.war, bg: T.warA  },
  logrado:     { label: "Logrado",     color: T.suc, bg: T.sucA  },
  abandonado:  { label: "Abandonado",  color: T.err, bg: T.errA  },
};

// ─────────────────────────────────────────────────────────────────────────────
// PURE CALCULATION HELPERS
// ─────────────────────────────────────────────────────────────────────────────
export function getLatestRisk(riskAssessments, patientId) {
  return [...riskAssessments.filter(r => r.patientId === patientId)]
    .sort((a, b) => b.date.localeCompare(a.date))[0] || null;
}

export function getPatientScales(scaleResults, patientId) {
  return scaleResults
    .filter(r => r.patientId === patientId)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function getPatientSessions(sessions, patientId) {
  return [...sessions.filter(s => s.patientId === patientId)]
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function getPatientPlan(treatmentPlans, patientId) {
  return treatmentPlans.filter(p => p.patientId === patientId)
    .sort((a, b) => b.startDate?.localeCompare(a.startDate || "") || 0)[0] || null;
}

export function progressPct(objectives = []) {
  if (!objectives.length) return null;
  const done = objectives.filter(o => o.status === "logrado").length;
  return Math.round((done / objectives.length) * 100);
}

// Agrupa resultados de escalas por tipo: primero y último
export function scaleComparison(allScales) {
  const byType = {};
  allScales.forEach(r => {
    if (!byType[r.scaleId]) byType[r.scaleId] = [];
    byType[r.scaleId].push(r);
  });
  return Object.entries(byType).map(([id, results]) => ({
    scaleId: id,
    first: results[0],
    last: results[results.length - 1],
    count: results.length,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF BASE STYLES
// ─────────────────────────────────────────────────────────────────────────────
export const BASE_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',sans-serif;max-width:740px;margin:40px auto;color:#1A2B28;font-size:13.5px;line-height:1.7}
.letterhead{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:36px;padding-bottom:22px;border-bottom:3px solid #3A6B6E}
.org h1{font-family:'Cormorant Garamond',serif;font-size:30px;font-weight:600;color:#3A6B6E;margin-bottom:3px}
.org p{font-size:12px;color:#5A7270;margin-top:2px}
.date-block{text-align:right;font-size:12px;color:#5A7270}
.report-title{font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:600;color:#3A6B6E;margin-bottom:20px;padding-bottom:10px;border-bottom:1px solid #D8E2E0}
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px}
.info-grid-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:24px}
.info-box{background:#F9F8F5;padding:13px 16px;border-radius:10px}
.info-box label{display:block;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.09em;color:#9BAFAD;margin-bottom:3px}
.info-box p{font-size:13.5px;font-weight:500;color:#1A2B28}
h2{font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:600;color:#3A6B6E;margin:28px 0 12px;padding-bottom:7px;border-bottom:1px solid #D8E2E0}
.text-block{background:#F9F8F5;padding:16px 20px;border-radius:10px;border-left:4px solid #3A6B6E;font-size:13.5px;line-height:1.75;color:#1A2B28;white-space:pre-wrap;margin-bottom:16px}
.text-block.accent{border-left-color:#C4895A}
.text-block.warn{border-left-color:#B8900A;background:rgba(184,144,10,0.06)}
.text-block.danger{border-left-color:#B85050;background:rgba(184,80,80,0.06)}
.badge{display:inline-flex;align-items:center;gap:5px;padding:3px 11px;border-radius:9999px;font-size:11px;font-weight:700;letter-spacing:.04em}
.scale-table{width:100%;border-collapse:collapse;margin-bottom:16px;border-radius:10px;overflow:hidden;border:1px solid #D8E2E0}
.scale-table thead tr{background:#3A6B6E}
.scale-table thead th{padding:9px 14px;text-align:left;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:rgba(255,255,255,.9)}
.scale-table tbody tr{border-bottom:1px solid #EDF1F0}
.scale-table tbody tr:last-child{border-bottom:none}
.scale-table tbody td{padding:10px 14px;font-size:13px;vertical-align:middle}
.scale-table tbody tr:hover{background:#F9F8F5}
.obj-item{display:flex;align-items:flex-start;gap:10px;padding:10px 14px;border-radius:8px;margin-bottom:6px;background:#F9F8F5}
.obj-dot{width:10px;height:10px;border-radius:50%;margin-top:5px;flex-shrink:0}
.signature-area{margin-top:52px;display:grid;grid-template-columns:1fr 1fr;gap:48px}
.sig-line{border-top:1px solid #1A2B28;padding-top:8px;margin-top:56px;font-size:12px;color:#5A7270}
.sig-name{font-family:'Cormorant Garamond',serif;font-size:19px;font-weight:500;color:#1A2B28;margin-top:4px}
footer{margin-top:52px;padding-top:16px;border-top:1px solid #D8E2E0;font-size:11px;color:#9BAFAD;display:flex;justify-content:space-between}
.risk-banner{padding:13px 18px;border-radius:10px;margin-bottom:16px;font-size:13px;font-weight:500;border:1px solid}
@media print{body{margin:0;max-width:none}}
`;

// ─────────────────────────────────────────────────────────────────────────────
// HTML BLOCK BUILDERS
// ─────────────────────────────────────────────────────────────────────────────
export function buildLetterhead(profile, today) {
  return `
<div class="letterhead">
  <div class="org">
    <h1>${profile?.clinic || "Consultorio Psicológico"}</h1>
    <p>${profile?.name || ""}${profile?.specialty ? " · " + profile.specialty : ""}</p>
    ${profile?.cedula ? `<p>Cédula profesional: ${profile.cedula}</p>` : ""}
    ${profile?.phone ? `<p>Tel: ${profile.phone}</p>` : ""}
  </div>
  <div class="date-block">
    <div style="font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#9BAFAD;margin-bottom:4px">Fecha de emisión</div>
    <div style="font-size:14px;color:#1A2B28;font-weight:500">${today}</div>
    <div style="margin-top:8px;font-size:11px;color:#9BAFAD">Documento confidencial</div>
  </div>
</div>`;
}

export function buildPatientBlock(patient) {
  return `
<div class="info-grid">
  <div class="info-box"><label>Paciente</label><p>${patient.name}</p></div>
  <div class="info-box"><label>Fecha de nacimiento / Edad</label><p>${patient.birthDate ? fmtDate(patient.birthDate) + (patient.age ? " · " + patient.age + " años" : "") : patient.age ? patient.age + " años" : "No registrado"}</p></div>
  ${patient.phone ? `<div class="info-box"><label>Teléfono</label><p>${patient.phone}</p></div>` : ""}
  ${patient.email ? `<div class="info-box"><label>Correo electrónico</label><p>${patient.email}</p></div>` : ""}
</div>
${(patient.diagnosis || patient.diagnoses?.length) ? `
<div class="info-box" style="margin-bottom:16px">
  <label>Diagnóstico(s)</label>
  <p>${patient.diagnoses?.length ? patient.diagnoses.map(d => d.label || d).join(", ") : patient.diagnosis}</p>
</div>` : ""}`;
}

export function buildScalesSection(scales, label = "Escalas psicométricas aplicadas") {
  if (!scales.length) return "";
  const rows = scales.map(({ scaleId, first, last, count }) => {
    const sc = SCALES[scaleId];
    if (!sc) return "";
    const firstSev = getSeverity(scaleId, first.score);
    const lastSev  = getSeverity(scaleId, last.score);
    const delta    = count > 1 ? last.score - first.score : null;
    const arrow    = delta === null ? "" : delta < 0 ? "▼" : delta > 0 ? "▲" : "=";
    const arrowColor = delta === null ? "" : delta < 0 ? T.suc : delta > 0 ? T.err : T.tm;
    return `
    <tr>
      <td><strong>${sc.name}</strong><br><span style="font-size:11px;color:#5A7270">${sc.domain}</span></td>
      <td style="text-align:center"><span class="badge" style="background:${firstSev?.bg};color:${firstSev?.color}">${first.score} ${firstSev?.label}</span><br><span style="font-size:11px;color:#9BAFAD">${fmtDate(first.date)}</span></td>
      ${count > 1 ? `<td style="text-align:center"><span class="badge" style="background:${lastSev?.bg};color:${lastSev?.color}">${last.score} ${lastSev?.label}</span><br><span style="font-size:11px;color:#9BAFAD">${fmtDate(last.date)}</span></td>
      <td style="text-align:center;font-size:18px;font-weight:700;color:${arrowColor}">${arrow} <span style="font-size:13px">${Math.abs(delta)}</span></td>`
      : `<td colspan="2" style="text-align:center;font-size:12px;color:#9BAFAD">Aplicación única</td>`}
      <td style="text-align:center;font-size:12px;color:#5A7270">${count} vez${count !== 1 ? "es" : ""}</td>
    </tr>`;
  }).join("");

  return `
<h2>${label}</h2>
<table class="scale-table">
  <thead>
    <tr>
      <th>Escala</th>
      <th>Primera aplicación</th>
      <th>Última aplicación</th>
      <th>Cambio</th>
      <th>N° aplic.</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>`;
}

export function buildObjectivesSection(plan) {
  if (!plan?.objectives?.length) return "";
  const objRows = plan.objectives.map(obj => {
    const st = OBJECTIVE_STATUS[obj.status] || { label: obj.status, color: T.tm, bg: T.bdrL };
    return `
    <div class="obj-item">
      <div class="obj-dot" style="background:${st.color}"></div>
      <div style="flex:1">
        <div style="font-size:13.5px;color:#1A2B28;margin-bottom:3px">${obj.description}</div>
        <span class="badge" style="background:${st.bg};color:${st.color}">${st.label}</span>
        ${obj.horizon ? `<span style="font-size:11px;color:#9BAFAD;margin-left:8px">${{ corto:"Corto plazo", mediano:"Mediano plazo", largo:"Largo plazo" }[obj.horizon] || obj.horizon}</span>` : ""}
        ${obj.achievedDate ? `<span style="font-size:11px;color:#4E8B5F;margin-left:8px">✓ Logrado: ${fmtDate(obj.achievedDate)}</span>` : ""}
      </div>
    </div>`;
  }).join("");
  const pct = progressPct(plan.objectives);
  return `
<h2>Objetivos terapéuticos</h2>
${pct !== null ? `<div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">
  <div style="flex:1;height:8px;background:#EDF1F0;border-radius:9999px;overflow:hidden">
    <div style="height:100%;width:${pct}%;background:#4E8B5F;border-radius:9999px;transition:width .3s"></div>
  </div>
  <div style="font-size:13px;font-weight:700;color:#4E8B5F;white-space:nowrap">${pct}% logrado</div>
</div>` : ""}
${objRows}`;
}

export function buildSignature(profile, today) {
  return `
<div class="signature-area">
  <div>
    <div class="sig-line">
      <div class="sig-name">${profile?.name || "Psicólogo/a"}</div>
      <div style="font-size:12px;color:#5A7270;margin-top:3px">${profile?.specialty || "Psicólogo/a Clínico/a"}${profile?.cedula ? " · Cédula " + profile.cedula : ""}</div>
      ${profile?.clinic ? `<div style="font-size:12px;color:#5A7270">${profile.clinic}</div>` : ""}
    </div>
  </div>
  <div>
    <div class="sig-line">
      <div style="font-size:12px;color:#5A7270;margin-top:6px">Paciente / Tutor legal</div>
      <div style="font-size:12px;color:#9BAFAD;margin-top:3px">${today}</div>
    </div>
  </div>
</div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF PRINT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────
export function printEvaluacion({ patient, plan, allScales, latestRisk, ptSessions, profile, custom }) {
  const w = window.open("", "_blank");
  const today = new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
  const firstSession = ptSessions[0];
  const scaleComp = scaleComparison(allScales);
  const rc = latestRisk ? RISK_CONFIG[latestRisk.riskLevel] : null;

  w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Informe de Evaluación — ${patient.name}</title>
<style>${BASE_STYLES}</style></head><body>

${buildLetterhead(profile, today)}

<div class="report-title">Informe de Evaluación Psicológica Inicial</div>

<h2>Datos del paciente</h2>
${buildPatientBlock(patient)}

<h2>Motivo de consulta</h2>
<div class="text-block">${custom.motivo || plan?.chiefComplaint || "No registrado."}</div>

${(() => {
  const fm = plan?.formulation;
  const hasStructured = fm && Object.values(fm).some(Boolean);
  const sec = (title, content, color = "#3A6B6E") =>
    content ? `<div style="margin-bottom:10px"><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:${color};margin-bottom:4px">${title}</div><div class="text-block" style="border-left-color:${color};margin-bottom:0">${content}</div></div>` : "";

  if (hasStructured) return `
<h2>Formulación clínica — Modelo biopsicosocial</h2>
${sec("Historia del problema", fm.historiaPrima)}
${sec("Evolución y cronología", fm.evolucion)}
${sec("Tratamientos previos", fm.tratamientosPrevios)}
<div style="margin:16px 0 8px;font-size:11px;font-weight:700;color:#5B8DB8;text-transform:uppercase;letter-spacing:.07em">Factores predisponentes</div>
${sec("Biológicos", fm.predisponentesBio, "#5B8DB8")}
${sec("Psicológicos", fm.predisponentesPsi, "#5B8DB8")}
${sec("Sociales / contextuales", fm.predisponentesSoc, "#5B8DB8")}
${sec("Factores precipitantes", fm.precipitantes, "#B8900A")}
${sec("Factores mantenedores", fm.mantenedores, "#B8900A")}
${sec("Recursos y fortalezas", fm.recursos, "#C4895A")}
${sec("Hipótesis clínica integradora", fm.hipotesis, "#C4895A")}
${sec("Diagnóstico diferencial", fm.diagnosticoDiferencial, "#C4895A")}`;

  return plan?.clinicalFormulation
    ? `<h2>Formulación clínica</h2><div class="text-block">${plan.clinicalFormulation}</div>`
    : "";
})()}

${plan?.therapeuticApproach ? `<h2>Enfoque terapéutico</h2>
<div class="text-block accent">${plan.therapeuticApproach}</div>` : ""}

${firstSession ? `<h2>Datos de la evaluación</h2>
<div class="info-grid-3">
  <div class="info-box"><label>Fecha de primera sesión</label><p>${fmtDate(firstSession.date)}</p></div>
  <div class="info-box"><label>Total de sesiones</label><p>${ptSessions.length} sesión${ptSessions.length !== 1 ? "es" : ""}</p></div>
  ${plan?.modality ? `<div class="info-box"><label>Modalidad</label><p>${plan.modality}</p></div>` : ""}
</div>` : ""}

${buildScalesSection(scaleComp, "Escalas psicométricas aplicadas")}

${latestRisk ? `<h2>Evaluación de riesgo</h2>
<div class="risk-banner" style="background:${rc?.bg};border-color:${rc?.color};color:${rc?.color}">
  Nivel de riesgo: <strong>${rc?.label}</strong> · Evaluación del ${fmtDate(latestRisk.date)}
  ${latestRisk.suicidalIdeation && latestRisk.suicidalIdeation !== "ninguna" ? ` · Ideación suicida: ${latestRisk.suicidalIdeation}` : ""}
</div>
${latestRisk.safetyPlan?.copingStrategies ? `<div class="text-block warn">Estrategias de afrontamiento activas: ${latestRisk.safetyPlan.copingStrategies}</div>` : ""}` : ""}

${plan?.objectives?.length ? buildObjectivesSection(plan) : ""}

<h2>Impresión clínica y recomendaciones</h2>
<div class="text-block">${custom.impresion || "Pendiente de completar."}</div>

${custom.observaciones ? `<h2>Observaciones adicionales</h2>
<div class="text-block">${custom.observaciones}</div>` : ""}

${buildSignature(profile, today)}

<footer><span>PsychoCore · Informe de Evaluación Psicológica</span><span>Documento confidencial · ${today}</span></footer>
</body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 600);
}

export function printAlta({ patient, plan, allScales, ptSessions, profile, custom = {}, discharge }) {
  const w = window.open("", "_blank");
  const today = new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
  const firstSession = ptSessions[0];
  const lastSession  = ptSessions[ptSessions.length - 1];
  const scaleComp    = scaleComparison(allScales);
  const pct          = plan ? progressPct(plan.objectives) : null;

  const MOTIVO_LABEL = {
    logros:     "Objetivos terapéuticos logrados",
    voluntaria: "Alta voluntaria del paciente",
    derivacion: "Derivación a otro profesional",
    otros:      "Otros",
  };
  const effectiveCustom = {
    ...custom,
    ...(discharge?.notes           ? { estadoAlta:      discharge.notes           } : {}),
    ...(discharge?.recommendations ? { recomendaciones: discharge.recommendations } : {}),
  };

  const progDist = { excelente: 0, bueno: 0, moderado: 0, bajo: 0 };
  ptSessions.forEach(s => { if (progDist[s.progress] !== undefined) progDist[s.progress]++; });
  const progRows = Object.entries(progDist)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `<span style="margin-right:12px"><strong>${v}</strong> ${k}</span>`).join("");

  w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Informe de Alta — ${patient.name}</title>
<style>${BASE_STYLES}</style></head><body>

${buildLetterhead(profile, today)}

<div class="report-title">Informe de Alta Terapéutica</div>

${discharge ? `<div style="background:#EBF5EC;border:1.5px solid #4E8B5F40;border-radius:10px;padding:14px 18px;margin-bottom:20px;display:flex;gap:18px;flex-wrap:wrap">
  ${discharge.date ? `<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#4E8B5F;margin-bottom:3px">Fecha de alta</div><div style="font-size:13.5px;font-weight:600;color:#1A2B28">${fmtDate(discharge.date)}</div></div>` : ""}
  ${discharge.reason ? `<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#4E8B5F;margin-bottom:3px">Motivo de alta</div><div style="font-size:13.5px;font-weight:600;color:#1A2B28">${MOTIVO_LABEL[discharge.reason] || discharge.reason}</div></div>` : ""}
</div>` : ""}

<h2>Datos del paciente</h2>
${buildPatientBlock(patient)}

<h2>Resumen del proceso terapéutico</h2>
<div class="info-grid-3">
  ${firstSession ? `<div class="info-box"><label>Inicio del tratamiento</label><p>${fmtDate(firstSession.date)}</p></div>` : ""}
  ${lastSession  ? `<div class="info-box"><label>Última sesión</label><p>${fmtDate(lastSession.date)}</p></div>` : ""}
  <div class="info-box"><label>Total de sesiones</label><p>${ptSessions.length} sesión${ptSessions.length !== 1 ? "es" : ""}</p></div>
  ${plan?.therapeuticApproach ? `<div class="info-box"><label>Enfoque terapéutico</label><p>${plan.therapeuticApproach}</p></div>` : ""}
  ${plan?.modality ? `<div class="info-box"><label>Modalidad</label><p>${plan.modality}</p></div>` : ""}
  ${pct !== null ? `<div class="info-box"><label>Objetivos logrados</label><p style="color:#4E8B5F;font-weight:700">${pct}%</p></div>` : ""}
</div>

${ptSessions.length > 0 ? `<div style="background:#F9F8F5;padding:13px 18px;border-radius:10px;margin-bottom:16px">
  <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#9BAFAD;margin-bottom:6px">Distribución del progreso</div>
  <div style="font-size:13px;color:#1A2B28">${progRows || "Sin datos"}</div>
</div>` : ""}

${effectiveCustom.evolucion ? `<h2>Evolución del paciente</h2>
<div class="text-block">${effectiveCustom.evolucion}</div>` : ""}

${plan?.objectives?.length ? buildObjectivesSection(plan) : ""}

${buildScalesSection(scaleComp, "Evolución en escalas psicométricas")}

${plan?.dischargeCriteria ? `<h2>Criterios de alta alcanzados</h2>
<div class="text-block">${plan.dischargeCriteria}</div>` : ""}

<h2>Estado al alta</h2>
<div class="text-block">${effectiveCustom.estadoAlta || "Pendiente de completar."}</div>

<h2>Plan de prevención de recaídas</h2>
<div class="text-block">${effectiveCustom.prevencion || "Pendiente de completar."}</div>

<h2>Recomendaciones post-alta</h2>
<div class="text-block accent">${effectiveCustom.recomendaciones || "Pendiente de completar."}</div>

${effectiveCustom.observaciones ? `<h2>Observaciones adicionales</h2>
<div class="text-block">${effectiveCustom.observaciones}</div>` : ""}

${buildSignature(profile, today)}

<footer><span>PsychoCore · Informe de Alta Terapéutica</span><span>Documento confidencial · ${today}</span></footer>
</body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 600);
}

export function printDerivacion({ patient, plan, allScales, latestRisk, ptSessions, profile, custom }) {
  const w = window.open("", "_blank");
  const today = new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });

  const latestScales = allScales.reduce((acc, r) => {
    if (!acc[r.scaleId] || r.date > acc[r.scaleId].date) acc[r.scaleId] = r;
    return acc;
  }, {});
  const latestScaleList = scaleComparison(
    Object.values(latestScales).map(r => ({ scaleId: r.scaleId, first: r, last: r, count: 1 }))
  );

  const rc = latestRisk ? RISK_CONFIG[latestRisk.riskLevel] : null;
  const firstSession = ptSessions[0];
  const lastSession  = ptSessions[ptSessions.length - 1];

  w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Carta de Derivación — ${patient.name}</title>
<style>${BASE_STYLES}</style></head><body>

${buildLetterhead(profile, today)}

<div class="report-title">Carta de Derivación Extendida</div>

<p style="margin-bottom:20px">Por medio de la presente, me permito referir al/a la paciente:</p>

<h2>Datos del paciente</h2>
${buildPatientBlock(patient)}

${custom.destinatario ? `<h2>Dirigida a</h2>
<div class="info-grid">
  <div class="info-box"><label>Especialidad / Servicio</label><p>${custom.destinatario}</p></div>
  ${custom.profesional ? `<div class="info-box"><label>Profesional</label><p>${custom.profesional}</p></div>` : ""}
</div>` : ""}

<h2>Motivo de derivación</h2>
<div class="text-block accent">${custom.motivo || "Pendiente de completar."}</div>

${ptSessions.length > 0 ? `<h2>Historial de tratamiento</h2>
<div class="info-grid-3">
  ${firstSession ? `<div class="info-box"><label>Inicio del tratamiento</label><p>${fmtDate(firstSession.date)}</p></div>` : ""}
  ${lastSession  ? `<div class="info-box"><label>Última sesión</label><p>${fmtDate(lastSession.date)}</p></div>` : ""}
  <div class="info-box"><label>Total de sesiones</label><p>${ptSessions.length}</p></div>
  ${plan?.therapeuticApproach ? `<div class="info-box"><label>Enfoque aplicado</label><p>${plan.therapeuticApproach}</p></div>` : ""}
</div>` : ""}

${custom.resumenClinico ? `<h2>Resumen clínico</h2>
<div class="text-block">${custom.resumenClinico}</div>` : ""}

${latestRisk ? `<h2>Estado actual de riesgo</h2>
<div class="risk-banner" style="background:${rc?.bg};border-color:${rc?.color};color:${rc?.color}">
  Nivel de riesgo: <strong>${rc?.label}</strong> · Evaluación del ${fmtDate(latestRisk.date)}
</div>` : ""}

${latestScaleList.length ? buildScalesSection(latestScaleList, "Resultados actuales de escalas") : ""}

${custom.informacionAdicional ? `<h2>Información clínica adicional</h2>
<div class="text-block">${custom.informacionAdicional}</div>` : ""}

<p style="margin:24px 0">Agradezco de antemano la atención prestada y quedo a disposición para cualquier información adicional que se requiera.</p>
<p>Atentamente,</p>

${buildSignature(profile, today)}

<footer><span>PsychoCore · Carta de Derivación</span><span>Documento confidencial · ${today}</span></footer>
</body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 600);
}
