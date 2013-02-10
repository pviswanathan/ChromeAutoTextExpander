
// Global Variables & Constants
var OK = 0;
var STORAGE_KEY = 'scheduledMessages';
var GV_RECIPIENT_LIMIT = 5;
var GV_TEXT_CHAR_LIMIT = 320;
var ID_PREFIX = "message_";

var calendarIconURL = chrome.extension.getURL("images/calendar.png");
var reloadIconURL	= chrome.extension.getURL("images/reload.png");
var refreshIconURL	= chrome.extension.getURL("images/refresh.gif");
var loadingIconURL	= chrome.extension.getURL("images/loading.gif");
var removeIconURL	= chrome.extension.getURL("images/remove.png");
var sendIconURL		= chrome.extension.getURL("images/send.png");

// Document ready function
$(function()
{
	// Setup and load scheduled texts
	setupScheduledView();

	// Setup scheduler UI elements
	setupScheduler();
});

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

// Add new UI elements to hold scheduled messages
function setupScheduledView()
{
	$("#gc-view-main").prepend([
		'<div id="gv-scheduler-container">'
		, '	<h3>Scheduled SMS Messages'
		, '		<span>'
		, '			<a id="gv-scheduler-reload" href="#" title="Reload Scheduled SMS Messages">'
		, '				<img src="' + reloadIconURL + '" alt="Reload" /></a>'
		, '			<a id="gv-scheduler-clear" href="#" title="Clear all Scheduled SMS Messages">'
		, '				<img src="' + removeIconURL + '" alt="Clear" /></a>'
		, '		</span>'
		, '	</h3>'
		, '	<ul id="gv-scheduler-list">'
		, '	</ul>'
		, '</div>'
	].join('\n'));

	// Reload icon
	$("#gv-scheduler-reload").click(reloadScheduledView);

	// Clear icon
	$("#gv-scheduler-clear").click(clearScheduledMessages);

	// Binding for immediate sending of scheduled messages
	$("#gv-scheduler-list").on("click", ".gv-scheduler-send", sendScheduledMessage);

	// Binding for removing of scheduled messages
	$("#gv-scheduler-list").on("click", ".gv-scheduler-remove", removeScheduledMessage);

	// Initial load
	reloadScheduledView();
}

// Adding edits to Text message popup to allow scheduling
function setupScheduler()
{
	// Add button and form elements
	$("#gc-quicksms2").append([
		'<div id="gv-scheduler">'
		, '	<div id="gv-scheduler-datetime" class="goog-inline-block">'
		, '		<a id="gv-scheduler-calendar" href="#" title="Schedule SMS Message">'
		, '			<img src="' + calendarIconURL + '" alt="Date Picker" /></a>'
		, '		<input id="gv-scheduler-input" class="gc-text" type="text" />'
		, '	</div>'
		, '	<div id="gv-scheduler-button" class="goog-inline-block gc-quicksms-send goog-button goog-button-base" role="button" style="" tabindex="0"><div class="goog-inline-block goog-button-base-outer-box" style=""><div class="goog-inline-block goog-button-base-inner-box" style=""><div class="goog-button-base-pos" style=""><div class="goog-button-base-top-shadow" style="">&nbsp;</div><div class="goog-button-base-content" style="">Schedule</div></div></div></div></div>'
		, '</div>'
	].join('\n'));

	// Setup date/time picker stuff
	$('#gv-scheduler-input').datetimepicker({
		defaultValue: new Date()
	});
	$('#gv-scheduler-input').keypress(function(event) {
		if (event.which == 9) {	// Tab keycode
			$('#gv-scheduler-button').focus();
		}
	});

	// When calendar icon is clicked, focus on input field to fire picker
	$('#gv-scheduler-calendar').click(function() {
		$('#gv-scheduler-input').focus();
	});

	// When a SMS message is scheduled
	$('#gv-scheduler-button').click(scheduleMessage);
	$('#gv-scheduler-button').focus(function() {
		$('#gv-scheduler-button').addClass('goog-button-base-focused');
	});
	$('#gv-scheduler-button').focusout(function() {
		$('#gv-scheduler-button').removeClass('goog-button-base-focused');
	});
	$('#gv-scheduler-button').hover(function() {
		$('#gv-scheduler-button').addClass('goog-button-base-hover');
	}, function() {
		$('#gv-scheduler-button').removeClass('goog-button-base-hover');
	});
	$('#gv-scheduler-button').keypress(function(event) {
		if (event.which == 13 || event.which == 32) {	// Enter & Spacebar keycodes
			$('#gv-scheduler-button').click();
		}
	});
}

