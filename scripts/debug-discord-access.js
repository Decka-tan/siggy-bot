require('dotenv').config({ path: '.env.local' });

async function checkAccess() {
  const token = process.env.DISCORD_USER_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;
  const channelId = '1352846698407341059';

  console.log(`Testing access to channel ${channelId} in guild ${guildId}...`);

  const testHeader = (t) => ({ 'Authorization': t });
  
  const tokens = [token, `Bot ${token}`];

  for (const t of tokens) {
    console.log(`\nTesting with Authorization: ${t.slice(0, 10)}...`);
    try {
      const res = await fetch(`https://discord.com/api/v10/channels/${channelId}`, {
        headers: { 'Authorization': t }
      });
      console.log(`Status: ${res.status} ${res.statusText}`);
      if (res.ok) {
        const data = await res.json();
        console.log(`✅ Success! Channel Name: ${data.name}`);
        return;
      } else {
        const err = await res.text();
        console.log(`❌ Error: ${err}`);
      }
    } catch (e) {
      console.log(`❌ Request failed: ${e.message}`);
    }
  }
}

checkAccess();
