import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { findCorrelations } from '@/services/correlationService';
import { rateLimit } from '@/lib/rateLimit';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting: 30 requests per minute per user
    const rateLimitKey = `correlations:${session.user.id}`;
    const rateLimitResult = rateLimit(rateLimitKey, 30, 60000);
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait before analyzing correlations again.' },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const forceRefresh = searchParams.get('refresh') === 'true';

    const correlations = await findCorrelations(session.user.id, limit, forceRefresh);

    return NextResponse.json({ correlations });
  } catch (error) {
    console.error('Error fetching correlations:', error);
    // Return empty array instead of error to prevent UI breaking
    return NextResponse.json({ correlations: [] });
  }
}
