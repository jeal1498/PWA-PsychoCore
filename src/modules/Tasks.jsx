// ─────────────────────────────────────────────────────────────────────────────
// src/modules/Tasks.jsx
// Módulo de Tareas Terapéuticas — vista de Karen
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, CheckCircle2, Clock, MessageCircle, ChevronDown, ChevronUp, RefreshCw, ClipboardList, Eye } from "lucide-react";
import { T } from "../theme.js";
import { fmtDate } from "../utils.js";
import { Card, Badge, Modal, Select, Textarea, Btn, EmptyState, PageHeader } from "../components/ui/index.jsx";
import { TEMPLATES_LIST, TASK_CATEGORIES, getTemplate } from "../lib/taskTemplates.js";
import { createAssignment, getAssignmentsByPatient, deleteAssignment, getResponsesByAssignment } from "../lib/supabase.js";

// ── Helpers ───────────────────────────────────────────────────────────────────
const PORTAL_BASE = typeof window !== "undefined"
  ? `${window.location.origin}/p/`
  : "/p/";

const whatsappLink = (phone, patientName, taskTitle) => {
  const msg = encodeURIComponent(
    `Hola ${patientName?.split(" ")[0] || ""}! 👋\n\nTe comparto tu tarea terapéutica: *${taskTitle}*\n\nAccede aquí:\n${PORTAL_BASE}${phone}\n\n_Ingresa con tu número de celular para ver todas tus tareas._`
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
  const template = getTemplate(assignment.template_id);

  useEffect(() => {
    getResponsesByAssignment(assignment.id)
      .then(setResponses)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [assignment.id]);

  return (
    <Modal open onClose={onClose} title={`Respuestas — ${assignment.patient_name.split(" ")[0]}`} width={560}>
      <div style={{ padding:"4px 0 8px", fontFamily:T.fB, fontSize:13, color:T.tm, marginBottom:16 }}>
        <strong>{template?.icon} {template?.title}</strong> · {fmtRelative(assignment.completed_at || assignment.assigned_at)}
      </div>
      {loading && (
        <div style={{ textAlign:"center", padding:32 }}>
          <div style={{ width:32, height:32, borderRadius:"50%", border:`3px solid ${T.bdrL}`, borderTopColor:T.p, margin:"0 auto", animation:"spin 0.8s linear infinite" }}/>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}
      {!loading && responses.length === 0 && (
        <div style={{ textAlign:"center", padding:"32px 0", color:T.tl, fontFamily:T.fB, fontSize:13 }}>
          Aún no hay respuestas registradas.
        </div>
      )}
      {!loading && responses.map((resp, ri) => (
        <div key={resp.id} style={{ marginBottom:ri < responses.length - 1 ? 24 : 0 }}>
          {responses.length > 1 && (
            <div style={{ fontFamily:T.fB, fontSize:11, fontWeight:700, color:T.tl, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:12 }}>
              Respuesta {ri + 1} · {fmtRelative(resp.submitted_at)}
            </div>
          )}
          {template?.fields.map(field => {
            const val = resp.responses[field.key];
            if (!val) return null;
            return (
              <div key={field.key} style={{ marginBottom:14 }}>
                <div style={{ fontFamily:T.fB, fontSize:11, fontWeight:700, color:T.p, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:5 }}>
                  {field.label}
                </div>
                <div style={{ padding:"10px 14px", background:T.cardAlt, borderRadius:10, border:`1px solid ${T.bdrL}`, fontFamily:T.fB, fontSize:13.5, color:T.t, lineHeight:1.65 }}>
                  {field.type === "scale10"
                    ? <span style={{ fontWeight:700, fontSize:18, color: Number(val)<=3?T.suc:Number(val)<=6?"#B8900A":"#B85050" }}>{val}/10</span>
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
            <span style={{ fontFamily:T.fB, fontSize:12, color:T.tm }}>{assignment.patient_name.split(" ").slice(0,2).join(" ")}</span>
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

// ── Main component ────────────────────────────────────────────────────────────
export default function Tasks({ patients }) {
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
    try {
      await createAssignment({
        patientId:    patient.id,
        patientName:  patient.name,
        patientPhone: patient.phone.replace(/\D/g, ""),
        templateId:   selTemplate.id,
        title:        selTemplate.title,
        notes:        notes.trim() || null,
      });
      setShowAdd(false);
      setSelTemplate(null);
      setNotes("");
      setFilterPt(patient.id);
    } catch (e) {
      setSaveError("Error al guardar. Revisa la conexión con Supabase.");
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
        title="Tareas Terapéuticas"
        subtitle="Asigna tareas a tus pacientes y revisa sus respuestas"
        action={<Btn onClick={() => { setShowAdd(true); setSelPatient(""); setSelTemplate(null); setNotes(""); setSaveError(""); }}><Plus size={15}/> Nueva tarea</Btn>}
      />

      {/* Patient filter */}
      <div style={{ display:"flex", gap:10, marginBottom:20, flexWrap:"wrap" }}>
        <select value={filterPt} onChange={e => setFilterPt(e.target.value)}
          style={{ padding:"9px 14px", border:`1.5px solid ${T.bdr}`, borderRadius:10, fontFamily:T.fB, fontSize:13.5, color:T.t, background:T.card, cursor:"pointer", outline:"none", flex:1, minWidth:200 }}>
          <option value="">— Selecciona un paciente —</option>
          {patients.map(p => <option key={p.id} value={p.id}>{p.name.split(" ").slice(0,2).join(" ")}</option>)}
        </select>
        {filterPt && (
          <button onClick={load} title="Actualizar" style={{ padding:"9px 12px", border:`1.5px solid ${T.bdr}`, borderRadius:10, background:T.card, cursor:"pointer", color:T.tm }}>
            <RefreshCw size={15}/>
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding:"12px 16px", background:T.errA, borderRadius:10, border:`1.5px solid rgba(184,80,80,0.2)`, fontFamily:T.fB, fontSize:13, color:T.err, marginBottom:16 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ display:"flex", justifyContent:"center", padding:40 }}>
          <div style={{ width:32, height:32, borderRadius:"50%", border:`3px solid ${T.bdrL}`, borderTopColor:T.p, animation:"spin 0.8s linear infinite" }}/>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {/* Empty states */}
      {!loading && !filterPt && (
        <EmptyState icon={ClipboardList} title="Selecciona un paciente" desc="Elige un paciente para ver y gestionar sus tareas asignadas"/>
      )}
      {!loading && filterPt && assignments.length === 0 && !error && (
        <EmptyState icon={ClipboardList} title="Sin tareas asignadas" desc="Este paciente no tiene tareas activas. Asígnale una con el botón de arriba."/>
      )}

      {/* Assignments list */}
      {!loading && assignments.map(a => (
        <AssignmentCard key={a.id} assignment={a} onDelete={handleDelete} onViewResponses={setViewResponses}/>
      ))}

      {/* Responses modal */}
      {viewResponses && (
        <ResponsesModal assignment={viewResponses} onClose={() => setViewResponses(null)}/>
      )}

      {/* ── New assignment modal ──────────────────────────────────────────── */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Asignar tarea terapéutica" width={580}>

        {/* Patient selector */}
        <Select label="Paciente *" value={selPatient} onChange={setSelPatient}
          options={[{value:"",label:"Seleccionar paciente..."}, ...patients.map(p => ({value:p.id, label:p.name}))]}/>

        {selPatient && !patients.find(p => p.id === selPatient)?.phone && (
          <div style={{ padding:"10px 14px", background:T.warA, borderRadius:10, fontFamily:T.fB, fontSize:12.5, color:T.war, marginBottom:16, border:`1px solid rgba(184,144,10,0.2)` }}>
            ⚠️ Este paciente no tiene teléfono registrado. Agrégalo en su expediente para poder enviarle la tarea por WhatsApp.
          </div>
        )}

        {/* Category filter */}
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

        {/* Optional note */}
        <Textarea label="Instrucciones adicionales (opcional)"
          value={notes} onChange={setNotes}
          placeholder="Ej. Completa esto antes del jueves, enfócate especialmente en las situaciones del trabajo..."
          rows={2}/>

        {/* Preview portal link */}
        {selPatient && patients.find(p => p.id === selPatient)?.phone && (
          <div style={{ padding:"10px 14px", background:T.pA, borderRadius:10, fontFamily:T.fB, fontSize:12, color:T.p, marginBottom:16, wordBreak:"break-all" }}>
            🔗 El paciente accederá en: <strong>{PORTAL_BASE}{patients.find(p => p.id === selPatient)?.phone?.replace(/\D/g,"")}</strong>
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
