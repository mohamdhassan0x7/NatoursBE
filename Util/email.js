const nodemailer = require('nodemailer');

const sendEmail = async options => {
  // 1) Create a transporter
  
  var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'mhmdhssan42@gmail.com',
      pass: '01094762709'
    }
  });
  
  var mailOptions = {
    from: 'youremail@gmail.com',
    to: 'myfriend@yahoo.com',
    subject: 'Sending Email using Node.js',
    text: 'That was easy!'
  };
  
  transporter.sendMail(mailOptions, function(error, info){
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
};

module.exports = sendEmail;
