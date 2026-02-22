export interface User {
  id: string;
  name: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Goal {
  _id: string;
  userId: string;
  name?: string;
  startDate: string;
  endDate: string | null;
  targetDate?: string | null;
  calorieTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
  weightGoal: number | null;
  createdAt: string;
}

export interface Macros {
  protein: number;
  carbs: number;
  fats: number;
}

export interface FoodEntry {
  _id: string;
  userId: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  foodName: string;
  quantity: number;
  unit: string;
  calories: number;
  macros: Macros;
  micronutrients: Record<string, number>;
  timestamp: string;
  source: "manual" | "ai";
  imageId?: string;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  entries: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface DailyCalories {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  entryCount: number;
}

export interface GoalVsActual {
  daily: (DailyCalories & {
    calorieTarget: number;
    proteinTarget: number;
    carbsTarget: number;
    fatTarget: number;
  })[];
  averages: Macros & { calories: number };
  targets: Macros & { calories: number };
}

export interface MacroDay {
  date: string;
  protein: number;
  carbs: number;
  fats: number;
}

export interface MicronutrientRow {
  name: string;
  total: number;
  dailyAverage: number;
}

export interface ExtractedFood {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  quantity: number;
  unit: string;
}

export interface ExtractionResult {
  imageId: string;
  imageUrl: string;
  foods: ExtractedFood[];
  confidence: number;
  rawText: string;
}

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
