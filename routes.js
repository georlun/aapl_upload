// routes.js
var fs = require('fs');
var path = require('path');
var multer = require('multer');
var mongodb = require('mongodb');
var mongoose = require('mongoose');
var Promise = require('bluebird');
//var Grid = require('gridfs-stream');
var bcrypt = require('bcrypt-nodejs');
var request = require('request');
var async = require('async');
var generator = require('generate-password');
var open = require('opn');            // open is using npm opn()
var User = require('./models/user');
var Incident = require('./models/incident');
var imageData = require('./models/imagedata');
var configDB = require('./config/database.js');
//var user_data = process.env.USERDATA;

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
    // FILE UPLOAD  ====
    // =================
    // these routines responsible for file upload using multer middleware
	var storage = multer.diskStorage({ //multers disk storage settings
		destination: function (req, file, cb) {
			var key=req.body.value1;
			var date=req.body.value2;
			var dest_dir = "./" + key + "-" + date;		// temp file put under app root dir, regnum + date subdir
			//var dest_dir = "./";				// temp file put under app root dir
			//console.log("upload dest dir = " + dest_dir);
			cb(null, dest_dir);
		},
		filename: function (req, file, cb) {
			//console.log(JSON.stringify(req.body));
			var key=req.body.value1;
			var date=req.body.value2;
			var datetimestamp = Date.now();
			cb(null, key + '-' + date + '-' + datetimestamp + '.' + file.originalname.split('.')[file.originalname.split('.').length - 1]);
			//cb(null, file.fieldname + '-' + key + '-' + date + '-' + datetimestamp + '.' + file.originalname.split('.')[file.originalname.split('.').length - 1]);
			//console.log("req object = "+JSON.stringify(req.body));
			//console.log("file object = "+JSON.stringify(file));
		}
	});
	
	var upload = multer({ //multer settings
		storage: storage
	}).single("imgAA"); //File key for upload; on a single basis i.e. one file at a time
	//}).array("imgUploader", 3); //Field name and max count

	/** API path that will upload the files */
	app.post('/upload', function (req, res) {
		upload(req, res, function (err) {
			//console.log("req body: "+JSON.stringify(req.body));
			//console.log("req files: "+JSON.stringify(req.file));
			//console.log("err json: "+err);
			//sample req.file JSON: {"fieldname":"imgAA","originalname":"image.jpg","encoding":"7bit","mimetype":"image/jpeg",
			//"destination":"./","filename":"GS3890-02-10-2017-1508315959237.jpg",
			//"path":"GS3890-02-10-2017-1508315959237.jpg","size":234549}
			if (err) {
				//res.json({ error_code: 1, err_desc: err });
				return res.send(err);
			}
			/* This coding for calling postupload directly from upload, not used as now using bluebird for async orchestration
			var hostUrl = req.protocol + '://' + req.get('host');
			//res.json({ error_code: 0, err_desc: null });
			// call postupload to store uploaded file to db via request
			var url_str = hostUrl + "/postupload?rn=" + req.body.value1 + "&dd=" + req.body.value2 + "&fn=" + req.file.filename;
			//console.log("requesting get: " + url_str);
			
			request
				.get(url_str)
				.on('error', function(err) {
						console.log("postupload error..." + err);
						return res.send(err);
					})
				.on('response', function (response) {
					console.log("postupload status: " + JSON.stringify(response));
				});
			*/
			/** WARNING: deliberately make server CRASH to simulate upload fail
			var obj = {"a":"b"};
			return res.end(obj);
			*/
			return res.sendStatus(200);
		});
	});
	
	// =================
    // POST UPLOAD =====
    // =================
    // post processing uploaded images to save them to the mongoDB
	app.get('/postupload', function (req, res) {
		var key = req.query.rn;
		var date = req.query.dd;
		var upld_tot = req.query.ft;
		var i, tot_photos, files_array = [];
		var imageDir = "./" + key + "-" + date;
		
		/* This coding applies Sync ReadDir function to get the list of file */
		fs.readdirSync(imageDir).forEach(function (file) {
			var obj = {
					key: key,
					date: date,
					filename: file
				}
			files_array.push(obj); //store the file name into the array files
			//console.log("obj = " + JSON.stringify(obj));
		});	
		/* This coding for using async readdir to get the list
		fs.readdir(imageDir, function (err, list) {
			if (err) {
				console.log(err);
				var result = {status: 500, text: err};
				return res.send(result)
			}
			console.log("total files in temp dir: " + list.length);
			tot_photos = list.length;
			for(i=0; i < tot_photos; i++) {
				var obj = {
					key: key,
					date: date,
					filename: list[i]
				}
				files_array.push(obj); //store the file name into the array files
				//console.log("obj["+i+"] = " + JSON.stringify(obj));
			};
		*/
		tot_photos = files_array.length;		
		console.log("process array size: " + tot_photos);
		if (tot_photos == upld_tot)	{
			//setTimeout(function() {
				processAsyncArray(files_array, async_postupload_promise).then(function(result) {
					//console.log("return result = " + JSON.stringify(result));
					//remove the whole temp directory after all photo files have been successfully inserted
					
					setTimeout(function() {
						if (result.length == tot_photos) {
							fs.rmdir(imageDir, function(err) {
								if (err) {
									// doesn't matter if this is removed
									console.log("failed to remove dir "+imageDir);
								}
							})
						}
						else {
							console.log("WARNING: total number of post upload promises being returned not match amount of photos...")
						};
					}, 500);
					return res.send(result)
					
				}, function(reason) {
						console.log("return reject error = " + JSON.stringify(reason));
						// oops... issues with post upload, need to clean up the temp directory
						for(i=0; i < tot_photos; i++) {
							var imgPath = path.join(imageDir, '/', files_array[i].filename);
							fs.unlinkSync(imgPath, function(err){ });
						};
						setTimeout(function() {
							fs.rmdir(imageDir, function(err){ });
						}, 2000);
						return res.send(reason)
				});
			//}, 10);
		}
		else {
			console.log("WARNING: total number of post upload files tally does not match amount of upload photos...");
			for(i=0; i < tot_photos; i++) {
				var imgPath = path.join(imageDir, '/', files_array[i].filename);
				fs.unlinkSync(imgPath, function(err){ });
			};
			setTimeout(function() {
				fs.rmdir(imageDir, function(err){ });
			}, 2000);
			return res.send({status: 999, tmpdir: tot_photos});	// special json status code identify unmatched upload and postupload tally
		}
		//});
	});

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
			img_tag = [],
			files = [], i;
		
		//console.log("auth param = "+authy);

		if (type == 1) { type_desc = "Owner Damage"; } else
		if (type == 2) { type_desc = "Third Party"; };
		//console.log("post key = "+key+", loss date is "+date+", time is "+time+", type is "+type_desc);
		
		//get the list of jpg images
		var hostUrl = req.protocol + '://' + req.get('host');
		/* This coding is for putting base64 images directly in array */	
		Incident.findOne({ 'regnum' :  key, 'date' : date },  //query
			function(err, incdt) {		//callback function
				// if there are any errors, return the error
				if (err) {
					console.log('Error in finding Incident: '+err);
					return res.status(400).send(err);
				}
				
				if (incdt) {
					for(i=0; i<incdt.img_id.length; i++) {
						//console.log("file id: "+incdt.img_id[i].grid_id);
						img_tag.push(incdt.img_id[i].grid_id); //store the image tag into the array
					};
										
					setTimeout(function() {
						if (img_tag.length > 0) {
							processAsyncArray(img_tag, async_display_photo_promise).then(function(result) {
								for(i=0; i < result.length; i++) {
									//console.log("result["+i+"] status: " + result[i].status);
									if (result[i].status == '200') {
										files.push(result[i].data);
									}
									else
										if (result[i].status == '404') {
											files.push("");
										}
								};
								// need to set timeout to delay execution to allow for images push to array
								setTimeout(function() {
									pnum = files.length.toString();
									res.render('viewcase', {key: key, date: date, time: time, type: type_desc, pnum: pnum, hosturl: hostUrl, files: files});
								}, 100);
							}, function(reason) {
								console.log("return reject error = " + JSON.stringify(reason));
								return res.status(500).send(reason);
							})
						}
						else {
								pnum = "0";
								res.render('viewcase', {key: key, date: date, time: time, type: type_desc, pnum: pnum, hosturl: hostUrl, files: files});
						}
					}, 200);
				}
				else {
					return res.send("Non-existing incident/case, the case has been removed by the system administrator.");
				}
			}
		);
	/*
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
	*/
	});
	
	// =================
    // GET PHOTO LIST ==
    // =================
    // we will want this protected so you have to be logged in to visit
    // we will use route middleware to verify this (the isLoggedIn function)
	app.get('/photolist', isLoggedIn, function (req, res) {
		var key = req.query.rn;
		var date = req.query.dd;
		var fileType = '.jpg', pnum,
			img_tag = [],
			files = [], i;
		
		var hostUrl = req.protocol + '://' + req.get('host');
		/* This coding is for putting base64 images directly in array */	
		Incident.findOne({ 'regnum' :  key, 'date' : date },  //query
			function(err, incdt) {		//callback function
				// if there are any errors, return the error
				if (err) {
					console.log('Error in finding Incident: '+err);
					return res.status(400).send(err);
				}
				
				if (incdt) {
					for(i=0; i<incdt.img_id.length; i++) {
						//console.log("file id: "+incdt.img_id[i].grid_id);
						img_tag.push(incdt.img_id[i].grid_id); //store the image tag into the array
					};
										
					setTimeout(function() {
						if (img_tag.length > 0) {
							processAsyncArray(img_tag, async_display_photo_promise).then(function(result) {
								for(i=0; i < result.length; i++) {
									//console.log("result["+i+"] status: " + result[i].status);
									if (result[i].status == '200') {
										files.push(result[i].data);
									}
									else
										if (result[i].status == '404') {
											files.push("");
										}
								};
								// need to set timeout to delay execution to allow for images push to array
								setTimeout(function() {
									if (files.length > 0) {
										pnum = files.length.toString();
										// send the list of all photos
										res.render('viewplist', {key: key, hosturl: hostUrl, pnum: pnum, files: files});
									}
									else {
										res.end("No photo to display for this appraisal incident...");
									}
								}, 100);
							}, function(reason) {
								console.log("return reject error = " + JSON.stringify(reason));
								return res.status(500).send(reason);
							})
						}
						else {
								res.end("No photo to display for this appraisal incident...");
						}
					}, 200);
				}
			}
		);
		
	/** This coding is for displaying images as a direct url from server	
		var hostUrl = req.protocol + '://' + req.get('host');
		var fs_url = hostUrl + '/display?image=';
		//get the list of jpg photos from the database keys
		Incident.findOne({ 'regnum' :  key, 'date' : date },  //query
			function(err, incdt) {		//callback function
				// if there are any errors, return the error
				if (err) {
					console.log('Error in finding Incident: '+err);
					return res.status(400).send(err);
				}
				
				if (incdt) {
					for(i=0; i<incdt.img_id.length; i++) {
						//console.log("file id: "+incdt.img_id[i].grid_id);
						file_fp = fs_url + incdt.img_id[i].grid_id;
						files.push(file_fp); //store the file name into the array files
					};
				}
			}
		);
	*/
	/** This coding is for reading images from persistent disk storage			
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
	*/
	});
	
	// =================
    // DISPLAY PHOTO ===
    // =================
	app.get('/display', function (req, res) {
		var f_id = req.query.image;	// containing file name or id
		//console.log("file id = ", f_id);
		//var gfs;
		//var conn = mongoose.createConnection(configDB.url);
		//var conn = mongoose.connection;
		//gfs = Grid(conn.db, mongoose.mongo);
		
		/* This coding for using mongodb Collection Binary storage to save image files */
		imageData.findOne({ '_id' :  f_id },  //query
			function(err, data) {		//callback function
				// if there are any errors, return the error
				if (err) {
					console.log('Error in finding Image Data: '+err);
					return res.status(400).send(err);
				}
				
				if (data) {
					res.set('Content-Type', data.contentType);
					//res.contentType(data.contentType);
					// convert base64 to raw binary data held in a string
					var block = data.data.split(";");
					// raw image data
					var byteString = block[1].split(",")[1];
					res.send(new Buffer(byteString, 'base64'));
					//res.send(data.data);
				}
				else {
					// handle photo not found case
					res.send("thumbnail photo not found");
				}
			}
		);
		
		/* This coding is for using mongodb GridFS storage for saving image files
		//gfs.findOne({ _id: f_id }, function (err, file) {
		gfs.findOne({ filename: f_id }, function (err, file) {
			if (err) {
				return res.status(400).send(err);
			}
			else if (!file) {
				return res.status(404).send('Error on the database lookup for the file.');
			}

			res.set('Content-Type', file.contentType);
			//res.set('Content-Disposition', 'attachment; filename="' + file.filename + '"'); // for saving as attachment

			var readstream = gfs.createReadStream({
						//_id: f_id,
						filename: f_id,
						chunkSize: 1024 * 256
			});

			readstream.on('error', function (err) {
							console.log("GridFS file read error " + JSON.stringify(err));
							res.end(err);
						});
						
			readstream.pipe(res);
		});
			
	/** This is the old version coding which applies to photos storing in persistent disk storage , not mongodb GridFS 
		//var hostUrl = req.protocol + '://' + req.get('host');
		//console.log(hostUrl);
		//var d_file = path.join(user_data, '/', f_locn);
		//console.log("image location: " + d_file);
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
		//res.sendFile(d_file);
	});
	
	// =================
    // DELETE PHOTO ====
    // =================
	app.get('/delete', function (req, res) {
		// This API serves as a backdoor to delete files or photos from the GridFS by file id or filename
		var f_id = req.query.image;	// containing file name
		//console.log("file id = ", f_id);
		//var gfs;
		//var conn = mongoose.connection;
		//gfs = Grid(conn.db, mongoose.mongo);
		imageData.findOne({ 'filename' :  f_id }, function(err, data) {
				if (err) {
					return res.status(400).send(err);
				}
				else if (!data) {
					return res.status(404).send('Error on the database lookup for the image file.');
				}
				
				data.remove(function (err) {
						if (err) {
							console.log('Error in remove image file: '+err);
							return res.status(500).send(err);
						}
						res.end("file removed...");
				});
		});
		/* This coding is for using mongodb GridFS storage for saving image files
		gfs.findOne({ filename: f_id }, function (err, file) {
				if (err) {
					return res.status(400).send(err);
				}
				else if (!file) {
					return res.status(404).send('Error on the database lookup for the file.');
				}
				
				gfs.remove({ filename: f_id }, function (err) {
					if (err) {
						return res.status(400).send(err);
					}
					res.end("file removed...");
				});
		})
		*/
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
		var type_desc, dup_found = false;
		
		if (type == 1) { type_desc = "Owner Damage"; } else
		if (type == 2) { type_desc = "Third Party"; };
		
		// create database entry for this incident if it's not a duplicate
        Incident.findOne({ 'regnum' :  key, 'date' : date },  //query
			function(err, incdt) {		//callback function
				// if there are any errors, return the error
				if (err) {
					console.log('Error in finding Incident: '+err);
					res.status(500).send(err)
				}
				
				if (incdt) {
					//found entry, should not insert new one but update with info from the new record
					//console.log("Found entry = "+incdt.regnum);
					dup_found = true;
					incdt.time = time;
					incdt.claimtype = type_desc;
					incdt.location = location;
					incdt.sender = owner;
					incdt.ins_comp = recpt;
					incdt.senddate = sndate;
					incdt.save(function(err) {
						if (err) {
							console.log('Error in Update incident: '+JSON.stringify(err));
							return res.status(500).send(err)
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
					newIncident.img_id = [];
					// save the incident
					newIncident.save(function(err) {
						if (err) {
							console.log('Error in Saving incident: '+JSON.stringify(err));
							return res.status(500).send(err)
						}
					});
				}
		});
		// create corresponding 'regnum+date' directory for temporary storage
		var case_dir = "./" + key + "-" + date;
		//console.log("dest dir = " + case_dir);
		if (!fs.existsSync(case_dir)){
				fs.mkdirSync(case_dir, function(err){
								if (err) {
									console.log("make Directory error: "+ case_dir + ", err = " + err);
									return res.status(500).send(err)
								}
								//console.log("Directory " + case_dir + " created successfully!");
							});
		};
		//case_dir = case_dir + "/" + date;
		//console.log("second dest dir = " + case_dir);
		//if (!fs.existsSync(case_dir)){
		//		fs.mkdirSync(case_dir, function(err){
		//						if (err) {
		//							console.log(err);
		//							return res.end("error = " + err);
		//						}
								//console.log("Directory " + case_dir + " created successfully!");
		//					});
		//};
		//console.log(return_str);
		setTimeout(function() {
			return res.status(200).json({dup: dup_found});
		}, 200);
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
					return res.status(500).send(err)
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
					return res.status(500).send(err)
				}
				//console.log('retrieved = '+JSON.stringify(incdt)+', length = '+incdt.length);
				if (incdt) {
					// send the list of all incidents
					res.send(incdt);
				}

			})
		}
		
	});
	
	// ===============================
    // DELETE INCIDENT from MOBILE ===
    // ===============================
	app.get('/deleteincdt', function(req,res) {	// this one has no authentication requirements as it would call from mobile app system
		var regnum = req.query.rn;
		var date = req.query.dd;
		var fileType = '.jpg',
			file_fp, fs_dir, i;
			
			Incident.findOne({ 'regnum': regnum, 'date': date }, function(err, incident) {
				// if there are any errors, return the error
				if (err) {
					console.log('Error in getting incident for removal: '+err);
					return res.status(500).send(err);
				};
				if (incident) {
					// successfully find this incident
					// proceed to delete all photos of this incident
					for(i=0; i<incident.img_id.length; i++) {
						//console.log("remove file id: "+incident.img_id[i].grid_id);
						imageData.findOneAndRemove({ '_id' :  incident.img_id[i].grid_id }, function(err, data) {
								if (err) {
										return res.status(400).send(err);
								}
								else if (!data) {
									console.log('No image file found for removal...');
								}
						})
					};
					
				setTimeout(function() {
					incident.remove(function (err) {
						if (err) {
							console.log('Error in remove incident: '+err);
							return res.status(500).send(err);
						}
					});
				}, 500);
					return res.send(incident);
				}
			})
		
	});
	
	// ==================================
    // DELETE Appraisal by Admin User ===
    // ==================================
	app.get('/deleteAppr', isLoggedIn, function(req,res) {
		var regnum = req.query.rn;
		var date = req.query.dd;
		var fileType = '.jpg',
			file_fp, fs_dir, i;
		//console.log("regnum = "+regnum+", date = "+date);
		// find it out and remove!
		//Incident.findOneAndRemove({ 'regnum': regnum, 'date': date }, function(err, incident) {
		Incident.findOne({ 'regnum': regnum, 'date': date }, function(err, incident) {
				// if there are any errors, return the error
				if (err) {
					console.log('Error in getting incident for removal: '+err);
					return res.status(500).send(err);
				};
				if (incident) {
					// successfully find this incident
					// proceed to delete all photos of this incident
					for(i=0; i<incident.img_id.length; i++) {
						//console.log("remove file id: "+incident.img_id[i].grid_id);
						imageData.findOneAndRemove({ '_id' :  incident.img_id[i].grid_id }, function(err, data) {
								if (err) {
										return res.status(400).send(err);
								}
								else if (!data) {
									console.log('No image file found for removal...');
								}
						})
					};
					
				/* This coding is for using mongodb GridFS storage for saving image files
					var gfs;
					var conn = mongoose.connection;
					gfs = Grid(conn.db, mongoose.mongo);
					
					for(i=0; i<incident.img_id.length; i++) {
						//console.log("remove file id: "+incident.img_id[i].grid_id);
						//gfs.remove({ _id: incident.img_id[i].grid_id }, function (err) {
						gfs.remove({ filename: incident.img_id[i].grid_id }, function (err) {	
										if (err) {
											return res.status(400).send(err);
										}
						});
					};
				*/
				setTimeout(function() {
					incident.remove(function (err) {
						if (err) {
							console.log('Error in remove incident: '+err);
							return res.status(500).send(err);
						}
					});
				}, 500);
					
				/* This is the old version coding which applies to photos storing in persistent disk storage , not mongodb GridFS
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
				*/	
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
					return res.status(500).send(err)
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
						//get the corresponding photo list from the record
						async.forEach(incdt.img_id, function (grid, callback2) {
							//console.log("file id: "+grid.grid_id);
							//write the get url for express download to destined directory
							file_fp = 'rn=' + rn + '&dd=' + dt + '&ff=' + grid.grid_id + '&fn=' + grid.filename;
							f_selected.push(file_fp); //store the download file id into the array files
							callback2();
						}, callback1);
				/**	This is the old version coding which applies to photos storing in persistent disk storage , not mongodb GridFS
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
				*/		
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

// =======================
// INTERNAL FUNCTIONS ====
// =======================
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

// async function to insert photos to its persistent storage either DB or AWS S3 
// Generic Async Loop Processing Routine: 
// it implements 'reduce' pattern to control return of async Promises with 'bluebird' library and capture the series of resolve in result[]
function processAsyncArray(array, fn) {
	var results = [];
	return array.reduce(function(p, item) {
		// sample p json value: {"isFulfilled":true,"isRejected":false}
		//console.log("inside reduce array: " + JSON.stringify(item));
		return p.then(function() {
			return fn(item).then(function(data) {
				//console.log("inside reduce array, return value: " + JSON.stringify(data));
				results.push(data);
				return results;
			});
		});
	}, Promise.resolve());
}

function async_postupload_promise(f_item) {
	return new Promise(function(resolve, reject) {
			var key = f_item.key;
			var date = f_item.date;
			var filename = f_item.filename;
			var imageDir = "./" + key + "-" + date;
			var imgPath = path.join(imageDir, '/', filename);
			//var imgPath = imageDir + filename;	/** WARNING: deliberate to make server failed to read file for failure test, COMMENT IT */
			var result;
			//var conn = mongoose.createConnection(configDB.url);
			//var conn = mongoose.connection;
			//conn.once('open', function () {
			//	gfs = Grid(conn.db, mongoose.mongo);
			//});
			//gfs = Grid(conn.db, mongoose.mongo);
		
			/*	this coding for processing uploaded files on individual basis */
			// first check if file already exists in the database fs.files
			//gfs.exist({ filename: filename }, function (err, found) {
			
			imageData.findOne({ 'filename' :  filename }, function(err, data) {
				//if (err) return res.status(500).send(err);
				if (err) {
					console.log("read db error...");
					result = {status: 500, text: err};
					reject(result);
				}
				else
				{
					if (data) { 
						console.log("file: "+data.filename+" already exists...");
						// duplicate photo, should remove it
						fs.unlinkSync(imgPath, function(err) {
							if (err) {
								console.log('Error in remove duplicate photo file: '+JSON.stringify(err));
							}
						});
						result = {status: 200, text: "OK"};
						resolve(result);
					}
					else
					{
						/* this coding for using mongodb Collection Binary storage to save image files */
						fs.readFile(imgPath, function(err, data) {
							if (err) {
								console.log("Error reading file on server! " +JSON.stringify(err));
								//sample err json: {"errno":-4058,"code":"ENOENT","syscall":"open","path":"D:\\angularJS"}
								//return res.status(500).send(err);
								result = {status: 500, text: err};
								reject(result);
							}
							else {
								var newImage = new imageData();
								newImage.filename = filename;
								newImage.contentType = "image/jpeg";
								//newImage.data = data;
								// encode file data to base64 encoded string for storage
								var base64data = new Buffer(data).toString('base64');
								//console.log(base64data);
								newImage.data = 'data:image/jpeg;base64,' + base64data;
								//console.log("saving file: " + filename);
								newImage.save(function(err, record) {
									if (err) {
										console.log('Error in Saving imageData: code: '+err.code+', index: '+err.index+', description: '+err.errmsg);
										//return res.end("error code: "+err.code);
										result = {status: err.code, text: err.errmsg};
										reject(result);
									}
									else
									{
										//console.log('saved imageData record: '+ record._id + ', ' + record.filename + ', ' + record.contentType);
										var fid = { "grid_id": record._id, "filename": filename };
										Incident.findOneAndUpdate({ 'regnum' :  key, 'date' : date }, {$push: {img_id: fid}}, function(err, incdt) {
											if (err) {
												console.log('Error in find and update Incident: '+JSON.stringify(err));
												result = {status: 500, text: err};
												reject(result);
											}
											if (incdt) {
												// success write to db, remove temp file
												fs.unlinkSync(imgPath, function(err) {
													if (err) {
														console.log('Error in remove upload temp file: '+JSON.stringify(err));
													}
												});
												//console.log("complete update and removal: " + JSON.stringify(fid));
												result = {status: 200, text: "OK"};
												resolve(result);
											}
											else
											{
												console.log('non-existent Incident record...');
												result = {status: 500, text: "No matching incident record in DB"};
												reject(result);
											}
										});
									}
								});
							}
						});
					}
					
					/* this coding for using mongodb GridFS storage to save image files
					var imgPath = imageDir + filename;
					var writestream = gfs.createWriteStream({
						filename: filename,
						chunkSize: 1024 * 256,
						content_type: 'image/jpg'
					});
					//console.log("uploaded photo = " + filename);
					// write using GridFS
					fs.createReadStream(imgPath).pipe(writestream)
						.on('error', function (err) {
								console.log("GridFS file write error " + JSON.stringify(err));
								return res.status(500).send(err);
						})
						.on('close', function (file) {
							//console.log("completed GridFS file write " + JSON.stringify(file));
							//sample GridFS JSON: {"_id":"59cb4ecb12c26c1c108d239d","filename":"GS3890-27-09-2017-1506450339432.jpg",
							//"contentType":"image/jpg","length":4397078,"chunkSize":1024,"uploadDate":"2017-09-27T07:10:09.094Z",
							//"md5":"2d5c8bee94dd737dac8404914bb78619"}
							//var fid = { "grid_id": file._id };
							var fid = { "grid_id": file.filename };
							//console.log("file id: " + JSON.stringify(fid));
							// write each file id to database
							Incident.findOneAndUpdate({ 'regnum' :  key, 'date' : date }, {$push: {img_id: fid}}, function(err, incdt) {
								if (err) {
									console.log('Error in find and update Incident: '+err);
								}
								if (incdt) {
									// success write to db, remove temp file
									fs.unlinkSync(imgPath, function(err) {
										if (err) {
											console.log(err);
											return res.status(500).send(err);
										}
									});
									//console.log("complete update and removal: " + JSON.stringify(fid));
								}
							});
							//conn.db.close();
							return res.end();
						});
					*/
				}
			});
		/*	this coding for reading a directory for all uploaded files
			//console.log("photo dir = " + imageDir)
			fs.readdir(imageDir, function (err, list) {
				if (err) {
					console.log("error reading upload dir: " + err);
					res.json({ error_code: 1, err_desc: err });
					return res.end();
				};
				for(i=0; i<list.length; i++) {
					//console.log("uploaded photo = " + list[i]);
					//files.push(list[i]); //store the file name into the array files
					var imgPath = path.join(imageDir, '/', list[i]);
					var writestream = gfs.createWriteStream({
						filename: list[i],
						chunkSize: 1024 * 256,
						content_type: 'image/jpg'
					});
					console.log("uploaded photo path = " + imgPath);
					// write using GridFS
					fs.createReadStream(imgPath).pipe(writestream)
						.on('error', function (err) {
								console.log("GridFS file write error " + JSON.stringify(err));
						})
						.on('close', function (file) {
							console.log("completed GridFS file write " + JSON.stringify(file));
							//sample GridFS JSON: {"_id":"59cb4ecb12c26c1c108d239d","filename":"GS3890-27-09-2017-1506450339432.jpg",
							//"contentType":"image/jpg","length":4397078,"chunkSize":1024,"uploadDate":"2017-09-27T07:10:09.094Z",
							//"md5":"2d5c8bee94dd737dac8404914bb78619"}
							var fid = { "grid_id": file._id };
							console.log("file id: " + JSON.stringify(fid));
							// write each file id to database
							Incident.findOneAndUpdate({ 'regnum' :  key, 'date' : date }, {$push: {img_id: fid}}, function(err, incdt) {
								if (err) {
									console.log('Error in find and update Incident: '+err);
								}
								if (incdt) {
									files_id[i] = fid;
									console.log("push update: " + JSON.stringify(fid));
								}
							});
						});
				};
				//conn.db.close();
				//return res.end("post upload completed...");
			})
		*/
	});
}

function async_display_photo_promise(f_id) {
	return new Promise(function(resolve, reject) {
		var result;
		/* This coding for using mongodb Collection Binary storage to save image files */
		imageData.findOne({ '_id' :  f_id },  //query
			function(err, data) {		//callback function
				// if there are any errors, return the error
				if (err) {
					console.log('Error in finding Image Data: '+err);
					result = {status: 500, text: err};
					reject(result);
				}
				else {
					if (data) {
						result = {status: 200, data: data.data};
						resolve(result);
					}
					else {
						// handle photo not found case
						result = {status: 404, data: "thumbnail photo not found"};
						resolve(result);
					}
				}
			}
		)
	})
}

// function to encode file data to base64 encoded string
function base64_encode(file) {
    // read binary data
    var bitmap = fs.readFileSync(file);
    // convert binary data to base64 encoded string
    return new Buffer(bitmap).toString('base64');
}

// function to create file from base64 encoded string
function base64_decode(base64str, file) {
    // create buffer object from base64 encoded string, it is important to tell the constructor that the string is base64 encoded
    var bitmap = new Buffer(base64str, 'base64');
    // write buffer to file
    fs.writeFileSync(file, bitmap);
    console.log('******** File created from base64 encoded string ********');
}

