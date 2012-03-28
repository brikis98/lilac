var fs = require('fs');
var path = require('path');
var _ = require('underscore');
var watchTree = require('watch-tree');

exports.watch = function(dust, templateDir, publicDir, templateExtension) {
	// Compile all templates at start-up
	var templates = fs.readdirSync(templateDir);
	_.each(templates, function(template) { compileTemplate(path.join(templateDir, template)); });

	// Watch the templates directory and recompile them if a file changes or is created
	var watcher = watchTree.watchTree(templateDir, {'sample-rate': 500});
	watcher.on('fileModified', function(path) { compileTemplate(path); });
	watcher.on('fileCreated', function(path) { compileTemplate(path); });

	function compileTemplate(file) {
		if (file && path.extname(file) == templateExtension) {
			console.log('Recompiling: ' + file);
			var templateName = path.basename(file, templateExtension);
			var compiled = dust.compile(fs.readFileSync(file, 'UTF-8'), templateName);
			dust.loadSource(compiled);
			fs.writeFileSync(path.join(publicDir, templateName + '.js'), compiled);
		}
	}
}