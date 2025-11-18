// db/connect.js
const { MongoClient } = require('mongodb');

let _client;
let _db;

const initDb = async (callback) => {
  if (_db) return callback(null, _db);

  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DBNAME || 'directorydb'; // NEW DEFAULT

  if (!uri) {
    return callback(new Error('❌ Missing MONGODB_URI in .env or Render'));
  }

  try {
    const client = new MongoClient(uri);
    await client.connect();
    _db = client.db(dbName);

    console.log(`✅ Database "${dbName}" initialized successfully`);
    callback(null, _db);
  } catch (err) {
    console.error('❌ Failed to connect to MongoDB:', err.message);
    callback(err);
  }
};

const getDb = () => {
  if (!_db) throw Error('Database not initialized');
  return _db;
};

module.exports = { initDb, getDb };
