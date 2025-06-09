const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Allow access to the API from any origin
const corsOptions = {
    origin: function (origin, callback) {
        callback(null, true);
    }
};

// config
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config({ path: 'backend/config/config.env' });
}

// Middlewares
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve uploaded files
const uploadsDir = path.join(__dirname, 'public','uploads');
app.use('/uploads', express.static(uploadsDir));

const user = require('./routes/userRoute')
const job = require('./routes/jobRoute')
const cities = require('./routes/citiesRoute')
const skills = require('./routes/skillsRoute')


//Admin Routes
// const jobRole = require('./routes/jobRoleRoute')
// const cities = require('./routes/citiesRoute')
// const skills = require('./routes/skillsRoute')
// const howToSource = require('./routes/howtosourceRoute')
// const company = require('./routes/companyRoute')


//used for local system
app.use('/api/v1', user)
app.use('/api/v1', job)
app.use('/api/v1', cities)
app.use('/api/v1', skills)

// //Admin apis
// app.use('/api/v1', jobRole)
// app.use('/api/v1', cities)
// app.use('/api/v1', skills)
// app.use('/api/v1', howToSource)
// app.use('/api/v1', company)

// deployment
__dirname = path.resolve();
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '/frontend/build')));

    app.get('*', (req, res) => {
        res.sendFile(path.resolve(__dirname, 'frontend', 'build', 'index.html'));
    });
} else {
    app.get('/', (req, res) => {
        res.send('Server is Running! 🚀');
    });
}

// error middleware
// app.use(errorMiddleware);

module.exports = app;
