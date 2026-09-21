"use client";

import { useConvex } from "convex/react";
import { useEffect, useState } from "react";

// Connected = the Convex websocket is up AND the browser reports network. We watch both so the
// indicator reacts to a real socket drop and to the browser going offline.
export function useConnection() {
  const convex = useConvex();
  const [wsConnected, setWsConnected] = useState(true);
  const [netOnline, setNetOnline] = useState(true);

  useEffect(() => {
    // Treat "still connecting for the first time" as connected, to avoid a flash on load.
    const read = (s: { isWebSocketConnected: boolean; hasEverConnected: boolean }) =>
      setWsConnected(s.isWebSocketConnected || !s.hasEverConnected);
    read(convex.connectionState());
    const unsub = convex.subscribeToConnectionState(read);

    setNetOnline(navigator.onLine);
    const on = () => setNetOnline(true);
    const off = () => setNetOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);

    return () => {
      unsub();
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, [convex]);

  return wsConnected && netOnline;
}
