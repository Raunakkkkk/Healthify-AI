import GoalForm from "@/components/goals/GoalForm";

export default function GoalsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Goals</h1>
        <p className="text-muted-foreground">Set and manage your nutrition targets</p>
      </div>
      <GoalForm />
    </div>
  );
}
