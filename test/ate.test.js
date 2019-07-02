// ate.js tests
'use strict';

// Prevent mocking these two functions
jest
  .dontMock('fs')
  .dontMock('vm')
  .dontMock('jquery')
  .dontMock('sinon-chrome');

// Mock out Chrome's extension APIs
import vm from 'vm';
import fs from 'fs';
import $ from 'jquery';
import chrome from 'sinon-chrome';
beforeEach(() => {
  window.chrome = chrome;
  chrome.runtime.sendMessage.flush();
});
afterEach(() => {
  chrome.flush();
  delete window.chrome;
  document.documentElement.innerHTML = '';
});

describe('ate.js', function() {

  test('gmail.com', function() {
    // var html = fs.readFileSync('sites/gmail.html').toString();
    // document.documentElement.innerHTML = html;
    // const context = { chrome: chrome };
    // const code = fs.readFileSync('./app/scripts/ate.js');
    // vm.runInNewContext(code, context);
    // TODO: emulate injecting into site and firing off a shortcut
  });
});
