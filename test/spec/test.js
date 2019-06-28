// Browser-based tests

(function () {
  'use strict';

  console.log('Browser-based Tests');

  describe('initialization', function() {
    describe('jquery init', function() {
      it('should be available as a function', function() {
        expect(typeof window.jQuery).to.equal('function');
      });
    });
    describe('moment init', function() {
      it('should be available as a function', function() {
        expect(typeof window.moment).to.equal('function');
      });
    });
    describe('constants init', function() {
      it('should have PROD chrome extension ID', function() {
        expect(APP_ID_PRODUCTION).to.equal('iibninhmiggehlcdolcilmhacighjamp');
      });
    });
  });

})();
