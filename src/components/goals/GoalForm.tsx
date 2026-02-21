import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Target, History, Save, Flame, Beef, Wheat, Droplets, Weight, Trash2,
} from "lucide-react";
import { useGoalStore } from "@/store/goalStore";
import { cn, formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

interface GoalToggle {
  enabled: boolean;
  value: string;
}

export default function GoalForm() {
  const { currentGoal, goals, fetchCurrentGoal, fetchAllGoals, createGoal, deleteGoal, loading } = useGoalStore();
  const [saving, setSaving] = useState(false);

  const [calories, setCalories] = useState<GoalToggle>({ enabled: false, value: "" });
  const [protein, setProtein] = useState<GoalToggle>({ enabled: false, value: "" });
  const [carbs, setCarbs] = useState<GoalToggle>({ enabled: false, value: "" });
  const [fats, setFats] = useState<GoalToggle>({ enabled: false, value: "" });
  const [weight, setWeight] = useState<GoalToggle>({ enabled: false, value: "" });

  useEffect(() => {
    fetchCurrentGoal();
    fetchAllGoals();
  }, [fetchCurrentGoal, fetchAllGoals]);

  useEffect(() => {
    if (currentGoal) {
      setCalories({ enabled: currentGoal.calorieTarget > 0, value: currentGoal.calorieTarget > 0 ? String(currentGoal.calorieTarget) : "" });
      setProtein({ enabled: currentGoal.proteinTarget > 0, value: currentGoal.proteinTarget > 0 ? String(currentGoal.proteinTarget) : "" });
      setCarbs({ enabled: currentGoal.carbsTarget > 0, value: currentGoal.carbsTarget > 0 ? String(currentGoal.carbsTarget) : "" });
      setFats({ enabled: currentGoal.fatTarget > 0, value: currentGoal.fatTarget > 0 ? String(currentGoal.fatTarget) : "" });
      setWeight({ enabled: !!currentGoal.weightGoal, value: currentGoal.weightGoal ? String(currentGoal.weightGoal) : "" });
    }
  }, [currentGoal]);

  const anyEnabled = calories.enabled || protein.enabled || carbs.enabled || fats.enabled || weight.enabled;
  const allValid = (!calories.enabled || Number(calories.value) >= 100) &&
    (!protein.enabled || Number(protein.value) > 0) &&
    (!carbs.enabled || Number(carbs.value) > 0) &&
    (!fats.enabled || Number(fats.value) > 0) &&
    (!weight.enabled || Number(weight.value) > 0);

  const handleSave = async () => {
    setSaving(true);
    try {
      await createGoal({
        calorieTarget: calories.enabled ? Number(calories.value) : 0,
        proteinTarget: protein.enabled ? Number(protein.value) : 0,
        carbsTarget: carbs.enabled ? Number(carbs.value) : 0,
        fatTarget: fats.enabled ? Number(fats.value) : 0,
        weightGoal: weight.enabled && weight.value ? Number(weight.value) : null,
      } as any);
      toast.success("Goals saved!");
      fetchAllGoals();
    } catch {
      toast.error("Failed to save goals");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteGoal(id);
      toast.success("Goal deleted");
      fetchCurrentGoal();
    } catch {
      toast.error("Failed to delete goal");
    }
  };

  const proteinCals = Number(protein.value) * 4;
  const carbsCals = Number(carbs.value) * 4;
  const fatsCals = Number(fats.value) * 9;
  const macroCals = proteinCals + carbsCals + fatsCals;
  const proteinPct = macroCals > 0 ? Math.round((proteinCals / macroCals) * 100) : 0;
  const carbsPct = macroCals > 0 ? Math.round((carbsCals / macroCals) * 100) : 0;
  const fatsPct = macroCals > 0 ? 100 - proteinPct - carbsPct : 0;

  return (
    <div className="space-y-6">
      {/* Instruction */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="flex items-center gap-3 p-4">
          <Target className="h-5 w-5 shrink-0 text-blue-600" />
          <p className="text-sm text-blue-800">
            Toggle on the goals you want to track. You can set just one target or all of them — it's up to you.
          </p>
        </CardContent>
      </Card>

      {/* Goal cards grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Calories */}
        <GoalCard
          icon={<Flame className="h-5 w-5" />}
          iconBg="bg-orange-100 text-orange-600"
          title="Calories"
          description="Daily calorie intake target"
          enabled={calories.enabled}
          onToggle={() => setCalories((p) => ({ ...p, enabled: !p.enabled }))}
        >
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">kcal per day</Label>
            <Input
              type="number" min={100} max={10000} placeholder="e.g., 2000"
              value={calories.value}
              onChange={(e) => setCalories((p) => ({ ...p, value: e.target.value }))}
              disabled={!calories.enabled}
              className="text-lg font-semibold"
            />
          </div>
        </GoalCard>

        {/* Protein */}
        <GoalCard
          icon={<Beef className="h-5 w-5" />}
          iconBg="bg-blue-100 text-blue-600"
          title="Protein"
          description="Build and repair muscle"
          enabled={protein.enabled}
          onToggle={() => setProtein((p) => ({ ...p, enabled: !p.enabled }))}
        >
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">grams per day</Label>
            <Input
              type="number" min={0} max={500} placeholder="e.g., 150"
              value={protein.value}
              onChange={(e) => setProtein((p) => ({ ...p, value: e.target.value }))}
              disabled={!protein.enabled}
              className="text-lg font-semibold"
            />
            {protein.enabled && Number(protein.value) > 0 && (
              <p className="text-xs text-muted-foreground">{proteinCals} kcal</p>
            )}
          </div>
        </GoalCard>

        {/* Carbs */}
        <GoalCard
          icon={<Wheat className="h-5 w-5" />}
          iconBg="bg-amber-100 text-amber-600"
          title="Carbs"
          description="Primary energy source"
          enabled={carbs.enabled}
          onToggle={() => setCarbs((p) => ({ ...p, enabled: !p.enabled }))}
        >
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">grams per day</Label>
            <Input
              type="number" min={0} max={1000} placeholder="e.g., 250"
              value={carbs.value}
              onChange={(e) => setCarbs((p) => ({ ...p, value: e.target.value }))}
              disabled={!carbs.enabled}
              className="text-lg font-semibold"
            />
            {carbs.enabled && Number(carbs.value) > 0 && (
              <p className="text-xs text-muted-foreground">{carbsCals} kcal</p>
            )}
          </div>
        </GoalCard>

        {/* Fats */}
        <GoalCard
          icon={<Droplets className="h-5 w-5" />}
          iconBg="bg-rose-100 text-rose-600"
          title="Fats"
          description="Essential for hormones & absorption"
          enabled={fats.enabled}
          onToggle={() => setFats((p) => ({ ...p, enabled: !p.enabled }))}
        >
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">grams per day</Label>
            <Input
              type="number" min={0} max={500} placeholder="e.g., 65"
              value={fats.value}
              onChange={(e) => setFats((p) => ({ ...p, value: e.target.value }))}
              disabled={!fats.enabled}
              className="text-lg font-semibold"
            />
            {fats.enabled && Number(fats.value) > 0 && (
              <p className="text-xs text-muted-foreground">{fatsCals} kcal</p>
            )}
          </div>
        </GoalCard>
      </div>

      {/* Weight — full width */}
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
            type="number" min={30} max={300} step={0.1} placeholder="e.g., 75"
            value={weight.value}
            onChange={(e) => setWeight((p) => ({ ...p, value: e.target.value }))}
            disabled={!weight.enabled}
            className="text-lg font-semibold"
          />
        </div>
      </GoalCard>

      {/* Macro split bar — only if multiple macros enabled */}
      {(protein.enabled || carbs.enabled || fats.enabled) && macroCals > 0 && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-sm font-medium">Macro Split</p>
            <div className="flex h-3 overflow-hidden rounded-full bg-muted">
              {proteinCals > 0 && <div className="bg-blue-500 transition-all" style={{ width: `${proteinPct}%` }} />}
              {carbsCals > 0 && <div className="bg-amber-500 transition-all" style={{ width: `${carbsPct}%` }} />}
              {fatsCals > 0 && <div className="bg-rose-500 transition-all" style={{ width: `${fatsPct}%` }} />}
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              {protein.enabled && proteinCals > 0 && (
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" />Protein {proteinPct}%</span>
              )}
              {carbs.enabled && carbsCals > 0 && (
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" />Carbs {carbsPct}%</span>
              )}
              {fats.enabled && fatsCals > 0 && (
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" />Fats {fatsPct}%</span>
              )}
              <span className="ml-auto font-medium text-foreground">Total: {macroCals} kcal from macros</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save */}
      <Button onClick={handleSave} disabled={saving || loading || !anyEnabled || !allValid} size="lg" className="gap-2">
        <Save className="h-4 w-4" />
        {saving ? "Saving..." : currentGoal ? "Update Goals" : "Save Goals"}
      </Button>

      {/* Goal History */}
      {goals.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
                <History className="h-5 w-5 text-muted-foreground" />
              </div>
              <CardTitle className="text-lg">Goal History</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {goals.map((goal, i) => (
                <div key={goal._id}>
                  {i > 0 && <Separator className="my-3" />}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {goal.calorieTarget > 0 && <Badge variant="outline">{goal.calorieTarget} kcal</Badge>}
                        {goal.proteinTarget > 0 && <Badge variant="outline" className="border-blue-200 text-blue-700">P: {goal.proteinTarget}g</Badge>}
                        {goal.carbsTarget > 0 && <Badge variant="outline" className="border-amber-200 text-amber-700">C: {goal.carbsTarget}g</Badge>}
                        {goal.fatTarget > 0 && <Badge variant="outline" className="border-rose-200 text-rose-700">F: {goal.fatTarget}g</Badge>}
                        {goal.weightGoal && <Badge variant="outline" className="border-violet-200 text-violet-700">{goal.weightGoal}kg</Badge>}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {formatDate(goal.startDate)} — {goal.endDate ? formatDate(goal.endDate) : "Present"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {!goal.endDate && <Badge variant="success">Active</Badge>}
                      <Button
                        variant="ghost" size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(goal._id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* Reusable goal card with toggle */
interface GoalCardProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function GoalCard({ icon, iconBg, title, description, enabled, onToggle, children }: GoalCardProps) {
  return (
    <Card className={cn("transition-all", enabled ? "border-primary/30 shadow-sm" : "opacity-70")}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", iconBg)}>
              {icon}
            </div>
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription className="text-xs">{description}</CardDescription>
            </div>
          </div>
          <button
            type="button"
            onClick={onToggle}
            className={cn(
              "relative h-6 w-11 rounded-full transition-colors",
              enabled ? "bg-primary" : "bg-muted"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                enabled && "translate-x-5"
              )}
            />
          </button>
        </div>
      </CardHeader>
      {enabled && <CardContent>{children}</CardContent>}
    </Card>
  );
}
