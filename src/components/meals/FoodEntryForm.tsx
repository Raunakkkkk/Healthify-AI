import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Pencil, Flame, ChevronLeft } from "lucide-react";
import { useEntryStore } from "@/store/entryStore";
import {
  searchFoods,
  getCategoryLabel,
  type FoodItem,
} from "@/lib/foodDatabase";
import type { MealType } from "@/types";
import toast from "react-hot-toast";

interface Props {
  open: boolean;
  onClose: () => void;
  defaultMeal?: MealType;
  editEntry?: any;
}

export default function FoodEntryForm({
  open,
  onClose,
  defaultMeal = "breakfast",
  editEntry,
}: Props) {
  const { createEntry, updateEntry } = useEntryStore();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"search" | "manual">(
    editEntry ? "manual" : "search",
  );
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodItem[]>(() => searchFoods(""));
  const [servings, setServings] = useState(1);
  const searchRef = useRef<HTMLInputElement>(null);

  const initialMicros = editEntry?.micronutrients
    ? (editEntry.micronutrients instanceof Map
        ? Object.fromEntries(editEntry.micronutrients as Map<string, number>)
        : (editEntry.micronutrients as Record<string, number>))
    : undefined;

  const [form, setForm] = useState({
    mealType: editEntry?.mealType || defaultMeal,
    foodName: editEntry?.foodName || "",
    quantity: editEntry?.quantity || 1,
    unit: editEntry?.unit || "serving",
    calories: editEntry?.calories || "",
    protein: editEntry?.macros?.protein || "",
    carbs: editEntry?.macros?.carbs || "",
    fats: editEntry?.macros?.fats || "",
    micronutrients: initialMicros as Record<string, number> | undefined,
  });

  useEffect(() => {
    setResults(searchFoods(query));
  }, [query]);

  useEffect(() => {
    if (open && mode === "search") {
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [open, mode]);

  const selectFood = (food: FoodItem) => {
    setServings(1);
    setForm({
      ...form,
      foodName: food.name,
      quantity: food.quantity,
      unit: food.unit,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fats: food.fats,
      micronutrients: food.micronutrients ? { ...food.micronutrients } : undefined,
    });
    setMode("manual");
  };

  const handleServingsChange = (val: number) => {
    if (val < 0.5) return;
    const ratio = val / servings;
    setServings(val);
    setForm((prev) => {
      const next = {
        ...prev,
        quantity: +(Number(prev.quantity) * ratio).toFixed(1),
        calories: +(Number(prev.calories) * ratio).toFixed(0),
        protein: +(Number(prev.protein) * ratio).toFixed(1),
        carbs: +(Number(prev.carbs) * ratio).toFixed(1),
        fats: +(Number(prev.fats) * ratio).toFixed(1),
      };
      if (prev.micronutrients && Object.keys(prev.micronutrients).length > 0) {
        next.micronutrients = Object.fromEntries(
          Object.entries(prev.micronutrients).map(([k, v]) => [
            k,
            Math.round(Number(v) * ratio * 100) / 100,
          ])
        );
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: {
        mealType: MealType;
        foodName: string;
        quantity: number;
        unit: string;
        calories: number;
        macros: { protein: number; carbs: number; fats: number };
        source: "manual";
        micronutrients?: Record<string, number>;
      } = {
        mealType: form.mealType as MealType,
        foodName: form.foodName,
        quantity: Number(form.quantity),
        unit: form.unit,
        calories: Number(form.calories),
        macros: {
          protein: Number(form.protein),
          carbs: Number(form.carbs),
          fats: Number(form.fats),
        },
        source: "manual" as const,
      };
      if (form.micronutrients && Object.keys(form.micronutrients).length > 0) {
        payload.micronutrients = form.micronutrients;
      }

      if (editEntry) {
        await updateEntry(editEntry._id, payload);
        toast.success("Entry updated");
      } else {
        await createEntry(payload);
        toast.success("Food logged!");
      }
      onClose();
    } catch {
      toast.error("Failed to save entry");
    } finally {
      setLoading(false);
    }
  };

  const set = (key: string, val: string | number) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const grouped = results.reduce<Record<string, FoodItem[]>>((acc, food) => {
    const cat = food.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(food);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="flex h-[80vh] max-h-[600px] flex-col overflow-hidden sm:max-w-md">
        <DialogHeader className="shrink-0">
          <DialogTitle>{editEntry ? "Edit Entry" : "Log Food"}</DialogTitle>
          <DialogDescription>
            {editEntry
              ? "Update the details below."
              : mode === "search"
                ? "Search or pick a food item."
                : "Review and adjust the details."}
          </DialogDescription>
        </DialogHeader>

        {mode === "search" && !editEntry ? (
          <div className="flex min-h-0 flex-1 flex-col">
            {/* Search input */}
            <div className="relative shrink-0">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or ingredient…"
                className="pl-9"
              />
            </div>

            {/* Results */}
            <ScrollArea className="mt-3 min-h-0 flex-1">
              <div className="space-y-4 pr-3 pb-2">
                {Object.entries(grouped).map(([cat, foods]) => (
                  <div key={cat}>
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {getCategoryLabel(cat as FoodItem["category"])}
                    </p>
                    <div className="space-y-1">
                      {foods.map((food) => (
                        <button
                          key={food.name}
                          type="button"
                          onClick={() => selectFood(food)}
                          className="flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors hover:bg-accent"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {food.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {food.quantity} {food.unit} · P:{food.protein}g ·
                              C:{food.carbs}g · F:{food.fats}g
                            </p>
                          </div>
                          <div className="ml-3 flex shrink-0 items-center gap-1.5">
                            <Flame className="h-3.5 w-3.5 text-orange-500" />
                            <span className="text-sm font-semibold">
                              {food.calories}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {results.length === 0 && (
                  <div className="py-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      No foods found for "{query}"
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Manual entry link */}
            <div className="shrink-0 mt-3 flex items-center justify-between border-t pt-3">
              <p className="text-xs text-muted-foreground">Can't find it?</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMode("manual")}
                className="gap-1.5"
              >
                <Pencil className="h-3.5 w-3.5" />
                Manual Entry
              </Button>
            </div>
          </div>
        ) : (
          <ScrollArea className="min-h-0 flex-1">
            <form onSubmit={handleSubmit} className="space-y-5 pr-3">
              {/* Back to search (only if not editing) */}
              {!editEntry && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setMode("search");
                    setQuery("");
                    setForm((prev) => ({ ...prev, micronutrients: undefined }));
                  }}
                  className="gap-1 -ml-2 text-muted-foreground"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back to search
                </Button>
              )}

              {/* Selected food summary badge */}
              {form.foodName && !editEntry && (
                <div className="flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2">
                  <Flame className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-medium">{form.foodName}</span>
                  <Badge variant="outline" className="ml-auto">
                    {form.calories} kcal
                  </Badge>
                </div>
              )}

              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div className="col-span-2 space-y-1.5">
                  <Label>Food Name</Label>
                  <Input
                    value={form.foodName}
                    onChange={(e) => set("foodName", e.target.value)}
                    placeholder="e.g. Grilled salmon, oatmeal"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Meal</Label>
                  <Select
                    value={form.mealType}
                    onValueChange={(v) => set("mealType", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="breakfast">Breakfast</SelectItem>
                      <SelectItem value="lunch">Lunch</SelectItem>
                      <SelectItem value="dinner">Dinner</SelectItem>
                      <SelectItem value="snack">Snack</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Calories</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.calories}
                    onChange={(e) => set("calories", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Servings</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={() =>
                        handleServingsChange(Math.max(0.5, servings - 0.5))
                      }
                    >
                      −
                    </Button>
                    <Input
                      type="number"
                      min={0.5}
                      step={0.5}
                      value={servings}
                      onChange={(e) =>
                        handleServingsChange(Number(e.target.value) || 1)
                      }
                      className="text-center"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={() => handleServingsChange(servings + 0.5)}
                    >
                      +
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Unit</Label>
                  <Select
                    value={form.unit}
                    onValueChange={(v) => set("unit", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose serving size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="serving">Serving</SelectItem>
                      <SelectItem value="piece">Piece</SelectItem>
                      <SelectItem value="cup">Cup</SelectItem>
                      <SelectItem value="bowl">Bowl</SelectItem>
                      <SelectItem value="plate">Plate</SelectItem>
                      <SelectItem value="glass">Glass</SelectItem>
                      <SelectItem value="tablespoon">Tablespoon</SelectItem>
                      <SelectItem value="teaspoon">Teaspoon</SelectItem>
                      <SelectItem value="slice">Slice</SelectItem>
                      <SelectItem value="g">Gram (g)</SelectItem>
                      <SelectItem value="oz">Ounce (oz)</SelectItem>
                      <SelectItem value="ml">Milliliter (ml)</SelectItem>
                      <SelectItem value="L">Liter (L)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Protein (g)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.1}
                    value={form.protein}
                    onChange={(e) => set("protein", e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Carbs (g)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.1}
                    value={form.carbs}
                    onChange={(e) => set("carbs", e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Fats (g)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.1}
                    value={form.fats}
                    onChange={(e) => set("fats", e.target.value)}
                  />
                </div>
              </div>

              {/* Macro bar */}
              {(Number(form.protein) > 0 ||
                Number(form.carbs) > 0 ||
                Number(form.fats) > 0) && (
                <MacroBar
                  protein={Number(form.protein)}
                  carbs={Number(form.carbs)}
                  fats={Number(form.fats)}
                />
              )}

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    loading ||
                    !form.foodName.toString().trim() ||
                    Number(form.calories) <= 0
                  }
                >
                  {loading ? "Saving..." : editEntry ? "Update" : "Log Food"}
                </Button>
              </DialogFooter>
            </form>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MacroBar({
  protein,
  carbs,
  fats,
}: {
  protein: number;
  carbs: number;
  fats: number;
}) {
  const pCal = protein * 4;
  const cCal = carbs * 4;
  const fCal = fats * 9;
  const total = pCal + cCal + fCal;
  if (total === 0) return null;

  const pPct = Math.round((pCal / total) * 100);
  const cPct = Math.round((cCal / total) * 100);
  const fPct = 100 - pPct - cPct;

  return (
    <div className="space-y-1.5">
      <div className="flex h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="bg-blue-500 transition-all"
          style={{ width: `${pPct}%` }}
        />
        <div
          className="bg-amber-500 transition-all"
          style={{ width: `${cPct}%` }}
        />
        <div
          className="bg-rose-500 transition-all"
          style={{ width: `${fPct}%` }}
        />
      </div>
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />P {pPct}%
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />C {cPct}%
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />F {fPct}%
        </span>
        <span className="font-medium text-foreground">{total} kcal</span>
      </div>
    </div>
  );
}
