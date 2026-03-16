import { getUserChecker } from './lib/user-checker';

const checker = getUserChecker();
const willow = checker.findUser('noyon_12');

console.log('--- WILLOW (@noyon_12) DATA ---');
if (willow) {
  console.log('User Found:', willow.displayName);
  console.log('Global Messages:', willow.globalMessages);
  console.log('Contributions Count:', willow.contributionsCount);
  console.log('Roles:', willow.roles.join(', '));
} else {
  console.log('❌ Willow not found!');
}

const leaderboard = checker.getTopContributors(5);
console.log('\n--- TOP CONTRIBUTORS ---');
console.log(leaderboard);
