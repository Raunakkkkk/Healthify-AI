import GoalForm from "@/components/goals/GoalForm";

export default function GoalsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Goals</h1>
        <p className="text-sm text-muted-foreground lg:text-base">
          Set and manage your nutrition targets
        </p>
      </div>
      <GoalForm />
    </div>
  );
}
