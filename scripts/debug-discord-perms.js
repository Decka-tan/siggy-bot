require('dotenv').config({ path: '.env.local' });

async function checkPermissions() {
  const token = process.env.DISCORD_USER_TOKEN;
  const targetChannelId = '1383078952171733132'; // #contributions
  const chatChannelId = '1381749422970376303'; // #chat

  const headers = { 'Authorization': token };

  console.log(`Checking permissions for token ${token.slice(0, 10)}...`);

  async function testChannel(id, name) {
    console.log(`\nTesting channel: ${name} (${id})`);
    try {
      const res = await fetch(`https://discord.com/api/v10/channels/${id}/messages?limit=1`, { headers });
      console.log(`Status: ${res.status} ${res.statusText}`);
      if (res.ok) {
        const msgs = await res.json();
        console.log(`✅ Success! Fetched ${msgs.length} messages.`);
      } else {
        const err = await res.json();
        console.log(`❌ Error: ${JSON.stringify(err)}`);
      }
    } catch (e) {
      console.log(`❌ Request failed: ${e.message}`);
    }
  }

  await testChannel(targetChannelId, '#contributions');
  await testChannel(chatChannelId, '#chat');
}

checkPermissions();
