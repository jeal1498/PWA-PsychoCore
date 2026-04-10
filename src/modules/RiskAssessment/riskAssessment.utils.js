import { T } from "../../theme.js";
import { uid, fmt, todayDate, fmtDate } from "../../utils.js";

// ── Constantes de color "alto" ────────────────────────────────────────────────
const NARANJA   = "#C4622A";
const NARANJA_A = "rgba(196,98,42,0.10)";

// ── Risk level config ─────────────────────────────────────────────────────────
export const RISK_CONFIG = {
  bajo:      { label: "Bajo",      color: T.suc,     bg: T.sucA,     dot: T.suc   },
  moderado:  { label: "Moderado",  color: T.war,     bg: T.warA,     dot: T.war   },
  alto:      { label: "Alto",      color: NARANJA,   bg: NARANJA_A,  dot: NARANJA },
  inminente: { label: "Inminente", color: T.err,     bg: T.errA,     dot: T.err   },
};

// ── Factores protectores ──────────────────────────────────────────────────────
export const PROTECTIVE_FACTORS = [
  "Red de apoyo familiar", "Red de apoyo social", "Motivación al cambio",
  "Adherencia al tratamiento", "Creencias religiosas/espirituales",
  "Responsabilidades familiares", "Miedo al dolor/muerte", "Planes futuros",
  "Estabilidad laboral/académica", "Acceso limitado a medios letales",
];

// ── Blank form inicial ────────────────────────────────────────────────────────
export const BLANK_FORM = {
  patientId: "", date: fmt(todayDate), evaluatedBy: "session",
  suicidalIdeation: "ninguna", hasPlan: false, hasMeans: false, hasIntent: false,
  previousAttempts: 0, selfHarm: "ninguna", harmToOthers: false,
  protectiveFactors: [], riskLevel: "", clinicalNotes: "",
  safetyPlan: { warningSignals: "", copingStrategies: "", supportContacts: "", professionalContacts: "", environmentSafety: "", reasonsToLive: "" },
};

// ── Auto-suggest risk level ───────────────────────────────────────────────────
export function suggestRisk(form) {
  if (form.suicidalIdeation === "activa" && (form.hasPlan || form.hasMeans)) return "inminente";
  if (form.suicidalIdeation === "activa") return "alto";
  if (form.suicidalIdeation === "pasiva" || form.selfHarm === "activa") return "moderado";
  return "bajo";
}

