var fs = require('fs');

function pages(path)
{
	var path = process.cwd() + '/pages/';
	var files = fs.readdirSync(path);

	//console.log('Files: ' + files);

	this.pages = {};
	this.images = {};

	this.loadFilesRecurse(path, '', files);
	this.loadImagesRecurse(path, '', files);
}

pages.prototype.loadFilesRecurse = function(rootPath, path, files)
{
	for(var i=0; i<files.length; i++)
	{
		var stat = fs.statSync(rootPath + files[i]);

		if(stat.isDirectory())
		{
			this.loadFilesRecurse(rootPath + files[i] + '/', path + files[i] + '/', fs.readdirSync(rootPath + files[i]));
		}
		else
		{
			var readFile = fs.readFileSync(rootPath + files[i]);
			var saveFileName = (path + files[i]).toLowerCase();

			this.pages[saveFileName] = readFile.toString();
		}
	}
}

pages.prototype.getPage = function(pageName)
{
	pageName = pageName.toLowerCase();

	return this.pages[pageName];
}

pages.prototype.loadImagesRecurse = function(rootPath, path, files)
{
	for(var i=0; i<files.length; i++)
	{
		var stat = fs.statSync(rootPath + files[i]);

		if(stat.isDirectory())
		{
			this.loadImagesRecurse(rootPath + files[i] + '/', path + files[i] + '/', fs.readdirSync(rootPath + files[i]));
		}
		else
		{
			var img = fs.readFileSync(rootPath + files[i]);
     		var saveFileName = (path + files[i]).toLowerCase();

     		this.images[saveFileName] = img;
		}
	}
}

pages.prototype.getImage = function(imgName)
{
	imgName = imgName.toLowerCase();

	return this.images[imgName];
}

module.exports = new pages();