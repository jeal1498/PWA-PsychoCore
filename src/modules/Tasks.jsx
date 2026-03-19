// ─────────────────────────────────────────────────────────────────────────────
// src/modules/Tasks.jsx
// Módulo de Tareas Terapéuticas — vista de Karen
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, CheckCircle2, Clock, MessageCircle, ChevronDown, ChevronUp, RefreshCw, ClipboardList, Eye, Bell } from "lucide-react";
import { T } from "../theme.js";
import { fmtDate } from "../utils.js";
import { Card, Badge, Modal, Select, Textarea, Btn, EmptyState, PageHeader } from "../components/ui/index.jsx";
import { TEMPLATES_LIST, TASK_CATEGORIES, getTemplate } from "../lib/taskTemplates.js";
import { createAssignment, getAssignmentsByPatient, getAllAssignments, deleteAssignment, getResponsesByAssignment } from "../lib/supabase.js";
import { emit } from "../lib/eventBus.js"; // FASE 3

// ── Helpers ───────────────────────────────────────────────────────────────────
const PORTAL_URL = typeof window !== "undefined" ? `${window.location.origin}/p` : "/p";

const whatsappLink = (phone, patientName, taskTitle) => {
  const msg = encodeURIComponent(
    `Hola ${patientName?.split(" ")[0] || ""}! 👋\n\nTe comparto tu tarea terapéutica: *${taskTitle}*\n\nAccede aquí:\n${PORTAL_URL}\n\n_Ingresa con tu número de celular para ver todas tus tareas._`
  );
  return `https://wa.me/${phone}?text=${msg}`;
};

const fmtRelative = (iso) => {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Hoy";
  if (days === 1) return "Ayer";
  if (days < 7)  return `Hace ${days} días`;
  return fmtDate(iso.split("T")[0]);
};

// ── Template selector card ────────────────────────────────────────────────────
function TemplateCard({ tpl, selected, onSelect }) {
  const active = selected?.id === tpl.id;
  return (
    <div onClick={() => onSelect(active ? null : tpl)}
      style={{ padding:"14px 16px", borderRadius:12, border:`2px solid ${active ? T.p : T.bdr}`,
        background: active ? T.pA : T.card, cursor:"pointer", transition:"all .13s" }}>
      <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
        <div style={{ fontSize:22, lineHeight:1 }}>{tpl.icon}</div>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:T.fB, fontSize:13.5, fontWeight:600, color:active ? T.p : T.t, marginBottom:2 }}>{tpl.title}</div>
          <div style={{ fontFamily:T.fB, fontSize:11.5, color:T.tl, lineHeight:1.4 }}>{tpl.description}</div>
          <div style={{ marginTop:6, display:"flex", gap:5, flexWrap:"wrap" }}>
            <span style={{ padding:"2px 8px", borderRadius:9999, background:T.pA, color:T.p, fontSize:10, fontWeight:700, fontFamily:T.fB }}>
              {tpl.category}
            </span>
            <span style={{ padding:"2px 8px", borderRadius:9999, background:T.bdrL, color:T.tl, fontSize:10, fontFamily:T.fB }}>
              {tpl.fields.length} preguntas
            </span>
          </div>
        </div>
        {active && <CheckCircle2 size={16} color={T.p} style={{ flexShrink:0 }}/>}
      </div>
    </div>
  );
}

