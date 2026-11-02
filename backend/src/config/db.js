const mongoose = require('mongoose');

const connectDB = async () => {
  let mongoUri = process.env.MONGODB_URI;

  if (mongoUri && !mongoUri.includes('<db_username>') && !mongoUri.includes('<db_password>')) {
    try {
      console.log('Connecting to external MongoDB database...');
      const conn = await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 7000 });
      console.log(`🚀 MongoDB Atlas Connected: ${conn.connection.host}`);
      return conn;
    } catch (err) {
      console.log(`External MONGODB_URI connection attempt timed out: ${err.message}.`);
    }
  } else if (mongoUri && (mongoUri.includes('<db_username>') || mongoUri.includes('<db_password>'))) {
    console.log('⚠️ [MongoDB Atlas] Found placeholder "<db_username>" or "<db_password>" in backend/.env. Please replace them with your database user credentials.');
  }

  console.log('Starting in-memory MongoDB / lightweight fallback mode for local development...');

  // Asynchronously attempt MongoMemoryServer without blocking server startup
  (async () => {
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      const memoryUri = mongoServer.getUri();
      await mongoose.connect(memoryUri);
      console.log(`In-Memory MongoDB Connected at: ${memoryUri}`);
    } catch (memErr) {
      console.log(`In-memory MongoDB startup info: ${memErr.message}. Operating in mock/in-memory fallback.`);
    }
  })();
};

module.exports = connectDB;
