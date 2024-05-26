const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSain = require('express-mongo-sanitize');
const xssClean = require('xss-clean');

const AppError = require('./Util/appError');
const errorController = require('./Controllers/error.controller');
const toursRouter = require('./Routes/tours.router');
const authRouter = require('./Routes/auth.router');
const reviewsRouter = require('./Routes/reviews.router')

const express = require('express');
const app = express();

//Middleware function to enable CORS, and allow all origins, and allow sending cookies
var cors = require('cors');
app.use(cors({ origin: true, credentials: true}));

const cookieParser = require('cookie-parser')
app.use(cookieParser());

//Middleware function to set the security HTTP headers
app.use(helmet());

//Middleware function to log the request method, url, status code, response time, and size of the response
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

//Middleware function to limit the number of requests from the same IP
// const rateLimiter = rateLimit({
//   max: 100,
//   windowMs: 60 * 60 * 1000,
//   message: 'Too many requests from this IP, please try again in an hour',
// })
// app.use('/api', rateLimiter);

//Middleware function to parse the request body to json
//limit the size of the request body to 10kb, avoid DOS attack
// app.use(express.json({ limit: '10kb' }));
app.use(express.json());


//Middleware function to sanitize the data to prevent NoSQL injection
//must be used after the body parser middleware (express.json)
app.use(mongoSain());
app.use(xssClean());


//Routing middleware function to handle all the routes
const baseURL = '/api/v1';
app.use(`${baseURL}/uploads`, express.static("./Upload"))
app.use(`${baseURL}/tours`, toursRouter);
app.use(`${baseURL}/auth` , authRouter);
app.use(`${baseURL}/reviews` , reviewsRouter );

// handle wrong routers using app.all method for all possible methods (get, post, delete, patch, put, ...)
app.all('*', (req, res, next) => {
  //Create an error object and pass it to the next middleware function
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

//Error handling middleware function to handle all errors in the application
//details: This middleware function will be called whenever an error is passed to the next function
app.use(errorController);

module.exports = app;
