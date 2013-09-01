
// Prevent conflicts
jQuery.noConflict();

// Encapsulated anonymous function
(function($) {

	// Global Variables & Constants
	var OK = 0;
	var BACKSPACE_CODE = 8;
	var WHITESPACE_REGEX = /(\s)/;
	var EVENT_NAME_KEYPRESS = 'keypress.auto-expander';
	var EVENT_NAME_KEYUP = 'keyup.auto-expander';
	var STORAGE_KEY = 'autoTextExpanderShortcuts';
	var GMAIL_DOMAIN = /mail.google.com/;
	var GDOCS_DOMAIN = /docs.google.com/;
	var FACEBOOK_DOMAIN = /facebook.com/;

	var typingBuffer = [];		// Keep track of what's been typed before timeout
	var typingTimeout = 750;	// Delay before we clear buffer
	var typingTimer;			// Keep track of time between keypresses

	var keyPressEvent;			// Keep track of keypress event to prevent re-firing
	var keyUpEvent;				// Keep track of keyup event to prevent re-firing

	// When user presses a key
	function keyPressHandler(event)
	{
		// Make sure it's not the same event firing over and over again
		if (keyPressEvent == event) {
			return;
		} else {
			keyPressEvent = event;
		}

		// Get character that was typed
		var char = String.fromCharCode(event.which);

		// Clear timer if still running, and start it again
		clearTypingTimer();
		typingTimer = setTimeout(clearTypingBuffer, typingTimeout);

		// Add new character to typing buffer
		typingBuffer.push(char);

		// Check typed text for shortcuts
		checkShortcuts(char, typingBuffer, event.target);
	}

	// When user lifts up on a key, to catch backspace
	function keyUpHandler(event)
	{
		// Make sure it's not the same event firing over and over again
		if (keyUpEvent == event) {
			return;
		} else {
			keyUpEvent = event;
		}

		if (event.keyCode == BACKSPACE_CODE)
		{
			// Clear timer and restart
			clearTypingTimer();
			typingTimer = setTimeout(clearTypingBuffer, typingTimeout);

			// Remove last character typed
			typingBuffer.pop();
		}
	}

	// Clears the typing timer
	function clearTypingTimer()
	{
		// Clear flags for event firing


		// Clear timer handle
		if (typingTimer) {
			clearTimeout(typingTimer);
			typingTimer = null;
		}
	}

	// Clears the typing buffer
	function clearTypingBuffer()
	{
		// Clear timer
		clearTypingTimer();

		// Clear buffer
		typingBuffer.length = 0;
	}

	// Check to see if text in argument corresponds to any shortcuts
	function checkShortcuts(lastChar, textBuffer, textInput)
	{
		console.log("checkShortcuts:", lastChar, textBuffer);

		// Get shortcuts
		chrome.storage.sync.get(STORAGE_KEY, function(data)
		{
			// Check that data is returned and shortcut library exists
			if (data && data[STORAGE_KEY])
			{
				// Check if shortcut exists and should be triggered
				var shortcut = textBuffer.join('');
				var autotext = data[STORAGE_KEY][shortcut];

				if (autotext)	// Shortcut exists! Expand and replace text
				{
					// Setup - add whitespace if was last character
					autotext += (WHITESPACE_REGEX.test(lastChar) ? lastChar : "");
					var domain = window.location.host;
					var $textInput = $(textInput);
					var cursorPosition = $textInput.getCursorPosition()
					var text;

					// If input or textarea field, can easily change the val
					if ($textInput.is("textarea") || $textInput.is("input"))
					{
						$textInput.val(replaceText(
							$textInput,
							$textInput.val(),
							shortcut,
							autotext,
							cursorPosition
						));
						$textInput.setCursorPosition(cursorPosition
							- shortcut.length + autotext.length);
					}
					// Extra special case for Gdocs
					else if (GDOCS_DOMAIN.test(domain))
					{
						// TODO : Can't seem to get this to work!

						// Backspace
						for (var i = shortcut.length - 1; i >= 0; --i) {
							simulateKeyEvent($textInput, BACKSPACE_CODE);
						}

						// Type out letters
						for (var i = 0; i < autotext.length; ++i) {
							simulateKeyEvent($textInput, autotext.charCodeAt(i));
						}
					}
					else	// Trouble... special cases
					{
						// Test what domain is to see if we need to customize
						if (GMAIL_DOMAIN.test(domain))	// Gmail
						{
							// Find focused div instead of what's receiving events
							$textInput = findFocusedDiv();

							// Get text and replace it
							text = $textInput.text();

							// Set new cursor position if autotext is single line
							if (autotext.indexOf('\n') < 0)
							{
								$textInput.html(replaceText(
									$textInput,
									text,
									shortcut,
									autotext,
									cursorPosition
								));

								$textInput.setCursorPosition(cursorPosition
									- shortcut.length + autotext.length);
							}
							else	// Multiline expanded text
							{
								$textInput.after(replaceText(
									$textInput,
									text,
									shortcut,
									autotext,
									cursorPosition
								)).nextAll()	// Jump to last row
									.eq(autotext.match(/\n/g).length)
									.setCursorPosition(
										autotext.length - autotext.lastIndexOf('\n') - 1
									);
								$textInput.remove();
							}
						}
						else	// Other sites
						{
							if (FACEBOOK_DOMAIN.test(domain)) {
								if ($textInput.find('span').get().length) {
									$textInput = $textInput.find('span').first();
								}
							}

							// Get text and replace it
							text = $textInput.text();
							$textInput.text(replaceText(
								$textInput,
								text,
								shortcut,
								autotext,
								cursorPosition
							));

							// Set new cursor position
							$textInput.setCursorPosition(cursorPosition
								- shortcut.length + autotext.length);
						}
					}
				}
			}

			// If last character is a space, clear buffer
			if (lastChar == " ") {
				clearTypingBuffer();
			}
		});
	}

	// Replacing text
	function replaceText($field, text, shortcut, autotext, cursorPosition)
	{
		console.log("expandText:", text, "shortcut:", shortcut,
					"autotext:", autotext, "cursorPosition:", cursorPosition);

		// Special handling for Gmail message body
		if (GMAIL_DOMAIN.test(window.location.host) && $field.hasClass('gmail_default'))
		{
			// Get escaped text
			var replaced = $('<div/>').text(text.substr(0, cursorPosition - shortcut.length)
				+ autotext + text.substr(cursorPosition)).html();

			// Split into lines based on line breaks
			var lines = replaced.split('\n');
			if (lines.length > 1)
			{
				// Copy gmail's line break divs
				var container = $field.clone().text('')[0].outerHTML;

				// Put closing tag at the beginning so we can use it in a join
				var tagIndex = container.indexOf('<', container.indexOf('<') + 1);
				var containerOpenTag = container.substring(0, tagIndex);
				var containerCloseTag = container.substr(tagIndex);
				container = containerCloseTag + containerOpenTag;

				// Join and return
				replaced = containerOpenTag + lines.join(container) + containerCloseTag;
			}

			return replaced;
		}
		else {	// Regular
			return text.substr(0, cursorPosition - shortcut.length)
				+ autotext + text.substr(cursorPosition);
		}
	}

	// Find div that user is editing right now (mostly for Google products)
	function findFocusedDiv() {
		var $div = null;
		if (window.getSelection) {
			var selection = window.getSelection();
			if (selection.rangeCount) {
				$div = $(selection.getRangeAt(0).startContainer.parentNode);
			}
		}
		return $div;
	}

	// Simulate key event
	function simulateKeyEvent($target, keyCode)
	{
 		// JQuery method
		var event = jQuery.Event("keydown");
		event.ctrlKey = false;
		event.which = keyCode;
		$target.trigger(event);
	}

	// Attach listener to keypresses
	function addListeners()
	{
		// Special google docs handlings - still doesn't work yet
		if (GDOCS_DOMAIN.test(window.location.host)) {
			$(document).find('iframe').each(function(index) {
				$(this).contents().on(EVENT_NAME_KEYPRESS, keyPressHandler);
				$(this).contents().on(EVENT_NAME_KEYUP, keyUpHandler);
			});
		}
		else	// Attach handlers normally
		{
			$(document).on(EVENT_NAME_KEYPRESS, 'div,textarea,input[type=text]', keyPressHandler);
			$(document).on(EVENT_NAME_KEYUP, 'div,textarea,input[type=text]', keyUpHandler);

			// Show page action if handlers attach
			chrome.runtime.sendMessage({request: "showPageAction"});
		}
	}

	// Detach listener for keypresses
	function removeListeners() {
		$(document).off(EVENT_NAME_KEYPRESS);
		$(document).off(EVENT_NAME_KEYUP);
	}

	// Document ready function
	$(function()
	{
		// Add listener to when user types
		addListeners();
	});

})(jQuery);


