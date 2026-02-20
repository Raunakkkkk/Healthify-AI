import mongoose, { type Document } from "mongoose";

export interface IChatMessage extends Document {
  userId: mongoose.Types.ObjectId;
  role: "user" | "assistant";
  content: string;
  metadata?: {
    intent?: string;
    actionTaken?: string;
    entriesCreated?: mongoose.Types.ObjectId[];
  };
  createdAt: Date;
}

const chatMessageSchema = new mongoose.Schema<IChatMessage>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
    metadata: {
      intent: String,
      actionTaken: String,
      entriesCreated: [mongoose.Schema.Types.ObjectId],
    },
  },
  { timestamps: true }
);

chatMessageSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<IChatMessage>("ChatMessage", chatMessageSchema);
