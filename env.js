const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb+srv://e2476054_db_user:n4xcoQnYQ3HHNKbC@young0727.1goegwf.mongodb.net/?appName=young0727';

const COOKIE_SECRET =
  process.env.COOKIE_SECRET || 'dev-secret-change-in-production';

const FRONTEND_ORIGIN =
  process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

const PORT = 4000;

module.exports = {
  MONGODB_URI,
  COOKIE_SECRET,
  FRONTEND_ORIGIN,
  PORT
};