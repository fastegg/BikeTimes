var pages = require('./cachePages.js');
var sessionGPX = require('./sessionGPX.js');

module.exports.gets = {
	home: {
		url: '/',
		func: function(req, res) {
			var iViews = req.session.views || 0;
			req.session.views = ++iViews;
			res.send(pages.getPage('home.html'));
		}
	},

	about: {
		url: '/about',
		func: function(req, res) {
			res.send(pages.getPage('about.html'));
		}
	},

	viewGPX: {
		url: '/viewGPX',
		func: sessionGPX.view
	},

	getGPX: {
		url: '/uploadGPX',
		func: sessionGPX.get
	},

	viewGPXJS: {
		url: ['/custom/viewGPX.js'],
		func: sessionGPX.getJS
	}
};

module.exports.uses = {
	session: {
		url: '*',
		func: sessionGPX.useSession
	},

	styleAndCode: {
		url: ['/code/*.js', '/style/*.css'],
		func: function(req, res) {
			console.log('Requesting ' + req.baseUrl);
			res.send(pages.getPage(req.baseUrl.slice(1)));
		}
	},

	gpx: {
		url: '/uploadGPX',
		func: sessionGPX.use
	}
}


module.exports.posts = {
	gpx: {
		url: '/uploadGPX',
		func: sessionGPX.post
	}
}