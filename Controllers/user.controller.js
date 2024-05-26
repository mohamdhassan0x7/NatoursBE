const User = require('./../Models/User');
const catchAsync = require('./../Util/catchAsync');
const AppError = require('../Util/appError');
const Tour = require('../Models/Tours');
const Review = require('./../Models/Reviews');
const cloudinary = require('../Util/cloudinary.config');

exports.allUsers = catchAsync(async (req, res, next) => {
  const users = await User.find();
  return res.status(200).json({
    status: 'success',
    length: users.length,
    data: {
      users,
    },
  });
});

exports.updateMe = catchAsync(async (req, res, next) => {
  console.log(req.body);
  const { firstName, lastName } = req.body;
  if (!firstName || !lastName) {
    return next(new AppError('Please provide updated data', 400));
  }
  const user = await User.findByIdAndUpdate(
    req.user.id,
    { firstName, lastName },
    { runValidators: true, new: true },
  );
  return res.status(200).json({
    status: 'success',
    data: {
      user,
    },
  });
});

exports.deactiveMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });
  return res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.getMe = catchAsync(async (req, res, nex) => {
  let user = await User.findById(req.user.id);
  //   .populate({ path: 'wishList' })
  //   .populate({ path: 'booking' });

  // const reviews = await Review.find({ user: req.user.id }).populate({
  //   path: 'tour',
  //   select: 'name imageCover price summary',
  // });
  // user = { ...user._doc, reviews };
  // console.log(reviews);
  return res.status(200).json({
    status: 'success',
    data: {
      user,
    },
  });
});

exports.getMyWishlist = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).populate({
    path: 'wishList',
    select: 'name imageCover price summary',
  });
  return res.status(200).json({
    status: 'success',
    data: {
      wishList: user.wishList,
    },
  });
});

exports.getMyBooking = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).populate({
    path: 'booking',
    select: 'name imageCover price summary',
  });
  return res.status(200).json({
    status: 'success',
    data: {
      booking: user.booking,
    },
  });
});

exports.addTourToWishlist = catchAsync(async (req, res, next) => {
  const user = req.user;
  const tourId = req.body.tourId;
  const tour = await Tour.findById(tourId);
  if (!tour) {
    return next(new AppError('No tour found with that ID', 404));
  }
  if (user?.wishList?.includes(tourId)) {
    return next(new AppError('Tour already in your wishlist', 400));
  }
  if (!user.wishList) user.wishList = [];
  user.wishList.push(tourId);
  await user.save({ validateBeforeSave: false });

  return res.status(200).json({
    status: 'success',
    data: {
      user,
    },
  });
});

exports.removeTourFromWishlist = catchAsync(async (req, res, next) => {
  const user = req.user;
  const tourId = req.body.tourId;
  const tour = await Tour.findById(tourId);
  if (!tour) {
    return next(new AppError('No tour found with that ID', 404));
  }
  if (!user.wishList.includes(tourId)) {
    return next(new AppError('Tour not found in your wishlist', 400));
  }
  user.wishList = user.wishList.filter((el) => el != tourId);
  await user.save({ validateBeforeSave: false });

  return res.status(200).json({
    status: 'success',
  });
});

exports.addBooking = catchAsync(async (req, res, next) => {
  // const id = req.user._id;
  const user = req.user;
  console.log(user);
  let { tourId, numTickets } = req.body;
  if (!numTickets || numTickets < 1) numTickets = 1;
  const tour = await Tour.findById(tourId);
  if (!tour) {
    return next(new AppError('No tour found with that ID', 404));
  }

  if (user?.booking?.includes(tourId)) {
    return next(new AppError('Tour already in your booking', 400));
  }
  // if (!user.booking) user.booking = [];
  user.booking.push(tourId);
  await user.save({ validateBeforeSave: false });

  tour.numBookings += numTickets;
  await tour.save({ validateBeforeSave: false });

  return res.status(200).json({
    status: 'success',
    data: {
      user,
    },
  });
});

exports.removeBooking = catchAsync(async (req, res, next) => {
  const user = req.user;
  const { tourId, numTickets } = req.body;
  const tour = await Tour.findById(tourId);
  if (!tour) {
    return next(new AppError('No tour found with that ID', 404));
  }

  console.log(user.booking);
  console.log(tourId);
  if (!user.booking.includes(tourId)) {
    return next(new AppError('You have not booked this tour', 400));
  }
  user.booking = user.booking.filter((el) => el != tourId);
  await user.save({ validateBeforeSave: false });

  tour.numBookings -= numTickets;
  await tour.save({ validateBeforeSave: false });

  return res.status(200).json({
    status: 'success',
  });
});

exports.updateProfilePic = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('Please upload a photo', 400));
  }
  const { secure_url } = await cloudinary.uploader.upload(req.file.path, {
    folder: `user/${req.user.id}/photo`,
  });
  await User.findByIdAndUpdate(req.user.id, { photo: secure_url });
  const user = await User.findById(req.user.id);
  return res.status(200).json({
    status: 'success',
    data: {
      user,
    },
  });
});

//Only for Admin
exports.deleteUser = catchAsync(async (req, res, next) => {
  await User.findByIdAndDelete(req.params.id);
  return res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.getUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }
  return res.status(200).json({
    status: 'success',
    data: {
      user,
    },
  });
});

exports.IsInMyWishlist = catchAsync(async (req, res, next) => {
  const user = req.user;
  console.log(user.wishList);
  const tourId = req.params.tourId;
  console.log(tourId);
  if (user.wishList.includes(tourId)) {
    return res.status(200).json({
      status: 'success',
      data: {
        isInWishlist: true,
      },
    });
  }
  return res.status(200).json({
    status: 'success',
    data: {
      isInWishlist: false,
    },
  });
});

exports.IsInMyBooking = catchAsync(async (req, res, next) => {
  const user = req.user;
  const tourId = req.params.tourId;
  if (user.booking.includes(tourId)) {
    return res.status(200).json({
      status: 'success',
      data: {
        isInBooking: true,
      },
    });
  }
  return res.status(200).json({
    status: 'success',
    data: {
      isInBooking: false,
    },
  });
});
