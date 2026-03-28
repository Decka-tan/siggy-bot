import { NextRequest, NextResponse } from 'next/server';
import { getUserChecker } from '@/lib/user-checker';

/**
 * UNIFIED ANALYSIS API
 * Uses UserChecker for consistent contributor analysis
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { contributorId, username } = body;

    // Accept either contributorId or username (for Discord bot compatibility)
    const queryId = contributorId || username;

    if (!queryId) {
      return NextResponse.json({ success: false, error: 'Username or contributor ID is required' }, { status: 400 });
    }

    const checker = getUserChecker();
    const analysis = await checker.getAIAnalysis(queryId);
    const user = checker.findUser(queryId);

    return NextResponse.json({
      success: true,
      analysis,
      user
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
