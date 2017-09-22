var app = angular.module('aaplwebapp',['720kb.datepicker']);
var dtlapp = angular.module('dtlapp',['smart-table']);

app.controller('userCtrl', function($scope, $http, $filter) {
	$scope.loginUser;
	$scope.dateString = $filter('date')(new Date(), "dd-MM-yyyy");
	//console.log("date = ", $scope.dateString);
	
	//expose the whole response below with an example:
	// {"data":{"username":"georlun@gmail.com"},"status":200,
	// "config":{"method":"GET","transformRequest":[null],"transformResponse":[null],"jsonpCallbackParam":"callback","url":"/loginuser",
	// "headers":{"Accept":"application/json, text/plain, */*"}},"statusText":"OK"}
	
    $http.get('/loginuser')
		.then( function successCallback(response) {
			//console.log("response = " + JSON.stringify(response));
			$scope.loginUser = response.data.username;
			//console.log("username = " + $scope.loginUser);
			document.getElementById('loginUr').value = $scope.loginUser;
		});
		
	$scope.isAdmin = function(user) {
		if (user == "admin") {
			return true;
		}
        else {
 			return false;
		}
	}
});
/*	no need for download ctrl as this has been moved to client side nodejs
app.controller('downloadCtrl', ['$scope', '$http', '$window', function($scope, $http, $window) {
	
	$scope.download_photo = function (ddate) { 
		var request = $http.get('/aapldownload?dd='+ddate)    
			.then (function successCallback(res) {
					//console.log('angular download parameters: '+JSON.stringify(res.data));
					if (res.data.length > 0) {
						for (var i=0; i<res.data.length; i++) {
							//console.log("param["+i+"] = "+res.data[i]);
							$window.open('/download?' + res.data[i], '_blank');
						}
						alert(res.data.length + " photos downloaded for this date....");
					}
					else
						alert("There's no photos to download for this date....");
			},	function errorCallback(err) {
					//console.log('download error');
					alert('download error! '+JSON.stringify(err));
			});
	}
}]);
*/
app.controller('incidentCtrl', ['$scope', '$http', '$window', function ($scope, $http, $window) {
	//open a new window for detail list
	$scope.show_table = function () { 
		$window.open('/views/viewlog.html', '_blank');
	}
}]);

app.controller('newuserCtrl', ['$scope', '$http', '$location', '$window', function ($scope, $http, $location, $window) {
	
	$scope.user_signup = function () {
		
		var protocol = $location.protocol();
		var host = $location.host();
		var port = $location.port();
		var url_str = protocol +'://'+ host +':'+ port;
		//console.log("url = ", url_str);
		$window.open(url_str + '/signup', '_blank');

	}
}]);

app.controller('userlistCtrl', ['$scope', '$http', '$window', function ($scope, $http, $window) {
	//open a new window for detail list
	$scope.list_user = function () { 
		$window.open('/views/viewuser.html', '_blank');
	}
}]);

app.controller('chgpassCtrl', ['$scope', '$http', '$location', '$window', function ($scope, $http, $location, $window) {
	
	$scope.change_pass = function () {
		
		var protocol = $location.protocol();
		var host = $location.host();
		var port = $location.port();
		var url_str = protocol +'://'+ host +':'+ port;
		//console.log("url = ", url_str);
		var user = document.getElementById('loginUr').value;
		//console.log("user = "+user);
		$window.open(url_str + '/changepass?ur=' + user + '&mess=', '_blank');

	}
}]);

