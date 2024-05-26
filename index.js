const dotenv = require('dotenv');
const mongoose = require('mongoose');

//Handle uncaught exceptions ex: console.log(x) where x is not defined
process.on('uncaughtException', (err) => {
  console.log('Uncaught Exception! Shutting down ...', err);
  console.log(err.name, err.message);
  //exit the application without waiting for the pending requests to be finished because the application is in an unclean state so it's better to exit the application immediately
  process.exit(1);
});

const app = require('./app');
dotenv.config({ path: './config.env' });
const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD,
);
mongoose.connect(DB).then(() => console.log('Data base connected ...'));
const server = app.listen(process.env.PORT, () => {
  console.log(`Listening of port ${process.env.PORT} ...`);
});

//Handle unhandled rejections ex: wrong password of database, wrong database name, ...
//unhandled rejections are the errors happens cause of the asynchronous code that are not handled (promise rejections)
process.on('unhandledRejection', (err) => {
  console.log(err.name, err.message);
  console.log('Unhandled Rejection! Shutting down ...');
  //close the server and exit the application
  //the server.close method will give the server time to finish all the requests that are still pending or being processed
  //then it will close the server
  //if we used process.exit() without the server.close method, the server will be closed immediately and the pending requests will be terminated
  server.close(() => {
    process.exit(1);
  });
});
