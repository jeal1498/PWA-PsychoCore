import { useState, useMemo, useEffect } from "react";
import { Users, Search, Trash2, Phone, Mail, ChevronLeft, ChevronDown, ChevronUp, Tag, Check, Plus, DollarSign, TrendingUp, Download, Eye, ShieldAlert, X, LogOut } from "lucide-react";
import { T } from "../theme.js";
import { uid, todayDate, fmt, fmtDate, fmtCur, moodIcon, moodColor, progressStyle } from "../utils.js";
import { Card, Badge, Modal, Input, Textarea, Select, Btn, EmptyState, PageHeader, Tabs } from "../components/ui/index.jsx";
import { useIsMobile } from "../hooks/useIsMobile.js";
import { RiskBadge } from "./RiskAssessment.jsx";
import { getSeverity, SCALES } from "./Scales.jsx";
import ConsentBlock, { consentStatus, CONSENT_STATUS_CONFIG } from "./Consent.jsx";
import { ContactsTab, MedicationTab, MedSummaryWidget, ContactFollowUpWidget } from "./InterSessions.jsx";
import { getAssignmentsByPatient, getResponsesByAssignment } from "../lib/supabase.js";
import { TASK_TEMPLATES } from "../lib/taskTemplates.js";
import { printAlta, printDerivacion } from "./Reports.jsx";

// ── Portal domain for consent links ──────────────────────────────────────────
const PORTAL_DOMAIN = "https://psychocore.vercel.app";

// ── Time slots helper for Primer Contacto (30-min, 08:00–20:00) ──────────────
const PC_TIME_SLOTS = (() => {
  const slots = [];
  for (let m = 8 * 60; m < 20 * 60; m += 30) {
    slots.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  }
  return slots;
})();

// ── STATUS ────────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  activo: { label:"Activo",   color:T.suc, bg:T.sucA },
  pausa:  { label:"En pausa", color:T.war, bg:T.warA },
  alta:   { label:"Alta",     color:T.tl,  bg:T.bdrL },
};

// ── PATIENT TYPE ──────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  individual: { label:"Individual",      color:T.p,   bg:T.pA   },
  pareja:     { label:"Pareja",          color:"#6B5B9E", bg:"rgba(107,91,158,0.10)" },
  grupo:      { label:"Grupal",          color:T.acc, bg:T.accA },
};

// ── MOOD TIMELINE ─────────────────────────────────────────────────────────────
function MoodTimeline({ sessions }) {
  const sorted = [...sessions]
    .filter(s => s.mood && s.date)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-20); // last 20 sessions

  if (sorted.length < 2) return (
    <div style={{ fontFamily:T.fB, fontSize:13, color:T.tl, padding:"20px 0", textAlign:"center" }}>
      Se necesitan al menos 2 sesiones para mostrar la línea de estado de ánimo
    </div>
  );

  const moodVal = { bueno: 2, moderado: 1, bajo: 0 };
  const moodLbl = { 2:"Bueno", 1:"Moderado", 0:"Bajo" };
  const moodClr = { 2: "var(--success)", 1: "var(--warn)", 0: "var(--error)" };
  const W = 480, H = 110, PAD = 28;
  const xs = sorted.map((_, i) => PAD + (i / (sorted.length - 1)) * (W - PAD * 2));
  const ys = sorted.map(s => {
    const v = moodVal[s.mood] ?? 1;
    return H - PAD - ((v / 2) * (H - PAD * 2));
  });

  const d = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x},${ys[i]}`).join(" ");

  // Gradient area path
  const area = `${d} L${xs[xs.length-1]},${H-PAD} L${xs[0]},${H-PAD} Z`;

  return (
    <div>
      <div style={{ fontFamily:T.fB, fontSize:12, fontWeight:700, color:T.tl, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:12 }}>
        Estado de ánimo — últimas {sorted.length} sesiones
      </div>
      <div style={{ overflowX:"auto" }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width:"100%", minWidth:260, height:H, display:"block" }}>
          <defs>
            <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.18"/>
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.01"/>
            </linearGradient>
          </defs>
          {/* Grid lines */}
          {[0,1,2].map(v => {
            const y = H - PAD - ((v/2) * (H - PAD*2));
            return (
              <g key={v}>
                <line x1={PAD} y1={y} x2={W-PAD} y2={y} stroke="var(--border-l)" strokeWidth={1}/>
                <text x={PAD-6} y={y+4} textAnchor="end" style={{ fontFamily:"DM Sans, sans-serif", fontSize:9, fill:"var(--text-light)" }}>{moodLbl[v]}</text>
              </g>
            );
          })}
          {/* Shaded area */}
          <path d={area} fill="url(#moodGrad)"/>
          {/* Line */}
          <path d={d} fill="none" stroke="var(--primary)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>
          {/* Dots */}
          {sorted.map((s, i) => (
            <g key={i}>
              <circle cx={xs[i]} cy={ys[i]} r={5} fill={moodClr[moodVal[s.mood] ?? 1]} stroke="var(--card)" strokeWidth={2}/>
              <text x={xs[i]} y={H-4} textAnchor="middle" style={{ fontFamily:"DM Sans, sans-serif", fontSize:8.5, fill:"var(--text-light)" }}>
                {s.date.slice(5).replace("-","/")}
              </text>
            </g>
          ))}
        </svg>
      </div>
      {/* Legend */}
      <div style={{ display:"flex", gap:16, marginTop:8, flexWrap:"wrap" }}>
        {Object.entries(moodClr).reverse().map(([v, c]) => (
          <div key={v} style={{ display:"flex", alignItems:"center", gap:5 }}>
            <div style={{ width:9, height:9, borderRadius:"50%", background:c }}/>
            <span style={{ fontFamily:T.fB, fontSize:11, color:T.tm }}>{moodLbl[Number(v)]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Calcula edad a partir de fecha de nacimiento "YYYY-MM-DD"
function calcAge(birthdate) {
  if (!birthdate) return "";
  const today = new Date();
  const bd    = new Date(birthdate + "T12:00");
  let age = today.getFullYear() - bd.getFullYear();
  const m = today.getMonth() - bd.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) age--;
  return age >= 0 ? age : "";
}

export const CIE11_CODES = [
  // Neurodesarrollo
  { code: "6A00", label: "TDAH, presentación combinada" },
  { code: "6A01", label: "TDAH, predominio inatento" },
  { code: "6A02", label: "TDAH, predominio hiperactivo-impulsivo" },
  { code: "6A06", label: "Trastorno del espectro autista" },
  // Esquizofrenia y psicosis
  { code: "6A20", label: "Esquizofrenia" },
  { code: "6A23", label: "Trastorno esquizoafectivo" },
  { code: "6A24", label: "Trastorno delirante" },
  // Episodios del estado de ánimo
  { code: "6A60", label: "Episodio depresivo mayor, leve" },
  { code: "6A61", label: "Episodio depresivo mayor, moderado" },
  { code: "6A62", label: "Episodio depresivo mayor, grave" },
  { code: "6A70", label: "Trastorno depresivo recurrente" },
  { code: "6A71", label: "Trastorno distímico (distimia)" },
  { code: "6A80", label: "Trastorno bipolar tipo I" },
  { code: "6A81", label: "Trastorno bipolar tipo II" },
  { code: "6A82", label: "Trastorno ciclotímico" },
  // Ansiedad y miedo
  { code: "6B00", label: "Trastorno de ansiedad generalizada (TAG)" },
  { code: "6B01", label: "Trastorno de pánico" },
  { code: "6B02", label: "Agorafobia" },
  { code: "6B03", label: "Fobia específica" },
  { code: "6B04", label: "Fobia social (trastorno de ansiedad social)" },
  { code: "6B05", label: "Trastorno de ansiedad por separación" },
  // TOC y relacionados
  { code: "6B20", label: "Trastorno obsesivo-compulsivo (TOC)" },
  { code: "6B21", label: "Dismorfofobia (trastorno dismórfico corporal)" },
  { code: "6B22", label: "Hipocondría" },
  { code: "6B25", label: "Tricotilomanía" },
  // Estrés y trauma
  { code: "6B40", label: "Trastorno de estrés postraumático (TEPT)" },
  { code: "6B41", label: "Trastorno de estrés agudo" },
  { code: "6B43", label: "Trastorno de adaptación" },
  { code: "6B44", label: "TEPT complejo" },
  // Disociativos
  { code: "6B60", label: "Trastorno disociativo de identidad" },
  { code: "6B61", label: "Amnesia disociativa" },
  { code: "6B65", label: "Despersonalización/desrealización" },
  // Alimentación
  { code: "6B80", label: "Anorexia nerviosa" },
  { code: "6B81", label: "Bulimia nerviosa" },
  { code: "6B82", label: "Trastorno de atracones" },
  // Control de impulsos
  { code: "6C70", label: "Trastorno explosivo intermitente" },
  { code: "6C72", label: "Cleptomanía" },
  { code: "6C73", label: "Piromanía" },
  // Adicciones / sustancias
  { code: "6C40", label: "Trastorno por consumo de alcohol" },
  { code: "6C43", label: "Trastorno por consumo de cannabis" },
  { code: "6C45", label: "Trastorno por consumo de estimulantes" },
  { code: "6C46", label: "Trastorno por consumo de sedantes/hipnóticos" },
  // Personalidad
  { code: "6D10", label: "Trastorno de personalidad, leve" },
  { code: "6D11", label: "Trastorno de personalidad, moderado" },
  { code: "6D12", label: "Trastorno de personalidad, grave" },
  { code: "6D10.0", label: "Trastorno límite de la personalidad" },
  { code: "6D10.1", label: "Trastorno de personalidad obsesivo-compulsivo" },
  { code: "6D10.2", label: "Trastorno de personalidad ansioso-evitativo" },
  { code: "6D10.3", label: "Trastorno de personalidad dependiente" },
  // Síntomas somáticos
  { code: "6C20", label: "Trastorno de síntomas somáticos" },
  { code: "6C21", label: "Trastorno de conversión / síntomas neurológicos funcionales" },
  // Sueño
  { code: "7A00", label: "Insomnio crónico" },
  { code: "7A01", label: "Hipersomnia idiopática" },
  // Otros frecuentes
  { code: "QE50", label: "Duelo complicado" },
  { code: "QE84", label: "Problema relacionado con el trabajo o empleo" },
  { code: "PF20", label: "Problema de relación de pareja" },
];

// ── CieDiagnosisField ─────────────────────────────────────────────────────────
function CieDiagnosisField({ value, cie11Code, onChangeDx, onChangeCode, label = "Diagnóstico", showSearch = true }) {
  const [query, setQuery] = useState("");
  const [open,  setOpen]  = useState(false);

  const filtered = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return CIE11_CODES.filter(c =>
      c.label.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [query]);

  const select = (item) => {
    onChangeDx(item.label);
    onChangeCode(item.code);
    setQuery("");
    setOpen(false);
  };

  const currentCode = CIE11_CODES.find(c => c.code === cie11Code);

  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.tm, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{label}</label>

      {/* Search bar */}
      {showSearch && (
        <div style={{ position: "relative", marginBottom: 8 }}>
          <div style={{ position:"relative" }}>
            <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", fontSize:14, pointerEvents:"none" }}>🔍</span>
            <input
              value={query}
              onChange={e => { setQuery(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 180)}
              placeholder="Buscar código CIE-11 (ej: ansiedad, depresión, 6B00)..."
              style={{ width: "100%", padding: "9px 14px 9px 34px", border: `1.5px solid ${T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 13, color: T.t, background: T.card, outline: "none", boxSizing: "border-box" }}
            />
          </div>
          {open && filtered.length > 0 && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50, background: T.card, border: `1.5px solid ${T.bdr}`, borderRadius: 10, boxShadow: T.shM, marginTop: 4, overflow: "hidden" }}>
              {filtered.map(item => (
                <button key={item.code} onMouseDown={() => select(item)}
                  style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 14px", background: "none", border: "none", cursor: "pointer", textAlign: "left", borderBottom: `1px solid ${T.bdrL}`, fontFamily: T.fB }}
                  onMouseEnter={e => e.currentTarget.style.background = T.pA}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}>
                  <span style={{ padding: "2px 8px", borderRadius: 6, background: T.pA, color: T.p, fontSize: 10, fontWeight: 700, flexShrink: 0, fontFamily: "monospace" }}>{item.code}</span>
                  <span style={{ fontSize: 13, color: T.t }}>{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Selected code badge */}
      {cie11Code && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ padding: "3px 10px", borderRadius: 6, background: T.pA, color: T.p, fontSize: 11, fontWeight: 700, fontFamily: "monospace" }}>{cie11Code}</span>
          {currentCode && <span style={{ fontSize: 12, color: T.tm }}>{currentCode.label}</span>}
          <button onClick={() => { onChangeCode(""); onChangeDx(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: T.tl, fontSize: 16, lineHeight: 1, padding: "0 4px" }}>×</button>
        </div>
      )}

      {/* Manual text field */}
      <div>
        <div style={{ fontSize:10, fontWeight:600, color:T.tl, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:4 }}>
          Texto del diagnóstico {!cie11Code && <span style={{ fontWeight:400, textTransform:"none", letterSpacing:0 }}>— o escribe directamente si no está en CIE-11</span>}
        </div>
        <input
          value={value}
          onChange={e => onChangeDx(e.target.value)}
          placeholder={cie11Code ? "Ajusta el texto si lo necesitas..." : "Ej. Trastorno de ansiedad generalizada"}
          style={{ width: "100%", padding: "9px 14px", border: `1.5px solid ${cie11Code ? T.p+"40" : T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 13.5, color: T.t, background: T.card, outline: "none", boxSizing: "border-box" }}
        />
      </div>
    </div>
  );
}

// ── Progress chart (mini sparkline) ──────────────────────────────────────────
function ProgressSparkline({ sessions }) {
  if (sessions.length < 2) return null;
  const data = sessions.slice().sort((a,b) => a.date.localeCompare(b.date)).slice(-12);
  const moodVal = { bueno:3, moderado:2, bajo:1 };
  const progVal = { excelente:4, bueno:3, moderado:2, bajo:1 };
  const points  = data.map((s,i) => ({ x:i, mood: moodVal[s.mood]||2, prog: progVal[s.progress]||2, date:fmtDate(s.date) }));
  const W = 280, H = 70, PAD = 10;
  const xScale = i => PAD + (i / Math.max(points.length-1,1)) * (W - PAD*2);
  const yScale = v => H - PAD - ((v-1)/3) * (H - PAD*2);
  const moodPath = points.map((p,i) => `${i===0?"M":"L"}${xScale(i)},${yScale(p.mood)}`).join(" ");
  const progPath = points.map((p,i) => `${i===0?"M":"L"}${xScale(i)},${yScale(p.prog)}`).join(" ");

  return (
    <div style={{ marginTop:16 }}>
      <div style={{ fontSize:11, fontWeight:700, color:T.tm, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:8 }}>Evolución (últimas {data.length} sesiones)</div>
      <div style={{ background:T.cardAlt, borderRadius:10, padding:"12px 16px" }}>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display:"block" }}>
          {/* Grid lines */}
          {[1,2,3,4].map(v => (
            <line key={v} x1={PAD} x2={W-PAD} y1={yScale(v)} y2={yScale(v)} stroke={T.bdr} strokeWidth="1" strokeDasharray="3,3"/>
          ))}
          {/* Mood line */}
          <path d={moodPath} fill="none" stroke={T.acc} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          {/* Progress line */}
          <path d={progPath} fill="none" stroke={T.p} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          {/* Dots */}
          {points.map((p,i) => (
            <g key={i}>
              <circle cx={xScale(i)} cy={yScale(p.mood)} r="3" fill={T.acc}/>
              <circle cx={xScale(i)} cy={yScale(p.prog)} r="3" fill={T.p}/>
            </g>
          ))}
        </svg>
        <div style={{ display:"flex", gap:16, marginTop:6 }}>
          <div style={{ display:"flex", alignItems:"center", gap:5 }}>
            <div style={{ width:12, height:3, borderRadius:9999, background:T.p }}/>
            <span style={{ fontFamily:T.fB, fontSize:10, color:T.tm }}>Progreso</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:5 }}>
            <div style={{ width:12, height:3, borderRadius:9999, background:T.acc }}/>
            <span style={{ fontFamily:T.fB, fontSize:10, color:T.tm }}>Estado de ánimo</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Export complete record PDF ────────────────────────────────────────────────
function exportExpediente(patient, sessions, payments, profile) {
  const w = window.open("","_blank");
  const today = new Date().toLocaleDateString("es-MX",{day:"numeric",month:"long",year:"numeric"});
  const ptSessions = sessions.filter(s => s.patientId === patient.id).sort((a,b) => a.date.localeCompare(b.date));
  const ptPayments = payments.filter(p => p.patientId === patient.id);
  const totalPaid  = ptPayments.filter(p => p.status==="pagado").reduce((s,p) => s+Number(p.amount), 0);

  const sessionRows = ptSessions.map(s => `
    <div class="session">
      <div class="session-header">
        <span>${fmtDate(s.date)}</span>
        <span>${s.duration} min</span>
        <span style="text-transform:capitalize;color:${s.progress==="excelente"||s.progress==="bueno"?"#4E8B5F":"#B8900A"}">${s.progress}</span>
        <span style="text-transform:capitalize">${s.mood}</span>
      </div>
      <p>${s.notes}</p>
      ${(s.tags||[]).length ? `<div class="tags">${s.tags.map(t=>`<span class="tag">${t}</span>`).join("")}</div>` : ""}
    </div>
  `).join("");

  const payRows = ptPayments.map(p => `
    <tr>
      <td>${fmtDate(p.date)}</td>
      <td>${p.concept}</td>
      <td style="text-align:right;font-weight:600">$${Number(p.amount).toLocaleString("es-MX")}</td>
      <td>${p.method}</td>
      <td style="color:${p.status==="pagado"?"#4E8B5F":"#B8900A"};font-weight:600">${p.status}</td>
    </tr>
  `).join("");

  w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Expediente — ${patient.name}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',sans-serif;max-width:760px;margin:40px auto;color:#1A2B28;font-size:13px;line-height:1.6}
.cover{border-bottom:3px solid #3A6B6E;padding-bottom:28px;margin-bottom:32px}
.cover h1{font-family:'Cormorant Garamond',serif;font-size:36px;font-weight:600;color:#3A6B6E;margin-bottom:4px}
.cover .sub{font-size:13px;color:#5A7270;margin-bottom:20px}
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;background:#F9F8F5;padding:16px 20px;border-radius:10px;margin-bottom:20px}
.info-item label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#9BAFAD;display:block;margin-bottom:2px}
.info-item p{font-size:13px;font-weight:500}
.diag-box{background:rgba(58,107,110,0.08);padding:14px 18px;border-radius:10px;border-left:4px solid #3A6B6E;margin-bottom:12px}
.diag-box label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#3A6B6E;display:block;margin-bottom:4px}
.section-title{font-family:'Cormorant Garamond',serif;font-size:24px;color:#3A6B6E;margin:32px 0 16px;padding-bottom:8px;border-bottom:1px solid #D8E2E0}
.session{background:#F9F8F5;border-radius:8px;padding:14px 18px;margin-bottom:10px;border-left:3px solid #D8E2E0}
.session-header{display:flex;gap:16px;margin-bottom:8px;font-size:12px;font-weight:600;color:#5A7270}
.session p{font-size:13px;color:#1A2B28;line-height:1.7}
.tags{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
.tag{background:rgba(196,137,90,0.12);color:#C4895A;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:600}
table{width:100%;border-collapse:collapse;margin-top:12px}
th{text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#9BAFAD;padding:8px 10px;border-bottom:2px solid #D8E2E0}
td{padding:8px 10px;border-bottom:1px solid #EDF1F0;font-size:13px}
.total-row td{font-weight:700;border-top:2px solid #D8E2E0;border-bottom:none;padding-top:12px}
.footer{margin-top:48px;padding-top:16px;border-top:1px solid #D8E2E0;font-size:11px;color:#9BAFAD;display:flex;justify-content:space-between}
.clinic{margin-bottom:24px;background:#F9F8F5;padding:14px 18px;border-radius:10px;font-size:12px;color:#5A7270}
@media print{body{margin:0}@page{margin:20mm}}
</style></head><body>

<div class="cover">
  <div style="display:flex;justify-content:space-between;align-items:flex-start">
    <div>
      <h1>Expediente Clínico</h1>
      <p class="sub">Documento confidencial · Generado el ${today}</p>
    </div>
    <div style="text-align:right;font-size:12px;color:#5A7270">
      ${profile?.clinic ? `<strong style="font-size:14px;color:#1A2B28">${profile.clinic}</strong><br>` : ""}
      ${profile?.name ? profile.name + "<br>" : ""}
      ${profile?.specialty ? profile.specialty + "<br>" : ""}
      ${profile?.cedula ? "Ced. " + profile.cedula + "<br>" : ""}
    </div>
  </div>
</div>

<div class="info-grid">
  <div class="info-item"><label>Nombre completo</label><p>${patient.name}</p></div>
  <div class="info-item"><label>Edad</label><p>${patient.age ? patient.age + " años" : "No especificada"}</p></div>
  <div class="info-item"><label>Teléfono</label><p>${patient.phone || "—"}</p></div>
  <div class="info-item"><label>Correo</label><p>${patient.email || "—"}</p></div>
  <div class="info-item"><label>Inicio del tratamiento</label><p>${fmtDate(patient.createdAt)}</p></div>
  <div class="info-item"><label>Estado actual</label><p style="text-transform:capitalize">${patient.status || "activo"}</p></div>
</div>

${patient.diagnosis ? `<div class="diag-box"><label>Diagnóstico${patient.cie11Code ? ` <span style="font-family:monospace;font-weight:700;background:rgba(58,107,110,0.12);padding:1px 7px;border-radius:4px;letter-spacing:.03em">${patient.cie11Code}</span> · CIE-11` : ""}</label><p>${patient.diagnosis}</p></div>` : ""}
${patient.reason ? `<div class="diag-box" style="border-color:#C4895A;background:rgba(196,137,90,0.06)"><label style="color:#C4895A">Motivo de consulta</label><p>${patient.reason}</p></div>` : ""}
${patient.notes ? `<div style="padding:12px 18px;background:#F9F8F5;border-radius:10px;margin-bottom:12px"><label style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#9BAFAD;display:block;margin-bottom:4px">Notas generales</label><p>${patient.notes}</p></div>` : ""}

<div class="section-title">Historial de Sesiones (${ptSessions.length})</div>
${ptSessions.length === 0 ? '<p style="color:#9BAFAD">Sin sesiones registradas</p>' : sessionRows}

<div class="section-title">Registro de Pagos</div>
${ptPayments.length === 0 ? '<p style="color:#9BAFAD">Sin pagos registrados</p>' : `
<table>
  <thead><tr><th>Fecha</th><th>Concepto</th><th style="text-align:right">Monto</th><th>Método</th><th>Estado</th></tr></thead>
  <tbody>
    ${payRows}
    <tr class="total-row">
      <td colspan="2">Total pagado</td>
      <td style="text-align:right">$${totalPaid.toLocaleString("es-MX")}</td>
      <td colspan="2"></td>
    </tr>
  </tbody>
</table>`}

<div class="footer">
  <span>PsychoCore · Expediente confidencial</span>
  <span>${patient.name} · ${today}</span>
</div>
</body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 600);
}

