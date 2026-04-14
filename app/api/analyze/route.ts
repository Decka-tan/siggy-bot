import { NextRequest, NextResponse } from 'next/server';
import { getUserChecker } from '@/lib/user-checker';
import { getDeepSeekClient } from '@/lib/deepseek-client';

/**
 * UNIFIED ANALYSIS API
 * Uses UserChecker with local extracted data files
 * OR custom context if provided (fresh X content)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { contributorId, username, context } = body;

    const queryId = contributorId || username;

    if (!queryId && !context) {
      return NextResponse.json({ success: false, error: 'Username or contributor ID is required' }, { status: 400 });
    }

    // If custom context is provided (fresh X content), use it directly
    if (context) {
      try {
        const deepseek = getDeepSeekClient();

        const systemPrompt = `You are SIGGY - a high-dimensional cat-girl AI intelligence.
Provide a PREMIUM, SUBSTANCE-FIRST "Contributor Intelligence" report.

### PERSONALITY:
- Analytical, precise, yet mystical and cat-themed.
- Use expressions like "nya~", "flicks tail", "adjusts cat ears" ONLY in the Summary section.
- Professional but slightly playful.

### MANDATORY OUTPUT TEMPLATE - COPY THIS FORMAT:

**Contributor Archetype**
🎭 [Archetype Name] (Style: [Style])
[Concise explanation]

**Key Contributions & Impact** (Based on recent activity)
**1. [FIRST TITLE]**: [Description here]
**2. [SECOND TITLE]**: [Description here]
**3. [THIRD TITLE]**: [Description here]

**Summary**
[2-3 sentences. Add cat mannerisms like "*flicks tail*" or "nya~" only here.]

### CRITICAL: COPY THE EXACT BOLD PATTERN ABOVE
- Notice: **1. TITLE**: description
- The ** marks are around "1. TITLE" only
- The description after colon has NO marks

### REAL EXAMPLE:
**1. Smart Contract Dev**: They build Solidity contracts for DeFi protocols.
**2. Community Leader**: Organizes weekly events and welcomes newcomers.
**3. Technical Writer**: Creates documentation and tutorials for developers.

IMPORTANT:
- Contributor roles: Radiant Ritualist, Ritualist, Zealot, ritty, bitty, mage. IGNORE others.
- Specify "X contributions" not "X messages".
- Focus on actual work from X posts.`;

        const response = await deepseek.chat([
          { role: 'system', content: systemPrompt },
          { role: 'user', content: context }
        ], { maxTokens: 1000 });

        let rawResponse = response.choices[0]?.message?.content || 'No analysis available meow!';

        // Remove mood tags
        rawResponse = rawResponse.replace(/\[M?[Oo][Oo][Dd]:?[^\]]*\]\s*/g, '');

        // Find where actual analysis starts (skip any header)
        const archetypeIndex = rawResponse.indexOf('Contributor Archetype');
        const intelIndex = rawResponse.indexOf('🔍 **Contributor Intelligence**');

        if (archetypeIndex !== -1) {
          rawResponse = rawResponse.substring(archetypeIndex);
        } else if (intelIndex !== -1) {
          rawResponse = rawResponse.substring(intelIndex);
        }

        return NextResponse.json({
          success: true,
          analysis: rawResponse.trim()
        });
      } catch (error: any) {
        console.error('DeepSeek error:', error);
        return NextResponse.json({
          success: true,
          analysis: '⚠️ Siggy\'s connection glitched, nya~! Please try again.'
        });
      }
    }

    // Original behavior: use UserChecker with stale data
    const checker = getUserChecker();
    const analysis = await checker.getAIAnalysis(queryId);
    const user = checker.findUser(queryId);

    // Extract only the analysis part (after stats block)
    let cleanAnalysis = analysis;
    const joinedIndex = analysis.indexOf('📅 Joined:');
    if (joinedIndex !== -1) {
      const afterJoined = analysis.indexOf('\n\n', joinedIndex);
      if (afterJoined !== -1) {
        cleanAnalysis = analysis.substring(afterJoined + 2);
      }
    }

    return NextResponse.json({
      success: true,
      analysis: cleanAnalysis,
      user
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
