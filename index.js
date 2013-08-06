var express = require('express');
var Facebook = require('facebook-node-sdk');
var async   = require('async');
var mustache = require('mustache');
var fs = require('fs');
var clone = require('clone');

var app = express();

app.configure(function () {
  app.use(express.bodyParser());
  app.use(express.cookieParser());
  app.use(express.session({ secret: process.env.SESSION_SECRET || 'secret123abc'}));
  app.use(Facebook.middleware({ appId: process.env.FACEBOOK_APP_ID, secret: process.env.FACEBOOK_SECRET }));
});

var mustacheExpress = require('mustache-express');

// Register '.ms' extension with The Mustache Express
app.engine('ms', mustacheExpress());

app.set('view engine', 'ms');
app.set('views', __dirname + '/views');

app.use(express.static(__dirname + '/public'));

app.all('*', Facebook.loginRequired({ scope: ['user_groups']}), function(req, res, next){


	var user, ismember = false, isadmin = false, error = null;
    async.parallel([
      function(cb) {
 		 req.facebook.api('/me', function(err, thisuser) {
 		 	if (err) {
 		 		error = err;
 		 	} else {
         		user = thisuser;
         	}
      	    cb();
        });
      },
      function(cb) {
 		 req.facebook.api('/me/groups', function(err, groups) {
 		 	var i, group;
 		 	if (err) {
 		 		error = err;
 		 		cb();
 		 		return;
 		 	}
			for (i in groups.data) {
				group = groups.data[i];
				if (group.id == process.env.MEMBERS_GROUP_ID) {
					ismember = true;
				}
				if (group.id == process.env.ADMIN_GROUP_ID) {
					isadmin = true;
				}
			}
			cb();
        });
      }
    ], function() {
    	if (error) {
			res.writeHead(503, {'Content-Type': 'text/plain'});
			res.end('Sorry, an error occurred: '+error);
    		return;
    	}
    	user.ismember = ismember;
    	user.isadmin = isadmin;
    	if (!user.ismember) {
			res.writeHead(403, {'Content-Type': 'text/plain'});
			res.end('Sorry ' + user.first_name +", but this page is only for team members.");
    		return;
    	}
    	req.user = user;
    	next();
    });
});


function adminRequired(req, res, next) {
	if (req.user.isadmin) {
		next();
	} else {
		res.status(403);
		params = {
			'title': "Forbidden",
			'body': "Sorry, only committee members are allowed to edit the site.  To avoid this error in future, consider running to be on the committee next year.",
		};
		renderPage(req, res, params);
	}
}
app.all('/edit/*', adminRequired);
app.all('/new/*', adminRequired);

var editpageform = "<strong>This page is currently experimental.</strong><form method='post' action='{{#data._id}}/edit/{{data._id}}{{/data._id}}{{^data._id}}/new/{{data.type}}{{/data._id}}'>{{#data._rev}}<input type='hidden' name='_rev' value='{{data._rev}}' />{{/data._rev}}<label>Page URL: <input type='text' value='{{data.url}}' name='url'/> (must start with a /)</label>Page Title: <input type='text' value='{{data.title}}' name='title' /></label><label>Content: <textarea name='body'>{{data.body}}</textarea></label><input type='submit' value='{{#data._id}}Save{{/data._id}}{{^data._id}}New{{/data._id}}' class='button' /></form>";

app.get('/new/page', function (req, res) {
	var params = {
		title: 'New Page',
	}
	params.body = editpageform;
	params.data = {type: 'page'};
	renderPage(req, res, params);
});

app.get('/edit/:id', function (req, res) {

	var id = req.params.id;
	couchget(id, function (err, data) {
		var params = {
			title: "Edit "+data.type,
		}
		if (err) {
			res.status(503);
			params.body = "Sorry, A problem occurred while connecting to the database";
			console.log(err);
		} else if (data.error) {
			if (data.error == "not_found") {
				res.status(404);
				params.body = "Sorry, that id cannot be found in the database";
			} else {
				res.status(503);
				params.body = "Sorry, the request from the database failed: "+data.error+", Reason:"+data.reason;
			}
		} else if (data.type == "page") {
			params.body = editpageform;
			params.data = data;
		} else {
			params.body = "It's not currently possible to edit a {{data.type}}";
		}
		renderPage(req, res, params);
	});
});

