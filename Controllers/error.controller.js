const AppError = require('../Util/appError');

//Error sent to development environment has more details than the one sent to production environment
const sendErrorDev = (err, res) => {
  return res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
  });
};

const sendErrorProd = (err, res) => {
  //Operational error: send message to the client
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    //Programming error: don't send error details to the client, send a generic message
    return res.status(500).json({
      status: 'error',
      message: 'Something went wrong',
    });
  }
};

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  console.log(err);
  // const value = err.keyValue.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicate field value. Please use another value`;
  return new AppError(message, 400);
};

//put the error messages in an array and then join them with a dot to make a single string of error messages
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTErrors = (error) => {
  return new AppError('Invalid token. Please log in again', 401);
};

//the next function is taking an error object as an argument and returning a new error object with a message property
//it may need to create a new error object with a message property and a status code property based on the error object passed to it
//cheks for the current environment and sends the error to the client based on the environment
//check for the error type if it needs to create a new error
module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  //send error to the client based on the environment (development or production)
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    // console.log(err);
    let error = { ...err };
    if (error.name === 'CastError') {
      error = handleCastErrorDB(error);
    }
    if (error.code === 11000) {
      error = handleDuplicateFieldsDB(error);
    }
    if ((error._message = 'User validation failed')) {
      console.log(error);
      error = handleValidationErrorDB(error);
    }
    //handling invalid token error and expired token error
    if (
      error.name === 'JsonWebTokenError' ||
      error.name === 'TokenExpiredError'
    ) {
      error = handleJWTErrors(error);
    }
    sendErrorProd(error, res);
  }
};
