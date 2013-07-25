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


app.get('/', function (req, res) {
	res.redirect("/faq");
});

var navitems = [
	{
		url: "/",
		title: "Home"
	},
	{
		url: "/faq",
		title: "Frequently Asked Questions"
	}
];
app.get('/faq', function (req, res) {
	renderPage("faq", req, res, {title: "Frequently Asked Questions"});
});
function renderPage(pagename, req, res, params) {
	var i;
	if (!params) params = {}
	params.user = req.user;
	params.groupid = process.env.MEMBERS_GROUP_ID;
	params.navitems = clone(navitems);
	for (i in params.navitems) {
		if (params.navitems[i].url == "/"+pagename) {
			params.navitems[i].current = true;
		}
	}
	fs.readFile(__dirname+"/views/"+pagename+".ms", {encoding: 'utf8'}, function (err, data) {
    	if (err) {
			res.writeHead(503, {'Content-Type': 'text/plain'});
			res.end('Sorry, an error occurred: '+err);
    		return;
    	}
		params.content = mustache.render(data, params);
		res.render("page.ms", params);
	});	
}

// listen to the PORT given to us in the environment
var port = process.env.PORT || 3000;

app.listen(port, function() {
  console.log("Listening on " + port);
});