/////////////////////////////////////////////////////////////////////////////////
// Utility Functions

// Cross-browser solution for setting cursor position
(function($) {
	$.fn.setCursorPosition = function(pos) {
		var input = $(this).get(0);
		var sel, range;
		if ($(this).is('input') || $(this).is('textarea')) {
			if (input.setSelectionRange) {
				input.setSelectionRange(pos, pos);
			} else if (input.createTextRange) {
				range = input.createTextRange();
				range.collapse(true);
				range.moveEnd('character', pos);
				range.moveStart('character', pos);
				range.select();
			}
		} else {	// Other elements
			var node = input.childNodes[0];	// Need to get text node
			if (window.getSelection && document.createRange) {
				range = document.createRange();
				range.selectNodeContents(input);
				range.collapse(true);
				range.setEnd(node, pos);
				range.setStart(node, pos);
				sel = window.getSelection();
				sel.removeAllRanges();
				sel.addRange(range);
			} else if (document.body.createTextRange) {
				range = document.body.createTextRange();
				range.moveToElementText(input);
				range.collapse(true);
				range.setEnd(node, pos);
				range.setStart(node, pos);
				range.select();
			}
		}
	}
})(jQuery);

// Cross-browser solution for getting cursor position
(function($) {
    $.fn.getCursorPosition = function() {
		var el = $(this).get(0);
		var pos = 0, sel;
		if ($(this).is('input') || $(this).is('textarea')) {
			if('selectionStart' in el) {
				pos = el.selectionStart;
			} else if('selection' in document) {
				el.focus();
				sel = document.selection.createRange();
				var SelLength = document.selection.createRange().text.length;
				Sel.moveStart('character', -el.value.length);
				pos = Sel.text.length - SelLength;
			}
		} else {	// Other elements
			if (window.getSelection) {
				sel = window.getSelection();
				if (sel.rangeCount) {
					pos = sel.getRangeAt(0).endOffset;
				}
			} else if (document.selection && document.selection.createRange) {
				sel = document.selection.createRange();
				var tempEl = document.createElement("span");
				el.insertBefore(tempEl, el.firstChild);
				var tempRange = sel.duplicate();
				tempRange.moveToElementText(tempEl);
				tempRange.setEndPoint("EndToEnd", sel);
				pos = tempRange.text.length;
			}
		}
		return pos;
    }
})(jQuery);

