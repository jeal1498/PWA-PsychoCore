import { useState } from "react";
import { Check, CheckCircle, AlertCircle, Download, Upload, FileJson, Users, RefreshCw, HelpCircle, MessageCircle, Mail, ChevronDown, ChevronUp, FlaskConical, Plus, Trash2, DollarSign, Package } from "lucide-react";
import {
  SEED_PROFILE, SEED_PATIENTS, SEED_APPOINTMENTS, SEED_SESSIONS,
  SEED_PAYMENTS, SEED_RISK_ASSESSMENTS, SEED_SCALE_RESULTS,
  SEED_TREATMENT_PLANS, SEED_INTER_SESSIONS, SEED_MEDICATIONS,
} from "../devSeedData.js";
import { T } from "../theme.js";
import { Card, Input, Btn, PageHeader } from "../components/ui/index.jsx";
import { trialDaysLeft, hasActiveAccess } from "../lib/supabase.js";

// ── Tab: Perfil ───────────────────────────────────────────────────────────────
function ProfileTab({ profile, setProfile, googleUser, psychologist }) {
  const googleName  = googleUser?.user_metadata?.full_name || googleUser?.user_metadata?.name || "";
  const googleEmail = googleUser?.email || "";

  const [form, setForm] = useState(() => ({
    ...profile,
    name:  profile?.name  || googleName,
    email: profile?.email || googleEmail,
  }));
  const [saved, setSaved] = useState(false);
  const fld = k => v => setForm(f => ({ ...f, [k]: v }));

  const save = () => {
    const initials = form.name
      ? form.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
      : "PS";
    setProfile({ ...form, initials });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div style={{ maxWidth: 560 }}>
      <p style={{ fontFamily: T.fB, fontSize: 13.5, color: T.tm, marginBottom: 24, lineHeight: 1.6 }}>
        Tu perfil aparece en la barra lateral y se incluye en los reportes exportados.
      </p>

      <Card style={{ padding: 28 }}>
        {/* Avatar preview */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28, paddingBottom: 24, borderBottom: `1px solid ${T.bdrL}` }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: T.p, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontFamily: T.fH, fontSize: 26, color: "#fff", fontWeight: 600 }}>
              {form.name ? form.name.split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase() : "PS"}
            </span>
          </div>
          <div>
            <div style={{ fontFamily: T.fH, fontSize: 20, color: T.t, fontWeight: 500 }}>{form.name || "Tu nombre"}</div>
            <div style={{ fontFamily: T.fB, fontSize: 13, color: T.tm }}>{form.specialty || "Especialidad"}</div>
          </div>
        </div>

        {/* Campos en una columna — sin truncado */}
        <Input label="Nombre completo" value={form.name} onChange={fld("name")} placeholder="Dra. Ana López" />
        <Input label="Especialidad" value={form.specialty} onChange={fld("specialty")} placeholder="Psicóloga Clínica" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <Input label="Cédula profesional" value={form.cedula} onChange={fld("cedula")} placeholder="XXXXXXX" style={{ marginBottom: 0 }} />
          <Input label="Teléfono" value={form.phone} onChange={fld("phone")} placeholder="998-000-0000" style={{ marginBottom: 0 }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <Input label="RFC" value={form.rfc || ""} onChange={fld("rfc")} placeholder="LOAA800101XX0" style={{ marginBottom: 4 }} />
          <div style={{ fontFamily: "var(--fB, sans-serif)", fontSize: 11, color: T.tl, paddingLeft: 2 }}>Se incluye en los recibos de pago generados</div>
        </div>
        <Input label="Correo electrónico" value={form.email} onChange={fld("email")} placeholder="ana@consultorio.com" />
        <Input label="Nombre del consultorio" value={form.clinic} onChange={fld("clinic")} placeholder="Consultorio Integral" />

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24, gap: 10, alignItems: "center" }}>
          {saved && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: T.suc, fontFamily: T.fB, fontSize: 13 }}>
              <CheckCircle size={15} /> Guardado
            </div>
          )}
          <Btn onClick={save}><Check size={15} /> Guardar perfil</Btn>
        </div>
      </Card>

      {/* ── Estado de suscripción ─────────────────────────────────────── */}
      {psychologist && (
        <Card style={{ padding: 24, marginTop: 16 }}>
          <div style={{ fontFamily: T.fB, fontSize: 12, fontWeight: 700, color: T.tl, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 14 }}>
            Estado de suscripción
          </div>
          {psychologist.subscription_status === "active" ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: T.sucA, borderRadius: 10, border: `1px solid ${T.suc}30` }}>
              <CheckCircle size={18} color={T.suc}/>
              <div>
                <div style={{ fontFamily: T.fB, fontSize: 14, fontWeight: 600, color: T.suc }}>Suscripción activa</div>
                <div style={{ fontFamily: T.fB, fontSize: 12, color: T.tm }}>Acceso completo a todas las funcionalidades</div>
              </div>
            </div>
          ) : trialDaysLeft(psychologist) > 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: trialDaysLeft(psychologist) <= 3 ? T.errA : T.warA || "rgba(184,144,10,0.08)", borderRadius: 10, border: `1px solid ${trialDaysLeft(psychologist) <= 3 ? T.err : "#B8900A"}30` }}>
              <AlertCircle size={18} color={trialDaysLeft(psychologist) <= 3 ? T.err : "#B8900A"}/>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: T.fB, fontSize: 14, fontWeight: 600, color: trialDaysLeft(psychologist) <= 3 ? T.err : "#B8900A" }}>
                  Período de prueba · {trialDaysLeft(psychologist)} día{trialDaysLeft(psychologist) !== 1 ? "s" : ""} restante{trialDaysLeft(psychologist) !== 1 ? "s" : ""}
                </div>
                <div style={{ fontFamily: T.fB, fontSize: 12, color: T.tm }}>
                  Vence el {new Date(psychologist.trial_ends_at).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}
                </div>
              </div>
              <a href="mailto:soporte@psychocore.app?subject=Suscripción PsychoCore"
                style={{ padding: "7px 14px", borderRadius: 100, background: T.p, color: "#fff", fontFamily: T.fB, fontSize: 12, fontWeight: 700, textDecoration: "none", flexShrink: 0 }}>
                Suscribirme →
              </a>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: T.errA, borderRadius: 10, border: `1px solid ${T.err}30` }}>
              <AlertCircle size={18} color={T.err}/>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: T.fB, fontSize: 14, fontWeight: 600, color: T.err }}>Prueba gratuita expirada</div>
                <div style={{ fontFamily: T.fB, fontSize: 12, color: T.tm }}>Suscríbete para recuperar el acceso completo</div>
              </div>
              <a href="mailto:soporte@psychocore.app?subject=Suscripción PsychoCore"
                style={{ padding: "7px 14px", borderRadius: 100, background: T.err, color: "#fff", fontFamily: T.fB, fontSize: 12, fontWeight: 700, textDecoration: "none", flexShrink: 0 }}>
                Suscribirme →
              </a>
            </div>
          )}
        </Card>
      )}

      {/* ── Soporte ──────────────────────────────────────────────────────── */}
      <Card style={{ padding: 20, marginTop: 16, display:"flex", alignItems:"center", justifyContent:"space-between", gap:16, flexWrap:"wrap" }}>
        <div>
          <div style={{ fontFamily:T.fB, fontSize:13.5, fontWeight:600, color:T.t, marginBottom:3 }}>¿Necesitas ayuda?</div>
          <div style={{ fontFamily:T.fB, fontSize:12.5, color:T.tm }}>Escríbenos por WhatsApp, respondemos en minutos.</div>
        </div>
        <a href="https://wa.me/529831348558?text=Hola%2C%20necesito%20ayuda%20con%20PsychoCore"
          target="_blank" rel="noreferrer"
          style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 18px", borderRadius:100, background:"#25D366", color:"#fff", textDecoration:"none", fontFamily:T.fB, fontSize:13, fontWeight:700, flexShrink:0, transition:"all .15s" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="#fff"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
          Abrir WhatsApp
        </a>
      </Card>
    </div>
  );
}



