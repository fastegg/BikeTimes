var path = require('path');
var fs = require('fs');
var cheerio = require('cheerio');

var pathExpr = /\{([\.a-z|A-Z].*?)\}/;

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

var stencil = function()
{
	this.stencils = {};
}

function evaluatePath(pathVar)
{
	if(pathVar.indexOf('{') === -1)
	{
		if(pathVar.indexOf('.') === 0)
		{
			return 'obj' + pathVar;
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
			var replaceWith = res[1].indexOf('.') === 0 ? 'obj' + res[1] : 'root.' + res[1];
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
			var replaceWith = res[1].indexOf('.') === 0 ? 'obj' + res[1] : 'root.' + res[1];
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

stencil.prototype.loadStencilsRecurse = function(stencilPath)
{
	var filenames = fs.readdirSync(stencilPath);
	var i;
	var iCount = 0;

	for(i=0;i<filenames.length;i++)
	{
		var stat = fs.statSync(stencilPath + '\\' + filenames[i]);

		if(stat.isFile())
		{
			var internalName = filenames[i].substring(0, filenames[i].indexOf('.'));
			
			this.stencils[internalName] = {};

			var html = fs.readFileSync(stencilPath + '\\' + filenames[i]);
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
			iCount += this.loadStencilsRecurse(stencilPath + '\\' + filenames[i]);
		}
	}

	return iCount;
}

stencil.prototype.loadStencils = function(stencilPath)
{
	console.log('Loading Stencils...');
	var sPath = path.resolve(stencilPath);

	var iCount = this.loadStencilsRecurse(sPath);

	console.log('Finished. ' + iCount + ' stencils loaded');
}

function evalArgs(obj, root, args)
{
	var rtn = '';
	try
	{
		rtn = eval(args);
	}
	catch(err)
	{
		console.log('Error evaluating stencil expression!', args);

		throw(err);
	}

	return rtn;
}

var sCount = 0;

function fillRecurse($, obj, objType, root)
{
	var objReturn = {
		'type': $.type, 
		'data': $.data,
		'name': $.name,
		'children': []
	};
	
	if($.dataif)
	{
		if(!evalArgs(obj, root, $.dataif))
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
					var result = evalArgs(obj, root, $.dataset[attribName].args[arg]);
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
			obj = evalArgs(obj, root, $.dataPath);
			objType = Object.prototype.toString.call(obj);
		}

		if($.dataStencil !== undefined)
		{
			if(objType === '[object Object]')
			{
				var rtn = module.exports.fillStencilWithObj($.dataStencil, obj, root);
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
				objReturn.children.push(fillRecurse($.children[i], obj, objType, root));
			}
		}
		else if(objType === '[object Array]')
		{
			for(i in obj)
			{
				for(n in $.children)
				{
					var newType = Object.prototype.toString.call(obj[i]);
					objReturn.children.push(fillRecurse($.children[n], obj[i], newType, root));
				}
			}
		}
	}
	else if($.type === 'root')
	{
		for(n in $.children)
		{
			objReturn.children.push(fillRecurse($.children[n], obj, objType, root));
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
			objReturn.children.push(fillRecurse($.children[n], obj, objType, root));
		}
	}

	return objReturn;
}

stencil.prototype.fillStencilWithObj = function(stencil, obj, root)
{
	var objFilledStencil = fillRecurse(this.stencils[stencil].$, obj, Object.prototype.toString.call(root), root);

	return objFilledStencil;
}

stencil.prototype.fillStencil = function(stencil, root)
{
	var objFilledStencil = fillRecurse(this.stencils[stencil].$, root, Object.prototype.toString.call(root), root);
	
	objFilledStencil.html = this.stencils[stencil].$.html;
	
	return cheerio.html(objFilledStencil, {decodeEntities: false});
}

module.exports = new stencil();