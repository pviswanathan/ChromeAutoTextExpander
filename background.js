// This background process should check every minute
//	and see if we need to send out scheduled texts

// Global Variables & Constants
var OK = 0
	, ERROR_INVALID_INPUT = -1
	, ERROR_NO_MESSAGES = -2
	, ERROR_MISSING_MESSAGE = -3
	, ERROR_STORAGE_ISSUE = -4
	, ERROR_API_ISSUE = -5;
var STORAGE_KEY = 'scheduledMessages';
var GOOGLE_VOICE_DATA_REQUEST_URL = "https://www.google.com/voice/b/0/request/user/";
var GOOGLE_VOICE_SEND_SMS_REQUEST_URL = "https://www.google.com/voice/b/0/sms/send/";
var _rnr_se;	// Google Voice account key of some sort, needed for sms

// Convert javscript date to and from UTC
function convertDateToUTC(date)
{
	return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(),
		date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds());
}
function convertDateToLocal(date)
{
	return new Date($.datepicker.formatDate("m/d/yy", date) + " "
		+ $.datepicker.formatTime("H:mm:ss:l", {
			hour: date.getHours(), minute: date.getMinutes(),
			second: date.getSeconds(), millisecond: date.getMilliseconds()
		}) + " UTC");
}

// Initialize extension
function initExtension()
{
	// Retreive data from Google Voice's API calls
	$.ajax({
		type: 'GET',
		url: GOOGLE_VOICE_DATA_REQUEST_URL,
		success: processGoogleDataResponse,
		error: processGoogleDataResponse,
	});
}

// Handle Google Voice data request response
function processGoogleDataResponse(response)
{
	if (response && response.responseText)
	{
		var data = $.parseJSON(response.responseText);
		_rnr_se = data.r;
		console.log("processGoogleDataResponse", _rnr_se);

		// Check if we successfully retrieved the key
		if (_rnr_se)
		{
			// 60000 milliseconds = 1 minute
			setInterval(checkScheduledMessages, 60000);
		} else {
			console.log("Could not retrieve _rnr_se!");
		}
	}
	else	// Error, no data!
	{
		console.log(chrome.i18n.getMessage("ERROR_API_ISSUE"));
	}
}

// Handler to listen for messages from the content script
chrome.extension.onMessage.addListener(
	function(request, sender, sendResponse)
	{
		console.log(request, sender);

		if (request.action == "sendMessage")
		{
			sendMessage(request.messageID, sendResponse);
			return true;
		}

		if (request.action == "removeMessage")
		{
			removeMessage(request.messageID, sendResponse);
			return true;
		}

		return false;
	});

// Send SMS message with given ID through google voice
function sendMessage(messageID, sendResponse)
{
	console.log("sendMessage", messageID);

	// Go through messages and remove sent message
	chrome.storage.sync.get(STORAGE_KEY, function(items)
	{
		// Check if no messages
		if (!items || !items[STORAGE_KEY] || !items[STORAGE_KEY].length)
		{
			console.log(chrome.i18n.getMessage("STATUS_NO_MESSAGES"));
			if (sendResponse) {		// If response function exists
				sendResponse({
					status: ERROR_NO_MESSAGES,
					message: chrome.i18n.getMessage("STATUS_NO_MESSAGES")
				});
			}
			return;
		}

		// Loop through and check if there's an id match
		var messages = items[STORAGE_KEY];
		for (var i = messages.length - 1; i >= 0; --i)
		{
			// Message found
			if (messages[i].id == messageID)
			{
				var message = messages[i];
				$.ajax({
					type: 'POST',
					url: GOOGLE_VOICE_SEND_SMS_REQUEST_URL,
					data: {
						id: "",
						phoneNumber: message.recipients,
						text: message.text,
						sendErrorSms: 0,
						_rnr_se: _rnr_se,
					},
					success: function(response) {
						processSendSMSResponse(message, response, sendResponse);
					},
					error: function(response) {
						processSendSMSResponse(message, response, sendResponse);
					}
				});

				return;
			}
		}

		// If message was not found, respond with error
		console.log(chrome.i18n.getMessage("ERROR_MISSING_MESSAGE"));
		if (sendResponse) {		// If response function exists
			sendResponse({
				status: ERROR_MISSING_MESSAGE,
				message: chrome.i18n.getMessage("ERROR_MISSING_MESSAGE")
			});
		}
	});
}

