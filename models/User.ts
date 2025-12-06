import mongoose, { Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import type { User } from '@/types';

export interface IUser extends Omit<User, '_id'> {
  comparePassword(candidatePassword: string): Promise<boolean>;
  updateStreak(): Promise<void>;
}

const UserSchema = new Schema<IUser>({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  name: {
    type: String,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  preferences: {
    journalingGoal: {
      type: String,
      enum: ['stress_relief', 'self_discovery', 'habit_building'],
    },
    journalingFrequency: {
      type: String,
      enum: ['never', 'occasionally', 'regularly'],
    },
    preferredTime: {
      type: String,
      enum: ['morning', 'evening', 'anytime'],
    },
  },
  stats: {
    totalEntries: {
      type: Number,
      default: 0,
    },
    currentStreak: {
      type: Number,
      default: 0,
    },
    longestStreak: {
      type: Number,
      default: 0,
    },
    lastEntryDate: {
      type: Date,
    },
  },
});

// Hash password before saving
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare password
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to update streak
UserSchema.methods.updateStreak = async function (): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!this.stats.lastEntryDate) {
    this.stats.currentStreak = 1;
    this.stats.longestStreak = 1;
    this.stats.lastEntryDate = today;
  } else {
    const lastEntry = new Date(this.stats.lastEntryDate);
    lastEntry.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - lastEntry.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    if (diffDays === 0) {
      // Same day, don't update streak
      return;
    } else if (diffDays === 1) {
      // Consecutive day
      this.stats.currentStreak += 1;
      this.stats.longestStreak = Math.max(
        this.stats.longestStreak,
        this.stats.currentStreak
      );
    } else {
      // Streak broken
      this.stats.currentStreak = 1;
    }

    this.stats.lastEntryDate = today;
  }

  await this.save();
};

const UserModel: Model<IUser> =
  (mongoose.models.User as Model<IUser>) ||
  mongoose.model<IUser>('User', UserSchema);

export default UserModel;
