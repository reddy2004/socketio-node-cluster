var database = require('./database.js');
var http = require('http');
var fs = require('fs');
var gearclient = require('socket.io-client');

var SampleApp = function() {
	var self = this;
	var clients = [];
	var cluster_gears = [];
        var cluster_stats = [];
        var start_time = null;
        var curr_time = null;
        var chat_count = 0;
        
        database.connect();
        database.store_msg({from:"vikram",to: "reddy", uuid: "x02", ts:"now", type: "chat", data: "hello!"});
        database.dump_all_messages("vikram");

	self.initialize = function() {
		var port = process.argv[2];
		if (port === "8082") {
			self.gearid = 8082;	
			//Do more stuff if required
		} else if (port >= "1000" & port <= "2000") {
			console.log("User specified a port");
			self.gearid = parseInt(port);

		} else
			self.gearid = Math.floor(2000 + Math.random() * 8000);

		console.log("Initialize GEAR: " + self.gearid)
	}

        self.add_common_handlers = function (socket)
        {
                socket.on('disconnect', function() {
                        var iObj = null;
                        cluster_gears.forEach(function (obj) {
                                var socket2 = obj.socket;
                                if (socket2.id == socket.id)
                                        iObj = obj;
                        });
                        if (iObj != null && iObj.init == 0) {
                                console.log("Disconnected between " + self.gearid + " <-> " + iObj.port);
                                cluster_gears.splice(cluster_gears.indexOf(iObj), 1); 

                                var d_port = iObj.port;
                                cluster_gears.forEach(function (obj) {
                                        if (self.gearid == 8082)
                                                obj.socket.emit('gear-disconnected', {port: d_port});
                                });
                        }

                        var jObj = null;
                        clients.forEach(function(obj) {
                                var socket3 = obj.socket;
                                if (socket3.id == socket.id)
                                        jObj = obj;
                        });

                        if (jObj != null) {
                                console.log("Client-disconnected " + jObj.uid);
                                clients.splice(clients.indexOf(jObj), 1);
                        }
                });            
        }
        
        self.add_handlers_S2S = function(socket)
        {           
                socket.on('s2s_chat', function(data) {
                        console.log("Fwd message: " + JSON.stringify(data));

                        if (data.port_dest == self.gearid) {
                                //fwd the message to appropriate socket.
                                var sent = false;
                                clients.forEach(function(client) {
                                        if (client.uid == data.userid_dest) {
                                                client.socket.emit('s2c_chat', data);
                                                sent = true;
                                        }
                                });
                                if (sent == false) {
                                        console.log("Failed to forward s2s-s2c message " +  JSON.stringify(data));
                                }
                        } else {
                                console.log("error in fwd_message!, Im wrong dest gear" + JSON.stringify(data));
                        }
                });             
                
                socket.on('s2s_query_userid', function(p, fn) {
                        var found = false;
                        console.log("in s2s_query_userid " + p.uid + ".. " + clients.length);
                        clients.forEach(function (q) {
                                if (q.uid == p.uid)
                                        found = true;
                                console.log(q.uid + " vs " + p.uid);
                        });	
                        if (found == true) {
                                fn("sucess " + self.gearid + " < ");
                        } else {
                                fn("failed " + self.gearid + " < ");
                        }
                });         
                
                socket.on('s2s_query_stats', function(uid, fn) {
                    console.log("master asked for stats");
                    fn ({reply : self.gearid});
                });                     
        }
        
	self.create_socket_for_gear = function(data)
	{
		var socket = gearclient.connect('http://localhost:' + data.port,
                                 {'reconnection limit' : 1000, 'max reconnection attempts' : 'Infinity'});

		socket.on('connect', function() {
			socket.emit('register', self.gearid, function (data) {
				console.log("Connected-g2g " + data.port_dest);
				cluster_gears.push({socket: socket, port: data.port_dest, init: 1});
			});
		});        
                
                self.add_handlers_S2S(socket);  
                self.add_common_handlers(socket);
		return socket;
	}


	self.join_cluster = function()
	{
                /*
                 * 8082 is the master Gear and need connect to anyone else
                 */
		if (self.gearid != 8082) {
			console.log ("in function call to join cluster..");
			self.socketBase = gearclient.connect('http://localhost:8082',
				{'reconnection limit' : 1000, 'max reconnection attempts' : 'Infinity'});

			self.socketBase.on('connect', function () { 
    				self.socketBase.emit('register', self.gearid, function (data) {
					console.log("Connected to master");
      					console.log(data.key + "," + data.value + " p = " + data.port_src + "," + data.port_dest);
    				});
  			});

			self.socketBase.on('disconnect', function () {
				    //do stuff
				console.log("Disconnected from Master!");
				//SPLICE everthing u know and restart all over again
                                cluster_gears.forEach(function (obj) {
                                        var socket2 = obj.socket;
					socket2.disconnect();
                                });
				cluster_gears.splice(0, cluster_gears.length);
				console.log("Closed all connections from other gears");
			});
	
			self.socketBase.on('heartbeat', function(data) {
				console.log("got heartbeat : " + data);
			});

			self.socketBase.on('gear-online', function(data) {
				self.create_socket_for_gear(data);
			});

			/* This message is coming from master,*/
			self.socketBase.on('gear-disconnected', function(data) {
				console.log("Alert: gear-disconnected " + data.port);
				var iObj = null;
                                cluster_gears.forEach(function (obj) {
                                        if (obj.port == data.port)
                                                iObj = obj;
                                });
				if (iObj != null) {
					cluster_gears.splice(cluster_gears.indexOf(iObj), 1);
				} else {
					console.log("** CRITICAL (1) ** Cannot find gear " + data.port);
				}
			});
                        
                        self.socketBase.on('query-stats' , function (data, fn) {
                            console.log(data);
                            var counter = 1;
                            var str = "[";
                                cluster_gears.forEach(function (obj) {
                                        str += obj.port + ",";
                                        counter++;
                                });
                                var lstr = "http://192.168.1.149:" + self.gearid ;
                               str += "]";
                               
                               curr_time = new Date();
                               var date = new Date(curr_time.getTime() - start_time.getTime());
                                var strt = '';
                                strt += date.getUTCDate()-1 + " days, ";
                                strt += date.getUTCHours() + " hours, ";
                                strt += date.getUTCMinutes() + " minutes, ";
                                strt += date.getUTCSeconds() + " seconds, ";
                               fn ({ip: '192.168.1.149', port: self.gearid, counter: counter, 
                                    peerlist: str, mcount: chat_count, uptime: strt, link : lstr, ccount: clients.length});
                        });
		}
	}

	self.start = function() {
		console.log("Starting");
		self.join_cluster();
		var url = require('url');
                start_time = new Date();
                
		var server = http.createServer(function(req, res) {
	            	var hostname = req.headers.host.split(":")[0];
        	    	var pathname = url.parse(req.url).pathname;

            		//console.log(hostname);
            		//console.log(pathname);

			var file_to_send = null;

			if (pathname == "/") {
                                if (self.gearid == 8082)
                                    file_to_send = "./masterindex.html";
                                else
                                    file_to_send = "./index.html";
                                
                                fs.readFile(file_to_send, 'utf-8', function(error, content) {
                                        res.writeHead(200, {"Content-Type": "text/html"});
                                        res.end(content);
                                });
			} else if (pathname == "/randomgear") {
                            
                            
                        } else if (pathname == "/page") {
				res.writeHead(200, {"Content-Type": "application/json"});
				//console.log("requesting database - pagination");
                                var jsonString = '';

                                req.on('data', function (data) {
                                    jsonString += data;
                                });

                                req.on('end', function () {
                                    //console.log(JSON.parse(jsonString));
      				    res.end(JSON.stringify(cluster_stats));
				});                            
                                
                        }else if (pathname == "/socket_html_global.js") {
				res.writeHead(200, {"Content-Type": "text/html"});
				res.end("var remote_for_sock = 'http://192.168.1.149:" + self.gearid + "'; var _gearid = " + self.gearid + ";");
			} else {
				file_to_send = "./" + pathname;
    				fs.readFile(file_to_send, 'utf-8', function(error, content) {
	        			res.writeHead(200, {"Content-Type": "text/html"});
        				res.end(content);
    				});
			}
		});

		// Loading socket.io
		var io = require('socket.io')(server);

		// When a client connects, we note it in the console
		io.sockets.on('connection', function (socket) {
			console.log("incoming connection");

			socket.on('clientlogin', function(uid, fn) {
				clients.push({uid: uid, socket: socket});
				console.log("Client: " + uid + " logged in!");
				fn("client login sucessfull");
			});

			socket.on('register', function(name, fn) {
				if (self.gearid == 8082) {
					cluster_gears.push({socket: socket, port: name, init: 0});
					console.log("registration@MASTER from " + name);
					fn({key: 'cool', value: 'your are in', port_src: name, port_dest: 8082});

					//gear-online
					//A gear is connected to the master, notify other people.
					cluster_gears.forEach(function(gear) {
						if (gear.port != name) 
							gear.socket.emit('gear-online', {port: name});
					});
				} else {
					console.log("G2G registration from " + name);
					cluster_gears.push({socket: socket, port: name, init: 0});
					fn({key: 'thx', value: 'we are linked', port_src: name, port_dest: self.gearid});
				}
			});

			socket.on('c2s_query_userid', function(p, fn) {
                                console.log("in c2s_query_userid " + p.uid);
                                var found = false;
                                clients.forEach(function (qtx) {
                                        console.log(qtx.uid + " vs " + p.uid);
                                        if (qtx.uid == p.uid)
                                                found = true;
                                });
                                if (found == true) {
                                        fn("sucess " + self.gearid + "<");
                                } else {
                                 	cluster_gears.forEach(function (g) {
						var sock = g.socket;
						sock.emit('s2s_query_userid', p, fn);
					});   
				}	
			});

			socket.on('c2s_chat', function(data) {
				console.log("c2s_chat:" + JSON.stringify(data));
                                chat_count++;
				if (self.gearid == data.port_dest) {
					var sent = false;
					clients.forEach(function(client) {
						if (client.uid == data.userid_dest && sent == false) {
							client.socket.emit('s2c_chat', data);
							sent = true;
							console.log("send c2s to s2c message");	
						}
					});
					if (sent == false) {
						console.log("Failed to forward s2c message " +  JSON.stringify(data));
					}	
				} else {
					var sent = false;
					console.log("total cluster gears: " + cluster_gears.length);
					cluster_gears.forEach(function (gear) {
						console.log("-->" + gear.port);
						if (gear.port == data.port_dest && sent == false) {
							gear.socket.emit('s2s_chat', data);
							sent = true;
						}
					});
                                        if (sent == false) {
                                                console.log("Failed to forward s2s message " +  JSON.stringify(data));
                                        }
				}
			});

                        self.add_common_handlers(socket);
                        self.add_handlers_S2S(socket);
		});
		
		console.log("server listening on port : " + self.gearid);
		server.listen(self.gearid);

                setInterval(function(){
                        if (self.gearid === 8082) {
                            //console.log(cluster_gears.length);
                            cluster_stats.splice(0, cluster_stats.length);
                            cluster_gears.forEach(function (obj) {
                                 obj.socket.emit('query-stats', {port: 0}, function(data) {
                                     cluster_stats.push(data);
                                     //console.log("->" + JSON.stringify(data));
                                 });
                            });
                            return;
                        }
                        
                        var num = self.gearid + "_" + Math.floor(1 + Math.random() * 10);;
                        clients.forEach(function (u) {
				if (num == u.uid) {
	                                var pixel = new Object();
					pixel.port_src = 0;
					pixel.port_dest = self.gearid;
					pixel.userid_src = "master";
					pixel.userid_dest = u.uid;
					pixel.msg = "Hello! " + num;
					pixel.ttl = 1;
                                	u.socket.emit('s2c_chat', pixel);

					var gear_ids = [];
		                        cluster_gears.forEach(function (obj) {
						gear_ids.push(obj.port);
                		        });
		//			console.log("send timed message = " + JSON.stringify(gear_ids));
		//			u.socket.emit('broadcast_glist', { glist: gear_ids, count: 2});
				}
                        });
			console.log("Connected users: " + clients.length + " ( " + num + " ) ");
                }, 1000);

		setInterval(function(){
			cluster_gears.forEach(function (obj) {
				var socket = obj.socket;
				console.log("heartbeat: " + obj.port);
				socket.emit('heartbeat','how are you?');
			});
		}, 60000);

	}

}

var zapp = new SampleApp();
zapp.initialize();
zapp.start();
