#!/bin/bash

OUTPUT_FILE="lib/ritual-web-knowledge.ts"

echo "🔮 Fetching ALL Ritual URLs..."

# Create header
cat > "$OUTPUT_FILE" << 'HEADER'
/**
 * RITUAL KNOWLEDGE BASE
 * Auto-generated from ALL Ritual URLs provided
 */

import type { KnowledgeEntry } from './siggy-knowledge';

export const RITUAL_WEB_KNOWLEDGE: KnowledgeEntry[] = [
HEADER

# Function to clean and extract text
fetch_and_clean() {
    local url="$1"
    local id=$(echo "$url" | sed 's/https\?:\/\///' | sed 's/[^a-z0-9]/-/gi' | tr '[:upper:]' '[:lower:]' | cut -c1-50)
    local category=$(echo "$url" | grep -oE 'docs|blog|team|about|shrine|github|careers|foundation|evm|faq|glossary' | head -1 || echo "general")
    
    echo "  Fetching: $url"
    
    # Fetch and extract meaningful text
    local content=$(curl -s -L -A "Mozilla/5.0" --max-time 30 "$url" 2>/dev/null | \
        # Remove script, style, nav, footer
        sed -e '/<script/d' -e '/<style/d' -e '/<nav/d' -e '/<footer/d' | \
        # Extract body content
        grep -o '<body[^>]*>.*</body>' | \
        # Remove HTML tags but keep text
        sed 's/<[^>]*>/ /g' | \
        # Clean up entities
        sed 's/&nbsp;/ /g' | sed 's/&amp;/\&/g' | sed 's/&lt;/</g' | sed 's/&gt;/>/g' | \
        # Remove extra whitespace
        tr -s ' \n\t' ' ' | \
        # Extract meaningful sentences (30-100 chars)
        grep -o '[A-Z][^.!?]*[.!?]' | \
        head -20 | \
        tr '\n' ' ' | \
        cut -c1-2000)
    
    if [ -n "$content" ] && [ ${#content} -gt 200 ]; then
        echo "    ✓ Got ${#content} chars"
        
        # Escape for JSON/TS
        local escaped=$(echo "$content" | sed 's/\/\\/g' | sed 's/"/\\"/g')
        
        cat >> "$OUTPUT_FILE" << ENTRY
  {
    id: '${id}',
    category: '${category}',
    keywords: ['${category}', 'ritual'],
    content: "${escaped}",
    priority: 5,
    source: '${url}',
  },
ENTRY
    else
        echo "    ✗ Skipped"
    fi
    
    sleep 1
}

# ALL URLs from user
fetch_and_clean "https://ritual.net/about"
fetch_and_clean "https://ritualvisualized.com/"
fetch_and_clean "https://github.com/ritual-net"
fetch_and_clean "https://ritual.net/team"
fetch_and_clean "https://ritual.net/careers"
fetch_and_clean "https://ritual.net/blog"
fetch_and_clean "https://ritual.net/blog/introducing-ritual"
fetch_and_clean "https://ritual.net/blog"
fetch_and_clean "https://www.ritualfoundation.org/"
fetch_and_clean "https://www.ritualfoundation.org/about"
fetch_and_clean "https://www.ritualfoundation.org/blog"
fetch_and_clean "https://www.ritualfoundation.org/team"
fetch_and_clean "https://www.ritualfoundation.org/docs/overview/what-is-ritual"
fetch_and_clean "https://www.ritualfoundation.org/docs/landscape/ritual-vs-other-chains"
fetch_and_clean "https://www.ritualfoundation.org/docs/landscape/ritual-vs-other-crypto-x-ai"
fetch_and_clean "https://www.ritualfoundation.org/docs/whats-new/evm++/overview"
fetch_and_clean "https://www.ritualfoundation.org/docs/using-ritual/ritual-for-users"
fetch_and_clean "https://www.ritualfoundation.org/docs/using-ritual/ritual-for-node-runners"
fetch_and_clean "https://www.ritualfoundation.org/docs/beyond-crypto-x-ai/expressive-blockchains"
fetch_and_clean "https://www.ritualfoundation.org/docs/reference/faq"
fetch_and_clean "https://www.ritualfoundation.org/docs/reference/glossary"
fetch_and_clean "https://shrine.ritualfoundation.org/"
fetch_and_clean "https://shrine.ritualfoundation.org/rfs/evault"
fetch_and_clean "https://shrine.ritualfoundation.org/rfs/promptd"

# Close the array
echo '];' >> "$OUTPUT_FILE"
echo '' >> "$OUTPUT_FILE"
echo 'export default RITUAL_WEB_KNOWLEDGE;' >> "$OUTPUT_FILE"

echo ""
echo "✓ Done! Processed all URLs"
