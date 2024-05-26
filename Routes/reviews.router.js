const express = require('express');
const Router = express.Router({ mergeParams: true });

const reviewController = require('../Controllers/reviews.controller');
const authController = require('../Controllers/auth.controller');

Router.use(authController.checkUserLoggedIn);

Router.route('/getMyReviews').get(authController.checkUserLoggedIn ,reviewController.getMyReviews);

Router.route('/:id')
  .get(reviewController.getReview)
  .delete(
    authController.restrictTo('user', 'admin'),
    reviewController.deleteReview,
  ).patch(
    authController.checkUserLoggedIn
    ,reviewController.updateReview,
  );

Router.route('/')
  .get(reviewController.getAllReviews)  //all reviews for a specific tour
  .post(authController.restrictTo('user'), reviewController.createReview);





module.exports = Router;
