import { useEffect, useRef, useState, useMemo, type FormEvent } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { startOfDay, endOfDay, subDays } from "date-fns";
import {
  X, Send, Bot, User, Loader2, Sparkles,
  UtensilsCrossed, Target, BarChart3, Pencil, Trash2, CalendarDays,
} from "lucide-react";
import { useChatStore } from "@/store/chatStore";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const SUGGESTIONS = [
  { text: "Log 2 rotis and dal for lunch", icon: UtensilsCrossed },
  { text: "What did I eat today?", icon: BarChart3 },
  { text: "Delete my last snack entry", icon: Trash2 },
  { text: "Give me a weekly summary", icon: Sparkles },
];

/** Hide raw tool-call JSON that sometimes leaks into model text. */
function filterToolCallJson(text: string): string {
  const lines = text.split("\n");
  const filtered = lines.filter(
    (line) =>
      !/^\s*\{\s*"name"\s*:\s*"[^"]+"\s*,\s*"parameters"\s*:\s*\{[^}]*\}\s*\}\s*$/.test(
        line.trim()
      )
  );
  const out = filtered.join("\n").trim();
  return out.length > 0 ? out : "";
}

function ToolResultCard({ part }: { part: Record<string, unknown> }) {
  const type = part.type as string;
  const state = part.state as string;
  if (state !== "output-available") return null;

  const result = part.output as Record<string, unknown> | null;
  if (!result) return null;

  if (type === "tool-logMeal") {
    if (result.success) {
      const logged = result.logged as Record<string, unknown>;
      const dailyTotals = result.dailyTotals as Record<string, number> | null;
      return (
        <div className="mt-2 rounded-md border bg-primary/5 p-2 text-xs">
          <div className="flex items-center gap-1.5 font-medium text-primary">
            <UtensilsCrossed className="h-3 w-3" />
            Logged: {String(logged.foodName)}
          </div>
          <p className="mt-0.5 text-muted-foreground">
            {String(logged.calories)} kcal &middot; P:{String(logged.protein)}g C:{String(logged.carbs)}g F:{String(logged.fats)}g
          </p>
          {dailyTotals && (
            <p className="mt-0.5 text-muted-foreground">
              Daily total: {dailyTotals.calories} kcal
            </p>
          )}
        </div>
      );
    }
    return (
      <div className="mt-2 rounded-md border bg-destructive/10 p-2 text-xs">
        <div className="flex items-center gap-1.5 font-medium text-destructive">
          <UtensilsCrossed className="h-3 w-3" />
          Could not log meal
        </div>
        <p className="mt-0.5 text-muted-foreground">
          {String(result.error ?? "Unknown error")}
        </p>
      </div>
    );
  }

  if (type === "tool-updateGoal" && result.success) {
    const g = result.goals as Record<string, number>;
    return (
      <div className="mt-2 rounded-md border bg-primary/5 p-2 text-xs">
        <div className="flex items-center gap-1.5 font-medium text-primary">
          <Target className="h-3 w-3" />
          Goals updated
        </div>
        <p className="mt-0.5 text-muted-foreground">
          {g.calorieTarget > 0 && `${g.calorieTarget} kcal`}
          {g.proteinTarget > 0 && ` · P:${g.proteinTarget}g`}
          {g.carbsTarget > 0 && ` · C:${g.carbsTarget}g`}
          {g.fatTarget > 0 && ` · F:${g.fatTarget}g`}
        </p>
      </div>
    );
  }

  if (type === "tool-editEntry" && result.success) {
    const u = result.updated as Record<string, unknown>;
    return (
      <div className="mt-2 rounded-md border bg-amber-500/10 p-2 text-xs">
        <div className="flex items-center gap-1.5 font-medium text-amber-600">
          <Pencil className="h-3 w-3" />
          Updated: {String(u.foodName)}
        </div>
        <p className="mt-0.5 text-muted-foreground">
          {String(u.calories)} kcal &middot; P:{String(u.protein)}g C:{String(u.carbs)}g F:{String(u.fats)}g
        </p>
      </div>
    );
  }

  if (type === "tool-deleteEntry" && result.success) {
    const d = result.deleted as Record<string, unknown>;
    return (
      <div className="mt-2 rounded-md border bg-destructive/10 p-2 text-xs">
        <div className="flex items-center gap-1.5 font-medium text-destructive">
          <Trash2 className="h-3 w-3" />
          Deleted: {String(d.foodName)}
        </div>
        <p className="mt-0.5 text-muted-foreground">
          {String(d.mealType)} &middot; {String(d.calories)} kcal removed
        </p>
      </div>
    );
  }

  if (type === "tool-deleteGoal" && result.success) {
    return (
      <div className="mt-2 rounded-md border bg-destructive/10 p-2 text-xs">
        <div className="flex items-center gap-1.5 font-medium text-destructive">
          <Trash2 className="h-3 w-3" />
          Goals cleared
        </div>
      </div>
    );
  }

  if (type === "tool-getEntriesByDate") {
    const entries = result.entries as unknown[];
    if (!entries) return null;
    const totals = result.totals as Record<string, number>;
    return (
      <div className="mt-2 rounded-md border bg-primary/5 p-2 text-xs">
        <div className="flex items-center gap-1.5 font-medium text-primary">
          <CalendarDays className="h-3 w-3" />
          {String(result.date)} &middot; {String(result.entryCount)} entries
        </div>
        <p className="mt-0.5 text-muted-foreground">
          Total: {totals.calories} kcal &middot; P:{totals.protein}g C:{totals.carbs}g F:{totals.fats}g
        </p>
      </div>
    );
  }

  if (type === "tool-getTodayEntries") {
    const entries = (result.entries as unknown[]) ?? [];
    const totals = result.totals as Record<string, number> | undefined;
    const remaining = result.remaining as Record<string, number> | undefined;
    if (!totals) return null;
    return (
      <div className="mt-2 rounded-md border bg-primary/5 p-2 text-xs">
        <div className="flex items-center gap-1.5 font-medium text-primary">
          <BarChart3 className="h-3 w-3" />
          Today &middot; {entries.length} {entries.length === 1 ? "entry" : "entries"}
        </div>
        <p className="mt-0.5 text-muted-foreground">
          Total: {totals.calories} kcal &middot; P:{totals.protein}g C:{totals.carbs}g F:{totals.fats}g
        </p>
        {remaining && remaining.calories != null && (
          <p className="mt-0.5 text-muted-foreground">
            Remaining: {remaining.calories} kcal
          </p>
        )}
      </div>
    );
  }

  if (type === "tool-getCurrentGoals") {
    const hasGoals = result.hasGoals as boolean | undefined;
    if (!hasGoals) return null;
    return (
      <div className="mt-2 rounded-md border bg-primary/5 p-2 text-xs">
        <div className="flex items-center gap-1.5 font-medium text-primary">
          <Target className="h-3 w-3" />
          Your goals
        </div>
        <p className="mt-0.5 text-muted-foreground">
          {(result.calories as number) > 0 && `${result.calories} kcal/day`}
          {(result.protein as number) > 0 && ` · P:${result.protein}g`}
          {(result.carbs as number) > 0 && ` · C:${result.carbs}g`}
          {(result.fats as number) > 0 && ` · F:${result.fats}g`}
        </p>
      </div>
    );
  }

  if (type === "tool-getWeeklySummary") {
    const averages = result.averages as Record<string, number> | undefined;
    const targets = result.targets as Record<string, number> | undefined;
    return (
      <div className="mt-2 rounded-md border bg-primary/5 p-2 text-xs">
        <div className="flex items-center gap-1.5 font-medium text-primary">
          <BarChart3 className="h-3 w-3" />
          7-day summary
        </div>
        {averages && (
          <p className="mt-0.5 text-muted-foreground">
            Daily avg: {averages.calories ?? 0} kcal &middot; P:{averages.protein ?? 0}g C:{averages.carbs ?? 0}g F:{averages.fats ?? 0}g
          </p>
        )}
        {targets && (targets.calories ?? 0) > 0 && (
          <p className="mt-0.5 text-muted-foreground">
            Target: {targets.calories} kcal/day
          </p>
        )}
      </div>
    );
  }

  return null;
}