// Generates the HTML for a list item in the scheduled SMS message list
function createScheduledListItemHTML(recipients, dateTime, text, id)
{
	return $('<li>').attr("id", id)
		.append($('<h4>').text(recipients)
			.append([
				'	<a class="gv-scheduler-send" href="#" title="Send this message now">'
				, '		<img src="' + sendIconURL + '" alt="Send" /></a>'
				, '	<a class="gv-scheduler-remove" href="#" title="Remove this message">'
				, '		<img src="' + removeIconURL + '" alt="x"></a>'
				, '	<br />'].join('\n'))
			.append($('<span>').addClass('gv-scheduler-dateTime').text(dateTime))
		).append($('<p>').text(text));
}

// Load scheduled messages and display them
function reloadScheduledView()
{
	// Set reloader icon to be refreshing
	$("#gv-scheduler-reload img").attr("src", refreshIconURL);
	var reloadStartTime = new Date();	// Keep track of time

	// Clear previous list
	$("#gv-scheduler-list").html("");

	// Get scheduled messages
	chrome.storage.sync.get(STORAGE_KEY, function(items)
	{
		console.log("reloadScheduledView", items);

		// Check if nothing returned
		if (!items || !items[STORAGE_KEY] || !items[STORAGE_KEY].length)
		{
			$('#gv-scheduler-list').append('<li><strong>'
				+ chrome.i18n.getMessage("STATUS_NO_MESSAGES") + '</strong></li>');
		}
		else	// Loop through and display them
		{
			var messages = items[STORAGE_KEY];
			for (var i = messages.length - 1; i >= 0; --i)
			{
				var message = messages[i];

				$('#gv-scheduler-list').prepend(
					createScheduledListItemHTML(
						message.recipients
						, convertDateToLocal(new Date($.parseJSON(message.dateTime)))
						, message.text, message.id));
			};
		}

		// Add some delay so it looks like it's doing some work
		var reloadTimeInMilliseconds = (new Date()).getTime() - reloadStartTime.getTime();
		var reloadIconRefreshDelay = (1000 - reloadTimeInMilliseconds);
		if (reloadIconRefreshDelay < 0) {
			reloadIconRefreshDelay = 0;
		}

		// Done! Set reloader icon back to default reload
		setTimeout(function() {
			$("#gv-scheduler-reload img").attr("src", reloadIconURL);
		}, reloadIconRefreshDelay);
	});
}

