import { useState, useEffect } from "react";
import { User, HardDrive, Shield, Check, Download, Upload, Trash2, FolderOpen, RefreshCw, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";
import { T } from "../theme.js";
import { changePIN } from "../crypto/encryption.js";
import { loadBackupsFromIDB, getBackupById, deleteBackupById } from "../hooks/useAutoBackup.js";
import { Card, Tabs, Input, Btn, PageHeader } from "../components/ui/index.jsx";

// ── Tab: Perfil ───────────────────────────────────────────────────────────────
function ProfileTab({ profile, setProfile }) {
  const [form, setForm] = useState({ ...profile });
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

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input label="Nombre completo" value={form.name} onChange={fld("name")} placeholder="Dra. Ana López" style={{ marginBottom: 0 }} />
          <Input label="Especialidad" value={form.specialty} onChange={fld("specialty")} placeholder="Psicóloga Clínica" style={{ marginBottom: 0 }} />
        </div>
        <div style={{ height: 16 }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input label="Cédula profesional" value={form.cedula} onChange={fld("cedula")} placeholder="XXXXXXX" style={{ marginBottom: 0 }} />
          <Input label="Teléfono" value={form.phone} onChange={fld("phone")} placeholder="998-000-0000" style={{ marginBottom: 0 }} />
          <Input label="RFC (para recibos)" value={form.rfc || ""} onChange={fld("rfc")} placeholder="LOAA800101XX0" style={{ marginBottom: 0 }} />
        </div>
        <div style={{ height: 16 }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input label="Correo electrónico" value={form.email} onChange={fld("email")} placeholder="ana@consultorio.com" style={{ marginBottom: 0 }} />
          <Input label="Nombre del consultorio" value={form.clinic} onChange={fld("clinic")} placeholder="Consultorio Integral" style={{ marginBottom: 0 }} />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24, gap: 10, alignItems: "center" }}>
          {saved && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: T.suc, fontFamily: T.fB, fontSize: 13 }}>
              <CheckCircle size={15} /> Guardado
            </div>
          )}
          <Btn onClick={save}><Check size={15} /> Guardar perfil</Btn>
        </div>
      </Card>
    </div>
  );
}

