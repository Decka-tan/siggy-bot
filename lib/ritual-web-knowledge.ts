/**
 * RITUAL KNOWLEDGE BASE
 * Key information about Ritual from official sources
 */

import type { KnowledgeEntry } from './siggy-knowledge';

export const RITUAL_WEB_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: 'ritual-about',
    category: 'about',
    keywords: ['ritual', 'about', 'what is', 'network', 'ai'],
    content: "Ritual is the network for open AI infrastructure. The state of AI is flawed - permissioned and centralized APIs, lack of privacy and computational integrity, lack of censorship resistance. Ritual builds groundbreaking new architecture on a crowdsourced governance layer for safety, funding, alignment, and model evolution.",
    priority: 10,
    source: 'https://ritual.net/about',
  },
  {
    id: 'ritual-evm',
    category: 'docs',
    keywords: ['evm', 'evm++', 'blockchain', 'smart contract', 'chain'],
    content: "EVM++ is a backwards-compatible extension of the EVM with expressive compute precompiles for AI inference, ZK proof verification, TEE code execution. Features native scheduling for recurring/conditional transactions, in-built account abstraction, and modular primitives for provenance, privacy, and computational integrity.",
    priority: 9,
    source: 'https://ritualvisualized.com/',
  },
  {
    id: 'ritual-infernet',
    category: 'docs',
    keywords: ['infernet', 'oracle', 'network', 'decentralized', 'nodes'],
    content: "Infernet is the first decentralized oracle network for heterogeneous workloads, connecting Web3 with Ritual Chain. With 8,000+ connected nodes, it provides an alternative to centralized APIs that geo-restrict access and censor. Acts as connective tissue between broader Web3 ecosystem and Ritual Chain.",
    priority: 9,
    source: 'https://ritualvisualized.com/',
  },
  {
    id: 'ritual-expressive',
    category: 'docs',
    keywords: ['expressive', 'blockchain', 'users', 'behavior', 'compute'],
    content: "Ritual is the most expressive blockchain in existence, focusing on enriching what users can do on-chain. Bitcoin enabled sending money without intermediaries. Ethereum introduced smart contracts. Ritual enables AI compute, ZK proofs, and TEE execution - expanding what's possible with trustless, expansive computation.",
    priority: 8,
    source: 'https://www.ritualfoundation.org/docs/overview/what-is-ritual',
  },
  {
    id: 'ritual-forge',
    category: 'about',
    keywords: ['forge', 'summon', 'ritual', 'create', 'soul'],
    content: "The Ritual Forge is where digital souls are created through summoning and forging. It's a cosmic system for bringing AI entities to life. Siggy was born from the Ritual Forge as a multi-dimensional cat entity before descending to Earth.",
    priority: 10,
    source: 'https://ritual.net/about',
  },
  {
    id: 'ritual-team',
    category: 'team',
    keywords: ['team', 'founder', 'who', 'people', 'niraj', 'akilesh'],
    content: "Ritual was founded by Niraj Pant (Co-founder, GP @ Polychain, Research @ DSL) and Akilesh Potti (Partner @ Polychain, ML @ Palantir). Team includes Arshan Khanifar (Trading @ Polychain, RF @ Apple), Arka Pal (Deepmind, Cambridge), Stef Henao (Head of People @ Protocol Labs), and researchers from Columbia, Yale, Princeton.",
    priority: 7,
    source: 'https://ritual.net/team',
  },
  {
    id: 'ritual-shrine',
    category: 'shrine',
    keywords: ['shrine', 'evault', 'promptd', 'rfs', 'storage'],
    content: "Shrine is Ritual's infrastructure. eVault provides secure storage solutions. Promptd handles prompt management and execution. RFS (Ritual File System) enables decentralized storage and retrieval of AI models and data.",
    priority: 6,
    source: 'https://shrine.ritualfoundation.org/',
  },
  {
    id: 'ritual-vs-others',
    category: 'docs',
    keywords: ['vs', 'compare', 'other', 'chains', 'crypto', 'ai'],
    content: "Unlike other blockchains focused purely on DeFi or NFTs, Ritual focuses on AI compute infrastructure. It combines blockchain with AI inference, zero-knowledge proofs, and trusted execution environments. While other chains use limited compute, Ritual enables expressive, heterogeneous compute on-chain.",
    priority: 7,
    source: 'https://www.ritualfoundation.org/docs/landscape/ritual-vs-other-chains',
  },
  {
    id: 'ritual-node-runners',
    category: 'docs',
    keywords: ['node', 'runner', 'operator', 'run', 'participate'],
    content: "Ritual node runners operate Infernet nodes that perform AI inference and other compute tasks. Node runners contribute to the decentralized compute network and earn rewards. Requirements include running the Infernet client and maintaining uptime for task execution.",
    priority: 6,
    source: 'https://www.ritualfoundation.org/docs/using-ritual/ritual-for-node-runners',
  },
  {
    id: 'ritual-users',
    category: 'docs',
    keywords: ['user', 'use', 'how to', 'get started', 'beginner'],
    content: "Users interact with Ritual through its expressive blockchain for AI-powered applications. Developers can build AI dApps using Ritual's compute primitives, ZK proof verification, and TEE execution. The network provides open, permissionless AI infrastructure compared to centralized APIs.",
    priority: 7,
    source: 'https://www.ritualfoundation.org/docs/using-ritual/ritual-for-users',
  },
  {
    id: 'ritual-glossary',
    category: 'docs',
    keywords: ['glossary', 'terms', 'definition', 'meaning'],
    content: "Ritual Glossary: EVM++ (Expressive Virtual Machine extension), Infernet (Decentralized oracle network), Precompiles (Native compute functions), Scheduling (Recurring transactions), TEE (Trusted Execution Environment), ZK (Zero-Knowledge proofs), Shrine (Infrastructure layer), RFS (Ritual File System), Ritty (Small ritual spirits).",
    priority: 8,
    source: 'https://www.ritualfoundation.org/docs/reference/glossary',
  },
  {
    id: 'ritual-faq',
    category: 'docs',
    keywords: ['faq', 'question', 'help', 'common'],
    content: "Ritual FAQ: Ritual is an open AI infrastructure network on blockchain. It differs from centralized AI APIs by being permissionless, censorship-resistant, and privacy-preserving. Developers can use Ritual for AI inference, ZK proofs, and TEE execution in their smart contracts.",
    priority: 7,
    source: 'https://www.ritualfoundation.org/docs/reference/faq',
  },
  {
    id: 'ritual-blog',
    category: 'blog',
    keywords: ['blog', 'news', 'update', 'announcement'],
    content: "Ritual Blog covers updates about the network, new features, partnerships, and progress toward decentralized AI infrastructure. Key announcements include EVM++ launch, Infernet expansion, and integrations with other protocols.",
    priority: 5,
    source: 'https://ritual.net/blog',
  },
  {
    id: 'ritual-careers',
    category: 'team',
    keywords: ['career', 'job', 'hiring', 'work', 'join'],
    content: "Ritual is hiring across engineering, research, and operations. Roles include protocol engineers, AI researchers, developer advocates, and more. Join the team building open AI infrastructure. Check ritual.net/careers for current openings.",
    priority: 5,
    source: 'https://ritual.net/careers',
  },
  {
    id: 'ritual-github',
    category: 'github',
    keywords: ['github', 'code', 'repository', 'source', 'open source'],
    content: "Ritual's open source code is available at github.com/ritual-net. Repositories include Infernet clients, SDKs, examples, and documentation. Contributions welcome from developers building on Ritual.",
    priority: 6,
    source: 'https://github.com/ritual-net',
  },
];

export default RITUAL_WEB_KNOWLEDGE;
