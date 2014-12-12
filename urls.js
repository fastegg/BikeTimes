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

String.prototype.checkExt = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

module.exports.gets = {
	exampleHTML: {
		url: '/example',
		func: function(req, res) {
			res.writeHead(200, {"Content-Type": "text/html"});
			res.end(fillStencil('example', req, res));
		}
	},

	home: {
		url: '/',
		func: function(req, res) {
			res.writeHead(200, {"Content-Type": "text/html"});
			res.end(fillStencil('home', req, res));
		}
	},

	about: {
		url: '/about',
		func: function(req, res) {
			res.writeHead(200, {"Content-Type": "text/html"});
			res.end(fillStencil('about', req, res));
		}
	},

	contact: {
		url: '/contact',
		func: function(req, res) {
			res.writeHead(200, {"Content-Type": "text/html"});
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
	},

	styleAndCode: {
		url: ['/code/*.js', '/style/*.css'],
		func: function(req, res) {
			if(req.url.checkExt('.js'))
				res.setHeader("Content-Type", "application/javascript");
			else
				res.setHeader("Content-Type", "text/css");

            res.writeHead(200);
			res.end(pages.getPage(req.url.slice(1)));
		}
	},

	error404: {
		url: '*',
		func: function(req, res) {
			res.writeHead(404, {"Content-Type": "text/html"});
	  		res.write("404, Request not found");
	  		res.end();
		}
	}
};

module.exports.uses = {
	session: {
		url: '*',
		func: sessionGPX.useSession
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