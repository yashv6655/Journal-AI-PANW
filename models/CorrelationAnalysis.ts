import mongoose, { Schema, Model } from 'mongoose';

export interface ICorrelationAnalysis {
  userId: string;
  correlations: Array<{
    correlation: string;
    strength: 'strong' | 'moderate' | 'weak';
    description: string;
    examples: string[];
  }>;
  lastEntryId: string; // Track which entry was last analyzed
  lastEntryDate: Date; // Track when last entry was created
  updatedAt: Date;
  createdAt: Date;
}

const CorrelationAnalysisSchema = new Schema<ICorrelationAnalysis>({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  correlations: [
    {
      correlation: String,
      strength: {
        type: String,
        enum: ['strong', 'moderate', 'weak'],
      },
      description: String,
      examples: [String],
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
CorrelationAnalysisSchema.pre('save', function () {
  this.updatedAt = new Date();
});

// Index for efficient querying
CorrelationAnalysisSchema.index({ userId: 1 });

const CorrelationAnalysisModel: Model<ICorrelationAnalysis> =
  (mongoose.models.CorrelationAnalysis as Model<ICorrelationAnalysis>) ||
  mongoose.model<ICorrelationAnalysis>('CorrelationAnalysis', CorrelationAnalysisSchema);

export default CorrelationAnalysisModel;
