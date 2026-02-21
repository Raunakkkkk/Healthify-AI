interface Props {
  consumed: number;
  target: number;
}

export default function CalorieRing({ consumed, target }: Props) {
  const pct = target > 0 ? Math.min((consumed / target) * 100, 100) : 0;
  const isOver = consumed > target && target > 0;
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-48 w-48">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="12" />
          <circle
            cx="100" cy="100" r={radius} fill="none"
            stroke={isOver ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
            strokeWidth="12" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-bold ${isOver ? "text-destructive" : "text-foreground"}`}>
            {Math.round(consumed)}
          </span>
          <span className="text-sm text-muted-foreground">/ {target} kcal</span>
        </div>
      </div>
      <p className="mt-2 text-sm font-medium">
        {target > 0 ? (
          isOver ? (
            <span className="text-destructive">{Math.round(consumed - target)} kcal over</span>
          ) : (
            <span className="text-primary">{Math.round(target - consumed)} kcal remaining</span>
          )
        ) : (
          <span className="text-muted-foreground">Set a goal to track progress</span>
        )}
      </p>
    </div>
  );
}
