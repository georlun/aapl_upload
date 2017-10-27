// models/imagedata.js
// load the image data DB schema
var mongoose = require('mongoose');

var imageDataSchema = mongoose.Schema({

        filename	: String,
		contentType	: String,
		data		: String
		//data		: Buffer
		
});

// create the model for image data and expose it to our app
module.exports = mongoose.model('imageData', imageDataSchema);
