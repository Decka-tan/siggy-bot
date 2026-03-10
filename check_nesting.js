const fs = require('fs');
const c = fs.readFileSync('app/chat/page.tsx', 'utf8');
const lines = c.split('\n');
let depth = 0;
let inReturn = false;
for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.includes('return (')) inReturn = true;
    if (!inReturn) continue;
    const opens = (l.match(/<[a-zA-Z][^/>]*[^/]>/g) || []).length;
    const selfClose = (l.match(/<[^>]*\/>/g) || []).length;
    const closes = (l.match(/<\/[^>]+>/g) || []).length;
    const frags = (l.match(/<>/g) || []).length;
    const fragCloses = (l.match(/<\/>/g) || []).length;
    const net = opens + frags - closes - fragCloses;
    depth += net;
    if (net !== 0) {
        console.log(`L${i + 1}: depth=${depth} net=${net} | ${l.trim().substring(0, 100)}`);
    }
    if (l.trim() === ');' && inReturn) break;
}
console.log('Final depth:', depth);
