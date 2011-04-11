var Models = {};
if (typeof exports !== 'undefined') {
	Models = exports;

	_ = require('underscore')._;
	Backbone = require('backbone');
}

Models.DelayedModel = Backbone.Model.extend({
	defaults: {
		isFetched: false,
		isRendered: false,
		template: 'delayedModel',
		delay: 0,
		allowRendering: 'both'			// valid options: client-only, server-only, both
	}
});

