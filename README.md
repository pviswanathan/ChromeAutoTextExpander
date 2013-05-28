Google Chrome Extension : Auto Text Expander
=========================
chrome-auto-text-expander

Another fun side project in my spare time. This simple chrome extension uses content scripts to insert javascript into any page you're using to attach a handler to your keydown event.

It basically keeps track of any consecutive keystrokes within 500ms or since the last space character you typed, and checks to see if the series of keystrokes matches any of a number of custom shortcuts you may have defined, and will then replace and expand the text in the field if it matches anything.

Technologies used:
 - jQuery
 - Chrome's Sync Storage (shortcuts are synced across browsers)

Hope this is useful to someone out there; would love any help optimizing and improving on it. Feel free to help contribute and expand on this project!

. Carlin
