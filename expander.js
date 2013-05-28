
// Prevent conflicts
jQuery.noConflict();

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

// Encapsulated anonymouse function
(function($) {

	// Global Variables & Constants
	var OK = 0;
	var BACKSPACE_CODE = 8;
	var WHITESPACE_REGEX = /(\s)/;
	var LISTENER_EVENT = 'keypress.auto-expander';
	var STORAGE_KEY = 'autoTextExpanderShortcuts';
	var GMAIL_DOMAIN = /mail.google.com/;
	var GDOCS_DOMAIN = /docs.google.com/;
	var FACEBOOK_DOMAIN = /facebook.com/;

	var typingBuffer = [];		// Keep track of what's been typed before timeout
	var typingTimeout = 500;	// Half a second
	var typingTimer;			// Keep track of time between keypresses

	// When user presses a key
	function keyPressHandler(event)
	{
		event.stopPropagation();

		var char = String.fromCharCode(event.which);

		// Clear timer if still running, and start it again
		clearTypingTimer();
		typingTimer = setTimeout(clearTypingBuffer, typingTimeout);

		// Add new character to typing buffer
		typingBuffer.push(char);

		// Check typed text for shortcuts
		checkShortcuts(char, typingBuffer, event.target);
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

	// Replacing text
	function replaceText(text, shortcut, autotext, cursorPosition)
	{
		console.log(text, shortcut, autotext, cursorPosition);
		return text.substr(0, cursorPosition - shortcut.length)
			+ autotext + text.substr(cursorPosition);
	}

	// Check to see if text in argument corresponds to any shortcuts
	function checkShortcuts(lastChar, textBuffer, textInput)
	{
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
					else	// Trouble... special cases
					{
						// Test what domain is
						var domain = window.location.host;
						if (GMAIL_DOMAIN.test(domain))
						{
							$textInput = findFocusedDiv($textInput);
							text = $textInput.text();
						}
						else if (FACEBOOK_DOMAIN.test(domain))
						{
							if ($textInput.find('span').get().length) {
								$textInput = $textInput.find('span').first();
							}
							text = $textInput.text();
						}
						else {	// Not sure, try something
							text = $textInput.text();
						}

						$textInput.text(replaceText(
							text,
							shortcut,
							autotext,
							cursorPosition
						));
						$textInput.setCursorPosition(cursorPosition
							- shortcut.length + autotext.length);
					}
				}
			}

			// If last character is a space, clear buffer
			if (lastChar == " ") {
				clearTypingBuffer();
			}
		});
	}

	// Find div that user is editing right now (mostly Google products)
	function findFocusedDiv($input) {
		return $(window.getSelection().getRangeAt(0).startContainer.parentNode);
	}

	// Attach listener to keypresses
	function addListeners() {
		$(document).on(LISTENER_EVENT, 'div,textarea,input[type=text]', keyPressHandler);
	}

	// Detach listener for keypresses
	function removeListeners() {
		$(document).off(LISTENER_EVENT);
	}

	// Document ready function
	$(function()
	{
		// Add listener to when user types
		addListeners();

		// Show page action if ready function ran (and not Google Docs)
		if (!GDOCS_DOMAIN.test(domain)) {
			chrome.runtime.sendMessage({request: "showPageAction"});
		}
	});

})(jQuery);
