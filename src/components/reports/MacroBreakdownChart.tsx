import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MacroDay } from "@/types";

interface Props {
  data: MacroDay[];
}

export default function MacroBreakdownChart({ data }: Props) {
  const formatted = data.map((d) => ({
    ...d,
    day: new Date(d.date).toLocaleDateString("en-US", { weekday: "short" }),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Macro Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={formatted} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" unit="g" />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Legend />
              <Bar dataKey="protein" name="Protein" fill="#3b82f6" radius={[2, 2, 0, 0]} />
              <Bar dataKey="carbs" name="Carbs" fill="#f59e0b" radius={[2, 2, 0, 0]} />
              <Bar dataKey="fats" name="Fats" fill="#ef4444" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
