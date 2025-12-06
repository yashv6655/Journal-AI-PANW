import mongoose, { Schema, Model } from 'mongoose';

export interface IDailyPrompt {
  userId: string;
  prompt: string;
  date: string; // YYYY-MM-DD format
  answeredAt?: Date;
  createdAt: Date;
}

const DailyPromptSchema = new Schema<IDailyPrompt>({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  prompt: {
    type: String,
    required: true,
  },
  date: {
    type: String,
    required: true,
    index: true,
  },
  answeredAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Unique index: one prompt per user per day
DailyPromptSchema.index({ userId: 1, date: 1 }, { unique: true });

// Index for efficient querying
DailyPromptSchema.index({ userId: 1, date: -1 });

const DailyPromptModel: Model<IDailyPrompt> =
  (mongoose.models.DailyPrompt as Model<IDailyPrompt>) ||
  mongoose.model<IDailyPrompt>('DailyPrompt', DailyPromptSchema);

export default DailyPromptModel;
