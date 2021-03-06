var express = require('express');
var app = express();
var urls = require('./urls.js');
var bb = require('connect-busboy');
var session = require('cookie-session');
var errorReport = require('./lib/errorReport.js');
var sessionData = require('./lib/sessionData.js');
var accounts = require('./lib/accounts.js');

app.set('port', (process.env.PORT || 3000));

accounts.connect();

app.set('trust proxy', 1); // trust first proxy

//express cookie Session
app.use(session({
	name: 'racepacesession',
	secret: 'wordSecret1forRacePace'
}));

app.use(sessionData({}));

//Busboy
app.use(
	bb({
		limits: {
			fields: 10, //10 Fields per submit. This is very low, but shouldn't get reached
			files: 1, //1 File at a time
			fileSize: 2 * 1024 * 1024 //2MB file Limit
		}
	})
);

for(var urlName in urls.uses)
{
	if(urls.uses[urlName].url)
	{
		app.use(urls.uses[urlName].url, urls.uses[urlName].func);	
	}
	else
	{
		app.use(urls.uses[urlName].func);
	}
	
}

for(urlName in urls.gets)
{
	app.get(urls.gets[urlName].url, urls.gets[urlName].func);
}

for(urlName in urls.posts)
{
	app.post(urls.posts[urlName].url, urls.posts[urlName].func);
}

app.use(errorReport.setup({}));

var server = app.listen(app.get('port'), function() {
	var host = server.address().address;
	var port = server.address().port;

	console.log("Race Pace listening at http://%s:%s", host, app.get('port'));
});