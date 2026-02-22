import { useEffect, useState } from "react";
import { useEntryStore, type RangeMode } from "@/store/entryStore";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  ChevronLeft, ChevronRight, CalendarIcon,
  Flame, Beef, Wheat, Droplets,
} from "lucide-react";
import MealCard from "./MealCard";
import type { FoodEntry, MealType } from "@/types";
import { formatDate, isToday, todayLocalDateStr, dateToLocalDateStr } from "@/lib/utils";
import { format, addDays, addWeeks, addMonths, addQuarters, subDays, subWeeks, subMonths, subQuarters } from "date-fns";

const meals: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

function getRangeLabel(dateStr: string, mode: RangeMode): string {
  const d = new Date(dateStr + "T12:00:00");
  switch (mode) {
    case "day":
      return isToday(dateStr) ? "Today" : formatDate(dateStr);
    case "week": {
      const store = useEntryStore.getState();
      const { start, end } = store.getDateRange();
      return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
    }
    case "month":
      return format(d, "MMMM yyyy");
    case "quarter": {
      const q = Math.ceil((d.getMonth() + 1) / 3);
      return `Q${q} ${d.getFullYear()}`;
    }
  }
}

function navigateDate(dateStr: string, mode: RangeMode, direction: 1 | -1): string {
  const d = new Date(dateStr + "T12:00:00");
  const fn = direction === 1
    ? { day: addDays, week: addWeeks, month: addMonths, quarter: addQuarters }
    : { day: subDays, week: subWeeks, month: subMonths, quarter: subQuarters };
  return dateToLocalDateStr(fn[mode](d, 1));
}

export default function MealTimeline() {
  const {
    entries, pagination, selectedDate, rangeMode,
    setSelectedDate, fetchEntries, loading,
  } = useEntryStore();
  const [calOpen, setCalOpen] = useState(false);

  useEffect(() => {
    fetchEntries();
  }, [selectedDate, rangeMode, fetchEntries]);

  const prevPeriod = () => setSelectedDate(navigateDate(selectedDate, rangeMode, -1));
  const nextPeriod = () => {
    const next = navigateDate(selectedDate, rangeMode, 1);
    const today = todayLocalDateStr();
    if (next <= today) setSelectedDate(next);
  };

  const goToday = () => setSelectedDate(todayLocalDateStr());

  const entriesByMeal = (meal: MealType) =>
    entries.filter((e) => e.mealType === meal);

  const entriesByDate = entries.reduce<Record<string, FoodEntry[]>>((acc, e) => {
    const day = e.timestamp.split("T")[0];
    if (!acc[day]) acc[day] = [];
    acc[day].push(e);
    return acc;
  }, {});

  const sortedDates = Object.keys(entriesByDate).sort((a, b) => b.localeCompare(a));

  const canGoForward = navigateDate(selectedDate, rangeMode, 1) <= todayLocalDateStr();

  const totalCalories = entries.reduce((s, e) => s + e.calories, 0);
  const totalProtein = entries.reduce((s, e) => s + (e.macros?.protein ?? 0), 0);
  const totalCarbs = entries.reduce((s, e) => s + (e.macros?.carbs ?? 0), 0);
  const totalFats = entries.reduce((s, e) => s + (e.macros?.fats ?? 0), 0);

  const totalsLabel =
    rangeMode === "day"
      ? isToday(selectedDate)
        ? "Today's total"
        : `Total for ${formatDate(selectedDate)}`
      : "Period total";

  return (
    <div className="space-y-4">
      {/* Date navigation + calendar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevPeriod}>
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Popover open={calOpen} onOpenChange={setCalOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2 text-sm font-medium">
                <CalendarIcon className="h-4 w-4" />
                {getRangeLabel(selectedDate, rangeMode)}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto p-0 z-[100] shadow-lg"
              align="center"
              side="bottom"
              sideOffset={8}
              avoidCollisions={true}
              collisionPadding={12}
            >
              <Calendar
                mode="single"
                selected={new Date(selectedDate + "T12:00:00")}
                defaultMonth={new Date()}
                onSelect={(day) => {
                  if (day) {
                    setSelectedDate(dateToLocalDateStr(day));
                    setCalOpen(false);
                  }
                }}
                disabled={(date) => date > new Date()}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextPeriod} disabled={!canGoForward}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isToday(selectedDate) && (
            <Button variant="ghost" size="sm" onClick={goToday} className="text-xs">
              Go to Today
            </Button>
          )}
        </div>

        {pagination.total > 0 && (
          <span className="text-xs text-muted-foreground">
            {pagination.total} {pagination.total === 1 ? "entry" : "entries"}
          </span>
        )}
      </div>

      {/* Today's / period total: calories + macros with icons */}
      {entries.length > 0 && (
        <div className="rounded-lg border bg-muted/40 px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {totalsLabel}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-1.5">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="text-lg font-semibold tabular-nums">{totalCalories} kcal</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground tabular-nums">
              <span className="flex items-center gap-1">
                <Beef className="h-3.5 w-3.5" />
                Protein: {totalProtein}g
              </span>
              <span className="flex items-center gap-1">
                <Wheat className="h-3.5 w-3.5" />
                Carbs: {totalCarbs}g
              </span>
              <span className="flex items-center gap-1">
                <Droplets className="h-3.5 w-3.5" />
                Fats: {totalFats}g
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg border bg-muted" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">No entries for this period</p>
        </div>
      ) : rangeMode === "day" ? (
        /* Day view — grouped by meal type */
        <div className="space-y-4">
          {meals.map((meal) => (
            <MealCard key={meal} mealType={meal} entries={entriesByMeal(meal)} />
          ))}
        </div>
      ) : (
        /* Week / Month / Quarter — grouped by date */
        <div className="space-y-5">
          {sortedDates.map((date) => {
            const dayEntries = entriesByDate[date];
            const totalCal = dayEntries.reduce((s, e) => s + e.calories, 0);
            return (
              <div key={date}>
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-sm font-semibold">
                    {isToday(date) ? "Today" : formatDate(date)}
                  </h4>
                  <span className="text-xs font-medium text-muted-foreground">
                    {totalCal} kcal · {dayEntries.length} {dayEntries.length === 1 ? "entry" : "entries"}
                  </span>
                </div>
                <div className="space-y-3">
                  {meals.map((meal) => {
                    const mealEntries = dayEntries.filter((e) => e.mealType === meal);
                    if (mealEntries.length === 0) return null;
                    return <MealCard key={meal} mealType={meal} entries={mealEntries} />;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination — always shown; disabled when single page or no entries */}
      <div
        className={`flex items-center justify-between rounded-lg border p-3 ${pagination.total === 0 || pagination.pages <= 1 ? "opacity-60" : ""}`}
        aria-label="Pagination"
      >
        <p className="text-xs text-muted-foreground">
          Page {pagination.page} of {pagination.pages || 1}
          {pagination.total > 0 && (
            <span className="ml-1">({pagination.total} total)</span>
          )}
        </p>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={pagination.pages <= 1 || pagination.page <= 1}
            onClick={() => fetchEntries(pagination.page - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={pagination.pages <= 1 || pagination.page >= pagination.pages}
            onClick={() => fetchEntries(pagination.page + 1)}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
