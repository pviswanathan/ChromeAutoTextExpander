Google Chrome Extension : Auto Text Expander
=========================
Keywords: chrome, extension, expander, auto, automator, replace, text, shortcut, autotext.

Another fun side project in my spare time. This simple chrome extension uses content scripts to insert javascript into any page you're using to attach a handler to your keydown event.

It basically keeps track of any consecutive keystrokes within 500ms or since the last space character you typed, and checks to see if the series of keystrokes matches any of a number of custom shortcuts you may have defined, and will then replace and expand the text in the field if it matches anything.

Known Issues:
 - Sometimes the last space will not show up even if you put it into the
   expanded text.
 - I can't seem to get this to work in Google Docs, no matter what I try. T_T
 - In Outlook and Evernote and probably any other editor that uses editable <body> tags, the cursor positioning doesn't work properly.

Technologies Used:
 - jQuery
 - Chrome's Sync Storage (shortcuts are synced across browsers)

Feature Requests:
 - Work with Google's Inbox
 - Allow embedding of html into single-line expansions
 - Work with Chatango.com
 - Nested shortcuts
 - Date Arithmetic
 - Adjustable buffer clear timeout

Hope this is useful to someone out there; would love any help optimizing and improving on it. Feel free to help contribute and expand on this project!

. Carlin

## Credits
Thanks to Jake (https://github.com/jstrength) for his contributions.

## License
MIT
