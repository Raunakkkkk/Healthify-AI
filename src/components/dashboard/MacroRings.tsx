interface MacroProps {
  label: string;
  value: number;
  target: number;
  color: string;
  unit?: string;
}

function MiniRing({ label, value, target, color, unit = "g" }: MacroProps) {
  const pct = target > 0 ? Math.min((value / target) * 100, 100) : 0;
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-20 w-20">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
          <circle
            cx="40" cy="40" r={radius} fill="none" stroke={color}
            strokeWidth="6" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-bold text-foreground">{Math.round(value)}</span>
          <span className="text-[10px] text-muted-foreground">{unit}</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs font-medium text-foreground">{label}</p>
        {target > 0 && (
          <p className="text-[10px] text-muted-foreground">/ {target}{unit}</p>
        )}
      </div>
    </div>
  );
}

interface Props {
  protein: number;
  carbs: number;
  fats: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
}

export default function MacroRings({ protein, carbs, fats, proteinTarget, carbsTarget, fatTarget }: Props) {
  return (
    <div className="flex items-center justify-center gap-4 sm:gap-6">
      <MiniRing label="Protein" value={protein} target={proteinTarget} color="#3b82f6" />
      <MiniRing label="Carbs" value={carbs} target={carbsTarget} color="#f59e0b" />
      <MiniRing label="Fats" value={fats} target={fatTarget} color="#ef4444" />
    </div>
  );
}
