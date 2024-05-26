const express = require('express');
const Router = express.Router();

const authController = require('../Controllers/auth.controller');
const userController = require('../Controllers/user.controller');
const { myMulter } = require('../Util/Multer');


Router.post('/chatBot', authController.chatBot)

//does not require authentication
Router.post('/signUp', authController.signUp);
Router.patch('/uploadImageForSignUp/:id', myMulter().single('photo'), authController.uploadImageForSignUp);
Router.post('/login', authController.login);
Router.get('/logout', authController.logout);
Router.post('/forgetPassword', authController.forgetPassword);
Router.patch('/resetPassword/:token', authController.resetPassword);

//requires authentication
//all routes after this middleware will require authentication
Router.use(authController.checkUserLoggedIn);

//update profile picture
Router.patch('/profilePic',myMulter().single('photo'), userController.updateProfilePic);
Router.patch('/updatePassword', authController.updatePassword);
Router.patch('/updateMe', userController.updateMe);
Router.patch('/deactiveMe', userController.deactiveMe);
Router.get('/me', userController.getMe);
Router.patch('/addWishList', userController.addTourToWishlist);
Router.patch('/removeWishList', userController.removeTourFromWishlist);
Router.patch('/addBooking', userController.addBooking);
Router.patch('/removeBooking', userController.removeBooking);
Router.get('/getWishList', userController.getMyWishlist);
Router.get('/getBooking', userController.getMyBooking);

Router.get('/checkWishList/:tourId', userController.IsInMyWishlist);
Router.get('/checkBooking/:tourId', userController.IsInMyBooking);

//Only for Admin
Router.use(authController.restrictTo('admin'));
Router.get('/',  userController.allUsers);
Router.delete('/deleteUser/:id', userController.deleteUser);
Router.get('/getUser/:id', userController.getUser);



module.exports = Router;
