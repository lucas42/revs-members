var express = require('express');
var Facebook = require('facebook-node-sdk');
var async   = require('async');


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

app.set('view engine', 'mustache');
app.set('views', __dirname + '/views');


app.all('*', Facebook.loginRequired({ scope: ['user_groups']}), function(req, res, next){


	var user, ismember = false, isadmin = false;
    async.parallel([
      function(cb) {
 		 req.facebook.api('/me', function(err, thisuser) {
          user = thisuser;
          cb();
        });
      },
      function(cb) {
 		 req.facebook.api('/me/groups', function(err, groups) {
 		 	var i, group;
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
app.get('/faq', function (req, res) {
	res.render("faq.ms", {user: req.user, groupid: process.env.MEMBERS_GROUP_ID});
});

// listen to the PORT given to us in the environment
var port = process.env.PORT || 3000;

app.listen(port, function() {
  console.log("Listening on " + port);
});