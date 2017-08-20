// models/user.js
// load the user DB schema
var mongoose = require('mongoose');

var userSchema = mongoose.Schema({

    local            : {
        email        : String,
        password     : String,
		company      : String
    }
//    facebook         : {
//        id           : String,
//        token        : String,
//        email        : String,
//        name         : String
//    },
//    twitter          : {
//        id           : String,
//        token        : String,
//        displayName  : String,
//        username     : String
//    },
//    google           : {
//        id           : String,
//        token        : String,
//        email        : String,
//        name         : String
//    }

});

// create the model for users and expose it to our app
module.exports = mongoose.model('User', userSchema);
