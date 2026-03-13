/**
 * RITUAL KNOWLEDGE BASE
 * Compiled from ALL Ritual URLs provided by user
 */

import type { KnowledgeEntry } from './siggy-knowledge';

export const RITUAL_WEB_KNOWLEDGE: KnowledgeEntry[] = [
  // ==========================================
  // RITUAL.NET - ABOUT
  // ==========================================
  {
    id: 'ritual-about',
    category: 'about',
    keywords: ['ritual', 'about', 'what is', 'ai', 'infrastructure', 'flawed', 'centralized'],
    content: "The state of AI is flawed. AI has capacity to positively impact humanity but the infrastructure is flawed. Permissioned and centralized APIs, lack of privacy and computational integrity, lack of censorship resistance all risk the potential AI can unleash. Ritual is the solution - the network for open AI infrastructure. Ritual builds groundbreaking new architecture on a crowdsourced governance layer for safety, funding, alignment, and model evolution. Features: Censorship Resistant (transcend geographic boundaries), Privacy First (lightweight statistical and cryptographic schemes), Fully Verifiable (guaranteed results from real models with proofs for unbounded model sizes).",
    priority: 10,
    source: 'https://ritual.net/about',
  },
  {
    id: 'ritual-sdk',
    category: 'about',
    keywords: ['sdk', 'developer', 'build', 'code', 'integration'],
    content: "Ritual SDK is the easiest, fastest, and most reliable way to use AI in decentralized apps. Example: Ritual.useInference({ model: [\"LLAMA2-30B\", \"Mistral-7b\"], parameters: [...] }). Built for seamless developer experience.",
    priority: 7,
    source: 'https://ritual.net/about',
  },

  // ==========================================
  // RITUAL VISUALIZED - ARCHITECTURE
  // ==========================================
  {
    id: 'ritual-evm',
    category: 'architecture',
    keywords: ['evm', 'evm++', 'blockchain', 'smart contract', 'expressive', 'compute'],
    content: "EVM++ is a backwards-compatible extension of the EVM with expressive compute precompiles to build actually smart contracts. Features: native scheduling, in-built account abstraction, most wanted EIPs, heterogeneous compute including AI inference, ZK proof verification, TEE code execution.",
    priority: 10,
    source: 'https://ritualvisualized.com/',
  },
  {
    id: 'ritual-precompiles',
    category: 'architecture',
    keywords: ['precompile', 'compute', 'heterogeneous', 'execution', 'sidecar'],
    content: "Precompiles are EIP extensions and optimized execution sidecars that supercharge developer experience. Use any type of heterogeneous compute including AI inference, ZK proof verification, TEE code execution in one-click.",
    priority: 8,
    source: 'https://ritualvisualized.com/',
  },
  {
    id: 'ritual-scheduling',
    category: 'architecture',
    keywords: ['schedule', 'transaction', 'recurring', 'conditional', 'keeper'],
    content: "Scheduled transactions enable recurring, conditional invocation of smart contract functions at the top of a block without external keepers. Native scheduling built into EVM++.",
    priority: 7,
    source: 'https://ritualvisualized.com/',
  },
  {
    id: 'ritual-modular-primitives',
    category: 'architecture',
    keywords: ['modular', 'primitive', 'provenance', 'privacy', 'integrity'],
    content: "Modular Primitives: Every application needs different guarantees. Ritual provides special-purpose primitives across provenance, privacy, and computational integrity out of the box.",
    priority: 7,
    source: 'https://ritualvisualized.com/',
  },
  {
    id: 'ritual-infernet',
    category: 'architecture',
    keywords: ['infernet', 'oracle', 'network', 'decentralized', 'nodes', '8000'],
    content: "Infernet is the first decentralized oracle network purpose-built for heterogeneous workloads. Acts as connective tissue between Web3 ecosystem and Ritual Chain. With 8,000+ connected Infernet nodes, anyone can tap into transparent AI with strong privacy and verifiability guardrails. Alternative to centralized APIs that geo-restrict and censor.",
    priority: 10,
    source: 'https://ritualvisualized.com/',
  },
  {
    id: 'ritual-resonance',
    category: 'architecture',
    keywords: ['resonance', 'fee', 'market', 'mechanism', 'heterogeneous'],
    content: "Resonance is a new state-of-the-art fee market mechanism for heterogeneous computation on-chain. Efficiently matches supply and demand for compute.",
    priority: 6,
    source: 'https://ritualvisualized.com/',
  },
  {
    id: 'ritual-vtune',
    category: 'architecture',
    keywords: ['vtune', 'llm', 'fine-tune', 'watermark', 'zk', 'provenance'],
    content: "vTune is a dual provenance and computational integrity gadget for fine-tuning LLMs powered by watermarking and ZK proofs.",
    priority: 6,
    source: 'https://ritualvisualized.com/',
  },
  {
    id: 'ritual-symphony',
    category: 'architecture',
    keywords: ['symphony', 'consensus', 'protocol', 'sharding', 'verification'],
    content: "Symphony is a new consensus protocol leveraging dual proof sharding, distributed verification, and optimal sampling to reduce replicated execution and enable high-performance resource-intensive workloads.",
    priority: 7,
    source: 'https://ritualvisualized.com/',
  },
  {
    id: 'ritual-provers',
    category: 'architecture',
    keywords: ['prover', 'proof', 'system', 'l2', 'zkml', 'coprocessor'],
    content: "Proof systems are heterogeneous across resource consumption, guarantees, and cost. Resonance and Symphony enable drop-in decentralization and real-time optimization for L2s, ZKML coprocessors, and other proof-backed networks.",
    priority: 7,
    source: 'https://ritualvisualized.com/',
  },
  {
    id: 'ritual-raas',
    category: 'architecture',
    keywords: ['raas', 'rollup', 'hyperscale', 'customization', 'service'],
    content: "RaaS (Rollup-as-a-Service): Hyperscale rollup customization with day-0 support for custom precompiles, built-in fee mechanism, EVM++ extensions, and optimized re-execution.",
    priority: 7,
    source: 'https://ritualvisualized.com/',
  },
  {
    id: 'ritual-model-marketplace',
    category: 'architecture',
    keywords: ['marketplace', 'model', 'trade', 'train', 'provenance', 'ip'],
    content: "Model Marketplace: Track, train, and trade AI models with on-chain provenance, model authenticity, and enshrined IP primitives.",
    priority: 7,
    source: 'https://ritualvisualized.com/',
  },

  // ==========================================
  // DOCS - WHAT IS RITUAL
  // ==========================================
  {
    id: 'ritual-expressive-blockchain',
    category: 'docs',
    keywords: ['expressive', 'blockchain', 'users', 'tomorrow', 'enrich'],
    content: "Ritual is the most expressive blockchain in existence with single focus: enrich what users can do on-chain today to attract the users of tomorrow. Bitcoin enabled money transfer. Ethereum introduced smart contracts. Ritual makes smart contracts actually smart with native AI, ZK, and TEE access.",
    priority: 10,
    source: 'https://www.ritualfoundation.org/docs/overview/what-is-ritual',
  },
  {
    id: 'ritual-crypto-x-ai',
    category: 'docs',
    keywords: ['crypto', 'ai', 'intersection', 'why', 'need'],
    content: "Crypto x AI: It has never been easier to build with AI, and never more important to ensure AI remains open, credibly neutral, and censorship resistant. Ritual makes smart contracts actually smart, allowing users to natively tap into on-chain AI backed by trustless blockchain properties. Ritual optimizes for any heterogeneous compute, becoming the schelling point for all of web3.",
    priority: 9,
    source: 'https://www.ritualfoundation.org/docs/overview/what-is-ritual',
  },
  {
    id: 'ritual-next-gen',
    category: 'docs',
    keywords: ['innovation', 'capability', 'feature', 'new'],
    content: "Ritual innovations: Expressive Heterogeneous Compute (AI inference, ZK proofs, TEE), Scheduled Transactions (recurring without keepers), Enshrined On-Chain AI Models (train, track, trade), Model Marketplace (monetize transparently), Native Account Abstraction, EVM++ Extensions, Resonance (fee mechanism), Symphony (consensus), Node Specialization, Modular Computational Integrity, Modular Storage, Guardians (firewall), Native Infernet Integration, Verifiable Provenance.",
    priority: 8,
    source: 'https://www.ritualfoundation.org/docs/overview/what-is-ritual',
  },

  // ==========================================
  // TEAM
  // ==========================================
  {
    id: 'ritual-founders',
    category: 'team',
    keywords: ['founder', 'co-founder', 'niraj', 'akilesh', 'who'],
    content: "Ritual Founders: Niraj Pant (Co-founder, GP @ Polychain, Research @ Decentralized Systems Lab, CS @ UIUC), Akilesh Potti (Co-founder, Partner @ Polychain, ML @ Palantir, HFT Quant Trading @ Goldman, ML Research @ MIT Cornell).",
    priority: 9,
    source: 'https://ritual.net/team',
  },
  {
    id: 'ritual-team-core',
    category: 'team',
    keywords: ['team', 'core', 'arshan', 'arka', 'stef', 'naveen'],
    content: "Core Team: Arshan Khanifar (Research Trading @ Polychain, RF @ Apple), Arka Pal (Deepmind, Abacus, Kosen, Cambridge), Stef Henao (Head of People @ Protocol Labs, HRBP @ Coinbase), Naveen Durvasula (PhD @ Columbia Tim Roughgarden, Algorithmic Game Theory), Maryam Bahrani (Research @ a16z crypto, PhD @ Columbia, Quant @ Jane Street), Hadas Zeilberger (PhD @ Yale Ben Fisch, Cryptography, Consensys), Praveen Palanisamy (Principal AI Eng @ Microsoft AI, CS @ CMU), Frieder Erdmann (TEEs @ Flashbots), Micah Goldblum (Postdoc @ NYU Yann Lecunn).",
    priority: 8,
    source: 'https://ritual.net/team',
  },
  {
    id: 'ritual-advisors',
    category: 'team',
    keywords: ['advisor', 'illia', 'arthur', 'sreeram', 'tarun'],
    content: "Advisors: Illia Polosukhin (Founder @ NEAR, Google Research, TensorFlow Transformers, Attention is All You Need co-author), Arthur Hayes (CIO @ Maelstrom, Co-Founder @ BitMEX), Noam Nisan (Professor @ Hebrew University, Godel Prize, Knuth Prize, Starkware Google), Sreeram Kannan (Founder @ EigenLayer, Prof @ UW), Tarun Chitra (Founder @ Gauntlet, GP @ Robot Ventures), Divya Gupta (Partner @ Sequoia), Sid Reddy (Research Scientist @ Isomorphic Labs Meta Deepmind).",
    priority: 8,
    source: 'https://ritual.net/team',
  },

  // ==========================================
  // CAREERS
  // ==========================================
  {
    id: 'ritual-careers',
    category: 'careers',
    keywords: ['career', 'job', 'hiring', 'work', 'join', 'vacancy'],
    content: "Ritual Careers: Become part of the future of Crypto x AI. Engineering roles: Validator Engineer, TEE Specialist, Ecosystem Engineer, Frontend Engineer, Developer Experience Engineer, Distributed Systems Engineer, Core Protocol Engineer, Growth Engineer, Machine Learning Engineer, Smart Contract Engineer, Software Engineer Intern. Research: Research Intern. Legal: Legal Counsel.",
    priority: 6,
    source: 'https://ritual.net/careers',
  },

  // ==========================================
  // BLOG - INTRODUCING RITUAL
  // ==========================================
  {
    id: 'ritual-intro',
    category: 'blog',
    keywords: ['introducing', 'launch', 'stealth', 'series', 'funding', '25m'],
    content: "Introducing Ritual: After months of development, Ritual came out of stealth. Clear goal: merge best principles of cryptography and AI to create open permissionless AI model creation distribution and improvement. AI problems Ritual solves: Lack of SLAs (computational integrity, privacy, censorship resistance), Permissioned centralized APIs, High compute costs, Oligopolistic misaligned organizations. Ritual is open modular sovereign execution layer for AI. Infernet is first evolution - takes AI to on-chain applications via smart contracts. Grand vision: become schelling point of AI in web3 as AI Coprocessor. Series A: $25m financing led by Archetype with Accomplice Robot Ventures dao5 Accel Dialectic Anagram Avra Hypersphere. Angels: Balaji Srinivasan, Nicola Greco, Chase Lochmiller, DCBuilder, Keone Hon Monad, Sergey Gorbunov, Georgios Vlachos Axelar, Kevin Pang SCP.",
    priority: 9,
    source: 'https://ritual.net/blog/introducing-ritual',
  },

  // ==========================================
  // CRYPTO X AI LANDSCAPE
  // ==========================================
  {
    id: 'ritual-landscape',
    category: 'docs',
    keywords: ['landscape', 'vs', 'other', 'compare', 'competition', 'ecosystem'],
    content: "Ritual in Crypto x AI Landscape: Unlike model training networks (PrimeIntellect Artificial Superintelligence Alliance gensyn), Ritual focuses on inference. Unlike Web2 inference networks (Hyperbolic HyperSpace Kuzco), Ritual is on-chain native. Unlike agent frameworks (Eliza ZerePy Virtuals GAME ARC), Ritual provides infrastructure. Unlike IP platforms (Story Sentient), Ritual has built-in IP primitives. Unlike TEE networks (Phala Aizel Atoma), Ritual supports all compute types. Unlike inference networks (Bittensor CommuneAI Omron), Ritual has on-chain smart contract integration. Unlike DePIN (Nosana io net akash Exabits Render), Ritual is software-defined not hardware-limited. Ritual incorporates novel architecture while maintaining familiar interfaces.",
    priority: 8,
    source: 'https://www.ritualfoundation.org/docs/landscape/ritual-vs-other-crypto-x-ai',
  },

  // ==========================================
  // FOUNDATION
  // ==========================================
  {
    id: 'ritual-foundation',
    category: 'about',
    keywords: ['foundation', 'organization', 'non-profit', 'ritualfoundation'],
    content: "Ritual Foundation supports the Ritual ecosystem with documentation, research, and community resources. Available at ritualfoundation.org with docs, blog, team information, and glossary.",
    priority: 6,
    source: 'https://www.ritualfoundation.org/',
  },

  // ==========================================
  // GITHUB
  // ==========================================
  {
    id: 'ritual-github',
    category: 'github',
    keywords: ['github', 'code', 'repository', 'source', 'open source', 'ritual-net'],
    content: "Ritual open source code available at github.com/ritual-net. Repositories include Infernet clients SDKs examples and documentation. Developers can contribute and build on Ritual.",
    priority: 7,
    source: 'https://github.com/ritual-net',
  },

  // ==========================================
  // SHRINE
  // ==========================================
  {
    id: 'ritual-shrine',
    category: 'shrine',
    keywords: ['shrine', 'infrastructure', 'ritualfoundation', 'storage', 'evault', 'promptd'],
    content: "Shrine is Ritual's infrastructure layer. eVault provides secure storage solutions. Promptd handles prompt management and execution. RFS (Ritual File System) enables decentralized storage and retrieval of AI models and data. Available at shrine.ritualfoundation.org.",
    priority: 7,
    source: 'https://shrine.ritualfoundation.org/',
  },
  {
    id: 'ritual-evault',
    category: 'shrine',
    keywords: ['evault', 'vault', 'storage', 'secure', 'encrypt'],
    content: "eVault: Secure storage solution in Shrine infrastructure for encrypted data and model storage.",
    priority: 6,
    source: 'https://shrine.ritualfoundation.org/rfs/evault',
  },
  {
    id: 'ritual-promptd',
    category: 'shrine',
    keywords: ['promptd', 'prompt', 'management', 'execution'],
    content: "Promptd: Prompt management and execution system in Shrine infrastructure for handling AI prompts and responses.",
    priority: 6,
    source: 'https://shrine.ritualfoundation.org/rfs/promptd',
  },

  // ==========================================
  // DOCS - VS OTHER CHAINS
  // ==========================================
  {
    id: 'ritual-vs-chains',
    category: 'docs',
    keywords: ['vs', 'chain', 'other', 'compare', 'bitcoin', 'ethereum'],
    content: "Why another blockchain? Bitcoin enabled money transfer without intermediaries (2009). Ethereum introduced smart contracts (2015). But focus shifted to performance metrics (latency, throughput) for existing users rather than net-new user innovations. Ritual focuses on expressive compute - AI, ZK, TEE - to unlock transformative new use cases, not just scale existing ones.",
    priority: 8,
    source: 'https://www.ritualfoundation.org/docs/landscape/ritual-vs-other-chains',
  },

  // ==========================================
  // EVM++ DOCS
  // ==========================================
  {
    id: 'ritual-evm-plus-plus',
    category: 'docs',
    keywords: ['evm++', 'evm plus', 'extension', 'backwards compatible'],
    content: "EVM++ Overview: Backwards-compatible EVM extension with expressive compute precompiles. Enables AI inference, ZK proof verification, TEE code execution in smart contracts. Native scheduling for recurring transactions. Built-in account abstraction. Most wanted EIPs included.",
    priority: 9,
    source: 'https://www.ritualfoundation.org/docs/whats-new/evm++/overview',
  },

  // ==========================================
  // USERS & NODE RUNNERS
  // ==========================================
  {
    id: 'ritual-for-users',
    category: 'docs',
    keywords: ['user', 'get started', 'beginner', 'how to use'],
    content: "Ritual for Users: Interact through expressive blockchain for AI-powered applications. Developers build AI dApps using compute primitives, ZK verification, TEE execution. Open permissionless alternative to centralized AI APIs.",
    priority: 7,
    source: 'https://www.ritualfoundation.org/docs/using-ritual/ritual-for-users',
  },
  {
    id: 'ritual-node-runners',
    category: 'docs',
    keywords: ['node', 'runner', 'operator', 'run', 'participate', 'earn'],
    content: "Ritual for Node Runners: Operate Infernet nodes performing AI inference and compute tasks. Contribute to decentralized compute network and earn rewards. Requirements: Run Infernet client, maintain uptime for task execution.",
    priority: 7,
    source: 'https://www.ritualfoundation.org/docs/using-ritual/ritual-for-node-runners',
  },

  // ==========================================
  // EXPRESSIVE BLOCKCHAINS
  // ==========================================
  {
    id: 'ritual-expressive-blockchains-docs',
    category: 'docs',
    keywords: ['expressive', 'beyond', 'crypto', 'blockchain', 'article'],
    content: "Expressive Blockchains: Beyond Crypto x AI. Ritual optimizes underlying architecture for any heterogeneous compute, not just AI. Hyperscales expressive computation on blockchain. Best venue for AI, ZK, TEE developers and those experimenting at edges of unknown. Other blockchains symbiotically benefit through Ritual.",
    priority: 7,
    source: 'https://www.ritualfoundation.org/docs/beyond-crypto-x-ai/expressive-blockchains',
  },

  // ==========================================
  // FAQ & GLOSSARY
  // ==========================================
  {
    id: 'ritual-faq',
    category: 'docs',
    keywords: ['faq', 'question', 'help', 'common', 'frequently asked'],
    content: "Ritual FAQ: Ritual is open AI infrastructure network on blockchain. Differs from centralized AI APIs by being permissionless, censorship-resistant, privacy-preserving. Developers use for AI inference, ZK proofs, TEE execution in smart contracts. Ritual makes smart contracts actually smart with native AI compute access.",
    priority: 8,
    source: 'https://www.ritualfoundation.org/docs/reference/faq',
  },
  {
    id: 'ritual-glossary',
    category: 'docs',
    keywords: ['glossary', 'terms', 'definition', 'meaning', 'dictionary'],
    content: "Ritual Glossary: EVM++ (Expressive Virtual Machine extension), Infernet (Decentralized oracle network), Precompiles (Native compute functions), Scheduling (Recurring transactions), TEE (Trusted Execution Environment), ZK (Zero-Knowledge proofs), Shrine (Infrastructure layer), RFS (Ritual File System), eVault (Secure storage), Promptd (Prompt management), Resonance (Fee market mechanism), Symphony (Consensus protocol), vTune (LLM fine-tuning), RaaS (Rollup-as-a-Service), Guardians (Node firewall system), Ritty (Small ritual spirits - Siggy's cousins!), Ritual (The network for open AI infrastructure).",
    priority: 9,
    source: 'https://www.ritualfoundation.org/docs/reference/glossary',
  },

  // ==========================================
  // BLOG
  // ==========================================
  {
    id: 'ritual-blog',
    category: 'blog',
    keywords: ['blog', 'news', 'update', 'announcement', 'post'],
    content: "Ritual Blog covers updates about the network, new features, partnerships, and progress toward decentralized AI infrastructure. Key topics: EVM++ launch, Infernet expansion, protocol integrations, research updates. Available at ritual.net/blog.",
    priority: 5,
    source: 'https://ritual.net/blog',
  },
  {
    id: 'ritual-foundation-blog',
    category: 'blog',
    keywords: ['blog', 'news', 'foundation', 'update'],
    content: "Ritual Foundation Blog: Updates from Ritual Foundation about documentation, research, community initiatives. Available at ritualfoundation.org/blog.",
    priority: 5,
    source: 'https://www.ritualfoundation.org/blog',
  },

  // ==========================================
  // RECENT UPDATES (2025-2026)
  // ==========================================
  {
    id: 'ritual-evm-launch',
    category: 'updates',
    keywords: ['evm++', 'launch', 'mainnet', 'recent', '2025', '2026', 'mainnet launch'],
    content: "EVM++ Launch (2025-2026): Ritual launched EVM++, a backwards-compatible EVM extension with expressive compute precompiles. Enables AI inference, ZK proofs, and TEE execution directly in smart contracts. Features native scheduling for recurring transactions, built-in account abstraction, and support for heterogeneous compute types. This is a major milestone bringing 'the brain on-chain' - blockchain without native inference is like a nervous system without a brain.",
    priority: 10,
    source: 'ritual-announcements',
  },
  {
    id: 'ritual-infernet-growth',
    category: 'updates',
    keywords: ['infernet', 'nodes', 'growth', '8000', 'expansion', '2025', 'decentralized'],
    content: "Infernet Network Growth (2025): Ritual's Infernet decentralized oracle network expanded to 8,000+ connected nodes worldwide. This massive growth enables anyone to tap into transparent AI with strong privacy and verifiability guardrails. Infernet acts as connective tissue between Web3 ecosystem and Ritual Chain, providing an alternative to centralized APIs that geo-restrict and censor. The network empowers developers to access AI models on-chain via smart contracts.",
    priority: 9,
    source: 'ritual-announcements',
  },
  {
    id: 'ritual-starkware-integration',
    category: 'updates',
    keywords: ['starkware', 'starknet', 'integration', 'partnership', 'non-evm', '2025'],
    content: "StarkWare Integration (2025): Ritual announced strategic integration with StarkWare, marking the first non-EVM chain expansion. This brings Ritual's expressive compute capabilities to Starknet and the broader Stark ecosystem. The partnership enables AI inference and ZK proof verification on StarkNet, expanding Ritual's reach beyond EVM-compatible chains.",
    priority: 8,
    source: 'ritual-announcements',
  },
  {
    id: 'ritual-arbitrum-coprocessor',
    category: 'updates',
    keywords: ['arbitrum', 'coprocessor', 'ai', 'integration', 'orbit', '2025'],
    content: "Arbitrum AI Coprocessor (2025): Ritual launched as the AI coprocessor for Arbitrum One and Orbit L2s/L3s. This integration brings expressive AI compute to the Arbitrum ecosystem, enabling developers to build AI-powered dApps with smart contract integration. Uses Orbit framework for custom L2/L3 deployment with Ritual's AI capabilities baked in.",
    priority: 8,
    source: 'ritual-announcements',
  },
  {
    id: 'ritual-infernet-cloud',
    category: 'updates',
    keywords: ['infernet cloud', 'cli', 'explorer', 'tools', 'developer', '2025'],
    content: "Developer Tools Launch (2025): Ritual released Infernet Cloud (self-hostable UI for node management), Infernet CLI (one-click deployment), and Infernet Explorer (monitor 6K+ active nodes globally). These tools make it easier for developers to deploy and manage Infernet nodes, monitor network activity, and integrate Ritual into their workflows. All tools completed security audits.",
    priority: 7,
    source: 'ritual-announcements',
  },

  // ==========================================
  // COMPETITIVE LANDSCAPE
  // ==========================================
  {
    id: 'ritual-vs-bittensor',
    category: 'competition',
    keywords: ['bittensor', 'vs', 'comparison', 'competition', 'tao', 'tao'],
    content: "Ritual vs Bittensor: While Bittensor focuses on model training with a token-based incentive network for machine intelligence, Ritual focuses on inference with on-chain smart contract integration. Bittensor uses TAO token for incentivizing model training, while Ritual enables AI execution directly in smart contracts. Ritual provides EVM++ extensions for native AI compute, while Bittensor requires off-chain execution. Key difference: Ritual is blockchain-first with AI capabilities, Bittensor is AI-first with blockchain elements.",
    priority: 8,
    source: 'ritual-vs-competition',
  },
  {
    id: 'ritual-vs-eigenlayer',
    category: 'competition',
    keywords: ['eigenlayer', 'vs', 'comparison', 'restaking', 'avs', 'competition'],
    content: "Ritual vs EigenLayer: EigenLayer focuses on restaking Ethereum validators with Actively Validated Services (AVS) for security. Ritual focuses on expressive AI compute (inference, ZK proofs, TEE) with native smart contract integration. EigenLayer secures protocols through restaked ETH, while Ritual enables actual AI execution on-chain. Ritual's EVM++ allows AI models to run directly in smart contracts, something EigenLayer doesn't provide. Ritual is for AI workloads, EigenLayer is for security protocols.",
    priority: 8,
    source: 'ritual-vs-competition',
  },
  {
    id: 'ritual-vs-akash',
    category: 'competition',
    keywords: ['akash', 'vs', 'comparison', 'depin', 'compute', 'marketplace'],
    content: "Ritual vs Akash: Akash is a DePIN marketplace for compute resources (CPU, GPU, storage) focusing on hardware-limited compute hosting. Ritual is software-defined and optimized for heterogeneous compute (AI inference, ZK proofs, TEE) on-chain. Akash is about renting hardware for containers, Ritual is about running AI models in smart contracts. Akash = cloud compute marketplace, Ritual = expressive blockchain with AI native integration. Ritual can use Akash for node hosting but provides the AI execution layer.",
    priority: 7,
    source: 'ritual-vs-competition',
  },
  {
    id: 'ritual-vs-allora',
    category: 'competition',
    keywords: ['allora', 'vs', 'comparison', 'inference', 'network'],
    content: "Ritual vs Allora Network: Allora focuses on decentralized AI inference with worker networks and self-improving models. Ritual provides broader heterogeneous compute (AI inference + ZK proofs + TEE) with native EVM smart contract integration. Ritual's EVM++ allows AI to run directly in smart contracts without oracles, while Allora uses an off-chain worker network. Ritual is more blockchain-native with expressive compute beyond just AI inference. Both aim for decentralized AI but Ritual has deeper smart contract integration.",
    priority: 7,
    source: 'ritual-vs-competition',
  },
  {
    id: 'ritual-vs-ritual',
    category: 'competition',
    keywords: ['ritual', 'vs', 'comparison', 'other', 'crypto', 'ai', 'landscape'],
    content: "Ritual's Unique Positioning: Unlike model training networks (PrimeIntellect, Gensyn), Ritual focuses on inference with on-chain integration. Unlike Web2 inference (Hyperbolic, Kuzco), Ritual is blockchain-native. Unlike agent frameworks (Eliza, ZerePy, Virtuals, GAME, ARC), Ritual provides infrastructure not frameworks. Unlike IP platforms (Story, Sentient), Ritual has enshrined IP primitives. Ritual combines novel architecture (EVM++, Infernet, Resonance, Symphony) with familiar interfaces, making it the schelling point for AI in Web3.",
    priority: 9,
    source: 'ritual-vs-competition',
  },
];

export default RITUAL_WEB_KNOWLEDGE;
