var dust = require('dust');
var nowjs = require('now');
var _ = require('underscore');

var everyone = null;
var collectionCache = null;

var base = dust.makeBase({
	renderIfReady: function(chunk, context, bodies, params) {
		var model = context.current();
		return chunk.map(function(chunk) {
			renderChunk(chunk, model, context);
		});
	}
});

exports.initialize = function(app) {
	everyone = nowjs.initialize(app);
	collectionCache = {};
	everyone.now.getModelsToRender = getModelsToRender;
}
  
exports.render = function(req, res, collection, template) {
	var collectionId = exports.cacheCollection(req, res, collection);
	res.cookie('collection.id', collectionId, {httpOnly: false});
	render(template, base.push({collection: collection.models, noScript: noScript(req)}), res);
}

// WARNING: to keep this demo simple, collections are just cached in memory, with no authentication, and no cleanup. In real usage, you'd want to
// store this data externally (e.g. redis), use proper id generation, ensure users can only access their own collections, etc. 
exports.cacheCollection = function(req, res, collection) {
	var collectionId = _.size(collectionCache);
	collectionCache[collectionId] = collection;
	return collectionId;
}

exports.getCollectionFromCache = function(collectionId) {
	return collectionCache[collectionId];
}

function renderChunk(chunk, model, context) {
	if (model.get('isFetched') && (model.get('allowRendering') != 'client-only' || context.get('noScript'))) {	
		renderFetchedModel(chunk, model);
	} else if (!model.get('isFetched') && (model.get('allowRendering') == 'server-only' || context.get('noScript'))) {
		model.bind('change', _.once(function() { renderFetchedModel(chunk, model); }));
	} else {
		chunk.end(0);
	}
}

function renderFetchedModel(chunk, model) {
	render(model.get('template'), model.attributes, chunk);
	model.set({isRendered: true, renderedServerSide: true}, {silent: true});
}

function getModelsToRender(collectionId, callback) {
	var collection = exports.getCollectionFromCache(collectionId);
	if (collection) {
		collection.each(function(model) { sendModelToClient(model, callback); });
	} else {
		callback(null);
	}
}

function sendModelToClient(model, callback) {
	if (model.get('isRendered')) {
		return;
	} else if (model.get('isFetched')) {
		callback(model);
	} else {
		 model.bind('change', _.once(function(model) { callback(model); }));
	}
}

function noScript(req) {
	return typeof req.query.noScript !== 'undefined' && req.query.noScript == 'true';
}

function render(template, context, res) {
	var stream = dust.stream(template, context);
	stream.on('data', function(data) { res.write(data); });
	stream.on('end', function() { res.end(); });
	stream.on('error', function(err) { res.end(err); });
}