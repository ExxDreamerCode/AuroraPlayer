import { useState, useCallback, useRef } from "react";

export function useDebug() {
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const debugLogRef = useRef<string[]>([]);

  const addDebug = useCallback((msg: string) => {
    const ts = new Date().toLocaleTimeString();
    const entry = `[${ts}] ${msg}`;
    const current = debugLogRef.current;
    const updated = current.length > 50 ? [...current.slice(1), entry] : [...current, entry];
    debugLogRef.current = updated;
    setDebugLog(updated);
    console.log(entry);
  }, []);

  return { debugLog, addDebug, debugLogRef };
}