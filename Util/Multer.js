const multer  = require('multer');
const AppError = require('./appError');

const multerValidation ={
    image: ['image/jpeg','image/png','image/jpg', 'image/gif'],
}

function myMulter(){

    const storage = multer.diskStorage({});
    function fileFilter(req, file, cb){
        if(multerValidation.image.includes(file.mimetype)){
            cb(null, true);
        }else{
            cb( new AppError('Invalid Format'), false);
        }
    }

    const upload = multer({dest: 'Upload' ,fileFilter, storage: storage});
    return upload;
}
module.exports = {myMulter};