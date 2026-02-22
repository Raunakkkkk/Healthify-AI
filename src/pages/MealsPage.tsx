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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between lg:gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">
            Meals
          </h1>
          <p className="text-sm text-muted-foreground lg:text-base">
            Track your daily food intake
          </p>
        </div>
        <div className="flex w-full gap-2 [&>*]:min-w-0 [&>*]:flex-1 sm:w-auto sm:flex-initial sm:flex-wrap [&>*]:sm:flex-none sm:gap-3 lg:gap-4 lg:shrink-0">
          <ImageUpload />
          <Button
            onClick={() => setShowForm(true)}
            size="sm"
            className="gap-2 sm:h-10 sm:px-4 lg:h-11 lg:gap-2.5 lg:px-6 lg:text-base"
          >
            <Plus className="h-4 w-4 lg:h-5 lg:w-5" />
            <span>Log Food</span>
          </Button>
        </div>
      </div>

      <MealTimeline />

      {showForm && (
        <FoodEntryForm open={showForm} onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}
