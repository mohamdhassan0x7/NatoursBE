class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = statusCode >= 500 ? 'error' : 'fail';

    this.isOperational = true;

    //Capture the stack trace, excluding the constructor call from the stack trace
    //error stack is a property of the error object that contains the sequence of function calls that lead to the error
    //this line of code will remove the constructor call from the stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
