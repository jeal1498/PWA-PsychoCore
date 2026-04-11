// ── Agenda.jsx ───────────────────────────────────────────────────────────────
// Solo UI y subcomponentes visuales.
// Estado y lógica → useAgenda.js
// Funciones puras y constantes → agenda.utils.js
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo, useEffect } from "react";
import {
  Calendar, ChevronLeft, ChevronRight, Trash2, Check, Plus, FileText,
  LayoutGrid, List, Clock, Repeat, MessageCircle, BookOpen, AlertTriangle,
  CalendarDays, Play, ShieldAlert, CheckCircle2,
} from "lucide-react";
import { T, MONTHS_ES, DAYS_ES } from "../../theme.js";
import { fmt, fmtDate } from "../../utils.js";
import { Card, Input, Select, Btn, Badge, PageHeader } from "../../components/ui/index.jsx";
import { PageView } from "../../components/PageView.jsx";
import DynamicSummary from "../../components/DynamicSummary.jsx";

import { useAgenda }       from "./useAgenda.js";
import {
  STATUS_CONFIG,
  WORK_HOURS,
  LAVANDA, LAVANDA_A,
  AZUL, AZUL_A,
  whatsappReminder,
  generateRecurring,
  getWeekDays,
  apptHour,
  isHourActive,
} from "./agenda.utils.js";

// ── Keyframes ────────────────────────────────────────────────────────────────
if (typeof document !== "undefined" && !window.__pc_agenda_styles__) {
  window.__pc_agenda_styles__ = true;
  const s = document.createElement("style");
  s.textContent = `
    @keyframes pc-agenda-up {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes pc-agenda-bar { from { width: 0%; } }
  `;
  document.head.appendChild(s);
}

// ── FadeUp ───────────────────────────────────────────────────────────────────
function FadeUp({ children, delay = 0, style: sx = {} }) {
  return (
    <div style={{ animation:`pc-agenda-up 0.45s cubic-bezier(0.22,1,0.36,1) ${delay}s both`, ...sx }}>
      {children}
    </div>
  );
}

// ── SectionLabel ─────────────────────────────────────────────────────────────
function SectionLabel({ text, icon: Icon, color }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:12 }}>
      {Icon && <Icon size={11} color={color || T.tl} strokeWidth={2.2}/>}
      <span style={{
        fontFamily:T.fB, fontSize:10, fontWeight:800,
        color:color || T.tl, textTransform:"uppercase", letterSpacing:"0.1em",
      }}>
        {text}
      </span>
    </div>
  );
}

// ── SeeAll ───────────────────────────────────────────────────────────────────
function SeeAll({ label = "Ver todo", onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background:"none", border:"none", cursor:"pointer",
        display:"inline-flex", alignItems:"center", gap:3,
        fontFamily:T.fB, fontSize:12, fontWeight:600, padding:0,
        color:hov ? T.p : T.tl, transition:"color 0.15s ease", flexShrink:0,
      }}
    >
      {label} <ChevronRight size={12} strokeWidth={2.5}/>
    </button>
  );
}

// ── HoverBtn subcomponents ───────────────────────────────────────────────────

/** Hover de opacidad */
function OpacityBtn({ onClick, style: sx = {}, children }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ ...sx, opacity:hov ? 0.85 : 1, transition:"opacity .13s" }}>
      {children}
    </button>
  );
}

/** Hover fill primario (T.p / #fff) */
function PrimaryHoverBtn({ onClick, style: sx = {}, children, title }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} title={title}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ ...sx, background:hov ? T.p : (sx.background ?? T.pA), color:hov ? "#fff" : (sx.color ?? T.p), transition:"all .13s" }}>
      {children}
    </button>
  );
}

/** Hover fill success (T.suc / #fff) */
function SuccessHoverBtn({ onClick, style: sx = {}, children }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ ...sx, background:hov ? T.suc : (sx.background ?? T.sucA), color:hov ? "#fff" : (sx.color ?? T.suc), transition:"all .13s" }}>
      {children}
    </button>
  );
}

/** Hover de borde + color (Anamnesis) */
function AnamnesiHoverBtn({ onClick, style: sx = {}, children }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ ...sx, borderColor:hov ? T.p : (sx.borderColor ?? T.bdr), color:hov ? T.p : (sx.color ?? T.t), transition:"all .13s" }}>
      {children}
    </button>
  );
}

// ── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, size = 34, color = T.p, bg = T.pA }) {
  const initials = name
    ? name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase()
    : "?";
  return (
    <div style={{
      width:size, height:size, borderRadius:"50%", flexShrink:0,
      background:bg, border:`1.5px solid ${color}22`,
      display:"flex", alignItems:"center", justifyContent:"center",
    }}>
      <span style={{ fontFamily:T.fH, fontSize:size * 0.38, fontWeight:600, color, lineHeight:1 }}>
        {initials}
      </span>
    </div>
  );
}

// ── StatStrip ────────────────────────────────────────────────────────────────
function StatStrip({ appointments, todayStr, recurringCount, isMobile }) {
  if (isMobile) return null;

  const todayAppts     = appointments.filter(a => a.date === todayStr);
  const completedToday = todayAppts.filter(a => a.status === "completada").length;
  const pendingToday   = todayAppts.filter(a => a.status === "pendiente").length;
  const monthStr       = todayStr.slice(0, 7);
  const monthTotal     = appointments.filter(a => a.date.startsWith(monthStr)).length;

  const stats = [
    { label:"Citas este mes",  value:monthTotal,      icon:Calendar,      color:T.p,   bg:T.pA   },
    { label:"Completadas hoy", value:`${completedToday}/${todayAppts.length}`, icon:CheckCircle2, color:T.suc, bg:T.sucA },
    { label:"Pendientes hoy",  value:pendingToday,    icon:Clock,         color:pendingToday > 0 ? T.war : T.suc, bg:pendingToday > 0 ? T.warA : T.sucA },
    { label:"Series activas",  value:recurringCount,  icon:Repeat,        color:T.p,   bg:T.pA,  small:true },
  ];

  return (
    <FadeUp delay={0.04} style={{ marginBottom:14 }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={s.label} style={{
              background:T.card, border:`1px solid ${T.bdrL}`,
              borderRadius:14, padding:"14px 16px",
              display:"flex", flexDirection:"column", gap:8,
              animation:`pc-agenda-up 0.4s ease ${0.04 + i * 0.04}s both`,
            }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div style={{
                  width:28, height:28, borderRadius:8,
                  background:s.bg, border:`1px solid ${s.color}18`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                }}>
                  <Icon size={13} color={s.color} strokeWidth={1.8}/>
                </div>
              </div>
              <div style={{ fontFamily:T.fH, fontSize:s.small ? 22 : 28, fontWeight:500, color:T.t, letterSpacing:"-0.02em", lineHeight:1 }}>
                {s.value}
              </div>
              <div style={{ fontFamily:T.fB, fontSize:11.5, color:T.tl, fontWeight:500 }}>
                {s.label}
              </div>
            </div>
          );
        })}
      </div>
    </FadeUp>
  );
}

