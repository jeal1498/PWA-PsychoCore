// ─────────────────────────────────────────────────────────────────────────────
// Sessions.jsx
// UI principal + subcomponentes visuales del módulo Sessions.
// Estado y lógica delegados a useSessions.js
// Constantes y helpers puros en sessions.utils.js
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useMemo, useEffect, useRef } from "react";
import {
  FileText, Trash2, Printer, Tag, Check, Plus, Send, Copy,
  ShieldAlert, AlertTriangle, ChevronDown, ChevronUp,
  LayoutList, ClipboardCheck, Lock, Eye, Sparkles, X,
  ShieldCheck, Download, FileCheck, ChevronRight,
} from "lucide-react";
import { printNotaEvolucion, printConsentimientoInformado, printPlanSeguridad, printReferralLetter } from "../../utils/pdfUtils.js";
import { T } from "../../theme.js";
import { uid, todayDate, fmt, fmtDate, moodIcon, moodColor, progressStyle } from "../../utils.js";
import { Card, Badge, Modal, Input, Textarea, Select, Btn, EmptyState, PageHeader } from "../../components/ui/index.jsx";
import { RISK_CONFIG } from "../RiskAssessment/riskAssessment.utils.js";
import { TASK_TEMPLATES } from "../../lib/taskTemplates.js";
import { getResponsesByAssignment } from "../../lib/supabase.js";

import { useSessions } from "./useSessions.js";
import {
  NOTE_FORMATS, NOTE_TEMPLATES,
  AZUL, AZUL_A, LAVANDA, LAVANDA_A, MALVA, MALVA_A,
  BLANK_RISK, PORTAL_URL,
  compileNotes, blankStructured, getSessionFolio,
} from "./sessions.utils.js";

// MoodProgressPicker — botones visuales de un clic para Ánimo y Progreso
// Valores mood: "bajo"|"moderado"|"bueno"  (crítico: alimentan moodIcon() en utils.js)
// Valores progress: "excelente"|"bueno"|"moderado"|"bajo"  (crítico: alimentan progressStyle())
function MoodProgressPicker({ mood, progress, onMood, onProgress }) {
  const MOOD_OPTS = [
    { value:"bajo",     label:"Bajo",     icon:"😟" },
    { value:"moderado", label:"Moderado", icon:"😐" },
    { value:"bueno",    label:"Bueno",    icon:"🙂" },
  ];
  const PROGRESS_OPTS = [
    { value:"excelente", label:"Excelente", icon:"↗" },
    { value:"bueno",     label:"Bueno",     icon:"→" },
    { value:"moderado",  label:"Moderado",  icon:"↔" },
    { value:"bajo",      label:"Bajo",      icon:"↘" },
  ];
  const pill = (opt, active, onSelect) => (
    <button
      key={opt.value}
      onClick={() => onSelect(opt.value)}
      style={{
        flex:1, padding:"8px 4px", borderRadius:9,
        border:`1.5px solid ${active ? T.p : T.bdr}`,
        background: active ? T.pA : "transparent",
        color: active ? T.p : T.tm,
        fontFamily:T.fB, fontSize:12, fontWeight: active ? 700 : 400,
        cursor:"pointer", transition:"all .13s", textAlign:"center",
        display:"flex", alignItems:"center", justifyContent:"center", gap:4,
      }}>
      <span style={{ fontSize:13, lineHeight:1 }}>{opt.icon}</span>
      {opt.label}
    </button>
  );
  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
      <div>
        <label style={{ display:"block", fontSize:12, fontWeight:600, color:T.tm, marginBottom:8, letterSpacing:"0.06em", textTransform:"uppercase" }}>Ánimo</label>
        <div style={{ display:"flex", gap:4 }}>
          {MOOD_OPTS.map(opt => pill(opt, mood === opt.value, onMood))}
        </div>
      </div>
      <div>
        <label style={{ display:"block", fontSize:12, fontWeight:600, color:T.tm, marginBottom:8, letterSpacing:"0.06em", textTransform:"uppercase" }}>Progreso</label>
        <div style={{ display:"flex", gap:4 }}>
          {PROGRESS_OPTS.map(opt => pill(opt, progress === opt.value, onProgress))}
        </div>
      </div>
    </div>
  );
}

