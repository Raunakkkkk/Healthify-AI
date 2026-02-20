import mongoose from "mongoose";
import FoodEntry from "../models/FoodEntry.js";
import Goal from "../models/Goal.js";

export async function getWeeklyCalories(userId: string) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  const pipeline = [
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        timestamp: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$timestamp" },
        },
        totalCalories: { $sum: "$calories" },
        totalProtein: { $sum: "$macros.protein" },
        totalCarbs: { $sum: "$macros.carbs" },
        totalFats: { $sum: "$macros.fats" },
        entryCount: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 as const } },
  ];

  const result = await FoodEntry.aggregate(pipeline);

  // Fill missing days with zeros
  const days: any[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0];
    const found = result.find((r: any) => r._id === dateStr);
    days.push({
      date: dateStr,
      calories: found?.totalCalories || 0,
      protein: found?.totalProtein || 0,
      carbs: found?.totalCarbs || 0,
      fats: found?.totalFats || 0,
      entryCount: found?.entryCount || 0,
    });
  }

  return days;
}

export async function getMacroBreakdown(
  userId: string,
  start?: Date,
  end?: Date
) {
  const now = new Date();
  const from = start || new Date(now.setDate(now.getDate() - 6));
  const to = end || new Date();
  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);

  const pipeline = [
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        timestamp: { $gte: from, $lte: to },
      },
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
        },
        protein: { $sum: "$macros.protein" },
        carbs: { $sum: "$macros.carbs" },
        fats: { $sum: "$macros.fats" },
      },
    },
    { $sort: { "_id.date": 1 as const } },
  ];

  const result = await FoodEntry.aggregate(pipeline);
  return result.map((r: any) => ({
    date: r._id.date,
    protein: r.protein,
    carbs: r.carbs,
    fats: r.fats,
  }));
}

export async function getMicronutrientSummary(
  userId: string,
  start?: Date,
  end?: Date
) {
  const now = new Date();
  const from = start || new Date(now.setDate(now.getDate() - 6));
  const to = end || new Date();
  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);

  const entries = await FoodEntry.find({
    userId: new mongoose.Types.ObjectId(userId),
    timestamp: { $gte: from, $lte: to },
  }).lean();

  const totals: Record<string, number> = {};
  for (const entry of entries) {
    if (entry.micronutrients) {
      const micros =
        entry.micronutrients instanceof Map
          ? Object.fromEntries(entry.micronutrients)
          : entry.micronutrients;
      for (const [key, value] of Object.entries(micros)) {
        totals[key] = (totals[key] || 0) + (value as number);
      }
    }
  }

  return Object.entries(totals).map(([name, total]) => ({
    name,
    total: Math.round(total * 100) / 100,
    dailyAverage: Math.round((total / 7) * 100) / 100,
  }));
}

export async function getGoalVsActual(
  userId: string,
  start?: Date,
  end?: Date
) {
  const now = new Date();
  const from = start || new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
  const to = end || new Date();
  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);

  const [weeklyData, goal] = await Promise.all([
    getWeeklyCalories(userId),
    Goal.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      startDate: { $lte: to },
      $or: [{ endDate: null }, { endDate: { $gte: from } }],
    }).sort({ startDate: -1 }),
  ]);

  const totals = weeklyData.reduce(
    (acc, day) => ({
      calories: acc.calories + day.calories,
      protein: acc.protein + day.protein,
      carbs: acc.carbs + day.carbs,
      fats: acc.fats + day.fats,
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );

  const days = weeklyData.length || 1;

  return {
    daily: weeklyData.map((day) => ({
      ...day,
      calorieTarget: goal?.calorieTarget || 0,
      proteinTarget: goal?.proteinTarget || 0,
      carbsTarget: goal?.carbsTarget || 0,
      fatTarget: goal?.fatTarget || 0,
    })),
    averages: {
      calories: Math.round(totals.calories / days),
      protein: Math.round(totals.protein / days),
      carbs: Math.round(totals.carbs / days),
      fats: Math.round(totals.fats / days),
    },
    targets: {
      calories: goal?.calorieTarget || 0,
      protein: goal?.proteinTarget || 0,
      carbs: goal?.carbsTarget || 0,
      fats: goal?.fatTarget || 0,
    },
  };
}