export default function ChatPanel() {
  const { open, toggleChat } = useChatStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState("");

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/ai/chat",
        headers: () => {
          const now = new Date();
          const start = startOfDay(now).toISOString();
          const end = endOfDay(now).toISOString();
          const weekStart = startOfDay(subDays(now, 6)).toISOString();
          const weekEnd = endOfDay(now).toISOString();
          return {
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
            "X-Today-Start": start,
            "X-Today-End": end,
            "X-Week-Start": weekStart,
            "X-Week-End": weekEnd,
          };
        },
        fetch: (input, init) => {
          const now = new Date();
          const start = startOfDay(now).toISOString();
          const end = endOfDay(now).toISOString();
          const weekStart = startOfDay(subDays(now, 6)).toISOString();
          const weekEnd = endOfDay(now).toISOString();
          const base =
            typeof input === "string"
              ? input
              : input instanceof Request
                ? input.url
                : input.href;
          const urlObj = new URL(base, window.location.origin);
          urlObj.searchParams.set("start", start);
          urlObj.searchParams.set("end", end);
          urlObj.searchParams.set("weekStart", weekStart);
          urlObj.searchParams.set("weekEnd", weekEnd);
          const url = urlObj.pathname + urlObj.search;
          if (input instanceof Request) {
            return fetch(new Request(url, input));
          }
          return fetch(url, init);
        },
      }),
    []
  );

  const { messages, sendMessage, status, error } = useChat({ transport });

  const isLoading = status === "streaming" || status === "submitted";

  useEffect(() => {
    if (error) {
      toast.error("AI server is unreachable at the moment. Please try again later.");
    }
  }, [error]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  if (!open) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const text = inputValue.trim();
    if (!text || isLoading) return;
    setInputValue("");
    sendMessage({ text });
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-card sm:inset-auto sm:bottom-4 sm:right-4 sm:h-[520px] sm:w-[400px] sm:rounded-xl sm:border sm:shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">NutriTrack AI</p>
            <p className="text-[10px] text-muted-foreground">Powered by Ollama · Vercel AI SDK</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleChat}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-3">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="py-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm font-semibold">What can I help you with?</p>
              <p className="mx-auto mt-1 max-w-[260px] text-xs text-muted-foreground">
                Log meals, check your goals, get nutrition info, or view weekly progress — all through chat.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.text}
                    onClick={() => setInputValue(s.text)}
                    className="flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-left text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <s.icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="line-clamp-2">{s.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
              {msg.role === "assistant" && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Bot className="h-3.5 w-3.5" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                {msg.parts.map((part, i) => {
                  if (part.type === "text" && part.text) {
                    const filtered =
                      msg.role === "assistant"
                        ? filterToolCallJson(part.text)
                        : part.text;
                    if (!filtered) return null;
                    return (
                      <p key={i} className="whitespace-pre-wrap">
                        {filtered}
                      </p>
                    );
                  }
                  if (typeof part.type === "string" && part.type.startsWith("tool-")) {
                    return <ToolResultCard key={i} part={part as unknown as Record<string, unknown>} />;
                  }
                  return null;
                })}
              </div>
              {msg.role === "user" && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary">
                  <User className="h-3.5 w-3.5" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Bot className="h-3.5 w-3.5" />
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Thinking...</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-3">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Log a meal, check goals, or ask anything…"
            disabled={isLoading}
            className="text-sm"
          />
          <Button type="submit" size="icon" disabled={!inputValue.trim() || isLoading}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
