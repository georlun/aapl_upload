// config/passport.js
// load all the stuff as required by passport middleware
var LocalStrategy = require('passport-local').Strategy;
// load bi-sync encryption
var bcrypt   = require('bcrypt-nodejs');
// load up the user model
var User = require('../models/user');

// expose this function to our app using module.exports
module.exports = function(passport) {

    // ====================================
    // passport session setup =============
    // ====================================
    // required for persistent login sessions
    // passport needs ability to serialize and unserialize users out of session

    // used to serialize the user for the session
    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    // used to deserialize the user
    passport.deserializeUser(function(id, done) {
        User.findById(id, function(err, user) {
            done(err, user);
        });
    });

    // ====================================
    // LOCAL SIGNUP =======================
    // ====================================
    // we are using named strategies since we have one for login and one for signup
    // by default, if there was no name, it would just be called 'local'

    passport.use('local-signup', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField : 'email',
        passwordField : 'password',
        passReqToCallback : true // allows us to pass back the entire request to the callback
    },
    function(req, email, password, done) {
		//console.log("email = " + email);
		//console.log("pass = " + password);
        // asynchronous
		// nextTick will preempt the event loop to execute the callback as soon as it's readily available
        // User.findOne wont fire unless data is sent back
        process.nextTick(function() {

        // find a user whose email is the same as the forms email
        // we are checking to see if the user trying to login already exists
        User.findOne({ 'local.email' :  email }, function(err, user) {
            // if there are any errors, return the error
            if (err) {
				console.log('Error in SignUp: '+err);
                return done(err);
			}
			
            // check to see if theres already a user with that email
            if (user) {
				console.log('User already exists: '+user);
                return done(null, false, req.flash('signupMessage', 'That email is already taken.'));
            } else {

                // if there is no user with that email
                // create the user
				console.log('Create new user: '+email);
                var newUser            = new User();

                // set the user's local credentials
                newUser.local.email    = email;
                newUser.local.password = generateHash(password);
				newUser.local.company  = "";

                // save the user
                newUser.save(function(err) {
                    if (err) {
						console.log('Error in Saving user: '+err);
                        throw err;
						return done(null, false, req.flash('signupMessage', 'Error in saving User.'));
					}
                    return done(null, newUser, req.flash('signupMessage', 'Successfully registered User.'));
                });
            }
        });    

        });

    }));
	
	// ====================================
    // LOCAL LOGIN ========================
    // ====================================
	passport.use('local-login', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField : 'email',
        passwordField : 'password',
        passReqToCallback : true // allows us to pass back the entire request to the callback
    },
    function(req, email, password, done) { // callback with email and password from our form
		//console.log("email = " + email);
		//console.log("pass = " + password);
        // find a user whose email is the same as the forms email
        // we are checking to see if the user trying to login already exists
        User.findOne({ 'local.email' :  email }, function(err, user) {
            // if there are any errors, return the error before anything else
            if (err) {
				console.log('Error in Login: '+err);
                return done(err);
			}

            // if no user is found, return the message
            if (!user)
				// req.flash is the way to set flashdata using connect-flash
                return done(null, false, req.flash('loginMessage', 'Email Account does not exist, please register it first.'));

            // if the user is found but the password is wrong
            if (!isValidPassword(user, password))
				// create the loginMessage and save it to session as flashdata
                return done(null, false, req.flash('loginMessage', 'Wrong password for ' + user.local.email), req.flash('userMess', user.local.email));

            // all is well, return successful user
            return done(null, user);
        });

    }));
	
	// ===================================
    // LOCAL VIEW ========================
    // ===================================
	passport.use('local-view', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField : 'email',
        passwordField : 'password',
        passReqToCallback : true // allows us to pass back the entire request to the callback
    },
    function(req, email, password, done) { // callback with email and password from our form
		//console.log("passport req body parsing = " + JSON.stringify(req.body));
        // find a user whose email is the same as the input email
        // we are checking to see if the user trying to login already exists
        User.findOne({ 'local.email' :  email }, function(err, user) {
            // if there are any errors, return the error before anything else
            if (err) {
				console.log('Error in Login: '+err);
                return done(err);
			}

            // if no user is found, return the message
            if (!user)
				//req.flash is the way to set flashdata using connect-flash
                return done(null, false, req.flash('loginMessage', 'Email Account does not exist, please use the link below to register first.'), req.flash('userMess', email), req.flash('noUser', 'true'), req.flash('sInfo', req.body.sinfo));

            // if the user is found but the password is wrong
            if (!isValidPassword(user, password))
				// create the loginMessage and save it to session as flashdata
                return done(null, false, req.flash('loginMessage', 'Wrong password for ' + email), req.flash('userMess', email), req.flash('noUser', 'false'), req.flash('sInfo', req.body.sinfo));

            // all is well, return successful user
            return done(null, user, req.flash('sInfo', req.body.sinfo));
        });

    }));
	
	// methods
	// generating a hash
	generateHash = function(password) {
		return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
	};

	// checking if password is valid
	isValidPassword = function(user, password) {
		return bcrypt.compareSync(password, user.local.password);
	};

};