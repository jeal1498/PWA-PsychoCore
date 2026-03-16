// ─────────────────────────────────────────────────────────────────────────────
// src/modules/PatientPortal.jsx
// Portal del paciente — login por número de teléfono
// URL: /p  (sin número en la URL)
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { CheckCircle2, ChevronRight, ClipboardList, ArrowLeft, Send, Loader } from "lucide-react";
import { getAssignmentsByPhone, submitResponse } from "../lib/supabase.js";
import { getTemplate } from "../lib/taskTemplates.js";

// ── Design tokens ─────────────────────────────────────────────────────────────
const P = {
  bg:   "#F4F2EE",
  card: "#FFFFFF",
  alt:  "#F9F8F5",
  p:    "#3A6B6E",
  pA:   "rgba(58,107,110,0.08)",
  acc:  "#C4895A",
  t:    "#1A2B28",
  tm:   "#5A7270",
  tl:   "#9BAFAD",
  suc:  "#4E8B5F",
  sucA: "rgba(78,139,95,0.08)",
  err:  "#B85050",
  errA: "rgba(184,80,80,0.08)",
  bdr:  "#D8E2E0",
  bdrL: "#EDF1F0",
  sh:   "0 2px 12px rgba(0,0,0,0.07)",
  fH:   '"Cormorant Garamond", Georgia, serif',
  fB:   '"DM Sans", system-ui, sans-serif',
};

