// Prevent conflicts
jQuery.noConflict();

// Encapsulated anonymous function
(function($) {

	// Variables & Constants
	var OK = 0
		, KEYCODE_BACKSPACE = 8
		, KEYCODE_TAB = 9
		, KEYCODE_RETURN = 13
		, KEYCODE_SPACEBAR = 32
		, TIME_CLEAR_BUFFER_TIMEOUT = 750
		, TIME_CHECK_EDITABLE_ELEMENTS = 1000 * 30	// Every 30 seconds
		, DATE_MACRO_REGEX = /%d\(/g
		, DATE_MACRO_CLOSE_TAG = ')'
		, WHITESPACE_REGEX = /(\s)/
		, FACEBOOK_DOMAIN_REGEX = /facebook.com/
		, EVERNOTE_DOMAIN_REGEX = /evernote.com/
		, EVENT_NAME_KEYPRESS = 'keypress.auto-expander'
		, EVENT_NAME_KEYUP = 'keyup.auto-expander'
		, EVENT_NAME_BLUR = 'blur.auto-expander'
		, EVENT_NAME_LOAD = 'load.auto-expander'
		, EVENT_NAME_INSERTED = 'DOMNodeInserted'
		, OLD_STORAGE_KEY = 'autoTextExpanderShortcuts'
		, INPUT_SELECTOR = 'div[contenteditable=true],textarea,input'
		, APP_ID_PRODUCTION = 'iibninhmiggehlcdolcilmhacighjamp'
		, DEBUG = (chrome.i18n.getMessage('@@extension_id') !== APP_ID_PRODUCTION)
	;

	var typingBuffer = [];		// Keep track of what's been typed before timeout
	var typingTimer;			// Keep track of time between keypresses
	var typingTimeout		 	// Delay before we clear buffer
		= TIME_CLEAR_BUFFER_TIMEOUT;

	var keyPressEvent;			// Keep track of keypress event to prevent re-firing
	var keyUpEvent;				// Keep track of keyup event to prevent re-firing

	// Custome log function
	function debugLog() {
		if (DEBUG && console) {
			console.log.apply(console, arguments);
		}
	}

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
		var charCode = event.keyCode || event.which;
		if (charCode == KEYCODE_RETURN) {	// If return, clear and get out
			return clearTypingBuffer();
		}

		// Clear timer if still running, and start it again
		clearTypingTimer();
		typingTimer = setTimeout(clearTypingBuffer, typingTimeout);

		// Add new character to typing buffer
		var char = String.fromCharCode(charCode);
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

		// Get key that was lifted on
		var charCode = event.keyCode || event.which;

		// When user types backspace, pop character off buffer
		if (charCode == KEYCODE_BACKSPACE)
		{
			// Clear timer and restart
			clearTypingTimer();
			typingTimer = setTimeout(clearTypingBuffer, typingTimeout);

			// Remove last character typed
			typingBuffer.pop();
		}

		// If user uses tab or return, clear and get out
		if (charCode == KEYCODE_TAB || charCode == KEYCODE_RETURN) {
			return clearTypingBuffer();
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
	function clearTypingBuffer(event)
	{
		// Clear timer
		clearTypingTimer();

		// Clear buffer
		typingBuffer.length = 0;
	}

	// Check to see if text in argument corresponds to any shortcuts
	function checkShortcuts(lastChar, textBuffer, textInput)
	{
 		debugLog("checkShortcuts:", lastChar, textBuffer);

		// Get shortcuts
		var shortcut = textBuffer.join('');
		chrome.storage.sync.get(shortcut, function (data)
		{
			// Check for errors
			if (chrome.runtime.lastError) {
				console.log(chrome.runtime.lastError);
			}
			// Check that data is returned and shortcut library exists
			else if (!$.isEmptyObject(data))
			{
				// Check if shortcut exists and should be triggered
				var autotext = data[shortcut];

				if (autotext)	// Shortcut exists! Expand and replace text
				{
					// Handle moment.js dates
					autotext = processDates(autotext);

					// Add whitespace if was last character
					if (WHITESPACE_REGEX.test(lastChar)) {
						autotext += lastChar;
					}

					// Setup for processing
					var domain = window.location.host;
					var $textInput = $(textInput);
					var cursorPosition = $textInput.getCursorPosition()
					var text;

					// If input or textarea field, can easily change the val
					if ($textInput.is("textarea") || $textInput.is("input"))
					{
						// Fix for input[type=email] and input[type=number]
						if (cursorPosition === 0
							&& $textInput.is('input[type="email"],input[type="number"]')) {
							cursorPosition = $textInput.val().length;
						}

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
						// If on Facebook.com
						if (FACEBOOK_DOMAIN_REGEX.test(domain))
						{
							if ($textInput.find('span').get().length) {
								$textInput = $textInput.find('span').first();
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

						// If evernote.com
						if (EVERNOTE_DOMAIN_REGEX.test(domain))
						{
							// Get the focused / selected text node
							var iframeWindow = $('#gwt-debug-noteEditor')
								.find('iframe').get(0).contentWindow;
							var node = findFocusedNode(iframeWindow);
							var $textNode = $(node);
							debugLog($textNode);

							// Find focused div instead of what's receiving events
							$textInput = $(node.parentNode);
							debugLog($textInput);

							// Get and process text, update cursor position
							cursorPosition = $textInput.getCursorPosition(iframeWindow);
							text = replaceText($textNode.text(),
								shortcut, autotext, cursorPosition);

							// If autotext is single line, simple case
							if (autotext.indexOf('\n') < 0)
							{
								// Set text node in element
								var newNode = document.createTextNode(text);
								node.parentNode.replaceChild(newNode, node);

								// Update cursor position
								setCursorPositionInNode(newNode,
									cursorPosition - shortcut.length + autotext.length);
							}
							else	// Multiline expanded text
							{
								// Split text by lines
								var lines = text.split('\n');

								// For simplicity, join with <br> tag instead
								$textNode.replaceWith(lines.join('<br>'));

								// Find the last added text node
								$textNode = findMatchingTextNode($textInput,
									lines[lines.length - 1]);
								node = $textNode.get(0);
								debugLog($textNode);
								debugLog(node);

								// Update cursor position
								setCursorPositionInNode(node,
									lines[lines.length - 1].length);
							}
						}

						// All other elements
						else	//if ($textInput.is('[contenteditable]'))
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
								node = document.createTextNode(text);
								$textNode.replaceWith(node);

								// Update cursor position
								setCursorPositionInNode(node,
									cursorPosition - shortcut.length + autotext.length);
							}
							else	// Multiline expanded text
							{
								// Split text by lines
								var lines = text.split('\n');

								// For simplicity, join with <br> tag instead
								$textNode.replaceWith(lines.join('<br>'));

								// Find the last added text node
								$textNode = findMatchingTextNode($textInput,
									lines[lines.length - 1]);
								node = $textNode.get(0);
								debugLog($textNode);
								debugLog(node);

								// Update cursor position
								setCursorPositionInNode(node,
									lines[lines.length - 1].length);
							}
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
		debugLog("cursorPosition:", cursorPosition);
		debugLog("currentText:", text);
		debugLog("shortcut:", shortcut);
		debugLog("expandedText:", autotext);

		// Replace shortcut based off cursorPosition
		return [text.slice(0, cursorPosition - shortcut.length),
			autotext, text.slice(cursorPosition)].join('');
	}

	// Find node that has text contents that matches text
	function findMatchingTextNode($div, text)
	{
		return $div.contents().filter(function() {
				return (this.nodeType == 3)						// Return all text nodes
					&& (this.nodeValue.length == text.length);	// with same text length
			}).filter(function() {
				return (this.nodeValue == text);	// Filter for same text
			}).first();
	}

	// Find node that user is editing right now, for editable divs
	//  Optional passed window to perform selection find on
	function findFocusedNode(win)
	{
		// Use default window if not given window to search in
		if (!win) {
			win = window;
		}

		// Look for selection
		if (win.getSelection) {
			var selection = win.getSelection();
			if (selection.rangeCount) {
				return selection.getRangeAt(0).startContainer;
			}
		}
		return null;
	}

	// Sets cursor position for a specific node
	function setCursorPositionInNode(node, pos)
	{
		var sel, range;
		if (window.getSelection && document.createRange) {
			range = document.createRange();
 			range.setEnd(node, pos);
			range.setStart(node, pos);
			sel = window.getSelection();
			sel.removeAllRanges();
			sel.addRange(range);
		} else if (document.body.createTextRange) {
			range = document.body.createTextRange();
			range.setEnd(node, pos);
			range.setStart(node, pos);
			range.select();
		}
	}

	// Process and replace date tags and formats with moment.js
	function processDates(text)
	{
		var dateOpenTags = [], dateCloseTags = [];

		// Find all indices of opening tags
		while (result = DATE_MACRO_REGEX.exec(text)) {
			dateOpenTags.push(result.index);
		}

		if (!dateOpenTags.length) {
			return text;
		}

		// Find matching closing tag for each date
		for (var i = 0, len = dateOpenTags.length; i < len; ++i) {
			dateCloseTags[i] = text.indexOf(
				DATE_MACRO_CLOSE_TAG, dateOpenTags[i] + 1);
		}

		// Loop through and replace date tags with formatted text
		var processedText = [text.slice(0, dateOpenTags[0])];
		for (var i = 0, len = dateOpenTags.length; i < len; ++i)
		{
			processedText.push(moment().format(text.slice(
				dateOpenTags[i] + 3, dateCloseTags[i])));
			processedText.push(text.slice(dateCloseTags[i] + 1,
				(i == len - 1) ? undefined : dateOpenTags[i+1]));
		}

		// Return processed dates
		return processedText.join('');
	}

	// Check if page has editable elements - based off PopChrom
	function hasEditableElements() {
		return $(document).find(INPUT_SELECTOR).length;
	}

	// Update page action to show if there are editable elements
	function updatePageAction() {
		chrome.runtime.sendMessage({ request:(hasEditableElements()
			? "showPageAction" : "hidePageAction") });
	}

	// Add event listeners to iframe - based off PopChrom
	function addListenersToIframe($target)
	{
		// Attach to iframe's contents
		try {
			$target.contents().on(EVENT_NAME_KEYPRESS, INPUT_SELECTOR, keyPressHandler);
			$target.contents().on(EVENT_NAME_KEYUP, INPUT_SELECTOR, keyUpHandler);
		} catch (exception) {
			console.log(exception);
		}

		// Attach to its load event in case it hasn't loaded yet
		$target.on(EVENT_NAME_LOAD, function(e)		// On load
		{
			debugLog("Attempting to attach listeners to new iframe");
			var $iframe = $(this);
			try {
				$iframe.contents().on(EVENT_NAME_KEYPRESS,
					INPUT_SELECTOR, keyPressHandler);
				$iframe.contents().on(EVENT_NAME_KEYUP,
					INPUT_SELECTOR, keyUpHandler);

				// Special case for Evernote
				var domain = $iframe.contents().get(0).location.host;
				debugLog('iframe location:', domain);
				if (EVERNOTE_DOMAIN_REGEX.test(domain))
				{
					$iframe.contents().find('body')
						.on(EVENT_NAME_KEYPRESS, keyPressHandler);
					$iframe.contents().find('body')
						.on(EVENT_NAME_KEYUP, keyUpHandler);
				}
			} catch (exception) {
				console.log(exception);
			}
		});
	}

	// Attach listener to keypresses
	function addListeners()
	{
		// Add to editable divs, textareas, inputs
		var $document = $(document);
		$document.on(EVENT_NAME_KEYPRESS, INPUT_SELECTOR, keyPressHandler);
		$document.on(EVENT_NAME_KEYUP, INPUT_SELECTOR, keyUpHandler);
		$document.on(EVENT_NAME_BLUR, INPUT_SELECTOR, clearTypingBuffer);

		// Attach to future iframes
		$document.on(EVENT_NAME_INSERTED, function(e) {
			var $target = $(e.target);
			if ($target.is('iframe')) {
				addListenersToIframe($target);
			}
		});

		// Attach to existing iframes as well - this needs to be at the end
		//  because sometimes this breaks depending on cross-domain policy
		$document.find('iframe').each(function(index) {
			addListenersToIframe($(this));
		});
	}

	// Detach listener for keypresses
	function removeListeners() {
		$(document).off(EVENT_NAME_KEYPRESS);
		$(document).off(EVENT_NAME_KEYUP);
		$(document).off(EVENT_NAME_LOAD);
		$(document).off(EVENT_NAME_BLUR);
	}

	// Document ready function
	$(function()
	{
		// Add listener to track when user types
		addListeners();

		// If has editable elements, show page action, keep polling in case new
		// elements show up
		updatePageAction();
		setInterval(function() {
			updatePageAction();
		}, TIME_CHECK_EDITABLE_ELEMENTS);
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
			try {	// Needed for new input[type=email] failing
				if (input.setSelectionRange) {
					input.setSelectionRange(pos, pos);
				} else if (input.createTextRange) {
					range = input.createTextRange();
					range.collapse(true);
					range.moveEnd('character', pos);
					range.moveStart('character', pos);
					range.select();
				}
			} catch (exception) {
				console.log('setCursorPosition', exception);
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
    $.fn.getCursorPosition = function(win, doc) {
		var el = $(this).get(0);
		var pos = 0, sel;
		if (!win) { win = window; }
		if (!doc) { doc = document; }
		if ($(this).is('input') || $(this).is('textarea')) {
			try {	// Needed for new input[type=email] failing
				if (el.selectionStart) {
					pos = el.selectionStart;
				} else if (doc.selection) {
					el.focus();
					sel = doc.selection.createRange();
					var SelLength = doc.selection.createRange().text.length;
					Sel.moveStart('character', -el.value.length);
					pos = Sel.text.length - SelLength;
				}
			} catch (exception) {
				console.log('getCursorPosition:', exception);
			}
		} else {	// Other elements
			if (win.getSelection) {
				sel = win.getSelection();
				if (sel.rangeCount) {
					pos = sel.getRangeAt(0).endOffset;
				}
			} else if (doc.selection && doc.selection.createRange) {
				sel = doc.selection.createRange();
				var tempEl = doc.createElement("span");
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

