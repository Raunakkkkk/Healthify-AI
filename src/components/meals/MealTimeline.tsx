import { useEffect } from "react";
import { useEntryStore } from "@/store/entryStore";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import MealCard from "./MealCard";
import type { MealType } from "@/types";
import { formatDate, isToday } from "@/lib/utils";

const meals: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

export default function MealTimeline() {
  const { entries, selectedDate, setSelectedDate, fetchEntries, loading } = useEntryStore();

  useEffect(() => {
    fetchEntries();
  }, [selectedDate, fetchEntries]);

  const prevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const nextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    const today = new Date().toISOString().split("T")[0];
    if (d.toISOString().split("T")[0] <= today) {
      setSelectedDate(d.toISOString().split("T")[0]);
    }
  };

  const goToday = () => setSelectedDate(new Date().toISOString().split("T")[0]);

  const entriesByMeal = (meal: MealType) =>
    entries.filter((e) => e.mealType === meal);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevDay}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center">
            <h3 className="text-sm font-semibold">
              {isToday(selectedDate) ? "Today" : formatDate(selectedDate)}
            </h3>
            <p className="text-xs text-muted-foreground">{selectedDate}</p>
          </div>
          <Button variant="outline" size="icon" onClick={nextDay} disabled={isToday(selectedDate)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {!isToday(selectedDate) && (
          <Button variant="ghost" size="sm" onClick={goToday}>
            Today
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg border bg-muted" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {meals.map((meal) => (
            <MealCard key={meal} mealType={meal} entries={entriesByMeal(meal)} />
          ))}
        </div>
      )}
    </div>
  );
}
