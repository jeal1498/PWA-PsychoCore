// ─────────────────────────────────────────────────────────────────────────────
// useSessions.js
// Todo el estado, efectos y handlers del módulo Sessions.
// Sin JSX — importable desde cualquier entorno sin renderer de React.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useMemo, useEffect, useRef } from "react";
import { uid, todayDate, fmt } from "../../utils.js";
import { createAssignment, getAssignmentsByPatient, createPortalAccessLink } from "../../lib/supabase.js";
import { emit, bus } from "../../lib/eventBus.js";
import { useIsWide } from "../../hooks/useIsWide.js";
import { useAppState } from "../../context/AppStateContext.jsx";
import { TASK_TEMPLATES } from "../../lib/taskTemplates.js";
import {
  NOTE_FORMATS, BLANK_RISK,
  compileNotes, blankStructured, generateAISummary,
} from "./sessions.utils.js";

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE CONSTANTS (usadas solo en lógica de negocio)
// ─────────────────────────────────────────────────────────────────────────────
export const SERVICE_DURATION_BY_TYPE = {
  sesion: 50, evaluacion: 90, pareja: 60, grupo: 90, paquete: 50, otro: 50,
};

export const SERVICE_TYPE_LABEL = {
  sesion:"Sesión individual", evaluacion:"Evaluación neuropsicológica",
  pareja:"Terapia de pareja", grupo:"Grupo / Taller", paquete:"Paquete", otro:"Otro",
};

export const SERVICE_TYPE_OPTIONS = [
  { value:"sesion",     label:"Sesión individual" },
  { value:"evaluacion", label:"Evaluación" },
  { value:"pareja",     label:"Terapia de pareja" },
  { value:"grupo",      label:"Grupo / Taller" },
  { value:"otro",       label:"Otro" },
];

export const SERVICE_MODALITY_OPTIONS = [
  { value:"presencial", label:"Presencial" },
  { value:"virtual",    label:"Virtual" },
  { value:"ambas",      label:"Ambas" },
];

