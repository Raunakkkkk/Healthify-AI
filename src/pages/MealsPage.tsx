import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import MealTimeline from "@/components/meals/MealTimeline";
import FoodEntryForm from "@/components/meals/FoodEntryForm";
import ImageUpload from "@/components/meals/ImageUpload";

export default function MealsPage() {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Meals</h1>
          <p className="text-muted-foreground">Track your daily food intake</p>
        </div>
        <div className="flex gap-2">
          <ImageUpload />
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Log Food
          </Button>
        </div>
      </div>

      <MealTimeline />

      {showForm && <FoodEntryForm open={showForm} onClose={() => setShowForm(false)} />}
    </div>
  );
}
