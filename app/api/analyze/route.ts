import { NextRequest, NextResponse } from 'next/server';
import { getUserCheckerAPI } from '@/lib/user-checker-api';

/**
 * UNIFIED ANALYSIS API
 * Uses UserCheckerAPI (Discord API, no local files needed)
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

    const checker = getUserCheckerAPI();
    const analysis = await checker.getAIAnalysis(queryId);
    const user = await checker.findUser(queryId);

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
