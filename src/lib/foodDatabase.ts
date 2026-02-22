export interface FoodItem {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  unit: string;
  quantity: number;
  category: "grain" | "protein" | "dairy" | "fruit" | "vegetable" | "snack" | "beverage" | "meal" | "other";
  micronutrients?: Record<string, number>;
}

export const FOOD_DATABASE: FoodItem[] = [
  // Indian Staples
  { name: "Roti / Chapati", calories: 120, protein: 3, carbs: 20, fats: 3.5, unit: "piece", quantity: 1, category: "grain", micronutrients: { iron: 0.9, magnesium: 12 } },
  { name: "Plain Rice (cooked)", calories: 206, protein: 4, carbs: 45, fats: 0.4, unit: "cup", quantity: 1, category: "grain", micronutrients: { iron: 0.4, magnesium: 12 } },
  { name: "Jeera Rice", calories: 250, protein: 5, carbs: 48, fats: 4, unit: "cup", quantity: 1, category: "grain", micronutrients: { iron: 0.6, magnesium: 14 } },
  { name: "Paratha (plain)", calories: 200, protein: 4, carbs: 28, fats: 8, unit: "piece", quantity: 1, category: "grain", micronutrients: { iron: 1, calcium: 15 } },
  { name: "Naan", calories: 260, protein: 8, carbs: 45, fats: 5, unit: "piece", quantity: 1, category: "grain", micronutrients: { iron: 1.2, calcium: 40 } },
  { name: "Puri", calories: 150, protein: 3, carbs: 18, fats: 7, unit: "piece", quantity: 1, category: "grain" },
  { name: "Dosa (plain)", calories: 130, protein: 4, carbs: 22, fats: 3, unit: "piece", quantity: 1, category: "grain", micronutrients: { iron: 0.8, magnesium: 18 } },
  { name: "Idli", calories: 60, protein: 2, carbs: 12, fats: 0.4, unit: "piece", quantity: 1, category: "grain", micronutrients: { iron: 0.3, magnesium: 8 } },
  { name: "Poha", calories: 250, protein: 5, carbs: 42, fats: 7, unit: "bowl", quantity: 1, category: "grain", micronutrients: { iron: 1.5, magnesium: 45 } },
  { name: "Upma", calories: 210, protein: 5, carbs: 32, fats: 7, unit: "bowl", quantity: 1, category: "grain", micronutrients: { iron: 1.2, magnesium: 35 } },

  // Indian Curries & Dals
  { name: "Dal (Toor/Masoor)", calories: 180, protein: 12, carbs: 28, fats: 2, unit: "bowl", quantity: 1, category: "protein", micronutrients: { iron: 3.5, fiber: 8, magnesium: 45 } },
  { name: "Dal Makhani", calories: 260, protein: 12, carbs: 30, fats: 10, unit: "bowl", quantity: 1, category: "protein", micronutrients: { iron: 3, fiber: 10, calcium: 60 } },
  { name: "Rajma (Kidney Beans)", calories: 220, protein: 14, carbs: 32, fats: 4, unit: "bowl", quantity: 1, category: "protein", micronutrients: { iron: 4, fiber: 11, potassium: 600 } },
  { name: "Chole (Chickpea Curry)", calories: 240, protein: 12, carbs: 36, fats: 6, unit: "bowl", quantity: 1, category: "protein", micronutrients: { iron: 3.5, fiber: 10, magnesium: 48 } },
  { name: "Paneer Butter Masala", calories: 350, protein: 16, carbs: 14, fats: 26, unit: "bowl", quantity: 1, category: "protein", micronutrients: { calcium: 280, vitaminA: 180 } },
  { name: "Palak Paneer", calories: 280, protein: 14, carbs: 12, fats: 20, unit: "bowl", quantity: 1, category: "protein", micronutrients: { iron: 4, calcium: 260, vitaminA: 450, vitaminC: 8 } },
  { name: "Chicken Curry", calories: 300, protein: 28, carbs: 10, fats: 16, unit: "bowl", quantity: 1, category: "protein", micronutrients: { iron: 2, zinc: 3 } },
  { name: "Butter Chicken", calories: 380, protein: 30, carbs: 12, fats: 24, unit: "bowl", quantity: 1, category: "protein", micronutrients: { iron: 2.2, calcium: 80, vitaminA: 200 } },
  { name: "Fish Curry", calories: 250, protein: 26, carbs: 8, fats: 12, unit: "bowl", quantity: 1, category: "protein", micronutrients: { iron: 1.5, vitaminD: 4, omega3: 1.2 } },
  { name: "Egg Curry", calories: 220, protein: 14, carbs: 10, fats: 14, unit: "bowl", quantity: 1, category: "protein", micronutrients: { iron: 2.5, vitaminA: 280, vitaminD: 2 } },
  { name: "Aloo Gobi", calories: 180, protein: 4, carbs: 24, fats: 8, unit: "bowl", quantity: 1, category: "vegetable", micronutrients: { vitaminC: 25, potassium: 450, fiber: 4 } },
  { name: "Bhindi Masala", calories: 140, protein: 3, carbs: 16, fats: 7, unit: "bowl", quantity: 1, category: "vegetable", micronutrients: { vitaminC: 18, fiber: 3.5, magnesium: 45 } },
  { name: "Mixed Veg Curry", calories: 160, protein: 4, carbs: 18, fats: 8, unit: "bowl", quantity: 1, category: "vegetable", micronutrients: { vitaminA: 350, vitaminC: 22, fiber: 4 } },
  { name: "Sambar", calories: 150, protein: 6, carbs: 22, fats: 4, unit: "bowl", quantity: 1, category: "vegetable", micronutrients: { vitaminC: 12, iron: 1.5, fiber: 5 } },
  { name: "Rasam", calories: 60, protein: 2, carbs: 10, fats: 1, unit: "bowl", quantity: 1, category: "beverage", micronutrients: { vitaminC: 8, iron: 0.5 } },

  // Proteins
  { name: "Chicken Breast (grilled)", calories: 165, protein: 31, carbs: 0, fats: 3.6, unit: "100g", quantity: 1, category: "protein", micronutrients: { iron: 1, zinc: 1, vitaminB6: 0.5 } },
  { name: "Chicken Thigh", calories: 210, protein: 26, carbs: 0, fats: 11, unit: "100g", quantity: 1, category: "protein", micronutrients: { iron: 1.2, zinc: 2 } },
  { name: "Boiled Egg", calories: 78, protein: 6, carbs: 0.6, fats: 5, unit: "piece", quantity: 1, category: "protein", micronutrients: { iron: 0.6, vitaminA: 80, vitaminD: 1, vitaminB12: 0.4 } },
  { name: "Egg Omelette (2 eggs)", calories: 190, protein: 13, carbs: 2, fats: 14, unit: "serving", quantity: 1, category: "protein", micronutrients: { iron: 1.4, vitaminA: 180, vitaminD: 2, calcium: 60 } },
  { name: "Paneer (cottage cheese)", calories: 265, protein: 18, carbs: 3, fats: 20, unit: "100g", quantity: 1, category: "protein", micronutrients: { calcium: 480, phosphorus: 340 } },
  { name: "Tofu", calories: 80, protein: 8, carbs: 2, fats: 4, unit: "100g", quantity: 1, category: "protein", micronutrients: { calcium: 350, iron: 2.5, magnesium: 30 } },
  { name: "Tandoori Chicken", calories: 220, protein: 28, carbs: 4, fats: 10, unit: "piece", quantity: 1, category: "protein", micronutrients: { iron: 1.5, zinc: 2.5 } },
  { name: "Fish (grilled)", calories: 140, protein: 26, carbs: 0, fats: 3, unit: "100g", quantity: 1, category: "protein", micronutrients: { vitaminD: 12, vitaminB12: 2.4, omega3: 2 } },

  // Dairy
  { name: "Milk (full fat)", calories: 150, protein: 8, carbs: 12, fats: 8, unit: "glass", quantity: 1, category: "dairy", micronutrients: { calcium: 300, vitaminD: 2.5, vitaminB12: 1.1 } },
  { name: "Milk (toned)", calories: 100, protein: 7, carbs: 12, fats: 3, unit: "glass", quantity: 1, category: "dairy", micronutrients: { calcium: 300, vitaminD: 2.5 } },
  { name: "Curd / Yogurt", calories: 100, protein: 5, carbs: 8, fats: 5, unit: "bowl", quantity: 1, category: "dairy", micronutrients: { calcium: 180, vitaminB12: 0.5 } },
  { name: "Greek Yogurt", calories: 130, protein: 12, carbs: 8, fats: 5, unit: "bowl", quantity: 1, category: "dairy", micronutrients: { calcium: 150, vitaminB12: 0.6 } },
  { name: "Lassi (sweet)", calories: 180, protein: 5, carbs: 30, fats: 4, unit: "glass", quantity: 1, category: "dairy", micronutrients: { calcium: 200 } },
  { name: "Buttermilk / Chaas", calories: 40, protein: 2, carbs: 5, fats: 1, unit: "glass", quantity: 1, category: "dairy", micronutrients: { calcium: 120 } },
  { name: "Cheese Slice", calories: 110, protein: 6, carbs: 1, fats: 9, unit: "slice", quantity: 1, category: "dairy", micronutrients: { calcium: 180 } },

  // Fruits
  { name: "Banana", calories: 105, protein: 1.3, carbs: 27, fats: 0.4, unit: "piece", quantity: 1, category: "fruit", micronutrients: { potassium: 450, vitaminC: 10, vitaminB6: 0.4, fiber: 3 } },
  { name: "Apple", calories: 95, protein: 0.5, carbs: 25, fats: 0.3, unit: "piece", quantity: 1, category: "fruit", micronutrients: { vitaminC: 4, fiber: 4, potassium: 195 } },
  { name: "Mango", calories: 200, protein: 2, carbs: 50, fats: 1, unit: "piece", quantity: 1, category: "fruit", micronutrients: { vitaminA: 110, vitaminC: 60, fiber: 3 } },
  { name: "Orange", calories: 62, protein: 1.2, carbs: 15, fats: 0.2, unit: "piece", quantity: 1, category: "fruit", micronutrients: { vitaminC: 70, fiber: 3, potassium: 237 } },
  { name: "Watermelon", calories: 85, protein: 1.7, carbs: 22, fats: 0.4, unit: "bowl", quantity: 1, category: "fruit", micronutrients: { vitaminA: 85, vitaminC: 12, lycopene: 9 } },
  { name: "Papaya", calories: 120, protein: 1.5, carbs: 30, fats: 0.4, unit: "bowl", quantity: 1, category: "fruit", micronutrients: { vitaminC: 188, vitaminA: 250, fiber: 2.5 } },
  { name: "Grapes", calories: 104, protein: 1, carbs: 27, fats: 0.2, unit: "bowl", quantity: 1, category: "fruit", micronutrients: { vitaminC: 16, vitaminK: 22, potassium: 288 } },

  // Snacks
  { name: "Samosa", calories: 260, protein: 5, carbs: 30, fats: 14, unit: "piece", quantity: 1, category: "snack" },
  { name: "Vada Pav", calories: 290, protein: 6, carbs: 40, fats: 12, unit: "piece", quantity: 1, category: "snack" },
  { name: "Pakora / Bhajiya", calories: 180, protein: 4, carbs: 18, fats: 10, unit: "serving", quantity: 1, category: "snack" },
  { name: "Pav Bhaji", calories: 400, protein: 10, carbs: 52, fats: 18, unit: "plate", quantity: 1, category: "meal" },
  { name: "Dhokla", calories: 160, protein: 6, carbs: 28, fats: 3, unit: "serving", quantity: 1, category: "snack" },
  { name: "Biscuits (pack)", calories: 140, protein: 2, carbs: 20, fats: 6, unit: "pack", quantity: 1, category: "snack" },
  { name: "Namkeen / Mixture", calories: 180, protein: 4, carbs: 20, fats: 10, unit: "serving", quantity: 1, category: "snack" },
  { name: "Protein Bar", calories: 200, protein: 20, carbs: 22, fats: 7, unit: "bar", quantity: 1, category: "snack" },
  { name: "Dark Chocolate (2 squares)", calories: 110, protein: 2, carbs: 12, fats: 7, unit: "serving", quantity: 1, category: "snack" },

  // Beverages
  { name: "Tea (with milk & sugar)", calories: 50, protein: 1, carbs: 8, fats: 1.5, unit: "cup", quantity: 1, category: "beverage" },
  { name: "Tea (black, no sugar)", calories: 5, protein: 0, carbs: 1, fats: 0, unit: "cup", quantity: 1, category: "beverage" },
  { name: "Coffee (black)", calories: 5, protein: 0, carbs: 1, fats: 0, unit: "cup", quantity: 1, category: "beverage" },
  { name: "Coffee with Milk", calories: 60, protein: 2, carbs: 6, fats: 3, unit: "cup", quantity: 1, category: "beverage" },
  { name: "Fresh Juice (orange)", calories: 110, protein: 2, carbs: 26, fats: 0, unit: "glass", quantity: 1, category: "beverage" },
  { name: "Coconut Water", calories: 45, protein: 1.7, carbs: 9, fats: 0.5, unit: "glass", quantity: 1, category: "beverage" },
  { name: "Protein Shake", calories: 200, protein: 25, carbs: 12, fats: 5, unit: "glass", quantity: 1, category: "beverage" },
  { name: "Cold Coffee", calories: 180, protein: 4, carbs: 28, fats: 6, unit: "glass", quantity: 1, category: "beverage" },

  // Western / Common
  { name: "Bread (white, 2 slices)", calories: 160, protein: 5, carbs: 30, fats: 2, unit: "serving", quantity: 1, category: "grain" },
  { name: "Bread (brown, 2 slices)", calories: 140, protein: 6, carbs: 26, fats: 2, unit: "serving", quantity: 1, category: "grain" },
  { name: "Oats / Oatmeal", calories: 190, protein: 7, carbs: 34, fats: 3.5, unit: "bowl", quantity: 1, category: "grain", micronutrients: { iron: 2.1, magnesium: 60, fiber: 4, zinc: 1.3 } },
  { name: "Pasta (cooked)", calories: 220, protein: 8, carbs: 43, fats: 1.3, unit: "cup", quantity: 1, category: "grain", micronutrients: { iron: 1.5 } },
  { name: "Pizza Slice", calories: 270, protein: 12, carbs: 34, fats: 10, unit: "slice", quantity: 1, category: "meal" },
  { name: "Burger", calories: 350, protein: 18, carbs: 35, fats: 16, unit: "piece", quantity: 1, category: "meal" },
  { name: "Sandwich (veg)", calories: 250, protein: 8, carbs: 32, fats: 10, unit: "piece", quantity: 1, category: "meal" },
  { name: "Wrap / Roll", calories: 300, protein: 14, carbs: 36, fats: 12, unit: "piece", quantity: 1, category: "meal" },
  { name: "Salad (mixed, no dressing)", calories: 80, protein: 3, carbs: 14, fats: 1, unit: "bowl", quantity: 1, category: "vegetable", micronutrients: { vitaminA: 150, vitaminC: 35, vitaminK: 120, fiber: 2 } },
  { name: "French Fries", calories: 310, protein: 4, carbs: 42, fats: 15, unit: "serving", quantity: 1, category: "snack" },
  { name: "Peanut Butter (2 tbsp)", calories: 190, protein: 7, carbs: 6, fats: 16, unit: "serving", quantity: 1, category: "other" },
  { name: "Almonds", calories: 165, protein: 6, carbs: 6, fats: 14, unit: "handful", quantity: 1, category: "snack" },
  { name: "Mixed Dry Fruits", calories: 200, protein: 5, carbs: 18, fats: 14, unit: "handful", quantity: 1, category: "snack" },

  // Complete Meals
  { name: "Biryani (chicken)", calories: 500, protein: 25, carbs: 60, fats: 18, unit: "plate", quantity: 1, category: "meal" },
  { name: "Biryani (veg)", calories: 400, protein: 10, carbs: 62, fats: 12, unit: "plate", quantity: 1, category: "meal" },
  { name: "Thali (veg)", calories: 600, protein: 18, carbs: 80, fats: 22, unit: "plate", quantity: 1, category: "meal" },
  { name: "Thali (non-veg)", calories: 750, protein: 35, carbs: 78, fats: 30, unit: "plate", quantity: 1, category: "meal" },
  { name: "Maggi Noodles", calories: 310, protein: 7, carbs: 45, fats: 12, unit: "pack", quantity: 1, category: "meal" },
  { name: "Fried Rice", calories: 350, protein: 8, carbs: 52, fats: 12, unit: "plate", quantity: 1, category: "meal" },
];

const CATEGORY_LABELS: Record<FoodItem["category"], string> = {
  grain: "Grains & Bread",
  protein: "Protein & Dal",
  dairy: "Dairy",
  fruit: "Fruits",
  vegetable: "Vegetables & Salad",
  snack: "Snacks",
  beverage: "Beverages",
  meal: "Complete Meals",
  other: "Other",
};

export function searchFoods(query: string): FoodItem[] {
  if (!query.trim()) return FOOD_DATABASE.slice(0, 12);
  const q = query.toLowerCase();
  return FOOD_DATABASE.filter(
    (f) => f.name.toLowerCase().includes(q) || f.category.includes(q)
  );
}

export function getCategoryLabel(cat: FoodItem["category"]): string {
  return CATEGORY_LABELS[cat];
}
