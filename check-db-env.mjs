console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_NAME:', process.env.DB_NAME);

// Try to parse DATABASE_URL
if (process.env.DATABASE_URL) {
  const url = new URL(process.env.DATABASE_URL);
  console.log('Parsed URL:');
  console.log('  Host:', url.hostname);
  console.log('  User:', url.username);
  console.log('  Database:', url.pathname.slice(1));
}
