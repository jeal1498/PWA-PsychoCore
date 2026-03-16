/**
 * SelfLog.jsx
 * Autorregistro del paciente — se abre desde URL ?selflog=TOKEN sin requerir PIN.
 * Datos guardados en localStorage bajo la clave "pc_pending_logs" (sin cifrar).
 * El terapeuta los revisa e importa desde la pestaña "Autorregistro" del paciente.
 */
import { useState, useEffect } from "react";
import { Plus, Trash2, Check, ChevronDown, ChevronUp, Send } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const PENDING_KEY = "pc_pending_logs";

export function readPendingLogs() {
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY) || "[]");
  } catch {
    return [];
  }
}

export function writePendingLogs(logs) {
  localStorage.setItem(PENDING_KEY, JSON.stringify(logs));
}

export function countPendingForToken(token) {
  return readPendingLogs().filter(l => l.patientToken === token).length;
}

export function getLogsForToken(token) {
  return readPendingLogs()
    .filter(l => l.patientToken === token)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function deleteLogsByToken(token) {
  writePendingLogs(readPendingLogs().filter(l => l.patientToken !== token));
}

export function deleteLogById(id) {
  writePendingLogs(readPendingLogs().filter(l => l.id !== id));
}

function uid() { return Math.random().toString(36).slice(2, 10); }
function todayStr() { return new Date().toISOString().split("T")[0]; }

// ─────────────────────────────────────────────────────────────────────────────
// COLORES (inline, sin imports de T para no requerir autenticación)
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  p:    "#3A6B6E",
  pA:   "rgba(58,107,110,0.10)",
  acc:  "#C4895A",
  accA: "rgba(196,137,90,0.10)",
  t:    "#1A2B28",
  tm:   "#5A7270",
  tl:   "#9BAFAD",
  bg:   "#F4F2EE",
  card: "#FFFFFF",
  bdr:  "#D8E2E0",
  bdrL: "#EDF1F0",
  suc:  "#4E8B5F",
  sucA: "rgba(78,139,95,0.10)",
  war:  "#B8900A",
  warA: "rgba(184,144,10,0.10)",
  err:  "#B85050",
  errA: "rgba(184,80,80,0.10)",
  fH:   "'Cormorant Garamond', Georgia, serif",
  fB:   "'DM Sans', system-ui, sans-serif",
};

// ─────────────────────────────────────────────────────────────────────────────
// EMOJI DE ESTADO EMOCIONAL
// ─────────────────────────────────────────────────────────────────────────────
const MOOD_EMOJIS = ["😔","😟","😕","😐","🙂","😊","😄","😁","🥰","🤩"];
function MoodScale({ value, onChange, label }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display:"block", fontFamily:C.fB, fontSize:12, fontWeight:700,
        color:C.tm, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:8 }}>
        {label}
      </label>
      <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
        {[1,2,3,4,5,6,7,8,9,10].map(n => {
          const sel = value === n;
          return (
            <button key={n} onClick={() => onChange(n)}
              style={{ flex:1, minWidth:32, padding:"8px 4px", border:`2px solid ${sel ? C.p : C.bdr}`,
                borderRadius:10, background:sel ? C.pA : "transparent", cursor:"pointer",
                fontFamily:C.fB, fontSize:12, fontWeight:sel ? 700 : 400,
                color:sel ? C.p : C.tm, transition:"all .13s", textAlign:"center" }}>
              <div style={{ fontSize:18, marginBottom:2 }}>{MOOD_EMOJIS[n-1]}</div>
              <div>{n}</div>
            </button>
          );
        })}
      </div>
      {value && (
        <div style={{ marginTop:6, fontFamily:C.fB, fontSize:12, color:C.p, textAlign:"center", fontWeight:600 }}>
          {value <= 3 ? "Bajo" : value <= 6 ? "Moderado" : value <= 8 ? "Bueno" : "Excelente"}
        </div>
      )}
    </div>
  );
}

