'use strict';

var test = require('tape');
var activeHandles = require('../')
var TIMEOUT = 20

function inspect(obj, depth) {
  console.error(require('util').inspect(obj, false, depth || 5, true));
}

inspect(process.versions);

function checkOne(t, fn, name, line) {

  var handles = activeHandles();
  var h = handles[0]
    , l = h.location;

  t.equal(handles.length, 1, 'returns one handle')
  t.equal(h.msecs, TIMEOUT, 'reports correct timeout')
  t.equal(h.name, name, 'resolves function name correctly')
  t.equal(h.source, fn.toString(), 'includes function source')
  t.equal(l.file, __filename, 'location has correct filename')
  t.equal(l.line, line, 'location has correct line')
}

test('\nsetting timeout with named handle', function (t) {
  function timeout() { t.end() }

  t.equal(activeHandles().length, 0, 'initially no handles are active')

  setTimeout(timeout, TIMEOUT);
  checkOne(t, timeout, 'timeout', 28)
})

test('\nsetting timeout with handle assigned to var', function (t) {
  var timeout = function () { t.end() }

  t.equal(activeHandles().length, 0, 'initially no handles are active')

  setTimeout(timeout, TIMEOUT);
  checkOne(t, timeout, 'timeout', 37)
})

test('\nsetting timeout with handle assigned to global', function (t) {
  global.timeout = function () { t.end() }

  t.equal(activeHandles().length, 0, 'initially no handles are active')

  setTimeout(global.timeout, TIMEOUT);
  checkOne(t, global.timeout, 'global.timeout', 46)
})

test('\nsetting timeout with handle assigned to a prototype', function (t) {
  function Me() {}
  Me.prototype.timeout = function () { t.end() }

  t.equal(activeHandles().length, 0, 'initially no handles are active')

  setTimeout(Me.prototype.timeout, TIMEOUT);
  checkOne(t, Me.prototype.timeout, 'Me.timeout', 56)
})
