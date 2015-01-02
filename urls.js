var pages = require('./cachePages.js');
var sessionGPX = require('./sessionGPX.js');
var stencil = require('./lib/stencil.js');
var error = require('./lib/errorReport.js');
var strava = require('./lib/strava');

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

	strava: {
		url: '/strava',
		func: strava.getLists
	},

	strem: {
		url: '/stream',
		func: strava.loadStream
	},

	stravaToken: {
		url: '/token_exchange',
		func: strava.authGet
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

	//MUST BE LAST!!!!!
	error404: {
		url: '*', //This should catch any pages that havne't been caught yet. 
		func: function(req, res) {
			error.logWarning('404 detected', req, res);
			res.writeHead(404, {"Content-Type": "text/html"});
	  		res.write("404, Request not found");
	  		res.send();
		}
	}

	//DON"T ADD ANY MORE HERE!!! 404 ERROR MUST BE LAST
};

module.exports.uses = {
	/*
	session: {
		url: undefined, //All pages
		func: sessionGPX.useSession
	},
	*/

	gpx: {
		url: '/uploadGPX',
		func: sessionGPX.use
	},

	strava: {
		url: undefined, //All pages
		func: strava.use
	},

	printError: {
		url: undefined, //All pages
		func: error.addErrors 
	},

	stencil: {
		url: undefined, //All pages
		func: stencil.setReqAndRes
	}
}


module.exports.posts = {
	gpx: {
		url: '/uploadGPX',
		func: sessionGPX.post
	}
}