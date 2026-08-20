// One-time setup script. Run locally with `npm run seed` AFTER you've created
// the tables (db/schema.sql) and filled in your real .env file.
//
// Creates the manager account (Shubham) and the 5 employee accounts.
// Passwords are generated randomly and printed ONCE to your terminal —
// they are not stored anywhere in the code or the repo. Copy them
// somewhere safe (or change them) right after running this.

require('dotenv').config();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const supabase = require('./db/supabase');

function randomPassword() {
  return crypto.randomBytes(6).toString('base64url'); // ~8 char readable password
}

async function upsertManager(username, name) {
  const password = randomPassword();
  const password_hash = await bcrypt.hash(password, 10);

  const { data, error } = await supabase
    .from('managers')
    .insert({ username, name, password_hash })
    .select()
    .single();

  if (error) throw error;
  console.log(`Manager  | ${name.padEnd(18)} | username: ${username.padEnd(14)} | password: ${password}`);
  return data.id;
}

async function upsertEmployee(managerId, username, name) {
  const password = randomPassword();
  const password_hash = await bcrypt.hash(password, 10);

  const { error } = await supabase
    .from('employees')
    .insert({ manager_id: managerId, username, name, password_hash });

  if (error) throw error;
  console.log(`Employee | ${name.padEnd(18)} | username: ${username.padEnd(14)} | password: ${password}`);
}

async function main() {
  console.log('Creating accounts... (save these credentials now, they will not be shown again)\n');

  const managerId = await upsertManager('shubham', 'Shubham');

  const employees = [
    ['rahul', 'Rahul'],
    ['ramashankar', 'Rama Shankar'],
    ['nikhil', 'Nikhil'],
    ['naresh', 'Naresh'],
    ['abhishekk', 'Abhishek Khandal'],
  ];

  for (const [username, name] of employees) {
    await upsertEmployee(managerId, username, name);
  }

  console.log('\nDone. Everyone should log in at your site URL and change nothing else is needed — the app is ready.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
