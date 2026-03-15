import { useState, useMemo } from "react";
import { FileText, Trash2, Printer, Tag, Check, Plus, Send, Copy, ShieldAlert, ChevronDown, ChevronUp, LayoutList, ClipboardCheck, Lock } from "lucide-react";
import { T } from "../theme.js";
import { uid, todayDate, fmt, fmtDate, moodIcon, moodColor, progressStyle } from "../utils.js";
import { Card, Badge, Modal, Input, Textarea, Select, Btn, EmptyState, PageHeader } from "../components/ui/index.jsx";
import { RISK_CONFIG } from "./RiskAssessment.jsx";

// ─────────────────────────────────────────────────────────────────────────────
// NOTE FORMAT DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────
export const NOTE_FORMATS = {
  libre: {
    id: "libre", label: "Libre",
    color: T.tm,  bg: T.bdrL,
    fields: null,
  },
  SOAP: {
    id: "SOAP", label: "SOAP",
    color: "#5B8DB8", bg: "rgba(91,141,184,0.10)",
    fields: [
      { key: "S", label: "S — Subjetivo",  placeholder: "Lo que el paciente reporta: síntomas, preocupaciones, cómo se ha sentido desde la última sesión..." },
      { key: "O", label: "O — Objetivo",   placeholder: "Observaciones clínicas: comportamiento, afecto, apariencia, cognición, pruebas aplicadas..." },
      { key: "A", label: "A — Análisis",   placeholder: "Valoración clínica: interpretación de los datos, hipótesis diagnóstica, cambios respecto a sesión anterior..." },
      { key: "P", label: "P — Plan",       placeholder: "Intervenciones realizadas y planificadas, tareas entre sesiones, objetivos para la próxima cita..." },
    ],
  },
  DAP: {
    id: "DAP", label: "DAP",
    color: "#6B5B9E", bg: "rgba(107,91,158,0.10)",
    fields: [
      { key: "D", label: "D — Datos",    placeholder: "Descripción factual de lo ocurrido en sesión: temas tratados, comportamiento observado, lo que el paciente reportó..." },
      { key: "A", label: "A — Análisis", placeholder: "Interpretación clínica: significado de los datos, relación con el diagnóstico, progreso terapéutico..." },
      { key: "P", label: "P — Plan",     placeholder: "Intervenciones, tareas asignadas, ajustes al tratamiento, objetivos para la próxima sesión..." },
    ],
  },
  BIRP: {
    id: "BIRP", label: "BIRP",
    color: "#9B6B9E", bg: "rgba(155,107,158,0.10)",
    fields: [
      { key: "B", label: "B — Conducta",     placeholder: "Comportamiento del paciente al inicio de la sesión: estado de ánimo, actitud, presentación..." },
      { key: "I", label: "I — Intervención", placeholder: "Técnicas e intervenciones aplicadas por el terapeuta durante la sesión..." },
      { key: "R", label: "R — Respuesta",    placeholder: "Respuesta del paciente a las intervenciones: reacciones, insight, cambios observados..." },
      { key: "P", label: "P — Plan",         placeholder: "Próximos pasos: tareas entre sesiones, enfoque de la siguiente cita, derivaciones..." },
    ],
  },
};

function compileNotes(formatId, structured) {
  const fd = NOTE_FORMATS[formatId];
  if (!fd?.fields || !structured) return "";
  return fd.fields
    .map(f => structured[f.key] ? `[${f.key}] ${structured[f.key]}` : "")
    .filter(Boolean).join("\n\n");
}