// ── Tab: Backups ──────────────────────────────────────────────────────────────
function BackupsTab({ allData, lastBackup, doBackup, fsSupported, fsHandle, requestFS, onRestore }) {
  const [backups,   setBackups]   = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [msg,       setMsg]       = useState(null);

  const loadList = async () => {
    try {
      const list = await loadBackupsFromIDB();
      setBackups(list);
    } catch (e) {
      console.warn("IDB list error:", e);
    }
  };

  useEffect(() => { loadList(); }, [lastBackup]);

  const flash = (text, ok = true) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 3000);
  };

  const handleManualBackup = async () => {
    setLoading(true);
    await doBackup();
    await loadList();
    setLoading(false);
    flash("Backup guardado correctamente");
  };

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify({ ...allData, _meta: { ts: Date.now(), version: "1.0" } }, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `psychocore-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    flash("Archivo descargado");
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type  = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        onRestore(data);
        flash("Datos restaurados correctamente");
      } catch {
        flash("Error: archivo inválido", false);
      }
    };
    input.click();
  };

  const handleRestoreIDB = async (id) => {
    setRestoring(true);
    const data = await getBackupById(id);
    if (data) { onRestore(data); flash("Backup restaurado"); }
    else flash("No se pudo restaurar", false);
    setRestoring(false);
  };

  const handleDeleteIDB = async (id) => {
    await deleteBackupById(id);
    await loadList();
  };

  const fmtTs = (ts) => new Date(ts).toLocaleString("es-MX", { day:"numeric", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" });
  const fmtSize = (b) => b > 1024 ? `${(b/1024).toFixed(1)} KB` : `${b} B`;

  return (
    <div style={{ maxWidth: 640 }}>
      <p style={{ fontFamily: T.fB, fontSize: 13.5, color: T.tm, marginBottom: 24, lineHeight: 1.6 }}>
        Los backups se guardan automáticamente en IndexedDB cada vez que modificas datos. También puedes exportar/importar JSON manualmente.
      </p>

      {/* Status bar */}
      <Card style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontFamily: T.fB, fontSize: 12, fontWeight: 700, color: T.tl, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Último backup</div>
            <div style={{ fontFamily: T.fB, fontSize: 14, color: T.t }}>
              {lastBackup ? fmtTs(lastBackup) : "Aún no se ha guardado un backup"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="ghost" small onClick={handleManualBackup}>
              <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
              Guardar ahora
            </Btn>
            <Btn variant="accent" small onClick={handleExportJSON}><Download size={13} /> Exportar JSON</Btn>
          </div>
        </div>
      </Card>

      {/* File System */}
      {fsSupported && (
        <Card style={{ padding: 20, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontFamily: T.fB, fontSize: 14, fontWeight: 500, color: T.t, marginBottom: 4 }}>Carpeta automática</div>
              <div style={{ fontFamily: T.fB, fontSize: 13, color: T.tm }}>
                {fsHandle ? `📁 ${fsHandle.name} — backup automático activo` : "Selecciona una carpeta para backups automáticos en tu dispositivo"}
              </div>
            </div>
            <Btn variant="ghost" small onClick={requestFS}><FolderOpen size={13} /> {fsHandle ? "Cambiar carpeta" : "Seleccionar carpeta"}</Btn>
          </div>
        </Card>
      )}

      {/* Import */}
      <Card style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontFamily: T.fB, fontSize: 14, fontWeight: 500, color: T.t, marginBottom: 4 }}>Restaurar desde archivo</div>
            <div style={{ fontFamily: T.fB, fontSize: 13, color: T.tm }}>Importa un archivo .json exportado previamente</div>
          </div>
          <Btn variant="ghost" small onClick={handleImport}><Upload size={13} /> Importar JSON</Btn>
        </div>
      </Card>

      {/* IDB list */}
      <div style={{ fontFamily: T.fB, fontSize: 13, fontWeight: 700, color: T.tl, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
        Historial de backups ({backups.length})
      </div>
      {backups.length === 0
        ? <div style={{ fontFamily: T.fB, fontSize: 13, color: T.tl, padding: "20px 0" }}>No hay backups en el historial aún</div>
        : backups.map((b, i) => (
          <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 10, background: i % 2 === 0 ? T.card : T.cardAlt, marginBottom: 4, border: `1px solid ${T.bdrL}` }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: T.fB, fontSize: 13.5, color: T.t, fontWeight: 500 }}>{fmtTs(b.timestamp)}</div>
              <div style={{ fontFamily: T.fB, fontSize: 12, color: T.tl }}>{fmtSize(b.size)}</div>
            </div>
            <Btn variant="ghost" small onClick={() => handleRestoreIDB(b.id)}>Restaurar</Btn>
            <button onClick={() => handleDeleteIDB(b.id)} style={{ background: "none", border: "none", color: T.tl, cursor: "pointer" }}><Trash2 size={14} /></button>
          </div>
        ))
      }

      {/* Flash message */}
      {msg && (
        <div style={{ position: "fixed", bottom: 28, right: 28, padding: "12px 20px", borderRadius: 12, background: msg.ok ? T.suc : T.err, color: "#fff", fontFamily: T.fB, fontSize: 14, boxShadow: T.shM, display: "flex", alignItems: "center", gap: 8, zIndex: 300 }}>
          {msg.ok ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {msg.text}
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── Tab: Seguridad ─────────────────────────────────────────────────────────────
function SecurityTab() {
  const [oldPin,  setOldPin]  = useState("");
  const [newPin,  setNewPin]  = useState("");
  const [confPin, setConfPin] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg,     setMsg]     = useState(null);

  const flash = (text, ok = true) => { setMsg({ text, ok }); setTimeout(() => setMsg(null), 3000); };

  const validate = () => {
    if (oldPin.length < 4) return "El PIN actual debe tener 4 dígitos";
    if (newPin.length < 4) return "El PIN nuevo debe tener 4 dígitos";
    if (!/^\d{4}$/.test(newPin)) return "El PIN debe ser solo números";
    if (newPin !== confPin) return "Los PINs nuevos no coinciden";
    if (oldPin === newPin) return "El PIN nuevo debe ser diferente al actual";
    return null;
  };

  const handleChange = async () => {
    const err = validate();
    if (err) { flash(err, false); return; }
    setLoading(true);
    const ok = await changePIN(oldPin, newPin);
    setLoading(false);
    if (ok) {
      flash("PIN cambiado correctamente");
      setOldPin(""); setNewPin(""); setConfPin("");
    } else {
      flash("PIN actual incorrecto", false);
    }
  };

  const PinInput = ({ label, value, onChange, show, onToggle }) => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.tm, marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={e => onChange(e.target.value.replace(/\D/g,"").slice(0,4))}
          placeholder="••••"
          maxLength={4}
          style={{ width: "100%", padding: "10px 42px 10px 14px", border: `1.5px solid ${T.bdr}`, borderRadius: 10, fontFamily: T.fB, fontSize: 18, letterSpacing: "0.2em", color: T.t, background: T.card, outline: "none", boxSizing: "border-box" }}
        />
        <button onClick={onToggle} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: T.tl }}>
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 440 }}>
      <p style={{ fontFamily: T.fB, fontSize: 13.5, color: T.tm, marginBottom: 24, lineHeight: 1.6 }}>
        El PIN protege el acceso a la app y cifra todos tus datos clínicos con AES-GCM 256.
      </p>

      <Card style={{ padding: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: T.pA, borderRadius: 10, marginBottom: 24 }}>
          <Shield size={18} color={T.p} strokeWidth={1.6} />
          <div>
            <div style={{ fontFamily: T.fB, fontSize: 13, fontWeight: 600, color: T.p }}>Cifrado activo</div>
            <div style={{ fontFamily: T.fB, fontSize: 12, color: T.tm }}>AES-GCM 256 · PBKDF2 SHA-256 · 100,000 iteraciones</div>
          </div>
        </div>

        <h3 style={{ fontFamily: T.fH, fontSize: 20, color: T.t, margin: "0 0 20px" }}>Cambiar PIN</h3>

        <PinInput label="PIN actual" value={oldPin} onChange={setOldPin} show={showOld} onToggle={() => setShowOld(s => !s)} />
        <PinInput label="PIN nuevo (4 dígitos)" value={newPin} onChange={setNewPin} show={showNew} onToggle={() => setShowNew(s => !s)} />
        <PinInput label="Confirmar PIN nuevo" value={confPin} onChange={setConfPin} show={showNew} onToggle={() => setShowNew(s => !s)} />

        {/* PIN strength */}
        {newPin.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
              {[1,2,3,4].map(i => (
                <div key={i} style={{ flex: 1, height: 3, borderRadius: 9999, background: i <= newPin.length ? T.p : T.bdrL, transition: "background .2s" }} />
              ))}
            </div>
            <div style={{ fontFamily: T.fB, fontSize: 11, color: T.tl }}>{newPin.length}/4 dígitos</div>
          </div>
        )}

        {msg && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", borderRadius: 10, background: msg.ok ? T.sucA : T.errA, marginBottom: 16, fontFamily: T.fB, fontSize: 13, color: msg.ok ? T.suc : T.err }}>
            {msg.ok ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
            {msg.text}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Btn onClick={handleChange} disabled={loading || !oldPin || !newPin || !confPin}>
            <Shield size={14} />
            {loading ? "Procesando..." : "Cambiar PIN"}
          </Btn>
        </div>
      </Card>

      <Card style={{ padding: 20, marginTop: 16 }}>
        <div style={{ fontFamily: T.fB, fontSize: 13, color: T.tm, lineHeight: 1.7 }}>
          <strong style={{ color: T.t }}>¿Qué cifra el PIN?</strong><br />
          Todos los expedientes, sesiones, pagos, citas y recursos se cifran con tu PIN antes de guardarse en el dispositivo. Nadie puede leerlos sin el PIN correcto — ni siquiera con acceso físico al dispositivo.
        </div>
      </Card>
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
      <Card style={{ padding:"4px 24px 4px", marginBottom:20 }}>
        <Toggle
          label="Modo oscuro"
          sub="Reduce la fatiga visual en entornos con poca luz"
          value={darkMode}
          onChange={setDarkMode}
        />
      </Card>

      {/* CSV import */}
      <Card style={{ padding:24 }}>
        <h3 style={{ fontFamily:T.fH, fontSize:20, color:T.t, margin:"0 0 8px" }}>Importar pacientes desde CSV</h3>
        <p style={{ fontFamily:T.fB, fontSize:13, color:T.tm, marginBottom:20, lineHeight:1.65 }}>
          Migra pacientes desde otra herramienta. El archivo debe tener una fila de encabezados. Columnas reconocidas automáticamente: <strong>nombre</strong>, email, teléfono, fechanacimiento, diagnóstico, notas.
        </p>

        {/* Example table */}
        <div style={{ background:T.cardAlt, borderRadius:10, padding:14, marginBottom:20, overflowX:"auto" }}>
          <div style={{ fontFamily:T.fB, fontSize:11, fontWeight:700, color:T.tl, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:8 }}>Ejemplo de CSV</div>
          <table style={{ borderCollapse:"collapse", fontFamily:T.fB, fontSize:12, width:"100%" }}>
            <thead>
              <tr>{["nombre","email","telefono","fechanacimiento","diagnostico"].map(h => (
                <td key={h} style={{ padding:"4px 10px", background:T.p, color:"#fff", fontWeight:600, borderRadius:0 }}>{h}</td>
              ))}</tr>
            </thead>
            <tbody>
              <tr>{["Ana López","ana@mail.com","998-000-0001","1990-05-12","TAG"].map((v,i) => (
                <td key={i} style={{ padding:"4px 10px", color:T.tm, borderBottom:`1px solid ${T.bdrL}` }}>{v}</td>
              ))}</tr>
            </tbody>
          </table>
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

// ── Main Settings component ───────────────────────────────────────────────────
export default function Settings({ profile, setProfile, allData, lastBackup, doBackup, fsSupported, fsHandle, requestFS, onRestore, darkMode, setDarkMode, patients, setPatients }) {
  const [tab, setTab] = useState("profile");

  const tabs = [
    { id: "profile",    label: "Perfil"      },
    { id: "appearance", label: "Apariencia"  },
    { id: "backups",    label: "Backups"     },
    { id: "security",   label: "Seguridad"   },
  ];

  return (
    <div>
      <PageHeader title="Ajustes" subtitle="Perfil, apariencia, backups y seguridad" />

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === "profile"    && <ProfileTab    profile={profile} setProfile={setProfile} />}
      {tab === "appearance" && <AppearanceTab darkMode={darkMode} setDarkMode={setDarkMode} patients={patients} setPatients={setPatients} />}
      {tab === "backups"    && <BackupsTab    allData={allData} lastBackup={lastBackup} doBackup={doBackup} fsSupported={fsSupported} fsHandle={fsHandle} requestFS={requestFS} onRestore={onRestore} />}
      {tab === "security"   && <SecurityTab />}
    </div>
  );
}