app.post('/new/page', function (req, res) {

	var newdata = req.body;

	// TODO: allow other types
	newdata.type = 'page';
	couchpost('', newdata, function (err, data) {
		if (err) {
			res.writeHead(500, {'Content-Type': 'text/plain'});
			res.end('Sorry, an error occurred: '+err);
    		return;
		}
		if (!data.ok) {
			res.writeHead(500, {'Content-Type': 'text/plain'});
			res.end('Sorry, an error occurred: '+data.error+", reason: "+data.reason);
    		return;
		}

		// Redirect back to the edit page with a 303 so it'll turn into a GET request.
		res.redirect('/edit/'+data.id, 303);

		// Asynchronously update pages
		updatePages();
	});
});
app.post('/edit/:id', function (req, res) {

	var id = req.params.id
	var newdata = req.body;
	var url = '/edit/'+id;

	// TODO: allow other types
	newdata.type = 'page';
	couchput(id, newdata, function (err, data) {
		if (err) {
			res.writeHead(500, {'Content-Type': 'text/plain'});
			res.end('Sorry, an error occurred: '+err);
    		return;
		}
		if (!data.ok) {
			if (data.error == "conflict") {
				res.status(409);
				params = {
					'title': "Conflict",
					'body': "Sorry, someone else has updated this page whilst you were editing it.  Please <a href='{{url}}'>review their changes</a> before making any changes yourself.",
					'url': url,
				};
				renderPage(req, res, params);
			} else {
				res.writeHead(500, {'Content-Type': 'text/plain'});
				res.end('Sorry, an error occurred: '+data.error+", reason: "+data.reason);
			}
    		return;
		}

		// Redirect back to the edit page with a 303 so it'll turn into a GET request.
		res.redirect(url, 303);

		// Asynchronously update pages
		updatePages();
	});
});
app.get('/', function (req, res) {
	res.redirect("/faq");
});

var pages = {};

function couchpost (path, data, cb) {
var request = require("request");
	request.post({
		headers: {"Content-Type": "application/json"},
		url: process.env.COUCHDB_URL+"/"+path,
		body: JSON.stringify(data)
	}, function (err, res) {
		var body, i, l;
		if (typeof cb != 'function') return;
		try {
			if (err) throw err;
			if (res.statusCode >= 500) throw res.statusCode + " response";
			body = JSON.parse(res.body);
		} catch (e) {
			cb("Problem with couchdb response:" + e);
			return;
		}
		cb(null, body);
	});
}
function couchput (path, data, cb) {
var request = require("request");
	request.put({
		headers: {"Content-Type": "application/json"},
		url: process.env.COUCHDB_URL+"/"+path,
		body: JSON.stringify(data)
	}, function (err, res) {
		var body, i, l;
		if (typeof cb != 'function') return;
		try {
			if (err) throw err;
			if (res.statusCode >= 500) throw res.statusCode + " response";
			body = JSON.parse(res.body);
		} catch (e) {
			cb("Problem with couchdb response:" + e);
			return;
		}
		cb(null, body);
	});
}
function couchget (path, cb) {
var request = require("request");
	request.get({
		url: process.env.COUCHDB_URL+"/"+path
	}, function (err, res) {
		var body, i, l;
		if (typeof cb != 'function') return;
		try {
			if (err) throw err;
			if (res.statusCode >= 500) throw res.statusCode + " response";
			body = JSON.parse(res.body);
		} catch (e) {
			cb("Problem with couchdb response:" + e);
			return;
		}
		cb(null, body);
	});
}
function updatePages() {
	couchpost ('_temp_view', {"map": 'function (doc) { if (doc.type=="page") { emit(doc.url, doc); }}'}, function (err, data) {
		var i, l;
		if (err) {
			console.log(err);
			return;
		}
		pages = {};
		for(i=0, l=data.rows.length; i<l; i++) {
			pages[data.rows[i].key] = data.rows[i].value;
		}
	});
}
// Update the pages once right at the very start
updatePages();
app.get('*', function (req, res) {
	var params;
	var url = require('url').parse(req.url).pathname;

	// Get the data about the given page
	if (pages[url]) {
		params = pages[url];

	// If the page doesn't exist, return a 404
	} else {
		res.status(404);
		params = {
			'title': "Page not found",
			'body': "Sorry, the page you were looking for cannot be found",
		};
	}
	renderPage(req, res, params);
});

function renderPage(req, res, params) {
	var i, current;
	var url = require('url').parse(req.url).pathname;


	// Go through all the pages and add their details for the navigation
	params.navitems = [];
	for (i in pages) {
		params.navitems.push({
			url: i,
			title: pages[i].title,
			current: (url == i),
		});
	}

	// Add some extra details which can be used by templates
	params.user = req.user;
	params.groupid = process.env.MEMBERS_GROUP_ID;
	if (params['_id']) params.id = params['_id'];

	// Render the page
	params.content = mustache.render(params.body, params);
	res.render("page.ms", params);
}

// listen to the PORT given to us in the environment
var port = process.env.PORT || 3000;

app.listen(port, function() {
  console.log("Listening on " + port);
});