function processSendSMSResponse(message, response, sendResponse)
{
	if (response)
	{
		var data = $.parseJSON(response.responseText);
		console.log("processSendSMSResponse", data.ok);

		// Check if we successfully sent sms
		if (data.ok)
		{
			// Tell tabs to remove message from UI
			chrome.tabs.query({url:"*://www.google.com/voice/*"}, function(tabs)
			{
				for (var i = tabs.length - 1; i >= 0; --i)
				{
					chrome.tabs.sendMessage(tabs[i].id, {
						action: "messageSent",
						messageID: message.id
					});
				}
			});

			// Test for notification support, and show notification
			if (window.webkitNotifications) {
				showNotification("images/icon48.png"
					, "SMS Message sent to " + message.recipients
					, message.text);
			}

			// Go through messages and remove sent message
			removeMessage(message.id, sendResponse);
		}
		else	// Error!
		{
			if (sendResponse) {		// If response function exists
				sendResponse({
					status: response.status,
					message: response.responseText
				});
			}
		}
	}
	else
	{
		console.log(chrome.i18n.getMessage("ERROR_API_ISSUE"));
		if (sendResponse) {		// If response function exists
			sendResponse({
				status: ERROR_API_ISSUE,
				message: chrome.i18n.getMessage("ERROR_API_ISSUE")
			});
		}
	}
}

// Show notification for sent messages
function showNotification(imagePath, title, message)
{
	var time = /(..)(:..)/.exec(new Date());     // The prettyprinted time.
	var hour = time[1] % 12 || 12;               // The prettyprinted hour.
	var period = time[1] < 12 ? 'a.m.' : 'p.m.'; // The period of the day.
	var notification = window.webkitNotifications.createNotification(
		imagePath											// The image.
		, title + " at " + hour + time[2] + ' ' + period	// The title.
		, message											// The body.
	);
	notification.show();
}

// Remove a message with given ID, and return response through sendResponse
function removeMessage(messageID, sendResponse)
{
	console.log("removeMessage", messageID);

	// Go through messages and remove sent message
	chrome.storage.sync.get(STORAGE_KEY, function(items)
	{
		// Check if no messages
		if (!items || !items[STORAGE_KEY] || !items[STORAGE_KEY].length)
		{
			console.log(chrome.i18n.getMessage("STATUS_NO_MESSAGES"));
			if (sendResponse) {		// If response function exists
				sendResponse({
					status: ERROR_NO_MESSAGES,
					message: chrome.i18n.getMessage("STATUS_NO_MESSAGES")
				});
			}
			return;
		}

		// Loop through and check if there's an id match
		var messages = items[STORAGE_KEY];
		var messageFound = false;
		for (var i = messages.length - 1; i >= 0; --i)
		{
			if (messages[i].id == messageID)
			{
				// Delete from data
				messages.splice(i, 1);
				messageFound = true;
				break;
			}
		}

		// If message was found and removed, update data
		if (messageFound)
		{
			// Store new data back in, and print error if any
			chrome.storage.sync.set(
				{"scheduledMessages": messages}
				, function()
				{
					if (chrome.runtime.lastError)
					{
						console.log(chrome.runtime.lastError);
						if (sendResponse) {		// If response function exists
							sendResponse({
								status: ERROR_STORAGE_ISSUE,
								message: chrome.runtime.lastError
							});
						}
					}
					else
					{
						console.log("removeMessage success:", messageID);
						if (sendResponse) {		// If response function exists
							sendResponse({
								status: OK,
								message: ""
							});
						}
					}
				});
		}
		else	// Error - couldn't find it!
		{
			console.log(chrome.i18n.getMessage("ERROR_MISSING_MESSAGE"));
			if (sendResponse) {		// If response function exists
				sendResponse({
					status: ERROR_MISSING_MESSAGE,
					message: chrome.i18n.getMessage("ERROR_MISSING_MESSAGE")
				});
			}
		}
	});
}

function checkScheduledMessages()
{
	// Get list of scheduled messages and see if
	//	any of them should be sent out
	chrome.storage.sync.get(STORAGE_KEY, function(items)
	{
		// Check if no messages
		if (!items || !items[STORAGE_KEY] || !items[STORAGE_KEY].length) {
			return;
		}

		// Loop through and check datetimes
		var currentDateTime = new Date();
		var messages = items[STORAGE_KEY];
		for (var i = messages.length - 1; i >= 0; --i)
		{
			var message = messages[i];
			var messageDateTime = convertDateToLocal(
				new Date($.parseJSON(message.dateTime)));

			// If message date is in the past, then send message
			if (messageDateTime <= currentDateTime) {
				sendMessage(message.id);
			}
		}
	});
}

// Setup the extension
initExtension();

