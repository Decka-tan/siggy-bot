/**
 * CONTRIBUTIONS DATA FOR SIGGY
 * Integrated Discord search results - ACCURATE VERSION
 */

interface ContributionsData {
  date: string;
  method: string;
  channel: string;
  leaderboard: {
    username: string;
    displayName?: string;
    userId: string;
    messages: number;
    firstPost?: string;
    lastPost?: string;
  }[];
  totalUsers: number;
  totalMessages: number;
}

// Load ACCURATE extracted data with dates
async function getContributionsData(): Promise<ContributionsData> {
  const fs = await import('fs');
  const path = await import('path');

  const dataPath = path.join(process.cwd(), 'extracted-data', 'complete-contributions-with-dates.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  return data;
}

// Get user contribution count
export async function getUserContributions(username: string): Promise<number | null> {
  const data = await getContributionsData();

  const user = data.leaderboard.find(u =>
    u.username.toLowerCase() === username.toLowerCase()
  );

  return user ? user.messages : null;
}

// Get user contribution details with dates
export async function getUserContributionsDetails(username: string): Promise<{
  username: string;
  messages: number;
  firstPost?: string;
  lastPost?: string;
} | null> {
  const data = await getContributionsData();

  const user = data.leaderboard.find(u =>
    u.username.toLowerCase() === username.toLowerCase()
  );

  if (!user) return null;

  return {
    username: user.username,
    messages: user.messages,
    firstPost: user.firstPost,
    lastPost: user.lastPost,
  };
}

// Get top contributors
export async function getTopContributors(limit: number = 10): Promise<{username: string, messages: number}[]> {
  const data = await getContributionsData();
  return data.leaderboard.slice(0, limit).map(u => ({
    username: u.username,
    messages: u.messages
  }));
}

// Get total stats
export async function getContributionsStats(): Promise<{
  totalUsers: number;
  totalMessages: number;
  channel: string;
  lastUpdated: string;
}> {
  const data = await getContributionsData();
  return {
    totalUsers: data.totalUsers,
    totalMessages: data.totalMessages,
    channel: data.channel,
    lastUpdated: data.date,
  };
}

/*
 * USAGE IN CHAT API:

 // When user asks "how many contributions does decka_tan have?"
 const count = await getUserContributions('decka_tan');

 if (count) {
   // Add to Siggy's response
   prompt += `\n\nBased on Discord data from #contributions channel:
   @decka_tan has ${count} messages.`;
 }

 * This gives REAL Discord data to Siggy!
 */
