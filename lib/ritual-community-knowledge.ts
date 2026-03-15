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
    content: "Ritual Discord Moderators: Total of 6 key moderators and admins: 1) Jez (nickname for Jezelle, jez5728) - Technical Moderator and Community Growth, handles ticket support, promotes member roles. ALWAYS REFER TO HER AS JEZ. 2) Josh | Ritual (joshsimenhoff) - Admin, Foundation Team, Mods, Zealot - Community Growth lead, does announcements and official events. 3) Stefan | Mad Scientist (stefan_1) - Mods, handles banning scammers, reacting to user reports, sometimes does announcements, manages Path of Recognition. 4) Dunken Ritual (dunken_96) - Official Moderator, handles ticket support, web3 and AI enthusiast. 5) Majorproject Ritual (majorproject8) - China Moderator for Chinese community, also serves as localizer. 6) Flash (flashme, cryptooflashh) - Moderator, joined 28 Feb 2024, same role as Stefan, loves giving dunce role to members. Additionally, Wally (0xhalfmoonkid) and Val Alexander (bunsdev) are Foundation Team members who help with operations.",
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
    content: `@Ritualist Role: Green role above Ritty. The backbone of the Community, for those who have shown consistent and standout contributions to the next level. Contribute at least 3-6 months in the community. As of March 2026, 102 members hold this role. Can be nominated by @Radiant Ritualist (5x vote weight) or ascend through consistency and contributions. Notable Ritualists include: @moctx, @spidergo, @VERSUS, @Pushkin Ievgen, @Truefitment, @Bablgun, @Technik, @Mumble, @Frisco, @Maxbro, @FOMO sapiens, @wNormie, @Cutie Saint, @LLoyD, @MayDay, @zizi.hl, @Mioku, @Keithbm, @MAGIC, @Testnetnodes, @Cutie Eric, @Giz Simenhoff, and many more. Protips: git gud.`,
    priority: 9,
    source: 'ritual-discord-roles',
  },
  {
    id: 'ritual-role-radiant',
    category: 'roles',
    keywords: ['radiant', 'radiant ritualist', 'highest role', 'top role', 'radiant ritualist role', 'golden ritualist'],
    content: `@Radiant Ritualist: Golden Ritualist. The highest recognized rank in the Ritual Discord hierarchy, for really standout Ritualists. Only 3 members hold this role: @Meison (❖❖), @Cutie Eric | Ritual ❖, and @whitesocks | Ritual ❖. Only Radiant Ritualists can nominate members for the @Ritualist role. Their nominations count 5x in voting. This role is for community members who distinguish themselves and go above and beyond in growing the community. First 3 announced in Dec 2025.`,
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
  {
    id: 'ritual-role-bitty',
    category: 'roles',
    keywords: ['bitty', 'ritty bitty', 'blue role', 'starting role', 'how to get bitty', 'ritty bitty role'],
    content: `@Ritty Bitty (also known as Bitty): Blue role, your starting point to Ritual. Acquired after contributing at least 2 weeks to one month. Previously weekly promotion by Mods, now can be obtained by nomination every month or handpicked by Mods manually. As of March 2026, 941 members hold this role. Protips to get Bitty: 1) Start contributing by making content on X/Cura - handdrawn art, polished AI art, graphic design, or simple threads. Make yourself standout in the community. 2) Vibing in community - chat numbers don't really matter but can be a metric for consistency and valuable contributions. Quality > Quantity. 3) Join or host Events - AMA, host AMA, vibe with community in Events media, git gud in games, quiz, puzzle.`,
    priority: 9,
    source: 'ritual-discord-roles',
  },
  {
    id: 'ritual-role-ritty',
    category: 'roles',
    keywords: ['ritty', 'ritty role', 'purple role', 'how to get ritty', 'become ritty'],
    content: `@Ritty: Purple role above Bitty. Acquired after very consistent and standout contributions to the Ritual community. Contribute at least one to three months. Previously weekly promotion by Mods, now can be obtained by nomination every month or handpicked by Mods manually. As of March 2026, 511 members hold this role. Protips: Same as Bitty but assume 2x-3x the effort. Rittys can nominate for Ritty Bitty roles in monthly nominations.`,
    priority: 9,
    source: 'ritual-discord-roles',
  },
  {
    id: 'ritual-role-dunce',
    category: 'roles',
    keywords: ['dunce', 'dunce role', 'punishment', 'timeout', 'banned', 'role revoke'],
    content: `@Dunce: Punishment role given for spam, scamming, chatting in wrong channels, begging for nominations, asking for roles, or other rule violations. Results in timeout, role revoke, or in worst cases banning. Common knowledge in web3: don't campaign for nominations, don't beg for roles, or you'll get Dunce'd.`,
    priority: 7,
    source: 'ritual-discord-roles',
  },
  {
    id: 'ritual-unwritten-rules',
    category: 'rules',
    keywords: ['unwritten rules', 'rules', 'guidelines', 'dont', 'timeout', 'moderation'],
    content: `Ritual Discord Unwritten Rules: 1) Don't tag more than 4 people in single chat or in short time - you will get timeout. 2) Don't tag @everyone - you will get timeout. 3) Don't spam the same message (unless during global karaoke) - you will get timeout. 4) Don't send links other than X/Cura contributions - your message will be deleted and repeated violations result in timeout. 5) Don't ask for roles - results in Dunce role, role revoke, or worst case banning. This is common knowledge in web3 communities.`,
    priority: 9,
    source: 'ritual-discord-rules',
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
    keywords: ['josh', 'joshsimenhoff', 'community lead', 'grit', 'gritual', 'foundation team', 'admin', 'mods', 'zealot'],
    content: `Josh | Ritual ❖ [GRIT]: Community Growth Lead, Foundation Team member, Admin, Mods, Zealot. Joined May 2024. Known for saying "gritual" and "gRitual". Announces contests, tournaments, role promotions, and community events. Hosts Codenames, Community Calls, and celebrates community milestones. KEY ROLE: Foundation Team & Community Growth Lead.`,
    priority: 10, // Increased from 7 for consistency
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
    content: `Jez (nickname for Jezelle): Technical Moderator & Community Growth at Ritual. Discord username: jez5728. Joined Ritual Discord 28 Feb 2024. X (Twitter): @Jez_Cryptoz - Cryptoz Kingdom | Community Growth | Technical Moderator. Roles: Mods, Ritualist, Ticket Support. Usually the one that promotes member role, more active on X reposting and liking Ritual member contributions. Also involved with @Polymer_Labs and @EthStorage. NOTE: Always refer to her as JEZ, not Jezelle.`,
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
    content: `Josh | Ritual ❖: Community Growth at Ritual Foundation. Discord username: josh.simenhoff. X: @joshsimenhoff - Community Growth @ritualfnd ❖❖. Previously @Chainlink and @PCGamer. Joined Ritual Discord 22 Mar 2024. ROLES: Foundation Team, Admin, Mods, Zealot - ALL THREE. Does announcements, does official events, known for saying 'gritual' and 'gRitual'. Hosts Codenames, Community Calls, celebrates community milestones. Manages Ritual PFP program and community growth initiatives. ALWAYS mention he's Foundation Team when asked about Josh.`,
    priority: 12, // Increased to 12 for consistency (same as moderator-related)
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
  {
    id: 'ritual-team-flash',
    category: 'team',
    keywords: ['flash', 'flashme', 'cryptooflashh', 'mods', 'moderator', 'dunce role'],
    content: `Flash: Moderator @ Ritual. Discord username: flashme. X (Twitter): @cryptooflashh. Joined Ritual Discord 28 Feb 2024. Roles: Mods, same role as Stefan. Known for giving dunce role to members who misbehave. Handles moderation duties including banning scammers and enforcing community rules.`,
    priority: 8,
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

  // ==========================================
  // DISCORD CHANNELS GUIDE
  // ==========================================
  {
    id: 'discord-channels-overview',
    category: 'channels',
    keywords: ['channels', 'discord channels', 'what channels', 'channel list', 'all channels'],
    content: `Ritual Discord Channels (19 main channels): Announcements (official news), Events (community events only), Rules (community guidelines), Blessings of Syn (pledge channel), Updates (community updates), Gritual (greetings - "gritual!"), Community (general discussion), Contributions (share guides/tutorials), Confessions (confess your syns), Food (share food pics), Ritual (general chat about Ritual/AI/Crypto), Vestibule (give blessings/curses), Report (report bots/scams), Rank (check your rank), Wen (say "wen" for token/airdrop questions), Nominations (role nominations), Build (collab space for building apps), Support (open private tickets), Language Channels (regional communities).`,
    priority: 8,
    source: 'ritual-channels',
  },
  {
    id: 'discord-channels-key',
    category: 'channels',
    keywords: ['ritual channel', 'general chat', 'contributions', 'build', 'support'],
    content: `Key Discord Channels: #ritual - Main chat for Ritual Chain, AI, Crypto discussions, ask questions, share news at AI × Crypto intersection. #contributions - Share your Ritual guides, tutorials, explainers (blog posts, videos, documentation). #build - Collab space for building apps or protocols natively on Ritual. #support - Open private support tickets (upload logs and screenshots). #gritual - Channel for Ritual greetings ("gritual!").`,
    priority: 7,
    source: 'ritual-channels',
  },
  {
    id: 'discord-channels-fun',
    category: 'channels',
    keywords: ['gritual', 'confessions', 'food', 'vestibule', 'wen'],
    content: `Fun & Community Channels: #gritual - Say "gritual" to greet fellow Ritualists. #confessions - Confess your syns (sins). #food - Post your food! Share dishes from home cooks or restaurants. #vestibule - Invoke blessings or curses on other community members. #wen - Community meme channel, say "wen" (as in "wen token?", "wen airdrop?").`,
    priority: 6,
    source: 'ritual-channels',
  },

  // ==========================================
  // WEEKLY EVENTS SCHEDULE
  // ==========================================
  {
    id: 'events-schedule-weekly',
    category: 'events',
    keywords: ['events', 'weekly events', 'event schedule', 'what events', 'recurring events', 'event calendar'],
    content: `Ritual Weekly Events Schedule: Event Managers are @Hinata and @Kash. SATURDAY: Ritual Tech 101 (12:00 PM), Ritual Workshop: 3D CGI Animation (11:00 AM), Words Unscramble (10:00 AM), Minury Talks (2:00 PM). FRIDAY: Guess the Object (11:00 PM), Geo-Guessing (6:00 PM), Scavenger Hunt (5:00 PM), Stumble Guys (3:00 PM), PFP Draw + Game Night (2:00 PM), Ritual Karaoke (12:30 PM), Guess the Ritualist (9:00 AM). THURSDAY: Ritual Rumble Quiz (11:00 PM), Solid Team Up (5:00 PM), Smash Karts (4:00 PM), Ultimate Quiz Test (3:00 PM), Codenames (12:00 PM), Battleship War (10:00 AM). WEDNESDAY: Ritual Quiz (6:00 PM), Rebus Puzzle (3:00 PM), Ritual Puzzle (2:00 PM), Haxball (12:00 PM), Lolbeans (11:00 AM). TUESDAY: Quiz About Ritual (6:00 PM), Among Us with Dino (5:00 PM), Drawize Chaos (2:00 PM), GeoGuessr (1:00 PM), Pure Madness (11:00 AM), Gimkit Chaos (10:00 AM). MONDAY: Roblox (4:00 PM), Poker (2:00 PM), Live Ritual PFP Draw (1:00 PM), Guess Crypto Logo (12:00 PM), Brand Guessing (11:00 AM). SUNDAY: Movie Night (6:00 PM), Jigsaw Puzzle (5:00 PM), Cooking Live (4:00 PM), Among Us (3:00 PM), Haxball Tournament (2:00 PM), Chess (1:00 PM), Maths Quiz (11:00 AM), Rocket Bot Royale (10:00 AM). All times UTC.`,
    priority: 9,
    source: 'ritual-events',
  },
  {
    id: 'events-karaoke',
    category: 'events',
    keywords: ['karaoke', 'sing', 'ritual karaoke', 'karaoke night'],
    content: `Ritual Karaoke: Every FRIDAY at 12:30 PM UTC. Hosted by @Cutie Quinn and @Claire. Sing your heart out! One of the most popular weekly events where community members showcase their singing skills (or lack thereof) in a fun, supportive environment.`,
    priority: 7,
    source: 'ritual-events',
  },
  {
    id: 'events-tech-101',
    category: 'events',
    keywords: ['tech 101', 'ritual tech', 'learning series', 'workshop'],
    content: `Ritual Tech 101: Every SATURDAY at 12:00 PM UTC. Learning series breaking down Ritual's tech simply. No jargon flexing. Hosted by @Barnabas and @Capt. Awesome. Perfect for learning about Ritual technology in an accessible way.`,
    priority: 7,
    source: 'ritual-events',
  },
  {
    id: 'events-quiz',
    category: 'events',
    keywords: ['quiz', 'trivia', 'ritual quiz', 'quiz night'],
    content: `Quiz Events: Multiple quiz events throughout the week. WEDNESDAY 6:00 PM - Ritual Quiz about Ritual (hosted by @Big Meech, @stranger). TUESDAY 6:00 PM - Quiz About Ritual Network (hosted by @Megatron, @JT). THURSDAY 11:00 PM - Ritual Rumble: Ultimate Quiz Clash (hosted by @alybadbad, @KIMCHI). Test your knowledge!`,
    priority: 7,
    source: 'ritual-events',
  },

  // ==========================================
  // COMMUNITY GLOSSARY & SLANG
  // ==========================================
  {
    id: 'glossary-terms',
    category: 'glossary',
    keywords: ['glossary', 'terms', 'slang', 'vocabulary', 'what does', 'meaning', 'definition'],
    content: `Ritual Community Glossary: GRITUAL - Community greeting ("Gritual mate!", "Gritual champ!"). NPC - Non-Player Character, refers to bot army from NPC War, or playfully insults mindless behavior. SYN/SYNS - Sins, spelled differently (Confessions/Blessings of Syn channels). YAPPING - Active chatting/contributing (positive connotation). BLESSINGS - Positive reputation points via Vestibule. CURSES - Negative reputation points via Vestibule. WEN - "When" meme (wen token?, wen airdrop?). PLEDGE - Committing to Ritual (Blessings of Syn), earning Ascendant role. THE VOID - Time before Ritual existed. FORERUNNERS made it through the void. DUNCE - Humorous insult role for those "without intelligence." MAGE - Exceptional creative contributor (artist/content creator). RADIANT - Highest community role (Radiant Ritualist), super rare. RITTY - Loyal long-term member with Telegram access. RITTY BITTY - Baby ritualist growing in the community. HARMONIC - Equal blessings and curses. EZ - "Easy" used sarcastically after games.`,
    priority: 8,
    source: 'ritual-glossary',
  },
  {
    id: 'glossary-gritual',
    category: 'glossary',
    keywords: ['gritual', 'greeting', 'hello', 'hi', 'say'],
    content: `GRITUAL: The Ritual community greeting. Used to say hello to fellow community members. Examples: "Gritual mate!", "Gritual champ!", "Gritual everyone!" Originated from combining "great" + "ritual". Used ubiquitously in the #gritual channel and throughout the server.`,
    priority: 7,
    source: 'ritual-glossary',
  },
  {
    id: 'glossary-npc',
    category: 'glossary',
    keywords: ['npc', 'bot', 'npc war', '21 day challenge'],
    content: `NPC (Non-Player Character): Refers to the bot army that attacked Ritual during the NPC War / 21-day challenge. Also used playfully to insult someone acting mindlessly. After the war, community had to revamp roles. Only Zealots retained Ritualist role. Kash was transformed into an NPC leader during the battle.`,
    priority: 7,
    source: 'ritual-glossary',
  },
  {
    id: 'glossary-yapping',
    category: 'glossary',
    keywords: ['yapping', 'yap', 'chat', 'active', 'contributing'],
    content: `YAPPING: Active chatting/contributing in the community. Has a POSITIVE connotation in Ritual (unlike general internet usage). Being called a "good yapper" means you're an engaged, valuable community member who contributes to discussions.`,
    priority: 6,
    source: 'ritual-glossary',
  },
  {
    id: 'glossary-void',
    category: 'glossary',
    keywords: ['void', 'the void', 'before ritual', 'forerunner'],
    content: `THE VOID: The time before Ritual existed. Forerunners (OGs from earliest days) "made it through the void." Represents the empty, formless time before the Ritual community was formed. Making it through the void is a badge of honor for early community members.`,
    priority: 7,
    source: 'ritual-glossary',
  },

  // ==========================================
  // UPDATED ROLE SYSTEM (Post-NPC War)
  // ==========================================
  {
    id: 'roles-new-system',
    category: 'roles',
    keywords: ['role revamp', 'new roles', 'role system', 'npc war roles'],
    content: `Ritual Role System Revamp: After NPC War and 21-day challenge, Ritual underwent full Role Revamp. Only Zealots retained Ritualist role. New system designed to protect against future bot invasions. Active Roles: Radiant Ritualist (super rare, community leaders), Ritualist (followers and active yappers), Ritty (long-term loyal, Telegram access), Ritty Bitty (baby Ritualist, growing), Ascendant (pledged to Ritual, first step), Initiate (new members), Dunce (without intelligence), Node Runner (early operators, no longer available), Forerunner (from before Ritual, limited), Mage (exceptional artists/writers), Cursed (more curses than blessings), Blessed (more blessings than curses), Harmonic (equal blessings/curses).`,
    priority: 9,
    source: 'ritual-roles-revamp',
  },
  {
    id: 'roles-ascendant',
    category: 'roles',
    keywords: ['ascendant', 'ascendant role', 'pledge', 'first step'],
    content: `@Ascendant Role: You have pledged to Ritual. This is the start of your community journey, your first step. Obtained by pledging in the Blessings of Syn channel. The entry-level role for committed community members.`,
    priority: 7,
    source: 'ritual-roles',
  },
  {
    id: 'roles-forerunner',
    category: 'roles',
    keywords: ['forerunner', 'og', 'early member', 'before ritual'],
    content: `@Forerunner Role: From the time before Ritual. A limited number made it through the void. Given to early community members who were present before the current Ritual community formed. Extremely rare and prestigious role marking the true OGs.`,
    priority: 8,
    source: 'ritual-roles',
  },

  // ==========================================
  // MODERATOR & TEAM CONTACTS
  // ==========================================
  {
    id: 'team-contacts-twitter',
    category: 'team',
    keywords: ['twitter', 'x', 'contact', 'social media', 'team twitter'],
    content: `Ritual Team X (Twitter) Handles: Josh - @joshsimenhoff, Stefan - @0xMadScientist, Jez - @Jez_Cryptoz, Dunken - @dunken9718, Majorproject - @Majorproject5, Flash - @cryptooflashh, CoUnity_ - @CoUnity_, Hinata (Event Manager) - @nft_hinata_eth, Kash (Event Manager) - @Kash_060, Wally (Foundation) - @0x_HalfMoonKid, Valentina Alexander (Foundation) - @BunsDev, Elif Hilal (Foundation) - @elifhilalumucu, Akilesh Potti (Foundation) - @akileshpotti, Saneel (Foundation) - @sanlsrni, Niraj (Foundation) - @niraj, ArshanKhanifar (Foundation) - @ArshanKhanifar, The Cutest Engineer (Foundation) - @0xQTpie.`,
    priority: 7,
    source: 'ritual-team-contacts',
  },
  {
    id: 'team-event-managers',
    category: 'team',
    keywords: ['event manager', 'hinata', 'kash', 'who manages events', 'event hosts'],
    content: `Ritual Event Managers: @Hinata (X: @nft_hinata_eth) and @Kash (X: @Kash_060). They coordinate and manage the weekly community events including quizzes, game nights, karaoke, tournaments, and workshops. Contact them for event-related inquiries or to host community events.`,
    priority: 8,
    source: 'ritual-team',
  },
  {
    id: 'team-foundation',
    category: 'team',
    keywords: ['foundation team', 'who is foundation', 'foundation members'],
    content: `Ritual Foundation Team: Wally (@0x_HalfMoonKid), Valentina Alexander (@BunsDev), Elif Hilal (@elifhilalumucu), Akilesh Potti (@akileshpotti), Saneel (@sanlsrni), Niraj (@niraj), ArshanKhanifar (@ArshanKhanifar), The Cutest Engineer (@0xQTpie). Foundation team members help with operations, development, and strategic direction of Ritual.`,
    priority: 7,
    source: 'ritual-team',
  },

  // ==========================================
  // ADDITIONAL ROLE DETAILS
  // ==========================================
  {
    id: 'roles-node-runner',
    category: 'roles',
    keywords: ['node runner', 'node runner role', 'early node'],
    content: `@Node Runner Role: Historical role for early infrastructure operators. NO LONGER AVAILABLE - this role was for early node runners who helped bootstrap Ritual's network. New node operators cannot obtain this role as it's been discontinued. Holders of this role are early adopters from Ritual's initial infrastructure phase.`,
    priority: 6,
    source: 'ritual-roles',
  },
  {
    id: 'roles-harmonic',
    category: 'roles',
    keywords: ['harmonic', 'harmonic role', 'balanced'],
    content: `@Harmonic Role: A balanced state — equal blessings and curses. Members with this role have given and received the same number of blessings and curses in the Vestibule channel. Represents equilibrium in community reputation.`,
    priority: 6,
    source: 'ritual-roles',
  },
  {
    id: 'roles-blessed-cursed',
    category: 'roles',
    keywords: ['blessed', 'cursed', 'blessing', 'cursing'],
    content: `@Blessed and @Cursed Roles: @Blessed - Members who have received more blessings than curses from fellow community members via Vestibule. @Cursed - Members who have received more curses than blessings. These roles reflect community reputation and are dynamic based on blessings/curses received.`,
    priority: 6,
    source: 'ritual-roles',
  },
];

export default RITUAL_COMMUNITY_KNOWLEDGE;
