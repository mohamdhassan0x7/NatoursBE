const mongoose = require('mongoose');
const slugify = require('slugify');
const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please enter the tour name'],
      unique: true,
      trim: true,
      maxlength: [40, 'A tour name must have less or equal than 40 characters'],
      minlength: [10, 'A tour name must have more or equal than 10 characters'],
    },
    duration: {
      type: Number,
      required: [true, 'Please enter the tour duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'Please enter the tour group size'],
    },
    numBookings: {
      type: Number,
      default: 0,
    },
    difficulty: {
      type: String,
      required: [true, 'Please enter the tour difficulty'],
    },
    price: {
      type: Number,
      required: [true, 'Please enter the tour price'],
    },
    priceDiscount: Number,
    summary: {
      type: String,
      required: [true, 'Please enter the tour summary'],
      trim: true, //remove the white space from the start and end of the string
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'Please enter the tour image cover'],
    },
    images: [String],
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be below 5.0'],
      set: (val) => Math.round(val * 10) / 10, //Round the rating to the nearest 0.5
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    startDates: [Date],
    slug: String,
    secretTour: {
      type: Boolean,
      default: false,
      select: false,
    },
    startLocation: {
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number],
      address: String,
      description: String,
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: String,
      },
    ],
    guides: [
      {
        //reference to the User model
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    //virtual properties to be returned in the response
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
//create a geospatial index for the startLocation field to avoid the performance issues in 'tours-within' route
tourSchema.index({ startLocation: '2dsphere' });

//create virtual properties that are not stored in the database but calculated and returned in the response
tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});

//Create a virtual property that populates the reviews for a tour
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id',
});

tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });

  next();
});

tourSchema.pre(/^find/, function (next) {
  //use regex to run this middleware for all the find queries
  this
    //edit current query to exclude the secret tours
    .find({ secretTour: { $ne: true } })
    //populate the guides field with the name, email and role fields
    .populate({
      path: 'guides',
      select: 'name email role photo',
    });

  next();
});

// tourSchema.pre('aggregate', function (next) {
//   this.pipeline().unshift();
//   next();
// });

const Tour = new mongoose.model('Tour', tourSchema);

module.exports = Tour;
