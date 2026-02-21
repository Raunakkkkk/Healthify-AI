import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatTime(date: string | Date) {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function isToday(date: string | Date) {
  const d = new Date(date);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

/** Today's date in local timezone as YYYY-MM-DD (for entry store and calendar). */
export function todayLocalDateStr(): string {
  return dateToLocalDateStr(new Date());
}

/** Format a Date as local YYYY-MM-DD. */
export function dateToLocalDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getDateRange(days: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days + 1);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function getMealEmoji(meal: string) {
  const map: Record<string, string> = {
    breakfast: "🌅",
    lunch: "☀️",
    dinner: "🌙",
    snack: "🍿",
  };
  return map[meal] || "🍽️";
}

export function getConfidenceColor(score: number) {
  if (score >= 0.8) return "text-emerald-600";
  if (score >= 0.5) return "text-amber-600";
  return "text-red-600";
}

export function getConfidenceLabel(score: number) {
  if (score >= 0.8) return "High";
  if (score >= 0.5) return "Medium";
  return "Low";
}
