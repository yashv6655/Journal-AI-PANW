import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import UserModel from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const user = await UserModel.findById(session.user.id).lean();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      journalingGoal: user.preferences?.journalingGoal || null,
    });
  } catch (error) {
    console.error('Error fetching user goals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user goals' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { journalingGoal } = await request.json();

    if (journalingGoal && !['stress_relief', 'self_discovery', 'habit_building'].includes(journalingGoal)) {
      return NextResponse.json(
        { error: 'Invalid journaling goal' },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await UserModel.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.preferences) {
      user.preferences = {} as any;
    }

    user.preferences.journalingGoal = journalingGoal || undefined;
    await user.save();

    return NextResponse.json({
      success: true,
      journalingGoal: user.preferences.journalingGoal || null,
    });
  } catch (error) {
    console.error('Error updating user goals:', error);
    return NextResponse.json(
      { error: 'Failed to update goals' },
      { status: 500 }
    );
  }
}
