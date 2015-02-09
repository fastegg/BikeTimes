var mongoose = require('mongoose');
var dbAddress = process.env.MONGOLAB_URI || 'mongodb://localhost/test';
module.exports = new Accounts();

var db;
var accountSchema = mongoose.Schema({
    id: {type: Number, index: true},
    stravaid: Number,
    email: String,
    firstName: String,
    lastName: String,
    city: String,
    state: String,
    country: String,

    created: Number,
    lastLogin: Number
});

var racePaceEntrySchema = mongoose.Schema({
	activityid: {type: Number, index: true},
	ownerid: Number,
	racepace: Number
});

var Account = mongoose.model('Account', accountSchema);
var racePaceEntry = mongoose.model('RacePaceEntry', racePaceEntrySchema);

function Accounts()
{
	
}

function getNextID(name) {
   var ret = db.counters.findAndModify(
          {
            query: { _id: name },
            update: { $inc: { seq: 1 } },
            new: true
          }
   );

   return ret.seq;
}

Accounts.prototype.connect = function()
{
	mongoose.connect(dbAddress);

	db = mongoose.connection;
	db.on('error', console.error.bind(console, 'connection error:'));
	db.once('open', function (callback) {

	  console.log('db connection successful');
	});
}

Accounts.prototype.getAccountByID = function(id, func)
{
	Account.find({id: id}, func);
}

Accounts.prototype.getAccountByStravaID = function(stravaid, func)
{
	Account.find({stravaid: stravaid}, func);
}

Accounts.prototype.getOrCreateAccountFromStrava = function(stravaAthlete, func)
{
	Account.find({stravaid: stravaAthlete.id}, function(err, account){
		if(!err && account.length === 1)
		{
			module.exports.getEntriesForID(account[0].stravaid, function(err, entries) {
				var i;
				
				account[0].entries = {};

				for(i=0;i<entries.length;i++)
				{
					account[0].entries[entries[i].activityid] = entries[i];	
				}
				
				func(undefined, account[0]);

				account[0].lastLogin = Date.now();
				account[0].save();
			});
		}
		else
		{
			var act = new Account({stravaid: stravaAthlete.id, 
				email: stravaAthlete.email, 
				firstName: stravaAthlete.firstname, 
				lastName: stravaAthlete.lastname,
				city: stravaAthlete.city,
				state: stravaAthlete.state,
				country: stravaAthlete.country,

				created: Date.now(),
				lastLogin: Date.now()
			});

			act.save(function(err, account){
				account.entries = {};

				func(err, account);
			})
		}
	})
}

Accounts.prototype.newAccount = function(data, func)
{
	var act = new Account(data);

	act.save(func);
}

Accounts.prototype.getAccounts = function(func)
{
	Account.find(function (err, accounts) {
	  if (err) return console.error(err);
	  func(err, accounts);
	});
}

Accounts.prototype.getEntriesForID = function(id, func)
{
	racePaceEntry.find({ownerid: id}, function(err, entries) {
		if(err) return console.error(err);
		func(err, entries);
	});
}

Accounts.prototype.newEntry = function(data, func)
{
	var entry = new racePaceEntry(data);

	entry.save(function(err, entry){
		if(err) console.error(err);
		if(func)
			func(err, entry);
	});
}