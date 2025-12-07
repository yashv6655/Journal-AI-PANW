import mongoose, { Schema, Model } from 'mongoose';

export interface IThemeAnalysis {
  userId: string;
  themes: Array<{
    theme: string;
    frequency: number;
    sentiment: 'positive' | 'neutral' | 'negative';
    examples: string[];
    description: string;
  }>;
  lastEntryId: string; // Track which entry was last analyzed
  lastEntryDate: Date; // Track when last entry was created
  updatedAt: Date;
  createdAt: Date;
}

const ThemeAnalysisSchema = new Schema<IThemeAnalysis>({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  themes: [
    {
      theme: String,
      frequency: Number,
      sentiment: {
        type: String,
        enum: ['positive', 'neutral', 'negative'],
      },
      examples: [String],
      description: String,
    },
  ],
  lastEntryId: {
    type: String,
    required: true,
  },
  lastEntryDate: {
    type: Date,
    required: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Update updatedAt on save
ThemeAnalysisSchema.pre('save', function () {
  this.updatedAt = new Date();
});

// Index for efficient querying
ThemeAnalysisSchema.index({ userId: 1 });

const ThemeAnalysisModel: Model<IThemeAnalysis> =
  (mongoose.models.ThemeAnalysis as Model<IThemeAnalysis>) ||
  mongoose.model<IThemeAnalysis>('ThemeAnalysis', ThemeAnalysisSchema);

export default ThemeAnalysisModel;