// ── Responses viewer ──────────────────────────────────────────────────────────
function ResponsesModal({ assignment, onClose }) {
  const [responses, setResponses] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [loadErr, setLoadErr]     = useState(false);
  const template = getTemplate(assignment.template_id);

  useEffect(() => {
    getResponsesByAssignment(assignment.id)
      .then(setResponses)
      .catch(() => setLoadErr(true))
      .finally(() => setLoading(false));
  }, [assignment.id]);

  return (
    <Modal open onClose={onClose} title={`Respuestas — ${(assignment.patient_name || "Paciente").split(" ")[0]}`} width={560}>
      <div style={{ padding:"4px 0 8px", fontFamily:T.fB, fontSize:13, color:T.tm, marginBottom:16 }}>
        <strong>{template?.icon} {template?.title}</strong> · {fmtRelative(assignment.completed_at || assignment.assigned_at)}
      </div>
      {loading && (
        <div style={{ textAlign:"center", padding:32 }}>
          <div style={{ width:32, height:32, borderRadius:"50%", border:`3px solid ${T.bdrL}`, borderTopColor:T.p, margin:"0 auto", animation:"spin 0.8s linear infinite" }}/>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}
      {!loading && loadErr && (
        <div style={{ padding:"12px 16px", background:T.errA, borderRadius:10, fontFamily:T.fB, fontSize:13, color:T.err, textAlign:"center" }}>
          No se pudieron cargar las respuestas. Verifica tu conexión e intenta de nuevo.
        </div>
      )}
      {!loading && !loadErr && responses.length === 0 && (
        <div style={{ textAlign:"center", padding:"32px 0", color:T.tl, fontFamily:T.fB, fontSize:13 }}>
          Aún no hay respuestas registradas.
        </div>
      )}
      {!loading && responses.map((resp, ri) => (
        <div key={resp.id} style={{ marginBottom:ri < responses.length - 1 ? 24 : 0 }}>
          {responses.length > 1 && (
            <div style={{ fontFamily:T.fB, fontSize:11, fontWeight:600, color:T.tl,
              letterSpacing:"0.04em", marginBottom:14, paddingBottom:8,
              borderBottom:`1px solid ${T.bdrL}` }}>
              Respuesta {ri + 1} · {fmtRelative(resp.submitted_at)}
            </div>
          )}
          {template?.fields.map(field => {
            const val = resp.responses[field.key];
            if (!val) return null;
            return (
              <div key={field.key} style={{ marginBottom:16 }}>
                {/* Label en sentence case, sin uppercase */}
                <div style={{ fontFamily:T.fB, fontSize:12, fontWeight:600, color:T.p,
                  marginBottom:4 }}>
                  {field.label}
                </div>
                {/* Respuesta escala: caja destacada. Texto: sin caja */}
                {field.type === "scale10"
                  ? <div style={{ display:"inline-flex", alignItems:"baseline", gap:4,
                      padding:"6px 14px", background:T.cardAlt, borderRadius:10,
                      border:`1px solid ${T.bdrL}` }}>
                      <span style={{ fontFamily:T.fB, fontWeight:700, fontSize:22,
                        color: Number(val)<=3?T.suc:Number(val)<=6?"#B8900A":"#B85050" }}>
                        {val}
                      </span>
                      <span style={{ fontFamily:T.fB, fontSize:13, color:T.tl }}>/10</span>
                    </div>
                  : <p style={{ fontFamily:T.fB, fontSize:13.5, color:T.t, lineHeight:1.7,
                      margin:0, paddingLeft:2 }}>
                      {val}
                    </p>
                }
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

// ── Assignment card ───────────────────────────────────────────────────────────
function AssignmentCard({ assignment, onDelete, onViewResponses }) {
  const template = getTemplate(assignment.template_id);
  const done     = assignment.status === "completed";
  const phone    = assignment.patient_phone;

  return (
    <Card style={{ padding:"16px 18px", marginBottom:10 }}>
      <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
        <div style={{ fontSize:22, lineHeight:1, paddingTop:2 }}>{template?.icon || "📋"}</div>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", flexWrap:"wrap", alignItems:"center", gap:8, marginBottom:4 }}>
            <span style={{ fontFamily:T.fB, fontSize:14.5, fontWeight:600, color:T.t }}>{assignment.title}</span>
            <span style={{ fontSize:11, color:T.tl }}>·</span>
            <span style={{ fontFamily:T.fB, fontSize:12, color:T.tm }}>{(assignment.patient_name || "").split(" ").slice(0,2).join(" ")}</span>
          </div>
          <div style={{ fontFamily:T.fB, fontSize:12, color:T.tl, marginBottom:8 }}>
            Asignada {fmtRelative(assignment.assigned_at)}
          </div>
          {assignment.notes && (
            <div style={{ fontFamily:T.fB, fontSize:12.5, color:T.tm, marginBottom:8, lineHeight:1.5, padding:"8px 12px", background:T.bdrL, borderRadius:8 }}>
              {assignment.notes}
            </div>
          )}
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {done
              ? <Badge color={T.suc} bg={T.sucA}><CheckCircle2 size={10}/> Completada</Badge>
              : <Badge color={T.war} bg={T.warA}><Clock size={10}/> Pendiente</Badge>
            }
          </div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:6, flexShrink:0 }}>
          {/* WhatsApp */}
          <a href={whatsappLink(phone, assignment.patient_name, assignment.title)} target="_blank" rel="noreferrer"
            style={{ background:"#25D366", border:"none", borderRadius:8, padding:8, cursor:"pointer", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", textDecoration:"none" }}
            title="Enviar por WhatsApp">
            <MessageCircle size={14}/>
          </a>
          {/* Ver respuestas (solo si completada) */}
          {done && (
            <button onClick={() => onViewResponses(assignment)} title="Ver respuestas"
              style={{ background:T.pA, border:"none", borderRadius:8, padding:8, cursor:"pointer", color:T.p }}>
              <Eye size={14}/>
            </button>
          )}
          {/* Eliminar */}
          <button onClick={() => onDelete(assignment.id)} title="Eliminar tarea"
            style={{ background:"none", border:"none", borderRadius:8, padding:8, cursor:"pointer", color:T.tl }}>
            <Trash2 size={14}/>
          </button>
        </div>
      </div>
    </Card>
  );
}

// ── Dashboard de respuestas ───────────────────────────────────────────────────
function ResponsesDashboard({ patients, onViewResponses }) {
  const [assignments, setAssignments] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [filter,      setFilter]      = useState("nuevas"); // "nuevas" | "todas" | "pendientes"

  const load = async () => {
    setLoading(true);
    try {
      const data = await getAllAssignments();
      setAssignments(data);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const completed  = assignments.filter(a => a.status === "completed");
  const pending    = assignments.filter(a => a.status === "pending");

  // "Nuevas" = completadas en las últimas 72h
  const isNew = (a) => {
    if (!a.completed_at) return false;
    return Date.now() - new Date(a.completed_at).getTime() < 72 * 3600 * 1000;
  };
  const newResponses = completed.filter(isNew);

  const shown = filter === "nuevas"    ? newResponses
              : filter === "pendientes" ? pending
              : completed;

  const getPatient = (a) => patients.find(p => p.id === a.patient_id);

  if (loading) return (
    <div style={{ display:"flex", justifyContent:"center", padding:60 }}>
      <div style={{ width:32, height:32, borderRadius:"50%", border:`3px solid ${T.bdrL}`, borderTopColor:T.p, animation:"spin 0.8s linear infinite" }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div>
      {/* Métricas — tapeables para filtrar */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:20 }}>
        {[
          { id:"nuevas",     label:"Nuevas",     value:newResponses.length, color:T.suc,    bg:T.sucA,                      Icon:Bell        },
          { id:"pendientes", label:"Pendientes", value:pending.length,      color:"#B8900A", bg:"rgba(184,144,10,0.1)",     Icon:Clock       },
          { id:"todas",      label:"Completadas",value:completed.length,    color:T.p,      bg:T.pA,                        Icon:CheckCircle2},
        ].map(m => (
          <button key={m.id} onClick={() => setFilter(m.id)}
            style={{ background: filter===m.id ? m.bg : T.card,
              border:`1.5px solid ${filter===m.id ? m.color+"50" : T.bdrL}`,
              borderRadius:14, padding:"12px 10px", textAlign:"center",
              cursor:"pointer", transition:"all .13s" }}>
            <div style={{ display:"flex", justifyContent:"center", marginBottom:6 }}>
              <m.Icon size={16} color={m.color} strokeWidth={1.8}/>
            </div>
            <div style={{ fontFamily:T.fB, fontSize:24, fontWeight:700, color:m.color, lineHeight:1 }}>{m.value}</div>
            <div style={{ fontFamily:T.fB, fontSize:10, color:T.tm, marginTop:3, letterSpacing:"0.02em" }}>{m.label}</div>
          </button>
        ))}
      </div>

      {/* Botón refresh discreto */}
      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:12 }}>
        <button onClick={load} style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 10px", borderRadius:9999, border:`1px solid ${T.bdrL}`, background:"transparent", cursor:"pointer", color:T.tl, fontFamily:T.fB, fontSize:11 }}>
          <RefreshCw size={11}/> Actualizar
        </button>
      </div>

      {/* Lista */}
      {shown.length === 0 ? (
        <div style={{ textAlign:"center", padding:"48px 20px", fontFamily:T.fB }}>
          <div style={{ marginBottom:10, display:"flex", justifyContent:"center" }}>
            {filter === "nuevas"
              ? <Bell size={32} strokeWidth={1.2} color={T.tl}/>
              : filter === "pendientes"
              ? <Clock size={32} strokeWidth={1.2} color={T.tl}/>
              : <CheckCircle2 size={32} strokeWidth={1.2} color={T.tl}/>
            }
          </div>
          <div style={{ fontSize:14, color:T.tm, fontWeight:600, marginBottom:4 }}>
            {filter === "nuevas" ? "Sin respuestas nuevas" : filter === "pendientes" ? "Sin tareas pendientes" : "Sin tareas completadas"}
          </div>
          {filter === "nuevas" && (
            <div style={{ fontSize:12, color:T.tl }}>Cuando un paciente complete una tarea aparecerá aquí</div>
          )}
        </div>
      ) : shown.map(a => {
        const tpl = getTemplate(a.template_id);
        const pt  = getPatient(a);
        const esNueva = isNew(a);
        const done = a.status === "completed";

        return (
          <div key={a.id} style={{ background:T.card, borderRadius:14, padding:"14px 16px", marginBottom:10,
            border:`1.5px solid ${esNueva && done ? T.suc+"40" : T.bdr}`,
            boxShadow: esNueva && done ? `0 0 0 3px ${T.suc}15` : "none" }}>
            <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>

              {/* Avatar paciente */}
              <div style={{ width:40, height:40, borderRadius:"50%", background:T.pA, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <span style={{ fontFamily:T.fH, fontSize:15, fontWeight:700, color:T.p }}>
                  {a.patient_name?.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}
                </span>
              </div>

              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:3 }}>
                  <span style={{ fontFamily:T.fB, fontSize:14, fontWeight:600, color:T.t }}>
                    {a.patient_name?.split(" ").slice(0,2).join(" ")}
                  </span>
                  {esNueva && done && (
                    <span style={{ padding:"2px 8px", borderRadius:9999, background:T.sucA, color:T.suc, fontSize:10, fontWeight:700, fontFamily:T.fB }}>
                      NUEVA
                    </span>
                  )}
                  {!done && (
                    <span style={{ padding:"2px 8px", borderRadius:9999, background:"rgba(184,144,10,0.1)", color:"#B8900A", fontSize:10, fontWeight:700, fontFamily:T.fB }}>
                      PENDIENTE
                    </span>
                  )}
                </div>
                <div style={{ fontFamily:T.fB, fontSize:13, color:T.tm, marginBottom:4 }}>
                  {tpl?.icon} {a.title}
                </div>
                <div style={{ fontFamily:T.fB, fontSize:11.5, color:T.tl }}>
                  {done
                    ? `Completada ${fmtRelative(a.completed_at)}`
                    : `Asignada ${fmtRelative(a.assigned_at)} · Sin completar`
                  }
                </div>
              </div>

              {/* Acciones */}
              <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                {done && (
                  <button onClick={() => onViewResponses(a)}
                    style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 12px", borderRadius:9, border:`1.5px solid ${T.p}`, background:T.pA, color:T.p, fontFamily:T.fB, fontSize:12, fontWeight:600, cursor:"pointer" }}>
                    <Eye size={13}/> Ver
                  </button>
                )}
                {pt?.phone && !done && (
                  <a href={whatsappLink(pt.phone, a.patient_name, a.title)} target="_blank" rel="noreferrer"
                    style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 12px", borderRadius:9, border:"1.5px solid #25D366", background:"rgba(37,211,102,0.08)", color:"#128C7E", fontFamily:T.fB, fontSize:12, fontWeight:600, cursor:"pointer", textDecoration:"none" }}>
                    <MessageCircle size={13}/> Recordar
                  </a>
                )}
              </div>
            </div>

            {/* Respuesta preview (solo si tiene responses y está completada) */}
            {done && a.notes && (
              <div style={{ marginTop:10, padding:"8px 12px", background:T.bdrL, borderRadius:8, fontFamily:T.fB, fontSize:12, color:T.tm, lineHeight:1.5, borderLeft:`3px solid ${T.p}` }}>
                📝 {a.notes}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Tasks({ patients, sessions = [], onNavigate }) {
  const [view,          setView]          = useState("dashboard"); // "dashboard" | "manage"
  const [assignments,   setAssignments]   = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState("");
  const [showAdd,       setShowAdd]       = useState(false);
  const [filterPt,      setFilterPt]      = useState("");
  const [viewResponses, setViewResponses] = useState(null);
  const [filterCat,     setFilterCat]     = useState("Todas");

  // New assignment form state
  const [selPatient,  setSelPatient]  = useState("");
  const [selTemplate, setSelTemplate] = useState(null);
  const [notes,       setNotes]       = useState("");
  const [saving,      setSaving]      = useState(false);
  const [saveError,   setSaveError]   = useState("");

  const load = useCallback(async () => {
    if (!filterPt) { setAssignments([]); return; }
    setLoading(true);
    setError("");
    try {
      const data = await getAssignmentsByPatient(filterPt);
      setAssignments(data);
    } catch {
      setError("No se pudo conectar con Supabase. Verifica la configuración.");
    } finally {
      setLoading(false);
    }
  }, [filterPt]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!selPatient || !selTemplate) return;
    const patient = patients.find(p => p.id === selPatient);
    if (!patient?.phone) { setSaveError("Este paciente no tiene número de teléfono registrado. Agrégalo en su expediente."); return; }
    setSaving(true);
    setSaveError("");
    // Timeout de 8s — si Supabase no responde, desbloquear el botón
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), 8000)
    );
    try {
      await Promise.race([
        createAssignment({
          patientId:    patient.id,
          patientName:  patient.name,
          patientPhone: patient.phone.replace(/\D/g, ""),
          templateId:   selTemplate.id,
          title:        selTemplate.title,
          notes:        notes.trim() || null,
        }),
        timeout,
      ]);
      // FASE 3 — notificar al resto del sistema que se asignó una tarea manualmente
      emit.taskAssigned({ patientId: patient.id, patientName: patient.name, sessionId: null, count: 1 });
      setShowAdd(false);
      setSelTemplate(null);
      setNotes("");
      setFilterPt(patient.id);
    } catch (e) {
      setSaveError(
        e.message === "timeout"
          ? "La conexión tardó demasiado. Verifica tu internet e intenta de nuevo."
          : "Error al guardar. Revisa la conexión con Supabase."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar esta tarea?")) return;
    try {
      await deleteAssignment(id);
      setAssignments(prev => prev.filter(a => a.id !== id));
    } catch {
      alert("No se pudo eliminar. Intenta de nuevo.");
    }
  };

  const filteredTemplates = filterCat === "Todas"
    ? TEMPLATES_LIST
    : TEMPLATES_LIST.filter(t => t.category === filterCat);

  const canSave = selPatient && selTemplate;

  return (
    <div>
      <PageHeader
        title="Tareas"
        subtitle="Respuestas de pacientes y gestión de tareas"
        action={<Btn onClick={() => { setShowAdd(true); setSelPatient(""); setSelTemplate(null); setNotes(""); setSaveError(""); }}><Plus size={15}/> Nueva tarea</Btn>}
      />

      {/* Vista tabs */}
      <div style={{ display:"flex", gap:4, marginBottom:20, borderBottom:`1px solid ${T.bdr}`, paddingBottom:0 }}>
        {[
          { id:"dashboard", label:"Respuestas" },
          { id:"manage",    label:"Por paciente" },
        ].map(v => (
          <button key={v.id} onClick={() => setView(v.id)}
            style={{ padding:"10px 18px", border:"none", background:"none", cursor:"pointer",
              fontFamily:T.fB, fontSize:13.5, fontWeight: view===v.id ? 700 : 400,
              color: view===v.id ? T.p : T.tm,
              borderBottom: view===v.id ? `2px solid ${T.p}` : "2px solid transparent",
              marginBottom:-1, transition:"all .15s" }}>
            {v.label}
          </button>
        ))}
      </div>

      {/* Dashboard de respuestas */}
      {view === "dashboard" && (
        <ResponsesDashboard patients={patients} onViewResponses={setViewResponses}/>
      )}

      {/* Gestión por paciente */}
      {view === "manage" && (
        <div>
          <div style={{ display:"flex", gap:10, marginBottom:20, flexWrap:"wrap" }}>
            <select value={filterPt} onChange={e => setFilterPt(e.target.value)}
              style={{ padding:"9px 14px", border:`1.5px solid ${T.bdr}`, borderRadius:10, fontFamily:T.fB, fontSize:13.5, color:T.t, background:T.card, cursor:"pointer", outline:"none", flex:1, minWidth:200 }}>
              <option value="">— Selecciona un paciente —</option>
              {patients.map(p => <option key={p.id} value={p.id}>{(p.name || "").split(" ").slice(0,2).join(" ")}</option>)}
            </select>
            {filterPt && (
              <button onClick={load} title="Actualizar" style={{ padding:"9px 12px", border:`1.5px solid ${T.bdr}`, borderRadius:10, background:T.card, cursor:"pointer", color:T.tm }}>
                <RefreshCw size={15}/>
              </button>
            )}
          </div>

          {error && (
            <div style={{ padding:"12px 16px", background:T.errA, borderRadius:10, border:`1.5px solid rgba(184,80,80,0.2)`, fontFamily:T.fB, fontSize:13, color:T.err, marginBottom:16 }}>
              ⚠️ {error}
            </div>
          )}

          {loading && (
            <div style={{ display:"flex", justifyContent:"center", padding:40 }}>
              <div style={{ width:32, height:32, borderRadius:"50%", border:`3px solid ${T.bdrL}`, borderTopColor:T.p, animation:"spin 0.8s linear infinite" }}/>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          )}

          {!loading && !filterPt && (
            <EmptyState icon={ClipboardList} title="Selecciona un paciente" desc="Elige un paciente para ver y gestionar sus tareas asignadas"/>
          )}
          {!loading && filterPt && assignments.length === 0 && !error && (
            <EmptyState icon={ClipboardList} title="Sin tareas asignadas" desc="Este paciente no tiene tareas activas. Asígnale una con el botón de arriba."/>
          )}

          {!loading && assignments.map(a => (
            <AssignmentCard key={a.id} assignment={a} onDelete={handleDelete} onViewResponses={setViewResponses}/>
          ))}
        </div>
      )}

      {/* Responses modal */}
      {viewResponses && (
        <ResponsesModal assignment={viewResponses} onClose={() => setViewResponses(null)}/>
      )}

      {/* ── New assignment modal ──────────────────────────────────────────── */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Asignar tarea terapéutica" width={580}>

        <Select label="Paciente *" value={selPatient} onChange={setSelPatient}
          options={[{value:"",label:"Seleccionar paciente..."}, ...patients.map(p => ({value:p.id, label:p.name}))]}/>

        {selPatient && !patients.find(p => p.id === selPatient)?.phone && (
          <div style={{ padding:"10px 14px", background:T.warA, borderRadius:10, fontFamily:T.fB, fontSize:12.5, color:T.war, marginBottom:16, border:`1px solid rgba(184,144,10,0.2)` }}>
            ⚠️ Este paciente no tiene teléfono registrado. Agrégalo en su expediente para poder enviarle la tarea por WhatsApp.
          </div>
        )}

        <div style={{ marginBottom:12 }}>
          <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.tm, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Plantilla de tarea *</label>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:12 }}>
            {["Todas", ...TASK_CATEGORIES].map(cat => {
              const active = filterCat === cat;
              return (
                <button key={cat} onClick={() => setFilterCat(cat)}
                  style={{ padding:"5px 12px", borderRadius:9999, border:`1.5px solid ${active ? T.p : T.bdrL}`,
                    background: active ? T.pA : "transparent", color: active ? T.p : T.tm,
                    fontFamily:T.fB, fontSize:12, fontWeight: active ? 700 : 400, cursor:"pointer", transition:"all .12s" }}>
                  {cat}
                </button>
              );
            })}
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8, maxHeight:280, overflowY:"auto", paddingRight:4 }}>
            {filteredTemplates.map(tpl => (
              <TemplateCard key={tpl.id} tpl={tpl} selected={selTemplate} onSelect={setSelTemplate}/>
            ))}
          </div>
        </div>

        <Textarea label="Instrucciones adicionales (opcional)"
          value={notes} onChange={setNotes}
          placeholder="Ej. Completa esto antes del jueves, enfócate especialmente en las situaciones del trabajo..."
          rows={2}/>

        {selPatient && patients.find(p => p.id === selPatient)?.phone && (
          <div style={{ padding:"10px 14px", background:T.pA, borderRadius:10, fontFamily:T.fB, fontSize:12, color:T.p, marginBottom:16, wordBreak:"break-all" }}>
            🔗 El paciente accederá en: <strong>{PORTAL_URL}</strong>
          </div>
        )}

        {saveError && (
          <div style={{ padding:"10px 14px", background:T.errA, borderRadius:10, fontFamily:T.fB, fontSize:12.5, color:T.err, marginBottom:16 }}>
            {saveError}
          </div>
        )}

        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <Btn variant="ghost" onClick={() => setShowAdd(false)}>Cancelar</Btn>
          <Btn onClick={handleSave} disabled={!canSave || saving}>
            {saving ? "Guardando..." : <><ClipboardList size={14}/> Asignar tarea</>}
          </Btn>
        </div>
      </Modal>
    </div>
  );
}
