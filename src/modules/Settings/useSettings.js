// ── useSettings.js ────────────────────────────────────────────────────────────
// Lógica de estado y handlers para el módulo Settings.
// Sin JSX. Sin imports de UI.

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase.js";
import {
  uid,
  todayISO,
  getInitials,
  calcPkgPrices,
  parseCSVPatients,
  DISCOUNTS,
  hhmmToMin,
  minToHHMM,
  ALL_CURRENCIES,
} from "./settings.utils.js";

// ─────────────────────────────────────────────────────────────────────────────
// useProfileTab
// ─────────────────────────────────────────────────────────────────────────────
export function useProfileTab({ profile, setProfile, googleUser }) {
  const googleName  = googleUser?.user_metadata?.full_name || googleUser?.user_metadata?.name || "";
  const googleEmail = googleUser?.email || "";

  const [form, setForm] = useState(() => ({
    ...profile,
    name:        profile?.name        || googleName,
    email:       profile?.email       || googleEmail,
    description: profile?.description || "",
    avatarUrl:   profile?.avatarUrl   || null,
  }));
  const [saved,         setSaved]         = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatarUrl || null);

  const fld = k => v => setForm(f => ({ ...f, [k]: v }));

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAvatarPreview(ev.target.result);
      setForm(f => ({ ...f, avatarUrl: ev.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const save = () => {
    setProfile({
      ...form,
      initials: getInitials(form.name),
      specialty: form.specialty ||
        (Array.isArray(form.specialties) && form.specialties.length > 0
          ? form.specialties[0]
          : ""),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return { form, fld, save, saved, avatarPreview, handleAvatarChange };
}

// ─────────────────────────────────────────────────────────────────────────────
// useScheduleTab  (modelo multi-slot por día, estilo Calendly)
// ─────────────────────────────────────────────────────────────────────────────

const DAY_NUM_TO_KEY = { 0:"D", 1:"L", 2:"M", 3:"Mi", 4:"J", 5:"V", 6:"S" };

/** Convierte HH:MM a minutos */
const _toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };

/**
 * Construye el estado inicial de la grilla a partir del profile.
 * Prioriza profile.schedule (formato granular por día) cuando existe,
 * y cae a workingStart/workingEnd global como fallback.
 */
function buildInitialDays(profile) {
  const defaultSlot = {
    start: profile?.workingStart ?? "09:00",
    end:   profile?.workingEnd   ?? "19:00",
  };
  const defaultEnabled = profile?.workingDays ?? [1, 2, 3, 4, 5];
  const sched = profile?.schedule ?? {};

  return [0, 1, 2, 3, 4, 5, 6].map(dayId => {
    const key     = DAY_NUM_TO_KEY[dayId];
    const enabled = defaultEnabled.includes(dayId);
    // Si hay slots granulares para este día, úsalos; si no, el default
    const rawSlots = sched[key];
    const slots = rawSlots?.length
      ? rawSlots.map(s => ({ start: s.start, end: s.end }))
      : [{ ...defaultSlot }];
    return { dayId, enabled, slots };
  });
}

export function useScheduleTab({ profile, setProfile }) {
  const [days,  setDays]  = useState(() => buildInitialDays(profile));
  const [saved, setSaved] = useState(false);

  // ── Helpers de mutación ────────────────────────────────────────────────────
  const updateDay = (dayId, patch) =>
    setDays(prev => prev.map(d => d.dayId === dayId ? { ...d, ...patch } : d));

  const toggleDay = (dayId) =>
    updateDay(dayId, { enabled: !days.find(d => d.dayId === dayId)?.enabled });

  const updateSlot = (dayId, slotIdx, slot) =>
    setDays(prev => prev.map(d => {
      if (d.dayId !== dayId) return d;
      const slots = d.slots.map((s, i) => i === slotIdx ? slot : s);
      return { ...d, slots };
    }));

  const addSlot = (dayId) =>
    setDays(prev => prev.map(d => {
      if (d.dayId !== dayId) return d;
      const last    = d.slots[d.slots.length - 1];
      const startM  = _toMin(last?.end ?? "09:00");
      const endM    = Math.min(startM + 60, 23 * 60);
      const fmt     = (m) => `${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`;
      return { ...d, slots: [...d.slots, { start: fmt(startM), end: fmt(endM) }] };
    }));

  const deleteSlot = (dayId, slotIdx) =>
    setDays(prev => prev.map(d => {
      if (d.dayId !== dayId || d.slots.length <= 1) return d;
      return { ...d, slots: d.slots.filter((_, i) => i !== slotIdx) };
    }));

  const copyToAll = (dayId) => {
    const source = days.find(d => d.dayId === dayId);
    if (!source) return;
    setDays(prev => prev.map(d =>
      d.enabled && d.dayId !== dayId
        ? { ...d, slots: source.slots.map(s => ({ ...s })) }
        : d
    ));
  };

  // ── Validación ─────────────────────────────────────────────────────────────
  const hasErrors = days.some(d =>
    d.enabled && d.slots.some(s => _toMin(s.end) <= _toMin(s.start))
  );
  const hasActiveDays = days.some(d => d.enabled);
  const isValid = hasActiveDays && !hasErrors;

  // ── Persistencia ───────────────────────────────────────────────────────────
  const save = () => {
    if (!isValid) return;
    const newActiveDays = { L:false, M:false, Mi:false, J:false, V:false, S:false, D:false };
    const newSchedule   = {};

    // workingDays / workingStart / workingEnd: compatibilidad con Agenda.jsx
    const enabledIds = days.filter(d => d.enabled).map(d => d.dayId);
    // Para workingStart/End usamos el primer slot del primer día activo como fallback
    const firstActive = days.find(d => d.enabled);
    const globalStart = firstActive?.slots[0]?.start ?? "09:00";
    const globalEnd   = firstActive?.slots[firstActive.slots.length - 1]?.end ?? "19:00";

    days.forEach(d => {
      const k = DAY_NUM_TO_KEY[d.dayId];
      if (!k) return;
      newActiveDays[k] = d.enabled;
      if (d.enabled) {
        newSchedule[k] = d.slots.map(s => ({ start: s.start, end: s.end }));
      }
    });

    setProfile(p => ({
      ...p,
      workingDays:  enabledIds,
      workingStart: globalStart,
      workingEnd:   globalEnd,
      activeDays:   newActiveDays,
      schedule:     newSchedule,
    }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  // Stats para el resumen del header
  const totalMin = days.filter(d => d.enabled).reduce((acc, d) =>
    acc + d.slots.reduce((a, s) => {
      const diff = _toMin(s.end) - _toMin(s.start);
      return a + (diff > 0 ? diff : 0);
    }, 0), 0);
  const activeDayCount = days.filter(d => d.enabled).length;

  return {
    days, updateDay, toggleDay, updateSlot, addSlot, deleteSlot, copyToAll,
    save, saved, isValid, hasErrors,
    totalMin, activeDayCount,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// BLANK SERVICE — forma vacía para el formulario de nuevo servicio
// ─────────────────────────────────────────────────────────────────────────────
export const BLANK_SERVICE = {
  name: "",
  type: "sesion",
  modality: "ambas",
  durationHH: "00",
  durationMM: "50",
  prices: {},   // { MXN: { presencial: "", virtual: "" }, USD: { ... } }
};

// ─────────────────────────────────────────────────────────────────────────────
// useServicesTab — NUEVO catálogo centralizado
// ─────────────────────────────────────────────────────────────────────────────
export function useServicesTab({ profile, setProfile, services, setServices }) {
  const today = todayISO();

  // ── Divisas activas del psicólogo ─────────────────────────────────────────
  const activeCurrencies = profile?.currencies?.length
    ? profile.currencies
    : (profile?.currency ? [profile.currency] : ["MXN"]);

  const toggleCurrency = (code) => {
    const current = [...activeCurrencies];
    const next = current.includes(code)
      ? current.length > 1 ? current.filter(c => c !== code) : current
      : [...current, code];
    setProfile(p => ({ ...p, currencies: next, currency: next[0] }));
  };

  // ── Formulario de nuevo/editar servicio ───────────────────────────────────
  const [form,       setForm]       = useState(BLANK_SERVICE);
  const [editingId,  setEditingId]  = useState(null);   // id del servicio en edición
  const [showForm,   setShowForm]   = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Sincronizar precios del form con divisas activas cuando cambian
  useEffect(() => {
    setForm(f => {
      const newPrices = { ...f.prices };
      activeCurrencies.forEach(cur => {
        if (!newPrices[cur]) newPrices[cur] = { presencial: "", virtual: "" };
      });
      return { ...f, prices: newPrices };
    });
  }, [activeCurrencies.join(",")]); // eslint-disable-line

  const fld = k => v => setForm(f => ({ ...f, [k]: v }));

  const setPriceField = (cur, mod, val) => {
    setForm(f => ({
      ...f,
      prices: {
        ...f.prices,
        [cur]: { ...(f.prices[cur] || {}), [mod]: val },
      },
    }));
  };

  const openNew = () => {
    // Inicializar precios vacíos para cada divisa activa
    const prices = {};
    activeCurrencies.forEach(cur => { prices[cur] = { presencial: "", virtual: "" }; });
    setForm({ ...BLANK_SERVICE, prices });
    setEditingId(null);
    setFormErrors({});
    setShowForm(true);
  };

  const openEdit = (svc) => {
    const { hh, mm } = minToHHMM(svc.durationMin || 50);
    // Reconstruct prices ensuring all active currencies present
    const prices = {};
    activeCurrencies.forEach(cur => {
      prices[cur] = {
        presencial: svc.prices?.[cur]?.presencial ?? "",
        virtual:    svc.prices?.[cur]?.virtual    ?? "",
      };
    });
    setForm({
      name:        svc.name,
      type:        svc.type,
      modality:    svc.modality,
      durationHH:  hh,
      durationMM:  mm,
      prices,
    });
    setEditingId(svc.id);
    setFormErrors({});
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormErrors({});
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "El nombre es obligatorio";
    const totalMin = hhmmToMin(form.durationHH, form.durationMM);
    if (totalMin === 0) e.duration = "La duración debe ser mayor a 0";
    // At least one price in at least one currency
    const hasAnyPrice = activeCurrencies.some(cur =>
      (form.modality === "virtual"    ? false : Number(form.prices[cur]?.presencial) > 0) ||
      (form.modality === "presencial" ? false : Number(form.prices[cur]?.virtual)    > 0) ||
      Number(form.prices[cur]?.presencial) > 0 ||
      Number(form.prices[cur]?.virtual)    > 0
    );
    if (!hasAnyPrice) e.prices = "Ingresa al menos un precio";
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = () => {
    if (!validate()) return;
    const durationMin = hhmmToMin(form.durationHH, form.durationMM);
    // Clean prices: only keep modality-relevant ones and parse to numbers
    const cleanPrices = {};
    activeCurrencies.forEach(cur => {
      const entry = {};
      if (form.modality !== "virtual"    && form.prices[cur]?.presencial !== "") {
        entry.presencial = Number(form.prices[cur]?.presencial) || 0;
      }
      if (form.modality !== "presencial" && form.prices[cur]?.virtual    !== "") {
        entry.virtual    = Number(form.prices[cur]?.virtual)    || 0;
      }
      if (Object.keys(entry).length) cleanPrices[cur] = entry;
    });

    if (editingId) {
      setServices(prev => prev.map(s => {
        if (s.id !== editingId) return s;
        return {
          ...s,
          name:        form.name.trim(),
          type:        form.type,
          modality:    form.modality,
          durationHH:  form.durationHH,
          durationMM:  form.durationMM,
          durationMin,
          prices:      cleanPrices,
          // Keep legacy price fields for backwards compat with Finance/Agenda
          price:        cleanPrices[activeCurrencies[0]]?.presencial ?? s.price ?? 0,
          priceVirtual: cleanPrices[activeCurrencies[0]]?.virtual    ?? s.priceVirtual ?? null,
          priceHistory: [
            ...(s.priceHistory || []),
            { prices: cleanPrices, from: today },
          ],
        };
      }));
    } else {
      const primaryCur = activeCurrencies[0];
      const newSvc = {
        id:          "svc" + uid(),
        name:        form.name.trim(),
        type:        form.type,
        modality:    form.modality,
        durationHH:  form.durationHH,
        durationMM:  form.durationMM,
        durationMin,
        prices:      cleanPrices,
        sessions:    null,
        // Legacy compat fields
        price:        cleanPrices[primaryCur]?.presencial ?? 0,
        priceVirtual: cleanPrices[primaryCur]?.virtual    ?? null,
        priceHistory: [{ prices: cleanPrices, from: today }],
      };
      setServices(prev => [...prev, newSvc]);
    }
    cancelForm();
  };

  const del = (id) => setServices(prev => prev.filter(s => s.id !== id));

  // ── Servicios sin paquetes ────────────────────────────────────────────────
  const regularServices = services.filter(s => s.type !== "paquete");

  // ── Paquetes ──────────────────────────────────────────────────────────────
  const packageServices = services.filter(s => s.type === "paquete");

  // Sesión base para calcular sugeridos de paquetes
  const sesionSvc  = regularServices.find(s => s.type === "sesion");
  const basePrice  = sesionSvc?.price        || 900;
  const basePriceV = sesionSvc?.priceVirtual || null;

  const [pkgPrices,  setPkgPrices]  = useState(() => calcPkgPrices(basePrice, basePriceV).row);
  const [pkgPricesV, setPkgPricesV] = useState(() => calcPkgPrices(basePrice, basePriceV).rowV);

  useEffect(() => {
    const fresh = calcPkgPrices(basePrice, basePriceV);
    setPkgPrices(fresh.row);
    setPkgPricesV(fresh.rowV);
  }, [basePrice, basePriceV]);

  const savePkgRow = (modality) => {
    setServices(prev => {
      let updated = [...prev];
      DISCOUNTS.forEach(d => {
        const priceP = modality === "presencial" ? (Number(pkgPrices[d.sessions])    || 0)    : 0;
        const priceV = modality === "virtual"    ? (Number(pkgPricesV?.[d.sessions]) || null) : null;
        if (!priceP && !priceV) return;
        const dupIdx  = updated.findIndex(s => s.type === "paquete" && s.sessions === d.sessions);
        const existing = dupIdx >= 0 ? updated[dupIdx] : null;
        const mergedP  = modality === "presencial" ? priceP : (existing?.price        || 0);
        const mergedV  = modality === "virtual"    ? priceV : (existing?.priceVirtual || null);
        const mergedMod = mergedP && mergedV ? "ambas" : mergedV ? "virtual" : "presencial";
        const primaryCur = activeCurrencies[0] || "MXN";
        const cleanPrices = {};
        if (mergedP) cleanPrices[primaryCur] = { ...(cleanPrices[primaryCur] || {}), presencial: mergedP };
        if (mergedV) cleanPrices[primaryCur] = { ...(cleanPrices[primaryCur] || {}), virtual: mergedV };
        const { hh, mm } = minToHHMM(50);
        const entry = {
          id:          existing?.id || "svc" + uid(),
          name:        d.label,
          type:        "paquete",
          modality:    mergedMod,
          sessions:    d.sessions,
          durationHH:  hh,
          durationMM:  mm,
          durationMin: 50,
          prices:      cleanPrices,
          price:        mergedP,
          priceVirtual: mergedV,
          priceHistory: existing
            ? [...(existing.priceHistory || []), { prices: cleanPrices, from: today }]
            : [{ prices: cleanPrices, from: today }],
        };
        if (dupIdx >= 0) updated[dupIdx] = entry;
        else updated = [...updated, entry];
      });
      return updated;
    });
  };

  const delPkg = (id) => setServices(prev => prev.filter(s => s.id !== id));

  const resetPkgPrices = () => {
    const fresh = calcPkgPrices(basePrice, basePriceV);
    setPkgPrices(fresh.row);
    setPkgPricesV(fresh.rowV);
  };

  return {
    // Currencies
    activeCurrencies,
    allCurrencies: ALL_CURRENCIES,
    toggleCurrency,
    // Service form
    form, fld, setPriceField,
    showForm, formErrors,
    editingId,
    openNew, openEdit, cancelForm, save,
    // Lists
    regularServices,
    packageServices,
    del, delPkg,
    // Packages
    pkgPrices, setPkgPrices,
    pkgPricesV, setPkgPricesV,
    savePkgRow, resetPkgPrices,
    basePrice, basePriceV,
    today,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// useDataTab
// ─────────────────────────────────────────────────────────────────────────────
export function useDataTab({ allData, onRestore, patients }) {
  const [msg,               setMsg]               = useState(null);
  const [importing,         setImporting]         = useState(false);
  const [showDelete,        setShowDelete]        = useState(false);
  const [showBackupWarning, setShowBackupWarning] = useState(false);
  const [deleteInput,       setDeleteInput]       = useState("");
  const [deleting,          setDeleting]          = useState(false);
  const [deleteReport,      setDeleteReport]      = useState(null);

  const flash = (text, ok = true) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 4000);
  };

  const exportJSON = () => {
    const blob = new Blob(
      [JSON.stringify(
        { ...allData, _meta: { ts: Date.now(), version: "1.0", app: "PsychoCore" } },
        null, 2
      )],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a   = document.createElement("a");
    a.href     = url;
    a.download = `psychocore-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    flash("Backup descargado correctamente");
  };

  const exportCSV = () => {
    if (!patients?.length) { flash("No hay pacientes para exportar", false); return; }
    const headers = [
      "Nombre", "Edad", "Teléfono", "Email", "Diagnóstico",
      "CIE-11", "Motivo de consulta", "Estatus", "Tipo", "Notas", "Fecha de registro",
    ];
    const rows = patients.map(p => [
      p.name || "", p.age || "", p.phone || "", p.email || "", p.diagnosis || "",
      p.cie11Code || "", (p.reason || "").replace(/,/g, ";"),
      p.status || "activo", p.type || "individual",
      (p.notes || "").replace(/,/g, ";"), p.createdAt || "",
    ]);
    const csv  = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `psychocore-pacientes-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    flash(`${patients.length} pacientes exportados como CSV`);
  };

  const importJSON = () => {
    const input    = document.createElement("input");
    input.type     = "file";
    input.accept   = ".json";
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      setImporting(true);
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!data.patients && !data.sessions && !data.appointments) {
          flash("El archivo no parece ser un backup válido de PsychoCore", false);
          return;
        }
        onRestore(data);
        flash(
          `Datos restaurados correctamente${
            data.patients?.length ? ` · ${data.patients.length} pacientes` : ""
          }`
        );
      } catch {
        flash("Error al leer el archivo. Verifica que sea un JSON válido.", false);
      } finally {
        setImporting(false);
      }
    };
    input.click();
  };

  const deleteAccount = async () => {
    if (deleteInput !== "ELIMINAR") return;
    setDeleting(true);
    const clearLocal = () => {
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith("pc_") || k.startsWith("sb-")) localStorage.removeItem(k);
      });
    };
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      const report = {
        pacientes:    allData?.patients?.length        || 0,
        citas:        allData?.appointments?.length    || 0,
        sesiones:     allData?.sessions?.length        || 0,
        pagos:        allData?.payments?.length        || 0,
        evaluaciones: allData?.riskAssessments?.length || 0,
        escalas:      allData?.scaleResults?.length    || 0,
        planes:       allData?.treatmentPlans?.length  || 0,
        contactos:    allData?.interSessions?.length   || 0,
        medicamentos: allData?.medications?.length     || 0,
        servicios:    allData?.services?.length        || 0,
      };
      if (uid) {
        const tables = [
          "pc_patients", "pc_appointments", "pc_sessions", "pc_payments",
          "pc_profile", "pc_risk_assessments", "pc_scale_results",
          "pc_treatment_plans", "pc_inter_sessions", "pc_medications", "pc_services",
        ];
        await Promise.allSettled(
          tables.map(t => supabase.from(t).delete().eq("psychologist_id", uid))
        );
        await supabase.auth.signOut();
      }
      clearLocal();
      setDeleting(false);
      setShowDelete(false);
      setDeleteReport(report);
    } catch {
      clearLocal();
      window.location.href = window.location.origin;
    }
  };

  const statItems = [
    { label: "Pacientes",    val: allData?.patients?.length        || 0, icon: "🧑‍⚕️" },
    { label: "Sesiones",     val: allData?.sessions?.length        || 0, icon: "📝"   },
    { label: "Citas",        val: allData?.appointments?.length    || 0, icon: "📅"   },
    { label: "Pagos",        val: allData?.payments?.length        || 0, icon: "💰"   },
    { label: "Evaluaciones", val: allData?.riskAssessments?.length || 0, icon: "⚠️"   },
    { label: "Planes",       val: allData?.treatmentPlans?.length  || 0, icon: "📋"   },
  ];

  return {
    msg, flash,
    importing,
    showDelete,        setShowDelete,
    showBackupWarning, setShowBackupWarning,
    deleteInput,       setDeleteInput,
    deleting,
    deleteReport,
    exportJSON, exportCSV, importJSON, deleteAccount,
    statItems,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// useAppearanceTab
// ─────────────────────────────────────────────────────────────────────────────
export function useAppearanceTab({ setPatients }) {
  const [csvMsg, setCsvMsg] = useState(null);

  const flashCsv = (text, ok = true) => {
    setCsvMsg({ text, ok });
    setTimeout(() => setCsvMsg(null), 4000);
  };

  const handleCSV = () => {
    const input   = document.createElement("input");
    input.type    = "file";
    input.accept  = ".csv";
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text  = await file.text();
        const lines = text.trim().split(/\r?\n/);
        const { patients, error } = parseCSVPatients(lines);
        if (error) { flashCsv(error, false); return; }
        setPatients(prev => [...prev, ...patients]);
        flashCsv(
          `${patients.length} paciente${patients.length !== 1 ? "s" : ""} importado${
            patients.length !== 1 ? "s" : ""
          } correctamente`
        );
      } catch {
        flashCsv("Error al leer el archivo CSV", false);
      }
    };
    input.click();
  };

  return { csvMsg, handleCSV };
}

// ─────────────────────────────────────────────────────────────────────────────
// useSettings (hook raíz)
// ─────────────────────────────────────────────────────────────────────────────
export function useSettings({ initialTab = "__index__" } = {}) {
  const [tab, setTab] = useState(initialTab || "__index__");

  const TABS = [
    { id: "profile",    label: "Perfil"     },
    { id: "horario",    label: "Horario"    },
    { id: "services",   label: "Servicios"  },
    { id: "appearance", label: "Apariencia" },
    { id: "data",       label: "Datos"      },
    { id: "help",       label: "Ayuda"      },
  ];

  return { tab, setTab, TABS };
}