// ─────────────────────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────────────────────
export function useSessions({
  sessions, setSessions,
  patients, setPatients,
  profile,
  prefill,
  riskAssessments, setRiskAssessments,
  services, setServices,
  setPayments, payments,
  appointments, setAppointments,
  interSessions, setInterSessions,
}) {
  const { activePatientContext, setActivePatientContext } = useAppState();

  // ── Responsive ────────────────────────────────────────────────────────────
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1200
  );
  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const isMobileView = windowWidth < 768;
  const isWide = useIsWide();

  // ── Filter & UI toggles ───────────────────────────────────────────────────
  const [filterPt,          setFilterPt]          = useState("");
  const [showAdd,           setShowAdd]            = useState(!!prefill);
  const [patientLocked,     setPatientLocked]      = useState(!!(prefill?.patientId || activePatientContext?.patientId));
  const [referral,          setReferral]           = useState(null);
  const [refForm,           setRefForm]            = useState({ reason:"", specialist:"", notes:"" });
  const [riskOpen,          setRiskOpen]           = useState(false);
  const [quickRisk,         setQuickRisk]          = useState(BLANK_RISK);
  const [showTpl,           setShowTpl]            = useState(false);
  const [exportMenuId,      setExportMenuId]       = useState(null);

  // ── Safety Wizard ─────────────────────────────────────────────────────────
  const [showSafetyWizard,  setShowSafetyWizard]  = useState(false);
  const [pendingRiskSave,   setPendingRiskSave]    = useState(null);
  const [safetyPlanDraft,   setSafetyPlanDraft]    = useState({
    warningSignals:"", copingStrategies:"",
    familyContact:"", familyPhone:"", professionalContact:"", professionalPhone:"",
    reasonsToLive:"", environmentSafety:""
  });

  // ── Patient tasks ─────────────────────────────────────────────────────────
  const [patientTasks,      setPatientTasks]       = useState([]);
  const [viewTaskResponse,  setViewTaskResponse]   = useState(null);

  // ── Form ──────────────────────────────────────────────────────────────────
  const blankForm = {
    patientId:"", date:fmt(todayDate), serviceId:"", duration: profile?.durationMin ?? 50,
    mood:"moderado", progress:"bueno",
    noteFormat: localStorage.getItem("pc_last_note_format") || "libre",
    notes:"", structured:null, tags:"",
    taskAssigned:"", tasksAssigned:[], taskCompleted:null, privateNotes:"",
  };
  const [form, setForm] = useState(
    prefill?.patientId || activePatientContext?.patientId
      ? { ...blankForm, patientId: prefill?.patientId || activePatientContext?.patientId || "", date: prefill?.date || fmt(todayDate), serviceId: prefill?.serviceId || "" }
      : blankForm
  );

  // ── Autoguardado ──────────────────────────────────────────────────────────
  const [editingSessionId,  setEditingSessionId]  = useState(null);
  const DRAFT_KEY = editingSessionId ? `pc_draft_${editingSessionId}` : "pc_draft_new";
  const [draftSavedAt,      setDraftSavedAt]      = useState(null);
  const [showDraftBanner,   setShowDraftBanner]   = useState(false);
  const [draftBannerData,   setDraftBannerData]   = useState(null);
  const draftDebounceRef = useRef(null);

  // ── Quick service form ────────────────────────────────────────────────────
  const [serviceLocked,         setServiceLocked]         = useState(!!prefill?.serviceId);
  const [showQuickServiceForm,  setShowQuickServiceForm]  = useState(false);
  const [quickService,          setQuickService]          = useState({
    name:"", type:"sesion", modality:"presencial", price:"", priceVirtual:"",
  });

  // ── AI Summary ────────────────────────────────────────────────────────────
  const [aiSummary,   setAiSummary]   = useState(null);
  const [aiLoading,   setAiLoading]   = useState(false);
  const [aiError,     setAiError]     = useState("");
  const [showAiModal, setShowAiModal] = useState(false);
  const [taskError,   setTaskError]   = useState("");

  // ── Cobro ─────────────────────────────────────────────────────────────────
  const [showCobro,         setShowCobro]         = useState(false);
  const [cobroData,         setCobroData]         = useState(null);
  const [cobroForm,         setCobroForm]         = useState({ serviceId:"", modality:"", amount:"", method:"Transferencia", concept:"" });
  const [showCobroModality, setShowCobroModality] = useState(false);

  // ── Close Wizard ──────────────────────────────────────────────────────────
  const [showCloseWizard,   setShowCloseWizard]   = useState(false);
  const [closeCtx,          setCloseCtx]          = useState(null);
  const [closeStep,         setCloseStep]         = useState(1);
  const [closeInterForm,    setCloseInterForm]    = useState({ notes:"", type:"Indicación" });
  const [closeNextAppt,     setCloseNextAppt]     = useState({ date:"", time:"09:00", type:"Seguimiento" });
  const [closeTaskTplId,    setCloseTaskTplId]    = useState(null);
  const [closeTaskNotes,    setCloseTaskNotes]    = useState("");
  const [closeTaskAssigned, setCloseTaskAssigned] = useState(false);
  const [closeTaskSaving,   setCloseTaskSaving]   = useState(false);
  const [closeTaskError,    setCloseTaskError]    = useState("");

  // ── Toast ─────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState({ msg:"", type:"success", visible:false });
  const showToast = (msg, type = "success") => {
    setToast({ msg, type, visible:true });
    setTimeout(() => setToast(t => ({ ...t, visible:false })), 4800);
  };

  // ── Field helpers ─────────────────────────────────────────────────────────
  const fld   = k => v => setForm(f => ({ ...f, [k]: v }));
  const rfld  = k => v => setRefForm(f => ({ ...f, [k]:v }));
  const rld   = k => v => setQuickRisk(r => ({ ...r, [k]:v }));
  const cifld = k => v => setCloseInterForm(f => ({ ...f, [k]: v }));
  const cnfld = k => v => setCloseNextAppt(f => ({ ...f, [k]: v }));

  // ── Derived ───────────────────────────────────────────────────────────────
  const isStructured = form.noteFormat !== "libre";
  const canSave = form.patientId && (
    isStructured
      ? NOTE_FORMATS[form.noteFormat]?.fields?.some(f => form.structured?.[f.key]?.trim())
      : form.notes.trim()
  );
  const filtered = useMemo(() =>
    sessions.filter(s => !filterPt || s.patientId === filterPt).sort((a,b) => b.date.localeCompare(a.date)),
    [sessions, filterPt]);
  const selectedServiceMeta = useMemo(() => resolveServiceMeta(form.serviceId), [form.serviceId, services]);

  // ── Service helpers ───────────────────────────────────────────────────────
  function resolveServiceMeta(serviceId) {
    if (!serviceId) return null;
    const svc = services.find(s => s.id === serviceId);
    if (!svc) return null;
    return {
      ...svc,
      label: svc.name || SERVICE_TYPE_LABEL[svc.type] || svc.type,
      duration: Number(svc.duration) || SERVICE_DURATION_BY_TYPE[svc.type] || 50,
    };
  }

  function syncServiceSelection(serviceId) {
    const svc = resolveServiceMeta(serviceId);
    setForm(f => ({ ...f, serviceId: svc?.id || "", duration: svc?.duration || 50 }));
  }

  function getServiceOptions() {
    if (!services.length) return [];
    return services.map(s => ({
      id: s.id,
      label: s.name || SERVICE_TYPE_LABEL[s.type] || s.type,
      price: s.price, priceVirtual: s.priceVirtual, modality: s.modality,
    }));
  }

  function addQuickService() {
    const typeLabel = SERVICE_TYPE_LABEL[quickService.type] || "Servicio";
    const name = quickService.name.trim() || typeLabel;
    const price = quickService.price ? Number(quickService.price) : 0;
    const priceVirtual = quickService.priceVirtual ? Number(quickService.priceVirtual) : null;
    if (!price && !priceVirtual) return;
    const now = new Date().toISOString();
    const newService = {
      id: "svc" + uid(),
      name, type: quickService.type,
      modality: quickService.modality === "ambas" ? "ambas"
        : quickService.modality === "virtual" ? "virtual" : "presencial",
      price: quickService.modality === "virtual" ? 0 : price,
      priceVirtual: quickService.modality === "presencial" ? null : (priceVirtual || (quickService.modality === "virtual" ? price : null)),
      createdAt: now,
    };
    if (typeof setServices === "function") setServices(prev => [...prev, newService]);
    setShowQuickServiceForm(false);
    setServiceLocked(false);
    setQuickService({ name:"", type:"sesion", modality:"presencial", price:"", priceVirtual:"" });
    setForm(f => ({ ...f, serviceId: newService.id, duration: SERVICE_DURATION_BY_TYPE[newService.type] || 50 }));
  }

  // ── Cobro helpers ─────────────────────────────────────────────────────────
  function handleCobroService(serviceId) {
    const svc = services.find(s => s.id === serviceId);
    if (!svc) { setCobroForm(f => ({ ...f, serviceId, modality:"", amount:"", concept:"" })); return; }
    const label = svc.name || SERVICE_TYPE_LABEL[svc.type] || svc.type;
    if (svc.modality === "ambas") {
      setCobroForm(f => ({ ...f, serviceId, concept: label, modality:"", amount:"" }));
      setShowCobroModality(true);
    } else {
      const price = svc.modality === "virtual" ? svc.priceVirtual : svc.price;
      setCobroForm(f => ({ ...f, serviceId, concept: label, modality: svc.modality, amount: String(price || "") }));
      setShowCobroModality(false);
    }
  }

  function applyCobroModality(mod) {
    const svc = services.find(s => s.id === cobroForm.serviceId);
    if (!svc) return;
    const price = mod === "virtual" ? svc.priceVirtual : svc.price;
    setCobroForm(f => ({ ...f, modality: mod, amount: String(price || "") }));
    setShowCobroModality(false);
  }

  function preloadCobroForPatient(pt, preferredServiceId = "") {
    if (preferredServiceId) {
      const preferredSvc = services.find(s => s.id === preferredServiceId);
      if (preferredSvc) { handleCobroService(preferredSvc.id); return; }
    }
    if (pt?.defaultServiceId) {
      const svc = services.find(s => s.id === pt.defaultServiceId);
      if (svc) { handleCobroService(svc.id); return; }
    }
    if (pt?.sessionCost) {
      setCobroForm(f => ({ ...f, amount: String(pt.sessionCost), concept:"Sesión individual" }));
      return;
    }
    const fallback = services.find(s => s.type === "sesion") || services[0];
    if (fallback) handleCobroService(fallback.id);
  }

  // ── Finance: folio ────────────────────────────────────────────────────────
  function nextFolio() {
    const nums = (payments || []).map(p => Number(p.folio)).filter(n => !isNaN(n) && n > 0);
    return nums.length > 0 ? Math.max(...nums) + 1 : 1;
  }

  // ── Cobro / Skip cobro ─────────────────────────────────────────────────────
  function saveCobro() {
    if (!cobroData || !cobroForm.amount) return;
    const folio = nextFolio();
    const payment = {
      id: "p" + uid(), folio,
      patientId:   cobroData.patientId,
      patientName: cobroData.patientName,
      sessionId:   cobroData.sessionId,
      date:        cobroData.date,
      amount:      Number(cobroForm.amount),
      concept:     cobroForm.concept || "Sesión",
      method:      cobroForm.method,
      modality:    cobroForm.modality,
      status:      "pagado",
    };
    setPayments(prev => [...prev, payment]);
    emit.sessionFinalized({
      patientId: cobroData.patientId, sessionId: cobroData.sessionId,
      amount: payment.amount, folio, method: payment.method,
    });
    setCobroData(prev => prev ? { ...prev, paymentStatus:"pagado", paymentRecord:payment, paymentFolio:folio } : prev);
    const agendaMsg = cobroData._agendaSynced ? " · 📅 Cita actualizada" : "";
    showToast(`✓ Sesión guardada${agendaMsg} · 💰 Pago registrado (Folio ${folio})`);
    setCloseStep(2);
  }

  function skipCobro() {
    if (!cobroData) { setShowCobro(false); return; }
    const folio = nextFolio();
    const pending = {
      id: "p" + uid(), folio,
      patientId:   cobroData.patientId,
      patientName: cobroData.patientName,
      sessionId:   cobroData.sessionId,
      date:        cobroData.date,
      amount:      0,
      concept:     "Sesión (pendiente de cobro)",
      method:      "", modality:"", status:"pendiente",
    };
    setPayments(prev => [...prev, pending]);
    const agendaSkipMsg = cobroData?._agendaSynced ? " · 📅 Cita actualizada" : "";
    setCobroData(prev => prev ? { ...prev, paymentStatus:"pendiente", paymentRecord:pending, paymentFolio:folio } : prev);
    showToast(`Sesión guardada${agendaSkipMsg} · ⏳ Cobro pendiente en Finanzas`, "warning");
    setCloseStep(2);
  }

  // ── Close Wizard handlers ─────────────────────────────────────────────────
  function openCloseWizard(ctx) {
    setCloseCtx(ctx);
    setCloseStep(1);
    setCloseInterForm({ notes:"", type:"Indicación" });
    setCloseTaskTplId(null);
    setCloseTaskNotes("");
    setCloseTaskAssigned(false);
    setCloseTaskSaving(false);
    setCloseTaskError("");
    const d = new Date(ctx.date);
    d.setDate(d.getDate() + 7);
    const nextDate = d.toISOString().split("T")[0];
    const lastAppt = appointments
      .filter(a => a.patientId === ctx.patientId)
      .sort((a,b) => b.date.localeCompare(a.date))[0];
    setCloseNextAppt({ date: nextDate, time: lastAppt?.time || "09:00", type:"Seguimiento" });
    setShowCloseWizard(true);
  }

  function saveCloseIntersession() {
    if (closeInterForm.notes.trim() && setInterSessions) {
      setInterSessions(prev => [...prev, {
        id: "is" + uid(), patientId: closeCtx.patientId, sessionId: closeCtx.sessionId,
        date: closeCtx.date, type: closeInterForm.type, notes: closeInterForm.notes,
        createdAt: new Date().toISOString(),
      }]);
    }
    setCloseStep(3);
  }

  function saveCloseNextAppt() {
    if (closeNextAppt.date && setAppointments) {
      const pt = patients.find(p => p.id === closeCtx.patientId);
      setAppointments(prev => [...prev, {
        id: "a" + uid(), patientId: closeCtx.patientId,
        patientName: pt?.name || closeCtx.patientName,
        date: closeNextAppt.date, time: closeNextAppt.time, type: closeNextAppt.type,
        modality:"", status:"pendiente", isRecurring:false,
      }]);
    }
    setCloseStep(5);
  }

  function whatsappNextAppt() {
    const pt    = patients.find(p => p.id === closeCtx?.patientId);
    const phone = pt?.phone?.replace(/\D/g, "");
    if (!phone || !closeNextAppt.date) return null;
    const nombre    = pt.name?.split(" ")[0] || "";
    const psicologa = profile?.name?.trim() || "tu psicólogo(a)";
    const fecha     = new Date(closeNextAppt.date + "T12:00:00")
      .toLocaleDateString("es-MX", { weekday:"long", day:"numeric", month:"long" });
    const msg = encodeURIComponent(
      `Hola ${nombre}. 📅 Tu próxima sesión está confirmada para el ${fecha} a las ${closeNextAppt.time}. Si tienes alguna duda, no dudes en escribirnos. ¡Hasta pronto! 💙\n— ${psicologa}`
    );
    return `https://wa.me/${phone}?text=${msg}`;
  }

  // ── AI Summary handler ────────────────────────────────────────────────────
  async function handleAISummary() {
    setAiLoading(true); setAiError(""); setShowAiModal(true);
    const pt = patients.find(p => p.id === form.patientId);
    try {
      const result = await generateAISummary({
        notes: form.notes, structured: form.structured, noteFormat: form.noteFormat,
        patientName: pt?.name || "", diagnosis: pt?.diagnosis || "",
        duration: form.duration, mood: form.mood, progress: form.progress,
      });
      setAiSummary(result);
    } catch {
      setAiError("No se pudo generar el resumen. Verifica tu conexión.");
    } finally {
      setAiLoading(false);
    }
  }

  // ── Note format handlers ──────────────────────────────────────────────────
  function handleFormatChange(newFormat) {
    setForm(f => ({ ...f, noteFormat: newFormat, structured: blankStructured(newFormat), notes: "" }));
  }

  function handleStructuredChange(key, val) {
    setForm(f => {
      const s = { ...f.structured, [key]:val };
      return { ...f, structured:s, notes:compileNotes(f.noteFormat, s) };
    });
  }

  function handleApplyTemplate(fields) {
    setForm(f => {
      const merged = { ...blankStructured(f.noteFormat) };
      Object.entries(fields).forEach(([k, v]) => { if (merged[k] !== undefined) merged[k] = v; });
      return { ...f, structured: merged, notes: compileNotes(f.noteFormat, merged) };
    });
  }

  // ── Duplicate / Delete / Referral ─────────────────────────────────────────
  function duplicate(s) {
    setForm({
      patientId:s.patientId, date:fmt(todayDate), serviceId:s.serviceId || "",
      duration:s.duration, mood:s.mood, progress:s.progress,
      tags:(s.tags||[]).join(", "),
      noteFormat:s.noteFormat||"libre",
      notes:s.noteFormat==="libre"?s.notes:"",
      structured:s.structured?{...s.structured}:null,
      taskAssigned:"", tasksAssigned:[], taskCompleted:null, privateNotes:"",
    });
    setServiceLocked(false);
    setShowAdd(true);
  }

  const del = id => setSessions(prev => prev.filter(s => s.id !== id));

  function openReferral(session) {
    setReferral({ session, patient:patients.find(p => p.id === session.patientId) });
    setRefForm({ reason:"", specialist:"", notes:"" });
  }

  // ── SAVE ──────────────────────────────────────────────────────────────────
  function save() {
    if (!canSave) return;
    const pt = patients.find(p => p.id === form.patientId);
    const sessionId = "s" + uid();
    const serviceMeta = resolveServiceMeta(form.serviceId);
    const finalNotes = isStructured ? compileNotes(form.noteFormat, form.structured) : form.notes;
    setSessions(prev => [...prev, {
      ...form,
      id: sessionId,
      patientName: pt?.name || "",
      serviceId: serviceMeta?.id || "",
      serviceName: serviceMeta?.label || "",
      serviceType: serviceMeta?.type || "",
      duration: serviceMeta?.duration || Number(form.duration) || 50,
      notes: finalNotes,
      tags: form.tags.split(",").map(t=>t.trim()).filter(Boolean),
    }]);

    // FASE 2 — Agenda Sync
    let appointmentClosed = false;
    if (setAppointments && appointments.length > 0) {
      const match = appointments.find(a =>
        a.patientId === form.patientId && a.date === form.date && a.status !== "completada"
      );
      if (match) {
        setAppointments(prev => prev.map(a => a.id === match.id ? { ...a, status:"completada" } : a));
        appointmentClosed = true;
      }
    }

    emit.sessionCreated({ patientId: form.patientId, patientName: pt?.name||"", sessionId, date: form.date });

    // FASE 2 — Finance Sync
    if (setPayments) {
      setCobroData({
        sessionId, patientId: form.patientId, patientName: pt?.name||"",
        date: form.date, _agendaSynced: appointmentClosed,
        _session: {
          ...form, id: sessionId, patientName: pt?.name||"",
          serviceId: serviceMeta?.id || "", serviceName: serviceMeta?.label || "",
          serviceType: serviceMeta?.type || "",
          duration: serviceMeta?.duration || Number(form.duration) || 50,
          notes: finalNotes, tags: form.tags.split(",").map(t=>t.trim()).filter(Boolean),
        },
        _service: serviceMeta,
        _patient: pt || null,
        paymentStatus: "draft",
      });
      preloadCobroForPatient(pt, serviceMeta?.id || "");
      openCloseWizard({ patientId: form.patientId, patientName: pt?.name||"", date: form.date, sessionId });
    } else {
      showToast(appointmentClosed
        ? "✓ Sesión guardada · Cita marcada como completada"
        : "✓ Sesión guardada correctamente"
      );
    }

    // ETAPA 3 — Protocolo de Riesgo
    const hasRisk = quickRisk.suicidalIdeation !== "ninguna" || quickRisk.selfHarm !== "ninguna" || quickRisk.harmToOthers;
    const isCrisis = quickRisk.suicidalIdeation === "activa" ||
                     quickRisk.suicidalIdeation === "pasiva" ||
                     quickRisk.selfHarm === "activa";

    if (hasRisk && setRiskAssessments) {
      const suggested = quickRisk.suicidalIdeation==="activa" ? "alto"
        : quickRisk.suicidalIdeation==="pasiva" || quickRisk.selfHarm==="activa" ? "moderado"
        : "bajo";

      const newRaId = "ra"+uid();
      setRiskAssessments(prev => [...prev, {
        id: newRaId, patientId:form.patientId, patientName:pt?.name||"", sessionId,
        date: form.date, evaluatedBy:"session", ...quickRisk,
        hasPlan:false, hasMeans:false, hasIntent:false, previousAttempts:0,
        protectiveFactors:[], riskLevel:suggested, clinicalNotes:"",
        safetyPlan:{ warningSignals:"",copingStrategies:"",supportContacts:"",
          professionalContacts:"",environmentSafety:"",reasonsToLive:"" }
      }]);

      if (isCrisis && setPatients) {
        setPatients(prev => prev.map(p => p.id === form.patientId
          ? { ...p, activeRiskAlert: { level: suggested, date: form.date, sessionId, raId: newRaId } }
          : p
        ));
      }

      emit.riskElevated({ patientId: form.patientId, patientName: pt?.name||"", sessionId, level: suggested });

      if (isCrisis) {
        setPendingRiskSave({ patientId: form.patientId, patientName: pt?.name||"", sessionId, raId: newRaId, level: suggested, date: form.date });
        setSafetyPlanDraft({ warningSignals:"",copingStrategies:"",familyContact:"",familyPhone:"",professionalContact:"",professionalPhone:"",reasonsToLive:"",environmentSafety:"" });
        setShowSafetyWizard(true);
      }
    }

    // FASE 2 — Tasks
    if (form.tasksAssigned?.length > 0) {
      emit.taskAssigned({ patientId: form.patientId, patientName: pt?.name||"", sessionId, count: form.tasksAssigned.length });
    }
    if (pt?.phone && form.tasksAssigned?.length > 0) {
      const cleanPhone = pt.phone.replace(/\D/g, "");
      const assignPromises = form.tasksAssigned.map(tplId => {
        const tpl = TASK_TEMPLATES[tplId];
        if (!tpl) return Promise.resolve({ ok: true });
        return createAssignment({
          patientId: form.patientId, patientName: pt.name || "",
          patientPhone: cleanPhone, templateId: tplId, title: tpl.title, notes: "", sessionId,
        }).then(() => ({ ok: true })).catch(e => ({ ok: false, error: e }));
      });
      Promise.allSettled(assignPromises).then(async (results) => {
        const failed = results.filter(r => r.value?.ok === false).length;
        if (failed > 0) {
          setTaskError(`⚠️ ${failed} tarea(s) no se pudieron guardar en Supabase. Verifica la conexión.`);
          setTimeout(() => setTaskError(""), 6000);
        }
        const nombre    = pt.name?.split(" ")[0] || "";
        const psicologa = profile?.name?.trim() || "tu psicólogo(a)";
        const listaTareas = form.tasksAssigned
          .map(id => TASK_TEMPLATES[id]).filter(Boolean)
          .map((tpl, i) => `${i + 1}. ${tpl.icon} *${tpl.title}*`).join("\n");
        const { accessUrl } = await createPortalAccessLink(cleanPhone);
        const msg = encodeURIComponent(
          `Hola ${nombre}! 👋\n\nTe asigné ${form.tasksAssigned.length === 1 ? "una tarea" : "estas tareas"} para trabajar antes de nuestra próxima sesión:\n\n${listaTareas}\n\nPuedes verlas y completarlas aquí:\n${accessUrl}\n\nEste enlace vence en 24 horas.\n— ${psicologa}`
        );
        window.open(`https://wa.me/${cleanPhone}?text=${msg}`, "_blank");
      });
    } else if (form.tasksAssigned?.length > 0) {
      const assignPromises = form.tasksAssigned.map(tplId => {
        const tpl = TASK_TEMPLATES[tplId];
        if (!tpl) return Promise.resolve();
        return createAssignment({ patientId: form.patientId, patientName: pt?.name || "", patientPhone: "", templateId: tplId, title: tpl.title, notes: "", sessionId })
          .catch(() => {
            setTaskError("⚠️ Algunas tareas no se pudieron guardar. Verifica la conexión.");
            setTimeout(() => setTaskError(""), 6000);
          });
      });
      Promise.allSettled(assignPromises);
    }

    // Reset
    setForm(blankForm); setQuickRisk(BLANK_RISK); setRiskOpen(false); setShowAdd(false);
    setServiceLocked(false);
    const removedKey = editingSessionId ? `pc_draft_${editingSessionId}` : "pc_draft_new";
    try { localStorage.removeItem(removedKey); } catch {}
    if (editingSessionId) { try { localStorage.removeItem("pc_draft_new"); } catch {} }
    setEditingSessionId(null);
    setDraftSavedAt(null); setShowDraftBanner(false); setDraftBannerData(null);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EFFECTS
  // ─────────────────────────────────────────────────────────────────────────

  // Cargar tareas del paciente seleccionado
  useEffect(() => {
    if (!form?.patientId) { setPatientTasks([]); return; }
    getAssignmentsByPatient(form.patientId)
      .then(setPatientTasks)
      .catch(() => setPatientTasks([]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form?.patientId]);

  // Precargar paciente desde prefill / contexto
  useEffect(() => {
    if (!showAdd) return;
    const targetId = prefill?.patientId || activePatientContext?.patientId || "";
    if (!targetId) return;
    setForm(f => (f.patientId === targetId ? f : { ...f, patientId: targetId, date: prefill?.date || f.date || fmt(todayDate) }));
    setPatientLocked(true);
  }, [showAdd, prefill?.patientId, prefill?.date, activePatientContext?.patientId]);

  // Precargar servicio desde prefill
  useEffect(() => {
    if (!showAdd) return;
    const targetServiceId = prefill?.serviceId || "";
    if (!targetServiceId) return;
    const svc = resolveServiceMeta(targetServiceId);
    if (!svc) return;
    setServiceLocked(true);
    setForm(f => ({ ...f, serviceId: svc.id, duration: svc.duration }));
  }, [showAdd, prefill?.serviceId, services]);

  // Unlockear servicio cuando no hay prefill
  useEffect(() => {
    if (!showAdd) return;
    if (prefill?.serviceId) return;
    setServiceLocked(false);
  }, [showAdd, prefill?.serviceId]);

  // Mostrar quick service form si no hay servicios
  useEffect(() => {
    if (!showAdd) { setShowQuickServiceForm(false); return; }
    if (services.length === 0) setShowQuickServiceForm(true);
  }, [showAdd, services.length]);

  // Sincronizar duración cuando cambia serviceId
  useEffect(() => {
    if (!showAdd) return;
    if (!form.serviceId) return;
    const svc = resolveServiceMeta(form.serviceId);
    if (!svc) return;
    setForm(f => {
      const nextDuration = svc.duration || 50;
      if (f.serviceId === svc.id && Number(f.duration) === Number(nextDuration)) return f;
      return { ...f, serviceId: svc.id, duration: nextDuration };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.serviceId, showAdd, services]);

  // Actualizar contexto activo al seleccionar paciente
  useEffect(() => {
    if (!form?.patientId) return;
    const pt = patients.find(p => p.id === form.patientId);
    if (!pt) return;
    setActivePatientContext(prev => {
      if (prev?.patientId === pt.id && prev?.patientName === pt.name) return prev;
      return { patientId: pt.id, patientName: pt.name, source: "sessions", updatedAt: new Date().toISOString() };
    });
  }, [form?.patientId, patients, setActivePatientContext]);

  // Autoguardado con debounce 2s
  useEffect(() => {
    if (!showAdd) return;
    if (draftDebounceRef.current) clearTimeout(draftDebounceRef.current);
    draftDebounceRef.current = setTimeout(() => {
      const hasContent = form.noteFormat !== "libre"
        ? NOTE_FORMATS[form.noteFormat]?.fields?.some(f => form.structured?.[f.key]?.trim())
        : form.notes.trim();
      if (!hasContent) return;
      const draft = {
        notes: form.notes, structured: form.structured,
        noteFormat: form.noteFormat, savedAt: new Date().toISOString(),
      };
      const key = editingSessionId ? `pc_draft_${editingSessionId}` : "pc_draft_new";
      try { localStorage.setItem(key, JSON.stringify(draft)); } catch {}
      setDraftSavedAt(new Date().toISOString());
    }, 2000);
    return () => { if (draftDebounceRef.current) clearTimeout(draftDebounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.notes, form.structured, form.noteFormat, showAdd, editingSessionId]);

  // Detectar borrador guardado al abrir el modal
  useEffect(() => {
    if (!showAdd) { setShowDraftBanner(false); setDraftBannerData(null); return; }
    try {
      const key = editingSessionId ? `pc_draft_${editingSessionId}` : "pc_draft_new";
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft?.savedAt) { setDraftBannerData(draft); setShowDraftBanner(true); }
    } catch {}
  }, [showAdd, editingSessionId]);

  // Ctrl+S global
  useEffect(() => {
    const unsub = () => { if (showAdd && canSave) save(); };
    bus.on("session:save", unsub);
    return () => bus.off("session:save", unsub);
  }, [showAdd, canSave]);

  // ─────────────────────────────────────────────────────────────────────────
  // RETURN — exponer todo lo que Sessions.jsx necesita
  // ─────────────────────────────────────────────────────────────────────────
  return {
    // Responsive
    isMobileView, isWide,
    // Form
    form, setForm, fld, blankForm,
    // UI state
    filterPt, setFilterPt,
    showAdd, setShowAdd,
    patientLocked, setPatientLocked,
    referral, setReferral,
    refForm, setRefForm, rfld,
    riskOpen, setRiskOpen,
    quickRisk, setQuickRisk, rld,
    showTpl, setShowTpl,
    exportMenuId, setExportMenuId,
    // Safety Wizard
    showSafetyWizard, setShowSafetyWizard,
    pendingRiskSave, setPendingRiskSave,
    safetyPlanDraft, setSafetyPlanDraft,
    // Tasks
    patientTasks,
    viewTaskResponse, setViewTaskResponse,
    taskError, setTaskError,
    // Service
    serviceLocked, setServiceLocked,
    showQuickServiceForm, setShowQuickServiceForm,
    quickService, setQuickService,
    selectedServiceMeta,
    resolveServiceMeta, syncServiceSelection, getServiceOptions, addQuickService,
    SERVICE_TYPE_OPTIONS, SERVICE_MODALITY_OPTIONS, SERVICE_TYPE_LABEL, SERVICE_DURATION_BY_TYPE,
    // Cobro
    showCobro, setShowCobro,
    cobroData, setCobroData,
    cobroForm, setCobroForm,
    showCobroModality, setShowCobroModality,
    handleCobroService, applyCobroModality, preloadCobroForPatient,
    saveCobro, skipCobro,
    // Close Wizard
    showCloseWizard, setShowCloseWizard,
    closeCtx, setCloseCtx,
    closeStep, setCloseStep,
    closeInterForm, setCloseInterForm, cifld,
    closeNextAppt, setCloseNextAppt, cnfld,
    closeTaskTplId, setCloseTaskTplId,
    closeTaskNotes, setCloseTaskNotes,
    closeTaskAssigned, setCloseTaskAssigned,
    closeTaskSaving, setCloseTaskSaving,
    closeTaskError, setCloseTaskError,
    openCloseWizard, saveCloseIntersession, saveCloseNextAppt, whatsappNextAppt,
    // AI
    aiSummary, setAiSummary,
    aiLoading, aiError,
    showAiModal, setShowAiModal,
    handleAISummary,
    // Toast
    toast, showToast,
    // Note handlers
    handleFormatChange, handleStructuredChange, handleApplyTemplate,
    // Session CRUD
    filtered, isStructured, canSave,
    save, duplicate, del, openReferral,
    // Draft
    editingSessionId, setEditingSessionId,
    DRAFT_KEY, draftSavedAt,
    showDraftBanner, setShowDraftBanner,
    draftBannerData, setDraftBannerData,
  };
}
