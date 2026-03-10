#!/bin/bash

# Ritual Knowledge Fetcher
# Fetches content from Ritual URLs and extracts knowledge

OUTPUT_DIR="lib"
OUTPUT_FILE="$OUTPUT_DIR/ritual-web-knowledge.ts"

echo "🔮 Fetching Ritual Knowledge..."
echo "================================"

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Start the TypeScript file
cat > "$OUTPUT_FILE" << 'EOF'
/**
 * RITUAL KNOWLEDGE BASE
 * Auto-generated from Ritual URLs
 */

import type { KnowledgeEntry } from './siggy-knowledge';

export const RITUAL_WEB_KNOWLEDGE: KnowledgeEntry[] = [
EOF

# Function to fetch and extract text from URL
fetch_url() {
    local url="$1"
    local id=$(echo "$url" | sed 's/https\?:\/\///' | sed 's/[^a-z0-9]/-/gi' | tr '[:upper:]' '[:lower:]' | cut -c1-50)
    local category=$(echo "$url" | grep -oE 'docs|blog|team|about|shrine|github' | head -1 || echo "general")

    echo "  Fetching: $url"

    # Try to fetch with curl
    local content=$(curl -s -L -A "Mozilla/5.0" --max-time 30 "$url" 2>/dev/null | \
        sed -n '/<body/,/<\/body>/p' | \
        sed 's/<script[^>]*>.*<\/script>//gi' | \
        sed 's/<style[^>]*>.*<\/style>//gi' | \
        sed 's/<[^>]*>//g' | \
        sed 's/&nbsp;/ /g' | \
        sed 's/&amp;/\&/g' | \
        sed 's/&lt;/</g' | \
        sed 's/&gt;/>/g' | \
        sed 's/&quot;/"/g' | \
        tr -s ' \n\t' ' ' | \
        cut -c1-1500)

    if [ -n "$content" ] && [ ${#content} -gt 100 ]; then
        echo "    ✓ Extracted ${#content} characters"

        # Escape the content for TypeScript
        local escaped=$(echo "$content" | sed 's/`/\\`/g' | sed 's/\\/\\\\/g' | sed 's/$/\\$/g')

        # Append to file
        cat >> "$OUTPUT_FILE" << ENDOFENTRY
  {
    id: '$id',
    category: '$category',
    keywords: ['ritual', '$category'],
    content: "$escaped",
    priority: 5,
    source: '$url',
  },
ENDOFENTRY
    else
        echo "    ✗ Skipped (not enough content)"
    fi

    sleep 1  # Rate limiting
}

# Fetch all URLs
fetch_url "https://ritual.net/about"
fetch_url "https://www.ritualfoundation.org/docs/overview/what-is-ritual"
fetch_url "https://ritualvisualized.com/"
fetch_url "https://github.com/ritual-net"
fetch_url "https://ritual.net/team"
fetch_url "https://ritual.net/careers"
fetch_url "https://www.ritualfoundation.org/team"
fetch_url "https://ritual.net/blog"
fetch_url "https://ritual.net/blog/introducing-ritual"
fetch_url "https://www.ritualfoundation.org/blog"
fetch_url "https://www.ritualfoundation.org/docs/landscape/ritual-vs-other-chains"
fetch_url "https://www.ritualfoundation.org/docs/landscape/ritual-vs-other-crypto-x-ai"
fetch_url "https://www.ritualfoundation.org/docs/whats-new/evm++/overview"
fetch_url "https://www.ritualfoundation.org/docs/using-ritual/ritual-for-users"
fetch_url "https://www.ritualfoundation.org/docs/using-ritual/ritual-for-node-runners"
fetch_url "https://www.ritualfoundation.org/docs/beyond-crypto-x-ai/expressive-blockchains"
fetch_url "https://www.ritualfoundation.org/docs/reference/faq"
fetch_url "https://www.ritualfoundation.org/docs/reference/glossary"
fetch_url "https://shrine.ritualfoundation.org/"
fetch_url "https://shrine.ritualfoundation.org/rfs/evault"
fetch_url "https://shrine.ritualfoundation.org/rfs/promptd"

# Close the array
cat >> "$OUTPUT_FILE" << 'EOF'
];

export default RITUAL_WEB_KNOWLEDGE;
EOF

echo ""
echo "================================"
echo "✓ Done! Knowledge file: $OUTPUT_FILE"
echo ""
echo "Next steps:"
echo "1. Check the generated file"
echo "2. Add this import to siggy-knowledge.ts:"
echo "   import { RITUAL_WEB_KNOWLEDGE } from './ritual-web-knowledge';"
echo ""
