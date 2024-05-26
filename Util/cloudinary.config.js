// import {v2 as cloudinary} from 'cloudinary';

const cloudinary = require('cloudinary').v2;

cloudinary.config({ 
  cloud_name: 'ds1ti1cyb', 
  api_key: '628293338998442', 
  api_secret: 'jhNLgUURnfxFRXLP3XgLysBV5UQ' 
});
module.exports = cloudinary;