// ── PDF export — plan de seguridad ───────────────────────────────────────────
export function printSafetyPlan(assessment, patient, profile) {
  const w = window.open("", "_blank");
  const today = new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
  const rc = RISK_CONFIG[assessment.riskLevel];

  w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Plan de Seguridad — ${patient?.name}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',sans-serif;max-width:740px;margin:40px auto;color:#1A2B28;font-size:13px;line-height:1.65}
.header{border-bottom:3px solid #3A6B6E;padding-bottom:20px;margin-bottom:32px;display:flex;justify-content:space-between;align-items:flex-start}
.header-left h1{font-family:'Cormorant Garamond',serif;font-size:30px;font-weight:600;color:#3A6B6E;margin-bottom:4px}
.header-left p{font-size:12px;color:#5A7270}
.risk-badge{padding:6px 16px;border-radius:9999px;font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;background:${rc.bg};color:${rc.color}}
.info-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:28px}
.info-box{background:#F9F8F5;padding:14px;border-radius:10px}
.info-box label{display:block;font-size:10px;font-weight:700;color:#9BAFAD;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px}
.info-box p{font-size:14px;font-weight:500}
.section{margin-bottom:22px}
.section-title{font-size:10px;font-weight:700;color:#9BAFAD;text-transform:uppercase;letter-spacing:.09em;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #EDF1F0}
.section-body{background:#F9F8F5;padding:16px;border-radius:10px;border-left:4px solid #3A6B6E;font-size:13px;line-height:1.7;color:#1A2B28;white-space:pre-wrap;min-height:40px}
.section-body.urgent{border-left-color:#B85050}
.warning{background:rgba(184,80,80,0.06);border:1px solid rgba(184,80,80,0.2);border-radius:10px;padding:14px 18px;margin-bottom:24px;font-size:12px;color:#B85050;font-weight:500}
.factors{display:flex;gap:8px;flex-wrap:wrap}
.factor{background:rgba(78,139,95,0.08);color:#4E8B5F;padding:4px 12px;border-radius:9999px;font-size:12px;font-weight:600}
footer{margin-top:48px;padding-top:16px;border-top:1px solid #D8E2E0;font-size:11px;color:#9BAFAD;display:flex;justify-content:space-between}
.sig-area{margin-top:40px;display:grid;grid-template-columns:1fr 1fr;gap:40px}
.sig-line{border-top:1px solid #1A2B28;padding-top:8px;margin-top:48px;font-size:12px;color:#5A7270}
@media print{body{margin:0}}
</style></head><body>

<div class="header">
  <div class="header-left">
    <h1>Plan de Seguridad</h1>
    <p>${profile?.clinic || "Consultorio Psicológico"}${profile?.name ? " · " + profile.name : ""}${profile?.cedula ? " · Céd. " + profile.cedula : ""}</p>
  </div>
  <div class="risk-badge">Nivel ${rc.label}</div>
</div>

<div class="info-grid">
  <div class="info-box"><label>Paciente</label><p>${patient?.name || "—"}</p></div>
  <div class="info-box"><label>Fecha</label><p>${fmtDate(assessment.date)}</p></div>
  <div class="info-box"><label>Terapeuta</label><p>${profile?.name || "—"}</p></div>
</div>

${(assessment.riskLevel === "alto" || assessment.riskLevel === "inminente") ? `
<div class="warning">⚠️ Este plan de seguridad fue elaborado ante la presencia de ideación suicida. Ante una crisis, llama inmediatamente a los contactos de emergencia indicados abajo o acude a urgencias.</div>` : ""}

<div class="section">
  <div class="section-title">Señales de advertencia — Cuándo usar este plan</div>
  <div class="section-body">${assessment.safetyPlan?.warningSignals || "No especificado"}</div>
</div>

<div class="section">
  <div class="section-title">Estrategias de afrontamiento personal</div>
  <div class="section-body">${assessment.safetyPlan?.copingStrategies || "No especificado"}</div>
</div>

<div class="section">
  <div class="section-title">Personas de apoyo (nombre y teléfono)</div>
  <div class="section-body urgent">${assessment.safetyPlan?.supportContacts || "No especificado"}</div>
</div>

<div class="section">
  <div class="section-title">Contactos profesionales de emergencia</div>
  <div class="section-body urgent">${assessment.safetyPlan?.professionalContacts || "No especificado"}</div>
</div>

<div class="section">
  <div class="section-title">Seguridad del entorno — Retiro de medios</div>
  <div class="section-body">${assessment.safetyPlan?.environmentSafety || "No especificado"}</div>
</div>

${assessment.safetyPlan?.reasonsToLive ? `
<div class="section">
  <div class="section-title">Razones para vivir</div>
  <div class="section-body">${assessment.safetyPlan.reasonsToLive}</div>
</div>` : ""}

${(assessment.protectiveFactors || []).length ? `
<div class="section">
  <div class="section-title">Factores protectores identificados</div>
  <div style="padding-top:4px"><div class="factors">${assessment.protectiveFactors.map(f => `<span class="factor">${f}</span>`).join("")}</div></div>
</div>` : ""}

<div class="sig-area">
  <div>
    <div class="sig-line">Firma del paciente</div>
    <div style="font-size:12px;color:#9BAFAD;margin-top:4px">${patient?.name || ""}</div>
  </div>
  <div>
    <div class="sig-line">Firma del terapeuta</div>
    <div style="font-size:12px;color:#9BAFAD;margin-top:4px">${profile?.name || ""}${profile?.cedula ? " · Céd. " + profile.cedula : ""}</div>
  </div>
</div>

<footer><span>PsychoCore · Plan de Seguridad</span><span>${today} · Documento confidencial</span></footer>
</body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 500);
}

// ── PDF export — expediente clínico ──────────────────────────────────────────
export function printAssessmentRecord(assessment, patient, profile) {
  const w = window.open("", "_blank");
  const today = new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
  const rc = RISK_CONFIG[assessment.riskLevel];

  const boolRow = (label, val) => `
    <tr><td style="color:#5A7270;padding:6px 0;font-size:13px;width:55%">${label}</td>
    <td style="font-weight:600;font-size:13px;color:${val ? "#B85050" : "#4E8B5F"}">${val ? "Sí" : "No"}</td></tr>`;

  w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Evaluación de Riesgo — ${patient?.name}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',sans-serif;max-width:740px;margin:40px auto;color:#1A2B28;font-size:13px;line-height:1.6}
h1{font-family:'Cormorant Garamond',serif;font-size:30px;font-weight:600;color:#3A6B6E}
.sub{font-size:12px;color:#5A7270;margin-top:4px;margin-bottom:28px}
.header{border-bottom:3px solid #3A6B6E;padding-bottom:18px;margin-bottom:28px;display:flex;justify-content:space-between;align-items:center}
.risk-badge{padding:7px 18px;border-radius:9999px;font-size:13px;font-weight:700;background:${rc.bg};color:${rc.color}}
.section{margin-bottom:24px}
h3{font-family:'Cormorant Garamond',serif;font-size:18px;color:#3A6B6E;margin-bottom:12px;padding-bottom:6px;border-bottom:1px solid #EDF1F0}
table{width:100%;border-collapse:collapse}
.notes-box{background:#F9F8F5;padding:16px;border-radius:10px;border-left:4px solid #3A6B6E;font-size:13px;line-height:1.7;white-space:pre-wrap}
.factors{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
.factor{background:rgba(78,139,95,0.08);color:#4E8B5F;padding:3px 12px;border-radius:9999px;font-size:12px;font-weight:600}
footer{margin-top:48px;padding-top:16px;border-top:1px solid #D8E2E0;font-size:11px;color:#9BAFAD;display:flex;justify-content:space-between}
@media print{body{margin:0}}
</style></head><body>
<div class="header">
  <div><h1>Evaluación de Riesgo Clínico</h1><div class="sub">${profile?.clinic || "PsychoCore"} · ${today}</div></div>
  <div class="risk-badge">Nivel ${rc.label}</div>
</div>

<div class="section">
  <h3>Datos de la evaluación</h3>
  <table>
    <tr><td style="color:#5A7270;padding:6px 0;width:55%">Paciente</td><td style="font-weight:500">${patient?.name || "—"}</td></tr>
    <tr><td style="color:#5A7270;padding:6px 0">Fecha</td><td>${fmtDate(assessment.date)}</td></tr>
    <tr><td style="color:#5A7270;padding:6px 0">Tipo de evaluación</td><td style="text-transform:capitalize">${assessment.evaluatedBy}</td></tr>
    <tr><td style="color:#5A7270;padding:6px 0">Intentos previos</td><td>${assessment.previousAttempts}</td></tr>
  </table>
</div>

<div class="section">
  <h3>Ideación suicida y autolesiones</h3>
  <table>
    <tr><td style="color:#5A7270;padding:6px 0;width:55%">Ideación suicida</td><td style="font-weight:600;font-size:13px;text-transform:capitalize;color:${assessment.suicidalIdeation === "activa" ? "#B85050" : assessment.suicidalIdeation === "pasiva" ? "#B8900A" : "#4E8B5F"}">${assessment.suicidalIdeation}</td></tr>
    ${boolRow("Tiene plan estructurado", assessment.hasPlan)}
    ${boolRow("Tiene acceso a medios", assessment.hasMeans)}
    ${boolRow("Manifiesta intención", assessment.hasIntent)}
    <tr><td style="color:#5A7270;padding:6px 0">Autolesiones</td><td style="font-weight:500;text-transform:capitalize">${assessment.selfHarm}</td></tr>
    ${boolRow("Riesgo a terceros", assessment.harmToOthers)}
  </table>
</div>

${(assessment.protectiveFactors || []).length ? `
<div class="section">
  <h3>Factores protectores</h3>
  <div class="factors">${assessment.protectiveFactors.map(f => `<span class="factor">${f}</span>`).join("")}</div>
</div>` : ""}

${assessment.clinicalNotes ? `
<div class="section">
  <h3>Observaciones clínicas</h3>
  <div class="notes-box">${assessment.clinicalNotes}</div>
</div>` : ""}

<footer><span>${profile?.name || "PsychoCore"}${profile?.cedula ? " · Céd. " + profile.cedula : ""}</span><span>Documento confidencial · ${today}</span></footer>
</body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 500);
}
