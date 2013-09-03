
// Prevent conflicts
jQuery.noConflict();

// Encapsulated anonymous function
(function($) {

	// Global Variables & Constants
	var OK = 0;
	var KEYCODE_BACKSPACE = 8;
	var KEYCODE_RETURN = 13;
	var KEYCODE_SPACEBAR = 32;
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

		// Get character that was typed, if was carriage return, replace with space
		var charCode = event.which;
		if (charCode == KEYCODE_RETURN) {
			charCode = KEYCODE_SPACEBAR;
		}
		var char = String.fromCharCode(charCode);

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

		// When user types backspace, pop character off buffer
		if (event.keyCode == KEYCODE_BACKSPACE)
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
/* 		console.log("checkShortcuts:", lastChar, textBuffer);	//	*/

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
							$textInput.val(),
							shortcut,
							autotext,
							cursorPosition
						));
						$textInput.setCursorPosition(cursorPosition
							- shortcut.length + autotext.length);
					}
					else	// Trouble... editable divs & special cases
					{
						// Test what domain is to see if we need to customize
						if (GMAIL_DOMAIN.test(domain))	// Gmail
						{
							// Get the focused / selected text node
							var node = findFocusedNode();
							var $textNode = $(node);

							// Find focused div instead of what's receiving events
							$textInput = $(node.parentNode);

							// Get and process text
							text = replaceText($textNode.text(),
								shortcut, autotext, cursorPosition);

							// If autotext is single line, simple case
							if (autotext.indexOf('\n') < 0)
							{
								// Set text node in element
								$textNode.replaceWith(text);

								// Update cursor position
								$textInput.setCursorPosition(
									cursorPosition - shortcut.length + autotext.length);
							}
							else	// Multiline expanded text
							{
								// Split text by lines
								var lines = text.split('\n');

								// For simplicity, join with <br> tag instead
								$textNode.replaceWith(lines.join('<br>'));
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
								text,
								shortcut,
								autotext,
								cursorPosition
							));

							// Set new cursor position
							$textInput.setCursorPosition(
								cursorPosition - shortcut.length + autotext.length);
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

	// Replacing shortcut with autotext in text at cursorPosition
	function replaceText(text, shortcut, autotext, cursorPosition)
	{
		console.log("expandText:", text, "shortcut:", shortcut,
					"autotext:", autotext, "cursorPosition:", cursorPosition);

		// Replace shortcut based off cursorPosition
		return [text.slice(0, cursorPosition - shortcut.length),
			autotext, text.slice(cursorPosition)].join('');
	}

	// Find node that user is editing right now, for editable divs
	function findFocusedNode()
	{
		if (window.getSelection) {
			var selection = window.getSelection();
			if (selection.rangeCount) {
				return selection.getRangeAt(0).startContainer;
			}
		}
		return null;
	}

	// Sets cursor position for a specific node
	function setCursorPositionInNode($div, node, pos)
	{
		input = $div.get(0);
		var sel, range;
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

	// Attach listener to keypresses
	function addListeners()
	{
		$(document).on(EVENT_NAME_KEYPRESS,
			'div[contenteditable=true],textarea,input[type=text]', keyPressHandler);
		$(document).on(EVENT_NAME_KEYUP,
			'div[contenteditable=true],textarea,input[type=text]', keyUpHandler);

		// Show page action if handlers attach
		chrome.runtime.sendMessage({request: "showPageAction"});
	}

	// Detach listener for keypresses
	function removeListeners() {
		$(document).off(EVENT_NAME_KEYPRESS);
		$(document).off(EVENT_NAME_KEYUP);
	}

	// Document ready function
	$(function() {
		addListeners();		// Add listener to track when user types
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

