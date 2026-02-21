import { useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { X, Send, Bot, User, Loader2, Sparkles, UtensilsCrossed, Target, BarChart3, Pencil, Trash2, CalendarDays } from "lucide-react";
import { useChatStore } from "@/store/chatStore";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  { text: "Log 2 rotis and dal for lunch", icon: UtensilsCrossed },
  { text: "What did I eat today?", icon: BarChart3 },
  { text: "Delete my last snack entry", icon: Trash2 },
  { text: "Give me a weekly summary", icon: Sparkles },
];

export default function ChatPanel() {
  const { open, toggleChat } = useChatStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading, setInput, reload } = useChat({
    api: "/api/ai/chat",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
    },
    onError: (err) => {
      console.error("Chat error:", err);
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  if (!open) return null;

  const handleSuggestion = (text: string) => {
    setInput(text);
  };

  const toolInvocations = (msg: (typeof messages)[0]) => {
    if (!("toolInvocations" in msg)) return null;
    const invocations = (msg as any).toolInvocations;
    if (!invocations?.length) return null;

    return invocations.map((inv: any, i: number) => {
      if (inv.state !== "result") return null;

      const name = inv.toolName;
      if (name === "logMeal" && inv.result?.success) {
        const { logged, dailyTotals } = inv.result;
        return (
          <div key={i} className="mt-2 rounded-md border bg-primary/5 p-2 text-xs">
            <div className="flex items-center gap-1.5 font-medium text-primary">
              <UtensilsCrossed className="h-3 w-3" />
              Logged: {logged.foodName}
            </div>
            <p className="mt-0.5 text-muted-foreground">
              {logged.calories} kcal &middot; P:{logged.protein}g C:{logged.carbs}g F:{logged.fats}g
            </p>
            {dailyTotals && (
              <p className="mt-0.5 text-muted-foreground">
                Daily total: {dailyTotals.calories} kcal
              </p>
            )}
          </div>
        );
      }

      if (name === "updateGoal" && inv.result?.success) {
        const g = inv.result.goals;
        return (
          <div key={i} className="mt-2 rounded-md border bg-primary/5 p-2 text-xs">
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

      if (name === "editEntry" && inv.result?.success) {
        const u = inv.result.updated;
        return (
          <div key={i} className="mt-2 rounded-md border bg-amber-500/10 p-2 text-xs">
            <div className="flex items-center gap-1.5 font-medium text-amber-600">
              <Pencil className="h-3 w-3" />
              Updated: {u.foodName}
            </div>
            <p className="mt-0.5 text-muted-foreground">
              {u.calories} kcal &middot; P:{u.protein}g C:{u.carbs}g F:{u.fats}g
            </p>
          </div>
        );
      }

      if (name === "deleteEntry" && inv.result?.success) {
        const d = inv.result.deleted;
        return (
          <div key={i} className="mt-2 rounded-md border bg-destructive/10 p-2 text-xs">
            <div className="flex items-center gap-1.5 font-medium text-destructive">
              <Trash2 className="h-3 w-3" />
              Deleted: {d.foodName}
            </div>
            <p className="mt-0.5 text-muted-foreground">
              {d.mealType} &middot; {d.calories} kcal removed
            </p>
          </div>
        );
      }

      if (name === "deleteGoal" && inv.result?.success) {
        return (
          <div key={i} className="mt-2 rounded-md border bg-destructive/10 p-2 text-xs">
            <div className="flex items-center gap-1.5 font-medium text-destructive">
              <Trash2 className="h-3 w-3" />
              Goals cleared
            </div>
          </div>
        );
      }

      if (name === "getEntriesByDate" && inv.result?.entries) {
        const r = inv.result;
        return (
          <div key={i} className="mt-2 rounded-md border bg-primary/5 p-2 text-xs">
            <div className="flex items-center gap-1.5 font-medium text-primary">
              <CalendarDays className="h-3 w-3" />
              {r.date} &middot; {r.entryCount} entries
            </div>
            <p className="mt-0.5 text-muted-foreground">
              Total: {r.totals.calories} kcal &middot; P:{r.totals.protein}g C:{r.totals.carbs}g F:{r.totals.fats}g
            </p>
          </div>
        );
      }

      return null;
    });
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex h-[520px] w-[400px] flex-col rounded-xl border bg-card shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">NutriTrack AI</p>
            <p className="text-[10px] text-muted-foreground">Powered by Gemini &middot; Vercel AI SDK</p>
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
                    onClick={() => handleSuggestion(s.text)}
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
                {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}
                {toolInvocations(msg)}
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
            value={input}
            onChange={handleInputChange}
            placeholder="Log a meal, ask about nutrition..."
            disabled={isLoading}
            className="text-sm"
          />
          <Button type="submit" size="icon" disabled={!input.trim() || isLoading}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
