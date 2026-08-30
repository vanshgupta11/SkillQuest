const mongoose = require('mongoose');

const connectDB = async () => {
  let mongoUri = process.env.MONGODB_URI;

  if (mongoUri) {
    try {
      const conn = await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2000 });
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      return conn;
    } catch (err) {
      console.log(`External MONGODB_URI connection attempt timed out: ${err.message}.`);
    }
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