dtlapp.controller('userdisplayCtrl', ['$scope', '$http', '$location', '$window', function ($scope, $http, $location, $window) {
	$scope.userdata;
	$scope.isEmpty;
	
	$scope.init = function() {
		//console.log("call init get DB entries function...");
		$http.get('/userDtl')    
			.then (function successCallback(res) {
					//console.log('user init response = '+JSON.stringify(res));
					$scope.userdata = res.data;
					//console.log('data length = '+res.data.length);
					if (res.data.length > 0) {
						$scope.isEmpty = false;
					} else {
						$scope.isEmpty = true;
					};
					//console.log('empty res = '+$scope.isEmpty);
			},	function errorCallback(err) {
					//console.log('DB get list error');
					alert('DB get error! '+JSON.stringify(err));
		});		
	}
	
	$scope.reset_password = function(user) {
		//console.log("user = "+user);
		var get_str = "/resetpass?ur=" + user;
		$http.get(get_str)
			.then( function successCallback(response) {
				//console.log("response = " + JSON.stringify(response));
				for (var i = 0; i < $scope.userdata.length; i++) {	// need to find the reset entry
					//console.log('['+i+'] '+$scope.userdata[i].local.email);
					if ($scope.userdata[i].local.email == user) {
						$scope.userdata[i].local.password = response.data;
						//console.log('find email with index['+i+'], pass = '+$scope.userdata[i].local.password);
					}
				}
			},	function errorCallback(err) {
					//console.log('reset password error');
					alert('Reset password error!'+JSON.stringify(err));
		});
	}
	
	$scope.delete_user = function(user) {
		//console.log("user = "+user);
		//console.log("evaluate delete_user...");
		if (user == "admin") {
			alert('System User "'+ user + '" cannot be deleted...');
		}
		else {	
			var get_str = "/deleteusr?ur=" + user;
			$http.get(get_str)
				.then( function successCallback(response) {
					//console.log("response = " + JSON.stringify(response));
					alert('User "'+ response.data.local.email + '" successfully deleted...');
					$window.location.reload();
				},	function errorCallback(err) {
						//console.log('delete user error');
						alert('Delete User error!'+JSON.stringify(err));
			});
		}
	}
	
}]);

dtlapp.controller('auditCtrl', ['$scope', '$http', '$location', '$window', function ($scope, $http, $location, $window) {
	$scope.incdata;
	$scope.loginUser;
	$scope.isEmpty;
	
	$scope.init = function() {
		//console.log("call init get DB entries function...");
		$http.get('/loginuser')
		.then( function successCallback(response) {
			$scope.loginUser = response.data.username;
			//console.log("this. login username = " + $scope.loginUser);
			// should take login user entries only, if admin, get all
			$http.get('/incidentDtl?ur=' + $scope.loginUser)    
				.then (function successCallback(res) {
					//console.log('successful res = '+JSON.stringify(res));
					$scope.incdata = res.data;
					//console.log('data length = '+res.data.length);
					if (res.data.length > 0) {
						$scope.isEmpty = false;
					} else {
						$scope.isEmpty = true;
					};
					//console.log('empty res = '+$scope.isEmpty);
				},	function errorCallback(err) {
					//console.log('DB get list error');
					alert('DB get error! '+JSON.stringify(err));
				})
		}, function errorCallback(err) {
					//console.log('DB get login user error');
					alert('DB get error! '+JSON.stringify(err));
		});		
	}

	$scope.show_thumbnail = function(incdt) {
		var rn = incdt.regnum;
		var dd = incdt.date;
		//var protocol = $location.protocol();
		//var host = $location.host();
		//var port = $location.port();
		//var url_str = protocol +'://'+ host +':'+ port;
		//$window.open(url_str + '/photolist?rn=' + rn + '&dd=' + dd, '_blank');
		$window.open('/photolist?rn=' + rn + '&dd=' + dd, '_blank');
	}
	
	$scope.delete_incident = function(regnum, date) {
		//console.log("regnum = "+regnum+", date = "+date);
		//console.log("evaluate delete_incident...");
		var get_str = "/deleteincdt?rn=" + regnum + "&dd=" + date;
		$http.get(get_str)
			.then( function successCallback(response) {
					//console.log("response = " + JSON.stringify(response));
					alert('Appraisal '+ response.data.regnum + ', ' + response.data.date + ' successfully deleted...');
					$window.location.reload();
			},	function errorCallback(err) {
					//console.log('delete appraisal error');
					alert('Delete Appraisal error!'+JSON.stringify(err));
		});
	}
	
	$scope.isAdmin = function(user) {
		if (user == "admin") {
			return true;
		}
        else {
 			return false;
		}
	}
	
}]);

dtlapp.directive('ngConfirmClick', [
    function(){
		// directive defined to raise confirmation dialog box
        return {
            link: function (scope, element, attr) {
                var msg = attr.ngConfirmClick + attr.rowRecord + " ?";
                var clickAction = attr.confirmedClick;
                element.bind('click',function (event) {
                    if ( window.confirm(msg) ) {
                        scope.$eval(clickAction)
                    }
                });
            }
        };
}]);