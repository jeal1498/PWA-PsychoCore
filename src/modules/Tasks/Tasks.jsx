// ─────────────────────────────────────────────────────────────────────────────
// src/modules/Tasks/Tasks.jsx
// Módulo de Tareas Terapéuticas — UI
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { Plus, Trash2, CheckCircle2, Clock, MessageCircle, RefreshCw, ClipboardList, Eye, Bell } from "lucide-react";
import { T } from "../../theme.js";
import { Card, Badge, Select, Textarea, Btn, EmptyState, PageHeader } from "../../components/ui/index.jsx";
import { PageView } from "../../components/PageView.jsx";
import { TASK_CATEGORIES, getTemplate } from "../../lib/taskTemplates.js";
import { getAllAssignments, getResponsesByAssignment } from "../../lib/supabase.js";
import { useIsMobile } from "../../hooks/useIsMobile.js";
import { useIsWide }   from "../../hooks/useIsWide.js";
import { useTasks, openTaskWhatsApp } from "./useTasks.js";
import { WA, WA_DARK, fmtRelative } from "./tasks.utils.js";

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
  const [loading,   setLoading]   = useState(true);
  const [loadErr,   setLoadErr]   = useState(false);
  const template = getTemplate(assignment.template_id);

  useEffect(() => {
    getResponsesByAssignment(assignment.id)
      .then(setResponses)
      .catch(() => setLoadErr(true))
      .finally(() => setLoading(false));
  }, [assignment.id]);

  return (
    <PageView open onClose={onClose} title={`Respuestas — ${(assignment.patient_name || "Paciente").split(" ")[0]}`} backLabel="Tareas" maxWidth={600}>
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
                <div style={{ fontFamily:T.fB, fontSize:12, fontWeight:600, color:T.p, marginBottom:4 }}>
                  {field.label}
                </div>
                {field.type === "scale10"
                  ? <div style={{ display:"inline-flex", alignItems:"baseline", gap:4,
                      padding:"6px 14px", background:T.cardAlt, borderRadius:10,
                      border:`1px solid ${T.bdrL}` }}>
                      <span style={{ fontFamily:T.fB, fontWeight:700, fontSize:22,
                        color: Number(val)<=3?T.suc:Number(val)<=6?T.war:T.err }}>
                        {val}
                      </span>
                      <span style={{ fontFamily:T.fB, fontSize:13, color:T.tl }}>/10</span>
                    </div>
                  : <p style={{ fontFamily:T.fB, fontSize:13.5, color:T.t, lineHeight:1.7, margin:0, paddingLeft:2 }}>
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
function AssignmentCard({ assignment, onDelete, onViewResponses, profile }) {
  const template = getTemplate(assignment.template_id);
  const done     = assignment.status === "completed";
  const phone    = assignment.patient_phone;
  const [taskLinkError, setTaskLinkError] = useState(false);

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
          <button type="button"
            onClick={() => void openTaskWhatsApp(phone, assignment.patient_name, assignment.title, profile, setTaskLinkError)}
            style={{ background:WA, border:"none", borderRadius:8, padding:"8px 12px", cursor:"pointer", color:"#fff",
              display:"flex", alignItems:"center", justifyContent:"center", gap:6,
              textDecoration:"none", fontFamily:T.fB, fontSize:12, fontWeight:700 }}
            title="Enviar por WhatsApp">
            <MessageCircle size={14}/>
            WhatsApp
          </button>
          {taskLinkError && (
            <div style={{ fontFamily:T.fB, fontSize:11, color:T.err, background:T.errA,
              borderRadius:7, padding:"5px 8px", maxWidth:120, lineHeight:1.35, textAlign:"center" }}>
              No se pudo generar el enlace
            </div>
          )}
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
function ResponsesDashboard({ patients, onViewResponses, profile }) {
  const [assignments,   setAssignments]   = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [filter,        setFilter]        = useState("nuevas"); // "nuevas" | "todas" | "pendientes"
  const [taskLinkError, setTaskLinkError] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getAllAssignments();
      setAssignments(data);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const completed    = assignments.filter(a => a.status === "completed");
  const pending      = assignments.filter(a => a.status === "pending");
  const isNew        = (a) => {
    if (!a.completed_at) return false;
    return Date.now() - new Date(a.completed_at).getTime() < 72 * 3600 * 1000;
  };
  const newResponses = completed.filter(isNew);

  const shown = filter === "nuevas"     ? newResponses
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
          { id:"nuevas",     label:"Nuevas",      value:newResponses.length, color:T.suc, bg:T.sucA, Icon:Bell         },
          { id:"pendientes", label:"Pendientes",  value:pending.length,      color:T.war, bg:T.warA, Icon:Clock        },
          { id:"todas",      label:"Completadas", value:completed.length,    color:T.p,   bg:T.pA,   Icon:CheckCircle2 },
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
        <button onClick={load}
          style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 10px", borderRadius:9999,
            border:`1px solid ${T.bdrL}`, background:"transparent", cursor:"pointer", color:T.tl,
            fontFamily:T.fB, fontSize:11 }}>
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
        const tpl     = getTemplate(a.template_id);
        const pt      = getPatient(a);
        const esNueva = isNew(a);
        const done    = a.status === "completed";

        return (
          <div key={a.id} style={{ background:T.card, borderRadius:14, padding:"14px 16px", marginBottom:10,
            border:`1.5px solid ${esNueva && done ? T.suc+"40" : T.bdr}`,
            boxShadow: esNueva && done ? `0 0 0 3px ${T.suc}15` : "none" }}>
            <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>

              {/* Avatar paciente */}
              <div style={{ width:40, height:40, borderRadius:"50%", background:T.pA,
                display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
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
                    <span style={{ padding:"2px 8px", borderRadius:9999, background:T.sucA, color:T.suc,
                      fontSize:10, fontWeight:700, fontFamily:T.fB }}>
                      NUEVA
                    </span>
                  )}
                  {!done && (
                    <span style={{ padding:"2px 8px", borderRadius:9999, background:T.warA, color:T.war,
                      fontSize:10, fontWeight:700, fontFamily:T.fB }}>
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
                    style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 12px", borderRadius:9,
                      border:`1.5px solid ${T.p}`, background:T.pA, color:T.p,
                      fontFamily:T.fB, fontSize:12, fontWeight:600, cursor:"pointer" }}>
                    <Eye size={13}/> Ver
                  </button>
                )}
                {pt?.phone && !done && (
                  <div style={{ display:"flex", flexDirection:"column", gap:4, alignItems:"flex-end" }}>
                    <button type="button"
                      onClick={() => void openTaskWhatsApp(pt.phone, a.patient_name, a.title, profile, setTaskLinkError)}
                      style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 12px", borderRadius:9,
                        border:`1.5px solid ${WA}`, background:`rgba(37,211,102,0.08)`, color:WA_DARK,
                        fontFamily:T.fB, fontSize:12, fontWeight:600, cursor:"pointer", textDecoration:"none" }}>
                      <MessageCircle size={13}/> Recordar
                    </button>
                    {taskLinkError && (
                      <div style={{ fontFamily:T.fB, fontSize:11, color:T.err, background:T.errA,
                        borderRadius:7, padding:"4px 8px", lineHeight:1.35, textAlign:"center" }}>
                        No se pudo generar el enlace
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Respuesta preview (solo si completada y tiene notes) */}
            {done && a.notes && (
              <div style={{ marginTop:10, padding:"8px 12px", background:T.bdrL, borderRadius:8,
                fontFamily:T.fB, fontSize:12, color:T.tm, lineHeight:1.5, borderLeft:`3px solid ${T.p}` }}>
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
export default function Tasks({ patients, sessions = [], onNavigate, profile }) {
  const isMobile = useIsMobile();
  const isWide   = useIsWide();

  const {
    view, setView,
    assignments, loading, error, filterPt, setFilterPt, load,
    viewResponses, setViewResponses,
    showAdd, setShowAdd, openAdd,
    filterCat, setFilterCat,
    selPatient, handleSelectPatient,
    selTemplate, setSelTemplate,
    notes, setNotes,
    saving, saveError,
    handleSave, handleDelete,
    filteredTemplates, canSave,
    activePatientContext,
  } = useTasks(patients);

  return (
    <div style={{ maxWidth: isWide ? "none" : 960, paddingBottom: 40 }}>
      <PageHeader
        title="Tareas"
        subtitle="Respuestas de pacientes y gestión de tareas"
        action={<Btn onClick={openAdd}><Plus size={15}/> Nueva tarea</Btn>}
      />

      {/* Tarjetas de resumen */}
      <div style={{
        display:"grid",
        gridTemplateColumns:isMobile ? "1fr" : "1.3fr 1fr 1fr",
        gap:10,
        marginBottom:18,
      }}>
        <div style={{ padding:"14px 16px", borderRadius:18,
          background:`linear-gradient(135deg, ${T.pA} 0%, rgba(196,137,90,0.08) 100%)`,
          border:`1px solid ${T.bdrL}` }}>
          <div style={{ fontFamily:T.fB, fontSize:10.5, fontWeight:700, color:T.p, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:5 }}>
            Contexto activo
          </div>
          <div style={{ fontFamily:T.fH, fontSize:18, color:T.t, lineHeight:1.15, marginBottom:4 }}>
            {activePatientContext?.patientName || "Sin paciente activo"}
          </div>
          <div style={{ fontFamily:T.fB, fontSize:12.5, color:T.tl }}>
            Las tareas se abren ya filtradas al paciente que estaba en uso.
          </div>
        </div>
        <div style={{ padding:"14px 16px", borderRadius:18, background:T.card, border:`1px solid ${T.bdrL}` }}>
          <div style={{ fontFamily:T.fB, fontSize:10.5, fontWeight:700, color:T.tl, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:5 }}>
            Respuestas
          </div>
          <div style={{ fontFamily:T.fH, fontSize:20, color:T.p, lineHeight:1.1 }}>{assignments.length}</div>
          <div style={{ fontFamily:T.fB, fontSize:12, color:T.tl, marginTop:4 }}>Resultados cargados</div>
        </div>
        <div style={{ padding:"14px 16px", borderRadius:18, background:T.card, border:`1px solid ${T.bdrL}` }}>
          <div style={{ fontFamily:T.fB, fontSize:10.5, fontWeight:700, color:T.tl, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:5 }}>
            Pendientes
          </div>
          <div style={{ fontFamily:T.fH, fontSize:20, color:T.war, lineHeight:1.1 }}>
            {assignments.filter(a => a.status === "pending").length}
          </div>
          <div style={{ fontFamily:T.fB, fontSize:12, color:T.tl, marginTop:4 }}>Sin respuesta aún</div>
        </div>
      </div>

      {/* Vista tabs */}
      <div style={{
        display:"grid",
        gridTemplateColumns:isMobile ? "1fr" : "1fr 1fr",
        gap:8, marginBottom:18, padding:"10px",
        border:`1px solid ${T.bdrL}`, borderRadius:18,
        background:T.card, boxShadow:T.sh,
      }}>
        {[
          { id:"dashboard", label:"Respuestas" },
          { id:"manage",    label:"Por paciente" },
        ].map(v => (
          <button key={v.id} onClick={() => setView(v.id)}
            style={{ padding:"11px 18px", border:"none",
              background:view===v.id ? T.pA : "transparent",
              cursor:"pointer", fontFamily:T.fB, fontSize:13.5,
              fontWeight: view===v.id ? 700 : 400,
              color: view===v.id ? T.p : T.tm,
              borderRadius:14,
              boxShadow:view===v.id ? "0 8px 16px rgba(58,107,110,0.10)" : "none",
              transition:"all .15s" }}>
            {v.label}
          </button>
        ))}
      </div>

      {/* Dashboard de respuestas */}
      {view === "dashboard" && (
        <ResponsesDashboard patients={patients} onViewResponses={setViewResponses} profile={profile}/>
      )}

      {/* Gestión por paciente */}
      {view === "manage" && (
        <div>
          <div style={{ display:"flex", gap:10, marginBottom:20, flexWrap:"wrap", alignItems:"center" }}>
            <select value={filterPt} onChange={e => setFilterPt(e.target.value)}
              style={{ padding:"9px 14px", border:`1.5px solid ${T.bdr}`, borderRadius:10,
                fontFamily:T.fB, fontSize:13.5, color:T.t, background:T.card,
                cursor:"pointer", outline:"none", flex:1, minWidth:200 }}>
              <option value="">— Selecciona un paciente —</option>
              {patients.map(p => <option key={p.id} value={p.id}>{(p.name || "").split(" ").slice(0,2).join(" ")}</option>)}
            </select>
            {filterPt && (
              <button onClick={load} title="Actualizar"
                style={{ padding:"9px 12px", border:`1.5px solid ${T.bdr}`, borderRadius:10,
                  background:T.card, cursor:"pointer", color:T.tm }}>
                <RefreshCw size={15}/>
              </button>
            )}
          </div>

          {error && (
            <div style={{ padding:"12px 16px", background:T.errA, borderRadius:10,
              border:`1.5px solid rgba(184,80,80,0.2)`, fontFamily:T.fB, fontSize:13,
              color:T.err, marginBottom:16 }}>
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
            <AssignmentCard key={a.id} assignment={a} onDelete={handleDelete} onViewResponses={setViewResponses} profile={profile}/>
          ))}
        </div>
      )}

      {/* Responses modal */}
      {viewResponses && (
        <ResponsesModal assignment={viewResponses} onClose={() => setViewResponses(null)}/>
      )}

      {/* ── New assignment modal ──────────────────────────────────────────── */}
      <PageView open={showAdd} onClose={() => setShowAdd(false)} title="Asignar tarea terapéutica" backLabel="Tareas" maxWidth={800}>
        <div style={isWide ? { display:"grid", gridTemplateColumns:"1fr 320px", gap:18, alignItems:"start" } : {}}>
          <div>
            <Select label="Paciente *" value={selPatient} onChange={handleSelectPatient}
              options={[{value:"",label:"Seleccionar paciente..."}, ...patients.map(p => ({value:p.id, label:p.name}))]}/>

            {selPatient && !patients.find(p => p.id === selPatient)?.phone && (
              <div style={{ padding:"10px 14px", background:T.warA, borderRadius:10, fontFamily:T.fB,
                fontSize:12.5, color:T.war, marginBottom:16, border:`1px solid rgba(184,144,10,0.2)` }}>
                ⚠️ Este paciente no tiene teléfono registrado. Agrégalo en su expediente para poder enviarle la tarea por WhatsApp.
              </div>
            )}

            <div style={{ marginBottom:12 }}>
              <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.tm,
                textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>
                Plantilla de tarea *
              </label>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:12 }}>
                {["Todas", ...TASK_CATEGORIES].map(cat => {
                  const active = filterCat === cat;
                  return (
                    <button key={cat} onClick={() => setFilterCat(cat)}
                      style={{ padding:"5px 12px", borderRadius:9999,
                        border:`1.5px solid ${active ? T.p : T.bdrL}`,
                        background: active ? T.pA : "transparent",
                        color: active ? T.p : T.tm,
                        fontFamily:T.fB, fontSize:12, fontWeight: active ? 700 : 400,
                        cursor:"pointer", transition:"all .12s" }}>
                      {cat}
                    </button>
                  );
                })}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:8, maxHeight:340, overflowY:"auto", paddingRight:4 }}>
                {filteredTemplates.map(tpl => (
                  <TemplateCard key={tpl.id} tpl={tpl} selected={selTemplate} onSelect={setSelTemplate}/>
                ))}
              </div>
            </div>

            <Textarea label="Instrucciones adicionales (opcional)"
              value={notes} onChange={setNotes}
              placeholder="Ej. Completa esto antes del jueves, enfócate especialmente en las situaciones del trabajo..."
              rows={2}/>

            {saveError && (
              <div style={{ padding:"10px 14px", background:T.errA, borderRadius:10, fontFamily:T.fB, fontSize:12.5, color:T.err, marginBottom:16 }}>
                {saveError}
              </div>
            )}
          </div>

          <div style={{ display:"grid", gap:12, position:isWide ? "sticky" : "static", top:0 }}>
            <div style={{ padding:"14px 16px", borderRadius:18, background:T.card, border:`1px solid ${T.bdrL}`, boxShadow:T.sh }}>
              <div style={{ fontFamily:T.fB, fontSize:10.5, fontWeight:700, color:T.tl, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>
                Resumen
              </div>
              <div style={{ fontFamily:T.fH, fontSize:20, color:T.t, marginBottom:4 }}>
                {selPatient ? (patients.find(p => p.id === selPatient)?.name || "Paciente") : "Selecciona un paciente"}
              </div>
              <div style={{ fontFamily:T.fB, fontSize:12.5, color:T.tl, lineHeight:1.5 }}>
                {selTemplate ? `${selTemplate.icon} ${selTemplate.title}` : "Elige una plantilla para seguir."}
              </div>
            </div>

            {selPatient && patients.find(p => p.id === selPatient)?.phone && (
              <div style={{ padding:"12px 14px", background:T.pA, borderRadius:14, fontFamily:T.fB, fontSize:12, color:T.p, wordBreak:"break-word" }}>
                🔗 El paciente recibirá un enlace temporal y seguro al portal.
              </div>
            )}

            <div style={{ padding:"14px", borderRadius:18, background:"rgba(58,107,110,0.06)", border:`1px solid rgba(58,107,110,0.14)` }}>
              <div style={{ fontFamily:T.fB, fontSize:11, fontWeight:700, color:T.p, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>
                Antes de guardar
              </div>
              <div style={{ fontFamily:T.fB, fontSize:12.5, color:T.tm, lineHeight:1.55 }}>
                Mantén la tarea breve y específica. El paciente la verá en el portal y por WhatsApp si tiene teléfono.
              </div>
            </div>
          </div>
        </div>

        <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:18 }}>
          <Btn onClick={handleSave} disabled={!canSave || saving}>
            {saving ? "Guardando..." : <><ClipboardList size={14}/> Asignar tarea</>}
          </Btn>
        </div>
      </PageView>
    </div>
  );
}
