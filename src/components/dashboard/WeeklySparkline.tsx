import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import type { DailyCalories } from "@/types";

interface Props {
  data: DailyCalories[];
  calorieTarget?: number;
}

export default function WeeklySparkline({ data, calorieTarget }: Props) {
  const formatted = data.map((d) => ({
    ...d,
    day: new Date(d.date).toLocaleDateString("en-US", { weekday: "short" }),
  }));

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formatted} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis hide domain={[0, "auto"]} />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            formatter={(value: number) => [`${value} kcal`, "Calories"]}
          />
          {calorieTarget && calorieTarget > 0 && (
            <ReferenceLine
              y={calorieTarget}
              stroke="hsl(var(--destructive))"
              strokeDasharray="4 4"
              label={{ value: "Target", position: "right", fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            />
          )}
          <Line
            type="monotone"
            dataKey="calories"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ fill: "hsl(var(--primary))", r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
