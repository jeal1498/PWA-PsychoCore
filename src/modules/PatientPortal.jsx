// ─────────────────────────────────────────────────────────────────────────────
// src/modules/PatientPortal.jsx
// Portal del paciente — login por número de teléfono
// URL: /p  (sin número en la URL)
//
// NUEVAS FUNCIONES requeridas en ../lib/supabase.js:
//   getConsentByPhone(phone)      → { signed, signedAt, signatureDataUrl, signedBy, sections } | null
//   savePatientConsent(phone, {}) → guarda consent en campo JSONB del paciente
//   getAppointmentsByPhone(phone) → [ { date, start_time, session_type, status }, ... ]
//
// NOTA: ConsentSectionAccordion y SignatureCanvas se reimplementan aquí porque
// no están exportados en Consent.jsx. DEFAULT_CONSENT_SECTIONS sí lo está.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef, useCallback } from "react";
import {
  CheckCircle2, ChevronRight, ClipboardList, ArrowLeft, Send, Loader,
  FileText, Calendar, ChevronDown, ChevronUp, PenLine, Trash2,
} from "lucide-react";
import {
  getAssignmentsByPhone,
  submitResponse,
  getConsentByPhone,
  savePatientConsent,
  getAppointmentsByPhone,
} from "../lib/supabase.js";
import { getTemplate } from "../lib/taskTemplates.js";
import { DEFAULT_CONSENT_SECTIONS } from "./Consent.jsx";

// ── Design tokens ─────────────────────────────────────────────────────────────
const P = {
  bg:   "#F4F2EE",
  card: "#FFFFFF",
  alt:  "#F9F8F5",
  p:    "#3A6B6E",
  pA:   "rgba(58,107,110,0.08)",
  acc:  "#C4895A",
  accA: "rgba(196,137,90,0.08)",
  t:    "#1A2B28",
  tm:   "#5A7270",
  tl:   "#9BAFAD",
  suc:  "#4E8B5F",
  sucA: "rgba(78,139,95,0.08)",
  war:  "#B8900A",
  warA: "rgba(184,144,10,0.08)",
  err:  "#B85050",
  errA: "rgba(184,80,80,0.08)",
  bdr:  "#D8E2E0",
  bdrL: "#EDF1F0",
  sh:   "0 2px 12px rgba(0,0,0,0.07)",
  fH:   '"Cormorant Garamond", Georgia, serif',
  fB:   '"DM Sans", system-ui, sans-serif',
};

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div style={{ display:"flex", justifyContent:"center", padding:"40px 0" }}>
      <div style={{
        width:36, height:36, borderRadius:"50%",
        border:`3px solid ${P.bdrL}`, borderTopColor:P.p,
        animation:"spin 0.8s linear infinite",
      }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── SignatureCanvas (reimplementación local con tokens P) ─────────────────────
function SignatureCanvas({ onSigned, onClear, hasSignature }) {
  const canvasRef = useRef(null);
  const drawing   = useRef(false);
  const lastPos   = useRef({ x:0, y:0 });

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const src  = e.touches ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left) * (canvas.width  / rect.width),
      y: (src.clientY - rect.top)  * (canvas.height / rect.height),
    };
  };

  const startDraw = useCallback((e) => {
    e.preventDefault();
    drawing.current = true;
    lastPos.current = getPos(e, canvasRef.current);
  }, []);

  const draw = useCallback((e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");
    const pos    = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = P.t;
    ctx.lineWidth   = 2.2;
    ctx.lineCap     = "round";
    ctx.lineJoin    = "round";
    ctx.stroke();
    lastPos.current = pos;
  }, []);

  const endDraw = useCallback(() => {
    if (!drawing.current) return;
    drawing.current = false;
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");
    const data   = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const hasInk = data.some((v, i) => i % 4 === 3 && v > 0);
    if (hasInk) onSigned(canvas.toDataURL("image/png"));
  }, [onSigned]);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    onClear();
  }, [onClear]);

  return (
    <div>
      <div style={{
        position:"relative",
        border:`2px dashed ${hasSignature ? P.suc : P.bdr}`,
        borderRadius:12,
        background: hasSignature ? P.sucA : P.alt,
        overflow:"hidden",
        transition:"all .2s",
      }}>
        <canvas
          ref={canvasRef}
          width={560}
          height={140}
          style={{ display:"block", width:"100%", height:140, cursor:"crosshair", touchAction:"none" }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
        {!hasSignature && (
          <div style={{
            position:"absolute", inset:0,
            display:"flex", alignItems:"center", justifyContent:"center",
            pointerEvents:"none",
          }}>
            <div style={{ textAlign:"center" }}>
              <PenLine size={22} color={P.tl} strokeWidth={1.5} style={{ marginBottom:6 }}/>
              <div style={{ fontFamily:P.fB, fontSize:12, color:P.tl }}>Dibuja tu firma aquí</div>
            </div>
          </div>
        )}
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:8 }}>
        <span style={{ fontFamily:P.fB, fontSize:11, color:P.tl }}>
          Usa tu dedo o el mouse para firmar
        </span>
        <button onClick={clear}
          style={{
            display:"flex", alignItems:"center", gap:5,
            background:"none", border:"none", cursor:"pointer",
            fontFamily:P.fB, fontSize:12, color:P.tm,
          }}>
          <Trash2 size={12}/> Borrar
        </button>
      </div>
    </div>
  );
}

