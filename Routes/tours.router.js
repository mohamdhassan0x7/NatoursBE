const express = require('express');
const Router = express.Router();

const toursController = require('../Controllers/tours.controller');
const authController = require('../Controllers/auth.controller');

const reviewsRouter = require('./reviews.router');
const { myMulter } = require('../Util/Multer');

//Nested Routes, give the handle to the reviewsRouter
Router.use('/:tourId/reviews', reviewsRouter);

Router.route('/top-5-cheap').get(
  toursController.aliasTopTours,
  toursController.getAllTours,
);

Router.route(`/`)
  .get(toursController.getAllTours)
  .post(
    authController.checkUserLoggedIn,
    authController.restrictTo('admin', 'lead-guide'),
    toursController.createTour,
  );

Router.route('/tour-stats').get(toursController.toursStats);

Router.route('/tours-within/:distance/center/:latlng/unit/:unit').get(
  toursController.getToursWithin,
);

Router.route('/distances/:latlng/unit/:unit').get(toursController.getDistances);

//Middleware to check if user is logged in
Router.use(authController.checkUserLoggedIn);

Router.route('/monthly-plan/:year').get(
  authController.restrictTo('admin', 'lead-guide', 'guide'),
  toursController.monthlyPlan,
);

Router.route('/:id')
  .get(toursController.getOneTour)
  .patch(
    authController.restrictTo('admin', 'lead-guide'),
    toursController.updateTour,
  )
  .delete(
    authController.restrictTo('admin', 'lead-guide'),
    toursController.deleteTour,
  );


//Add Images to the tour
Router.route('/addImageCover/:id').patch(
  authController.checkUserLoggedIn,
  authController.restrictTo('admin', 'lead-guide'),
  myMulter().single('imageCover'),
  toursController.addTourImageCover,
);
Router.route('/addImages/:id').patch(
  authController.checkUserLoggedIn,
  authController.restrictTo('admin', 'lead-guide'),
  myMulter().array('images', 5),
  toursController.addTourImages,
);

module.exports = Router;
