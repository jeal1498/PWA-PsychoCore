// ── useSettings.js ───────────────────────────────────────────────────────────
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
  const [saved,           setSaved]           = useState(false);
  const [avatarPreview,   setAvatarPreview]   = useState(profile?.avatarUrl || null);

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
// useScheduleTab
// ─────────────────────────────────────────────────────────────────────────────
export function useScheduleTab({ profile, setProfile }) {
  const [form, setForm] = useState(() => ({
    workingDays:  profile?.workingDays  ?? [1, 2, 3, 4, 5],
    workingStart: profile?.workingStart ?? "09:00",
    workingEnd:   profile?.workingEnd   ?? "19:00",
  }));
  const [saved,            setSaved]            = useState(false);
  const [showGranularWarn, setShowGranularWarn] = useState(false);

  // Detecta si el perfil tiene horario granular (por día) configurado desde el onboarding
  const hasGranularSchedule = (() => {
    const s = profile?.schedule;
    if (!s) return false;
    const intervals = Object.values(s).flat();
    // Hay horario granular si algún día tiene intervalos distintos entre sí
    const unique = new Set(intervals.map(iv => `${iv.start}-${iv.end}`));
    return unique.size > 1;
  })();

  const toggleDay = (d) => {
    setForm(f => {
      const days = f.workingDays.includes(d)
        ? f.workingDays.filter(x => x !== d)
        : [...f.workingDays, d].sort((a, b) => a - b);
      return { ...f, workingDays: days };
    });
  };

  const setStart = (v) => setForm(f => ({ ...f, workingStart: v }));
  const setEnd   = (v) => setForm(f => ({ ...f, workingEnd: v }));

  const doSave = () => {
    const DAY_NUM_TO_KEY = { 1:"L", 2:"M", 3:"Mi", 4:"J", 5:"V", 6:"S", 0:"D" };
    // Reconstruir activeDays y schedule globales a partir de workingDays/workingStart/workingEnd
    const newActiveDays = { L:false, M:false, Mi:false, J:false, V:false, S:false, D:false };
    const newSchedule   = {};
    form.workingDays.forEach(d => {
      const k = DAY_NUM_TO_KEY[d];
      if (k) {
        newActiveDays[k] = true;
        newSchedule[k]   = [{ start: form.workingStart, end: form.workingEnd }];
      }
    });
    setProfile(p => ({
      ...p,
      ...form,
      activeDays: newActiveDays,
      schedule:   { ...p.schedule, ...newSchedule },
    }));
    setSaved(true);
    setShowGranularWarn(false);
    setTimeout(() => setSaved(false), 2500);
  };

  const save = () => {
    if (hasGranularSchedule) {
      setShowGranularWarn(true);
    } else {
      doSave();
    }
  };

  const isValid =
    form.workingDays.length > 0 && form.workingStart < form.workingEnd;

  return {
    form, toggleDay, setStart, setEnd, save, doSave, saved, isValid,
    hasGranularSchedule, showGranularWarn, setShowGranularWarn,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// useServicesTab
// ─────────────────────────────────────────────────────────────────────────────
export function useServicesTab({ services, setServices }) {
  const today = todayISO();

  const sesionSvc  = services.find(s => s.type === "sesion");
  const basePrice  = sesionSvc?.price        || 900;
  const basePriceV = sesionSvc?.priceVirtual || null;

  const BLANK_FORM = {
    name: "Sesión de psicoterapia individual de 50 minutos",
    price: "", priceVirtual: "",
    type: "sesion", sessions: "", modality: "presencial",
  };

  const [form,        setForm]        = useState(BLANK_FORM);
  const [pkgPrices,   setPkgPrices]   = useState(() => calcPkgPrices(basePrice, basePriceV).row);
  const [pkgPricesV,  setPkgPricesV]  = useState(() => calcPkgPrices(basePrice, basePriceV).rowV);
  const [editingPrice, setEditingPrice] = useState(null); // { svcId, newPrice, newPriceVirtual, from }

  // Auto-actualizar precios de paquetes cuando cambia la sesión individual
  useEffect(() => {
    const fresh = calcPkgPrices(basePrice, basePriceV);
    setPkgPrices(fresh.row);
    setPkgPricesV(fresh.rowV);
  }, [basePrice, basePriceV]);

  const fld = k => v => setForm(f => ({ ...f, [k]: v }));

  const canAdd =
    (form.type === "paquete" || form.name.trim()) &&
    (form.price || form.priceVirtual);

  // Agregar o fusionar servicio
  const add = (overrides = {}) => {
    const f = { ...form, ...overrides };
    if (f.type !== "paquete" && !f.name.trim()) return;
    if (!f.price && !f.priceVirtual) return;
    const now = today;
    setServices(prev => {
      const dupIdx = prev.findIndex(
        s => s.type === f.type && s.name.trim() === f.name.trim()
      );
      if (dupIdx !== -1) {
        const existing = prev[dupIdx];
        const merged = {
          ...existing,
          modality: "ambas",
          price:        f.price        ? Number(f.price)        : existing.price,
          priceVirtual: f.priceVirtual ? Number(f.priceVirtual) : existing.priceVirtual,
          priceHistory: [
            ...(existing.priceHistory || []),
            {
              price:        f.price        ? Number(f.price)        : existing.price,
              priceVirtual: f.priceVirtual ? Number(f.priceVirtual) : existing.priceVirtual,
              from: now,
            },
          ],
        };
        const updated = [...prev];
        updated[dupIdx] = merged;
        return updated;
      }
      const effectivePrice = f.price || f.priceVirtual;
      return [
        ...prev,
        {
          id: "svc" + uid(),
          name: f.name.trim(),
          type: f.type,
          modality:
            f.price && f.priceVirtual ? "ambas"
              : f.priceVirtual ? "virtual"
              : "presencial",
          sessions:     f.type === "paquete" ? Number(f.sessions) : null,
          price:        Number(f.price) || 0,
          priceVirtual: f.priceVirtual ? Number(f.priceVirtual) : null,
          priceHistory: [{
            price:        Number(effectivePrice),
            priceVirtual: f.priceVirtual ? Number(f.priceVirtual) : null,
            from: now,
          }],
        },
      ];
    });
    setForm(BLANK_FORM);
  };

  const del = id => setServices(prev => prev.filter(s => s.id !== id));

  const applyPriceEdit = () => {
    if (!editingPrice) return;
    const { svcId, newPrice, newPriceVirtual, from } = editingPrice;
    setServices(prev =>
      prev.map(s => {
        if (s.id !== svcId) return s;
        return {
          ...s,
          price:        newPrice        !== undefined ? Number(newPrice)        : s.price,
          priceVirtual: newPriceVirtual !== undefined ? Number(newPriceVirtual) : s.priceVirtual,
          priceHistory: [
            ...(s.priceHistory || []),
            {
              price:        newPrice        !== undefined ? Number(newPrice)        : s.price,
              priceVirtual: newPriceVirtual !== undefined ? Number(newPriceVirtual) : s.priceVirtual,
              from,
            },
          ],
        };
      })
    );
    setEditingPrice(null);
  };

  // Guarda los paquetes sugeridos de una modalidad
  const savePkgRow = (modality) => {
    const now = today;
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
        const entry = {
          id: existing?.id || "svc" + uid(),
          name: d.label,
          type: "paquete",
          modality: mergedMod,
          sessions: d.sessions,
          price:        mergedP,
          priceVirtual: mergedV,
          priceHistory: existing
            ? [...(existing.priceHistory || []), { price: mergedP, priceVirtual: mergedV, from: now }]
            : [{ price: mergedP, priceVirtual: mergedV, from: now }],
        };
        if (dupIdx >= 0) updated[dupIdx] = entry;
        else updated = [...updated, entry];
      });
      return updated;
    });
  };

  const resetPkgPrices = () => {
    const fresh = calcPkgPrices(basePrice, basePriceV);
    setPkgPrices(fresh.row);
    setPkgPricesV(fresh.rowV);
  };

  return {
    form, fld, setForm,
    canAdd, add, del,
    pkgPrices, setPkgPrices,
    pkgPricesV, setPkgPricesV,
    editingPrice, setEditingPrice, applyPriceEdit,
    savePkgRow, resetPkgPrices,
    basePrice, basePriceV,
    today,
    BLANK_FORM,
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

  // ── Exportar JSON ────────────────────────────────────────────────────────
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

  // ── Exportar CSV ─────────────────────────────────────────────────────────
  const exportCSV = () => {
    if (!patients?.length) { flash("No hay pacientes para exportar", false); return; }
    const headers = [
      "Nombre", "Edad", "Teléfono", "Email", "Diagnóstico",
      "CIE-11", "Motivo de consulta", "Estatus", "Tipo", "Notas", "Fecha de registro",
    ];
    const rows = patients.map(p => [
      p.name || "",
      p.age   || "",
      p.phone || "",
      p.email || "",
      p.diagnosis || "",
      p.cie11Code  || "",
      (p.reason || "").replace(/,/g, ";"),
      p.status || "activo",
      p.type   || "individual",
      (p.notes || "").replace(/,/g, ";"),
      p.createdAt || "",
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

  // ── Importar JSON ────────────────────────────────────────────────────────
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

  // ── Eliminar cuenta ──────────────────────────────────────────────────────
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
// useSettings (hook raíz — gestiona solo el tab activo)
// ─────────────────────────────────────────────────────────────────────────────
export function useSettings({ initialTab = "profile" } = {}) {
  const [tab, setTab] = useState(initialTab || "profile");

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
