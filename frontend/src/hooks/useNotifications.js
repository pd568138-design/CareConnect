import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
export default function useNotifications(user) {
  const [items, setItems] = useState([]);
  const socketRef = useRef(null);
  useEffect(() => {
    if (!user) return;
    const socket = io(import.meta.env.VITE_SOCKET_URL || "https://careconnect-lp78.onrender.com/", { transports: ["websocket", "polling"] });
    socketRef.current = socket;
    socket.emit("join", { userId: user.id || user._id, role: user.role });
    socket.on("notification", (item) => {
      setItems((old) => [item, ...old].slice(0, 30));
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination); osc.frequency.value = 880; gain.gain.value = 0.07;
        osc.start(); osc.stop(ctx.currentTime + 0.16);
      } catch {}
    });
    return () => socket.disconnect();
  }, [user]);
  return { items, setItems };
}