// ── Tab: Datos ────────────────────────────────────────────────────────────────
function DataTab({ allData, onRestore, patients }) {
  const [msg,         setMsg]         = useState(null);
  const [importing,   setImporting]   = useState(false);

  const flash = (text, ok = true) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 4000);
  };

  // ── Exportar JSON completo ──────────────────────────────────────────────
  const exportJSON = () => {
    const blob = new Blob(
      [JSON.stringify({ ...allData, _meta: { ts: Date.now(), version: "1.0", app: "PsychoCore" } }, null, 2)],
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

  // ── Exportar pacientes como CSV ────────────────────────────────────────
  const exportCSV = () => {
    if (!patients?.length) { flash("No hay pacientes para exportar", false); return; }
    const headers = ["Nombre","Edad","Teléfono","Email","Diagnóstico","CIE-11","Motivo de consulta","Estatus","Tipo","Notas","Fecha de registro"];
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
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `psychocore-pacientes-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    flash(`${patients.length} pacientes exportados como CSV`);
  };

  // ── Importar JSON ──────────────────────────────────────────────────────
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
        flash(`Datos restaurados correctamente${data.patients?.length ? ` · ${data.patients.length} pacientes` : ""}`);
      } catch {
        flash("Error al leer el archivo. Verifica que sea un JSON válido.", false);
      } finally {
        setImporting(false);
      }
    };
    input.click();
  };

  const statItems = [
    { label: "Pacientes",       val: allData?.patients?.length        || 0, icon: "🧑‍⚕️" },
    { label: "Sesiones",        val: allData?.sessions?.length        || 0, icon: "📝" },
    { label: "Citas",           val: allData?.appointments?.length    || 0, icon: "📅" },
    { label: "Pagos",           val: allData?.payments?.length        || 0, icon: "💰" },
    { label: "Evaluaciones",    val: allData?.riskAssessments?.length || 0, icon: "⚠️" },
    { label: "Planes",          val: allData?.treatmentPlans?.length  || 0, icon: "📋" },
  ];

  return (
    <div style={{ maxWidth: 560 }}>

      {/* Resumen de datos */}
      <Card style={{ padding: 24, marginBottom: 16 }}>
        <div style={{ fontFamily: T.fB, fontSize: 12, fontWeight: 700, color: T.tl, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 16 }}>
          Resumen de tu información
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {statItems.map(s => (
            <div key={s.label} style={{ background: T.pA, borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontFamily: T.fB, fontSize: 20, fontWeight: 700, color: T.p }}>{s.val}</div>
              <div style={{ fontFamily: T.fB, fontSize: 11, color: T.tm }}>{s.label}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Exportar */}
      <Card style={{ padding: 24, marginBottom: 16 }}>
        <div style={{ fontFamily: T.fB, fontSize: 13.5, fontWeight: 600, color: T.t, marginBottom: 4 }}>Exportar datos</div>
        <p style={{ fontFamily: T.fB, fontSize: 13, color: T.tm, lineHeight: 1.6, marginBottom: 16 }}>
          Descarga una copia completa de todos tus datos. Guárdala en un lugar seguro como respaldo adicional.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={exportJSON}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 10, border: `1.5px solid ${T.p}`, background: T.pA, color: T.p, fontFamily: T.fB, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all .15s" }}>
            <FileJson size={15}/> Backup completo (.json)
          </button>
          <button onClick={exportCSV}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 10, border: `1.5px solid ${T.bdr}`, background: "transparent", color: T.tm, fontFamily: T.fB, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all .15s" }}>
            <Users size={15}/> Solo pacientes (.csv)
          </button>
        </div>
      </Card>

      {/* Importar */}
      <Card style={{ padding: 24, marginBottom: 16 }}>
        <div style={{ fontFamily: T.fB, fontSize: 13.5, fontWeight: 600, color: T.t, marginBottom: 4 }}>Importar backup</div>
        <p style={{ fontFamily: T.fB, fontSize: 13, color: T.tm, lineHeight: 1.6, marginBottom: 4 }}>
          Restaura un backup previamente exportado desde PsychoCore.
        </p>
        <div style={{ padding: "10px 14px", background: T.errA, borderRadius: 8, fontFamily: T.fB, fontSize: 12, color: T.err, marginBottom: 16, lineHeight: 1.5 }}>
          ⚠️ Esta acción reemplaza tus datos actuales. Haz un backup antes de importar.
        </div>
        <button onClick={importJSON} disabled={importing}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 10, border: `1.5px solid ${T.bdr}`, background: "transparent", color: T.tm, fontFamily: T.fB, fontSize: 13, fontWeight: 600, cursor: importing ? "not-allowed" : "pointer", opacity: importing ? 0.6 : 1, transition: "all .15s" }}>
          {importing ? <RefreshCw size={15} style={{ animation: "spin .8s linear infinite" }}/> : <Upload size={15}/>}
          {importing ? "Importando…" : "Importar desde archivo .json"}
        </button>
      </Card>

      {/* ── Datos de prueba ────────────────────────────────────────── */}
      <Card style={{ padding: 24, marginBottom: 16, border:`1.5px dashed ${T.bdr}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
          <FlaskConical size={15} color={T.p}/>
          <div style={{ fontFamily: T.fB, fontSize: 13.5, fontWeight: 600, color: T.t }}>Datos de prueba</div>
          <span style={{ padding:"2px 8px", borderRadius:9999, background:T.warA, color:T.war, fontFamily:T.fB, fontSize:10, fontWeight:700 }}>SOLO DESARROLLO</span>
        </div>
        <p style={{ fontFamily: T.fB, fontSize: 13, color: T.tm, lineHeight: 1.6, marginBottom: 16 }}>
          Carga 8 pacientes ficticios con sesiones, citas y pagos de ejemplo para evaluar el diseño visual. Reemplaza los datos actuales.
        </p>
        <button onClick={() => {
          if (!confirm("¿Cargar datos de prueba? Esto reemplazará tus datos actuales.")) return;
          onRestore({
            profile:          SEED_PROFILE,
            patients:         SEED_PATIENTS,
            appointments:     SEED_APPOINTMENTS,
            sessions:         SEED_SESSIONS,
            payments:         SEED_PAYMENTS,
            riskAssessments:  SEED_RISK_ASSESSMENTS,
            scaleResults:     SEED_SCALE_RESULTS,
            treatmentPlans:   SEED_TREATMENT_PLANS,
            interSessions:    SEED_INTER_SESSIONS,
            medications:      SEED_MEDICATIONS,
          });
          flash("Datos de prueba cargados correctamente — ¡recarga la app!");
        }}
          style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 18px", borderRadius:10,
            border:`1.5px solid ${T.p}`, background:T.pA, color:T.p,
            fontFamily:T.fB, fontSize:13, fontWeight:600, cursor:"pointer" }}>
          <FlaskConical size={15}/> Cargar datos de prueba
        </button>
      </Card>

      {/* Flash message */}
      {msg && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderRadius: 10, background: msg.ok ? T.sucA : T.errA, border: `1px solid ${msg.ok ? T.suc : T.err}30`, fontFamily: T.fB, fontSize: 13, color: msg.ok ? T.suc : T.err }}>
          {msg.ok ? <CheckCircle size={15}/> : <AlertCircle size={15}/>}
          {msg.text}
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── Tab: Apariencia ───────────────────────────────────────────────────────────
function AppearanceTab({ darkMode, setDarkMode, patients, setPatients }) {
  const [csvMsg, setCsvMsg] = useState(null);

  const flashCsv = (text, ok = true) => {
    setCsvMsg({ text, ok });
    setTimeout(() => setCsvMsg(null), 4000);
  };

  // Toggle row
  const Toggle = ({ label, sub, value, onChange }) => (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 0", borderBottom:`1px solid ${T.bdrL}` }}>
      <div>
        <div style={{ fontFamily:T.fB, fontSize:14, fontWeight:500, color:T.t }}>{label}</div>
        {sub && <div style={{ fontFamily:T.fB, fontSize:12, color:T.tm, marginTop:2 }}>{sub}</div>}
      </div>
      <button
        onClick={() => onChange(!value)}
        style={{ width:44, height:24, borderRadius:99, border:"none", cursor:"pointer", padding:2,
          background: value ? T.p : T.bdrL, transition:"background .2s", position:"relative", flexShrink:0 }}>
        <div style={{ width:20, height:20, borderRadius:"50%", background:"#fff", position:"absolute",
          top:2, left: value ? 22 : 2, transition:"left .2s", boxShadow:"0 1px 4px rgba(0,0,0,0.2)" }}/>
      </button>
    </div>
  );

  // CSV import handler
  const handleCSV = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv";
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const lines = text.trim().split(/\r?\n/);
        if (lines.length < 2) { flashCsv("El archivo no tiene datos", false); return; }

        const header = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/[^a-záéíóúñ_]/gi, ""));
        const nameIdx  = header.findIndex(h => h.includes("nombre") || h === "name");
        const emailIdx = header.findIndex(h => h.includes("email") || h.includes("correo"));
        const phoneIdx = header.findIndex(h => h.includes("tel") || h.includes("phone") || h.includes("celular"));
        const bdIdx    = header.findIndex(h => h.includes("nacimiento") || h.includes("birthday") || h.includes("birth"));
        const dxIdx    = header.findIndex(h => h.includes("diagn"));
        const noteIdx  = header.findIndex(h => h.includes("nota") || h.includes("note") || h.includes("obs"));

        if (nameIdx === -1) { flashCsv("No se encontró columna 'nombre' en el CSV", false); return; }

        const parseRow = (line) => {
          const cols = [];
          let cur = "", inQ = false;
          for (const ch of line) {
            if (ch === '"') { inQ = !inQ; }
            else if (ch === "," && !inQ) { cols.push(cur.trim()); cur = ""; }
            else cur += ch;
          }
          cols.push(cur.trim());
          return cols;
        };

        const today = new Date().toISOString().split("T")[0];
        const newPats = lines.slice(1).filter(l => l.trim()).map(line => {
          const cols = parseRow(line);
          const get = i => (i >= 0 ? (cols[i] || "").replace(/^"|"$/g, "").trim() : "");
          return {
            id:          Math.random().toString(36).slice(2, 10),
            name:        get(nameIdx),
            email:       get(emailIdx),
            phone:       get(phoneIdx),
            birthdate:   get(bdIdx),
            diagnosis:   get(dxIdx),
            notes:       get(noteIdx),
            status:      "activo",
            type:        "individual",
            createdAt:   today,
            sessions:    [],
          };
        }).filter(p => p.name);

        if (newPats.length === 0) { flashCsv("No se encontraron pacientes válidos", false); return; }
        setPatients(prev => [...prev, ...newPats]);
        flashCsv(`${newPats.length} paciente${newPats.length !== 1 ? "s" : ""} importado${newPats.length !== 1 ? "s" : ""} correctamente`);
      } catch (err) {
        flashCsv("Error al leer el archivo CSV", false);
      }
    };
    input.click();
  };

  return (
    <div style={{ maxWidth: 560 }}>
      {/* Dark mode */}
      <Card style={{ padding:"20px 24px", marginBottom:20 }}>
        <div style={{ fontFamily:T.fB, fontSize:14, fontWeight:600, color:T.t, marginBottom:4 }}>Modo de apariencia</div>
        <div style={{ fontFamily:T.fB, fontSize:12, color:T.tm, marginBottom:14 }}>Por defecto sigue el sistema de tu dispositivo</div>
        <div style={{ display:"flex", gap:8 }}>
          {[
            { v:"auto",  label:"⚙️ Automático", sub:"Según el sistema" },
            { v:"light", label:"☀️ Claro",       sub:"Siempre claro"   },
            { v:"dark",  label:"🌙 Oscuro",       sub:"Siempre oscuro"  },
          ].map(({ v, label, sub }) => {
            const on = darkMode === v;
            return (
              <button key={v} onClick={() => setDarkMode(v)}
                style={{ flex:1, padding:"10px 8px", borderRadius:10, border:`2px solid ${on ? T.p : T.bdr}`,
                  background: on ? T.pA : "transparent", cursor:"pointer", transition:"all .13s", textAlign:"center" }}>
                <div style={{ fontFamily:T.fB, fontSize:13, fontWeight: on ? 700 : 500, color: on ? T.p : T.t }}>{label}</div>
                <div style={{ fontFamily:T.fB, fontSize:10, color:T.tl, marginTop:2 }}>{sub}</div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* CSV import */}
      <Card style={{ padding:24 }}>
        <h3 style={{ fontFamily:T.fH, fontSize:20, color:T.t, margin:"0 0 8px" }}>Importar desde CSV</h3>
        <p style={{ fontFamily:T.fB, fontSize:13, color:T.tm, marginBottom:16, lineHeight:1.65 }}>
          Migra pacientes desde otra herramienta. Columnas reconocidas: <strong>nombre</strong>, email, teléfono, fecha_nacimiento, diagnóstico, notas.
        </p>

        {/* Example table — solo 3 columnas relevantes */}
        <div style={{ background:T.cardAlt, borderRadius:10, padding:14, marginBottom:20 }}>
          <div style={{ fontFamily:T.fB, fontSize:11, fontWeight:700, color:T.tl, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:8 }}>Ejemplo de CSV</div>
          <table style={{ borderCollapse:"collapse", fontFamily:T.fB, fontSize:12, width:"100%", tableLayout:"fixed" }}>
            <thead>
              <tr>{["nombre","email","teléfono"].map(h => (
                <td key={h} style={{ padding:"6px 10px", background:T.p, color:"#fff", fontWeight:600 }}>{h}</td>
              ))}</tr>
            </thead>
            <tbody>
              <tr>{["Ana López","ana@mail.com","998-000-0001"].map((v,i) => (
                <td key={i} style={{ padding:"6px 10px", color:T.tm, borderBottom:`1px solid ${T.bdrL}`,
                  whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{v}</td>
              ))}</tr>
            </tbody>
          </table>
          <div style={{ fontFamily:T.fB, fontSize:11, color:T.tl, marginTop:8 }}>
            + fecha_nacimiento, diagnóstico, notas (opcionales)
          </div>
        </div>

        {csvMsg && (
          <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 14px", borderRadius:10,
            background: csvMsg.ok ? T.sucA : T.errA, marginBottom:16,
            fontFamily:T.fB, fontSize:13, color: csvMsg.ok ? T.suc : T.err }}>
            {csvMsg.ok ? "✓" : "✕"} {csvMsg.text}
          </div>
        )}

        <Btn onClick={handleCSV}>Seleccionar archivo CSV</Btn>
        <p style={{ fontFamily:T.fB, fontSize:11, color:T.tl, marginTop:10 }}>
          Los pacientes importados se agregan sin reemplazar los existentes. Puedes editar cada uno después de la importación.
        </p>
      </Card>
    </div>
  );
}


// ── Tab: Ayuda y Soporte ──────────────────────────────────────────────────────
const FAQ_ITEMS = [
  {
    q: "¿Cómo agrego un paciente nuevo?",
    a: "Ve al módulo Pacientes → botón «Nuevo paciente» en la esquina superior derecha. Llena los datos básicos y guarda. El paciente aparecerá disponible en Sesiones, Agenda y demás módulos inmediatamente.",
  },
  {
    q: "¿Cómo registro una sesión?",
    a: "Ve a Sesiones → «Nueva nota». Selecciona el paciente, elige el formato de nota (Libre, SOAP, DAP o BIRP), completa los campos y guarda. La nota queda vinculada al expediente del paciente.",
  },
  {
    q: "¿Cómo asigno una tarea a un paciente?",
    a: "Al guardar una sesión puedes seleccionar tareas terapéuticas desde el panel inferior del formulario. El paciente recibirá un enlace por WhatsApp para completarlas. También puedes asignarlas desde el módulo Tareas.",
  },
  {
    q: "¿Cómo agendo una cita?",
    a: "Ve a Agenda → «Nueva cita». Selecciona paciente, fecha, hora y tipo de consulta. Las citas próximas aparecerán en el Dashboard y en las notificaciones.",
  },
  {
    q: "¿Dónde veo los pagos pendientes?",
    a: "En el módulo Finanzas. Puedes registrar pagos, marcarlos como cobrados y ver el resumen mensual de ingresos.",
  },
  {
    q: "¿Cómo exporto un informe de un paciente?",
    a: "Ve a Informes, selecciona el paciente y el tipo de informe. Puedes generar el PDF directamente desde el navegador.",
  },
  {
    q: "¿Los datos están seguros?",
    a: "Sí. Toda la información se almacena en Supabase con autenticación por cuenta de Google. Solo tú tienes acceso a tus expedientes.",
  },
  {
    q: "¿Puedo usar PsychoCore en móvil?",
    a: "Sí, es una PWA. En Android puedes instalarla desde Chrome: menú → «Agregar a pantalla de inicio». Funciona como app nativa.",
  },
  {
    q: "¿Qué pasa si pierdo internet?",
    a: "La app requiere conexión para cargar y guardar datos. Sin internet verás los datos del último caché pero no podrás guardar cambios.",
  },
];

function FaqItem({ item }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: `1px solid ${T.bdrL}` }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between",
          gap:12, padding:"14px 0", background:"none", border:"none", cursor:"pointer",
          textAlign:"left" }}>
        <span style={{ fontFamily:T.fB, fontSize:13.5, fontWeight:600, color:T.t, lineHeight:1.4 }}>
          {item.q}
        </span>
        {open
          ? <ChevronUp size={16} color={T.p} style={{ flexShrink:0 }}/>
          : <ChevronDown size={16} color={T.tl} style={{ flexShrink:0 }}/>
        }
      </button>
      {open && (
        <div style={{ fontFamily:T.fB, fontSize:13, color:T.tm, lineHeight:1.7,
          paddingBottom:14, paddingRight:8 }}>
          {item.a}
        </div>
      )}
    </div>
  );
}

