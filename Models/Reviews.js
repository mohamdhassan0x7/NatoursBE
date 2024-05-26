const mongoose = require('mongoose');

const Tour = require('./Tours');

const reviewsSchema = mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Please enter the review content'],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: [true, 'Please provide a rating between 1 and 5'],
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user'],
    },
  },
  {
    //virtual properties to be returned in the response
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

//Prevent duplicate reviews for the same user
//make the combination of tour and user unique, only one review for each user for each tour

// Create a new unique compound index
reviewsSchema.index({ tour: 1, user: 1 }, { unique: true ,message: 'This review already exists.'});

reviewsSchema.pre(/^find/, function (next) {
  //return the user name and with the review
  this.populate({
    path: 'user',
  });
  next();
});


// ******** UPDATE THE RATING AND QUANTITY OF THE TOURS AFTER CREATING, UPDATING OR DELETING ANY REVIEW ********
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//we used static method because we want to call the method on the model not on an instance of the model
reviewsSchema.statics.calcAvgRating = async function (tourId) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: tourId,
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);
  //handle the case when there are no reviews
  if (stats.length === 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
    return;
  }

  await Tour.findByIdAndUpdate(tourId, {
    ratingsQuantity: stats[0].nRating,
    ratingsAverage: stats[0].avgRating,
  });
}
// 1 >> Create new Review
reviewsSchema.post('save', function () {
  //this points to the current review (document), to run the the static method we need to call it using the model itself not specific document
  //this.constructor points to the model that created the document
  this.constructor.calcAvgRating(this.tour);
  //we used post not pre because we need to wait until the document is saved to calculate the average rating
  //post >> doesn't use next() because it's after the document is saved
});

// 2 >> Update or Delete Review
//findByIdAndUpdate and findByIdAndDelete handeled in the endpoints in the controller
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const Review = mongoose.model('Review', reviewsSchema);
module.exports = Review;