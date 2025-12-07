import mongoose, { Schema, Model } from 'mongoose';

export interface ITopicAnalysis {
  userId: string;
  topics: Array<{
    name: string;
    description: string;
    prompts: string[];
    relevance: number;
    category: 'struggle' | 'growth' | 'general';
  }>;
  lastEntryId?: string;
  lastEntryDate?: Date;
  updatedAt: Date;
  createdAt: Date;
}

const TopicAnalysisSchema = new Schema<ITopicAnalysis>({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  topics: [
    {
      name: { type: String, required: true },
      description: { type: String, required: true },
      prompts: [{ type: String }],
      relevance: { type: Number, default: 0.8 },
      category: {
        type: String,
        enum: ['struggle', 'growth', 'general'],
        default: 'general',
      },
    },
  ],
  lastEntryId: {
    type: String,
  },
  lastEntryDate: {
    type: Date,
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

// Index for efficient querying
TopicAnalysisSchema.index({ userId: 1 });

const TopicAnalysisModel: Model<ITopicAnalysis> =
  (mongoose.models.TopicAnalysis as Model<ITopicAnalysis>) ||
  mongoose.model<ITopicAnalysis>('TopicAnalysis', TopicAnalysisSchema);

export default TopicAnalysisModel;