// Schedule a message
function scheduleMessage()
{
	var dateTime = $("#gv-scheduler-input").datetimepicker('getDate');
	var recipients = $("#gc-quicksms-number").val();
	var text = $("#gc-quicksms-text2").val();
	var errors = [];

	// Check recipients, also trim out leading/trailing commas
	recipients = recipients.replace(/(^\s*,)|(,\s*$)/g, '');
	if (!recipients || !recipients.length) {
		errors.push(chrome.i18n.getMessage("ERROR_RECIPIENTS_MISSING"));
	}
	if (recipients.split(',').length > GV_RECIPIENT_LIMIT) {
		errors.push(chrome.i18n.getMessage("ERROR_RECIPIENTS_OVERLIMIT"));
	}

	// Check message text
	if (!text || !text.length) {
		errors.push(chrome.i18n.getMessage("ERROR_MESSAGE_TEXT_MISSING"));
	}
	if (text.length >= GV_TEXT_CHAR_LIMIT) {
		errors.push(chrome.i18n.getMessage("ERROR_MESSAGE_TEXT_OVERLIMIT"));
	}

	// Check dateTime
	if (dateTime <= new Date()) {
		errors.push(chrome.i18n.getMessage("ERROR_DATETIME_PAST"));
	}

	// Check and display errors if needed
	if (errors.length > 0)
	{
		errors.unshift("SMS Scheduler : Validation Errors Detected!");
		alert(errors.join('\n'));
		return;
	}

	// Schedule message now
	chrome.storage.sync.get(STORAGE_KEY, function(items)
	{
		// If something returned, use that instead
		var messages = [];
		if (items && items[STORAGE_KEY]) {
			messages = items[STORAGE_KEY];
		}

		// If no messages before, clear list
		if (!messages.length) {
			$("#gv-scheduler-list li").fadeOut('normal');
		}

		// Add new message, use new Date().getTime() as unique id
		messages.push({
			recipients: recipients
			, dateTime: JSON.stringify(convertDateToUTC(dateTime))
			, text: text
			, id: ID_PREFIX + new Date().getTime()
		});

		// Resort messages by date
		messages.sort(function(a, b) {
			return (a.dateTime > b.dateTime
				? 1 : (b.dateTime > a.dateTime
					? -1 : 0));
		});

		// Reset data into storage
		chrome.storage.sync.set(
			{"scheduledMessages": messages}
			, function()
			{
				if (chrome.runtime.lastError) {
					console.log(chrome.runtime.lastError);
				}
				else	// Success! Add to list
				{
					console.log("scheduleMessage success:", recipients, dateTime, text);

					// Clear fields and hide popup
					$("#gc-quicksms-text2").val('');
					$("#gv-scheduler-input").val('');
					$('.goog-bubble-close-button').click();
					$("#gv-scheduler-list").append(
						createScheduledListItemHTML(recipients, dateTime, text,
							ID_PREFIX + dateTime.getTime()));
				}
			});
	});
}

// Send scheduled message
function sendScheduledMessage()
{
	var id = $(this).parents('li').attr('id');
	console.log("sendScheduledMessage", id);

	// Show confirmation popup just to make sure
	var confirmed = confirm(chrome.i18n.getMessage("WARNING_CONFIRM_SEND"));
	if (!confirmed) {
		return;
	}

	// Send message to background process to send
	chrome.extension.sendMessage({
		action: "sendMessage",
		messageID: id
	}, function(response)
		{
			console.log("sendMessage response:", response);
			if (response.status != OK) {
				// Display error?
			}
		});
}

// Removes message that was scheduled
function removeScheduledMessage()
{
	var id = $(this).parents('li').attr('id');
	console.log("removeScheduledMessage", id);

	// Show confirmation popup just to make sure
	var confirmed = confirm(chrome.i18n.getMessage("WARNING_CONFIRM_REMOVE"));
	if (!confirmed) {
		return;
	}

	// Send message to background process to remove
	chrome.extension.sendMessage({
		action: "removeMessage",
		messageID: id,
	}, function(response)
		{
			console.log("removeMessage response:", response);
			if (response.status == OK) {
				$('#' + id).fadeOut('normal', function() {
					$(this).remove();
				});
			} else {
				// Display error?
			}
		});
}

// Clears all scheduled messages
function clearScheduledMessages()
{
	// Show confirmation popup just to make sure
	var confirmed = confirm(chrome.i18n.getMessage("WARNING_CONFIRM_CLEAR"));
	if (!confirmed) {
		return;
	}

	chrome.storage.sync.remove("scheduledMessages", function()
	{
		console.log("clearScheduledMessages");

		$('#gv-scheduler-list').fadeOut('normal').html('')
			.append('<li><strong>No scheduled messages!</strong></li>')
			.fadeIn('normal');
	});
}

// Handler for messages from the background page indicating
//  when a scheduled message is sent
chrome.extension.onMessage.addListener(
	function(request, sender, sendResponse)
	{
		console.log(request, sender);

		if (request.action == "messageSent")
		{
			$('#' + request.messageID).fadeOut('normal', function() {
				$(this).remove();
			});
			return true;
		}

		return false;
	});

