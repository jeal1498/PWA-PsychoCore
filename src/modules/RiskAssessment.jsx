import { useState, useMemo } from "react";
import { ShieldAlert, Plus, Printer, Trash2, Check, ChevronDown, ChevronUp, AlertTriangle, Shield } from "lucide-react";
import { T } from "../theme.js";
import { uid, fmt, todayDate, fmtDate } from "../utils.js";
import { Card, Badge, Modal, Input, Textarea, Select, Btn, EmptyState, PageHeader, Tabs } from "../components/ui/index.jsx";
import { useIsMobile } from "../hooks/useIsMobile.js";
import { useIsWide }   from "../hooks/useIsWide.js";

// ── Risk level config ─────────────────────────────────────────────────────────
export const RISK_CONFIG = {
  bajo:      { label: "Bajo",      color: T.suc,        bg: T.sucA,                  dot: "#4E8B5F" },
  moderado:  { label: "Moderado",  color: T.war,        bg: T.warA,                  dot: "#B8900A" },
  alto:      { label: "Alto",      color: "#C4622A",    bg: "rgba(196,98,42,0.10)",  dot: "#C4622A" },
  inminente: { label: "Inminente", color: T.err,        bg: T.errA,                  dot: T.err     },
};

// ── Auto-suggest risk level ───────────────────────────────────────────────────
function suggestRisk(form) {
  if (form.suicidalIdeation === "activa" && (form.hasPlan || form.hasMeans)) return "inminente";
  if (form.suicidalIdeation === "activa") return "alto";
  if (form.suicidalIdeation === "pasiva" || form.selfHarm === "activa") return "moderado";
  return "bajo";
}

// ── PDF export — safety plan ──────────────────────────────────────────────────
function printSafetyPlan(assessment, patient, profile) {
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

// ── PDF export — clinical record ──────────────────────────────────────────────
function printAssessmentRecord(assessment, patient, profile) {
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
    <tr><td style="color:#5A7270;padding:6px 0;width:55%">Ideación suicida</td><td style="font-weight:600;font-size:13px;text-transform:capitalize;color:${assessment.suicidalIdeation === "ninguna" ? "#4E8B5F" : assessment.suicidalIdeation === "activa" ? "#B85050" : "#B8900A"}">${assessment.suicidalIdeation}</td></tr>
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

// ── Protective factors checklist ──────────────────────────────────────────────
const PROTECTIVE_FACTORS = [
  "Red de apoyo familiar", "Red de apoyo social", "Motivación al cambio",
  "Adherencia al tratamiento", "Creencias religiosas/espirituales",
  "Responsabilidades familiares", "Miedo al dolor/muerte", "Planes futuros",
  "Estabilidad laboral/académica", "Acceso limitado a medios letales",
];

// ── Step indicator ────────────────────────────────────────────────────────────
function StepIndicator({ step, total }) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{ flex: 1, height: 4, borderRadius: 9999, background: i < step ? T.p : i === step ? T.acc : T.bdrL, transition: "background .2s" }}/>
      ))}
    </div>
  );
}

// ── Risk Badge component ──────────────────────────────────────────────────────
export function RiskBadge({ level, size = "normal" }) {
  if (!level) return null;
  const rc = RISK_CONFIG[level];
  if (!rc) return null;
  const small = size === "small";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: small ? "2px 8px" : "3px 10px", borderRadius: 9999, fontSize: small ? 10 : 11, fontWeight: 700, fontFamily: T.fB, color: rc.color, background: rc.bg, letterSpacing: "0.04em" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: rc.dot, flexShrink: 0 }}/>
      {rc.label}
    </span>
  );
}

// ── New assessment multi-step form ────────────────────────────────────────────
const BLANK_FORM = {
  patientId: "", date: fmt(todayDate), evaluatedBy: "session",
  suicidalIdeation: "ninguna", hasPlan: false, hasMeans: false, hasIntent: false,
  previousAttempts: 0, selfHarm: "ninguna", harmToOthers: false,
  protectiveFactors: [], riskLevel: "", clinicalNotes: "",
  safetyPlan: { warningSignals: "", copingStrategies: "", supportContacts: "", professionalContacts: "", environmentSafety: "", reasonsToLive: "" },
};

