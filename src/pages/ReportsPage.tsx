import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import CalorieTrendChart from "@/components/reports/CalorieTrendChart";
import MacroBreakdownChart from "@/components/reports/MacroBreakdownChart";
import MicronutrientTable from "@/components/reports/MicronutrientTable";
import GoalComparison from "@/components/reports/GoalComparison";
import api from "@/lib/api";
import type {
  DailyCalories,
  MacroDay,
  MicronutrientRow,
  GoalVsActual,
} from "@/types";
import { useGoalStore } from "@/store/goalStore";

export default function ReportsPage() {
  const { currentGoal, fetchCurrentGoal } = useGoalStore();
  const [weeklyCalories, setWeeklyCalories] = useState<DailyCalories[]>([]);
  const [macros, setMacros] = useState<MacroDay[]>([]);
  const [micros, setMicros] = useState<MicronutrientRow[]>([]);
  const [goalVsActual, setGoalVsActual] = useState<GoalVsActual | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCurrentGoal();
    loadReports();
  }, [fetchCurrentGoal]);

  const loadReports = async () => {
    try {
      const [cal, mac, mic, gva] = await Promise.all([
        api.get<DailyCalories[]>("/reports/weekly-calories"),
        api.get<MacroDay[]>("/reports/macros"),
        api.get<MicronutrientRow[]>("/reports/micronutrients"),
        api.get<GoalVsActual>("/reports/goal-vs-actual"),
      ]);
      setWeeklyCalories(cal.data);
      setMacros(mac.data);
      setMicros(mic.data);
      setGoalVsActual(gva.data);
    } catch {
      // Non-critical
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">
            Reports
          </h1>
          <p className="text-sm text-muted-foreground lg:text-base">
            Visualize your nutrition data
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-56 sm:h-80" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">
          Reports
        </h1>
        <p className="text-sm text-muted-foreground lg:text-base">
          Visualize your nutrition data over time
        </p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList className="inline-flex w-auto min-w-full sm:w-full">
            <TabsTrigger value="overview" className="flex-1">
              Overview
            </TabsTrigger>
            <TabsTrigger value="macros" className="flex-1">
              Macros
            </TabsTrigger>
            <TabsTrigger value="micros" className="flex-1">
              Micros
            </TabsTrigger>
            <TabsTrigger value="goals" className="flex-1">
              Goals
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-6 md:grid-cols-2">
            <CalorieTrendChart
              data={weeklyCalories}
              calorieTarget={currentGoal?.calorieTarget}
            />
            <GoalComparison data={goalVsActual} />
          </div>
        </TabsContent>

        <TabsContent value="macros" className="mt-4">
          <MacroBreakdownChart data={macros} />
        </TabsContent>

        <TabsContent value="micros" className="mt-4">
          <MicronutrientTable data={micros} />
        </TabsContent>

        <TabsContent value="goals" className="mt-4">
          <GoalComparison data={goalVsActual} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
