Google Chrome Extension : Auto Text Expander
=========================
Keywords: chrome, extension, expander, auto, automator, replace, text, shortcut, autotext.

Another fun side project in my spare time. This simple chrome extension uses content scripts to insert javascript into any page you're using to attach a handler to your keydown event.

It basically keeps track of any consecutive keystrokes within 500ms or since the last space character you typed, and checks to see if the series of keystrokes matches any of a number of custom shortcuts you may have defined, and will then replace and expand the text in the field if it matches anything.

Chrome Webstore Link:
https://chrome.google.com/webstore/detail/auto-text-expander-for-go/iibninhmiggehlcdolcilmhacighjamp?hl=en-US

## Known Issues
 - I can't get this to work in Google Docs due to how Docs is architected. T_T
 - Similarly, Facebook comments is unavailable due to ReactJS's system.
 - Also, this doesn't work in Google Hangouts due to cross-origin policies.

## Technologies Used
 - jQuery
 - Moment.js
 - Chrome's Sync Storage (shortcuts are synced across browsers)

## Feature Requests
 - Localizing the extension
 - Domain whitelist/blacklist or on/off switch
 - Date Arithmetic
 - Add support for Google Docs comments
 - Add support for everhour.com
 - Opera extension version

## Updating Instructions
When releasing a new version, please update the following with the version number:
 - manifest.json [for json key "version"]
 - constants.js [for variable APP_VERSION]
 - background.js [function processingVersionUpgrade(), add previous version number]
 - README.md [version history section]

Hope this is useful to someone out there; would love any help optimizing and improving on it. Feel free to help contribute and expand on this project!


. Carlin


## Version History
v2.0.0
 - Attempt to add Google Docs support (failed)
 - Domain whitelist/blacklist
 - Toggle on/off from icon
 - Better iframe support
 - Working indicator

v1.9.5
 - Fix for missing check on CKEditor regex

v1.9.4
 - Add support for Salesforce CKEditor (thanks @kylelady)

v1.9.3
 - Fix for Zendesk (thanks @jaumebn)

v1.9.2
 - Fix for Zendesk Inbox (thanks @takeo)

v1.9.1
 - Fix for Outlook O365 OWA

v1.9.0
 - Attempt to add support for O365 OWA
 - Adding support for G+ communities
 - Fix support for Evernote
 - Adding omnibox support (use keyword 'ate' and the Tab key to trigger)
 - Fix to let consecutive shortcuts fire even if typed without whitespace

v1.8.5
 - Fix Inbox support
 - Increase max time for shortcut detection to 10s
 - Figure out what's going on with the @ shortcut prefix issue

v1.8.4
 - Changed popup warnings when Chrome is not syncing the shortcuts properly to use a warning banner instead that is less in-your-face and still let you navigate sites without crying in frustration.
 - Fixing inconsistency with handling of trailing spaces. Should only add a space after the expansion if you typed a space.
 - Adding auto-capitalization with checking for lower-case versions of the word typed, and applying all-caps or just first letter capitalization automatically.
 - Updating crouton banners to require user-initiated dismiss sometimes, so they notice them.

v1.8.3
 - Replacing console.log() statements with debugLog() to reduce developer console spam.

v1.8.2
 - Fix for Salesforce support (was cutting short attaching listeners to new iframes).
 - Added new Textarea option for demoing shortcuts.
 - Slight optimization to attaching listeners by not running regex over all special cases.

v1.8.1
 - Added support for Google Inbox
 - Added support for Google Translate
 - Added support for MailChimp
 - Added support for Confluence (Atlassian)
 - Replacing annoying exception messages in console when script does not work with iframes

v1.8.0
 - Removing lots of jQuery dependencies to keep things lean and speed things up
 - Added checks into expander code to prevent expansion and warn user to refresh browser if shortcut database version is different
 - Added shortcut recovery in case of shortcuts disappearing for some reason
 - Adding localization for dates based off your browser locale (+160kb for locales)
 - Rewrote logic for inserting into editable iframes and divs, more accurate and reliable
 - Allowing HTML expansions for single line expansions too
 - Added demo area on the options page where you can test your shortcuts live!
 - Adding ability to convert what is in the demo area into HTML, so it doubles as a place where you can copy-paste HTML content and have it translated to expansion format.
 - Adding ability to determine cursor location when expanding into contenteditable divs by including a special tag in the expansion, instructions in Useful Tips section of options.

