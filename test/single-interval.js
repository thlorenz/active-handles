'use strict';

var test = require('tape');
var activeHandles = require('../')
var TIMEOUT = 20

function inspect(obj, depth) {
  console.error(require('util').inspect(obj, false, depth || 5, true));
}

inspect(process.versions);

activeHandles.hookSetInterval();

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
  function timeout() { clearInterval(iv); t.end() }

  t.equal(activeHandles().length, 0, 'initially no handles are active')

  var iv = setInterval(timeout, TIMEOUT);
  checkOne(t, timeout, 'timeout', 30)
})

test('\nsetting timeout with handle assigned to var', function (t) {
  var timeout = function () { clearInterval(iv); t.end() }

  t.equal(activeHandles().length, 0, 'initially no handles are active')

  var iv = setInterval(timeout, TIMEOUT);
  checkOne(t, timeout, 'timeout', 39)
})

test('\nsetting timeout with handle assigned to global', function (t) {
  global.timeout = function () { clearInterval(iv); t.end() }

  t.equal(activeHandles().length, 0, 'initially no handles are active')

  var iv = setInterval(global.timeout, TIMEOUT);
  checkOne(t, global.timeout, 'global.timeout', 48)
})

test('\nsetting timeout with handle assigned to a prototype', function (t) {
  function Me() {}
  Me.prototype.timeout = function () { clearInterval(iv); t.end() }

  t.equal(activeHandles().length, 0, 'initially no handles are active')

  var iv = setInterval(Me.prototype.timeout, TIMEOUT);
  checkOne(t, Me.prototype.timeout, 'Me.timeout', 58)
})
