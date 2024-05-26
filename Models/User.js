const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'Please tell us your name'],
  },
  lastName: {
    type: String,
    required: [true, 'Please tell us your last name'],
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email'], //Validator.isEmail is a fnction but we don't need to call it because it's called by mongoose so we just pass the reference to it
    unique: [true, 'This email is already exist'],
  },
  photo: String,
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 8,
    select: false, //this will not show the password in the output
  },
  passwordConfirem: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: [
      function (el) {
        return el === this.password;
      },
      'Password are not the same',
    ],
  },
  passwordChangedAt: {
    type: Date,
    default: Date.now(),
    select: false,
  },
  passwordResetToken: String,
  passwordResetExpires: Date,
  active:{
    type: Boolean,
    default: true,
  },
  wishList: [
    {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
    },
  ],
  booking: [{
    type: mongoose.Schema.ObjectId,
    ref: 'Tour',
  }]
  ,
});



//to disable all users who have been deleted
userSchema.pre(/^find/, function(next){
  this.find({active: {$ne: false}});
  next();
})


userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
    this.passwordChangedAt = Date.now() - 1000;  //this is to make sure that the token is created after the password is changed
    //we don't need to store the passwordConfirem in the database so we set it to undefined
    this.passwordConfirem = undefined;
  }
  next();
});

userSchema.methods.correctPassword = async function (
  inputPassword,
  userPassword,
) {
  return await bcrypt.compare(inputPassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWT_iat) {
  if (this.passwordChangedAt){
    const JWT_inSec = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWT_inSec < this.passwordChangedAt;
  }
  return false;
};

userSchema.methods.createPasswordResetToken = function(){
  //Create a random token and save hashed version of it in the database to compare with it, and send the random token to the user
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; //10 minutes from creating the token
  //console.log({resetToken}, this.passwordResetToken);
  return resetToken;
}

// userSchema.pre(/^find/, function (next) {
//   this.
//   populate({
//     path: 'wishList',
//   }); 

//   next();
// });



const user = mongoose.model('User', userSchema);
  
module.exports = user;