// ── WeeklyView ───────────────────────────────────────────────────────────────
function WeeklyView({ appointments, weekAnchor, setWeekAnchor, onOpenQuick, today, profile }) {
  const weekDays = useMemo(() => getWeekDays(weekAnchor), [weekAnchor]);
  const todayStr = fmt(today);

  const apptMap = useMemo(() => {
    const map = {};
    const weekFmts = weekDays.map(d => fmt(d));
    appointments.filter(a => weekFmts.includes(a.date)).forEach(a => {
      const key = `${a.date}_${apptHour(a.time)}`;
      if (!map[key]) map[key] = [];
      map[key].push(a);
    });
    return map;
  }, [appointments, weekDays]);

  const prevWeek = () => { const d = new Date(weekAnchor); d.setDate(d.getDate() - 7); setWeekAnchor(d); };
  const nextWeek = () => { const d = new Date(weekAnchor); d.setDate(d.getDate() + 7); setWeekAnchor(d); };
  const thisWeek = () => setWeekAnchor(new Date(today));

  const startStr  = weekDays[0].toLocaleDateString("es-MX", { day:"numeric", month:"short" });
  const endStr    = weekDays[5].toLocaleDateString("es-MX", { day:"numeric", month:"short", year:"numeric" });
  const busySlots = Object.keys(apptMap).length;

  const activeHours = new Set();
  Object.keys(apptMap).forEach(key => {
    const h = parseInt(key.split("_")[1]);
    activeHours.add(h - 1); activeHours.add(h); activeHours.add(h + 1);
  });
  const visibleHours = busySlots > 0
    ? WORK_HOURS.filter(h => activeHours.has(h))
    : WORK_HOURS.filter(h => h >= 9 && h <= 18);

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, gap:8 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <button onClick={prevWeek} style={{ width:30, height:30, background:T.bdrL, border:"none", borderRadius:8, cursor:"pointer", color:T.tm, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <ChevronLeft size={14}/>
          </button>
          <span style={{ fontFamily:T.fH, fontSize:20, color:T.t, letterSpacing:"-0.02em" }}>
            {startStr} — {endStr}
          </span>
          <button onClick={nextWeek} style={{ width:30, height:30, background:T.bdrL, border:"none", borderRadius:8, cursor:"pointer", color:T.tm, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <ChevronRight size={14}/>
          </button>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {busySlots > 0 && (
            <span style={{ fontFamily:T.fB, fontSize:12, color:T.p, background:T.pA, padding:"3px 10px", borderRadius:9999, fontWeight:600 }}>
              {busySlots} cita{busySlots !== 1 ? "s" : ""}
            </span>
          )}
          <button onClick={thisWeek}
            style={{ fontFamily:T.fB, fontSize:12, color:T.tm, background:T.bdrL, border:"none", borderRadius:9999, padding:"4px 14px", cursor:"pointer", fontWeight:600 }}>
            Hoy
          </button>
        </div>
      </div>

      <div style={{ position:"relative" }}>
        <div style={{ overflowX:"auto", WebkitOverflowScrolling:"touch" }}>
          <div style={{ minWidth:480 }}>
            {/* Cabecera de días */}
            <div style={{ display:"grid", gridTemplateColumns:"44px repeat(6, 1fr)", gap:3, marginBottom:4, position:"sticky", top:0, background:T.card, zIndex:1 }}>
              <div/>
              {weekDays.map((d, i) => {
                const ds = fmt(d);
                const isToday = ds === todayStr;
                const dayCitas = Object.keys(apptMap).filter(k => k.startsWith(ds)).length;
                return (
                  <div key={i} style={{ textAlign:"center", padding:"6px 2px", borderRadius:8, background:isToday ? T.pA : "transparent" }}>
                    <div style={{ fontFamily:T.fB, fontSize:9, fontWeight:700, color:T.tl, letterSpacing:"0.06em" }}>
                      {["LUN","MAR","MIÉ","JUE","VIE","SÁB"][i]}
                    </div>
                    <div style={{ fontFamily:T.fH, fontSize:19, color:isToday ? T.p : T.t, fontWeight:isToday ? 600 : 400, lineHeight:1.15 }}>
                      {d.getDate()}
                    </div>
                    {dayCitas > 0 && (
                      <div style={{ width:5, height:5, borderRadius:"50%", background:isToday ? T.p : T.acc, margin:"2px auto 0" }}/>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Filas de horas */}
            {visibleHours.map((hour, idx) => {
              const prevHour = visibleHours[idx - 1];
              const hasGap   = prevHour !== undefined && hour - prevHour > 1;
              const inactive = !isHourActive(hour, profile);
              return (
                <div key={hour}>
                  {hasGap && (
                    <div style={{ display:"grid", gridTemplateColumns:"44px repeat(6, 1fr)", gap:3, marginBottom:3 }}>
                      <div style={{ fontFamily:T.fB, fontSize:9, color:T.tl, textAlign:"right", paddingRight:6, paddingTop:4 }}>···</div>
                      {weekDays.map((_, di) => (
                        <div key={di} style={{ height:8, background:`${T.bdrL}33`, borderRadius:4 }}/>
                      ))}
                    </div>
                  )}
                  <div style={{ display:"grid", gridTemplateColumns:"44px repeat(6, 1fr)", gap:3, marginBottom:3 }}>
                    <div style={{ fontFamily:T.fB, fontSize:10, color:T.tl, paddingTop:5, textAlign:"right", paddingRight:6, opacity:inactive ? 0.5 : 1 }}>
                      {hour}:00
                    </div>
                    {weekDays.map((d, di) => {
                      const key  = `${fmt(d)}_${hour}`;
                      const slot = apptMap[key];
                      const isToday = fmt(d) === todayStr;
                      if (slot) {
                        return (
                          <OpacityBtn key={di} onClick={() => onOpenQuick(slot[0])}
                            style={{ background:T.p, borderRadius:8, padding:"5px 6px", minHeight:38, cursor:"pointer", display:"block", width:"100%", border:"none", textAlign:"left" }}>
                            {slot.map(a => (
                              <div key={a.id} style={{ fontFamily:T.fB, fontSize:10, color:"#fff", fontWeight:600, lineHeight:1.3, display:"flex", alignItems:"center", gap:2, overflow:"hidden" }}>
                                {a.isRecurring && <Repeat size={7} style={{ opacity:0.7, flexShrink:0 }}/>}
                                {a.reminderSent && <Check size={7} color="#25D366" style={{ flexShrink:0 }}/>}
                                <span style={{ whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                                  {a.patientName.split(" ")[0]}
                                </span>
                              </div>
                            ))}
                          </OpacityBtn>
                        );
                      }
                      return (
                        <div key={di} style={{
                          background:inactive ? T.bdrL : isToday ? "rgba(58,107,110,0.025)" : "transparent",
                          borderRadius:8, minHeight:38,
                          border:`1px solid ${T.bdrL}`,
                          opacity:inactive ? 0.55 : 1,
                        }}/>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ position:"absolute", right:0, top:"50%", transform:"translateY(-50%)", background:`linear-gradient(90deg, transparent, ${T.card})`, width:24, height:"100%", pointerEvents:"none" }}/>
      </div>
    </div>
  );
}

// ── TimelineCell — subcomponente con hover controlado por state ───────────────
function TimelineCell({ hasAppts, onNewAppt, dayView, timeStr }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={() => !hasAppts && onNewAppt(dayView, timeStr)}
      style={{
        flex:1,
        background:(!hasAppts && hov) ? T.pA : "transparent",
        borderTop:`1px solid ${T.bdrL}55`,
        borderRadius:hasAppts ? 0 : 6,
        cursor:hasAppts ? "default" : "pointer",
        transition:"background .12s",
        marginRight:4,
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    />
  );
}

// ── DayView ──────────────────────────────────────────────────────────────────
function DayView({ appointments, selectedDayView, setSelectedDayView, onOpenQuick, onOpenStatusModal, onConfirmDelete, onNewAppt, patients, profile, markReminderSent, today, onStartSession, isMobile }) {
  const todayStr = fmt(today);

  const [nowMinutes, setNowMinutes] = useState(() => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  });
  useEffect(() => {
    const id = setInterval(() => {
      const n = new Date();
      setNowMinutes(n.getHours() * 60 + n.getMinutes());
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  const dayAppts = useMemo(() =>
    appointments.filter(a => a.date === selectedDayView).sort((a, b) => a.time.localeCompare(b.time)),
    [appointments, selectedDayView]
  );

  const apptByHour = useMemo(() => {
    const map = {};
    dayAppts.forEach(a => {
      const h = apptHour(a.time);
      if (!map[h]) map[h] = [];
      map[h].push(a);
    });
    return map;
  }, [dayAppts]);

  const prevDay  = () => { const d = new Date(selectedDayView + "T12:00:00"); d.setDate(d.getDate() - 1); setSelectedDayView(fmt(d)); };
  const nextDay  = () => { const d = new Date(selectedDayView + "T12:00:00"); d.setDate(d.getDate() + 1); setSelectedDayView(fmt(d)); };
  const goToday  = () => setSelectedDayView(fmt(today));

  const isToday  = selectedDayView === todayStr;
  const dateObj  = new Date(selectedDayView + "T12:00:00");
  const dayLabel = dateObj.toLocaleDateString("es-MX", { weekday:"long", day:"numeric", month:"long", year:"numeric" });

  const handleStartSession = (appt) => {
    if (typeof onStartSession === "function") {
      onStartSession(appt);
    } else {
      // emit importado en useAgenda; aquí sólo mostramos el toast vía prop
      onStartSession?.(appt);
    }
  };

  const HOUR_H         = 64;
  const TIMELINE_START = 8;
  const TIMELINE_END   = 20;
  const timelineHours  = Array.from({ length: TIMELINE_END - TIMELINE_START + 1 }, (_, i) => TIMELINE_START + i);

  const nowOffsetPx  = isToday ? ((nowMinutes - TIMELINE_START * 60) / 60) * HOUR_H : null;
  const showNowMarker = nowOffsetPx !== null && nowOffsetPx >= 0 && nowOffsetPx <= (TIMELINE_END - TIMELINE_START) * HOUR_H;

  const apptTopPx = (timeStr) => {
    const [h, m] = timeStr.split(":").map(Number);
    return ((h * 60 + m) - TIMELINE_START * 60) / 60 * HOUR_H;
  };

  const BLOCK_H        = 72;
  const completedCount = dayAppts.filter(a => a.status === "completada").length;
  const totalCount     = dayAppts.length;

  return (
    <Card style={{ overflow:"hidden" }}>
      {/* Header */}
      <div style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:isMobile ? "16px 18px" : "18px 22px",
        borderBottom:`1px solid ${T.bdrL}`,
        flexWrap:"wrap", gap:10,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <button onClick={prevDay} style={{ width:30, height:30, background:T.bdrL, border:"none", borderRadius:8, cursor:"pointer", color:T.tm, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <ChevronLeft size={14}/>
          </button>
          <div>
            <div style={{ fontFamily:T.fH, fontSize:isMobile ? 18 : 22, color:isToday ? T.p : T.t, letterSpacing:"-0.02em", textTransform:"capitalize" }}>
              {dayLabel}
            </div>
            <div style={{ fontFamily:T.fB, fontSize:11.5, color:T.tl, marginTop:1 }}>
              {totalCount === 0 ? "Sin citas" : `${totalCount} cita${totalCount !== 1 ? "s" : ""}`}
              {isToday && " · hoy"}
            </div>
          </div>
          <button onClick={nextDay} style={{ width:30, height:30, background:T.bdrL, border:"none", borderRadius:8, cursor:"pointer", color:T.tm, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <ChevronRight size={14}/>
          </button>
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          {totalCount > 0 && (
            <div style={{ display:"flex", alignItems:"center", gap:8, minWidth:120 }}>
              <div style={{ flex:1, height:3, borderRadius:9999, background:T.bdrL, overflow:"hidden" }}>
                <div style={{
                  height:"100%", borderRadius:9999, background:T.p,
                  width:`${(completedCount / totalCount) * 100}%`,
                  transition:"width 0.6s cubic-bezier(0.34,1.56,0.64,1)",
                  animation:"pc-agenda-bar .6s ease both",
                }}/>
              </div>
              <span style={{ fontFamily:T.fB, fontSize:11, color:T.tl, whiteSpace:"nowrap" }}>
                {completedCount}/{totalCount}
              </span>
            </div>
          )}
          {!isToday && (
            <button onClick={goToday}
              style={{ fontFamily:T.fB, fontSize:12, color:T.tm, background:T.bdrL, border:"none", borderRadius:9999, padding:"4px 14px", cursor:"pointer", fontWeight:600 }}>
              Hoy
            </button>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div style={{ padding:isMobile ? "12px 16px 20px" : "14px 22px 22px", overflowY:"auto", maxHeight:"72vh" }}>
        <div style={{ position:"relative", minHeight:(TIMELINE_END - TIMELINE_START) * HOUR_H }}>

          {timelineHours.map((hour, idx) => {
            if (idx === timelineHours.length - 1) return null;
            const hasAppts = !!(apptByHour[hour]?.length > 0);
            const timeStr  = `${String(hour).padStart(2,"0")}:00`;
            const top      = (hour - TIMELINE_START) * HOUR_H;
            return (
              <div key={hour} style={{ position:"absolute", top, left:0, right:0, height:HOUR_H, display:"flex", alignItems:"stretch" }}>
                <div style={{ width:48, flexShrink:0, display:"flex", alignItems:"flex-start", justifyContent:"flex-end", paddingRight:10, paddingTop:6 }}>
                  <span style={{ fontFamily:T.fB, fontSize:10, color:T.tl, lineHeight:1 }}>{timeStr}</span>
                </div>
                <TimelineCell hasAppts={hasAppts} onNewAppt={onNewAppt} dayView={selectedDayView} timeStr={timeStr}/>
              </div>
            );
          })}

          {/* Última línea */}
          <div style={{ position:"absolute", top:(TIMELINE_END - TIMELINE_START)*HOUR_H, left:48, right:4, height:1, background:`${T.bdrL}55` }}/>

          {/* Marcador "ahora" */}
          {showNowMarker && (
            <div style={{ position:"absolute", top:nowOffsetPx, left:40, right:0, display:"flex", alignItems:"center", zIndex:10, pointerEvents:"none" }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:T.err, flexShrink:0 }}/>
              <div style={{ flex:1, height:1.5, background:T.err, opacity:0.8 }}/>
            </div>
          )}

          {/* Bloques de cita */}
          {dayAppts.map(a => {
            const pt   = patients.find(p => p.id === a.patientId);
            const url  = !a.reminderSent && a.status !== "completada" ? whatsappReminder(a, pt, profile) : null;
            const scfg = STATUS_CONFIG[a.status] || STATUS_CONFIG.pendiente;
            const top  = apptTopPx(a.time);
            const isPendienteHoy = a.status === "pendiente" && isToday;
            const displayName    = isMobile
              ? a.patientName.split(" ")[0]
              : a.patientName.split(" ").slice(0,2).join(" ");
            const isDone = a.status === "completada";

            return (
              <div key={a.id} style={{
                position:"absolute", top:top + 2, left:52, right:8,
                minHeight:BLOCK_H,
                background:T.cardAlt,
                borderLeft:`4px solid ${scfg.color}`,
                borderRadius:"0 12px 12px 0",
                boxShadow:`0 2px 8px ${scfg.color}18`,
                padding:"10px 14px", zIndex:5,
                display:"flex", flexDirection:"column", gap:6,
                opacity:isDone ? 0.6 : 1, transition:"opacity .15s",
              }}>
                {/* Fila 1 */}
                <div style={{ display:"flex", alignItems:"flex-start", gap:8 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap", marginBottom:2 }}>
                      <span style={{ fontFamily:T.fB, fontSize:11, fontWeight:700, color:scfg.color }}>{a.time}</span>
                      <span style={{ fontFamily:T.fH, fontSize:14.5, fontWeight:500, color:T.t, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", letterSpacing:"-0.01em" }}>
                        {displayName}
                      </span>
                      {a.isRecurring && (
                        <span style={{ display:"inline-flex", alignItems:"center", gap:2, padding:"1px 6px", borderRadius:9999, background:T.pA, color:T.p, fontSize:9, fontWeight:700, flexShrink:0 }}>
                          <Repeat size={8}/>Serie
                        </span>
                      )}
                    </div>
                    <div style={{ fontFamily:T.fB, fontSize:11, color:T.tl }}>
                      {a.type}{a.modality ? ` · ${a.modality === "presencial" ? "🏢" : "💻"}` : ""}
                    </div>
                  </div>

                  <button onClick={() => onOpenStatusModal(a)}
                    style={{ background:scfg.bg, border:"none", borderRadius:7, padding:"3px 9px", cursor:"pointer", fontSize:10, fontFamily:T.fB, color:scfg.color, fontWeight:600, whiteSpace:"nowrap", flexShrink:0 }}>
                    {scfg.label}
                  </button>
                  <button onClick={() => onConfirmDelete(a)}
                    style={{ background:"none", border:"none", color:T.tl, cursor:"pointer", padding:2, flexShrink:0 }}>
                    <Trash2 size={12}/>
                  </button>
                </div>

                {/* Banner solicitud de cambio */}
                {a.status === "solicitud_cambio" && (
                  <div style={{ display:"flex", alignItems:"flex-start", gap:8, padding:"8px 10px", borderRadius:8, background:T.errA, border:`1px solid ${T.err}40`, marginTop:2 }}>
                    <span style={{ fontSize:14, lineHeight:1 }}>🔔</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:T.fB, fontSize:11, fontWeight:700, color:T.err, marginBottom:a.patientNote ? 2 : 0 }}>
                        Paciente solicitó cambio de cita
                      </div>
                      {a.patientNote && (
                        <div style={{ fontFamily:T.fB, fontSize:11, color:T.tm, lineHeight:1.4 }}>"{a.patientNote}"</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Fila 2: acciones */}
                {!isDone && (
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    <PrimaryHoverBtn onClick={() => onOpenQuick(a)}
                      style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 11px", borderRadius:7, border:`1.5px solid ${T.p}`, background:T.pA, color:T.p, fontFamily:T.fB, fontSize:11, fontWeight:600, cursor:"pointer" }}>
                      <FileText size={11}/> Abrir
                    </PrimaryHoverBtn>

                    {isPendienteHoy && (
                      <SuccessHoverBtn onClick={() => handleStartSession(a)}
                        style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 11px", borderRadius:7, border:`1.5px solid ${T.suc}`, background:T.sucA, color:T.suc, fontFamily:T.fB, fontSize:11, fontWeight:600, cursor:"pointer" }}>
                        <Play size={10}/> Iniciar sesión
                      </SuccessHoverBtn>
                    )}

                    {a.reminderSent ? (
                      <div style={{ display:"flex", alignItems:"center", gap:4, padding:"5px 10px", borderRadius:7, border:"1.5px solid #25D36640", background:"#25D36615", color:"#25D366", fontFamily:T.fB, fontSize:11, fontWeight:600 }}>
                        <Check size={10}/> Enviado
                      </div>
                    ) : url ? (
                      <a href={url} target="_blank" rel="noreferrer"
                        onClick={() => markReminderSent(a.id)}
                        style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 10px", borderRadius:7, border:"1.5px solid #25D366", background:"#25D36618", color:"#25D366", fontFamily:T.fB, fontSize:11, fontWeight:600, cursor:"pointer", textDecoration:"none", transition:"all .13s" }}>
                        <MessageCircle size={11}/> Recordatorio
                      </a>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}

          {/* Día vacío */}
          {dayAppts.length === 0 && (
            <div style={{ position:"absolute", top:HOUR_H * 2, left:52, right:8 }}>
              <div style={{ display:"flex", alignItems:"center", gap:14, padding:"16px 18px", borderRadius:12, background:T.cardAlt, border:`1px solid ${T.bdrL}` }}>
                <div style={{ width:36, height:36, borderRadius:10, background:T.pA, border:`1px solid ${T.p}18`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <Calendar size={16} color={T.p} strokeWidth={1.8}/>
                </div>
                <div>
                  <div style={{ fontFamily:T.fB, fontSize:13, fontWeight:600, color:T.t }}>Día libre</div>
                  <div style={{ fontFamily:T.fB, fontSize:11.5, color:T.tl, marginTop:1 }}>Sin citas programadas — haz clic en cualquier franja para agendar</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// ── DeleteConfirm ─────────────────────────────────────────────────────────────
function DeleteConfirm({ appt, onDeleteOne, onDeleteAll, onCancel }) {
  if (!appt) return null;
  return (
    <PageView open={!!appt} onClose={onCancel} title="Eliminar cita" backLabel="Agenda" maxWidth={460}>
      <div style={{ fontFamily:T.fB, fontSize:13.5, color:T.t, marginBottom:20, lineHeight:1.6 }}>
        <strong>{appt.patientName?.split(" ").slice(0,2).join(" ")}</strong> — {fmtDate(appt.date)} · {appt.time}
        {appt.isRecurring && (
          <div style={{ marginTop:10, padding:"10px 14px", background:T.warA, borderRadius:10, color:T.war, fontSize:13, fontWeight:500 }}>
            Esta cita forma parte de una serie recurrente.
          </div>
        )}
      </div>
      <div style={{ display:"flex", gap:8, flexDirection:"column" }}>
        <Btn onClick={onDeleteOne}>Eliminar solo esta cita</Btn>
        {appt.isRecurring && <Btn variant="danger" onClick={onDeleteAll}>Eliminar toda la serie</Btn>}
        </div>
    </PageView>
  );
}

// ── Agenda (export default) ───────────────────────────────────────────────────
export default function Agenda({
  appointments = [], setAppointments,
  sessions = [],     setSessions,
  patients = [],     setPatients,
  profile,
  autoOpen,
  services = [],
  onNavigate,
  riskAssessments = [], scaleResults = [], treatmentPlans = [],
  interSessions = [], taskAssignments = [],
  onPrimerContacto,
  onStartSession,
}) {
  const ag = useAgenda({
    appointments, setAppointments,
    sessions,     setSessions,
    patients,     setPatients,
    profile, autoOpen, services, onNavigate, onStartSession,
  });

  // ── ViewToggle ──────────────────────────────────────────────────────────
  const ViewToggle = () => (
    <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
      <div style={{ display:"flex", background:T.bdrL, borderRadius:10, padding:3, gap:2 }}>
        {[
          { id:"month",  icon:LayoutGrid,   tip:"Mes"    },
          { id:"week",   icon:List,         tip:"Semana" },
          { id:"day",    icon:CalendarDays, tip:"Día"    },
        ].map(v => (
          <button key={v.id} onClick={() => ag.setView(v.id)} title={v.tip}
            style={{
              background:ag.view===v.id ? T.card : "transparent",
              border:"none", borderRadius:8, padding:"6px 12px", cursor:"pointer",
              color:ag.view===v.id ? T.p : T.tl, transition:"all .15s",
              boxShadow:ag.view===v.id ? "0 1px 6px rgba(0,0,0,0.08)" : "none",
              fontFamily:T.fB, fontSize:12, fontWeight:600,
              display:"flex", alignItems:"center", gap:5,
            }}>
            <v.icon size={13} strokeWidth={ag.view===v.id ? 2.2 : 1.8}/>
            {!ag.isMobile && v.tip}
          </button>
        ))}
      </div>
      {onPrimerContacto && (
        <Btn variant="ghost" onClick={onPrimerContacto} title="Nuevo paciente con pre-cita">
          <Plus size={14}/> {!ag.isMobile && "Nuevo paciente"}
        </Btn>
      )}
      <Btn onClick={() => ag.setShowAdd(true)}>
        <Plus size={14}/> Nueva cita
      </Btn>
    </div>
  );

  return (
    <div style={{ maxWidth: ag.isWide ? "none" : 960, paddingBottom:40 }}>

      <PageHeader
        title="Agenda"
        subtitle={`${appointments.length} cita${appointments.length!==1?"s":""} registrada${appointments.length!==1?"s":""}${ag.recurringCount > 0 ? ` · ${ag.recurringCount} serie${ag.recurringCount!==1?"s":""} recurrente${ag.recurringCount!==1?"s":""}` : ""}`}
        action={<ViewToggle/>}
        isMobile={ag.isMobile}
      />

      <StatStrip
        appointments={appointments}
        todayStr={ag.todayStr}
        recurringCount={ag.recurringCount}
        isMobile={ag.isMobile}
      />

      {/* ── Vista Semana ──────────────────────────────────────────────── */}
      {ag.view === "week" && (
        <FadeUp delay={0.06}>
          <Card style={{ padding:ag.isMobile ? "16px 18px" : "20px 24px" }}>
            <WeeklyView
              appointments={appointments}
              weekAnchor={ag.weekAnchor}
              setWeekAnchor={ag.setWeekAnchor}
              onOpenQuick={ag.handleOpenAppt}
              today={ag.todayStr}
              profile={profile}
            />
          </Card>
        </FadeUp>
      )}

      {/* ── Vista Día ─────────────────────────────────────────────────── */}
      {ag.view === "day" && (
        <FadeUp delay={0.06}>
          <DayView
            appointments={appointments}
            selectedDayView={ag.selectedDayView}
            setSelectedDayView={ag.setSelectedDayView}
            onOpenQuick={ag.handleOpenAppt}
            onOpenStatusModal={ag.openStatusModal}
            onConfirmDelete={ag.confirmDelete}
            onNewAppt={ag.openAddWithPreset}
            patients={patients}
            profile={profile}
            markReminderSent={ag.markReminderSent}
            today={ag.todayStr}
            onStartSession={ag.handleStartSessionLocal}
            isMobile={ag.isMobile}
          />
        </FadeUp>
      )}

      {/* ── Vista Mes ─────────────────────────────────────────────────── */}
      {ag.view === "month" && (
        <FadeUp delay={0.06}>
          <div style={{ display:"grid", gridTemplateColumns:ag.isMobile ? "1fr" : "1fr minmax(0,320px)", gap:14 }}>

            {/* Calendario */}
            <Card style={{ padding:0, overflow:"hidden" }}>
              <div style={{
                display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:"18px 22px",
                borderBottom:ag.calCollapsed ? "none" : `1px solid ${T.bdrL}`,
              }}>
                <button onClick={() => ag.setCurrent(d => new Date(d.getFullYear(), d.getMonth()-1, 1))}
                  style={{ width:30, height:30, background:T.bdrL, border:"none", borderRadius:8, cursor:"pointer", color:T.tm, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <ChevronLeft size={14}/>
                </button>

                <button onClick={() => ag.isMobile && ag.setCalCollapsed(c => !c)}
                  style={{ display:"flex", alignItems:"center", gap:8, background:"none", border:"none", cursor:ag.isMobile ? "pointer" : "default" }}>
                  <span style={{ fontFamily:T.fH, fontSize:22, fontWeight:500, color:T.t, letterSpacing:"-0.02em" }}>
                    {MONTHS_ES[ag.month]} {ag.year}
                  </span>
                  {ag.isMobile && (
                    <ChevronRight size={14} color={T.tl}
                      style={{ transform:ag.calCollapsed ? "rotate(90deg)" : "rotate(-90deg)", transition:"transform .2s" }}/>
                  )}
                </button>

                <button onClick={() => ag.setCurrent(d => new Date(d.getFullYear(), d.getMonth()+1, 1))}
                  style={{ width:30, height:30, background:T.bdrL, border:"none", borderRadius:8, cursor:"pointer", color:T.tm, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <ChevronRight size={14}/>
                </button>
              </div>

              <div style={{ display:ag.calCollapsed ? "none" : "block", padding:"14px 20px 18px" }}>
                {/* Días de la semana */}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4, marginBottom:5 }}>
                  {DAYS_ES.map(d => (
                    <div key={d} style={{ textAlign:"center", fontSize:10, fontWeight:700, color:T.tl, fontFamily:T.fB, letterSpacing:"0.07em", padding:"5px 0" }}>
                      {d}
                    </div>
                  ))}
                </div>

                {/* Celdas */}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4 }}>
                  {ag.cells.map((d, i) => {
                    if (!d) return <div key={i}/>;
                    const dateStr = `${ag.monthStr}-${d}`;
                    const isToday = dateStr === ag.todayStr;
                    const isSel   = d === ag.selectedDay;
                    const appts   = ag.apptsByDay[d];
                    return (
                      <div key={i}
                        onClick={() => { ag.setSelectedDay(isSel ? null : d); ag.setSelectedDayView(dateStr); }}
                        style={{
                          textAlign:"center", padding:"8px 4px", borderRadius:10, cursor:"pointer",
                          background:isSel ? T.p : isToday ? T.pA : "transparent",
                          color:isSel ? "#fff" : isToday ? T.p : T.t,
                          fontFamily:T.fB, fontSize:13.5,
                          fontWeight:isToday||isSel ? 600 : 400,
                          transition:"all .12s", position:"relative",
                        }}>
                        {d}
                        {appts && (
                          <div style={{ position:"absolute", bottom:3, left:"50%", transform:"translateX(-50%)", display:"flex", gap:2 }}>
                            {appts.slice(0,3).map((a,j) => (
                              <div key={j} style={{ width:4, height:4, borderRadius:"50%", background:isSel ? "rgba(255,255,255,0.7)" : a.isRecurring ? T.p : T.acc }}/>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                {ag.recurringCount > 0 && (
                  <div style={{ marginTop:16, display:"flex", gap:14, paddingTop:12, borderTop:`1px solid ${T.bdrL}` }}>
                    <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                      <div style={{ width:8, height:8, borderRadius:"50%", background:T.acc }}/>
                      <span style={{ fontFamily:T.fB, fontSize:11, color:T.tl }}>Cita única</span>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                      <div style={{ width:8, height:8, borderRadius:"50%", background:T.p }}/>
                      <span style={{ fontFamily:T.fB, fontSize:11, color:T.tl }}>Recurrente</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Detalle del día seleccionado */}
              {ag.selectedDay && (
                <div style={{ padding:"16px 20px 20px", borderTop:`1px solid ${T.bdrL}` }}>
                  <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", marginBottom:14 }}>
                    <h4 style={{ fontFamily:T.fH, fontSize:20, color:T.t, margin:0, letterSpacing:"-0.01em" }}>
                      {parseInt(ag.selectedDay)} de {MONTHS_ES[ag.month]}
                    </h4>
                    {ag.dayAppts.length > 0 && (
                      <span style={{ fontFamily:T.fB, fontSize:11, color:T.tl }}>
                        {ag.dayAppts.length} cita{ag.dayAppts.length!==1?"s":""}
                      </span>
                    )}
                  </div>

                  {ag.dayAppts.length === 0 ? (
                    <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:10, background:T.cardAlt, border:`1px solid ${T.bdrL}` }}>
                      <div style={{ width:32, height:32, borderRadius:8, background:T.pA, border:`1px solid ${T.p}18`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <Calendar size={14} color={T.p} strokeWidth={1.8}/>
                      </div>
                      <div>
                        <div style={{ fontFamily:T.fB, fontSize:13, fontWeight:600, color:T.t }}>Día libre</div>
                        <div style={{ fontFamily:T.fB, fontSize:11, color:T.tl, marginTop:1 }}>Sin citas programadas</div>
                      </div>
                    </div>
                  ) : ag.dayAppts.map(a => {
                    const scfg = STATUS_CONFIG[a.status] || STATUS_CONFIG.pendiente;
                    const isDone = a.status === "completada";
                    return (
                      <div key={a.id} style={{
                        padding:"12px 14px", borderRadius:12, background:T.cardAlt,
                        marginBottom:8, border:`1px solid ${T.bdrL}`,
                        borderLeft:`4px solid ${scfg.color}`,
                        opacity:isDone ? 0.6 : 1,
                      }}>
                        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:isDone ? 0 : 10 }}>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontFamily:T.fH, fontSize:14.5, fontWeight:500, color:T.t, display:"flex", alignItems:"center", gap:6, letterSpacing:"-0.01em" }}>
                              {a.patientName.split(" ").slice(0,2).join(" ")}
                              {a.isRecurring && (
                                <span style={{ display:"inline-flex", alignItems:"center", gap:3, padding:"1px 7px", borderRadius:9999, background:T.pA, color:T.p, fontSize:9, fontWeight:700 }}>
                                  <Repeat size={8}/>Serie
                                </span>
                              )}
                            </div>
                            <div style={{ fontFamily:T.fB, fontSize:11, color:T.tl, display:"flex", alignItems:"center", gap:4, flexWrap:"wrap", marginTop:2 }}>
                              <span style={{ fontFamily:T.fB, fontSize:11, fontWeight:700, color:isDone ? T.tl : T.p }}>{a.time}</span>
                              · {a.type}
                              {a.type === "Seguimiento post-alta" && (
                                <span style={{ padding:"1px 6px", borderRadius:9999, background:AZUL_A, color:AZUL, fontSize:9, fontWeight:700 }}>
                                  {a.followUpMonth ? `${a.followUpMonth}m` : "Post-alta"}
                                </span>
                              )}
                            </div>
                          </div>
                          <button onClick={() => ag.openStatusModal(a)} style={{
                            background:scfg.bg, border:"none", borderRadius:8, padding:"3px 10px",
                            cursor:"pointer", fontSize:10, fontFamily:T.fB, color:scfg.color,
                            fontWeight:600, maxWidth:140, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
                          }}>
                            {scfg.label}
                          </button>
                          <button onClick={() => ag.confirmDelete(a)} style={{ background:"none", border:"none", color:T.tl, cursor:"pointer", padding:2 }}>
                            <Trash2 size={13}/>
                          </button>
                        </div>
                        {!isDone && (
                          <div style={{ display:"flex", gap:8 }}>
                            <PrimaryHoverBtn onClick={() => ag.handleOpenAppt(a)}
                              style={{ flex:1, display:"flex", alignItems:"center", gap:6, padding:"7px 12px", borderRadius:8, border:`1.5px solid ${T.p}`, background:T.pA, color:T.p, fontFamily:T.fB, fontSize:12, fontWeight:600, cursor:"pointer", justifyContent:"center" }}>
                              <FileText size={12}/> Abrir
                            </PrimaryHoverBtn>

                            {a.reminderSent ? (
                              <div style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 12px", borderRadius:8, border:"1.5px solid #25D36640", background:"#25D36615", color:"#25D366", fontFamily:T.fB, fontSize:12, fontWeight:600 }}>
                                <Check size={12}/> Recordatorio enviado
                              </div>
                            ) : (() => {
                              const pt  = patients.find(p => p.id === a.patientId);
                              const url = whatsappReminder(a, pt, profile);
                              return url ? (
                                <a href={url} target="_blank" rel="noreferrer"
                                  onClick={() => ag.markReminderSent(a.id)}
                                  style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 12px", borderRadius:8, border:"1.5px solid #25D366", background:"#25D36618", color:"#25D366", fontFamily:T.fB, fontSize:12, fontWeight:600, cursor:"pointer", textDecoration:"none", transition:"all .13s" }}>
                                  <MessageCircle size={12}/> Recordatorio
                                </a>
                              ) : null;
                            })()}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Panel derecho — Próximas citas */}
            <Card style={{ padding:0, overflow:"hidden", alignSelf:"start" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 20px 14px" }}>
                <SectionLabel text="Próximas citas" icon={Calendar} color={T.p}/>
                <SeeAll label="Ver agenda" onClick={() => ag.setView("day")}/>
              </div>

              {ag.upcomingAppts.length === 0 ? (
                <div style={{ padding:"24px 20px", textAlign:"center" }}>
                  <div style={{ width:40, height:40, borderRadius:11, background:T.pA, border:`1px solid ${T.p}18`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px" }}>
                    <Calendar size={18} color={T.p} strokeWidth={1.8}/>
                  </div>
                  <div style={{ fontFamily:T.fH, fontSize:18, color:T.t, marginBottom:4 }}>Sin citas próximas</div>
                  <div style={{ fontFamily:T.fB, fontSize:12, color:T.tl }}>No hay consultas programadas</div>
                </div>
              ) : (() => {
                const groups = [];
                let lastDate = null;
                ag.upcomingAppts.forEach(a => {
                  if (a.date !== lastDate) { groups.push({ date:a.date, appts:[a] }); lastDate = a.date; }
                  else groups[groups.length - 1].appts.push(a);
                });
                return (
                  <div style={{ padding:"0 16px 16px" }}>
                    {groups.map(g => {
                      const isGToday = g.date === ag.todayStr;
                      const dayNum   = parseInt(g.date.split("-")[2]);
                      const monIdx   = parseInt(g.date.split("-")[1]) - 1;
                      const label    = isGToday ? "Hoy" : `${dayNum} ${MONTHS_ES[monIdx].slice(0,3)}`;
                      return (
                        <div key={g.date} style={{ marginBottom:14 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                            <span style={{ fontFamily:T.fB, fontSize:10, fontWeight:800, color:isGToday ? T.p : T.tl, textTransform:"uppercase", letterSpacing:"0.08em" }}>
                              {label}
                            </span>
                            <div style={{ flex:1, height:1, background:T.bdrL }}/>
                          </div>

                          {g.appts.map(a => {
                            const pt   = patients.find(p => p.id === a.patientId);
                            const url  = a.status !== "completada" && !a.reminderSent ? whatsappReminder(a, pt, profile) : null;
                            const isDone = a.status === "completada";
                            return (
                              <div key={a.id}
                                style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 12px", borderRadius:10, marginBottom:6, background:isDone ? T.cardAlt : T.card, border:`1px solid ${T.bdrL}`, opacity:isDone ? 0.6 : 1 }}>
                                <Avatar name={a.patientName} size={30} color={isDone ? T.tl : T.p} bg={isDone ? T.bdrL : T.pA}/>
                                <div style={{ flex:1, minWidth:0 }}>
                                  <div style={{ fontFamily:T.fH, fontSize:14, fontWeight:500, color:T.t, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", letterSpacing:"-0.01em" }}>
                                    {a.patientName.split(" ").slice(0,2).join(" ")}
                                  </div>
                                  <div style={{ fontFamily:T.fB, fontSize:10.5, color:T.tl, marginTop:1 }}>{a.type}</div>
                                </div>
                                <div style={{ display:"flex", gap:4, flexShrink:0, alignItems:"center" }}>
                                  <span style={{ fontFamily:T.fB, fontSize:12.5, fontWeight:700, color:isDone ? T.tl : T.p, width:38, textAlign:"right" }}>
                                    {a.time}
                                  </span>
                                  {!isDone && (
                                    <PrimaryHoverBtn onClick={() => ag.handleOpenAppt(a)} title="Abrir sesión"
                                      style={{ display:"flex", alignItems:"center", gap:4, padding:"4px 8px", borderRadius:7, border:`1px solid ${T.p}`, background:T.pA, color:T.p, fontFamily:T.fB, fontSize:11, fontWeight:600, cursor:"pointer" }}>
                                      <FileText size={11}/> Abrir
                                    </PrimaryHoverBtn>
                                  )}
                                  {a.reminderSent ? (
                                    <div title="Recordatorio enviado"
                                      style={{ display:"flex", alignItems:"center", padding:"4px 7px", borderRadius:7, border:"1px solid #25D36640", background:"#25D36615", color:"#25D366" }}>
                                      <Check size={12}/>
                                    </div>
                                  ) : url ? (
                                    <a href={url} target="_blank" rel="noreferrer" title="Recordatorio WhatsApp"
                                      onClick={() => ag.markReminderSent(a.id)}
                                      style={{ display:"flex", alignItems:"center", padding:"4px 7px", borderRadius:7, border:"1px solid #25D36640", background:"#25D36615", color:"#25D366", textDecoration:"none", transition:"all .13s" }}>
                                      <MessageCircle size={12}/>
                                    </a>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </Card>
          </div>
        </FadeUp>
      )}

      {/* ── Modal nueva cita ──────────────────────────────────────────── */}
      <PageView open={ag.showAdd} onClose={ag.closeAddModal} title="Nueva cita" backLabel="Agenda" maxWidth={580}>

        {/* Segmented control */}
        <div style={{ display:"flex", background:T.bdrL, borderRadius:10, padding:3, marginBottom:16 }}>
          {[{v:false, label:"Paciente existente"}, {v:true, label:"✦ Nuevo paciente"}].map(({v, label}) => (
            <button key={String(v)}
              onClick={() => { ag.setNewPtMode(v); if (v) ag.fld("patientId")(""); }}
              style={{ flex:1, padding:"7px 8px", borderRadius:8, border:"none", cursor:"pointer", fontFamily:T.fB, fontSize:12.5, fontWeight:600, transition:"all .15s",
                background:ag.newPtMode === v ? (v ? T.acc : T.card) : "transparent",
                color:ag.newPtMode === v ? (v ? "#fff" : T.p) : T.tl,
                boxShadow:ag.newPtMode === v ? "0 1px 4px rgba(0,0,0,0.10)" : "none" }}>
              {label}
            </button>
          ))}
        </div>

        {!ag.newPtMode && (
          <Select label="Paciente *" value={ag.form.patientId} onChange={ag.fld("patientId")}
            options={[{value:"",label:"Seleccionar paciente..."}, ...patients.map(p => ({value:p.id, label:p.name}))]}/>
        )}

        {ag.newPtMode && (
          <div style={{ marginBottom:16, padding:"16px", background:T.pA, borderRadius:14, border:`1.5px solid ${T.p}33`, display:"flex", flexDirection:"column", gap:4, boxShadow:`0 2px 12px ${T.p}14` }}>
            <Input label="Nombre *" value={ag.quickPt.name} onChange={v => ag.setQuickPt(q => ({...q, name:v}))} placeholder="Nombre completo del paciente"/>
            <Input label="Teléfono" value={ag.quickPt.phone} onChange={v => ag.setQuickPt(q => ({...q, phone:v}))} placeholder="10 dígitos"/>
            <Input label="Motivo de consulta" value={ag.quickPt.reason} onChange={v => ag.setQuickPt(q => ({...q, reason:v}))} placeholder="Opcional"/>
            <Btn onClick={ag.handleCreateAndSchedule} disabled={!ag.quickPt.name.trim()} style={{ width:"100%", marginTop:8, transition:"opacity .2s" }}>
              Crear y agendar
            </Btn>
          </div>
        )}

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:ag.dateError ? 4 : 16 }}>
          <div>
            <label style={{ display:"block", fontSize:12, fontWeight:600, color:T.tm, marginBottom:6, letterSpacing:"0.06em", textTransform:"uppercase" }}>Fecha *</label>
            <input type="date" value={ag.form.date} onChange={e => ag.handleDateChange(e.target.value)}
              style={{ width:"100%", padding:"10px 14px", border:`1.5px solid ${ag.dateError ? T.err : T.bdr}`, borderRadius:10, fontFamily:T.fB, fontSize:14, color:T.t, background:T.card, outline:"none", boxSizing:"border-box" }}/>
          </div>
          <div>
            <label style={{ display:"block", fontSize:12, fontWeight:600, color:T.tm, marginBottom:6, letterSpacing:"0.06em", textTransform:"uppercase" }}>Hora</label>
            <select value={ag.form.time} onChange={e => ag.handleTimeChange(e.target.value)}
              style={{ width:"100%", padding:"10px 14px", border:`1.5px solid ${ag.conflictError ? T.err : T.bdr}`, borderRadius:10, fontFamily:T.fB, fontSize:14, color:T.t, background:T.card, outline:"none", boxSizing:"border-box", appearance:"none", WebkitAppearance:"none", cursor:"pointer" }}>
              {ag.timeSlots.map(slot => <option key={slot} value={slot}>{slot}</option>)}
            </select>
          </div>
        </div>

        {ag.dateError && (
          <div style={{ marginBottom:14, padding:"8px 12px", background:T.errA, borderRadius:8, fontFamily:T.fB, fontSize:12, color:T.err, lineHeight:1.5 }}>{ag.dateError}</div>
        )}
        {ag.conflictError && (
          <div style={{ marginBottom:14, padding:"8px 12px", background:T.errA, borderRadius:8, fontFamily:T.fB, fontSize:12, color:T.err, lineHeight:1.5, display:"flex", alignItems:"flex-start", gap:6 }}>
            <AlertTriangle size={13} style={{ flexShrink:0, marginTop:1 }}/>{ag.conflictError}
          </div>
        )}

        <Select label="Tipo de servicio" value={ag.form.type} onChange={ag.handleTypeChange}
          options={ag.appointmentTypeOptions.map(o => ({ value:o.label || o, label:o.label || o }))}/>

        {ag.showModalityPicker && (
          <div style={{ padding:"10px 14px", background:T.pA, borderRadius:10, marginBottom:8 }}>
            <div style={{ fontFamily:T.fB, fontSize:12, fontWeight:600, color:T.p, marginBottom:8 }}>¿Modalidad de la cita?</div>
            <div style={{ display:"flex", gap:8 }}>
              {[{mod:"presencial",icon:"🏢",label:"Presencial"},{mod:"virtual",icon:"💻",label:"Virtual"}].map(({mod,icon,label}) => {
                const sel = ag.form.modality === mod;
                return (
                  <button key={mod} onClick={() => { ag.setForm(f => ({ ...f, modality:mod })); ag.setShowModalityPicker(false); }}
                    style={{ flex:1, padding:"8px", borderRadius:9, cursor:"pointer", fontFamily:T.fB, fontSize:12, fontWeight:600, transition:"all .15s", border:`1.5px solid ${sel ? T.p : T.bdr}`, background:sel ? T.pA : T.card, color:sel ? T.p : T.t }}>
                    {icon} {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {ag.form.modality && !ag.showModalityPicker && (
          <div style={{ fontFamily:T.fB, fontSize:11, color:T.tm, marginTop:-6, marginBottom:8, paddingLeft:2 }}>
            {ag.form.modality === "presencial" ? "🏢 Presencial" : "💻 Virtual"}
            {" · "}
            <span style={{ color:T.p, cursor:"pointer", textDecoration:"underline" }} onClick={() => ag.setShowModalityPicker(true)}>Cambiar</span>
          </div>
        )}

        {/* Recurrencia */}
        <div style={{ border:`1.5px solid ${ag.recurring ? T.p : T.bdr}`, borderRadius:12, overflow:"hidden", marginBottom:16, transition:"border .15s" }}>
          <button onClick={() => ag.setRecurring(r => !r)}
            style={{ display:"flex", alignItems:"center", justifyContent:"space-between", width:"100%", padding:"11px 16px", background:ag.recurring ? T.pA : T.bdrL, border:"none", cursor:"pointer", fontFamily:T.fB, fontSize:13, fontWeight:600, color:ag.recurring ? T.p : T.tm, transition:"all .15s" }}>
            <span style={{ display:"flex", alignItems:"center", gap:7 }}>
              <Repeat size={14}/> Cita recurrente
              {ag.recurring && (
                <span style={{ padding:"1px 8px", borderRadius:9999, background:T.p, color:"#fff", fontSize:10, fontWeight:700 }}>
                  {ag.recOccurrences} citas · c/{ag.freqLabel[ag.recFrequency]}
                </span>
              )}
            </span>
            <span style={{ fontFamily:T.fB, fontSize:12, color:ag.recurring ? T.p : T.tl }}>{ag.recurring ? "Activado" : "Opcional"}</span>
          </button>

          {ag.recurring && (
            <div style={{ padding:"16px", background:T.card, borderTop:`1px solid ${T.bdrL}` }}>
              <div style={{ fontFamily:T.fB, fontSize:12, color:T.tm, marginBottom:14 }}>
                Se crearán <strong>{ag.recOccurrences}</strong> citas automáticamente a partir de la fecha seleccionada.
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div>
                  <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.tm, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:7 }}>Frecuencia</label>
                  <div style={{ display:"flex", gap:6 }}>
                    {[{ v:"semanal", l:"Semanal" }, { v:"quincenal", l:"Quincenal" }, { v:"mensual", l:"Mensual" }].map(({ v, l }) => {
                      const on = ag.recFrequency === v;
                      return (
                        <button key={v} onClick={() => ag.setRecFrequency(v)}
                          style={{ flex:1, padding:"8px 4px", border:`1.5px solid ${on ? T.p : T.bdr}`, borderRadius:9, background:on ? T.pA : "transparent", cursor:"pointer", fontFamily:T.fB, fontSize:11.5, fontWeight:on ? 700 : 400, color:on ? T.p : T.tm, transition:"all .13s", textAlign:"center" }}>
                          {l}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.tm, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:7 }}>Número de citas</label>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <button onClick={() => ag.setRecOccurrences(n => Math.max(2, n - 1))}
                      style={{ width:32, height:32, borderRadius:8, background:T.bdrL, border:"none", cursor:"pointer", fontFamily:T.fB, fontSize:16, color:T.tm, display:"flex", alignItems:"center", justifyContent:"center" }}>−</button>
                    <span style={{ fontFamily:T.fH, fontSize:22, color:T.t, minWidth:32, textAlign:"center", fontWeight:500 }}>{ag.recOccurrences}</span>
                    <button onClick={() => ag.setRecOccurrences(n => Math.min(52, n + 1))}
                      style={{ width:32, height:32, borderRadius:8, background:T.bdrL, border:"none", cursor:"pointer", fontFamily:T.fB, fontSize:16, color:T.tm, display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
                  </div>
                </div>
              </div>

              {ag.form.patientId && ag.form.date && (() => {
                const preview   = generateRecurring(ag.form, ag.recFrequency, Math.min(3, ag.recOccurrences), patients.find(p => p.id === ag.form.patientId));
                const remaining = ag.recOccurrences - preview.length;
                return (
                  <div style={{ marginTop:14, padding:"10px 14px", background:T.pA, borderRadius:10 }}>
                    <div style={{ fontFamily:T.fB, fontSize:11, fontWeight:700, color:T.p, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:7 }}>Vista previa</div>
                    {preview.map((a, i) => (
                      <div key={i} style={{ fontFamily:T.fB, fontSize:12, color:T.t, marginBottom:3 }}>
                        {i + 1}. {fmtDate(a.date)} · {a.time}
                      </div>
                    ))}
                    {remaining > 0 && <div style={{ fontFamily:T.fB, fontSize:12, color:T.tl, marginTop:3 }}>…y {remaining} cita{remaining!==1?"s":""} más</div>}
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <Btn onClick={ag.save} disabled={!ag.form.patientId || !ag.form.date}>
            <Check size={15}/> {ag.recurring ? `Crear ${ag.recOccurrences} citas` : "Guardar cita"}
          </Btn>
        </div>
      </PageView>

      {/* ── Página sesión rápida ───────────────────────────────────────── */}
      <PageView open={!!ag.quickSession} onClose={() => ag.setQuickSession(null)} title="Nota de sesión rápida" backLabel="Agenda" maxWidth={580}>
        {ag.quickSession && (
          <>
            <div style={{ padding:"12px 16px", background:T.pA, borderRadius:10, marginBottom:20, border:`1px solid ${T.p}20` }}>
              <div style={{ fontFamily:T.fH, fontSize:15, fontWeight:500, color:T.p, letterSpacing:"-0.01em" }}>
                {ag.quickSession.patientName?.split(" ").slice(0,2).join(" ")}
              </div>
              <div style={{ fontFamily:T.fB, fontSize:12, color:T.tm, marginTop:2 }}>
                {fmtDate(ag.quickSession.date)} · {ag.quickSession.time} · {ag.quickSession.type}
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:ag.isMobile ? "1fr" : "1fr 1fr 1fr", gap:12 }}>
              <Input label="Duración (min)" value={ag.sessionForm.duration} onChange={ag.sfld("duration")} type="number"/>
              <Select label="Progreso" value={ag.sessionForm.progress} onChange={ag.sfld("progress")}
                options={["excelente","bueno","moderado","bajo"].map(p => ({value:p,label:p}))}/>
              <Select label="Ánimo" value={ag.sessionForm.mood} onChange={ag.sfld("mood")}
                options={["bueno","moderado","bajo"].map(p => ({value:p,label:p}))}/>
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={{ display:"block", fontSize:12, fontWeight:600, color:T.tm, marginBottom:6, letterSpacing:"0.06em", textTransform:"uppercase" }}>Notas clínicas *</label>
              <textarea value={ag.sessionForm.notes} onChange={e => ag.sfld("notes")(e.target.value)} rows={4}
                placeholder="Describe el contenido de la sesión..."
                style={{ width:"100%", padding:"10px 14px", border:`1.5px solid ${T.bdr}`, borderRadius:10, fontFamily:T.fB, fontSize:14, color:T.t, background:T.card, outline:"none", resize:"vertical", boxSizing:"border-box" }}/>
            </div>
            <Input label="Etiquetas (separadas por coma)" value={ag.sessionForm.tags} onChange={ag.sfld("tags")} placeholder="TCC, ansiedad"/>
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <Btn onClick={ag.saveQuickSession} disabled={!ag.sessionForm.notes.trim()}><Check size={15}/> Guardar y completar cita</Btn>
            </div>
          </>
        )}
      </PageView>

      {/* ── Página eliminar ────────────────────────────────────────────── */}
      <DeleteConfirm appt={ag.deleteTarget} onDeleteOne={ag.deleteOne} onDeleteAll={ag.deleteAll} onCancel={() => ag.confirmDelete(null)}/>

      {/* ── Modal cambio de estado ────────────────────────────────────── */}
      <PageView open={!!ag.statusTarget} onClose={() => ag.setStatusTarget(null)} title="Estado de la cita" backLabel="Agenda" maxWidth={520}>
        {ag.statusTarget && (() => {
          const pt         = patients.find(p => p.id === ag.statusTarget.patientId);
          const cancelUrl  = ag.cancelWhatsAppUrl(ag.statusTarget);
          const isCancelled = ag.statusForm.status === "cancelada_paciente" || ag.statusForm.status === "cancelada_psicologa";
          const isNoShow   = ag.statusForm.status === "no_presentado";

          return (
            <>
              <div style={{ padding:"10px 14px", background:T.pA, borderRadius:10, marginBottom:16, border:`1px solid ${T.p}25`, fontFamily:T.fB }}>
                <div style={{ fontSize:14, fontWeight:600, color:T.p, fontFamily:T.fH, letterSpacing:"-0.01em" }}>
                  {ag.statusTarget.patientName?.split(" ").slice(0,2).join(" ")}
                </div>
                <div style={{ fontSize:12, color:T.tm, marginTop:2 }}>
                  {fmtDate(ag.statusTarget.date)} · {ag.statusTarget.time} · {ag.statusTarget.type}
                </div>
              </div>

              <div style={{ marginBottom:16 }}>
                <label style={{ display:"block", fontSize:10, fontWeight:800, color:T.tl, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>Estado</label>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                    const selected = ag.statusForm.status === key;
                    return (
                      <button key={key} onClick={() => ag.sfStatus("status")(key)}
                        style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", borderRadius:10, border:`1.5px solid ${selected ? cfg.color : T.bdr}`, background:selected ? cfg.bg : "transparent", cursor:"pointer", fontFamily:T.fB, fontSize:13, fontWeight:selected ? 700 : 400, color:selected ? cfg.color : T.t, transition:"all .13s", textAlign:"left" }}>
                        <div style={{ width:8, height:8, borderRadius:"50%", background:selected ? cfg.color : T.bdr, flexShrink:0 }}/>
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {(isCancelled || isNoShow) && (
                <div style={{ marginBottom:14 }}>
                  <label style={{ display:"block", fontSize:10, fontWeight:800, color:T.tl, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>
                    Motivo {isCancelled ? "de cancelación" : "de inasistencia"} (opcional)
                  </label>
                  <textarea value={ag.statusForm.motivo} onChange={e => ag.sfStatus("motivo")(e.target.value)}
                    rows={2} placeholder="Registra el motivo para el historial clínico..."
                    style={{ width:"100%", padding:"10px 14px", border:`1.5px solid ${T.bdr}`, borderRadius:10, fontFamily:T.fB, fontSize:13, color:T.t, background:T.card, outline:"none", resize:"vertical", boxSizing:"border-box" }}/>
                </div>
              )}

              {isCancelled && (
                <div style={{ marginBottom:14 }}>
                  <button onClick={() => ag.sfStatus("reagendar")(!ag.statusForm.reagendar)}
                    style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"10px 14px", borderRadius:10, border:`1.5px solid ${ag.statusForm.reagendar ? T.p : T.bdr}`, background:ag.statusForm.reagendar ? T.pA : "transparent", cursor:"pointer", fontFamily:T.fB, fontSize:13, color:ag.statusForm.reagendar ? T.p : T.t, fontWeight:ag.statusForm.reagendar ? 700 : 400, transition:"all .13s" }}>
                    <BookOpen size={14} color={ag.statusForm.reagendar ? T.p : T.tl}/>
                    Reagendar automáticamente
                    {ag.statusForm.reagendar && (
                      <span style={{ marginLeft:"auto", fontSize:10, background:T.p, color:"#fff", padding:"1px 7px", borderRadius:9999, fontWeight:700 }}>Activo</span>
                    )}
                  </button>

                  {ag.statusForm.reagendar && (
                    <div style={{ marginTop:10, padding:"12px 14px", background:T.cardAlt, borderRadius:10, border:`1px solid ${T.bdrL}`, display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                      <Input label="Nueva fecha" value={ag.statusForm.newDate} onChange={ag.sfStatus("newDate")} type="date"/>
                      <Input label="Nueva hora"  value={ag.statusForm.newTime} onChange={ag.sfStatus("newTime")} type="time"/>
                    </div>
                  )}
                </div>
              )}

              {isNoShow && (
                <div style={{ padding:"10px 14px", background:T.errA, border:`1px solid ${T.err}40`, borderRadius:10, marginBottom:14, fontFamily:T.fB, fontSize:12, color:T.err, display:"flex", gap:8 }}>
                  <AlertTriangle size={14} style={{ flexShrink:0, marginTop:1 }}/>
                  Quedará registrado en el historial del expediente y en las Estadísticas de tasa de asistencia.
                </div>
              )}

              <div style={{ display:"flex", gap:8, justifyContent:"space-between", alignItems:"center", flexWrap:"wrap" }}>
                {cancelUrl && (
                  <a href={cancelUrl} target="_blank" rel="noreferrer"
                    style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:9, border:"1.5px solid #25D36640", background:"#25D36615", color:"#25D366", fontFamily:T.fB, fontSize:12, fontWeight:600, textDecoration:"none" }}>
                    <MessageCircle size={13}/> Avisar al paciente
                  </a>
                )}
                <div style={{ display:"flex", gap:8, marginLeft:"auto" }}>
                  <Btn variant="ghost" onClick={() => ag.setStatusTarget(null)}>Cancelar</Btn>
                  <Btn onClick={ag.saveStatus} disabled={!ag.statusForm.status}>
                    <Check size={15}/> Guardar
                  </Btn>
                </div>
              </div>
            </>
          );
        })()}
      </PageView>

      {/* ── Modal DynamicSummary ──────────────────────────────────────── */}
      {ag.summaryTarget && (
        <DynamicSummary
          open={!!ag.summaryTarget}
          onClose={() => ag.setSummaryTarget(null)}
          onContinue={() => { ag.openQuickSession(ag.summaryTarget.appointment); ag.setSummaryTarget(null); }}
          patient={ag.summaryTarget.patient}
          appointment={ag.summaryTarget.appointment}
          sessions={sessions}
          taskAssignments={taskAssignments}
          scaleResults={scaleResults}
          riskAssessments={riskAssessments}
          treatmentPlans={treatmentPlans}
          interSessions={interSessions}
        />
      )}

      {/* ── Modal Protocolo de Admisión ───────────────────────────────── */}
      {ag.admisionTarget && (() => {
        const { appt, patient: pt } = ag.admisionTarget;
        const consentSigned  = pt?.consent?.signed;
        const canSendConsent = !consentSigned && pt?.phone;
        return (
          <PageView open={!!ag.admisionTarget} onClose={() => ag.setAdmisionTarget(null)} title="Protocolo de Admisión" backLabel="Agenda" maxWidth={540}>
            <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", background:T.pA, borderRadius:12, marginBottom:18, border:`1px solid ${T.p}25` }}>
              <Avatar name={pt?.name} size={38} color={T.p} bg={T.pA}/>
              <div>
                <div style={{ fontFamily:T.fH, fontSize:15, fontWeight:500, color:T.t, letterSpacing:"-0.01em" }}>
                  {pt?.name?.split(" ").slice(0,2).join(" ") || "Paciente"}
                </div>
                <div style={{ fontFamily:T.fB, fontSize:12, color:T.tm }}>
                  {fmtDate(appt.date)} · {appt.time} · {appt.type}
                </div>
              </div>
              <span style={{ marginLeft:"auto", padding:"3px 10px", borderRadius:9999, background:T.pA, color:T.p, fontFamily:T.fB, fontSize:10, fontWeight:700, border:`1px solid ${T.p}25` }}>
                Primera sesión
              </span>
            </div>

            <div style={{ padding:"12px 14px", borderRadius:10, marginBottom:14, background:consentSigned ? T.sucA : T.warA, border:`1.5px solid ${consentSigned ? T.suc+"50" : T.war+"60"}` }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:consentSigned ? 0 : 10 }}>
                <span style={{ fontSize:16 }}>{consentSigned ? "✅" : "⚠️"}</span>
                <span style={{ fontFamily:T.fB, fontSize:13, fontWeight:700, color:consentSigned ? T.suc : T.war }}>
                  {consentSigned ? "Consentimiento Informado firmado" : "Consentimiento pendiente de firma"}
                </span>
              </div>
              {!consentSigned && (
                <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                  <span style={{ fontFamily:T.fB, fontSize:12, color:T.war, lineHeight:1.5 }}>
                    Es recomendable obtener el CI antes de iniciar el proceso terapéutico.
                  </span>
                  {canSendConsent && (
                    <button type="button" onClick={() => { ag.setLinkError(false); void ag.handleSendConsentWhatsApp(pt); }}
                      style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"7px 14px", borderRadius:9, border:"1.5px solid #25D36660", background:"#25D36618", color:"#25D366", fontFamily:T.fB, fontSize:12, fontWeight:700, textDecoration:"none", whiteSpace:"nowrap" }}>
                      <MessageCircle size={13}/> Enviar por WhatsApp
                    </button>
                  )}
                  {ag.linkError && (
                    <div style={{ width:"100%", marginTop:6, padding:"6px 10px", borderRadius:8, background:T.errA, fontFamily:T.fB, fontSize:11, color:T.err, lineHeight:1.4 }}>
                      No se pudo generar el enlace seguro. Intenta de nuevo o verifica la conexión.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {onNavigate && (
                <AnamnesiHoverBtn
                  onClick={() => { ag.setAdmisionTarget(null); onNavigate("patients", pt, "anamnesis"); }}
                  style={{ display:"flex", alignItems:"center", gap:8, padding:"12px 16px", borderRadius:11, border:`1.5px solid ${T.bdr}`, background:T.cardAlt, fontFamily:T.fB, fontSize:13, fontWeight:600, color:T.t, cursor:"pointer", textAlign:"left", borderColor:T.bdr }}>
                  <BookOpen size={15} color={T.p}/>
                  <div>
                    <div>Ir a Anamnesis</div>
                    <div style={{ fontSize:11, fontWeight:400, color:T.tm, marginTop:1 }}>Completa el expediente antes de la sesión</div>
                  </div>
                </AnamnesiHoverBtn>
              )}
              <OpacityBtn
                onClick={() => { ag.openQuickSession(appt); ag.setAdmisionTarget(null); }}
                style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:7, padding:"12px 16px", borderRadius:11, border:"none", background:T.p, color:"#fff", fontFamily:T.fB, fontSize:13, fontWeight:700, cursor:"pointer", width:"100%" }}>
                <FileText size={14}/> Continuar a sesión
              </OpacityBtn>
            </div>
          </PageView>
        );
      })()}

      {/* ── Banner sugerencia siguiente cita ─────────────────────────── */}
      {ag.nextApptSuggestion && (
        <div style={{
          position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)",
          zIndex:9999, background:T.card,
          border:`1.5px solid ${T.p}`, borderRadius:18, padding:"18px 22px",
          boxShadow:"0 8px 36px rgba(0,0,0,0.13)",
          maxWidth:420, width:"calc(100% - 48px)",
          animation:"pc-agenda-up .25s cubic-bezier(0.22,1,0.36,1) both",
        }}>
          <div style={{ display:"flex", alignItems:"flex-start", gap:14, marginBottom:14 }}>
            <div style={{ width:38, height:38, borderRadius:10, background:T.pA, border:`1px solid ${T.p}18`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <CalendarDays size={17} color={T.p} strokeWidth={1.8}/>
            </div>
            <div>
              <div style={{ fontFamily:T.fH, fontSize:16, color:T.t, marginBottom:3, letterSpacing:"-0.01em" }}>
                ¿Agendar siguiente cita?
              </div>
              <div style={{ fontFamily:T.fB, fontSize:13, color:T.tm, lineHeight:1.5 }}>
                <strong style={{ color:T.t }}>
                  {ag.nextApptSuggestion.patientName.split(" ").slice(0,2).join(" ")}
                </strong>
                {" — "}
                {fmtDate(ag.nextApptSuggestion.date)} a las {ag.nextApptSuggestion.time}
              </div>
            </div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <Btn onClick={ag.confirmNextAppt} style={{ flex:1, justifyContent:"center" }}>
              <Check size={14}/> Confirmar
            </Btn>
            <Btn variant="ghost" onClick={() => ag.setNextApptSuggestion(null)} style={{ flex:1, justifyContent:"center" }}>
              Omitir
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}
