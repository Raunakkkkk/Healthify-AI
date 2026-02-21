import mongoose, { type Document } from "mongoose";

export interface IGoal extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  startDate: Date;
  endDate: Date | null;
  targetDate: Date | null; // when user aims to complete this goal
  calorieTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
  weightGoal: number | null;
  createdAt: Date;
  updatedAt: Date;
}

const goalSchema = new mongoose.Schema<IGoal>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: { type: String, default: "My Goal" },
    startDate: { type: Date, required: true },
    endDate: { type: Date, default: null },
    targetDate: { type: Date, default: null },
    calorieTarget: { type: Number, required: true, min: 0 },
    proteinTarget: { type: Number, default: 0, min: 0 },
    carbsTarget: { type: Number, default: 0, min: 0 },
    fatTarget: { type: Number, default: 0, min: 0 },
    weightGoal: { type: Number, default: null },
  },
  { timestamps: true }
);

goalSchema.index({ userId: 1, startDate: -1 });
goalSchema.index({ userId: 1, endDate: 1 });

export default mongoose.model<IGoal>("Goal", goalSchema);
