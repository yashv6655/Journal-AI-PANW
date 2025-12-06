import mongoose, { Schema, Model } from 'mongoose';
import type { WeeklySummary } from '@/types';

export interface ISummary extends Omit<WeeklySummary, '_id'> {}

const SummarySchema = new Schema<ISummary>({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['weekly', 'monthly'],
    required: true,
  },
  period: {
    start: {
      type: Date,
      required: true,
    },
    end: {
      type: Date,
      required: true,
    },
  },
  content: {
    type: String,
    required: true,
  },
  insights: {
    type: [String],
    default: [],
  },
  entriesAnalyzed: {
    type: Number,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for efficient querying
SummarySchema.index({ userId: 1, createdAt: -1 });

const SummaryModel: Model<ISummary> =
  (mongoose.models.Summary as Model<ISummary>) ||
  mongoose.model<ISummary>('Summary', SummarySchema);

export default SummaryModel;
