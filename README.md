revs-members
============

The members only section of the London Revolution Cheer website

It is a nodejs app, so you'll need node and npm to run it.

## Installation
To install the dependencies, run:
```npm install```
You'll need to set up a facebook app so that users can be authenticated.
You'll also need a couchdb database.

## Running
To run, you'll need to set the following enviornment variables:
* FACEBOOK_APP_ID The app ID of your facebook app.
* FACEBOOK_SECRET The secret of your facebook app.
* SESSION_SECRET A random string used for sessions.
* PORT The tcp port on which to run the server
* MEMBERS_GROUP_ID The ID of the facebook group which people who are allowed to access the site are in.
* ADMIN_GROUP_ID The ID of the facebook group which people who are allowed to edit the site are in.
* COUCHDB_URL The url of your couchdb database's http interface.