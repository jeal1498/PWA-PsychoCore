import { useState, useEffect, useCallback } from "react";
import { Brain } from "lucide-react";
import { T } from "../theme.js";
import { initCrypto } from "../crypto/encryption.js";

export default function LockScreen({ onUnlock }) {
  const [pin,      setPin]      = useState("");
  const [error,    setError]    = useState(false);
  const [shake,    setShake]    = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [blocked,  setBlocked]  = useState(false);

  const handlePress = useCallback(async (key) => {
    if (blocked || loading || pin.length >= 4) return;
    const next = pin + key;
    setPin(next);

    if (next.length === 4) {
      setLoading(true);
      setTimeout(async () => {
        const ok = await initCrypto(next);
        if (ok) {
          onUnlock();
        } else {
          const n = attempts + 1;
          setAttempts(n);
          setError(true);
          setShake(true);
          if (n >= 5) {
            setBlocked(true);
            setTimeout(() => { setBlocked(false); setAttempts(0); }, 30_000);
          }
          setTimeout(() => { setPin(""); setError(false); setShake(false); setLoading(false); }, 800);
        }
      }, 120);
    }
  }, [pin, attempts, blocked, loading, onUnlock]);

  useEffect(() => {
    const h = (e) => {
      if (e.key >= "0" && e.key <= "9") handlePress(e.key);
      if (e.key === "Backspace") setPin(p => p.slice(0, -1));
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [handlePress]);

  const keys = [[1,2,3],[4,5,6],[7,8,9],["","0","⌫"]];

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(145deg, #1E3535 0%, ${T.p} 100%)`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.fB }}>
      <div style={{ textAlign: "center", color: "#fff" }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(255,255,255,0.10)", border: "2px solid rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
          <Brain size={32} strokeWidth={1.4} />
        </div>
        <div style={{ fontFamily: T.fH, fontSize: 36, fontWeight: 300, letterSpacing: "0.02em", marginBottom: 4 }}>PsychoCore</div>
        <div style={{ fontSize: 13, opacity: 0.55, marginBottom: 44, letterSpacing: "0.06em" }}>GESTIÓN CLÍNICA</div>

        {/* PIN dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: 14, marginBottom: 40, animation: shake ? "shake .4s ease" : "none" }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{ width: 14, height: 14, borderRadius: "50%", transition: "all .15s",
              background: loading && i < pin.length ? T.acc : i < pin.length ? (error ? "#ef4444" : "#fff") : "rgba(255,255,255,0.25)",
              transform: i < pin.length ? "scale(1.15)" : "scale(1)" }} />
          ))}
        </div>

        {blocked && <div style={{ fontSize: 13, color: "#fca5a5", marginTop: -30, marginBottom: 24 }}>Demasiados intentos. Espera 30 s.</div>}
        {!blocked && error && <div style={{ fontSize: 13, color: "#fca5a5", marginTop: -30, marginBottom: 16 }}>PIN incorrecto · {5 - attempts} intentos restantes</div>}
        {loading && !error && <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: -30, marginBottom: 16 }}>Verificando…</div>}

        {/* Keypad */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 72px)", gap: 12, justifyContent: "center" }}>
          {keys.flat().map((k, i) => (
            <button key={i}
              onClick={() => k === "⌫" ? setPin(p => p.slice(0,-1)) : k !== "" ? handlePress(String(k)) : null}
              style={{ width: 72, height: 72, borderRadius: "50%", border: "none", background: k === "" ? "transparent" : "rgba(255,255,255,0.10)", color: "#fff", fontSize: k === "⌫" ? 20 : 24, fontFamily: T.fH, cursor: k === "" ? "default" : "pointer", transition: "background .15s", opacity: (blocked || loading) && k !== "" ? 0.4 : 1 }}
              onMouseEnter={e => { if (k !== "" && !blocked && !loading) e.currentTarget.style.background = "rgba(255,255,255,0.2)"; }}
              onMouseLeave={e => e.currentTarget.style.background = k === "" ? "transparent" : "rgba(255,255,255,0.10)"}
            >{k}</button>
          ))}
        </div>

        <div style={{ fontSize: 11, opacity: 0.35, marginTop: 36 }}>PIN demo: 1234 · Soporta teclado físico</div>
      </div>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-10px)}75%{transform:translateX(10px)}}`}</style>
    </div>
  );
}