function blankStructured(formatId) {
  const f = NOTE_FORMATS[formatId];
  if (!f?.fields) return null;
  return Object.fromEntries(f.fields.map(fld => [fld.key, ""]));
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF — note (structured-aware)
// ─────────────────────────────────────────────────────────────────────────────
function printNote(session, patients) {
  const pt = patients.find(p => p.id === session.patientId);
  const fd = NOTE_FORMATS[session.noteFormat] || NOTE_FORMATS.libre;
  const w  = window.open("", "_blank");

  const structuredHTML = fd.fields && session.structured
    ? fd.fields.map(f => session.structured[f.key] ? `
      <div class="section">
        <div class="section-label">${f.label}</div>
        <div class="section-body">${session.structured[f.key]}</div>
      </div>` : "").join("")
    : `<div class="section"><div class="section-label">Notas clínicas</div><div class="section-body">${session.notes}</div></div>`;

  const fmtBadge = fd.id !== "libre"
    ? `<span style="padding:3px 12px;border-radius:9999px;background:${fd.bg};color:${fd.color};font-size:12px;font-weight:700;font-family:'DM Sans',sans-serif">${fd.label}</span>`
    : "";

  w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Nota — ${session.patientName}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600&family=DM+Sans:wght@400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',sans-serif;max-width:720px;margin:48px auto;color:#1A2B28;line-height:1.6}
header{border-bottom:3px solid #3A6B6E;padding-bottom:20px;margin-bottom:32px;display:flex;justify-content:space-between;align-items:flex-start}
h1{font-family:'Cormorant Garamond',serif;font-size:32px;font-weight:600;color:#3A6B6E}
.subtitle{font-size:13px;color:#5A7270;margin-top:4px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:28px}
.field label{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#9BAFAD;font-weight:600;display:block;margin-bottom:4px}
.field p{font-size:15px}
.section{margin-bottom:20px}
.section-label{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:${fd.color};font-weight:700;margin-bottom:8px}
.section-body{background:#F9F8F5;padding:18px 20px;border-radius:10px;border-left:4px solid ${fd.id !== "libre" ? fd.color : "#3A6B6E"};font-size:14px;line-height:1.75;white-space:pre-wrap}
.tags{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:24px}
.tag{background:rgba(196,137,90,0.1);color:#C4895A;padding:3px 10px;border-radius:9999px;font-size:12px;font-weight:600}
footer{margin-top:48px;padding-top:20px;border-top:1px solid #D8E2E0;font-size:12px;color:#9BAFAD;display:flex;justify-content:space-between}
@media print{body{margin:0}}
</style></head><body>
<header>
  <div><h1>Nota de Evolución Clínica</h1><p class="subtitle">PsychoCore · ${new Date().toLocaleDateString("es-MX",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</p></div>
  <div>${fmtBadge}</div>
</header>
<div class="grid">
  <div class="field"><label>Paciente</label><p>${session.patientName}</p></div>
  <div class="field"><label>Fecha</label><p>${fmtDate(session.date)}</p></div>
  <div class="field"><label>Duración</label><p>${session.duration} minutos</p></div>
  <div class="field"><label>Estado de ánimo</label><p style="text-transform:capitalize">${session.mood}</p></div>
  <div class="field"><label>Progreso</label><p style="text-transform:capitalize">${session.progress}</p></div>
  ${pt?.diagnosis ? `<div class="field"><label>Diagnóstico</label><p>${pt.diagnosis}</p></div>` : ""}
</div>
${structuredHTML}
${(session.tags||[]).length ? `<div class="tags">${session.tags.map(t=>`<span class="tag">${t}</span>`).join("")}</div>` : ""}
<footer><span>PsychoCore</span><span>Documento confidencial</span></footer>
</body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 500);
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF — referral letter (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
function printReferral(patient, session, profile, formData) {
  const w = window.open("","_blank");
  const today = new Date().toLocaleDateString("es-MX",{day:"numeric",month:"long",year:"numeric"});
  w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Carta Derivación — ${patient?.name}</title>
<style>@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0}body{font-family:'DM Sans',sans-serif;max-width:720px;margin:48px auto;color:#1A2B28;line-height:1.7;font-size:14px}
.letterhead{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px;padding-bottom:20px;border-bottom:2px solid #3A6B6E}
.org h1{font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:600;color:#3A6B6E;margin-bottom:4px}
.org p{font-size:12px;color:#5A7270}.date{font-size:13px;color:#5A7270;text-align:right}
h2{font-family:'Cormorant Garamond',serif;font-size:22px;color:#3A6B6E;margin-bottom:20px}
.body-text{margin-bottom:16px;text-align:justify}
.data-box{background:#F9F8F5;padding:16px 20px;border-radius:8px;margin:20px 0;border-left:4px solid #3A6B6E}
.data-box p{margin-bottom:6px;font-size:13px}.data-box strong{color:#1A2B28}
.signature{margin-top:56px}.sig-line{width:240px;border-top:1px solid #1A2B28;margin-bottom:8px}
.sig-name{font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:500;color:#1A2B28}
.sig-detail{font-size:12px;color:#5A7270}
footer{margin-top:48px;padding-top:16px;border-top:1px solid #D8E2E0;font-size:11px;color:#9BAFAD;text-align:center}
@media print{body{margin:0}}</style></head><body>
<div class="letterhead">
  <div class="org">
    <h1>${profile?.clinic||"Consultorio Psicológico"}</h1>
    <p>${profile?.name||""}${profile?.specialty?" · "+profile.specialty:""}</p>
    ${profile?.cedula?`<p>Cédula profesional: ${profile.cedula}</p>`:""}
    ${profile?.phone?`<p>Tel: ${profile.phone}</p>`:""}
  </div>
  <div class="date">${today}</div>
</div>
<h2>Carta de Derivación</h2>
<p class="body-text">Por medio de la presente, me permito referir al/a la paciente:</p>
<div class="data-box">
  <p><strong>Nombre:</strong> ${patient?.name||""}</p>
  <p><strong>Edad:</strong> ${patient?.age?patient.age+" años":"N/D"}</p>
  ${patient?.diagnosis?`<p><strong>Diagnóstico:</strong> ${patient.diagnosis}</p>`:""}
  <p><strong>Tiempo en tratamiento:</strong> ${session?`Desde ${fmtDate(session.date)}`:"N/D"}</p>
</div>
<p class="body-text">${formData.reason||"El/la paciente requiere evaluación y atención especializada."}</p>
${formData.specialist?`<p class="body-text">Se deriva al servicio de <strong>${formData.specialist}</strong>.</p>`:""}
${formData.notes?`<p class="body-text">${formData.notes}</p>`:""}
<p class="body-text">Agradezco de antemano la atención prestada y quedo a disposición para cualquier información adicional.</p>
<p class="body-text">Atentamente,</p>
<div class="signature">
  <div class="sig-line"></div>
  <div class="sig-name">${profile?.name||"Psicólogo/a"}</div>
  <div class="sig-detail">${profile?.specialty||"Psicólogo/a Clínico/a"}${profile?.cedula?" · Ced. "+profile.cedula:""}</div>
  ${profile?.clinic?`<div class="sig-detail">${profile.clinic}</div>`:""}
</div>
<footer>Documento generado por PsychoCore · ${today}</footer>
</body></html>`);
  w.document.close(); setTimeout(() => w.print(), 500);
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
function FormatSelector({ value, onChange }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display:"block", fontSize:12, fontWeight:600, color:T.tm, marginBottom:8, letterSpacing:"0.06em", textTransform:"uppercase" }}>
        Formato de nota
      </label>
      <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
        {Object.values(NOTE_FORMATS).map(fd => {
          const active = value === fd.id;
          return (
            <button key={fd.id} onClick={() => onChange(fd.id)}
              style={{ padding:"7px 16px", borderRadius:9999, border:`1.5px solid ${active ? fd.color : T.bdr}`, background:active ? fd.bg : "transparent", color:active ? fd.color : T.tm, fontFamily:T.fB, fontSize:13, fontWeight:active?700:400, cursor:"pointer", transition:"all .13s" }}>
              {fd.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StructuredFields({ formatId, structured, onChange }) {
  const fd = NOTE_FORMATS[formatId];
  if (!fd?.fields) return null;
  return (
    <div style={{ border:`1.5px solid ${fd.color}40`, borderRadius:12, overflow:"hidden", marginBottom:16 }}>
      {fd.fields.map((f, i) => (
        <div key={f.key} style={{ borderBottom: i < fd.fields.length - 1 ? `1px solid ${T.bdrL}` : "none" }}>
          <div style={{ padding:"10px 16px 6px", background:fd.bg }}>
            <label style={{ fontSize:11, fontWeight:700, color:fd.color, textTransform:"uppercase", letterSpacing:"0.08em" }}>{f.label}</label>
          </div>
          <textarea value={structured[f.key] || ""} onChange={e => onChange(f.key, e.target.value)}
            placeholder={f.placeholder} rows={3}
            style={{ width:"100%", padding:"12px 16px", border:"none", outline:"none", fontFamily:T.fB, fontSize:13.5, color:T.t, background:T.card, resize:"vertical", boxSizing:"border-box", lineHeight:1.65 }}/>
        </div>
      ))}
    </div>
  );
}

function StructuredPreview({ session }) {
  const [expanded, setExpanded] = useState(false);
  const fd = NOTE_FORMATS[session.noteFormat];
  if (!fd?.fields || !session.structured) return null;
  const firstField = fd.fields[0];
  const previewText = session.structured[firstField.key] || "";
  return (
    <div style={{ marginBottom:8 }}>
      <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"2px 9px", borderRadius:9999, background:fd.bg, color:fd.color, fontSize:10, fontWeight:700, fontFamily:T.fB, marginBottom:10, letterSpacing:"0.04em" }}>
        <LayoutList size={10}/>{fd.label}
      </span>
      <div style={{ marginBottom:6 }}>
        <span style={{ fontSize:10, fontWeight:700, color:fd.color, textTransform:"uppercase", letterSpacing:"0.07em", marginRight:6 }}>{firstField.key}</span>
        <span style={{ fontFamily:T.fB, fontSize:13.5, color:T.t, lineHeight:1.65 }}>
          {previewText.length > 120 && !expanded ? previewText.slice(0, 120) + "…" : previewText}
        </span>
      </div>
      {expanded && fd.fields.slice(1).map(f => session.structured[f.key] ? (
        <div key={f.key} style={{ marginBottom:8 }}>
          <span style={{ fontSize:10, fontWeight:700, color:fd.color, textTransform:"uppercase", letterSpacing:"0.07em", marginRight:6 }}>{f.key}</span>
          <span style={{ fontFamily:T.fB, fontSize:13.5, color:T.t, lineHeight:1.65 }}>{session.structured[f.key]}</span>
        </div>
      ) : null)}
      {fd.fields.length > 1 && (
        <button onClick={() => setExpanded(e => !e)}
          style={{ background:"none", border:"none", cursor:"pointer", fontFamily:T.fB, fontSize:12, color:fd.color, padding:"2px 0", display:"flex", alignItems:"center", gap:4, fontWeight:600 }}>
          {expanded ? <><ChevronUp size={12}/>Contraer</> : <><ChevronDown size={12}/>Ver nota completa</>}
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN MODULE
// ─────────────────────────────────────────────────────────────────────────────
const BLANK_RISK = { suicidalIdeation:"ninguna", selfHarm:"ninguna", harmToOthers:false };

export default function Sessions({ sessions, setSessions, patients, profile, prefill, riskAssessments = [], setRiskAssessments }) {
  const [filterPt,  setFilterPt]  = useState("");
  const [showAdd,   setShowAdd]   = useState(!!prefill);
  const [referral,  setReferral]  = useState(null);
  const [refForm,   setRefForm]   = useState({ reason:"", specialist:"", notes:"" });
  const [riskOpen,  setRiskOpen]  = useState(false);
  const [quickRisk, setQuickRisk] = useState(BLANK_RISK);

  const blankForm = { patientId:"", date:fmt(todayDate), duration:50, mood:"moderado", progress:"bueno", noteFormat:"libre", notes:"", structured:null, tags:"", taskAssigned:"", taskCompleted:null, privateNotes:"" };
  const [form, setForm] = useState(prefill ? { ...blankForm, patientId:prefill.patientId||"", date:prefill.date||fmt(todayDate) } : blankForm);

  const fld  = k => v => setForm(f => ({ ...f, [k]:v }));
  const rfld = k => v => setRefForm(f => ({ ...f, [k]:v }));
  const rld  = k => v => setQuickRisk(r => ({ ...r, [k]:v }));

  const handleFormatChange = (newFormat) => {
    setForm(f => ({ ...f, noteFormat:newFormat, structured:blankStructured(newFormat), notes:"" }));
  };

  const handleStructuredChange = (key, val) => {
    setForm(f => {
      const s = { ...f.structured, [key]:val };
      return { ...f, structured:s, notes:compileNotes(f.noteFormat, s) };
    });
  };

  const isStructured = form.noteFormat !== "libre";
  const canSave = form.patientId && (
    isStructured
      ? NOTE_FORMATS[form.noteFormat]?.fields?.some(f => form.structured?.[f.key]?.trim())
      : form.notes.trim()
  );

  const filtered = useMemo(() =>
    sessions.filter(s => !filterPt || s.patientId === filterPt).sort((a,b) => b.date.localeCompare(a.date)),
    [sessions, filterPt]);

  const save = () => {
    if (!canSave) return;
    const pt = patients.find(p => p.id === form.patientId);
    const sessionId = "s" + uid();
    const finalNotes = isStructured ? compileNotes(form.noteFormat, form.structured) : form.notes;
    setSessions(prev => [...prev, { ...form, id:sessionId, patientName:pt?.name||"", notes:finalNotes, tags:form.tags.split(",").map(t=>t.trim()).filter(Boolean) }]);
    const hasRisk = quickRisk.suicidalIdeation !== "ninguna" || quickRisk.selfHarm !== "ninguna" || quickRisk.harmToOthers;
    if (hasRisk && setRiskAssessments) {
      const suggested = quickRisk.suicidalIdeation==="activa" ? "alto" : quickRisk.suicidalIdeation==="pasiva"||quickRisk.selfHarm==="activa" ? "moderado" : "bajo";
      setRiskAssessments(prev => [...prev, { id:"ra"+uid(), patientId:form.patientId, patientName:pt?.name||"", sessionId, date:form.date, evaluatedBy:"session", ...quickRisk, hasPlan:false, hasMeans:false, hasIntent:false, previousAttempts:0, protectiveFactors:[], riskLevel:suggested, clinicalNotes:"", safetyPlan:{warningSignals:"",copingStrategies:"",supportContacts:"",professionalContacts:"",environmentSafety:"",reasonsToLive:""} }]);
    }
    setForm(blankForm); setQuickRisk(BLANK_RISK); setRiskOpen(false); setShowAdd(false);
  };

  const duplicate = (s) => {
    setForm({ patientId:s.patientId, date:fmt(todayDate), duration:s.duration, mood:s.mood, progress:s.progress, tags:(s.tags||[]).join(", "), noteFormat:s.noteFormat||"libre", notes:s.noteFormat==="libre"?s.notes:"", structured:s.structured?{...s.structured}:null, taskAssigned:"", taskCompleted:null, privateNotes:"" });
    setShowAdd(true);
  };

  const del = id => setSessions(prev => prev.filter(s => s.id !== id));

  const openReferral = (session) => {
    setReferral({ session, patient:patients.find(p => p.id === session.patientId) });
    setRefForm({ reason:"", specialist:"", notes:"" });
  };

  return (
    <div>
      <PageHeader title="Notas de Sesión"
        subtitle={`${sessions.length} nota${sessions.length!==1?"s":""} registrada${sessions.length!==1?"s":""}`}
        action={<Btn onClick={() => { setForm(blankForm); setShowAdd(true); }}><Plus size={15}/> Nueva nota</Btn>}
      />

      <div style={{ marginBottom:20 }}>
        <select value={filterPt} onChange={e => setFilterPt(e.target.value)}
          style={{ padding:"9px 14px", border:`1.5px solid ${T.bdr}`, borderRadius:10, fontFamily:T.fB, fontSize:13.5, color:T.t, background:T.card, cursor:"pointer", outline:"none" }}>
          <option value="">Todos los pacientes</option>
          {patients.map(p => <option key={p.id} value={p.id}>{p.name.split(" ").slice(0,2).join(" ")}</option>)}
        </select>
      </div>

      {filtered.length === 0
        ? <EmptyState icon={FileText} title="Sin notas" desc="Registra la evolución de tus pacientes con el botón de arriba"/>
        : filtered.map(s => {
          const MI = moodIcon(s.mood);
          const ps = progressStyle(s.progress);
          const isStruct = s.noteFormat && s.noteFormat !== "libre" && s.structured;
          return (
            <Card key={s.id} style={{ padding:22, marginBottom:12 }}>
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:16 }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10, flexWrap:"wrap" }}>
                    <span style={{ fontFamily:T.fH, fontSize:17, fontWeight:500, color:T.t }}>{s.patientName.split(" ").slice(0,2).join(" ")}</span>
                    <span style={{ fontSize:11, color:T.tl }}>·</span>
                    <span style={{ fontSize:13, color:T.tm, fontFamily:T.fB }}>{fmtDate(s.date)}</span>
                    <span style={{ fontSize:11, color:T.tl }}>·</span>
                    <span style={{ fontSize:12, color:T.tm, fontFamily:T.fB }}>{s.duration} min</span>
                  </div>
                  {isStruct
                    ? <StructuredPreview session={s}/>
                    : <p style={{ fontFamily:T.fB, fontSize:13.5, color:T.t, margin:"0 0 12px", lineHeight:1.65 }}>{s.notes}</p>
                  }
                  <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginTop:isStruct?8:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                      <MI size={14} color={moodColor(s.mood)}/>
                      <span style={{ fontSize:12, fontFamily:T.fB, color:moodColor(s.mood), fontWeight:600 }}>{s.mood}</span>
                    </div>
                    <Badge color={ps.c} bg={ps.bg}>{s.progress}</Badge>
                    {(s.tags||[]).map(tag => <Badge key={tag} color={T.acc} bg={T.accA}><Tag size={10}/>{tag}</Badge>)}
                  </div>
                  {/* Task badges */}
                  {(s.taskAssigned || s.taskCompleted !== null) && (
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:8 }}>
                      {s.taskCompleted === true  && <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 9px", borderRadius:9999, background:T.sucA, color:T.suc, fontSize:11, fontWeight:700, fontFamily:T.fB }}><Check size={10}/>Tarea completada</span>}
                      {s.taskCompleted === false && <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 9px", borderRadius:9999, background:T.warA, color:T.war, fontSize:11, fontWeight:700, fontFamily:T.fB }}>✗ Tarea no completada</span>}
                      {s.taskAssigned && <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 9px", borderRadius:9999, background:T.pA, color:T.p, fontSize:11, fontWeight:600, fontFamily:T.fB }}><ClipboardCheck size={10}/>Tarea: {s.taskAssigned.slice(0,40)}{s.taskAssigned.length>40?"…":""}</span>}
                    </div>
                  )}
                </div>
                <div style={{ display:"flex", gap:5, flexShrink:0, flexDirection:"column" }}>
                  <div style={{ display:"flex", gap:5 }}>
                    <button onClick={() => duplicate(s)} title="Usar como plantilla" style={{ background:T.pA, border:"none", borderRadius:8, padding:8, cursor:"pointer", color:T.p }}><Copy size={14}/></button>
                    <button onClick={() => openReferral(s)} title="Carta de derivación" style={{ background:T.accA, border:"none", borderRadius:8, padding:8, cursor:"pointer", color:T.acc }}><Send size={14}/></button>
                    <button onClick={() => printNote(s, patients)} title="Exportar nota PDF" style={{ background:T.bdrL, border:"none", borderRadius:8, padding:8, cursor:"pointer", color:T.tm }}><Printer size={15}/></button>
                    <button onClick={() => del(s.id)} style={{ background:"none", border:"none", color:T.tl, cursor:"pointer", padding:8 }}><Trash2 size={15}/></button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })
      }

      {/* ── New/duplicate modal ──────────────────────────────────────── */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nueva nota de sesión" width={620}>
        <Select label="Paciente *" value={form.patientId} onChange={fld("patientId")}
          options={[{value:"",label:"Seleccionar paciente..."}, ...patients.map(p => ({value:p.id, label:p.name}))]}/>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
          <Input label="Fecha"          value={form.date}     onChange={fld("date")}     type="date"/>
          <Input label="Duración (min)" value={form.duration} onChange={fld("duration")} type="number"/>
          <Select label="Progreso"      value={form.progress} onChange={fld("progress")}
            options={["excelente","bueno","moderado","bajo"].map(p => ({value:p,label:p}))}/>
        </div>
        <Select label="Estado de ánimo" value={form.mood} onChange={fld("mood")}
          options={["bueno","moderado","bajo"].map(p => ({value:p,label:p}))}/>

        <FormatSelector value={form.noteFormat} onChange={handleFormatChange}/>

        {isStructured
          ? <StructuredFields formatId={form.noteFormat} structured={form.structured||{}} onChange={handleStructuredChange}/>
          : <Textarea label="Notas clínicas *" value={form.notes} onChange={fld("notes")}
              placeholder="Describe la sesión, intervenciones y respuesta del paciente..." rows={5}/>
        }

        <Input label="Etiquetas (separadas por coma)" value={form.tags} onChange={fld("tags")} placeholder="TCC, ansiedad, respiración"/>

        {/* ── Tareas terapéuticas ───────────────────────────────────── */}
        <div style={{ border:`1.5px solid ${T.bdr}`, borderRadius:12, overflow:"hidden", marginBottom:16 }}>
          <div style={{ padding:"10px 16px", background:T.pA, borderBottom:`1px solid ${T.bdrL}` }}>
            <label style={{ fontSize:11, fontWeight:700, color:T.p, textTransform:"uppercase", letterSpacing:"0.07em", display:"flex", alignItems:"center", gap:6 }}>
              <ClipboardCheck size={13}/> Tareas terapéuticas
            </label>
          </div>
          <div style={{ padding:"14px 16px", background:T.card }}>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:"block", fontSize:11, fontWeight:600, color:T.tm, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:7 }}>¿Completó la tarea de la sesión anterior?</label>
              <div style={{ display:"flex", gap:7 }}>
                {[{v:null,l:"No aplica"},{v:true,l:"✓ Sí"},{v:false,l:"✗ No"}].map(({v,l}) => {
                  const on = form.taskCompleted === v;
                  const c = v===true?T.suc:v===false?T.err:T.tm;
                  const bg = v===true?T.sucA:v===false?T.errA:T.bdrL;
                  return <button key={String(v)} onClick={() => fld("taskCompleted")(v)} style={{ flex:1, padding:"8px 6px", border:`1.5px solid ${on?c:T.bdr}`, borderRadius:10, background:on?bg:"transparent", cursor:"pointer", fontFamily:T.fB, fontSize:12.5, fontWeight:on?700:400, color:on?c:T.tm, transition:"all .13s" }}>{l}</button>;
                })}
              </div>
            </div>
            <div>
              <label style={{ display:"block", fontSize:11, fontWeight:600, color:T.tm, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>Tarea para la próxima sesión</label>
              <input value={form.taskAssigned} onChange={e => fld("taskAssigned")(e.target.value)}
                placeholder="Ej. Registrar pensamientos automáticos 3 veces esta semana..."
                style={{ width:"100%", padding:"10px 14px", border:`1.5px solid ${T.bdr}`, borderRadius:10, fontFamily:T.fB, fontSize:13.5, color:T.t, background:T.card, outline:"none", boxSizing:"border-box" }}/>
            </div>
          </div>
        </div>

        {/* ── Notas de supervisión privadas ────────────────────────── */}
        <div style={{ border:`1.5px solid ${form.privateNotes?"rgba(107,91,158,0.4)":T.bdr}`, borderRadius:12, overflow:"hidden", marginBottom:16, transition:"border .15s" }}>
          <div style={{ padding:"10px 16px", background:form.privateNotes?"rgba(107,91,158,0.08)":T.bdrL, display:"flex", alignItems:"center", gap:6 }}>
            <Lock size={12} color={form.privateNotes?"#6B5B9E":T.tl}/>
            <label style={{ fontSize:11, fontWeight:700, color:form.privateNotes?"#6B5B9E":T.tm, textTransform:"uppercase", letterSpacing:"0.07em" }}>
              Notas de supervisión <span style={{ fontWeight:400, textTransform:"none", letterSpacing:0, fontSize:11 }}>(privadas — no se exportan)</span>
            </label>
          </div>
          <textarea value={form.privateNotes} onChange={e => fld("privateNotes")(e.target.value)} rows={3}
            placeholder="Reflexiones personales, hipótesis no confirmadas, notas para supervisión clínica..."
            style={{ width:"100%", padding:"12px 16px", border:"none", outline:"none", fontFamily:T.fB, fontSize:13.5, color:T.t, background:T.card, resize:"vertical", boxSizing:"border-box", lineHeight:1.65 }}/>
        </div>
        <div style={{ border:`1.5px solid ${riskOpen?"rgba(184,80,80,0.3)":T.bdr}`, borderRadius:12, overflow:"hidden", marginBottom:16, transition:"border .15s" }}>
          <button onClick={() => setRiskOpen(o => !o)}
            style={{ display:"flex", alignItems:"center", justifyContent:"space-between", width:"100%", padding:"11px 16px", background:riskOpen?"rgba(184,80,80,0.06)":T.bdrL, border:"none", cursor:"pointer", fontFamily:T.fB, fontSize:13, fontWeight:600, color:riskOpen?T.err:T.tm, transition:"all .15s" }}>
            <span style={{ display:"flex", alignItems:"center", gap:7 }}>
              <ShieldAlert size={14}/> Pantalla de riesgo rápida
              {(quickRisk.suicidalIdeation!=="ninguna"||quickRisk.selfHarm!=="ninguna"||quickRisk.harmToOthers) && (
                <span style={{ padding:"1px 8px", borderRadius:9999, background:T.errA, color:T.err, fontSize:10, fontWeight:700 }}>ACTIVO</span>
              )}
            </span>
            {riskOpen ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
          </button>
          {riskOpen && (
            <div style={{ padding:"16px 16px 4px", background:T.card }}>
              <div style={{ fontFamily:T.fB, fontSize:12, color:T.tm, marginBottom:14 }}>
                Registro rápido. Para evaluación completa usa el módulo <strong>Riesgo</strong>.
              </div>
              {[
                { field:"suicidalIdeation", label:"Ideación suicida", opts:[{v:"ninguna",c:T.suc,bg:T.sucA},{v:"pasiva",c:T.war,bg:T.warA},{v:"activa",c:T.err,bg:T.errA}] },
                { field:"selfHarm",         label:"Autolesiones",     opts:[{v:"ninguna",c:T.suc,bg:T.sucA},{v:"pasada",label:"Historial",c:T.war,bg:T.warA},{v:"activa",c:T.err,bg:T.errA}] },
              ].map(({ field, label, opts }) => (
                <div key={field} style={{ marginBottom:14 }}>
                  <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.tm, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:8 }}>{label}</label>
                  <div style={{ display:"flex", gap:7 }}>
                    {opts.map(({ v, label:l, c, bg }) => {
                      const on = quickRisk[field] === v;
                      return <button key={v} onClick={() => rld(field)(v)} style={{ flex:1, padding:"9px 6px", border:`2px solid ${on?c:T.bdr}`, borderRadius:10, background:on?bg:"transparent", cursor:"pointer", fontFamily:T.fB, fontSize:12.5, fontWeight:on?700:400, color:on?c:T.tm, transition:"all .15s", textTransform:"capitalize" }}>{l||v}</button>;
                    })}
                  </div>
                </div>
              ))}
              <div onClick={() => rld("harmToOthers")(!quickRisk.harmToOthers)}
                style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", background:quickRisk.harmToOthers?T.errA:T.bdrL, borderRadius:10, marginBottom:16, cursor:"pointer", border:`1.5px solid ${quickRisk.harmToOthers?T.err:"transparent"}`, transition:"all .15s" }}>
                <span style={{ fontFamily:T.fB, fontSize:13, color:quickRisk.harmToOthers?T.err:T.t }}>¿Riesgo a terceros?</span>
                <div style={{ width:20, height:20, borderRadius:6, background:quickRisk.harmToOthers?T.err:T.bdr, display:"flex", alignItems:"center", justifyContent:"center", transition:"all .15s" }}>
                  {quickRisk.harmToOthers && <Check size={12} color="#fff" strokeWidth={2.5}/>}
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <Btn variant="ghost" onClick={() => setShowAdd(false)}>Cancelar</Btn>
          <Btn onClick={save} disabled={!canSave}><Check size={15}/> Guardar nota</Btn>
        </div>
      </Modal>

      {/* ── Referral modal ───────────────────────────────────────────── */}
      <Modal open={!!referral} onClose={() => setReferral(null)} title="Carta de Derivación" width={520}>
        {referral && (
          <>
            <div style={{ padding:"12px 16px", background:T.pA, borderRadius:10, marginBottom:20 }}>
              <div style={{ fontFamily:T.fB, fontSize:14, fontWeight:600, color:T.p }}>{referral.patient?.name||"Paciente"}</div>
              <div style={{ fontFamily:T.fB, fontSize:12, color:T.tm }}>{referral.patient?.diagnosis||"Sin diagnóstico registrado"}</div>
            </div>
            <Input label="Derivar a (especialidad / servicio)" value={refForm.specialist} onChange={rfld("specialist")} placeholder="Ej. Psiquiatría, Neurología, Trabajo Social"/>
            <Textarea label="Motivo de derivación *" value={refForm.reason} onChange={rfld("reason")} placeholder="Describe el motivo por el que se deriva al paciente..." rows={3}/>
            <Textarea label="Información clínica adicional" value={refForm.notes} onChange={rfld("notes")} placeholder="Tratamiento actual, observaciones para el especialista..." rows={3}/>
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <Btn variant="ghost" onClick={() => setReferral(null)}>Cancelar</Btn>
              <Btn variant="accent" onClick={() => { printReferral(referral.patient, referral.session, profile, refForm); setReferral(null); }} disabled={!refForm.reason.trim()}>
                <Printer size={14}/> Generar carta PDF
              </Btn>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
