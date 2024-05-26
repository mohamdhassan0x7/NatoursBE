const User = require('./../Models/User');
const catchAsync = require('./../Util/catchAsync');
const AppError = require('../Util/appError');
const sendEmail = require('../Util/email');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const cloudinary = require('../Util/cloudinary.config');

const sendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 60 * 60 * 1000,
    ),
    // httpOnly: true,
  };

  //if we are in production, we need to set the cookie to secure to be sent only in https
  // if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
  // res.cookie('jwt', token, cookieOptions);

  //Remove the password from the output
  user.password = undefined;
  return res.cookie('jwt', token, cookieOptions).status(statusCode).json({
    status: 'success',
    token,
    User: user,
  });
};

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

exports.signUp = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email,
    password: req.body.password,
    passwordConfirem: req.body.passwordConfirem,
  });
  return res.status(201).json({
    status: 'success',
    data: {
      user: newUser,
    },
  });
});

exports.uploadImageForSignUp = catchAsync(async (req, res, next) => {
  console.log(req.body);
  if (!req.file) {
    return next(new AppError('Please upload a photo', 400));
  }
  const { secure_url } = await cloudinary.uploader.upload(req.file.path, {
    folder: `user/${req.params.id}/photo`,
  });
  await User.findByIdAndUpdate(req.params.id, { photo: secure_url });
  return res.status(200).json({
    status: 'success',
    data: {
      secure_url,
    },
  });
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  const user = await User.findOne({ email }).select('+password'); //+ sign to include the password in the output

  if (!user || !(await user.correctPassword(password, user.password))) {
    //we made the correct password check inside the if condition to avoid the error of the user is null
    return next(new AppError('Incorrect email or password', 401)); //401 unauthorized
  }

  sendToken(user, 200, res);
});

exports.logout = catchAsync(async (req, res, next) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  return res.status(200).json({
    status: 'success',
  });
});

exports.checkUserLoggedIn = catchAsync(async (req, res, next) => {
  //1) Getting token and check if it's there
  let token;
  if (req.cookies?.jwt) {
    token = req.cookies.jwt;
  }
  // if (
  //   req.headers.authorization  &&
  //   req.headers.authorization.startsWith('Bearer')
  // ) {
  //   token = req.headers.authorization.split(' ')[1];
  // }
  else {
    return next(
      new AppError('You are not logged in! Please log in to get access', 401),
    );
  }

  //2) Verification token
  const decoded = await jwt.verify(token, process.env.JWT_SECRET);

  //3) Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    next(
      new AppError(
        'The user belonging to this token does no longer exist',
        401,
      ),
    );
  }

  //4) Check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! Please log in again.', 401),
    );
  }

  //GRANT ACCESS TO PROTECTED ROUTE
  //As this method used as middleware, we can pass the user to the next middleware(edit the request object to add the user to it)
  req.user = currentUser;
  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403),
      );
    }
    next();
  };
};

exports.forgetPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with this email', 404));
  }
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  //send it to user's email
  const resetURL = `${req.protocol}://${req.get(
    'host',
  )}/api/v1/users/resetPassword/${resetToken}`;

  const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.\nIf you didn't forget your password, please ignore this email!`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Your password reset token (valid for 10 min)',
      message,
    });

    return res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError('There was an error sending the email. Try again later!'),
      500,
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  //1) Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  //2) If token has not expired, and there is user, set the new password
  user.password = req.body.password;
  user.passwordConfirem = req.body.passwordConfirem;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  //We always use save() method to run the validators and the pre-save middleware
  await user.save();
  //3) Update changedPasswordAt property for the user (done in the pre-save middleware)
  //4) Log the user in, send JWT
  sendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  console.log('update password');
  console.log(
    req.body.newPassword,
    req.body.newPasswordConfirm,
    req.body.currentPassword,
  );
  //1) Get user from collection
  const user = await User.findById(req.user.id).select('+password');
  //2) Check if posted current password is correct
  const compare = await user.correctPassword(
    req.body.currentPassword,
    user.password,
  );
  //3) If so, update password
  if (!compare) {
    return next(new AppError('Current password is wrong', 401));
  }
  user.password = req.body.newPassword;
  user.passwordConfirem = req.body.newPasswordConfirm;
  await user.save();

  sendToken(user, 200, res);
});

/*Front-end:
  for session: 
  1 >> create array: 
          messeges = []
          messeges.append({
                      "role": "system",
                      "content": """You are mr.Alex, an expert technical assistant who is helping a customer to find best product (laptop, mobile phones, etc) for their needs,
                                  and answer his technical questions, and provide him comparisons if needed,make your answers to the point 
                                  If a question does not make any sense, or is not factually coherent, explain why instead of answering something not correct. 
                                  If you don't know the answer to a question, please don't share false information."""
                  })

  1 >> take user input message 
        m = {
          "role":"user",
          "content": **USER MESSEGE**
        }
        messeges.append(m)

  2 >> Call API sending messeges array in req body. 
  3 >> display response.content
  4 >> messeges.append(response)

  5 >> for new user input in same session --> return to step 2

  ** FOR NEW SESSION START FROM BEGGINING

*/
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// exports.chatBot = (req, res, next) => {
//   var spawn = require('child_process').spawn;
//   var childPy = spawn('python', [
//     './Util/Llama2_model.py',
//     JSON.stringify(req.body.messeges),
//   ]);

//   childPy.stdout.on('data', (data) => {
//     const AI_response = JSON.parse(data.toString());
//     return res.status(200).json({
//       status: 'success',
//       response: AI_response,
//     });
//   });

//   childPy.stderr.on('data', (data) => {
//     console.log('Error:', data.toString());
//   });

//   childPy.on('close', (code) => {
//     console.log('closed');
//   });
// };

// const Llama = require('../Util/Llama2_model')

const axios = require('axios');

exports.chatBot = (req, res, next) => {
  const messeges = req.body.messeges;
  const sys = process.env.LLAMA_SYS_MSG;
  messeges.unshift(JSON.parse(sys));
  axios
    .post(
      process.env.LLAMA_URL,
      {
        model: process.env.LLAMA_MODEL,
        max_tokens: 250,
        temperature: 0.7,
        top_p: 0.7,
        top_k: 50,
        repetition_penalty: 1,
        stop: ['[/INST]', '</s>'],
        messages: messeges,
      },
      {
        headers: {
          Authorization: process.env.LLAMA_TOKEN,
        },
      },
    )
    .then(
      (response) => {
        return res.status(200).json({
          status: 'success',
          response: response['data']['choices'][0]['message'],
        });
      },
      (error) => {
        console.log(error);
      },
    );
};

//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