function SimpleScale({ value, onChange, label, lowLabel, highLabel, color = C.p }) {
  return (
    <div style={{ marginBottom:18 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
        <label style={{ fontFamily:C.fB, fontSize:12, fontWeight:700, color:C.tm,
          textTransform:"uppercase", letterSpacing:"0.07em" }}>{label}</label>
        {value && <span style={{ fontFamily:C.fB, fontSize:13, fontWeight:700, color }}>{value}/10</span>}
      </div>
      <input type="range" min={1} max={10} step={1} value={value || 5}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width:"100%", accentColor:color, height:6, cursor:"pointer" }}/>
      <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
        <span style={{ fontFamily:C.fB, fontSize:10, color:C.tl }}>{lowLabel}</span>
        <span style={{ fontFamily:C.fB, fontSize:10, color:C.tl }}>{highLabel}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRO ABC (Beck)
// ─────────────────────────────────────────────────────────────────────────────
const BLANK_ABC = {
  id: "", situation: "", thoughts: "", emotions: "", emotionIntensity: 5,
  alternativeThought: "", effectIntensity: null,
};

function ABCRecord({ record, onChange, onDelete, index }) {
  const [expanded, setExpanded] = useState(true);
  const set = k => e => onChange({ ...record, [k]: e.target.value });

  const isComplete = record.situation.trim() && record.thoughts.trim() && record.emotions.trim();

  return (
    <div style={{ border:`1.5px solid ${isComplete ? C.p + "40" : C.bdr}`, borderRadius:12,
      overflow:"hidden", marginBottom:12, transition:"border .15s" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"10px 14px", background:isComplete ? C.pA : C.bdrL, cursor:"pointer" }}
        onClick={() => setExpanded(e => !e)}>
        <div style={{ fontFamily:C.fB, fontSize:13, fontWeight:600, color:C.t }}>
          Situación {index + 1}
          {record.situation && <span style={{ color:C.tm, fontWeight:400 }}>
            {" · "}{record.situation.slice(0,40)}{record.situation.length > 40 ? "…" : ""}
          </span>}
        </div>
        <div style={{ display:"flex", gap:6 }}>
          {expanded ? <ChevronUp size={14} color={C.tm}/> : <ChevronDown size={14} color={C.tl}/>}
          <button onClick={e => { e.stopPropagation(); onDelete(record.id); }}
            style={{ background:"none", border:"none", cursor:"pointer", color:C.tl, padding:"0 2px" }}>
            <Trash2 size={13}/>
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ padding:14, background:C.card }}>
          {/* A - Situación */}
          <div style={{ marginBottom:14, padding:"12px 14px", background:"rgba(91,141,184,0.06)",
            borderRadius:10, borderLeft:`3px solid #5B8DB8` }}>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#5B8DB8",
              textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>
              A — Situación activante
            </label>
            <textarea value={record.situation} onChange={set("situation")} rows={2}
              placeholder="¿Qué pasó? ¿Dónde estabas? ¿Con quién?"
              style={{ width:"100%", padding:"8px 10px", border:`1px solid ${C.bdr}`,
                borderRadius:8, fontFamily:C.fB, fontSize:13.5, color:C.t, background:C.card,
                outline:"none", resize:"vertical", boxSizing:"border-box", lineHeight:1.6 }}/>
          </div>

          {/* B - Pensamientos */}
          <div style={{ marginBottom:14, padding:"12px 14px", background:"rgba(184,144,10,0.06)",
            borderRadius:10, borderLeft:`3px solid ${C.war}` }}>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:C.war,
              textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>
              B — Pensamientos automáticos
            </label>
            <textarea value={record.thoughts} onChange={set("thoughts")} rows={2}
              placeholder="¿Qué pensamientos cruzaron tu mente? ¿Qué te dijiste a ti mismo/a?"
              style={{ width:"100%", padding:"8px 10px", border:`1px solid ${C.bdr}`,
                borderRadius:8, fontFamily:C.fB, fontSize:13.5, color:C.t, background:C.card,
                outline:"none", resize:"vertical", boxSizing:"border-box", lineHeight:1.6 }}/>
          </div>

          {/* C - Emociones */}
          <div style={{ marginBottom:14, padding:"12px 14px", background:C.errA,
            borderRadius:10, borderLeft:`3px solid ${C.err}` }}>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:C.err,
              textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>
              C — Consecuencias emocionales
            </label>
            <textarea value={record.emotions} onChange={set("emotions")} rows={2}
              placeholder="¿Qué emociones sentiste? (ej. ansiedad, tristeza, enojo, vergüenza)"
              style={{ width:"100%", padding:"8px 10px", border:`1px solid ${C.bdr}`,
                borderRadius:8, fontFamily:C.fB, fontSize:13.5, color:C.t, background:C.card,
                outline:"none", resize:"vertical", boxSizing:"border-box", lineHeight:1.6 }}/>
            <div style={{ marginTop:10 }}>
              <label style={{ fontFamily:C.fB, fontSize:11, color:C.err, fontWeight:600 }}>
                Intensidad de la emoción: {record.emotionIntensity}/10
              </label>
              <input type="range" min={1} max={10} value={record.emotionIntensity}
                onChange={e => onChange({ ...record, emotionIntensity: Number(e.target.value) })}
                style={{ width:"100%", accentColor:C.err, marginTop:4, cursor:"pointer" }}/>
            </div>
          </div>

          {/* D - Pensamiento alternativo */}
          <div style={{ padding:"12px 14px", background:C.sucA,
            borderRadius:10, borderLeft:`3px solid ${C.suc}` }}>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:C.suc,
              textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>
              D — Pensamiento alternativo <span style={{ fontWeight:400, textTransform:"none" }}>(opcional)</span>
            </label>
            <textarea value={record.alternativeThought} onChange={set("alternativeThought")} rows={2}
              placeholder="¿Hay una forma más equilibrada de ver esta situación?"
              style={{ width:"100%", padding:"8px 10px", border:`1px solid ${C.bdr}`,
                borderRadius:8, fontFamily:C.fB, fontSize:13.5, color:C.t, background:C.card,
                outline:"none", resize:"vertical", boxSizing:"border-box", lineHeight:1.6 }}/>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SELF-LOG PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function SelfLogPage({ token }) {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    date:        todayStr(),
    mood:        null,
    sleep:       5,
    stress:      5,
    energy:      5,
    notes:       "",
    activities:  "",
    abcRecords:  [],
  });

  const fld = k => v => setForm(f => ({ ...f, [k]: v }));
  const canSave = form.mood !== null;

  const addABC = () => {
    setForm(f => ({ ...f, abcRecords: [...f.abcRecords, { ...BLANK_ABC, id: "abc" + uid() }] }));
  };
  const updateABC = (updated) => {
    setForm(f => ({ ...f, abcRecords: f.abcRecords.map(r => r.id === updated.id ? updated : r) }));
  };
  const deleteABC = (id) => {
    setForm(f => ({ ...f, abcRecords: f.abcRecords.filter(r => r.id !== id) }));
  };

  const save = () => {
    if (!canSave) return;
    const logs  = readPendingLogs();
    const entry = { ...form, id: "sl" + uid(), patientToken: token, createdAt: new Date().toISOString() };
    writePendingLogs([...logs, entry]);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center",
        justifyContent:"center", padding:24, fontFamily:C.fB }}>
        <div style={{ background:C.card, borderRadius:20, padding:40, maxWidth:440, width:"100%",
          textAlign:"center", boxShadow:"0 8px 32px rgba(0,0,0,0.08)" }}>
          <div style={{ fontSize:56, marginBottom:16 }}>✅</div>
          <div style={{ fontFamily:C.fH, fontSize:28, fontWeight:600, color:C.p, marginBottom:10 }}>
            Registro enviado
          </div>
          <div style={{ fontFamily:C.fB, fontSize:14, color:C.tm, lineHeight:1.7, marginBottom:24 }}>
            Tu terapeuta recibirá este registro en la próxima sesión. ¡Gracias por tomarte el tiempo!
          </div>
          <button onClick={() => { setSubmitted(false); setForm({ date:todayStr(), mood:null, sleep:5, stress:5, energy:5, notes:"", activities:"", abcRecords:[] }); }}
            style={{ padding:"10px 24px", background:C.p, color:"#fff", border:"none", borderRadius:9999,
              fontFamily:C.fB, fontSize:14, fontWeight:600, cursor:"pointer" }}>
            Nuevo registro
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:C.fB }}>
      {/* Header */}
      <div style={{ background:C.t, padding:"18px 20px", position:"sticky", top:0, zIndex:10 }}>
        <div style={{ maxWidth:600, margin:"0 auto", display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:9, background:C.p, display:"flex",
            alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <span style={{ color:"#fff", fontSize:16 }}>📋</span>
          </div>
          <div>
            <div style={{ fontFamily:C.fH, fontSize:18, fontWeight:600, color:"#fff" }}>Mi diario terapéutico</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>Autorregistro privado</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth:600, margin:"0 auto", padding:"24px 16px 48px" }}>

        {/* Fecha */}
        <div style={{ background:C.card, borderRadius:14, padding:18, marginBottom:14,
          border:`1px solid ${C.bdrL}` }}>
          <label style={{ display:"block", fontSize:12, fontWeight:700, color:C.tm,
            textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:8 }}>Fecha</label>
          <input type="date" value={form.date} onChange={e => fld("date")(e.target.value)}
            style={{ width:"100%", padding:"9px 14px", border:`1.5px solid ${C.bdr}`,
              borderRadius:10, fontFamily:C.fB, fontSize:14, color:C.t, background:C.bg,
              outline:"none", boxSizing:"border-box" }}/>
        </div>

        {/* Estado emocional */}
        <div style={{ background:C.card, borderRadius:14, padding:18, marginBottom:14,
          border:`1px solid ${C.bdrL}` }}>
          <MoodScale value={form.mood} onChange={fld("mood")}
            label="¿Cómo te sientes hoy? *"/>
        </div>

        {/* Escalas */}
        <div style={{ background:C.card, borderRadius:14, padding:18, marginBottom:14,
          border:`1px solid ${C.bdrL}` }}>
          <SimpleScale value={form.sleep} onChange={fld("sleep")}
            label="Calidad del sueño" lowLabel="Muy mala" highLabel="Excelente"
            color="#7B68A8"/>
          <SimpleScale value={form.stress} onChange={fld("stress")}
            label="Nivel de estrés" lowLabel="Sin estrés" highLabel="Muy estresado/a"
            color={C.war}/>
          <SimpleScale value={form.energy} onChange={fld("energy")}
            label="Nivel de energía" lowLabel="Sin energía" highLabel="Muy activo/a"
            color={C.suc}/>
        </div>

        {/* Actividades */}
        <div style={{ background:C.card, borderRadius:14, padding:18, marginBottom:14,
          border:`1px solid ${C.bdrL}` }}>
          <label style={{ display:"block", fontSize:12, fontWeight:700, color:C.tm,
            textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:8 }}>
            Actividades del día
          </label>
          <textarea value={form.activities} onChange={e => fld("activities")(e.target.value)} rows={2}
            placeholder="¿Qué actividades realizaste hoy? ¿Hiciste las tareas acordadas con tu terapeuta?"
            style={{ width:"100%", padding:"10px 12px", border:`1.5px solid ${C.bdr}`,
              borderRadius:10, fontFamily:C.fB, fontSize:13.5, color:C.t, background:C.bg,
              outline:"none", resize:"vertical", boxSizing:"border-box", lineHeight:1.65 }}/>
        </div>

        {/* Notas libres */}
        <div style={{ background:C.card, borderRadius:14, padding:18, marginBottom:14,
          border:`1px solid ${C.bdrL}` }}>
          <label style={{ display:"block", fontSize:12, fontWeight:700, color:C.tm,
            textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:8 }}>
            Notas para mi terapeuta
          </label>
          <textarea value={form.notes} onChange={e => fld("notes")(e.target.value)} rows={3}
            placeholder="Escribe lo que quieras compartir: pensamientos, situaciones importantes, cómo te has sentido..."
            style={{ width:"100%", padding:"10px 12px", border:`1.5px solid ${C.bdr}`,
              borderRadius:10, fontFamily:C.fB, fontSize:13.5, color:C.t, background:C.bg,
              outline:"none", resize:"vertical", boxSizing:"border-box", lineHeight:1.65 }}/>
        </div>

        {/* ABC Records */}
        <div style={{ background:C.card, borderRadius:14, padding:18, marginBottom:20,
          border:`1px solid ${C.bdrL}` }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:C.tm, textTransform:"uppercase",
                letterSpacing:"0.07em" }}>Registro ABC de pensamientos</div>
              <div style={{ fontSize:11, color:C.tl, marginTop:2 }}>
                Situación → Pensamiento → Emoción (opcional)
              </div>
            </div>
            <button onClick={addABC}
              style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 12px",
                background:C.pA, border:`1.5px solid ${C.p}30`, borderRadius:9999,
                fontFamily:C.fB, fontSize:12, fontWeight:600, color:C.p, cursor:"pointer" }}>
              <Plus size={13}/> Agregar
            </button>
          </div>

          {form.abcRecords.length === 0 ? (
            <div style={{ padding:"20px 0", textAlign:"center", color:C.tl, fontFamily:C.fB, fontSize:13 }}>
              Puedes registrar pensamientos automáticos usando el método ABC.<br/>
              <span style={{ fontSize:12 }}>Toca "Agregar" para comenzar.</span>
            </div>
          ) : (
            form.abcRecords.map((r, idx) => (
              <ABCRecord key={r.id} record={r} index={idx} onChange={updateABC} onDelete={deleteABC}/>
            ))
          )}
        </div>

        {/* Submit */}
        {!canSave && (
          <div style={{ padding:"10px 14px", background:C.warA, borderRadius:10, marginBottom:14,
            fontFamily:C.fB, fontSize:12, color:C.war }}>
            Selecciona tu estado emocional (los emojis de arriba) para poder enviar el registro.
          </div>
        )}
        <button onClick={save} disabled={!canSave}
          style={{ width:"100%", padding:"14px", background:canSave ? C.p : C.bdr,
            color:canSave ? "#fff" : C.tl, border:"none", borderRadius:14,
            fontFamily:C.fB, fontSize:15, fontWeight:700, cursor:canSave ? "pointer" : "not-allowed",
            display:"flex", alignItems:"center", justifyContent:"center", gap:8, transition:"all .2s" }}>
          <Send size={16}/> Enviar registro a mi terapeuta
        </button>

        <div style={{ marginTop:16, padding:"12px 14px", background:C.pA, borderRadius:10,
          fontFamily:C.fB, fontSize:11, color:C.p, lineHeight:1.6, textAlign:"center" }}>
          🔒 Tus registros son privados y solo los verá tu terapeuta.
        </div>
      </div>
    </div>
  );
}
