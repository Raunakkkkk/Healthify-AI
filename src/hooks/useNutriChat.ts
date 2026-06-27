import { useCallback, useEffect, useRef, useState } from "react";
import { startOfDay, endOfDay, subDays } from "date-fns";
import api from "@/lib/api";

export type ChatPart =
  | { type: "text"; text: string }
  | { type: "tool"; name: string; output: Record<string, unknown> };

export type ChatMsg = { id: string; role: "user" | "assistant"; parts: ChatPart[] };

type Status = "ready" | "submitted" | "streaming";

function dateHeaders(): Record<string, string> {
  const now = new Date();
  return {
    "X-Today-Start": startOfDay(now).toISOString(),
    "X-Today-End": endOfDay(now).toISOString(),
    "X-Week-Start": startOfDay(subDays(now, 6)).toISOString(),
    "X-Week-End": endOfDay(now).toISOString(),
  };
}

let idSeq = 0;
const nextId = () => `m_${Date.now()}_${idSeq++}`;

export function useNutriChat() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [status, setStatus] = useState<Status>("ready");
  const [error, setError] = useState<string | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    api
      .get("/ai/chat/history")
      .then((res) => {
        const rows: any[] = Array.isArray(res.data) ? res.data : [];
        setMessages(
          rows.map((r) => ({
            id: String(r._id ?? nextId()),
            role: r.role === "assistant" ? "assistant" : "user",
            parts:
              Array.isArray(r.parts) && r.parts.length
                ? (r.parts as ChatPart[])
                : [{ type: "text", text: String(r.content ?? "") }],
          })),
        );
      })
      .catch(() => { /* history is best-effort */ });
  }, []);

  const sendMessage = useCallback(
    async ({ text }: { text: string }) => {
      setError(null);
      const userMsg: ChatMsg = { id: nextId(), role: "user", parts: [{ type: "text", text }] };
      const assistantMsg: ChatMsg = { id: nextId(), role: "assistant", parts: [] };

      const priorWire = messages.map((m) => ({
        role: m.role,
        content: m.parts.filter((p) => p.type === "text").map((p) => (p as { text: string }).text).join(""),
      }));
      const wireMessages = [...priorWire, { role: "user", content: text }];

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setStatus("submitted");

      const updateAssistant = (fn: (parts: ChatPart[]) => ChatPart[]) =>
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantMsg.id ? { ...m, parts: fn(m.parts) } : m)),
        );

      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
            ...dateHeaders(),
          },
          body: JSON.stringify({ messages: wireMessages }),
        });

        if (!res.ok || !res.body) throw new Error(`Request failed: ${res.status}`);

        setStatus("streaming");
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        const appendDelta = (delta: string) =>
          updateAssistant((parts) => {
            const last = parts[parts.length - 1];
            if (last && last.type === "text") {
              return [...parts.slice(0, -1), { type: "text", text: last.text + delta }];
            }
            return [...parts, { type: "text", text: delta }];
          });

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split("\n\n");
          buffer = frames.pop() ?? "";
          for (const frame of frames) {
            const line = frame.split("\n").find((l) => l.startsWith("data: "));
            if (!line) continue;
            const ev = JSON.parse(line.slice(6));
            if (ev.type === "text-delta") appendDelta(ev.delta as string);
            else if (ev.type === "tool-result")
              updateAssistant((parts) => [...parts, { type: "tool", name: ev.name, output: ev.output }]);
            else if (ev.type === "error") setError(ev.message ?? "AI stream failed.");
          }
        }
        setStatus("ready");
      } catch {
        setError("AI server is unreachable at the moment. Please try again later.");
        setStatus("ready");
      }
    },
    [messages],
  );

  return { messages, status, error, sendMessage };
}
