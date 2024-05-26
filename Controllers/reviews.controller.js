const catchAsync = require('../Util/catchAsync');
const Review = require('../Models/Reviews');
const AppError = require('../Util/appError');
const User = require('../Models/User');

exports.createReview = catchAsync(async (req, res, next) => {
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user.id;

  const review = await Review.create(req.body);
  const allReviewsForThisTour = await Review.find({ tour: req.body.tour });
  return res.status(201).json({
    status: 'success',
    data: {
      reviews: allReviewsForThisTour,
    },
  });
});

exports.getAllReviews = catchAsync(async (req, res, next) => {
  let filter = {};
  if (req.params.tourId) filter = { tour: req.params.tourId };
  const reviews = await Review.find(filter);
  return res.status(200).json({
    status: 'success',
    results: reviews.length,
    data: {
      reviews,
    },
  });
});

exports.getReview = catchAsync(async (req, res, next) => {
  const review = await Review.findById(req.params.id);
  if (!review) {
    return next(new AppError('No review found with that ID', 404));
  }
  return res.status(200).json({
    status: 'success',
    data: {
      review,
    },
  });
});

exports.deleteReview = catchAsync(async (req, res, next) => {
  let user = await User.findById(req.user.id)
    .populate({ path: 'wishList' })
    .populate({ path: 'booking' });

  const reviews = await Review.find({ user: req.user.id }).populate({
    path: 'tour',
    select: 'name imageCover price summary',
  });
  user = { ...user._doc, reviews };

  console.log(user);
  const review = await Review.findByIdAndDelete(req.params.id);
  if (!review) {
    return next(new AppError('No review found with that ID', 404));
  }
  if (review.user.id != req.user.id && req.user.role != 'admin') {
    return next(new AppError('You are not allowed to delete this review', 401));
  }
  //Update the rating and quantity of the tours after deleting the review
  Review.calcAvgRating(review.tour);
  return res.status(200).json({
    status: 'success',
    data: user,
  });
});

exports.updateReview = catchAsync(async (req, res, next) => {
  //   let user = await User.findById(req.user.id)
  //   .populate({ path: 'wishList' })
  //   .populate({ path: 'booking' });

  // const reviews = await Review.find({ user: req.user.id }).populate({
  //   path: 'tour',
  //   select: 'name imageCover price summary',
  // });
  // user = { ...user._doc, reviews };
  // const review = await Review.findByIdAndUpdate(req.params.id, req.body, {
  //   new: true,
  //   runValidators: true
  // });
  const review = await Review.findById(req.params.id);
  if (!review) {
    return next(new AppError('No review found with that ID', 404));
  }
  if (review.user.id != req.user.id) {
    return next(new AppError('You are not allowed to update this review', 401));
  }
  review.rating = req.body.rating;
  review.review = req.body.review;
  review.createdAt = Date.now();
  await review.save();

  const reviews = await Review.find({ user: req.user.id }).populate({
    path: 'tour',
    select: 'name imageCover price summary',
  });

  //Update the rating and quantity of the tours after updating the review
  Review.calcAvgRating(review.tour);
  return res.status(200).json({
    status: 'success',
    data: {
      reviews,
    },
  });
});

exports.getMyReviews = catchAsync(async (req, res, next) => {
  console.log('Reviewssssssssssssssssssssssss');
  const reviews = await Review.find({ user: req.user.id }).populate({
    path: 'tour',
    select: 'name imageCover price summary',
  });
  return res.status(200).json({
    status: 'success',
    results: reviews.length,
    data: {
      reviews,
    },
  });
});
