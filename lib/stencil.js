var path = require('path');
var fs = require('fs');
var cheerio = require('cheerio');
var deepcopy = require('./deepcopy');
var error = require('./errorReport.js');
var url = require('url');

var pathExpr = /\{([\.%a-z|A-Z].*?)\}/;

String.prototype.map = function(choices, returnOrig)
{
	var choicelst = choices.split(', ');

	for(var i in choicelst)
	{
		var tkn = choicelst[i].split(':');

		//For some reason tkn and this are not the same type, so === will fail here :(
		if(tkn.length === 2 && this == tkn[0])
			return tkn[1];
	}

	if(returnOrig)
		return this;
	else
		return '';
}

String.prototype.parseInt = function()
{
	return parseInt(this);
}

function pad(num, size) {
    var s = num+"";
    while (s.length < size) s = "0" + s;
    return s;
}

Number.prototype.displayTime = function(displayHours, displayMins, padSeconds)
{
	var newDate = new Date(this * 1000);
	var rtn = '';

	if(displayHours || newDate.getUTCHours())
	{
		rtn += pad(newDate.getUTCHours(),2) + ':';
		displayMins = true;
	}

	if(displayMins || newDate.getUTCMinutes())
	{
		rtn += pad(newDate.getUTCMinutes(),2) + ':';
		padSeconds = true;
	}

	if(padSeconds)
		rtn += pad(newDate.getUTCSeconds(), 2);
	else
		rtn += newDate.getUTCSeconds();

	return rtn;
}

Number.prototype.MtoKM = function()
{
	return this / 1000;
}

Number.prototype.round = function(places)
{
	var exp = Math.pow(10, places);

	return Math.round(this * exp) / exp;
}

