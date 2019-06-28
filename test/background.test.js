// background.js tests
'use strict';

// Mock out Chrome's extension APIs
import vm from 'vm';
import fs from 'fs';
import chrome from 'sinon-chrome';
window.chrome = chrome;

describe('background.js', function() {
  // test('should render Main component', () => {
  //   const getUrl = function() {
  //     return chrome.runtime.getURL('popup-content.html');
  //   };
  //   chrome.runtime.getURL.returns('http://localhost:1234/index.html');
  //   const { container } = render(<Main getUrl={getUrl} />);
  //   expect(container).toMatchSnapshot();
  // });

  test('should return -1 when the value is not present', () => {
    expect([1, 2, 3].indexOf(4)).toBe(-1);
  });
});
