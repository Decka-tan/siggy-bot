import { NextRequest, NextResponse } from 'next/server';
import { getUserChecker } from '@/lib/user-checker';

/**
 * UNIFIED ANALYSIS API
 * Now uses the same UserChecker as the Discord bot for 100% consistency!
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { contributorId } = body;

    if (!contributorId) {
      return NextResponse.json({ success: false, error: 'Contributor ID is required' }, { status: 400 });
    }

    const checker = getUserChecker();
    const analysis = await checker.getAIAnalysis(contributorId);
    const user = checker.findUser(contributorId);

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
