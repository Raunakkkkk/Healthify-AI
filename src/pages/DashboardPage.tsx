import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Camera, Target, TrendingUp } from "lucide-react";
import CalorieRing from "@/components/dashboard/CalorieRing";
import MacroRings from "@/components/dashboard/MacroRings";
import WeeklySparkline from "@/components/dashboard/WeeklySparkline";
import FoodEntryForm from "@/components/meals/FoodEntryForm";
import ImageUpload from "@/components/meals/ImageUpload";
import { useGoalStore } from "@/store/goalStore";
import { useEntryStore } from "@/store/entryStore";
import api from "@/lib/api";
import type { DailyCalories } from "@/types";
import { useNavigate } from "react-router-dom";

export default function DashboardPage() {
  const { currentGoal, fetchCurrentGoal } = useGoalStore();
  const { entries, fetchEntries } = useEntryStore();
  const [weeklyData, setWeeklyData] = useState<DailyCalories[]>([]);
  const [weeklyLoading, setWeeklyLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCurrentGoal();
    fetchEntries();
    loadWeekly();
  }, [fetchCurrentGoal, fetchEntries]);

  const loadWeekly = async () => {
    try {
      const { data } = await api.get<DailyCalories[]>(
        "/reports/weekly-calories",
      );
      setWeeklyData(data);
    } catch {
      // Non-critical
    } finally {
      setWeeklyLoading(false);
    }
  };

  const todayCalories = entries.reduce((s, e) => s + e.calories, 0);
  const todayProtein = entries.reduce(
    (s, e) => s + (e.macros?.protein || 0),
    0,
  );
  const todayCarbs = entries.reduce((s, e) => s + (e.macros?.carbs || 0), 0);
  const todayFats = entries.reduce((s, e) => s + (e.macros?.fats || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between lg:gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground lg:text-base">
            Your nutrition overview for today
          </p>
        </div>
        <div className="flex w-full gap-2 [&>*]:min-w-0 [&>*]:flex-1 sm:w-auto sm:flex-initial sm:flex-wrap [&>*]:sm:flex-none sm:gap-3 lg:gap-4 lg:shrink-0">
          <ImageUpload />
          <Button
            onClick={() => setShowAddForm(true)}
            size="sm"
            className="gap-2 sm:h-10 sm:px-4 lg:h-11 lg:gap-2.5 lg:px-6 lg:text-base"
          >
            <Plus className="h-4 w-4 lg:h-5 lg:w-5" />
            <span>Log Food</span>
          </Button>
        </div>
      </div>

      {/* Goal prompt when no goal is set */}
      {!currentGoal && (
        <Card className="border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-background">
          <CardContent className="flex flex-col items-center gap-4 p-6 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Target className="h-6 w-6" />
              </div>
              <div>
                <p className="text-lg font-semibold">Set your daily targets</p>
                <p className="text-sm text-muted-foreground">
                  Define calorie, protein, carbs, fats, and weight goals to
                  start tracking progress.
                </p>
              </div>
            </div>
            <Button
              size="lg"
              onClick={() => navigate("/goals")}
              className="shrink-0 gap-2"
            >
              <Target className="h-4 w-4" /> Set Goals
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Main stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Today's Calories
            </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center pt-2">
            <CalorieRing
              consumed={todayCalories}
              target={currentGoal?.calorieTarget || 0}
            />
          </CardContent>
        </Card>

        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Macros
            </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center pt-4">
            <MacroRings
              protein={todayProtein}
              carbs={todayCarbs}
              fats={todayFats}
              proteinTarget={currentGoal?.proteinTarget || 0}
              carbsTarget={currentGoal?.carbsTarget || 0}
              fatTarget={currentGoal?.fatTarget || 0}
            />
          </CardContent>
        </Card>

        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              7-Day Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {weeklyLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <WeeklySparkline
                data={weeklyData}
                calorieTarget={currentGoal?.calorieTarget}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          className="cursor-pointer transition-colors hover:bg-muted/50"
          onClick={() => navigate("/meals")}
        >
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{entries.length}</p>
              <p className="text-xs text-muted-foreground">Entries today</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer transition-colors hover:bg-muted/50"
          onClick={() => navigate("/goals")}
        >
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-blue-500/10 p-2.5">
              <Target className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {currentGoal?.calorieTarget || "—"}
              </p>
              <p className="text-xs text-muted-foreground">Calorie target</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-amber-500/10 p-2.5">
              <Camera className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {entries.filter((e) => e.source === "ai").length}
              </p>
              <p className="text-xs text-muted-foreground">AI-logged entries</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-emerald-500/10 p-2.5">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {currentGoal && currentGoal.calorieTarget > 0
                  ? `${Math.round((todayCalories / currentGoal.calorieTarget) * 100)}%`
                  : "—"}
              </p>
              <p className="text-xs text-muted-foreground">Goal progress</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent meals summary */}
      {entries.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Entries</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/meals")}
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {entries.slice(0, 5).map((entry) => (
                <div
                  key={entry._id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{entry.foodName}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {entry.mealType}
                    </p>
                  </div>
                  <span className="text-sm font-semibold">
                    {entry.calories} kcal
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {showAddForm && (
        <FoodEntryForm
          open={showAddForm}
          onClose={() => setShowAddForm(false)}
        />
      )}
    </div>
  );
}
