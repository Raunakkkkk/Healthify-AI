import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useEntryStore } from "@/store/entryStore";
import FoodEntryForm from "./FoodEntryForm";
import type { FoodEntry, MealType } from "@/types";
import { getMealEmoji, formatTime } from "@/lib/utils";
import toast from "react-hot-toast";

interface Props {
  mealType: MealType;
  entries: FoodEntry[];
}

const mealLabels: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snacks",
};

export default function MealCard({ mealType, entries }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<FoodEntry | null>(null);
  const deleteEntry = useEntryStore((s) => s.deleteEntry);

  const totalCals = entries.reduce((s, e) => s + e.calories, 0);

  const handleDelete = async (id: string) => {
    try {
      await deleteEntry(id);
      toast.success("Entry deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">{getMealEmoji(mealType)}</span>
            <CardTitle className="text-base">{mealLabels[mealType]}</CardTitle>
            {totalCals > 0 && (
              <Badge variant="secondary" className="ml-2">{totalCals} kcal</Badge>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
            <Plus className="mr-1 h-4 w-4" /> Add
          </Button>
        </CardHeader>

        <CardContent>
          {entries.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No entries yet. Tap Add to log food.
            </p>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => (
                <div
                  key={entry._id}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{entry.foodName}</p>
                      {entry.source === "ai" && (
                        <Badge variant="outline" className="text-[10px]">AI</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {entry.quantity} {entry.unit} &middot; {entry.calories} kcal
                      {entry.macros && (
                        <> &middot; P:{entry.macros.protein}g C:{entry.macros.carbs}g F:{entry.macros.fats}g</>
                      )}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{formatTime(entry.timestamp)}</p>
                  </div>

                  <div className="ml-2 flex gap-1">
                    <Button
                      size="icon" variant="ghost" className="h-8 w-8"
                      onClick={() => { setEditingEntry(entry); setShowForm(true); }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(entry._id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showForm && (
        <FoodEntryForm
          open={showForm}
          onClose={() => { setShowForm(false); setEditingEntry(null); }}
          defaultMeal={mealType}
          editEntry={editingEntry}
        />
      )}
    </>
  );
}
