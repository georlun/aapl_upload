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
var ejs = require('ejs');
var logger = require('morgan');
var mongoose = require('mongoose');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
//SET to use environment variable for path of the user data directory storing images 
//var user_data = process.env.USERDATA;

app.use(logger('dev'));
app.use(function (req, res, next) { //allow cross origin requests
    res.setHeader("Access-Control-Allow-Methods", "GET");
    res.header("Access-Control-Allow-Origin", "*");
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
//app.use('/apphoto', express.static(user_data)); // mount the photo repository root directory
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

var server = app.listen(nPort, function () {
    var host = server.address().address;
    var port = server.address().port;

    console.log("AAPL app listening at http://%s:%s", host, port);
});