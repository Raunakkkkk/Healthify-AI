import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GoalVsActual } from "@/types";

interface Props {
  data: GoalVsActual | null;
}

export default function GoalComparison({ data }: Props) {
  if (!data) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Goal vs Actual</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Set a goal to see your comparison.</p>
        </CardContent>
      </Card>
    );
  }

  const comparison = [
    { name: "Calories", actual: data.averages.calories, target: data.targets.calories },
    { name: "Protein", actual: data.averages.protein, target: data.targets.protein },
    { name: "Carbs", actual: data.averages.carbs, target: data.targets.carbs },
    { name: "Fats", actual: data.averages.fats, target: data.targets.fats },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Goal vs Actual (Daily Avg)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-56 sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparison} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={55} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Legend />
              <Bar dataKey="target" name="Target" fill="hsl(var(--muted-foreground))" radius={[0, 2, 2, 0]} />
              <Bar dataKey="actual" name="Actual" fill="hsl(var(--primary))" radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
