import mongoose, { Schema, Model } from 'mongoose';
import type { JournalEntry, SentimentResult } from '@/types';

export interface IEntry extends Omit<JournalEntry, '_id'> {}

const SentimentSchema = new Schema<SentimentResult>(
  {
    overall: {
      type: String,
      enum: ['positive', 'neutral', 'negative'],
      required: true,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    emotions: {
      type: [String],
      default: [],
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
  },
  { _id: false }
);

const EntrySchema = new Schema<IEntry>({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  content: {
    type: String,
    required: [true, 'Entry content is required'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  sentiment: {
    type: SentimentSchema,
  },
  metadata: {
    wordCount: {
      type: Number,
      required: true,
    },
    prompt: {
      type: String,
    },
    timeOfDay: {
      type: String,
      enum: ['morning', 'afternoon', 'evening', 'night'],
      required: true,
    },
  },
  tags: {
    type: [String],
    default: [],
    index: true,
  },
});

// Update updatedAt on save
EntrySchema.pre('save', function () {
  this.updatedAt = new Date();
});

// Index for efficient querying
EntrySchema.index({ userId: 1, createdAt: -1 });

const EntryModel: Model<IEntry> =
  (mongoose.models.Entry as Model<IEntry>) ||
  mongoose.model<IEntry>('Entry', EntrySchema);

export default EntryModel;
