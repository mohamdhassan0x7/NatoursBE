const { isObjectIdOrHexString } = require("mongoose");
const { isNumeric } = require("validator");

class APIFeatures {
  constructor(mongooseQuery, requestQuery) {
    this.query = mongooseQuery;
    this.requestQuery = requestQuery;
  }
  async calculateTotal() {
    let queryObj = { ...this.requestQuery };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach((el) => delete queryObj[el]);
    queryObj = JSON.stringify(queryObj);
    queryObj = queryObj.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
    queryObj = JSON.parse(queryObj);
    
    // Apply regex transformation to handle string queries
    Object.keys(queryObj).forEach(key => {
      if (isNaN(queryObj[key]) && typeof(queryObj[key]) !== 'object') {
        queryObj[key] = { $regex: new RegExp(queryObj[key], 'i') };
      }
    });

    this.totalDocuments = await this.query.model.find(queryObj).countDocuments();
  }

  filter() {
    let queryObj = { ...this.requestQuery }; //Deep copy of the query object
    const excludedFields = ['page', 'sort', 'limit', 'fields']; //Define the fields that we want to exclude from the query (can't be used in the query)
    excludedFields.forEach((el) => delete queryObj[el]); //Delete the excluded fields from the query object
    queryObj = JSON.stringify(queryObj); //Convert the query object to a string
    queryObj = queryObj.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`); //Replace the gte, gt, lte, lt with $gte, $gt, $lte, $lt (MongoDB operators)
    //the url in post man will be like this: http://localhost:3000/api/v1/tours?duration[gte]=5&difficulty=easy



    queryObj = JSON.parse(queryObj); //Convert the string to a JSON object

    console.log(queryObj)
    Object.keys(queryObj).forEach(key => {
      if (isNaN(queryObj[key]) && typeof(queryObj[key]) !== 'object') {
          console.log(queryObj[key])
          queryObj[key] = { $regex: new RegExp(queryObj[key], 'i') };
           }
        });

    this.query = this.query.find(queryObj); //Find the tours based on the query object

    return this;
  }

  sort() {
    if (this.requestQuery.sort) {
      const sortBy = this.requestQuery.sort.split(',').join(' '); //Split the sort query and join it with a space
      this.query = this.query.sort(sortBy); //Sort the tours based on the sort query
    } else {
      this.query = this.query.sort('-createdAt, _id'); //Sort the tours based on the createdAt field
    }

    return this;
  }

  limit() {
    if (this.requestQuery.fields) {
      const fields = this.requestQuery.fields.split(',').join(' '); //Split the fields query and join it with a space
      this.query = this.query.select(fields); //Select the fields based on the fields query
    } else {
      this.query = this.query.select('-__v'); //Select all the fields except the __v field
    }

    return this;
  }

  paginate() {
    const page = this.requestQuery.page * 1 || 1; //Convert the page query to a number or set it to 1
    const limit = this.requestQuery.limit * 1 || 100; //Convert the limit query to a number or set it to 100
    const skip = (page - 1) * limit; //Calculate the number of documents to skip

    this.query = this.query.skip(skip).limit(limit); //Skip the number of documents and limit the number of documents

    return this;
  }
}

module.exports = APIFeatures;
