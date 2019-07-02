'use strict';

// Listen for messages from the client side
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse)
{
  console.log(request);
  console.log(sender);

  switch (request.request)
  {
    case 'getClipboardData':
      sendResponse({ paste:pasteFromClipboard() });
      break;

    // Set browser action badge text (up to 4 chars)
    case 'setBadgeText':
      chrome.browserAction.setBadgeText({text: request.text});
      break;

    default:
      console.log('Unknown request received:', request);
      break;
  }
});

// Show options page when browser action is clicked
//  Source: http://adamfeuer.com/notes/2013/01/26/chrome-extension-making-browser-action-icon-open-options-page/
chrome.browserAction.onClicked.addListener(function(tab) {
  chrome.runtime.openOptionsPage();
});


//////////////////////////////////////////////////////////
// FUNCTIONS

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

// TODO: set browser action badge text when ate.js is disabled vs working
function setExpanderEnabled(status)
{

}
