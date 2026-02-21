import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useEntryStore } from "@/store/entryStore";
import type { MealType } from "@/types";
import toast from "react-hot-toast";

interface Props {
  open: boolean;
  onClose: () => void;
  defaultMeal?: MealType;
  editEntry?: any;
}

export default function FoodEntryForm({ open, onClose, defaultMeal = "breakfast", editEntry }: Props) {
  const { createEntry, updateEntry } = useEntryStore();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    mealType: editEntry?.mealType || defaultMeal,
    foodName: editEntry?.foodName || "",
    quantity: editEntry?.quantity || 1,
    unit: editEntry?.unit || "serving",
    calories: editEntry?.calories || 0,
    protein: editEntry?.macros?.protein || 0,
    carbs: editEntry?.macros?.carbs || 0,
    fats: editEntry?.macros?.fats || 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
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

  const set = (key: string, val: string | number) => setForm((prev) => ({ ...prev, [key]: val }));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editEntry ? "Edit Entry" : "Log Food"}</DialogTitle>
          <DialogDescription>
            {editEntry ? "Update the details below." : "Add what you ate."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          <div className="grid grid-cols-2 gap-x-4 gap-y-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Food Name</Label>
              <Input value={form.foodName} onChange={(e) => set("foodName", e.target.value)} placeholder="e.g., Chicken breast" required />
            </div>

            <div className="space-y-1.5">
              <Label>Meal</Label>
              <Select value={form.mealType} onValueChange={(v) => set("mealType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
              <Input type="number" min={0} value={form.calories} onChange={(e) => set("calories", e.target.value)} required />
            </div>

            <div className="space-y-1.5">
              <Label>Quantity</Label>
              <Input type="number" min={0.1} step={0.1} value={form.quantity} onChange={(e) => set("quantity", e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Unit</Label>
              <Input value={form.unit} onChange={(e) => set("unit", e.target.value)} placeholder="serving, cup, g..." />
            </div>

            <div className="space-y-1.5">
              <Label>Protein (g)</Label>
              <Input type="number" min={0} step={0.1} value={form.protein} onChange={(e) => set("protein", e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Carbs (g)</Label>
              <Input type="number" min={0} step={0.1} value={form.carbs} onChange={(e) => set("carbs", e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Fats (g)</Label>
              <Input type="number" min={0} step={0.1} value={form.fats} onChange={(e) => set("fats", e.target.value)} />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              type="submit"
              disabled={loading || !form.foodName.trim() || Number(form.calories) <= 0}
            >
              {loading ? "Saving..." : editEntry ? "Update" : "Log Food"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
