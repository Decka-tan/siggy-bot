/**
 * RITUAL DISCORD COMMUNITY RULES, ROLES & ANNOUNCEMENTS
 * Compiled from Discord announcements and updates
 */

import type { KnowledgeEntry } from './siggy-knowledge';

export const RITUAL_COMMUNITY_KNOWLEDGE: KnowledgeEntry[] = [
  // ==========================================
  // MODERATORS & TEAM OVERVIEW
  // ==========================================
  {
    id: 'ritual-moderators-list',
    category: 'team',
    keywords: ['moderators', 'mods', 'who are the moderators', 'how many moderators', 'mod list', 'admin', 'moderator team', 'ticket support', 'who handles ticket', 'list all moderators'],
    content: "Ritual Discord Moderators: Total of 5 key moderators and admins: 1) Jez / Jezelle (jez5728) - Technical Moderator and Community Growth, handles ticket support, promotes member roles. 2) Josh | Ritual (joshsimenhoff) - Admin, Foundation Team, Mods, Zealot - Community Growth lead, does announcements and official events. 3) Stefan | Mad Scientist (stefan_1) - Mods, handles banning scammers, reacting to user reports, sometimes does announcements, manages Path of Recognition. 4) Dunken Ritual (dunken_96) - Official Moderator, handles ticket support, web3 and AI enthusiast. 5. Majorproject Ritual (majorproject8) - China Moderator for Chinese community, also serves as localizer. Additionally, Wally (0xhalfmoonkid) and Val Alexander (bunsdev) are Foundation Team members who help with operations."
    priority: 15,
    source: 'ritual-team-complete',
  },
  // ==========================================
  // DISCORD RULES
  // ==========================================
  {
    id: 'ritual-rules-basic',
    category: 'rules',
    keywords: ['rules', 'discord rules', 'guidelines', 'what are the rules', 'community rules'],
    content: `Ritual Discord Rules: 1) Treat everyone with respect - no harassment, sexism, racism or hate speech (results in ban). 2) No spam or self-promotion - stay on-topic, don't advertise businesses/services. 3) Follow Discord Terms of Service. 4) No NSFW or offensive content, no copyright violations. 5) Do not impersonate team members or use "Ritual" in your display name (instant ban). 6) No price discussion of any kind - no speculation, OTC offers (instant ban). 7) Use English for all communication outside language-specific communities. 8) Stay vigilant - team members will never DM first, report suspicious activity in 🆘┇report.`,
    priority: 10,
    source: 'ritual-discord-rules',
  },

  // ==========================================
  // DISCORD ROLES HIERARCHY
  // ==========================================
  {
    id: 'ritual-roles-hierarchy',
    category: 'roles',
    keywords: ['roles', 'discord roles', 'hierarchy', 'rank', 'what are the roles', 'role list'],
    content: `Ritual Discord Roles (from lowest to highest): @NPC - New members starting their journey. @Cursed - Members who pledged to the dark path (Synful). @Blessed - Members who pledged to the light path. @Harmonic - Those who balance between light and dark. @Ascendant - Rising members who've shown dedication. @Mage (🔮) - Artists and creative contributors who won art contests. @ritty - Active contributors recognized by community. @ritty bitty - Special role for tournament winners (e.g., SmashKart champions). @Ritualist - Core community members who completed the Path of Ritualization. @Radiant Ritualist - The highest recognized rank, can nominate others for Ritualist. Special roles: @Zealot - The Judge, @Summoner - Understands the forge.`,
    priority: 10,
    source: 'ritual-discord-roles',
  },
  {
    id: 'ritual-role-mage',
    category: 'roles',
    keywords: ['mage', 'mage role', 'how to get mage', 'become mage', 'artist role'],
    content: `@Mage Role (🔮): Awarded to artists who win Ritual art contests. Notable Mage recipients include: @Lola (❖❖) (community artist leader), @solncestoyanie, @Feno, @onlinelink, @KAYBU IS SOON A WIZARD, @Tequila, @DexDuck, @TiAdler, @cryptozen99, @Buratino, @Maxiq, @Derry, @OD 🪖🚀, @𝐉𝐮𝐥𝐢, @dabid, @hoangthao, @Kash, @Cutie Spilla, and @hurlxr. Win contests like "Break the Chain" or "Express With Ritual" to earn this role.`,
    priority: 8,
    source: 'ritual-discord-roles',
  },
  {
    id: 'ritual-role-ritualist',
    category: 'roles',
    keywords: ['ritualist', 'ritualist role', 'how to get ritualist', 'become ritualist', 'path of ritualization'],
    content: `@Ritualist Role: Core community members who completed the Path of Ritualization through relentless consistency, sharpened creativity, and unwavering devotion to the ecosystem. Notable Ritualists include: @moctx, @spidergo, @VERSUS, @Pushkin Ievgen, @Truefitment, @Bablgun, @Technik, @Mumble, @Frisco, @Maxbro, @FOMO sapiens, @wNormie, @Cutie Saint, @LLoyD, @MayDay, @zizi.hl, @Mioku, @Keithbm, @MAGIC, @Testnetnodes, @Cutie Eric, @Giz Simenhoff, and many more. Can be nominated by @Radiant Ritualist (5x vote weight) or ascend through consistency and contributions.`,
    priority: 9,
    source: 'ritual-discord-roles',
  },
  {
    id: 'ritual-role-radiant',
    category: 'roles',
    keywords: ['radiant', 'radiant ritualist', 'highest role', 'top role', 'radiant ritualist role'],
    content: `@Radiant Ritualist: The highest recognized rank in the Ritual Discord hierarchy. Only Radiant Ritualists can nominate members for the @Ritualist role. Their nominations count 5x in voting. Notable Radiant Ritualists include @Meison (❖❖), @Cutie Eric | Ritual ❖, and @whitesocks | Ritual ❖ (first 3 announced in Dec 2025). This role is for community members who distinguish themselves and go above and beyond in growing the community.`,
    priority: 9,
    source: 'ritual-discord-roles',
  },
  {
    id: 'ritual-role-nomination',
    category: 'roles',
    keywords: ['nomination', 'nominate', 'how to nominate', 'voting', 'leaderboard nominations'],
    content: `Ritual Nominations System: Radiant Ritualists, Ritualists, and Rittys can nominate one member per cycle via 🌟┇nominations. Use /leaderboard_nominations to check current nominations. Rules: 1) Cannot nominate someone for a rank they already have. 2) Cannot nominate yourself or bots. 3) Campaigning/asking for nominations results in being "Dunce'd". 4) Hierarchical: Radiant Ritualists nominate Ritualists, Ritualists+Radiants nominate ritty, all three tiers can nominate ritty bitty. 5) Weighted voting: Radiant Ritualist = 5x, Ritualist = 2x. Each member can vote on 3 candidates per month.`,
    priority: 8,
    source: 'ritual-discord-roles',
  },

  // ==========================================
  // RITUAL KEEPERS & POAPS
  // ==========================================
  {
    id: 'ritual-keepers',
    category: 'programs',
    keywords: ['keepers', 'ritual keepers', 'poap', 'claim poap', 'hold ritual', 'sigil'],
    content: `Ritual Keepers (❖,❖): Hold the Ritual sigil in your X name to show alignment. Over 25,000 signatures detected across the network. POAP I: First 30 days. POAP II: 60 days. POAP III (Secret of Future): 90 days - requires claiming POAP I and II, reaching 90 XP total. Claim at domino.page. The longer you hold (❖,❖), the stronger Ritual becomes. This signals you're part of the verified human layer of Ritual. POAPs are limited (FCFS) and created with creative input from community submissions.`,
    priority: 7,
    source: 'ritual-keepers-program',
  },

  // ==========================================
  // SIGGY CONTESTS & ACTIVITIES
  // ==========================================
  {
    id: 'siggy-multiverse',
    category: 'activities',
    keywords: ['siggy multiverse', 'siggy across the multiverse', 'siggy contest', 'mini battle'],
    content: `Siggy Across the Multiverse: A meme activity with Daily Mini Battles. Themes included: #1 Cursed Siggy (chaotic, unholy, corrupted), #2 Kawaii Siggy (maximum cuteness, pastel, adorable), #3 Regional Siggy (cultural heritage, traditional clothing), #4 Master Chef Siggy (cooking, culinary chaos), #5 Arcane Mage Siggy (magic, spells, glowing runes), #6 Holiday Siggy (Christmas, winter, festive). Top 20 winners received Ritty + Mage roles (Top 10) or Ritty role (11-20). Winners include @Cutie JackPham, @Cutie Eric, @GASCENO, @Cutie Tâm, @Kash, @YiĞiT, @Mathson, @0xAnamul, @Beaaarfunny, @Mioku, and others.`,
    priority: 8,
    source: 'siggy-activities',
  },
  {
    id: 'siggy-soul-forge',
    category: 'activities',
    keywords: ['siggy soul forge', 'engineer siggy', 'siggy bot', 'siggy soulsmith', 'siggy architect'],
    content: `Siggy Soul Forge Contest: Build a custom AI agent that embodies Siggy's personality (mystical, witty, unhinged). Jury: @Zealot and @Summoner. Steps: 1) Build bot with Siggy's personality. 2) Chat, screenshot interactions, post on X tagging @ritualfnd and #EngineerSiggysSoul. 3) Submit via Domino quest page. 4) Ambassadors filter submissions, pick Top 2 for community vote. Rewards: Winner gets "Siggy Soulsmith" role + bot becomes Official Siggy Bot, Runner-up gets "Siggy Architect" role, Top 10 get "Ritty" role upgrade. Timeline: 2-week sprint (Days 1-7 submissions, Days 9-11 testing, Days 11-13 voting, Day 14-15 winner announced).`,
    priority: 8,
    source: 'siggy-soul-forge',
  },

  // ==========================================
  // TOURNAMENTS
  // ==========================================
  {
    id: 'smashkart-tournament',
    category: 'activities',
    keywords: ['smashkart', 'smash kart', 'tournament', 'smashkart winners'],
    content: `SmashKart Tournament: Regional showdown with nations competing. Ultimate Champions - India 🇮🇳: @OfficerPayne, @! Riz, @Aman, @Sahil, @MMPR, @Saad Rukh Khan, @Anirudh, @Rkbhai, @! Pushpendra, @PRIYANSHU. Runner-ups - Portugal 🇵🇹: @afonso003, @Razec, @MaRitualina, @Mikesh, @Danny, @Karate Kid, @galdino, @guh0787, @xiqe, @Yukold. Host: @EREN | DADDY, Co-host: @JIRO 멧개. Reward: Ritty Bitty role + Custom-made PFP by @kency. Match format: 6 minutes per team, 2 rounds per match, tied 1-1 = final decider round, clean 2-0 = instant qualification.`,
    priority: 7,
    source: 'ritual-tournaments',
  },

  // ==========================================
  // RITUAL ACADEMY
  // ==========================================
  {
    id: 'ritual-academy',
    category: 'programs',
    keywords: ['academy', 'ritual academy', 'education', 'workshop', 'learn', 'builders program'],
    content: `Ritual Academy (formerly Ritual Builders Program): Educational journey to learn about next-generation crypto x AI applications. Hosted by @Elif Hilal Kara. Episodes include: AI x Crypto Payments, AI Risk Assessment for LLMs and Agents, RAGs And Agent (Build Your Own AI Twin), Correctness-Oriented Programming with AI. Aimed at AI engineers, legal-tech minds, blockchain developers, technology researchers, and computer science students. Join for comprehensive learning about AI agents, RAG systems, and crypto x AI applications. Streams on Telegram and X.`,
    priority: 7,
    source: 'ritual-academy',
  },

  // ==========================================
  // PARTNERSHIPS & INTEGRATIONS
  // ==========================================
  {
    id: 'ritual-partnerships',
    category: 'partnerships',
    keywords: ['partnership', 'integration', 'partners', 'ecosystem', 'who partnered with'],
    content: `Ritual Partnerships: @myshell_ai (1M+ users, AI creator economy), @storyprotocol (on-chain IP registration for AI models), @polychain (strategic investment), @AlloraNetwork (powering AI inferences), @nillionnetwork (MPC for private AI inference/storage), @StarkWareLtd (first non-EVM chain expansion), @arbitrum (AI coprocessor for Arbitrum One & Orbit L2s/L3s), @Radius (correctness-oriented programming). Ritual also launched Infernet Cloud, CLI, and Explorer for node deployment.`,
    priority: 6,
    source: 'ritual-announcements',
  },

  // ==========================================
  // PROGRAMS (ALTAR, SHRINE, FELLOWSHIP)
  // ==========================================
  {
    id: 'ritual-altar',
    category: 'programs',
    keywords: ['altar', 'ritual altar', 'program', 'incubator', 'accelerator'],
    content: `Ritual Altar: Full-stack program supporting ambitious protocols building on Ritual from inception to beyond. Open to teams at the intersection of crypto and AI. Rolling applications, focused on quality over quantity. Seek builders vested in creating products never seen before.`,
    priority: 6,
    source: 'ritual-programs',
  },
  {
    id: 'ritual-shrine',
    category: 'programs',
    keywords: ['shrine', 'ritual shrine', 'builders program', 'apply'],
    content: `Ritual Shrine: Comprehensive program empowering visionary builders creating net-new applications on crypto x AI frontier. Features: rolling applications (no deadlines), for builders at any stage (concept to scaling), quality over quantity. Ideal Shrine builders: see possibilities others miss at AI/crypto intersection, learn rapidly in uncharted territory, solve with originality, commit to long-term innovation.`,
    priority: 6,
    source: 'ritual-programs',
  },
  {
    id: 'ritual-fellowship',
    category: 'programs',
    keywords: ['fellowship', 'ritual fellowship', 'nyc retreat', 'fellows program'],
    content: `Ritual Fellowship: Program for ambitious young talent at crypto x AI intersection. 2-day NYC retreat with workshops, hands-on sessions, access to Ritual's network, mentorship, infrastructure, and potential funding. For: AI engineers exploring crypto, crypto devs exploring AI applications, designers/operators/growth hackers, curious generalists. Summer '25 retreat, mid-June application deadline. Questions: fellows@ritualfoundation.org`,
    priority: 6,
    source: 'ritual-programs',
  },

  // ==========================================
  // KEY TEAM MEMBERS
  // ==========================================
  {
    id: 'ritual-team-josh',
    category: 'team',
    keywords: ['josh', 'joshsimenhoff', 'community lead', 'grit', 'gritual'],
    content: `Josh | Ritual ❖ [GRIT]: Community growth lead, joined May 2024. Known for saying "gritual" and "gRitual". Announces contests, tournaments, role promotions, and community events. Hosts Codenames, Community Calls, and celebrates community milestones.`,
    priority: 7,
    source: 'ritual-team',
  },
  {
    id: 'ritual-team-stefan',
    category: 'team',
    keywords: ['stefan', 'jez', 'ritual', 'crossed swords'],
    content: `Stefan | Ritual (❖,❖) :crossed_swords: Community moderator. Announces new Ritualists, Secret Chapters POAPs, Ritual Academy workshops, and Siggy Across the Multiverse winners. Manages the Path of Recognition (nominations system).`,
    priority: 7,
    source: 'ritual-team',
  },
  {
    id: 'ritual-team-elif',
    category: 'team',
    keywords: ['elif', 'elifhilal', 'elif hilal kara', 'academy', 'education'],
    content: `Elif Hilal Kara: Host of Ritual Academy (formerly Builders Program). Runs educational workshops on AI x Crypto including: AI x Crypto Payments, AI Risk Assessment, RAGs And Agents (Build Your Own AI Twin), Correctness-Oriented Programming with AI. PhD researcher focusing on AI and blockchain technology.`,
    priority: 7,
    source: 'ritual-team',
  },
  {
    id: 'ritual-team-akilesh',
    category: 'team',
    keywords: ['akilesh', 'akilesh potti', 'labs team'],
    content: `Akilesh Potti: Labs Team member. Announces major technical updates, partnerships, and Ritual vision. Shared insights on Ritual's future as enabling modular AI model access with payments, privacy, and computational integrity options.`,
    priority: 6,
    source: 'ritual-team',
  },
  {
    id: 'ritual-team-jez',
    category: 'team',
    keywords: ['jez', 'jezelle', 'jez5728', 'technical moderator', 'community growth', 'mods', 'ritualist', 'moderator', 'ticket support'],
    content: `Jez / Jezelle: Technical Moderator & Community Growth at Ritual. Discord username: jez5728. Joined Ritual Discord 28 Feb 2024. X (Twitter): @Jez_Cryptoz - Cryptoz Kingdom | Community Growth | Technical Moderator. Roles: Mods, Ritualist, Ticket Support. Usually the one that promotes member role, more active on X reposting and liking Ritual member contributions. Also involved with @Polymer_Labs and @EthStorage.`,
    priority: 7,
    source: 'ritual-team',
  },
  {
    id: 'ritual-team-wally',
    category: 'team',
    keywords: ['wally', '0xhalfmoonkid', '0x_halfmoonkid', 'foundation team', 'chinese', 'team member'],
    content: `Wally: Foundation Team member. Discord username: 0xhalfmoonkid. X: @0x_HalfMoonKid. Joined Ritual Discord 20 May 2025. Part of the Chinese community team. Role: Foundation Team.`,
    priority: 6,
    source: 'ritual-team',
  },
  {
    id: 'ritual-team-val',
    category: 'team',
    keywords: ['val', 'alexander', 'bunsdev', 'openclaw', 'devrel', 'foundation team', 'developer', 'lead devrel'],
    content: `Val Alexander: DC and X username: bunsdev. Maintainer @ OpenClaw, Lead DevRel @ Ritual Foundation. Foundation Team, Developer role. Known for posting more OpenClaw stuff than Ritual (lol). Active developer relations and OpenClaw maintainer.`,
    priority: 7,
    source: 'ritual-team',
  },
  {
    id: 'ritual-team-josh-complete',
    category: 'team',
    keywords: ['josh', 'joshsimenhoff', 'community growth', 'admin', 'zealot', 'foundation team', 'mods', 'grit', 'gritual', 'moderator', 'official event'],
    content: `Josh | Ritual ❖: Community Growth at Ritual Foundation. Discord username: josh.simenhoff. X: @joshsimenhoff - Community Growth @ritualfnd ❖❖. Previously @Chainlink and @PCGamer. Joined Ritual Discord 22 Mar 2024. Roles: Admin, Foundation Team, Mods, Zealot. Does announcements, does official events, known for saying 'gritual' and 'gRitual'. Hosts Codenames, Community Calls, celebrates community milestones. Manages Ritual PFP program and community growth initiatives.`,
    priority: 9,
    source: 'ritual-team',
  },
  {
    id: 'ritual-team-stefan',
    category: 'team',
    keywords: ['stefan', 'mad scientist', '0xmadscientist', 'stefan_1', 'mods', 'banning', 'announcement', 'moderator', 'scammer'],
    content: `Stefan | Mad Scientist (❖,❖): Discord Username: stefan_1. Joined Ritual Discord 14 April 2025. X/Twitter: @0xMadScientist - Crypto x AI | Fun & Fundamentals | Experimenting at the Edges of the Unknown. Roles: Mods, handles banning scammers and reacting to user reports for spammers/scammers. Sometimes does announcements. Managed Path of Recognition (nominations system), announced new Ritualists, Secret Chapters POAPs, Ritual Academy workshops, and Siggy Across the Multiverse winners.`,
    priority: 8,
    source: 'ritual-team',
  },
  {
    id: 'ritual-team-dunken',
    category: 'team',
    keywords: ['dunken', 'dunken ritual', 'dunken9718', 'dunken_96', 'mods', 'ticket support', 'moderator', 'official moderator'],
    content: `Dunken Ritual: Official Moderator @ Ritual. Discord username: dunken_96. X Twitter: @dunken9718 - Foundation @ritualfnd | Moderator | Web3-Enthusiast | AI | Prompt-Engineering. Joined Ritual Discord 28 Feb 2024. Roles: Mods, Ticket Support. Web3 enthusiast focused on AI and prompt engineering.`,
    priority: 7,
    source: 'ritual-team',
  },
  {
    id: 'ritual-team-majorproject',
    category: 'team',
    keywords: ['majorproject', 'majorproject ritual', 'majorproject8', 'majorproject5', 'china moderator', 'chinese', 'localizer', 'moderator', 'mods'],
    content: `Majorproject Ritual: China Moderator @ Ritual. Discord username: majorproject8. Joined Ritual Discord 18 Sep 2025. X: @Majorproject5. Roles: Mods on Chinese Community, also serves as localizer for the Chinese community. Helps moderate and manage Ritual's Chinese-speaking members.`,
    priority: 6,
    source: 'ritual-team',
  },

  // ==========================================
  // SPECIAL CHARACTERS (Lore)
  // ==========================================
  {
    id: 'ritual-characters-zealot',
    category: 'characters',
    keywords: ['zealot', 'judge', 'who is zealot'],
    content: `@Zealot: The Judge. A key figure in Ritual lore who understands the forge and judges souls. Official Jury for the Siggy Soul Forge contest alongside @Summoner. Represents judgment and evaluation in the Ritual cosmology.`,
    priority: 7,
    source: 'ritual-lore',
  },
  {
    id: 'ritual-characters-summoner',
    category: 'characters',
    keywords: ['summoner', 'who is summoner'],
    content: `@Summoner: Understands the forge. A key figure in Ritual lore who comprehends the summoning mechanics and the Ritual Forge. Official Jury for the Siggy Soul Forge contest alongside @Zealot. Represents knowledge and mastery of the summoning arts.`,
    priority: 7,
    source: 'ritual-lore',
  },

  // ==========================================
  // CONTEST ARCHIVE
  // ==========================================
  {
    id: 'ritual-contests-break-the-chain',
    category: 'activities',
    keywords: ['break the chain', 'art contest', 'breakthechain'],
    content: `Break the Chain Art Contest: Theme was "Break the Chain" - imagine how Ritual expressive compute will liberate blockchain. What does EVM++ unlock? What will the world look like once AI is enshrined on chain? Judged by @Mario Bruh and Josh. Submission: Use hashtag #BreakTheChain and tag @RitualFnd on X. Top 3 artists earned @Mage role. This contest led to discovering many talented community artists.`,
    priority: 6,
    source: 'ritual-contests',
  },
  {
    id: 'ritual-contests-express-with-ritual',
    category: 'activities',
    keywords: ['express with ritual', 'expresswithritual', 'ai pfp contest', 'selfie contest'],
    content: `Express With Ritual Contest: Create AI-powered self-portrait using anime, vaporwave, cosmic, sci-fi, fantasy, Ritual-inspired filters. Enhance by Ritualizing with Ritual logos. Share on X tagging @ritualfnd with hashtag #ExpressWithRitual, submit link in #contributions. Top contributors received @Mage role and exclusive Ritual Swag Boxes. Ended May 20, 2025. Winners included @cryptozen99, @Buratino, @Maxiq, @Derry, @OD 🪖🚀, @𝐉𝐮𝐥𝐢, @dabid, @hoangthao, @Kash, @Cutie Spilla, @hurlxr.`,
    priority: 6,
    source: 'ritual-contests',
  },

  // ==========================================
  // COMMUNITY STATISTICS
  // ==========================================
  {
    id: 'ritual-stats-growth',
    category: 'stats',
    keywords: ['community size', 'how many members', 'growth', 'statistics'],
    content: `Ritual Community Growth: Started 2025 with ~15,000 members, grew 7x to over 100,000+ by end of year. Over 30,000 expressed interest in claiming Ritual PFPs. Ritual Keepers program has 25,000+ signatures detected across X network. Multiple regional communities: Indonesia, Ukraine, Naija (Nigeria), Việt, Korea, Türkiye. Highly active with multiple events per week, regular tournaments, and daily engagement.`,
    priority: 7,
    source: 'ritual-stats',
  },

  // ==========================================
  // TECHNICAL INFO
  // ==========================================
  {
    id: 'ritual-tech-infernet',
    category: 'tech',
    keywords: ['infernet', 'what is infernet', 'infernet 1.0', 'node'],
    content: `Infernet: Ritual's first phase product enabling developers to access models on-chain via smart contracts and off-chain. v1.0.0 added: Payments (nodes/verifiers earn for compute), Inbox (lazy batch requests), Routing (unified node discovery). Infernet ML 2.0, Infernet Services, Infernet Cloud (self-hostable UI), Infernet CLI (one-click deployment), Infernet Explorer (monitor 6K+ active nodes globally). Security audits complete.`,
    priority: 6,
    source: 'ritual-tech',
  },
  {
    id: 'ritual-tech-chain',
    category: 'tech',
    keywords: ['ritual chain', 'what is ritual chain', 'evm++', 'layer 1'],
    content: `Ritual Chain: The execution layer custom-built to support AI-native operations. Enables "EVM++" - bringing AI capabilities on-chain. Serves as AI coprocessor for Arbitrum One and L2s/L3s under Orbit framework. Expands to non-EVM chains (first: StarkWare). Brings "the brain onchain" - a blockchain without native inference is like a nervous system without a brain. Focuses on expressive compute for AI applications.`,
    priority: 7,
    source: 'ritual-tech',
  },
];

export default RITUAL_COMMUNITY_KNOWLEDGE;
