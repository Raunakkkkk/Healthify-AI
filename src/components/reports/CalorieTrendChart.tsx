import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DailyCalories } from "@/types";

interface Props {
  data: DailyCalories[];
  calorieTarget?: number;
}

export default function CalorieTrendChart({ data, calorieTarget }: Props) {
  const formatted = data.map((d) => ({
    ...d,
    day: new Date(d.date).toLocaleDateString("en-US", { weekday: "short", day: "numeric" }),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Weekly Calorie Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-56 sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={formatted} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={40} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Legend />
              {calorieTarget && calorieTarget > 0 && (
                <ReferenceLine y={calorieTarget} stroke="hsl(var(--destructive))" strokeDasharray="4 4" />
              )}
              <Line type="monotone" dataKey="calories" name="Calories" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
