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

app.get('/edit/*', function (req, res) {

			res.end('Sorry, editing is not yet available');
})
app.get('/', function (req, res) {
	res.redirect("/faq");
});

var pages = {}
var request = require("request");
request.post({
	headers: {"Content-Type": "application/json"},
	url: process.env.COUCHDB_URL+"/_temp_view",
	body: JSON.stringify({"map": 'function (doc) { if (doc.type=="page") { emit(doc.url, doc); }}'})
}, function (err, res) {
	var body, i, l;
	try {
		if (err) throw err;
		if (res.statusCode != 200) throw res.statusCode + " response";
		body = JSON.parse(res.body);
	} catch (e) {
		console.log("Problem with couchdb response", e);
		return;
	}
	pages = {};
	for(i=0, l=body.rows.length; i<l; i++) {
		pages[body.rows[i].key] = body.rows[i].value;
	}
});
app.get('*', function (req, res) {
	var params, i, current;
	var url = require('url').parse(req.url).pathname;

	// Get the data about the given page
	if (pages[url]) {
		params = pages[url];

	// If the page doesn't exist, return make it a 404
	} else {
		res.status(404);
		params = {
			'title': "Page not found",
			'body': "Sorry, the page you were looking for cannot be found",
		};
	}

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
});

// listen to the PORT given to us in the environment
var port = process.env.PORT || 3000;

app.listen(port, function() {
  console.log("Listening on " + port);
});