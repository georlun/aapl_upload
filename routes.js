// routes.js
var fs = require('fs');
var path = require('path');
var bcrypt = require('bcrypt-nodejs');
var request = require('request');
var async = require('async');
var generator = require('generate-password');
var open = require('opn');            // open is using npm opn()
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
		//console.log("authenicated login user: ", req.user.local.email);
		res.sendFile(__dirname + "/" + "home.html");
	});
	
	// ==============
    // LOGIN USER ===
    // ==============
	//get the login user name after authentication
	app.get('/loginuser', function (req, res) {
		//console.log("home page login user: ", req.user.local.email);
		// going to pass the logged in username to the html via json
		if (req.user === undefined) {
			// The user is not logged in
			res.json({});
		} else {
			res.json({
				username: req.user.local.email
			});
		};
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
    app.get('/signup', isLoggedIn, function(req, res) {
        // render the page and pass in any flash data if it exists
        res.render('signup.ejs', { message: req.flash('signupMessage') });
    });

    // process the signup form
    app.post('/signup', 
			function (req, res, next) {
				//console.log("signup post req body = " + JSON.stringify(req.body));
				//auto generate password for this user before authenticate
				var password = generator.generate({
									length: 8,
									numbers: true,
									symbols: false,
									uppercase: true
				});
				//console.log("pass gen = "+password);
				req.body.password = password;
				passport.authenticate('local-signup', function(err, user, info) {
					if (err) { 
							console.log("local-signup: Error in user creation...");
							return next(err);
					}
					else {
							return res.redirect('/signup'); 
					}
				})(req, res, next);
			}
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
					newUser.local.company = "Self Register User";

					// save the user
					newUser.save(function(err) {
						if (err) {
							console.log('Error in Saving user: '+err);
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
	
	// ===================
    // RESET PASSWORD ====
    // ===================
    // reset the password
    app.get('/resetpass', isLoggedIn, function(req, res) {
		var user = req.query.ur;
		//console.log("user = "+user);
        //auto generate password for this user before authenticate
		var password = generator.generate({
						length: 8,
						numbers: true,
						symbols: false,
						uppercase: true
		});
		//console.log("pass gen = "+password);
		User.findOne({ 'local.email' :  user }, function(err, user) {
						// if there are any errors, return the error
						if (err) {
								console.log('Error in get user for password change: '+err);
								return res.send(err);
						};
						if (user) {
								user.local.password = bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
								// save the user and keep the company info, update only the password
								user.save(function(err) {
									if (err) {
										console.log('Error in Updating user: '+err);
										return res.send(err);
									}
									else {
											return res.send(password);
										}
								})
						}
		});
    });
	
	// ===================
    // PASSWORD CHANGE ===
    // ===================
    // show the password change form
    app.get('/changepass', isLoggedIn, function(req, res) {
		//console.log("user = "+req.query.ur);
		//console.log("message = "+req.query.mess);
        // render the page and pass in any flash data as page requires
        res.render('chgpass.ejs', { message: req.query.mess, userm: req.query.ur });
    });
	
	app.post('/changepass', 
			function (req, res, next) {
				var redir_str;
				//console.log("passwd change post req body = " + JSON.stringify(req.body));
				passport.authenticate('local-login', function(err, user, info) {
					if (err) { 
							console.log("local-login: Error in authenticate user for password change...");
							return next(err);
					}
					else {
						if (!user) {
							redir_str = "/changepass?ur="+req.body.email+"&mess=Fail to authenticate, wrong old password for this user";
							return res.redirect(redir_str);
						};
						// user old password authenticated
						if (req.body.passwordN == req.body.passwordC) {
							// new password confirmed, go on to update the record
							//console.log('Update user: '+ req.body.email);
							User.findOne({ 'local.email' :  req.body.email }, function(err, user) {
									// if there are any errors, return the error
									if (err) {
											console.log('Error in get user for password change: '+err);
											return next(err);
									};
									if (user) {
										user.local.email = req.body.email;
										user.local.password = bcrypt.hashSync(req.body.passwordN, bcrypt.genSaltSync(8), null);
										//console.log("db comp = "+user.local.company);
										// save the user and keep the company info, update only the password
										user.save(function(err) {
											if (err) {
												console.log('Error in Updating user: '+err);
												return next(err);
											}
											else {
												redir_str = "/changepass?ur="+req.body.email+"&mess=Password successfully changed for this user";
												return res.redirect(redir_str);
											}
										});
									}
							});
						}
						else {
							redir_str = "/changepass?ur=" + req.body.email + "&mess=New Passwords do not match, please re-enter again";
							return res.redirect(redir_str);
						}
					}
				})(req, res, next);
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
			file_fp,
			files = [], i;
		
		//console.log("auth param = "+authy);

		if (type == 1) { type_desc = "Owner Damage"; } else
		if (type == 2) { type_desc = "3rd Party Vehicle Damage"; };
		//console.log("post key = "+key+", loss date is "+date+", time is "+time+", type is "+type_desc);
		
		//get the list of jpg files in the image dir
		var imageDir = user_data + "/" + key + "/" + date;
		var hostUrl = req.protocol + '://' + req.get('host');
		var fs_url = hostUrl + '/apphoto/' + key + '/' + date;
		//console.log("photo dir = " + imageDir);
		fs.readdir(imageDir, function (err, list) {
			if (err) {
				return console.log(err);
			};
			for(i=0; i<list.length; i++) {
				if(path.extname(list[i]) === fileType) {
					file_fp = fs_url + "/" + list[i];
					files.push(file_fp); //store the file name into the array files
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
			res.render('viewcase', {key: key, date: date, time: time, type: type_desc, pnum: pnum, hosturl: hostUrl, files: files});
			//res.sendFile(__dirname + "/" + "viewcase.html");
		}, 1000);
	});
	
	// =================
    // GET PHOTO LIST ==
    // =================
    // we will want this protected so you have to be logged in to visit
    // we will use route middleware to verify this (the isLoggedIn function)
	app.get('/photolist', isLoggedIn, function (req, res) {
		var key = req.query.rn;
		var date = req.query.dd;
		var fileType = '.jpg',
			file_fp,
			files = [], i;

		//get the list of jpg files in the image dir
		var hostUrl = req.protocol + '://' + req.get('host');
		var imageDir = user_data + "/" + key + "/" + date;
		var fs_url = hostUrl + '/apphoto/' + key + '/' + date;
		//console.log("photo dir = " + imageDir);
		fs.readdir(imageDir, function (err, list) {
			if (err) {
				return console.log(err);
			};
			for(i=0; i<list.length; i++) {
				if(path.extname(list[i]) === fileType) {
					file_fp = fs_url + "/" + list[i];
					files.push(file_fp); //store the file name into the array files
				}
			}
		});
	
		// need to set timeout to delay execution to allow for directory get
		setTimeout(function() {
			if (files.length > 0) {
				// send the list of all photos
				res.render('viewplist', {key: key, hosturl: hostUrl, files: files});
			}
			else {
				res.end("No photo to display for this appraisal incident...");
			}
		}, 1000);
	});
	
	// =================
    // DISPLAY PHOTO ===
    // =================
	app.get('/display', function (req, res) {
		var f_locn = req.query.image;
		//var hostUrl = req.protocol + '://' + req.get('host');
		//console.log(hostUrl);
		var d_file = path.join(user_data, '/', f_locn);
		console.log("image location: " + d_file);
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
		//res.render('displayImage', {locn: f_locn});
		res.sendFile(d_file);
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
		var recpt=req.body.recpt;
		var sndate=req.body.sndate;
		var return_str = "post key = "+key+", loss date is "+date+", time is "+time+", type is "+type+", location is "+location+", creator is "+owner+", recipient is "+recpt+", send date is "+sndate;
		var type_desc;
		
		if (type == 1) { type_desc = "Owner Damage"; } else
		if (type == 2) { type_desc = "3rd Party Vehicle Damage"; };
		
		// create database entry for this incident if it's not a duplicate
        Incident.findOne({ 'regnum' :  key, 'date' : date },  //query
			function(err, incdt) {		//callback function
				// if there are any errors, return the error
				if (err) {
					console.log('Error in finding Incident: '+err);
				}
				
				if (incdt) {
					//found entry, should not insert new one but update with info from the new record
					console.log("Found entry = "+incdt.regnum);
					incdt.time = time;
					incdt.claimtype = type_desc;
					incdt.location = location;
					incdt.sender = owner;
					incdt.ins_comp = recpt;
					incdt.senddate = sndate;
					incdt.save(function(err) {
						if (err) {
							console.log('Error in Update incident: '+err);
						}
					});
					
				}
				else {
					// insert new record
					var newIncident = new Incident();
					// set the attributes
					newIncident.regnum = key;
					newIncident.date = date;
					newIncident.time = time;
					newIncident.claimtype = type_desc;
					newIncident.location = location;
					newIncident.sender = owner;
					newIncident.ins_comp = recpt;
					newIncident.senddate = sndate;
					// save the incident
					newIncident.save(function(err) {
						if (err) {
							console.log('Error in Saving incident: '+err);
							return res.end("error = " + err);
						}
					});
				}
		});
		// create corresponding user data directory
		var case_dir = user_data + "/" + key;
		//console.log("first dest dir = " + case_dir);
		if (!fs.existsSync(case_dir)){
				fs.mkdirSync(case_dir, function(err){
								if (err) {
									console.log(err);
									return res.end("error = " + err);
								}
								//console.log("Directory " + case_dir + " created successfully!");
							});
		};
		case_dir = case_dir + "/" + date;
		//console.log("second dest dir = " + case_dir);
		if (!fs.existsSync(case_dir)){
				fs.mkdirSync(case_dir, function(err){
								if (err) {
									console.log(err);
									return res.end("error = " + err);
								}
								//console.log("Directory " + case_dir + " created successfully!");
							});
		};
		//console.log(return_str);
		res.end();
	});
	
	// ==========================
    // GET INCIDENT DETAILS =====
    // ==========================
	app.get('/incidentDtl', isLoggedIn, function(req,res){
		//Added parameter - if Admin login, get all incidents; otherwise, just get those entries belong to the login user
		var user = req.query.ur;
		if (user == "admin") {
			Incident.find(function (err, incdt) {	//query all entries
			// if there are any errors, return the error
				if (err) {
					// Note that this error doesn't mean nothing was found,
					// it means the database had an error while searching, hence the 500 status
					console.log('Error in finding Incident: '+err);
					res.status(500).send(err)
				}
				
				if (incdt) {
					// send the list of all incidents
					res.send(incdt);
				}

			})
		}
		else { // find specific user records
			Incident.find({"ins_comp":user}, function (err, incdt) {	//query all entries
			// if there are any errors, return the error
				if (err) {
					// Note that this error doesn't mean nothing was found,
					// it means the database had an error while searching, hence the 500 status
					console.log('Error in finding Incident: '+err);
					res.status(500).send(err)
				}
				//console.log('retrieved = '+JSON.stringify(incdt)+', length = '+incdt.length);
				if (incdt) {
					// send the list of all incidents
					res.send(incdt);
				}

			})
		}
		
	});
	
	// ===================
    // DELETE INCIDENT ===
    // ===================
	app.get('/deleteincdt', isLoggedIn, function(req,res) {
		var regnum = req.query.rn;
		var date = req.query.dd;
		var fileType = '.jpg',
			file_fp, fs_dir, i;
		//console.log("regnum = "+regnum+", date = "+date);
		// find it out and remove!
		Incident.findOneAndRemove({ 'regnum': regnum, 'date': date }, function(err, incident) {
		//Incident.findOne({ 'regnum': regnum, 'date': date }, function(err, incident) {
				// if there are any errors, return the error
				if (err) {
					console.log('Error in getting incident for removal: '+err);
					return res.status(500).send(err);
				};
				if (incident) {
					// successfully removed this incident
					// proceed to delete all photos of this incident from the server
					var imageDir = user_data + "/" + regnum + "/" + date;
					fs_dir = path.join(user_data, '/', regnum, '/', date);
					fs.readdir(imageDir, function (err, list) {
							if (err) {
								return console.log(err);
							};
							for(i=0; i<list.length; i++) {
								if(path.extname(list[i]) === fileType) {
									//console.log(list[i]);
									file_fp = path.join(fs_dir, '/' + list[i]);
									//console.log(file_fp);
									fs.unlinkSync(file_fp, function(err) {
										if (err) {
											console.log(err);
											return res.status(500).send(err);
										}
									})
								}
							}
					});
					// need to set timeout to delay execution to allow for file delete
					setTimeout(function() {
						// delete the directories
						fs.rmdir(fs_dir, function(err) {
							if (err) {
								console.log("failed to remove dir "+fs_dir);
							}
							else {
								fs_dir = path.join(user_data, '/', regnum);
								fs.rmdir(fs_dir, function(err) {
									if (err) {
										// doesn't matter if this is removed
										console.log("failed to remove dir "+fs_dir);
									}
								});
							}
						})
					}, 1000);
					return res.send(incident);
				}
		})
		
	});
	
	// ======================
    // GET USER DETAILS =====
    // ======================
	app.get('/userDtl', isLoggedIn, function(req,res) {
			User.find(function (err, user) {	//query all entries
			// if there are any errors, return the error
				if (err) {
					// Note that this error doesn't mean nothing was found,
					// it means the database had an error while searching, hence the 500 status
					console.log('Error in getting Users: '+err);
					res.status(500).send(err)
				}
				
				if (user) {
					//mask out password field
					for (var i = 0; i<user.length; i++) {
						user[i].local.password = "********";
					}
					// send the list of all users
					res.send(user);
				}
			})
		
	});
	
	// =================
    // DELETE USER =====
    // =================
	app.get('/deleteusr', isLoggedIn, function(req,res) {
		var user = req.query.ur; 
		//console.log("user = "+user);
		// find it out and remove!
		User.findOneAndRemove({ 'local.email' :  user }, function(err, user) {
						// if there are any errors, return the error
						if (err) {
							console.log('Error in getting user for removal: '+err);
							return res.status(500).send(err);
						};
						if (user) {
							// successfully removed this user
							return res.send(user);
						}
		})

	});
	
	// ==========================
    // DAILY PHOTO DOWNLOAD =====
    // ==========================
    // AAPL Admin download gathers all selected date photos to response to client and then download individually to their own server
	app.get('/aapldownload', function (req, res) {
		var date = req.query.dd;
		var hostUrl = req.protocol + '://' + req.get('host');
		var file_fp;
		var f_selected = [];
		
		Incident.find({ 'date' : date },  //query find all date incidents
			function(err, incdt) {		//callback function
				// if there are any errors, return the error
				if (err) {
					// it means the database had an error while searching, hence the 500 status
					return res.status(500).send(err)
					//console.log('Error in finding Incident: '+err);
				}
				
				if (incdt.length > 0) {
					var p_subdir, p_dir, dl_url, dest_dir;
					//get all photos of the incidents for the specific date
					//console.log('Entries found: '+incdt.length);
					async.forEach(incdt, function (incdt, callback1) {
						var rn = incdt.regnum;
						var dt = incdt.date;
						//console.log('regnum: ' + rn);
						//console.log('date: ' + dt);
						//console.log('time: ' + incdt.time);
						//get the corresponding photos from the directory
						p_subdir = incdt.regnum + '/' + incdt.date;
						p_dir = path.join(user_data, '/', p_subdir);
						//console.log("path = ", p_dir);
						fs.readdir(p_dir, function (err, list) {
							if (err) {
								// it means the directory read had an error while fetching, hence the 500 status
								return res.status(500).send("No photos found with reference to DB record")
							};
							async.forEach(list, function (list, callback2) {
								//write the get url for express download to destined directory
								//dl_url = hostUrl + '/download?rn=' + rn + '&dd=' + dt + '&ff=' + list;
								file_fp = 'rn=' + rn + '&dd=' + dt + '&ff=' + list;
								f_selected.push(file_fp); //store the download file parameters into the array files
								//console.log('download paramter = ' + file_fp);
								//open(dl_url);
								callback2();
							}, callback1)
						});
					}, function (err) {
						if (err) {
							console.log('Error in getting download photos: '+err);
							return res.status(500).send("Error in getting download photos")
						}
						else {
							//for (var i=0; i<f_selected.length; i++) {
							//	console.log(f_selected[i]);
							//}
							return res.send(f_selected);
						}
					});
				}
				else {
					return res.send(f_selected);
				}
			
			}
		);
	});
/**		take out photo download from server
	// ==========================
    // SINGLE PHOTO DOWNLOAD ====
    // ==========================
    // Download a particular photo as specified in the parameters
	app.get('/download', function (req, res) {
		var key = req.query.rn;
		var date = req.query.dd;
		var image = req.query.ff;
		var dest, ff_name, fs_url;
		var hostUrl = req.protocol + '://' + req.get('host');
			
		ff_name = date + '-' + key + '-' + image;
		// dest = path.join(download_path, '/', ff_name);  // not to use path.join as we want to have linux based server download to windows dir
		dest = download_path + '\\' + ff_name;
		//console.log("dest file = ", dest);
		fs_url = hostUrl + '/apphoto/' + key + '/' + date + '/' + image;
		//console.log("image url = " + fs_url);
	
		request(fs_url)
			.pipe(fs.createWriteStream(dest)
					.on('error', function(err) {
						console.log("write file error...");
						res.end("write file error " + err);
					})
				)
				.on('close', function () {
					//console.log("write file close...");
					res.end("file saved to " + dest + ", download completed!..");
				});
	
	});
**/
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
