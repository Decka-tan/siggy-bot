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

### CRITICAL FORMATTING RULES:
**BOLD = title only, NORMAL = description**

WRONG: **1. Title**: Description that is bold
RIGHT: **1. Title**: Description that is normal

The bold part ENDS after the colon. Everything after colon is normal text.

### OUTPUT FORMAT:
**Contributor Archetype**
🎭 [Archetype Name] (Style: [Style])
[Concise explanation in normal text]

**Key Contributions & Impact** (Based on recent activity)
**1. [Bold Title]**: [Normal text description here]
**2. [Bold Title]**: [Normal text description here]
**3. [Bold Title]**: [Normal text description here]

**Summary**
[2-3 sentences in normal text. Add cat mannerisms like "*flicks tail*" or "nya~" only here.]

### EXAMPLES:
**1. Smart Contract Development**: They build Solidity contracts...
**2. Community Leadership**: Organizes events and...

IMPORTANT:
- ONLY the title part is bold: **Title**:
- Description after colon is ALWAYS normal text
- Contributor roles: Radiant Ritualist, Ritualist, Zealot, ritty, bitty, mage
- Specify "X contributions" not "X messages"
- Focus on actual work from X posts`;

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
