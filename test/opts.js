'use strict';

var test = require('tape');
var activeHandles = require('../')
var core = require('../core')
var xtend = require('xtend')
var TIMEOUT = 20

function inspect(obj, depth) {
  console.error(require('util').inspect(obj, false, depth || 5, true));
}

function insp(obj, depth) {
  return require('util').inspect(obj, false, depth || 5, true);
}

inspect(process.versions);

function checkOne(t, opts) {
  function timeout() { t.end() }
  setTimeout(timeout, TIMEOUT);

  var fn = timeout
    , name = 'timeout'
    , line = 20

  var firstHandle = process._getActiveHandles()[0];
  var handles = activeHandles(opts);
  var h = handles[0]
    , l = h.location;

  // xtend after the call to ensure it is xtended in impl as well
  opts = xtend(core.defaultOpts, opts)

  t.equal(handles.length, 1, 'returns one handle')
  t.equal(h.msecs, TIMEOUT, 'reports correct timeout')
  t.equal(h.name, name, 'resolves function name correctly')
  t.equal(h.type, 'setTimeout', 'identifies type as setTimeout')
  t.equal(l.file, __filename, 'location has correct filename')
  t.equal(l.line, line, 'location has correct line')

  if(opts.source || opts.highlight)
    t.equal(h.source, fn.toString(), 'includes function source')
  else
    t.ok(!h.source, 'does not include function source')

  if (opts.highlight)     t.ok(h.highlighted, 'includes highlighted function source')
  else                    t.ok(!h.highlighted, 'does not include highlighted function source')

  if (opts.attachHandle)  t.equal(h.handle && h.handle.msecs, firstHandle.msecs, 'attaches handle to result')
  else                    t.ok(!h.handle, 'does not attach handle to result')
}

var opts1 = { highlight: false }
test('\nsetting timeout with named handle, options:' + insp(opts1), function (t) {
  checkOne(t, opts1)
})

var opts2 = { source: false }
test('\nsetting timeout with named handle, options:' + insp(opts2), function (t) {
  checkOne(t, opts2)
})

var opts3 = { source: false, highlight: false }
test('\nsetting timeout with named handle, options:' + insp(opts3), function (t) {
  checkOne(t, opts3)
})

var opts4 = { attachHandle: true }
test('\nsetting timeout with named handle, options:' + insp(opts4), function (t) {
  checkOne(t, opts4)
})
