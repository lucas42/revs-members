
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