// ── ConsentSectionAccordion (reimplementación local, solo readOnly) ────────────
const SECTION_LABELS = {
  naturaleza:       "1. Naturaleza del proceso terapéutico",
  confidencialidad: "2. Confidencialidad y sus límites",
  honorarios:       "3. Honorarios y política de cancelación",
  duracion:         "4. Duración estimada del tratamiento",
  derechos:         "5. Derechos del paciente",
  digital:          "6. Uso de herramientas digitales",
};

function ConsentSectionAccordion({ sections }) {
  const [openKey, setOpenKey] = useState(null);
  const keys = Object.keys(SECTION_LABELS);

  return (
    <div style={{ border:`1px solid ${P.bdr}`, borderRadius:12, overflow:"hidden" }}>
      {Object.entries(SECTION_LABELS).map(([key, label], idx) => {
        const isOpen = openKey === key;
        const text   = sections?.[key] || DEFAULT_CONSENT_SECTIONS[key] || "";
        return (
          <div key={key} style={{
            borderBottom: idx < keys.length - 1 ? `1px solid ${P.bdrL}` : "none",
          }}>
            <button
              onClick={() => setOpenKey(isOpen ? null : key)}
              style={{
                display:"flex", alignItems:"center", justifyContent:"space-between",
                width:"100%", padding:"13px 16px",
                background: isOpen ? P.pA : P.card,
                border:"none", cursor:"pointer",
                fontFamily:P.fB, fontSize:13,
                fontWeight: isOpen ? 600 : 400,
                color: isOpen ? P.p : P.t,
                transition:"background .15s",
                textAlign:"left", gap:8,
              }}>
              <span>{label}</span>
              {isOpen
                ? <ChevronUp size={14} color={P.tm}/>
                : <ChevronDown size={14} color={P.tl}/>
              }
            </button>
            {isOpen && (
              <div style={{ padding:"0 16px 16px" }}>
                <p style={{
                  fontFamily:P.fB, fontSize:13, color:P.t,
                  lineHeight:1.75, margin:0,
                }}>
                  {text}
                </p>
              </div>
            )}
          </div>
        );
      })}
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
              style={{
                width:40, height:40, borderRadius:10,
                border:`2px solid ${active ? color : P.bdr}`,
                background:active ? color : P.alt,
                color:active ? "#fff" : P.tm,
                fontFamily:P.fB, fontSize:14, fontWeight:700,
                cursor:"pointer", transition:"all .13s",
              }}>
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
            style={{
              padding:"12px 16px", borderRadius:10,
              border:`2px solid ${active ? P.p : P.bdr}`,
              background:active ? P.pA : P.alt,
              color:active ? P.p : P.t,
              fontFamily:P.fB, fontSize:14, fontWeight:active?600:400,
              cursor:"pointer", textAlign:"left", transition:"all .13s",
              display:"flex", alignItems:"center", gap:10,
            }}>
            <div style={{
              width:18, height:18, borderRadius:"50%",
              border:`2px solid ${active ? P.p : P.bdr}`,
              background:active ? P.p : "transparent",
              flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center",
            }}>
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
      await submitResponse({
        assignmentId:  assignment.id,
        patientPhone:  assignment.patient_phone,
        responses:     values,
      });
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
          style={{
            background:"rgba(255,255,255,0.15)", border:"none", borderRadius:8,
            padding:"6px 12px", color:"#fff", fontFamily:P.fB, fontSize:13,
            cursor:"pointer", display:"flex", alignItems:"center", gap:6, marginBottom:14,
          }}>
          <ArrowLeft size={14}/> Volver
        </button>
        <div style={{ fontSize:28 }}>{template.icon}</div>
        <h2 style={{ fontFamily:P.fH, fontSize:24, fontWeight:600, margin:"6px 0 4px" }}>
          {template.title}
        </h2>
        <p style={{ fontSize:13, opacity:0.8, lineHeight:1.5 }}>{template.description}</p>
      </div>

      {assignment.notes && (
        <div style={{
          margin:"16px 20px 0", padding:"12px 16px",
          background:"rgba(196,137,90,0.08)", borderRadius:10,
          border:"1.5px solid rgba(196,137,90,0.2)",
        }}>
          <div style={{ fontSize:11, fontWeight:700, color:P.acc, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:4 }}>
            Nota de tu psicóloga
          </div>
          <p style={{ fontSize:13.5, color:P.t, lineHeight:1.6 }}>{assignment.notes}</p>
        </div>
      )}

      <div style={{ padding:"20px 20px 100px" }}>
        {template.fields.map((field, i) => (
          <div key={field.key} style={{ marginBottom:24 }}>
            <div style={{ display:"flex", gap:8, alignItems:"flex-start", marginBottom:10 }}>
              <div style={{
                width:22, height:22, borderRadius:"50%", background:P.pA, color:P.p,
                fontFamily:P.fB, fontSize:11, fontWeight:700,
                display:"flex", alignItems:"center", justifyContent:"center",
                flexShrink:0, marginTop:1,
              }}>
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
          <div style={{
            padding:"12px 16px", background:P.errA, borderRadius:10,
            border:"1.5px solid rgba(184,80,80,0.2)",
            fontFamily:P.fB, fontSize:13, color:P.err, marginBottom:16,
          }}>
            {error}
          </div>
        )}

        <button onClick={handleSubmit} disabled={!canSubmit || loading}
          style={{
            width:"100%", padding:"16px", borderRadius:14, border:"none",
            background: canSubmit && !loading ? P.p : P.bdr,
            color: canSubmit && !loading ? "#fff" : P.tl,
            fontFamily:P.fB, fontSize:15, fontWeight:700,
            cursor: canSubmit && !loading ? "pointer" : "not-allowed",
            display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            transition:"all .15s",
          }}>
          {loading
            ? <><Loader size={16} style={{ animation:"spin 0.8s linear infinite" }}/> Guardando...</>
            : <><Send size={15}/> Enviar respuesta</>
          }
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
      style={{
        background:P.card, borderRadius:16, padding:"18px 18px", marginBottom:12,
        boxShadow:P.sh, border:`1.5px solid ${done ? P.bdrL : P.bdr}`,
        opacity:done ? 0.7 : 1, cursor:done ? "default" : "pointer",
        transition:"all .15s", display:"flex", alignItems:"center", gap:14,
      }}>
      <div style={{ fontSize:28, lineHeight:1 }}>{template?.icon || "📋"}</div>
      <div style={{ flex:1 }}>
        <div style={{ fontFamily:P.fB, fontSize:15, fontWeight:600, color:P.t, marginBottom:3 }}>
          {assignment.title}
        </div>
        <div style={{ fontFamily:P.fB, fontSize:12, color:P.tl }}>Asignada el {date}</div>
        {assignment.notes && (
          <div style={{
            fontFamily:P.fB, fontSize:12, color:P.tm, marginTop:4, lineHeight:1.4,
            overflow:"hidden", display:"-webkit-box",
            WebkitLineClamp:2, WebkitBoxOrient:"vertical",
          }}>
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

// ── Success screen (tarea enviada) ────────────────────────────────────────────
function SuccessScreen({ onBack }) {
  return (
    <div style={{
      minHeight:"100vh", background:P.bg,
      display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      padding:32, textAlign:"center",
    }}>
      <div style={{ fontSize:64, marginBottom:20 }}>🎉</div>
      <h2 style={{ fontFamily:P.fH, fontSize:28, color:P.t, marginBottom:12 }}>¡Tarea enviada!</h2>
      <p style={{ fontFamily:P.fB, fontSize:15, color:P.tm, lineHeight:1.6, marginBottom:32, maxWidth:280 }}>
        Tu psicóloga podrá revisar tus respuestas antes de la próxima sesión.
      </p>
      <button onClick={onBack}
        style={{
          padding:"14px 28px", borderRadius:12,
          border:`1.5px solid ${P.p}`,
          background:"transparent", color:P.p,
          fontFamily:P.fB, fontSize:14, fontWeight:600, cursor:"pointer",
        }}>
        Ver mis tareas
      </button>
    </div>
  );
}

// ── Consent done screen ───────────────────────────────────────────────────────
function ConsentDoneScreen({ onBack }) {
  return (
    <div style={{
      minHeight:"100vh", background:P.bg,
      display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      padding:32, textAlign:"center",
    }}>
      <div style={{ fontSize:64, marginBottom:20 }}>✅</div>
      <h2 style={{ fontFamily:P.fH, fontSize:28, color:P.t, marginBottom:12 }}>
        ¡Gracias!
      </h2>
      <p style={{ fontFamily:P.fB, fontSize:15, color:P.tm, lineHeight:1.6, marginBottom:32, maxWidth:300 }}>
        Tu consentimiento ha sido registrado. Tu psicólogo(a) ha sido notificado(a).
      </p>
      <button onClick={onBack}
        style={{
          padding:"14px 28px", borderRadius:12,
          border:`1.5px solid ${P.p}`,
          background:"transparent", color:P.p,
          fontFamily:P.fB, fontSize:14, fontWeight:600, cursor:"pointer",
        }}>
        Volver a mis tareas
      </button>
    </div>
  );
}

// ── Consent sign screen ───────────────────────────────────────────────────────
function ConsentSignScreen({ phone, consentSections, onBack, onSigned }) {
  const [checked,    setChecked]    = useState(false);
  const [sigDataUrl, setSigDataUrl] = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");

  const canSign = checked && !!sigDataUrl;

  const handleSign = async () => {
    setLoading(true);
    setError("");
    try {
      await savePatientConsent(phone, {
        signed:           true,
        signedAt:         new Date().toISOString(),
        signatureDataUrl: sigDataUrl,
        signedBy:         "patient",
      });
      onSigned();
    } catch {
      setError("No se pudo guardar tu firma. Verifica tu conexión e intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:"100vh", background:P.bg, fontFamily:P.fB }}>
      {/* Header */}
      <div style={{ background:P.p, padding:"16px 20px 24px", color:"#fff" }}>
        <button onClick={onBack}
          style={{
            background:"rgba(255,255,255,0.15)", border:"none", borderRadius:8,
            padding:"6px 12px", color:"#fff", fontFamily:P.fB, fontSize:13,
            cursor:"pointer", display:"flex", alignItems:"center", gap:6, marginBottom:14,
          }}>
          <ArrowLeft size={14}/> Volver
        </button>
        <div style={{ fontSize:28 }}>📄</div>
        <h2 style={{ fontFamily:P.fH, fontSize:24, fontWeight:600, margin:"6px 0 4px" }}>
          Consentimiento Informado
        </h2>
        <p style={{ fontSize:13, opacity:0.8, lineHeight:1.5 }}>
          Lee el documento completo antes de firmar.
        </p>
      </div>

      <div style={{ padding:"20px 16px 100px" }}>

        {/* Documento */}
        <div style={{ marginBottom:24 }}>
          <div style={{
            fontSize:11, fontWeight:700, color:P.tm,
            textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:12,
          }}>
            Contenido del documento
          </div>
          <ConsentSectionAccordion sections={consentSections}/>
        </div>

        {/* Checkbox de lectura */}
        <div
          onClick={() => setChecked(v => !v)}
          style={{
            display:"flex", alignItems:"flex-start", gap:12,
            padding:"14px 16px", borderRadius:12,
            border:`1.5px solid ${checked ? P.p : P.bdr}`,
            background: checked ? P.pA : P.card,
            cursor:"pointer", marginBottom:24,
            transition:"all .15s",
          }}>
          <div style={{
            width:20, height:20, borderRadius:6, flexShrink:0, marginTop:1,
            border:`2px solid ${checked ? P.p : P.bdr}`,
            background: checked ? P.p : "transparent",
            display:"flex", alignItems:"center", justifyContent:"center",
            transition:"all .15s",
          }}>
            {checked && (
              <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                <path d="M1 4L4 7.5L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
          <span style={{ fontFamily:P.fB, fontSize:14, color: checked ? P.p : P.t, lineHeight:1.5, fontWeight: checked ? 600 : 400 }}>
            He leído y entendido el contenido de este documento.
          </span>
        </div>

        {/* Canvas de firma */}
        <div style={{ marginBottom:24 }}>
          <div style={{
            fontSize:11, fontWeight:700, color:P.tm,
            textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:12,
          }}>
            Tu firma digital
          </div>
          <div style={{ opacity: checked ? 1 : 0.4, pointerEvents: checked ? "auto" : "none", transition:"opacity .2s" }}>
            <SignatureCanvas
              onSigned={setSigDataUrl}
              onClear={() => setSigDataUrl(null)}
              hasSignature={!!sigDataUrl}
            />
          </div>
          {!checked && (
            <p style={{ fontFamily:P.fB, fontSize:12, color:P.tl, marginTop:8, textAlign:"center" }}>
              Confirma que leíste el documento para habilitar la firma.
            </p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding:"12px 16px", background:P.errA, borderRadius:10,
            border:"1.5px solid rgba(184,80,80,0.2)",
            fontFamily:P.fB, fontSize:13, color:P.err, marginBottom:16,
          }}>
            {error}
          </div>
        )}

        {/* Botón firmar */}
        <button onClick={handleSign} disabled={!canSign || loading}
          style={{
            width:"100%", padding:"16px", borderRadius:14, border:"none",
            background: canSign && !loading ? P.suc : P.bdr,
            color: canSign && !loading ? "#fff" : P.tl,
            fontFamily:P.fB, fontSize:15, fontWeight:700,
            cursor: canSign && !loading ? "pointer" : "not-allowed",
            display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            transition:"all .2s",
            boxShadow: canSign && !loading ? `0 4px 14px rgba(78,139,95,0.3)` : "none",
          }}>
          {loading
            ? <><Loader size={16} style={{ animation:"spin 0.8s linear infinite" }}/> Guardando firma...</>
            : <><PenLine size={15}/> Firmar y enviar</>
          }
        </button>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── Appointments section ──────────────────────────────────────────────────────
const CANCELLED_STATUSES = new Set([
  "cancelada_paciente", "cancelada_psicologa",
  "cancelled_patient",  "cancelled_therapist",
  "cancelada", "cancelled",
]);

function apptStatusDisplay(status) {
  const s = (status || "").toLowerCase();
  if (s.includes("confirm")) return { label:"Confirmada", color:P.suc,  bg:P.sucA };
  return                             { label:"Pendiente",  color:P.war,  bg:P.warA };
}

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : str;
}

function AppointmentsSection({ phone }) {
  const [appointments, setAppointments] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(false);
      try {
        const data = await getAppointmentsByPhone(phone);
        if (cancelled) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const upcoming = (data || [])
          .filter(a => {
            const d = new Date(a.date);
            return d >= today && !CANCELLED_STATUSES.has((a.status || "").toLowerCase());
          })
          .sort((a, b) => new Date(a.date) - new Date(b.date));

        setAppointments(upcoming);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [phone]);

  if (loading) return <Spinner/>;

  if (error) return (
    <div style={{
      textAlign:"center", padding:"32px 20px",
      fontFamily:P.fB, fontSize:14, color:P.err,
      background:P.errA, borderRadius:14,
    }}>
      No se pudieron cargar tus citas. Contacta a tu psicólogo(a).
    </div>
  );

  if (appointments.length === 0) return (
    <div style={{ textAlign:"center", padding:"60px 20px", color:P.tm }}>
      <div style={{ fontSize:48, marginBottom:16 }}>📅</div>
      <div style={{ fontFamily:P.fH, fontSize:22, color:P.t, marginBottom:8 }}>Sin citas próximas</div>
      <div style={{ fontSize:14, lineHeight:1.6 }}>No tienes citas próximas agendadas.</div>
    </div>
  );

  return (
    <div>
      {appointments.map((appt, i) => {
        const dateStr   = capitalize(
          new Date(appt.date + "T12:00:00").toLocaleDateString("es-MX", {
            weekday:"long", day:"numeric", month:"long",
          })
        );
        const timeStr   = appt.start_time || appt.time || "";
        const typeStr   = appt.session_type || appt.type || "Consulta";
        const st        = apptStatusDisplay(appt.status);

        return (
          <div key={appt.id || i}
            style={{
              background:P.card, borderRadius:16, padding:"18px",
              marginBottom:12, boxShadow:P.sh,
              border:`1.5px solid ${P.bdr}`,
              display:"flex", alignItems:"flex-start", gap:14,
            }}>
            {/* Icono / fecha visual */}
            <div style={{
              flexShrink:0, width:48, height:48, borderRadius:12,
              background:P.pA,
              display:"flex", flexDirection:"column",
              alignItems:"center", justifyContent:"center",
            }}>
              <Calendar size={20} color={P.p} strokeWidth={1.6}/>
            </div>

            {/* Datos */}
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:P.fB, fontSize:15, fontWeight:600, color:P.t, marginBottom:2 }}>
                {dateStr}
              </div>
              {timeStr && (
                <div style={{ fontFamily:P.fB, fontSize:13, color:P.tm, marginBottom:4 }}>
                  {timeStr}
                </div>
              )}
              <div style={{ fontFamily:P.fB, fontSize:12, color:P.tl }}>
                {typeStr}
              </div>
            </div>

            {/* Estado */}
            <div style={{
              flexShrink:0,
              padding:"4px 10px", borderRadius:9999,
              background:st.bg,
              fontFamily:P.fB, fontSize:11, fontWeight:700, color:st.color,
            }}>
              {st.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Consent banner (tarjeta prioritaria en TaskList) ──────────────────────────
function ConsentBanner({ onReview }) {
  return (
    <div style={{
      background:"#FFF8F0",
      border:`1.5px solid rgba(196,137,90,0.35)`,
      borderRadius:16,
      padding:"16px 18px",
      marginBottom:20,
      display:"flex", alignItems:"flex-start", gap:14,
    }}>
      <div style={{
        flexShrink:0, width:42, height:42, borderRadius:12,
        background:"rgba(196,137,90,0.12)",
        display:"flex", alignItems:"center", justifyContent:"center",
      }}>
        <FileText size={20} color={P.acc} strokeWidth={1.6}/>
      </div>
      <div style={{ flex:1 }}>
        <div style={{
          fontFamily:P.fB, fontSize:11, fontWeight:700,
          color:P.acc, textTransform:"uppercase",
          letterSpacing:"0.07em", marginBottom:4,
        }}>
          Acción requerida
        </div>
        <p style={{
          fontFamily:P.fB, fontSize:13.5, color:P.t,
          lineHeight:1.55, margin:"0 0 12px",
        }}>
          Tu psicólogo(a) solicita que firmes el Consentimiento Informado antes de tu primera sesión.
        </p>
        <button onClick={onReview}
          style={{
            padding:"9px 16px", borderRadius:9999, border:"none",
            background:P.acc, color:"#fff",
            fontFamily:P.fB, fontSize:13, fontWeight:700,
            cursor:"pointer", display:"inline-flex", alignItems:"center", gap:6,
            boxShadow:"0 3px 10px rgba(196,137,90,0.3)",
          }}>
          <PenLine size={13}/> Revisar y firmar
        </button>
      </div>
    </div>
  );
}

// ── Task list ─────────────────────────────────────────────────────────────────
function TaskList({ phone, assignments: initial, onLogout }) {
  const [assignments, setAssignments] = useState(initial);
  const [selected,    setSelected]    = useState(null);
  const [submitted,   setSubmitted]   = useState(false);
  const [loading,     setLoading]     = useState(false);

  // Tabs
  const [activeTab,   setActiveTab]   = useState("tasks"); // "tasks" | "appointments"

  // Consent
  const [consent,        setConsent]        = useState(null);
  const [consentLoading, setConsentLoading] = useState(true);
  const [showConsent,    setShowConsent]    = useState(false);
  const [consentDone,    setConsentDone]    = useState(false);

  // Cargar estado de consentimiento al montar
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getConsentByPhone(phone);
        if (!cancelled) setConsent(data);
      } catch {
        // No bloquear el portal si falla
      } finally {
        if (!cancelled) setConsentLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [phone]);

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

  const handleConsentSigned = () => {
    setShowConsent(false);
    setConsentDone(true);
    // Actualiza el estado local del consentimiento para ocultar el banner
    setConsent(prev => ({ ...(prev || {}), signed:true }));
  };

  const handleBackFromConsentDone = () => {
    setConsentDone(false);
  };

  // Sub-pantallas: prioridad de arriba hacia abajo
  if (submitted)    return <SuccessScreen onBack={handleBackFromSubmit}/>;
  if (selected)     return <TaskForm assignment={selected} onBack={() => setSelected(null)} onSubmitted={handleSubmitted}/>;
  if (consentDone)  return <ConsentDoneScreen onBack={handleBackFromConsentDone}/>;
  if (showConsent)  return (
    <ConsentSignScreen
      phone={phone}
      consentSections={consent?.sections || null}
      onBack={() => setShowConsent(false)}
      onSigned={handleConsentSigned}
    />
  );

  const pending   = assignments.filter(a => a.status === "pending");
  const completed = assignments.filter(a => a.status === "completed");
  const name      = assignments[0]?.patient_name?.split(" ")[0] || "";

  // Mostrar banner solo si el consentimiento está explícitamente sin firmar
  const showConsentBanner = !consentLoading && consent !== null && !consent.signed;

  return (
    <div style={{ minHeight:"100vh", background:P.bg, fontFamily:P.fB }}>
      {/* Header */}
      <div style={{ background:P.p, padding:"24px 20px 28px", color:"#fff" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{
              width:42, height:42, borderRadius:13,
              background:"rgba(255,255,255,0.15)",
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>
              <ClipboardList size={20} color="#fff" strokeWidth={1.5}/>
            </div>
            <div>
              <div style={{ fontSize:11, opacity:0.7, fontWeight:400 }}>Portal del Paciente</div>
              <div style={{ fontFamily:P.fH, fontSize:20, fontWeight:600, lineHeight:1.2 }}>
                {name ? `¡Hola, ${name}!` : "Bienvenido/a"}
              </div>
            </div>
          </div>
          <button onClick={onLogout}
            style={{
              background:"rgba(255,255,255,0.12)", border:"none", borderRadius:8,
              padding:"6px 12px", color:"rgba(255,255,255,0.8)",
              fontFamily:P.fB, fontSize:12, cursor:"pointer",
            }}>
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

      {/* Tab bar */}
      <div style={{
        display:"flex", gap:8,
        padding:"14px 16px 0",
        background:P.bg,
        borderBottom:`1px solid ${P.bdrL}`,
      }}>
        {[
          { key:"tasks",        label:"Mis tareas",  icon:<ClipboardList size={14}/> },
          { key:"appointments", label:"Mis citas",   icon:<Calendar size={14}/> },
        ].map(tab => {
          const active = activeTab === tab.key;
          return (
            <button key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display:"flex", alignItems:"center", gap:6,
                padding:"9px 14px",
                borderRadius:"10px 10px 0 0",
                border:"none",
                background: active ? P.card : "transparent",
                color: active ? P.p : P.tm,
                fontFamily:P.fB, fontSize:13,
                fontWeight: active ? 700 : 400,
                cursor:"pointer",
                borderBottom: active ? `2px solid ${P.p}` : "2px solid transparent",
                transition:"all .15s",
              }}>
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Body */}
      <div style={{ padding:"20px 16px" }}>

        {/* Banner de consentimiento (siempre visible, cualquier tab) */}
        {showConsentBanner && (
          <ConsentBanner onReview={() => setShowConsent(true)}/>
        )}

        {/* Tab: Tareas */}
        {activeTab === "tasks" && (
          <>
            {loading && <Spinner/>}

            {!loading && assignments.length === 0 && (
              <div style={{ textAlign:"center", padding:"60px 20px", color:P.tm }}>
                <div style={{ fontSize:48, marginBottom:16 }}>📋</div>
                <div style={{ fontFamily:P.fH, fontSize:22, color:P.t, marginBottom:8 }}>Sin tareas por ahora</div>
                <div style={{ fontSize:14, lineHeight:1.6 }}>Tu psicólogo(a) te asignará tareas después de cada sesión.</div>
              </div>
            )}

            {pending.length > 0 && (
              <>
                <div style={{
                  fontSize:11, fontWeight:700, color:P.tm,
                  textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:12,
                }}>
                  Por completar
                </div>
                {pending.map(a => <TaskCard key={a.id} assignment={a} onOpen={() => setSelected(a)}/>)}
              </>
            )}

            {completed.length > 0 && (
              <>
                <div style={{
                  fontSize:11, fontWeight:700, color:P.tl,
                  textTransform:"uppercase", letterSpacing:"0.08em",
                  margin:"24px 0 12px",
                }}>
                  Completadas
                </div>
                {completed.map(a => <TaskCard key={a.id} assignment={a} onOpen={() => {}}/>)}
              </>
            )}
          </>
        )}

        {/* Tab: Citas */}
        {activeTab === "appointments" && (
          <AppointmentsSection phone={phone}/>
        )}
      </div>
    </div>
  );
}

// ── Login screen ──────────────────────────────────────────────────────────────
function LoginScreen({ onLogin, initialPhone = "", autoError = "" }) {
  const [input,   setInput]   = useState(initialPhone);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(autoError);

  const handleAccess = async () => {
    const clean = input.replace(/\D/g, "");
    if (clean.length < 10) {
      setError("Ingresa un número válido (10 dígitos mínimo)");
      return;
    }
    const normalized = clean;
    setLoading(true); setError("");
    try {
      const data = await getAssignmentsByPhone(normalized);
      if (data.length === 0) {
        setError("Número no encontrado. Verifica con tu psicólogo(a) que esté registrado correctamente.");
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
    <div style={{
      minHeight:"100vh", background:P.bg,
      display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      padding:"32px 24px", fontFamily:P.fB,
    }}>
      {/* Decorative top bar */}
      <div style={{ position:"fixed", top:0, left:0, right:0, height:4, background:`linear-gradient(90deg, ${P.p}, #5A9497)` }}/>

      <div style={{ width:"100%", maxWidth:380 }}>

        {/* Logo + welcome */}
        <div style={{ textAlign:"center", marginBottom:40 }}>
          <div style={{
            width:72, height:72, borderRadius:20, background:P.p,
            display:"flex", alignItems:"center", justifyContent:"center",
            margin:"0 auto 20px",
            boxShadow:`0 8px 24px rgba(58,107,110,0.3)`,
          }}>
            <ClipboardList size={32} color="#fff" strokeWidth={1.5}/>
          </div>
          <h1 style={{ fontFamily:P.fH, fontSize:32, fontWeight:600, color:P.t, marginBottom:8 }}>
            Mis Tareas
          </h1>
          <p style={{ fontSize:14, color:P.tm, lineHeight:1.6, maxWidth:280, margin:"0 auto" }}>
            Accede a las actividades que tu psicólogo(a) preparó especialmente para ti.
          </p>
        </div>

        {/* Card */}
        <div style={{ background:P.card, borderRadius:20, padding:"28px 24px", boxShadow:`0 4px 24px rgba(0,0,0,0.08)` }}>
          <label style={{
            display:"block", fontSize:11, fontWeight:700, color:P.tm,
            textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10,
          }}>
            Tu número de celular
          </label>
          <input
            type="tel"
            value={input}
            onChange={e => { setInput(e.target.value); setError(""); }}
            onKeyDown={e => e.key === "Enter" && handleAccess()}
            placeholder="Ej. 998 123 4567"
            style={{
              width:"100%", padding:"14px 16px",
              border:`2px solid ${error ? P.err : P.bdr}`, borderRadius:12,
              fontFamily:P.fB, fontSize:16, color:P.t, background:P.alt,
              outline:"none", boxSizing:"border-box",
              marginBottom:error ? 8 : 16, transition:"border .15s",
            }}
            autoFocus
          />
          {error && (
            <p style={{ fontSize:13, color:P.err, marginBottom:16, lineHeight:1.4 }}>{error}</p>
          )}
          <button onClick={handleAccess} disabled={loading}
            style={{
              width:"100%", padding:"15px", borderRadius:12, border:"none",
              background: loading ? P.bdr : P.p,
              color: loading ? P.tl : "#fff",
              fontFamily:P.fB, fontSize:15, fontWeight:700,
              cursor: loading ? "not-allowed" : "pointer",
              display:"flex", alignItems:"center", justifyContent:"center", gap:8,
              transition:"all .15s",
              boxShadow: loading ? "none" : `0 4px 12px rgba(58,107,110,0.3)`,
            }}>
            {loading
              ? <><Loader size={16} style={{ animation:"spin 0.8s linear infinite" }}/> Buscando...</>
              : "Entrar →"
            }
          </button>
        </div>

        <p style={{ textAlign:"center", fontSize:12, color:P.tl, marginTop:24, lineHeight:1.6 }}>
          Si tienes problemas para entrar, contacta a tu psicólogo(a) para verificar el número registrado.
        </p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── Root portal component ─────────────────────────────────────────────────────
export default function PatientPortal() {
  const [phone,       setPhone]       = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [autoLoading, setAutoLoading] = useState(false);
  const [autoError,   setAutoError]   = useState("");
  const [initialPhone, setInitialPhone] = useState("");

  // Auto-login cuando ?phone= viene en la URL (enlace de WhatsApp)
  useEffect(() => {
    const params  = new URLSearchParams(window.location.search);
    const urlPhone = (params.get("phone") || "").replace(/\D/g, "");
    if (!urlPhone || urlPhone.length < 10) return;

    setInitialPhone(urlPhone);
    setAutoLoading(true);
    getAssignmentsByPhone(urlPhone)
      .then(data => {
        setPhone(urlPhone);
        setAssignments(data);
      })
      .catch(() => {
        setAutoError("No se pudo conectar. Revisa tu internet e intenta de nuevo.");
      })
      .finally(() => setAutoLoading(false));
  }, []);

  const handleLogin = (normalizedPhone, data) => {
    setPhone(normalizedPhone);
    setAssignments(data);
  };

  if (autoLoading) return (
    <div style={{
      minHeight:"100vh", background:P.bg,
      display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      fontFamily:P.fB,
    }}>
      <div style={{ position:"fixed", top:0, left:0, right:0, height:4, background:`linear-gradient(90deg, ${P.p}, #5A9497)` }}/>
      <div style={{ textAlign:"center" }}>
        <div style={{ width:56, height:56, borderRadius:16, background:P.p, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px", boxShadow:`0 8px 24px rgba(58,107,110,0.3)` }}>
          <ClipboardList size={24} color="#fff" strokeWidth={1.5}/>
        </div>
        <Spinner/>
        <p style={{ fontSize:14, color:P.tm, marginTop:12 }}>Cargando tu portal…</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!phone) return (
    <LoginScreen
      onLogin={handleLogin}
      initialPhone={initialPhone}
      autoError={autoError}
    />
  );

  return (
    <TaskList
      phone={phone}
      assignments={assignments}
      onLogout={() => { setPhone(null); setAssignments([]); }}
    />
  );
}
