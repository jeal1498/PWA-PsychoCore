// ── useAgenda.js ─────────────────────────────────────────────────────────────
// Hook centralizado de estado y lógica del módulo Agenda.
// Sin JSX. Sin imports de componentes UI.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo, useEffect } from "react";
import { emit } from "../../lib/eventBus.js";
import { uid, todayDate, fmt, fmtDate } from "../../utils.js";
import { createPortalAccessLink } from "../../lib/supabase.js";
import { useIsMobile } from "../../hooks/useIsMobile.js";
import { useIsWide }   from "../../hooks/useIsWide.js";
import {
  buildTimeSlots,
  generateRecurring,
  whatsappCancel,
} from "./agenda.utils.js";

export function useAgenda({
  appointments,
  setAppointments,
  sessions,
  setSessions,
  patients,
  setPatients,
  profile,
  services,
  autoOpen,
  onNavigate,
  onStartSession,
}) {
  // ── Vistas ────────────────────────────────────────────────────────────────
  const [view,         setView]         = useState("month");
  const [current,      setCurrent]      = useState(new Date(todayDate.getFullYear(), todayDate.getMonth(), 1));
  const [weekAnchor,   setWeekAnchor]   = useState(new Date(todayDate));
  const [calCollapsed, setCalCollapsed] = useState(false);

  // ── Día seleccionado (vista mes y sincronía con vista día) ────────────────
  const [selectedDay,     setSelectedDay]     = useState(null);
  const [selectedDayView, setSelectedDayView] = useState(fmt(todayDate));

  // ── Modal nueva cita ──────────────────────────────────────────────────────
  const [showAdd, setShowAdd] = useState(false);

  // ── Nuevo paciente (pre-registro) ─────────────────────────────────────────
  const blankQuickPt = { name: "", phone: "", reason: "" };
  const [newPtMode, setNewPtMode] = useState(false);
  const [quickPt,   setQuickPt]   = useState(blankQuickPt);
  const resetNewPtMode = () => { setNewPtMode(false); setQuickPt(blankQuickPt); };

  // ── Modales secundarios ───────────────────────────────────────────────────
  const [quickSession,  setQuickSession]  = useState(null);
  const [deleteTarget,  setDeleteTarget]  = useState(null);
  const [summaryTarget, setSummaryTarget] = useState(null);
  const [admisionTarget,setAdmisionTarget]= useState(null);
  const [linkError,     setLinkError]     = useState(false);

  // ── Cambio de estado / cancelación ───────────────────────────────────────
  const [statusTarget, setStatusTarget] = useState(null);
  const [statusForm,   setStatusForm]   = useState({ status:"", motivo:"", reagendar:false, newDate:"", newTime:"" });
  const sfStatus = k => v => setStatusForm(f => ({ ...f, [k]: v }));

  // ── Formulario de nueva cita ──────────────────────────────────────────────
  const SERVICE_TYPE_LABEL = { sesion:"Sesión individual", evaluacion:"Evaluación", pareja:"Terapia de pareja", grupo:"Grupo / Taller", otro:"Otro" };
  const ADD_SERVICE_OPTION = { label:"+ Agregar nuevo servicio", serviceId:"__add_service__", modality:null };
  const serviceOptions = (services ?? [])
    .filter(s => s.type !== "paquete")
    .map(s => ({ label:s.name || SERVICE_TYPE_LABEL[s.type] || s.type, serviceId:s.id, modality:s.modality }));
  const appointmentTypeOptions = [...serviceOptions, ADD_SERVICE_OPTION];

  const blankForm = {
    patientId:"", date:fmt(todayDate), time:"09:00",
    type:serviceOptions[0]?.label || ADD_SERVICE_OPTION.label,
    serviceId:"", modality:"", status:"pendiente",
  };
  const [form, setForm] = useState(blankForm);
  const [showModalityPicker, setShowModalityPicker] = useState(false);

  // ── Validación ────────────────────────────────────────────────────────────
  const [dateError,     setDateError]     = useState("");
  const [conflictError, setConflictError] = useState("");

  // ── Recurrencia ───────────────────────────────────────────────────────────
  const [recurring,      setRecurring]      = useState(false);
  const [recFrequency,   setRecFrequency]   = useState("semanal");
  const [recOccurrences, setRecOccurrences] = useState(8);

  // ── Nota de sesión rápida ────────────────────────────────────────────────
  // durationMin: usa el del servicio seleccionado del catálogo, luego el global del perfil
  const resolveApptDuration = (serviceId) => {
    const svc = (services ?? []).find(s => s.id === serviceId);
    if (svc) return Number(svc.durationMin) || Number(svc.duration) || 50;
    return profile?.durationMin ?? 50;
  };
  const defaultDurationMin = resolveApptDuration(form.serviceId);
  const [sessionForm, setSessionForm] = useState({ duration: defaultDurationMin, mood:"moderado", progress:"bueno", notes:"", tags:"" });

  // ── Sugerencia de siguiente cita ─────────────────────────────────────────
  const [nextApptSuggestion, setNextApptSuggestion] = useState(null);

  // ── Helpers de campo ─────────────────────────────────────────────────────
  const fld  = k => v => setForm(f => ({ ...f, [k]: v }));
  const sfld = k => v => setSessionForm(f => ({ ...f, [k]: v }));

  // ── Hooks de layout ──────────────────────────────────────────────────────
  const isMobile = useIsMobile();
  const isWide   = useIsWide();

  // ── Efectos ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (autoOpen === "add") setShowAdd(true);
  }, [autoOpen]);

  useEffect(() => {
    if (!showAdd) { setShowModalityPicker(false); return; }
    const opt = appointmentTypeOptions.find(o => (o.label || o) === form.type);
    const svc = opt?.serviceId ? (services ?? []).find(s => s.id === opt.serviceId) : null;
    if (svc?.modality === "ambas" && !form.modality) setShowModalityPicker(true);
  }, [showAdd]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Valores derivados ────────────────────────────────────────────────────
  const todayStr = fmt(todayDate);
  const year     = current.getFullYear();
  const month    = current.getMonth();
  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;

  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array.from(
    { length: Math.ceil((firstDay + daysInMonth) / 7) * 7 },
    (_, i) => {
      const d = i - firstDay + 1;
      return (d >= 1 && d <= daysInMonth) ? String(d).padStart(2, "0") : null;
    }
  );

  const timeSlots = useMemo(
    () => {
      // Convertir selectedDay (número de día del mes) al dayKey del schedule ("L","M"…)
      const DAY_NUM_TO_KEY = { 1:"L", 2:"M", 3:"Mi", 4:"J", 5:"V", 6:"S", 0:"D" };
      let dayKey = null;
      if (selectedDay) {
        const monthStr2 = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`;
        const dateObj = new Date(`${monthStr2}-${selectedDay}T12:00:00`);
        dayKey = DAY_NUM_TO_KEY[dateObj.getDay()] ?? null;
      }
      return buildTimeSlots(profile, dayKey);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile?.workingStart, profile?.workingEnd, profile?.schedule, profile?.durationMin, selectedDay]
  );

  const apptsByDay = useMemo(() => {
    const map = {};
    appointments.filter(a => a.date.startsWith(monthStr)).forEach(a => {
      const d = a.date.split("-")[2];
      if (!map[d]) map[d] = [];
      map[d].push(a);
    });
    return map;
  }, [appointments, monthStr]);

  const dayAppts      = selectedDay ? (apptsByDay[selectedDay] || []) : [];
  const upcomingAppts = [...appointments]
    .filter(a => a.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8);

  const recurringCount = useMemo(() => {
    const groups = new Set(appointments.filter(a => a.isRecurring).map(a => a.recurrenceGroupId));
    return groups.size;
  }, [appointments]);

  const freqLabel = { semanal:"semana", quincenal:"2 semanas", mensual:"mes" };

  // ── Handlers ─────────────────────────────────────────────────────────────

  const markReminderSent = (id) =>
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, reminderSent:true } : a));

  const openAddWithPreset = (date, time) => {
    setForm(f => ({ ...f, date, time }));
    setShowAdd(true);
  };

  const handleCreateAndSchedule = () => {
    if (!quickPt.name.trim()) return;
    const newPt = {
      id:            "p" + uid(),
      name:          quickPt.name.trim(),
      phone:         quickPt.phone.trim(),
      diagnosis:     quickPt.reason.trim(),
      status:        "activo",
      createdAt:     fmt(todayDate),
      isPreRegistro: true,
    };
    setPatients(prev => [...prev, newPt]);
    setForm(f => ({ ...f, patientId: newPt.id }));
    resetNewPtMode();
  };

  const handleDateChange = (value) => {
    setDateError("");
    if (!value) { fld("date")(""); return; }
    const workingDays = profile?.workingDays ?? [1,2,3,4,5];
    if (workingDays.length > 0) {
      const dayOfWeek = new Date(value + "T12:00:00").getDay();
      if (!workingDays.includes(dayOfWeek)) {
        setDateError("Este día no está en tu horario de trabajo. Ajusta tu horario en Configuración si necesitas hacer una excepción.");
        fld("date")("");
        return;
      }
    }
    fld("date")(value);
  };

  const handleTimeChange = (value) => {
    setConflictError("");
    fld("time")(value);
  };

  const handleTypeChange = (label) => {
    const opt = appointmentTypeOptions.find(o => (o.label || o) === label);
    if (opt?.serviceId === "__add_service__") {
      setShowModalityPicker(false);
      setShowAdd(false);
      onNavigate?.("settings", null, "services");
      return;
    }
    const svc = opt?.serviceId ? (services ?? []).find(s => s.id === opt.serviceId) : null;
    // Sincronizar duración desde el catálogo centralizado al cambiar servicio
    const duration = svc
      ? (Number(svc.durationMin) || Number(svc.duration) || 50)
      : (profile?.durationMin ?? 50);
    setSessionForm(f => ({ ...f, duration }));
    if (svc?.modality === "ambas") {
      setForm(f => ({ ...f, type:label, serviceId:svc.id, modality:"" }));
      setShowModalityPicker(true);
    } else {
      setForm(f => ({ ...f, type:label, serviceId:svc?.id || "", modality:svc?.modality || "" }));
      setShowModalityPicker(false);
    }
  };

  const save = () => {
    if (!form.patientId || !form.date) return;

    if (!recurring) {
      const conflict = appointments.find(a => a.date === form.date && a.time === form.time);
      if (conflict) {
        const conflictName = conflict.patientName?.split(" ").slice(0, 2).join(" ") || "otro paciente";
        setConflictError(`Ya tienes una cita a esa hora con ${conflictName}. Elige otro horario.`);
        return;
      }
    }

    const pt = patients.find(p => p.id === form.patientId);

    if (recurring) {
      const batch = generateRecurring(form, recFrequency, recOccurrences, pt);
      setAppointments(prev => [...prev, ...batch]);
    } else {
      const newAppt = { ...form, id:"a" + uid(), patientName:pt?.name || "" };
      setAppointments(prev => [...prev, newAppt]);

      const patientHistory = appointments.filter(a => a.patientId === form.patientId && !a.isRecurring);
      const hasTimePattern = patientHistory.some(a => a.time === form.time);

      if (hasTimePattern && patientHistory.length >= 1) {
        const [y, m, d] = form.date.split("-").map(Number);
        const nextDate = new Date(y, m - 1, d);
        nextDate.setDate(nextDate.getDate() + 7);
        setNextApptSuggestion({
          patientId:   form.patientId,
          patientName: pt?.name || "",
          date:        fmt(nextDate),
          time:        form.time,
          type:        form.type,
          serviceId:   form.serviceId,
          modality:    form.modality,
        });
      }
    }

    setForm(blankForm);
    setShowModalityPicker(false);
    setRecurring(false);
    setRecFrequency("semanal");
    setRecOccurrences(8);
    setDateError("");
    setConflictError("");
    setShowAdd(false);
  };

  const confirmNextAppt = () => {
    if (!nextApptSuggestion) return;
    setAppointments(prev => [...prev, {
      ...nextApptSuggestion,
      id:     "a" + uid(),
      status: "pendiente",
    }]);
    setNextApptSuggestion(null);
  };

  const confirmDelete = (appt) => setDeleteTarget(appt);

  const deleteOne = () => {
    setAppointments(prev => prev.filter(a => a.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const deleteAll = () => {
    setAppointments(prev => prev.filter(a => a.recurrenceGroupId !== deleteTarget.recurrenceGroupId));
    setDeleteTarget(null);
  };

  const toggle = (id) =>
    setAppointments(prev => prev.map(a =>
      a.id === id ? { ...a, status: a.status === "completada" ? "pendiente" : "completada" } : a
    ));

  const openQuickSession = (appt) => {
    setQuickSession(appt);
    setSessionForm({ duration: resolveApptDuration(form.serviceId), mood:"moderado", progress:"bueno", notes:"", tags:"" });
  };

  const saveQuickSession = () => {
    if (!quickSession || !sessionForm.notes.trim()) return;
    setSessions(prev => [...prev, {
      ...sessionForm,
      id:          "s" + uid(),
      patientId:   quickSession.patientId,
      patientName: quickSession.patientName,
      date:        quickSession.date,
      tags:        sessionForm.tags.split(",").map(t => t.trim()).filter(Boolean),
    }]);
    toggle(quickSession.id);
    setQuickSession(null);
  };

  const openStatusModal = (appt) => {
    setStatusTarget(appt);
    setStatusForm({ status:appt.status || "pendiente", motivo:"", reagendar:false, newDate:fmt(todayDate), newTime:appt.time || "09:00" });
  };

  const saveStatus = () => {
    if (!statusTarget) return;
    setAppointments(prev => prev.map(a => {
      if (a.id !== statusTarget.id) return a;
      return { ...a, status:statusForm.status, cancelMotivo:statusForm.motivo };
    }));
    if (statusForm.reagendar && statusForm.newDate) {
      const newAppt = {
        ...statusTarget,
        id:               "a" + uid(),
        date:             statusForm.newDate,
        time:             statusForm.newTime,
        status:           "pendiente",
        isRecurring:      false,
        recurrenceGroupId:null,
        cancelMotivo:     null,
      };
      setAppointments(prev => [...prev, newAppt]);
    }
    setStatusTarget(null);
  };

  const handleOpenAppt = (appt) => {
    const pt = patients.find(p => p.id === appt.patientId);
    const hasSessions = sessions.some(s => s.patientId === appt.patientId);
    if (hasSessions) {
      setSummaryTarget({ patient:pt, appointment:appt });
    } else {
      setAdmisionTarget({ appt, patient:pt });
    }
  };

  const handleStartSessionLocal = (appt) => {
    if (typeof onStartSession === "function") {
      onStartSession(appt);
    } else {
      emit.toast("Abre el módulo de Sesiones para registrar esta nota", "info");
    }
  };

  const handleSendConsentWhatsApp = async (patient) => {
    const nombre    = patient?.name?.split(" ")[0] || "";
    const phone     = patient?.phone?.replace(/\D/g, "");
    const psicologa = profile?.name?.trim() || "tu psicóloga";
    if (!phone) return;
    try {
      const { accessUrl } = await createPortalAccessLink(patient.phone);
      const msg = encodeURIComponent(
        `Hola ${nombre} 👋\n\nPara iniciar nuestro proceso terapéutico, te compartimos el enlace para revisar y firmar tu *Consentimiento Informado*: ${accessUrl}\n\nEste enlace vence en 24 horas.\nSi tienes dudas, con gusto te apoyo.\n\n¡Gracias! 😊\n— ${psicologa}`
      );
      window.open(`https://wa.me/${phone}?text=${msg}`, "_blank", "noopener,noreferrer");
    } catch {
      setLinkError(true);
    }
  };

  const cancelWhatsAppUrl = (appt) => {
    if (statusForm.status !== "cancelada_psicologa") return null;
    const pt = patients.find(p => p.id === appt.patientId);
    return whatsappCancel(appt, pt, profile);
  };

  const closeAddModal = () => {
    setShowAdd(false);
    setRecurring(false);
    setDateError("");
    setConflictError("");
    resetNewPtMode();
  };

  // ── Exposed API ───────────────────────────────────────────────────────────
  return {
    // layout
    isMobile,
    isWide,
    // views
    view, setView,
    current, setCurrent,
    weekAnchor, setWeekAnchor,
    calCollapsed, setCalCollapsed,
    selectedDay, setSelectedDay,
    selectedDayView, setSelectedDayView,
    // calendar grid
    year, month, monthStr, todayStr, cells, firstDay, daysInMonth,
    // derived
    apptsByDay, dayAppts, upcomingAppts, recurringCount, timeSlots,
    freqLabel,
    // modal: nueva cita
    showAdd, setShowAdd, closeAddModal,
    newPtMode, setNewPtMode,
    quickPt, setQuickPt, resetNewPtMode,
    form, setForm, fld,
    showModalityPicker, setShowModalityPicker,
    dateError, conflictError,
    recurring, setRecurring,
    recFrequency, setRecFrequency,
    recOccurrences, setRecOccurrences,
    appointmentTypeOptions, serviceOptions,
    // modal: sesión rápida
    quickSession, setQuickSession,
    sessionForm, sfld,
    // modal: eliminar
    deleteTarget,
    // modal: estado/cancelación
    statusTarget, setStatusTarget,
    statusForm, setStatusForm, sfStatus,
    // modal: admisión / resumen
    summaryTarget, setSummaryTarget,
    admisionTarget, setAdmisionTarget,
    linkError, setLinkError,
    // sugerencia siguiente cita
    nextApptSuggestion, setNextApptSuggestion,
    // handlers
    markReminderSent,
    openAddWithPreset,
    handleCreateAndSchedule,
    handleDateChange,
    handleTimeChange,
    handleTypeChange,
    save,
    confirmNextAppt,
    confirmDelete,
    deleteOne,
    deleteAll,
    toggle,
    openQuickSession,
    saveQuickSession,
    openStatusModal,
    saveStatus,
    handleOpenAppt,
    handleStartSessionLocal,
    handleSendConsentWhatsApp,
    cancelWhatsAppUrl,
  };
}
