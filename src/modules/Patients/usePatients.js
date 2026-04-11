import { useState, useMemo, useEffect } from "react";
import { uid, todayDate, fmt } from "../../utils.js";
import { createPortalAccessLink } from "../../lib/supabase.js";
import { printAlta, printDerivacion } from "../Reports/reports.utils.js";
import { useAppState } from "../../context/AppStateContext.jsx";
import {
  ANAMNESIS_BLANK,
  STATUS_CONFIG,
  PHONE_COUNTRIES,
  calcAge,
  exportExpediente,
} from "./patients.utils.js";

const todayStr = fmt(todayDate);

// ── Blank patient form ────────────────────────────────────────────────────────
const BLANK_FORM = {
  name:"", birthdate:"", phone:"", countryCode:"+52", email:"",
  diagnosis:"", cie11Code:"", reason:"", notes:"",
  status:"activo", type:"individual", coParticipants:"",
  rate:"", serviceId:"",
  emergencyName:"", emergencyPhone:"", emergencyRelation:"",
};

/**
 * Central hook that owns all Patients state, derived data, and event handlers.
 * Returns everything the UI needs — no JSX produced here.
 */
export function usePatients({
  patients,
  setPatients,
  sessions,
  payments,
  setPayments,
  riskAssessments,
  scaleResults,
  treatmentPlans,
  services,
  appointments,
  setAppointments,
  profile,
  onQuickNav,
  autoOpen,
}) {
  const { setActivePatientContext } = useAppState();

  // ── List-view state ─────────────────────────────────────────────────────────
  const [search,       setSearch]       = useState("");
  const [filterChip,   setFilterChip]   = useState("todos");
  const [showAdd,      setShowAdd]      = useState(false);
  const [showPC,       setShowPC]       = useState(false);
  const [editTarget,   setEditTarget]   = useState(null);

  useEffect(() => {
    if (autoOpen === "add") setShowPC(true);
  }, [autoOpen]);

  // ── Detail-view state ───────────────────────────────────────────────────────
  const [selected,     setSelected]     = useState(null);
  const [detailTab,    setDetailTab]    = useState("sessions");
  const [showAddDx,    setShowAddDx]    = useState(false);
  const [newDx,        setNewDx]        = useState({ diagnosis:"", cie11Code:"", date:todayStr, notes:"" });

  // ── Patient form state ──────────────────────────────────────────────────────
  const [form,         setForm]         = useState(BLANK_FORM);
  const fld = k => v => setForm(f => ({ ...f, [k]: v }));

  const resetForm = () => { setForm(BLANK_FORM); setEditTarget(null); setShowAdd(false); };

  // ── Modal / toast state ─────────────────────────────────────────────────────
  const [showAltaModal,      setShowAltaModal]      = useState(false);
  const [showWaModal,        setShowWaModal]        = useState(false);
  const [altaToast,          setAltaToast]          = useState(false);
  const [showReingresoModal, setShowReingresoModal] = useState(false);
  const [showConsentExpired, setShowConsentExpired] = useState(false);
  const [reingresoToast,     setReingresoToast]     = useState(false);
  const [welcomeLinkError,   setWelcomeLinkError]   = useState(false);

  // ── Derived: chip counts ────────────────────────────────────────────────────
  const chipCounts = useMemo(() => {
    const activos  = patients.filter(p => (p.status||"activo") === "activo").length;
    const conSaldo = patients.filter(p => payments.some(py => py.patientId === p.id && py.status === "pendiente")).length;
    const riesgo   = patients.filter(p => {
      const lr = riskAssessments.filter(r => r.patientId === p.id).sort((a,b)=>b.date.localeCompare(a.date))[0];
      return (lr && (lr.riskLevel === "alto" || lr.riskLevel === "inminente")) || !!(p.activeRiskAlert);
    }).length;
    const alta = patients.filter(p => (p.status||"activo") === "alta").length;
    return { activos, conSaldo, riesgo, alta };
  }, [patients, payments, riskAssessments]);

  // ── Derived: filtered list ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let base = patients;
    if (filterChip === "activos")       base = base.filter(p => (p.status||"activo") === "activo");
    else if (filterChip === "conSaldo") base = base.filter(p => payments.some(py => py.patientId === p.id && py.status === "pendiente"));
    else if (filterChip === "riesgo")   base = base.filter(p => {
      const lr = riskAssessments.filter(r => r.patientId === p.id).sort((a,b)=>b.date.localeCompare(a.date))[0];
      return (lr && (lr.riskLevel === "alto" || lr.riskLevel === "inminente")) || !!(p.activeRiskAlert);
    });
    else if (filterChip === "alta")     base = base.filter(p => (p.status||"activo") === "alta");
    return base.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.diagnosis||"").toLowerCase().includes(search.toLowerCase())
    );
  }, [patients, payments, riskAssessments, search, filterChip]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const updateConsent = (id, consentData) => {
    setPatients(prev => prev.map(p => p.id === id ? { ...p, consent: consentData } : p));
    setSelected(prev => prev?.id === id ? { ...prev, consent: consentData } : prev);
  };

  const addDiagnosis = (id) => {
    if (!newDx.diagnosis.trim()) return;
    setPatients(prev => prev.map(p => {
      if (p.id !== id) return p;
      const history = [...(p.diagnosisHistory || []), { ...newDx, id:"dx"+uid() }];
      return { ...p, diagnosisHistory: history, diagnosis: newDx.diagnosis, cie11Code: newDx.cie11Code || p.cie11Code };
    }));
    setSelected(prev => {
      if (!prev) return prev;
      const history = [...(prev.diagnosisHistory || []), { ...newDx, id:"dx"+uid() }];
      return { ...prev, diagnosisHistory: history, diagnosis: newDx.diagnosis, cie11Code: newDx.cie11Code || prev.cie11Code };
    });
    setNewDx({ diagnosis:"", cie11Code:"", date:todayStr, notes:"" });
    setShowAddDx(false);
  };

  const handleSelect = (p, openTab) => {
    const patient = patients.find(pt => pt.id === p.id) || p;
    const hasPendingPayments = payments.some(py => py.patientId === patient.id && py.status === "pendiente");
    const autoTab = openTab || (hasPendingPayments ? "payments" : "sessions");
    setSelected(patient);
    setDetailTab(autoTab);
    setActivePatientContext({ patientId: patient.id, patientName: patient.name || "", source: "patients", updatedAt: new Date().toISOString() });
  };

  // Expose quick-nav ref
  if (onQuickNav) onQuickNav.current = (p, openTab) => handleSelect(p, openTab);

  const handleSendWelcomeFromDetail = async () => {
    if (!selected?.phone) return;
    try {
      const firstName = selected.name?.split(" ")[0] || "Hola";
      const psychName = profile?.name?.trim() || "tu psicólogo(a)";
      const { accessUrl } = await createPortalAccessLink(selected.phone);
      const msg = encodeURIComponent(
        `Hola, ${firstName}. 👋\n\nTe compartimos tu enlace temporal y seguro para revisar y firmar tu Consentimiento Informado: ${accessUrl}\n\nEste enlace vence en 24 horas.\n\n— ${psychName}`
      );
      window.open(`https://wa.me/${selected.phone.replace(/\D/g,"")}?text=${msg}`, "_blank", "noopener,noreferrer");
    } catch (error) {
      
      setWelcomeLinkError(true);
      setTimeout(() => setWelcomeLinkError(false), 3500);
    }
  };

  const save = () => {
    if (!form.name.trim()) return;
    const fullPhone = form.phone ? `${form.countryCode || "+52"}${form.phone.replace(/\D/g, "")}` : "";
    const formToSave = { ...form, phone: fullPhone };
    if (editTarget) {
      setPatients(prev => prev.map(p =>
        p.id === editTarget ? { ...p, ...formToSave, age: calcAge(form.birthdate) } : p
      ));
      setSelected(prev => prev ? { ...prev, ...formToSave, age: calcAge(form.birthdate) } : prev);
    } else {
      setPatients(prev => [...prev, { ...formToSave, age: calcAge(form.birthdate), id:"p"+uid(), createdAt:fmt(todayDate) }]);
    }
    resetForm();
  };

  const savePrimerContacto = (pcForm) => {
    if (pcForm.__navigateTo) {
      const existing = patients.find(p => p.id === pcForm.__navigateTo);
      if (existing) handleSelect(existing);
      return null;
    }
    const newId = "p" + uid();
    const newPatient = {
      id:            newId,
      name:          pcForm.name.trim(),
      phone:         `${pcForm.countryCode || "+52"}${pcForm.phone.replace(/\D/g, "")}`,
      status:        "activo",
      initialReason: pcForm.initialReason.trim(),
      reason:        pcForm.initialReason.trim(),
      consent:       { signed: false },
      type:          "individual",
      createdAt:     fmt(todayDate),
      birthdate:"", email:"", diagnosis:"", cie11Code:"", notes:"",
      rate:"", serviceId:"", emergencyName:"", emergencyPhone:"", emergencyRelation:"",
    };
    setPatients(prev => [...prev, newPatient]);

    let newAppointment = null;
    if (pcForm.appointmentDate && setAppointments) {
      newAppointment = {
        id:          "a" + uid(),
        patientId:   newId,
        patientName: newPatient.name,
        date:        pcForm.appointmentDate,
        time:        pcForm.appointmentTime || "09:00",
        type:        "Primera vez",
        status:      "pendiente",
      };
      setAppointments(prev => [...prev, newAppointment]);
    }

    return { patient: newPatient, appointment: newAppointment || { date: pcForm.appointmentDate, time: pcForm.appointmentTime } };
  };

  const del = id => {
    setPatients(prev => prev.filter(p => p.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const setStatus = (id, status) => {
    setPatients(prev => prev.map(p => p.id === id ? { ...p, status } : p));
    setSelected(prev => prev ? { ...prev, status } : prev);
  };

  const mitigateRisk = (id) => {
    setPatients(prev => prev.map(p => p.id === id ? { ...p, activeRiskAlert: null } : p));
    setSelected(prev => prev ? { ...prev, activeRiskAlert: null } : prev);
  };

  const setRate = (id, rate) => {
    setPatients(prev => prev.map(p => p.id === id ? { ...p, rate } : p));
    setSelected(prev => prev ? { ...prev, rate } : prev);
  };

  const setServiceId = (id, serviceId) => {
    const svc = services.find(s => s.id === serviceId);
    const rate = svc ? String(svc.price || "") : "";
    setPatients(prev => prev.map(p => p.id === id ? { ...p, serviceId, rate } : p));
    setSelected(prev => prev ? { ...prev, serviceId, rate } : prev);
  };

  const togglePayment = id =>
    setPayments(prev => prev.map(p => p.id === id ? { ...p, status: p.status === "pagado" ? "pendiente" : "pagado" } : p));

  const handleExportExpediente = () => {
    if (selected) exportExpediente(selected, sessions, payments, profile);
  };

  const confirmAlta = (altaForm) => {
    if (!selected) return;
    const dischargeDate = fmt(todayDate);
    const discharge = {
      date:            dischargeDate,
      reason:          altaForm.motivo,
      notes:           altaForm.observaciones,
      recommendations: altaForm.recomendaciones,
    };

    setPatients(prev => prev.map(p =>
      p.id === selected.id ? { ...p, status: "alta", discharge } : p
    ));
    setSelected(prev => prev ? { ...prev, status: "alta", discharge } : prev);

    const ptSess = sessions.filter(s => s.patientId === selected.id).sort((a,b) => a.date.localeCompare(b.date));
    const allSc  = scaleResults.filter(r => r.patientId === selected.id).sort((a,b) => a.date.localeCompare(b.date));
    const plan   = treatmentPlans.filter(tp => tp.patientId === selected.id).sort((a,b) => (b.startDate||"").localeCompare(a.startDate||""))[0] || null;

    if (altaForm.genInforme) {
      printAlta({ patient: selected, plan, allScales: allSc, ptSessions: ptSess, profile, custom: {}, discharge });
    }
    if (altaForm.genCarta) {
      const latestRisk = riskAssessments.filter(r => r.patientId === selected.id).sort((a,b) => b.date.localeCompare(a.date))[0] || null;
      printDerivacion({
        patient: selected, plan, allScales: allSc, ptSessions: ptSess, profile, latestRisk,
        custom: {
          destinatario:         altaForm.referProfessional ? "" : "",
          profesional:          altaForm.referProfessional,
          motivo:               `Derivación al alta de ${selected.name}. ${altaForm.observaciones}`,
          resumenClinico:       altaForm.observaciones,
          informacionAdicional: altaForm.recomendaciones,
        },
      });
    }

    setShowAltaModal(false);
    setShowWaModal(true);
    setAltaToast(true);
    setTimeout(() => setAltaToast(false), 3500);
  };

  const confirmReingreso = (option, withAdmission) => {
    if (!selected) return;
    const today = fmt(todayDate);
    const reingresoData = { date: today, option, withAdmission: option === "A" ? withAdmission : false };

    if (option === "A") {
      const updates = { status: "activo", reingreso: reingresoData };
      if (withAdmission) {
        updates.anamnesis = { ...ANAMNESIS_BLANK, fechaPrimeraConsulta: today, reingresoDate: today };
      }
      setPatients(prev => prev.map(p => p.id === selected.id ? { ...p, ...updates } : p));
      setSelected(prev => prev ? { ...prev, ...updates } : prev);
    } else {
      setPatients(prev => prev.map(p => p.id === selected.id ? { ...p, reingreso: reingresoData } : p));
      const newId = "p" + uid();
      const newPatient = {
        id:            newId,
        name:          selected.name,
        phone:         selected.phone || "",
        status:        "activo",
        linkedTo:      selected.id,
        reingreso:     reingresoData,
        type:          selected.type || "individual",
        createdAt:     today,
        birthdate:"", email:"", diagnosis:"", cie11Code:"", reason:"",
        notes:"", rate: selected.rate || "", serviceId: selected.serviceId || "",
        emergencyName:"", emergencyPhone:"", emergencyRelation:"",
        consent: { signed: false },
      };
      setPatients(prev => [...prev, newPatient]);
      setSelected(newPatient);
    }

    setShowReingresoModal(false);
    setReingresoToast(true);
    setTimeout(() => setReingresoToast(false), 3500);

    const signedAt = selected.consent?.signedAt;
    if (!signedAt) {
      setShowConsentExpired(true);
    } else {
      const monthsDiff = (Date.now() - new Date(signedAt).getTime()) / (1000 * 60 * 60 * 24 * 30.44);
      if (monthsDiff > 12) setShowConsentExpired(true);
    }
  };

  // ── Edit patient helper ─────────────────────────────────────────────────────
  const openEditSelected = () => {
    if (!selected) return;
    const rawPhone    = selected.phone || "";
    const match       = PHONE_COUNTRIES.find(c => rawPhone.startsWith(c.code));
    const countryCode = match ? match.code : "+52";
    const phoneDigits = match ? rawPhone.slice(match.code.length) : rawPhone.replace(/\D/g, "");
    setForm({
      name:              selected.name || "",
      birthdate:         selected.birthdate || "",
      phone:             phoneDigits,
      countryCode,
      email:             selected.email || "",
      diagnosis:         selected.diagnosis || "",
      cie11Code:         selected.cie11Code || "",
      reason:            selected.reason || "",
      notes:             selected.notes || "",
      status:            selected.status || "activo",
      type:              selected.type || "individual",
      coParticipants:    selected.coParticipants || "",
      rate:              selected.rate || "",
      serviceId:         selected.serviceId || "",
      emergencyName:     selected.emergencyName || "",
      emergencyPhone:    selected.emergencyPhone || "",
      emergencyRelation: selected.emergencyRelation || "",
    });
    setEditTarget(selected.id);
    setShowAdd(true);
  };

  // ── Return everything the UI needs ──────────────────────────────────────────
  return {
    // list state
    search, setSearch,
    filterChip, setFilterChip,
    showAdd, setShowAdd,
    showPC, setShowPC,
    editTarget, setEditTarget,
    // detail state
    selected, setSelected,
    detailTab, setDetailTab,
    showAddDx, setShowAddDx,
    newDx, setNewDx,
    // form
    form, setForm, fld, resetForm,
    // modal / toast
    showAltaModal, setShowAltaModal,
    showWaModal, setShowWaModal,
    altaToast,
    showReingresoModal, setShowReingresoModal,
    showConsentExpired, setShowConsentExpired,
    reingresoToast,
    welcomeLinkError,
    // derived
    chipCounts,
    filtered,
    todayStr,
    // handlers
    updateConsent,
    addDiagnosis,
    handleSelect,
    handleSendWelcomeFromDetail,
    handleExportExpediente,
    save,
    savePrimerContacto,
    del,
    setStatus,
    mitigateRisk,
    setRate,
    setServiceId,
    togglePayment,
    confirmAlta,
    confirmReingreso,
    openEditSelected,
  };
}
