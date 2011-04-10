now.ready(function() {
	now.getModelsToRender($.cookie('collection.id'), render);
});

function render(model) {
	if (!model) { return; }
	dust.render(model.template, model, function(err, out) {
		if (err) {
			console.log(err); 
		} else {
			$('#collections').append(out);
		}
	});	
}