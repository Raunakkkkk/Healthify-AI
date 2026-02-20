import mongoose, { type Document } from "mongoose";

export interface IImageUpload extends Document {
  userId: mongoose.Types.ObjectId;
  imageUrl: string;
  extractedText: string;
  extractedNutrition: {
    foods: Array<{
      name: string;
      calories: number;
      protein: number;
      carbs: number;
      fats: number;
      quantity: number;
      unit: string;
    }>;
  };
  confidenceScore: number;
  createdAt: Date;
}

const imageUploadSchema = new mongoose.Schema<IImageUpload>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    imageUrl: { type: String, required: true },
    extractedText: { type: String, default: "" },
    extractedNutrition: {
      foods: [
        {
          name: { type: String },
          calories: { type: Number },
          protein: { type: Number },
          carbs: { type: Number },
          fats: { type: Number },
          quantity: { type: Number },
          unit: { type: String },
        },
      ],
    },
    confidenceScore: { type: Number, default: 0, min: 0, max: 1 },
  },
  { timestamps: true }
);

export default mongoose.model<IImageUpload>("ImageUpload", imageUploadSchema);
