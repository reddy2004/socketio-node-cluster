
var app = angular.module('myApp', []);

app.controller('myCtrl', function($scope) {

	$scope.clients = []; 
	$scope.threads = 0;
	$scope.gears = [];

	$scope.sendtogear = "8082";
	$scope.sendtouserid = "8082_6";

	$scope.send = function() {
		$scope.clients[0].socket.emit('c2s_chat',
                     {port_src: _gearid, port_dest: $scope.sendtogear, msg: "Custom",
                          userid_dest: $scope.sendtouserid, userid_src: 'vikram', ttl: 1});

	};

	$scope.query = function() {
		$scope.clients[0].socket.emit('c2s_query_userid',
                     {uid: $scope.sendtouserid}, function(data) {alert(data);});

	};
        
	function insert_gear(gid)
	{
		var found = false;
		$scope.gears.forEach(function(xgid) {
			if (xgid == gid) 
				found = true;
		});
		if (found == false) {
			$scope.gears.push(gid);
			console.log("Inserted " + gid + " total=" + $scope.gears.length);
		} else {
			console.log("Didnt not insert as already present " + gid);
		}

	}
	
	$scope.uidtosock = function(uid, data) {
		var MAX = 10;

		$scope.clients.forEach(function (obj) {
			if (obj.userid == data.userid_dest) {
				obj.last_msg = data.msg;
				
                                if ($scope.clients.length == MAX && data.ttl > 0 && $scope.gears.length > 0) {
                                        var newttl = data.ttl - 1;
                                        var r = Math.floor(Math.random() * $scope.gears.length);
                                        var rand_gear = $scope.gears[r];
					var target = rand_gear + "_" + Math.floor(Math.random() * MAX);
                                        obj.socket.emit('c2s_chat',
                                                {port_src: _gearid, port_dest: rand_gear, msg: data.msg, 
						userid_dest: target, userid_src: data.userid_dest, ttl: newttl});
                                        console.log("Emited message 2 to " + rand_gear + " [" + r + "] of " + $scope.gears.length);
                                }
			}
		});

	}

	$scope.start = function() {

		var MAX = 10;

		insert_gear(_gearid);

		for (var i=0; i < MAX; i++) {

                        var socket = io.connect(remote_for_sock,
					{'reconnection limit' : 1000, 'max reconnection attempts' : 'Infinity', 'force new connection': true});

			
			var obj = new Object();

			obj.socket = socket;
                        obj.userid = _gearid + "_" + $scope.threads;
                        $scope.threads += 1;
                        console.log("incr " + $scope.threads + "," + socket.id);
			

			obj.socket.emit('clientlogin', obj.userid, function(data) {
				console.log("Client login reply: (" + obj.userid + ") "  + data);
			});

                        obj.last_msg = "nullA";

			obj.socket.on('broadcast_glist', function(data) {
				console.log("Got gear list broadcast " + data.count);
				for (var x=0;x<data.glist.length;x++) {
					//console.log("gear (" + x + ") = " + data.glist[x]); 
					if (data.glist[x])
						insert_gear(data.glist[x]); 
				}
			});

			obj.socket.on('s2c_chat', function(data) {
				console.log("(" + $scope.clients.length + ") got message " + data.userid_dest);
			
//				$scope.clients.forEach(function(obj) {
//					if (obj.userid == data.userid_dest)
//						obj.last_msg = data.msg;
//				});
//				$scope.$digest();

				$scope.uidtosock(data.userid_dest, data);
				$scope.$digest();
/*
				if ($scope.clients.length == MAX && data.ttl > 0) {	
					var target = Math.floor(Math.random() * MAX);
					var newttl = data.ttl - 1;
					var r = Math.floor(Math.random() * $scope.gears.length);
					var rand_gear = $scope.gears.length[r];
	//				$scope.clients[data.userid_dest].socket.emit('c2s_chat', 
					sx.emit('c2s_chat',
						{port_src: _gearid, port_dest: rand_gear, msg: data.msg, userid_dest: target, userid_src: data.userid_dest, ttl: newttl});
					console.log("Emited message");
				}
*/
			});
       	                $scope.clients.push(obj);
			console.log("pushed a socket to buf " + i);
		}//end of for.
	};

});

