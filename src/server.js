/**
    * @description      : 
    * @author           : admin
    * @group            : 
    * @created          : 29/09/2023 - 14:55:06
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 29/09/2023
    * - Author          : admin
    * - Modification    : 
**/
const app = require('./app');
const connectDatabase = require('./config/database');
const PORT = process.env.PORT || 4003;
// UncaughtException Error
process.on('uncaughtException', (err) => {
    console.log(`Error: ${err.message}`);
    process.exit(1);
});

connectDatabase();

const server = app.listen(PORT, () => {
    console.log(`Server running `+PORT)
});

// Unhandled Promise Rejection
process.on('unhandledRejection', (err) => {
    console.log(`Errord: ${err.message}`);
    server.close(() => {
        process.exit(1);
    });
});
