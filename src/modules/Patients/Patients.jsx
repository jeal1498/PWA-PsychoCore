import { useState, useMemo, useEffect } from "react";
import {
  Users, Search, Trash2, Phone, Mail, ChevronLeft, ChevronDown, ChevronUp,
  Tag, Check, Plus, DollarSign, TrendingUp, Download, Eye, ShieldAlert,
  X, LogOut, MessageCircle, ClipboardList,
} from "lucide-react";
import { T } from "../../theme.js";
import { uid, todayDate, fmt, fmtDate, fmtCur, moodIcon, moodColor, progressStyle } from "../../utils.js";
import { Card, Badge, Modal, Input, Textarea, Select, Btn, EmptyState, PageHeader, Tabs } from "../../components/ui/index.jsx";
import { useIsMobile } from "../../hooks/useIsMobile.js";
import { RiskBadge } from "../RiskAssessment/RiskAssessment.jsx";
import { getSeverity, SCALES } from "../Scales/Scales.jsx";
import ConsentBlock, { consentStatus, CONSENT_STATUS_CONFIG } from "../Consent.jsx";
import { ContactsTab, MedicationTab, MedSummaryWidget, ContactFollowUpWidget } from "../InterSessions.jsx";
import { createPortalAccessLink, getAssignmentsByPatient, getResponsesByAssignment } from "../../lib/supabase.js";
import { TASK_TEMPLATES } from "../../lib/taskTemplates.js";

import { usePatients } from "./usePatients.js";
import {
  WA, WA_A, LAVANDA, LAVANDA_A,
  PHONE_COUNTRIES, PC_TIME_SLOTS,
  STATUS_CONFIG, TYPE_CONFIG, SERVICE_TYPE_LABEL,
  MOTIVO_ALTA_OPTIONS, ANAMNESIS_BLANK, BLANK_ALTA,
  CIE11_CODES,
  calcAge,
  exportExpediente,
  MOOD_VAL, MOOD_LBL, MOOD_CLR, PROG_VAL,
  buildSvgPath,
} from "./patients.utils.js";

