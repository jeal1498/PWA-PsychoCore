import { useState, useEffect } from "react";

// Detecta pantalla ancha (≥ 1280px) para layouts de 3 columnas y padding expandido
export function useIsWide(breakpoint = 1280) {
  const [wide, setWide] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= breakpoint : false
  );
  useEffect(() => {
    const handler = () => setWide(window.innerWidth >= breakpoint);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [breakpoint]);
  return wide;
}
