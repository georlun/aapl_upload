// models/incident.js
// load the incident DB schema
var mongoose = require('mongoose');

var incidentSchema = mongoose.Schema({

        regnum		: String,
        date		: String,
		time		: String,
		claimtype	: String,
        location	: String,
		sender		: String,
		ins_comp	: String,
		senddate	: String,
		img_id		: [{grid_id: String, filename: String}]

});

// create the model for incidents and expose it to our app
module.exports = mongoose.model('Incident', incidentSchema);
