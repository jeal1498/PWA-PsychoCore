import { FileText, Printer, ChevronRight, AlertTriangle, CheckCircle, Clock, TrendingUp, Clipboard, Check } from "lucide-react";
import { T } from "../../theme.js";
import { Btn, PageHeader } from "../../components/ui/index.jsx";
import { useIsMobile } from "../../hooks/useIsMobile.js";
import { useIsWide }   from "../../hooks/useIsWide.js";
import { RISK_CONFIG } from "../RiskAssessment/riskAssessment.utils.js";
import { useReports, REPORT_FIELDS } from "./useReports.js";

// ─────────────────────────────────────────────────────────────────────────────
// REPORT TYPE CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const REPORT_TYPES = {
  evaluacion: {
    id: "evaluacion",
    label: "Evaluación Inicial",
    desc: "Informe completo del proceso de evaluación: motivo de consulta, diagnóstico, escalas aplicadas y plan de tratamiento.",
    icon: Clipboard,
    color: T.p,
    bg: T.pA,
    requiredData: ["patient"],
    optionalData: ["treatmentPlan", "scales", "risk"],
  },
  alta: {
    id: "alta",
    label: "Alta Terapéutica",
    desc: "Resumen del proceso terapéutico, objetivos logrados, evolución en escalas y recomendaciones post-alta.",
    icon: CheckCircle,
    color: T.suc,
    bg: T.sucA,
    requiredData: ["patient", "sessions"],
    optionalData: ["treatmentPlan", "scales"],
  },
  derivacion: {
    id: "derivacion",
    label: "Derivación Extendida",
    desc: "Carta de derivación con historial clínico completo, tratamiento previo y motivo de referencia.",
    icon: ChevronRight,
    color: T.acc,
    bg: T.accA,
    requiredData: ["patient"],
    optionalData: ["scales", "risk", "sessions"],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
function DataChip({ ok, label }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 9999, fontSize: 11, fontWeight: 600, fontFamily: T.fB, background: ok ? T.sucA : T.bdrL, color: ok ? T.suc : T.tl, marginRight: 6, marginBottom: 6 }}>
      {ok ? <Check size={10} /> : <Clock size={10} />} {label}
    </span>
  );
}

