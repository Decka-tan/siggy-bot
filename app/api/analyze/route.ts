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

### OUTPUT FORMAT - USE XML TAGS (SYSTEM WILL FORMAT):

Contributor Archetype
<ARCHETYPE>[Archetype Name]</ARCHETYPE> (Style: [Style])
<EXPLANATION>[Concise explanation why this archetype]</EXPLANATION>

Key Contributions & Impact (Based on recent activity)
<ITEM>
<TITLE>[FIRST TITLE]</TITLE>
<DESC>[Description here]</DESC>
</ITEM>
<ITEM>
<TITLE>[SECOND TITLE]</TITLE>
<DESC>[Description here]</DESC>
</ITEM>
<ITEM>
<TITLE>[THIRD TITLE]</TITLE>
<DESC>[Description here]</DESC>
</ITEM>

<HEADER>Summary</HEADER>
<SUMMARY>[2-3 sentences. Add cat mannerisms like "*flicks tail*" or "nya~" only here.]</SUMMARY>

### CRITICAL RULES:
- Use XML tags exactly: <ARCHETYPE>, <EXPLANATION>, <ITEM>, <TITLE>, <DESC>, <HEADER>, <SUMMARY>
- DO NOT use ** markdown - system will format
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

        // Parse XML tags and format with Discord markdown
        let formatted = rawResponse;

        // Format archetype: <ARCHETYPE>Name</ARCHETYPE> -> 🎭 **Name**
        formatted = formatted.replace(/<ARCHETYPE>(.*?)<\/ARCHETYPE>/g, '🎭 **$1**');

        // Format summary header: <HEADER>Summary</HEADER> -> **Summary**
        formatted = formatted.replace(/<HEADER>(.*?)<\/HEADER>/g, '**$1**');

        // Format items: <ITEM>\n<TITLE>Title</TITLE>\n<DESC>Desc</DESC>\n</ITEM> -> 1. **Title**: Desc
        formatted = formatted.replace(/<ITEM>\s*<TITLE>(.*?)<\/TITLE>\s*<DESC>(.*?)<\/DESC>\s*<\/ITEM>/gs, (_, title, desc) => {
          return `1. **${title}**: ${desc.trim()}`;
        });

        // Fix numbering - increment correctly
        const lines = formatted.split('\n');
        let itemNum = 1;
        const numberedLines = lines.map(line => {
          if (line.match(/^\d+\.\s+\*\*/)) {
            const newLine = line.replace(/^\d+\./, `${itemNum}.`);
            itemNum++;
            return newLine;
          }
          return line;
        });
        formatted = numberedLines.join('\n');

        // Remove any remaining XML tags
        formatted = formatted.replace(/<\/?[A-Z]+>/gi, '');

        // Find where actual analysis starts (skip any header)
        const archetypeIndex = formatted.indexOf('Contributor Archetype');
        const intelIndex = formatted.indexOf('🔍 Contributor Intelligence');

        if (archetypeIndex !== -1) {
          formatted = formatted.substring(archetypeIndex);
        } else if (intelIndex !== -1) {
          formatted = formatted.substring(intelIndex);
        }

        rawResponse = formatted;

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