function Spinner() {
  return (
    <div style={{ display:"flex", justifyContent:"center", padding:"40px 0" }}>
      <div style={{ width:36, height:36, borderRadius:"50%", border:`3px solid ${P.bdrL}`, borderTopColor:P.p, animation:"spin 0.8s linear infinite" }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── Field renderers ───────────────────────────────────────────────────────────
function FieldInput({ field, value, onChange }) {
  const base = {
    width:"100%", fontFamily:P.fB, fontSize:15, color:P.t,
    background:P.alt, border:`1.5px solid ${P.bdr}`, borderRadius:10,
    padding:"12px 14px", outline:"none", boxSizing:"border-box",
    lineHeight:1.6, transition:"border .15s",
  };

  if (field.type === "textarea") return (
    <textarea value={value||""} onChange={e => onChange(e.target.value)}
      placeholder={field.placeholder} rows={4}
      style={{ ...base, resize:"vertical" }}
      onFocus={e => e.target.style.borderColor=P.p}
      onBlur={e  => e.target.style.borderColor=P.bdr}/>
  );

  if (field.type === "text") return (
    <input type="text" value={value||""} onChange={e => onChange(e.target.value)}
      placeholder={field.placeholder} style={base}
      onFocus={e => e.target.style.borderColor=P.p}
      onBlur={e  => e.target.style.borderColor=P.bdr}/>
  );

  if (field.type === "scale10") return (
    <div>
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:8 }}>
        {[1,2,3,4,5,6,7,8,9,10].map(n => {
          const active = Number(value) === n;
          const color  = n<=3 ? P.suc : n<=6 ? "#B8900A" : P.err;
          return (
            <button key={n} onClick={() => onChange(n)}
              style={{ width:40, height:40, borderRadius:10,
                border:`2px solid ${active ? color : P.bdr}`,
                background:active ? color : P.alt,
                color:active ? "#fff" : P.tm,
                fontFamily:P.fB, fontSize:14, fontWeight:700,
                cursor:"pointer", transition:"all .13s" }}>
              {n}
            </button>
          );
        })}
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", fontFamily:P.fB, fontSize:11, color:P.tl }}>
        <span>Leve</span><span>Moderado</span><span>Intenso</span>
      </div>
    </div>
  );

  if (field.type === "choice") return (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      {field.options.map(opt => {
        const active = value === opt;
        return (
          <button key={opt} onClick={() => onChange(opt)}
            style={{ padding:"12px 16px", borderRadius:10,
              border:`2px solid ${active ? P.p : P.bdr}`,
              background:active ? P.pA : P.alt,
              color:active ? P.p : P.t,
              fontFamily:P.fB, fontSize:14, fontWeight:active?600:400,
              cursor:"pointer", textAlign:"left", transition:"all .13s",
              display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:18, height:18, borderRadius:"50%",
              border:`2px solid ${active ? P.p : P.bdr}`,
              background:active ? P.p : "transparent",
              flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
              {active && <div style={{ width:8, height:8, borderRadius:"50%", background:"#fff" }}/>}
            </div>
            {opt}
          </button>
        );
      })}
    </div>
  );

  return null;
}

// ── Task form ─────────────────────────────────────────────────────────────────
function TaskForm({ assignment, onBack, onSubmitted }) {
  const template = getTemplate(assignment.template_id);
  const [values,  setValues]  = useState({});
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  if (!template) return (
    <div style={{ padding:24, textAlign:"center", color:P.tm, fontFamily:P.fB }}>
      Plantilla no encontrada.
    </div>
  );

  const set = (key, val) => setValues(v => ({ ...v, [key]:val }));
  const filled    = template.fields.filter(f => values[f.key] !== undefined && values[f.key] !== "" && values[f.key] !== null).length;
  const canSubmit = filled >= Math.ceil(template.fields.length / 2);

  const handleSubmit = async () => {
    setLoading(true); setError("");
    try {
      await submitResponse({ assignmentId:assignment.id, patientPhone:assignment.patient_phone, responses:values });
      onSubmitted();
    } catch {
      setError("Ocurrió un error al guardar. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:"100vh", background:P.bg, fontFamily:P.fB }}>
      {/* Header */}
      <div style={{ background:P.p, padding:"16px 20px 24px", color:"#fff" }}>
        <button onClick={onBack}
          style={{ background:"rgba(255,255,255,0.15)", border:"none", borderRadius:8, padding:"6px 12px",
            color:"#fff", fontFamily:P.fB, fontSize:13, cursor:"pointer",
            display:"flex", alignItems:"center", gap:6, marginBottom:14 }}>
          <ArrowLeft size={14}/> Volver
        </button>
        <div style={{ fontSize:28 }}>{template.icon}</div>
        <h2 style={{ fontFamily:P.fH, fontSize:24, fontWeight:600, margin:"6px 0 4px" }}>{template.title}</h2>
        <p style={{ fontSize:13, opacity:0.8, lineHeight:1.5 }}>{template.description}</p>
      </div>

      {assignment.notes && (
        <div style={{ margin:"16px 20px 0", padding:"12px 16px",
          background:"rgba(196,137,90,0.08)", borderRadius:10,
          border:"1.5px solid rgba(196,137,90,0.2)" }}>
          <div style={{ fontSize:11, fontWeight:700, color:P.acc, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:4 }}>Nota de tu psicóloga</div>
          <p style={{ fontSize:13.5, color:P.t, lineHeight:1.6 }}>{assignment.notes}</p>
        </div>
      )}

      <div style={{ padding:"20px 20px 100px" }}>
        {template.fields.map((field, i) => (
          <div key={field.key} style={{ marginBottom:24 }}>
            <div style={{ display:"flex", gap:8, alignItems:"flex-start", marginBottom:10 }}>
              <div style={{ width:22, height:22, borderRadius:"50%", background:P.pA, color:P.p,
                fontFamily:P.fB, fontSize:11, fontWeight:700, display:"flex",
                alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1 }}>
                {i+1}
              </div>
              <label style={{ fontFamily:P.fB, fontSize:14.5, fontWeight:600, color:P.t, lineHeight:1.5 }}>
                {field.label}
              </label>
            </div>
            <FieldInput field={field} value={values[field.key]} onChange={v => set(field.key, v)}/>
          </div>
        ))}

        {error && (
          <div style={{ padding:"12px 16px", background:P.errA, borderRadius:10,
            border:"1.5px solid rgba(184,80,80,0.2)", fontFamily:P.fB, fontSize:13, color:P.err, marginBottom:16 }}>
            {error}
          </div>
        )}

        <button onClick={handleSubmit} disabled={!canSubmit || loading}
          style={{ width:"100%", padding:"16px", borderRadius:14, border:"none",
            background: canSubmit && !loading ? P.p : P.bdr,
            color: canSubmit && !loading ? "#fff" : P.tl,
            fontFamily:P.fB, fontSize:15, fontWeight:700,
            cursor: canSubmit && !loading ? "pointer" : "not-allowed",
            display:"flex", alignItems:"center", justifyContent:"center", gap:8, transition:"all .15s" }}>
          {loading
            ? <><Loader size={16} style={{ animation:"spin 0.8s linear infinite" }}/> Guardando...</>
            : <><Send size={15}/> Enviar respuesta</>}
        </button>
        {!canSubmit && (
          <p style={{ textAlign:"center", fontFamily:P.fB, fontSize:12, color:P.tl, marginTop:10 }}>
            Responde al menos {Math.ceil(template.fields.length / 2)} preguntas para poder enviar
          </p>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── Task card ─────────────────────────────────────────────────────────────────
function TaskCard({ assignment, onOpen }) {
  const template = getTemplate(assignment.template_id);
  const done     = assignment.status === "completed";
  const date     = new Date(assignment.assigned_at).toLocaleDateString("es-MX", { day:"numeric", month:"long" });

  return (
    <div onClick={done ? undefined : onOpen}
      style={{ background:P.card, borderRadius:16, padding:"18px 18px", marginBottom:12,
        boxShadow:P.sh, border:`1.5px solid ${done ? P.bdrL : P.bdr}`,
        opacity:done ? 0.7 : 1, cursor:done ? "default" : "pointer",
        transition:"all .15s", display:"flex", alignItems:"center", gap:14 }}>
      <div style={{ fontSize:28, lineHeight:1 }}>{template?.icon || "📋"}</div>
      <div style={{ flex:1 }}>
        <div style={{ fontFamily:P.fB, fontSize:15, fontWeight:600, color:P.t, marginBottom:3 }}>
          {assignment.title}
        </div>
        <div style={{ fontFamily:P.fB, fontSize:12, color:P.tl }}>Asignada el {date}</div>
        {assignment.notes && (
          <div style={{ fontFamily:P.fB, fontSize:12, color:P.tm, marginTop:4, lineHeight:1.4,
            overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>
            {assignment.notes}
          </div>
        )}
      </div>
      <div style={{ flexShrink:0 }}>
        {done
          ? <div style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 10px", borderRadius:9999, background:P.sucA }}>
              <CheckCircle2 size={14} color={P.suc}/>
              <span style={{ fontFamily:P.fB, fontSize:11, fontWeight:700, color:P.suc }}>Lista</span>
            </div>
          : <ChevronRight size={18} color={P.tl}/>
        }
      </div>
    </div>
  );
}

// ── Success screen ────────────────────────────────────────────────────────────
function SuccessScreen({ onBack }) {
  return (
    <div style={{ minHeight:"100vh", background:P.bg, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", padding:32, textAlign:"center" }}>
      <div style={{ fontSize:64, marginBottom:20 }}>🎉</div>
      <h2 style={{ fontFamily:P.fH, fontSize:28, color:P.t, marginBottom:12 }}>¡Tarea enviada!</h2>
      <p style={{ fontFamily:P.fB, fontSize:15, color:P.tm, lineHeight:1.6, marginBottom:32, maxWidth:280 }}>
        Tu psicóloga podrá revisar tus respuestas antes de la próxima sesión.
      </p>
      <button onClick={onBack}
        style={{ padding:"14px 28px", borderRadius:12, border:`1.5px solid ${P.p}`,
          background:"transparent", color:P.p, fontFamily:P.fB, fontSize:14, fontWeight:600, cursor:"pointer" }}>
        Ver mis tareas
      </button>
    </div>
  );
}

// ── Login screen ──────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const handleAccess = async () => {
    const clean = input.replace(/\D/g, "");
    if (clean.length < 10) { setError("Ingresa un número válido (10 dígitos mínimo)"); return; }
    const normalized = clean;
    setLoading(true); setError("");
    try {
      const data = await getAssignmentsByPhone(normalized);
      if (data.length === 0) {
        setError("Número no encontrado. Verifica con tu psicóloga que esté registrado correctamente.");
        return;
      }
      onLogin(normalized, data);
    } catch {
      setError("No se pudo conectar. Revisa tu internet e intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:"100vh", background:P.bg, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", padding:"32px 24px", fontFamily:P.fB }}>

      {/* Decorative top bar */}
      <div style={{ position:"fixed", top:0, left:0, right:0, height:4, background:`linear-gradient(90deg, ${P.p}, #5A9497)` }}/>

      <div style={{ width:"100%", maxWidth:380 }}>

        {/* Logo + welcome */}
        <div style={{ textAlign:"center", marginBottom:40 }}>
          <div style={{ width:72, height:72, borderRadius:20, background:P.p,
            display:"flex", alignItems:"center", justifyContent:"center",
            margin:"0 auto 20px", boxShadow:`0 8px 24px rgba(58,107,110,0.3)` }}>
            <ClipboardList size={32} color="#fff" strokeWidth={1.5}/>
          </div>
          <h1 style={{ fontFamily:P.fH, fontSize:32, fontWeight:600, color:P.t, marginBottom:8 }}>
            Mis Tareas
          </h1>
          <p style={{ fontSize:14, color:P.tm, lineHeight:1.6, maxWidth:280, margin:"0 auto" }}>
            Accede a las actividades que tu psicóloga preparó especialmente para ti.
          </p>
        </div>

        {/* Card */}
        <div style={{ background:P.card, borderRadius:20, padding:"28px 24px", boxShadow:`0 4px 24px rgba(0,0,0,0.08)` }}>
          <label style={{ display:"block", fontSize:11, fontWeight:700, color:P.tm,
            textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>
            Tu número de celular
          </label>
          <input
            type="tel"
            value={input}
            onChange={e => { setInput(e.target.value); setError(""); }}
            onKeyDown={e => e.key === "Enter" && handleAccess()}
            placeholder="Ej. 998 123 4567"
            style={{ width:"100%", padding:"14px 16px",
              border:`2px solid ${error ? P.err : P.bdr}`, borderRadius:12,
              fontFamily:P.fB, fontSize:16, color:P.t, background:P.alt,
              outline:"none", boxSizing:"border-box", marginBottom:error?8:16,
              transition:"border .15s" }}
            autoFocus
          />
          {error && (
            <p style={{ fontSize:13, color:P.err, marginBottom:16, lineHeight:1.4 }}>{error}</p>
          )}
          <button onClick={handleAccess} disabled={loading}
            style={{ width:"100%", padding:"15px", borderRadius:12, border:"none",
              background: loading ? P.bdr : P.p,
              color: loading ? P.tl : "#fff",
              fontFamily:P.fB, fontSize:15, fontWeight:700,
              cursor: loading ? "not-allowed" : "pointer",
              display:"flex", alignItems:"center", justifyContent:"center", gap:8,
              transition:"all .15s", boxShadow: loading ? "none" : `0 4px 12px rgba(58,107,110,0.3)` }}>
            {loading
              ? <><Loader size={16} style={{ animation:"spin 0.8s linear infinite" }}/> Buscando...</>
              : "Entrar →"
            }
          </button>
        </div>

        <p style={{ textAlign:"center", fontSize:12, color:P.tl, marginTop:24, lineHeight:1.6 }}>
          Si tienes problemas para entrar, contacta a tu psicóloga para verificar el número registrado.
        </p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── Task list ─────────────────────────────────────────────────────────────────
function TaskList({ phone, assignments: initial, onLogout }) {
  const [assignments, setAssignments] = useState(initial);
  const [selected,    setSelected]    = useState(null);
  const [submitted,   setSubmitted]   = useState(false);
  const [loading,     setLoading]     = useState(false);

  const reload = async () => {
    setLoading(true);
    try {
      const data = await getAssignmentsByPhone(phone);
      setAssignments(data);
    } catch {} finally { setLoading(false); }
  };

  const handleSubmitted = () => setSubmitted(true);

  const handleBackFromSubmit = () => {
    setSubmitted(false);
    setSelected(null);
    reload();
  };

  if (submitted) return <SuccessScreen onBack={handleBackFromSubmit}/>;
  if (selected)  return <TaskForm assignment={selected} onBack={() => setSelected(null)} onSubmitted={handleSubmitted}/>;

  const pending   = assignments.filter(a => a.status === "pending");
  const completed = assignments.filter(a => a.status === "completed");
  const name      = assignments[0]?.patient_name?.split(" ")[0] || "";

  return (
    <div style={{ minHeight:"100vh", background:P.bg, fontFamily:P.fB }}>
      {/* Header */}
      <div style={{ background:P.p, padding:"24px 20px 28px", color:"#fff" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:42, height:42, borderRadius:13, background:"rgba(255,255,255,0.15)",
              display:"flex", alignItems:"center", justifyContent:"center" }}>
              <ClipboardList size={20} color="#fff" strokeWidth={1.5}/>
            </div>
            <div>
              <div style={{ fontSize:11, opacity:0.7, fontWeight:400 }}>Mis Tareas</div>
              <div style={{ fontFamily:P.fH, fontSize:20, fontWeight:600, lineHeight:1.2 }}>
                {name ? `¡Hola, ${name}!` : "Bienvenida"}
              </div>
            </div>
          </div>
          <button onClick={onLogout}
            style={{ background:"rgba(255,255,255,0.12)", border:"none", borderRadius:8,
              padding:"6px 12px", color:"rgba(255,255,255,0.8)", fontFamily:P.fB, fontSize:12, cursor:"pointer" }}>
            Salir
          </button>
        </div>
        <div style={{ display:"flex", gap:12 }}>
          <div style={{ flex:1, background:"rgba(255,255,255,0.1)", borderRadius:10, padding:"10px 14px", textAlign:"center" }}>
            <div style={{ fontSize:22, fontWeight:700 }}>{pending.length}</div>
            <div style={{ fontSize:11, opacity:0.8 }}>Pendiente{pending.length!==1?"s":""}</div>
          </div>
          <div style={{ flex:1, background:"rgba(255,255,255,0.1)", borderRadius:10, padding:"10px 14px", textAlign:"center" }}>
            <div style={{ fontSize:22, fontWeight:700 }}>{completed.length}</div>
            <div style={{ fontSize:11, opacity:0.8 }}>Completada{completed.length!==1?"s":""}</div>
          </div>
        </div>
      </div>

      <div style={{ padding:"20px 16px" }}>
        {loading && <Spinner/>}

        {!loading && assignments.length === 0 && (
          <div style={{ textAlign:"center", padding:"60px 20px", color:P.tm }}>
            <div style={{ fontSize:48, marginBottom:16 }}>📋</div>
            <div style={{ fontFamily:P.fH, fontSize:22, color:P.t, marginBottom:8 }}>Sin tareas por ahora</div>
            <div style={{ fontSize:14, lineHeight:1.6 }}>Tu psicóloga te asignará tareas después de cada sesión.</div>
          </div>
        )}

        {pending.length > 0 && (
          <>
            <div style={{ fontSize:11, fontWeight:700, color:P.tm, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:12 }}>
              Por completar
            </div>
            {pending.map(a => <TaskCard key={a.id} assignment={a} onOpen={() => setSelected(a)}/>)}
          </>
        )}

        {completed.length > 0 && (
          <>
            <div style={{ fontSize:11, fontWeight:700, color:P.tl, textTransform:"uppercase", letterSpacing:"0.08em", margin:"24px 0 12px" }}>
              Completadas
            </div>
            {completed.map(a => <TaskCard key={a.id} assignment={a} onOpen={() => {}}/>)}
          </>
        )}
      </div>
    </div>
  );
}

// ── Root portal component ─────────────────────────────────────────────────────
export default function PatientPortal() {
  const [phone,       setPhone]       = useState(null);
  const [assignments, setAssignments] = useState([]);

  const handleLogin = (normalizedPhone, data) => {
    setPhone(normalizedPhone);
    setAssignments(data);
  };

  if (!phone) return <LoginScreen onLogin={handleLogin}/>;

  return (
    <TaskList
      phone={phone}
      assignments={assignments}
      onLogout={() => { setPhone(null); setAssignments([]); }}
    />
  );
}
