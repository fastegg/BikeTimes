var pages = require('./cachePages.js');
var sessionGPX = require('./sessionGPX.js');
var stencil = require('./lib/stencil.js');
var error = require('./lib/errorReport.js');
var strava = require('./lib/strava');
var accounts = require('./lib/accounts.js');

var url = require('url');

stencil.loadStencils(process.cwd() + '/stencils/');

String.prototype.checkExt = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

module.exports.gets = {
	exampleHTML: {
		url: '/example',
		func: function(req, res) {
			//res.writeHead(200, {"Content-Type": "text/html"});
			res.end(stencil.fillStencilWithReq('example', req));
		}
	},

	home: {
		url: '/',
		func: function(req, res) {
			//res.writeHead(200, {"Content-Type": "text/html"});
			res.end(stencil.fillStencilWithReq('home', req));
		}
	},

	about: {
		url: '/about',
		func: function(req, res) {
			//res.writeHead(200, {"Content-Type": "text/html"});
			res.end(stencil.fillStencilWithReq('about', req));
		}
	},

	contact: {
		url: '/contact',
		func: function(req, res) {
			//res.writeHead(200, {"Content-Type": "text/html"});
			res.end(stencil.fillStencilWithReq('contact', req));
		}
	},

	toc: {
		url: '/toc',
		func: function(req, res) {
			res.end(stencil.fillStencilWithReq('toc', req));
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

	stravaLogout: {
		url: '/stravaLogout',
		func: strava.getLogout
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

	database: {
		url: '/database',
		func: function(req, res)
		{
			if(strava.isMasterAccount(req, res))
			{
				accounts.getAccounts(function(err, accounts) {
					if(!err)
					{
						res.end(stencil.fillStencilWithReq('database', req, accounts));
					}
					else
					{
						error.logError(err, req, res, 'Unable to load accounts!' + error.toString());
						res.redirect('/');
					}
				});
			}
			else
			{
				error.logWarning('Unauthorized request for /Database', req, res, "Unauthorized");
				res.redirect('/');
			}
			
		}
	},

	databaseEntries: {
		url: '/entries',
		func: function(req, res)
		{
			if(strava.isMasterAccount(req, res))
			{
				var urlParsed = url.parse(req.url, true);
				var ownerID = undefined;
				
				if(urlParsed && urlParsed.query && urlParsed.query.id)
				{
					ownerID = urlParsed.query.id;
				}

				accounts.getEntriesForID(ownerID, function(err, entries) {
					if(!err)
					{
						console.log(entries);
						res.end(stencil.fillStencilWithReq('entries', req, entries));
					}
					else
					{
						error.logError(err, req, res, 'Unable to load entries!' + error.toString());
						res.redirect('/');
					}
				});
			}
			else
			{
				error.logWarning('Unauthorized request for /entries', req, res, "Unauthorized");
				res.redirect('/');
			}
		}
	},

	png: {
		url: ['*.png', '*.jpg'],
		func: function(req, res)
		{
			var img = pages.getImage(req.url.slice(1));

			if(img)
			{
				res.writeHead(200, {'Content-Type': 'image/png' });
	     		res.end(img, 'binary');
			}
			else
			{
				res.writeHead(404, {'Content-Type': 'text/html' });
				res.write("404, Request not found");
				res.end();
			}
		}
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
	  		res.end();
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
		func: strava.useAthlete
	},

	stravaAccount:{
		url: undefined, //All pages
		func: strava.useAccount
	},

	stravaMessage: {
		url: undefined,
		func: strava.showMessages
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