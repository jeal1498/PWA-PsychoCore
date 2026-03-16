// ─────────────────────────────────────────────────────────────────────────────
// src/modules/PatientPortal.jsx
// Portal del paciente — acceso por número de teléfono
// URL: /p/{phone}
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { CheckCircle2, ChevronRight, ClipboardList, ArrowLeft, Send, Loader } from "lucide-react";
import { getAssignmentsByPhone, submitResponse } from "../lib/supabase.js";
import { getTemplate } from "../lib/taskTemplates.js";

// ── Helpers ───────────────────────────────────────────────────────────────────
const P = {
  bg:    "#F4F2EE",
  card:  "#FFFFFF",
  alt:   "#F9F8F5",
  p:     "#3A6B6E",
  pA:    "rgba(58,107,110,0.08)",
  acc:   "#C4895A",
  t:     "#1A2B28",
  tm:    "#5A7270",
  tl:    "#9BAFAD",
  suc:   "#4E8B5F",
  sucA:  "rgba(78,139,95,0.08)",
  bdr:   "#D8E2E0",
  bdrL:  "#EDF1F0",
  sh:    "0 2px 12px rgba(0,0,0,0.07)",
  fH:    '"Cormorant Garamond", Georgia, serif',
  fB:    '"DM Sans", system-ui, sans-serif',
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
    width: "100%", fontFamily: P.fB, fontSize: 15, color: P.t,
    background: P.alt, border: `1.5px solid ${P.bdr}`, borderRadius: 10,
    padding: "12px 14px", outline: "none", boxSizing: "border-box",
    lineHeight: 1.6, transition: "border .15s",
  };

  if (field.type === "textarea") return (
    <textarea value={value || ""} onChange={e => onChange(e.target.value)} placeholder={field.placeholder}
      rows={4} style={{ ...base, resize: "vertical" }}
      onFocus={e => e.target.style.borderColor = P.p}
      onBlur={e => e.target.style.borderColor = P.bdr}/>
  );

  if (field.type === "text") return (
    <input type="text" value={value || ""} onChange={e => onChange(e.target.value)} placeholder={field.placeholder}
      style={base}
      onFocus={e => e.target.style.borderColor = P.p}
      onBlur={e => e.target.style.borderColor = P.bdr}/>
  );

  if (field.type === "scale10") return (
    <div>
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:8 }}>
        {[1,2,3,4,5,6,7,8,9,10].map(n => {
          const active = Number(value) === n;
          const color = n <= 3 ? P.suc : n <= 6 ? "#B8900A" : "#B85050";
          return (
            <button key={n} onClick={() => onChange(n)}
              style={{ width:40, height:40, borderRadius:10, border:`2px solid ${active ? color : P.bdr}`,
                background: active ? color : P.alt, color: active ? "#fff" : P.tm,
                fontFamily: P.fB, fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "all .13s" }}>
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
            style={{ padding:"12px 16px", borderRadius:10, border:`2px solid ${active ? P.p : P.bdr}`,
              background: active ? P.pA : P.alt, color: active ? P.p : P.t,
              fontFamily: P.fB, fontSize: 14, fontWeight: active ? 600 : 400,
              cursor: "pointer", textAlign: "left", transition: "all .13s",
              display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:18, height:18, borderRadius:"50%", border:`2px solid ${active ? P.p : P.bdr}`,
              background: active ? P.p : "transparent", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
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

// ── Task Form ─────────────────────────────────────────────────────────────────
function TaskForm({ assignment, onBack, onSubmitted }) {
  const template = getTemplate(assignment.template_id);
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!template) return (
    <div style={{ padding:24, textAlign:"center", color:P.tm, fontFamily:P.fB }}>
      Plantilla no encontrada.
    </div>
  );

  const set = (key, val) => setValues(v => ({ ...v, [key]: val }));

  const filled = template.fields.filter(f => {
    const v = values[f.key];
    return v !== undefined && v !== "" && v !== null;
  }).length;
  const canSubmit = filled >= Math.ceil(template.fields.length / 2);

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      await submitResponse({
        assignmentId: assignment.id,
        patientPhone: assignment.patient_phone,
        responses: values,
      });
      onSubmitted();
    } catch (e) {
      setError("Ocurrió un error al guardar. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:"100vh", background:P.bg, fontFamily:P.fB }}>
      {/* Header */}
      <div style={{ background:P.p, padding:"16px 20px 20px", color:"#fff" }}>
        <button onClick={onBack}
          style={{ background:"rgba(255,255,255,0.15)", border:"none", borderRadius:8, padding:"6px 12px",
            color:"#fff", fontFamily:P.fB, fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", gap:6, marginBottom:14 }}>
          <ArrowLeft size={14}/> Volver
        </button>
        <div style={{ fontSize:28 }}>{template.icon}</div>
        <h2 style={{ fontFamily:P.fH, fontSize:24, fontWeight:600, margin:"6px 0 4px" }}>{template.title}</h2>
        <p style={{ fontSize:13, opacity:0.8, lineHeight:1.5 }}>{template.description}</p>
      </div>

      {/* Instructions note */}
      {assignment.notes && (
        <div style={{ margin:"16px 20px 0", padding:"12px 16px", background:"rgba(196,137,90,0.08)", borderRadius:10, border:`1.5px solid rgba(196,137,90,0.2)` }}>
          <div style={{ fontSize:11, fontWeight:700, color:P.acc, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:4 }}>Nota de tu psicóloga</div>
          <p style={{ fontSize:13.5, color:P.t, lineHeight:1.6 }}>{assignment.notes}</p>
        </div>
      )}

      {/* Fields */}
      <div style={{ padding:"20px 20px 100px" }}>
        {template.fields.map((field, i) => (
          <div key={field.key} style={{ marginBottom:24 }}>
            <div style={{ display:"flex", gap:8, alignItems:"flex-start", marginBottom:10 }}>
              <div style={{ width:22, height:22, borderRadius:"50%", background:P.pA, color:P.p, fontFamily:P.fB, fontSize:11, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1 }}>{i+1}</div>
              <label style={{ fontFamily:P.fB, fontSize:14.5, fontWeight:600, color:P.t, lineHeight:1.5 }}>{field.label}</label>
            </div>
            <FieldInput field={field} value={values[field.key]} onChange={v => set(field.key, v)}/>
          </div>
        ))}

        {error && (
          <div style={{ padding:"12px 16px", background:"rgba(184,80,80,0.08)", borderRadius:10, border:"1.5px solid rgba(184,80,80,0.2)", fontFamily:P.fB, fontSize:13, color:"#B85050", marginBottom:16 }}>
            {error}
          </div>
        )}

        <button onClick={handleSubmit} disabled={!canSubmit || loading}
          style={{ width:"100%", padding:"16px", borderRadius:14, border:"none",
            background: canSubmit && !loading ? P.p : P.bdr,
            color: canSubmit && !loading ? "#fff" : P.tl,
            fontFamily:P.fB, fontSize:15, fontWeight:700, cursor: canSubmit && !loading ? "pointer" : "not-allowed",
            display:"flex", alignItems:"center", justifyContent:"center", gap:8, transition:"all .15s" }}>
          {loading ? <><Loader size={16} style={{ animation:"spin 0.8s linear infinite" }}/> Guardando...</> : <><Send size={15}/> Enviar respuesta</>}
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

// ── Task card in list ─────────────────────────────────────────────────────────
function TaskCard({ assignment, onOpen }) {
  const template = getTemplate(assignment.template_id);
  const done = assignment.status === "completed";
  const date = new Date(assignment.assigned_at).toLocaleDateString("es-MX", { day:"numeric", month:"long" });

  return (
    <div onClick={done ? undefined : onOpen}
      style={{ background:P.card, borderRadius:16, padding:"18px 18px", marginBottom:12,
        boxShadow:P.sh, border:`1.5px solid ${done ? P.bdrL : P.bdr}`,
        opacity: done ? 0.7 : 1, cursor: done ? "default" : "pointer",
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
      <div>
        {done
          ? <div style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 10px", borderRadius:9999, background:P.sucA }}>
              <CheckCircle2 size={14} color={P.suc}/>
              <span style={{ fontFamily:P.fB, fontSize:11, fontWeight:700, color:P.suc }}>Completada</span>
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
    <div style={{ minHeight:"100vh", background:P.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:32, textAlign:"center" }}>
      <div style={{ fontSize:64, marginBottom:20 }}>🎉</div>
      <h2 style={{ fontFamily:P.fH, fontSize:28, color:P.t, marginBottom:12 }}>¡Tarea enviada!</h2>
      <p style={{ fontFamily:P.fB, fontSize:15, color:P.tm, lineHeight:1.6, marginBottom:32, maxWidth:280 }}>
        Tu psicóloga podrá revisar tus respuestas antes de la próxima sesión.
      </p>
      <button onClick={onBack}
        style={{ padding:"14px 28px", borderRadius:12, border:`1.5px solid ${P.p}`, background:"transparent",
          color:P.p, fontFamily:P.fB, fontSize:14, fontWeight:600, cursor:"pointer" }}>
        Ver mis tareas
      </button>
    </div>
  );
}

// ── Main portal ───────────────────────────────────────────────────────────────
export default function PatientPortal({ phone: phoneProp }) {
  const [phone,       setPhone]       = useState(phoneProp || "");
  const [inputPhone,  setInputPhone]  = useState("");
  const [verified,    setVerified]    = useState(!!phoneProp);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [assignments, setAssignments] = useState([]);
  const [selected,    setSelected]    = useState(null);  // assignment abierto
  const [submitted,   setSubmitted]   = useState(false);

  // Si viene phone en la URL, cargar directo
  useEffect(() => {
    if (phoneProp) loadTasks(phoneProp);
  }, [phoneProp]);

  const loadTasks = async (p) => {
    setLoading(true);
    setError("");
    try {
      const data = await getAssignmentsByPhone(p);
      setAssignments(data);
      setPhone(p);
      setVerified(true);
    } catch {
      setError("No se pudieron cargar las tareas. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    const clean = inputPhone.replace(/\D/g, "");
    if (clean.length < 10) { setError("Ingresa un número válido (10 dígitos mínimo)"); return; }
    // Normalizar: si no tiene lada internacional, agregar 52 (México)
    const normalized = clean.length === 10 ? `52${clean}` : clean;
    await loadTasks(normalized);
    if (!verified) setError("Número no encontrado. Verifica con tu psicóloga que esté registrado correctamente.");
  };

  const handleSubmitted = () => {
    setSubmitted(true);
  };

  const handleBackFromSubmit = () => {
    setSubmitted(false);
    setSelected(null);
    loadTasks(phone);
  };

  // ── Submitted confirmation ───────────────────────────────────────────────
  if (submitted) return <SuccessScreen onBack={handleBackFromSubmit}/>;

  // ── Task form open ───────────────────────────────────────────────────────
  if (selected) return (
    <TaskForm
      assignment={selected}
      onBack={() => setSelected(null)}
      onSubmitted={handleSubmitted}
    />
  );

  // ── Phone verification ────────────────────────────────────────────────────
  if (!verified) return (
    <div style={{ minHeight:"100vh", background:P.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"32px 24px", fontFamily:P.fB }}>
      <div style={{ width:"100%", maxWidth:380 }}>
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:40 }}>
          <div style={{ width:64, height:64, borderRadius:18, background:P.p, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
            <ClipboardList size={28} color="#fff" strokeWidth={1.5}/>
          </div>
          <h1 style={{ fontFamily:P.fH, fontSize:30, fontWeight:600, color:P.t, marginBottom:6 }}>Mis Tareas</h1>
          <p style={{ fontSize:14, color:P.tm, lineHeight:1.5 }}>Ingresa tu número de celular para acceder a las tareas que te asignó tu psicóloga.</p>
        </div>

        {/* Input */}
        <div style={{ background:P.card, borderRadius:16, padding:"24px 20px", boxShadow:P.sh }}>
          <label style={{ display:"block", fontSize:11, fontWeight:700, color:P.tm, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:8 }}>
            Número de celular
          </label>
          <input
            type="tel"
            value={inputPhone}
            onChange={e => { setInputPhone(e.target.value); setError(""); }}
            onKeyDown={e => e.key === "Enter" && handleVerify()}
            placeholder="Ej. 998 123 4567"
            style={{ width:"100%", padding:"14px 16px", border:`2px solid ${error ? "#B85050" : P.bdr}`, borderRadius:10,
              fontFamily:P.fB, fontSize:16, color:P.t, background:P.alt, outline:"none",
              boxSizing:"border-box", marginBottom:8 }}
            autoFocus
          />
          {error && <p style={{ fontSize:13, color:"#B85050", marginBottom:12 }}>{error}</p>}
          <button onClick={handleVerify} disabled={loading}
            style={{ width:"100%", padding:"14px", borderRadius:12, border:"none",
              background:P.p, color:"#fff", fontFamily:P.fB, fontSize:15, fontWeight:700,
              cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            {loading ? <><Loader size={16} style={{ animation:"spin 0.8s linear infinite" }}/> Buscando...</> : "Acceder →"}
          </button>
        </div>

        <p style={{ textAlign:"center", fontSize:12, color:P.tl, marginTop:20, lineHeight:1.5 }}>
          Si tienes problemas para acceder, contacta a tu psicóloga para verificar el número registrado.
        </p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // ── Task list ─────────────────────────────────────────────────────────────
  const pending   = assignments.filter(a => a.status === "pending");
  const completed = assignments.filter(a => a.status === "completed");
  const name      = assignments[0]?.patient_name?.split(" ")[0] || "hola";

  return (
    <div style={{ minHeight:"100vh", background:P.bg, fontFamily:P.fB }}>
      {/* Header */}
      <div style={{ background:P.p, padding:"24px 20px 28px", color:"#fff" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
          <div style={{ width:40, height:40, borderRadius:12, background:"rgba(255,255,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <ClipboardList size={20} color="#fff" strokeWidth={1.5}/>
          </div>
          <div>
            <div style={{ fontSize:12, opacity:0.7, fontWeight:400 }}>Mis Tareas</div>
            <div style={{ fontFamily:P.fH, fontSize:20, fontWeight:600, lineHeight:1.2 }}>¡Hola, {name}!</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:12 }}>
          <div style={{ flex:1, background:"rgba(255,255,255,0.1)", borderRadius:10, padding:"10px 14px", textAlign:"center" }}>
            <div style={{ fontSize:22, fontWeight:700 }}>{pending.length}</div>
            <div style={{ fontSize:11, opacity:0.8 }}>Pendiente{pending.length !== 1 ? "s" : ""}</div>
          </div>
          <div style={{ flex:1, background:"rgba(255,255,255,0.1)", borderRadius:10, padding:"10px 14px", textAlign:"center" }}>
            <div style={{ fontSize:22, fontWeight:700 }}>{completed.length}</div>
            <div style={{ fontSize:11, opacity:0.8 }}>Completada{completed.length !== 1 ? "s" : ""}</div>
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