function AssessmentForm({ patients, onSave, onClose }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(BLANK_FORM);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setSP = (k, v) => setForm(f => ({ ...f, safetyPlan: { ...f.safetyPlan, [k]: v } }));
  const toggleFactor = (f) => setForm(prev => ({
    ...prev,
    protectiveFactors: prev.protectiveFactors.includes(f)
      ? prev.protectiveFactors.filter(x => x !== f)
      : [...prev.protectiveFactors, f],
  }));

  const suggested = useMemo(() => suggestRisk(form), [form]);
  const showPlanFields = (form.riskLevel || suggested) !== "bajo";

  const TOTAL_STEPS = showPlanFields ? 4 : 3;

  const BoolToggle = ({ label, field }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: form[field] ? T.errA : T.bdrL, borderRadius: 10, marginBottom: 8, cursor: "pointer", border: `1.5px solid ${form[field] ? T.err : "transparent"}`, transition: "all .15s" }}
      onClick={() => set(field, !form[field])}>
      <span style={{ fontFamily: T.fB, fontSize: 13.5, color: form[field] ? T.err : T.t }}>{label}</span>
      <div style={{ width: 22, height: 22, borderRadius: 6, background: form[field] ? T.err : T.bdr, display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s" }}>
        {form[field] && <Check size={13} color="#fff" strokeWidth={2.5}/>}
      </div>
    </div>
  );

  const canNext = () => {
    if (step === 0) return !!form.patientId;
    return true;
  };

  const handleSave = () => {
    const finalLevel = form.riskLevel || suggested;
    onSave({ ...form, riskLevel: finalLevel });
  };

  return (
    <div>
      <StepIndicator step={step} total={TOTAL_STEPS} />

      {/* Step 0 — Datos básicos */}
      {step === 0 && (
        <div>
          <div style={{ fontFamily: T.fH, fontSize: 20, color: T.t, marginBottom: 18 }}>Datos de la evaluación</div>
          <Select label="Paciente *" value={form.patientId} onChange={v => set("patientId", v)}
            options={[{ value: "", label: "Seleccionar paciente..." }, ...patients.map(p => ({ value: p.id, label: p.name }))]}/>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Input label="Fecha" value={form.date} onChange={v => set("date", v)} type="date"/>
            <Select label="Tipo de evaluación" value={form.evaluatedBy} onChange={v => set("evaluatedBy", v)}
              options={[{ value: "intake", label: "Evaluación inicial" }, { value: "session", label: "Sesión" }, { value: "crisis", label: "Intervención en crisis" }]}/>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.tm, marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" }}>Intentos previos de suicidio</label>
            <input type="number" min="0" value={form.previousAttempts} onChange={e => set("previousAttempts", parseInt(e.target.value) || 0)}
              style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 14, color: T.t, background: T.card, outline: "none", boxSizing: "border-box" }}/>
          </div>
        </div>
      )}

      {/* Step 1 — Ideación suicida */}
      {step === 1 && (
        <div>
          <div style={{ fontFamily: T.fH, fontSize: 20, color: T.t, marginBottom: 6 }}>Ideación suicida y autolesiones</div>
          <div style={{ fontFamily: T.fB, fontSize: 13, color: T.tm, marginBottom: 20 }}>Registra lo observado en la sesión. El nivel de riesgo se calculará automáticamente.</div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.tm, marginBottom: 8, letterSpacing: "0.06em", textTransform: "uppercase" }}>Ideación suicida</label>
            <div style={{ display: "flex", gap: 8 }}>
              {[{ v: "ninguna", label: "Ninguna" }, { v: "pasiva", label: "Pasiva" }, { v: "activa", label: "Activa" }].map(({ v, label }) => {
                const isActive = form.suicidalIdeation === v;
                const color = v === "ninguna" ? T.suc : v === "pasiva" ? T.war : T.err;
                return (
                  <button key={v} onClick={() => set("suicidalIdeation", v)} style={{ flex: 1, padding: "12px 8px", border: `2px solid ${isActive ? color : T.bdr}`, borderRadius: 12, background: isActive ? (v === "ninguna" ? T.sucA : v === "pasiva" ? T.warA : T.errA) : T.card, cursor: "pointer", fontFamily: T.fB, fontSize: 13, fontWeight: isActive ? 700 : 400, color: isActive ? color : T.tm, transition: "all .15s" }}>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {form.suicidalIdeation === "activa" && (
            <div style={{ background: T.errA, border: `1.5px solid rgba(184,80,80,0.2)`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
              <div style={{ fontFamily: T.fB, fontSize: 12, fontWeight: 700, color: T.err, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Ideación activa — detallar</div>
              <BoolToggle label="¿Tiene un plan estructurado?" field="hasPlan"/>
              <BoolToggle label="¿Tiene acceso a medios letales?" field="hasMeans"/>
              <BoolToggle label="¿Manifiesta intención de actuar?" field="hasIntent"/>
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.tm, marginBottom: 8, letterSpacing: "0.06em", textTransform: "uppercase" }}>Autolesiones</label>
            <div style={{ display: "flex", gap: 8 }}>
              {[{ v: "ninguna", label: "Ninguna" }, { v: "pasada", label: "Historial previo" }, { v: "activa", label: "Actualmente activa" }].map(({ v, label }) => {
                const isActive = form.selfHarm === v;
                const color = v === "ninguna" ? T.suc : v === "pasada" ? T.war : T.err;
                return (
                  <button key={v} onClick={() => set("selfHarm", v)} style={{ flex: 1, padding: "11px 6px", border: `2px solid ${isActive ? color : T.bdr}`, borderRadius: 12, background: isActive ? (v === "ninguna" ? T.sucA : v === "pasada" ? T.warA : T.errA) : T.card, cursor: "pointer", fontFamily: T.fB, fontSize: 12.5, fontWeight: isActive ? 700 : 400, color: isActive ? color : T.tm, transition: "all .15s", textAlign: "center" }}>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <BoolToggle label="¿Existe riesgo a terceros?" field="harmToOthers"/>
        </div>
      )}

      {/* Step 2 — Factores protectores + nivel */}
      {step === 2 && (
        <div>
          <div style={{ fontFamily: T.fH, fontSize: 20, color: T.t, marginBottom: 6 }}>Factores protectores y nivel de riesgo</div>
          <div style={{ fontFamily: T.fB, fontSize: 13, color: T.tm, marginBottom: 20 }}>Marca los factores presentes. El nivel sugerido puede ajustarse clínicamente.</div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.tm, marginBottom: 10, letterSpacing: "0.06em", textTransform: "uppercase" }}>Factores protectores</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {PROTECTIVE_FACTORS.map(f => {
                const selected = form.protectiveFactors.includes(f);
                return (
                  <button key={f} onClick={() => toggleFactor(f)}
                    style={{ padding: "6px 12px", borderRadius: 9999, textAlign: "center",
                      border: `1.5px solid ${selected ? T.suc : T.bdr}`,
                      background: selected ? T.sucA : T.card,
                      color: selected ? T.suc : T.tm,
                      fontFamily: T.fB, fontSize: 12, fontWeight: selected ? 700 : 400,
                      cursor: "pointer", transition: "all .15s",
                      display: "inline-flex", alignItems: "center", gap: 4,
                      whiteSpace: "nowrap" }}>
                    {selected && <Check size={10} strokeWidth={2.5}/>}{f}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.tm, marginBottom: 8, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Nivel de riesgo
              <span style={{ marginLeft: 8, fontWeight: 400, textTransform: "none", letterSpacing: 0, fontSize: 11, color: T.tl }}>
                (sugerido: <strong style={{ color: RISK_CONFIG[suggested]?.color }}>{RISK_CONFIG[suggested]?.label}</strong>)
              </span>
            </label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {Object.entries(RISK_CONFIG).map(([k, rc]) => {
                const isActive = (form.riskLevel || suggested) === k;
                return (
                  <button key={k} onClick={() => set("riskLevel", k)} style={{ flex: 1, minWidth: 80, padding: "12px 8px", border: `2px solid ${isActive ? rc.color : T.bdr}`, borderRadius: 12, background: isActive ? rc.bg : T.card, cursor: "pointer", fontFamily: T.fB, fontSize: 13, fontWeight: isActive ? 700 : 400, color: isActive ? rc.color : T.tm, transition: "all .15s" }}>
                    {rc.label}
                  </button>
                );
              })}
            </div>
          </div>

          <Textarea label="Observaciones clínicas" value={form.clinicalNotes} onChange={v => set("clinicalNotes", v)}
            placeholder="Contexto clínico, intervenciones realizadas, respuesta del paciente..." rows={4}/>
        </div>
      )}

      {/* Step 3 — Plan de seguridad (solo si nivel >= moderado) */}
      {step === 3 && showPlanFields && (
        <div>
          <div style={{ fontFamily: T.fH, fontSize: 20, color: T.t, marginBottom: 6 }}>Plan de seguridad</div>
          <div style={{ fontFamily: T.fB, fontSize: 13, color: T.tm, marginBottom: 20 }}>El paciente se llevará este plan al finalizar la sesión. Complétalo de manera colaborativa.</div>

          <Textarea label="Señales de advertencia" value={form.safetyPlan.warningSignals} onChange={v => setSP("warningSignals", v)}
            placeholder="¿Qué pensamientos, sentimientos o situaciones indican que la crisis se acerca?" rows={3}/>
          <Textarea label="Estrategias de afrontamiento" value={form.safetyPlan.copingStrategies} onChange={v => setSP("copingStrategies", v)}
            placeholder="Actividades y técnicas que el paciente puede hacer solo para manejar la crisis..." rows={3}/>
          <Textarea label="Personas de apoyo" value={form.safetyPlan.supportContacts} onChange={v => setSP("supportContacts", v)}
            placeholder="Familiares o amigos de confianza a quienes puede llamar..." rows={2}/>
          <Textarea label="Contactos de emergencia" value={form.safetyPlan.professionalContacts} onChange={v => setSP("professionalContacts", v)}
            placeholder="Terapeuta, psiquiatra, SAPTEL 55 5259-8121, Línea de la Vida 800 911-2000..." rows={2}/>
          <Textarea label="Retiro de medios" value={form.safetyPlan.environmentSafety} onChange={v => setSP("environmentSafety", v)}
            placeholder="Acuerdos sobre retiro o aseguramiento de medios letales..." rows={2}/>
          <Textarea label="Razones para vivir" value={form.safetyPlan.reasonsToLive} onChange={v => setSP("reasonsToLive", v)}
            placeholder="Motivaciones personales que el paciente identifica para seguir adelante..." rows={2}/>
        </div>
      )}

      {/* Nav buttons */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, paddingTop: 20, borderTop: `1px solid ${T.bdrL}` }}>
        <Btn variant="ghost" onClick={step === 0 ? onClose : () => setStep(s => s - 1)}>
          {step === 0 ? "Cancelar" : "← Atrás"}
        </Btn>
        {step < TOTAL_STEPS - 1
          ? <Btn onClick={() => setStep(s => s + 1)} disabled={!canNext()}>Continuar →</Btn>
          : <Btn onClick={handleSave} disabled={!form.patientId}><Check size={15}/> Guardar evaluación</Btn>
        }
      </div>
    </div>
  );
}

// ── Assessment detail card (expanded) ────────────────────────────────────────
function AssessmentCard({ a, patient, profile, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const rc = RISK_CONFIG[a.riskLevel];
  if (!rc) return null;

  return (
    <Card style={{ padding: 0, marginBottom: 12, overflow: "hidden" }}>
      {/* Contenido */}
      <div style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
          <span style={{ fontFamily: T.fB, fontSize: 14.5, fontWeight: 600, color: T.t }}>{patient?.name?.split(" ").slice(0, 2).join(" ") || "Paciente"}</span>
          <span style={{ fontSize: 11, color: T.tl }}>·</span>
          <span style={{ fontFamily: T.fB, fontSize: 12, color: T.tm }}>{fmtDate(a.date)}</span>
          <span style={{ fontSize: 11, color: T.tl }}>·</span>
          <span style={{ fontFamily: T.fB, fontSize: 12, color: T.tm }}>
            {{ session: "Sesión", intake: "Evaluación inicial", crisis: "Crisis" }[a.evaluatedBy] || a.evaluatedBy}
          </span>
        </div>

        <RiskBadge level={a.riskLevel}/>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8, marginBottom: a.clinicalNotes ? 8 : 0 }}>
          {a.suicidalIdeation !== "ninguna" && (
            <span style={{ fontFamily: T.fB, fontSize: 12, color: a.suicidalIdeation === "activa" ? T.err : T.war, fontWeight: 600 }}>
              ⚠ Ideación {a.suicidalIdeation}
            </span>
          )}
          {a.selfHarm === "activa" && <span style={{ fontFamily: T.fB, fontSize: 12, color: T.err, fontWeight: 600 }}>⚠ Autolesiones activas</span>}
          {a.harmToOthers && <span style={{ fontFamily: T.fB, fontSize: 12, color: T.err, fontWeight: 600 }}>⚠ Riesgo a terceros</span>}
          {a.previousAttempts > 0 && <span style={{ fontFamily: T.fB, fontSize: 12, color: T.war, fontWeight: 600 }}>{a.previousAttempts} intento{a.previousAttempts > 1 ? "s" : ""} previo{a.previousAttempts > 1 ? "s" : ""}</span>}
        </div>

        {a.clinicalNotes && (
          <p style={{ fontFamily: T.fB, fontSize: 13, color: T.tm, margin: 0, lineHeight: 1.6 }}>{a.clinicalNotes}</p>
        )}

        {expanded && a.protectiveFactors?.length > 0 && (
          <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
            {a.protectiveFactors.map(f => (
              <span key={f} style={{ padding: "3px 10px", borderRadius: 9999, background: T.sucA, color: T.suc, fontSize: 11, fontWeight: 600, fontFamily: T.fB }}>{f}</span>
            ))}
          </div>
        )}

        {expanded && a.safetyPlan && Object.values(a.safetyPlan).some(v => v) && (
          <div style={{ marginTop: 12, padding: 14, background: T.cardAlt, borderRadius: 10, border: `1px solid ${T.bdrL}` }}>
            <div style={{ fontFamily: T.fB, fontSize: 11, fontWeight: 700, color: T.tm, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Plan de seguridad</div>
            {[
              ["Señales de advertencia", a.safetyPlan.warningSignals],
              ["Estrategias de afrontamiento", a.safetyPlan.copingStrategies],
              ["Personas de apoyo", a.safetyPlan.supportContacts],
              ["Contactos profesionales", a.safetyPlan.professionalContacts],
              ["Retiro de medios", a.safetyPlan.environmentSafety],
              ["Razones para vivir", a.safetyPlan.reasonsToLive],
            ].filter(([, v]) => v).map(([label, val]) => (
              <div key={label} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: T.tl, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 2 }}>{label}</div>
                <div style={{ fontFamily: T.fB, fontSize: 13, color: T.t, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{val}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Barra de acciones — flush al fondo */}
      <div style={{ borderTop: `1px solid ${T.bdrL}`, display: "flex", alignItems: "center", background: T.cardAlt }}>
        {[
          { label: expanded ? "Contraer" : "Ver más", icon: expanded ? ChevronUp : ChevronDown, onClick: () => setExpanded(e => !e), color: T.tm },
          { label: "PDF",    icon: Printer, onClick: () => printAssessmentRecord(a, patient, profile), color: T.tm },
          ...(a.safetyPlan && Object.values(a.safetyPlan).some(v => v)
            ? [{ label: "Plan", icon: Shield, onClick: () => printSafetyPlan(a, patient, profile), color: T.p }]
            : []),
          { label: "Borrar",  icon: Trash2,  onClick: () => {
              if (window.confirm(`¿Eliminar esta evaluación de riesgo?

Esta acción no se puede deshacer.`)) onDelete(a.id);
            }, color: T.err },
        ].map(b => (
          <button key={b.label} onClick={b.onClick}
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              gap: 4, padding: "9px 2px", background: "none", border: "none",
              borderRight: `1px solid ${T.bdrL}`, cursor: "pointer",
              fontFamily: T.fB, fontSize: 11, fontWeight: 500, color: b.color,
              transition: "background .13s", whiteSpace: "nowrap" }}
            onMouseEnter={e => e.currentTarget.style.background = T.bdrL}
            onMouseLeave={e => e.currentTarget.style.background = "none"}>
            <b.icon size={12}/>{b.label}
          </button>
        ))}
      </div>
    </Card>
  );
}

// ── Main module ───────────────────────────────────────────────────────────────
export default function RiskAssessment({ riskAssessments = [], setRiskAssessments, patients = [], profile }) {
  const isMobile = useIsMobile();
  const isWide   = useIsWide();
  const [showForm, setShowForm] = useState(false);
  const [filterPt, setFilterPt] = useState("");
  const [filterLevel, setFilterLevel] = useState("todos");
  const [tab, setTab] = useState("list");

  const filtered = useMemo(() =>
    riskAssessments
      .filter(a => (!filterPt || a.patientId === filterPt) && (filterLevel === "todos" || a.riskLevel === filterLevel))
      .sort((a, b) => b.date.localeCompare(a.date)),
    [riskAssessments, filterPt, filterLevel]
  );

  // Summary stats
  const alertCount = riskAssessments.filter(a => a.riskLevel === "alto" || a.riskLevel === "inminente").length;
  const byLevel = Object.fromEntries(
    Object.keys(RISK_CONFIG).map(k => [k, riskAssessments.filter(a => a.riskLevel === k).length])
  );

  // Most recent per patient
  const latestByPatient = useMemo(() => {
    const map = {};
    riskAssessments.forEach(a => {
      if (!map[a.patientId] || a.date > map[a.patientId].date) map[a.patientId] = a;
    });
    return map;
  }, [riskAssessments]);

  const save = (data) => {
    const pt = patients.find(p => p.id === data.patientId);
    setRiskAssessments(prev => [...prev, { ...data, id: "ra" + uid(), patientName: pt?.name || "" }]);
    setShowForm(false);
  };

  const del = (id) => setRiskAssessments(prev => prev.filter(a => a.id !== id));

  return (
    <div style={{ maxWidth: isWide ? "none" : 960, paddingBottom: 40 }}>
      <PageHeader
        title="Riesgo"
        subtitle={`${riskAssessments.length} ${riskAssessments.length !== 1 ? "evaluaciones" : "evaluación"} registrada${riskAssessments.length !== 1 ? "s" : ""}${alertCount > 0 ? ` · ${alertCount} en nivel alto/inminente` : ""}`}
        action={<Btn onClick={() => setShowForm(true)}><Plus size={15}/> Nueva evaluación</Btn>}
      />

      {/* Summary cards — fila de 4 tapeables */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 20 }}>
        {Object.entries(RISK_CONFIG).map(([k, rc]) => {
          const active = filterLevel === k;
          const count  = byLevel[k] || 0;
          return (
            <button key={k}
              onClick={() => setFilterLevel(prev => prev === k ? "todos" : k)}
              style={{ padding: "12px 8px", borderRadius: 14, textAlign: "center", cursor: "pointer",
                background: active ? rc.bg : T.card,
                border: `2px solid ${active ? rc.color+"60" : T.bdrL}`,
                boxShadow: active ? `0 0 0 3px ${rc.color}15` : T.sh,
                transition: "all .13s" }}>
              <div style={{ fontFamily: T.fH, fontSize: 24, fontWeight: 500,
                color: active ? rc.color : T.t, lineHeight: 1, marginBottom: 4 }}>{count}</div>
              <div style={{ fontFamily: T.fB, fontSize: 9, fontWeight: 700,
                color: active ? rc.color : T.tl,
                textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{rc.label}</div>
            </button>
          );
        })}
      </div>

      <Tabs
        tabs={[{ id: "list", label: "Evaluaciones" }, { id: "patients", label: "Por paciente" }]}
        active={tab} onChange={setTab}
      />

      {tab === "list" && (
        <>
          <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
            <select value={filterPt} onChange={e => setFilterPt(e.target.value)}
              style={{ padding: "9px 14px", border: `1.5px solid ${T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 13.5, color: T.t, background: T.card, cursor: "pointer", outline: "none" }}>
              <option value="">Todos los pacientes</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.name.split(" ").slice(0, 2).join(" ")}</option>)}
            </select>
            {filterLevel !== "todos" && (
              <button onClick={() => setFilterLevel("todos")} style={{ padding: "9px 14px", borderRadius: 10, border: `1.5px solid ${T.bdr}`, background: T.bdrL, fontFamily: T.fB, fontSize: 13, color: T.tm, cursor: "pointer" }}>
                × Limpiar filtro
              </button>
            )}
          </div>

          {filtered.length === 0
            ? <EmptyState icon={ShieldAlert} title="Sin evaluaciones" desc="Registra la primera evaluación de riesgo con el botón de arriba"/>
            : filtered.map(a => {
                const patient = patients.find(p => p.id === a.patientId);
                return <AssessmentCard key={a.id} a={a} patient={patient} profile={profile} onDelete={del}/>;
              })
          }
        </>
      )}

      {tab === "patients" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px,1fr))", gap: 14 }}>
          {patients.filter(p => latestByPatient[p.id]).map(p => {
            const latest = latestByPatient[p.id];
            const rc = RISK_CONFIG[latest.riskLevel];
            const count = riskAssessments.filter(a => a.patientId === p.id).length;
            return (
              <Card key={p.id} style={{ padding: "12px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {/* Avatar compacto */}
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: rc.bg,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontFamily: T.fH, fontSize: 17, color: rc.color }}>{p.name[0]}</span>
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <span style={{ fontFamily: T.fB, fontSize: 14, fontWeight: 600, color: T.t,
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {p.name.split(" ").slice(0, 2).join(" ")}
                      </span>
                      <RiskBadge level={latest.riskLevel}/>
                    </div>
                    <div style={{ fontFamily: T.fB, fontSize: 11.5, color: T.tm }}>
                      {fmtDate(latest.date)} · {count} evaluación{count !== 1 ? "es" : ""}
                    </div>
                    {latest.suicidalIdeation !== "ninguna" && (
                      <div style={{ fontFamily: T.fB, fontSize: 11, color: latest.suicidalIdeation === "activa" ? T.err : T.war, fontWeight: 600, marginTop: 2 }}>
                        ⚠ Ideación {latest.suicidalIdeation}
                      </div>
                    )}
                    {latest.protectiveFactors?.length > 0 && (
                      <div style={{ fontFamily: T.fB, fontSize: 11, color: T.suc, marginTop: 2 }}>
                        ✓ {latest.protectiveFactors.length} factor{latest.protectiveFactors.length > 1 ? "es" : ""} protector{latest.protectiveFactors.length > 1 ? "es" : ""}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
          {Object.keys(latestByPatient).length === 0 && (
            <EmptyState icon={Shield} title="Sin datos" desc="Las evaluaciones de riesgo aparecerán aquí agrupadas por paciente"/>
          )}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nueva evaluación" width={600}>
        <AssessmentForm patients={patients} onSave={save} onClose={() => setShowForm(false)}/>
      </Modal>
    </div>
  );
}
