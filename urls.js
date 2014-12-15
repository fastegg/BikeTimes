var pages = require('./cachePages.js');
var sessionGPX = require('./sessionGPX.js');
var stencil = require('./lib/stencil.js');
var error = require('./lib/errorReport.js');

stencil.loadStencils(process.cwd() + '/stencils/');

String.prototype.checkExt = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

module.exports.gets = {
	exampleHTML: {
		url: '/example',
		func: function(req, res) {
			//res.writeHead(200, {"Content-Type": "text/html"});
			res.send(stencil.fillStencilWithReq('example', req));
		}
	},

	home: {
		url: '/',
		func: function(req, res) {
			//res.writeHead(200, {"Content-Type": "text/html"});
			res.send(stencil.fillStencilWithReq('home', req));
		}
	},

	about: {
		url: '/about',
		func: function(req, res) {
			//res.writeHead(200, {"Content-Type": "text/html"});
			res.send(stencil.fillStencilWithReq('about', req));
		}
	},

	contact: {
		url: '/contact',
		func: function(req, res) {
			//res.writeHead(200, {"Content-Type": "text/html"});
			res.send(stencil.fillStencilWithReq('contact', req));
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
				res.writeHead(200, {"Content-Type": "application/javascript"});
			else
				res.writeHead(200, {"Content-Type": "text/css"});

			res.end(pages.getPage(req.url.slice(1)));
		}
	},

	error404: {
		url: '*',
		func: function(req, res) {
			error.logWarning('404 detected', req, res);
			res.writeHead(404, {"Content-Type": "text/html"});
	  		res.write("404, Request not found");
	  		res.send();
		}
	}
};

module.exports.uses = {
	session: {
		url: undefined, //All pages
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