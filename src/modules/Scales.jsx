import { useState, useMemo } from "react";
import { ClipboardList, Plus, Printer, Trash2, Check, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { T } from "../theme.js";
import { uid, fmt, todayDate, fmtDate } from "../utils.js";
import { Card, Badge, Modal, Select, Btn, EmptyState, PageHeader, Tabs } from "../components/ui/index.jsx";

// ─────────────────────────────────────────────────────────────────────────────
// SCALE DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────
export const SCALES = {
  PHQ9: {
    id: "PHQ9",
    name: "PHQ-9",
    fullName: "Patient Health Questionnaire-9",
    domain: "Depresión",
    color: "#5B8DB8",
    bg: "rgba(91,141,184,0.10)",
    maxScore: 27,
    responseLabels: ["Para nada", "Varios días", "Más de la mitad", "Casi todos los días"],
    questions: [
      "Poco interés o placer en hacer las cosas",
      "Sentirse decaído/a, deprimido/a o sin esperanza",
      "Dificultad para quedarse o permanecer dormido/a, o dormir demasiado",
      "Sentirse cansado/a o con poca energía",
      "Tener poco apetito o comer en exceso",
      "Sentirse mal sobre sí mismo/a, sentirse fracasado/a, o que ha fallado a sí mismo/a o a su familia",
      "Dificultad para concentrarse en cosas como leer el periódico o ver la televisión",
      "Moverse o hablar tan despacio que otras personas lo notaron, o lo contrario: estar tan inquieto/a que ha estado moviéndose mucho más de lo normal",
      "Pensamientos de que sería mejor estar muerto/a, o de hacerse daño de alguna manera",
    ],
    severity: [
      { max: 4,  label: "Mínima",   color: T.suc,        bg: T.sucA                       },
      { max: 9,  label: "Leve",     color: "#7DBB8A",    bg: "rgba(125,187,138,0.12)"      },
      { max: 14, label: "Moderada", color: T.war,        bg: T.warA                        },
      { max: 19, label: "Mod-grave",color: "#C4622A",    bg: "rgba(196,98,42,0.10)"        },
      { max: 27, label: "Grave",    color: T.err,        bg: T.errA                        },
    ],
    clinicalNote: "Puntuación ≥ 10 sugiere depresión mayor. Ítem 9 (ideación suicida) requiere evaluación inmediata independientemente del total.",
  },

  GAD7: {
    id: "GAD7",
    name: "GAD-7",
    fullName: "Generalized Anxiety Disorder-7",
    domain: "Ansiedad",
    color: "#B8900A",
    bg: "rgba(184,144,10,0.10)",
    maxScore: 21,
    responseLabels: ["Para nada", "Varios días", "Más de la mitad", "Casi todos los días"],
    questions: [
      "Sentirse nervioso/a, ansioso/a o con los nervios de punta",
      "No poder dejar de preocuparse o no poder controlar la preocupación",
      "Preocuparse demasiado por diferentes cosas",
      "Dificultad para relajarse",
      "Estar tan inquieto/a que es difícil permanecer sentado/a",
      "Molestarse o ponerse irritable fácilmente",
      "Sentir miedo como si algo terrible pudiera pasar",
    ],
    severity: [
      { max: 4,  label: "Mínima",   color: T.suc,     bg: T.sucA  },
      { max: 9,  label: "Leve",     color: "#7DBB8A", bg: "rgba(125,187,138,0.12)" },
      { max: 14, label: "Moderada", color: T.war,     bg: T.warA  },
      { max: 21, label: "Grave",    color: T.err,     bg: T.errA  },
    ],
    clinicalNote: "Puntuación ≥ 10 sugiere trastorno de ansiedad generalizada que amerita evaluación adicional.",
  },

  BAI: {
    id: "BAI",
    name: "BAI",
    fullName: "Beck Anxiety Inventory",
    domain: "Ansiedad somática",
    color: "#9B6B9E",
    bg: "rgba(155,107,158,0.10)",
    maxScore: 63,
    responseLabels: ["Para nada", "Levemente", "Moderadamente", "Severamente"],
    questions: [
      "Entumecimiento u hormigueo",
      "Sensación de calor",
      "Temblor en las piernas",
      "Incapacidad de relajarse",
      "Miedo a que ocurra lo peor",
      "Mareo o aturdimiento",
      "Palpitaciones o aceleración del corazón",
      "Inestabilidad",
      "Aterrorizado/a",
      "Nerviosismo",
      "Sensación de ahogo",
      "Temblores en las manos",
      "Temblor generalizado",
      "Miedo a perder el control",
      "Dificultad para respirar",
      "Miedo a morir",
      "Asustado/a",
      "Indigestión o malestar abdominal",
      "Sensación de desmayo",
      "Rubor facial",
      "Sudoración (no debida al calor)",
    ],
    severity: [
      { max: 7,  label: "Mínima",   color: T.suc,        bg: T.sucA                  },
      { max: 15, label: "Leve",     color: "#7DBB8A",    bg: "rgba(125,187,138,0.12)" },
      { max: 25, label: "Moderada", color: T.war,        bg: T.warA                  },
      { max: 63, label: "Grave",    color: T.err,        bg: T.errA                  },
    ],
    clinicalNote: "Evalúa síntomas somáticos de ansiedad durante la última semana. Complementa al GAD-7.",
  },

  PCL5: {
    id: "PCL5",
    name: "PCL-5",
    fullName: "PTSD Checklist for DSM-5",
    domain: "Trauma / TEPT",
    color: "#6B5B9E",
    bg: "rgba(107,91,158,0.10)",
    maxScore: 80,
    responseLabels: ["Para nada", "Un poco", "Moderadamente", "Bastante", "Extremadamente"],
    questions: [
      "Recuerdos angustiantes repetitivos, involuntarios e intrusivos del evento traumático",
      "Sueños angustiantes recurrentes relacionados con el evento traumático",
      "Actuar o sentirse como si el evento traumático estuviera ocurriendo de nuevo",
      "Sentirse muy angustiado/a ante recordatorios internos o externos del evento",
      "Tener reacciones físicas fuertes ante recordatorios del evento",
      "Evitar recuerdos, pensamientos o sentimientos relacionados con el evento",
      "Evitar recordatorios externos del evento (personas, lugares, conversaciones, actividades, objetos, situaciones)",
      "No poder recordar aspectos importantes del evento traumático",
      "Creencias o expectativas negativas y persistentes sobre uno mismo, los demás o el mundo",
      "Culparse persistentemente a uno mismo o a otros por el evento o sus consecuencias",
      "Sentimientos negativos intensos y persistentes (miedo, horror, ira, culpa o vergüenza)",
      "Pérdida de interés en actividades que antes disfrutaba",
      "Sentirse distante o alejado/a de otras personas",
      "Incapacidad para experimentar emociones positivas",
      "Comportamiento irritable, arrebatos de ira o agresión",
      "Conductas imprudentes o autodestructivas",
      "Estar en un estado de alerta exagerado",
      "Sobresaltarse fácilmente",
      "Dificultad para concentrarse",
      "Problemas para dormir",
    ],
    severity: [
      { max: 32, label: "Subclínico", color: T.suc,     bg: T.sucA  },
      { max: 80, label: "Clínico",    color: T.err,     bg: T.errA  },
    ],
    clinicalNote: "Punto de corte sugerido ≥ 33 para TEPT probable. No es diagnóstico — requiere evaluación clínica.",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
export function getSeverity(scaleId, score) {
  const scale = SCALES[scaleId];
  if (!scale) return null;
  return scale.severity.find(s => score <= s.max) || scale.severity[scale.severity.length - 1];
}

function ScoreBadge({ scaleId, score, size = "normal" }) {
  const sev = getSeverity(scaleId, score);
  if (!sev) return null;
  const small = size === "small";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: small ? "2px 8px" : "4px 12px", borderRadius: 9999, fontSize: small ? 10 : 11, fontWeight: 700, fontFamily: T.fB, color: sev.color, background: sev.bg, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
      <span style={{ fontSize: small ? 11 : 13, fontWeight: 800 }}>{score}</span>
      {sev.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MINI SPARKLINE CHART
// ─────────────────────────────────────────────────────────────────────────────
function ScoreSparkline({ results, scaleId }) {
  if (results.length < 2) return null;
  const scale = SCALES[scaleId];
  const sorted = [...results].sort((a, b) => a.date.localeCompare(b.date)).slice(-10);
  const W = 320, H = 80, PAD = 12;
  const xScale = i => PAD + (i / Math.max(sorted.length - 1, 1)) * (W - PAD * 2);
  const yScale = v => H - PAD - (v / scale.maxScore) * (H - PAD * 2);

  const path = sorted.map((r, i) => `${i === 0 ? "M" : "L"}${xScale(i)},${yScale(r.score)}`).join(" ");
  const area = `${path} L${xScale(sorted.length - 1)},${H - PAD} L${xScale(0)},${H - PAD} Z`;

  const last  = sorted[sorted.length - 1];
  const prev  = sorted[sorted.length - 2];
  const delta = last.score - prev.score;
  const TrendIcon = delta < 0 ? TrendingDown : delta > 0 ? TrendingUp : Minus;
  const trendColor = delta < 0 ? T.suc : delta > 0 ? T.err : T.tm;

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: T.tm, textTransform: "uppercase", letterSpacing: "0.07em" }}>Evolución ({sorted.length} aplicaciones)</span>
        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, color: trendColor }}>
          <TrendIcon size={13}/>{delta !== 0 ? `${delta > 0 ? "+" : ""}${delta} pts` : "Sin cambio"}
        </span>
      </div>
      <div style={{ background: T.cardAlt, borderRadius: 12, padding: "12px 16px" }}>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: "block" }}>
          <defs>
            <linearGradient id={`grad-${scaleId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={scale.color} stopOpacity="0.15"/>
              <stop offset="100%" stopColor={scale.color} stopOpacity="0"/>
            </linearGradient>
          </defs>
          {/* area fill */}
          <path d={area} fill={`url(#grad-${scaleId})`}/>
          {/* line */}
          <path d={path} fill="none" stroke={scale.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          {/* dots */}
          {sorted.map((r, i) => {
            const sev = getSeverity(scaleId, r.score);
            return <circle key={i} cx={xScale(i)} cy={yScale(r.score)} r="4" fill={sev?.color || scale.color} stroke="#fff" strokeWidth="1.5"/>;
          })}
        </svg>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          <span style={{ fontFamily: T.fB, fontSize: 10, color: T.tl }}>{fmtDate(sorted[0].date)}</span>
          <span style={{ fontFamily: T.fB, fontSize: 10, color: T.tl }}>{fmtDate(sorted[sorted.length - 1].date)}</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF EXPORT
// ─────────────────────────────────────────────────────────────────────────────
function printScaleResult(result, patient, profile) {
  const scale = SCALES[result.scaleId];
  const sev   = getSeverity(result.scaleId, result.score);
  const w     = window.open("", "_blank");
  const today = new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });

  const rows = result.answers.map((ans, i) => `
    <tr style="border-bottom:1px solid #EDF1F0">
      <td style="padding:8px 12px;font-size:12px;color:#5A7270;width:32px">${i + 1}</td>
      <td style="padding:8px 12px;font-size:12px;line-height:1.5">${scale.questions[i]}</td>
      <td style="padding:8px 12px;font-size:12px;font-weight:600;text-align:center;color:#1A2B28;white-space:nowrap">${scale.responseLabels[ans]} (${ans})</td>
    </tr>`).join("");

  w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>${scale.name} — ${patient?.name}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',sans-serif;max-width:740px;margin:40px auto;color:#1A2B28;font-size:13px;line-height:1.6}
.header{border-bottom:3px solid #3A6B6E;padding-bottom:20px;margin-bottom:28px;display:flex;justify-content:space-between;align-items:flex-start}
h1{font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:600;color:#3A6B6E;margin-bottom:4px}
.sub{font-size:12px;color:#5A7270}
.score-box{text-align:right}
.score-num{font-family:'Cormorant Garamond',serif;font-size:48px;font-weight:500;line-height:1;color:${sev?.color || "#3A6B6E"}}
.score-label{font-size:12px;font-weight:700;color:${sev?.color || "#3A6B6E"};text-transform:uppercase;letter-spacing:.06em}
.info-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:28px}
.info-box{background:#F9F8F5;padding:12px;border-radius:8px}
.info-box label{display:block;font-size:10px;font-weight:700;color:#9BAFAD;text-transform:uppercase;letter-spacing:.08em;margin-bottom:3px}
.info-box p{font-size:13px;font-weight:500}
table{width:100%;border-collapse:collapse;margin-bottom:24px}
.clinical-note{background:rgba(58,107,110,0.06);border-left:4px solid #3A6B6E;padding:12px 16px;border-radius:0 8px 8px 0;font-size:12px;color:#3A6B6E;margin-bottom:24px}
.sig{margin-top:40px;display:flex;justify-content:flex-end}
.sig-line{width:200px;border-top:1px solid #1A2B28;padding-top:6px;font-size:12px;color:#5A7270}
footer{margin-top:40px;padding-top:14px;border-top:1px solid #D8E2E0;font-size:11px;color:#9BAFAD;display:flex;justify-content:space-between}
@media print{body{margin:0}}
</style></head><body>
<div class="header">
  <div>
    <h1>${scale.name} — ${scale.fullName}</h1>
    <div class="sub">${profile?.clinic || "Consultorio Psicológico"}${profile?.name ? " · " + profile.name : ""}${profile?.cedula ? " · Céd. " + profile.cedula : ""}</div>
  </div>
  <div class="score-box">
    <div class="score-num">${result.score}</div>
    <div class="score-label">${sev?.label}</div>
    <div style="font-size:11px;color:#9BAFAD">/ ${scale.maxScore} pts</div>
  </div>
</div>

<div class="info-grid">
  <div class="info-box"><label>Paciente</label><p>${patient?.name || "—"}</p></div>
  <div class="info-box"><label>Fecha</label><p>${fmtDate(result.date)}</p></div>
  <div class="info-box"><label>Escala</label><p>${scale.name}</p></div>
  <div class="info-box"><label>Severidad</label><p style="color:${sev?.color}">${sev?.label}</p></div>
</div>

<div class="clinical-note">📋 ${scale.clinicalNote}</div>

<table>
  <thead>
    <tr style="background:#F9F8F5">
      <th style="padding:10px 12px;text-align:left;font-size:10px;color:#9BAFAD;text-transform:uppercase;letter-spacing:.07em;width:32px">#</th>
      <th style="padding:10px 12px;text-align:left;font-size:10px;color:#9BAFAD;text-transform:uppercase;letter-spacing:.07em">Ítem</th>
      <th style="padding:10px 12px;text-align:center;font-size:10px;color:#9BAFAD;text-transform:uppercase;letter-spacing:.07em">Respuesta</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>

${result.notes ? `<div style="margin-bottom:24px"><div style="font-size:10px;font-weight:700;color:#9BAFAD;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">Observaciones clínicas</div><div style="background:#F9F8F5;padding:14px;border-radius:8px;font-size:13px;line-height:1.7">${result.notes}</div></div>` : ""}

<div class="sig"><div class="sig-line">${profile?.name || "Terapeuta"}${profile?.cedula ? " · Céd. " + profile.cedula : ""}</div></div>
<footer><span>PsychoCore · ${scale.name}</span><span>${today} · Documento confidencial</span></footer>
</body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 500);
}

// ─────────────────────────────────────────────────────────────────────────────
// SCALE APPLICATION FORM
// ─────────────────────────────────────────────────────────────────────────────
function ScaleForm({ scaleId, patients, onSave, onClose }) {
  const scale = SCALES[scaleId];
  const totalQ = scale.questions.length;
  const maxAns = scale.responseLabels.length - 1;

  const [patientId, setPatientId] = useState("");
  const [date,      setDate]      = useState(fmt(todayDate));
  const [answers,   setAnswers]   = useState(Array(totalQ).fill(null));
  const [notes,     setNotes]     = useState("");
  const [step,      setStep]      = useState(0); // current question index

  const CHUNK = 5; // questions per page
  const totalPages = Math.ceil(totalQ / CHUNK);
  const pageStart  = step * CHUNK;
  const pageEnd    = Math.min(pageStart + CHUNK, totalQ);
  const pageQ      = scale.questions.slice(pageStart, pageEnd);

  const answered    = answers.filter(a => a !== null).length;
  const allAnswered = answered === totalQ;
  const score       = answers.reduce((s, a) => s + (a ?? 0), 0);
  const sev         = allAnswered ? getSeverity(scaleId, score) : null;

  const pageComplete = pageQ.every((_, i) => answers[pageStart + i] !== null);

  const setAnswer = (qi, val) => {
    setAnswers(prev => { const next = [...prev]; next[qi] = val; return next; });
  };

  const handleSave = () => {
    if (!patientId || !allAnswered) return;
    onSave({ patientId, date, scaleId, answers, score, notes });
  };

  // Progress bar
  const pct = (answered / totalQ) * 100;

  return (
    <div>
      {/* Header info */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.tm, marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" }}>Paciente *</label>
          <select value={patientId} onChange={e => setPatientId(e.target.value)}
            style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 14, color: T.t, background: T.card, outline: "none" }}>
            <option value="">Seleccionar...</option>
            {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.tm, marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" }}>Fecha</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 14, color: T.t, background: T.card, outline: "none" }}/>
        </div>
      </div>

      {/* Progress */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontFamily: T.fB, fontSize: 12, color: T.tm }}>{answered} / {totalQ} ítems respondidos</span>
          {allAnswered && sev && (
            <span style={{ fontFamily: T.fB, fontSize: 12, fontWeight: 700, color: sev.color }}>
              Score: {score} — {sev.label}
            </span>
          )}
        </div>
        <div style={{ height: 6, background: T.bdrL, borderRadius: 9999, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: scale.color, borderRadius: 9999, transition: "width .3s ease" }}/>
        </div>
      </div>

      {/* Questions for current page */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: T.fB, fontSize: 11, fontWeight: 700, color: T.tl, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 14 }}>
          Preguntas {pageStart + 1}–{pageEnd} de {totalQ}
        </div>
        {pageQ.map((q, localIdx) => {
          const qi  = pageStart + localIdx;
          const ans = answers[qi];
          return (
            <div key={qi} style={{ marginBottom: 16, padding: "14px 16px", background: ans !== null ? T.pA : T.cardAlt, borderRadius: 12, border: `1.5px solid ${ans !== null ? T.p : T.bdrL}`, transition: "all .15s" }}>
              <div style={{ fontFamily: T.fB, fontSize: 13.5, color: T.t, marginBottom: 12, lineHeight: 1.55 }}>
                <span style={{ fontWeight: 700, color: T.p, marginRight: 6 }}>{qi + 1}.</span>{q}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {scale.responseLabels.map((label, val) => {
                  const selected = ans === val;
                  return (
                    <button key={val} onClick={() => setAnswer(qi, val)}
                      style={{ flex: 1, minWidth: 80, padding: "8px 6px", border: `2px solid ${selected ? scale.color : T.bdr}`, borderRadius: 10, background: selected ? `rgba(${scale.color === T.war ? "184,144,10" : scale.color === T.err ? "184,80,80" : "58,107,110"},0.10)` : "transparent", cursor: "pointer", fontFamily: T.fB, fontSize: 12, fontWeight: selected ? 700 : 400, color: selected ? scale.color : T.tm, transition: "all .13s", textAlign: "center", lineHeight: 1.3 }}>
                      <span style={{ display: "block", fontSize: 16, fontWeight: 800, marginBottom: 2 }}>{val}</span>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Notes (last page only) */}
      {step === totalPages - 1 && (
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.tm, marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" }}>Observaciones clínicas (opcional)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
            placeholder="Contexto clínico, comportamiento durante la aplicación, notas para el expediente..."
            style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 14, color: T.t, background: T.card, outline: "none", resize: "vertical", boxSizing: "border-box" }}/>
        </div>
      )}

      {/* Result preview when all answered */}
      {allAnswered && sev && step === totalPages - 1 && (
        <div style={{ padding: "16px 20px", background: sev.bg, border: `1.5px solid ${sev.color}`, borderRadius: 14, marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: T.fB, fontSize: 11, fontWeight: 700, color: sev.color, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Resultado</div>
            <div style={{ fontFamily: T.fH, fontSize: 28, fontWeight: 500, color: sev.color }}>{score} <span style={{ fontSize: 14 }}>/ {scale.maxScore}</span></div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: T.fB, fontSize: 20, fontWeight: 700, color: sev.color }}>{sev.label}</div>
            <div style={{ fontFamily: T.fB, fontSize: 11, color: T.tm, maxWidth: 200, lineHeight: 1.4 }}>{scale.clinicalNote}</div>
          </div>
        </div>
      )}

      {/* Nav */}
      <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 16, borderTop: `1px solid ${T.bdrL}` }}>
        <Btn variant="ghost" onClick={step === 0 ? onClose : () => setStep(s => s - 1)}>
          {step === 0 ? "Cancelar" : "← Atrás"}
        </Btn>
        {step < totalPages - 1
          ? <Btn onClick={() => setStep(s => s + 1)} disabled={!pageComplete || !patientId}>Continuar →</Btn>
          : <Btn onClick={handleSave} disabled={!patientId || !allAnswered}><Check size={15}/> Guardar resultado</Btn>
        }
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RESULT CARD
// ─────────────────────────────────────────────────────────────────────────────
function ResultCard({ r, patient, profile, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const scale = SCALES[r.scaleId];
  const sev   = getSeverity(r.scaleId, r.score);
  if (!scale || !sev) return null;

  return (
    <Card style={{ padding: 20, marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            <span style={{ fontFamily: T.fH, fontSize: 17, fontWeight: 500, color: T.t }}>{patient?.name?.split(" ").slice(0, 2).join(" ") || "Paciente"}</span>
            <span style={{ fontSize: 11, color: T.tl }}>·</span>
            <span style={{ padding: "2px 8px", borderRadius: 9999, background: scale.bg, color: scale.color, fontSize: 11, fontWeight: 700, fontFamily: T.fB }}>{scale.name}</span>
            <span style={{ fontSize: 11, color: T.tl }}>·</span>
            <span style={{ fontFamily: T.fB, fontSize: 13, color: T.tm }}>{fmtDate(r.date)}</span>
            <ScoreBadge scaleId={r.scaleId} score={r.score}/>
          </div>
          {r.notes && <p style={{ fontFamily: T.fB, fontSize: 13, color: T.tm, margin: 0, lineHeight: 1.6 }}>{r.notes}</p>}

          {expanded && (
            <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px,1fr))", gap: 6 }}>
              {r.answers.map((ans, i) => (
                <div key={i} style={{ padding: "8px 10px", background: T.cardAlt, borderRadius: 8, display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span style={{ fontFamily: T.fB, fontSize: 10, fontWeight: 800, color: T.tl, minWidth: 16, paddingTop: 1 }}>{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: T.fB, fontSize: 11, color: T.tm, lineHeight: 1.4, marginBottom: 3 }}>{scale.questions[i].slice(0, 50)}{scale.questions[i].length > 50 ? "…" : ""}</div>
                    <span style={{ fontFamily: T.fB, fontSize: 11, fontWeight: 700, color: ans > 0 ? sev.color : T.suc }}>{scale.responseLabels[ans]} ({ans})</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 5, flexShrink: 0 }}>
          <button onClick={() => setExpanded(e => !e)} title={expanded ? "Contraer" : "Ver respuestas"} style={{ background: T.bdrL, border: "none", borderRadius: 8, padding: 8, cursor: "pointer", color: T.tm }}>
            {expanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
          </button>
          <button onClick={() => printScaleResult(r, patient, profile)} title="Exportar PDF" style={{ background: T.bdrL, border: "none", borderRadius: 8, padding: 8, cursor: "pointer", color: T.tm }}>
            <Printer size={14}/>
          </button>
          <button onClick={() => onDelete(r.id)} style={{ background: "none", border: "none", color: T.tl, cursor: "pointer", padding: 8 }}>
            <Trash2 size={14}/>
          </button>
        </div>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PATIENT SUMMARY VIEW
// ─────────────────────────────────────────────────────────────────────────────
function PatientSummary({ patient, results, profile }) {
  const [expanded, setExpanded] = useState(false);
  const byScale = useMemo(() => {
    const map = {};
    results.forEach(r => { if (!map[r.scaleId]) map[r.scaleId] = []; map[r.scaleId].push(r); });
    return map;
  }, [results]);

  const scales = Object.keys(byScale);
  if (scales.length === 0) return null;

  return (
    <Card style={{ padding: 20, marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: expanded ? 16 : 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: "50%", background: T.pA, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: T.fH, fontSize: 18, color: T.p }}>{patient.name[0]}</span>
          </div>
          <div>
            <div style={{ fontFamily: T.fH, fontSize: 17, fontWeight: 500, color: T.t }}>{patient.name.split(" ").slice(0, 2).join(" ")}</div>
            <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
              {scales.map(sid => {
                const latest = byScale[sid].sort((a, b) => b.date.localeCompare(a.date))[0];
                return <ScoreBadge key={sid} scaleId={sid} score={latest.score} size="small"/>;
              })}
            </div>
          </div>
        </div>
        <button onClick={() => setExpanded(e => !e)} style={{ background: T.bdrL, border: "none", borderRadius: 8, padding: 8, cursor: "pointer", color: T.tm }}>
          {expanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
        </button>
      </div>

      {expanded && scales.map(sid => {
        const scale  = SCALES[sid];
        const rlist  = byScale[sid].sort((a, b) => b.date.localeCompare(a.date));
        const latest = rlist[0];
        const sev    = getSeverity(sid, latest.score);
        return (
          <div key={sid} style={{ marginTop: 16, padding: 16, background: T.cardAlt, borderRadius: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <span style={{ padding: "3px 10px", borderRadius: 9999, background: scale.bg, color: scale.color, fontSize: 12, fontWeight: 700, fontFamily: T.fB, marginRight: 8 }}>{scale.name}</span>
                <span style={{ fontFamily: T.fB, fontSize: 12, color: T.tm }}>{scale.domain} · {rlist.length} aplicación{rlist.length > 1 ? "es" : ""}</span>
              </div>
              <button onClick={() => printScaleResult(latest, patient, profile)} style={{ background: T.bdrL, border: "none", borderRadius: 7, padding: 6, cursor: "pointer", color: T.tm }}>
                <Printer size={13}/>
              </button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
              <div style={{ fontFamily: T.fH, fontSize: 36, fontWeight: 500, color: sev?.color }}>{latest.score}</div>
              <div>
                <div style={{ fontFamily: T.fB, fontSize: 13, fontWeight: 700, color: sev?.color }}>{sev?.label}</div>
                <div style={{ fontFamily: T.fB, fontSize: 11, color: T.tm }}>{fmtDate(latest.date)}</div>
              </div>
            </div>
            <ScoreSparkline results={rlist} scaleId={sid}/>
          </div>
        );
      })}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN MODULE
// ─────────────────────────────────────────────────────────────────────────────
export default function Scales({ scaleResults, setScaleResults, patients, profile }) {
  const [tab,        setTab]       = useState("results");
  const [showForm,   setShowForm]  = useState(false);
  const [activeScale,setActiveScale] = useState("PHQ9");
  const [filterPt,   setFilterPt]  = useState("");
  const [filterScale,setFilterScale] = useState("todos");

  const filtered = useMemo(() =>
    scaleResults
      .filter(r => (!filterPt || r.patientId === filterPt) && (filterScale === "todos" || r.scaleId === filterScale))
      .sort((a, b) => b.date.localeCompare(a.date)),
    [scaleResults, filterPt, filterScale]
  );

  // Summary counts per scale
  const countByScale = useMemo(() =>
    Object.fromEntries(Object.keys(SCALES).map(k => [k, scaleResults.filter(r => r.scaleId === k).length])),
    [scaleResults]
  );

  // Patients with at least one result
  const patientsWithResults = useMemo(() => {
    const ids = new Set(scaleResults.map(r => r.patientId));
    return patients.filter(p => ids.has(p.id));
  }, [scaleResults, patients]);

  const save = (data) => {
    const pt = patients.find(p => p.id === data.patientId);
    setScaleResults(prev => [...prev, { ...data, id: "sc" + uid(), patientName: pt?.name || "" }]);
    setShowForm(false);
  };

  const del = (id) => setScaleResults(prev => prev.filter(r => r.id !== id));

  return (
    <div>
      <PageHeader
        title="Escalas Psicométricas"
        subtitle={`${scaleResults.length} aplicación${scaleResults.length !== 1 ? "es" : ""} registrada${scaleResults.length !== 1 ? "s" : ""}`}
        action={<Btn onClick={() => setShowForm(true)}><Plus size={15}/> Aplicar escala</Btn>}
      />

      {/* Scale summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px,1fr))", gap: 12, marginBottom: 28 }}>
        {Object.values(SCALES).map(scale => (
          <Card key={scale.id} style={{ padding: 16, cursor: "pointer", border: filterScale === scale.id ? `2px solid ${scale.color}` : `1px solid ${T.bdrL}` }}
            onClick={() => setFilterScale(prev => prev === scale.id ? "todos" : scale.id)}>
            <div style={{ fontFamily: T.fH, fontSize: 28, fontWeight: 500, color: scale.color, marginBottom: 2 }}>{countByScale[scale.id] || 0}</div>
            <div style={{ fontFamily: T.fB, fontSize: 12, fontWeight: 700, color: scale.color }}>{scale.name}</div>
            <div style={{ fontFamily: T.fB, fontSize: 11, color: T.tl }}>{scale.domain}</div>
          </Card>
        ))}
      </div>

      <Tabs
        tabs={[{ id: "results", label: "Resultados" }, { id: "patients", label: "Por paciente" }]}
        active={tab} onChange={setTab}
      />

      {tab === "results" && (
        <>
          <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
            <select value={filterPt} onChange={e => setFilterPt(e.target.value)}
              style={{ padding: "9px 14px", border: `1.5px solid ${T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 13.5, color: T.t, background: T.card, cursor: "pointer", outline: "none" }}>
              <option value="">Todos los pacientes</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.name.split(" ").slice(0, 2).join(" ")}</option>)}
            </select>
            {filterScale !== "todos" && (
              <button onClick={() => setFilterScale("todos")} style={{ padding: "9px 14px", borderRadius: 10, border: `1.5px solid ${T.bdr}`, background: T.bdrL, fontFamily: T.fB, fontSize: 13, color: T.tm, cursor: "pointer" }}>
                × {SCALES[filterScale]?.name}
              </button>
            )}
          </div>
          {filtered.length === 0
            ? <EmptyState icon={ClipboardList} title="Sin resultados" desc="Aplica la primera escala con el botón de arriba"/>
            : filtered.map(r => {
                const patient = patients.find(p => p.id === r.patientId);
                return <ResultCard key={r.id} r={r} patient={patient} profile={profile} onDelete={del}/>;
              })
          }
        </>
      )}

      {tab === "patients" && (
        patientsWithResults.length === 0
          ? <EmptyState icon={ClipboardList} title="Sin datos" desc="Los resultados agrupados por paciente aparecerán aquí"/>
          : patientsWithResults.map(p => {
              const results = scaleResults.filter(r => r.patientId === p.id);
              return <PatientSummary key={p.id} patient={p} results={results} profile={profile}/>;
            })
      )}

      {/* Apply scale modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={`Aplicar ${SCALES[activeScale]?.name}`} width={640}>
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {Object.values(SCALES).map(scale => (
            <button key={scale.id} onClick={() => setActiveScale(scale.id)}
              style={{ padding: "7px 14px", borderRadius: 9999, border: `1.5px solid ${activeScale === scale.id ? scale.color : T.bdr}`, background: activeScale === scale.id ? scale.bg : "transparent", color: activeScale === scale.id ? scale.color : T.tm, fontFamily: T.fB, fontSize: 12.5, fontWeight: activeScale === scale.id ? 700 : 400, cursor: "pointer", transition: "all .13s" }}>
              {scale.name} <span style={{ opacity: 0.6, fontSize: 11 }}>— {scale.domain}</span>
            </button>
          ))}
        </div>
        <ScaleForm
          key={activeScale}
          scaleId={activeScale}
          patients={patients}
          onSave={save}
          onClose={() => setShowForm(false)}
        />
      </Modal>
    </div>
  );
}
