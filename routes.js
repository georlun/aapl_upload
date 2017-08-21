// routes.js
var fs = require('fs');
var path = require('path');
var bcrypt   = require('bcrypt-nodejs');
var User = require('./models/user');
var Incident = require('./models/incident');
var user_data = process.env.USERDATA;

module.exports = function(app, passport) {
	
	// =============
    // ROOT ========
    // =============
	// site root is protected by authentication,has to be done this way with express.static declaration
	app.get('/', isLoggedIn, function (req, res) {
		//console.log("access root...should redirect...");
		res.redirect('/login');
	});
	
	// =============
    // HOME ========
    // =============
	//redirect home page to perform authentication requirements
	app.get('/home', isLoggedIn, function (req, res) {
		//console.log("access home...");
		res.sendFile(__dirname + "/" + "index.html");
	});

    // =============
    // LOGIN =======
    // =============
    // show the login form
    app.get('/login', function(req, res) {
        // render the page and pass in any flash data if it exists
        res.render('login.ejs', { message: req.flash('loginMessage'), userm: req.flash('userMess') }); 
    });

    // process the login form
    app.post('/login', 
			passport.authenticate('local-login', {
				successRedirect : '/home', // successfully login, show the home page
				failureRedirect : '/login', // redirect back to the signup page if there is an error
				failureFlash : true // allow flash messages
			})
	);

    // =============
    // SIGNUP ======
    // =============
    // show the signup form
    app.get('/signup', function(req, res) {
        // render the page and pass in any flash data if it exists
        res.render('signup.ejs', { message: req.flash('signupMessage') });
    });

    // process the signup form
    app.post('/signup', 
			passport.authenticate('local-signup', {
				successRedirect : '/signup', // successfully registered
				failureRedirect : '/signup', // redirect back to the signup page if there is an error
				failureFlash : true // allow flash messages
			})
	);
	
	// ==================
    // SELF SIGNUP ======
    // ==================
    // show the signup form
    app.get('/selfsign', function(req, res) {
		//console.log("user = "+req.query.ur);
		//console.log("param = "+req.query.param);
        // render the page and pass in any flash data as page requires
        res.render('selfsign.ejs', { message: req.query.mess, userm: req.query.ur, que: req.query.param });
    });
	
	app.post('/selfsign', 
			function (req, res) {
				var redir_str;
				//console.log("selfsign post req body = " + JSON.stringify(req.body));
				if (req.body.password == req.body.passwordC) {
					// password confirmed, insert new User record and call View
					
					// create the user
					console.log('Create new user: '+ req.body.email);
					var newUser = new User();

					// set the user's credentials
					newUser.local.email = req.body.email;
					newUser.local.password = bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(8), null);
					newUser.local.company = "";

					// save the user
					newUser.save(function(err) {
						if (err) {
							console.log('Error in Saving user: '+err);
							throw err;
						}
					});

					var obj = JSON.parse(req.body.sinfo);
					redir_str = "/views?rn=" + obj.rn + "&dd=" + obj.dd + "&tm=" + obj.tm + "&ty=" + obj.ty + "&au=1";
					return res.redirect(redir_str);
				}
				else {
					redir_str = "/selfsign?ur=" + req.body.email + "&mess=Passwords do not match, please re-enter again&param=" + req.body.sinfo;
					return res.redirect(redir_str);
				}
			}
	);

    // =================
    // AUTH VIEWER =====
    // =================
    // we will want some GET pages to be protected so you have to be logged in to visit
	app.get('/aaplsin', function (req, res) {
		var reqst = req.query.snd;
		var reqq = JSON.stringify(req.query);
		//console.log("query = " + reqq);
		//console.log(req.query);
		
		res.render('viewauth.ejs', { message: req.flash('loginMessage'), userm: reqst, nouser: req.flash('noUser'), nouser: 'false', que: reqq });
	});
	
	app.get('/auth', function (req, res) {
		//console.log("param = "+req.query.param);
		res.render('viewauth.ejs', { message: req.flash('loginMessage'), userm: req.flash('userMess'), nouser: req.flash('noUser'), que: req.query.param });
	});
	
	// process the viewauth form
    app.post('/auth', 
			function (req, res, next) {
				//console.log("auth post req body = " + JSON.stringify(req.body));
				passport.authenticate('local-view', function(err, user, info) {
					//console.log("user = " + JSON.stringify(user));
					if (err) { 
							console.log("local-view: Error in user authentication...");
							return next(err);
					}
					else {
						if (!user) {
							var redir_str = "/auth?param=" + req.body.sinfo;							
							return res.redirect(redir_str); 
						};
						req.logIn(user, function(err) {
							if (err) { 
								console.log("local-view: Authenticate non-existing email user..." + user);
								return next(err);
							}
							else
							{
								var obj = JSON.parse(req.body.sinfo);
								var redir_str = "/views?rn=" + obj.rn + "&dd=" + obj.dd + "&tm=" + obj.tm + "&ty=" + obj.ty + "&au=1";
								return res.redirect(redir_str);
							}
						})
					}
				})(req, res, next);
			}
	);
	
	// =================
    // VIEW INCIDENT ===
    // =================
    // we will want this protected so you have to be logged in to visit
    // we will use route middleware to verify this (the isLoggedIn function)
	app.get('/views', isLoggedIn, function (req, res) {
		var key = req.query.rn;
		var date = req.query.dd;
		var time = req.query.tm;
		var type = req.query.ty;
		//var authy = req.query.au;
		var type_desc, pnum;
		var fileType = '.jpg',
			files = [], i;
		
		//console.log("auth param = "+authy);

		if (type == 1) { type_desc = "Owner Damage"; } else
		if (type == 2) { type_desc = "3rd Party Vehicle Damage"; };
		//console.log("post key = "+key+", loss date is "+date+", time is "+time+", type is "+type_desc);
		
		//get the list of jpg files in the image dir
		var imageDir = user_data + key + "/" + date;
		//console.log("photo dir = " + imageDir);
		fs.readdir(imageDir, function (err, list) {
			if (err) {
				return console.error(err);
			};
			for(i=0; i<list.length; i++) {
				if(path.extname(list[i]) === fileType) {
					files.push(list[i]); //store the file name into the array files
				}
			}
		});
	
		//render respective ejs file in the views directory
		// need to set timeout to delay execution to allow for directory get
		setTimeout(function() {
			pnum = files.length.toString();
			//console.log("no. of photos: " + pnum);
			//for(i=0; i<files.length; i++) {
			//	console.log(files[i]);
			//};
			res.render('viewcase', {key: key, date: date, time: time, type: type_desc, pnum: pnum, files: files});
			//res.sendFile(__dirname + "/" + "viewcase.html");
		}, 1000);
	});
	
	// =================
    // DISPLAY PHOTO ===
    // =================
	app.get('/display', function (req, res) {
		var f_locn = req.query.image;
		var hostUrl = req.protocol + '://' + req.get('host');
		//console.log(hostUrl);
		f_locn = hostUrl + "/photo/" + f_locn;
		//console.log("image location: " + f_locn);
	/*
		ejs.renderFile(__dirname + "/views/displayImage.ejs", {locn: f_locn}, {},
			function(err, result) {
			// render on success
			if (!err) {
				//console.log(result);
				//write out the rendered html/ejs to a html file for output
				fs.writeFile(__dirname + "/dispImage.html", result, 
					function(err) {
							if (err) {
								return res.end("An error occurred in creation of Image display HTML");
								console.error(err);
							}
					console.log("dispImage file created...");
					res.sendFile(__dirname + "/dispImage.html");
				});
			}
			// render or error
			else {
				return res.end("An error occurred in rendering Image display HTML file");
				console.log(err);
			}
		});
	*/
		res.render('displayImage', {locn: f_locn});
	});
	
	// ==================
    // INCIDENT SETUP ===
    // ==================
	app.post('/setup',function(req,res){
		var key=req.body.key;
		var date=req.body.date;
		var time=req.body.time;
		var type=req.body.type;
		var location=req.body.location;
		var owner=req.body.owner;
		var return_str = "post key = "+key+", loss date is "+date+", time is "+time+", type is "+type+", location is "+location+", creator is "+owner;
		var type_desc;
		
		if (type == 1) { type_desc = "Owner Damage"; } else
		if (type == 2) { type_desc = "3rd Party Vehicle Damage"; };
		
		// create database entry for this incident
		var newIncident = new Incident();
		// set the attributes
		newIncident.regnum = key;
		newIncident.date = date;
		newIncident.time = time;
		newIncident.claimtype = type_desc;
		newIncident.location = location;
		newIncident.sender = owner;
		newIncident.ins_comp = "";
		// save the incident
		newIncident.save(function(err) {
							if (err) {
								console.log('Error in Saving incident: '+err);
								throw err;
							}
						});
		// create corresponding user data directory
		var case_dir = user_data + key;
		//console.log("first dest dir = " + case_dir);
		if (!fs.existsSync(case_dir)){
				fs.mkdirSync(case_dir, function(err){
								if (err) {
									console.error(err);
									return res.end("error = " + err);
								}
								console.log("Directory " + case_dir + " created successfully!");
							});
		};
		case_dir = case_dir + "/" + date;
		//console.log("second dest dir = " + case_dir);
		if (!fs.existsSync(case_dir)){
				fs.mkdirSync(case_dir, function(err){
								if (err) {
									console.error(err);
									return res.end("error = " + err);
								}
								console.log("Directory " + case_dir + " created successfully!");
							});
		};
		console.log(return_str);
		res.end(return_str);
	});


    // =============
    // LOGOUT ======
    // =============
    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/login');
    });
};

// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {
	var auth = req.query.au;
	//console.log("auth = "+auth);
		// if user is authenticated in the session, carry on
		if (auth == 1) {
			return next();
		}
		else
		{
			if (req.isAuthenticated())
				return next();
		};
		// if they aren't redirect them to the login page
		res.redirect('/login');
}