// ── PhoneInput ────────────────────────────────────────────────────────────────
function PhoneInput({ countryCode, phone, onChangeCountry, onChangePhone, error }) {
  const [focused, setFocused] = useState(false);
  const countryIdx = PHONE_COUNTRIES.findIndex(c => c.code === countryCode);
  const idx        = countryIdx >= 0 ? countryIdx : 0;
  const country    = PHONE_COUNTRIES[idx];

  const border = error
    ? `1.5px solid ${T.err}`
    : focused
      ? `1.5px solid ${T.p}`
      : `1.5px solid ${T.bdr}`;

  return (
    <div style={{ display:"flex", gap:8 }}>
      <div style={{ position:"relative", flexShrink:0, width:"28%" }}>
        <select
          value={idx}
          onChange={e => {
            onChangeCountry(PHONE_COUNTRIES[Number(e.target.value)].code);
            onChangePhone("");
          }}
          style={{
            appearance:"none", WebkitAppearance:"none",
            width:"100%", height:"100%", padding:"10px 26px 10px 10px",
            border:`1.5px solid ${focused ? T.p : T.bdr}`,
            borderRadius:10, background:T.card,
            fontFamily:T.fB, fontSize:13, color:T.t,
            cursor:"pointer", outline:"none",
            transition:"border .15s", boxSizing:"border-box",
          }}
        >
          {PHONE_COUNTRIES.map((c, i) => (
            <option key={c.code} value={i}>{c.flag} {c.code}</option>
          ))}
        </select>
        <div style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }}>
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
            <path d="M1 1l4 4 4-4" stroke={T.tm} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
      <div style={{ position:"relative", flex:1, minWidth:0 }}>
        <input
          type="tel"
          inputMode="numeric"
          value={phone}
          onChange={e => {
            const cleaned = e.target.value.replace(/\D/g, "").slice(0, country.len);
            onChangePhone(cleaned);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={"0".repeat(country.len)}
          style={{
            width:"100%", padding:"10px 14px",
            border, borderRadius:10,
            fontFamily:T.fB, fontSize:15, color:T.t,
            background:T.card, outline:"none",
            boxSizing:"border-box", transition:"border .15s",
          }}
        />
      </div>
    </div>
  );
}

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
      <label style={{ display:"block", fontSize:11, fontWeight:600, color:T.tm, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>{label}</label>

      {showSearch && (
        <div style={{ position:"relative", marginBottom:8 }}>
          <div style={{ position:"relative" }}>
            <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", fontSize:14, pointerEvents:"none" }}>🔍</span>
            <input
              value={query}
              onChange={e => { setQuery(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 180)}
              placeholder="Buscar código CIE-11 (ej: ansiedad, depresión, 6B00)..."
              style={{ width:"100%", padding:"9px 14px 9px 34px", border:`1.5px solid ${T.bdr}`, borderRadius:10, fontFamily:T.fB, fontSize:13, color:T.t, background:T.card, outline:"none", boxSizing:"border-box" }}
            />
          </div>
          {open && filtered.length > 0 && (
            <div style={{ position:"absolute", top:"100%", left:0, right:0, zIndex:50, background:T.card, border:`1.5px solid ${T.bdr}`, borderRadius:10, boxShadow:T.shM, marginTop:4, overflow:"hidden" }}>
              {filtered.map(item => (
                <button key={item.code} onMouseDown={() => select(item)}
                  style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"10px 14px", background:"none", border:"none", cursor:"pointer", textAlign:"left", borderBottom:`1px solid ${T.bdrL}`, fontFamily:T.fB }}
                  onMouseEnter={e => e.currentTarget.style.background = T.pA}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}>
                  <span style={{ padding:"2px 8px", borderRadius:6, background:T.pA, color:T.p, fontSize:10, fontWeight:700, flexShrink:0, fontFamily:"monospace" }}>{item.code}</span>
                  <span style={{ fontSize:13, color:T.t }}>{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {cie11Code && (
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
          <span style={{ padding:"3px 10px", borderRadius:6, background:T.pA, color:T.p, fontSize:11, fontWeight:700, fontFamily:"monospace" }}>{cie11Code}</span>
          {currentCode && <span style={{ fontSize:12, color:T.tm }}>{currentCode.label}</span>}
          <button onClick={() => { onChangeCode(""); onChangeDx(""); }} style={{ background:"none", border:"none", cursor:"pointer", color:T.tl, fontSize:16, lineHeight:1, padding:"0 4px" }}>×</button>
        </div>
      )}

      <div>
        <div style={{ fontSize:10, fontWeight:600, color:T.tl, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:4 }}>
          Texto del diagnóstico {!cie11Code && <span style={{ fontWeight:400, textTransform:"none", letterSpacing:0 }}>— o escribe directamente si no está en CIE-11</span>}
        </div>
        <input
          value={value}
          onChange={e => onChangeDx(e.target.value)}
          placeholder={cie11Code ? "Ajusta el texto si lo necesitas..." : "Ej. Trastorno de ansiedad generalizada"}
          style={{ width:"100%", padding:"9px 14px", border:`1.5px solid ${cie11Code ? T.p+"40" : T.bdr}`, borderRadius:10, fontFamily:T.fB, fontSize:13.5, color:T.t, background:T.card, outline:"none", boxSizing:"border-box" }}
        />
      </div>
    </div>
  );
}

// ── MoodTimeline ──────────────────────────────────────────────────────────────
function MoodTimeline({ sessions }) {
  const sorted = [...sessions]
    .filter(s => s.mood && s.date)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-20);

  if (sorted.length < 2) return (
    <div style={{ fontFamily:T.fB, fontSize:13, color:T.tl, padding:"20px 0", textAlign:"center" }}>
      Se necesitan al menos 2 sesiones para mostrar la línea de estado de ánimo
    </div>
  );

  const W = 480, H = 110, PAD = 28;
  const xs = sorted.map((_, i) => PAD + (i / (sorted.length - 1)) * (W - PAD * 2));
  const ys = sorted.map(s => {
    const v = MOOD_VAL[s.mood] ?? 1;
    return H - PAD - ((v / 2) * (H - PAD * 2));
  });

  const d    = buildSvgPath(xs, ys);
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
          {[0,1,2].map(v => {
            const y = H - PAD - ((v/2) * (H - PAD*2));
            return (
              <g key={v}>
                <line x1={PAD} y1={y} x2={W-PAD} y2={y} stroke="var(--border-l)" strokeWidth={1}/>
                <text x={PAD-6} y={y+4} textAnchor="end" style={{ fontFamily:"DM Sans, sans-serif", fontSize:9, fill:"var(--text-light)" }}>{MOOD_LBL[v]}</text>
              </g>
            );
          })}
          <path d={area} fill="url(#moodGrad)"/>
          <path d={d} fill="none" stroke="var(--primary)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>
          {sorted.map((s, i) => (
            <g key={i}>
              <circle cx={xs[i]} cy={ys[i]} r={5} fill={MOOD_CLR[MOOD_VAL[s.mood] ?? 1]} stroke="var(--card)" strokeWidth={2}/>
              <text x={xs[i]} y={H-4} textAnchor="middle" style={{ fontFamily:"DM Sans, sans-serif", fontSize:8.5, fill:"var(--text-light)" }}>
                {s.date.slice(5).replace("-","/")}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <div style={{ display:"flex", gap:16, marginTop:8, flexWrap:"wrap" }}>
        {Object.entries(MOOD_CLR).reverse().map(([v, c]) => (
          <div key={v} style={{ display:"flex", alignItems:"center", gap:5 }}>
            <div style={{ width:9, height:9, borderRadius:"50%", background:c }}/>
            <span style={{ fontFamily:T.fB, fontSize:11, color:T.tm }}>{MOOD_LBL[Number(v)]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── ProgressSparkline ─────────────────────────────────────────────────────────
function ProgressSparkline({ sessions }) {
  if (sessions.length < 2) return null;
  const data   = sessions.slice().sort((a,b) => a.date.localeCompare(b.date)).slice(-12);
  const points = data.map((s,i) => ({ x:i, mood: MOOD_VAL[s.mood]||2, prog: PROG_VAL[s.progress]||2, date:fmtDate(s.date) }));
  const W = 280, H = 70, PAD = 10;
  const xScale = i => PAD + (i / Math.max(points.length-1,1)) * (W - PAD*2);
  const yScale = v => H - PAD - ((v-1)/3) * (H - PAD*2);
  const moodPath = buildSvgPath(points.map((_,i)=>xScale(i)), points.map(p=>yScale(p.mood)));
  const progPath = buildSvgPath(points.map((_,i)=>xScale(i)), points.map(p=>yScale(p.prog)));

  return (
    <div style={{ marginTop:16 }}>
      <div style={{ fontSize:11, fontWeight:700, color:T.tm, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:8, fontFamily:T.fB }}>Evolución (últimas {data.length} sesiones)</div>
      <div style={{ background:T.cardAlt, borderRadius:10, padding:"12px 16px" }}>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display:"block" }}>
          {[1,2,3,4].map(v => (
            <line key={v} x1={PAD} x2={W-PAD} y1={yScale(v)} y2={yScale(v)} stroke={T.bdr} strokeWidth="1" strokeDasharray="3,3"/>
          ))}
          <path d={moodPath} fill="none" stroke={T.acc} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d={progPath} fill="none" stroke={T.p}   strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          {points.map((pt, i) => (
            <g key={i}>
              <circle cx={xScale(i)} cy={yScale(pt.mood)} r={3} fill={T.acc}/>
              <circle cx={xScale(i)} cy={yScale(pt.prog)} r={3} fill={T.p}/>
            </g>
          ))}
        </svg>
        <div style={{ display:"flex", gap:16, marginTop:8 }}>
          <div style={{ display:"flex", alignItems:"center", gap:5 }}>
            <div style={{ width:20, height:2.5, background:T.acc, borderRadius:2 }}/>
            <span style={{ fontFamily:T.fB, fontSize:11, color:T.tm }}>Estado ánimo</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:5 }}>
            <div style={{ width:20, height:2.5, background:T.p, borderRadius:2 }}/>
            <span style={{ fontFamily:T.fB, fontSize:11, color:T.tm }}>Progreso</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── PatientTasksTab ───────────────────────────────────────────────────────────
function PatientTasksTab({ patient, sessions }) {
  const [tasks,        setTasks]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [loadErr,      setLoadErr]      = useState(false);
  const [viewResponse, setViewResponse] = useState(null);
  const [responses,    setResponses]    = useState([]);
  const [loadingResp,  setLoadingResp]  = useState(false);

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
        const label = session ? `Sesión del ${fmtDate(session.date)}` : "Sin sesión asociada";
        return (
          <div key={sessionId} style={{ marginBottom:20 }}>
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
                      {done ? `✅ Completada ${fmtDate(t.completed_at?.split("T")[0])}` : `⏳ Pendiente · Asignada ${fmtDate(t.assigned_at?.split("T")[0])}`}
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
                          ? <span style={{ fontWeight:700, fontSize:20, color:Number(val)<=3?T.suc:Number(val)<=6?"#B8900A":T.err }}>{val}/10</span>
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
function AnamnesisSection({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom:12, border:`1.5px solid ${T.bdrL}`, borderRadius:14, overflow:"hidden" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
          width:"100%", padding:"13px 16px", background:open ? T.pA : T.cardAlt,
          border:"none", cursor:"pointer", textAlign:"left", transition:"background .12s" }}>
        <span style={{ fontFamily:T.fB, fontSize:12.5, fontWeight:700,
          color: open ? T.p : T.t, textTransform:"uppercase", letterSpacing:"0.06em" }}>
          {title}
        </span>
        {open ? <ChevronUp size={14} color={T.p}/> : <ChevronDown size={14} color={T.tl}/>}
      </button>
      {open && (
        <div style={{ padding:"16px", background:T.card }}>
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

      <AnamnesisSection title="1 · Primera impresión">
        <AField label="Fecha de primera consulta">
          <input type="date" value={form.fechaPrimeraConsulta} onChange={fld("fechaPrimeraConsulta")} style={aInput}/>
        </AField>
        <AField label="Motivo de consulta ampliado">
          <textarea rows={4} value={form.motivoConsulta} onChange={fld("motivoConsulta")} placeholder="Descripción detallada del motivo de consulta según el paciente..." style={aTextarea(4)}/>
        </AField>
        <AField label="Observaciones clínicas iniciales">
          <textarea rows={3} value={form.observacionesIniciales} onChange={fld("observacionesIniciales")} placeholder="Apariencia, actitud, nivel de comunicación, estado afectivo observable..." style={aTextarea(3)}/>
        </AField>
      </AnamnesisSection>

      <AnamnesisSection title="2 · Antecedentes personales" defaultOpen={false}>
        <AField label="Antecedentes médicos relevantes">
          <textarea rows={3} value={form.antMedicos} onChange={fld("antMedicos")} placeholder="Enfermedades crónicas, cirugías, hospitalizaciones, alergias..." style={aTextarea(3)}/>
        </AField>
        <AField label="Antecedentes psiquiátricos / tratamientos previos">
          <textarea rows={3} value={form.antPsiquiatricos} onChange={fld("antPsiquiatricos")} placeholder="Diagnósticos previos, psicoterapias anteriores, internamientos..." style={aTextarea(3)}/>
        </AField>
        <AField label="Medicación actual">
          <textarea rows={2} value={form.medicacionActual} onChange={fld("medicacionActual")} placeholder="Nombre, dosis y prescriptor..." style={aTextarea(2)}/>
        </AField>
        <AField label="Consumo de sustancias">
          <select value={form.sustancias} onChange={fld("sustancias")} style={{ ...aInput, marginBottom: form.sustancias === "otros" ? 8 : 0 }}>
            <option value="ninguno">Ninguno</option>
            <option value="alcohol">Alcohol</option>
            <option value="tabaco">Tabaco</option>
            <option value="cannabis">Cannabis</option>
            <option value="otros">Otros</option>
          </select>
          {form.sustancias === "otros" && (
            <input value={form.sustanciasOtro} onChange={fld("sustanciasOtro")} placeholder="Especifica la sustancia y frecuencia..." style={{ ...aInput, marginTop:6 }}/>
          )}
        </AField>
      </AnamnesisSection>

      <AnamnesisSection title="3 · Antecedentes familiares" defaultOpen={false}>
        <AField label="Historia familiar relevante">
          <textarea rows={3} value={form.historiaFamiliar} onChange={fld("historiaFamiliar")} placeholder="Dinámica familiar, eventos significativos, estructura familiar..." style={aTextarea(3)}/>
        </AField>
        <AField label="Enfermedades mentales en familia">
          <textarea rows={2} value={form.enfermedadesFamiliares} onChange={fld("enfermedadesFamiliares")} placeholder="Diagnósticos conocidos en familiares de primer y segundo grado..." style={aTextarea(2)}/>
        </AField>
      </AnamnesisSection>

      <AnamnesisSection title="4 · Contexto actual" defaultOpen={false}>
        <AField label="Situación laboral / escolar">
          <input value={form.situacionLaboral} onChange={fld("situacionLaboral")} placeholder="Ocupación, nivel de estudios, situación actual..." style={aInput}/>
        </AField>
        <AField label="Situación familiar / relaciones">
          <textarea rows={3} value={form.situacionFamiliar} onChange={fld("situacionFamiliar")} placeholder="Estado civil, hijos, relación con familia de origen, pareja..." style={aTextarea(3)}/>
        </AField>
        <AField label="Red de apoyo">
          <textarea rows={2} value={form.redApoyo} onChange={fld("redApoyo")} placeholder="Personas de confianza, grupos de apoyo, recursos disponibles..." style={aTextarea(2)}/>
        </AField>
      </AnamnesisSection>

      <AnamnesisSection title="5 · Observaciones del psicólogo" defaultOpen={false}>
        <AField label="Impresión diagnóstica inicial">
          <textarea rows={3} value={form.impresionDiagnostica} onChange={fld("impresionDiagnostica")} placeholder="Hipótesis diagnóstica preliminar basada en la primera impresión clínica..." style={aTextarea(3)}/>
        </AField>
        <AField label="Hipótesis de trabajo">
          <textarea rows={3} value={form.hipotesisTrabajo} onChange={fld("hipotesisTrabajo")} placeholder="Modelo explicativo del problema, factores predisponentes, desencadenantes y mantenedores..." style={aTextarea(3)}/>
        </AField>
      </AnamnesisSection>

      <div style={{ display:"flex", alignItems:"center", justifyContent:"flex-end", gap:10, marginTop:8 }}>
        {saved && (
          <span style={{ fontFamily:T.fB, fontSize:12, color:T.suc, display:"flex", alignItems:"center", gap:5 }}>
            <Check size={13}/> Guardado
          </span>
        )}
        <button onClick={saveAnamnesis}
          style={{ display:"flex", alignItems:"center", gap:7, padding:"10px 20px",
            borderRadius:10, border:"none", background:T.p, color:"#fff",
            fontFamily:T.fB, fontSize:13, fontWeight:700, cursor:"pointer", transition:"opacity .13s" }}
          onMouseEnter={e => e.currentTarget.style.opacity="0.87"}
          onMouseLeave={e => e.currentTarget.style.opacity="1"}>
          <Check size={14}/> Guardar Anamnesis
        </button>
      </div>
    </div>
  );
}

// ── DischargeProtocolModal ────────────────────────────────────────────────────
function DischargeProtocolModal({ open, onClose, patient, ptSessions, onConfirm }) {
  const [form, setForm] = useState(BLANK_ALTA);
  const fld = k => e => {
    const v = e.target ? (e.target.type === "checkbox" ? e.target.checked : e.target.value) : e;
    setForm(f => ({ ...f, [k]: v }));
  };

  useEffect(() => { if (open) setForm(BLANK_ALTA); }, [open]);

  const sorted     = [...ptSessions].sort((a, b) => a.date.localeCompare(b.date));
  const firstSess  = sorted[0];
  const lastSess   = sorted[sorted.length - 1];
  const canConfirm = form.observaciones.trim().length > 0;

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

      {sectionHead(2, "Documentos a generar")}

      <div style={{ padding:"14px 16px", background:T.cardAlt, borderRadius:12, marginBottom:6 }}>
        <label style={{ display:"flex", alignItems:"flex-start", gap:10, cursor:"pointer", marginBottom:12 }}>
          <input type="checkbox" checked={form.genInforme} onChange={fld("genInforme")}
            style={{ marginTop:2, accentColor:T.p, width:16, height:16, flexShrink:0 }}/>
          <div>
            <div style={{ fontFamily:T.fB, fontSize:13.5, fontWeight:600, color:T.t }}>Generar Informe de Alta Terapéutica</div>
            <div style={{ fontFamily:T.fB, fontSize:11.5, color:T.tl, marginTop:2 }}>PDF con resumen del proceso, objetivos, evolución y recomendaciones</div>
          </div>
        </label>

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

      {sectionHead(3, "Confirmación")}

      <div style={{ padding:"14px 16px", background:"rgba(78,139,95,0.07)", border:`1.5px solid rgba(78,139,95,0.2)`, borderRadius:12, marginBottom:20 }}>
        <div style={{ fontFamily:T.fB, fontSize:12, fontWeight:700, color:T.suc, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:10 }}>
          Resumen del proceso
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <div>
            <div style={{ fontFamily:T.fB, fontSize:10, color:T.suc, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:2 }}>Paciente</div>
            <div style={{ fontFamily:T.fB, fontSize:13.5, fontWeight:600, color:T.t }}>{patient?.name || "—"}</div>
          </div>
          <div>
            <div style={{ fontFamily:T.fB, fontSize:10, color:T.suc, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:2 }}>Total de sesiones</div>
            <div style={{ fontFamily:T.fB, fontSize:13.5, fontWeight:600, color:T.t }}>{ptSessions.length}</div>
          </div>
          {firstSess && (
            <div>
              <div style={{ fontFamily:T.fB, fontSize:10, color:T.suc, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:2 }}>Primera sesión</div>
              <div style={{ fontFamily:T.fB, fontSize:13, color:T.tm }}>{fmtDate(firstSess.date)}</div>
            </div>
          )}
          {lastSess && (
            <div>
              <div style={{ fontFamily:T.fB, fontSize:10, color:T.suc, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:2 }}>Última sesión</div>
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
          style={{ background:T.suc, opacity: canConfirm ? 1 : 0.5 }}>
          <Check size={15}/> Confirmar Alta
        </Btn>
      </div>
    </Modal>
  );
}

// ── WaAltaModal ───────────────────────────────────────────────────────────────
function WaAltaModal({ open, onClose, patient, profile }) {
  const firstName = patient?.name?.split(" ")[0] || "";
  const psychName = profile?.name?.trim() || "tu psicólogo(a)";
  const msg = `Hola, ${firstName}. 🌟 Ha sido un honor acompañarte en este proceso. Hemos registrado tu alta y queremos desearte mucho éxito en tu camino. Recuerda que aquí estaremos si algún día nos necesitas de nuevo. ¡Cuídate mucho! 💙\n\n— ${psychName}`;
  const waUrl = patient?.phone
    ? `https://wa.me/${patient.phone.replace(/\D/g,"")}?text=${encodeURIComponent(msg)}`
    : "";

  return (
    <Modal open={open} onClose={onClose} title="📱 Mensaje de despedida" width={420}>
      <div style={{ fontFamily:T.fB, fontSize:12, color:T.tl, marginBottom:10 }}>
        Puedes enviarle un mensaje de cierre al paciente por WhatsApp:
      </div>
      <div style={{ padding:"14px 16px", background:T.sucA, border:"1.5px solid #25D36640", borderRadius:12, fontFamily:T.fB, fontSize:13.5, color:"#1A2B28", lineHeight:1.65, marginBottom:20, whiteSpace:"pre-wrap", wordBreak:"break-word" }}>
        {msg}
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {patient?.phone && (
          <button onClick={() => window.open(waUrl, "_blank", "noopener,noreferrer")}
            style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"13px 16px", borderRadius:12, background:WA, color:"#fff", fontFamily:T.fB, fontSize:14, fontWeight:700, textDecoration:"none" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Enviar por WhatsApp
          </button>
        )}
        <Btn variant="ghost" onClick={onClose} style={{ justifyContent:"center" }}>Omitir</Btn>
      </div>
    </Modal>
  );
}

// ── ReingresoModal ────────────────────────────────────────────────────────────
function ReingresoModal({ open, onClose, patient, onConfirm }) {
  const [option,        setOption]        = useState("A");
  const [withAdmission, setWithAdmission] = useState(true);

  useEffect(() => { if (open) { setOption("A"); setWithAdmission(true); } }, [open]);

  const dischargeLabel  = patient?.discharge?.date ? fmtDate(patient.discharge.date) : "—";
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
      <div style={{ padding:"12px 14px", background:T.sucA, border:`1.5px solid rgba(78,139,95,0.25)`, borderRadius:10, marginBottom:20 }}>
        <div style={{ fontFamily:T.fB, fontSize:11, fontWeight:700, color:T.suc, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>Alta previa</div>
        <div style={{ fontFamily:T.fB, fontSize:13, color:T.t }}>{dischargeLabel} · {dischargeReason}</div>
      </div>

      <div style={{ fontFamily:T.fB, fontSize:12, fontWeight:700, color:T.tm, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:12 }}>
        Tipo de reingreso
      </div>

      <div style={radioStyle(option === "A")} onClick={() => setOption("A")}>
        <input type="radio" checked={option === "A"} onChange={() => setOption("A")} style={{ marginTop:2, accentColor:T.p, flexShrink:0 }}/>
        <div>
          <div style={{ fontFamily:T.fB, fontSize:13.5, fontWeight:600, color:T.t }}>Opción A — Continuar en mismo expediente</div>
          <div style={{ fontFamily:T.fB, fontSize:12, color:T.tm, marginTop:2, lineHeight:1.5 }}>
            El paciente regresa y se reactiva su expediente actual. Se conservan todas las sesiones y pagos anteriores.
          </div>
          {option === "A" && (
            <label style={{ display:"flex", alignItems:"center", gap:8, marginTop:10, cursor:"pointer" }}>
              <input type="checkbox" checked={withAdmission} onChange={e => setWithAdmission(e.target.checked)} style={{ accentColor:T.p }}/>
              <span style={{ fontFamily:T.fB, fontSize:12.5, color:T.t }}>Resetear Anamnesis para nuevo ciclo terapéutico</span>
            </label>
          )}
        </div>
      </div>

      <div style={radioStyle(option === "B")} onClick={() => setOption("B")}>
        <input type="radio" checked={option === "B"} onChange={() => setOption("B")} style={{ marginTop:2, accentColor:T.p, flexShrink:0 }}/>
        <div>
          <div style={{ fontFamily:T.fB, fontSize:13.5, fontWeight:600, color:T.t }}>Opción B — Crear nuevo expediente vinculado</div>
          <div style={{ fontFamily:T.fB, fontSize:12, color:T.tm, marginTop:2, lineHeight:1.5 }}>
            Se crea un expediente nuevo para este ciclo terapéutico. El expediente original queda archivado y vinculado.
          </div>
        </div>
      </div>

      <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:20 }}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn onClick={() => { onConfirm(option, withAdmission); onClose(); }}>
          <Check size={14}/> Confirmar Reingreso
        </Btn>
      </div>
    </Modal>
  );
}

// ── ConsentRenewalModal ───────────────────────────────────────────────────────
function ConsentRenewalModal({ open, onClose, patient }) {
  return (
    <Modal open={open} onClose={onClose} title="⚠️ Consentimiento vencido o pendiente" width={440}>
      <div style={{ fontFamily:T.fB, fontSize:13.5, color:T.t, lineHeight:1.7, marginBottom:20 }}>
        El consentimiento informado de <strong>{patient?.name}</strong> está vencido (más de 12 meses) o no ha sido firmado. Se recomienda renovarlo antes de iniciar el nuevo ciclo.
      </div>
      <div style={{ display:"flex", justifyContent:"flex-end", gap:10 }}>
        <Btn variant="ghost" onClick={onClose}>Recordar después</Btn>
        <Btn onClick={onClose}><Check size={14}/> Entendido</Btn>
      </div>
    </Modal>
  );
}

// ── PrimerContactoModal ───────────────────────────────────────────────────────
function PrimerContactoModal({ open, onClose, patients, onSave, profile }) {
  const [step,    setStep]    = useState(1);
  const [saved,   setSaved]   = useState(null);
  const [dupWarn, setDupWarn] = useState(null);
  const [form, setForm] = useState({
    name:"", countryCode:"+52", phone:"", initialReason:"",
    appointmentDate:"", appointmentTime:"09:00",
  });

  const handleClose = () => {
    setStep(1); setSaved(null); setDupWarn(null);
    setForm({ name:"", countryCode:"+52", phone:"", initialReason:"", appointmentDate:"", appointmentTime:"09:00" });
    onClose();
  };

  const fld = (k) => (e) => {
    const raw = e.target ? e.target.value : e;
    setForm(f => ({ ...f, [k]: raw }));
    if (k === "phone") setDupWarn(null);
  };

  const checkDup = () => {
    const fullPhone = `${form.countryCode}${form.phone.replace(/\D/g, "")}`;
    if (!form.phone) return;
    const dup = patients.find(p => p.phone === fullPhone || p.phone?.replace(/\D/g, "") === form.phone.replace(/\D/g, ""));
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

  const buildWelcomeMsg = () => {
    if (!saved) return "";
    const firstName = saved.patient.name.split(" ")[0];
    const dateLabel = fmtDate(saved.appointment.date);
    const time      = saved.appointment.time;
    const psychName = profile?.name?.trim() || "tu psicólogo(a)";
    return `Hola, ${firstName}. 👋\n\nEs un gusto saludarte. Te confirmamos que hemos agendado tu primera sesión para el ${dateLabel} a las ${time}. Antes de tu cita, te compartiremos un enlace temporal y seguro para revisar y firmar tu Consentimiento Informado. Este enlace vence en 24 horas. ¡Estamos para apoyarte! 😊\n\n— ${psychName}`;
  };

  const msg = buildWelcomeMsg();

  const handleSendWelcomeWhatsApp = async () => {
    if (!saved?.patient?.phone) return;
    const { accessUrl } = await createPortalAccessLink(saved.patient.phone);
    const finalMessage = `${msg}\n\nAccede desde aquí: ${accessUrl}`;
    window.open(`https://wa.me/${saved.patient.phone.replace(/\D/g,"")}?text=${encodeURIComponent(finalMessage)}`, "_blank", "noopener,noreferrer");
  };

  const inputStyle = {
    width:"100%", padding:"10px 14px", border:`1.5px solid ${T.bdr}`,
    borderRadius:10, fontFamily:T.fB, fontSize:14, color:T.t,
    background:T.card, outline:"none", boxSizing:"border-box",
  };

  return (
    <Modal open={open} onClose={handleClose} title={step === 1 ? "✨ Nuevo paciente — Pre-Cita" : "📱 Mensaje de bienvenida"} width={480}>

      {step === 1 && (
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:20 }}>
            <div style={{ flex:1, height:3, borderRadius:9999, background:T.p }}/>
            <div style={{ flex:1, height:3, borderRadius:9999, background:T.bdrL }}/>
            <span style={{ fontFamily:T.fB, fontSize:11, color:T.tl }}>Paso 1 de 2</span>
          </div>

          <div style={{ marginBottom:14 }}>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.tm, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>
              Nombre completo *
            </label>
            <input value={form.name} onChange={fld("name")} placeholder="Ej. María González López" style={inputStyle}/>
          </div>

          <div style={{ marginBottom: dupWarn ? 8 : 14 }}>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.tm, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>
              Teléfono *
            </label>
            <PhoneInput
              countryCode={form.countryCode}
              phone={form.phone}
              onChangeCountry={code => setForm(f => ({ ...f, countryCode: code, phone: "" }))}
              onChangePhone={val => { setForm(f => ({ ...f, phone: val })); setDupWarn(null); }}
              error={!!dupWarn}
              onBlur={checkDup}
            />
          </div>

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
                  onClick={() => { handleClose(); onSave({ __navigateTo: dupWarn.id }); }}
                  style={{ background:"none", border:"none", padding:0, fontFamily:T.fB, fontSize:12, color:T.p, textDecoration:"underline", cursor:"pointer", marginTop:3 }}>
                  ¿Quieres abrir su expediente?
                </button>
              </div>
            </div>
          )}

          <div style={{ marginBottom:14 }}>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.tm, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>
              Motivo breve de consulta *
            </label>
            <input value={form.initialReason} onChange={fld("initialReason")} placeholder="Ej. Ansiedad generalizada, dificultades de pareja..." style={inputStyle}/>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 }}>
            <div>
              <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.tm, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>
                Fecha de primera cita
              </label>
              <input type="date" value={form.appointmentDate} onChange={fld("appointmentDate")} style={inputStyle}/>
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

      {step === 2 && (
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:20 }}>
            <div style={{ flex:1, height:3, borderRadius:9999, background:T.p }}/>
            <div style={{ flex:1, height:3, borderRadius:9999, background:T.p }}/>
            <span style={{ fontFamily:T.fB, fontSize:11, color:T.suc, fontWeight:700 }}>✓ Paso 2 de 2</span>
          </div>
          <div style={{ fontFamily:T.fB, fontSize:12, color:T.tl, marginBottom:10 }}>
            Paciente guardado. Puedes enviarle el mensaje de bienvenida y el acceso seguro al consentimiento:
          </div>
          <div style={{ padding:"14px 16px", background:T.cardAlt, border:`1.5px solid ${T.bdrL}`, borderRadius:12, fontFamily:T.fB, fontSize:13.5, color:T.t, lineHeight:1.65, marginBottom:20, whiteSpace:"pre-wrap", wordBreak:"break-word" }}>
            {msg}
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {saved?.patient?.phone && (
              <button onClick={handleSendWelcomeWhatsApp}
                style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                  padding:"13px 16px", borderRadius:12, border:"none",
                  background:WA, color:"#fff",
                  fontFamily:T.fB, fontSize:14, fontWeight:700,
                  textDecoration:"none", cursor:"pointer", transition:"opacity .13s" }}
                onMouseEnter={e => e.currentTarget.style.opacity="0.88"}
                onMouseLeave={e => e.currentTarget.style.opacity="1"}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Enviar bienvenida por WhatsApp
              </button>
            )}
            <Btn variant="ghost" onClick={handleClose} style={{ justifyContent:"center" }}>
              Listo, cerrar
            </Btn>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ── Patient form modal content (shared desktop + mobile) ──────────────────────
function PatientFormContent({ form, fld, setForm, services, save, editTarget, onCancel }) {
  const SERVICE_TYPE_LABEL_LOCAL = SERVICE_TYPE_LABEL;
  return (
    <>
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
            {form.birthdate && <span style={{ marginLeft:8, fontWeight:700, color:T.p, textTransform:"none", letterSpacing:0, fontSize:12 }}>· {calcAge(form.birthdate)} años</span>}
          </label>
          <input type="date" value={form.birthdate} onChange={e => fld("birthdate")(e.target.value)}
            style={{ width:"100%", padding:"10px 14px", border:`1.5px solid ${T.bdr}`, borderRadius:10,
              fontFamily:T.fB, fontSize:14, color:T.t, background:T.card, outline:"none", boxSizing:"border-box" }}/>
        </div>
        <Input label="Correo electrónico" value={form.email} onChange={fld("email")} type="email"/>
      </div>
      <div style={{ marginBottom:12 }}>
        <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.tm, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>
          Teléfono
        </label>
        <PhoneInput
          countryCode={form.countryCode}
          phone={form.phone}
          onChangeCountry={code => fld("countryCode")(code)}
          onChangePhone={val => fld("phone")(val)}
        />
      </div>
      {(form.type === "pareja" || form.type === "grupo") && (
        <Textarea
          label={form.type === "pareja" ? "Nombre de los participantes (pareja)" : "Integrantes del grupo"}
          value={form.coParticipants} onChange={fld("coParticipants")} rows={2}
          placeholder={form.type === "pareja" ? "Ej. Carlos Méndez y Ana Ríos" : "Ej. Carlos M., Ana R., Luis P. (4 integrantes)"}
        />
      )}
      <CieDiagnosisField value={form.diagnosis} cie11Code={form.cie11Code} onChangeDx={fld("diagnosis")} onChangeCode={fld("cie11Code")} label="Diagnóstico"/>
      <Textarea label="Motivo de consulta" value={form.reason} onChange={fld("reason")} rows={2}/>
      <Textarea label="Notas adicionales" value={form.notes} onChange={fld("notes")} rows={2}/>
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
                const label = s.name || SERVICE_TYPE_LABEL_LOCAL[s.type] || s.type;
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
        <Btn variant="ghost" onClick={onCancel}>Cancelar</Btn>
        <Btn onClick={save} disabled={!form.name.trim()}><Check size={15}/> {editTarget ? "Guardar cambios" : "Guardar paciente"}</Btn>
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════
export default function Patients({
  patients = [], setPatients,
  sessions = [], payments = [], setPayments,
  riskAssessments = [], scaleResults = [], treatmentPlans = [],
  interSessions = [], setInterSessions,
  medications = [], setMedications,
  onQuickNav, profile, autoOpen,
  services = [], appointments = [], setAppointments,
}) {
  const isMobile = useIsMobile();

  const h = usePatients({
    patients, setPatients,
    sessions, payments, setPayments,
    riskAssessments, scaleResults, treatmentPlans,
    services, appointments, setAppointments,
    profile, onQuickNav, autoOpen,
  });

  // ── VISTA DETALLE ───────────────────────────────────────────────────────────
  if (h.selected) {
    const selected   = h.selected;
    const ptSessions = sessions.filter(s => s.patientId === selected.id).sort((a,b) => b.date.localeCompare(a.date));
    const ptPayments = payments.filter(p => p.patientId === selected.id).sort((a,b) => b.date.localeCompare(a.date));
    const totalPaid  = ptPayments.filter(p => p.status==="pagado").reduce((s,p) => s+Number(p.amount), 0);
    const totalPend  = ptPayments.filter(p => p.status==="pendiente").reduce((s,p) => s+Number(p.amount), 0);
    const sc = STATUS_CONFIG[selected.status || "activo"];
    const tc = TYPE_CONFIG[selected.type || "individual"];
    const anamnesisComplete = selected.anamnesis && Object.values(selected.anamnesis).some(v => v && v !== "ninguno" && v !== h.todayStr);

    // ── Tab content ──────────────────────────────────────────────────────────
    const tabContent = (
      <div style={{ animation:"pc-fadeSlideUp .3s ease both" }}>
        {h.detailTab === "anamnesis" && (
          <AnamnesisTab patient={selected} setPatients={setPatients} todayStr={h.todayStr}/>
        )}

        {h.detailTab === "sessions" && (
          ptSessions.length === 0
            ? <div style={{ fontFamily:T.fB, fontSize:13, color:T.tl, padding:"32px 0", textAlign:"center" }}>
                <div style={{ fontSize:28, marginBottom:8 }}>📝</div>
                Sin sesiones registradas aún
              </div>
            : ptSessions.map(s => {
              const MI = moodIcon(s.mood); const ps = progressStyle(s.progress);
              return (
                <div key={s.id} style={{ borderBottom:`1px solid ${T.bdrL}`, paddingBottom:16, marginBottom:16 }}>
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

        {h.detailTab === "payments" && (
          ptPayments.length === 0
            ? <div style={{ fontFamily:T.fB, fontSize:13, color:T.tl, padding:"32px 0", textAlign:"center" }}>Sin pagos registrados</div>
            : <>
              <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr", gap:8, marginBottom:20, padding:"14px 16px", background:T.bg, borderRadius:14, border:`1.5px solid ${T.bdrL}` }}>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontFamily:T.fH, fontSize:22, color:T.suc, lineHeight:1 }}>{fmtCur(totalPaid)}</div>
                  <div style={{ fontFamily:T.fB, fontSize:10, color:T.tm, marginTop:3, textTransform:"uppercase", letterSpacing:"0.06em" }}>Pagado</div>
                </div>
                <div style={{ textAlign:"center", borderLeft:`1px solid ${T.bdrL}`, borderRight:`1px solid ${T.bdrL}` }}>
                  <div style={{ fontFamily:T.fH, fontSize:22, color:totalPend > 0 ? T.war : T.tl, lineHeight:1 }}>{fmtCur(totalPend)}</div>
                  <div style={{ fontFamily:T.fB, fontSize:10, color:T.tm, marginTop:3, textTransform:"uppercase", letterSpacing:"0.06em" }}>Pendiente</div>
                </div>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontFamily:T.fH, fontSize:22, color:T.p, lineHeight:1 }}>{ptPayments.length}</div>
                  <div style={{ fontFamily:T.fB, fontSize:10, color:T.tm, marginTop:3, textTransform:"uppercase", letterSpacing:"0.06em" }}>Registros</div>
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
                  <button onClick={() => h.togglePayment(p.id)} style={{ background:p.status==="pagado"?T.sucA:T.warA, border:"none", borderRadius:8, padding:"4px 10px", cursor:"pointer", fontSize:11, fontFamily:T.fB, color:p.status==="pagado"?T.suc:T.war, fontWeight:600 }}>{p.status}</button>
                </div>
              ))}
            </>
        )}

        {h.detailTab === "progress" && (
          <div>
            {ptSessions.length < 2 ? (
              <div style={{ fontFamily:T.fB, fontSize:13, color:T.tl, padding:"32px 0", textAlign:"center", lineHeight:1.6 }}>
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

        {h.detailTab === "contacts" && (
          <ContactsTab patientId={selected.id} interSessions={interSessions} setInterSessions={setInterSessions}/>
        )}

        {h.detailTab === "medications" && (
          <MedicationTab patientId={selected.id} medications={medications} setMedications={setMedications}/>
        )}

        {h.detailTab === "tasks" && (
          <PatientTasksTab patient={selected} sessions={sessions}/>
        )}
      </div>
    );

    // ── Sidebar clínico ────────────────────────────────────────────────────────
    const sidebarContent = (
      <div>
        <div style={{ marginBottom:16 }}>
          <div style={{ width:isMobile ? 0 : 64, height:isMobile ? 0 : 64, borderRadius:18, background:T.pA,
            display:isMobile ? "none" : "flex", alignItems:"center", justifyContent:"center", marginBottom:12 }}>
            <span style={{ fontFamily:T.fH, fontSize:30, color:T.p, lineHeight:1 }}>{selected.name[0]}</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            <select value={selected.status || "activo"} onChange={e => h.setStatus(selected.id, e.target.value)}
              style={{ appearance:"none", padding:"4px 10px", borderRadius:9999, fontFamily:T.fB,
                fontSize:11, fontWeight:700, letterSpacing:"0.04em", border:"none",
                cursor:"pointer", background:sc.bg, color:sc.color, flexShrink:0 }}>
              {Object.entries(STATUS_CONFIG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <Badge color={tc.color} bg={tc.bg}>{tc.label}</Badge>
            {selected.linkedTo && <Badge color={T.p} bg={T.pA}>🔗 Reingreso</Badge>}
          </div>
          <div style={{ fontFamily:T.fB, fontSize:12, color:T.tm, marginTop:6 }}>
            {selected.age ? `${selected.age} años · ` : ""}Desde {fmtDate(selected.createdAt)}
          </div>
        </div>

        {selected.activeRiskAlert && (
          <div style={{
            display:"flex", alignItems:"flex-start", gap:10, padding:"12px 14px",
            background:T.errA, border:`2px solid ${T.errA}`,
            borderRadius:12, marginBottom:14,
            animation:"pulseRiskBanner 2.5s ease-in-out infinite"
          }}>
            <ShieldAlert size={18} color={T.err} style={{ flexShrink:0, marginTop:1 }}/>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:T.fB, fontSize:13, fontWeight:700, color:T.err, marginBottom:3 }}>
                Riesgo {(selected.activeRiskAlert.level||"").toUpperCase()} Activo
              </div>
              <div style={{ fontFamily:T.fB, fontSize:11.5, color:T.err, lineHeight:1.55, opacity:0.9, marginBottom:8 }}>
                Detectado el {selected.activeRiskAlert.date
                  ? new Date(selected.activeRiskAlert.date).toLocaleDateString("es-MX",{day:"numeric",month:"long",year:"numeric"})
                  : "—"}
              </div>
              <button onClick={() => {
                if (confirm(`¿Confirmas que el riesgo de ${selected.name} ha sido evaluado y se encuentra mitigado?`)) {
                  h.mitigateRisk(selected.id);
                }
              }}
                style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"5px 12px",
                  borderRadius:8, border:`1.5px solid ${T.errA}`,
                  background:T.errA, color:T.err,
                  fontFamily:T.fB, fontSize:11.5, fontWeight:700, cursor:"pointer" }}>
                <X size={11}/> Marcar mitigado
              </button>
            </div>
            <style>{`@keyframes pulseRiskBanner{0%,100%{box-shadow:0 0 0 0 rgba(184,80,80,0.25)}50%{box-shadow:0 0 0 6px rgba(184,80,80,0)}}`}</style>
          </div>
        )}

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:16, paddingTop:14, borderTop:`1px solid ${T.bdrL}` }}>
          <div style={{ textAlign:"center", padding:"11px 10px", background:T.pA, borderRadius:12 }}>
            <div style={{ fontFamily:T.fH, fontSize:28, color:T.p, lineHeight:1 }}>{ptSessions.length}</div>
            <div style={{ fontFamily:T.fB, fontSize:10, color:T.tm, marginTop:2, textTransform:"uppercase", letterSpacing:"0.06em" }}>Sesiones</div>
          </div>
          <div style={{ textAlign:"center", padding:"11px 10px", background:T.sucA, borderRadius:12 }}>
            <div style={{ fontFamily:T.fH, fontSize:20, color:T.suc, lineHeight:1.1 }}>{fmtCur(totalPaid)}</div>
            <div style={{ fontFamily:T.fB, fontSize:10, color:T.tm, marginTop:2, textTransform:"uppercase", letterSpacing:"0.06em" }}>Pagado</div>
          </div>
          {totalPend > 0 && (
            <div style={{ textAlign:"center", padding:"10px 8px", background:T.warA, borderRadius:12, gridColumn:"1/-1" }}>
              <div style={{ fontFamily:T.fH, fontSize:20, color:T.war, lineHeight:1 }}>{fmtCur(totalPend)}</div>
              <div style={{ fontFamily:T.fB, fontSize:10, color:T.tm, marginTop:2, textTransform:"uppercase", letterSpacing:"0.06em" }}>Pendiente</div>
            </div>
          )}
        </div>

        {(selected.phone || selected.email) && (
          <div style={{ marginBottom:12 }}>
            <div style={{ fontFamily:T.fB, fontSize:10, fontWeight:700, color:T.tl, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>Contacto</div>
            {selected.phone && (
              <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:6, fontFamily:T.fB, fontSize:13, color:T.tm }}>
                <Phone size={13}/>{selected.phone}
              </div>
            )}
            {selected.email && (
              <div style={{ display:"flex", gap:8, alignItems:"center", fontFamily:T.fB, fontSize:13, color:T.tm }}>
                <Mail size={13}/>{selected.email}
              </div>
            )}
          </div>
        )}

        {selected.emergencyName && (
          <div style={{ padding:"11px 13px", background:T.errA, border:`1.5px solid ${T.errA}`, borderRadius:11, marginBottom:12 }}>
            <div style={{ fontFamily:T.fB, fontSize:10, fontWeight:700, color:T.err, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>
              🚨 Contacto de emergencia
            </div>
            <div style={{ fontFamily:T.fB, fontSize:13.5, fontWeight:600, color:T.t, marginBottom:2 }}>{selected.emergencyName}</div>
            {selected.emergencyRelation && <div style={{ fontFamily:T.fB, fontSize:12, color:T.tm, marginBottom:4 }}>{selected.emergencyRelation}</div>}
            {selected.emergencyPhone && (
              <button href={`tel:${selected.emergencyPhone}`} style={{ fontFamily:T.fB, fontSize:13, color:T.err, fontWeight:600, textDecoration:"none", display:"flex", alignItems:"center", gap:5 }}>
                <Phone size={12}/>{selected.emergencyPhone}
              </button>
            )}
          </div>
        )}

        <div style={{ padding:"10px 12px", background:T.cardAlt, borderRadius:10, marginBottom:12, border:`1px solid ${T.bdrL}` }}>
          <div style={{ fontFamily:T.fB, fontSize:10, fontWeight:700, color:T.tl, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>
            Servicio habitual
          </div>
          {services.length > 0 ? (
            <select
              value={selected.serviceId || ""}
              onChange={e => h.setServiceId(selected.id, e.target.value)}
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
              <input type="number" value={selected.rate || ""} onChange={e => h.setRate(selected.id, e.target.value)}
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

        {selected.diagnosis && (
          <div style={{ padding:12, background:T.pA, borderRadius:11, marginBottom:10 }}>
            <div style={{ fontFamily:T.fB, fontSize:10, fontWeight:700, color:T.p, letterSpacing:"0.08em", marginBottom:6, textTransform:"uppercase" }}>Diagnóstico actual</div>
            {selected.cie11Code && (
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5 }}>
                <span style={{ padding:"2px 8px", borderRadius:6, background:"rgba(58,107,110,0.15)", color:T.p, fontSize:10, fontWeight:700, fontFamily:"monospace" }}>{selected.cie11Code}</span>
                <span style={{ fontSize:10, color:T.tm }}>CIE-11</span>
              </div>
            )}
            <div style={{ fontFamily:T.fB, fontSize:13, color:T.t, lineHeight:1.5 }}>{selected.diagnosis}</div>
          </div>
        )}

        {(selected.diagnosisHistory||[]).length > 1 && (
          <div style={{ padding:"10px 12px", background:T.cardAlt, borderRadius:10, marginBottom:10 }}>
            <div style={{ fontFamily:T.fB, fontSize:10, fontWeight:700, color:T.tm, letterSpacing:"0.08em", marginBottom:8, textTransform:"uppercase" }}>Historial diagnóstico</div>
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

        {h.showAddDx ? (
          <div style={{ padding:12, background:T.cardAlt, borderRadius:10, marginBottom:10 }}>
            <CieDiagnosisField
              value={h.newDx.diagnosis}
              cie11Code={h.newDx.cie11Code}
              onChangeDx={v => h.setNewDx(n=>({...n, diagnosis:v}))}
              onChangeCode={v => h.setNewDx(n=>({...n, cie11Code:v}))}
              label="Nuevo diagnóstico"
            />
            <input type="date" value={h.newDx.date} onChange={e => h.setNewDx(n=>({...n,date:e.target.value}))} style={{ width:"100%", padding:"8px 10px", border:`1.5px solid ${T.bdr}`, borderRadius:8, fontFamily:T.fB, fontSize:13, color:T.t, background:T.card, outline:"none", boxSizing:"border-box", marginBottom:8 }}/>
            <div style={{ display:"flex", gap:6 }}>
              <button onClick={() => h.addDiagnosis(selected.id)} disabled={!h.newDx.diagnosis.trim()} style={{ flex:1, padding:"7px 0", background:T.p, color:"#fff", border:"none", borderRadius:8, fontFamily:T.fB, fontSize:12, fontWeight:600, cursor:h.newDx.diagnosis.trim()?"pointer":"not-allowed", opacity:h.newDx.diagnosis.trim()?1:0.5 }}>Guardar</button>
              <button onClick={() => h.setShowAddDx(false)} style={{ flex:1, padding:"7px 0", background:T.bdrL, color:T.tm, border:"none", borderRadius:8, fontFamily:T.fB, fontSize:12, cursor:"pointer" }}>Cancelar</button>
            </div>
          </div>
        ) : (
          <button onClick={() => h.setShowAddDx(true)} style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 12px", background:"transparent", border:`1.5px dashed ${T.bdr}`, borderRadius:9, fontFamily:T.fB, fontSize:12, color:T.p, cursor:"pointer", width:"100%", justifyContent:"center", marginBottom:12 }}>
            + Actualizar diagnóstico
          </button>
        )}

        {selected.reason && (
          <div style={{ padding:12, background:T.cardAlt, borderRadius:10, marginBottom:12 }}>
            <div style={{ fontFamily:T.fB, fontSize:10, fontWeight:700, color:T.tm, letterSpacing:"0.08em", marginBottom:5, textTransform:"uppercase" }}>Motivo de consulta</div>
            <div style={{ fontFamily:T.fB, fontSize:13, color:T.t, lineHeight:1.55 }}>{selected.reason}</div>
          </div>
        )}

        <ConsentBlock
          key={selected.id}
          patient={selected}
          onUpdate={(consentData) => h.updateConsent(selected.id, consentData)}
          profile={profile}
        />

        <MedSummaryWidget patientId={selected.id} medications={medications}/>
        <ContactFollowUpWidget patientId={selected.id} interSessions={interSessions}/>

        <div style={{ marginTop:16, paddingTop:14, borderTop:`1px solid ${T.bdrL}` }}>
          {selected.status !== "alta" ? (
            <button
              onClick={() => h.setShowAltaModal(true)}
              style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                width:"100%", padding:"8px", borderRadius:9,
                border:`1.5px solid rgba(78,139,95,0.4)`, background:"rgba(78,139,95,0.07)",
                color:T.suc, fontFamily:T.fB, fontSize:12, fontWeight:700,
                cursor:"pointer", transition:"all .15s" }}
              onMouseEnter={e => { e.currentTarget.style.background="rgba(78,139,95,0.18)"; e.currentTarget.style.borderColor="rgba(78,139,95,0.7)"; }}
              onMouseLeave={e => { e.currentTarget.style.background="rgba(78,139,95,0.07)"; e.currentTarget.style.borderColor="rgba(78,139,95,0.4)"; }}>
              <LogOut size={13}/> Dar de alta
            </button>
          ) : (
            <div style={{ padding:"12px 14px", background:"rgba(78,139,95,0.07)", border:`1.5px solid rgba(78,139,95,0.2)`, borderRadius:10 }}>
              <div style={{ fontFamily:T.fB, fontSize:10, fontWeight:700, color:T.suc, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>
                🎓 Registro de Alta
              </div>
              {selected.discharge?.reason && (
                <div style={{ fontFamily:T.fB, fontSize:12, color:T.tm, marginBottom:4 }}>
                  {({ logros:"Objetivos logrados", voluntaria:"Alta voluntaria", derivacion:"Derivación a otro profesional", otros:"Otros" }[selected.discharge.reason] || selected.discharge.reason)}
                </div>
              )}
              {selected.discharge?.notes && (
                <div style={{ fontFamily:T.fB, fontSize:12, color:T.t, lineHeight:1.55, marginBottom:10 }}>
                  {selected.discharge.notes.slice(0, 100)}{selected.discharge.notes.length > 100 ? "…" : ""}
                </div>
              )}
              {selected.reingreso && (
                <div style={{ padding:"6px 10px", background:T.pA, borderRadius:8, marginBottom:8 }}>
                  <div style={{ fontFamily:T.fB, fontSize:10, fontWeight:700, color:T.p, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:2 }}>Reingreso previo</div>
                  <div style={{ fontFamily:T.fB, fontSize:11.5, color:T.tm }}>{fmtDate(selected.reingreso.date)} · Opción {selected.reingreso.option}</div>
                </div>
              )}
              <button
                onClick={() => h.setShowReingresoModal(true)}
                style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                  width:"100%", padding:"8px", borderRadius:9,
                  border:"none", background:T.suc, color:"#fff",
                  fontFamily:T.fB, fontSize:12, fontWeight:700, cursor:"pointer", transition:"opacity .15s" }}
                onMouseEnter={e => e.currentTarget.style.opacity="0.85"}
                onMouseLeave={e => e.currentTarget.style.opacity="1"}>
                🔄 Iniciar Reingreso
              </button>
            </div>
          )}
        </div>

        <details style={{ marginTop:12, paddingTop:12, borderTop:`1px dashed ${T.bdrL}` }}>
          <summary style={{ listStyle:"none", cursor:"pointer", fontFamily:T.fB, fontSize:11.5, fontWeight:700, color:T.tm, textTransform:"uppercase", letterSpacing:"0.07em", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <span>Gestión del expediente</span>
            <ChevronDown size={13} color={T.tl}/>
          </summary>
          <div style={{ marginTop:12, display:"grid", gap:8 }}>
            <button
              onClick={h.openEditSelected}
              style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                width:"100%", padding:"7px", borderRadius:9,
                border:`1px solid ${T.bdr}`, background:"transparent",
                color:T.tm, fontFamily:T.fB, fontSize:11.5, fontWeight:600,
                cursor:"pointer", transition:"all .15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor=T.p; e.currentTarget.style.color=T.p; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor=T.bdr; e.currentTarget.style.color=T.tm; }}>
              ✏️ Editar expediente completo
            </button>
            <button
              onClick={() => {
                if (confirm(`¿Eliminar el expediente de ${selected.name}? Esta acción no se puede deshacer.`)) {
                  h.del(selected.id);
                }
              }}
              style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                width:"100%", padding:"7px", borderRadius:9,
                border:`1px solid ${T.errA}`, background:"transparent",
                color:T.err, fontFamily:T.fB, fontSize:11.5, fontWeight:600,
                cursor:"pointer", opacity:0.55, transition:"all .15s" }}
              onMouseEnter={e => { e.currentTarget.style.opacity="1"; e.currentTarget.style.background=T.errA; }}
              onMouseLeave={e => { e.currentTarget.style.opacity="0.55"; e.currentTarget.style.background="transparent"; }}>
              <Trash2 size={12}/> Eliminar expediente
            </button>
          </div>
        </details>
      </div>
    );

    const tabList = [
      { id:"anamnesis",   label: anamnesisComplete ? "Anamnesis ✅" : "Anamnesis 🟠" },
      { id:"sessions",    label:`Sesiones (${ptSessions.length})`  },
      { id:"payments",    label:`Pagos (${ptPayments.length})`     },
      { id:"progress",    label:"Progreso"                         },
      { id:"contacts",    label:`Contactos (${(interSessions||[]).filter(c=>c.patientId===selected.id).length})` },
      { id:"medications", label:`Medicación (${(medications||[]).filter(m=>m.patientId===selected.id&&m.status==="activo").length})` },
      { id:"tasks",       label:"Tareas" },
    ];

    // ── Alta banner ────────────────────────────────────────────────────────────
    const altaBanner = selected.status === "alta" && selected.discharge ? (
      <div style={{
        display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12,
        padding:"12px 18px", marginBottom:16,
        background:"rgba(78,139,95,0.07)", border:"1.5px solid rgba(78,139,95,0.25)", borderRadius:12,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:18 }}>🎓</span>
          <div>
            <div style={{ fontFamily:T.fB, fontSize:13, fontWeight:700, color:T.suc, marginBottom:2 }}>
              Paciente dado de alta el {fmtDate(selected.discharge.date)}.
            </div>
            <div style={{ fontFamily:T.fB, fontSize:12, color:T.tm }}>
              Motivo: {({ logros:"Objetivos terapéuticos logrados", voluntaria:"Alta voluntaria del paciente", derivacion:"Derivación a otro profesional", otros:"Otros" }[selected.discharge.reason] || selected.discharge.reason || "—")}
            </div>
          </div>
        </div>
        <button
          onClick={() => h.setShowReingresoModal(true)}
          style={{ display:"flex", alignItems:"center", gap:7, padding:"9px 18px", borderRadius:9,
            border:"none", background:T.suc, color:"#fff",
            fontFamily:T.fB, fontSize:13, fontWeight:700, cursor:"pointer",
            boxShadow:"0 2px 8px rgba(78,139,95,0.28)", transition:"opacity .15s", flexShrink:0 }}
          onMouseEnter={e => e.currentTarget.style.opacity="0.88"}
          onMouseLeave={e => e.currentTarget.style.opacity="1"}>
          🔄 Iniciar Reingreso
        </button>
      </div>
    ) : null;

    // ── Welcome button + error (reusable snippet) ─────────────────────────────
    const WelcomeBtn = ({ pill }) => selected.phone ? (
      <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-start", gap:3 }}>
        <button onClick={() => void h.handleSendWelcomeFromDetail()}
          style={{ display:"flex", alignItems:"center", gap:5, background:WA, border:"none",
            borderRadius: pill ? 9999 : 8, padding: pill ? "7px 16px" : "6px 12px",
            fontFamily:T.fB, fontSize:12, fontWeight:700, color:"#fff", cursor:"pointer", transition:"opacity .15s" }}
          onMouseEnter={e => e.currentTarget.style.opacity="0.88"}
          onMouseLeave={e => e.currentTarget.style.opacity="1"}>
          <MessageCircle size={12}/> Bienvenida
        </button>
        {h.welcomeLinkError && (
          <span style={{ fontFamily:T.fB, fontSize:10.5, color:T.err, fontWeight:600, paddingLeft:2 }}>
            Error al generar enlace
          </span>
        )}
      </div>
    ) : null;

    // ── Toasts ─────────────────────────────────────────────────────────────────
    const toasts = (
      <>
        {h.altaToast && (
          <div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)",
            background:T.suc, color:"#fff", fontFamily:T.fB, fontSize:13, fontWeight:600,
            padding:"11px 22px", borderRadius:12, boxShadow:"0 4px 20px rgba(0,0,0,0.18)",
            zIndex:9999, display:"flex", alignItems:"center", gap:8, whiteSpace:"nowrap" }}>
            <Check size={15}/> Alta registrada correctamente
          </div>
        )}
        {h.reingresoToast && (
          <div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)",
            background:T.p, color:"#fff", fontFamily:T.fB, fontSize:13, fontWeight:600,
            padding:"11px 22px", borderRadius:12, boxShadow:"0 4px 20px rgba(0,0,0,0.18)",
            zIndex:9999, display:"flex", alignItems:"center", gap:8, whiteSpace:"nowrap" }}>
            <Check size={15}/> Reingreso registrado correctamente
          </div>
        )}
      </>
    );

    // ── Shared modals ──────────────────────────────────────────────────────────
    const sharedModals = (
      <>
        <DischargeProtocolModal open={h.showAltaModal} onClose={() => h.setShowAltaModal(false)} patient={selected} ptSessions={sessions.filter(s => s.patientId === selected.id)} onConfirm={h.confirmAlta}/>
        <WaAltaModal open={h.showWaModal} onClose={() => h.setShowWaModal(false)} patient={selected} profile={profile}/>
        <ReingresoModal open={h.showReingresoModal} onClose={() => h.setShowReingresoModal(false)} patient={selected} onConfirm={h.confirmReingreso}/>
        <ConsentRenewalModal open={h.showConsentExpired} onClose={() => h.setShowConsentExpired(false)} patient={selected}/>
      </>
    );

    // ── MOBILE detail ──────────────────────────────────────────────────────────
    if (isMobile) {
      return (
        <div style={{ animation:"pc-fadeSlideUp .25s ease both" }}>
          {toasts}
          <div style={{ background:T.nav, padding:"16px 16px 20px", margin:"-16px -16px 0", position:"sticky", top:0, zIndex:20 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
              <button onClick={() => h.setSelected(null)}
                style={{ display:"flex", alignItems:"center", gap:5, background:"none", border:"none",
                  color:"rgba(255,255,255,0.55)", fontFamily:T.fB, fontSize:12.5, cursor:"pointer", padding:0 }}>
                <ChevronLeft size={14}/> Pacientes
              </button>
              <div style={{ display:"flex", gap:8 }}>
                <WelcomeBtn pill={false}/>
                <button onClick={h.handleExportExpediente}
                  style={{ display:"flex", alignItems:"center", gap:5, background:"rgba(255,255,255,0.08)",
                    border:"1px solid rgba(255,255,255,0.15)", borderRadius:8, padding:"6px 12px",
                    fontFamily:T.fB, fontSize:12, fontWeight:600, color:"rgba(255,255,255,0.7)", cursor:"pointer" }}>
                  <Download size={12}/> PDF
                </button>
                <button onClick={() => h.handleSelect(selected, "sessions")}
                  style={{ display:"flex", alignItems:"center", gap:5, background:T.acc,
                    border:"none", borderRadius:8, padding:"6px 12px",
                    fontFamily:T.fB, fontSize:12, fontWeight:700, color:"#fff", cursor:"pointer" }}>
                  <Plus size={12}/> Sesión
                </button>
              </div>
            </div>
            <div style={{ display:"flex", alignItems:"flex-start", gap:14 }}>
              <div style={{ width:52, height:52, borderRadius:15, background:"rgba(255,255,255,0.1)",
                display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <span style={{ fontFamily:T.fH, fontSize:26, color:"rgba(255,255,255,0.88)", lineHeight:1 }}>{selected.name[0]}</span>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <h2 style={{ fontFamily:T.fH, fontSize:24, fontWeight:400, color:"rgba(255,255,255,0.92)", margin:0, lineHeight:1.1 }}>
                  {selected.name}
                </h2>
                <div style={{ fontFamily:T.fB, fontSize:12, color:"rgba(255,255,255,0.45)", marginTop:3 }}>
                  {selected.age ? `${selected.age} años · ` : ""}{fmtDate(selected.createdAt)}
                </div>
                <div style={{ display:"flex", gap:6, marginTop:8, flexWrap:"wrap" }}>
                  <span style={{ padding:"4px 11px", borderRadius:9999, fontFamily:T.fB, fontSize:11.5, fontWeight:700, background:sc.bg, color:sc.color }}>{sc.label}</span>
                  {selected.activeRiskAlert && (
                    <span style={{ padding:"4px 11px", borderRadius:9999, fontFamily:T.fB, fontSize:11.5, fontWeight:700, background:T.errA, color:T.err, display:"flex", alignItems:"center", gap:4 }}>
                      <div style={{ width:6, height:6, borderRadius:"50%", background:T.err, animation:"pc-pulse 2s ease-in-out infinite" }}/>
                      Riesgo alto
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {altaBanner && <div style={{ padding:"0 0 0" }}>{altaBanner}</div>}

          <div style={{ display:"flex", overflowX:"auto", borderBottom:`1.5px solid ${T.bdrL}`, margin:"0 -16px", padding:"0 16px", WebkitOverflowScrolling:"touch", background:T.bg }}>
            {tabList.map(tab => (
              <button key={tab.id} onClick={() => h.setDetailTab(tab.id)}
                style={{ padding:"11px 14px", fontFamily:T.fB, fontSize:12.5, fontWeight:h.detailTab===tab.id ? 600 : 500,
                  color:h.detailTab===tab.id ? T.p : T.tm, background:"none", border:"none", borderBottom:`2.5px solid ${h.detailTab===tab.id ? T.p : "transparent"}`,
                  cursor:"pointer", whiteSpace:"nowrap", transition:"all .15s", flexShrink:0, marginBottom:-1.5 }}>
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ paddingTop:16 }}>{tabContent}</div>

          <div style={{ marginTop:24, paddingTop:16, borderTop:`1.5px solid ${T.bdrL}` }}>
            <details>
              <summary style={{ fontFamily:T.fB, fontSize:12, fontWeight:700, color:T.tm, textTransform:"uppercase", letterSpacing:"0.08em", cursor:"pointer", listStyle:"none", display:"flex", alignItems:"center", justifyContent:"space-between", paddingBottom:12 }}>
                <span>Información del expediente</span>
                <ChevronDown size={14} color={T.tl}/>
              </summary>
              <div style={{ paddingTop:8 }}>{sidebarContent}</div>
            </details>
          </div>

          {sharedModals}
        </div>
      );
    }

    // ── DESKTOP detail ─────────────────────────────────────────────────────────
    return (
      <div style={{ animation:"pc-fadeSlideUp .25s ease both" }}>
        {toasts}

        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, flexWrap:"wrap", gap:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <button onClick={() => h.setSelected(null)}
              style={{ display:"flex", alignItems:"center", gap:5, background:"none", border:`1.5px solid ${T.bdrL}`,
                borderRadius:9999, padding:"6px 14px",
                color:T.p, fontFamily:T.fB, fontSize:13, fontWeight:500, cursor:"pointer", transition:"all .15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor=T.p; e.currentTarget.style.background=T.pA; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor=T.bdrL; e.currentTarget.style.background="transparent"; }}>
              <ChevronLeft size={15}/> Volver
            </button>
            <div style={{ width:1, height:22, background:T.bdrL }}/>
            <h2 style={{ fontFamily:T.fH, fontSize:22, fontWeight:400, color:T.t, margin:0 }}>{selected.name}</h2>
            <Badge color={sc.color} bg={sc.bg}>{sc.label}</Badge>
            <Badge color={tc.color} bg={tc.bg}>{tc.label}</Badge>
          </div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", justifyContent:"flex-end" }}>
            <button onClick={() => h.handleSelect(selected, "sessions")}
              style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 14px", borderRadius:9999, border:"none", background:T.p, color:"#fff", fontFamily:T.fB, fontSize:12, fontWeight:700, cursor:"pointer", transition:"opacity .15s" }}
              onMouseEnter={e => e.currentTarget.style.opacity="0.87"}
              onMouseLeave={e => e.currentTarget.style.opacity="1"}>
              <Plus size={14}/> Nueva sesión
            </button>
            <button onClick={() => h.setDetailTab("payments")}
              style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 14px", borderRadius:9999, border:`1.5px solid ${T.bdr}`, background:"transparent", color:T.tm, fontFamily:T.fB, fontSize:12, fontWeight:600, cursor:"pointer", transition:"all .15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor=T.p; e.currentTarget.style.color=T.p; e.currentTarget.style.background=T.pA; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor=T.bdr; e.currentTarget.style.color=T.tm; e.currentTarget.style.background="transparent"; }}>
              <DollarSign size={13}/> Pagos
            </button>
            <button onClick={() => h.setDetailTab("tasks")}
              style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 14px", borderRadius:9999, border:`1.5px solid ${T.bdr}`, background:"transparent", color:T.tm, fontFamily:T.fB, fontSize:12, fontWeight:600, cursor:"pointer", transition:"all .15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor=T.p; e.currentTarget.style.color=T.p; e.currentTarget.style.background=T.pA; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor=T.bdr; e.currentTarget.style.color=T.tm; e.currentTarget.style.background="transparent"; }}>
              <ClipboardList size={13}/> Tareas
            </button>
            <WelcomeBtn pill={true}/>
            <button onClick={h.handleExportExpediente}
              style={{ display:"flex", alignItems:"center", gap:5, background:"transparent",
                border:`1.5px solid ${T.bdr}`, borderRadius:9999, padding:"7px 16px",
                fontFamily:T.fB, fontSize:12, fontWeight:600, color:T.tm, cursor:"pointer", transition:"all .15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor=T.p; e.currentTarget.style.color=T.p; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor=T.bdr; e.currentTarget.style.color=T.tm; }}>
              <Download size={13}/> Exportar PDF
            </button>
          </div>
        </div>

        {altaBanner}

        <div style={{ display:"grid", gridTemplateColumns:"minmax(0,280px) 1fr", gap:20, alignItems:"start" }}>
          <Card style={{ padding:20, position:"sticky", top:0, maxHeight:"calc(100vh - 120px)", overflowY:"auto" }}>
            {sidebarContent}
          </Card>
          <Card style={{ padding:24 }}>
            <Tabs tabs={tabList} active={h.detailTab} onChange={h.setDetailTab}/>
            {tabContent}
          </Card>
        </div>

        {sharedModals}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ── VISTA LISTA ───────────────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════════════

  const formModalContent = (
    <Modal
      open={h.showAdd}
      onClose={() => { h.setShowAdd(false); h.resetForm(); }}
      title={h.editTarget ? "Editar expediente" : "Expediente completo"}
    >
      <PatientFormContent
        form={h.form} fld={h.fld} setForm={h.setForm}
        services={services} save={h.save} editTarget={h.editTarget}
        onCancel={() => { h.setShowAdd(false); h.resetForm(); }}
      />
    </Modal>
  );

  // ── MOBILE list ─────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ margin:"-16px -16px 0" }}>
        <div style={{ background:T.nav, padding:"16px 16px 18px", position:"sticky", top:0, zIndex:20 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
            <div>
              <div style={{ fontFamily:T.fH, fontSize:26, fontWeight:400, color:"rgba(255,255,255,0.92)" }}>Pacientes</div>
              <div style={{ fontFamily:T.fB, fontSize:12, color:"rgba(255,255,255,0.38)", marginTop:1 }}>
                {patients.length} expediente{patients.length!==1?"s":""} · {patients.filter(p=>(p.status||"activo")==="activo").length} activos
              </div>
            </div>
            <button onClick={() => h.setShowPC(true)}
              style={{ width:42, height:42, borderRadius:13, background:T.acc,
                border:"none", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer",
                boxShadow:"0 4px 14px rgba(196,137,90,0.4)" }}>
              <Plus size={20} color="white"/>
            </button>
          </div>
          <div style={{ position:"relative" }}>
            <Search size={15} style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", color:"rgba(255,255,255,0.35)", pointerEvents:"none" }}/>
            <input value={h.search} onChange={e => h.setSearch(e.target.value)}
              placeholder="Buscar por nombre o diagnóstico…"
              style={{ width:"100%", padding:"11px 14px 11px 38px", background:"rgba(255,255,255,0.09)",
                border:"1.5px solid rgba(255,255,255,0.12)", borderRadius:12,
                fontFamily:T.fB, fontSize:14, color:"rgba(255,255,255,0.85)", outline:"none", boxSizing:"border-box" }}/>
          </div>
        </div>

        <div style={{ display:"flex", gap:7, padding:"10px 16px", overflowX:"auto", background:T.bg, WebkitOverflowScrolling:"touch", borderBottom:`1px solid ${T.bdrL}` }}>
          {[
            { id:"todos",    label:`Todos · ${patients.length}` },
            { id:"activos",  label:`Activos · ${h.chipCounts.activos}`, dot:T.suc },
            { id:"riesgo",   label:`Riesgo · ${h.chipCounts.riesgo}`, pulse:true },
            { id:"conSaldo", label:`💲 Saldo · ${h.chipCounts.conSaldo}` },
            { id:"alta",     label:`Alta · ${h.chipCounts.alta}` },
          ].map(chip => {
            const active = h.filterChip === chip.id;
            return (
              <button key={chip.id} onClick={() => h.setFilterChip(chip.id)}
                style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"6px 13px", borderRadius:9999,
                  fontFamily:T.fB, fontSize:11.5, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap", flexShrink:0,
                  border:`1.5px solid ${active ? T.p : T.bdrL}`,
                  background: active ? T.p : T.card,
                  color: active ? T.p : T.tm,
                  transition:"all .15s" }}>
                {chip.pulse && !active && <div style={{ width:7, height:7, borderRadius:"50%", background:T.err, animation:"pc-pulse 2s ease-in-out infinite", flexShrink:0 }}/>}
                {chip.dot && !chip.pulse && !active && <div style={{ width:7, height:7, borderRadius:"50%", background:chip.dot, flexShrink:0 }}/>}
                {chip.label}
              </button>
            );
          })}
        </div>

        <div style={{ padding:"10px 0 80px" }}>
          {h.filtered.length === 0 ? (
            <div style={{ padding:"48px 24px", textAlign:"center" }}>
              <EmptyState icon={Users} title="Sin pacientes" desc={h.search ? `Sin resultados para "${h.search}"` : "Agrega tu primer paciente"}/>
            </div>
          ) : h.filtered.map((p, idx) => {
            const sc          = STATUS_CONFIG[p.status||"activo"];
            const hasPend     = payments.some(py => py.patientId === p.id && py.status === "pendiente");
            const pendAmt     = payments.filter(py => py.patientId === p.id && py.status === "pendiente").reduce((s,py)=>s+Number(py.amount),0);
            const ptSess      = sessions.filter(s => s.patientId === p.id);
            const latestRisk  = riskAssessments.filter(r => r.patientId === p.id).sort((a,b)=>b.date.localeCompare(a.date))[0];
            const isHighRisk  = (latestRisk && (latestRisk.riskLevel === "alto" || latestRisk.riskLevel === "inminente")) || !!(p.activeRiskAlert);
            const avatarBg    = isHighRisk ? T.errA : T.pA;
            const avatarColor = isHighRisk ? T.err : T.p;
            const diagShort   = p.diagnosis ? p.diagnosis.split("—")[0].split("(")[0].trim().slice(0, 42) : null;

            return (
              <div key={p.id}
                style={{ margin:"0 12px 8px", background:T.card, borderRadius:18,
                  border:`1.5px solid ${isHighRisk ? T.errA : T.bdrL}`,
                  boxShadow:T.sh,
                  animation:`pc-fadeSlideUp .3s ${idx * 0.04}s ease both` }}>
                <div style={{ padding:"14px 16px", display:"flex", alignItems:"flex-start", gap:13 }}>
                  <div style={{ position:"relative", flexShrink:0 }}>
                    <div style={{ width:46, height:46, borderRadius:13, background:avatarBg,
                      display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <span style={{ fontFamily:T.fH, fontSize:21, color:avatarColor, lineHeight:1 }}>{p.name[0]}</span>
                    </div>
                    {isHighRisk && (
                      <div style={{ position:"absolute", bottom:-2, right:-2, width:12, height:12, borderRadius:"50%",
                        background:T.err, border:`2px solid ${T.card}`, animation:"pc-pulse 2s ease-in-out infinite" }}/>
                    )}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:7, flexWrap:"wrap" }}>
                      <span style={{ fontFamily:T.fH, fontSize:17.5, fontWeight:400, color:T.t, lineHeight:1.2 }}>{p.name}</span>
                      <Badge color={sc.color} bg={sc.bg}>{sc.label}</Badge>
                    </div>
                    <div style={{ fontFamily:T.fB, fontSize:12, color:T.tm, marginTop:3 }}>
                      {p.age ? `${p.age} años · ` : ""}{ptSess.length} ses.{hasPend ? ` · ` : ""}
                      {hasPend && <span style={{ color:T.war, fontWeight:700 }}>Saldo ${fmtCur ? fmtCur(pendAmt) : pendAmt.toLocaleString("es-MX")}</span>}
                    </div>
                    {diagShort && (
                      <div style={{ fontFamily:T.fB, fontSize:11.5, color:T.tl, marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{diagShort}</div>
                    )}
                  </div>
                </div>
                <div style={{ padding:"0 14px 13px", display:"flex", gap:7 }}>
                  <button onClick={() => h.handleSelect(p)}
                    style={{ flex:1, padding:"7px 0", borderRadius:10, border:`1.5px solid ${T.bdrL}`,
                      background:"transparent", color:T.tm, fontFamily:T.fB, fontSize:12.5, fontWeight:600, cursor:"pointer", transition:"all .15s" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor=T.p; e.currentTarget.style.color=T.p; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor=T.bdrL; e.currentTarget.style.color=T.tm; }}>
                    Ver expediente
                  </button>
                  <button onClick={() => h.handleSelect(p, "sessions")}
                    style={{ flex:1, padding:"7px 0", borderRadius:10, border:"none",
                      background:T.p, color:"#fff", fontFamily:T.fB, fontSize:12.5, fontWeight:700, cursor:"pointer", transition:"opacity .13s" }}
                    onMouseEnter={e => e.currentTarget.style.opacity="0.87"}
                    onMouseLeave={e => e.currentTarget.style.opacity="1"}>
                    + Sesión
                  </button>
                  <button onClick={() => h.handleSelect(p, "tasks")}
                    style={{ flex:1, padding:"7px 0", borderRadius:10, border:"none",
                      background:T.sucA, color:T.suc, fontFamily:T.fB, fontSize:12.5, fontWeight:700, cursor:"pointer", transition:"opacity .13s" }}
                    onMouseEnter={e => e.currentTarget.style.opacity="0.82"}
                    onMouseLeave={e => e.currentTarget.style.opacity="1"}>
                    Tareas
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {formModalContent}
        <PrimerContactoModal open={h.showPC} onClose={() => h.setShowPC(false)} patients={patients} onSave={h.savePrimerContacto} profile={profile}/>
      </div>
    );
  }

  // ── DESKTOP list ─────────────────────────────────────────────────────────────
  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, gap:16, flexWrap:"wrap" }}>
        <div>
          <h1 style={{ fontFamily:T.fH, fontSize:28, fontWeight:400, color:T.t, margin:0, lineHeight:1.1 }}>Pacientes</h1>
          <div style={{ fontFamily:T.fB, fontSize:13, color:T.tl, marginTop:4 }}>
            {patients.length} expediente{patients.length!==1?"s":""} · {patients.filter(p=>(p.status||"activo")==="activo").length} activos
          </div>
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <div style={{ position:"relative" }}>
            <Search size={15} style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", color:T.tl, pointerEvents:"none" }}/>
            <input value={h.search} onChange={e => h.setSearch(e.target.value)}
              placeholder="Buscar por nombre o diagnóstico…"
              style={{ padding:"10px 14px 10px 38px", border:`1.5px solid ${T.bdrL}`, borderRadius:12,
                fontFamily:T.fB, fontSize:13.5, color:T.t, background:T.card, outline:"none", width:260,
                boxShadow:T.sh, transition:"border-color .15s" }}
              onFocus={e => e.target.style.borderColor=T.p}
              onBlur={e => e.target.style.borderColor=T.bdrL}/>
          </div>
          <button onClick={() => h.setShowPC(true)}
            style={{ display:"flex", alignItems:"center", gap:7, padding:"9px 20px", borderRadius:9999,
              border:"none", background:T.acc, color:"#fff",
              fontFamily:T.fB, fontSize:13.5, fontWeight:600, cursor:"pointer",
              boxShadow:"0 3px 12px rgba(196,137,90,0.38)", transition:"opacity .13s", whiteSpace:"nowrap" }}
            onMouseEnter={e => e.currentTarget.style.opacity="0.87"}
            onMouseLeave={e => e.currentTarget.style.opacity="1"}>
            <Plus size={15}/> Nuevo paciente
          </button>
        </div>
      </div>

      <div style={{ display:"flex", gap:7, marginBottom:18, flexWrap:"wrap", alignItems:"center" }}>
        {[
          { id:"todos",    label:`Todos` },
          { id:"activos",  label:`Activos · ${h.chipCounts.activos}`, dot:T.suc },
          { id:"riesgo",   label:`Riesgo alto · ${h.chipCounts.riesgo}`, pulse:true },
          { id:"conSaldo", label:`Con saldo · ${h.chipCounts.conSaldo}` },
          { id:"alta",     label:`Alta · ${h.chipCounts.alta}` },
        ].map(chip => {
          const active = h.filterChip === chip.id;
          return (
            <button key={chip.id} onClick={() => h.setFilterChip(chip.id)}
              style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"6px 16px", borderRadius:9999,
                fontFamily:T.fB, fontSize:12.5, fontWeight:600, cursor:"pointer",
                border:`1.5px solid ${active ? T.p : T.bdrL}`,
                background: active ? T.p : T.card,
                color: active ? T.p : T.tm,
                transition:"all .15s", boxShadow:active ? "none" : T.sh }}>
              {chip.pulse && !active && <div style={{ width:7, height:7, borderRadius:"50%", background:T.err, animation:"pc-pulse 2s ease-in-out infinite" }}/>}
              {chip.dot && !chip.pulse && !active && <div style={{ width:7, height:7, borderRadius:"50%", background:chip.dot }}/>}
              {chip.label}
            </button>
          );
        })}
        <div style={{ flex:1 }}/>
        <span style={{ fontFamily:T.fB, fontSize:12, color:T.tl }}>
          {h.filtered.length} {h.filtered.length===1?"resultado":"resultados"}
        </span>
      </div>

      {h.filtered.length === 0 ? (
        <EmptyState icon={Users} title="Sin pacientes" desc={h.search ? `Sin resultados para "${h.search}"` : "Agrega tu primer paciente con el botón de arriba"}/>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {h.filtered.map((p, idx) => {
            const sc          = STATUS_CONFIG[p.status||"activo"];
            const tc          = TYPE_CONFIG[p.type||"individual"];
            const hasPend     = payments.some(py => py.patientId === p.id && py.status === "pendiente");
            const pendAmt     = payments.filter(py => py.patientId === p.id && py.status === "pendiente").reduce((s,py)=>s+Number(py.amount),0);
            const ptSess      = sessions.filter(s => s.patientId === p.id);
            const totalPaid   = payments.filter(py => py.patientId === p.id && py.status === "pagado").reduce((s,py)=>s+Number(py.amount),0);
            const latestRisk  = riskAssessments.filter(r => r.patientId === p.id).sort((a,b)=>b.date.localeCompare(a.date))[0];
            const isHighRisk  = (latestRisk && (latestRisk.riskLevel === "alto" || latestRisk.riskLevel === "inminente")) || !!(p.activeRiskAlert);
            const diagShort   = p.diagnosis ? p.diagnosis.split("—")[0].split("(")[0].trim() : null;
            const todayLocal  = new Date().toISOString().split("T")[0];
            const nextAppt    = appointments.filter(a => a.patientId === p.id && a.date >= todayLocal).sort((a,b) => a.date.localeCompare(b.date))[0];
            const nextApptLabel = nextAppt
              ? new Date(nextAppt.date + "T12:00").toLocaleDateString("es-MX", { day:"numeric", month:"short" })
              : null;
            const avatarBg    = isHighRisk ? T.errA : T.pA;
            const avatarColor = isHighRisk ? T.err : T.p;

            return (
              <div key={p.id}
                style={{ background:T.card, borderRadius:16,
                  border:`1.5px solid ${isHighRisk ? T.errA : T.bdrL}`,
                  boxShadow:T.sh, overflow:"hidden",
                  animation:`pc-fadeSlideUp .3s ${idx * 0.035}s ease both`,
                  transition:"border-color .15s, box-shadow .15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = isHighRisk ? T.errA : T.p.replace(")", ",0.35)"); e.currentTarget.style.boxShadow="0 4px 20px rgba(58,107,110,0.1)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = isHighRisk ? T.errA : T.bdrL; e.currentTarget.style.boxShadow=T.sh; }}>

                <div style={{ display:"flex", alignItems:"center", gap:16, padding:"16px 20px" }}>
                  <div style={{ position:"relative", flexShrink:0 }}>
                    <div style={{ width:52, height:52, borderRadius:15, background:avatarBg,
                      display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <span style={{ fontFamily:T.fH, fontSize:24, color:avatarColor, lineHeight:1 }}>{p.name[0]}</span>
                    </div>
                    {isHighRisk && (
                      <div style={{ position:"absolute", bottom:-2, right:-2, width:13, height:13, borderRadius:"50%",
                        background:T.err, border:`2px solid ${T.card}`, animation:"pc-pulse 2s ease-in-out infinite" }}/>
                    )}
                  </div>

                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:9, flexWrap:"wrap", marginBottom:3 }}>
                      <span style={{ fontFamily:T.fH, fontSize:19.5, fontWeight:400, color:T.t, lineHeight:1.15 }}>{p.name}</span>
                      <Badge color={sc.color} bg={sc.bg}>{sc.label}</Badge>
                      <Badge color={tc.color} bg={tc.bg}>{tc.label}</Badge>
                    </div>
                    <div style={{ fontFamily:T.fB, fontSize:12.5, color:T.tm }}>
                      {p.age ? `${p.age} años · ` : ""}
                      Desde {fmtDate(p.createdAt)}
                      {nextApptLabel && <span style={{ color:T.p }}> · Próx: {nextApptLabel}</span>}
                    </div>
                    {diagShort && (
                      <div style={{ fontFamily:T.fB, fontSize:12, color:T.tl, marginTop:2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:420 }}>
                        {p.cie11Code && <span style={{ fontFamily:"monospace", fontSize:10, fontWeight:700, color:T.p, background:T.pA, padding:"1px 5px", borderRadius:4, marginRight:5 }}>{p.cie11Code}</span>}
                        {diagShort}
                      </div>
                    )}
                  </div>

                  <div style={{ display:"flex", gap:20, flexShrink:0 }}>
                    <div style={{ textAlign:"center" }}>
                      <div style={{ fontFamily:T.fH, fontSize:22, color:T.t, lineHeight:1 }}>{ptSess.length}</div>
                      <div style={{ fontFamily:T.fB, fontSize:10, color:T.tl, textTransform:"uppercase", letterSpacing:"0.06em", marginTop:1 }}>Sesiones</div>
                    </div>
                    <div style={{ textAlign:"center" }}>
                      <div style={{ fontFamily:T.fH, fontSize:18, color:T.suc, lineHeight:1.1 }}>{fmtCur(totalPaid)}</div>
                      <div style={{ fontFamily:T.fB, fontSize:10, color:T.tl, textTransform:"uppercase", letterSpacing:"0.06em", marginTop:1 }}>Pagado</div>
                    </div>
                    {hasPend && (
                      <div style={{ textAlign:"center" }}>
                        <div style={{ fontFamily:T.fH, fontSize:18, color:T.war, lineHeight:1.1 }}>{fmtCur(pendAmt)}</div>
                        <div style={{ fontFamily:T.fB, fontSize:10, color:T.war, textTransform:"uppercase", letterSpacing:"0.06em", marginTop:1 }}>Pendiente</div>
                      </div>
                    )}
                  </div>

                  <div style={{ display:"flex", gap:7, flexShrink:0 }}>
                    <button onClick={() => h.handleSelect(p)}
                      style={{ display:"flex", alignItems:"center", gap:5, padding:"8px 16px", borderRadius:9999,
                        border:`1.5px solid ${T.bdrL}`, background:"transparent",
                        color:T.tm, fontFamily:T.fB, fontSize:12.5, fontWeight:600, cursor:"pointer", transition:"all .15s" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor=T.p; e.currentTarget.style.color=T.p; e.currentTarget.style.background=T.pA; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor=T.bdrL; e.currentTarget.style.color=T.tm; e.currentTarget.style.background="transparent"; }}>
                      <Eye size={13}/> Ver
                    </button>
                    <button onClick={() => h.handleSelect(p, "sessions")}
                      style={{ display:"flex", alignItems:"center", gap:5, padding:"8px 16px", borderRadius:9999,
                        border:"none", background:T.p, color:"#fff",
                        fontFamily:T.fB, fontSize:12.5, fontWeight:600, cursor:"pointer", transition:"opacity .13s" }}
                      onMouseEnter={e => e.currentTarget.style.opacity="0.87"}
                      onMouseLeave={e => e.currentTarget.style.opacity="1"}>
                      <Plus size={13}/> Nueva sesión
                    </button>
                    <button onClick={() => h.handleSelect(p, "tasks")}
                      style={{ display:"flex", alignItems:"center", gap:5, padding:"8px 16px", borderRadius:9999,
                        border:"none", background:T.sucA, color:T.suc,
                        fontFamily:T.fB, fontSize:12.5, fontWeight:700, cursor:"pointer", transition:"opacity .13s" }}
                      onMouseEnter={e => e.currentTarget.style.opacity="0.82"}
                      onMouseLeave={e => e.currentTarget.style.opacity="1"}>
                      Tareas
                    </button>
                    {hasPend && (
                      <button onClick={() => h.handleSelect(p, "payments")}
                        style={{ display:"flex", alignItems:"center", gap:5, padding:"8px 16px", borderRadius:9999,
                          border:"none", background:T.warA, color:T.war,
                          fontFamily:T.fB, fontSize:12.5, fontWeight:700, cursor:"pointer", transition:"opacity .13s" }}
                        onMouseEnter={e => e.currentTarget.style.opacity="0.8"}
                        onMouseLeave={e => e.currentTarget.style.opacity="1"}>
                        <DollarSign size={13}/> Registrar pago
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {formModalContent}
      <PrimerContactoModal open={h.showPC} onClose={() => h.setShowPC(false)} patients={patients} onSave={h.savePrimerContacto} profile={profile}/>
    </div>
  );
}
