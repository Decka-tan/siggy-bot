/**
 * MANUAL COMMUNITY KNOWLEDGE
 * Verified facts and corrections provided by users
 */

import { KnowledgeEntry } from './siggy-knowledge';

export const MANUAL_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: 'manual-ylona-drawize-1',
    category: 'discord_event',
    keywords: ['ylona', 'host', 'drawize', 'event', 'november', '2025'],
    content: "Nama event (penting): Drawize Night\nHost (penting): @! Ylona ❖,❖^ྀི\nWhen (penting): 11/4/2025 8:55 PM\nDeskripsi: Ylona hosted a fun Drawize session where community members competed in drawing and guessing games.",
    priority: 10,
  },
  {
    id: 'manual-ylona-drawize-2',
    category: 'discord_event',
    keywords: ['ylona', 'host', 'drawize', 'event', 'november', '2025'],
    content: "Nama event (penting): Drawize Night Part 2\nHost (penting): @! Ylona ❖,❖^ྀི\nWhen (penting): 11/18/2025 9:15 PM\nDeskripsi: A follow-up Drawize event hosted by Ylona due to high community demand.",
    priority: 10,
  },
  {
    id: 'manual-kash-role',
    category: 'discord_role',
    keywords: ['kash', 'role', 'npc', 'leader', 'grit'],
    content: "Person: Kash (Kash(❖,❖))\nRole: NPC LEADER\nNote: Kash is often identified as 'NPC LEADER [GRIT]' in Discord logs. He is a key member of the community who manages events and supports the Ritual forge. He is NOT an event name himself; he is a PERSON holding a leadership role.",
    priority: 10,
  },
  {
    id: 'manual-karaoke-indo-special',
    category: 'discord_event',
    keywords: ['karaoke', 'night', 'indonesia', 'special', 'host', 'lunabean', 'hahawe', 'irontual', 'february', '2026'],
    content: "Nama event (penting): 🎤 RITUAL KARAOKE NIGHT — INDONESIA SPECIAL 🇮🇩🔥\nHost (penting): @Lunabean (❖,❖) and @! Hahawe Irontual (❖❖)\nWhen (penting): 05/02/2026 19:55\nDeskripsi: Malam karaoke seru khusus warga Ritual Indonesia di Indo Voice. BUKAN cari suara emas, tapi cari mikrofon yang bikin audiens kabur! Bebas pilih lagu dari Timur ke Barat, Rock ke Dangdut.",
    priority: 10,
  },
  {
    id: 'correction-edward-karaoke',
    category: 'correction',
    keywords: ['edward', 'host', 'karaoke', 'indonesia'],
    content: "CORRECTION: Edward did NOT host the Indonesia Special Karaoke Night on Feb 5th, 2026. The actual hosts were Lunabean and Hahawe Irontual. Edward is a frequent host for other events (13 total) but not this specific karaoke night.",
    priority: 10,
  },

  // ==========================================
  // EVENT MANAGERS & HOSTS (Verified)
  // ==========================================
  {
    id: 'verified-event-managers',
    category: 'discord_event',
    keywords: ['hinata', 'kash', 'event manager', 'who manages events'],
    content: "VERIFIED: @Hinata (X: @nft_hinata_eth) and @Kash (X: @Kash_060) are the official Event Managers for Ritual Discord. They coordinate all weekly recurring events including quizzes, game nights, karaoke, and workshops. Contact them for event inquiries or hosting opportunities.",
    priority: 10,
  },
  {
    id: 'verified-karaoke-hosts',
    category: 'discord_event',
    keywords: ['karaoke', 'friday', 'cutie quinn', 'claire', 'host'],
    content: "VERIFIED: Ritual Karaoke occurs every FRIDAY at 12:30 PM UTC. Regular hosts are @Cutie Quinn and @Claire. This is one of the most popular weekly events where community members sing together.",
    priority: 10,
  },
  {
    id: 'verified-tech-101-hosts',
    category: 'discord_event',
    keywords: ['tech 101', 'ritual tech', 'barnabas', 'capt awesome', 'workshop'],
    content: "VERIFIED: Ritual Tech 101 occurs every SATURDAY at 12:00 PM UTC. Hosted by @Barnabas and @Capt. Awesome. This is a learning series that breaks down Ritual's technology in simple terms without jargon.",
    priority: 10,
  },

  // ==========================================
  // CHANNEL PURPOSES (Verified)
  // ==========================================
  {
    id: 'verified-channel-ritual',
    category: 'discord_channel',
    keywords: ['ritual channel', 'main chat', 'general discussion'],
    content: "VERIFIED: #ritual is the main chat channel for discussing Ritual Chain, AI, and Crypto. This is where you ask questions, share news, and have conversations at the intersection of AI × Crypto. All server rules apply.",
    priority: 10,
  },
  {
    id: 'verified-channel-contributions',
    category: 'discord_channel',
    keywords: ['contributions channel', 'share guides', 'tutorials'],
    content: "VERIFIED: #contributions is for sharing your Ritual guides, tutorials, and explainers. This includes blog posts, videos, documentation, and other educational content. Great place to showcase your work and help others learn about Ritual.",
    priority: 10,
  },
  {
    id: 'verified-channel-build',
    category: 'discord_channel',
    keywords: ['build channel', 'building apps', 'collab'],
    content: "VERIFIED: #build is a collaboration space for building apps or protocols natively on Ritual. Connect with other builders, share projects, and collaborate on Ritual-based applications.",
    priority: 10,
  },
  {
    id: 'verified-channel-support',
    category: 'discord_channel',
    keywords: ['support channel', 'ticket', 'help'],
    content: "VERIFIED: #support is for opening private support tickets. Upload logs and screenshots when you need help. Do NOT use this channel for general questions - use #ritual instead.",
    priority: 10,
  },

  // ==========================================
  // COMMUNITY TERMS (Verified)
  // ==========================================
  {
    id: 'verified-term-gritual',
    category: 'community_term',
    keywords: ['gritual', 'greeting', 'hello', 'what is gritual'],
    content: "VERIFIED: 'Gritual' is the community greeting (great + ritual). Used like: 'Gritual mate!', 'Gritual champ!', 'Gritual everyone!' There's a dedicated #gritual channel for greetings.",
    priority: 10,
  },
  {
    id: 'verified-term-yapping',
    category: 'community_term',
    keywords: ['yapping', 'yap', 'what is yapping', 'positive'],
    content: "VERIFIED: 'Yapping' in Ritual community means ACTIVE chatting/contributing. Unlike general internet usage, this has a POSITIVE connotation. Being called a 'good yapper' means you're an engaged, valuable community member.",
    priority: 10,
  },
  {
    id: 'verified-term-syns',
    category: 'community_term',
    keywords: ['syns', 'sins', 'confessions', 'blessings of syn'],
    content: "VERIFIED: 'Syns' is how the community spells 'sins'. Used in #confessions (confess your syns) and #blessings-of-syn channels. Part of the unique Ritual vocabulary.",
    priority: 10,
  },
  {
    id: 'verified-term-wen',
    category: 'community_term',
    keywords: ['wen', 'when', 'token', 'airdrop'],
    content: "VERIFIED: 'Wen' is a community meme for 'when' (as in 'wen token?', 'wen airdrop?'). There's a dedicated #wen channel for these questions. Used playfully throughout the community.",
    priority: 10,
  },

  // ==========================================
  // ROLE CLARIFICATIONS (Verified)
  // ==========================================
  {
    id: 'verified-role-ritty-telegram',
    category: 'discord_role',
    keywords: ['ritty', 'telegram', 'exclusive chat'],
    content: "VERIFIED: @Ritty role grants access to an exclusive Telegram chat for long-term, loyal community members. This role recognizes conviction for what Ritual is building.",
    priority: 10,
  },
  {
    id: 'verified-role-node-runner-discontinued',
    category: 'discord_role',
    keywords: ['node runner', 'discontinued', 'no longer available'],
    content: "VERIFIED: @Node Runner role is NO LONGER AVAILABLE. This was for early infrastructure operators who helped bootstrap Ritual's network. New node operators cannot obtain this role.",
    priority: 10,
  },
  {
    id: 'verified-role-forerunner-og',
    category: 'discord_role',
    keywords: ['forerunner', 'og', 'before ritual', 'limited'],
    content: "VERIFIED: @Forerunner role is for those 'from the time before Ritual.' Only a limited number made it through the void. This is an extremely rare role for the earliest community members from before the current community formed.",
    priority: 10,
  },
];
