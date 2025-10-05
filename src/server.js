const app = require('./app'); // Make sure app.js exists
const connectDatabase = require('./config/database'); // Make sure database.js exists

const PORT = process.env.PORT || 4003;

// Handle synchronous errors
process.on('uncaughtException', (err) => {
    console.error(`Uncaught Exception: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
});

// Connect to MongoDB
connectDatabase()
    .then(() => console.log('MongoDB Connected'))
    .catch((err) => {
        console.error(`MongoDB connection error: ${err.message}`);
        process.exit(1);
    });

// Start server
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Handle asynchronous errors
process.on('unhandledRejection', (err) => {
    console.error(`Unhandled Rejection: ${err.message}`);
    console.error(err.stack);
    server.close(() => process.exit(1));
});

