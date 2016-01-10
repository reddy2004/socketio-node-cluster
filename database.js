dbname = 'try1';
collections = ['messages', 'logs'];
mongojs = require('mongojs');
db = null;
db_type = null;

/*
 * Configuration information is stored here
 */
config_master_gear = "192.168.1.149";


var master = function()
{
    return config_master_gear
    
}
/*
 * 
 * Edit accordingly for your setup
 */
var connect_vmadmin = function(isMaster) {
	console.log("Connect to database");
	db = mongojs("127.0.0.1:27017/"+dbname, collections);
        db_type = "vmadmin";
}

/*
 * Specific api to connect to your backend database in cloud.
 * Master and Gears may connect to different local/same databases.
 */
var connect_cloud = function(isMaster) {
        db_type = "cloud";
    
}

var log = function(str) {
    if (db_type == "cloud") {
        //Dont log
        return;
    }
    var ts = "what";
    db.logs.save({timestamp: ts, log: str}, 
            function(err, saved) {
                    if( err || !saved ) console.log("Log (" + str + ") not saved");
            });    
}

var store_msg = function(msgPayload) {
	var from = msgPayload.from;
	var to = msgPayload.to;
	var uuid = msgPayload.uuid;
	var ts = msgPayload.timestamp;
	var type = msgPayload.type;
	var data = msgPayload.data;

        db.messages.save({_id: msgPayload.uuid, from: msgPayload.from, to: msgPayload.to,
		timestamp: msgPayload.timestamp, type: msgPayload.type, data: msgPayload.data}, 
		function(err, saved) {
                	if( err || !saved ) console.log("Message " + msgPayload.uuid + " not saved");
                	else console.log("message " + msgPayload.uuid  +" saved");
        	});

}

var dump_all_messages = function(fromv) {
        db.messages.find({from: fromv}, function(err, users) {
                if( err || !users) console.log("No message for this user found");
                else users.forEach( function(femaleUser) {
                 console.log(femaleUser);
                } );
        });
}

var send_pending_messages = function(toV) {
        db.messages.find({to: toV}, function(err, messages) {
                if( err || !messages) console.log("No pending message for this user found");
                else messages.forEach( function(msg) {
			/* Send over socket, and delete the message from database. */
                 	console.log(msg);
                } );
        });	
}

module.exports.connect = connect_vmadmin; //change to connect_cloud in production
module.exports.store_msg = store_msg;
module.exports.dump_all_messages = dump_all_messages;
module.exports.send_pending_messages = send_pending_messages;
module.exports.log = log;
module.exports.master = master;