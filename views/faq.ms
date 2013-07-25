<!DOCTYPE html>
<html>
<head>
	<title>FAQs</title>
	<link rel="shortcut icon" href="http://www.revs.org.uk/wp-content/uploads/2013/04/favicon-3.png" />
    <link rel="stylesheet" href="http://www.revs.org.uk/wp-content/themes/Harmony/style.css?ver=3.5.1" type="text/css" />
    <link rel="stylesheet" href="http://www.revs.org.uk/?custom-css=1&amp;csblog=1&amp;cscache=6&amp;csrev=119" type="text/css" />
    <link rel='stylesheet' id='harmony-fonts-css'  href='http://fonts.googleapis.com/css?family=Open+Sans:300italic,700italic,800italic,400,300,700,800&#038;subset=latin,latin-ext' type='text/css' media='all' />
    <link rel="stylesheet" href="style.css" type="text/css" />
</head>
<body>
	<div class='container'>
	<h1 class='title'>Frequently Asked Questions</h1>

<p class='question'>What is this site?</p>
<p>Hi {{user.first_name}}, this is the London Revolution Members only site, where we plan to put up key bits of information.</p>

<p class='question'>Is this it?</p>
<p>It's not ready yet - we still in the process of setting it up</p>
<p class='question'>Am I allowed to edit it?</p>
{{#user.isadmin}}
<p>That's the plan, but we're not at that point yet.  Once we're done, you and the rest of the committee should be able to edit it whenever you want.</p>
{{/user.isadmin}}
{{^user.isadmin}}
<p>No, sorry.  Only the committee is allowed to edit stuff.  But feel free to post to the <a href="https://www.facebook.com/groups/{{groupid}}">facebook group.</a>
{{/user.isadmin}}
</div>
</body>
</html>