v1.7.0
 - Revamped options page!
 - Showing storage quotas
 - Added custom setting for shortcut recognition timeout
 - Fix for cursor positioning for editable iframes (Outlook, Evernote)
 - Basecamp support
 - Added better migration error handling of shortcuts database
 - Migration to new storage model for shortcuts (please report any issues)
 - Warning when leaving options page with unsaved shortcuts
 - Lots of refactoring of code
 - Lots of little UI / UX fixes

v1.6.1
 - Moving page action to browser action (persistent options link next to URL bar instead), page action was too inconsistent anyway
 - Hotfix for broken inline Gmail message editor
 - Attempted integration with Facebook comments, but no dice. ReactJS framework doesn't play nice with ATE. :o(

v1.6.0
 - Added fix for Gmail's new message popup
 - Added support for Outlook

v1.5.1
 - Added fix for import/export popup height and scrolling for long content.
 - Added example for clipboard paste.

v1.5.0
 - Workarounds for input[type=email] and input[type=number].
 - Added manual import/export of shortcuts through raw JSON.
 - Added clipboard macro to paste contents into expansion using %clip%.
 - Added better error handling, and listener adding / page action showing based off PopChrom's source.
 - Added convenience Refresh/Add/Save buttons to the bottom of the shortcut list for large lists.

v1.4.0
 - Added link for feature requests to separate from reviews.
 - Added support for Evernote Web upon request.

v1.3.5
 - Fixed bug where hitting enter in gchat field will not clear buffer so immediate shortcut won't work.
 - Added reinjection of content scripts on upgrade and fresh install so you don't have to refresh your tabs.
 - Added friendly notification that lets you know when the extension has been updated and encourages you to refresh the page just in case.

v1.3.2
 - Fixed issue where if you type in one field and then jump to another field really fast, shortcuts won't work for a moment.

v1.3.1
 - Set order of shortcuts in options to alphabetical.
 - Changed keyboard navigation in options to be more standard and less buggy.
 - Adding a shortcut adds to top of list instead of bottom to prevent unnecessary scrolling.
 - On save, shortcuts that saved are now properly highlighted instead of staying as faded until you hit refresh.
 - Switched out alert/confirm dialogs to custom dialogs so it would work in popup outside of options page.
 - Added scroll to top function for people with lots of shortcuts.

v1.3.0
 - Fixed bug with shortcuts resetting.
 - Added local backup and restore functionality.
 - Cleaned up options screen a little more and made it a little more intuitive.

v1.2.6
 - Cleaning up removal of shortcuts.
 - Wrapped in logic so users transitioning from old accounts don't see new shortcuts.

v1.2.5
 - Fixed bug where hitting the tab key doesn't clear the buffer.
 - Updated screenshots, options page descriptions.

v1.2.2
 - Opens options page and saves examples into user's shortcuts on first install to avoid confusion for first-timers.
 - Thanks to Jake (https://github.com/jstrength) for his contributions.

v1.2.1
 - Fixed bug where newlines were getting added to character buffer and messing up shortcuts.
 - HTML can now be added to content-editable divs (like in Gmail)! Try it: add <strong></strong> around things you want bolded in expanded text.

v1.2.0
 - Rearchitected storage of shortcuts to give user a lot more space.
 - Added error messages for whenever a shortcut / expansion goes over Chrome API limits.
 - Cleaned up options page some more.
 - Added autosizing on expansion text fields so we don't have to scroll so much.

v1.1.6
 - Adding listeners to all child iframes in document if possible.

v1.1.5
 - Added macros for today's date! Check it out in the options.

v1.1.4
 - Cleaning up and fixes for options popup.

v1.1.3
 - Stopped extension from cutting off Gmail keyboard shortcuts.
 - Improved and more consistent handling in contenteditable divs.
 - Cleaned up and optimized for better performance.
 - Removed annoying refresh on options popup when you hit Save.
 - Fixed issue with onclick callbacks not called in options popup due to manifest v2 defined by G.Chrome.
 - More useful / practical examples as defaults.
 - Better overall compatibility with other sites.

v1.1.2
 - Fixed css for feedback link

v1.1.1
 - Added feedback link in options page.

v1.1.0
 - Added multiline support.
 - Made improvements to the options page / popup.
 - Added examples if on first installation.

v1.0.9
 - Cleaning up code, took out icon in address bar for Google Docs.

v1.0.8
 - Optimizations, better error handling, and attempt to get Google Docs working.

v1.0.6
 - Fix for Gmail multiple lines.
 - Fix for address bar popup saving.

v1.0.5
 - Fix for Gmail & Facebook div use.
 - Optimizations.

v1.0.3
 - Adding better options support.

v1.0.0
 - First build!

## License
MIT