var monthsLong = ['January', 'Febuary', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
var daysLong = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
var daysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
var ampm = ['AM', 'PM'];

//Returns in the following format: MM/DD/YYYY
String.prototype.displayDateShort = function()
{
	var newDate = new Date(this);
	var rtn = '';

	rtn = pad(newDate.getMonth() + 1,2) + '/' + pad(newDate.getDate(), 2) + '/' + (newDate.getFullYear());

	return rtn;
}

//Returns in the following format: Day, MM/DD/YYYY
String.prototype.displayDateShortWithDay = function()
{
	var newDate = new Date(this);
	var rtn = '';

	rtn = daysShort[newDate.getDay()] + ', ' + pad(newDate.getMonth() + 1, 2) + '/' + pad(newDate.getDate(), 2) + '/' + newDate.getFullYear();

	return rtn;
}

//Returns in the following format: 1:50 PM on Friday, August 29, 2014
String.prototype.displayDate = function()
{
	var newDate = new Date(this);
	var rtn = '';

	rtn += (newDate.getHours() > 12 ? newDate.getHours() - 12 : newDate.getHours()) + ':' + newDate.getMinutes() + ' ' + ampm[newDate.getHours() > 12 ? 0 : 1];
	rtn += ' on ' + daysLong[newDate.getDay()];
	rtn += ', ' + monthsLong[newDate.getMonth()] + ' ' + newDate.getDate() + ', ' + newDate.getFullYear();

	return rtn;
}

var stencil = function()
{
	this.stencils = {};
}

var curReq = undefined;
var curRes = undefined;

stencil.prototype.setReqAndRes = function(req, res, next)
{
	curReq = req;
	curRes = res;
	
	next();
}

function evaluatePath(pathVar)
{
	if(pathVar.indexOf('{') === -1)
	{
		if(pathVar.indexOf('.') === 0)
		{
			return 'obj' + pathVar;
		}
		else if(pathVar.indexOf('%') === 0)
		{
			return 'vars.' + pathVar.slice(1);
		}
		else
		{
			return 'root.' + pathVar;
		}
	}
	else
	{
		while(res = pathVar.match(pathExpr))
		{
			var replaceWith = res[1].indexOf('.') === 0 ? 'obj' + res[1] : res[1].indexOf('%') === 0 ? 'vars.' + res[1].slice(1) : 'root.' + res[1];
			pathVar = pathVar.replace(res[0], replaceWith);
		}

		return pathVar;
	}
}

function evaluateArgs(pathVar)
{
	var rtn = {'path': pathVar, args: {}};

	if(pathVar.indexOf('{') === -1)
	{
		var replaceWith;

		if(pathVar.indexOf('.') === 0)
		{
			replaceWith = 'obj' + pathVar;
		}
		else if(pathVar.indexOf('%') === 0)
		{
			replaceWith = 'vars.' + pathVar.splice(1,pathVar.length-2);
		}
		else
		{
			replaceWith = 'root.' + pathVar;
		}

		rtn.args[pathVar] = replaceWith;

		return rtn;
	}
	else
	{
		while(res = pathVar.match(pathExpr))
		{
			var replaceWith = res[1].indexOf('.') === 0 ? 'obj' + res[1] : res[1].indexOf('%') === 0 ? 'vars.' + res[1].slice(1) : 'root.' + res[1];
			pathVar = pathVar.replace(res[0], replaceWith);

			rtn.args[res[0]] = replaceWith;
		}
		return rtn;
	}
}

function parseRecurse($, curPath)
{
	var rtn = {};
	var i;

	if($.type === 'tag' && $.attribs)
	{
		for(var attrib in $.attribs)
		{
			if(attrib === 'data-path')
			{
				$.dataPath = evaluatePath($.attribs[attrib]);
			}
			else if(attrib === 'data-if')
			{
				$.dataif = evaluatePath($.attribs[attrib]);
				
			}	
			else if(attrib.indexOf('data-set-') === 0)
			{
				if(!$.dataset)
					$.dataset = {};

				$.dataset[attrib.slice(9)] = evaluateArgs($.attribs[attrib]);
			}
			else if(attrib === 'data-stencil')
			{
				$.dataStencil = $.attribs[attrib];
			}
			else
			{
				continue;
			}

			delete $.attribs.attrib;
		}
	}

	if($.children && $.children.length > 0)
	{
		for(i=0;i<$.children.length;i++)
		{
			parseRecurse($.children[i], $.dataPath);
		}
	}
}

stencil.prototype.dirChange = function(event, filename)
{
	stencilObj.loadStencils(stencilObj.stencilPath);
}

stencil.prototype.loadStencilsRecurse = function(stencilPath)
{
	var filenames = fs.readdirSync(stencilPath);
	var i;
	var iCount = 0;

	for(i=0;i<filenames.length;i++)
	{
		var stat = fs.statSync(stencilPath + '/' + filenames[i]);

		if(stat.isFile())
		{
			var internalName = filenames[i].substring(0, filenames[i].indexOf('.'));
			
			this.stencils[internalName] = {};

			var html = fs.readFileSync(stencilPath + '/' + filenames[i]);
			var $ = cheerio.load(html, {decodeEntities: false});
			var parsed = $._root;
			
			parseRecurse(parsed, 'root');
			
			this.stencils[internalName].html = html;
			this.stencils[internalName].$ = parsed;
			this.stencils[internalName].$.html = $.html;

			iCount++;	
		}
		else if(stat.isDirectory())
		{
			fs.watch(stencilPath + '/' + filenames[i], this.dirChange);

			iCount += this.loadStencilsRecurse(stencilPath + '/' + filenames[i]);
		}
	}

	return iCount;
}

stencil.prototype.loadStencils = function(stencilPath)
{
	var sPath = path.resolve(stencilPath);
	var iCount = this.loadStencilsRecurse(sPath);

	fs.watch(sPath, this.dirChange);
	this.stencilPath = stencilPath;
}

function evalArgs(obj, root, args, vars)
{
	var rtn = '';
	try
	{
		rtn = eval(args);
	}
	catch(err)
	{
		error.logWarning('Error evaluating stencil expression!' + args, curReq, curRes);
		console.log(err);

		return undefined;
	}

	return rtn;
}

function evalDataIf(obj, root, args, vars)
{
	var rtn = evalArgs(obj, root, args, vars)

	if(rtn === undefined || rtn == 0)
		return false;

	return true;
}

function addChildren(obj, children)
{
	if(children === undefined)
		return;
	
	if(children.length)
	{
		var i;

		for(i=0;i<children.length;i++)
		{
			obj.push(children[i]);
		}
	}
	else
	{
		obj.push(children)
	}
}

var sCount = 0;

function fillRecurse($, obj, objType, root, vars)
{
	var i,n;
	var objReturn = {
		'type': $.type, 
		'data': $.data,
		'name': $.name,
		'children': []
	};
	
	if($.dataif)
	{
		if(!evalDataIf(obj, root, $.dataif, vars))
			return;
	}

	if($.type === 'text')
	{
		if(objType === '[object String]' || objType ===  '[object Number]')
		{
			objReturn.data = obj;
		}
	}
	else if($.type === 'tag')
	{
		objReturn.attribs = {};
		
		//Copy all the attribs
		for(var attrib in $.attribs)
		{
			if(attrib.indexOf('data-set-') === 0)
			{
				var attribName = attrib.slice(9);
				objReturn.attribs[attribName] = $.attribs[attrib];
				
				for(var arg in $.dataset[attribName].args)
				{
					var result = evalArgs(obj, root, $.dataset[attribName].args[arg], vars);
					objReturn.attribs[attribName] = objReturn.attribs[attribName].replace(arg, result);
				}
			}
			else
			{
				objReturn.attribs[attrib] = $.attribs[attrib];
			}
		}

		if($.dataPath)
		{
			obj = evalArgs(obj, root, $.dataPath, vars);
			objType = Object.prototype.toString.call(obj);
		}

		if($.dataStencil !== undefined)
		{
			if(objType === '[object Object]')
			{
				var rtn = module.exports.fillStencilWithObj($.dataStencil, obj, root, vars);
				//objReturn.children.push(module.exports.fillStencilWithObj($.dataStencil, obj, root));
				return rtn;
			}
			else
			{
				//Log error about the stencil! Must use an object, or that doesn't make sense!!!! AHHHH!!!!
			}
		}
		else if(objType === '[object Number]' || objType === '[object String]')
		{
			objReturn.children.push({ 'type': 'text', 'data': ''+obj });
		}
		else if(objType === '[object Object]')
		{
			for(i in $.children)
			{
				addChildren(objReturn.children,fillRecurse($.children[i], obj, objType, root, vars));
			}
		}
		else if(objType === '[object Array]')
		{
			var rtnList = [];
			var prevIndex = vars.index;

			for(i=0;i<obj.length; i++)
			{
				//var newRtnObj = deepcopy(objReturn);
				vars.index = i;
				
				for(n in $.children)
				{
					var newType = Object.prototype.toString.call(obj[i]);
					var newChild = fillRecurse($.children[n], obj[i], newType, root, vars);

					if(newChild)
						addChildren(objReturn.children,newChild);
				}

				//rtnList.push(newRtnObj);
			}

			vars.index = prevIndex;
		}
	}
	else if($.type === 'root')
	{
		for(n in $.children)
		{
			addChildren(objReturn.children, fillRecurse($.children[n], obj, objType, root, vars));
		}
	}
	else if($.type === 'script')
	{
		objReturn.attribs = {};
		
		//Copy all the attribs
		for(var attrib in $.attribs)
		{
			objReturn.attribs[attrib] = $.attribs[attrib];
		}

		for(n in $.children)
		{
			objReturn.children.push(fillRecurse($.children[n], obj, objType, root, vars));
		}
	}

	for(i=objReturn.children.length-1;i>=0;i--)
	{
		if(objReturn.children[i] === undefined)
		{
			objReturn.children.splice(i,1);
		}
	}

	return objReturn;
}

stencil.prototype.fillStencilWithObj = function(stencil, obj, root, vars)
{
	var objFilledStencil = fillRecurse(this.stencils[stencil].$, obj, Object.prototype.toString.call(root), root, vars);

	return objFilledStencil;
}

stencil.prototype.fillStencil = function(stencil, root, vars)
{
	var objFilledStencil = fillRecurse(this.stencils[stencil].$, root, Object.prototype.toString.call(root), root, vars);
	
	objFilledStencil.html = this.stencils[stencil].$.html;
	
	return cheerio.html(objFilledStencil, {decodeEntities: false});
}

stencil.prototype.fillStencilWithReq = function(stencilName, req)
{
	var rootObj = {};
	var vars = {index: -1, urlVars: {}};

	rootObj.req = req;

	var urlParsed = url.parse(req.url, true);

	if(urlParsed && urlParsed.query)
	{
		for(var urlVar in urlParsed.query)
		{
			vars.urlVars[urlVar] = urlParsed.query[urlVar];
		}
	}

	return this.fillStencil(stencilName, rootObj, vars);
}

var stencilObj = new stencil();

module.exports = stencilObj;