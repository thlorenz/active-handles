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
  t.equal(h.type, 'setInterval', 'identifies type as setInterval')
  t.equal(l.file, __filename, 'location has correct filename')
  t.equal(l.line, line, 'location has correct line')
}

test('\nsetting interval with named handle', function (t) {
  function timeout() { clearInterval(iv); t.end() }

  t.equal(activeHandles().length, 0, 'initially no handles are active')

  var iv = setInterval(timeout, TIMEOUT);
  checkOne(t, timeout, 'timeout', 31)
})

test('\nsetting interval with handle assigned to var', function (t) {
  var timeout = function () { clearInterval(iv); t.end() }

  t.equal(activeHandles().length, 0, 'initially no handles are active')

  var iv = setInterval(timeout, TIMEOUT);
  checkOne(t, timeout, 'timeout', 40)
})

test('\nsetting interval with handle assigned to global', function (t) {
  global.timeout = function () { clearInterval(iv); t.end() }

  t.equal(activeHandles().length, 0, 'initially no handles are active')

  var iv = setInterval(global.timeout, TIMEOUT);
  checkOne(t, global.timeout, 'global.timeout', 49)
})

test('\nsetting interval with handle assigned to a prototype', function (t) {
  function Me() {}
  Me.prototype.timeout = function () { clearInterval(iv); t.end() }

  t.equal(activeHandles().length, 0, 'initially no handles are active')

  var iv = setInterval(Me.prototype.timeout, TIMEOUT);
  checkOne(t, Me.prototype.timeout, 'Me.timeout', 59)
})

test('\nsetting interval with inlined handle unnamed', function (t) {
  t.equal(activeHandles().length, 0, 'initially no handles are active')

  var iv = setInterval(function () { /* name your functions ;) */ clearInterval(iv); t.end() }, TIMEOUT);
  checkOne(t, function () { /* name your functions ;) */ clearInterval(iv); t.end() }, '__unknown_function_name__', 70)
})

test('\nsetting interval with inlined handle named', function (t) {
  t.equal(activeHandles().length, 0, 'initially no handles are active')

  var iv = setInterval(function foo() { clearInterval(iv); t.end() }, TIMEOUT);
  checkOne(t, function foo() { clearInterval(iv); t.end() }, 'foo', 77)
})
