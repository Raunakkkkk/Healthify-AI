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
      <div className="relative h-44 w-44 sm:h-52 sm:w-52">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 200 200">
          <defs>
            <linearGradient id="calorieGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(160 84% 42%)" />
              <stop offset="100%" stopColor="hsl(140 76% 55%)" />
            </linearGradient>
          </defs>
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="14"
          />
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke={isOver ? "hsl(var(--energy))" : "url(#calorieGradient)"}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={`tabular font-display text-4xl font-bold leading-none sm:text-5xl ${
              isOver ? "text-energy" : "text-foreground"
            }`}
          >
            {Math.round(consumed)}
          </span>
          <span className="tabular mt-1 text-xs text-muted-foreground sm:text-sm">
            of {target.toLocaleString()} kcal
          </span>
        </div>
      </div>
      <p className="tabular mt-3 text-sm font-medium">
        {target > 0 ? (
          isOver ? (
            <span className="text-energy">
              {Math.round(consumed - target).toLocaleString()} kcal over
            </span>
          ) : (
            <span className="text-primary">
              {Math.round(target - consumed).toLocaleString()} kcal left
            </span>
          )
        ) : (
          <span className="text-muted-foreground">Set a goal to track progress</span>
        )}
      </p>
    </div>
  );
}
