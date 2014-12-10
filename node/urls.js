var pages = require('./cachePages.js');
var sessionGPX = require('./sessionGPX.js');
var stencil = require('./lib/stencil.js');

stencil.loadStencils(process.cwd() + '/stencils/');

function fillStencil(stencilName, req, res)
{
	var rootObj = {};

	rootObj.req = req;

	return stencil.fillStencil(stencilName, rootObj);
}

module.exports.gets = {
	exampleHTML: {
		url: '/example',
		func: function(req, res) {
			res.end(fillStencil('example', req, res));
		}
	},

	home: {
		url: '/',
		func: function(req, res) {
			res.end(fillStencil('home', req, res));
		}
	},

	about: {
		url: '/about',
		func: function(req, res) {
			res.end(fillStencil('about', req, res));
		}
	},

	contact: {
		url: '/contact',
		func: function(req, res) {
			res.end(fillStencil('contact', req, res));
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