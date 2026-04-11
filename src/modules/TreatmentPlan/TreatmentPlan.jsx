import { useState } from "react";
import {
  Target, Plus, Printer, Trash2, Check,
  ChevronDown, ChevronUp, CheckCircle, Circle, Clock,
  AlertTriangle, FileText, Award, CalendarPlus,
} from "lucide-react";
import { T } from "../../theme.js";
import { fmtDate } from "../../utils.js";
import { Card, Badge, Input, Textarea, Select, Btn, EmptyState, PageHeader, Tabs } from "../../components/ui/index.jsx";
import { PageView } from "../../components/PageView.jsx";
import { useIsWide } from "../../hooks/useIsWide.js";

import {
  useTreatmentPlan,
  usePlanDetail,
  useAltaTab,
  OBJECTIVE_STATUS,
  OBJECTIVE_HORIZON,
  PLAN_STATUS,
  FORMULATION_SECTIONS,
  BLANK_NEW_OBJ,
  printPlan,
} from "./useTreatmentPlan.js";

import { BLANK_FORMULATION } from "./treatmentPlan.utils.js";

// ─────────────────────────────────────────────────────────────────────────────
// FORMULACIÓN CLÍNICA ESTRUCTURADA
// ─────────────────────────────────────────────────────────────────────────────
function FormulacionEstructurada({ formulation = {}, onChange }) {
  const f     = { ...BLANK_FORMULATION, ...formulation };
  const set   = key => e => onChange({ ...f, [key]: e.target.value });
  const filled = Object.values(f).filter(Boolean).length;
  const total  = Object.keys(BLANK_FORMULATION).length;

  return (
    <div>
      {/* Progress indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, padding: "12px 16px", background: T.cardAlt, borderRadius: 12, border: `1px solid ${T.bdrL}` }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontFamily: T.fB, fontSize: 12, fontWeight: 600, color: T.tm }}>Formulación completada</span>
            <span style={{ fontFamily: T.fB, fontSize: 12, fontWeight: 700, color: filled === total ? T.suc : T.p }}>{filled}/{total} secciones</span>
          </div>
          <div style={{ height: 6, background: T.bdrL, borderRadius: 9999, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(filled / total) * 100}%`, background: filled === total ? T.suc : T.p, borderRadius: 9999, transition: "width .3s" }}/>
          </div>
        </div>
      </div>

      {FORMULATION_SECTIONS.map(({ group, color, bg, fields }) => (
        <div key={group} style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color, marginBottom: 12, display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }}/>
            {group}
          </div>
          <div style={{ border: `1.5px solid ${color}30`, borderRadius: 12, overflow: "hidden" }}>
            {fields.map((field, idx) => (
              <div key={field.key} style={{ borderBottom: idx < fields.length - 1 ? `1px solid ${T.bdrL}` : "none" }}>
                <div style={{ padding: "9px 14px 6px", background: bg }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.07em" }}>{field.label}</label>
                </div>
                <textarea
                  value={f[field.key]}
                  onChange={set(field.key)}
                  placeholder={field.placeholder}
                  rows={field.rows}
                  style={{ width: "100%", padding: "11px 14px", border: "none", outline: "none", fontFamily: T.fB, fontSize: 13.5, color: T.t, background: T.card, resize: "vertical", boxSizing: "border-box", lineHeight: 1.65 }}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OBJECTIVE ITEM
// ─────────────────────────────────────────────────────────────────────────────
function ObjectiveItem({ obj, onUpdate, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const hs = OBJECTIVE_STATUS[obj.status];
  const hz = OBJECTIVE_HORIZON[obj.horizon];

  const StatusIcon = obj.status === "logrado"    ? CheckCircle
    : obj.status === "en_proceso"                ? Clock
    : obj.status === "abandonado"                ? AlertTriangle
    : Circle;

  const cycleStatus = () => {
    const order = ["pendiente", "en_proceso", "logrado"];
    const idx  = order.indexOf(obj.status);
    const next = order[(idx + 1) % order.length];
    onUpdate({
      ...obj,
      status: next,
      achievedDate: next === "logrado" ? new Date().toISOString().split("T")[0] : obj.achievedDate,
    });
  };

  return (
    <div style={{ padding: "14px 16px", background: T.cardAlt, borderRadius: 12, marginBottom: 8, border: `1px solid ${T.bdrL}` }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <button onClick={cycleStatus} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 0", flexShrink: 0, marginTop: 1 }}>
          <StatusIcon size={18} color={hs.color} strokeWidth={1.8}/>
        </button>

        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: T.fB, fontSize: 13.5, color: T.t, lineHeight: 1.55, marginBottom: 8 }}>
            {obj.description}
          </div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            <span style={{ padding: "2px 9px", borderRadius: 9999, background: hz.bg, color: hz.color, fontSize: 10, fontWeight: 700, fontFamily: T.fB }}>{hz.label}</span>
            <span style={{ padding: "2px 9px", borderRadius: 9999, background: hs.bg, color: hs.color, fontSize: 10, fontWeight: 700, fontFamily: T.fB }}>{hs.label}</span>
            {obj.achievedDate && <span style={{ fontSize: 10, color: T.suc, fontFamily: T.fB, fontWeight: 600 }}>✓ {fmtDate(obj.achievedDate)}</span>}
          </div>

          {expanded && (
            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: T.tl, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Intervenciones</label>
                <textarea value={obj.interventions || ""} onChange={e => onUpdate({ ...obj, interventions: e.target.value })}
                  placeholder="Técnicas y estrategias para lograr este objetivo..." rows={2}
                  style={{ width: "100%", padding: "8px 12px", border: `1px solid ${T.bdr}`, borderRadius: 8, fontFamily: T.fB, fontSize: 13, color: T.t, background: T.card, outline: "none", resize: "vertical", boxSizing: "border-box" }}/>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: T.tl, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Criterios de logro</label>
                <textarea value={obj.criteria || ""} onChange={e => onUpdate({ ...obj, criteria: e.target.value })}
                  placeholder="¿Cómo sabremos que este objetivo fue alcanzado?" rows={2}
                  style={{ width: "100%", padding: "8px 12px", border: `1px solid ${T.bdr}`, borderRadius: 8, fontFamily: T.fB, fontSize: 13, color: T.t, background: T.card, outline: "none", resize: "vertical", boxSizing: "border-box" }}/>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: T.tl, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Horizonte</label>
                  <select value={obj.horizon} onChange={e => onUpdate({ ...obj, horizon: e.target.value })}
                    style={{ width: "100%", padding: "7px 10px", border: `1px solid ${T.bdr}`, borderRadius: 8, fontFamily: T.fB, fontSize: 12, color: T.t, background: T.card, outline: "none" }}>
                    {Object.entries(OBJECTIVE_HORIZON).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: T.tl, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Estado</label>
                  <select value={obj.status}
                    onChange={e => onUpdate({ ...obj, status: e.target.value, achievedDate: e.target.value === "logrado" ? new Date().toISOString().split("T")[0] : obj.achievedDate })}
                    style={{ width: "100%", padding: "7px 10px", border: `1px solid ${T.bdr}`, borderRadius: 8, fontFamily: T.fB, fontSize: 12, color: T.t, background: T.card, outline: "none" }}>
                    {Object.entries(OBJECTIVE_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          <button onClick={() => setExpanded(e => !e)} style={{ background: T.bdrL, border: "none", borderRadius: 7, padding: 6, cursor: "pointer", color: T.tm }}>
            {expanded ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
          </button>
          <button onClick={() => onDelete(obj.id)} style={{ background: "none", border: "none", color: T.tl, cursor: "pointer", padding: 6 }}>
            <Trash2 size={13}/>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ALTA TAB — Flujo guiado de cierre terapéutico
// ─────────────────────────────────────────────────────────────────────────────
function AltaTab({ plan, patient, sessions, scaleResults, profile, onUpdate, setAppointments }) {
  const {
    discharge,
    pct,
    isComplete,
    scaleComps,
    objectives,
    achieved,
    setDischargeField,
    createFollowUps,
    confirmAlta,
    handlePrintAltaPDF,
  } = useAltaTab({ plan, patient, sessions, scaleResults, profile, onUpdate, setAppointments });

  return (
    <div>
      {/* Estado actual */}
      {isComplete ? (
        <div style={{ padding: "14px 18px", background: T.sucA, borderRadius: 12, border: `1.5px solid rgba(78,139,95,0.3)`, marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: T.fB, fontSize: 13, fontWeight: 700, color: T.suc, marginBottom: 2 }}>
              ✓ Alta registrada el {fmtDate(discharge.completedAt || plan.startDate)}
            </div>
            <div style={{ fontFamily: T.fB, fontSize: 12, color: T.tm }}>
              El plan está marcado como completado. Puedes imprimir el informe o editar los campos abajo.
            </div>
          </div>
          <Btn small onClick={handlePrintAltaPDF}><Printer size={13}/> Informe PDF</Btn>
        </div>
      ) : (
        <div style={{ padding: "14px 18px", background: T.pA, borderRadius: 12, border: `1px solid ${T.p}20`, marginBottom: 20 }}>
          <div style={{ fontFamily: T.fB, fontSize: 12, color: T.p, lineHeight: 1.65 }}>
            <strong>Flujo de alta terapéutica</strong> — Completa los campos, luego confirma el alta para marcar el plan como completado y generar el informe.
          </div>
        </div>
      )}

      {/* 1. Resumen automático */}
      <div style={{ background: T.cardAlt, borderRadius: 12, padding: "16px 18px", marginBottom: 16, border: `1px solid ${T.bdrL}` }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.tm, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
          Resumen del proceso (auto-generado)
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px,1fr))", gap: 10, marginBottom: pct !== null ? 14 : 0 }}>
          {sessions.length > 0 && (
            <div style={{ background: T.card, padding: "10px 12px", borderRadius: 9, textAlign: "center" }}>
              <div style={{ fontFamily: T.fH, fontSize: 24, color: T.p }}>{sessions.length}</div>
              <div style={{ fontFamily: T.fB, fontSize: 11, color: T.tm }}>sesiones</div>
            </div>
          )}
          {pct !== null && (
            <div style={{ background: T.card, padding: "10px 12px", borderRadius: 9, textAlign: "center" }}>
              <div style={{ fontFamily: T.fH, fontSize: 24, color: T.suc }}>{pct}%</div>
              <div style={{ fontFamily: T.fB, fontSize: 11, color: T.tm }}>objetivos</div>
            </div>
          )}
          {scaleComps.length > 0 && (
            <div style={{ background: T.card, padding: "10px 12px", borderRadius: 9, textAlign: "center" }}>
              <div style={{ fontFamily: T.fH, fontSize: 24, color: T.acc }}>{scaleComps.length}</div>
              <div style={{ fontFamily: T.fB, fontSize: 11, color: T.tm }}>escalas</div>
            </div>
          )}
        </div>
        {pct !== null && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontFamily: T.fB, fontSize: 11, color: T.tm }}>{achieved}/{objectives.length} objetivos logrados</span>
              <span style={{ fontFamily: T.fB, fontSize: 11, fontWeight: 700, color: pct === 100 ? T.suc : T.p }}>{pct}%</span>
            </div>
            <div style={{ height: 6, background: T.bdrL, borderRadius: 9999, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? T.suc : T.p, borderRadius: 9999 }}/>
            </div>
          </div>
        )}
        {scaleComps.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.tl, marginBottom: 6 }}>Evolución en escalas</div>
            {scaleComps.map(sc => {
              const delta = sc.count > 1 ? sc.last.score - sc.first.score : null;
              const color = delta === null ? T.tm : delta < 0 ? T.suc : delta > 0 ? T.err : T.tm;
              const arrow = delta === null ? "→" : delta < 0 ? "▼" : delta > 0 ? "▲" : "=";
              return (
                <div key={sc.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: `1px solid ${T.bdrL}` }}>
                  <span style={{ fontFamily: T.fB, fontSize: 12, fontWeight: 700, color: T.tm, minWidth: 60 }}>{sc.id}</span>
                  <span style={{ fontFamily: T.fB, fontSize: 12, color: T.tl }}>{sc.first.score}</span>
                  <span style={{ fontFamily: T.fB, fontSize: 12, color: T.tl }}>→</span>
                  <span style={{ fontFamily: T.fB, fontSize: 12, fontWeight: 700, color: T.t }}>{sc.last.score}</span>
                  {delta !== null && (
                    <span style={{ fontFamily: T.fB, fontSize: 11, fontWeight: 700, color, marginLeft: "auto" }}>
                      {arrow} {Math.abs(delta)} pts
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Campos narrativos */}
      {[
        { key: "estadoAlta",         label: "Estado al alta *",                  hint: "Condición del paciente al cierre: funcionamiento, síntomas residuales, capacidades adquiridas.",   rows: 4 },
        { key: "prevencionRecaidas", label: "Plan de prevención de recaídas *",  hint: "Estrategias acordadas para mantener los logros y actuar ante señales de recaída.",               rows: 4 },
        { key: "recomendaciones",    label: "Recomendaciones post-alta",         hint: "Seguimiento sugerido, grupos de apoyo, recursos, indicaciones de retorno a consulta.",            rows: 3 },
      ].map(field => (
        <div key={field.key} style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.t, marginBottom: 4 }}>{field.label}</label>
          <div style={{ fontSize: 11, color: T.tl, marginBottom: 6 }}>{field.hint}</div>
          <textarea
            value={discharge[field.key] || ""}
            onChange={e => setDischargeField(field.key)(e.target.value)}
            rows={field.rows}
            style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 13.5, color: T.t, background: T.card, outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: 1.65 }}
          />
        </div>
      ))}

      {/* 3. Seguimiento post-alta */}
      <div style={{ padding: "16px 18px", background: T.cardAlt, borderRadius: 12, border: `1px solid ${T.bdrL}`, marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.tm, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
          <CalendarPlus size={13} color={T.p}/> Programar citas de seguimiento post-alta
        </div>
        <div style={{ fontFamily: T.fB, fontSize: 12, color: T.tm, marginBottom: 12, lineHeight: 1.6 }}>
          Se crearán citas tipo <strong>Seguimiento post-alta</strong> en la agenda del paciente.
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            { label: "1 mes",     months: [1]       },
            { label: "1 + 3",     months: [1, 3]    },
            { label: "1 + 3 + 6", months: [1, 3, 6] },
          ].map(opt => (
            <button key={opt.label} onClick={() => createFollowUps(opt.months)}
              disabled={!setAppointments}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: T.pA, border: `1.5px solid ${T.p}30`, borderRadius: 9999, fontFamily: T.fB, fontSize: 12.5, fontWeight: 600, color: T.p, cursor: "pointer", transition: "all .13s" }}
              onMouseEnter={e => e.currentTarget.style.background = T.p + "20"}
              onMouseLeave={e => e.currentTarget.style.background = T.pA}>
              <CalendarPlus size={12}/> {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Confirmar alta + PDF */}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 16, borderTop: `1px solid ${T.bdrL}` }}>
        <Btn variant="ghost" onClick={handlePrintAltaPDF}><Printer size={14}/> Solo PDF</Btn>
        {!isComplete && (
          <Btn onClick={() => { confirmAlta(); handlePrintAltaPDF(); }} disabled={!discharge.estadoAlta?.trim()}>
            <Award size={14}/> Confirmar alta y generar informe
          </Btn>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PLAN DETAIL VIEW
// ─────────────────────────────────────────────────────────────────────────────
function PlanDetail({ plan, onUpdate, onDelete, onBack, patient, sessions, profile, setAppointments, scaleResults = [] }) {
  const {
    tab, setTab,
    showAddObj, setShowAddObj,
    newObj, setNewObj,
    objectives,
    achieved,
    inProgress,
    setPlanField,
    addObjective,
    updateObjective,
    deleteObjective,
    markReviewToday,
  } = usePlanDetail({ plan, onUpdate });

  const ptSessions = sessions.filter(s => s.patientId === plan.patientId);
  const ps = PLAN_STATUS[plan.status];

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: T.fB, fontSize: 13, color: T.p, padding: 0, display: "flex", alignItems: "center", gap: 5, marginBottom: 10, fontWeight: 600 }}>
            ← Todos los planes
          </button>
          <h1 style={{ fontFamily: T.fH, fontSize: 30, fontWeight: 500, color: T.t, margin: 0 }}>{patient?.name?.split(" ").slice(0, 2).join(" ")}</h1>
          <p style={{ fontFamily: T.fB, fontSize: 13, color: T.tm, margin: "4px 0 0" }}>Iniciado {fmtDate(plan.startDate)} · {ptSessions.length} sesiones</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <select value={plan.status} onChange={e => setPlanField("status")(e.target.value)}
            style={{ padding: "8px 14px", border: `1.5px solid ${ps.color}`, borderRadius: 9999, fontFamily: T.fB, fontSize: 12, fontWeight: 700, color: ps.color, background: ps.bg, cursor: "pointer", outline: "none" }}>
            {Object.entries(PLAN_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <Btn small onClick={() => printPlan(plan, patient, sessions, profile)}><Printer size={13}/> PDF</Btn>
          <button onClick={() => onDelete(plan.id)} style={{ background: "none", border: "none", color: T.tl, cursor: "pointer", padding: 6 }}><Trash2 size={15}/></button>
        </div>
      </div>

      {/* Progress bar */}
      {objectives.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontFamily: T.fB, fontSize: 12, color: T.tm }}>{achieved} / {objectives.length} objetivos logrados</span>
            <span style={{ fontFamily: T.fB, fontSize: 12, color: T.tm }}>{inProgress} en proceso</span>
          </div>
          <div style={{ height: 7, background: T.bdrL, borderRadius: 9999, overflow: "hidden", display: "flex", gap: 2 }}>
            <div style={{ height: "100%", width: `${(achieved / objectives.length) * 100}%`, background: T.suc, borderRadius: 9999, transition: "width .4s ease" }}/>
          </div>
        </div>
      )}

      <Tabs
        tabs={[
          { id: "objectives", label: `Objetivos (${objectives.length})` },
          { id: "clinical",   label: "Datos clínicos"                   },
          { id: "review",     label: "Revisiones"                       },
          { id: "alta",       label: plan.status === "completado" ? "✓ Alta registrada" : "Alta terapéutica" },
        ]}
        active={tab} onChange={setTab}
      />

      {/* OBJECTIVES TAB */}
      {tab === "objectives" && (
        <div>
          {["corto", "mediano", "largo"].map(hz => {
            const group = objectives.filter(o => o.horizon === hz);
            if (group.length === 0) return null;
            const hzCfg = OBJECTIVE_HORIZON[hz];
            return (
              <div key={hz} style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ padding: "3px 12px", borderRadius: 9999, background: hzCfg.bg, color: hzCfg.color, fontSize: 11, fontWeight: 700, fontFamily: T.fB }}>{hzCfg.label}</span>
                  <span style={{ fontSize: 12, color: T.tl, fontFamily: T.fB }}>{group.filter(o => o.status === "logrado").length}/{group.length} logrados</span>
                </div>
                {group.map(obj => (
                  <ObjectiveItem key={obj.id} obj={obj} onUpdate={updateObjective} onDelete={deleteObjective}/>
                ))}
              </div>
            );
          })}

          {objectives.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 0", color: T.tl }}>
              <Target size={36} strokeWidth={1.2} style={{ marginBottom: 12, opacity: 0.3 }}/>
              <div style={{ fontFamily: T.fB, fontSize: 13 }}>Sin objetivos aún. Agrega el primero.</div>
            </div>
          )}

          {/* Add objective */}
          {showAddObj ? (
            <Card style={{ padding: 18, marginTop: 12 }}>
              <div style={{ fontFamily: T.fB, fontSize: 13, fontWeight: 600, color: T.t, marginBottom: 12 }}>Nuevo objetivo</div>
              <div style={{ marginBottom: 12 }}>
                <textarea value={newObj.description} onChange={e => setNewObj(n => ({ ...n, description: e.target.value }))}
                  placeholder="Describe el objetivo terapéutico de forma observable y medible..." rows={2}
                  style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 13.5, color: T.t, background: T.card, outline: "none", resize: "vertical", boxSizing: "border-box" }}/>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.tm, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>Horizonte</label>
                  <select value={newObj.horizon} onChange={e => setNewObj(n => ({ ...n, horizon: e.target.value }))}
                    style={{ width: "100%", padding: "9px 12px", border: `1.5px solid ${T.bdr}`, borderRadius: 9, fontFamily: T.fB, fontSize: 13, color: T.t, background: T.card, outline: "none" }}>
                    {Object.entries(OBJECTIVE_HORIZON).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.tm, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>Estado inicial</label>
                  <select value={newObj.status} onChange={e => setNewObj(n => ({ ...n, status: e.target.value }))}
                    style={{ width: "100%", padding: "9px 12px", border: `1.5px solid ${T.bdr}`, borderRadius: 9, fontFamily: T.fB, fontSize: 13, color: T.t, background: T.card, outline: "none" }}>
                    {Object.entries(OBJECTIVE_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <Btn small variant="ghost" onClick={() => setShowAddObj(false)}>Cancelar</Btn>
                <Btn small onClick={addObjective} disabled={!newObj.description.trim()}><Check size={13}/> Agregar</Btn>
              </div>
            </Card>
          ) : (
            <button onClick={() => setShowAddObj(true)}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 16px", background: T.pA, border: `1.5px dashed ${T.p}`, borderRadius: 10, cursor: "pointer", fontFamily: T.fB, fontSize: 13, color: T.p, fontWeight: 600, width: "100%", marginTop: 8 }}>
              <Plus size={15}/> Agregar objetivo
            </button>
          )}
        </div>
      )}

      {/* CLINICAL DATA TAB */}
      {tab === "clinical" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.tm, marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" }}>Fecha de inicio</label>
              <input type="date" value={plan.startDate} onChange={e => setPlanField("startDate")(e.target.value)}
                style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 14, color: T.t, background: T.card, outline: "none", boxSizing: "border-box" }}/>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.tm, marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" }}>Modalidad</label>
              <select value={plan.modality || ""} onChange={e => setPlanField("modality")(e.target.value)}
                style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 13.5, color: T.t, background: T.card, outline: "none" }}>
                <option value="">Seleccionar...</option>
                {["Individual", "Pareja", "Familiar", "Grupal"].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.tm, marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" }}>Motivo de consulta</label>
            <textarea value={plan.chiefComplaint || ""} onChange={e => setPlanField("chiefComplaint")(e.target.value)}
              placeholder="Descripción del problema presentado por el paciente al inicio del tratamiento..." rows={3}
              style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 13.5, color: T.t, background: T.card, outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: 1.65 }}/>
          </div>

          <div style={{ marginBottom: 16, padding: "14px 16px 6px", background: T.pA, borderRadius: 12, border: `1.5px solid ${T.p}20` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.p, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
              <FileText size={13}/> Formulación clínica — Modelo biopsicosocial
            </div>
            <FormulacionEstructurada
              formulation={plan.formulation}
              onChange={f => setPlanField("formulation")(f)}
            />
          </div>

          {[
            { key: "therapeuticApproach", label: "Enfoque y técnicas",  placeholder: "Marco teórico aplicado, técnicas principales (TCC, ACT, EMDR, etc.)...", rows: 3 },
            { key: "dischargeCriteria",   label: "Criterios de alta",   placeholder: "Indicadores que señalarán que el tratamiento ha concluido exitosamente...", rows: 3 },
          ].map(({ key, label, placeholder, rows }) => (
            <div key={key} style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.tm, marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</label>
              <textarea value={plan[key] || ""} onChange={e => setPlanField(key)(e.target.value)}
                placeholder={placeholder} rows={rows}
                style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 13.5, color: T.t, background: T.card, outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: 1.65 }}/>
            </div>
          ))}
        </div>
      )}

      {/* REVIEW TAB */}
      {tab === "review" && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.tm, marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" }}>Notas de revisión periódica</label>
            <textarea value={plan.reviewNotes || ""} onChange={e => setPlanField("reviewNotes")(e.target.value)}
              placeholder={`Última revisión: ${fmtDate(plan.lastReviewDate || plan.startDate)}\n\nRegistra el progreso general, ajustes al plan, cambios en el diagnóstico o en los objetivos...`}
              rows={8}
              style={{ width: "100%", padding: "12px 16px", border: `1.5px solid ${T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 13.5, color: T.t, background: T.card, outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: 1.7 }}/>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn small onClick={markReviewToday}>
              <Check size={13}/> Marcar revisión hoy
            </Btn>
          </div>
          {plan.lastReviewDate && (
            <div style={{ marginTop: 12, fontFamily: T.fB, fontSize: 12, color: T.tl }}>
              Última revisión registrada: {fmtDate(plan.lastReviewDate)}
            </div>
          )}

          {ptSessions.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div style={{ fontFamily: T.fB, fontSize: 11, fontWeight: 700, color: T.tm, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Historial de sesiones ({ptSessions.length})</div>
              {ptSessions.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10).map(s => {
                const fmt_def = s.noteFormat && s.noteFormat !== "libre" ? `[${s.noteFormat}]` : "";
                return (
                  <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderBottom: `1px solid ${T.bdrL}` }}>
                    <span style={{ fontFamily: T.fB, fontSize: 12, color: T.tm, minWidth: 90 }}>{fmtDate(s.date)}</span>
                    {fmt_def && <span style={{ fontFamily: T.fB, fontSize: 10, fontWeight: 700, color: T.p, background: T.pA, padding: "1px 6px", borderRadius: 4 }}>{fmt_def}</span>}
                    <span style={{ fontFamily: T.fB, fontSize: 13, color: T.t, flex: 1 }}>{s.notes?.slice(0, 80)}{s.notes?.length > 80 ? "…" : ""}</span>
                    <span style={{ fontFamily: T.fB, fontSize: 12, color: T.tl }}>{s.duration} min</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ALTA TAB */}
      {tab === "alta" && (
        <AltaTab
          plan={plan}
          patient={patient}
          sessions={ptSessions}
          scaleResults={scaleResults}
          profile={profile}
          onUpdate={onUpdate}
          setAppointments={setAppointments}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PLAN CARD (list view)
// ─────────────────────────────────────────────────────────────────────────────
function PlanCard({ plan, patient, sessions, onClick }) {
  const ps  = PLAN_STATUS[plan.status];
  const obj = plan.objectives || [];
  const achieved   = obj.filter(o => o.status === "logrado").length;
  const inProgress = obj.filter(o => o.status === "en_proceso").length;
  const ptSessions = sessions.filter(s => s.patientId === plan.patientId).length;
  const pct = obj.length > 0 ? Math.round((achieved / obj.length) * 100) : 0;

  return (
    <Card style={{ padding: 20, cursor: "pointer", transition: "all .15s" }}
      onClick={onClick}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = T.shM; e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = T.sh;  e.currentTarget.style.transform = "translateY(0)"; }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: ps.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontFamily: T.fH, fontSize: 19, color: ps.color }}>{patient?.name?.[0] || "?"}</span>
        </div>
        <span style={{ padding: "3px 10px", borderRadius: 9999, background: ps.bg, color: ps.color, fontSize: 10, fontWeight: 700, fontFamily: T.fB }}>{ps.label}</span>
      </div>
      <div style={{ fontFamily: T.fH, fontSize: 18, fontWeight: 500, color: T.t, marginBottom: 2 }}>{patient?.name?.split(" ").slice(0, 2).join(" ") || "Paciente"}</div>
      <div style={{ fontFamily: T.fB, fontSize: 12, color: T.tm, marginBottom: 12 }}>Desde {fmtDate(plan.startDate)} · {ptSessions} {ptSessions === 1 ? "sesión" : "sesiones"}</div>

      {obj.length > 0 && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ fontFamily: T.fB, fontSize: 11, color: T.tm }}>{achieved}/{obj.length} objetivos logrados</span>
          </div>
          <div style={{ height: 5, background: T.bdrL, borderRadius: 9999, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? T.suc : T.p, borderRadius: 9999, transition: "width .3s" }}/>
          </div>
          {inProgress > 0 && (
            <div style={{ fontFamily: T.fB, fontSize: 11, color: T.war, marginTop: 6 }}>{inProgress} en proceso</div>
          )}
        </div>
      )}

      {patient?.diagnosis && (
        <div style={{ marginTop: 10 }}>
          <Badge>{patient.diagnosis.split("—")[0].trim()}</Badge>
        </div>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN MODULE
// ─────────────────────────────────────────────────────────────────────────────
export default function TreatmentPlan({ treatmentPlans, setTreatmentPlans, patients, sessions, profile, scaleResults = [], setAppointments }) {
  const isWide = useIsWide();

  const {
    selected, setSelected,
    showNew,  setShowNew,
    newForm,  setNewForm,
    filterStatus,
    filtered,
    totalActive,
    patientsWithPlan,
    saveNew,
    updatePlan,
    deletePlan,
    toggleFilter,
    clearFilter,
  } = useTreatmentPlan({ treatmentPlans, setTreatmentPlans, patients });

  // Detail view
  if (selected) {
    const patient = patients.find(p => p.id === selected.patientId);
    return (
      <PlanDetail
        plan={selected}
        patient={patient}
        sessions={sessions}
        profile={profile}
        scaleResults={scaleResults}
        setAppointments={setAppointments}
        onUpdate={updatePlan}
        onDelete={(id) => { deletePlan(id); setSelected(null); }}
        onBack={() => setSelected(null)}
      />
    );
  }

  // List view
  return (
    <div style={{ maxWidth: isWide ? "none" : 960, paddingBottom: 40 }}>
      <PageHeader
        title="Tratamiento"
        subtitle={`${treatmentPlans.length} plan${treatmentPlans.length !== 1 ? "es" : ""} · ${totalActive} activo${totalActive !== 1 ? "s" : ""} · ${patientsWithPlan} paciente${patientsWithPlan !== 1 ? "s" : ""}`}
        action={<Btn onClick={() => setShowNew(true)}><Plus size={15}/> Nuevo plan</Btn>}
      />

      {/* Summary — una fila de 4 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 20 }}>
        {Object.entries(PLAN_STATUS).map(([k, v]) => {
          const count  = treatmentPlans.filter(p => p.status === k).length;
          const active = filterStatus === k;
          return (
            <button key={k}
              onClick={() => toggleFilter(k)}
              style={{ padding: "12px 8px", borderRadius: 14, textAlign: "center", cursor: "pointer",
                background: active ? v.bg : T.card,
                border: `2px solid ${active ? v.color + "60" : T.bdrL}`,
                boxShadow: active ? `0 0 0 3px ${v.color}15` : T.sh,
                transition: "all .13s" }}>
              <div style={{ fontFamily: T.fH, fontSize: 24, fontWeight: 500, color: active ? v.color : T.t, lineHeight: 1, marginBottom: 4 }}>{count}</div>
              <div style={{ fontFamily: T.fB, fontSize: 9, fontWeight: 700, color: active ? v.color : T.tl, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{v.label}</div>
            </button>
          );
        })}
      </div>

      {filterStatus !== "todos" && (
        <button onClick={clearFilter} style={{ marginBottom: 16, padding: "7px 14px", borderRadius: 9999, border: `1.5px solid ${T.bdr}`, background: T.bdrL, fontFamily: T.fB, fontSize: 12, color: T.tm, cursor: "pointer" }}>
          × Limpiar filtro
        </button>
      )}

      {filtered.length === 0
        ? <EmptyState icon={Target} title="Sin planes de tratamiento" desc="Crea el primer plan con el botón de arriba"/>
        : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))", gap: 14 }}>
            {filtered.map(plan => {
              const patient = patients.find(p => p.id === plan.patientId);
              return (
                <PlanCard key={plan.id} plan={plan} patient={patient} sessions={sessions} onClick={() => setSelected(plan)}/>
              );
            })}
          </div>
      }

      {/* New plan modal */}
      <PageView open={showNew} onClose={() => setShowNew(false)} title="Nuevo plan de tratamiento" backLabel="Planes de tratamiento" maxWidth={600}>
        <Select label="Paciente *" value={newForm.patientId} onChange={v => setNewForm(f => ({ ...f, patientId: v }))}
          options={[{ value: "", label: "Seleccionar paciente..." }, ...patients.map(p => ({ value: p.id, label: p.name }))]}/>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input label="Fecha de inicio" value={newForm.startDate} onChange={v => setNewForm(f => ({ ...f, startDate: v }))} type="date"/>
          <Select label="Modalidad" value={newForm.modality} onChange={v => setNewForm(f => ({ ...f, modality: v }))}
            options={[{ value: "", label: "Seleccionar..." }, ...["Individual", "Pareja", "Familiar", "Grupal"].map(m => ({ value: m, label: m }))]}/>
        </div>
        <Textarea label="Motivo de consulta" value={newForm.chiefComplaint} onChange={v => setNewForm(f => ({ ...f, chiefComplaint: v }))}
          placeholder="Descripción del problema presentado por el paciente..." rows={3}/>
        <Textarea label="Enfoque terapéutico" value={newForm.therapeuticApproach} onChange={v => setNewForm(f => ({ ...f, therapeuticApproach: v }))}
          placeholder="Marco teórico y técnicas principales (TCC, ACT, EMDR, etc.)..." rows={2}/>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>

          <Btn onClick={saveNew} disabled={!newForm.patientId}><Check size={15}/> Crear plan</Btn>
        </div>
      </PageView>
    </div>
  );
}
