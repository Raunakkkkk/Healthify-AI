import mongoose, { type Document } from "mongoose";

export interface IFoodEntry extends Document {
  userId: mongoose.Types.ObjectId;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  foodName: string;
  quantity: number;
  unit: string;
  calories: number;
  macros: {
    protein: number;
    carbs: number;
    fats: number;
  };
  micronutrients: Map<string, number>;
  timestamp: Date;
  source: "manual" | "ai";
  imageId: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const foodEntrySchema = new mongoose.Schema<IFoodEntry>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    mealType: {
      type: String,
      enum: ["breakfast", "lunch", "dinner", "snack"],
      required: true,
    },
    foodName: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true, trim: true },
    calories: { type: Number, required: true, min: 0 },
    macros: {
      protein: { type: Number, default: 0, min: 0 },
      carbs: { type: Number, default: 0, min: 0 },
      fats: { type: Number, default: 0, min: 0 },
    },
    micronutrients: { type: Map, of: Number, default: new Map() },
    timestamp: { type: Date, default: Date.now },
    source: { type: String, enum: ["manual", "ai"], default: "manual" },
    imageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ImageUpload",
      default: null,
    },
  },
  { timestamps: true }
);

foodEntrySchema.index({ userId: 1, timestamp: -1 });
foodEntrySchema.index({ userId: 1, mealType: 1, timestamp: -1 });

export default mongoose.model<IFoodEntry>("FoodEntry", foodEntrySchema);
