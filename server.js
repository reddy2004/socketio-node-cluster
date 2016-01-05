
var express = require('express');
app = require('express.io')();
app.http().io()
 
// build your realtime-web app
// Send the client html.
app.use(express.static('./public'));
 
console.log('%s: GEAR server started.', Date(Date.now()) );
app.listen(8080);

