import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { getGetGlobalSnapshotQueryKey } from "@workspace/api-client-react";
import type { GlobalTopic } from "@workspace/api-client-react";

export type SocketState = "connecting" | "connected" | "disconnected";

export function useGlobalSocket(topic: GlobalTopic, enabled: boolean) {
  const qc = useQueryClient();
  const [state, setState] = useState<SocketState>("disconnected");
  const [members, setMembers] = useState<number | null>(null);
  const [lastPush, setLastPush] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setState("disconnected");
      setMembers(null);
      return;
    }
    setState("connecting");
    const socket = io(window.location.origin, {
      path: "/api/global/socket.io",
      withCredentials: true,
      transports: ["websocket"],
    });
    const key = getGetGlobalSnapshotQueryKey({ topic });
    socket.on("connect", () => {
      setState("connected");
      socket.emit("topic:watch", topic);
      qc.invalidateQueries({ queryKey: key });
    });
    socket.on("disconnect", () => setState("disconnected"));
    socket.on("connect_error", () => setState("disconnected"));
    socket.on("snapshot:updated", (p: { topic?: string; fetchedAt?: string }) => {
      if (p?.topic && p.topic !== topic) return;
      setLastPush(p?.fetchedAt ?? new Date().toISOString());
      qc.invalidateQueries({ queryKey: key });
    });
    socket.on("presence", (p: { members?: unknown }) => {
      const m = p?.members;
      setMembers(typeof m === "number" ? m : Array.isArray(m) ? m.length : null);
    });
    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [topic, enabled, qc]);

  return { state, members, lastPush };
}