function HelpTab() {
  return (
    <div style={{ maxWidth:560 }}>

      {/* FAQ */}
      <div style={{ fontFamily:T.fB, fontSize:11, fontWeight:700, color:T.tl,
        textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:12,
        display:"flex", alignItems:"center", gap:6 }}>
        <HelpCircle size={13}/> Preguntas frecuentes
      </div>

      <Card style={{ padding:"0 20px", marginBottom:20 }}>
        {FAQ_ITEMS.map((item, i) => <FaqItem key={i} item={item}/>)}
      </Card>

      {/* Soporte */}
      <div style={{ fontFamily:T.fB, fontSize:11, fontWeight:700, color:T.tl,
        textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:12,
        display:"flex", alignItems:"center", gap:6 }}>
        <MessageCircle size={13}/> Contactar soporte
      </div>

      <Card style={{ padding:20, marginBottom:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ width:40, height:40, borderRadius:11, background:"rgba(37,211,102,0.12)",
            display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:T.fB, fontSize:13.5, fontWeight:600, color:T.t, marginBottom:2 }}>WhatsApp</div>
            <div style={{ fontFamily:T.fB, fontSize:12, color:T.tm }}>Respuesta en menos de 24 hrs</div>
          </div>
          <a href="https://wa.me/529831348558?text=Hola%2C%20necesito%20ayuda%20con%20PsychoCore"
            target="_blank" rel="noreferrer"
            style={{ padding:"8px 16px", borderRadius:100, background:"#25D366", color:"#fff",
              fontFamily:T.fB, fontSize:12.5, fontWeight:700, textDecoration:"none", flexShrink:0 }}>
            Escribir →
          </a>
        </div>
      </Card>

      <Card style={{ padding:20, marginBottom:20 }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ width:40, height:40, borderRadius:11, background:T.pA,
            display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <Mail size={18} color={T.p}/>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:T.fB, fontSize:13.5, fontWeight:600, color:T.t, marginBottom:2 }}>Correo electrónico</div>
            <div style={{ fontFamily:T.fB, fontSize:12, color:T.tm }}>soporte@psychocore.app</div>
          </div>
          <a href="mailto:soporte@psychocore.app?subject=Ayuda%20PsychoCore"
            style={{ padding:"8px 16px", borderRadius:100, background:T.pA, color:T.p,
              fontFamily:T.fB, fontSize:12.5, fontWeight:700, textDecoration:"none",
              border:`1.5px solid ${T.p}30`, flexShrink:0 }}>
            Escribir →
          </a>
        </div>
      </Card>

      {/* Tip */}
      <div style={{ display:"flex", gap:10, padding:"12px 16px", borderRadius:12,
        background:T.warA || "rgba(184,144,10,0.08)", border:"1px solid rgba(184,144,10,0.2)" }}>
        <span style={{ fontSize:16, flexShrink:0 }}>💡</span>
        <p style={{ fontFamily:T.fB, fontSize:12.5, color:T.tm, lineHeight:1.6, margin:0 }}>
          <strong style={{ color:T.t }}>Tip:</strong> Si encontraste un error, adjunta una captura de pantalla al escribirnos — nos ayuda a resolverlo mucho más rápido.
        </p>
      </div>

    </div>
  );
}

