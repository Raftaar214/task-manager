require('dotenv').config();
const bcrypt = require('bcryptjs');
const supabase = require('./db/supabase');

const username = process.argv[2];
const newPassword = process.argv[3];

if (!username || !newPassword) {
  console.error("Usage: node updateManagerPassword.js <username> <new_password>");
  console.error("Example: node updateManagerPassword.js shubham MyNewSecurePassword123");
  process.exit(1);
}

async function updatePassword() {
  console.log(`Hashing new password for manager: ${username}...`);
  const hash = await bcrypt.hash(newPassword, 10);
  
  console.log("Updating database...");
  const { data, error } = await supabase
    .from('managers')
    .update({ password_hash: hash })
    .eq('username', username)
    .select();

  if (error) {
    console.error("Error updating password:", error.message);
  } else if (data.length === 0) {
    console.error(`Manager with username '${username}' not found.`);
  } else {
    console.log(`✅ Successfully updated password for manager: ${username}`);
  }
  
  setTimeout(() => process.exit(0), 100);
}

updatePassword();
