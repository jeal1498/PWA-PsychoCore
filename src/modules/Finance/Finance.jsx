import {
  DollarSign, Trash2, TrendingUp, AlertCircle, CheckCircle, Check,
  Plus, Printer, Share2, MessageCircle, TrendingDown, BarChart2,
  FileText, Pencil,
} from "lucide-react";
import { T } from "../../theme.js";
import { fmtDate, fmtCur } from "../../utils.js";
import { Card, Modal, Input, Select, Btn, EmptyState, PageHeader } from "../../components/ui/index.jsx";
import { useFinance } from "./useFinance.js";
import {
  MONTHS_LIST,
  EXPENSE_CATS,
  nextFolio,
  buildR1Html,
  buildR2Html,
  buildR3Html,
  buildR4Html,
  printReport,
} from "./finance.utils.js";

const WHITE = "#fff";

// ─────────────────────────────────────────────────────────────────────────────
// MAIN MODULE
// ─────────────────────────────────────────────────────────────────────────────
export default function Finance({
  payments = [], setPayments,
  patients = [],
  profile,
  autoOpen,
  // FIX D3: nueva prop para abrir modal de cobro específico desde Dashboard
  openCobroId,
  services = [],
  expenses = [], setExpenses,
  appointments = [],
}) {
  const {
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
    form, fld,
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
    save, del, updatePayment, toggle,
    openCobroFromPending,
    // gastos — estado
    showAddExp, setShowAddExp,
    editExp, setEditExp,
    expForm, efld,
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
  } = useFinance({
    payments, setPayments,
    patients,
    profile,
    autoOpen,
    openCobroId,
    services,
    expenses, setExpenses,
    appointments,
  });

  // ── UI constants ───────────────────────────────────────────────────────────
  const stats = [
    { label:"Este mes",   value:fmtCur(monthIncome), icon:TrendingUp,  color:T.suc, bg:T.sucA, filterKey:""          },
    { label:"Cobrado",    value:fmtCur(totalPaid),   icon:CheckCircle, color:T.p,   bg:T.pA,   filterKey:"pagado"    },
    { label:"Por cobrar", value:fmtCur(totalPend),   icon:AlertCircle, color:T.war, bg:T.warA, filterKey:"pendiente" },
  ];

  const tabAction = {
    ingresos: <Btn onClick={() => setShowAdd(true)}><Plus size={15}/> Registrar pago</Btn>,
    gastos:   <Btn onClick={() => { setExpForm(emptyExpForm()); setEditExp(null); setShowAddExp(true); }}><Plus size={15}/> Registrar gasto</Btn>,
    reportes: null,
  };

  const TABS = [
    { key:"ingresos", label:"Ingresos",  icon:DollarSign  },
    { key:"gastos",   label:"Gastos",    icon:TrendingDown },
    { key:"reportes", label:"Reportes",  icon:BarChart2   },
  ];

  const REPORTS = [
    { key:"r1", label:"Ingresos / Período" },
    { key:"r2", label:"Ranking"            },
    { key:"r3", label:"Balance"            },
    { key:"r4", label:"Proyección"         },
  ];

  const periodOptions = [
    { value:"mes_actual",   label:"Mes actual"   },
    { value:"mes_anterior", label:"Mes anterior" },
    { value:"anio_actual",  label:"Año actual"   },
  ];
  const periodOptionsWithWeek = [{ value:"semana_actual", label:"Semana actual" }, ...periodOptions];

  // ── Row renderers ──────────────────────────────────────────────────────────
  const paymentRow = (p) => {
    const patient = patients.find(pt => pt.id === p.patientId);
    return (
      <div key={p.id} style={{ display:"grid", gridTemplateColumns:"1fr 90px 100px 130px 110px 110px", gap:10, padding:"13px 20px", borderBottom:`1px solid ${T.bdrL}`, alignItems:"center" }}>
        <div>
          <div style={{ fontFamily:T.fB, fontSize:13.5, fontWeight:500, color:T.t }}>{p.patientName.split(" ").slice(0,2).join(" ")}</div>
          {p.folio && <div style={{ fontFamily:"monospace", fontSize:10, color:T.tl, marginTop:1 }}>{p.folio}</div>}
        </div>
        <span style={{ fontFamily:T.fB, fontSize:12.5, color:T.tm }}>{fmtDate(p.date)}</span>
        <span style={{ fontFamily:T.fH, fontSize:16, color:T.t, fontWeight:500 }}>{fmtCur(p.amount)}</span>
        <span style={{ fontFamily:T.fB, fontSize:12, color:T.tm }}>{p.concept}</span>
        <span style={{ fontFamily:T.fB, fontSize:12, color:T.tm }}>{p.method}</span>
        <div style={{ display:"flex", alignItems:"center", gap:5 }}>
          {p.status === "pendiente" && (
            <button
              onClick={() => openCobroFromPending(p)}
              style={{ background:T.p, border:"none", borderRadius:6, padding:"3px 9px", cursor:"pointer", fontSize:11, fontFamily:T.fB, color:WHITE, fontWeight:700, whiteSpace:"nowrap" }}>
              Cobrar
            </button>
          )}
          <button onClick={() => toggle(p.id)} style={{ background:p.status==="pagado"?T.sucA:T.warA, border:"none", borderRadius:6, padding:"3px 8px", cursor:"pointer", fontSize:11, fontFamily:T.fB, color:p.status==="pagado"?T.suc:T.war, fontWeight:600 }}>{p.status}</button>
          {/* FIX D1: onClick usa handleShareRecibo con loading + toast */}
          <button
            onClick={() => handleShareRecibo(p, patient)}
            disabled={reciboLoading}
            title="Generar recibo"
            style={{ background:T.pA, border:"none", borderRadius:6, padding:"4px 6px",
              cursor:reciboLoading ? "not-allowed" : "pointer", color:T.p,
              opacity:reciboLoading ? 0.55 : 1, transition:"opacity .15s" }}>
            {reciboLoading ? <span style={{ fontSize:11, fontFamily:T.fB }}>…</span> : <Printer size={12}/>}
          </button>
          {shareError && (
            <span style={{ fontSize:10, fontFamily:T.fB, color:T.err, whiteSpace:"nowrap" }}>Error al generar</span>
          )}
          <button onClick={() => del(p.id)} style={{ background:"none", border:"none", color:T.tl, cursor:"pointer", padding:"4px 2px" }}><Trash2 size={13}/></button>
        </div>
      </div>
    );
  };

  const mobileRow = (p) => (
    <div key={p.id}
      onClick={() => setEditPayment({ ...p })}
      style={{ padding:"14px 18px", borderBottom:`1px solid ${T.bdrL}`, cursor:"pointer", transition:"background .13s" }}
      onMouseEnter={e => e.currentTarget.style.background=T.cardAlt}
      onMouseLeave={e => e.currentTarget.style.background="transparent"}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:T.fB, fontSize:14, fontWeight:600, color:T.t, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
            {p.patientName.split(" ").slice(0,2).join(" ")}
          </div>
          <div style={{ fontFamily:T.fB, fontSize:11.5, color:T.tm, marginTop:1 }}>{fmtDate(p.date)} · {p.concept}</div>
        </div>
        <div style={{ fontFamily:T.fH, fontSize:20, fontWeight:500, color:T.t, flexShrink:0, marginLeft:12 }}>{fmtCur(p.amount)}</div>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        {p.folio && <span style={{ fontFamily:"monospace", fontSize:10, color:T.tl }}>{p.folio}</span>}
        {p.method && <span style={{ fontFamily:T.fB, fontSize:11, color:T.tl }}>{p.method}</span>}
        <span style={{ display:"inline-flex", alignItems:"center", gap:3, padding:"2px 8px", borderRadius:9999, fontSize:10, fontWeight:700, fontFamily:T.fB,
          background:p.status==="pagado"?T.sucA:T.warA, color:p.status==="pagado"?T.suc:T.war }}>
          {p.status==="pagado" ? <CheckCircle size={9}/> : <AlertCircle size={9}/>}
          {p.status}
        </span>
      </div>
    </div>
  );

  const expRow = (e) => (
    <div key={e.id} style={{ display:"grid", gridTemplateColumns:`${isMobile?"1fr":"1fr 90px 160px 100px 90px"}`, gap:10, padding:"12px 18px", borderBottom:`1px solid ${T.bdrL}`, alignItems:"center" }}>
      {isMobile ? (
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ fontFamily:T.fB, fontSize:13.5, fontWeight:500, color:T.t }}>{e.concept}</div>
            <div style={{ fontFamily:T.fB, fontSize:11, color:T.tm, marginTop:2 }}>{fmtDate(e.date)} · {e.category}</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0, marginLeft:12 }}>
            <div style={{ fontFamily:T.fH, fontSize:18, fontWeight:500, color:T.err }}>{fmtCur(e.amount)}</div>
            <button onClick={() => openEditExp(e)} style={{ background:"none", border:"none", color:T.tl, cursor:"pointer", padding:"4px 2px" }}><Pencil size={13}/></button>
            <button onClick={() => delExpense(e.id)} style={{ background:"none", border:"none", color:T.tl, cursor:"pointer", padding:"4px 2px" }}><Trash2 size={13}/></button>
          </div>
        </div>
      ) : (
        <>
          <div>
            <div style={{ fontFamily:T.fB, fontSize:13.5, fontWeight:500, color:T.t }}>{e.concept}</div>
            {e.notes && <div style={{ fontFamily:T.fB, fontSize:11, color:T.tl, marginTop:1 }}>{e.notes}</div>}
          </div>
          <span style={{ fontFamily:T.fB, fontSize:12.5, color:T.tm }}>{fmtDate(e.date)}</span>
          <span style={{ fontFamily:T.fB, fontSize:12, color:T.tm }}>{e.category}</span>
          <span style={{ fontFamily:T.fH, fontSize:16, color:T.err, fontWeight:500 }}>{fmtCur(e.amount)}</span>
          <div style={{ display:"flex", gap:5 }}>
            <button onClick={() => openEditExp(e)} style={{ background:T.pA, border:"none", borderRadius:6, padding:"4px 7px", cursor:"pointer", color:T.p }}><Pencil size={12}/></button>
            <button onClick={() => delExpense(e.id)} style={{ background:"none", border:"none", color:T.tl, cursor:"pointer", padding:"4px 2px" }}><Trash2 size={13}/></button>
          </div>
        </>
      )}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: isWide ? "none" : 960, paddingBottom: 40 }}>
      <PageHeader
        title="Finanzas"
        subtitle="Ingresos, gastos y reportes del consultorio"
        action={tabAction[activeTab]}
      />

      {(activePatientContext?.patientName || activeTab === "ingresos") && (
        <div style={{
          display:"grid",
          gridTemplateColumns:isMobile ? "1fr" : "1.4fr 1fr 1fr",
          gap:10,
          marginBottom:18,
        }}>
          <div style={{
            padding:"14px 16px",
            borderRadius:18,
            background:`linear-gradient(135deg, ${T.pA} 0%, rgba(196,137,90,0.08) 100%)`,
            border:`1px solid ${T.bdrL}`,
          }}>
            <div style={{ fontFamily:T.fB, fontSize:10.5, fontWeight:700, color:T.p, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:5 }}>
              Contexto activo
            </div>
            <div style={{ fontFamily:T.fH, fontSize:18, color:T.t, lineHeight:1.15, marginBottom:4 }}>
              {activePatientContext?.patientName || "Vista general"}
            </div>
            <div style={{ fontFamily:T.fB, fontSize:12.5, color:T.tl }}>
              Los filtros y el alta de cobro se mantienen prellenados cuando llegas desde un paciente.
            </div>
          </div>
          <div style={{ padding:"14px 16px", borderRadius:18, background:T.card, border:`1px solid ${T.bdrL}` }}>
            <div style={{ fontFamily:T.fB, fontSize:10.5, fontWeight:700, color:T.tl, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:5 }}>
              Este mes
            </div>
            <div style={{ fontFamily:T.fH, fontSize:20, color:T.suc, lineHeight:1.1 }}>{fmtCur(monthIncome)}</div>
            <div style={{ fontFamily:T.fB, fontSize:12, color:T.tl, marginTop:4 }}>Ingresos cobrados</div>
          </div>
          <div style={{ padding:"14px 16px", borderRadius:18, background:T.card, border:`1px solid ${T.bdrL}` }}>
            <div style={{ fontFamily:T.fB, fontSize:10.5, fontWeight:700, color:T.tl, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:5 }}>
              Pendiente
            </div>
            <div style={{ fontFamily:T.fH, fontSize:20, color:T.war, lineHeight:1.1 }}>{fmtCur(totalPend)}</div>
            <div style={{ fontFamily:T.fB, fontSize:12, color:T.tl, marginTop:4 }}>Cobros por resolver</div>
          </div>
        </div>
      )}

      {/* ── Tab bar ─────────────────────────────────────────────────────── */}
      <div style={{
        display:"grid",
        gridTemplateColumns:isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
        gap:8,
        marginBottom:18,
      }}>
        {TABS.map(t => {
          const active = activeTab === t.key;
          return (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"11px 16px",
                fontFamily:T.fB, fontSize:13, fontWeight:active?700:500,
                color:active?T.p:T.tm, background:active?T.pA:T.card,
                border:`1.5px solid ${active?T.p:T.bdrL}`,
                borderRadius:14, cursor:"pointer",
                boxShadow:active ? "0 8px 20px rgba(58,107,110,0.10)" : T.sh,
                transition:"all .15s" }}>
              <t.icon size={14}/>
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          TAB: INGRESOS
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "ingresos" && (
        <>
          {/* KPI Stats */}
          <div style={{ display:"grid", gridTemplateColumns:isMobile ? "1fr 1fr" : "repeat(3,1fr)", gap:10, marginBottom:20 }}>
            {stats.map(s => {
              const active = filterStatus === s.filterKey;
              return (
                <button key={s.label} onClick={() => setFilterStatus(active?"":s.filterKey)}
                  style={{ padding:"14px 14px", borderRadius:18, textAlign:"left", cursor:"pointer",
                    background:active?s.bg:T.card, border:`2px solid ${active?s.color+"60":T.bdrL}`,
                    boxShadow:active?`0 0 0 3px ${s.color}15`:T.sh, transition:"all .15s", minHeight:114 }}>
                  <div style={{ width:32, height:32, borderRadius:9, background:s.bg, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:8 }}>
                    <s.icon size={15} color={s.color} strokeWidth={1.7}/>
                  </div>
                  <div style={{ fontFamily:T.fH, fontSize:22, fontWeight:500, color:active?s.color:T.t, lineHeight:1, marginBottom:4 }}>{s.value}</div>
                  <div style={{ fontSize:10, fontWeight:600, color:active?s.color:T.tl, fontFamily:T.fB, letterSpacing:"0.05em", textTransform:"uppercase", whiteSpace:"nowrap" }}>{s.label}</div>
                </button>
              );
            })}
          </div>

          {/* Filtros */}
          <div style={{ marginBottom:8, padding:"14px", background:T.card, border:`1px solid ${T.bdrL}`, borderRadius:18, boxShadow:T.sh }}>
            <div style={{ display:"grid", gridTemplateColumns:isMobile ? "1fr" : "repeat(3, 1fr)", gap:8, marginBottom:8 }}>
              <select value={filterYear} onChange={e => { setFilterYear(e.target.value); setFilterMonth(""); setFilterDay(""); }}
                style={{ padding:"9px 10px", border:`1.5px solid ${T.bdr}`, borderRadius:10, fontFamily:T.fB, fontSize:13, color:T.t, background:T.card, cursor:"pointer", outline:"none" }}>
                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <select value={filterMonth} onChange={e => { setFilterMonth(e.target.value); setFilterDay(""); }}
                style={{ padding:"9px 10px", border:`1.5px solid ${filterMonth?T.p:T.bdr}`, borderRadius:10, fontFamily:T.fB, fontSize:13, color:filterMonth?T.p:T.t, fontWeight:filterMonth?600:400, background:filterMonth?T.pA:T.card, cursor:"pointer", outline:"none" }}>
                <option value="">Todo el año</option>
                {MONTHS_LIST.map((m,i) => <option key={i+1} value={String(i+1)}>{m}</option>)}
              </select>
              <select value={filterDay} onChange={e => setFilterDay(e.target.value)} disabled={!filterMonth}
                style={{ padding:"9px 10px", border:`1.5px solid ${filterDay?T.p:T.bdr}`, borderRadius:10, fontFamily:T.fB, fontSize:13,
                  color:filterDay?T.p:(filterMonth?T.t:T.tl), fontWeight:filterDay?600:400, background:filterDay?T.pA:T.card,
                  cursor:filterMonth?"pointer":"not-allowed", outline:"none", opacity:filterMonth?1:0.5 }}>
                <option value="">Día</option>
                {filterMonth && Array.from({ length: new Date(Number(filterYear),Number(filterMonth),0).getDate() },(_,i)=>i+1).map(d => (
                  <option key={d} value={String(d)}>{d}</option>
                ))}
              </select>
            </div>
            <select value={filterPt} onChange={e => setFilterPt(e.target.value)}
              style={{ width:"100%", padding:"9px 12px", border:`1.5px solid ${T.bdr}`, borderRadius:10, fontFamily:T.fB, fontSize:13, color:T.t, background:T.card, cursor:"pointer", outline:"none", boxSizing:"border-box" }}>
              <option value="">Todos los pacientes</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.name.split(" ").slice(0,2).join(" ")}</option>)}
            </select>
          </div>
          <div style={{ fontFamily:T.fB, fontSize:12, color:T.tl, marginBottom:12 }}>
            {filtered.length} registro{filtered.length!==1?"s":""} · {fmtCur(totalPaid)} cobrado
            {filterStatus && <span style={{ marginLeft:6, color:filterStatus==="pagado"?T.p:T.war, fontWeight:600 }}>· {filterStatus}</span>}
          </div>

          {/* Feedback inline generación PDF */}
          {pdfMsg && (
            <div style={{
              marginBottom: 12,
              padding: "10px 14px",
              borderRadius: 10,
              fontFamily: T.fB,
              fontSize: 13,
              background: pdfMsg.type === "success" ? T.sucA : T.warA,
              border: `1.5px solid ${pdfMsg.type === "success" ? T.suc : T.war}`,
              color: pdfMsg.type === "success" ? T.suc : T.war,
              fontWeight: 500,
            }}>
              {pdfMsg.text}
            </div>
          )}

          {/* Tabla pagos */}
          <Card>
            {isMobile ? (
              filtered.length===0
                ? <EmptyState icon={DollarSign} title="Sin registros" desc="Registra el primer pago con el botón de arriba"/>
                : filtered.map(p => mobileRow(p))
            ) : (
              <>
                <div style={{ padding:"12px 20px", borderBottom:`1px solid ${T.bdrL}`, display:"grid", gridTemplateColumns:"1fr 90px 100px 130px 110px 110px", gap:10 }}>
                  {["Paciente / Folio","Fecha","Monto","Concepto","Método","Acciones"].map(h => (
                    <span key={h} style={{ fontSize:11, fontWeight:700, color:T.tl, fontFamily:T.fB, letterSpacing:"0.07em", textTransform:"uppercase" }}>{h}</span>
                  ))}
                </div>
                {filtered.length===0
                  ? <EmptyState icon={DollarSign} title="Sin registros" desc="Registra el primer pago con el botón de arriba"/>
                  : filtered.map(p => paymentRow(p))
                }
              </>
            )}
          </Card>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB: GASTOS
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "gastos" && (
        <>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:20 }}>
            {[
              { label:"Gastos este mes", value:fmtCur(expMonthKpi), color:T.err, bg:"rgba(184,80,80,0.08)" },
              { label:`Gastos ${yearStr}`, value:fmtCur(expYearKpi),   color:T.war, bg:T.warA },
            ].map(s => (
              <div key={s.label} style={{ padding:"16px 14px", borderRadius:16, background:T.card, border:`1.5px solid ${T.bdrL}`, boxShadow:T.sh }}>
                <div style={{ fontFamily:T.fH, fontSize:26, fontWeight:500, color:s.color, marginBottom:4 }}>{s.value}</div>
                <div style={{ fontFamily:T.fB, fontSize:10, fontWeight:600, color:T.tl, textTransform:"uppercase", letterSpacing:"0.05em" }}>{s.label}</div>
              </div>
            ))}
          </div>

          <Card>
            {!isMobile && (
              <div style={{ padding:"12px 18px", borderBottom:`1px solid ${T.bdrL}`, display:"grid", gridTemplateColumns:"1fr 90px 160px 100px 90px", gap:10 }}>
                {["Concepto","Fecha","Categoría","Monto","Acciones"].map(h => (
                  <span key={h} style={{ fontSize:11, fontWeight:700, color:T.tl, fontFamily:T.fB, letterSpacing:"0.07em", textTransform:"uppercase" }}>{h}</span>
                ))}
              </div>
            )}
            {sortedExp.length === 0
              ? <EmptyState icon={TrendingDown} title="Sin gastos registrados" desc="Registra tu primer gasto operativo con el botón de arriba"/>
              : sortedExp.map(e => expRow(e))
            }
          </Card>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB: REPORTES
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "reportes" && (
        <>
          <div style={{ display:"flex", gap:6, marginBottom:20, flexWrap:"wrap" }}>
            {REPORTS.map(r => {
              const active = activeReport === r.key;
              return (
                <button key={r.key} onClick={() => setActiveReport(r.key)}
                  style={{ padding:"8px 14px", borderRadius:10, fontFamily:T.fB, fontSize:12, fontWeight:active?700:500,
                    background:active?T.p:T.card, color:active?WHITE:T.tm,
                    border:`1.5px solid ${active?T.p:T.bdrL}`, cursor:"pointer", transition:"all .15s" }}>
                  {r.label}
                </button>
              );
            })}
          </div>

          {/* ── R1: Ingresos por período ─────────────────────────────── */}
          {activeReport === "r1" && (
            <Card>
              <div style={{ padding:"18px 20px 0" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:10 }}>
                  <div style={{ fontFamily:T.fH, fontSize:18, color:T.t }}>Ingresos por período</div>
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <select value={report1Period} onChange={e => setReport1Period(e.target.value)}
                      style={{ padding:"8px 10px", border:`1.5px solid ${T.bdr}`, borderRadius:9, fontFamily:T.fB, fontSize:12, color:T.t, background:T.card, outline:"none" }}>
                      {periodOptionsWithWeek.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <button onClick={() => printReport(buildR1Html(payments, report1Period, profile), showPdfMsg)}
                      style={{ display:"flex", alignItems:"center", gap:5, padding:"8px 14px", borderRadius:9, border:"none",
                        background:T.p, color:WHITE, fontFamily:T.fB, fontSize:12, fontWeight:600, cursor:"pointer" }}>
                      <FileText size={13}/> Exportar PDF
                    </button>
                  </div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)", gap:10, marginBottom:20 }}>
                  <div style={{ padding:"14px", borderRadius:12, background:T.sucA }}>
                    <div style={{ fontFamily:T.fB, fontSize:10, fontWeight:700, color:T.suc, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:4 }}>Total período</div>
                    <div style={{ fontFamily:T.fH, fontSize:24, fontWeight:500, color:T.suc }}>{fmtCur(r1.total)}</div>
                  </div>
                  <div style={{ padding:"14px", borderRadius:12, background:T.pA }}>
                    <div style={{ fontFamily:T.fB, fontSize:10, fontWeight:700, color:T.p, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:4 }}>Sesiones</div>
                    <div style={{ fontFamily:T.fH, fontSize:24, fontWeight:500, color:T.t }}>{r1.count}</div>
                  </div>
                  <div style={{ padding:"14px", borderRadius:12, background:T.card, border:`1px solid ${T.bdrL}` }}>
                    <div style={{ fontFamily:T.fB, fontSize:10, fontWeight:700, color:T.tl, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:4 }}>Vs período anterior</div>
                    {r1.pct !== null
                      ? <div style={{ fontFamily:T.fH, fontSize:22, fontWeight:600, color:Number(r1.pct)>=0?T.suc:T.err }}>{Number(r1.pct)>=0?"+":""}{r1.pct}%</div>
                      : <div style={{ fontFamily:T.fB, fontSize:12, color:T.tl }}>Sin datos</div>}
                  </div>
                </div>
                {r1.days.length > 0 ? (
                  <div style={{ marginBottom:20 }}>
                    <div style={{ fontFamily:T.fB, fontSize:11, fontWeight:700, color:T.tl, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:10 }}>Desglose por día</div>
                    {(() => { const maxV = Math.max(...r1.days.map(([,v]) => v), 1); return r1.days.map(([date, amount]) => (
                      <div key={date} style={{ display:"grid", gridTemplateColumns:"100px 1fr 90px", gap:10, alignItems:"center", marginBottom:6 }}>
                        <span style={{ fontFamily:T.fB, fontSize:11, color:T.tm }}>
                          {new Date(date+"T12:00").toLocaleDateString("es-MX",{day:"numeric",month:"short"})}
                        </span>
                        <div style={{ height:8, background:T.bdrL, borderRadius:4, overflow:"hidden" }}>
                          <div style={{ height:"100%", width:`${Math.round((amount/maxV)*100)}%`, background:T.p, borderRadius:4 }}/>
                        </div>
                        <span style={{ fontFamily:T.fB, fontSize:12, fontWeight:600, color:T.t, textAlign:"right" }}>{fmtCur(amount)}</span>
                      </div>
                    ));})()}
                  </div>
                ) : (
                  <div style={{ padding:"20px 0", fontFamily:T.fB, fontSize:13, color:T.tl, textAlign:"center" }}>Sin ingresos en este período.</div>
                )}
              </div>
            </Card>
          )}

          {/* ── R2: Ranking ─────────────────────────────────────────── */}
          {activeReport === "r2" && (
            <Card>
              <div style={{ padding:"18px 20px 0" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:10 }}>
                  <div style={{ fontFamily:T.fH, fontSize:18, color:T.t }}>Ranking de ingresos · {yearStr}</div>
                  <div style={{ display:"flex", gap:8 }}>
                    <select value={report2Group} onChange={e => setReport2Group(e.target.value)}
                      style={{ padding:"8px 10px", border:`1.5px solid ${T.bdr}`, borderRadius:9, fontFamily:T.fB, fontSize:12, color:T.t, background:T.card, outline:"none" }}>
                      <option value="paciente">Por paciente</option>
                      <option value="servicio">Por tipo de servicio</option>
                    </select>
                    <button onClick={() => printReport(buildR2Html(payments, report2Group, patients, profile), showPdfMsg)}
                      style={{ display:"flex", alignItems:"center", gap:5, padding:"8px 14px", borderRadius:9, border:"none", background:T.p, color:WHITE, fontFamily:T.fB, fontSize:12, fontWeight:600, cursor:"pointer" }}>
                      <FileText size={13}/> Exportar PDF
                    </button>
                  </div>
                </div>
                <div style={{ fontFamily:T.fB, fontSize:12, color:T.tl, marginBottom:14 }}>
                  Total año: <strong style={{ color:T.t }}>{fmtCur(r2.totalYear)}</strong>
                </div>
                {r2.ranking.length > 0 ? (
                  <div style={{ marginBottom:20 }}>
                    {r2.ranking.map((row, i) => {
                      const pct   = r2.totalYear > 0 ? (row.total/r2.totalYear*100).toFixed(1) : "0.0";
                      const maxV  = r2.ranking[0].total || 1;
                      const barPct = Math.round((row.total/maxV)*100);
                      return (
                        <div key={row.label+i} style={{ display:"grid", gridTemplateColumns:"28px 1fr 80px 56px", gap:8, alignItems:"center", padding:"8px 0", borderBottom:`1px solid ${T.bdrL}` }}>
                          <span style={{ fontFamily:T.fB, fontSize:12, fontWeight:700, color:T.p }}>#{i+1}</span>
                          <div>
                            <div style={{ fontFamily:T.fB, fontSize:13, fontWeight:500, color:T.t }}>{row.label}</div>
                            <div style={{ height:6, background:T.bdrL, borderRadius:3, overflow:"hidden", marginTop:4 }}>
                              <div style={{ height:"100%", width:`${barPct}%`, background:T.p, borderRadius:3 }}/>
                            </div>
                          </div>
                          <span style={{ fontFamily:T.fB, fontSize:12, fontWeight:600, color:T.t, textAlign:"right" }}>{fmtCur(row.total)}</span>
                          <span style={{ fontFamily:T.fB, fontSize:11, color:T.tl, textAlign:"right" }}>{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ padding:"20px 0", fontFamily:T.fB, fontSize:13, color:T.tl, textAlign:"center" }}>Sin ingresos en {yearStr}.</div>
                )}
              </div>
            </Card>
          )}

          {/* ── R3: Balance ─────────────────────────────────────────── */}
          {activeReport === "r3" && (
            <Card>
              <div style={{ padding:"18px 20px 0" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:10 }}>
                  <div style={{ fontFamily:T.fH, fontSize:18, color:T.t }}>Balance ingresos vs. gastos</div>
                  <div style={{ display:"flex", gap:8 }}>
                    <select value={report3Period} onChange={e => setReport3Period(e.target.value)}
                      style={{ padding:"8px 10px", border:`1.5px solid ${T.bdr}`, borderRadius:9, fontFamily:T.fB, fontSize:12, color:T.t, background:T.card, outline:"none" }}>
                      {periodOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <button onClick={() => printReport(buildR3Html(payments, expenses, report3Period, profile), showPdfMsg)}
                      style={{ display:"flex", alignItems:"center", gap:5, padding:"8px 14px", borderRadius:9, border:"none", background:T.p, color:WHITE, fontFamily:T.fB, fontSize:12, fontWeight:600, cursor:"pointer" }}>
                      <FileText size={13}/> Exportar PDF
                    </button>
                  </div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)", gap:10, marginBottom:20 }}>
                  {[
                    { label:"Ingresos",     value:fmtCur(r3.totalI), color:T.suc, bg:T.sucA },
                    { label:"Gastos",       value:fmtCur(r3.totalG), color:T.err, bg:"rgba(184,80,80,0.08)" },
                    { label:"Utilidad",     value:fmtCur(r3.util),   color:r3.util>=0?T.suc:T.err, bg:r3.util>=0?T.sucA:"rgba(184,80,80,0.08)" },
                    { label:"Margen",       value:`${r3.margen}%`,   color:Number(r3.margen)>=0?T.suc:T.err, bg:Number(r3.margen)>=0?T.sucA:"rgba(184,80,80,0.08)" },
                  ].map(k => (
                    <div key={k.label} style={{ padding:"12px 14px", borderRadius:12, background:k.bg }}>
                      <div style={{ fontFamily:T.fB, fontSize:9, fontWeight:700, color:k.color, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:4 }}>{k.label}</div>
                      <div style={{ fontFamily:T.fH, fontSize:isMobile?16:20, fontWeight:500, color:k.color }}>{k.value}</div>
                    </div>
                  ))}
                </div>
                {r3.hasExpenses && Object.keys(r3.byCat).length > 0 ? (
                  <div style={{ marginBottom:20 }}>
                    <div style={{ fontFamily:T.fB, fontSize:11, fontWeight:700, color:T.tl, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:10 }}>Gastos por categoría</div>
                    {Object.entries(r3.byCat).sort(([,a],[,b])=>b-a).map(([cat, amount]) => {
                      const pct = r3.totalG > 0 ? (amount/r3.totalG*100).toFixed(0) : 0;
                      return (
                        <div key={cat} style={{ display:"grid", gridTemplateColumns:"1fr 80px 50px", gap:8, alignItems:"center", padding:"6px 0", borderBottom:`1px solid ${T.bdrL}` }}>
                          <span style={{ fontFamily:T.fB, fontSize:12, color:T.t }}>{cat}</span>
                          <span style={{ fontFamily:T.fB, fontSize:12, fontWeight:600, color:T.err, textAlign:"right" }}>{fmtCur(amount)}</span>
                          <span style={{ fontFamily:T.fB, fontSize:11, color:T.tl, textAlign:"right" }}>{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                ) : !r3.hasExpenses ? (
                  <div style={{ padding:"14px 16px", background:T.pA, borderRadius:10, fontFamily:T.fB, fontSize:13, color:T.p, marginBottom:16 }}>
                    💡 Registra tus gastos en la sección <strong>Gastos</strong> para ver el balance completo.
                  </div>
                ) : (
                  <div style={{ padding:"16px 0", fontFamily:T.fB, fontSize:13, color:T.tl }}>Sin gastos registrados en este período.</div>
                )}
              </div>
            </Card>
          )}

          {/* ── R4: Proyección ──────────────────────────────────────── */}
          {activeReport === "r4" && (
            <Card>
              <div style={{ padding:"18px 20px 0" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:10 }}>
                  <div style={{ fontFamily:T.fH, fontSize:18, color:T.t }}>Proyección de ingresos</div>
                  <button onClick={() => printReport(buildR4Html(appointments, patients, services, profile), showPdfMsg)}
                    style={{ display:"flex", alignItems:"center", gap:5, padding:"8px 14px", borderRadius:9, border:"none", background:T.p, color:WHITE, fontFamily:T.fB, fontSize:12, fontWeight:600, cursor:"pointer" }}>
                    <FileText size={13}/> Exportar PDF
                  </button>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)", gap:10, marginBottom:20 }}>
                  {[
                    { label:"Próximos 7 días",  value:fmtCur(r4.sum7),  count:r4.f7.length  },
                    { label:"Próximos 15 días", value:fmtCur(r4.sum15), count:r4.f15.length },
                    { label:"Próximos 30 días", value:fmtCur(r4.sum30), count:r4.f30.length },
                  ].map((k,i) => (
                    <div key={i} style={{ padding:"14px", borderRadius:12, background:T.pA, border:`1.5px solid ${T.p}20` }}>
                      <div style={{ fontFamily:T.fB, fontSize:9, fontWeight:700, color:T.p, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:4 }}>{k.label}</div>
                      <div style={{ fontFamily:T.fH, fontSize:isMobile?18:22, fontWeight:500, color:T.t, marginBottom:2 }}>{k.value}</div>
                      <div style={{ fontFamily:T.fB, fontSize:11, color:T.tl }}>{k.count} cita{k.count!==1?"s":""}</div>
                    </div>
                  ))}
                </div>
                {r4.f30.length > 0 ? (
                  <div style={{ marginBottom:20 }}>
                    <div style={{ fontFamily:T.fB, fontSize:11, fontWeight:700, color:T.tl, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:10 }}>Detalle — próximos 30 días</div>
                    {r4.f30.sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)).map(a => {
                      const pt  = patients.find(p => p.id === a.patientId);
                      const est = r4.est(a);
                      return (
                        <div key={a.id} style={{ display:"grid", gridTemplateColumns:"120px 1fr 90px", gap:8, padding:"9px 0", borderBottom:`1px solid ${T.bdrL}`, alignItems:"center" }}>
                          <span style={{ fontFamily:T.fB, fontSize:12, color:T.tm }}>
                            {new Date(a.date+"T12:00").toLocaleDateString("es-MX",{weekday:"short",day:"numeric",month:"short"})}
                            {a.time && <span style={{ color:T.tl }}> {a.time}</span>}
                          </span>
                          <span style={{ fontFamily:T.fB, fontSize:13, color:T.t }}>{pt?.name||"Paciente"}</span>
                          <span style={{ fontFamily:T.fB, fontSize:13, fontWeight:600, color:est>0?T.suc:T.tl, textAlign:"right" }}>{est>0?fmtCur(est):"—"}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ padding:"20px 0", fontFamily:T.fB, fontSize:13, color:T.tl, textAlign:"center" }}>Sin citas agendadas en los próximos 30 días.</div>
                )}
                <div style={{ padding:"12px 14px", background:T.warA, borderRadius:10, fontFamily:T.fB, fontSize:11.5, color:T.war, marginBottom:20, lineHeight:1.6 }}>
                  ⚠️ Proyección basada en citas agendadas y tarifas configuradas. Sujeta a cambios por cancelaciones o modificaciones.
                </div>
              </div>
            </Card>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          MODAL: AGREGAR PAGO
      ══════════════════════════════════════════════════════════════════ */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); setCobroFromPending(null); }} title="Registrar pago">
        {cobroFromPending ? (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize:11, fontWeight:600, color:T.tm, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>Paciente</div>
            <div style={{ padding:"10px 14px", border:`1.5px solid ${T.bdr}`, borderRadius:10, background:T.cardAlt, fontFamily:T.fB, fontSize:14, color:T.t, fontWeight:500 }}>
              {cobroFromPending.patientName}
            </div>
          </div>
        ) : (
          <Select label="Paciente *" value={form.patientId} onChange={fld("patientId")}
            options={[{value:"",label:"Seleccionar paciente..."}, ...patients.map(p => ({value:p.id, label:p.name}))]} />
        )}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <Input label="Fecha" value={form.date} onChange={fld("date")} type="date"/>
          <Input label="Monto (MXN) *" value={form.amount} onChange={fld("amount")} type="number" placeholder="900"/>
        </div>
        <Select label="Concepto" value={form.serviceId || form.concept} onChange={handleConceptChange}
          options={[{value:"",label:"Seleccionar concepto..."}, ...conceptOptions]} />
        {showModalityPicker && (
          <div style={{ padding:"10px 14px", background:T.pA, borderRadius:10, marginBottom:8, fontFamily:T.fB, fontSize:13, color:T.p }}>
            <div style={{ fontWeight:600, marginBottom:8 }}>¿Qué modalidad fue la sesión?</div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => applyModality("presencial")}
                style={{ flex:1, padding:"8px", borderRadius:9, border:`1.5px solid ${T.bdr}`, background:T.card, fontFamily:T.fB, fontSize:12, fontWeight:600, color:T.t, cursor:"pointer" }}>
                🏢 Presencial
              </button>
              <button onClick={() => applyModality("virtual")}
                style={{ flex:1, padding:"8px", borderRadius:9, border:`1.5px solid ${T.p}`, background:T.pA, fontFamily:T.fB, fontSize:12, fontWeight:600, color:T.p, cursor:"pointer" }}>
                💻 Virtual
              </button>
            </div>
          </div>
        )}
        {form.modality && (
          <div style={{ fontFamily:T.fB, fontSize:11, color:T.tm, marginTop:-6, marginBottom:8, paddingLeft:2 }}>
            Modalidad: {form.modality==="presencial"?"🏢 Presencial":"💻 Virtual"}
            {" · "}
            <span style={{ color:T.p, cursor:"pointer", textDecoration:"underline" }} onClick={() => setShowModalityPicker(true)}>Cambiar</span>
          </div>
        )}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <Select label="Método" value={form.method} onChange={fld("method")}
            options={["Transferencia","Efectivo","Tarjeta","MercadoPago","PayPal"].map(m=>({value:m,label:m}))} />
          <Select label="Estado" value={form.status} onChange={fld("status")}
            options={[{value:"pagado",label:"Pagado"},{value:"pendiente",label:"Pendiente"}]} />
        </div>
        <div style={{ padding:"10px 14px", background:T.pA, borderRadius:10, marginBottom:16, fontFamily:T.fB, fontSize:12, color:T.p }}>
          Se generará automáticamente el folio <strong>{nextFolio(payments)}</strong> para este pago.
        </div>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <Btn variant="ghost" onClick={() => { setShowAdd(false); setCobroFromPending(null); }}>Cancelar</Btn>
          <Btn onClick={save} disabled={!form.patientId||!form.amount}><Check size={15}/> Guardar pago</Btn>
        </div>
      </Modal>

      {/* Modal confirmación de pago guardado */}
      {savedPayment && (
        <Modal open={!!savedPayment} onClose={() => setSavedPayment(null)} title="Pago guardado" width={400}>
          <div style={{ textAlign:"center", padding:"8px 0 20px" }}>
            <div style={{ width:56, height:56, borderRadius:"50%", background:T.sucA, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
              <CheckCircle size={26} color={T.suc} strokeWidth={1.5}/>
            </div>
            <div style={{ fontFamily:T.fH, fontSize:22, color:T.t, marginBottom:4 }}>
              {savedPayment.patientName?.split(" ").slice(0,2).join(" ")}
            </div>
            {savedPayment.status === "parcial" ? (
              <div style={{ marginBottom:8 }}>
                <div style={{ fontFamily:T.fH, fontSize:32, fontWeight:500, color:T.war }}>{fmtCur(savedPayment.amountPaid)} pagado</div>
                <div style={{ fontFamily:T.fB, fontSize:13, color:T.err, fontWeight:600 }}>{fmtCur(Math.max(0,Number(savedPayment.amount)-Number(savedPayment.amountPaid||0)))} pendiente</div>
              </div>
            ) : (
              <div style={{ fontFamily:T.fH, fontSize:32, fontWeight:500, color:T.suc, marginBottom:4 }}>{fmtCur(savedPayment.amount)}</div>
            )}
            <div style={{ fontFamily:T.fB, fontSize:12, color:T.tl, marginBottom:4 }}>{fmtDate(savedPayment.date)}</div>
            {savedPayment.folio && <div style={{ fontFamily:"monospace", fontSize:11, color:T.p, fontWeight:700 }}>{savedPayment.folio}</div>}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {/* FIX D1: usa handleShareRecibo en lugar de llamada directa a shareRecibo */}
            <button
              onClick={() => { const patient = patients.find(pt => pt.id === savedPayment.patientId); handleShareRecibo(savedPayment, patient); }}
              disabled={reciboLoading}
              style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"11px", borderRadius:10,
                border:`1.5px solid ${T.p}`, background:T.pA, fontFamily:T.fB, fontSize:13, fontWeight:600, color:T.p,
                cursor:reciboLoading?"not-allowed":"pointer", opacity:reciboLoading?0.6:1 }}>
              <Share2 size={14}/> {reciboLoading ? "Generando…" : "Compartir"}
            </button>
            {shareError && (
              <div style={{ gridColumn:"1/-1", fontFamily:T.fB, fontSize:11, color:T.err, textAlign:"center", marginTop:2 }}>Error al generar el recibo. Inténtalo de nuevo.</div>
            )}
            <button onClick={() => setSavedPayment(null)}
              style={{ padding:"11px", borderRadius:10, border:`1.5px solid ${T.bdr}`, background:"transparent", fontFamily:T.fB, fontSize:13, color:T.tm, cursor:"pointer" }}>
              Cerrar
            </button>
          </div>
        </Modal>
      )}

      {/* Modal editar/ver pago */}
      {editPayment && (
        <Modal open={!!editPayment} onClose={() => setEditPayment(null)}
          title={`Pago — ${editPayment.patientName?.split(" ").slice(0,2).join(" ")}`} width={480}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 16px", background:T.pA, borderRadius:12, marginBottom:20 }}>
            <div>
              <div style={{ fontFamily:T.fH, fontSize:28, fontWeight:500, color:T.t }}>{fmtCur(editPayment.amount)}</div>
              <div style={{ fontFamily:T.fB, fontSize:12, color:T.tm }}>{fmtDate(editPayment.date)}</div>
            </div>
            {editPayment.folio && (
              <div style={{ textAlign:"right" }}>
                <div style={{ fontFamily:T.fB, fontSize:9, fontWeight:700, color:T.tl, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:2 }}>Folio</div>
                <div style={{ fontFamily:"monospace", fontSize:13, fontWeight:700, color:T.p }}>{editPayment.folio}</div>
              </div>
            )}
          </div>
          {[
            { label:"Estado", value: editPayment.status==="parcial"
                ? `Parcial · $${Number(editPayment.amountPaid||0).toLocaleString("es-MX")} pagado · $${Math.max(0,Number(editPayment.amount)-Number(editPayment.amountPaid||0)).toLocaleString("es-MX")} pendiente`
                : editPayment.status,
              color: editPayment.status==="pagado"?T.suc:editPayment.status==="parcial"?T.war:T.war },
            { label:"Método",  value:editPayment.method,  color:T.t },
            { label:"Concepto",value:editPayment.concept, color:T.t },
          ].map(row => (
            <div key={row.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"11px 0", borderBottom:`1px solid ${T.bdrL}` }}>
              <span style={{ fontFamily:T.fB, fontSize:12, fontWeight:600, color:T.tl, textTransform:"uppercase", letterSpacing:"0.06em" }}>{row.label}</span>
              <span style={{ fontFamily:T.fB, fontSize:13, fontWeight:500, color:row.color, textAlign:"right", maxWidth:"60%" }}>{row.value}</span>
            </div>
          ))}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginTop:20 }}>
            <button onClick={() => {
                if (window.confirm(`¿Eliminar el pago de ${editPayment.patientName?.split(" ")[0]}?\n\nEsta acción no se puede deshacer.`)) {
                  del(editPayment.id); setEditPayment(null);
                }
              }}
              style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"11px", borderRadius:10, border:`1.5px solid ${T.errA}`, background:"transparent", fontFamily:T.fB, fontSize:13, fontWeight:600, color:T.err, cursor:"pointer" }}>
              <Trash2 size={14}/> Eliminar
            </button>
            {/* FIX D1: usa handleShareRecibo en modal de edición */}
            <button
              onClick={() => { const patient = patients.find(pt => pt.id === editPayment.patientId); handleShareRecibo(editPayment, patient); }}
              disabled={reciboLoading}
              style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:5, padding:"11px", borderRadius:10, border:"none",
                background:T.p, color:WHITE, fontFamily:T.fB, fontSize:13, fontWeight:600,
                cursor:reciboLoading?"not-allowed":"pointer", opacity:reciboLoading?0.7:1 }}>
              <Share2 size={14}/> {reciboLoading ? "Generando…" : "Compartir"}
            </button>
            {shareError && (
              <div style={{ gridColumn:"1/-1", fontFamily:T.fB, fontSize:11, color:T.err, textAlign:"center", marginTop:2 }}>Error al generar el recibo. Inténtalo de nuevo.</div>
            )}
          </div>
        </Modal>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          MODAL: AGREGAR / EDITAR GASTO
      ══════════════════════════════════════════════════════════════════ */}
      <Modal
        open={showAddExp}
        onClose={() => { setShowAddExp(false); setEditExp(null); setExpForm(emptyExpForm()); }}
        title={editExp ? "Editar gasto" : "Registrar gasto"}
        width={460}
      >
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <Input label="Fecha *" value={expForm.date} onChange={efld("date")} type="date"/>
          <Input label="Monto (MXN) *" value={expForm.amount} onChange={efld("amount")} type="number" placeholder="0.00"/>
        </div>
        <Input label="Concepto *" value={expForm.concept} onChange={efld("concept")} placeholder="Descripción del gasto"/>
        <Select label="Categoría" value={expForm.category} onChange={efld("category")}
          options={EXPENSE_CATS.map(c => ({ value:c, label:c }))}/>
        <div style={{ marginBottom:16 }}>
          <div style={{ fontFamily:T.fB, fontSize:12, fontWeight:600, color:T.tl, marginBottom:6 }}>Notas (opcional)</div>
          <textarea
            value={expForm.notes}
            onChange={e => efld("notes")(e.target.value)}
            placeholder="Notas adicionales..."
            rows={3}
            style={{ width:"100%", padding:"10px 12px", border:`1.5px solid ${T.bdr}`, borderRadius:10,
              fontFamily:T.fB, fontSize:13, color:T.t, background:T.card,
              outline:"none", resize:"vertical", boxSizing:"border-box" }}
          />
        </div>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <Btn variant="ghost" onClick={() => { setShowAddExp(false); setEditExp(null); setExpForm(emptyExpForm()); }}>Cancelar</Btn>
          <Btn onClick={saveExpense} disabled={!expForm.concept||!expForm.amount}><Check size={15}/> {editExp?"Actualizar":"Guardar"}</Btn>
        </div>
      </Modal>
    </div>
  );
}
