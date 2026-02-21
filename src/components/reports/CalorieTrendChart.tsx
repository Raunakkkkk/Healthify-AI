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
    day: new Date(d.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Weekly Calorie Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={formatted} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
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
