// background.js tests
'use strict';

// Prevent mocking these two functions
jest
  .dontMock('fs')
  .dontMock('vm')
  .dontMock('sinon-chrome');

// Mock out Chrome's extension APIs
import vm from 'vm';
import fs from 'fs';
import chrome from 'sinon-chrome';
beforeEach(() => {
  window.chrome = chrome;
  chrome.runtime.sendMessage.flush();
});
afterEach(() => {
  chrome.flush();
  delete window.chrome;
});

describe('background.js', function() {
  // test('should render Main component', () => {
  //   const getUrl = function() {
  //     return chrome.runtime.getURL('popup-content.html');
  //   };
  //   chrome.runtime.getURL.returns('http://localhost:1234/index.html');
  //   const { container } = render(<Main getUrl={getUrl} />);
  //   expect(container).toMatchSnapshot();
  // });

  test('initial install', function() {
    // 1. mock chrome.* APIs to return predefined response
    chrome.runtime.getManifest = () => ({version: '1.0'});
    chrome.tabs.query.yields([
      {id: 1, title: 'Tab 1'},
      {id: 2, title: 'Tab 2'}
    ]);

    // 2. inject our mocked chrome.* api into some environment
    const context = { chrome: chrome };

    // 3. run our extension code in this environment
    const code = fs.readFileSync('./app/scripts/background.js');
    vm.runInNewContext(code, context);

    // 4. assert that button badge equals to '2'
    sinon.assert.calledOnce(chrome.browserAction.setBadgeText);
    sinon.assert.calledWithMatch(chrome.browserAction.setBadgeText, {
      text: "2"
    });
  });

});
