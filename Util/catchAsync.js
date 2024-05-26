// Purpose: To catch any errors that may occur in the async function and pass them to the next middleware function

// Details: This function is a higher order function that takes in an async function (fn) and returns a new function
//that will catch any errors that may occur in the async function and pass them to the next middleware function.
// This is useful because it allows us to avoid writing try catch blocks in our async functions and instead use the

module.exports = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};
