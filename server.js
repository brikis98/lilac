var express = require('express');
var dust = require('dust');
var Models = require('./models/models');
var Collections = require('./models/collections');
var lilac = require('./lib/lilac');
require('./lib/watcher').watch(dust, './templates', './public/templates', '.jst');

var app = express.createServer();
app.use(express.cookieParser());
app.listen(8124);

lilac.initialize(app);

// Static resources
app.get('/public/*.(js|css)', function(req, res, next) {
	res.sendfile('./' + req.url);
});

app.get('/', function(req, res, next) {
	var collection = new Collections.DelayedCollection([
		new Models.DelayedModel(), 
		new Models.DelayedModel({allowRendering: 'client-only'}),
		new Models.DelayedModel({delay: 200, allowRendering: 'server-only'}), 		
		new Models.DelayedModel({delay: 500}), 		
		new Models.DelayedModel({delay: 1000})
	]);	
	collection.fetch();
	lilac.render(req, res, collection, 'index');
});







