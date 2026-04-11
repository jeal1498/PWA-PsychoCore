import { useState } from "react";
import { ShieldAlert, Plus, Printer, Trash2, Check, ChevronDown, ChevronUp, Shield } from "lucide-react";
import { T } from "../../theme.js";
import { fmtDate } from "../../utils.js";
import { Card, Input, Textarea, Select, Btn, EmptyState, PageHeader, Tabs } from "../../components/ui/index.jsx";
import { useIsMobile } from "../../hooks/useIsMobile.js";
import { useIsWide }   from "../../hooks/useIsWide.js";
import { RISK_CONFIG, PROTECTIVE_FACTORS, printAssessmentRecord, printSafetyPlan } from "./riskAssessment.utils.js";
import { useRiskAssessment, useAssessmentForm } from "./useRiskAssessment.js";

// ── Step indicator ────────────────────────────────────────────────────────────
function StepIndicator({ step, total }) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{ flex: 1, height: 4, borderRadius: 9999, background: i < step ? T.p : i === step ? T.acc : T.bdrL, transition: "background .2s" }}/>
      ))}
    </div>
  );
}

// ── Risk Badge component ──────────────────────────────────────────────────────
export function RiskBadge({ level, size = "normal" }) {
  if (!level) return null;
  const rc = RISK_CONFIG[level];
  if (!rc) return null;
  const small = size === "small";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: small ? "2px 8px" : "3px 10px", borderRadius: 9999, fontSize: small ? 10 : 11, fontWeight: 700, fontFamily: T.fB, color: rc.color, background: rc.bg, letterSpacing: "0.04em" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: rc.dot, flexShrink: 0 }}/>
      {rc.label}
    </span>
  );
}

