// ─────────────────────────────────────────────────────────────────────────────
// useFinance.js
// Hook central del módulo Finance.
// Contiene: estado, efectos, handlers, lógica de filtros y cálculos de KPIs.
// Sin JSX. Sin imports de UI.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useMemo, useEffect } from "react";
import html2canvas from "html2canvas";
import { T } from "../../theme.js";
import { uid, todayDate, fmt, fmtDate, fmtCur as fmtCurBase } from "../../utils.js";
import { emit } from "../../lib/eventBus.js";
import { useAppState } from "../../context/AppStateContext.jsx";
import { useIsMobile } from "../../hooks/useIsMobile.js";
import { useIsWide }   from "../../hooks/useIsWide.js";
import {
  MONTHS_LIST,
  EXPENSE_CATS,
  nextFolio,
  filterByRange,
  getPeriodRange,
  getPrevPeriodRange,
  fmtCur as fmtCurLocal,
  buildReciboHtml,
  exportCSV,
} from "./finance.utils.js";

// ─────────────────────────────────────────────────────────────────────────────
// SHARE: RECIBO COMO IMAGEN (WhatsApp / Compartir)
// FIX D1: función pura sin side effects de UI — el feedback lo maneja
//         handleShareRecibo() vía emit.toast + shareError state
// ─────────────────────────────────────────────────────────────────────────────
async function shareRecibo(payment, patient, profile) {
  const folio       = payment.folio || "—";
  const nombre      = patient?.name || payment.patientName || "Paciente";
  const fecha       = new Date(payment.date + "T12:00").toLocaleDateString("es-MX", { day:"numeric", month:"long", year:"numeric" });
  const monto       = Number(payment.status === "parcial" ? (payment.amountPaid||0) : payment.amount);
  const montFmt     = "$" + monto.toLocaleString("es-MX", { minimumFractionDigits:2 });
  const terapeuta   = profile?.name || "Terapeuta";
  const clinica     = profile?.clinic || "PsychoCore";
  const cedula      = profile?.cedula ? `Céd. ${profile.cedula}` : "";
  const statusLabel = payment.status === "pagado" ? "✓ PAGADO" : payment.status === "parcial" ? "PAGO PARCIAL" : "PENDIENTE";
  const statusBg    = payment.status === "pagado" ? T.suc : payment.status === "parcial" ? T.war : T.err;

  const wrap = document.createElement("div");
  wrap.style.cssText = "position:fixed;left:-9999px;top:-9999px;z-index:-1;";
  wrap.innerHTML = `
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
    <div id="recibo-dom" style="width:500px;background:#fff;border-radius:0;overflow:hidden;font-family:'Plus Jakarta Sans',sans-serif;box-shadow:none;">
      <div style="background:#3A6B6E;padding:20px 24px 18px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;">
          <div>
            <div style="font-size:15px;font-weight:800;color:#fff;line-height:1.3;">${clinica}</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:3px;">${cedula}</div>
          </div>
          <div style="background:rgba(255,255,255,0.13);border-radius:8px;padding:7px 14px;text-align:center;min-width:120px;">
            <div style="font-size:8px;font-weight:700;color:rgba(255,255,255,0.55);letter-spacing:0.1em;margin-bottom:3px;">FOLIO</div>
            <div style="font-size:12px;font-weight:700;color:#fff;font-family:monospace;">${folio}</div>
          </div>
        </div>
        <div style="border-top:1px solid rgba(255,255,255,0.15);margin-bottom:14px;"></div>
        <div style="display:flex;justify-content:space-between;align-items:flex-end;">
          <div>
            <div style="font-size:8px;font-weight:700;color:rgba(255,255,255,0.55);letter-spacing:0.1em;margin-bottom:6px;">
              ${payment.status === "parcial" ? "MONTO PAGADO" : "IMPORTE TOTAL"}
            </div>
            <div style="font-size:38px;font-weight:800;color:#fff;line-height:1;letter-spacing:-0.5px;">${montFmt}</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:5px;">MXN · ${payment.method || ""}</div>
            ${payment.status === "parcial" ? `<div style="font-size:11px;font-weight:700;color:rgba(255,180,180,0.9);margin-top:4px;">Saldo: $${Math.max(0,Number(payment.amount)-Number(payment.amountPaid||0)).toLocaleString("es-MX",{minimumFractionDigits:2})} MXN</div>` : ""}
          </div>
          <div style="background:${statusBg};border-radius:20px;padding:6px 14px;font-size:11px;font-weight:700;color:#fff;letter-spacing:0.05em;">${statusLabel}</div>
        </div>
      </div>
      <div style="padding:16px;display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        ${[["PACIENTE",nombre],["FECHA",fecha],["CONCEPTO",payment.concept||"Sesión"],["TERAPEUTA",terapeuta,cedula]].map(([label,value,sub])=>`
          <div style="background:#F7F9F8;border-radius:10px;padding:12px 14px;">
            <div style="font-size:8px;font-weight:700;color:#9BAFAD;letter-spacing:0.09em;margin-bottom:5px;">${label}</div>
            <div style="font-size:13px;font-weight:700;color:#1A2B28;line-height:1.3;">${value}</div>
            ${sub?`<div style="font-size:10px;color:#9BAFAD;margin-top:3px;">${sub}</div>`:""}`).join("")}
      </div>
      <div style="border-top:1px solid #EEF2F1;margin:0 16px;padding:12px 0 16px;text-align:center;">
        <div style="font-size:9px;color:#B0BFC0;line-height:1.6;">Este recibo ampara el pago de servicios psicológicos. No es comprobante fiscal (CFDI).</div>
        <div style="font-size:9px;color:#D0DCDA;margin-top:4px;">PsychoCore · Folio ${folio} · Documento confidencial</div>
      </div>
    </div>`;

  document.body.appendChild(wrap);
  await document.fonts.ready;
  const node   = wrap.querySelector("#recibo-dom");
  const canvas = await html2canvas(node, { scale:2, useCORS:true, backgroundColor:"#ffffff", logging:false });
  document.body.removeChild(wrap);

  await new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      try {
        const fname = `Recibo_${folio}_${nombre.split(" ")[0]}.png`;
        const file  = new File([blob], fname, { type:"image/png" });
        if (navigator.canShare?.({ files:[file] })) {
          try { await navigator.share({ files:[file], title:`Recibo ${folio} — ${nombre}` }); resolve(); return; }
          catch (e) { if (e.name === "AbortError") { resolve(); return; } }
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = fname; a.click();
        URL.revokeObjectURL(url);
        resolve();
      } catch (err) {
        reject(err);
      }
    }, "image/png");
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// useFinance
// ─────────────────────────────────────────────────────────────────────────────
export function useFinance({
  payments, setPayments,
  patients,
  profile,
  autoOpen,
  openCobroId,
  services,
  expenses, setExpenses,
  appointments,
}) {
  const fmtCur = (n) => fmtCurBase(n, profile?.currency || "MXN");
  const { activePatientContext, setActivePatientContext } = useAppState();
  const isMobile = useIsMobile();
  const isWide   = useIsWide();

  // ── Tabs ──────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("ingresos");

  // ── Ingresos: estado ──────────────────────────────────────────────────────
  const [showAdd,            setShowAdd]            = useState(false);
  const [cobroFromPending,   setCobroFromPending]   = useState(null);
  const [filterPt,           setFilterPt]           = useState("");
  const [editPayment,        setEditPayment]        = useState(null);
  const [savedPayment,       setSavedPayment]       = useState(null);
  const [filterStatus,       setFilterStatus]       = useState("");
  const now = new Date();
  const [filterYear,         setFilterYear]         = useState(String(now.getFullYear()));
  const [filterMonth,        setFilterMonth]        = useState(String(now.getMonth() + 1));
  const [filterDay,          setFilterDay]          = useState("");
  const [form, setForm] = useState({
    patientId:"", date:fmt(todayDate), amount:"", concept:"",
    serviceId:"", modality:"", method:"Transferencia", status:"pagado",
  });
  const fld = k => v => setForm(f => ({ ...f, [k]: v }));
  const [showModalityPicker, setShowModalityPicker] = useState(false);
  const [seededPatientFilter,setSeededPatientFilter]= useState(false);

  // FIX D1: estado de loading para shareRecibo — evita doble tap y da feedback visual
  const [reciboLoading, setReciboLoading] = useState(false);
  const [shareError,    setShareError]    = useState(false);

  // ── Gastos: estado ────────────────────────────────────────────────────────
  const emptyExpForm = () => ({ date:fmt(todayDate), concept:"", amount:"", category:EXPENSE_CATS[0], notes:"" });
  const [showAddExp, setShowAddExp] = useState(false);
  const [editExp,    setEditExp]    = useState(null);
  const [expForm,    setExpForm]    = useState(emptyExpForm());
  const efld = k => v => setExpForm(f => ({ ...f, [k]: v }));

  // ── Reportes: estado ──────────────────────────────────────────────────────
  const [activeReport,   setActiveReport]   = useState("r1");
  const [report1Period,  setReport1Period]  = useState("mes_actual");
  const [report2Group,   setReport2Group]   = useState("paciente");
  const [report3Period,  setReport3Period]  = useState("mes_actual");

  // ── Feedback inline generación de PDF ────────────────────────────────────
  const [pdfMsg, setPdfMsg] = useState(null);
  const showPdfMsg = (type) => {
    const text = type === "success"
      ? "Recibo abierto en nueva pestaña."
      : "Permite ventanas emergentes en tu navegador para exportar el PDF.";
    setPdfMsg({ type, text });
    setTimeout(() => setPdfMsg(null), type === "success" ? 3000 : 5000);
  };

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (activePatientContext?.patientId && !seededPatientFilter && !filterPt) {
      setFilterPt(activePatientContext.patientId);
      setSeededPatientFilter(true);
    }
  }, [activePatientContext?.patientId, seededPatientFilter, filterPt]);

  useEffect(() => { if (autoOpen === "add") setShowAdd(true); }, [autoOpen]);

  useEffect(() => {
    if (!showAdd || !activePatientContext?.patientId) return;
    setForm(f => f.patientId ? f : { ...f, patientId: activePatientContext.patientId });
  }, [showAdd, activePatientContext?.patientId]);

  // FIX D3: detectar openCobroId y abrir modal de edición automáticamente
  useEffect(() => {
    if (!openCobroId || !payments.length) return;
    const payment = payments.find(p => p.id === openCobroId);
    if (payment) {
      setActiveTab("ingresos");
      setEditPayment({ ...payment });
    }
  }, [openCobroId, payments]);

  // ── FIX D1: wrapper con loading + toast + shareError ──────────────────────
  const handleShareRecibo = async (payment, patient) => {
    if (reciboLoading) return;
    setReciboLoading(true);
    try {
      await shareRecibo(payment, patient, profile);
      emit.toast("Recibo generado con éxito", "success", 3500);
    } catch (err) {
      
      emit.toast("Error al generar el recibo", "error", 4000);
      setShareError(true);
      setTimeout(() => setShareError(false), 4000);
    } finally {
      setReciboLoading(false);
    }
  };

  // ── Ingresos: lógica de conceptos y modalidad ─────────────────────────────
  const SERVICE_TYPES_LABEL = {
    sesion:"Sesión individual", evaluacion:"Evaluación neuropsicológica",
    pareja:"Terapia de pareja", grupo:"Grupo / Taller", paquete:"Paquete de sesiones", otro:"Otro",
  };

  const conceptOptions = services.length > 0
    ? [
        ...services.map(s => ({
          value: s.id,
          label: s.type === "paquete" ? `${s.name} (${s.sessions} ses)` : s.name || SERVICE_TYPES_LABEL[s.type] || s.type,
          svc: s,
        })),
        { value:"__otro__", label:"Otro", svc:null },
      ]
    : ["Sesión individual","Evaluación neuropsicológica","Primera consulta (90 min)","Pareja / Familia","Taller / Grupo","Otro"]
        .map(c => ({ value:c, label:c, svc:null }));

  // Helper: obtiene el precio del catálogo centralizado con fallback a campos legacy
  const getSvcPrice = (svc, mod) => {
    const currency = profile?.currency || "MXN";
    const fromCatalog = svc?.prices?.[currency]?.[mod];
    if (fromCatalog != null) return fromCatalog;
    return mod === "virtual" ? (svc?.priceVirtual ?? 0) : (svc?.price ?? 0);
  };

  const handleConceptChange = (val) => {
    if (!services.length || val === "__otro__") {
      setForm(f => ({ ...f, concept:val==="__otro__"?"Otro":val, serviceId:"", modality:"", amount:"" }));
      return;
    }
    const opt = conceptOptions.find(o => o.value === val);
    const svc = opt?.svc;
    if (!svc) { setForm(f => ({ ...f, concept:val, serviceId:"", modality:"", amount:"" })); return; }
    if (svc.modality === "ambas") {
      setForm(f => ({ ...f, concept:opt.label, serviceId:svc.id, modality:"", amount:"" }));
      setShowModalityPicker(true);
    } else {
      const price = getSvcPrice(svc, svc.modality === "virtual" ? "virtual" : "presencial");
      setForm(f => ({ ...f, concept:opt.label, serviceId:svc.id, modality:svc.modality, amount:String(price||"") }));
    }
  };

  const applyModality = (mod) => {
    const svc = services.find(s => s.id === form.serviceId);
    if (!svc) return;
    const price = getSvcPrice(svc, mod);
    setForm(f => ({ ...f, modality:mod, amount:String(price||"") }));
    setShowModalityPicker(false);
  };

  // ── Filtros y cálculos ────────────────────────────────────────────────────
  const availableYears = useMemo(() => {
    const ys = new Set([String(new Date().getFullYear())]);
    payments.forEach(p => { if (p.date) ys.add(p.date.slice(0,4)); });
    return [...ys].sort().reverse();
  }, [payments]);

  const filtered = useMemo(() => {
    const mm = filterMonth ? String(filterMonth).padStart(2,"0") : null;
    const dd = filterDay   ? String(filterDay).padStart(2,"0")   : null;
    const prefix = filterYear + (mm?`-${mm}`:"") + (mm&&dd?`-${dd}`:"");
    return payments
      .filter(p =>
        (!filterPt     || p.patientId === filterPt) &&
        (!filterStatus || p.status    === filterStatus) &&
        p.date.startsWith(prefix)
      )
      .sort((a,b) => b.date.localeCompare(a.date));
  }, [payments, filterPt, filterStatus, filterYear, filterMonth, filterDay]);

  const monthStr    = fmt(todayDate).slice(0,7);
  const monthIncome = payments.filter(p => p.status==="pagado" && p.date.startsWith(monthStr)).reduce((s,p) => s+Number(p.amount),0);
  const totalPaid   = filtered.filter(p => p.status==="pagado").reduce((s,p) => s+Number(p.amount),0);
  const totalPend   = filtered.filter(p => p.status==="pendiente").reduce((s,p) => s+Number(p.amount),0);

  // ── CRUD pagos ────────────────────────────────────────────────────────────
  const save = () => {
    if (!form.patientId || !form.amount) return;
    const pt    = patients.find(p => p.id === form.patientId);
    const folio = nextFolio(payments);
    setPayments(prev => [...prev, { ...form, id:"pay"+uid(), patientName:pt?.name||"", folio }]);
    setForm({ patientId:"", date:fmt(todayDate), amount:"", concept:"", serviceId:"", modality:"", method:"Transferencia", status:"pagado" });
    setShowModalityPicker(false);
    setCobroFromPending(null);
    setShowAdd(false);
  };

  const del = id => setPayments(prev => prev.filter(p => p.id !== id));

  const updatePayment = (updated) => {
    setPayments(prev => prev.map(p => p.id===updated.id ? updated : p));
    setEditPayment(null);
    setSavedPayment(updated);
  };

  const toggle = id => setPayments(prev =>
    prev.map(p => p.id===id ? { ...p, status:p.status==="pagado"?"pendiente":"pagado" } : p)
  );

  const openCobroFromPending = (p) => {
    setCobroFromPending(p);
    const patient = patients.find(pt => pt.id === p.patientId);
    if (patient) setActivePatientContext({ patientId: patient.id, patientName: patient.name || "", source: "finance", updatedAt: new Date().toISOString() });
    setForm(f => ({ ...f, patientId: p.patientId, concept: p.concept || "", date: fmt(todayDate), amount: p.amount ? String(p.amount) : "", status: "pagado" }));
    setShowAdd(true);
  };

  // ── KPI stats para la vista ───────────────────────────────────────────────
  const { TrendingUp, CheckCircle, AlertCircle } = {}; // iconos se pasan desde Finance.jsx
  const stats = [
    { label:"Este mes",   value:fmtCur(monthIncome), colorKey:"suc", bgKey:"sucA", filterKey:""          },
    { label:"Cobrado",    value:fmtCur(totalPaid),   colorKey:"p",   bgKey:"pA",   filterKey:"pagado"    },
    { label:"Por cobrar", value:fmtCur(totalPend),   colorKey:"war", bgKey:"warA", filterKey:"pendiente" },
  ];

  // ── Gastos: lógica ────────────────────────────────────────────────────────
  const yearStr     = fmt(todayDate).slice(0,4);
  const expMonthKpi = expenses.filter(e => e.date.startsWith(monthStr)).reduce((s,e) => s+Number(e.amount),0);
  const expYearKpi  = expenses.filter(e => e.date.startsWith(yearStr)).reduce((s,e) => s+Number(e.amount),0);
  const sortedExp   = useMemo(() => [...expenses].sort((a,b) => b.date.localeCompare(a.date)), [expenses]);

  const saveExpense = () => {
    if (!expForm.concept || !expForm.amount) return;
    if (editExp) {
      setExpenses?.(prev => prev.map(e => e.id===editExp.id ? {...e,...expForm} : e));
      setEditExp(null);
    } else {
      setExpenses?.(prev => [...prev, { ...expForm, id:"exp"+uid() }]);
    }
    setExpForm(emptyExpForm());
    setShowAddExp(false);
  };

  const delExpense = id => {
    if (window.confirm("¿Eliminar este gasto? No se puede deshacer."))
      setExpenses?.(prev => prev.filter(e => e.id !== id));
  };

  const openEditExp = (e) => {
    setExpForm({ date:e.date, concept:e.concept, amount:String(e.amount), category:e.category, notes:e.notes||"" });
    setEditExp(e);
    setShowAddExp(true);
  };

  // ── Reportes: datos en vivo ───────────────────────────────────────────────
  const r1 = useMemo(() => {
    const range = getPeriodRange(report1Period, MONTHS_LIST);
    const prev  = getPrevPeriodRange(report1Period);
    const paid  = payments.filter(p => p.status==="pagado");
    const curr  = filterByRange(paid, "date", range.start, range.end);
    const prevP = filterByRange(paid, "date", prev.start, prev.end);
    const total     = curr.reduce((s,p) => s+Number(p.amount), 0);
    const totalPrev = prevP.reduce((s,p) => s+Number(p.amount), 0);
    const pct = totalPrev>0 ? ((total-totalPrev)/totalPrev*100).toFixed(1) : null;
    const byDay = {};
    curr.forEach(p => { byDay[p.date]=(byDay[p.date]||0)+Number(p.amount); });
    const days = Object.entries(byDay).sort(([a],[b]) => a.localeCompare(b));
    return { total, pct, days, count:curr.length, range };
  }, [payments, report1Period]);

  const r2 = useMemo(() => {
    const paid = payments.filter(p => p.status==="pagado" && p.date.startsWith(yearStr));
    const totalYear = paid.reduce((s,p) => s+Number(p.amount), 0);
    const map = {};
    paid.forEach(p => {
      const key   = report2Group==="paciente" ? (p.patientId||p.patientName||"?") : (p.concept||"Sin concepto");
      const label = report2Group==="paciente"
        ? (patients.find(pt => pt.id===p.patientId)?.name || p.patientName || "Sin nombre")
        : (p.concept||"Sin concepto");
      if (!map[key]) map[key]={ label, total:0 };
      map[key].total += Number(p.amount);
    });
    return { ranking:Object.values(map).sort((a,b)=>b.total-a.total).slice(0,10), totalYear };
  }, [payments, report2Group, patients, yearStr]);

  const r3 = useMemo(() => {
    const range  = getPeriodRange(report3Period, MONTHS_LIST);
    const paid   = filterByRange(payments.filter(p => p.status==="pagado"), "date", range.start, range.end);
    const exps   = filterByRange(expenses, "date", range.start, range.end);
    const totalI = paid.reduce((s,p) => s+Number(p.amount), 0);
    const totalG = exps.reduce((s,e) => s+Number(e.amount), 0);
    const util   = totalI - totalG;
    const margen = totalI>0 ? (util/totalI*100).toFixed(1) : "0.0";
    const byCat  = {};
    exps.forEach(e => { byCat[e.category]=(byCat[e.category]||0)+Number(e.amount); });
    return { totalI, totalG, util, margen, byCat, range, hasExpenses:expenses.length>0 };
  }, [payments, expenses, report3Period]);

  const r4 = useMemo(() => {
    const today = new Date().toISOString().slice(0,10);
    const pad   = (n) => String(n).padStart(2,"0");
    const iso   = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    const d7    = iso(new Date(Date.now()+7*86400000));
    const d15   = iso(new Date(Date.now()+15*86400000));
    const d30   = iso(new Date(Date.now()+30*86400000));
    const CANCELLED = ["cancelada_paciente","cancelada_psicologa"];
    const future = appointments.filter(a => a.date>today && !CANCELLED.includes(a.status));
    function est(appt) {
      const pt  = patients.find(p => p.id===appt.patientId);
      const svc = services.find(s => s.id===(pt?.defaultServiceId||appt.serviceId)) || services[0];
      if (!svc) return 0;
      const currency = profile?.currency || "MXN";
      const mod = appt.modality === "virtual" ? "virtual" : "presencial";
      // Leer del catálogo centralizado primero, fallback a campos legacy
      const fromCatalog = svc.prices?.[currency]?.[mod];
      if (fromCatalog != null) return Number(fromCatalog) || 0;
      return Number(svc.modality==="virtual" ? (svc.priceVirtual||svc.price) : svc.price) || 0;
    }
    const f7   = future.filter(a => a.date>=today && a.date<=d7);
    const f15  = future.filter(a => a.date>=today && a.date<=d15);
    const f30  = future.filter(a => a.date>=today && a.date<=d30);
    const sum7  = f7.reduce((s,a)=>s+est(a),0);
    const sum15 = f15.reduce((s,a)=>s+est(a),0);
    const sum30 = f30.reduce((s,a)=>s+est(a),0);
    return { f7, f15, f30, sum7, sum15, sum30, est };
  }, [appointments, patients, services]);

  // ─────────────────────────────────────────────────────────────────────────
  return {
    // responsive
    isMobile, isWide,
    // context
    activePatientContext,
    // tabs
    activeTab, setActiveTab,
    // ingresos — estado
    showAdd, setShowAdd,
    cobroFromPending, setCobroFromPending,
    filterPt, setFilterPt,
    editPayment, setEditPayment,
    savedPayment, setSavedPayment,
    filterStatus, setFilterStatus,
    filterYear, setFilterYear,
    filterMonth, setFilterMonth,
    filterDay, setFilterDay,
    form, fld, setForm,
    showModalityPicker, setShowModalityPicker,
    // recibo
    reciboLoading, shareError,
    handleShareRecibo,
    // ingresos — lógica
    conceptOptions,
    handleConceptChange,
    applyModality,
    availableYears,
    filtered,
    monthIncome, totalPaid, totalPend,
    monthStr, yearStr,
    stats,
    save, del, updatePayment, toggle,
    openCobroFromPending,
    // gastos — estado
    showAddExp, setShowAddExp,
    editExp, setEditExp,
    expForm, efld, setExpForm,
    emptyExpForm,
    // gastos — lógica
    expMonthKpi, expYearKpi, sortedExp,
    saveExpense, delExpense, openEditExp,
    // reportes — estado
    activeReport, setActiveReport,
    report1Period, setReport1Period,
    report2Group,  setReport2Group,
    report3Period, setReport3Period,
    pdfMsg, showPdfMsg,
    // reportes — datos
    r1, r2, r3, r4,
  };
}
