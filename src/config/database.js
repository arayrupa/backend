require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;

const connectDatabase = async () => {
    try {
        await mongoose.connect(MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: 20,
        });
        console.log('MongoDB connected successfully');
    } catch (err) {
        console.error(`MongoDB connection error: ${err.message}`);
        console.error(err.stack);
        process.exit(1); // Exit process if DB connection fails
    }
};

module.exports = connectDatabase;