// ── Tab: Servicios ───────────────────────────────────────────────────────────
function ServicesTab({ services, setServices }) {
  const uid = () => Math.random().toString(36).slice(2, 9);
  const today = new Date().toISOString().slice(0, 10);

  const SERVICE_TYPES = {
    sesion:     { label: "Sesión individual",   short: "Sesión",    icon: "👤", desc: "Sesión de psicoterapia individual de 50 minutos" },
    evaluacion: { label: "Evaluación",          short: "Evaluación",icon: "📋", desc: "Evaluación neuropsicológica completa con reporte escrito" },
    pareja:     { label: "Terapia de pareja",   short: "Pareja",    icon: "👫", desc: "Sesión de terapia de pareja de 60 minutos" },
    grupo:      { label: "Grupo / Taller",      short: "Grupo",     icon: "👥", desc: "Sesión grupal o taller terapéutico" },
    paquete:    { label: "Paquete de sesiones", short: "Paquete",   icon: "📦", desc: "Paquete de sesiones con precio preferencial" },
    otro:       { label: "Otro",                short: "Otro",      icon: "⚡", desc: "" },
  };

  const MODALITIES = [
    { id: "presencial", label: "Presencial", icon: "🏢" },
    { id: "virtual",    label: "Virtual",    icon: "💻" },
    { id: "ambas",      label: "Ambas",      icon: "🔄" },
  ];

  // Paquetes sugeridos — se calculan según tarifa de sesión individual si existe
  const basePrice = services.find(s => s.type === "sesion")?.price || 900;
  const SUGGESTED_PACKAGES = [
    { sessions: 4,  label: "Paquete básico",     price: Math.round(basePrice * 4 * 0.9),  desc: "4 sesiones · 10% de descuento" },
    { sessions: 8,  label: "Paquete estándar",   price: Math.round(basePrice * 8 * 0.85), desc: "8 sesiones · 15% de descuento" },
    { sessions: 12, label: "Paquete intensivo",  price: Math.round(basePrice * 12 * 0.80), desc: "12 sesiones · 20% de descuento" },
  ];

  const blankForm = { name: SERVICE_TYPES.sesion.desc, price: "", priceVirtual: "", type: "sesion", sessions: "", modality: "presencial" };
  const [selectedPkg, setSelectedPkg] = useState(null);
  const [form, setForm] = useState(blankForm);
  const fld = k => v => setForm(f => ({ ...f, [k]: v }));

  // Estado de edición de precio con vigencia
  const [editingPrice, setEditingPrice] = useState(null); // { svcId, field, newValue, from }

  const canAdd = (form.type === "paquete" || form.name.trim()) && form.price;
  const fmtCur = n => "$" + Number(n).toLocaleString("es-MX");

  const add = (overrides = {}) => {
    const f = { ...form, ...overrides };
    if (!f.name.trim() || !f.price) return;
    const now = today;
    setServices(prev => [...prev, {
      id: "svc" + uid(),
      name: f.name.trim(),
      type: f.type,
      modality: f.price && f.priceVirtual ? "ambas" : f.priceVirtual ? "virtual" : "presencial",
      sessions: f.type === "paquete" ? Number(f.sessions) : null,
      price: Number(f.price) || 0,
      priceVirtual: f.priceVirtual ? Number(f.priceVirtual) : null,
      priceHistory: [{ price: Number(f.price) || 0, priceVirtual: f.priceVirtual ? Number(f.priceVirtual) : null, from: now }],
    }]);
    setForm(blankForm);
  };

  const del = id => setServices(prev => prev.filter(s => s.id !== id));

  const applyPriceEdit = () => {
    if (!editingPrice) return;
    const { svcId, newPrice, newPriceVirtual, from } = editingPrice;
    setServices(prev => prev.map(s => {
      if (s.id !== svcId) return s;
      return {
        ...s,
        price: newPrice !== undefined ? Number(newPrice) : s.price,
        priceVirtual: newPriceVirtual !== undefined ? Number(newPriceVirtual) : s.priceVirtual,
        priceHistory: [...(s.priceHistory || []), {
          price: newPrice !== undefined ? Number(newPrice) : s.price,
          priceVirtual: newPriceVirtual !== undefined ? Number(newPriceVirtual) : s.priceVirtual,
          from
        }],
      };
    }));
    setEditingPrice(null);
  };

  return (
    <div style={{ maxWidth: 560 }}>
      <p style={{ fontFamily: T.fB, fontSize: 13.5, color: T.tm, marginBottom: 24, lineHeight: 1.6 }}>
        Define tus servicios y tarifas. Se usarán al registrar pagos y agendar citas.
      </p>

      {/* ── Lista de servicios ──────────────────────────────────────── */}
      {services.length > 0 && (
        <Card style={{ padding: 0, marginBottom: 20, overflow: "hidden" }}>
          {services.map((svc, i) => (
            <div key={svc.id}>
              <div style={{ padding: "14px 16px" }}>
                {/* Fila principal */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: T.pA,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>
                    {SERVICE_TYPES[svc.type]?.icon || "⚡"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Nombre del tipo */}
                    <div style={{ fontFamily: T.fB, fontSize: 14, fontWeight: 700, color: T.t, marginBottom: 2 }}>
                      {SERVICE_TYPES[svc.type]?.label}
                      {svc.sessions ? ` · ${svc.sessions} sesiones` : ""}
                    </div>
                    {/* Descripción */}
                    <div style={{ fontFamily: T.fB, fontSize: 12, color: T.tm, lineHeight: 1.4, marginBottom: 6 }}>
                      {svc.name}
                    </div>
                    {/* Precios en una línea con label */}
                    <div style={{ fontFamily: T.fB, fontSize: 12, color: T.t }}>
                      {svc.modality === "presencial" && (
                        <span>Presencial: <strong style={{ color: T.suc }}>{fmtCur(svc.price)}</strong></span>
                      )}
                      {svc.modality === "virtual" && (
                        <span>Virtual: <strong style={{ color: T.p }}>{fmtCur(svc.price)}</strong></span>
                      )}
                      {svc.modality === "ambas" && (
                        <span>
                          Presencial: <strong style={{ color: T.suc }}>{fmtCur(svc.price)}</strong>
                          {"    "}
                          Virtual: <strong style={{ color: T.p }}>{fmtCur(svc.priceVirtual || svc.price)}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                </div>

                {/* Panel de edición de precio */}
                {editingPrice?.svcId === svc.id && (
                  <div style={{ marginTop: 8, padding: "14px", background: T.cardAlt, borderRadius: 10,
                    border: `1.5px solid ${T.bdr}` }}>
                    <div style={{ fontFamily: T.fB, fontSize: 12, fontWeight: 700, color: T.tm, marginBottom: 12 }}>
                      Actualizar precio
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: svc.modality === "ambas" ? "1fr 1fr" : "1fr", gap: 10, marginBottom: 12 }}>
                      {(svc.modality === "presencial" || svc.modality === "ambas") && (
                        <div>
                          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.tm, marginBottom: 4 }}>🏢 Presencial</label>
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <span style={{ fontFamily: T.fB, fontSize: 13, color: T.tm }}>$</span>
                            <input type="number" value={editingPrice.newPrice}
                              onChange={e => setEditingPrice(ep => ({ ...ep, newPrice: e.target.value }))}
                              style={{ flex: 1, padding: "8px 10px", border: `1.5px solid ${T.bdr}`, borderRadius: 8,
                                fontFamily: T.fB, fontSize: 13, color: T.t, background: T.card, outline: "none" }} />
                          </div>
                        </div>
                      )}
                      {svc.modality === "ambas" && (
                        <div>
                          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.p, marginBottom: 4 }}>💻 Virtual</label>
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <span style={{ fontFamily: T.fB, fontSize: 13, color: T.tm }}>$</span>
                            <input type="number" value={editingPrice.newPriceVirtual || ""}
                              onChange={e => setEditingPrice(ep => ({ ...ep, newPriceVirtual: e.target.value }))}
                              style={{ flex: 1, padding: "8px 10px", border: `1.5px solid ${T.p}40`, borderRadius: 8,
                                fontFamily: T.fB, fontSize: 13, color: T.t, background: T.pA, outline: "none" }} />
                          </div>
                        </div>
                      )}
                      {svc.modality === "virtual" && (
                        <div>
                          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.p, marginBottom: 4 }}>💻 Virtual</label>
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <span style={{ fontFamily: T.fB, fontSize: 13, color: T.tm }}>$</span>
                            <input type="number" value={editingPrice.newPrice}
                              onChange={e => setEditingPrice(ep => ({ ...ep, newPrice: e.target.value }))}
                              style={{ flex: 1, padding: "8px 10px", border: `1.5px solid ${T.p}40`, borderRadius: 8,
                                fontFamily: T.fB, fontSize: 13, color: T.t, background: T.pA, outline: "none" }} />
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Vigencia */}
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.tm, marginBottom: 6 }}>
                        ¿A partir de cuándo aplica?
                      </label>
                      <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                        {[
                          { label: "Hoy", val: today },
                          { label: "Próximo mes", val: (() => { const d = new Date(); d.setMonth(d.getMonth()+1); d.setDate(1); return d.toISOString().slice(0,10); })() },
                        ].map(opt => (
                          <button key={opt.label} onClick={() => setEditingPrice(ep => ({ ...ep, from: opt.val }))}
                            style={{ padding: "5px 12px", borderRadius: 9999, fontFamily: T.fB, fontSize: 11,
                              border: `1.5px solid ${editingPrice.from === opt.val ? T.p : T.bdr}`,
                              background: editingPrice.from === opt.val ? T.pA : "transparent",
                              color: editingPrice.from === opt.val ? T.p : T.tm, cursor: "pointer" }}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      <input type="date" value={editingPrice.from}
                        onChange={e => setEditingPrice(ep => ({ ...ep, from: e.target.value }))}
                        style={{ width: "100%", padding: "8px 12px", border: `1.5px solid ${T.bdr}`, borderRadius: 9,
                          fontFamily: T.fB, fontSize: 13, color: T.t, background: T.card, outline: "none", boxSizing: "border-box" }} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <button onClick={() => setEditingPrice(null)}
                        style={{ padding: "9px", borderRadius: 9, border: `1.5px solid ${T.bdr}`,
                          background: "transparent", fontFamily: T.fB, fontSize: 12, color: T.tm, cursor: "pointer" }}>
                        Cancelar
                      </button>
                      <button onClick={applyPriceEdit}
                        style={{ padding: "9px", borderRadius: 9, border: "none",
                          background: T.p, color: "#fff", fontFamily: T.fB, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                        Guardar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Barra de acciones */}
              {editingPrice?.svcId !== svc.id && (
                <div style={{ borderTop: `1px solid ${T.bdrL}`, display: "flex", alignItems: "center", background: T.cardAlt }}>
                  <button onClick={() => setEditingPrice({ svcId: svc.id, newPrice: svc.price, newPriceVirtual: svc.priceVirtual, from: today })}
                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                      gap: 5, padding: "9px 4px", background: "none", border: "none",
                      borderRight: `1px solid ${T.bdrL}`, cursor: "pointer",
                      fontFamily: T.fB, fontSize: 11, fontWeight: 500, color: T.tm, transition: "background .13s" }}
                    onMouseEnter={e => e.currentTarget.style.background = T.bdrL}
                    onMouseLeave={e => e.currentTarget.style.background = "none"}>
                    ✏️ Editar precio
                  </button>
                  <button onClick={() => del(svc.id)}
                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                      gap: 5, padding: "9px 4px", background: "none", border: "none",
                      cursor: "pointer", fontFamily: T.fB, fontSize: 11, fontWeight: 500, color: T.err, transition: "background .13s" }}
                    onMouseEnter={e => e.currentTarget.style.background = T.bdrL}
                    onMouseLeave={e => e.currentTarget.style.background = "none"}>
                    <Trash2 size={12}/> Eliminar
                  </button>
                </div>
              )}
            </div>
          ))}
        </Card>
      )}

      {/* ── Formulario nuevo servicio ───────────────────────────────── */}
      <Card style={{ padding: 20 }}>
        <div style={{ fontFamily: T.fB, fontSize: 13, fontWeight: 600, color: T.tm, marginBottom: 16 }}>
          Nuevo servicio
        </div>

        {/* Tipo */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.tm, marginBottom: 8 }}>Tipo</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
            {Object.entries(SERVICE_TYPES).map(([k, v]) => {
              const on = form.type === k;
              return (
                <button key={k} onClick={() => setForm(f => ({
                    ...f, type: k,
                    name: (!f.name.trim() || Object.values(SERVICE_TYPES).some(t => t.desc === f.name))
                      ? (SERVICE_TYPES[k]?.desc || "") : f.name
                  }))}
                  style={{ padding: "9px 4px", borderRadius: 9, border: `1.5px solid ${on ? T.p : T.bdr}`,
                    background: on ? T.pA : "transparent", fontFamily: T.fB, fontSize: 11,
                    color: on ? T.p : T.tm, fontWeight: on ? 700 : 400,
                    cursor: "pointer", textAlign: "center", transition: "all .13s",
                    whiteSpace: "nowrap" }}>
                  {v.icon} {v.short}
                </button>
              );
            })}
          </div>
        </div>

        {/* Paquetes sugeridos */}
        {form.type === "paquete" && (
          <div style={{ marginBottom: 14, padding: "12px 14px", background: T.cardAlt, borderRadius: 10,
            border: `1px solid ${T.bdrL}` }}>
            <div style={{ fontFamily: T.fB, fontSize: 11, fontWeight: 700, color: T.tl,
              textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
              Paquetes sugeridos
            </div>
            {/* Grid de 3 columnas */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 10 }}>
              {SUGGESTED_PACKAGES.map(pkg => {
                const on = selectedPkg === pkg.sessions;
                return (
                  <button key={pkg.sessions} onClick={() => setSelectedPkg(on ? null : pkg.sessions)}
                    style={{ padding: "10px 8px", borderRadius: 10, textAlign: "center",
                      border: `2px solid ${on ? T.p : T.bdr}`,
                      background: on ? T.pA : T.card,
                      cursor: "pointer", transition: "all .13s" }}>
                    <div style={{ fontFamily: T.fB, fontSize: 12, fontWeight: 700,
                      color: on ? T.p : T.t, marginBottom: 2 }}>{pkg.label}</div>
                    <div style={{ fontFamily: T.fB, fontSize: 10, color: T.tl,
                      marginBottom: 6 }}>{pkg.sessions} ses · {pkg.sessions === 4 ? "10%" : pkg.sessions === 8 ? "15%" : "20%"} dto</div>
                    <div style={{ fontFamily: T.fH, fontSize: 14, color: T.suc,
                      fontWeight: 600 }}>{fmtCur(pkg.price)}</div>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => {
                const pkg = SUGGESTED_PACKAGES.find(p => p.sessions === selectedPkg);
                if (pkg) { setForm(f => ({ ...f, name: pkg.label, sessions: String(pkg.sessions), price: String(pkg.price) })); setSelectedPkg(null); }
              }}
              disabled={!selectedPkg}
              style={{ width: "100%", padding: "9px", borderRadius: 9, border: "none",
                background: selectedPkg ? T.p : T.bdrL, color: selectedPkg ? "#fff" : T.tl,
                fontFamily: T.fB, fontSize: 13, fontWeight: 600,
                cursor: selectedPkg ? "pointer" : "not-allowed", transition: "all .15s" }}>
              Confirmar selección
            </button>
          </div>
        )}

        {/* Descripción — solo para tipos que no son paquete */}
        {form.type !== "paquete" && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.tm, marginBottom: 6 }}>Descripción del servicio</label>
            <textarea value={form.name} onChange={e => fld("name")(e.target.value)}
              rows={2}
              placeholder="Ej: Sesión de psicoterapia individual de 50 min..."
              style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${T.bdr}`,
                borderRadius: 10, fontFamily: T.fB, fontSize: 13, color: T.t,
                background: T.card, outline: "none", boxSizing: "border-box",
                resize: "none", lineHeight: 1.5 }} />
          </div>
        )}

        {/* Precios — presencial y virtual siempre visibles, opcionales */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {/* Presencial */}
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.tm, marginBottom: 6 }}>🏢 Presencial</label>
              <input type="number" value={form.price} onChange={e => fld("price")(e.target.value)}
                placeholder="900"
                style={{ width: "100%", padding: "10px 12px", border: `1.5px solid ${T.bdr}`,
                  borderRadius: 10, fontFamily: T.fB, fontSize: 13, color: T.t,
                  background: T.card, outline: "none", boxSizing: "border-box" }} />
            </div>
            {/* Virtual o Núm. sesiones */}
            {form.type === "paquete" ? (
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.tm, marginBottom: 6 }}>Núm. sesiones</label>
                <input type="number" value={form.sessions} onChange={e => fld("sessions")(e.target.value)}
                  placeholder="4"
                  style={{ width: "100%", padding: "10px 12px", border: `1.5px solid ${T.bdr}`,
                    borderRadius: 10, fontFamily: T.fB, fontSize: 13, color: T.t,
                    background: T.card, outline: "none", boxSizing: "border-box" }} />
              </div>
            ) : (
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.p, marginBottom: 6 }}>💻 Virtual</label>
                <input type="number" value={form.priceVirtual} onChange={e => fld("priceVirtual")(e.target.value)}
                  placeholder="Opcional"
                  style={{ width: "100%", padding: "10px 12px", border: `1.5px solid ${T.p}40`,
                    borderRadius: 10, fontFamily: T.fB, fontSize: 13, color: T.t,
                    background: T.pA, outline: "none", boxSizing: "border-box" }} />
              </div>
            )}
          </div>
        </div>

        <button onClick={() => add()} disabled={!canAdd}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            width: "100%", padding: "11px", borderRadius: 10, border: "none",
            background: canAdd ? T.p : T.bdrL, color: canAdd ? "#fff" : T.tl,
            fontFamily: T.fB, fontSize: 13.5, fontWeight: 600,
            cursor: canAdd ? "pointer" : "not-allowed", transition: "all .15s" }}>
          <Plus size={15} /> Agregar servicio
        </button>
      </Card>
    </div>
  );
}

// ── Main Settings component ───────────────────────────────────────────────────
export default function Settings({ profile, setProfile, darkMode, setDarkMode, patients, setPatients, googleUser, psychologist, allData, onRestore, services = [], setServices }) {
  const [tab, setTab] = useState("profile");

  const tabs = [
    { id: "profile",    label: "Perfil"     },
    { id: "services",   label: "Servicios"  },
    { id: "appearance", label: "Apariencia" },
    { id: "data",       label: "Datos"      },
    { id: "help",       label: "Ayuda"      },
  ];

  return (
    <div>
      <PageHeader title="Ajustes" subtitle="Perfil, apariencia y datos" />
      <div style={{ display:"flex", borderBottom:`1px solid ${T.bdr}`, marginBottom:24, gap:4 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding:"10px 20px", border:"none", background:"none", cursor:"pointer",
              fontFamily:T.fB, fontSize:14, fontWeight: tab===t.id ? 700 : 400,
              color: tab===t.id ? T.p : T.tm,
              borderBottom: tab===t.id ? `2px solid ${T.p}` : "2px solid transparent",
              transition:"all .15s" }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "profile"    && <ProfileTab    profile={profile} setProfile={setProfile} googleUser={googleUser} psychologist={psychologist} />}
      {tab === "services"   && <ServicesTab   services={services} setServices={setServices} />}
      {tab === "appearance" && <AppearanceTab darkMode={darkMode} setDarkMode={setDarkMode} patients={patients} setPatients={setPatients} />}
      {tab === "data"       && <DataTab       allData={allData} onRestore={onRestore} patients={patients} />}
      {tab === "help"       && <HelpTab />}
    </div>
  );
}