// ── Tab de tareas del paciente ────────────────────────────────────────────────
function PatientTasksTab({ patient, sessions }) {
  const [tasks,         setTasks]         = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [loadErr,       setLoadErr]       = useState(false);
  const [viewResponse,  setViewResponse]  = useState(null);
  const [responses,     setResponses]     = useState([]);
  const [loadingResp,   setLoadingResp]   = useState(false);

  useEffect(() => {
    getAssignmentsByPatient(patient.id)
      .then(setTasks)
      .catch(() => setLoadErr(true))
      .finally(() => setLoading(false));
  }, [patient.id]);

  const openResponse = async (task) => {
    setViewResponse(task);
    setLoadingResp(true);
    try {
      const data = await getResponsesByAssignment(task.id);
      setResponses(data);
    } catch {}
    finally { setLoadingResp(false); }
  };

  // Agrupa tareas por sesión
  const grouped = tasks.reduce((acc, t) => {
    const key = t.session_id || "__sin_sesion__";
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  if (loading) return (
    <div style={{ display:"flex", justifyContent:"center", padding:40 }}>
      <div style={{ width:28, height:28, borderRadius:"50%", border:`3px solid ${T.bdrL}`, borderTopColor:T.p, animation:"spin .8s linear infinite" }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (loadErr) return (
    <div style={{ padding:"16px", background:T.errA, borderRadius:10, fontFamily:T.fB, fontSize:13, color:T.err, textAlign:"center" }}>
      No se pudieron cargar las tareas. Verifica tu conexión.
    </div>
  );

  if (tasks.length === 0) return (
    <div style={{ textAlign:"center", padding:"40px 0", color:T.tl, fontFamily:T.fB }}>
      <div style={{ fontSize:36, marginBottom:12 }}>📋</div>
      <div style={{ fontSize:14, color:T.tm }}>Sin tareas asignadas aún</div>
      <div style={{ fontSize:12, marginTop:4 }}>Las tareas se asignan al registrar una sesión</div>
    </div>
  );

  return (
    <div>
      {Object.entries(grouped).map(([sessionId, sessionTasks]) => {
        const session = sessions?.find(s => s.id === sessionId);
        const label = session
          ? `Sesión del ${fmtDate(session.date)}`
          : "Sin sesión asociada";

        return (
          <div key={sessionId} style={{ marginBottom:20 }}>
            {/* Encabezado de sesión */}
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
              <div style={{ height:1, flex:1, background:T.bdrL }}/>
              <span style={{ fontFamily:T.fB, fontSize:11, fontWeight:700, color:T.tm, textTransform:"uppercase", letterSpacing:"0.07em", whiteSpace:"nowrap" }}>
                📅 {label}
              </span>
              <div style={{ height:1, flex:1, background:T.bdrL }}/>
            </div>

            {sessionTasks.map(t => {
              const tpl  = TASK_TEMPLATES[t.template_id];
              const done = t.status === "completed";
              return (
                <div key={t.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:12, marginBottom:8, background: done ? T.sucA : "rgba(184,144,10,0.06)", border:`1.5px solid ${done ? T.suc+"40" : "rgba(184,144,10,0.25)"}` }}>
                  <span style={{ fontSize:22, lineHeight:1 }}>{tpl?.icon || "📋"}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:T.fB, fontSize:13.5, fontWeight:600, color:T.t }}>{t.title}</div>
                    <div style={{ fontFamily:T.fB, fontSize:11.5, color:T.tl, marginTop:2 }}>
                      {done
                        ? `✅ Completada ${fmtDate(t.completed_at?.split("T")[0])}`
                        : `⏳ Pendiente · Asignada ${fmtDate(t.assigned_at?.split("T")[0])}`
                      }
                    </div>
                  </div>
                  {done && (
                    <button onClick={() => openResponse(t)}
                      style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 12px", borderRadius:9, border:`1.5px solid ${T.p}`, background:T.pA, color:T.p, fontFamily:T.fB, fontSize:12, fontWeight:600, cursor:"pointer", flexShrink:0 }}>
                      <Eye size={12}/> Ver respuestas
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Modal de respuestas */}
      {viewResponse && (
        <Modal open onClose={() => setViewResponse(null)} title={`Respuestas — ${viewResponse.title}`} width={500}>
          {loadingResp ? (
            <div style={{ textAlign:"center", padding:32 }}>
              <div style={{ width:28, height:28, borderRadius:"50%", border:`3px solid ${T.bdrL}`, borderTopColor:T.p, margin:"0 auto", animation:"spin .8s linear infinite" }}/>
            </div>
          ) : responses.length === 0 ? (
            <div style={{ textAlign:"center", padding:"24px 0", color:T.tl, fontFamily:T.fB, fontSize:13 }}>Sin respuestas registradas.</div>
          ) : responses.map(resp => {
            const tpl = TASK_TEMPLATES[viewResponse.template_id];
            return (
              <div key={resp.id}>
                {tpl?.fields.map(field => {
                  const val = resp.responses?.[field.key];
                  if (!val) return null;
                  return (
                    <div key={field.key} style={{ marginBottom:14 }}>
                      <div style={{ fontFamily:T.fB, fontSize:11, fontWeight:700, color:T.p, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:5 }}>{field.label}</div>
                      <div style={{ padding:"10px 14px", background:T.cardAlt, borderRadius:10, fontFamily:T.fB, fontSize:13.5, color:T.t, lineHeight:1.65 }}>
                        {field.type === "scale10"
                          ? <span style={{ fontWeight:700, fontSize:20, color:Number(val)<=3?T.suc:Number(val)<=6?"#B8900A":"#B85050" }}>{val}/10</span>
                          : val}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
          <div style={{ display:"flex", justifyContent:"flex-end", marginTop:8 }}>
            <Btn variant="ghost" onClick={() => setViewResponse(null)}>Cerrar</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}


// ── AnamnesisTab ──────────────────────────────────────────────────────────────
const ANAMNESIS_BLANK = {
  fechaPrimeraConsulta: "",
  motivoConsulta: "",
  observacionesIniciales: "",
  antMedicos: "",
  antPsiquiatricos: "",
  medicacionActual: "",
  sustancias: "ninguno",
  sustanciasOtro: "",
  historiaFamiliar: "",
  enfermedadesFamiliares: "",
  situacionLaboral: "",
  situacionFamiliar: "",
  redApoyo: "",
  impresionDiagnostica: "",
  hipotesisTrabajo: "",
};

function AnamnesisSection({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom:16, border:`1px solid ${T.bdrL}`, borderRadius:12, overflow:"hidden" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
          width:"100%", padding:"12px 16px", background:open ? T.pA : T.cardAlt,
          border:"none", cursor:"pointer", textAlign:"left", transition:"background .12s" }}>
        <span style={{ fontFamily:T.fB, fontSize:12.5, fontWeight:700,
          color: open ? T.p : T.t, textTransform:"uppercase", letterSpacing:"0.06em" }}>
          {title}
        </span>
        {open
          ? <ChevronUp size={14} color={T.p}/>
          : <ChevronDown size={14} color={T.tl}/>}
      </button>
      {open && (
        <div style={{ padding:"14px 16px", background:T.card }}>
          {children}
        </div>
      )}
    </div>
  );
}

function AField({ label, children }) {
  return (
    <div style={{ marginBottom:12 }}>
      <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.tl,
        textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:5 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const aTextarea = (rows = 3) => ({
  width:"100%", padding:"9px 12px", border:`1.5px solid ${T.bdr}`,
  borderRadius:9, fontFamily:T.fB, fontSize:13, color:T.t,
  background:T.card, outline:"none", resize:"vertical",
  boxSizing:"border-box", lineHeight:1.55,
  minHeight: rows * 22 + 18,
});

const aInput = {
  width:"100%", padding:"9px 12px", border:`1.5px solid ${T.bdr}`,
  borderRadius:9, fontFamily:T.fB, fontSize:13, color:T.t,
  background:T.card, outline:"none", boxSizing:"border-box",
};

function AnamnesisTab({ patient, setPatients, todayStr }) {
  const existing = patient.anamnesis || {};
  const [form, setForm] = useState({ ...ANAMNESIS_BLANK, fechaPrimeraConsulta: todayStr, ...existing });
  const [saved, setSaved] = useState(false);

  const fld = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const saveAnamnesis = () => {
    setPatients(prev => prev.map(p =>
      p.id === patient.id ? { ...p, anamnesis: { ...form } } : p
    ));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      {/* Banner de reingreso si aplica */}
      {existing.reingresoDate && (
        <div style={{
          display:"flex", alignItems:"center", gap:10, padding:"11px 14px",
          background:T.pA, border:`1.5px solid ${T.p}40`, borderRadius:10, marginBottom:16
        }}>
          <span style={{ fontSize:18 }}>🔄</span>
          <div>
            <div style={{ fontFamily:T.fB, fontSize:13, fontWeight:700, color:T.p }}>
              Reingreso — {fmtDate(existing.reingresoDate)}
            </div>
            <div style={{ fontFamily:T.fB, fontSize:11.5, color:T.tm }}>
              Esta anamnesis fue iniciada en el reingreso del paciente. Completa los campos con la nueva información clínica.
            </div>
          </div>
        </div>
      )}
      {/* Sección 1 */}
      <AnamnesisSection title="1 · Primera impresión">
        <AField label="Fecha de primera consulta">
          <input type="date" value={form.fechaPrimeraConsulta}
            onChange={fld("fechaPrimeraConsulta")} style={aInput}/>
        </AField>
        <AField label="Motivo de consulta ampliado">
          <textarea rows={4} value={form.motivoConsulta}
            onChange={fld("motivoConsulta")}
            placeholder="Descripción detallada del motivo de consulta según el paciente..."
            style={aTextarea(4)}/>
        </AField>
        <AField label="Observaciones clínicas iniciales">
          <textarea rows={3} value={form.observacionesIniciales}
            onChange={fld("observacionesIniciales")}
            placeholder="Apariencia, actitud, nivel de comunicación, estado afectivo observable..."
            style={aTextarea(3)}/>
        </AField>
      </AnamnesisSection>

      {/* Sección 2 */}
      <AnamnesisSection title="2 · Antecedentes personales" defaultOpen={false}>
        <AField label="Antecedentes médicos relevantes">
          <textarea rows={3} value={form.antMedicos}
            onChange={fld("antMedicos")}
            placeholder="Enfermedades crónicas, cirugías, hospitalizaciones, alergias..."
            style={aTextarea(3)}/>
        </AField>
        <AField label="Antecedentes psiquiátricos / tratamientos previos">
          <textarea rows={3} value={form.antPsiquiatricos}
            onChange={fld("antPsiquiatricos")}
            placeholder="Diagnósticos previos, psicoterapias anteriores, internamientos..."
            style={aTextarea(3)}/>
        </AField>
        <AField label="Medicación actual">
          <textarea rows={2} value={form.medicacionActual}
            onChange={fld("medicacionActual")}
            placeholder="Nombre, dosis y prescriptor..."
            style={aTextarea(2)}/>
        </AField>
        <AField label="Consumo de sustancias">
          <select value={form.sustancias} onChange={fld("sustancias")}
            style={{ ...aInput, marginBottom: form.sustancias === "otros" ? 8 : 0 }}>
            <option value="ninguno">Ninguno</option>
            <option value="alcohol">Alcohol</option>
            <option value="tabaco">Tabaco</option>
            <option value="cannabis">Cannabis</option>
            <option value="otros">Otros</option>
          </select>
          {form.sustancias === "otros" && (
            <input value={form.sustanciasOtro}
              onChange={fld("sustanciasOtro")}
              placeholder="Especifica la sustancia y frecuencia..."
              style={{ ...aInput, marginTop:6 }}/>
          )}
        </AField>
      </AnamnesisSection>

      {/* Sección 3 */}
      <AnamnesisSection title="3 · Antecedentes familiares" defaultOpen={false}>
        <AField label="Historia familiar relevante">
          <textarea rows={3} value={form.historiaFamiliar}
            onChange={fld("historiaFamiliar")}
            placeholder="Dinámica familiar, eventos significativos, estructura familiar..."
            style={aTextarea(3)}/>
        </AField>
        <AField label="Enfermedades mentales en familia">
          <textarea rows={2} value={form.enfermedadesFamiliares}
            onChange={fld("enfermedadesFamiliares")}
            placeholder="Diagnósticos conocidos en familiares de primer y segundo grado..."
            style={aTextarea(2)}/>
        </AField>
      </AnamnesisSection>

      {/* Sección 4 */}
      <AnamnesisSection title="4 · Contexto actual" defaultOpen={false}>
        <AField label="Situación laboral / escolar">
          <input value={form.situacionLaboral}
            onChange={fld("situacionLaboral")}
            placeholder="Ocupación, nivel de estudios, situación actual..."
            style={aInput}/>
        </AField>
        <AField label="Situación familiar / relaciones">
          <textarea rows={3} value={form.situacionFamiliar}
            onChange={fld("situacionFamiliar")}
            placeholder="Estado civil, hijos, relación con familia de origen, pareja..."
            style={aTextarea(3)}/>
        </AField>
        <AField label="Red de apoyo">
          <textarea rows={2} value={form.redApoyo}
            onChange={fld("redApoyo")}
            placeholder="Personas de confianza, grupos de apoyo, recursos disponibles..."
            style={aTextarea(2)}/>
        </AField>
      </AnamnesisSection>

      {/* Sección 5 */}
      <AnamnesisSection title="5 · Observaciones del psicólogo" defaultOpen={false}>
        <AField label="Impresión diagnóstica inicial">
          <textarea rows={3} value={form.impresionDiagnostica}
            onChange={fld("impresionDiagnostica")}
            placeholder="Hipótesis diagnóstica preliminar basada en la primera impresión clínica..."
            style={aTextarea(3)}/>
        </AField>
        <AField label="Hipótesis de trabajo">
          <textarea rows={3} value={form.hipotesisTrabajo}
            onChange={fld("hipotesisTrabajo")}
            placeholder="Modelo explicativo del problema, factores predisponentes, desencadenantes y mantenedores..."
            style={aTextarea(3)}/>
        </AField>
      </AnamnesisSection>

      {/* Botón guardar */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"flex-end", gap:10, marginTop:4 }}>
        {saved && (
          <span style={{ fontFamily:T.fB, fontSize:12, color:T.suc, display:"flex", alignItems:"center", gap:5 }}>
            <Check size={13}/> Guardado
          </span>
        )}
        <button onClick={saveAnamnesis}
          style={{ display:"flex", alignItems:"center", gap:7, padding:"10px 20px",
            borderRadius:10, border:"none", background:T.p, color:"#fff",
            fontFamily:T.fB, fontSize:13, fontWeight:700, cursor:"pointer",
            transition:"opacity .13s" }}
          onMouseEnter={e => e.currentTarget.style.opacity="0.87"}
          onMouseLeave={e => e.currentTarget.style.opacity="1"}>
          <Check size={14}/> Guardar Anamnesis
        </button>
      </div>
    </div>
  );
}

// ── Motivos de alta ───────────────────────────────────────────────────────────
const MOTIVO_ALTA_OPTIONS = [
  { value: "logros",     label: "Objetivos terapéuticos logrados"  },
  { value: "voluntaria", label: "Alta voluntaria del paciente"      },
  { value: "derivacion", label: "Derivación a otro profesional"     },
  { value: "otros",      label: "Otros"                             },
];

const BLANK_ALTA = {
  observaciones:     "",
  recomendaciones:   "",
  motivo:            "logros",
  genInforme:        true,
  genCarta:          false,
  referProfessional: "",
};

// ── Protocolo de Alta Modal ───────────────────────────────────────────────────
function DischargeProtocolModal({ open, onClose, patient, ptSessions, onConfirm }) {
  const [form, setForm] = useState(BLANK_ALTA);
  const fld = k => e => {
    const v = e.target ? (e.target.type === "checkbox" ? e.target.checked : e.target.value) : e;
    setForm(f => ({ ...f, [k]: v }));
  };

  // Reset when re-opening
  useEffect(() => { if (open) setForm(BLANK_ALTA); }, [open]);

  const sorted      = [...ptSessions].sort((a, b) => a.date.localeCompare(b.date));
  const firstSess   = sorted[0];
  const lastSess    = sorted[sorted.length - 1];
  const canConfirm  = form.observaciones.trim().length > 0;

  const sectionHead = (n, label) => (
    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14, marginTop: n > 1 ? 20 : 0 }}>
      <div style={{ width:24, height:24, borderRadius:"50%", background:T.pA, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        <span style={{ fontFamily:T.fB, fontSize:11, fontWeight:700, color:T.p }}>{n}</span>
      </div>
      <span style={{ fontFamily:T.fB, fontSize:12, fontWeight:700, color:T.t, textTransform:"uppercase", letterSpacing:"0.07em" }}>{label}</span>
      <div style={{ flex:1, height:1, background:T.bdrL }}/>
    </div>
  );

  const taStyle = {
    width:"100%", padding:"10px 13px", border:`1.5px solid ${T.bdr}`, borderRadius:10,
    fontFamily:T.fB, fontSize:13.5, color:T.t, background:T.bg, outline:"none",
    resize:"vertical", boxSizing:"border-box", lineHeight:1.65,
  };

  return (
    <Modal open={open} onClose={onClose} title="🎓 Protocolo de Alta" width={540}>
      {/* ── Sección 1: Nota de Alta ───────────────────────────────────── */}
      {sectionHead(1, "Nota de Alta")}

      <div style={{ marginBottom:12 }}>
        <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.tm, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>
          Observaciones finales y estado del paciente al egreso *
        </label>
        <textarea rows={4} value={form.observaciones} onChange={fld("observaciones")}
          placeholder="Describe el estado actual del paciente, logros alcanzados y condición de egreso..."
          style={{ ...taStyle, borderColor: form.observaciones.trim() ? T.bdr : T.err+"60" }}/>
        {!form.observaciones.trim() && (
          <div style={{ fontFamily:T.fB, fontSize:11, color:T.err, marginTop:4 }}>Campo requerido</div>
        )}
      </div>

      <div style={{ marginBottom:12 }}>
        <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.tm, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>
          Recomendaciones de seguimiento <span style={{ fontWeight:400, textTransform:"none", letterSpacing:0 }}>(opcional)</span>
        </label>
        <textarea rows={3} value={form.recomendaciones} onChange={fld("recomendaciones")}
          placeholder="Sugerencias post-alta, recursos, seguimiento recomendado..."
          style={taStyle}/>
      </div>

      <div style={{ marginBottom:4 }}>
        <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.tm, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>
          Motivo de alta
        </label>
        <select value={form.motivo} onChange={fld("motivo")}
          style={{ width:"100%", padding:"10px 13px", border:`1.5px solid ${T.bdr}`, borderRadius:10, fontFamily:T.fB, fontSize:13.5, color:T.t, background:T.bg, outline:"none" }}>
          {MOTIVO_ALTA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* ── Sección 2: Documentos ─────────────────────────────────────── */}
      {sectionHead(2, "Documentos a generar")}

      <div style={{ padding:"14px 16px", background:T.cardAlt, borderRadius:12, marginBottom:6 }}>
        {/* Informe de Alta */}
        <label style={{ display:"flex", alignItems:"flex-start", gap:10, cursor:"pointer", marginBottom:12 }}>
          <input type="checkbox" checked={form.genInforme} onChange={fld("genInforme")}
            style={{ marginTop:2, accentColor:T.p, width:16, height:16, flexShrink:0 }}/>
          <div>
            <div style={{ fontFamily:T.fB, fontSize:13.5, fontWeight:600, color:T.t }}>Generar Informe de Alta Terapéutica</div>
            <div style={{ fontFamily:T.fB, fontSize:11.5, color:T.tl, marginTop:2 }}>PDF con resumen del proceso, objetivos, evolución y recomendaciones</div>
          </div>
        </label>

        {/* Carta de Referencia */}
        <label style={{ display:"flex", alignItems:"flex-start", gap:10, cursor:"pointer" }}>
          <input type="checkbox" checked={form.genCarta} onChange={fld("genCarta")}
            style={{ marginTop:2, accentColor:T.p, width:16, height:16, flexShrink:0 }}/>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:T.fB, fontSize:13.5, fontWeight:600, color:T.t }}>Generar Carta de Referencia</div>
            <div style={{ fontFamily:T.fB, fontSize:11.5, color:T.tl, marginTop:2 }}>Carta formal para derivar a otro profesional</div>
          </div>
        </label>

        {form.genCarta && (
          <div style={{ marginTop:12, paddingTop:12, borderTop:`1px dashed ${T.bdrL}` }}>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.tm, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>
              Profesional de referencia
            </label>
            <input value={form.referProfessional} onChange={fld("referProfessional")}
              placeholder="Ej. Dr. Carlos Ruiz · Psiquiatría · IMSS Cancún"
              style={{ width:"100%", padding:"9px 13px", border:`1.5px solid ${T.bdr}`, borderRadius:9, fontFamily:T.fB, fontSize:13, color:T.t, background:T.card, outline:"none", boxSizing:"border-box" }}/>
          </div>
        )}
      </div>

      {/* ── Sección 3: Confirmación ───────────────────────────────────── */}
      {sectionHead(3, "Confirmación")}

      <div style={{ padding:"14px 16px", background:"rgba(78,139,95,0.07)", border:`1.5px solid rgba(78,139,95,0.2)`, borderRadius:12, marginBottom:20 }}>
        <div style={{ fontFamily:T.fB, fontSize:12, fontWeight:700, color:"#4E8B5F", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:10 }}>
          Resumen del proceso
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <div>
            <div style={{ fontFamily:T.fB, fontSize:10, color:"#4E8B5F", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:2 }}>Paciente</div>
            <div style={{ fontFamily:T.fB, fontSize:13.5, fontWeight:600, color:T.t }}>{patient?.name || "—"}</div>
          </div>
          <div>
            <div style={{ fontFamily:T.fB, fontSize:10, color:"#4E8B5F", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:2 }}>Total de sesiones</div>
            <div style={{ fontFamily:T.fB, fontSize:13.5, fontWeight:600, color:T.t }}>{ptSessions.length}</div>
          </div>
          {firstSess && (
            <div>
              <div style={{ fontFamily:T.fB, fontSize:10, color:"#4E8B5F", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:2 }}>Primera sesión</div>
              <div style={{ fontFamily:T.fB, fontSize:13, color:T.tm }}>{fmtDate(firstSess.date)}</div>
            </div>
          )}
          {lastSess && (
            <div>
              <div style={{ fontFamily:T.fB, fontSize:10, color:"#4E8B5F", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:2 }}>Última sesión</div>
              <div style={{ fontFamily:T.fB, fontSize:13, color:T.tm }}>{fmtDate(lastSess.date)}</div>
            </div>
          )}
        </div>
      </div>

      <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn
          onClick={() => canConfirm && onConfirm(form)}
          disabled={!canConfirm}
          style={{ background:"#4E8B5F", opacity: canConfirm ? 1 : 0.5 }}>
          <Check size={15}/> Confirmar Alta
        </Btn>
      </div>
    </Modal>
  );
}

// ── WA Alta Modal ─────────────────────────────────────────────────────────────
function WaAltaModal({ open, onClose, patient }) {
  const firstName = patient?.name?.split(" ")[0] || "";
  const msg = `Hola, ${firstName}. 🌟 Ha sido un honor acompañarte en este proceso. Hemos registrado tu alta y queremos desearte mucho éxito en tu camino. Recuerda que aquí estaremos si algún día nos necesitas de nuevo. ¡Cuídate mucho! 💙`;
  const waUrl = patient?.phone
    ? `https://wa.me/52${patient.phone.replace(/\D/g,"")}?text=${encodeURIComponent(msg)}`
    : "";

  return (
    <Modal open={open} onClose={onClose} title="📱 Mensaje de despedida" width={420}>
      <div style={{ fontFamily:T.fB, fontSize:12, color:T.tl, marginBottom:10 }}>
        Puedes enviarle un mensaje de cierre al paciente por WhatsApp:
      </div>
      <div style={{ padding:"14px 16px", background:"#ECF8F2", border:"1.5px solid #25D36640", borderRadius:12, fontFamily:T.fB, fontSize:13.5, color:"#1A2B28", lineHeight:1.65, marginBottom:20, whiteSpace:"pre-wrap", wordBreak:"break-word" }}>
        {msg}
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {waUrl && (
          <a href={waUrl} target="_blank" rel="noreferrer"
            style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"13px 16px", borderRadius:12, background:"#25D366", color:"#fff", fontFamily:T.fB, fontSize:14, fontWeight:700, textDecoration:"none" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Enviar por WhatsApp
          </a>
        )}
        <Btn variant="ghost" onClick={onClose} style={{ justifyContent:"center" }}>Omitir</Btn>
      </div>
    </Modal>
  );
}

// ── Reingreso Modal ───────────────────────────────────────────────────────────
function ReingresoModal({ open, onClose, patient, onConfirm }) {
  const [option,        setOption]        = useState("A");
  const [withAdmission, setWithAdmission] = useState(true);

  useEffect(() => { if (open) { setOption("A"); setWithAdmission(true); } }, [open]);

  const dischargeLabel = patient?.discharge?.date ? fmtDate(patient.discharge.date) : "—";
  const dischargeReason = patient?.discharge?.reason
    ? ({ logros:"Objetivos terapéuticos logrados", voluntaria:"Alta voluntaria del paciente", derivacion:"Derivación a otro profesional", otros:"Otros" }[patient.discharge.reason] || patient.discharge.reason)
    : "—";

  const radioStyle = (active) => ({
    display:"flex", alignItems:"flex-start", gap:10, padding:"12px 14px",
    borderRadius:10, border:`1.5px solid ${active ? T.p : T.bdrL}`,
    background: active ? T.pA : "transparent", cursor:"pointer",
    transition:"all .15s", marginBottom:8,
  });

  return (
    <Modal open={open} onClose={onClose} title="🔄 Iniciar Reingreso" width={520}>
      {/* Info del alta previa */}
      <div style={{ padding:"10px 14px", background:"rgba(78,139,95,0.07)", border:"1.5px solid rgba(78,139,95,0.2)", borderRadius:10, marginBottom:20, fontFamily:T.fB, fontSize:12.5, color:T.tm }}>
        <span style={{ fontWeight:700, color:"#4E8B5F" }}>Alta previa:</span>{" "}
        {dischargeLabel} · {dischargeReason}
      </div>

      {/* Opción A */}
      <div onClick={() => setOption("A")} style={radioStyle(option === "A")}>
        <div style={{ width:18, height:18, borderRadius:"50%", border:`2px solid ${option==="A" ? T.p : T.bdrL}`, background: option==="A" ? T.p : "transparent", flexShrink:0, marginTop:2, display:"flex", alignItems:"center", justifyContent:"center" }}>
          {option==="A" && <div style={{ width:7, height:7, borderRadius:"50%", background:"#fff" }}/>}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:T.fB, fontSize:14, fontWeight:700, color:T.t, marginBottom:3 }}>
            Opción A — Reactivar expediente existente
          </div>
          <div style={{ fontFamily:T.fB, fontSize:12.5, color:T.tm, lineHeight:1.6, marginBottom: option==="A" ? 12 : 0 }}>
            El historial previo se conserva y el nuevo proceso se suma al mismo expediente.
          </div>
          {option === "A" && (
            <div style={{ paddingTop:10, borderTop:`1px dashed ${T.bdrL}` }}>
              {[
                { val: true,  label:"Con nueva admisión", desc:"Activa el tab de Anamnesis vacío marcado con la fecha de reingreso." },
                { val: false, label:"Sin nueva admisión", desc:"El Resumen Dinámico de la sesión previa servirá como punto de partida." },
              ].map(o => (
                <label key={String(o.val)} onClick={e => { e.stopPropagation(); setWithAdmission(o.val); }}
                  style={{ display:"flex", alignItems:"flex-start", gap:8, cursor:"pointer", marginBottom:8 }}>
                  <div style={{ width:15, height:15, borderRadius:"50%", border:`2px solid ${withAdmission===o.val ? T.p : T.bdrL}`, background: withAdmission===o.val ? T.p : "transparent", flexShrink:0, marginTop:2, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    {withAdmission===o.val && <div style={{ width:5, height:5, borderRadius:"50%", background:"#fff" }}/>}
                  </div>
                  <div>
                    <div style={{ fontFamily:T.fB, fontSize:12.5, fontWeight:600, color:T.t }}>{o.label}</div>
                    <div style={{ fontFamily:T.fB, fontSize:11.5, color:T.tl }}>{o.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Opción B */}
      <div onClick={() => setOption("B")} style={radioStyle(option === "B")}>
        <div style={{ width:18, height:18, borderRadius:"50%", border:`2px solid ${option==="B" ? T.p : T.bdrL}`, background: option==="B" ? T.p : "transparent", flexShrink:0, marginTop:2, display:"flex", alignItems:"center", justifyContent:"center" }}>
          {option==="B" && <div style={{ width:7, height:7, borderRadius:"50%", background:"#fff" }}/>}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:T.fB, fontSize:14, fontWeight:700, color:T.t, marginBottom:3 }}>
            Opción B — Nuevo proceso vinculado
          </div>
          <div style={{ fontFamily:T.fB, fontSize:12.5, color:T.tm, lineHeight:1.6 }}>
            Se crea un expediente nuevo. El anterior queda archivado como referencia.
          </div>
        </div>
      </div>

      <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:20 }}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn onClick={() => onConfirm(option, withAdmission)}
          style={{ background: option==="B" ? T.acc : T.p }}>
          <Check size={15}/>
          {option === "A" ? "Reactivar expediente" : "Crear nuevo proceso"}
        </Btn>
      </div>
    </Modal>
  );
}

// ── Consent Renewal Modal (post-reingreso) ────────────────────────────────────
function ConsentRenewalModal({ open, onClose, patient }) {
  const firstName = patient?.name?.split(" ")[0] || "";
  const phone = patient?.phone || "";
  const link = `${PORTAL_DOMAIN}/portal?phone=${phone}`;
  const msg = `Hola, ${firstName}. 👋 Con motivo de tu reingreso, te compartimos el enlace para renovar tu Consentimiento Informado antes de tu próxima sesión: ${link} ¡Gracias por tu confianza! 💙`;
  const waUrl = phone
    ? `https://wa.me/52${phone.replace(/\D/g,"")}?text=${encodeURIComponent(msg)}`
    : "";

  return (
    <Modal open={open} onClose={onClose} title="⚠️ Consentimiento informado vencido" width={420}>
      <div style={{ padding:"12px 14px", background:T.warA, border:`1.5px solid ${T.war}60`, borderRadius:10, marginBottom:16 }}>
        <div style={{ fontFamily:T.fB, fontSize:13.5, color:T.t, lineHeight:1.65 }}>
          El consentimiento informado tiene más de 12 meses. Se recomienda obtener una nueva firma antes de la primera sesión.
        </div>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {waUrl && (
          <a href={waUrl} target="_blank" rel="noreferrer"
            style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"13px 16px", borderRadius:12, background:"#25D366", color:"#fff", fontFamily:T.fB, fontSize:14, fontWeight:700, textDecoration:"none" }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Enviar nuevo consentimiento por WhatsApp
          </a>
        )}
        <Btn variant="ghost" onClick={onClose} style={{ justifyContent:"center" }}>Omitir</Btn>
      </div>
    </Modal>
  );
}

// ── Primer Contacto Modal ─────────────────────────────────────────────────────
function PrimerContactoModal({ open, onClose, patients, onSave }) {
  const BLANK_PC = { name: "", phone: "", initialReason: "", appointmentDate: "", appointmentTime: "09:00" };
  const [step,    setStep]    = useState(1);  // 1=form, 2=whatsapp
  const [form,    setForm]    = useState(BLANK_PC);
  const [dupWarn, setDupWarn] = useState(null); // { name, id } of duplicate patient
  const [saved,   setSaved]   = useState(null); // { patient, appointment, msg }

  // Reset on close
  const handleClose = () => {
    setStep(1); setForm(BLANK_PC); setDupWarn(null); setSaved(null);
    onClose();
  };

  const fld = (k) => (e) => {
    const raw = e.target ? e.target.value : e;
    if (k === "phone") {
      // only digits
      setForm(f => ({ ...f, phone: raw.replace(/\D/g, "") }));
    } else {
      setForm(f => ({ ...f, [k]: raw }));
    }
    if (k === "phone") setDupWarn(null);
  };

  const checkDup = () => {
    const phone = form.phone.replace(/\D/g, "");
    if (!phone) return;
    const dup = patients.find(p => p.phone?.replace(/\D/g, "") === phone);
    if (dup) setDupWarn({ name: dup.name, id: dup.id });
    else setDupWarn(null);
  };

  const canSave = form.name.trim() && form.phone.trim() && form.initialReason.trim() && form.appointmentDate && !dupWarn;

  const handleSave = () => {
    if (!canSave) return;
    const result = onSave(form);
    setSaved(result);
    setStep(2);
  };

  // ── Step 2: build WhatsApp message ───────────────────────────────────────
  const buildWelcomeMsg = () => {
    if (!saved) return "";
    const phone     = saved.patient.phone;
    const link      = `${PORTAL_DOMAIN}/portal?phone=${phone}`;
    const firstName = saved.patient.name.split(" ")[0];
    const dateLabel = fmtDate(saved.appointment.date);
    const time      = saved.appointment.time;
    return `Hola, ${firstName}. 👋 Es un gusto saludarte. Te confirmamos que hemos agendado tu primera sesión para el ${dateLabel} a las ${time}. Antes de tu cita, te compartimos el enlace para revisar y firmar tu Consentimiento Informado: ${link} ¡Estamos para apoyarte! ✨`;
  };

  const msg      = buildWelcomeMsg();
  const waUrl    = saved ? `https://wa.me/52${saved.patient.phone}?text=${encodeURIComponent(msg)}` : "";

  const inputStyle = {
    width:"100%", padding:"10px 14px", border:`1.5px solid ${T.bdr}`,
    borderRadius:10, fontFamily:T.fB, fontSize:14, color:T.t,
    background:T.card, outline:"none", boxSizing:"border-box",
  };

  return (
    <Modal open={open} onClose={handleClose} title={step === 1 ? "✨ Nuevo paciente — Pre-Cita" : "📱 Mensaje de bienvenida"} width={480}>

      {/* ── Step 1: Capture form ──────────────────────────────────────────── */}
      {step === 1 && (
        <div>
          {/* Progress indicator */}
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:20 }}>
            <div style={{ flex:1, height:3, borderRadius:9999, background:T.p }}/>
            <div style={{ flex:1, height:3, borderRadius:9999, background:T.bdrL }}/>
            <span style={{ fontFamily:T.fB, fontSize:11, color:T.tl }}>Paso 1 de 2</span>
          </div>

          {/* Name */}
          <div style={{ marginBottom:14 }}>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.tm, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>
              Nombre completo *
            </label>
            <input value={form.name} onChange={fld("name")} placeholder="Ej. María González López"
              style={inputStyle}/>
          </div>

          {/* Phone */}
          <div style={{ marginBottom: dupWarn ? 8 : 14 }}>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.tm, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>
              Teléfono * <span style={{ fontWeight:400, textTransform:"none", letterSpacing:0 }}>(solo números)</span>
            </label>
            <input
              value={form.phone}
              onChange={fld("phone")}
              onBlur={checkDup}
              placeholder="9981234567"
              inputMode="numeric"
              maxLength={15}
              style={{ ...inputStyle, borderColor: dupWarn ? T.err : T.bdr }}
            />
          </div>

          {/* Duplicate phone warning */}
          {dupWarn && (
            <div style={{
              display:"flex", alignItems:"center", gap:10, padding:"10px 14px",
              background:T.warA, border:`1.5px solid ${T.war}60`,
              borderRadius:10, marginBottom:14
            }}>
              <span style={{ fontSize:16 }}>⚠️</span>
              <div style={{ flex:1 }}>
                <span style={{ fontFamily:T.fB, fontSize:13, color:T.war, fontWeight:600 }}>
                  Ya existe un paciente con este teléfono: <strong>{dupWarn.name}</strong>.
                </span>
                <br/>
                <button
                  onClick={() => { handleClose(); /* caller handles navigation */ onSave({ __navigateTo: dupWarn.id }); }}
                  style={{ background:"none", border:"none", padding:0, fontFamily:T.fB, fontSize:12, color:T.p, textDecoration:"underline", cursor:"pointer", marginTop:3 }}>
                  ¿Quieres abrir su expediente?
                </button>
              </div>
            </div>
          )}

          {/* Initial reason */}
          <div style={{ marginBottom:14 }}>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.tm, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>
              Motivo breve de consulta *
            </label>
            <input value={form.initialReason} onChange={fld("initialReason")} placeholder="Ej. Ansiedad generalizada, dificultades de pareja..."
              style={inputStyle}/>
          </div>

          {/* Date + Time */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 }}>
            <div>
              <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.tm, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>
                Fecha de primera cita
              </label>
              <input type="date" value={form.appointmentDate} onChange={fld("appointmentDate")}
                style={inputStyle}/>
            </div>
            <div>
              <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.tm, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>
                Hora
              </label>
              <select value={form.appointmentTime} onChange={e => setForm(f => ({ ...f, appointmentTime: e.target.value }))}
                style={{ ...inputStyle, appearance:"none", WebkitAppearance:"none", cursor:"pointer" }}>
                {PC_TIME_SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
            <Btn variant="ghost" onClick={handleClose}>Cancelar</Btn>
            <Btn onClick={handleSave} disabled={!canSave}>
              <Check size={14}/> Guardar y continuar
            </Btn>
          </div>
        </div>
      )}

      {/* ── Step 2: WhatsApp welcome message ──────────────────────────────── */}
      {step === 2 && saved && (
        <div>
          {/* Progress indicator */}
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:20 }}>
            <div style={{ flex:1, height:3, borderRadius:9999, background:T.suc }}/>
            <div style={{ flex:1, height:3, borderRadius:9999, background:T.suc }}/>
            <span style={{ fontFamily:T.fB, fontSize:11, color:T.suc, fontWeight:700 }}>✅ Completado</span>
          </div>

          {/* Success summary */}
          <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px",
            background:T.sucA, borderRadius:12, marginBottom:16, border:`1px solid ${T.suc}40` }}>
            <div style={{ width:38, height:38, borderRadius:"50%", background:T.suc,
              display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <span style={{ fontFamily:T.fH, fontSize:16, color:"#fff" }}>{saved.patient.name[0]}</span>
            </div>
            <div>
              <div style={{ fontFamily:T.fB, fontSize:13.5, fontWeight:700, color:T.t }}>
                {saved.patient.name}
              </div>
              <div style={{ fontFamily:T.fB, fontSize:12, color:T.tm }}>
                {saved.appointment.date ? `📅 ${fmtDate(saved.appointment.date)} · ${saved.appointment.time}` : "Sin cita agendada"}
              </div>
            </div>
            <span style={{ marginLeft:"auto", padding:"3px 10px", borderRadius:9999,
              background:T.pA, color:T.p, fontFamily:T.fB, fontSize:10, fontWeight:700 }}>
              Primera vez
            </span>
          </div>

          {/* Message preview */}
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:11, fontWeight:700, color:T.tm, textTransform:"uppercase",
              letterSpacing:"0.07em", marginBottom:8 }}>
              Mensaje de bienvenida
            </div>
            <div style={{ padding:"14px 16px", background:"#ECF8F2", border:"1.5px solid #25D36640",
              borderRadius:12, fontFamily:T.fB, fontSize:13.5, color:"#1A2B28", lineHeight:1.65,
              whiteSpace:"pre-wrap", wordBreak:"break-word" }}>
              {msg}
            </div>
            <div style={{ fontFamily:T.fB, fontSize:11, color:T.tl, marginTop:6 }}>
              🔒 Enlace de consentimiento incluido automáticamente
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            <a href={waUrl} target="_blank" rel="noreferrer"
              style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                padding:"13px 16px", borderRadius:12, border:"none",
                background:"#25D366", color:"#fff",
                fontFamily:T.fB, fontSize:14, fontWeight:700,
                textDecoration:"none", cursor:"pointer", transition:"opacity .13s" }}
              onMouseEnter={e => e.currentTarget.style.opacity="0.88"}
              onMouseLeave={e => e.currentTarget.style.opacity="1"}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Enviar por WhatsApp
            </a>
            <Btn variant="ghost" onClick={handleClose} style={{ justifyContent:"center" }}>
              Listo, cerrar
            </Btn>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function Patients({ patients = [], setPatients, sessions = [], payments = [], setPayments, riskAssessments = [], scaleResults = [], treatmentPlans = [], interSessions = [], setInterSessions, medications = [], setMedications, onQuickNav, profile, autoOpen, services = [], appointments = [], setAppointments }) {
  const [search,       setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [showAdd,      setShowAdd]      = useState(false);
  const [showPC,       setShowPC]       = useState(false);   // ← Primer Contacto modal
  const [editTarget,   setEditTarget]   = useState(null);    // patient being edited in full form

  useEffect(() => {
    if (autoOpen === "add") setShowPC(true);
  }, [autoOpen]);
  const [selected,     setSelected]     = useState(null);
  const [detailTab,    setDetailTab]    = useState("sessions");
  const [showAddDx,    setShowAddDx]    = useState(false);
  const [newDx,        setNewDx]        = useState({ diagnosis:"", cie11Code:"", date:fmt(todayDate), notes:"" });
  const [form, setForm] = useState({ name:"", birthdate:"", phone:"", email:"", diagnosis:"", cie11Code:"", reason:"", notes:"", status:"activo", type:"individual", coParticipants:"", rate:"", serviceId:"", emergencyName:"", emergencyPhone:"", emergencyRelation:"" });
  const fld = k => v => setForm(f => ({ ...f, [k]: v }));
  const isMobile = useIsMobile();
  const [showAltaModal,      setShowAltaModal]      = useState(false);
  const [showWaModal,        setShowWaModal]        = useState(false);
  const [altaToast,          setAltaToast]          = useState(false);
  const [showReingresoModal, setShowReingresoModal] = useState(false);
  const [showConsentExpired, setShowConsentExpired] = useState(false);
  const [reingresoToast,     setReingresoToast]     = useState(false);

  const updateConsent = (id, consentData) => {
    setPatients(prev => prev.map(p => p.id === id ? { ...p, consent: consentData } : p));
    setSelected(prev => prev?.id === id ? { ...prev, consent: consentData } : prev);
  };

  const addDiagnosis = (id) => {
    if (!newDx.diagnosis.trim()) return;
    setPatients(prev => prev.map(p => {
      if (p.id !== id) return p;
      const history = [...(p.diagnosisHistory || []), { ...newDx, id:"dx"+uid() }];
      return { ...p, diagnosisHistory: history, diagnosis: newDx.diagnosis, cie11Code: newDx.cie11Code || p.cie11Code };
    }));
    setSelected(prev => {
      if (!prev) return prev;
      const history = [...(prev.diagnosisHistory || []), { ...newDx, id:"dx"+uid() }];
      return { ...prev, diagnosisHistory: history, diagnosis: newDx.diagnosis, cie11Code: newDx.cie11Code || prev.cie11Code };
    });
    setNewDx({ diagnosis:"", cie11Code:"", date:fmt(todayDate), notes:"" });
    setShowAddDx(false);
  };

  const handleSelect = (p, openTab) => {
    setSelected(patients.find(pt => pt.id === p.id) || p);
    setDetailTab(openTab || "sessions");
  };
  if (onQuickNav) onQuickNav.current = (p, openTab) => handleSelect(p, openTab);

  const filtered = useMemo(() =>
    patients
      .filter(p => filterStatus === "todos" || (p.status||"activo") === filterStatus)
      .filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.diagnosis||"").toLowerCase().includes(search.toLowerCase())
      ), [patients, search, filterStatus]);

  const save = () => {
    if (!form.name.trim()) return;
    if (editTarget) {
      // Update existing patient
      setPatients(prev => prev.map(p =>
        p.id === editTarget ? { ...p, ...form, age: calcAge(form.birthdate) } : p
      ));
      setSelected(prev => prev ? { ...prev, ...form, age: calcAge(form.birthdate) } : prev);
    } else {
      // Add new patient (full form path)
      setPatients(prev => [...prev, { ...form, age: calcAge(form.birthdate), id:"p"+uid(), createdAt:fmt(todayDate) }]);
    }
    setForm({ name:"", birthdate:"", phone:"", email:"", diagnosis:"", cie11Code:"", reason:"", notes:"", status:"activo", type:"individual", coParticipants:"", rate:"", serviceId:"", emergencyName:"", emergencyPhone:"", emergencyRelation:"" });
    setEditTarget(null);
    setShowAdd(false);
  };

  // ── Primer Contacto — save handler ───────────────────────────────────────
  const savePrimerContacto = (pcForm) => {
    // Handle "navigate to existing" shortcut
    if (pcForm.__navigateTo) {
      const existing = patients.find(p => p.id === pcForm.__navigateTo);
      if (existing) handleSelect(existing);
      return null;
    }
    const newId = "p" + uid();
    const newPatient = {
      id:            newId,
      name:          pcForm.name.trim(),
      phone:         pcForm.phone.replace(/\D/g, ""),
      status:        "activo",
      initialReason: pcForm.initialReason.trim(),
      reason:        pcForm.initialReason.trim(),
      consent:       { signed: false },
      type:          "individual",
      createdAt:     fmt(todayDate),
      birthdate:"", email:"", diagnosis:"", cie11Code:"", notes:"",
      rate:"", serviceId:"", emergencyName:"", emergencyPhone:"", emergencyRelation:"",
    };
    setPatients(prev => [...prev, newPatient]);

    // Create appointment if date is provided
    let newAppointment = null;
    if (pcForm.appointmentDate && setAppointments) {
      newAppointment = {
        id:          "a" + uid(),
        patientId:   newId,
        patientName: newPatient.name,
        date:        pcForm.appointmentDate,
        time:        pcForm.appointmentTime || "09:00",
        type:        "Primera vez",
        status:      "pendiente",
      };
      setAppointments(prev => [...prev, newAppointment]);
    }

    return { patient: newPatient, appointment: newAppointment || { date: pcForm.appointmentDate, time: pcForm.appointmentTime } };
  };

  const del = id => { setPatients(prev => prev.filter(p => p.id !== id)); if (selected?.id === id) setSelected(null); };
  const setStatus = (id, status) => {
    setPatients(prev => prev.map(p => p.id === id ? { ...p, status } : p));
    setSelected(prev => prev ? { ...prev, status } : prev);
  };

  // ETAPA 3 — Mitigar riesgo: elimina activeRiskAlert del paciente (persiste en Supabase)
  const mitigateRisk = (id) => {
    setPatients(prev => prev.map(p => p.id === id ? { ...p, activeRiskAlert: null } : p));
    setSelected(prev => prev ? { ...prev, activeRiskAlert: null } : prev);
  };
  const setRate = (id, rate) => {
    setPatients(prev => prev.map(p => p.id === id ? { ...p, rate } : p));
    setSelected(prev => prev ? { ...prev, rate } : prev);
  };
  const setServiceId = (id, serviceId) => {
    // Also auto-set rate from service price
    const svc = services.find(s => s.id === serviceId);
    const rate = svc ? String(svc.price || "") : "";
    setPatients(prev => prev.map(p => p.id === id ? { ...p, serviceId, rate } : p));
    setSelected(prev => prev ? { ...prev, serviceId, rate } : prev);
  };
  const SERVICE_TYPE_LABEL = { sesion:"Sesión individual", evaluacion:"Evaluación neuropsicológica", pareja:"Terapia de pareja", grupo:"Grupo / Taller", otro:"Otro" };
  const togglePayment = id => setPayments(prev => prev.map(p => p.id === id ? { ...p, status: p.status === "pagado" ? "pendiente" : "pagado" } : p));

  // ── Confirmar Protocolo de Alta ───────────────────────────────────────────
  const confirmAlta = (altaForm) => {
    if (!selected) return;
    const dischargeDate = fmt(todayDate);
    const discharge = {
      date:            dischargeDate,
      reason:          altaForm.motivo,
      notes:           altaForm.observaciones,
      recommendations: altaForm.recomendaciones,
    };

    // 1. Actualizar estado del paciente
    setPatients(prev => prev.map(p =>
      p.id === selected.id ? { ...p, status: "alta", discharge } : p
    ));
    setSelected(prev => prev ? { ...prev, status: "alta", discharge } : prev);

    // 2. Generar PDFs
    const ptSess  = sessions.filter(s => s.patientId === selected.id).sort((a,b) => a.date.localeCompare(b.date));
    const allSc   = scaleResults.filter(r => r.patientId === selected.id).sort((a,b) => a.date.localeCompare(b.date));
    const plan    = treatmentPlans.filter(tp => tp.patientId === selected.id).sort((a,b) => (b.startDate||"").localeCompare(a.startDate||""))[0] || null;

    if (altaForm.genInforme) {
      printAlta({ patient: selected, plan, allScales: allSc, ptSessions: ptSess, profile, custom: {}, discharge });
    }
    if (altaForm.genCarta) {
      const latestRisk = riskAssessments.filter(r => r.patientId === selected.id).sort((a,b) => b.date.localeCompare(a.date))[0] || null;
      printDerivacion({
        patient: selected, plan, allScales: allSc, ptSessions: ptSess, profile, latestRisk,
        custom: {
          destinatario:        altaForm.referProfessional ? "" : "",
          profesional:         altaForm.referProfessional,
          motivo:              `Derivación al alta de ${selected.name}. ${altaForm.observaciones}`,
          resumenClinico:      altaForm.observaciones,
          informacionAdicional: altaForm.recomendaciones,
        },
      });
    }

    // 3. Cerrar modal de alta, abrir WA, mostrar toast
    setShowAltaModal(false);
    setShowWaModal(true);
    setAltaToast(true);
    setTimeout(() => setAltaToast(false), 3500);
  };

  // ── Confirmar Reingreso ───────────────────────────────────────────────────
  const confirmReingreso = (option, withAdmission) => {
    if (!selected) return;
    const today = fmt(todayDate);
    const reingresoData = { date: today, option, withAdmission: option === "A" ? withAdmission : false };

    if (option === "A") {
      const updates = { status: "activo", reingreso: reingresoData };
      if (withAdmission) {
        // Reset anamnesis, preserve reingresoDate as marker
        updates.anamnesis = { ...ANAMNESIS_BLANK, fechaPrimeraConsulta: today, reingresoDate: today };
      }
      setPatients(prev => prev.map(p => p.id === selected.id ? { ...p, ...updates } : p));
      setSelected(prev => prev ? { ...prev, ...updates } : prev);
    } else {
      // Opción B: annotate original (stays alta/archived), create new linked patient
      setPatients(prev => prev.map(p => p.id === selected.id ? { ...p, reingreso: reingresoData } : p));
      const newId = "p" + uid();
      const newPatient = {
        id:            newId,
        name:          selected.name,
        phone:         selected.phone || "",
        status:        "activo",
        linkedTo:      selected.id,
        reingreso:     reingresoData,
        type:          selected.type || "individual",
        createdAt:     today,
        birthdate:"", email:"", diagnosis:"", cie11Code:"", reason:"",
        notes:"", rate: selected.rate || "", serviceId: selected.serviceId || "",
        emergencyName:"", emergencyPhone:"", emergencyRelation:"",
        consent: { signed: false },
      };
      setPatients(prev => [...prev, newPatient]);
      setSelected(newPatient);
    }

    setShowReingresoModal(false);
    setReingresoToast(true);
    setTimeout(() => setReingresoToast(false), 3500);

    // Verificar vencimiento de consentimiento (>12 meses o sin firma)
    const signedAt = selected.consent?.signedAt;
    if (!signedAt) {
      setShowConsentExpired(true);
    } else {
      const monthsDiff = (Date.now() - new Date(signedAt).getTime()) / (1000 * 60 * 60 * 24 * 30.44);
      if (monthsDiff > 12) setShowConsentExpired(true);
    }
  };

  // ── Detail ────────────────────────────────────────────────────────────────
  if (selected) {
    const ptSessions = sessions.filter(s => s.patientId === selected.id).sort((a,b) => b.date.localeCompare(a.date));
    const ptPayments = payments.filter(p => p.patientId === selected.id).sort((a,b) => b.date.localeCompare(a.date));
    const totalPaid  = ptPayments.filter(p => p.status==="pagado").reduce((s,p) => s+Number(p.amount), 0);
    const totalPend  = ptPayments.filter(p => p.status==="pendiente").reduce((s,p) => s+Number(p.amount), 0);
    const sc = STATUS_CONFIG[selected.status || "activo"];

    return (
      <div>
        {/* ── Toast de confirmación de alta ──────────────────────────────────── */}
        {altaToast && (
          <div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)",
            background:"#4E8B5F", color:"#fff", fontFamily:T.fB, fontSize:13, fontWeight:600,
            padding:"11px 22px", borderRadius:12, boxShadow:"0 4px 20px rgba(0,0,0,0.18)",
            zIndex:9999, display:"flex", alignItems:"center", gap:8, whiteSpace:"nowrap" }}>
            <Check size={15}/> Alta registrada correctamente
          </div>
        )}

        {/* ── Toast de confirmación de reingreso ─────────────────────────────── */}
        {reingresoToast && (
          <div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)",
            background:T.p, color:"#fff", fontFamily:T.fB, fontSize:13, fontWeight:600,
            padding:"11px 22px", borderRadius:12, boxShadow:"0 4px 20px rgba(0,0,0,0.18)",
            zIndex:9999, display:"flex", alignItems:"center", gap:8, whiteSpace:"nowrap" }}>
            <Check size={15}/> Reingreso registrado correctamente
          </div>
        )}

        {/* ── Banner de Alta — solo si el paciente está en alta ──────────────── */}
        {selected.status === "alta" && selected.discharge && (
          <div style={{
            display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12,
            padding:"14px 18px", marginBottom:16,
            background:"rgba(78,139,95,0.08)", border:"1.5px solid rgba(78,139,95,0.3)",
            borderRadius:12,
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:20 }}>🎓</span>
              <div>
                <div style={{ fontFamily:T.fB, fontSize:13, fontWeight:700, color:"#4E8B5F", marginBottom:2 }}>
                  Este paciente fue dado de alta el {fmtDate(selected.discharge.date)}.
                </div>
                <div style={{ fontFamily:T.fB, fontSize:12, color:T.tm }}>
                  Motivo:{" "}
                  {({ logros:"Objetivos terapéuticos logrados", voluntaria:"Alta voluntaria del paciente", derivacion:"Derivación a otro profesional", otros:"Otros" }[selected.discharge.reason] || selected.discharge.reason || "—")}
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowReingresoModal(true)}
              style={{ display:"flex", alignItems:"center", gap:7, padding:"9px 18px", borderRadius:9,
                border:"none", background:"#4E8B5F", color:"#fff",
                fontFamily:T.fB, fontSize:13, fontWeight:700, cursor:"pointer",
                boxShadow:"0 2px 8px rgba(78,139,95,0.28)", transition:"opacity .15s", flexShrink:0 }}
              onMouseEnter={e => e.currentTarget.style.opacity="0.88"}
              onMouseLeave={e => e.currentTarget.style.opacity="1"}>
              🔄 Iniciar Reingreso
            </button>
          </div>
        )}

        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
          <button onClick={() => setSelected(null)}
            style={{ display:"flex", alignItems:"center", gap:5, background:"none", border:"none",
              color:T.p, fontFamily:T.fB, fontSize:13, cursor:"pointer", padding:0 }}>
            <ChevronLeft size={15}/> Volver
          </button>
          <button onClick={() => exportExpediente(selected, sessions, payments, profile)}
            style={{ display:"flex", alignItems:"center", gap:5, background:"transparent",
              border:`1.5px solid ${T.bdr}`, borderRadius:9999, padding:"6px 14px",
              fontFamily:T.fB, fontSize:12, fontWeight:600, color:T.tm, cursor:"pointer", transition:"all .15s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor=T.p; e.currentTarget.style.color=T.p; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor=T.bdr; e.currentTarget.style.color=T.tm; }}>
            <Download size={13}/> Exportar PDF
          </button>
        </div>

        <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0,290px) 1fr", gap:20, alignItems:"start" }}>
          {/* Profile card */}
          <Card style={{ padding:20 }}>
            {/* Header compacto — avatar + nombre + status en una fila */}
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
              <div style={{ width:44, height:44, borderRadius:"50%", background:T.pA,
                display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <span style={{ fontFamily:T.fH, fontSize:19, color:T.p }}>{selected.name[0]}</span>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <h2 style={{ fontFamily:T.fH, fontSize:19, fontWeight:500, color:T.t,
                  margin:"0 0 2px", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                  {selected.name}
                </h2>
                <p style={{ fontFamily:T.fB, fontSize:12, color:T.tm, margin:0 }}>
                  {selected.age ? `${selected.age} años · ` : ""}Desde {fmtDate(selected.createdAt)}
                </p>
              </div>
              <select value={selected.status || "activo"} onChange={e => setStatus(selected.id, e.target.value)}
                style={{ appearance:"none", padding:"4px 10px", borderRadius:9999, fontFamily:T.fB,
                  fontSize:11, fontWeight:700, letterSpacing:"0.04em", border:"none",
                  cursor:"pointer", background:sc.bg, color:sc.color, flexShrink:0 }}>
                {Object.entries(STATUS_CONFIG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              {selected.linkedTo && (
                <div style={{ fontFamily:T.fB, fontSize:10, fontWeight:700, color:T.p,
                  textAlign:"right", marginTop:3, whiteSpace:"nowrap",
                  padding:"2px 8px", borderRadius:9999, background:T.pA }}>
                  🔗 Reingreso (exp. vinculado)
                </div>
              )}
              {selected.status === "alta" && selected.discharge?.date && (
                <div style={{ fontFamily:T.fB, fontSize:10, fontWeight:700, color:T.tl,
                  textAlign:"right", marginTop:3, whiteSpace:"nowrap" }}>
                  Alta: {fmtDate(selected.discharge.date)}
                </div>
              )}
            </div>

            <div style={{ borderTop:`1px solid ${T.bdrL}`, paddingTop:14, marginBottom:14 }}>
              {/* ETAPA 3 — Banner de alerta de riesgo activo persistido ─────────────── */}
            {selected.activeRiskAlert && (
              <div style={{
                display:"flex", alignItems:"flex-start", gap:10, padding:"14px 16px",
                background:"rgba(184,80,80,0.08)", border:"2px solid rgba(184,80,80,0.35)",
                borderRadius:12, marginBottom:14,
                animation:"pulseRiskBanner 2.5s ease-in-out infinite"
              }}>
                <ShieldAlert size={20} color="#B85050" style={{ flexShrink:0, marginTop:2 }}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:T.fB, fontSize:13, fontWeight:700, color:"#B85050", marginBottom:4 }}>
                    Alerta: Riesgo {(selected.activeRiskAlert.level||"").toUpperCase()} Activo
                  </div>
                  <div style={{ fontFamily:T.fB, fontSize:11.5, color:"#B85050", lineHeight:1.55, opacity:0.9, marginBottom:10 }}>
                    Detectado el {selected.activeRiskAlert.date
                      ? new Date(selected.activeRiskAlert.date).toLocaleDateString("es-MX",{day:"numeric",month:"long",year:"numeric"})
                      : "—"}. Este banner permanecerá hasta que lo marques como mitigado.
                  </div>
                  <button onClick={() => {
                    if (confirm(`¿Confirmas que el riesgo de ${selected.name} ha sido evaluado y se encuentra mitigado? Esta acción eliminará la alerta activa.`)) {
                      mitigateRisk(selected.id);
                    }
                  }}
                    style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"6px 14px",
                      borderRadius:9, border:"1.5px solid rgba(184,80,80,0.4)",
                      background:"rgba(184,80,80,0.12)", color:"#B85050",
                      fontFamily:T.fB, fontSize:11.5, fontWeight:700, cursor:"pointer" }}>
                    <X size={12}/> Marcar como Riesgo Mitigado
                  </button>
                </div>
                <style>{`@keyframes pulseRiskBanner{0%,100%{box-shadow:0 0 0 0 rgba(184,80,80,0.3)}50%{box-shadow:0 0 0 8px rgba(184,80,80,0)}}`}</style>
              </div>
            )}

            {selected.phone && <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:8, fontFamily:T.fB, fontSize:13, color:T.tm }}><Phone size={13}/>{selected.phone}</div>}
              {selected.email && <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:8, fontFamily:T.fB, fontSize:13, color:T.tm }}><Mail size={13}/>{selected.email}</div>}
            </div>

            {/* Contacto de emergencia */}
            {selected.emergencyName && (
              <div style={{ padding:"12px 14px", background:"rgba(184,80,80,0.06)", border:`1.5px solid rgba(184,80,80,0.15)`, borderRadius:10, marginBottom:12 }}>
                <div style={{ fontSize:10, fontWeight:700, color:T.err, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8, display:"flex", alignItems:"center", gap:5 }}>
                  <span>🚨</span> Contacto de emergencia
                </div>
                <div style={{ fontFamily:T.fB, fontSize:13.5, fontWeight:600, color:T.t, marginBottom:2 }}>{selected.emergencyName}</div>
                {selected.emergencyRelation && <div style={{ fontFamily:T.fB, fontSize:12, color:T.tm, marginBottom:4 }}>{selected.emergencyRelation}</div>}
                {selected.emergencyPhone && (
                  <a href={`tel:${selected.emergencyPhone}`} style={{ fontFamily:T.fB, fontSize:13, color:T.err, fontWeight:600, textDecoration:"none", display:"flex", alignItems:"center", gap:5 }}>
                    <Phone size={12}/>{selected.emergencyPhone}
                  </a>
                )}
              </div>
            )}

            {/* Servicio habitual — vinculado al catálogo */}
            <div style={{ padding:"10px 12px", background:T.cardAlt, borderRadius:9, marginBottom:10, border:`1px solid ${T.bdrL}` }}>
              <div style={{ fontFamily:T.fB, fontSize:10, fontWeight:700, color:T.tl, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>
                Servicio habitual
              </div>
              {services.length > 0 ? (
                <select
                  value={selected.serviceId || ""}
                  onChange={e => setServiceId(selected.id, e.target.value)}
                  style={{ width:"100%", border:`1px solid ${T.bdr}`, borderRadius:8, padding:"6px 10px",
                    fontFamily:T.fB, fontSize:13, color:T.t, background:T.card, outline:"none" }}>
                  <option value="">— Sin asignar —</option>
                  {services.filter(s => s.type !== "paquete").map(s => {
                    const label = s.name || SERVICE_TYPE_LABEL[s.type] || s.type;
                    const price = s.modality === "ambas"
                      ? `$${s.price} / $${s.priceVirtual}`
                      : s.modality === "virtual" ? `$${s.priceVirtual}` : `$${s.price}`;
                    return <option key={s.id} value={s.id}>{label} · {price}</option>;
                  })}
                </select>
              ) : (
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ fontFamily:T.fB, fontSize:12, color:T.tm }}>$</span>
                  <input type="number" value={selected.rate || ""} onChange={e => setRate(selected.id, e.target.value)}
                    placeholder="—"
                    style={{ flex:1, border:"none", background:"transparent", fontFamily:T.fB, fontSize:13, color:T.t, outline:"none", minWidth:0 }} />
                  <span style={{ fontFamily:T.fB, fontSize:11, color:T.tl }}>/ses</span>
                </div>
              )}
              {selected.serviceId && (() => {
                const svc = services.find(s => s.id === selected.serviceId);
                if (!svc) return null;
                return (
                  <div style={{ fontFamily:T.fB, fontSize:11, color:T.tm, marginTop:5 }}>
                    {svc.modality === "ambas" && `🏢 $${svc.price} · 💻 $${svc.priceVirtual}`}
                    {svc.modality === "presencial" && `🏢 $${svc.price}`}
                    {svc.modality === "virtual" && `💻 $${svc.priceVirtual}`}
                  </div>
                );
              })()}
            </div>

            {selected.diagnosis && <div style={{ padding:12, background:T.pA, borderRadius:10, marginBottom:10 }}>
              <div style={{ fontSize:10, fontWeight:700, color:T.p, letterSpacing:"0.08em", marginBottom:5, textTransform:"uppercase" }}>Diagnóstico actual</div>
              {selected.cie11Code && (
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5 }}>
                  <span style={{ padding:"2px 8px", borderRadius:6, background:"rgba(58,107,110,0.15)", color:T.p, fontSize:10, fontWeight:700, fontFamily:"monospace" }}>{selected.cie11Code}</span>
                  <span style={{ fontSize:10, color:T.tm }}>CIE-11</span>
                </div>
              )}
              <div style={{ fontFamily:T.fB, fontSize:13, color:T.t }}>{selected.diagnosis}</div>
            </div>}
            {/* Diagnosis history */}
            {(selected.diagnosisHistory||[]).length > 1 && (
              <div style={{ padding:"10px 12px", background:T.cardAlt, borderRadius:10, marginBottom:10 }}>
                <div style={{ fontSize:10, fontWeight:700, color:T.tm, letterSpacing:"0.08em", marginBottom:8, textTransform:"uppercase" }}>Historial diagnóstico</div>
                {[...(selected.diagnosisHistory||[])].reverse().slice(1).map(dx => (
                  <div key={dx.id} style={{ fontFamily:T.fB, fontSize:12, color:T.tm, marginBottom:6, display:"flex", justifyContent:"space-between", gap:8, alignItems:"flex-start" }}>
                    <div>
                      {dx.cie11Code && <span style={{ fontFamily:"monospace", fontSize:10, fontWeight:700, color:T.p, background:T.pA, padding:"1px 5px", borderRadius:4, marginRight:5 }}>{dx.cie11Code}</span>}
                      <span>{dx.diagnosis}</span>
                    </div>
                    <span style={{ color:T.tl, flexShrink:0 }}>{fmtDate(dx.date)}</span>
                  </div>
                ))}
              </div>
            )}
            {/* Add diagnosis button */}
            {showAddDx ? (
              <div style={{ padding:12, background:T.cardAlt, borderRadius:10, marginBottom:10 }}>
                <CieDiagnosisField
                  value={newDx.diagnosis}
                  cie11Code={newDx.cie11Code}
                  onChangeDx={v => setNewDx(n=>({...n, diagnosis:v}))}
                  onChangeCode={v => setNewDx(n=>({...n, cie11Code:v}))}
                  label="Nuevo diagnóstico"
                />
                <input type="date" value={newDx.date} onChange={e => setNewDx(n=>({...n,date:e.target.value}))} style={{ width:"100%", padding:"8px 10px", border:`1.5px solid ${T.bdr}`, borderRadius:8, fontFamily:T.fB, fontSize:13, color:T.t, background:T.card, outline:"none", boxSizing:"border-box", marginBottom:8 }}/>
                <div style={{ display:"flex", gap:6 }}>
                  <button onClick={() => addDiagnosis(selected.id)} disabled={!newDx.diagnosis.trim()} style={{ flex:1, padding:"7px 0", background:T.p, color:"#fff", border:"none", borderRadius:8, fontFamily:T.fB, fontSize:12, fontWeight:600, cursor:newDx.diagnosis.trim()?"pointer":"not-allowed", opacity:newDx.diagnosis.trim()?1:0.5 }}>Guardar</button>
                  <button onClick={() => setShowAddDx(false)} style={{ flex:1, padding:"7px 0", background:T.bdrL, color:T.tm, border:"none", borderRadius:8, fontFamily:T.fB, fontSize:12, cursor:"pointer" }}>Cancelar</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowAddDx(true)} style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 12px", background:"transparent", border:`1.5px dashed ${T.bdr}`, borderRadius:9, fontFamily:T.fB, fontSize:12, color:T.p, cursor:"pointer", width:"100%", justifyContent:"center", marginBottom:10 }}>
                + Actualizar diagnóstico
              </button>
            )}
            {selected.reason    && <div style={{ padding:12, background:T.cardAlt, borderRadius:10, marginBottom:10 }}><div style={{ fontSize:10, fontWeight:700, color:T.tm, letterSpacing:"0.08em", marginBottom:5, textTransform:"uppercase" }}>Motivo de consulta</div><div style={{ fontFamily:T.fB, fontSize:13, color:T.t }}>{selected.reason}</div></div>}
            {/* Consentimiento informado */}
            <ConsentBlock
              key={selected.id}
              patient={selected}
              onUpdate={(consentData) => updateConsent(selected.id, consentData)}
              profile={profile}
            />

            {/* Medicación activa y seguimiento inter-sesional */}
            <MedSummaryWidget patientId={selected.id} medications={medications}/>
            <ContactFollowUpWidget patientId={selected.id} interSessions={interSessions}/>

            <div style={{ marginTop:16, display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, paddingTop:16, borderTop:`1px solid ${T.bdrL}` }}>
              <div style={{ textAlign:"center", padding:"10px 8px", background:T.pA, borderRadius:10 }}>
                <div style={{ fontFamily:T.fH, fontSize:26, color:T.p, lineHeight:1 }}>{ptSessions.length}</div>
                <div style={{ fontSize:11, color:T.tm, marginTop:3, fontFamily:T.fB }}>Sesiones</div>
              </div>
              <div style={{ textAlign:"center", padding:"10px 8px", background:T.sucA, borderRadius:10 }}>
                <div style={{ fontFamily:T.fH, fontSize:20, color:T.suc, lineHeight:1 }}>{fmtCur(totalPaid)}</div>
                <div style={{ fontSize:11, color:T.tm, marginTop:3, fontFamily:T.fB }}>Pagado</div>
              </div>
              {totalPend > 0 && <div style={{ textAlign:"center", padding:"10px 8px", background:T.warA, borderRadius:10, gridColumn:"1/-1" }}>
                <div style={{ fontFamily:T.fH, fontSize:20, color:T.war, lineHeight:1 }}>{fmtCur(totalPend)}</div>
                <div style={{ fontSize:11, color:T.tm, marginTop:3, fontFamily:T.fB }}>Pendiente</div>
              </div>}
            </div>

            {/* Botón Dar de Alta — solo si no está ya en alta */}
            {(selected.status !== "alta") && (
              <div style={{ marginTop:16, paddingTop:14, borderTop:`1px solid ${T.bdrL}` }}>
                <button
                  onClick={() => setShowAltaModal(true)}
                  style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                    width:"100%", padding:"8px", borderRadius:9,
                    border:`1.5px solid rgba(78,139,95,0.4)`, background:"rgba(78,139,95,0.07)",
                    color:"#4E8B5F", fontFamily:T.fB, fontSize:12, fontWeight:700,
                    cursor:"pointer", transition:"all .15s" }}
                  onMouseEnter={e => { e.currentTarget.style.background="rgba(78,139,95,0.18)"; e.currentTarget.style.borderColor="rgba(78,139,95,0.7)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background="rgba(78,139,95,0.07)"; e.currentTarget.style.borderColor="rgba(78,139,95,0.4)"; }}>
                  <LogOut size={13}/> Dar de alta
                </button>
              </div>
            )}

            {/* Registro de alta — banner sidebar si ya está en alta */}
            {selected.status === "alta" && selected.discharge && (
              <div style={{ marginTop:16, paddingTop:14, borderTop:`1px solid ${T.bdrL}` }}>
                <div style={{ padding:"12px 14px", background:"rgba(78,139,95,0.07)", border:`1.5px solid rgba(78,139,95,0.2)`, borderRadius:10 }}>
                  <div style={{ fontFamily:T.fB, fontSize:10, fontWeight:700, color:"#4E8B5F", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>
                    🎓 Registro de Alta
                  </div>
                  {selected.discharge.reason && (
                    <div style={{ fontFamily:T.fB, fontSize:12, color:T.tm, marginBottom:4 }}>
                      {({ logros:"Objetivos terapéuticos logrados", voluntaria:"Alta voluntaria", derivacion:"Derivación a otro profesional", otros:"Otros" }[selected.discharge.reason] || selected.discharge.reason)}
                    </div>
                  )}
                  {selected.discharge.notes && (
                    <div style={{ fontFamily:T.fB, fontSize:12, color:T.t, lineHeight:1.55, marginBottom:10 }}>
                      {selected.discharge.notes.slice(0, 120)}{selected.discharge.notes.length > 120 ? "…" : ""}
                    </div>
                  )}
                  {selected.reingreso && (
                    <div style={{ padding:"6px 10px", background:T.pA, borderRadius:8, marginBottom:8 }}>
                      <div style={{ fontFamily:T.fB, fontSize:10, fontWeight:700, color:T.p, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:2 }}>Reingreso previo</div>
                      <div style={{ fontFamily:T.fB, fontSize:11.5, color:T.tm }}>
                        {fmtDate(selected.reingreso.date)} · Opción {selected.reingreso.option}
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => setShowReingresoModal(true)}
                    style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                      width:"100%", padding:"8px", borderRadius:9,
                      border:"none", background:"#4E8B5F", color:"#fff",
                      fontFamily:T.fB, fontSize:12, fontWeight:700, cursor:"pointer",
                      transition:"opacity .15s" }}
                    onMouseEnter={e => e.currentTarget.style.opacity="0.85"}
                    onMouseLeave={e => e.currentTarget.style.opacity="1"}>
                    🔄 Iniciar Reingreso
                  </button>
                </div>
              </div>
            )}

            {/* Editar expediente completo */}
            <div style={{ marginTop:16, paddingTop:14, borderTop:`1px solid ${T.bdrL}` }}>
              <button
                onClick={() => {
                  setForm({
                    name:              selected.name || "",
                    birthdate:         selected.birthdate || "",
                    phone:             selected.phone || "",
                    email:             selected.email || "",
                    diagnosis:         selected.diagnosis || "",
                    cie11Code:         selected.cie11Code || "",
                    reason:            selected.reason || "",
                    notes:             selected.notes || "",
                    status:            selected.status || "activo",
                    type:              selected.type || "individual",
                    coParticipants:    selected.coParticipants || "",
                    rate:              selected.rate || "",
                    serviceId:         selected.serviceId || "",
                    emergencyName:     selected.emergencyName || "",
                    emergencyPhone:    selected.emergencyPhone || "",
                    emergencyRelation: selected.emergencyRelation || "",
                  });
                  setEditTarget(selected.id);
                  setShowAdd(true);
                }}
                style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                  width:"100%", padding:"7px", borderRadius:9,
                  border:`1px solid ${T.bdr}`, background:"transparent",
                  color:T.tm, fontFamily:T.fB, fontSize:11.5, fontWeight:600,
                  cursor:"pointer", transition:"all .15s", marginBottom:8 }}
                onMouseEnter={e => { e.currentTarget.style.borderColor=T.p; e.currentTarget.style.color=T.p; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor=T.bdr; e.currentTarget.style.color=T.tm; }}>
                ✏️ Editar expediente completo
              </button>
            </div>

            {/* Botón eliminar — separado visualmente, zona de peligro */}
            <div style={{ marginTop:20, paddingTop:14, borderTop:`1px dashed ${T.bdrL}` }}>
              <button
                onClick={() => {
                  if (confirm(`¿Eliminar el expediente de ${selected.name}? Esta acción no se puede deshacer.`)) {
                    del(selected.id);
                  }
                }}
                style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                  width:"100%", padding:"7px", borderRadius:9,
                  border:`1px solid ${T.errA}`, background:"transparent",
                  color:T.err, fontFamily:T.fB, fontSize:11.5, fontWeight:600,
                  cursor:"pointer", opacity:0.5, transition:"all .15s" }}
                onMouseEnter={e => { e.currentTarget.style.opacity="1"; e.currentTarget.style.background=T.errA; }}
                onMouseLeave={e => { e.currentTarget.style.opacity="0.5"; e.currentTarget.style.background="transparent"; }}>
                <Trash2 size={12}/> Eliminar expediente
              </button>
            </div>
          </Card>

          {/* Tabs: Sesiones | Pagos | Progreso | Contactos | Medicación */}
          <Card style={{ padding:24 }}>
            <Tabs
              tabs={[
                { id:"anamnesis", label: selected.anamnesis && Object.values(selected.anamnesis).some(v => v && v !== "ninguno" && v !== fmt(todayDate))
                  ? "Anamnesis ✅"
                  : "Anamnesis 🟠" },
                { id:"sessions",    label:`Sesiones (${ptSessions.length})`  },
                { id:"payments",    label:`Pagos (${ptPayments.length})`     },
                { id:"progress",    label:"Progreso"                         },
                { id:"contacts",    label:`Contactos (${(interSessions||[]).filter(c=>c.patientId===selected.id).length})` },
                { id:"medications", label:`Medicación (${(medications||[]).filter(m=>m.patientId===selected.id&&m.status==="activo").length})` },
                { id:"tasks",       label:"Tareas" },
              ]}
              active={detailTab} onChange={setDetailTab}
            />

            {/* Anamnesis */}
            {detailTab === "anamnesis" && (
              <AnamnesisTab
                patient={selected}
                setPatients={setPatients}
                todayStr={fmt(todayDate)}
              />
            )}

            {/* Sessions */}
            {detailTab === "sessions" && (
              ptSessions.length === 0
                ? <div style={{ fontFamily:T.fB, fontSize:13, color:T.tl, padding:"24px 0", textAlign:"center" }}>Sin sesiones registradas aún</div>
                : ptSessions.map(s => {
                  const MI = moodIcon(s.mood); const ps = progressStyle(s.progress);
                  return (
                    <div key={s.id} style={{ borderBottom:`1px solid ${T.bdrL}`, paddingBottom:14, marginBottom:14 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                        <span style={{ fontFamily:T.fB, fontSize:13.5, fontWeight:500, color:T.t }}>{fmtDate(s.date)} · {s.duration} min</span>
                        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                          <MI size={14} color={moodColor(s.mood)}/>
                          <Badge color={ps.c} bg={ps.bg}>{s.progress}</Badge>
                        </div>
                      </div>
                      <p style={{ fontFamily:T.fB, fontSize:13, color:T.tm, margin:"0 0 8px", lineHeight:1.65 }}>
                        {(s.notes || "").replace(/\[(?:S|D|A|P|B|I|R)\]\s*/g, "").slice(0, 120)}
                        {(s.notes || "").length > 120 ? "…" : ""}
                      </p>
                      {(s.tags||[]).length > 0 && <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>{s.tags.map(t => <Badge key={t} color={T.acc} bg={T.accA}><Tag size={10}/>{t}</Badge>)}</div>}
                    </div>
                  );
                })
            )}

            {/* Payments */}
            {detailTab === "payments" && (
              ptPayments.length === 0
                ? <div style={{ fontFamily:T.fB, fontSize:13, color:T.tl, padding:"24px 0", textAlign:"center" }}>Sin pagos registrados</div>
                : <>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:16, padding:"12px 14px", background:T.bg, borderRadius:12 }}>
                    <div style={{ textAlign:"center" }}>
                      <div style={{ fontFamily:T.fH, fontSize:20, color:T.suc, lineHeight:1 }}>{fmtCur(totalPaid)}</div>
                      <div style={{ fontFamily:T.fB, fontSize:10, color:T.tm, marginTop:3 }}>Pagado</div>
                    </div>
                    <div style={{ textAlign:"center", borderLeft:`1px solid ${T.bdrL}`, borderRight:`1px solid ${T.bdrL}` }}>
                      <div style={{ fontFamily:T.fH, fontSize:20, color:totalPend > 0 ? T.war : T.tl, lineHeight:1 }}>{fmtCur(totalPend)}</div>
                      <div style={{ fontFamily:T.fB, fontSize:10, color:T.tm, marginTop:3 }}>Pendiente</div>
                    </div>
                    <div style={{ textAlign:"center" }}>
                      <div style={{ fontFamily:T.fH, fontSize:20, color:T.p, lineHeight:1 }}>{ptPayments.length}</div>
                      <div style={{ fontFamily:T.fB, fontSize:10, color:T.tm, marginTop:3 }}>Registros</div>
                    </div>
                  </div>
                  {ptPayments.map(p => (
                    <div key={p.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 0", borderBottom:`1px solid ${T.bdrL}` }}>
                      <div style={{ width:40, height:40, borderRadius:11, background:p.status==="pagado"?T.sucA:T.warA, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <DollarSign size={16} color={p.status==="pagado"?T.suc:T.war} strokeWidth={1.6}/>
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontFamily:T.fB, fontSize:13.5, fontWeight:500, color:T.t }}>{fmtCur(p.amount)}</div>
                        <div style={{ fontFamily:T.fB, fontSize:12, color:T.tm }}>{fmtDate(p.date)} · {p.concept} · {p.method}</div>
                      </div>
                      <button onClick={() => togglePayment(p.id)} style={{ background:p.status==="pagado"?T.sucA:T.warA, border:"none", borderRadius:8, padding:"4px 10px", cursor:"pointer", fontSize:11, fontFamily:T.fB, color:p.status==="pagado"?T.suc:T.war, fontWeight:600 }}>{p.status}</button>
                    </div>
                  ))}
                </>
            )}

            {/* Progress tab */}
            {detailTab === "progress" && (
              <div>
                {ptSessions.length < 2 ? (
                  <div style={{ fontFamily:T.fB, fontSize:13, color:T.tl,
                    padding:"32px 0", textAlign:"center", lineHeight:1.6 }}>
                    Registra al menos 2 sesiones para ver<br/>la evolución clínica del paciente
                  </div>
                ) : (
                  <>
                    <ProgressSparkline sessions={ptSessions}/>
                    <div style={{ marginTop:24, paddingTop:20, borderTop:`1px solid ${T.bdrL}` }}>
                      <MoodTimeline sessions={ptSessions}/>
                    </div>
                  </>
                )}

                {/* Session stats */}
                {ptSessions.length > 0 && (
                  <div style={{ marginTop:20, display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(120px,1fr))", gap:10 }}>
                    {[
                      { label:"Excelente", value: ptSessions.filter(s=>s.progress==="excelente").length, color:T.suc, bg:T.sucA },
                      { label:"Bueno",     value: ptSessions.filter(s=>s.progress==="bueno").length,     color:T.p,   bg:T.pA   },
                      { label:"Moderado",  value: ptSessions.filter(s=>s.progress==="moderado").length,  color:T.war, bg:T.warA },
                      { label:"Bajo",      value: ptSessions.filter(s=>s.progress==="bajo").length,      color:T.err, bg:T.errA },
                    ].map(stat => (
                      <div key={stat.label} style={{ padding:"12px 14px", background:stat.bg, borderRadius:12, textAlign:"center" }}>
                        <div style={{ fontFamily:T.fH, fontSize:28, color:stat.color, lineHeight:1 }}>{stat.value}</div>
                        <div style={{ fontFamily:T.fB, fontSize:11, color:T.tm, marginTop:3 }}>{stat.label}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Contactos inter-sesionales */}
            {detailTab === "contacts" && (
              <ContactsTab
                patientId={selected.id}
                interSessions={interSessions}
                setInterSessions={setInterSessions}
              />
            )}

            {/* Medicación */}
            {detailTab === "medications" && (
              <MedicationTab
                patientId={selected.id}
                medications={medications}
                setMedications={setMedications}
              />
            )}

            {/* Tareas */}
            {detailTab === "tasks" && (
              <PatientTasksTab
                patient={selected}
                sessions={sessions}
              />
            )}
          </Card>
        </div>

        {/* ── Protocolo de Alta Modal ────────────────────────────────────── */}
        <DischargeProtocolModal
          open={showAltaModal}
          onClose={() => setShowAltaModal(false)}
          patient={selected}
          ptSessions={sessions.filter(s => s.patientId === selected.id)}
          onConfirm={confirmAlta}
        />

        {/* ── WhatsApp despedida Modal ───────────────────────────────────── */}
        <WaAltaModal
          open={showWaModal}
          onClose={() => setShowWaModal(false)}
          patient={selected}
        />

        {/* ── Reingreso Modal ────────────────────────────────────────────── */}
        <ReingresoModal
          open={showReingresoModal}
          onClose={() => setShowReingresoModal(false)}
          patient={selected}
          onConfirm={confirmReingreso}
        />

        {/* ── Consent Renewal Modal ──────────────────────────────────────── */}
        <ConsentRenewalModal
          open={showConsentExpired}
          onClose={() => setShowConsentExpired(false)}
          patient={selected}
        />
      </div>
    );
  }

  // ── List ──────────────────────────────────────────────────────────────────
  return (
    <div>
      <PageHeader title="Pacientes"
        subtitle={`${patients.length} paciente${patients.length!==1?"s":""} · ${patients.filter(p=>(p.status||"activo")==="activo").length} activos`}
        action={<Btn onClick={() => setShowPC(true)}><Plus size={15}/> Nuevo paciente</Btn>}
      />

      <div style={{ display:"flex", gap:10, marginBottom:20, flexWrap:"wrap" }}>
        <div style={{ position:"relative", flex:1, minWidth:200 }}>
          <Search size={16} style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color:T.tl, pointerEvents:"none" }}/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o diagnóstico..."
            style={{ width:"100%", padding:"11px 14px 11px 42px", border:`1.5px solid ${T.bdr}`, borderRadius:12, fontFamily:T.fB, fontSize:14, color:T.t, background:T.card, outline:"none", boxSizing:"border-box" }}/>
        </div>
        <div style={{ display:"flex", gap:6 }}>
          {["todos","activo","pausa","alta"].map(s => {
            const isA = filterStatus === s;
            const cfg = STATUS_CONFIG[s];
            return (
              <button key={s} onClick={() => setFilterStatus(s)}
                style={{ padding:"8px 14px", borderRadius:9999, border:`1.5px solid ${isA?(cfg?.color||T.p):T.bdr}`, background:isA?(cfg?.bg||T.pA):"transparent", color:isA?(cfg?.color||T.p):T.tm, fontFamily:T.fB, fontSize:12, fontWeight:isA?700:400, cursor:"pointer", transition:"all .15s" }}>
                {s === "todos" ? "Todos" : cfg?.label}
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0
        ? <EmptyState icon={Users} title="Sin pacientes" desc="Agrega tu primer paciente con el botón de arriba"/>
        : <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px,1fr))", gap:14 }}>
          {filtered.map(p => {
            const sc = STATUS_CONFIG[p.status||"activo"];
            const cs = consentStatus(p);
            const csCfg = CONSENT_STATUS_CONFIG[cs];
            const hasPend = payments.some(py => py.patientId === p.id && py.status === "pendiente");
            const ptSess  = sessions.filter(s => s.patientId === p.id);
            const lastMood = ptSess.length > 0 ? ptSess.sort((a,b)=>b.date.localeCompare(a.date))[0].mood : null;
            const MI = lastMood ? moodIcon(lastMood) : null;
            const latestRisk  = riskAssessments.filter(r => r.patientId === p.id).sort((a,b)=>b.date.localeCompare(a.date))[0];
            const latestScale = scaleResults.filter(r => r.patientId === p.id).sort((a,b)=>b.date.localeCompare(a.date))[0];
            const scaleSev    = latestScale ? getSeverity(latestScale.scaleId, latestScale.score) : null;
            const scaleColor  = latestScale ? (SCALES[latestScale.scaleId]?.color || T.tm) : null;
            const activePlan  = treatmentPlans.find(tp => tp.patientId === p.id && tp.status === "activo");
            // Indicadores relevantes — solo riesgo alto y consentimiento pendiente
            // ETAPA 3: mostrar badge si hay riesgo alto/inminente en historial O alerta activa persistida
            const showRisk    = (latestRisk && (latestRisk.riskLevel === "alto" || latestRisk.riskLevel === "inminente")) || !!(p.activeRiskAlert);
            const isActiveAlert = !!(p.activeRiskAlert);
            const showConsent = cs === "pending" || cs === "expired";

            return (
              <Card key={p.id} onClick={() => handleSelect(p)}
                style={{ padding:"12px 16px", cursor:"pointer" }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = T.shM}
                onMouseLeave={e => e.currentTarget.style.boxShadow = T.sh}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  {/* Avatar compacto */}
                  <div style={{ width:40, height:40, borderRadius:"50%", background:T.pA,
                    display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <span style={{ fontFamily:T.fH, fontSize:17, color:T.p }}>{p.name[0]}</span>
                  </div>

                  {/* Info principal */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
                      <span style={{ fontFamily:T.fB, fontSize:14.5, fontWeight:600, color:T.t,
                        whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                        {p.name.split(" ").slice(0,2).join(" ")}
                      </span>
                      {/* Solo badges críticos */}
                      {showRisk && (
                        isActiveAlert
                          ? (
                            <span style={{
                              display:"inline-flex", alignItems:"center", gap:3,
                              padding:"1px 7px", borderRadius:9999, fontSize:9, fontWeight:700,
                              fontFamily:T.fB, color:"#B85050", background:"rgba(184,80,80,0.12)",
                              border:"1.5px solid rgba(184,80,80,0.35)",
                              animation:"pulseRiskBadge 2s ease-in-out infinite", flexShrink:0
                            }}>
                              <ShieldAlert size={9}/> RIESGO ACTIVO
                              <style>{`@keyframes pulseRiskBadge{0%,100%{opacity:1}50%{opacity:0.55}}`}</style>
                            </span>
                          )
                          : <RiskBadge level={latestRisk.riskLevel} size="small"/>
                      )}
                      {showConsent && (
                        <span style={{ padding:"1px 6px", borderRadius:9999, fontSize:9,
                          fontWeight:700, fontFamily:T.fB, color:csCfg.color,
                          background:csCfg.bg, whiteSpace:"nowrap", flexShrink:0 }}>
                          {cs === "pending" ? "Sin CI" : "CI vencido"}
                        </span>
                      )}
                    </div>
                    <div style={{ fontFamily:T.fB, fontSize:11.5, color:T.tm,
                      whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                      {p.age ? `${p.age} años · ` : ""}
                      {p.diagnosis ? p.diagnosis.split("—")[0].split("(")[0].trim() : "Sin diagnóstico"}
                    </div>
                  </div>

                  {/* Status + flecha */}
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end",
                    gap:4, flexShrink:0 }}>
                    <Badge color={sc.color} bg={sc.bg}>{sc.label}</Badge>
                    {hasPend && (
                      <span style={{ fontSize:10, fontWeight:600, color:T.war,
                        fontFamily:T.fB }}>💰 Pendiente</span>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      }

      <Modal open={showAdd} onClose={() => { setShowAdd(false); setEditTarget(null); setForm({ name:"", birthdate:"", phone:"", email:"", diagnosis:"", cie11Code:"", reason:"", notes:"", status:"activo", type:"individual", coParticipants:"", rate:"", serviceId:"", emergencyName:"", emergencyPhone:"", emergencyRelation:"" }); }} title={editTarget ? "Editar expediente" : "Expediente completo"}>
        {/* Tipo de expediente */}
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:11, fontWeight:700, color:T.tm, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:8 }}>Tipo de expediente</div>
          <div style={{ display:"flex", gap:8 }}>
            {Object.entries(TYPE_CONFIG).map(([k, v]) => (
              <button key={k} onClick={() => fld("type")(k)}
                style={{ flex:1, padding:"9px 4px", borderRadius:10, border:`1.5px solid ${form.type===k ? v.color : T.bdrL}`,
                  background: form.type===k ? v.bg : "transparent",
                  color: form.type===k ? v.color : T.tm,
                  fontFamily:T.fB, fontSize:12.5, fontWeight:form.type===k?700:400, cursor:"pointer", transition:"all .15s" }}>
                {v.label}
              </button>
            ))}
          </div>
        </div>
        <Input label="Nombre / Identificador *" value={form.name} onChange={fld("name")} placeholder={form.type==="pareja"?"Ej. García-López (pareja)":form.type==="grupo"?"Ej. Grupo ansiedad — Cohorte 1":"Ej. María González López"}/>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <div style={{ marginBottom:0 }}>
            <label style={{ display:"block", fontSize:11, fontWeight:600, color:T.tm, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>
              Fecha de nacimiento
              {form.birthdate && (
                <span style={{ marginLeft:8, fontWeight:700, color:T.p, textTransform:"none", letterSpacing:0, fontSize:12 }}>
                  · {calcAge(form.birthdate)} años
                </span>
              )}
            </label>
            <input type="date" value={form.birthdate} onChange={e => fld("birthdate")(e.target.value)}
              style={{ width:"100%", padding:"10px 14px", border:`1.5px solid ${T.bdr}`, borderRadius:10,
                fontFamily:T.fB, fontSize:14, color:T.t, background:T.card, outline:"none", boxSizing:"border-box" }}/>
          </div>
          <Input label="Teléfono" value={form.phone} onChange={fld("phone")} placeholder="998-123-4567"/>
        </div>
        <Input label="Correo electrónico" value={form.email} onChange={fld("email")} type="email"/>
        {(form.type === "pareja" || form.type === "grupo") && (
          <Textarea
            label={form.type === "pareja" ? "Nombre de los participantes (pareja)" : "Integrantes del grupo"}
            value={form.coParticipants} onChange={fld("coParticipants")} rows={2}
            placeholder={form.type === "pareja" ? "Ej. Carlos Méndez y Ana Ríos" : "Ej. Carlos M., Ana R., Luis P. (4 integrantes)"}
          />
        )}
        <CieDiagnosisField
          value={form.diagnosis}
          cie11Code={form.cie11Code}
          onChangeDx={fld("diagnosis")}
          onChangeCode={fld("cie11Code")}
          label="Diagnóstico"
        />
        <Textarea label="Motivo de consulta" value={form.reason} onChange={fld("reason")} rows={2}/>
        <Textarea label="Notas adicionales" value={form.notes} onChange={fld("notes")} rows={2}/>

        {/* ── Contacto de emergencia ───────────────────────────────── */}
        <div style={{ borderTop:`1px solid ${T.bdrL}`, paddingTop:16, marginTop:4 }}>
          <div style={{ fontSize:11, fontWeight:700, color:T.err, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:12, display:"flex", alignItems:"center", gap:6 }}>
            🚨 Contacto de emergencia <span style={{ fontWeight:400, color:T.tl, textTransform:"none", letterSpacing:0 }}>(opcional)</span>
          </div>
          <Input label="Nombre" value={form.emergencyName} onChange={fld("emergencyName")} placeholder="Ej. Ana García"/>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Input label="Teléfono" value={form.emergencyPhone} onChange={fld("emergencyPhone")} placeholder="998-123-4567"/>
            <Input label="Parentesco / relación" value={form.emergencyRelation} onChange={fld("emergencyRelation")} placeholder="Madre, pareja, amigo..."/>
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <Select label="Estado inicial" value={form.status} onChange={fld("status")}
            options={Object.entries(STATUS_CONFIG).map(([k,v]) => ({value:k, label:v.label}))}/>
          {services.length > 0 ? (
            <div>
              <label style={{ display:"block", fontFamily:T.fB, fontSize:11, fontWeight:700, color:T.tl, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>Servicio habitual</label>
              <select value={form.serviceId || ""} onChange={e => {
                  const svc = services.find(s => s.id === e.target.value);
                  setForm(f => ({ ...f, serviceId: e.target.value, rate: svc ? String(svc.price || "") : f.rate }));
                }}
                style={{ width:"100%", border:`1.5px solid ${T.bdr}`, borderRadius:10, padding:"10px 12px",
                  fontFamily:T.fB, fontSize:13, color:T.t, background:T.card, outline:"none" }}>
                <option value="">— Sin asignar —</option>
                {services.filter(s => s.type !== "paquete").map(s => {
                  const label = s.name || SERVICE_TYPE_LABEL[s.type] || s.type;
                  const price = s.modality === "ambas" ? `$${s.price}/$${s.priceVirtual}` : s.modality === "virtual" ? `$${s.priceVirtual}` : `$${s.price}`;
                  return <option key={s.id} value={s.id}>{label} · {price}</option>;
                })}
              </select>
            </div>
          ) : (
            <Input label="Tarifa por sesión (MXN)" value={form.rate} onChange={fld("rate")} type="number" placeholder="900"/>
          )}
        </div>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
          <Btn variant="ghost" onClick={() => { setShowAdd(false); setEditTarget(null); }}>Cancelar</Btn>
          <Btn onClick={save} disabled={!form.name.trim()}><Check size={15}/> {editTarget ? "Guardar cambios" : "Guardar paciente"}</Btn>
        </div>
      </Modal>

      {/* ── Primer Contacto modal ──────────────────────────────────────────── */}
      <PrimerContactoModal
        open={showPC}
        onClose={() => setShowPC(false)}
        patients={patients}
        onSave={savePrimerContacto}
      />
    </div>
  );
}
