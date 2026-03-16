import { useState, useMemo, useEffect } from "react";
import { Users, Search, Trash2, Phone, Mail, ChevronLeft, ChevronDown, ChevronUp, Tag, Check, Plus, DollarSign, TrendingUp, Download } from "lucide-react";
import { T } from "../theme.js";
import { uid, todayDate, fmt, fmtDate, fmtCur, moodIcon, moodColor, progressStyle } from "../utils.js";
import { Card, Badge, Modal, Input, Textarea, Select, Btn, EmptyState, PageHeader, Tabs } from "../components/ui/index.jsx";
import { useIsMobile } from "../hooks/useIsMobile.js";
import { RiskBadge } from "./RiskAssessment.jsx";
import { getSeverity, SCALES } from "./Scales.jsx";
import ConsentBlock, { consentStatus, CONSENT_STATUS_CONFIG } from "./Consent.jsx";
import { ContactsTab, MedicationTab, MedSummaryWidget, ContactFollowUpWidget } from "./InterSessions.jsx";
import { countPendingForToken, getLogsForToken, deleteLogsByToken, deleteLogById } from "./SelfLog.jsx";

// ── STATUS ────────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  activo: { label:"Activo",   color:T.suc, bg:T.sucA },
  pausa:  { label:"En pausa", color:T.war, bg:T.warA },
  alta:   { label:"Alta",     color:T.tl,  bg:T.bdrL },
};