// ── New assessment multi-step form ────────────────────────────────────────────
function AssessmentForm({ patients, onSave, onClose }) {
  const {
    step, form,
    set, setSP, toggleFactor,
    suggested, showPlanFields, TOTAL_STEPS,
    canNext, handleSave,
    goBack, goNext,
  } = useAssessmentForm({ onSave, onClose });

  const BoolToggle = ({ label, field }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: form[field] ? T.errA : T.bdrL, borderRadius: 10, marginBottom: 8, cursor: "pointer", border: `1.5px solid ${form[field] ? T.err : "transparent"}`, transition: "all .15s" }}
      onClick={() => set(field, !form[field])}>
      <span style={{ fontFamily: T.fB, fontSize: 13.5, color: form[field] ? T.err : T.t }}>{label}</span>
      <div style={{ width: 22, height: 22, borderRadius: 6, background: form[field] ? T.err : T.bdr, display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s" }}>
        {form[field] && <Check size={13} color="#fff" strokeWidth={2.5}/>}
      </div>
    </div>
  );

  return (
    <div>
      <StepIndicator step={step} total={TOTAL_STEPS} />

      {/* Step 0 — Datos básicos */}
      {step === 0 && (
        <div>
          <div style={{ fontFamily: T.fH, fontSize: 20, color: T.t, marginBottom: 18 }}>Datos de la evaluación</div>
          <Select label="Paciente *" value={form.patientId} onChange={v => set("patientId", v)}
            options={[{ value: "", label: "Seleccionar paciente..." }, ...patients.map(p => ({ value: p.id, label: p.name }))]}/>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Input label="Fecha" value={form.date} onChange={v => set("date", v)} type="date"/>
            <Select label="Tipo de evaluación" value={form.evaluatedBy} onChange={v => set("evaluatedBy", v)}
              options={[{ value: "intake", label: "Evaluación inicial" }, { value: "session", label: "Sesión" }, { value: "crisis", label: "Intervención en crisis" }]}/>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.tm, marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" }}>Intentos previos de suicidio</label>
            <input type="number" min="0" value={form.previousAttempts} onChange={e => set("previousAttempts", parseInt(e.target.value) || 0)}
              style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 14, color: T.t, background: T.card, outline: "none", boxSizing: "border-box" }}/>
          </div>
        </div>
      )}

      {/* Step 1 — Ideación suicida */}
      {step === 1 && (
        <div>
          <div style={{ fontFamily: T.fH, fontSize: 20, color: T.t, marginBottom: 6 }}>Ideación suicida y autolesiones</div>
          <div style={{ fontFamily: T.fB, fontSize: 13, color: T.tm, marginBottom: 20 }}>Registra lo observado en la sesión. El nivel de riesgo se calculará automáticamente.</div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.tm, marginBottom: 8, letterSpacing: "0.06em", textTransform: "uppercase" }}>Ideación suicida</label>
            <div style={{ display: "flex", gap: 8 }}>
              {[{ v: "ninguna", label: "Ninguna" }, { v: "pasiva", label: "Pasiva" }, { v: "activa", label: "Activa" }].map(({ v, label }) => {
                const isActive = form.suicidalIdeation === v;
                const color = v === "ninguna" ? T.suc : v === "pasiva" ? T.war : T.err;
                return (
                  <button key={v} onClick={() => set("suicidalIdeation", v)} style={{ flex: 1, padding: "12px 8px", border: `2px solid ${isActive ? color : T.bdr}`, borderRadius: 12, background: isActive ? (v === "ninguna" ? T.sucA : v === "pasiva" ? T.warA : T.errA) : T.card, cursor: "pointer", fontFamily: T.fB, fontSize: 13, fontWeight: isActive ? 700 : 400, color: isActive ? color : T.tm, transition: "all .15s" }}>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {form.suicidalIdeation === "activa" && (
            <div style={{ background: T.errA, border: `1.5px solid rgba(184,80,80,0.2)`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
              <div style={{ fontFamily: T.fB, fontSize: 12, fontWeight: 700, color: T.err, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Ideación activa — detallar</div>
              <BoolToggle label="¿Tiene un plan estructurado?" field="hasPlan"/>
              <BoolToggle label="¿Tiene acceso a medios letales?" field="hasMeans"/>
              <BoolToggle label="¿Manifiesta intención de actuar?" field="hasIntent"/>
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.tm, marginBottom: 8, letterSpacing: "0.06em", textTransform: "uppercase" }}>Autolesiones</label>
            <div style={{ display: "flex", gap: 8 }}>
              {[{ v: "ninguna", label: "Ninguna" }, { v: "pasada", label: "Historial previo" }, { v: "activa", label: "Actualmente activa" }].map(({ v, label }) => {
                const isActive = form.selfHarm === v;
                const color = v === "ninguna" ? T.suc : v === "pasada" ? T.war : T.err;
                return (
                  <button key={v} onClick={() => set("selfHarm", v)} style={{ flex: 1, padding: "11px 6px", border: `2px solid ${isActive ? color : T.bdr}`, borderRadius: 12, background: isActive ? (v === "ninguna" ? T.sucA : v === "pasada" ? T.warA : T.errA) : T.card, cursor: "pointer", fontFamily: T.fB, fontSize: 12.5, fontWeight: isActive ? 700 : 400, color: isActive ? color : T.tm, transition: "all .15s", textAlign: "center" }}>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <BoolToggle label="¿Existe riesgo a terceros?" field="harmToOthers"/>
        </div>
      )}

      {/* Step 2 — Factores protectores + nivel */}
      {step === 2 && (
        <div>
          <div style={{ fontFamily: T.fH, fontSize: 20, color: T.t, marginBottom: 6 }}>Factores protectores y nivel de riesgo</div>
          <div style={{ fontFamily: T.fB, fontSize: 13, color: T.tm, marginBottom: 20 }}>Marca los factores presentes. El nivel sugerido puede ajustarse clínicamente.</div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.tm, marginBottom: 10, letterSpacing: "0.06em", textTransform: "uppercase" }}>Factores protectores</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {PROTECTIVE_FACTORS.map(f => {
                const selected = form.protectiveFactors.includes(f);
                return (
                  <button key={f} onClick={() => toggleFactor(f)}
                    style={{ padding: "6px 12px", borderRadius: 9999, textAlign: "center",
                      border: `1.5px solid ${selected ? T.suc : T.bdr}`,
                      background: selected ? T.sucA : T.card,
                      color: selected ? T.suc : T.tm,
                      fontFamily: T.fB, fontSize: 12, fontWeight: selected ? 700 : 400,
                      cursor: "pointer", transition: "all .15s",
                      display: "inline-flex", alignItems: "center", gap: 4,
                      whiteSpace: "nowrap" }}>
                    {selected && <Check size={10} strokeWidth={2.5}/>}{f}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.tm, marginBottom: 8, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Nivel de riesgo
              <span style={{ marginLeft: 8, fontWeight: 400, textTransform: "none", letterSpacing: 0, fontSize: 11, color: T.tl }}>
                (sugerido: <strong style={{ color: RISK_CONFIG[suggested]?.color }}>{RISK_CONFIG[suggested]?.label}</strong>)
              </span>
            </label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {Object.entries(RISK_CONFIG).map(([k, rc]) => {
                const isActive = (form.riskLevel || suggested) === k;
                return (
                  <button key={k} onClick={() => set("riskLevel", k)} style={{ flex: 1, minWidth: 80, padding: "12px 8px", border: `2px solid ${isActive ? rc.color : T.bdr}`, borderRadius: 12, background: isActive ? rc.bg : T.card, cursor: "pointer", fontFamily: T.fB, fontSize: 13, fontWeight: isActive ? 700 : 400, color: isActive ? rc.color : T.tm, transition: "all .15s" }}>
                    {rc.label}
                  </button>
                );
              })}
            </div>
          </div>

          <Textarea label="Observaciones clínicas" value={form.clinicalNotes} onChange={v => set("clinicalNotes", v)}
            placeholder="Contexto clínico, intervenciones realizadas, respuesta del paciente..." rows={4}/>
        </div>
      )}

      {/* Step 3 — Plan de seguridad (solo si nivel >= moderado) */}
      {step === 3 && showPlanFields && (
        <div>
          <div style={{ fontFamily: T.fH, fontSize: 20, color: T.t, marginBottom: 6 }}>Plan de seguridad</div>
          <div style={{ fontFamily: T.fB, fontSize: 13, color: T.tm, marginBottom: 20 }}>El paciente se llevará este plan al finalizar la sesión. Complétalo de manera colaborativa.</div>

          <Textarea label="Señales de advertencia" value={form.safetyPlan.warningSignals} onChange={v => setSP("warningSignals", v)}
            placeholder="¿Qué pensamientos, sentimientos o situaciones indican que la crisis se acerca?" rows={3}/>
          <Textarea label="Estrategias de afrontamiento" value={form.safetyPlan.copingStrategies} onChange={v => setSP("copingStrategies", v)}
            placeholder="Actividades y técnicas que el paciente puede hacer solo para manejar la crisis..." rows={3}/>
          <Textarea label="Personas de apoyo" value={form.safetyPlan.supportContacts} onChange={v => setSP("supportContacts", v)}
            placeholder="Familiares o amigos de confianza a quienes puede llamar..." rows={2}/>
          <Textarea label="Contactos de emergencia" value={form.safetyPlan.professionalContacts} onChange={v => setSP("professionalContacts", v)}
            placeholder="Terapeuta, psiquiatra, SAPTEL 55 5259-8121, Línea de la Vida 800 911-2000..." rows={2}/>
          <Textarea label="Retiro de medios" value={form.safetyPlan.environmentSafety} onChange={v => setSP("environmentSafety", v)}
            placeholder="Acuerdos sobre retiro o aseguramiento de medios letales..." rows={2}/>
          <Textarea label="Razones para vivir" value={form.safetyPlan.reasonsToLive} onChange={v => setSP("reasonsToLive", v)}
            placeholder="Motivaciones personales que el paciente identifica para seguir adelante..." rows={2}/>
        </div>
      )}

      {/* Nav buttons */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, paddingTop: 20, borderTop: `1px solid ${T.bdrL}` }}>
        <Btn variant="ghost" onClick={goBack}>
          {step === 0 ? "Cancelar" : "← Atrás"}
        </Btn>
        {step < TOTAL_STEPS - 1
          ? <Btn onClick={goNext} disabled={!canNext()}>Continuar →</Btn>
          : <Btn onClick={handleSave} disabled={!form.patientId}><Check size={15}/> Guardar evaluación</Btn>
        }
      </div>
    </div>
  );
}

// ── Assessment detail card (expanded) ────────────────────────────────────────
function AssessmentCard({ a, patient, profile, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const rc = RISK_CONFIG[a.riskLevel];
  if (!rc) return null;

  return (
    <Card style={{ padding: 0, marginBottom: 12, overflow: "hidden" }}>
      {/* Contenido */}
      <div style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
          <span style={{ fontFamily: T.fB, fontSize: 14.5, fontWeight: 600, color: T.t }}>{patient?.name?.split(" ").slice(0, 2).join(" ") || "Paciente"}</span>
          <span style={{ fontSize: 11, color: T.tl }}>·</span>
          <span style={{ fontFamily: T.fB, fontSize: 12, color: T.tm }}>{fmtDate(a.date)}</span>
          <span style={{ fontSize: 11, color: T.tl }}>·</span>
          <span style={{ fontFamily: T.fB, fontSize: 12, color: T.tm }}>
            {{ session: "Sesión", intake: "Evaluación inicial", crisis: "Crisis" }[a.evaluatedBy] || a.evaluatedBy}
          </span>
        </div>

        <RiskBadge level={a.riskLevel}/>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8, marginBottom: a.clinicalNotes ? 8 : 0 }}>
          {a.suicidalIdeation !== "ninguna" && (
            <span style={{ fontFamily: T.fB, fontSize: 12, color: a.suicidalIdeation === "activa" ? T.err : T.war, fontWeight: 600 }}>
              ⚠ Ideación {a.suicidalIdeation}
            </span>
          )}
          {a.selfHarm === "activa" && <span style={{ fontFamily: T.fB, fontSize: 12, color: T.err, fontWeight: 600 }}>⚠ Autolesiones activas</span>}
          {a.harmToOthers && <span style={{ fontFamily: T.fB, fontSize: 12, color: T.err, fontWeight: 600 }}>⚠ Riesgo a terceros</span>}
          {a.previousAttempts > 0 && <span style={{ fontFamily: T.fB, fontSize: 12, color: T.war, fontWeight: 600 }}>{a.previousAttempts} intento{a.previousAttempts > 1 ? "s" : ""} previo{a.previousAttempts > 1 ? "s" : ""}</span>}
        </div>

        {a.clinicalNotes && (
          <p style={{ fontFamily: T.fB, fontSize: 13, color: T.tm, margin: 0, lineHeight: 1.6 }}>{a.clinicalNotes}</p>
        )}

        {expanded && a.protectiveFactors?.length > 0 && (
          <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
            {a.protectiveFactors.map(f => (
              <span key={f} style={{ padding: "3px 10px", borderRadius: 9999, background: T.sucA, color: T.suc, fontSize: 11, fontWeight: 600, fontFamily: T.fB }}>{f}</span>
            ))}
          </div>
        )}

        {expanded && a.safetyPlan && Object.values(a.safetyPlan).some(v => v) && (
          <div style={{ marginTop: 12, padding: 14, background: T.cardAlt, borderRadius: 10, border: `1px solid ${T.bdrL}` }}>
            <div style={{ fontFamily: T.fB, fontSize: 11, fontWeight: 700, color: T.tm, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Plan de seguridad</div>
            {[
              ["Señales de advertencia",    a.safetyPlan.warningSignals],
              ["Estrategias de afrontamiento", a.safetyPlan.copingStrategies],
              ["Personas de apoyo",         a.safetyPlan.supportContacts],
              ["Contactos profesionales",   a.safetyPlan.professionalContacts],
              ["Retiro de medios",          a.safetyPlan.environmentSafety],
              ["Razones para vivir",        a.safetyPlan.reasonsToLive],
            ].filter(([, v]) => v).map(([label, val]) => (
              <div key={label} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: T.tl, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 2 }}>{label}</div>
                <div style={{ fontFamily: T.fB, fontSize: 13, color: T.t, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{val}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Barra de acciones — flush al fondo */}
      <div style={{ borderTop: `1px solid ${T.bdrL}`, display: "flex", alignItems: "center", background: T.cardAlt }}>
        {[
          { label: expanded ? "Contraer" : "Ver más", icon: expanded ? ChevronUp : ChevronDown, onClick: () => setExpanded(e => !e), color: T.tm },
          { label: "PDF",   icon: Printer, onClick: () => printAssessmentRecord(a, patient, profile), color: T.tm },
          ...(a.safetyPlan && Object.values(a.safetyPlan).some(v => v)
            ? [{ label: "Plan", icon: Shield, onClick: () => printSafetyPlan(a, patient, profile), color: T.p }]
            : []),
          { label: "Borrar", icon: Trash2, onClick: () => {
              if (window.confirm(`¿Eliminar esta evaluación de riesgo?\n\nEsta acción no se puede deshacer.`)) onDelete(a.id);
            }, color: T.err },
        ].map(b => (
          <button key={b.label} onClick={b.onClick}
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              gap: 4, padding: "9px 2px", background: "none", border: "none",
              borderRight: `1px solid ${T.bdrL}`, cursor: "pointer",
              fontFamily: T.fB, fontSize: 11, fontWeight: 500, color: b.color,
              transition: "background .13s", whiteSpace: "nowrap" }}
            onMouseEnter={e => e.currentTarget.style.background = T.bdrL}
            onMouseLeave={e => e.currentTarget.style.background = "none"}>
            <b.icon size={12}/>{b.label}
          </button>
        ))}
      </div>
    </Card>
  );
}

// ── Main module ───────────────────────────────────────────────────────────────
export default function RiskAssessment({ riskAssessments = [], setRiskAssessments, patients = [], profile }) {
  const isWide = useIsWide();
  const isMobile = useIsMobile(); // eslint-disable-line no-unused-vars — disponible para uso futuro

  const {
    showForm, setShowForm,
    filterPt, setFilterPt,
    filterLevel, toggleLevelFilter,
    tab, setTab,
    filtered,
    alertCount,
    byLevel,
    latestByPatient,
    save,
    del,
  } = useRiskAssessment({ riskAssessments, setRiskAssessments, patients });

  return (
    <div style={{ maxWidth: isWide ? "none" : 960, paddingBottom: 40 }}>
      <PageHeader
        title="Riesgo"
        subtitle={`${riskAssessments.length} ${riskAssessments.length !== 1 ? "evaluaciones" : "evaluación"} registrada${riskAssessments.length !== 1 ? "s" : ""}${alertCount > 0 ? ` · ${alertCount} en nivel alto/inminente` : ""}`}
        action={<Btn onClick={() => setShowForm(true)}><Plus size={15}/> Nueva evaluación</Btn>}
      />

      {/* Summary cards — fila de 4 tapeables */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 20 }}>
        {Object.entries(RISK_CONFIG).map(([k, rc]) => {
          const active = filterLevel === k;
          const count  = byLevel[k] || 0;
          return (
            <button key={k}
              onClick={() => toggleLevelFilter(k)}
              style={{ padding: "12px 8px", borderRadius: 14, textAlign: "center", cursor: "pointer",
                background: active ? rc.bg : T.card,
                border: `2px solid ${active ? rc.color+"60" : T.bdrL}`,
                boxShadow: active ? `0 0 0 3px ${rc.color}15` : T.sh,
                transition: "all .13s" }}>
              <div style={{ fontFamily: T.fH, fontSize: 24, fontWeight: 500,
                color: active ? rc.color : T.t, lineHeight: 1, marginBottom: 4 }}>{count}</div>
              <div style={{ fontFamily: T.fB, fontSize: 9, fontWeight: 700,
                color: active ? rc.color : T.tl,
                textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{rc.label}</div>
            </button>
          );
        })}
      </div>

      <Tabs
        tabs={[{ id: "list", label: "Evaluaciones" }, { id: "patients", label: "Por paciente" }]}
        active={tab} onChange={setTab}
      />

      {tab === "list" && (
        <>
          <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
            <select value={filterPt} onChange={e => setFilterPt(e.target.value)}
              style={{ padding: "9px 14px", border: `1.5px solid ${T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 13.5, color: T.t, background: T.card, cursor: "pointer", outline: "none" }}>
              <option value="">Todos los pacientes</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.name.split(" ").slice(0, 2).join(" ")}</option>)}
            </select>
            {filterLevel !== "todos" && (
              <button onClick={() => toggleLevelFilter(filterLevel)} style={{ padding: "9px 14px", borderRadius: 10, border: `1.5px solid ${T.bdr}`, background: T.bdrL, fontFamily: T.fB, fontSize: 13, color: T.tm, cursor: "pointer" }}>
                × Limpiar filtro
              </button>
            )}
          </div>

          {filtered.length === 0
            ? <EmptyState icon={ShieldAlert} title="Sin evaluaciones" desc="Registra la primera evaluación de riesgo con el botón de arriba"/>
            : filtered.map(a => {
                const patient = patients.find(p => p.id === a.patientId);
                return <AssessmentCard key={a.id} a={a} patient={patient} profile={profile} onDelete={del}/>;
              })
          }
        </>
      )}

      {tab === "patients" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px,1fr))", gap: 14 }}>
          {patients.filter(p => latestByPatient[p.id]).map(p => {
            const latest = latestByPatient[p.id];
            const rc = RISK_CONFIG[latest.riskLevel];
            const count = riskAssessments.filter(a => a.patientId === p.id).length;
            return (
              <Card key={p.id} style={{ padding: "12px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {/* Avatar compacto */}
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: rc.bg,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontFamily: T.fH, fontSize: 17, color: rc.color }}>{p.name[0]}</span>
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <span style={{ fontFamily: T.fB, fontSize: 14, fontWeight: 600, color: T.t,
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {p.name.split(" ").slice(0, 2).join(" ")}
                      </span>
                      <RiskBadge level={latest.riskLevel}/>
                    </div>
                    <div style={{ fontFamily: T.fB, fontSize: 11.5, color: T.tm }}>
                      {fmtDate(latest.date)} · {count} evaluación{count !== 1 ? "es" : ""}
                    </div>
                    {latest.suicidalIdeation !== "ninguna" && (
                      <div style={{ fontFamily: T.fB, fontSize: 11, color: latest.suicidalIdeation === "activa" ? T.err : T.war, fontWeight: 600, marginTop: 2 }}>
                        ⚠ Ideación {latest.suicidalIdeation}
                      </div>
                    )}
                    {latest.protectiveFactors?.length > 0 && (
                      <div style={{ fontFamily: T.fB, fontSize: 11, color: T.suc, marginTop: 2 }}>
                        ✓ {latest.protectiveFactors.length} factor{latest.protectiveFactors.length > 1 ? "es" : ""} protector{latest.protectiveFactors.length > 1 ? "es" : ""}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
          {Object.keys(latestByPatient).length === 0 && (
            <EmptyState icon={Shield} title="Sin datos" desc="Las evaluaciones de riesgo aparecerán aquí agrupadas por paciente"/>
          )}
        </div>
      )}

      <PageView open={showForm} onClose={() => setShowForm(false)} title="Nueva evaluación" backLabel="Evaluaciones de riesgo" maxWidth={640}>
        <AssessmentForm patients={patients} onSave={save} onClose={() => setShowForm(false)}/>
      </PageView>
    </div>
  );
}
