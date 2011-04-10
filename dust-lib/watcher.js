var fs = require('fs');
var path = require('path');

var TEMPLATE_DIR = './templates';
var PUBLIC_DIR = './public/templates';

exports.watch = function(dust) {
	// Compile all templates at start-up
	var templates = fs.readdirSync(TEMPLATE_DIR);
	_.each(templates, function(template) { compileTemplate(path.join(TEMPLATE_DIR, template)); });

	// Watch the templates directory and recompile them if a file changes or is created
	var watcher = require('watch-tree').watchTree(TEMPLATE_DIR, {'sample-rate': 500});
	watcher.on('fileModified', function(path) { compileTemplate(path); });
	watcher.on('fileCreated', function(path) { compileTemplate(path); });

	function compileTemplate(file) {
		if (file) {
			console.log('Recompiling: ' + file);
			var templateName = path.basename(file, '.jst');
			var compiled = dust.compile(fs.readFileSync(file, 'UTF-8'), templateName);
			dust.loadSource(compiled);
			fs.writeFileSync(path.join(PUBLIC_DIR, templateName + '.js'), compiled);
		}
	}
}