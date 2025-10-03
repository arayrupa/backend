// /**
//     * @description      : 
//     * @author           : admin
//     * @group            : 
//     * @created          : 29/09/2023 - 14:55:06
//     * 
//     * MODIFICATION LOG
//     * - Version         : 1.0.0
//     * - Date            : 29/09/2023
//     * - Author          : admin
//     * - Modification    :
// **/
// const app = require('./app');
// const connectDatabase = require('./config/database');
// const PORT = process.env.PORT || 4003;
// // UncaughtException Error
// process.on('uncaughtException', (err) => {
//     console.log(`Error: ${err.message}`);
//     process.exit(1);
// });

// connectDatabase();

// const server = app.listen(PORT, () => {
//     console.log(`Server running `+PORT)
// });

// // Unhandled Promise Rejection
// process.on('unhandledRejection', (err) => {
//     console.log(`Errord: ${err.message}`);
//     server.close(() => {
//         process.exit(1);
//     });
// });
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();

// Fix Mongoose warning
mongoose.set('strictQuery', true);

// Middleware
app.use(express.json());
app.use(cors({
  origin: "https://frontend-w7jm.vercel.app/",  // Your exact Vercel URL
  credentials: true
}));

// TEMP: Comment out DB (fixes ECONNREFUSED) - Re-enable with Atlas later
/*
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log("MongoDB Error:", err));
*/

// REMOVE: Frontend serving (fixes ENOENT) - No longer needed
/*
const path = require("path");
app.use(express.static(path.join(__dirname, "..", "frontend", "build")));
app.get("*", (req, res) => {
  res.sendFile(path.resolve(__dirname, "..", "frontend", "build", "index.html"));
});
*/

// Test route (verify backend works)
app.get("/", (req, res) => {
  res.send("Backend running on Render 🚀");
});

// ADD YOUR API ROUTES HERE (e.g.):
// const userRoutes = require('./routes/users');
// app.use('/api/users', userRoutes);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