// ── CIE-11 CODES (diagnósticos más frecuentes en psicología clínica privada) ──
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
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 180)}
            placeholder="Buscar en CIE-11 (ej: ansiedad, depresión, 6B00)..."
            style={{ width: "100%", padding: "9px 14px", border: `1.5px solid ${T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 13, color: T.t, background: T.card, outline: "none", boxSizing: "border-box" }}
          />
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
      <input
        value={value}
        onChange={e => onChangeDx(e.target.value)}
        placeholder="Diagnóstico libre o ajustar texto del CIE-11..."
        style={{ width: "100%", padding: "9px 14px", border: `1.5px solid ${T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 13.5, color: T.t, background: T.card, outline: "none", boxSizing: "border-box" }}
      />
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

// ── Main component ────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// SELFLOG TAB — Autorregistro del paciente (visor del terapeuta)
// ─────────────────────────────────────────────────────────────────────────────
function SelfLogTab({ patient, onUpdatePatient }) {
  const [pendingLogs, setPendingLogs] = useState([]);
  const [showLog,     setShowLog]     = useState(null);
  const [copied,      setCopied]      = useState(false);
  const [forceRefresh, setForceRefresh] = useState(0);

  // Generar token si no existe
  const token = patient.selfLogToken;

  const generateToken = () => {
    const newToken = Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 12);
    onUpdatePatient({ selfLogToken: newToken });
  };

  const selfLogURL = token
    ? `${window.location.origin}${window.location.pathname}?selflog=${token}`
    : null;

  const copyURL = () => {
    if (!selfLogURL) return;
    navigator.clipboard.writeText(selfLogURL).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Leer logs pendientes
  useEffect(() => {
    if (token) setPendingLogs(getLogsForToken(token));
  }, [token, forceRefresh]);

  const importAll = () => {
    deleteLogsByToken(token);
    setForceRefresh(n => n + 1);
    // Los logs ya están en pc_pending_logs como "importados" al ser eliminados de pending
    // En una app con sync, aquí se moverían al store cifrado
    // Por ahora: los eliminamos de pending (terapeuta ya los revisó)
  };

  const deleteLog = (id) => {
    deleteLogById(id);
    setForceRefresh(n => n + 1);
  };

  const MOOD_EMOJIS = ["😔","😟","😕","😐","🙂","😊","😄","😁","🥰","🤩"];

  return (
    <div>
      {/* Instrucción */}
      <div style={{ padding:"14px 16px", background:T.pA, borderRadius:12, border:`1px solid ${T.p}20`, marginBottom:18 }}>
        <div style={{ fontFamily:T.fB, fontSize:12, color:T.p, lineHeight:1.65 }}>
          <strong>¿Cómo funciona?</strong> El paciente accede a un enlace privado donde puede registrar su estado emocional y pensamientos ABC entre sesiones — sin necesidad de instalar nada ni crear cuenta. Los registros aparecen aquí para que los revises antes de la siguiente sesión.
        </div>
      </div>

      {/* Generar / mostrar enlace */}
      {!token ? (
        <div style={{ textAlign:"center", padding:"24px 0 16px" }}>
          <div style={{ fontFamily:T.fB, fontSize:13, color:T.tm, marginBottom:14 }}>
            Genera el enlace de autorregistro para este paciente
          </div>
          <Btn onClick={generateToken}>🔗 Generar enlace de autorregistro</Btn>
        </div>
      ) : (
        <div style={{ background:T.cardAlt, borderRadius:12, padding:"14px 16px", marginBottom:16,
          border:`1px solid ${T.bdrL}` }}>
          <div style={{ fontSize:11, fontWeight:700, color:T.tm, textTransform:"uppercase",
            letterSpacing:"0.07em", marginBottom:8 }}>Enlace del paciente</div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <div style={{ flex:1, padding:"8px 12px", background:T.card, borderRadius:9,
              border:`1px solid ${T.bdr}`, fontFamily:"monospace", fontSize:11, color:T.tm,
              overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {selfLogURL}
            </div>
            <button onClick={copyURL}
              style={{ padding:"8px 14px", background:copied ? T.sucA : T.pA,
                border:`1.5px solid ${copied ? T.suc : T.p}30`, borderRadius:9,
                fontFamily:T.fB, fontSize:12, fontWeight:600,
                color:copied ? T.suc : T.p, cursor:"pointer", flexShrink:0 }}>
              {copied ? "✓ Copiado" : "Copiar"}
            </button>
          </div>
          <div style={{ fontFamily:T.fB, fontSize:11, color:T.tl, marginTop:8, lineHeight:1.5 }}>
            Comparte este enlace por WhatsApp o correo. El paciente puede acceder sin instalar la app.
          </div>
        </div>
      )}

      {/* Registros pendientes */}
      {token && (
        <div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
            <div style={{ fontFamily:T.fB, fontSize:13, color:T.tm }}>
              {pendingLogs.length > 0 ? (
                <span style={{ padding:"3px 10px", borderRadius:9999, background:T.warA,
                  color:T.war, fontWeight:700, fontSize:12 }}>
                  🔔 {pendingLogs.length} registro{pendingLogs.length !== 1 ? "s" : ""} pendiente{pendingLogs.length !== 1 ? "s" : ""}
                </span>
              ) : (
                <span style={{ color:T.tl }}>Sin registros pendientes</span>
              )}
            </div>
            {pendingLogs.length > 0 && (
              <button onClick={importAll}
                style={{ padding:"6px 12px", background:T.sucA, border:`1px solid ${T.suc}30`,
                  borderRadius:9, fontFamily:T.fB, fontSize:12, fontWeight:600,
                  color:T.suc, cursor:"pointer" }}>
                ✓ Marcar todos como revisados
              </button>
            )}
          </div>

          {pendingLogs.map(log => (
            <div key={log.id} style={{ background:T.card, borderRadius:12, border:`1px solid ${T.bdrL}`,
              marginBottom:10, overflow:"hidden" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:"12px 14px", background:T.cardAlt, cursor:"pointer" }}
                onClick={() => setShowLog(showLog === log.id ? null : log.id)}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:22 }}>{log.mood ? MOOD_EMOJIS[log.mood - 1] : "📋"}</span>
                  <div>
                    <div style={{ fontFamily:T.fB, fontSize:13, fontWeight:600, color:T.t }}>
                      {fmtDate(log.date)}
                      {log.mood && <span style={{ marginLeft:8, fontFamily:T.fB, fontSize:12,
                        color:T.tm, fontWeight:400 }}>Estado: {log.mood}/10</span>}
                    </div>
                    <div style={{ fontFamily:T.fB, fontSize:11, color:T.tl }}>
                      {[
                        log.sleep    && `Sueño: ${log.sleep}/10`,
                        log.stress   && `Estrés: ${log.stress}/10`,
                        log.abcRecords?.length > 0 && `${log.abcRecords.length} registro${log.abcRecords.length !== 1 ? "s" : ""} ABC`,
                      ].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                </div>
                <div style={{ display:"flex", gap:6 }}>
                  {showLog === log.id ? <ChevronUp size={14} color={T.tm}/> : <ChevronDown size={14} color={T.tl}/>}
                  <button onClick={e => { e.stopPropagation(); deleteLog(log.id); }}
                    style={{ background:"none", border:"none", cursor:"pointer", color:T.tl, padding:"2px 4px" }}>
                    <Trash2 size={13}/>
                  </button>
                </div>
              </div>

              {showLog === log.id && (
                <div style={{ padding:"14px 16px" }}>
                  {/* Escalas */}
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(100px,1fr))",
                    gap:8, marginBottom:14 }}>
                    {[
                      { label:"Estado", value:log.mood,   color:T.p   },
                      { label:"Sueño",  value:log.sleep,  color:"#7B68A8" },
                      { label:"Estrés", value:log.stress, color:T.war },
                      { label:"Energía",value:log.energy, color:T.suc },
                    ].map(item => item.value && (
                      <div key={item.label} style={{ padding:"8px 10px", background:T.cardAlt,
                        borderRadius:9, textAlign:"center" }}>
                        <div style={{ fontFamily:T.fH, fontSize:20, color:item.color }}>{item.value}</div>
                        <div style={{ fontFamily:T.fB, fontSize:10, color:T.tm }}>{item.label}</div>
                      </div>
                    ))}
                  </div>

                  {log.activities && (
                    <div style={{ marginBottom:10 }}>
                      <div style={{ fontSize:10, fontWeight:700, color:T.tm, textTransform:"uppercase",
                        letterSpacing:"0.07em", marginBottom:4 }}>Actividades</div>
                      <div style={{ fontFamily:T.fB, fontSize:13, color:T.t, lineHeight:1.6 }}>{log.activities}</div>
                    </div>
                  )}

                  {log.notes && (
                    <div style={{ marginBottom:10 }}>
                      <div style={{ fontSize:10, fontWeight:700, color:T.tm, textTransform:"uppercase",
                        letterSpacing:"0.07em", marginBottom:4 }}>Notas para el terapeuta</div>
                      <div style={{ fontFamily:T.fB, fontSize:13, color:T.t, lineHeight:1.65,
                        padding:"8px 12px", background:T.pA, borderRadius:8 }}>{log.notes}</div>
                    </div>
                  )}

                  {log.abcRecords?.length > 0 && (
                    <div>
                      <div style={{ fontSize:10, fontWeight:700, color:T.tm, textTransform:"uppercase",
                        letterSpacing:"0.07em", marginBottom:8 }}>Registros ABC</div>
                      {log.abcRecords.map((abc, i) => (
                        <div key={abc.id || i} style={{ padding:"10px 12px", background:T.cardAlt,
                          borderRadius:10, marginBottom:8, border:`1px solid ${T.bdrL}` }}>
                          {[
                            { label:"A — Situación",              value:abc.situation,          color:"#5B8DB8" },
                            { label:"B — Pensamientos",            value:abc.thoughts,            color:T.war   },
                            { label:`C — Emociones (${abc.emotionIntensity}/10)`, value:abc.emotions, color:T.err },
                            { label:"D — Pensamiento alternativo", value:abc.alternativeThought, color:T.suc   },
                          ].filter(f => f.value).map(f => (
                            <div key={f.label} style={{ marginBottom:6 }}>
                              <div style={{ fontSize:10, fontWeight:700, color:f.color,
                                textTransform:"uppercase", letterSpacing:"0.05em" }}>{f.label}</div>
                              <div style={{ fontFamily:T.fB, fontSize:13, color:T.t, lineHeight:1.6 }}>{f.value}</div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Patients({ patients, setPatients, sessions, payments, setPayments, riskAssessments = [], scaleResults = [], treatmentPlans = [], resources = [], interSessions = [], setInterSessions, medications = [], setMedications, onQuickNav, profile }) {
  const [search,       setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [showAdd,      setShowAdd]      = useState(false);
  const [selected,     setSelected]     = useState(null);
  const [detailTab,    setDetailTab]    = useState("sessions");
  const [showAddDx,    setShowAddDx]    = useState(false);
  const [newDx,        setNewDx]        = useState({ diagnosis:"", cie11Code:"", date:fmt(todayDate), notes:"" });
  const [form, setForm] = useState({ name:"", age:"", phone:"", email:"", diagnosis:"", cie11Code:"", reason:"", notes:"", status:"activo", rate:"", emergencyName:"", emergencyPhone:"", emergencyRelation:"" });
  const fld = k => v => setForm(f => ({ ...f, [k]: v }));
  const isMobile = useIsMobile();

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

  const handleSelect = (p) => { setSelected(patients.find(pt => pt.id === p.id) || p); setDetailTab("sessions"); };
  if (onQuickNav) onQuickNav.current = handleSelect;

  const filtered = useMemo(() =>
    patients
      .filter(p => filterStatus === "todos" || (p.status||"activo") === filterStatus)
      .filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.diagnosis||"").toLowerCase().includes(search.toLowerCase())
      ), [patients, search, filterStatus]);

  const save = () => {
    if (!form.name.trim()) return;
    setPatients(prev => [...prev, { ...form, id:"p"+uid(), createdAt:fmt(todayDate) }]);
    setForm({ name:"", age:"", phone:"", email:"", diagnosis:"", cie11Code:"", reason:"", notes:"", status:"activo", rate:"", emergencyName:"", emergencyPhone:"", emergencyRelation:"" });
    setShowAdd(false);
  };

  const del = id => { setPatients(prev => prev.filter(p => p.id !== id)); if (selected?.id === id) setSelected(null); };
  const setStatus = (id, status) => {
    setPatients(prev => prev.map(p => p.id === id ? { ...p, status } : p));
    setSelected(prev => prev ? { ...prev, status } : prev);
  };
  const setRate = (id, rate) => {
    setPatients(prev => prev.map(p => p.id === id ? { ...p, rate } : p));
    setSelected(prev => prev ? { ...prev, rate } : prev);
  };
  const togglePayment = id => setPayments(prev => prev.map(p => p.id === id ? { ...p, status: p.status === "pagado" ? "pendiente" : "pagado" } : p));

  // ── Detail ────────────────────────────────────────────────────────────────
  if (selected) {
    const ptSessions = sessions.filter(s => s.patientId === selected.id).sort((a,b) => b.date.localeCompare(a.date));
    const ptPayments = payments.filter(p => p.patientId === selected.id).sort((a,b) => b.date.localeCompare(a.date));
    const totalPaid  = ptPayments.filter(p => p.status==="pagado").reduce((s,p) => s+Number(p.amount), 0);
    const totalPend  = ptPayments.filter(p => p.status==="pendiente").reduce((s,p) => s+Number(p.amount), 0);
    const sc = STATUS_CONFIG[selected.status || "activo"];

    return (
      <div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:10 }}>
          <button onClick={() => setSelected(null)} style={{ display:"flex", alignItems:"center", gap:6, background:"none", border:"none", color:T.p, fontFamily:T.fB, fontSize:13, cursor:"pointer", padding:0 }}>
            <ChevronLeft size={16}/> Volver a pacientes
          </button>
          <button onClick={() => exportExpediente(selected, sessions, payments, profile)}
            style={{ display:"flex", alignItems:"center", gap:6, background:T.pA, border:"none", borderRadius:9999, padding:"8px 16px", fontFamily:T.fB, fontSize:13, fontWeight:600, color:T.p, cursor:"pointer", transition:"all .15s" }}
            onMouseEnter={e => { e.currentTarget.style.background = T.p; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={e => { e.currentTarget.style.background = T.pA; e.currentTarget.style.color = T.p; }}>
            <Download size={14}/> Exportar expediente PDF
          </button>
        </div>

        <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0,290px) 1fr", gap:20, alignItems:"start" }}>
          {/* Profile card */}
          <Card style={{ padding:24 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
              <div style={{ width:60, height:60, borderRadius:"50%", background:T.pA, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <span style={{ fontFamily:T.fH, fontSize:24, color:T.p }}>{selected.name[0]}</span>
              </div>
              <select value={selected.status || "activo"} onChange={e => setStatus(selected.id, e.target.value)}
                style={{ appearance:"none", padding:"4px 12px", borderRadius:9999, fontFamily:T.fB, fontSize:11, fontWeight:700, letterSpacing:"0.05em", border:"none", cursor:"pointer", background:sc.bg, color:sc.color }}>
                {Object.entries(STATUS_CONFIG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>

            <h2 style={{ fontFamily:T.fH, fontSize:21, fontWeight:500, color:T.t, margin:"0 0 3px" }}>{selected.name}</h2>
            <p style={{ fontFamily:T.fB, fontSize:13, color:T.tm, margin:"0 0 16px" }}>
              {selected.age ? `${selected.age} años · ` : ""}Desde {fmtDate(selected.createdAt)}
            </p>

            <div style={{ borderTop:`1px solid ${T.bdrL}`, paddingTop:14, marginBottom:14 }}>
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

            {/* Tarifa individual */}
            <div style={{ padding:"12px 14px", background:T.accA, borderRadius:10, marginBottom:12 }}>
              <div style={{ fontSize:10, fontWeight:700, color:T.acc, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>Tarifa por sesión</div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontFamily:T.fB, fontSize:13, color:T.tm }}>$</span>
                <input
                  type="number"
                  value={selected.rate || ""}
                  onChange={e => setRate(selected.id, e.target.value)}
                  placeholder="Tarifa preferencial…"
                  style={{ flex:1, border:`1.5px solid ${T.bdr}`, borderRadius:8, padding:"6px 10px", fontFamily:T.fB, fontSize:13, color:T.t, background:T.card, outline:"none" }}
                />
              </div>
              {selected.rate && <div style={{ fontFamily:T.fB, fontSize:11, color:T.acc, marginTop:4 }}>Tarifa personalizada activa</div>}
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
          </Card>

          {/* Tabs: Sesiones | Pagos | Progreso | Recursos | Contactos | Medicación */}
          <Card style={{ padding:24 }}>
            <Tabs
              tabs={[
                { id:"sessions",    label:`Sesiones (${ptSessions.length})`  },
                { id:"payments",    label:`Pagos (${ptPayments.length})`     },
                { id:"progress",    label:"Progreso"                         },
                { id:"resources",   label:`Recursos (${(resources||[]).filter(r=>(r.assignments||[]).some(a=>a.patientId===selected.id)).length})` },
                { id:"contacts",    label:`Contactos (${(interSessions||[]).filter(c=>c.patientId===selected.id).length})` },
                { id:"medications", label:`Medicación (${(medications||[]).filter(m=>m.patientId===selected.id&&m.status==="activo").length})` },
                { id:"selflog",     label:`Autorregistro${selected.selfLogToken ? ` (${countPendingForToken(selected.selfLogToken)})` : ""}` },
              ]}
              active={detailTab} onChange={setDetailTab}
            />

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
                      <p style={{ fontFamily:T.fB, fontSize:13, color:T.tm, margin:"0 0 8px", lineHeight:1.65 }}>{s.notes}</p>
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
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(110px,1fr))", gap:10, marginBottom:20, padding:"14px 16px", background:T.bg, borderRadius:12 }}>
                    <div style={{ textAlign:"center" }}><div style={{ fontFamily:T.fH, fontSize:22, color:T.suc }}>{fmtCur(totalPaid)}</div><div style={{ fontFamily:T.fB, fontSize:11, color:T.tm }}>Total pagado</div></div>
                    <div style={{ textAlign:"center" }}><div style={{ fontFamily:T.fH, fontSize:22, color:T.war }}>{fmtCur(totalPend)}</div><div style={{ fontFamily:T.fB, fontSize:11, color:T.tm }}>Pendiente</div></div>
                    <div style={{ textAlign:"center" }}><div style={{ fontFamily:T.fH, fontSize:22, color:T.p }}>{ptPayments.length}</div><div style={{ fontFamily:T.fB, fontSize:11, color:T.tm }}>Registros</div></div>
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
                {ptSessions.length < 2
                  ? <div style={{ fontFamily:T.fB, fontSize:13, color:T.tl, padding:"24px 0", textAlign:"center" }}>Se necesitan al menos 2 sesiones para mostrar la gráfica de evolución</div>
                  : <ProgressSparkline sessions={ptSessions}/>
                }

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

            {/* Recursos asignados */}
            {detailTab === "resources" && (() => {
              const RTYPE = { Ejercicio:{c:T.p,bg:T.pA}, Técnica:{c:T.acc,bg:T.accA}, Lectura:{c:"#6B5B9E",bg:"rgba(107,91,158,0.10)"}, Evaluación:{c:T.suc,bg:T.sucA}, Psicoeducación:{c:"#5B8DB8",bg:"rgba(91,141,184,0.10)"}, Video:{c:T.err,bg:T.errA}, Otro:{c:T.tm,bg:T.bdrL} };
              const ptResources = (resources||[]).filter(r => (r.assignments||[]).some(a => a.patientId === selected.id));
              if (ptResources.length === 0) return <div style={{ fontFamily:T.fB, fontSize:13, color:T.tl, padding:"24px 0", textAlign:"center" }}>Sin recursos asignados. Asígnalos desde el módulo Recursos.</div>;
              return ptResources.map(r => {
                const tc = RTYPE[r.type] || RTYPE.Otro;
                const asgn = (r.assignments||[]).find(a => a.patientId === selected.id);
                return (
                  <div key={r.id} style={{ padding:"12px 14px", borderRadius:12, background:T.cardAlt, marginBottom:8, border:`1px solid ${T.bdrL}` }}>
                    <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:10 }}>
                      <div>
                        <span style={{ padding:"2px 8px", borderRadius:9999, background:tc.bg, color:tc.c, fontSize:10, fontWeight:700, fontFamily:T.fB, marginRight:8 }}>{r.type}</span>
                        <span style={{ fontFamily:T.fB, fontSize:13.5, fontWeight:500, color:T.t }}>{r.title}</span>
                        {r.description && <p style={{ fontFamily:T.fB, fontSize:12, color:T.tm, margin:"6px 0 0", lineHeight:1.5 }}>{r.description}</p>}
                      </div>
                      <span style={{ fontFamily:T.fB, fontSize:11, color:T.tl, flexShrink:0 }}>{fmtDate(asgn?.date)}</span>
                    </div>
                    {r.url && <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ fontFamily:T.fB, fontSize:12, color:T.p, textDecoration:"none", display:"block", marginTop:6 }}>Abrir enlace →</a>}
                  </div>
                );
              });
            })()}

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

            {/* Autorregistro */}
            {detailTab === "selflog" && (
              <SelfLogTab
                patient={selected}
                onUpdatePatient={(updates) => {
                  setPatients(prev => prev.map(p => p.id === selected.id ? { ...p, ...updates } : p));
                  setSelected(prev => prev ? { ...prev, ...updates } : prev);
                }}
              />
            )}
          </Card>
        </div>
      </div>
    );
  }

  // ── List ──────────────────────────────────────────────────────────────────
  return (
    <div>
      <PageHeader title="Pacientes"
        subtitle={`${patients.length} paciente${patients.length!==1?"s":""} · ${patients.filter(p=>(p.status||"activo")==="activo").length} activos`}
        action={<Btn onClick={() => setShowAdd(true)}><Plus size={15}/> Nuevo paciente</Btn>}
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
            return (
              <Card key={p.id} onClick={() => handleSelect(p)} style={{ padding:20, cursor:"pointer" }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = T.shM}
                onMouseLeave={e => e.currentTarget.style.boxShadow = T.sh}>
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:12 }}>
                  <div style={{ width:46, height:46, borderRadius:"50%", background:T.pA, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <span style={{ fontFamily:T.fH, fontSize:20, color:T.p }}>{p.name[0]}</span>
                  </div>
                  <div style={{ display:"flex", gap:5, alignItems:"center", flexWrap:"wrap", justifyContent:"flex-end" }}>
                    {hasPend && <Badge color={T.war} bg={T.warA}>💰</Badge>}
                    {(cs === "pending" || cs === "expired") && (
                      <span title={csCfg.label} style={{ display:"inline-flex", alignItems:"center", gap:3, padding:"2px 7px", borderRadius:9999, fontSize:10, fontWeight:700, fontFamily:T.fB, color:csCfg.color, background:csCfg.bg, whiteSpace:"nowrap" }}>
                        {cs === "pending" ? "📋 Sin firmar" : "🔴 CI vencido"}
                      </span>
                    )}
                    {MI && <MI size={14} color={moodColor(lastMood)}/>}
                    {latestRisk && <RiskBadge level={latestRisk.riskLevel} size="small"/>}
                    {latestScale && scaleSev && (
                      <span style={{ display:"inline-flex", alignItems:"center", gap:3, padding:"2px 7px", borderRadius:9999, fontSize:10, fontWeight:700, fontFamily:T.fB, color:scaleColor, background:`rgba(${scaleColor === T.war ? "184,144,10" : "58,107,110"},0.10)`, whiteSpace:"nowrap" }}>
                        {SCALES[latestScale.scaleId]?.name} {latestScale.score}
                      </span>
                    )}
                    {activePlan && (() => {
                      const obj = activePlan.objectives || [];
                      const pct = obj.length > 0 ? Math.round((obj.filter(o=>o.status==="logrado").length/obj.length)*100) : null;
                      return (
                        <span style={{ display:"inline-flex", alignItems:"center", gap:3, padding:"2px 7px", borderRadius:9999, fontSize:10, fontWeight:700, fontFamily:T.fB, color:T.p, background:T.pA, whiteSpace:"nowrap" }}>
                          🎯{pct !== null ? ` ${pct}%` : " Plan"}
                        </span>
                      );
                    })()}
                    <Badge color={sc.color} bg={sc.bg}>{sc.label}</Badge>
                    <button onClick={e => { e.stopPropagation(); del(p.id); }} style={{ background:"none", border:"none", color:T.tl, cursor:"pointer", padding:4 }}><Trash2 size={14}/></button>
                  </div>
                </div>
                <div style={{ fontFamily:T.fH, fontSize:18, fontWeight:500, color:T.t, marginBottom:2 }}>{p.name.split(" ").slice(0,2).join(" ")}</div>
                <div style={{ fontFamily:T.fB, fontSize:12, color:T.tm, marginBottom:10 }}>{p.age?`${p.age} años · `:""}Desde {fmtDate(p.createdAt)}</div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  {p.diagnosis && <Badge>{p.diagnosis.split("—")[0].trim()}</Badge>}
                  {p.rate && <span style={{ fontFamily:T.fB, fontSize:11, color:T.acc, fontWeight:600 }}>${Number(p.rate).toLocaleString("es-MX")}/ses</span>}
                </div>
              </Card>
            );
          })}
        </div>
      }

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nuevo paciente">
        <Input label="Nombre completo *" value={form.name} onChange={fld("name")} placeholder="Ej. María González López"/>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <Input label="Edad" value={form.age} onChange={fld("age")} type="number"/>
          <Input label="Teléfono" value={form.phone} onChange={fld("phone")} placeholder="998-123-4567"/>
        </div>
        <Input label="Correo electrónico" value={form.email} onChange={fld("email")} type="email"/>
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
          <Input label="Tarifa por sesión (MXN)" value={form.rate} onChange={fld("rate")} type="number" placeholder="900"/>
        </div>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
          <Btn variant="ghost" onClick={() => setShowAdd(false)}>Cancelar</Btn>
          <Btn onClick={save} disabled={!form.name.trim()}><Check size={15}/> Guardar paciente</Btn>
        </div>
      </Modal>
    </div>
  );
}
