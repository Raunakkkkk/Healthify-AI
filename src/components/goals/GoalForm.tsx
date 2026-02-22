import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Target,
  History,
  Save,
  Flame,
  Beef,
  Wheat,
  Droplets,
  Weight,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Calendar as CalendarIcon,
  X,
} from "lucide-react";
import { useGoalStore } from "@/store/goalStore";
import { cn, formatDate, dateToLocalDateStr } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import toast from "react-hot-toast";
import type { Goal } from "@/types";

interface GoalToggle {
  enabled: boolean;
  value: string;
}

function toInputDate(v: string | Date | null | undefined): string {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}

export default function GoalForm() {
  const {
    goals,
    pagination,
    fetchAllGoals,
    createGoal,
    updateGoal,
    deleteGoal,
    loading,
  } = useGoalStore();
  const [saving, setSaving] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [showFieldErrors, setShowFieldErrors] = useState(false);

  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(toInputDate(new Date()));
  const [targetDate, setTargetDate] = useState("");
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [targetDateOpen, setTargetDateOpen] = useState(false);

  const [calories, setCalories] = useState<GoalToggle>({
    enabled: false,
    value: "",
  });
  const [protein, setProtein] = useState<GoalToggle>({
    enabled: false,
    value: "",
  });
  const [carbs, setCarbs] = useState<GoalToggle>({ enabled: false, value: "" });
  const [fats, setFats] = useState<GoalToggle>({ enabled: false, value: "" });
  const [weight, setWeight] = useState<GoalToggle>({
    enabled: false,
    value: "",
  });

  useEffect(() => {
    fetchAllGoals();
  }, [fetchAllGoals]);

  const loadGoalIntoForm = (goal: Goal) => {
    setName(goal.name ?? "My Goal");
    setStartDate(toInputDate(goal.startDate));
    setTargetDate(toInputDate(goal.targetDate));
    setCalories({
      enabled: goal.calorieTarget > 0,
      value: goal.calorieTarget > 0 ? String(goal.calorieTarget) : "",
    });
    setProtein({
      enabled: goal.proteinTarget > 0,
      value: goal.proteinTarget > 0 ? String(goal.proteinTarget) : "",
    });
    setCarbs({
      enabled: goal.carbsTarget > 0,
      value: goal.carbsTarget > 0 ? String(goal.carbsTarget) : "",
    });
    setFats({
      enabled: goal.fatTarget > 0,
      value: goal.fatTarget > 0 ? String(goal.fatTarget) : "",
    });
    setWeight({
      enabled: !!goal.weightGoal,
      value: goal.weightGoal ? String(goal.weightGoal) : "",
    });
  };

  const resetForm = () => {
    setEditingGoalId(null);
    setShowFieldErrors(false);
    setName("");
    setStartDate(toInputDate(new Date()));
    setTargetDate("");
    setCalories({ enabled: false, value: "" });
    setProtein({ enabled: false, value: "" });
    setCarbs({ enabled: false, value: "" });
    setFats({ enabled: false, value: "" });
    setWeight({ enabled: false, value: "" });
  };

  useEffect(() => {
    if (editingGoalId) {
      const g = goals.find((x) => x._id === editingGoalId);
      if (g) loadGoalIntoForm(g);
    }
  }, [editingGoalId, goals]);

  const anyEnabled =
    calories.enabled ||
    protein.enabled ||
    carbs.enabled ||
    fats.enabled ||
    weight.enabled;
  const calValid = !calories.enabled || Number(calories.value) >= 500;
  const proValid =
    !protein.enabled ||
    (Number(protein.value) >= 10 && Number(protein.value) <= 500);
  const carbValid =
    !carbs.enabled ||
    (Number(carbs.value) >= 10 && Number(carbs.value) <= 1000);
  const fatValid =
    !fats.enabled || (Number(fats.value) >= 5 && Number(fats.value) <= 500);
  const wtValid =
    !weight.enabled ||
    (Number(weight.value) >= 30 && Number(weight.value) <= 300);
  const nameValid = name.trim().length >= 1 && name.length <= 120;
  const startDateValid = startDate.length > 0;
  const targetDateValid = targetDate.length > 0;
  const targetAfterStart =
    !targetDate || !startDate || new Date(targetDate) >= new Date(startDate);

  const handleSave = async () => {
    setShowFieldErrors(true);
    if (!anyEnabled) {
      toast.error(
        "Select at least one target (calories, protein, carbs, fats, or weight)",
      );
      return;
    }
    if (!nameValid) {
      toast.error(
        name.trim().length === 0
          ? "Name is required"
          : "Name must be 1–120 characters",
      );
      return;
    }
    if (!startDateValid) {
      toast.error("Start date is required");
      return;
    }
    if (!targetDateValid) {
      toast.error("Complete by date is required");
      return;
    }
    if (!targetAfterStart) {
      toast.error("Complete by date must be on or after start date");
      return;
    }
    if (!calValid || !proValid || !carbValid || !fatValid || !wtValid) {
      toast.error(
        "Check the target values (e.g. calories 500–10000, protein 10–500g)",
      );
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        startDate: new Date(startDate).toISOString(),
        targetDate: new Date(targetDate).toISOString(),
        calorieTarget: calories.enabled ? Number(calories.value) : 0,
        proteinTarget: protein.enabled ? Number(protein.value) : 0,
        carbsTarget: carbs.enabled ? Number(carbs.value) : 0,
        fatTarget: fats.enabled ? Number(fats.value) : 0,
        weightGoal:
          weight.enabled && weight.value ? Number(weight.value) : null,
      };
      if (editingGoalId) {
        await updateGoal(editingGoalId, payload as Partial<Goal>);
        toast.success("Goal updated!");
        setEditingGoalId(null);
      } else {
        await createGoal(payload as Partial<Goal>);
        toast.success("Goal added!");
      }
      resetForm();
      fetchAllGoals();
    } catch {
      toast.error(
        editingGoalId ? "Failed to update goal" : "Failed to add goal",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (goal: Goal) => {
    setEditingGoalId(goal._id);
    loadGoalIntoForm(goal);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteGoal(id);
      toast.success("Goal deleted");
      if (editingGoalId === id) resetForm();
    } catch {
      toast.error("Failed to delete goal");
    }
  };

  const proteinCals = Number(protein.value) * 4;
  const carbsCals = Number(carbs.value) * 4;
  const fatsCals = Number(fats.value) * 9;
  const macroCals = proteinCals + carbsCals + fatsCals;
  const proteinPct =
    macroCals > 0 ? Math.round((proteinCals / macroCals) * 100) : 0;
  const carbsPct =
    macroCals > 0 ? Math.round((carbsCals / macroCals) * 100) : 0;
  const fatsPct = macroCals > 0 ? 100 - proteinPct - carbsPct : 0;

  return (
    <div className="space-y-6">
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-950/30">
        <CardContent className="flex items-center gap-3 p-4">
          <Target className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
          <p className="text-sm text-blue-800 dark:text-blue-200">
            You can have multiple goals. Set a name, timeline (complete by
            date), and which targets to track for each goal.
          </p>
        </CardContent>
      </Card>

      {/* Your goals list - above add form */}
      {goals.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
                <History className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg">Your goals</CardTitle>
                {pagination.total > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {pagination.total} total
                  </p>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...goals]
                .sort((a, b) => {
                  const aActive = !a.endDate ? 1 : 0;
                  const bActive = !b.endDate ? 1 : 0;
                  if (bActive !== aActive) return bActive - aActive;
                  return (
                    new Date(b.startDate).getTime() -
                    new Date(a.startDate).getTime()
                  );
                })
                .map((goal, i) => (
                  <div key={goal._id}>
                    {i > 0 && <Separator className="my-3" />}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">
                            {goal.name ?? "My Goal"}
                          </span>
                          {!goal.endDate && (
                            <Badge variant="default" className="text-[10px]">
                              Active
                            </Badge>
                          )}
                          {goal.targetDate && (
                            <Badge variant="outline" className="text-[10px]">
                              Complete by {formatDate(goal.targetDate)}
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {goal.calorieTarget > 0 && (
                            <Badge variant="outline">
                              {goal.calorieTarget} kcal
                            </Badge>
                          )}
                          {goal.proteinTarget > 0 && (
                            <Badge
                              variant="outline"
                              className="border-blue-200 text-blue-700"
                            >
                              P: {goal.proteinTarget}g
                            </Badge>
                          )}
                          {goal.carbsTarget > 0 && (
                            <Badge
                              variant="outline"
                              className="border-amber-200 text-amber-700"
                            >
                              C: {goal.carbsTarget}g
                            </Badge>
                          )}
                          {goal.fatTarget > 0 && (
                            <Badge
                              variant="outline"
                              className="border-rose-200 text-rose-700"
                            >
                              F: {goal.fatTarget}g
                            </Badge>
                          )}
                          {goal.weightGoal != null && goal.weightGoal > 0 && (
                            <Badge
                              variant="outline"
                              className="border-violet-200 text-violet-700"
                            >
                              {goal.weightGoal} kg
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {formatDate(goal.startDate)} —{" "}
                          {goal.endDate ? formatDate(goal.endDate) : "Present"}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => handleEdit(goal)}
                          title="Edit goal"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(goal._id)}
                          title="Delete goal"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            {/* Pagination — always shown; disabled when single page or no goals */}
            <div
              className={`mt-4 flex items-center justify-between border-t pt-4 ${pagination.total === 0 || pagination.pages <= 1 ? "opacity-60" : ""}`}
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
                  onClick={() => fetchAllGoals(pagination.page - 1)}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={
                    pagination.pages <= 1 || pagination.page >= pagination.pages
                  }
                  onClick={() => fetchAllGoals(pagination.page + 1)}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add / Edit goal form */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {editingGoalId ? "Edit goal" : "Add new goal"}
            </CardTitle>
            {editingGoalId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetForm}
                className="gap-1"
              >
                <X className="h-4 w-4" /> Cancel
              </Button>
            )}
          </div>
          <CardDescription className="text-xs">
            Name and timeline
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-3 sm:gap-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="e.g. Summer cut, 2000 kcal maintenance"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={cn(
                  showFieldErrors && !nameValid ? "border-destructive" : "",
                )}
              />
              {showFieldErrors && !nameValid && (
                <p className="text-[11px] text-destructive">
                  {name.trim().length === 0
                    ? "Name is required"
                    : "Max 120 characters"}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <CalendarIcon className="h-3.5 w-3.5" /> Start date{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground",
                      showFieldErrors &&
                        !startDateValid &&
                        "border-destructive",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate
                      ? formatDate(new Date(startDate + "T12:00:00"))
                      : "Pick start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={
                      startDate ? new Date(startDate + "T12:00:00") : undefined
                    }
                    onSelect={(day) => {
                      if (day) {
                        setStartDate(dateToLocalDateStr(day));
                        setStartDateOpen(false);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {showFieldErrors && !startDateValid && (
                <p className="text-[11px] text-destructive">
                  Start date is required
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Target className="h-3.5 w-3.5" /> Complete by{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Popover open={targetDateOpen} onOpenChange={setTargetDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !targetDate && "text-muted-foreground",
                      showFieldErrors &&
                        (!targetDateValid ||
                          (targetDate && startDate && !targetAfterStart)) &&
                        "border-destructive",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {targetDate
                      ? formatDate(new Date(targetDate + "T12:00:00"))
                      : "Pick complete by date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={
                      targetDate
                        ? new Date(targetDate + "T12:00:00")
                        : undefined
                    }
                    onSelect={(day) => {
                      if (day) {
                        setTargetDate(dateToLocalDateStr(day));
                        setTargetDateOpen(false);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {showFieldErrors && !targetDateValid && (
                <p className="text-[11px] text-destructive">
                  Complete by date is required
                </p>
              )}
              {targetDate && startDate && !targetAfterStart && (
                <p className="text-[11px] text-destructive">
                  Must be on or after start date
                </p>
              )}
            </div>
          </div>

          <Separator />

          <p className="text-sm font-medium">Targets to track</p>
          <div className="grid gap-4 md:grid-cols-2">
            <GoalCard
              icon={<Flame className="h-5 w-5" />}
              iconBg="bg-orange-100 text-orange-600"
              title="Calories"
              description="Daily calorie intake target"
              enabled={calories.enabled}
              onToggle={() =>
                setCalories((p) => ({ ...p, enabled: !p.enabled }))
              }
            >
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  kcal per day
                </Label>
                <Input
                  type="number"
                  min={500}
                  max={10000}
                  placeholder="e.g. 2000"
                  value={calories.value}
                  onChange={(e) =>
                    setCalories((p) => ({ ...p, value: e.target.value }))
                  }
                  disabled={!calories.enabled}
                  className={cn(
                    "text-lg font-semibold",
                    calories.value && !calValid && "border-destructive",
                  )}
                />
                <p
                  className={cn(
                    "text-[11px]",
                    calories.value && !calValid
                      ? "text-destructive"
                      : "text-muted-foreground",
                  )}
                >
                  Min 500 kcal · Max 10,000 kcal
                </p>
              </div>
            </GoalCard>

            <GoalCard
              icon={<Beef className="h-5 w-5" />}
              iconBg="bg-blue-100 text-blue-600"
              title="Protein"
              description="Build and repair muscle"
              enabled={protein.enabled}
              onToggle={() =>
                setProtein((p) => ({ ...p, enabled: !p.enabled }))
              }
            >
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  grams per day
                </Label>
                <Input
                  type="number"
                  min={10}
                  max={500}
                  placeholder="e.g. 150"
                  value={protein.value}
                  onChange={(e) =>
                    setProtein((p) => ({ ...p, value: e.target.value }))
                  }
                  disabled={!protein.enabled}
                  className={cn(
                    "text-lg font-semibold",
                    protein.value && !proValid && "border-destructive",
                  )}
                />
                <p
                  className={cn(
                    "text-[11px]",
                    protein.value && !proValid
                      ? "text-destructive"
                      : "text-muted-foreground",
                  )}
                >
                  10–500g
                  {protein.enabled && Number(protein.value) > 0
                    ? ` · ${proteinCals} kcal`
                    : ""}
                </p>
              </div>
            </GoalCard>

            <GoalCard
              icon={<Wheat className="h-5 w-5" />}
              iconBg="bg-amber-100 text-amber-600"
              title="Carbs"
              description="Primary energy source"
              enabled={carbs.enabled}
              onToggle={() => setCarbs((p) => ({ ...p, enabled: !p.enabled }))}
            >
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  grams per day
                </Label>
                <Input
                  type="number"
                  min={10}
                  max={1000}
                  placeholder="e.g. 250"
                  value={carbs.value}
                  onChange={(e) =>
                    setCarbs((p) => ({ ...p, value: e.target.value }))
                  }
                  disabled={!carbs.enabled}
                  className={cn(
                    "text-lg font-semibold",
                    carbs.value && !carbValid && "border-destructive",
                  )}
                />
                <p
                  className={cn(
                    "text-[11px]",
                    carbs.value && !carbValid
                      ? "text-destructive"
                      : "text-muted-foreground",
                  )}
                >
                  10–1,000g
                  {carbs.enabled && Number(carbs.value) > 0
                    ? ` · ${carbsCals} kcal`
                    : ""}
                </p>
              </div>
            </GoalCard>

            <GoalCard
              icon={<Droplets className="h-5 w-5" />}
              iconBg="bg-rose-100 text-rose-600"
              title="Fats"
              description="Essential for hormones & absorption"
              enabled={fats.enabled}
              onToggle={() => setFats((p) => ({ ...p, enabled: !p.enabled }))}
            >
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  grams per day
                </Label>
                <Input
                  type="number"
                  min={5}
                  max={500}
                  placeholder="e.g. 65"
                  value={fats.value}
                  onChange={(e) =>
                    setFats((p) => ({ ...p, value: e.target.value }))
                  }
                  disabled={!fats.enabled}
                  className={cn(
                    "text-lg font-semibold",
                    fats.value && !fatValid && "border-destructive",
                  )}
                />
                <p
                  className={cn(
                    "text-[11px]",
                    fats.value && !fatValid
                      ? "text-destructive"
                      : "text-muted-foreground",
                  )}
                >
                  5–500g
                  {fats.enabled && Number(fats.value) > 0
                    ? ` · ${fatsCals} kcal`
                    : ""}
                </p>
              </div>
            </GoalCard>
          </div>

          <GoalCard
            icon={<Weight className="h-5 w-5" />}
            iconBg="bg-violet-100 text-violet-600"
            title="Weight Goal"
            description="Your target body weight"
            enabled={weight.enabled}
            onToggle={() => setWeight((p) => ({ ...p, enabled: !p.enabled }))}
          >
            <div className="max-w-xs space-y-1.5">
              <Label className="text-xs text-muted-foreground">kilograms</Label>
              <Input
                type="number"
                min={30}
                max={300}
                step={0.1}
                placeholder="e.g. 70"
                value={weight.value}
                onChange={(e) =>
                  setWeight((p) => ({ ...p, value: e.target.value }))
                }
                disabled={!weight.enabled}
                className={cn(
                  "text-lg font-semibold",
                  weight.value && !wtValid && "border-destructive",
                )}
              />
              <p
                className={cn(
                  "text-[11px]",
                  weight.value && !wtValid
                    ? "text-destructive"
                    : "text-muted-foreground",
                )}
              >
                30–300 kg
              </p>
            </div>
          </GoalCard>

          {(protein.enabled || carbs.enabled || fats.enabled) &&
            macroCals > 0 && (
              <Card>
                <CardContent className="space-y-3 p-4">
                  <p className="text-sm font-medium">Macro Split</p>
                  <div className="flex h-3 overflow-hidden rounded-full bg-muted">
                    {proteinCals > 0 && (
                      <div
                        className="bg-blue-500 transition-all"
                        style={{ width: `${proteinPct}%` }}
                      />
                    )}
                    {carbsCals > 0 && (
                      <div
                        className="bg-amber-500 transition-all"
                        style={{ width: `${carbsPct}%` }}
                      />
                    )}
                    {fatsCals > 0 && (
                      <div
                        className="bg-rose-500 transition-all"
                        style={{ width: `${fatsPct}%` }}
                      />
                    )}
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                    {protein.enabled && proteinCals > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                        Protein {proteinPct}%
                      </span>
                    )}
                    {carbs.enabled && carbsCals > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        Carbs {carbsPct}%
                      </span>
                    )}
                    {fats.enabled && fatsCals > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-rose-500" />
                        Fats {fatsPct}%
                      </span>
                    )}
                    <span className="ml-auto font-medium text-foreground">
                      Total: {macroCals} kcal from macros
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

          <Button
            onClick={handleSave}
            disabled={saving || loading || !anyEnabled}
            size="lg"
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : editingGoalId ? "Update goal" : "Add goal"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

interface GoalCardProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function GoalCard({
  icon,
  iconBg,
  title,
  description,
  enabled,
  onToggle,
  children,
}: GoalCardProps) {
  return (
    <Card
      className={cn(
        "transition-all",
        enabled ? "border-primary/30 shadow-sm" : "opacity-70",
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl",
                iconBg,
              )}
            >
              {icon}
            </div>
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription className="text-xs">
                {description}
              </CardDescription>
            </div>
          </div>
          <button
            type="button"
            onClick={onToggle}
            className={cn(
              "relative h-6 w-11 rounded-full transition-colors",
              enabled ? "bg-primary" : "bg-muted",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                enabled && "translate-x-5",
              )}
            />
          </button>
        </div>
      </CardHeader>
      {enabled && <CardContent>{children}</CardContent>}
    </Card>
  );
}
