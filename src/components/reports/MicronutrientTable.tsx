import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { MicronutrientRow } from "@/types";

interface Props {
  data: MicronutrientRow[];
}

const RDA: Record<string, number> = {
  vitaminA: 900, vitaminC: 90, vitaminD: 20, vitaminE: 15,
  vitaminK: 120, calcium: 1000, iron: 18, potassium: 4700,
  magnesium: 420, zinc: 11, fiber: 28, sodium: 2300,
};

export default function MicronutrientTable({ data }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Micronutrients</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No micronutrient data available. Add detailed food entries to see this data.
          </p>
        ) : (
          <div className="space-y-3">
            {data.map((row) => {
              const rda = RDA[row.name];
              const pct = rda ? Math.min((row.dailyAverage / rda) * 100, 100) : 0;

              return (
                <div key={row.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium capitalize">
                      {row.name.replace(/([A-Z])/g, " $1").trim()}
                    </span>
                    <span className="text-muted-foreground">
                      {row.dailyAverage.toFixed(1)}
                      {rda ? ` / ${rda}` : ""}
                    </span>
                  </div>
                  {rda && (
                    <Progress
                      value={pct}
                      className="h-2"
                      indicatorClassName={pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-400"}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
