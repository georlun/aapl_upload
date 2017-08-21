//
// Server side Node.js Express Web Server
//
// author: George Lun
// date: 08-08-2017 
//
//	For AAPL Application
//
'use strict';
var nPort = process.env.PORT || 8080;
var express = require('express');
var app = express();
var multer = require('multer');
var fs = require('fs');
var path = require('path');
var ejs = require('ejs');
var logger = require('morgan');
var mongoose = require('mongoose');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var user_data = './userdata/';

app.use(logger('dev'));
app.use(function (req, res, next) { //allow cross origin requests
    res.setHeader("Access-Control-Allow-Methods", "POST, PUT, OPTIONS, DELETE, GET");
    res.header("Access-Control-Allow-Origin", "http://localhost");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// DB configuration
var configDB = require('./config/database.js');
// connect to our database
mongoose.connect(configDB.url, {
					useMongoClient: true
					/* other options */
});

// mongoDB debugger
//var mongodb = require('mongodb');
//var mongoDebug = require('node-mongodb-debug-log');
/* Using the default values */
//mongoDebug.install(mongodb);

/** Serving from the same express Server
No cors required */
app.set('view engine', 'ejs');  //tell Express we're using EJS
//app.set('views', __dirname + '/views');  //set path to *.ejs files
app.use(express.static(__dirname));
app.use(cookieParser()); // read cookies (needed for auth)
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Passport configuration
var session = require('express-session');
var passport = require('passport');
var flash = require('connect-flash');
// required for passport
app.use(session({ secret: 'mySecretKey', 
					resave: true,
					saveUninitialized: true })); // session secret
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
app.use(flash()); // use connect-flash for flash messages stored in session

// initialize passport
var initPassport = require('./config/passport.js');
initPassport(passport); // pass passport for configuration

// routes
require('./routes.js')(app, passport); // load our routes and pass in our app and fully configured passport

var storage = multer.diskStorage({ //multers disk storage settings
    destination: function (req, file, cb) {
		//console.log(req.body);
		var key=req.body.value1;
		var date=req.body.value2;
		var dest_dir = user_data + key + "/" + date;
		//console.log("upload dest dir = " + dest_dir);
        cb(null, dest_dir);
    },
    filename: function (req, file, cb) {
        var datetimestamp = Date.now();
        cb(null, file.fieldname + '-' + datetimestamp + '.' + file.originalname.split('.')[file.originalname.split('.').length - 1]);
    }
});
var upload = multer({ //multer settings
    storage: storage
}).single("imgUpload"); //File key for upload; on a single basis i.e. one file at a time
//}).array("imgUploader", 3); //Field name and max count

/** API path that will upload the files */
app.post('/upload', function (req, res) {
    upload(req, res, function (err) {
		//console.log(req.body);
        if (err) {
            res.json({ error_code: 1, err_desc: err });
            return res.end("Something went wrong!");
        }
        res.json({ error_code: 0, err_desc: null });
        return res.end("File uploaded sucessfully!.");
    });
});

var server = app.listen(nPort, function () {
    var host = server.address().address;
    var port = server.address().port;

    console.log("AAPL app listening at http://%s:%s", host, port);
});