function ReportTypeCard({ type, active, onClick, disabled }) {
  const Icon = type.icon;
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ display: "flex", alignItems: "flex-start", gap: 12, width: "100%", padding: 16, borderRadius: 12, border: `2px solid ${active ? type.color : T.bdr}`, background: active ? type.bg : T.card, cursor: disabled ? "not-allowed" : "pointer", textAlign: "left", transition: "all .15s", opacity: disabled ? 0.5 : 1, marginBottom: 10 }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: active ? type.bg : T.bdrL, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: `1.5px solid ${active ? type.color + "40" : "transparent"}` }}>
        <Icon size={16} color={active ? type.color : T.tm} />
      </div>
      <div>
        <div style={{ fontFamily: T.fB, fontSize: 13.5, fontWeight: 600, color: active ? type.color : T.t, marginBottom: 3 }}>{type.label}</div>
        <div style={{ fontFamily: T.fB, fontSize: 12, color: T.tm, lineHeight: 1.5,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {type.desc}
        </div>
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN MODULE
// ─────────────────────────────────────────────────────────────────────────────
export default function Reports({ patients = [], sessions = [], scaleResults = [], treatmentPlans = [], riskAssessments = [], profile }) {
  const isMobile = useIsMobile();
  const isWide   = useIsWide();

  const {
    selectedPatientId,
    reportType,
    customFields,
    generated,
    patient,
    ptData,
    hasMinData,
    progressPct,
    setField,
    handleGenerate,
    handleSelectPatient,
    handleSelectType,
  } = useReports({ patients, sessions, scaleResults, treatmentPlans, riskAssessments, profile });

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: isWide ? "none" : 960, paddingBottom: 40 }}>
      <PageHeader
        title="Informes"
        subtitle="Generación automática de informes a partir del expediente clínico"
      />

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "280px 1fr", gap: 24 }}>

        {/* ── LEFT PANEL ───────────────────────────────────────────── */}
        <div>
          {/* Patient selector */}
          <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.bdr}`, padding: 18, marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: T.tm, marginBottom: 10 }}>
              1 · Seleccionar paciente
            </div>
            <select value={selectedPatientId} onChange={e => handleSelectPatient(e.target.value)}
              style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${selectedPatientId ? T.p : T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 13.5, color: T.t, background: T.card, outline: "none", cursor: "pointer" }}>
              <option value="">Seleccionar paciente...</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>

            {/* Data availability */}
            {patient && ptData && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: T.tl, marginBottom: 8 }}>Datos disponibles</div>
                <DataChip ok label="Expediente" />
                <DataChip ok={ptData.ptSessions.length > 0} label={`${ptData.ptSessions.length} sesión${ptData.ptSessions.length !== 1 ? "es" : ""}`} />
                <DataChip ok={!!ptData.plan} label="Plan de tto." />
                <DataChip ok={!!(ptData.plan?.formulation && Object.values(ptData.plan.formulation).some(Boolean))} label="Formulación" />
                <DataChip ok={ptData.allScales.length > 0} label={`${ptData.allScales.length} escala${ptData.allScales.length !== 1 ? "s" : ""}`} />
                <DataChip ok={!!ptData.latestRisk} label="Evaluación riesgo" />
              </div>
            )}
          </div>

          {/* Report type */}
          <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.bdr}`, padding: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: T.tm, marginBottom: 12 }}>
              2 · Tipo de informe
            </div>
            {Object.values(REPORT_TYPES).map(type => (
              <ReportTypeCard
                key={type.id}
                type={type}
                active={reportType === type.id}
                disabled={!patient}
                onClick={() => handleSelectType(type.id)}
              />
            ))}
          </div>
        </div>

        {/* ── RIGHT PANEL ──────────────────────────────────────────── */}
        <div>
          {!patient ? (
            <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.bdr}`, padding: 48, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, minHeight: 400 }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: T.pA, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FileText size={24} color={T.p} />
              </div>
              <div style={{ fontFamily: T.fH, fontSize: 22, color: T.p, fontWeight: 500 }}>Selecciona un paciente</div>
              <div style={{ fontFamily: T.fB, fontSize: 13, color: T.tm, textAlign: "center", maxWidth: 340, lineHeight: 1.6 }}>
                El informe se construirá automáticamente con los datos existentes del expediente. Solo tendrás que completar los campos narrativos.
              </div>
            </div>
          ) : (
            <>
              {/* Report type header */}
              {(() => {
                const rt = REPORT_TYPES[reportType];
                const Icon = rt.icon;
                return (
                  <div style={{ background: rt.bg, borderRadius: 14, border: `1.5px solid ${rt.color}30`, padding: "18px 22px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: rt.bg, border: `1.5px solid ${rt.color}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={18} color={rt.color} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: T.fB, fontSize: 14, fontWeight: 700, color: rt.color }}>{rt.label}</div>
                      <div style={{ fontFamily: T.fB, fontSize: 12, color: T.tm, marginTop: 1 }}>Para: <strong style={{ color: T.t }}>{patient.name}</strong></div>
                    </div>
                    {!hasMinData && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 9999, background: T.warA, color: T.war, fontSize: 11, fontWeight: 700 }}>
                        <AlertTriangle size={11} /> Datos insuficientes
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Auto-populated data summary */}
              <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.bdr}`, padding: 18, marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: T.tm, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                  <TrendingUp size={12} color={T.p} /> Datos que se incluirán automáticamente
                </div>
                <div style={{ fontSize: 12.5, color: T.t, lineHeight: 1.7 }}>
                  {reportType === "evaluacion" && <>
                    ✓ Expediente del paciente (datos personales{patient.cie11Code ? `, diagnóstico CIE-11 ${patient.cie11Code}` : ", diagnóstico"})<br />
                    {ptData.plan && <>✓ Motivo de consulta y enfoque terapéutico<br /></>}
                    {ptData.plan?.formulation && Object.values(ptData.plan.formulation).some(Boolean) && <>✓ Formulación biopsicosocial estructurada ({Object.values(ptData.plan.formulation).filter(Boolean).length}/11 secciones)<br /></>}
                    {ptData.ptSessions.length > 0 && <>✓ Fecha de inicio y número de sesiones<br /></>}
                    {ptData.allScales.length > 0 && <>✓ Escalas psicométricas aplicadas ({ptData.allScales.length} resultado{ptData.allScales.length !== 1 ? "s" : ""})<br /></>}
                    {ptData.latestRisk && <>✓ Evaluación de riesgo (nivel: {RISK_CONFIG[ptData.latestRisk.riskLevel]?.label})<br /></>}
                    {ptData.plan?.objectives?.length > 0 && <>✓ Objetivos terapéuticos ({ptData.plan.objectives.length} objetivo{ptData.plan.objectives.length !== 1 ? "s" : ""})</>}
                  </>}
                  {reportType === "alta" && <>
                    ✓ Expediente del paciente<br />
                    {ptData.ptSessions.length > 0 && <>✓ Historial de sesiones ({ptData.ptSessions.length} en total, con progreso y distribución)<br /></>}
                    {ptData.allScales.length > 0 && <>✓ Evolución en escalas (primera vs. última aplicación)<br /></>}
                    {ptData.plan?.objectives?.length > 0 && <>✓ Objetivos con estado de logro ({progressPct(ptData.plan.objectives)}% completados)<br /></>}
                    {ptData.plan?.dischargeCriteria && <>✓ Criterios de alta</>}
                  </>}
                  {reportType === "derivacion" && <>
                    ✓ Expediente del paciente (datos personales, diagnóstico)<br />
                    {ptData.ptSessions.length > 0 && <>✓ Historial de tratamiento (fechas y número de sesiones)<br /></>}
                    {ptData.allScales.length > 0 && <>✓ Resultados más recientes de escalas<br /></>}
                    {ptData.latestRisk && <>✓ Estado actual de riesgo (nivel: {RISK_CONFIG[ptData.latestRisk.riskLevel]?.label})</>}
                  </>}
                </div>
              </div>

              {/* Editable fields */}
              <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.bdr}`, padding: 20, marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.tl, marginBottom: 16,
                  display: "flex", alignItems: "center", gap: 6 }}>
                  <FileText size={12} color={T.tl} /> Secciones narrativas
                </div>

                {REPORT_FIELDS[reportType].map(field => (
                  <div key={field.key} style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: T.t, marginBottom: 4 }}>{field.label}</label>
                    {field.hint && <div style={{ fontSize: 11, color: T.tl, marginBottom: 6 }}>{field.hint}</div>}
                    {field.rows === 1 ? (
                      <input
                        value={customFields[field.key] || ""}
                        onChange={e => setField(field.key, e.target.value)}
                        style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 13.5, color: T.t, background: T.bg, outline: "none", boxSizing: "border-box" }}
                      />
                    ) : (
                      <textarea
                        value={customFields[field.key] || ""}
                        onChange={e => setField(field.key, e.target.value)}
                        rows={field.rows}
                        style={{ width: "100%", padding: "12px 14px", border: `1.5px solid ${T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 13.5, color: T.t, background: T.bg, outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: 1.65 }}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Generate button */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "flex-end" }}>
                {generated && (
                  <span style={{ fontFamily: T.fB, fontSize: 12, color: T.suc, display: "flex", alignItems: "center", gap: 5 }}>
                    <Check size={13} /> Informe generado — revisa la ventana emergente
                  </span>
                )}
                <Btn onClick={handleGenerate} disabled={!hasMinData}
                  style={{ padding: "12px 24px", fontSize: 14 }}>
                  <Printer size={16} /> Generar informe PDF
                </Btn>
              </div>

              {!hasMinData && reportType === "alta" && (
                <div style={{ marginTop: 12, padding: "12px 16px", borderRadius: 10, background: T.warA, border: `1px solid ${T.war}30`, color: T.war, fontSize: 12.5, fontFamily: T.fB }}>
                  <strong>Nota:</strong> El Informe de Alta requiere al menos una sesión registrada para el paciente.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
