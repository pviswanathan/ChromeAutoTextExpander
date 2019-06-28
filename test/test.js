// Nodejs tests

(function () {
  'use strict';

  console.log('Nodejs Tests');

  var chai = require('chai')
  var assert = chai.assert;
  var expect = chai.expect;
  var should = chai.should();

  // Mock out chrome APIs
  const chrome = require('sinon-chrome');

  describe('Background.js', function() {

    // Mock out Chrome's extension APIs
    before(function () { global.chrome = chrome; });

    describe('#indexOf()', function() {
      it('should return -1 when the value is not present', function() {
        assert.equal([1, 2, 3].indexOf(4), -1);
      });
    });
  });

})();
