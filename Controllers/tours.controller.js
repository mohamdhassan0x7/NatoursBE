const Tour = require('../Models/Tours');
const APIFeatures = require('../Util/apiFeatures');
const AppError = require('../Util/appError');
const catchAsync = require('../Util/catchAsync');
const cloudinary = require('../Util/cloudinary.config');

exports.createTour = catchAsync(async (req, res, next) => {
  const newTour = await Tour.create(req.body);
  const image = req.file.destination + '/' + req.file.filename;

  res.status(201).json({
    status: 'success',
    data: {
      tour: newTour,
    },
  });
});

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = 5;
  req.query.sort = '-ratingsAverage,price';
  next();
};

exports.getAllTours = catchAsync(async (req, res, next) => {

  const allTours = await Tour.find();
  const maxPrice = Math.max(...allTours.map(tour => tour.price));
  const minPrice = Math.min(...allTours.map(tour => tour.price));


  //Filter Features

  //EXTRACTING THE QUERY
  // let queryObj = {...req.query}                                             //Deep copy of the query object
  // const excludedFields = ['page', 'sort', 'limit', 'fields']                //Define the fields that we want to exclude from the query (can't be used in the query)
  // excludedFields.forEach(el => delete queryObj[el])                         //Delete the excluded fields from the query object
  // queryObj = JSON.stringify(queryObj)                                       //Convert the query object to a string
  // queryObj = queryObj.replace(/\b(gte|gt|lte|lt)\b/g, match=>`$${match}`)   //Replace the gte, gt, lte, lt with $gte, $gt, $lte, $lt (MongoDB operators)
  // queryObj = JSON.parse(queryObj)                                           //Convert the string to a JSON object

  // let query = Tour.find(queryObj);                                          //Find the tours based on the query object

  //SORTING
  // if (req.query.sort){
  //   const sortBy = req.query.sort.split(',').join(' ');                     //Split the sort query and join it with a space
  //   query = query.sort(sortBy)                                              //Sort the tours based on the sort query
  // }else{
  //   query = query.sort('-createdAt, _id')                                   //Sort the tours based on the createdAt field
  // }

  //LIMITING FIELDS
  // if(req.query.fields){
  //   const fields = req.query.fields.split(',').join(' ');                   //Split the fields query and join it with a space
  //   query = query.select(fields)                                            //Select the fields based on the fields query
  // }else{
  //   query = query.select('-__v')                                            //Select all the fields except the __v field
  // }

  //PAGINATION
  // const page  = req.query.page  * 1 || 1;                                   //Convert the page query to a number or set it to 1
  // const limit = req.query.limit * 1 || 100;                                 //Convert the limit query to a number or set it to 100
  // const skip = (page-1) * limit;                                            //Calculate the number of documents to skip

  // query = query.skip(skip).limit(limit);                                    //Skip the number of documents and limit the number of documents
  const features = new APIFeatures(Tour.find(), req.query)
    .filter()
    .sort()
    .limit()
    .paginate();

  await features.calculateTotal();
  //Execute the query
  const tours = await features.query;
  const totalDocuments = features.totalDocuments;
  const totalPages = Math.ceil(totalDocuments / (req.query.limit * 1 || 100));
  res.status(200).json({
    status: 'success',
    maxPrice,
    minPrice,
    totalPages,
    data: {
      tours,
    },
  });
});

exports.getOneTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findById(req.params.id).populate({
    path: 'reviews',
    populate: {
      path: 'user',
    }
  });

  //handle the error if the tour is not found
  if (!tour) {
    return next(new AppError('No tour found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      tour,
    },
  });
});

exports.updateTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
    runValidators: true, //run model validators on the update value
    new: true, //return the new updated value
  });
  //handle the error if the tour is not found
  if (!tour) {
    return next(new AppError('No tour found with that ID', 404));
  }
  res.status(200).json({
    status: 'success',
    tour,
  });
});

exports.deleteTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findByIdAndDelete(req.params.id);
  //handle the error if the tour is not found
  if (!tour) {
    return next(new AppError('No tour found with that ID', 404));
  }
  res.status(204).json({
    status: 'success',
  });
});

exports.toursStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 }, secretTour: { $ne: true } },
    },
    {
      $group: {
        _id: '$difficulty',
        numTours: { $sum: 1 },
        avgRating: { $avg: '$ratingsAverage' },
        maxPrice: { $max: '$price' },
        minPrice: { $min: '$price' },
      },
    },
    {
      $sort: {
        avgRating: 1,
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats,
    },
  });
});

exports.monthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1;

  const plan = await Tour.aggregate([
    { $match: { secretTour: { $ne: true } } },
    {
      $unwind: '$startDates',
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        numTours: { $sum: 1 },
        tours: { $push: '$name' },
      },
    },
    {
      $addFields: {
        month: '$_id',
      },
    },
    {
      $project: {
        _id: 0,
      },
    },
    {
      $sort: {
        numTours: -1,
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      plan,
    },
  });
});

exports.getToursWithin = catchAsync(async(req, res, next)=>{
  const {distance, latlng, unit} = req.params;
  const [lat, lng] = latlng.split(',')
  if(!lat || !lng){
    next(new AppError('please provide latitude and longitude in the format lat,lng', 400))
  }
  //convert the distance to radians by dividing it by the radius of the earth based on the unit (mile of kilometer)
  const radius = unit === 'mi'? distance/3963.2 : distance/6378.1;

  const tours = await Tour.find({
    startLocation: {$geoWithin: {$centerSphere: [[lng, lat], radius]}}
  })

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours
    }
  })
})

exports.getDistances = catchAsync(async(req, res, next)=>{
  const {latlng, unit} = req.params;
  const [lat, lng] = latlng.split(',')
  if(!lat || !lng){
    next(new AppError('please provide latitude and longitude in the format lat,lng', 400))
  }
  //create multiplier, to convert resulted distance(whic is in meters) to miles or kilometers based on the unit(mile or kilometer
  const multiplier = unit === 'mi'? 0.000621371 : 0.001;  
  const tours = await Tour.aggregate([{
    $geoNear: {
      near: {
        type: 'Point',
        coordinates: [lng*1, lat*1]
      },
      distanceField: 'distance',
      distanceMultiplier: multiplier
    }
    },
    {
      $project: {
        distance: 1,
        name: 1
      }

    }])
  res.status(200).json({
    status: 'success',
    data: {
      data: tours
    }
  })
})


exports.addTourImageCover = catchAsync(async(req, res, next)=>{
    const tour = await Tour.findById(req.params.id);
    if(!tour){
      return next(new AppError('No tour found with that ID', 404));
    }
    if(!req.file){
      return next(new AppError('Please upload an image', 400));
    }
    const image = await cloudinary.uploader.upload(req.file.path,{
      folder: `tour/${tour._id}/imageCover`
    });

    console.log(image)
    tour.imageCover = image.secure_url;
    await tour.save({validateBeforeSave: false});
    res.status(200).json({
      status: 'success',
      data: {
        tour
      }
    })
})

exports.addTourImages = catchAsync(async(req, res, next)=>{
  const tour = await Tour.findById(req.params.id);
  if(!tour){
    return next(new AppError('No tour found with that ID', 404));
  }
  const images = []
  for (const file of req.files) {
    const image = await cloudinary.uploader.upload(file.path,{
      folder: `tour/${tour._id}/images`
    })
    images.push(image.secure_url);
  }
  tour.images = images;
  await tour.save({validateBeforeSave: false});
  res.status(200).json({
    status: 'success',
    data: {
      tour
    }
  })
})