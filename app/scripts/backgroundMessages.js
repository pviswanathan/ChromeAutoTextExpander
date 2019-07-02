'use strict';

chrome.runtime.onMessage.addListener(extensionMessageHandler);
chrome.browserAction.onClicked.addListener(function(tab) {
  chrome.runtime.openOptionsPage(); // Show options page
});

// Handle messages from other scripts/pages
function extensionMessageHandler(request, sender, sendResponse)
{
  console.log(request, sender);
  switch (request.request)
  {
    case 'getClipboardData':
      sendResponse({ paste:pasteFromClipboard() });
      break;

    case 'enableExpander':
      setExpanderEnabled(request.enableExpander);
      break;

    default:
      console.log('Unknown request received:', request);
      break;
  }
}

// Get paste contents from clipboard
function pasteFromClipboard()
{
  // Create element to paste content into
  document.querySelector('body').innerHTML += '<textarea id="clipboard"></textarea>';
  var clipboard = document.getElementById('clipboard');
  clipboard.select();

  // Execute paste
  var result;
  if (document.execCommand('paste', true)) {
    result = clipboard.value;
  }

  // Cleanup and return value
  clipboard.parentNode.removeChild(clipboard);
  return result;
}

// Set browser action badge text (up to 4 chars) based on disabled status
function setExpanderEnabled(status)
{
  if (status) {
    chrome.browserAction.setBadgeText({text: 'ON'});
  } else {
    chrome.browserAction.setBadgeText({text: 'OFF'});
  }
}