function FormatSelector({ value, onChange }) {
  // [mobile-audit] Patrón 1: hook local para detectar mobile sin prop drilling
  const [_fsMobile, _setFsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  useEffect(() => {
    const _fsOnResize = () => _setFsMobile(window.innerWidth < 768);
    window.addEventListener("resize", _fsOnResize);
    return () => window.removeEventListener("resize", _fsOnResize);
  }, []);
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display:"block", fontSize:12, fontWeight:600, color:T.tm, marginBottom:8, letterSpacing:"0.06em", textTransform:"uppercase" }}>
        Formato de nota
      </label>
      {/* [mobile-audit] Patrón 1: grid 4 col fijo → 2 col en mobile */}
      <div style={{ display:"grid", gridTemplateColumns:_fsMobile ? "1fr 1fr" : "repeat(4,1fr)", gap:6 }}>
        {Object.values(NOTE_FORMATS).map(fd => {
          const active = value === fd.id;
          return (
            <button key={fd.id} onClick={() => onChange(fd.id)}
              style={{ padding:"8px 4px", borderRadius:10, border:`1.5px solid ${active ? fd.color : T.bdr}`, background:active ? fd.bg : "transparent", color:active ? fd.color : T.tm, fontFamily:T.fB, fontSize:12.5, fontWeight:active?700:400, cursor:"pointer", transition:"all .13s", textAlign:"center", width:"100%" }}>
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
      <div style={{ marginBottom:6 }}>
        <span style={{ fontFamily:T.fB, fontSize:13, color:T.tm, lineHeight:1.6,
          display:"-webkit-box", WebkitLineClamp: expanded ? 99 : 2,
          WebkitBoxOrient:"vertical", overflow:"hidden" }}>
          {previewText}
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


// ── TemplatePanel ─────────────────────────────────────────────────────────────
function TemplatePanel({ patient, noteFormat, onApply, onClose }) {
  const dx = ((patient?.diagnosis || "") + " " + (patient?.cie11Code || "")).toLowerCase();

  // Find matching templates
  const matches = Object.values(NOTE_TEMPLATES).filter(tpl =>
    tpl.match.some(m => dx.includes(m.toLowerCase()))
  );
  const available = matches.length > 0 ? matches : Object.values(NOTE_TEMPLATES);
  const [sel, setSel] = useState(available[0]?.label || "");

  const current = Object.values(NOTE_TEMPLATES).find(t => t.label === sel) || available[0];
  const fields = current?.[noteFormat];

  if (noteFormat === "libre") return (
    <div style={{ padding:"16px 20px", background:T.warA, borderRadius:12, marginBottom:12, fontFamily:T.fB, fontSize:13, color:T.war }}>
      Las plantillas están disponibles para formatos SOAP, DAP y BIRP.
    </div>
  );

  return (
    <div style={{ border:`1.5px solid ${T.bdr}`, borderRadius:14, overflow:"hidden", marginBottom:16 }}>
      {/* Header */}
      <div style={{ padding:"10px 16px", background:T.pA, borderBottom:`1px solid ${T.bdrL}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontFamily:T.fB, fontSize:11, fontWeight:700, color:T.p, textTransform:"uppercase", letterSpacing:"0.07em" }}>
          🗒 Plantillas clínicas — {noteFormat}
        </span>
        <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:T.tl, fontFamily:T.fB, fontSize:12 }}>✕</button>
      </div>
      {/* Selector */}
      <div style={{ padding:"12px 16px", background:T.cardAlt, borderBottom:`1px solid ${T.bdrL}`, display:"flex", gap:6, flexWrap:"wrap" }}>
        {available.map(t => (
          <button key={t.label} onClick={() => setSel(t.label)}
            style={{ padding:"5px 12px", borderRadius:9999, border:`1.5px solid ${sel===t.label?T.p:T.bdrL}`,
              background:sel===t.label?T.pA:"transparent", color:sel===t.label?T.p:T.tm,
              fontFamily:T.fB, fontSize:11.5, fontWeight:sel===t.label?700:400, cursor:"pointer", transition:"all .12s" }}>
            {t.label}
          </button>
        ))}
      </div>
      {/* Preview + apply */}
      {fields ? (
        <div style={{ padding:"14px 16px" }}>
          {Object.entries(fields).map(([k, v]) => (
            <div key={k} style={{ marginBottom:10 }}>
              <span style={{ fontFamily:T.fB, fontSize:10, fontWeight:700, color:T.p, textTransform:"uppercase", letterSpacing:"0.08em", marginRight:8 }}>{k}</span>
              <span style={{ fontFamily:T.fB, fontSize:12, color:T.tm, lineHeight:1.55 }}>{v.length > 90 ? v.slice(0,90)+"…" : v}</span>
            </div>
          ))}
          <Btn onClick={() => { onApply(fields); onClose(); }} style={{ marginTop:4 }}>
            <Check size={13}/> Aplicar plantilla
          </Btn>
          <p style={{ fontFamily:T.fB, fontSize:11, color:T.tl, marginTop:8 }}>
            Los campos con _ son para completar. El texto se aplica a los campos del formato {noteFormat}.
          </p>
        </div>
      ) : (
        <div style={{ padding:"16px", fontFamily:T.fB, fontSize:13, color:T.tl }}>
          Plantilla no disponible para formato {noteFormat}.
        </div>
      )}
    </div>
  );
}


// ── AI Summary ────────────────────────────────────────────────────────────────
async function generateAISummary({ notes, structured, noteFormat, patientName, diagnosis, duration, mood, progress }) {
  const notesText = noteFormat !== "libre" && structured
    ? Object.entries(structured).map(([k, v]) => `${k.toUpperCase()}: ${v}`).join("\n")
    : notes;

  if (!notesText?.trim()) return null;

  const prompt = `Eres un asistente clínico especializado en psicología. El psicólogo ha escrito las siguientes notas de una sesión${patientName ? ` con ${patientName}` : ""}${diagnosis ? ` (${diagnosis})` : ""}.

Duración: ${duration} min | Estado de ánimo: ${mood} | Progreso: ${progress}

NOTAS:
${notesText}

Genera un resumen clínico estructurado y conciso con estas secciones:
1. **Puntos clave de la sesión** (2-3 oraciones)
2. **Intervenciones utilizadas** (lista breve)
3. **Respuesta del paciente**
4. **Seguimiento recomendado** (qué trabajar en la próxima sesión)

Responde en español, tono profesional clínico. Máximo 200 palabras.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  return data.content?.[0]?.text || null;
}

// ── Task response viewer modal ────────────────────────────────────────────────
function TaskResponseModal({ assignment, template, onClose }) {
  const [responses, setResponses] = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    getResponsesByAssignment(assignment.id)
      .then(setResponses)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [assignment.id]);

  return (
    <Modal open onClose={onClose} title={`Respuestas — ${assignment.patient_name?.split(" ")[0]}`} width={520}>
      <div style={{ fontFamily:T.fB, fontSize:13, color:T.tm, marginBottom:16, display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ fontSize:20 }}>{template?.icon}</span>
        <div>
          <div style={{ fontWeight:600, color:T.t }}>{template?.title}</div>
          <div style={{ fontSize:11, color:T.tl }}>
            Completada {new Date(assignment.completed_at).toLocaleDateString("es-MX",{day:"numeric",month:"long",year:"numeric"})}
          </div>
        </div>
      </div>
      {loading && (
        <div style={{ textAlign:"center", padding:32 }}>
          <div style={{ width:28, height:28, borderRadius:"50%", border:`3px solid ${T.bdrL}`, borderTopColor:T.p, margin:"0 auto", animation:"spin .8s linear infinite" }}/>
        </div>
      )}
      {!loading && responses.length === 0 && (
        <div style={{ textAlign:"center", padding:"24px 0", color:T.tl, fontFamily:T.fB, fontSize:13 }}>
          Sin respuestas registradas.
        </div>
      )}
      {!loading && responses.map((resp, ri) => (
        <div key={resp.id} style={{ marginBottom: ri < responses.length - 1 ? 20 : 0 }}>
          {template?.fields.map(field => {
            const val = resp.responses?.[field.key];
            if (!val) return null;
            return (
              <div key={field.key} style={{ marginBottom:12 }}>
                <div style={{ fontFamily:T.fB, fontSize:11, fontWeight:700, color:T.p, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:5 }}>
                  {field.label}
                </div>
                <div style={{ padding:"10px 14px", background:T.cardAlt, borderRadius:10, border:`1px solid ${T.bdrL}`, fontFamily:T.fB, fontSize:13.5, color:T.t, lineHeight:1.65 }}>
                  {field.type === "scale10"
                    ? <span style={{ fontWeight:700, fontSize:20, color: Number(val)<=3?T.suc:Number(val)<=6?T.war:T.err }}>{val}/10</span>
                    : val
                  }
                </div>
              </div>
            );
          })}
        </div>
      ))}
      <div style={{ display:"flex", justifyContent:"flex-end", marginTop:8 }}>
        <Btn variant="ghost" onClick={onClose}>Cerrar</Btn>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CLINICAL REFERENCE PANEL — Fase 1: Cerebro Clínico
// Columna lateral sticky (desktop) / Acordeón colapsable (mobile < 768px)
// ─────────────────────────────────────────────────────────────────────────────
function ClinicalReferencePanel({ patientId, sessions, treatmentPlans, isMobile, riskAssessments = [], patients = [] }) {
  const [accordionOpen, setAccordionOpen] = useState(true);

  // ── Última nota de sesión del paciente (por fecha desc) ─────────────────────
  const lastSession = useMemo(() => {
    if (!patientId) return null;
    return [...sessions]
      .filter(s => s.patientId === patientId)
      .sort((a, b) => b.date.localeCompare(a.date))[0] || null;
  }, [patientId, sessions]);

  // ── Objetivos activos del plan de tratamiento vigente ───────────────────────
  const { activePlan, activeGoals } = useMemo(() => {
    if (!patientId) return { activePlan: null, activeGoals: [] };
    const plans = [...treatmentPlans]
      .filter(tp => tp.patientId === patientId)
      .sort((a, b) =>
        (b.createdAt || b.date || "").localeCompare(a.createdAt || a.date || "")
      );
    const plan = plans[0] || null;
    if (!plan) return { activePlan: null, activeGoals: [] };
    const goals = (plan.goals || []).filter(
      g => g.status !== "completado" && g.status !== "abandonado"
    );
    return { activePlan: plan, activeGoals: goals };
  }, [patientId, treatmentPlans]);

  if (!patientId) return null;

  // ── ETAPA 3: Detectar riesgo activo persistido en el perfil del paciente ─────
  const patientObj = patients.find(p => p.id === patientId);
  const hasActiveRiskAlert = !!(patientObj?.activeRiskAlert);
  const activeRiskData = patientObj?.activeRiskAlert || null;

  const GOAL_STATUS_CFG = {
    "activo":      { color: T.p,   bg: T.pA,   label: "Activo"      },
    "en progreso": { color: T.war, bg: T.warA,  label: "En progreso" },
    "iniciado":    { color: T.suc, bg: T.sucA,  label: "Iniciado"    },
    "pausado":     { color: T.tm,  bg: T.bdrL,  label: "Pausado"     },
  };

  // ── Contenido compartido del panel ──────────────────────────────────────────
  const panelContent = (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

      {/* ETAPA 3 — Banner de riesgo activo: visible antes de iniciar la sesión */}
      {hasActiveRiskAlert && (
        <div style={{
          display:"flex", alignItems:"flex-start", gap:10, padding:"12px 14px",
          background:T.errA, border:`2px solid ${T.err}59`,
          borderRadius:12, animation:"pulseRisk 2s ease-in-out infinite"
        }}>
          <ShieldAlert size={18} color={T.err} style={{ flexShrink:0, marginTop:1 }}/>
          <div>
            <div style={{ fontFamily:T.fB, fontSize:12, fontWeight:700, color:T.err, marginBottom:3 }}>
              ⚠ Paciente con Riesgo Activo
            </div>
            <div style={{ fontFamily:T.fB, fontSize:11, color:T.err, lineHeight:1.5, opacity:0.9 }}>
              Nivel {(activeRiskData?.level||"—").toUpperCase()} desde {activeRiskData?.date ? new Date(activeRiskData.date).toLocaleDateString("es-MX",{day:"numeric",month:"short"}) : "—"}.
              Revisa el módulo Riesgo antes de iniciar.
            </div>
          </div>
        </div>
      )}

      {/* Última sesión */}
      <div>
        <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:9,
          fontFamily:T.fB, fontSize:10, fontWeight:700, color:T.p,
          textTransform:"uppercase", letterSpacing:"0.09em" }}>
          <FileText size={11}/> Última sesión
        </div>
        {lastSession ? (
          <div style={{ background:T.cardAlt, borderRadius:10, padding:"11px 13px", border:`1px solid ${T.bdrL}` }}>
            <div style={{ fontFamily:T.fB, fontSize:11, color:T.tl, marginBottom:6 }}>
              {fmtDate(lastSession.date)} · {lastSession.duration} min · {lastSession.mood}
            </div>
            <div style={{ fontFamily:T.fB, fontSize:12, color:T.tm, lineHeight:1.65,
              display:"-webkit-box", WebkitLineClamp:4, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
              {lastSession.noteFormat !== "libre" && lastSession.structured
                ? Object.entries(lastSession.structured)
                    .filter(([, v]) => v?.trim())
                    .map(([k, v]) => `[${k}] ${v.slice(0, 80)}`)
                    .join(" ")
                : (lastSession.notes || "").slice(0, 280)}
            </div>
            <div style={{ display:"flex", gap:5, marginTop:8, flexWrap:"wrap" }}>
              {(() => { const ps = progressStyle(lastSession.progress); return <Badge color={ps.c} bg={ps.bg}>{lastSession.progress}</Badge>; })()}
              {(lastSession.tags || []).slice(0, 2).map(t => (
                <Badge key={t} color={T.acc} bg={T.accA}><Tag size={8}/>{t}</Badge>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ background:T.bdrL, borderRadius:10, padding:"12px 13px",
            fontFamily:T.fB, fontSize:12, color:T.tl, textAlign:"center", lineHeight:1.5 }}>
            Sin sesiones previas registradas
          </div>
        )}
      </div>

      {/* Objetivos del plan de tratamiento */}
      <div>
        <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:9,
          fontFamily:T.fB, fontSize:10, fontWeight:700, color:T.p,
          textTransform:"uppercase", letterSpacing:"0.09em" }}>
          <LayoutList size={11}/> Objetivos activos
        </div>
        {activePlan && activeGoals.length > 0 ? (
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {activeGoals.slice(0, 6).map((goal, i) => {
              const cfg = GOAL_STATUS_CFG[goal.status] || GOAL_STATUS_CFG["activo"];
              return (
                <div key={goal.id || i} style={{ background:T.cardAlt, borderRadius:9, padding:"9px 11px", border:`1px solid ${T.bdrL}` }}>
                  <div style={{ fontFamily:T.fB, fontSize:12, color:T.t, lineHeight:1.55, marginBottom:6,
                    display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
                    {goal.objective || goal.description || goal.text || `Objetivo ${i + 1}`}
                  </div>
                  <span style={{ display:"inline-flex", alignItems:"center", padding:"2px 8px",
                    borderRadius:9999, background:cfg.bg, color:cfg.color,
                    fontFamily:T.fB, fontSize:10, fontWeight:700, textTransform:"capitalize" }}>
                    {cfg.label}
                  </span>
                </div>
              );
            })}
            {activeGoals.length > 6 && (
              <div style={{ fontFamily:T.fB, fontSize:11, color:T.tl, textAlign:"center", padding:"3px 0" }}>
                +{activeGoals.length - 6} objetivo{activeGoals.length - 6 !== 1 ? "s" : ""} más
              </div>
            )}
          </div>
        ) : activePlan ? (
          <div style={{ background:T.sucA, borderRadius:10, padding:"11px 13px",
            fontFamily:T.fB, fontSize:12, color:T.suc, textAlign:"center" }}>
            🎯 Sin objetivos activos pendientes
          </div>
        ) : (
          // EmptyState discreto cuando no hay plan de tratamiento
          <div style={{ background:T.bdrL, borderRadius:10, padding:"14px 13px",
            fontFamily:T.fB, fontSize:12, color:T.tl, textAlign:"center", lineHeight:1.7 }}>
            Sin plan de tratamiento activo.{" "}
            <span style={{ color:T.p, fontWeight:600 }}>
              Crea uno en el módulo Tratamiento.
            </span>
          </div>
        )}
      </div>
    </div>
  );

  // ── Mobile: acordeón colapsable ─────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ marginBottom:16, border:`1.5px solid ${accordionOpen ? T.p : T.bdr}`,
        borderRadius:12, overflow:"hidden", transition:"border .15s" }}>
        <button
          onClick={() => setAccordionOpen(o => !o)}
          style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between",
            padding:"11px 16px", background:T.pA, border:"none", cursor:"pointer",
            fontFamily:T.fB, fontSize:11.5, fontWeight:700, color:T.p,
            letterSpacing:"0.05em", textTransform:"uppercase" }}>
          <span style={{ display:"flex", alignItems:"center", gap:6 }}>
            <FileText size={13}/> Contexto clínico del paciente
          </span>
          {accordionOpen ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
        </button>
        {accordionOpen && (
          <div style={{ padding:"14px 16px", background:T.card, borderTop:`1px solid ${T.bdrL}` }}>
            {panelContent}
          </div>
        )}
      </div>
    );
  }

  // ── Desktop: columna lateral sticky ────────────────────────────────────────
  return (
    <div style={{ position:"sticky", top:0, width:290, flexShrink:0 }}>
      <div style={{ borderRadius:12, border:`1.5px solid ${T.bdrL}`, overflow:"hidden", background:T.card }}>
        <div style={{ padding:"11px 14px", background:T.pA, borderBottom:`1px solid ${T.bdrL}` }}>
          <div style={{ fontFamily:T.fB, fontSize:10, fontWeight:700, color:T.p,
            textTransform:"uppercase", letterSpacing:"0.09em" }}>
            📋 Contexto clínico
          </div>
        </div>
        <div style={{ padding:"14px 14px", maxHeight:"calc(80vh - 80px)", overflowY:"auto" }}>
          {panelContent}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ExportMenu — Menú flotante de exportación PDF por sesión
// Diseño: cards con icon+label+descripción, hover colorido, badge de riesgo
// ─────────────────────────────────────────────────────────────────────────────
function ExportMenu({ session, patient, profile, riskAssessments, allSessions, noteFormats, onClose }) {
  const folio       = getSessionFolio(session, allSessions);
  const folioLabel  = folio ? `S-${String(folio).padStart(4, "0")}` : null;
  const sessionRisk = riskAssessments?.find(ra => ra.sessionId === session.id);
  const hasRisk     = !!(sessionRisk && (
    sessionRisk.suicidalIdeation !== "ninguna" ||
    sessionRisk.selfHarm         !== "ninguna" ||
    sessionRisk.harmToOthers
  ));
  const riskLevel = sessionRisk?.riskLevel || "moderado";
  const RISK_LABEL = { alto:"Alto", moderado:"Moderado", bajo:"Bajo", inminente:"Inminente" };

  const items = [
    {
      icon:    FileText,
      label:   "Nota de Evolución",
      desc:    folioLabel ? `Folio ${folioLabel} · Formato ${session.noteFormat?.toUpperCase() || "Libre"}` : `Formato ${session.noteFormat?.toUpperCase() || "Libre"}`,
      accent:  T.p,
      accentA: "rgba(58,107,110,0.10)",
      border:  "rgba(58,107,110,0.22)",
      badge:   null,
      action:  () => { printNotaEvolucion(session, patient, profile, riskAssessments, folio, noteFormats); onClose(); },
    },
    {
      icon:    FileCheck,
      label:   "Consentimiento Informado",
      desc:    "Pre-llenado con datos del paciente",
      accent:  LAVANDA,
      accentA: LAVANDA_A,
      border:  "rgba(107,91,158,0.22)",
      badge:   null,
      action:  () => { printConsentimientoInformado(patient, profile); onClose(); },
    },
    ...(hasRisk ? [{
      icon:    ShieldCheck,
      label:   "Plan de Seguridad",
      desc:    `Para entregar al paciente antes de salir`,
      accent:  T.err,
      accentA: "rgba(184,80,80,0.09)",
      border:  "rgba(184,80,80,0.28)",
      badge:   `Riesgo ${RISK_LABEL[riskLevel] || riskLevel}`,
      badgeClr:T.err,
      action:  () => { printPlanSeguridad(sessionRisk?.safetyPlan, patient, profile, riskLevel); onClose(); },
    }] : []),
  ];

  const menuRef = useRef(null);
  const [moreOpen, setMoreOpen] = useState(false);

  // Render reutilizable de card secundaria (items[1..N])
  const renderCard = (item) => {
    const CardIcon = item.icon;
    return (
      <button
        key={item.label}
        onClick={item.action}
        style={{
          width:"100%", display:"flex", alignItems:"center", gap:12,
          padding:"11px 12px", background:"none",
          border:`1.5px solid transparent`,
          borderRadius:11, cursor:"pointer", textAlign:"left",
          transition:"all .14s", marginBottom:4,
          fontFamily:T.fB,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = item.accentA;
          e.currentTarget.style.borderColor = item.border;
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = "none";
          e.currentTarget.style.borderColor = "transparent";
        }}>
        {/* Icon bubble */}
        <div style={{
          width:38, height:38, borderRadius:10, flexShrink:0,
          background: item.accentA,
          border:`1.5px solid ${item.border}`,
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>
          <CardIcon size={17} color={item.accent} strokeWidth={1.8}/>
        </div>
        {/* Text */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:2 }}>
            <span style={{ fontSize:13.5, fontWeight:700, color:T.t, lineHeight:1.3 }}>
              {item.label}
            </span>
            {item.badge && (
              <span style={{
                padding:"1px 7px", borderRadius:9999, flexShrink:0,
                background:`${item.badgeClr}16`, color:item.badgeClr,
                border:`1px solid ${item.badgeClr}35`,
                fontSize:9.5, fontWeight:700, letterSpacing:"0.04em",
              }}>
                {item.badge}
              </span>
            )}
          </div>
          <span style={{ fontSize:11, color:T.tl, lineHeight:1.4 }}>{item.desc}</span>
        </div>
        <ChevronRight size={14} color={T.tl} style={{ flexShrink:0 }}/>
      </button>
    );
  };

  return (
    <>
      {/* Overlay transparente para cerrar al hacer clic fuera */}
      <div
        style={{ position:"fixed", inset:0, zIndex:199 }}
        onClick={onClose}
      />
      <div
        ref={menuRef}
        style={{
          position:"absolute", zIndex:200, bottom:"calc(100% + 6px)", right:0,
          width:296, background:T.card,
          borderRadius:16, border:`1.5px solid ${T.bdr}`,
          boxShadow:"0 16px 48px rgba(0,0,0,0.16), 0 4px 12px rgba(0,0,0,0.08)",
          overflow:"hidden",
        }}>

        {/* Header del menú */}
        <div style={{
          padding:"11px 16px 10px",
          background:T.pA,
          borderBottom:`1px solid ${T.bdrL}`,
          display:"flex", alignItems:"center", justifyContent:"space-between",
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <Download size={12} color={T.p}/>
            <span style={{
              fontFamily:T.fB, fontSize:10.5, fontWeight:700, color:T.p,
              textTransform:"uppercase", letterSpacing:"0.08em",
            }}>
              Exportar documento
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background:"none", border:"none", cursor:"pointer",
              color:T.tl, width:22, height:22, borderRadius:6,
              display:"flex", alignItems:"center", justifyContent:"center",
              transition:"background .12s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = T.bdrL}
            onMouseLeave={e => e.currentTarget.style.background = "none"}>
            <X size={13}/>
          </button>
        </div>

        {/* Cuerpo */}
        <div style={{ padding:"10px 8px 4px" }}>

          {/* [1] Botón primario — items[0]: Nota de Evolución */}
          {(() => {
            const PrimaryIcon = items[0].icon;
            return (
              <button
                onClick={items[0].action}
                style={{
                  width:"100%", display:"flex", alignItems:"center", justifyContent:"center",
                  gap:8, padding:"10px 16px", marginBottom:8,
                  background:T.p, color:"#fff",
                  border:"none", borderRadius:11,
                  fontFamily:T.fB, fontSize:13.5, fontWeight:700,
                  cursor:"pointer", transition:"opacity .13s",
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = "0.88"}
                onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
                <PrimaryIcon size={14} strokeWidth={2}/>
                {items[0].label}
              </button>
            );
          })()}

          {/* [2] Toggle "Más opciones" — solo si hay items secundarios */}
          {items.length > 1 && (
            <button
              onClick={() => setMoreOpen(o => !o)}
              style={{
                width:"100%", padding:"7px 12px", marginBottom: moreOpen ? 6 : 0,
                background:"none", border:`1px solid ${T.bdrL}`,
                borderRadius:9, cursor:"pointer",
                fontFamily:T.fB, fontSize:12, color:T.tm,
                display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                transition:"all .13s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = T.p; e.currentTarget.style.color = T.p; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = T.bdrL; e.currentTarget.style.color = T.tm; }}>
              Más opciones <span style={{ fontSize:10 }}>{moreOpen ? "▴" : "▾"}</span>
            </button>
          )}

          {/* [3] Items secundarios items[1..N] — visibles cuando moreOpen */}
          {moreOpen && items.slice(1).map(renderCard)}
        </div>

        {/* Footer — aviso si no hay riesgo */}
        {!hasRisk && (
          <div style={{
            margin:"0 8px 8px",
            padding:"8px 12px",
            background:T.bdrL, borderRadius:8,
            fontFamily:T.fB, fontSize:11, color:T.tl, lineHeight:1.5,
            display:"flex", alignItems:"flex-start", gap:6,
          }}>
            <ShieldCheck size={13} color={T.tl} style={{ flexShrink:0, marginTop:1 }}/>
            <span>Plan de Seguridad disponible cuando hay indicadores de riesgo activos en la sesión.</span>
          </div>
        )}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────
export default function Sessions({
  sessions = [], setSessions,
  patients = [], setPatients,
  profile,
  prefill,
  riskAssessments = [], setRiskAssessments,
  services = [], setServices,
  setPayments, payments = [],
  treatmentPlans = [],
  appointments = [], setAppointments,
  interSessions = [], setInterSessions,
  onNavigate,
}) {
  const s = useSessions({
    sessions, setSessions, patients, setPatients, profile, prefill,
    riskAssessments, setRiskAssessments, services, setServices,
    setPayments, payments, appointments, setAppointments,
    interSessions, setInterSessions,
  });

  // Desestructuración completa del hook para mantener el JSX sin cambios
  const {
    isMobileView, isWide,
    form, setForm, fld, blankForm,
    filterPt, setFilterPt,
    showAdd, setShowAdd,
    patientLocked, setPatientLocked,
    referral, setReferral,
    refForm, setRefForm, rfld,
    riskOpen, setRiskOpen,
    quickRisk, setQuickRisk, rld,
    showTpl, setShowTpl,
    exportMenuId, setExportMenuId,
    showSafetyWizard, setShowSafetyWizard,
    pendingRiskSave, setPendingRiskSave,
    safetyPlanDraft, setSafetyPlanDraft,
    patientTasks,
    viewTaskResponse, setViewTaskResponse,
    taskError, setTaskError,
    serviceLocked, setServiceLocked,
    showQuickServiceForm, setShowQuickServiceForm,
    quickService, setQuickService,
    selectedServiceMeta,
    resolveServiceMeta, syncServiceSelection, getServiceOptions, addQuickService,
    SERVICE_TYPE_OPTIONS, SERVICE_MODALITY_OPTIONS, SERVICE_TYPE_LABEL, SERVICE_DURATION_BY_TYPE,
    showCobro, setShowCobro,
    cobroData, setCobroData,
    cobroForm, setCobroForm,
    showCobroModality, setShowCobroModality,
    handleCobroService, applyCobroModality, preloadCobroForPatient,
    saveCobro, skipCobro,
    showCloseWizard, setShowCloseWizard,
    closeCtx, setCloseCtx,
    closeStep, setCloseStep,
    closeInterForm, setCloseInterForm, cifld,
    closeNextAppt, setCloseNextAppt, cnfld,
    closeTaskTplId, setCloseTaskTplId,
    closeTaskNotes, setCloseTaskNotes,
    closeTaskAssigned, setCloseTaskAssigned,
    closeTaskSaving, setCloseTaskSaving,
    closeTaskError, setCloseTaskError,
    openCloseWizard, saveCloseIntersession, saveCloseNextAppt, whatsappNextAppt,
    aiSummary, setAiSummary,
    aiLoading, aiError,
    showAiModal, setShowAiModal,
    handleAISummary,
    toast, showToast,
    handleFormatChange, handleStructuredChange, handleApplyTemplate,
    filtered, isStructured, canSave,
    save, duplicate, del, openReferral,
    editingSessionId, setEditingSessionId,
    DRAFT_KEY, draftSavedAt,
    showDraftBanner, setShowDraftBanner,
    draftBannerData, setDraftBannerData,
  } = s;

  return (
    <div style={{ maxWidth: isWide ? "none" : 960, paddingBottom: 40 }}>
      <PageHeader title="Notas de Sesión"
        subtitle={`${sessions.length} nota${sessions.length!==1?"s":""} registrada${sessions.length!==1?"s":""}`}
        action={<Btn onClick={() => { setForm(blankForm); setServiceLocked(false); setShowAdd(true); }}><Plus size={15}/> Nueva nota</Btn>}
      />
      {/* Toast de error de tareas */}
      {taskError && (
        <div style={{ position:"fixed", bottom:28, left:"50%", transform:"translateX(-50%)", zIndex:500,
          background:T.err, color:"#fff", padding:"12px 20px", borderRadius:12,
          fontFamily:T.fB, fontSize:13, boxShadow:"0 8px 24px rgba(0,0,0,0.2)", whiteSpace:"nowrap" }}>
          {taskError}
        </div>
      )}

      {/* ── Toast de confirmación Fase 2 ───────────────────────────────────── */}
      {toast.visible && (
        <div style={{
          position:"fixed", bottom:28, left:"50%", transform:"translateX(-50%)",
          zIndex:600, display:"flex", alignItems:"center", gap:10,
          background: toast.type === "warning" ? T.war : T.suc,
          color:"#fff", padding:"13px 22px", borderRadius:14,
          fontFamily:T.fB, fontSize:13.5, fontWeight:600,
          boxShadow:"0 10px 30px rgba(0,0,0,0.25)", whiteSpace:"nowrap",
          animation:"fadeSlideUp .3s ease",
        }}>
          <span style={{ fontSize:17 }}>{toast.type === "warning" ? "⚠️" : "✅"}</span>
          {toast.msg}
        </div>
      )}
      <style>{`@keyframes fadeSlideUp{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}} @keyframes pulseRisk{0%,100%{box-shadow:0 0 0 0 rgba(184,80,80,0.4)}50%{box-shadow:0 0 0 6px rgba(184,80,80,0.0)}}`}</style>

      <div style={{ marginBottom:20 }}>
        <select value={filterPt} onChange={e => setFilterPt(e.target.value)}
          style={{ padding:"9px 14px", border:`1.5px solid ${T.bdr}`, borderRadius:10, fontFamily:T.fB, fontSize:13.5, color:T.t, background:T.card, cursor:"pointer", outline:"none" }}>
          <option value="">Todos los pacientes</option>
          {patients.map(p => <option key={p.id} value={p.id}>{(p.name || "").split(" ").slice(0,2).join(" ")}</option>)}
        </select>
      </div>

      {filtered.length === 0
        ? <EmptyState icon={FileText} title="Sin notas" desc="Registra la evolución de tus pacientes con el botón de arriba"/>
        : filtered.map(s => {
          const MI = moodIcon(s.mood);
          const ps = progressStyle(s.progress);
          const isStruct = s.noteFormat && s.noteFormat !== "libre" && s.structured;
          return (
            <Card key={s.id} style={{ padding:0, marginBottom:10, overflow:"hidden" }}>
              {/* Contenido */}
              <div style={{ padding:"14px 16px" }}>
                {/* Header: nombre + badge formato + fecha */}
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2, overflow:"hidden" }}>
                  <span style={{ fontFamily:T.fB, fontSize:14.5, fontWeight:600, color:T.t,
                    whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                    {s.patientName.split(" ").slice(0,2).join(" ")}
                  </span>
                  {isStruct && (
                    <span style={{ display:"inline-flex", alignItems:"center", gap:3, padding:"1px 7px",
                      borderRadius:9999, background:NOTE_FORMATS[s.noteFormat]?.bg,
                      color:NOTE_FORMATS[s.noteFormat]?.color, fontSize:9, fontWeight:700,
                      fontFamily:T.fB, flexShrink:0, letterSpacing:"0.04em" }}>
                      {s.noteFormat}
                    </span>
                  )}
                </div>
                <div style={{ fontFamily:T.fB, fontSize:11.5, color:T.tl, marginBottom:10 }}>
                  {fmtDate(s.date)} · {s.duration} min
                </div>

                {/* Nota */}
                {isStruct
                  ? <StructuredPreview session={s}/>
                  : <p style={{ fontFamily:T.fB, fontSize:13, color:T.tm, margin:"0 0 10px",
                      lineHeight:1.6, display:"-webkit-box", WebkitLineClamp:2,
                      WebkitBoxOrient:"vertical", overflow:"hidden" }}>
                      {s.notes}
                    </p>
                }

                {/* Estado + tags */}
                <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap", marginTop:isStruct?6:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                    <MI size={13} color={moodColor(s.mood)}/>
                    <span style={{ fontSize:11.5, fontFamily:T.fB, color:moodColor(s.mood), fontWeight:600 }}>{s.mood}</span>
                  </div>
                  <Badge color={ps.c} bg={ps.bg}>{s.progress}</Badge>
                  {(s.tags||[]).map(tag => <Badge key={tag} color={T.acc} bg={T.accA}><Tag size={9}/>{tag}</Badge>)}
                </div>

                {/* Task badges */}
                {(s.taskCompleted !== null || s.tasksAssigned?.length > 0) && (
                  <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginTop:6 }}>
                    {s.taskCompleted === true  && <span style={{ display:"inline-flex", alignItems:"center", gap:3, padding:"2px 8px", borderRadius:9999, background:T.sucA, color:T.suc, fontSize:10, fontWeight:700, fontFamily:T.fB }}><Check size={9}/>Completada</span>}
                    {s.taskCompleted === false && <span style={{ display:"inline-flex", alignItems:"center", gap:3, padding:"2px 8px", borderRadius:9999, background:T.warA, color:T.war, fontSize:10, fontWeight:700, fontFamily:T.fB }}>✗ No completada</span>}
                    {s.tasksAssigned?.length > 0 && <span style={{ display:"inline-flex", alignItems:"center", gap:3, padding:"2px 8px", borderRadius:9999, background:T.pA, color:T.p, fontSize:10, fontWeight:600, fontFamily:T.fB }}><ClipboardCheck size={9}/>{s.tasksAssigned.length} tarea{s.tasksAssigned.length>1?"s":""} asignada{s.tasksAssigned.length>1?"s":""}</span>}
                  </div>
                )}
              </div>

              {/* Barra de acciones — separada con línea */}
              <div style={{ borderTop:`1px solid ${T.bdrL}`, display:"flex", alignItems:"center", background:T.cardAlt, position:"relative" }}>
                {[
                  { label:"Derivar",  icon:Send,    onClick:() => openReferral(s),          color:T.tm },
                  { label:"PDF",      icon:FileText, onClick:() => {
                      const folio = getSessionFolio(s, sessions);
                      printNotaEvolucion(s, patients.find(p => p.id === s.patientId), profile, riskAssessments, folio, NOTE_FORMATS);
                    }, color:T.p },
                  { label:"Eliminar", icon:Trash2,  onClick:() => del(s.id),               color:T.err },
                ].map(a => (
                  <button key={a.label} onClick={a.onClick}
                    style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center",
                      gap:5, padding:"9px 4px", background:"none", border:"none",
                      borderRight:`1px solid ${T.bdrL}`, cursor:"pointer",
                      fontFamily:T.fB, fontSize:11, fontWeight:500, color:a.color,
                      transition:"background .13s" }}
                    onMouseEnter={e => e.currentTarget.style.background=T.bdrL}
                    onMouseLeave={e => e.currentTarget.style.background="none"}>
                    <a.icon size={13}/>{a.label}
                  </button>
                ))}
                {/* Exportar — menú desplegable */}
                <button
                  onClick={() => setExportMenuId(prev => prev === s.id ? null : s.id)}
                  style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center",
                    gap:5, padding:"9px 4px", background: exportMenuId === s.id ? T.pA : "none",
                    border:"none", cursor:"pointer",
                    fontFamily:T.fB, fontSize:11, fontWeight:500,
                    color: exportMenuId === s.id ? T.p : T.tm,
                    transition:"background .13s" }}
                  onMouseEnter={e => { if (exportMenuId !== s.id) e.currentTarget.style.background=T.bdrL; }}
                  onMouseLeave={e => { if (exportMenuId !== s.id) e.currentTarget.style.background="none"; }}>
                  <Download size={13}/>Exportar
                </button>
                {/* Menú de exportación desplegable */}
                {exportMenuId === s.id && (
                  <ExportMenu
                    session={s}
                    patient={patients.find(p => p.id === s.patientId)}
                    profile={profile}
                    riskAssessments={riskAssessments}
                    allSessions={sessions}
                    noteFormats={NOTE_FORMATS}
                    onClose={() => setExportMenuId(null)}
                  />
                )}
              </div>
            </Card>
          );
        })
      }

      {/* ── New/duplicate modal ──────────────────────────────────────── */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); setEditingSessionId(null); setServiceLocked(false); }} title="Nueva nota"
        width={isMobileView ? 620 : 940}>

        {/* Mobile: acordeón de contexto clínico al inicio del formulario */}
        {isMobileView && (
          <ClinicalReferencePanel
            patientId={form.patientId}
            sessions={sessions}
            treatmentPlans={treatmentPlans}
            riskAssessments={riskAssessments}
            patients={patients}
            isMobile
          />
        )}

        {/* Layout: grid en desktop (1fr + panel 290px) / bloque en mobile */}
        <div style={isMobileView ? {} : {
          display:"grid", gridTemplateColumns:"1fr 290px", gap:20, alignItems:"flex-start"
        }}>

          {/* ── Columna principal del formulario ───────────────────── */}
          <div>

        {/* ── Banner de borrador guardado ───────────────────────── */}
        {showDraftBanner && draftBannerData && (
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 14px",
            background:"rgba(196,137,90,0.10)", border:`1.5px solid rgba(196,137,90,0.35)`,
            borderRadius:11, marginBottom:14 }}>
            <span style={{ fontSize:18, flexShrink:0 }}>📝</span>
            <div style={{ flex:1, fontFamily:T.fB, fontSize:12.5, color:T.t, lineHeight:1.5 }}>
              <strong>Tienes un borrador guardado</strong> del{" "}
              {new Date(draftBannerData.savedAt).toLocaleDateString("es-MX", { day:"numeric", month:"short" })}{" "}
              a las {new Date(draftBannerData.savedAt).toLocaleTimeString("es-MX", { hour:"2-digit", minute:"2-digit" })}.
              ¿Restaurar?
            </div>
            <div style={{ display:"flex", gap:6, flexShrink:0 }}>
              <button onClick={() => {
                setForm(f => ({ ...f,
                  notes: draftBannerData.notes || f.notes,
                  structured: draftBannerData.structured || f.structured,
                  noteFormat: draftBannerData.noteFormat || f.noteFormat,
                }));
                setShowDraftBanner(false);
              }} style={{ padding:"5px 12px", borderRadius:8, border:`1.5px solid ${T.p}`,
                background:T.pA, fontFamily:T.fB, fontSize:12, fontWeight:700,
                color:T.p, cursor:"pointer" }}>
                Restaurar
              </button>
              <button onClick={() => {
                const key = editingSessionId ? `pc_draft_${editingSessionId}` : "pc_draft_new";
                try { localStorage.removeItem(key); } catch {}
                setShowDraftBanner(false); setDraftBannerData(null);
              }} style={{ padding:"5px 10px", borderRadius:8, border:`1.5px solid ${T.bdrL}`,
                background:"transparent", fontFamily:T.fB, fontSize:12,
                color:T.tm, cursor:"pointer" }}>
                Descartar
              </button>
            </div>
          </div>
        )}

        {/* ── Selector de paciente: solo lectura si llegó con prefill.patientId ── */}
        {patientLocked && form.patientId ? (() => {
          const lockedPt = patients.find(p => p.id === form.patientId);
          return (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display:"block", fontSize:12, fontWeight:600, color:T.tm, marginBottom:6, letterSpacing:"0.06em", textTransform:"uppercase" }}>
                Paciente
              </label>
              <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", border:`1.5px solid ${T.bdr}`, borderRadius:10, background:T.cardAlt }}>
                <span style={{ flex:1, fontFamily:T.fB, fontSize:14, color:T.t, fontWeight:500 }}>
                  {lockedPt?.name || "—"}
                </span>
                <button
                  onClick={() => setPatientLocked(false)}
                  style={{ background:"none", border:"none", cursor:"pointer", fontFamily:T.fB, fontSize:12, color:T.p, fontWeight:600, padding:0, textDecoration:"underline" }}>
                  Cambiar
                </button>
              </div>
            </div>
          );
        })() : (
          <Select label="Paciente *" value={form.patientId} onChange={fld("patientId")}
            options={[{value:"",label:"Seleccionar paciente..."}, ...patients.map(p => ({value:p.id, label:p.name}))]}/>
        )}
        {/* ── Widget de tareas del paciente ─────────────────────── */}
        {form.patientId && patientTasks.length > 0 && (() => {
          const completadas = patientTasks.filter(t => t.status === "completed");
          const pendientes  = patientTasks.filter(t => t.status === "pending");
          const sinRevision = completadas.filter(t => {
            if (!t.completed_at) return false;
            return Date.now() - new Date(t.completed_at).getTime() < 7 * 24 * 3600 * 1000;
          });
          return (
            <div style={{ marginBottom:16, borderRadius:12, border:`1.5px solid ${sinRevision.length > 0 ? T.suc+"60" : T.bdr}`, overflow:"hidden" }}>
              <div style={{ padding:"10px 14px", background: sinRevision.length > 0 ? T.sucA : T.bdrL, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <ClipboardCheck size={14} color={sinRevision.length > 0 ? T.suc : T.tm}/>
                  <span style={{ fontFamily:T.fB, fontSize:12, fontWeight:700, color: sinRevision.length > 0 ? T.suc : T.tm, textTransform:"uppercase", letterSpacing:"0.06em" }}>
                    Tareas del paciente
                  </span>
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  {sinRevision.length > 0 && <span style={{ padding:"2px 8px", borderRadius:9999, background:T.sucA, border:`1px solid ${T.suc}40`, fontFamily:T.fB, fontSize:10, fontWeight:700, color:T.suc }}>{sinRevision.length} completada{sinRevision.length>1?"s":""}</span>}
                  {pendientes.length > 0  && <span style={{ padding:"2px 8px", borderRadius:9999, background:T.warA, border:`1px solid ${T.war}40`, fontFamily:T.fB, fontSize:10, fontWeight:700, color:T.war }}>{pendientes.length} pendiente{pendientes.length>1?"s":""}</span>}
                </div>
              </div>
              <div style={{ padding:"10px 14px", background:T.card, display:"flex", flexDirection:"column", gap:8 }}>
                {patientTasks.slice(0,4).map(t => {
                  const tpl  = TASK_TEMPLATES[t.template_id];
                  const done = t.status === "completed";
                  const fromThisSession = sessions.some(s => s.id === t.session_id);
                  return (
                    <div key={t.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 10px", borderRadius:9, background: done ? T.sucA : T.warA, border:`1px solid ${done ? T.suc+"30" : T.war+"33"}` }}>
                      <span style={{ fontSize:16 }}>{tpl?.icon || "📋"}</span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontFamily:T.fB, fontSize:12.5, fontWeight:600, color:T.t, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{t.title}</div>
                        <div style={{ fontFamily:T.fB, fontSize:11, color:T.tl }}>
                          {done ? `Completada ${new Date(t.completed_at).toLocaleDateString("es-MX",{day:"numeric",month:"short"})}` : `Asignada ${new Date(t.assigned_at).toLocaleDateString("es-MX",{day:"numeric",month:"short"})}`}
                          {fromThisSession ? " · esta sesión" : ""}
                        </div>
                      </div>
                      {done && (
                        <button onClick={() => setViewTaskResponse(t)}
                          style={{ display:"flex", alignItems:"center", gap:4, padding:"4px 10px", borderRadius:7, border:`1px solid ${T.p}`, background:T.pA, color:T.p, fontFamily:T.fB, fontSize:11, fontWeight:600, cursor:"pointer", flexShrink:0 }}>
                          <Eye size={11}/> Ver
                        </button>
                      )}
                    </div>
                  );
                })}
                {patientTasks.length > 4 && (
                  <div style={{ fontFamily:T.fB, fontSize:11, color:T.tl, textAlign:"center" }}>+{patientTasks.length - 4} más en el módulo Tareas</div>
                )}
              </div>
            </div>
          );
        })()}

        <div style={{ display:"grid", gridTemplateColumns:isMobileView ? "1fr" : "1fr 1fr", gap:12 }}>
          <Input label="Fecha" value={form.date} onChange={fld("date")} type="date"/>
          {serviceLocked && selectedServiceMeta ? (
            <div style={{ padding:"12px 14px", borderRadius:10, border:`1.5px solid ${T.bdr}`, background:T.cardAlt }}>
              <div style={{ fontSize:11, fontWeight:700, color:T.tm, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>
                Servicio
              </div>
              <div style={{ fontFamily:T.fB, fontSize:14, fontWeight:700, color:T.t, lineHeight:1.4 }}>
                {selectedServiceMeta.label}
              </div>
              <div style={{ fontFamily:T.fB, fontSize:11.5, color:T.tm, marginTop:4, lineHeight:1.5 }}>
                Tomado de la cita agendada · Duración estimada {selectedServiceMeta.duration} min
              </div>
            </div>
          ) : services.length > 0 ? (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <Select
                label="Servicio *"
                value={form.serviceId}
                onChange={v => {
                  if (v === "__add_service__") {
                    setShowQuickServiceForm(true);
                    return;
                  }
                  syncServiceSelection(v);
                }}
                options={[
                  { value:"", label:"Seleccionar servicio..." },
                  ...services.map(s => ({ value:s.id, label:s.name || SERVICE_TYPE_LABEL[s.type] || s.type })),
                  { value:"__add_service__", label:"+ Agregar nuevo servicio" },
                ]}
              />
              {showQuickServiceForm && (
                <div style={{ padding:"14px", borderRadius:12, border:`1.5px solid ${T.p}30`, background:T.pA }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, marginBottom:12 }}>
                    <div>
                      <div style={{ fontSize:11, fontWeight:700, color:T.p, textTransform:"uppercase", letterSpacing:"0.07em" }}>
                        Agregar servicio aquí
                      </div>
                      <div style={{ fontFamily:T.fB, fontSize:12, color:T.tm, marginTop:3 }}>
                        Crea el servicio sin salir de la nota.
                      </div>
                    </div>
                    <button
                      onClick={() => setShowQuickServiceForm(false)}
                      style={{ background:"none", border:"none", cursor:"pointer", fontFamily:T.fB, fontSize:12, color:T.tm, fontWeight:700 }}
                    >
                      Ocultar
                    </button>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:10 }}>
                    <Input label="Nombre del servicio" value={quickService.name} onChange={v => setQuickService(s => ({ ...s, name:v }))} placeholder="Sesión individual" />
                    <div>
                      <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.tm, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>Tipo</label>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                        {SERVICE_TYPE_OPTIONS.map(opt => {
                          const on = quickService.type === opt.value;
                          return (
                            <button
                              key={opt.value}
                              onClick={() => setQuickService(s => ({
                                ...s,
                                type: opt.value,
                                name: s.name.trim() ? s.name : opt.label,
                              }))}
                              style={{
                                padding:"8px 12px",
                                borderRadius:9999,
                                border:`1.5px solid ${on ? T.p : T.bdr}`,
                                background:on ? T.pA : "transparent",
                                color:on ? T.p : T.tm,
                                fontFamily:T.fB,
                                fontSize:12,
                                fontWeight:on ? 700 : 600,
                                cursor:"pointer",
                              }}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.tm, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>Modalidad</label>
                      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                        {SERVICE_MODALITY_OPTIONS.map(opt => {
                          const on = quickService.modality === opt.value;
                          return (
                            <button
                              key={opt.value}
                              onClick={() => setQuickService(s => ({ ...s, modality: opt.value }))}
                              style={{
                                padding:"8px 12px",
                                borderRadius:9999,
                                border:`1.5px solid ${on ? T.p : T.bdr}`,
                                background:on ? T.pA : "transparent",
                                color:on ? T.p : T.tm,
                                fontFamily:T.fB,
                                fontSize:12,
                                fontWeight:on ? 700 : 600,
                                cursor:"pointer",
                              }}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns: quickService.modality === "ambas" ? "1fr 1fr" : "1fr", gap:10 }}>
                      {(quickService.modality === "presencial" || quickService.modality === "ambas") && (
                        <Input label="Precio presencial" value={quickService.price} onChange={v => setQuickService(s => ({ ...s, price:v }))} type="number" placeholder="850" />
                      )}
                      {(quickService.modality === "virtual" || quickService.modality === "ambas") && (
                        <Input label="Precio virtual" value={quickService.priceVirtual} onChange={v => setQuickService(s => ({ ...s, priceVirtual:v }))} type="number" placeholder="800" />
                      )}
                    </div>
                  </div>
                  <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:12 }}>
                    <button
                      onClick={() => setShowQuickServiceForm(false)}
                      style={{ padding:"8px 12px", borderRadius:9, border:`1.5px solid ${T.bdr}`, background:"transparent", fontFamily:T.fB, fontSize:12, color:T.tm, cursor:"pointer" }}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={addQuickService}
                      style={{ padding:"8px 12px", borderRadius:9, border:"none", background:T.p, color:"#fff", fontFamily:T.fB, fontSize:12, fontWeight:700, cursor:"pointer" }}
                    >
                      Guardar y usar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding:"12px 14px", borderRadius:10, border:`1.5px dashed ${T.bdr}`, background:T.cardAlt, display:"flex", flexDirection:"column", gap:10 }}>
              <div style={{ fontSize:11, fontWeight:700, color:T.tm, textTransform:"uppercase", letterSpacing:"0.07em" }}>
                Servicio
              </div>
              <div style={{ fontFamily:T.fB, fontSize:13.5, color:T.t, lineHeight:1.5 }}>
                No tienes servicios configurados todavía.
              </div>
              {showQuickServiceForm ? (
                <div style={{ padding:"14px", borderRadius:12, border:`1.5px solid ${T.p}30`, background:T.card }}>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:10 }}>
                    <Input label="Nombre del servicio" value={quickService.name} onChange={v => setQuickService(s => ({ ...s, name:v }))} placeholder="Sesión individual" />
                    <div>
                      <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.tm, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>Tipo</label>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                        {SERVICE_TYPE_OPTIONS.map(opt => {
                          const on = quickService.type === opt.value;
                          return (
                            <button key={opt.value} onClick={() => setQuickService(s => ({ ...s, type: opt.value, name: s.name.trim() ? s.name : opt.label }))} style={{ padding:"8px 12px", borderRadius:9999, border:`1.5px solid ${on ? T.p : T.bdr}`, background:on ? T.pA : "transparent", color:on ? T.p : T.tm, fontFamily:T.fB, fontSize:12, fontWeight:on ? 700 : 600, cursor:"pointer" }}>
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.tm, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>Modalidad</label>
                      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                        {SERVICE_MODALITY_OPTIONS.map(opt => {
                          const on = quickService.modality === opt.value;
                          return (
                            <button key={opt.value} onClick={() => setQuickService(s => ({ ...s, modality: opt.value }))} style={{ padding:"8px 12px", borderRadius:9999, border:`1.5px solid ${on ? T.p : T.bdr}`, background:on ? T.pA : "transparent", color:on ? T.p : T.tm, fontFamily:T.fB, fontSize:12, fontWeight:on ? 700 : 600, cursor:"pointer" }}>
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns: quickService.modality === "ambas" ? "1fr 1fr" : "1fr", gap:10 }}>
                      {(quickService.modality === "presencial" || quickService.modality === "ambas") && (
                        <Input label="Precio presencial" value={quickService.price} onChange={v => setQuickService(s => ({ ...s, price:v }))} type="number" placeholder="850" />
                      )}
                      {(quickService.modality === "virtual" || quickService.modality === "ambas") && (
                        <Input label="Precio virtual" value={quickService.priceVirtual} onChange={v => setQuickService(s => ({ ...s, priceVirtual:v }))} type="number" placeholder="800" />
                      )}
                    </div>
                  </div>
                  <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:12 }}>
                    <button onClick={() => setShowQuickServiceForm(false)} style={{ padding:"8px 12px", borderRadius:9, border:`1.5px solid ${T.bdr}`, background:"transparent", fontFamily:T.fB, fontSize:12, color:T.tm, cursor:"pointer" }}>
                      Cancelar
                    </button>
                    <button onClick={addQuickService} style={{ padding:"8px 12px", borderRadius:9, border:"none", background:T.p, color:"#fff", fontFamily:T.fB, fontSize:12, fontWeight:700, cursor:"pointer" }}>
                      Guardar y usar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowQuickServiceForm(true)}
                  style={{ alignSelf:"flex-start", padding:"7px 12px", borderRadius:8, border:`1.5px solid ${T.p}`, background:T.pA, color:T.p, fontFamily:T.fB, fontSize:12, fontWeight:700, cursor:"pointer" }}
                >
                  Agregar servicio aquí
                </button>
              )}
            </div>
          )}
        </div>
        <MoodProgressPicker
          mood={form.mood}
          progress={form.progress}
          onMood={fld("mood")}
          onProgress={fld("progress")}
        />

        {(() => {
          const onFormatChange = (f) => {
            localStorage.setItem("pc_last_note_format", f);
            handleFormatChange(f);
            setShowTpl(false);
          };
          return <FormatSelector value={form.noteFormat} onChange={onFormatChange}/>;
        })()}

        {/* ── Template selector ─────────────────────────────────── */}
        {form.patientId && (
          <div style={{ marginBottom:showTpl?0:12 }}>
            {!showTpl && (
              <button onClick={() => setShowTpl(true)}
                style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"5px 12px", borderRadius:9999, border:`1.5px solid ${T.bdrL}`, background:"transparent", cursor:"pointer", fontFamily:T.fB, fontSize:12, color:T.tm, transition:"all .13s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor=T.p; e.currentTarget.style.color=T.p; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor=T.bdrL; e.currentTarget.style.color=T.tm; }}>
                🗒 Usar plantilla clínica
              </button>
            )}
            {showTpl && (
              <TemplatePanel
                patient={patients.find(p => p.id === form.patientId)}
                noteFormat={form.noteFormat}
                onApply={handleApplyTemplate}
                onClose={() => setShowTpl(false)}
              />
            )}
          </div>
        )}

        {isStructured
          ? <StructuredFields formatId={form.noteFormat} structured={form.structured||{}} onChange={handleStructuredChange}/>
          : <Textarea label="Notas clínicas *" value={form.notes} onChange={fld("notes")}
              placeholder="Describe la sesión, intervenciones y respuesta del paciente..." rows={5}/>
        }
        {/* ── Indicador de autoguardado ───────────────────────────────── */}
        {draftSavedAt && (
          <div style={{ fontFamily:T.fB, fontSize:11, color:T.tl, textAlign:"right", marginTop:-10, marginBottom:14 }}>
            Borrador guardado {new Date(draftSavedAt).toLocaleTimeString("es-MX", { hour:"2-digit", minute:"2-digit" })}
          </div>
        )}

        {/* ── Botón resumen IA ──────────────────────────────────────── */}
        {(form.notes?.trim() || form.structured) && (
          <button onClick={handleAISummary} disabled={aiLoading}
            style={{ display:"flex", alignItems:"center", gap:7, padding:"9px 16px",
              borderRadius:10, border:`1.5px solid ${LAVANDA}66`,
              background:`${LAVANDA}0F`, color:LAVANDA,
              fontFamily:T.fB, fontSize:13, fontWeight:600, cursor:"pointer",
              marginBottom:16, transition:"all .15s" }}>
            <Sparkles size={14}/>
            {aiLoading ? "Generando resumen…" : "✨ Resumen con IA"}
          </button>
        )}

        <Input label="Etiquetas (separadas por coma)" value={form.tags} onChange={fld("tags")} placeholder="TCC, ansiedad, respiración"/>

        {/* ── Tareas terapéuticas ───────────────────────────────────── */}
        <div style={{ border:`1.5px solid ${T.bdr}`, borderRadius:12, overflow:"hidden", marginBottom:16 }}>
          <div style={{ padding:"9px 14px", background:T.pA, borderBottom:`1px solid ${T.bdrL}` }}>
            <label style={{ fontSize:11, fontWeight:700, color:T.p, textTransform:"uppercase", letterSpacing:"0.07em", display:"flex", alignItems:"center", gap:6 }}>
              <ClipboardCheck size={13}/> Tareas terapéuticas
            </label>
          </div>
          <div style={{ padding:"12px 14px", background:T.card }}>
            <div style={{ marginBottom:12 }}>
              <label style={{ display:"block", fontSize:11, fontWeight:600, color:T.tm, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:7 }}>¿Completó la tarea anterior?</label>
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
              <label style={{ display:"block", fontSize:11, fontWeight:600, color:T.tm, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Tareas para la próxima sesión</label>
              {/* Selected chips */}
              {form.tasksAssigned?.length > 0 && (
                <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:10 }}>
                  {form.tasksAssigned.map(id => {
                    const tpl = TASK_TEMPLATES[id];
                    if (!tpl) return null;
                    return (
                      <div key={id} style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 10px 4px 8px", borderRadius:9999, background:T.pA, border:`1.5px solid ${T.p}`, fontFamily:T.fB, fontSize:12, color:T.p, fontWeight:600 }}>
                        <span>{tpl.icon}</span>
                        <span>{tpl.title}</span>
                        <button onClick={() => fld("tasksAssigned")(form.tasksAssigned.filter(x => x !== id))}
                          style={{ background:"none", border:"none", cursor:"pointer", color:T.p, padding:0, marginLeft:2, lineHeight:1, fontSize:14, opacity:0.7 }}>×</button>
                      </div>
                    );
                  })}
                </div>
              )}
              {/* Template grid */}
              <div style={{ maxHeight:220, overflowY:"auto", border:`1.5px solid ${T.bdr}`, borderRadius:10, padding:6, background:T.cardAlt, display:"flex", flexDirection:"column", gap:5 }}>
                {Object.values(TASK_TEMPLATES).map(tpl => {
                  const selected = form.tasksAssigned?.includes(tpl.id);
                  return (
                    <button key={tpl.id}
                      onClick={() => {
                        const cur = form.tasksAssigned || [];
                        fld("tasksAssigned")(selected ? cur.filter(x => x !== tpl.id) : [...cur, tpl.id]);
                      }}
                      style={{ display:"flex", alignItems:"center", gap:7, padding:"7px 9px", borderRadius:8, border:`1.5px solid ${selected ? T.p : T.bdr}`, background:selected ? T.pA : T.card, cursor:"pointer", textAlign:"left", transition:"all .12s" }}>
                      <span style={{ fontSize:17, lineHeight:1, flexShrink:0 }}>{tpl.icon}</span>
                      <div style={{ overflow:"hidden" }}>
                        <div style={{ fontFamily:T.fB, fontSize:11.5, fontWeight:selected?700:500, color:selected?T.p:T.t, lineHeight:1.3, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{tpl.title}</div>
                        <div style={{ fontFamily:T.fB, fontSize:10, color:T.tl, lineHeight:1.2 }}>{tpl.category}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
              {form.tasksAssigned?.length > 0 && !patients.find(p => p.id === form.patientId)?.phone && (
                <p style={{ fontFamily:T.fB, fontSize:11, color:T.war, marginTop:6, lineHeight:1.4 }}>
                  ⚠️ Este paciente no tiene teléfono registrado. Las tareas se guardarán en la sesión pero no se enviarán al portal.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Notas de supervisión privadas ────────────────────────── */}
        <div style={{ border:`1.5px solid ${form.privateNotes?`${LAVANDA}66`:T.bdr}`, borderRadius:12, overflow:"hidden", marginBottom:16, transition:"border .15s" }}>
          <div style={{ padding:"10px 16px", background:form.privateNotes?`${LAVANDA}14`:T.bdrL, display:"flex", alignItems:"center", gap:6 }}>
            <Lock size={12} color={form.privateNotes?LAVANDA:T.tl}/>
            <label style={{ fontSize:11, fontWeight:700, color:form.privateNotes?LAVANDA:T.tm, textTransform:"uppercase", letterSpacing:"0.07em" }}>
              Notas de supervisión <span style={{ fontWeight:400, textTransform:"none", letterSpacing:0, fontSize:11 }}>(privadas — no se exportan)</span>
            </label>
          </div>
          <textarea value={form.privateNotes} onChange={e => fld("privateNotes")(e.target.value)} rows={3}
            placeholder="Reflexiones personales, hipótesis no confirmadas, notas para supervisión clínica..."
            style={{ width:"100%", padding:"12px 16px", border:"none", outline:"none", fontFamily:T.fB, fontSize:13.5, color:T.t, background:T.card, resize:"vertical", boxSizing:"border-box", lineHeight:1.65 }}/>
        </div>
        <div style={{ border:`1.5px solid ${riskOpen?`${T.err}4D`:T.bdr}`, borderRadius:12, overflow:"hidden", marginBottom:16, transition:"border .15s" }}>
          <button onClick={() => setRiskOpen(o => !o)}
            style={{ display:"flex", alignItems:"center", justifyContent:"space-between", width:"100%", padding:"11px 16px", background:riskOpen?T.errA:T.bdrL, border:"none", cursor:"pointer", fontFamily:T.fB, fontSize:13, fontWeight:600, color:riskOpen?T.err:T.tm, transition:"all .15s" }}>
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

        <div style={{ display:"flex", gap:10, justifyContent:"space-between", alignItems:"center", flexWrap:"wrap" }}>
          {/* Etapa 4: botón de consentimiento informado rápido desde el formulario */}
          {form.patientId && (
            <button onClick={() => printConsentimientoInformado(patients.find(p => p.id === form.patientId), profile)}
              style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px",
                borderRadius:9, border:`1.5px solid ${LAVANDA}59`,
                background:`${LAVANDA}0F`, cursor:"pointer",
                fontFamily:T.fB, fontSize:12, color:LAVANDA, fontWeight:600 }}>
              <FileCheck size={13}/> Consentimiento Informado
            </button>
          )}
          <div style={{ display:"flex", gap:10, marginLeft:"auto" }}>
            <Btn variant="ghost" onClick={() => { setShowAdd(false); setEditingSessionId(null); }}>Cancelar</Btn>
            <Btn onClick={save} disabled={!canSave}><Check size={15}/> Guardar nota</Btn>
          </div>
        </div>
          </div>{/* ── fin columna formulario ── */}

          {/* Desktop: panel lateral de referencia clínica (sticky) */}
          {!isMobileView && (
            <ClinicalReferencePanel
              patientId={form.patientId}
              sessions={sessions}
              treatmentPlans={treatmentPlans}
              riskAssessments={riskAssessments}
              patients={patients}
              isMobile={false}
            />
          )}

        </div>{/* ── fin grid wrapper ── */}
      </Modal>


      {/* ══════════════════════════════════════════════════════════════════════
          ETAPA 3 — Mini-Wizard de Plan de Seguridad
          Se abre automáticamente cuando se detecta crisis al guardar la nota.
          Propósito: documentar el plan de seguridad INMEDIATAMENTE tras la sesión.
          Flujo: 3 pasos → (1) Señales de Advertencia (2) Estrategias (3) Contactos
          Al completar → guarda en riskAssessments y genera PDF para el paciente.
      ══════════════════════════════════════════════════════════════════════ */}
      {showSafetyWizard && pendingRiskSave && (() => {
        const rc = RISK_CONFIG[pendingRiskSave.level] || RISK_CONFIG.moderado;
        const ptObj = patients.find(p => p.id === pendingRiskSave.patientId);
        const spld = k => v => setSafetyPlanDraft(d => ({...d,[k]:v}));

        const saveSafetyPlan = (andClose) => {
          if (!setRiskAssessments) return;
          // Composición de safetyPlan en formato compatible con RiskAssessment.jsx
          const sp = {
            warningSignals:    safetyPlanDraft.warningSignals,
            copingStrategies:  safetyPlanDraft.copingStrategies,
            supportContacts:   safetyPlanDraft.familyContact
              ? `${safetyPlanDraft.familyContact} — ${safetyPlanDraft.familyPhone}` : "",
            professionalContacts: safetyPlanDraft.professionalContact
              ? `${safetyPlanDraft.professionalContact} — ${safetyPlanDraft.professionalPhone}` : "",
            reasonsToLive:     safetyPlanDraft.reasonsToLive,
            environmentSafety: safetyPlanDraft.environmentSafety,
          };
          setRiskAssessments(prev => prev.map(ra =>
            ra.id === pendingRiskSave.raId ? { ...ra, safetyPlan: sp, hasPlan: true } : ra
          ));
          if (andClose) { setShowSafetyWizard(false); setPendingRiskSave(null); }
        };

        const printSafetyPlanFromWizard = () => {
          saveSafetyPlan(false);
          const spForPdf = {
            warningSignals:      safetyPlanDraft.warningSignals,
            copingStrategies:    safetyPlanDraft.copingStrategies,
            reasonsToLive:       safetyPlanDraft.reasonsToLive,
            environmentSafety:   safetyPlanDraft.environmentSafety,
            familyContact:       safetyPlanDraft.familyContact,
            familyPhone:         safetyPlanDraft.familyPhone,
            professionalContact: safetyPlanDraft.professionalContact,
            professionalPhone:   safetyPlanDraft.professionalPhone,
          };
          printPlanSeguridad(spForPdf, ptObj, profile, pendingRiskSave.level);
        };
        // ── legacy inline conservado pero nunca alcanzado ── ↓ cierre de función se mantiene para no romper AST
        const _legacy = () => {
          const today = new Date().toLocaleDateString("es-MX",{day:"numeric",month:"long",year:"numeric"});
          const w = window.open("","_blank");
          w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Plan de Seguridad — ${pendingRiskSave.patientName}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}body{font-family:'DM Sans',sans-serif;max-width:720px;margin:40px auto;color:#1A2B28;font-size:13px;line-height:1.65}
.header{border-bottom:3px solid #3A6B6E;padding-bottom:20px;margin-bottom:32px;display:flex;justify-content:space-between;align-items:flex-start}
.header h1{font-family:'Cormorant Garamond',serif;font-size:30px;font-weight:600;color:#3A6B6E;margin-bottom:4px}
.header p{font-size:12px;color:#5A7270}
.risk-badge{padding:6px 16px;border-radius:9999px;font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;background:${rc.bg};color:${rc.color};border:1.5px solid ${rc.color}44}
.info-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:28px}
.info-box{background:#F9F8F5;padding:14px;border-radius:10px}
.info-box label{display:block;font-size:10px;font-weight:700;color:#9BAFAD;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px}
.info-box p{font-size:14px;font-weight:500}
.warning{background:rgba(184,80,80,0.06);border:1px solid rgba(184,80,80,0.25);border-radius:10px;padding:14px 18px;margin-bottom:24px;font-size:12px;color:#B85050;font-weight:500}
.section{margin-bottom:22px}
.section-title{font-size:10px;font-weight:700;color:#9BAFAD;text-transform:uppercase;letter-spacing:.09em;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #EDF1F0}
.section-body{background:#F9F8F5;padding:16px;border-radius:10px;border-left:4px solid #3A6B6E;font-size:13px;line-height:1.7;color:#1A2B28;white-space:pre-wrap;min-height:40px}
.contacts{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.contact-card{background:#F9F8F5;padding:14px 16px;border-radius:10px;border-left:4px solid #3A6B6E}
.contact-card.urgency{border-left-color:#B85050}
.contact-card label{font-size:10px;font-weight:700;color:#9BAFAD;text-transform:uppercase;letter-spacing:.08em;display:block;margin-bottom:6px}
.contact-card strong{font-size:14px;display:block;margin-bottom:3px}
.sig-area{margin-top:40px;display:grid;grid-template-columns:1fr 1fr;gap:40px}
.sig-line{border-top:1px solid #1A2B28;padding-top:8px;margin-top:48px;font-size:12px;color:#5A7270}
footer{margin-top:40px;padding-top:16px;border-top:1px solid #D8E2E0;font-size:11px;color:#9BAFAD;display:flex;justify-content:space-between}
@media print{body{margin:0}}
</style></head><body>
<div class="header">
  <div><h1>Plan de Seguridad Personal</h1><p>${profile?.clinic||"Consultorio Psicológico"}${profile?.name?" · "+profile.name:""}${profile?.cedula?" · Céd. "+profile.cedula:""}</p></div>
  <div class="risk-badge">Riesgo ${rc.label}</div>
</div>
<div class="info-grid">
  <div class="info-box"><label>Paciente</label><p>${pendingRiskSave.patientName||"—"}</p></div>
  <div class="info-box"><label>Fecha</label><p>${today}</p></div>
  <div class="info-box"><label>Terapeuta</label><p>${profile?.name||"—"}</p></div>
</div>
<div class="warning">⚠️ Este plan fue elaborado ante la presencia de indicadores de riesgo. Úsalo cuando notes las señales de advertencia. Ante una crisis, contacta a las personas indicadas abajo o acude a urgencias.</div>
<div class="section">
  <div class="section-title">1. Señales de advertencia — Cuándo usar este plan</div>
  <div class="section-body">${safetyPlanDraft.warningSignals||"No especificado"}</div>
</div>
<div class="section">
  <div class="section-title">2. Estrategias de afrontamiento personal</div>
  <div class="section-body">${safetyPlanDraft.copingStrategies||"No especificado"}</div>
</div>
${safetyPlanDraft.reasonsToLive ? `<div class="section"><div class="section-title">3. Razones para vivir / Motivos de esperanza</div><div class="section-body">${safetyPlanDraft.reasonsToLive}</div></div>` : ""}
<div class="section">
  <div class="section-title">4. Red de apoyo en crisis</div>
  <div class="contacts">
    ${safetyPlanDraft.familyContact ? `<div class="contact-card"><label>Contacto familiar / personal</label><strong>${safetyPlanDraft.familyContact}</strong><span>${safetyPlanDraft.familyPhone||"Sin teléfono"}</span></div>` : ""}
    ${safetyPlanDraft.professionalContact ? `<div class="contact-card urgency"><label>Profesional de salud mental / crisis</label><strong>${safetyPlanDraft.professionalContact}</strong><span>${safetyPlanDraft.professionalPhone||""}</span></div>` : ""}
    <div class="contact-card urgency"><label>Línea de crisis (México)</label><strong>SAPTEL: 55 5259-8121</strong><span>24 horas, los 365 días</span></div>
    <div class="contact-card urgency"><label>Emergencias</label><strong>911</strong><span>Urgencias médicas y seguridad</span></div>
  </div>
</div>
${safetyPlanDraft.environmentSafety ? `<div class="section"><div class="section-title">5. Seguridad del entorno</div><div class="section-body">${safetyPlanDraft.environmentSafety}</div></div>` : ""}
<div class="sig-area">
  <div><div class="sig-line">Firma del paciente / Acuerdo verbal</div></div>
  <div><div class="sig-line">${profile?.name||"Terapeuta"} · ${profile?.cedula?"Céd. "+profile.cedula:""}</div></div>
</div>
<footer><span>PsychoCore · Documento generado ${today}</span><span>Este plan es confidencial y de uso personal del paciente</span></footer>
</body></html>`);
          w.document.close(); setTimeout(()=>w.print(),500);
        };

        return (
          <Modal open onClose={() => { setShowSafetyWizard(false); setPendingRiskSave(null); }} title="Plan de Seguridad — Elaborar ahora" width={560}>
            {/* Banner de alerta */}
            <div style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"14px 16px",
              background:rc.bg, border:`2px solid ${rc.color}44`, borderRadius:12, marginBottom:20 }}>
              <ShieldAlert size={22} color={rc.color} style={{ flexShrink:0, marginTop:2 }}/>
              <div>
                <div style={{ fontFamily:T.fB, fontSize:13, fontWeight:700, color:rc.color, marginBottom:4 }}>
                  Crisis detectada — Riesgo {rc.label}
                </div>
                <div style={{ fontFamily:T.fB, fontSize:12, color:rc.color, lineHeight:1.55, opacity:0.9 }}>
                  Se registró un indicador de riesgo para <strong>{pendingRiskSave.patientName}</strong>.
                  Completa el Plan de Seguridad ahora para entregárselo al paciente antes de que salga de sesión.
                  Este plan también quedará en el expediente clínico.
                </div>
              </div>
            </div>

            {/* Paso 1: Señales de advertencia */}
            <div style={{ marginBottom:16 }}>
              <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.tm, textTransform:"uppercase",
                letterSpacing:"0.07em", marginBottom:6 }}>
                1 · Señales de advertencia — ¿Cuándo usar este plan?
              </label>
              <textarea value={safetyPlanDraft.warningSignals}
                onChange={e => spld("warningSignals")(e.target.value)} rows={3}
                placeholder="Ej. Cuando me aíslo de todos, cuando siento que nada tiene sentido, cuando el dolor se vuelve insoportable..."
                style={{ width:"100%", padding:"12px 14px", border:`1.5px solid ${T.bdr}`, borderRadius:10,
                  fontFamily:T.fB, fontSize:13, color:T.t, background:T.card, resize:"vertical",
                  outline:"none", boxSizing:"border-box", lineHeight:1.65 }}/>
            </div>

            {/* Paso 2: Estrategias de afrontamiento */}
            <div style={{ marginBottom:16 }}>
              <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.tm, textTransform:"uppercase",
                letterSpacing:"0.07em", marginBottom:6 }}>
                2 · Estrategias de afrontamiento personal
              </label>
              <textarea value={safetyPlanDraft.copingStrategies}
                onChange={e => spld("copingStrategies")(e.target.value)} rows={3}
                placeholder="Ej. Respiración profunda, llamar a un amigo, salir a caminar, escuchar música, distracción con actividades..."
                style={{ width:"100%", padding:"12px 14px", border:`1.5px solid ${T.bdr}`, borderRadius:10,
                  fontFamily:T.fB, fontSize:13, color:T.t, background:T.card, resize:"vertical",
                  outline:"none", boxSizing:"border-box", lineHeight:1.65 }}/>
            </div>

            {/* Paso 3: Contactos */}
            <div style={{ marginBottom:16 }}>
              <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.tm, textTransform:"uppercase",
                letterSpacing:"0.07em", marginBottom:10 }}>
                3 · Red de apoyo en crisis
              </label>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
                <div>
                  <label style={{ display:"block", fontSize:11, color:T.tl, marginBottom:5 }}>Familiar / persona de confianza</label>
                  <input value={safetyPlanDraft.familyContact} onChange={e => spld("familyContact")(e.target.value)}
                    placeholder="Nombre" style={{ width:"100%", padding:"9px 12px", border:`1.5px solid ${T.bdr}`, borderRadius:9, fontFamily:T.fB, fontSize:13, color:T.t, background:T.card, outline:"none", boxSizing:"border-box", marginBottom:6 }}/>
                  <input value={safetyPlanDraft.familyPhone} onChange={e => spld("familyPhone")(e.target.value)}
                    placeholder="Teléfono" style={{ width:"100%", padding:"9px 12px", border:`1.5px solid ${T.bdr}`, borderRadius:9, fontFamily:T.fB, fontSize:13, color:T.t, background:T.card, outline:"none", boxSizing:"border-box" }}/>
                </div>
                <div>
                  <label style={{ display:"block", fontSize:11, color:T.tl, marginBottom:5 }}>Profesional / servicio de crisis</label>
                  <input value={safetyPlanDraft.professionalContact} onChange={e => spld("professionalContact")(e.target.value)}
                    placeholder="Nombre o servicio" style={{ width:"100%", padding:"9px 12px", border:`1.5px solid ${T.bdr}`, borderRadius:9, fontFamily:T.fB, fontSize:13, color:T.t, background:T.card, outline:"none", boxSizing:"border-box", marginBottom:6 }}/>
                  <input value={safetyPlanDraft.professionalPhone} onChange={e => spld("professionalPhone")(e.target.value)}
                    placeholder="Teléfono o extensión" style={{ width:"100%", padding:"9px 12px", border:`1.5px solid ${T.bdr}`, borderRadius:9, fontFamily:T.fB, fontSize:13, color:T.t, background:T.card, outline:"none", boxSizing:"border-box" }}/>
                </div>
              </div>
              {/* Líneas de crisis fijas — contexto México */}
              <div style={{ padding:"10px 12px", background:T.errA, borderRadius:9,
                border:`1px solid ${T.err}33`, fontFamily:T.fB, fontSize:11.5, color:T.err }}>
                🆘 Pre-incluidos: <strong>SAPTEL 55 5259-8121</strong> (24h, gratuito) · <strong>911</strong> emergencias
              </div>
            </div>

            {/* Razones para vivir (opcional) */}
            <div style={{ marginBottom:20 }}>
              <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.tm, textTransform:"uppercase",
                letterSpacing:"0.07em", marginBottom:6 }}>
                4 · Razones para vivir <span style={{ fontWeight:400, textTransform:"none", letterSpacing:0 }}>(opcional)</span>
              </label>
              <textarea value={safetyPlanDraft.reasonsToLive}
                onChange={e => spld("reasonsToLive")(e.target.value)} rows={2}
                placeholder="Ej. Mi familia, mi mascota, mis sueños, querer ver crecer a mis hijos..."
                style={{ width:"100%", padding:"12px 14px", border:`1.5px solid ${T.bdr}`, borderRadius:10,
                  fontFamily:T.fB, fontSize:13, color:T.t, background:T.card, resize:"vertical",
                  outline:"none", boxSizing:"border-box", lineHeight:1.65 }}/>
            </div>

            <div style={{ display:"flex", gap:10, justifyContent:"space-between", alignItems:"center", flexWrap:"wrap" }}>
              <button onClick={printSafetyPlanFromWizard}
                style={{ display:"flex", alignItems:"center", gap:7, padding:"10px 18px",
                  borderRadius:10, border:`1.5px solid ${T.err}80`,
                  background:T.errA, color:T.err,
                  fontFamily:T.fB, fontSize:13, fontWeight:700, cursor:"pointer" }}>
                <Printer size={14}/> Imprimir PDF para paciente
              </button>
              <div style={{ display:"flex", gap:8 }}>
                <Btn variant="ghost" onClick={() => { setShowSafetyWizard(false); setPendingRiskSave(null); }}>
                  Omitir por ahora
                </Btn>
                <Btn onClick={() => saveSafetyPlan(true)}>
                  <Check size={14}/> Guardar plan
                </Btn>
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* ── Modal cobro post-sesión ─────────────────────────────────────── */}
      <Modal open={showCobro} onClose={skipCobro} title="Registrar cobro" width={420}>
        {/* Resumen de la sesión guardada */}
        {cobroData && (
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px",
            background:T.sucA, borderRadius:10, marginBottom:16, border:`1px solid ${T.suc}40` }}>
            <span style={{ fontSize:18 }}>✅</span>
            <div>
              <div style={{ fontFamily:T.fB, fontSize:13, fontWeight:700, color:T.suc }}>
                Sesión guardada correctamente
              </div>
              <div style={{ fontFamily:T.fB, fontSize:11.5, color:T.tm, marginTop:1 }}>
                {cobroData.patientName}
                {cobroData._agendaSynced && <span style={{ marginLeft:8, color:T.suc }}>· 📅 Cita marcada como completada</span>}
              </div>
            </div>
          </div>
        )}
        {/* ── Etapa 4: Sección de documentos para el paciente ──────────────── */}
        {cobroData?._session && (() => {
          const savedSession = cobroData._session;
          const savedPatient = cobroData._patient;
          const sessionRisk  = riskAssessments?.find(ra => ra.sessionId === savedSession.id);
          const hasRisk      = !!(sessionRisk && (
            sessionRisk.suicidalIdeation !== "ninguna" ||
            sessionRisk.selfHarm !== "ninguna" ||
            sessionRisk.harmToOthers
          ));

          const docItems = [
            {
              icon:   FileText,
              label:  "Nota de Evolución",
              hint:   `Formato ${savedSession.noteFormat?.toUpperCase() || "Libre"}`,
              accent: T.p,
              accentA:"rgba(58,107,110,0.09)",
              border: "rgba(58,107,110,0.22)",
              action: () => {
                const folio = getSessionFolio(savedSession, [...sessions, savedSession]);
                printNotaEvolucion(savedSession, savedPatient, profile, riskAssessments, folio, NOTE_FORMATS);
              },
            },
            {
              icon:   FileCheck,
              label:  "Consentimiento",
              hint:   "Primera sesión",
              accent: LAVANDA,
              accentA:LAVANDA_A,
              border: "rgba(107,91,158,0.22)",
              action: () => printConsentimientoInformado(savedPatient, profile),
            },
            ...(hasRisk ? [{
              icon:   ShieldCheck,
              label:  "Plan de Seguridad",
              hint:   `Riesgo ${sessionRisk.riskLevel || "activo"}`,
              accent: T.err,
              accentA:"rgba(184,80,80,0.09)",
              border: "rgba(184,80,80,0.28)",
              urgent: true,
              action: () => printPlanSeguridad(sessionRisk.safetyPlan, savedPatient, profile, sessionRisk.riskLevel),
            }] : []),
          ];

          return (
            <div style={{
              marginBottom:20,
              border:`1.5px solid ${T.bdr}`,
              borderRadius:14, overflow:"hidden",
            }}>
              {/* Header de la sección */}
              <div style={{
                padding:"10px 16px",
                background:`linear-gradient(135deg, ${T.pA} 0%, rgba(196,137,90,0.07) 100%)`,
                borderBottom:`1px solid ${T.bdrL}`,
                display:"flex", alignItems:"center", gap:8,
              }}>
                <Download size={13} color={T.p}/>
                <span style={{
                  fontFamily:T.fB, fontSize:11, fontWeight:700, color:T.p,
                  textTransform:"uppercase", letterSpacing:"0.07em",
                }}>
                  Documentos para el paciente
                </span>
                <span style={{
                  marginLeft:"auto", fontFamily:T.fB, fontSize:10.5,
                  color:T.tl, fontWeight:400,
                }}>
                  Genera antes de que salga de consulta
                </span>
              </div>

              {/* Cards de documentos */}
              <div style={{
                padding:"10px 10px 8px",
                background:T.card,
                display:"flex", flexDirection:"column", gap:6,
              }}>
                {docItems.map(doc => (
                  <button
                    key={doc.label}
                    onClick={doc.action}
                    style={{
                      display:"flex", alignItems:"center", gap:11,
                      padding:"11px 14px",
                      background: doc.urgent ? doc.accentA : T.cardAlt,
                      border:`1.5px solid ${doc.urgent ? doc.border : T.bdrL}`,
                      borderRadius:10, cursor:"pointer", textAlign:"left",
                      transition:"all .14s", fontFamily:T.fB,
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = doc.accentA;
                      e.currentTarget.style.borderColor = doc.border;
                      e.currentTarget.style.transform = "translateX(2px)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = doc.urgent ? doc.accentA : T.cardAlt;
                      e.currentTarget.style.borderColor = doc.urgent ? doc.border : T.bdrL;
                      e.currentTarget.style.transform = "translateX(0)";
                    }}>
                    <div style={{
                      width:34, height:34, borderRadius:9, flexShrink:0,
                      background:`${doc.accent}18`,
                      border:`1.5px solid ${doc.accent}30`,
                      display:"flex", alignItems:"center", justifyContent:"center",
                    }}>
                      <doc.icon size={16} color={doc.accent} strokeWidth={1.8}/>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:T.t, marginBottom:1 }}>
                        {doc.label}
                      </div>
                      <div style={{ fontSize:11, color:doc.urgent ? doc.accent : T.tl }}>
                        {doc.hint}
                      </div>
                    </div>
                    <Printer size={14} color={doc.accent} style={{ flexShrink:0, opacity:0.7 }}/>
                  </button>
                ))}
              </div>

              {/* Footer de la sección */}
              <div style={{
                padding:"8px 16px",
                background:T.bdrL,
                borderTop:`1px solid ${T.bdrL}`,
                fontFamily:T.fB, fontSize:10.5, color:T.tl,
                display:"flex", alignItems:"center", gap:5,
              }}>
                <Lock size={11} color={T.tl}/>
                Notas de supervisión privadas excluidas de todos los documentos.
              </div>
            </div>
          );
        })()}
        {getServiceOptions().length > 0 ? (
          <Select label="Servicio" value={cobroForm.serviceId} onChange={handleCobroService}
            options={[{value:"",label:"Seleccionar servicio..."}, ...getServiceOptions().map(s => ({value:s.id, label:s.label}))]} />
        ) : (
          <Input label="Concepto" value={cobroForm.concept} onChange={v => setCobroForm(f => ({...f, concept:v}))} placeholder="Sesión individual" />
        )}
        {showCobroModality && (
          <div style={{ padding:"10px 14px", background:T.pA, borderRadius:10, marginBottom:8 }}>
            <div style={{ fontFamily:T.fB, fontSize:12, fontWeight:600, color:T.p, marginBottom:8 }}>¿Modalidad?</div>
            <div style={{ display:"flex", gap:8 }}>
              {[{mod:"presencial", icon:"🏢", label:"Presencial"}, {mod:"virtual", icon:"💻", label:"Virtual"}].map(({mod, icon, label}) => {
                const sel = cobroForm.modality === mod;
                return (
                  <button key={mod} onClick={() => applyCobroModality(mod)}
                    style={{ flex:1, padding:"8px", borderRadius:9, cursor:"pointer", fontFamily:T.fB, fontSize:12, fontWeight:600, transition:"all .15s",
                      border: `1.5px solid ${sel ? T.p : T.bdr}`,
                      background: sel ? T.pA : T.card,
                      color: sel ? T.p : T.t }}>
                    {icon} {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {cobroForm.modality && !showCobroModality && (
          <div style={{ fontFamily:T.fB, fontSize:11, color:T.tm, marginBottom:8 }}>
            {cobroForm.modality === "presencial" ? "🏢 Presencial" : "💻 Virtual"}
            {" · "}<span style={{ color:T.p, cursor:"pointer", textDecoration:"underline" }} onClick={() => setShowCobroModality(true)}>Cambiar</span>
          </div>
        )}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <Input label="Monto (MXN) *" value={cobroForm.amount} onChange={v => setCobroForm(f => ({...f, amount:v}))} type="number" placeholder="900" />
          <Select label="Método" value={cobroForm.method} onChange={v => setCobroForm(f => ({...f, method:v}))}
            options={["Transferencia","Efectivo","Tarjeta","MercadoPago","PayPal"].map(m => ({value:m,label:m}))} />
        </div>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
          <Btn variant="ghost" onClick={skipCobro}>Omitir (pendiente)</Btn>
          <Btn onClick={saveCobro} disabled={!cobroForm.amount}><Check size={15}/> Guardar cobro</Btn>
        </div>
      </Modal>

      {/* ── Modal resumen IA ─────────────────────────────────────────────── */}
      <Modal open={showAiModal} onClose={() => { setShowAiModal(false); setAiSummary(null); setAiError(""); }} title="Resumen clínico con IA" width={540}>
        {aiLoading && (
          <div style={{ textAlign:"center", padding:"32px 0" }}>
            <div style={{ width:36, height:36, borderRadius:"50%", border:`3px solid ${T.bdrL}`, borderTopColor:LAVANDA, animation:"spin .8s linear infinite", margin:"0 auto 16px" }}/>
            <p style={{ fontFamily:T.fB, fontSize:14, color:T.tm }}>Analizando notas clínicas…</p>
          </div>
        )}
        {aiError && (
          <div style={{ padding:"14px 16px", background:T.errA, borderRadius:10, fontFamily:T.fB, fontSize:13, color:T.err }}>{aiError}</div>
        )}
        {aiSummary && !aiLoading && (
          <div>
            <div style={{ background:T.cardAlt, borderRadius:12, padding:"18px 20px", marginBottom:16,
              border:`1.5px solid ${LAVANDA}26`, fontFamily:T.fB, fontSize:13.5,
              color:T.t, lineHeight:1.75, whiteSpace:"pre-wrap" }}>
              {aiSummary}
            </div>
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button onClick={() => navigator.clipboard.writeText(aiSummary)}
                style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:9,
                  border:`1.5px solid ${T.bdr}`, background:"transparent", fontFamily:T.fB,
                  fontSize:13, color:T.tm, cursor:"pointer" }}>
                <Copy size={13}/> Copiar
              </button>
              <button onClick={() => { fld("privateNotes")(aiSummary); setShowAiModal(false); setAiSummary(null); }}
                style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:9,
                  border:"none", background:`${LAVANDA}1F`, fontFamily:T.fB,
                  fontSize:13, color:LAVANDA, fontWeight:600, cursor:"pointer" }}>
                <FileText size={13}/> Agregar a notas privadas
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Task response viewer ─────────────────────────────────────────── */}
      {viewTaskResponse && (() => {
        const tpl = TASK_TEMPLATES[viewTaskResponse.template_id];
        return (
          <TaskResponseModal
            assignment={viewTaskResponse}
            template={tpl}
            onClose={() => setViewTaskResponse(null)}
          />
        );
      })()}

      {/* ── Wizard de Cierre de Sesión (Secciones 8.3 → 8.4 → 8.5) ────────── */}
      <Modal
        open={showCloseWizard}
        onClose={() => setShowCloseWizard(false)}
        title={`Cierre de sesión · Paso ${closeStep} de 5`}
        width={480}
      >
        {closeCtx && (() => {
          const pt = patients.find(p => p.id === closeCtx.patientId);
          const paymentDone = cobroData?.paymentStatus && cobroData.paymentStatus !== "draft";

          // ── Indicador de pasos ──────────────────────────────────────────
          const steps = ["Cobro", "Intersesión", "Tareas", "Próxima cita", "Confirmar"];
          return (
            <>
              {/* Progress bar */}
              <div style={{ display:"flex", gap:6, marginBottom:20 }}>
                {steps.map((lbl, i) => {
                  const idx   = i + 1;
                  const done  = closeStep > idx;
                  const active= closeStep === idx;
                  return (
                    <div key={lbl} style={{ flex:1, textAlign:"center" }}>
                      <div style={{
                        height:4, borderRadius:9999, marginBottom:5,
                        background: done ? T.p : active ? T.p : T.bdrL,
                        opacity: done ? 0.4 : 1,
                        transition:"all .2s",
                      }}/>
                      <span style={{
                        fontFamily:T.fB, fontSize:10, fontWeight: active ? 700 : 400,
                        color: active ? T.p : done ? T.tl : T.tl,
                        textTransform:"uppercase", letterSpacing:"0.06em",
                      }}>{lbl}</span>
                    </div>
                  );
                })}
              </div>

              {/* Header paciente */}
              <div style={{ padding:"10px 14px", background:T.pA, borderRadius:10,
                marginBottom:18, border:`1px solid ${T.p}25` }}>
                <div style={{ fontFamily:T.fB, fontSize:13.5, fontWeight:600, color:T.p }}>
                  {pt?.name?.split(" ").slice(0,2).join(" ") || closeCtx.patientName}
                </div>
                <div style={{ fontFamily:T.fB, fontSize:11.5, color:T.tm, marginTop:2 }}>
                  Sesión del {closeCtx.date}
                </div>
              </div>

              {/* ── Paso 1: Cobro + documentos ─────────────────────────────── */}
              {closeStep === 1 && (
                <>
                  <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px",
                    background:T.sucA, borderRadius:12, marginBottom:14, border:`1px solid ${T.suc}30` }}>
                    <span style={{ fontSize:18 }}>💳</span>
                    <div>
                      <div style={{ fontFamily:T.fB, fontSize:13.5, fontWeight:700, color:T.suc }}>
                        Cobro y documentos de cierre
                      </div>
                      <div style={{ fontFamily:T.fB, fontSize:11.5, color:T.tm, marginTop:1 }}>
                        Todo lo que sale de la sesión queda resuelto aquí, sin abrir otro módulo.
                      </div>
                    </div>
                  </div>

                  {cobroData?.paymentStatus !== "draft" ? (
                    <div style={{ marginBottom:16, padding:"12px 14px", borderRadius:12, border:`1.5px solid ${cobroData.paymentStatus === "pagado" ? T.suc + "40" : T.war + "40"}`, background:cobroData.paymentStatus === "pagado" ? T.sucA : T.warA }}>
                      <div style={{ fontFamily:T.fB, fontSize:13.5, fontWeight:700, color:cobroData.paymentStatus === "pagado" ? T.suc : T.war, marginBottom:4 }}>
                        {cobroData.paymentStatus === "pagado" ? "Pago registrado" : "Cobro pendiente"}
                      </div>
                      <div style={{ fontFamily:T.fB, fontSize:12, color:T.tm, lineHeight:1.5 }}>
                        {cobroData.paymentRecord?.patientName || closeCtx.patientName}
                        {cobroData.paymentFolio ? ` · Folio ${cobroData.paymentFolio}` : ""}
                      </div>
                      <div style={{ fontFamily:T.fB, fontSize:11.5, color:T.tl, marginTop:6 }}>
                        Ya puedes continuar con el seguimiento, tareas y próxima cita.
                      </div>
                    </div>
                  ) : (
                    <>
                      {cobroData?._session && (() => {
                        const savedSession = cobroData._session;
                        const savedPatient = cobroData._patient;
                        const sessionRisk  = riskAssessments?.find(ra => ra.sessionId === savedSession.id);
                        const hasRisk      = !!(sessionRisk && (
                          sessionRisk.suicidalIdeation !== "ninguna" ||
                          sessionRisk.selfHarm !== "ninguna" ||
                          sessionRisk.harmToOthers
                        ));

                        const docItems = [
                          {
                            icon: FileText,
                            label: "Nota de Evolución",
                            hint: `Formato ${savedSession.noteFormat?.toUpperCase() || "Libre"}`,
                            accent: T.p,
                            accentA:"rgba(58,107,110,0.09)",
                            border: "rgba(58,107,110,0.22)",
                            action: () => {
                              const folio = getSessionFolio(savedSession, [...sessions, savedSession]);
                              printNotaEvolucion(savedSession, savedPatient, profile, riskAssessments, folio, NOTE_FORMATS);
                            },
                          },
                          {
                            icon: FileCheck,
                            label: "Consentimiento",
                            hint: "Primera sesión",
                            accent: LAVANDA,
                            accentA:LAVANDA_A,
                            border: "rgba(107,91,158,0.22)",
                            action: () => printConsentimientoInformado(savedPatient, profile),
                          },
                          ...(hasRisk ? [{
                            icon: ShieldCheck,
                            label: "Plan de Seguridad",
                            hint: `Riesgo ${sessionRisk.riskLevel || "activo"}`,
                            accent: T.err,
                            accentA:"rgba(184,80,80,0.09)",
                            border: "rgba(184,80,80,0.28)",
                            urgent: true,
                            action: () => printPlanSeguridad(sessionRisk.safetyPlan, savedPatient, profile, sessionRisk.riskLevel),
                          }] : []),
                        ];

                        return (
                          <div style={{
                            marginBottom:16,
                            border:`1.5px solid ${T.bdr}`,
                            borderRadius:14, overflow:"hidden",
                          }}>
                            <div style={{
                              padding:"10px 16px",
                              background:`linear-gradient(135deg, ${T.pA} 0%, rgba(196,137,90,0.07) 100%)`,
                              borderBottom:`1px solid ${T.bdrL}`,
                              display:"flex", alignItems:"center", gap:8,
                            }}>
                              <Download size={13} color={T.p}/>
                              <span style={{
                                fontFamily:T.fB, fontSize:11, fontWeight:700, color:T.p,
                                textTransform:"uppercase", letterSpacing:"0.07em",
                              }}>
                                Documentos para el paciente
                              </span>
                              <span style={{
                                marginLeft:"auto", fontFamily:T.fB, fontSize:10.5,
                                color:T.tl, fontWeight:400,
                              }}>
                                Genera antes de que salga de consulta
                              </span>
                            </div>

                            <div style={{
                              padding:"10px 10px 8px",
                              background:T.card,
                              display:"flex", flexDirection:"column", gap:6,
                            }}>
                              {docItems.map(doc => (
                                <button
                                  key={doc.label}
                                  onClick={doc.action}
                                  style={{
                                    display:"flex", alignItems:"center", gap:11,
                                    padding:"11px 14px",
                                    background: doc.urgent ? doc.accentA : T.cardAlt,
                                    border:`1.5px solid ${doc.urgent ? doc.border : T.bdrL}`,
                                    borderRadius:10, cursor:"pointer", textAlign:"left",
                                    transition:"all .14s", fontFamily:T.fB,
                                  }}
                                  onMouseEnter={e => {
                                    e.currentTarget.style.background = doc.accentA;
                                    e.currentTarget.style.borderColor = doc.border;
                                    e.currentTarget.style.transform = "translateX(2px)";
                                  }}
                                  onMouseLeave={e => {
                                    e.currentTarget.style.background = doc.urgent ? doc.accentA : T.cardAlt;
                                    e.currentTarget.style.borderColor = doc.urgent ? doc.border : T.bdrL;
                                    e.currentTarget.style.transform = "translateX(0)";
                                  }}>
                                  <div style={{
                                    width:34, height:34, borderRadius:9, flexShrink:0,
                                    background:`${doc.accent}18`,
                                    border:`1.5px solid ${doc.accent}30`,
                                    display:"flex", alignItems:"center", justifyContent:"center",
                                  }}>
                                    <doc.icon size={16} color={doc.accent} strokeWidth={1.8}/>
                                  </div>
                                  <div style={{ flex:1 }}>
                                    <div style={{ fontSize:13, fontWeight:700, color:T.t, marginBottom:1 }}>
                                      {doc.label}
                                    </div>
                                    <div style={{ fontSize:11, color:doc.urgent ? doc.accent : T.tl }}>
                                      {doc.hint}
                                    </div>
                                  </div>
                                  <Printer size={14} color={doc.accent} style={{ flexShrink:0, opacity:0.7 }}/>
                                </button>
                              ))}
                            </div>

                            <div style={{
                              padding:"8px 16px",
                              background:T.bdrL,
                              borderTop:`1px solid ${T.bdrL}`,
                              fontFamily:T.fB, fontSize:10.5, color:T.tl,
                              display:"flex", alignItems:"center", gap:5,
                            }}>
                              <Lock size={11} color={T.tl}/>
                              Notas de supervisión privadas excluidas de todos los documentos.
                            </div>
                          </div>
                        );
                      })()}

                      {getServiceOptions().length > 0 ? (
                        <Select label="Servicio" value={cobroForm.serviceId} onChange={handleCobroService}
                          options={[{value:"",label:"Seleccionar servicio..."}, ...getServiceOptions().map(s => ({value:s.id, label:s.label}))]} />
                      ) : (
                        <Input label="Concepto" value={cobroForm.concept} onChange={v => setCobroForm(f => ({...f, concept:v}))} placeholder="Sesión individual" />
                      )}
                      {showCobroModality && (
                        <div style={{ padding:"10px 14px", background:T.pA, borderRadius:10, marginBottom:8 }}>
                          <div style={{ fontFamily:T.fB, fontSize:12, fontWeight:600, color:T.p, marginBottom:8 }}>¿Modalidad?</div>
                          <div style={{ display:"flex", gap:8 }}>
                            {[{mod:"presencial", icon:"🏢", label:"Presencial"}, {mod:"virtual", icon:"💻", label:"Virtual"}].map(({mod, icon, label}) => {
                              const sel = cobroForm.modality === mod;
                              return (
                                <button key={mod} onClick={() => applyCobroModality(mod)}
                                  style={{ flex:1, padding:"8px", borderRadius:9, cursor:"pointer", fontFamily:T.fB, fontSize:12, fontWeight:600, transition:"all .15s",
                                    border: `1.5px solid ${sel ? T.p : T.bdr}`,
                                    background: sel ? T.pA : T.card,
                                    color: sel ? T.p : T.t }}>
                                  {icon} {label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {cobroForm.modality && !showCobroModality && (
                        <div style={{ fontFamily:T.fB, fontSize:11, color:T.tm, marginBottom:8 }}>
                          {cobroForm.modality === "presencial" ? "🏢 Presencial" : "💻 Virtual"}
                          {" · "}<span style={{ color:T.p, cursor:"pointer", textDecoration:"underline" }} onClick={() => setShowCobroModality(true)}>Cambiar</span>
                        </div>
                      )}
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                        <Input label="Monto (MXN) *" value={cobroForm.amount} onChange={v => setCobroForm(f => ({...f, amount:v}))} type="number" placeholder="900" />
                        <Select label="Método" value={cobroForm.method} onChange={v => setCobroForm(f => ({...f, method:v}))}
                          options={["Transferencia","Efectivo","Tarjeta","MercadoPago","PayPal"].map(m => ({value:m,label:m}))} />
                      </div>
                      <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
                        <Btn variant="ghost" onClick={skipCobro}>Omitir (pendiente)</Btn>
                        <Btn onClick={saveCobro} disabled={!cobroForm.amount}><Check size={15}/> Guardar cobro</Btn>
                      </div>
                    </>
                  )}
                </>
              )}

              {/* ── Paso 2: Intersesión rápida (Sección 8.3) ───────────── */}
              {closeStep === 2 && (
                <>
                  <p style={{ fontFamily:T.fB, fontSize:13, color:T.tm, marginBottom:14, lineHeight:1.6 }}>
                    Registra indicaciones de medicación, contactos de seguimiento o intervenciones pautadas
                    entre sesiones. <span style={{ color:T.tl }}>(Opcional — puedes omitir)</span>
                  </p>
                  <div style={{ marginBottom:14 }}>
                    <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.tm,
                      textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:8 }}>
                      Tipo
                    </label>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                      {["Indicación","Medicación","Contacto de seguimiento","Tarea especial"].map(t => {
                        const on = closeInterForm.type === t;
                        return (
                          <button key={t} onClick={() => cifld("type")(t)}
                            style={{ padding:"6px 12px", borderRadius:9, cursor:"pointer",
                              fontFamily:T.fB, fontSize:12, fontWeight: on ? 700 : 400,
                              border:`1.5px solid ${on ? T.p : T.bdr}`,
                              background: on ? T.pA : "transparent",
                              color: on ? T.p : T.tm, transition:"all .13s" }}>
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div style={{ marginBottom:18 }}>
                    <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.tm,
                      textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>
                      Descripción
                    </label>
                    <textarea value={closeInterForm.notes} onChange={e => cifld("notes")(e.target.value)}
                      rows={3} placeholder="Ej: Continuar con sertralina 50mg. Llamar si hay crisis de ansiedad antes de la próxima cita..."
                      style={{ width:"100%", padding:"10px 14px", border:`1.5px solid ${T.bdr}`,
                        borderRadius:10, fontFamily:T.fB, fontSize:13.5, color:T.t,
                        background:T.card, outline:"none", resize:"vertical",
                        boxSizing:"border-box", lineHeight:1.6 }}/>
                  </div>
                  <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
                    <button onClick={() => setCloseStep(3)}
                      style={{ padding:"9px 16px", borderRadius:9, border:`1px solid ${T.bdrL}`,
                        background:"transparent", fontFamily:T.fB, fontSize:13,
                        color:T.tm, cursor:"pointer" }}>
                      Omitir
                    </button>
                    <button onClick={saveCloseIntersession}
                      style={{ display:"flex", alignItems:"center", gap:6, padding:"9px 18px",
                        borderRadius:9, border:"none", background:T.p, color:"#fff",
                        fontFamily:T.fB, fontSize:13, fontWeight:700, cursor:"pointer" }}>
                      <Check size={14}/> {closeInterForm.notes.trim() ? "Guardar y continuar" : "Continuar"}
                    </button>
                  </div>
                </>
              )}

              {/* ── Paso 3: Asignación de Tareas ───────────────────────── */}
              {closeStep === 3 && (() => {
                const ptWiz = patients.find(p => p.id === closeCtx?.patientId);
                const handleAssignTask = async () => {
                  if (!closeTaskTplId) return;
                  const tpl = TASK_TEMPLATES[closeTaskTplId];
                  if (!tpl) return;
                  setCloseTaskSaving(true);
                  setCloseTaskError("");
                  try {
                    await createAssignment({
                      patientId:    closeCtx.patientId,
                      patientName:  ptWiz?.name || closeCtx.patientName,
                      patientPhone: ptWiz?.phone?.replace(/\D/g, "") || "",
                      templateId:   closeTaskTplId,
                      title:        tpl.title,
                      notes:        closeTaskNotes.trim() || null,
                      sessionId:    closeCtx.sessionId,
                    });
                    emit.taskAssigned({ patientId: closeCtx.patientId, patientName: ptWiz?.name || closeCtx.patientName, sessionId: closeCtx.sessionId, count: 1 });
                    setCloseTaskAssigned(true);
                  } catch {
                    setCloseTaskError("No se pudo guardar la tarea. Verifica la conexión.");
                  } finally {
                    setCloseTaskSaving(false);
                  }
                };
                return (
                  <>
                    <p style={{ fontFamily:T.fB, fontSize:13, color:T.tm, marginBottom:14, lineHeight:1.6 }}>
                      Asigna una tarea terapéutica para trabajar antes de la próxima sesión.
                      <span style={{ color:T.tl }}> (Opcional — puedes omitir)</span>
                    </p>

                    {/* Lista de plantillas */}
                    {!closeTaskAssigned && (
                      <>
                        <div style={{ maxHeight:220, overflowY:"auto", border:`1.5px solid ${T.bdr}`, borderRadius:10, padding:6, background:T.cardAlt, display:"flex", flexDirection:"column", gap:4, marginBottom:12 }}>
                          {Object.values(TASK_TEMPLATES).map(tpl => {
                            const sel = closeTaskTplId === tpl.id;
                            return (
                              <button key={tpl.id} onClick={() => setCloseTaskTplId(sel ? null : tpl.id)}
                                style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 10px", borderRadius:8,
                                  border:`1.5px solid ${sel ? T.p : T.bdr}`, background:sel ? T.pA : T.card,
                                  cursor:"pointer", textAlign:"left", transition:"all .12s" }}>
                                <span style={{ fontSize:18, lineHeight:1, flexShrink:0 }}>{tpl.icon}</span>
                                <div style={{ flex:1, overflow:"hidden" }}>
                                  <div style={{ fontFamily:T.fB, fontSize:12.5, fontWeight:sel?700:500, color:sel?T.p:T.t, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{tpl.title}</div>
                                  <div style={{ fontFamily:T.fB, fontSize:10.5, color:T.tl }}>{tpl.category}</div>
                                </div>
                                {sel && <Check size={14} color={T.p} style={{ flexShrink:0 }}/>}
                              </button>
                            );
                          })}
                        </div>

                        {/* Nota personalizada */}
                        {closeTaskTplId && (
                          <div style={{ marginBottom:12 }}>
                            <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.tm,
                              textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>
                              Instrucción o nota para el paciente <span style={{ fontWeight:400, textTransform:"none", letterSpacing:0 }}>(opcional)</span>
                            </label>
                            <textarea value={closeTaskNotes} onChange={e => setCloseTaskNotes(e.target.value)} rows={2}
                              placeholder="Ej. Completa esto antes del jueves, enfocándote en las situaciones del trabajo..."
                              style={{ width:"100%", padding:"10px 14px", border:`1.5px solid ${T.bdr}`,
                                borderRadius:10, fontFamily:T.fB, fontSize:13, color:T.t,
                                background:T.card, outline:"none", resize:"vertical",
                                boxSizing:"border-box", lineHeight:1.6 }}/>
                          </div>
                        )}

                        {closeTaskError && (
                          <div style={{ padding:"9px 12px", background:T.errA, borderRadius:9, fontFamily:T.fB, fontSize:12, color:T.err, marginBottom:10 }}>
                            ⚠️ {closeTaskError}
                          </div>
                        )}
                      </>
                    )}

                    {/* Estado de confirmación */}
                    {closeTaskAssigned && (
                      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"14px 16px",
                        background:T.sucA, borderRadius:12, border:`1.5px solid ${T.suc}40`, marginBottom:14 }}>
                        <span style={{ fontSize:20 }}>✓</span>
                        <div style={{ fontFamily:T.fB, fontSize:13, fontWeight:700, color:T.suc }}>
                          Tarea asignada correctamente
                        </div>
                      </div>
                    )}

                    <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
                    <button onClick={() => setCloseStep(4)}
                      style={{ padding:"9px 16px", borderRadius:9, border:`1px solid ${T.bdrL}`,
                        background:"transparent", fontFamily:T.fB, fontSize:13,
                        color:T.tm, cursor:"pointer" }}>
                      {closeTaskAssigned ? "Continuar" : "Omitir este paso"}
                    </button>
                      {!closeTaskAssigned && closeTaskTplId && (
                        <button onClick={handleAssignTask} disabled={closeTaskSaving}
                          style={{ display:"flex", alignItems:"center", gap:6, padding:"9px 18px",
                            borderRadius:9, border:"none", background:T.p, color:"#fff",
                            fontFamily:T.fB, fontSize:13, fontWeight:700, cursor:"pointer",
                            opacity: closeTaskSaving ? 0.7 : 1 }}>
                          <ClipboardCheck size={14}/> {closeTaskSaving ? "Guardando…" : "Asignar tarea"}
                        </button>
                      )}
                    </div>
                  </>
                );
              })()}

              {/* ── Paso 4: Próxima cita (Sección 8.4) ─────────────────── */}
              {closeStep === 4 && (
                <>
                  <p style={{ fontFamily:T.fB, fontSize:13, color:T.tm, marginBottom:16, lineHeight:1.6 }}>
                    Agenda la próxima sesión directamente desde aquí.
                    <span style={{ color:T.tl }}> (Opcional — puedes omitir)</span>
                  </p>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
                    <div>
                      <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.tm,
                        textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>Fecha</label>
                      <input type="date" value={closeNextAppt.date}
                        onChange={e => cnfld("date")(e.target.value)}
                        style={{ width:"100%", padding:"10px 14px", border:`1.5px solid ${T.bdr}`,
                          borderRadius:10, fontFamily:T.fB, fontSize:14, color:T.t,
                          background:T.card, outline:"none", boxSizing:"border-box" }}/>
                    </div>
                    <div>
                      <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.tm,
                        textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>Hora</label>
                      <input type="time" value={closeNextAppt.time}
                        onChange={e => cnfld("time")(e.target.value)}
                        style={{ width:"100%", padding:"10px 14px", border:`1.5px solid ${T.bdr}`,
                          borderRadius:10, fontFamily:T.fB, fontSize:14, color:T.t,
                          background:T.card, outline:"none", boxSizing:"border-box" }}/>
                    </div>
                  </div>
                  <div style={{ marginBottom:18 }}>
                    <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.tm,
                      textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>Tipo</label>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                      {["Seguimiento","Evaluación","Crisis","Cierre"].map(t => {
                        const on = closeNextAppt.type === t;
                        return (
                          <button key={t} onClick={() => cnfld("type")(t)}
                            style={{ padding:"6px 12px", borderRadius:9, cursor:"pointer",
                              fontFamily:T.fB, fontSize:12, fontWeight: on ? 700 : 400,
                              border:`1.5px solid ${on ? T.p : T.bdr}`,
                              background: on ? T.pA : "transparent",
                              color: on ? T.p : T.tm, transition:"all .13s" }}>
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
                    <button onClick={() => setCloseStep(5)}
                      style={{ padding:"9px 16px", borderRadius:9, border:`1px solid ${T.bdrL}`,
                        background:"transparent", fontFamily:T.fB, fontSize:13,
                        color:T.tm, cursor:"pointer" }}>
                      Omitir
                    </button>
                    <button onClick={saveCloseNextAppt}
                      style={{ display:"flex", alignItems:"center", gap:6, padding:"9px 18px",
                        borderRadius:9, border:"none", background:T.p, color:"#fff",
                        fontFamily:T.fB, fontSize:13, fontWeight:700, cursor:"pointer" }}>
                      <Check size={14}/> {closeNextAppt.date ? "Agendar y continuar" : "Continuar"}
                    </button>
                  </div>
                </>
              )}

              {/* ── Paso 5: Confirmación WhatsApp (Sección 8.5) ──────────── */}
              {closeStep === 5 && (() => {
                const waUrl = whatsappNextAppt();
                return (
                  <>
                    <div style={{ textAlign:"center", padding:"8px 0 20px" }}>
                      <div style={{ fontSize:40, marginBottom:10 }}>✅</div>
                      <div style={{ fontFamily:T.fB, fontSize:16, fontWeight:700, color:T.t, marginBottom:6 }}>
                        Sesión cerrada correctamente
                      </div>
                      <div style={{ fontFamily:T.fB, fontSize:13, color:T.tm }}>
                        {closeInterForm.notes.trim() && "Intersesión registrada · "}
                        {closeNextAppt.date && `Próxima cita: ${closeNextAppt.date} ${closeNextAppt.time}`}
                      </div>
                    </div>

                    {waUrl ? (
                      <a href={waUrl} target="_blank" rel="noreferrer"
                        style={{ display:"flex", alignItems:"center", justifyContent:"center",
                          gap:8, padding:"14px", borderRadius:12, marginBottom:12,
                          background:"#25D36618", border:"1.5px solid #25D36650",
                          color:"#25D366", fontFamily:T.fB, fontSize:14,
                          fontWeight:700, textDecoration:"none", transition:"all .15s" }}
                        onMouseEnter={e => e.currentTarget.style.background="#25D36628"}
                        onMouseLeave={e => e.currentTarget.style.background="#25D36618"}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="#25D366">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.556 4.116 1.529 5.845L.057 23.492l5.799-1.522A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.011-1.374l-.359-.214-3.44.902.918-3.352-.234-.372A9.818 9.818 0 1112 21.818z"/>
                        </svg>
                        Enviar próxima sesión por WhatsApp
                      </a>
                    ) : (
                      <div style={{ padding:"12px 14px", background:T.bdrL, borderRadius:10,
                        fontFamily:T.fB, fontSize:12, color:T.tl, marginBottom:12, textAlign:"center" }}>
                        Sin teléfono registrado — no se puede enviar WhatsApp
                      </div>
                    )}

                    <button onClick={() => setShowCloseWizard(false)}
                      style={{ width:"100%", padding:"11px", borderRadius:10, border:`1px solid ${T.bdrL}`,
                        background:"transparent", fontFamily:T.fB, fontSize:13, color:T.tm, cursor:"pointer" }}>
                      Finalizar
                    </button>
                  </>
                );
              })()}
            </>
          );
        })()}
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
              <Btn variant="accent" onClick={() => { printReferralLetter(referral.patient, referral.session, profile, refForm); setReferral(null); }} disabled={!refForm.reason.trim()}>
                <Printer size={14}/> Generar carta PDF
              </Btn>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

