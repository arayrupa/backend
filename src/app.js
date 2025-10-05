const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');

require('dotenv').config();

const app = express();

// Allow access to the API from any origin
app.use(cors());

// Middlewares
app.use(bodyParser.json());
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve uploaded files
const uploadsDir = path.join(__dirname, 'public','uploads');
app.use('/uploads', express.static(uploadsDir));

// Routes
const user = require('./routes/userRoute');
const job = require('./routes/jobRoute');
const cities = require('./routes/citiesRoute');
const skills = require('./routes/skillsRoute');
const blogs = require('./routes/blogRoute');

app.use('/api/v1', user);
app.use('/api/v1', job);
app.use('/api/v1', cities);
app.use('/api/v1', skills);
app.use('/api/v1/blog', blogs);

// Root route for health check
app.get('/', (req, res) => {
    res.send('Server is running! 🚀');
});

// Error middleware (if you have one)
// app.use(errorMiddleware);

module.exports = app;
