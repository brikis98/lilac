var express = require('express');
var dust = require('dust');
var Models = require('./models/models');
var Collections = require('./models/collections');
var serverRender = require('./dust-lib/serverRender');
require('./dust-lib/watcher').watch(dust);

var app = express.createServer();
app.use(express.cookieParser());
app.listen(8124);

serverRender.initialize(app);

// Static resources
app.get('/public/*.(js|css)', function(req, res, next) {
	res.sendfile('./' + req.url);
});

app.get('/', function(req, res, next) {
	var collection = new Collections.DelayedCollection([
		new Models.DelayedModel(), 
		new Models.DelayedModel({delay: 200, serverOnly: true}), 		
		new Models.DelayedModel({delay: 500}), 		
		new Models.DelayedModel({delay: 1000})
	]);	
	serverRender.render(req, res, collection);
});







