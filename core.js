'use strict';

var getFunctionLocation = require('function-origin')

function functionInfo(fn, handle, opts) {
  var name;
  var src, highlighted = null;

  var location = getFunctionLocation(fn)
  // v8 zero bases lines
  if (location) location.line++;

  // handle anonymous functions and try to figure out a meaningful function name
  var anonymous = false;
  if (!fn.name || !fn.name.length) {
    name = location.inferredName && location.inferredName.length
        ? location.inferredName
        : '__unknown_function_name__';

    anonymous = true;
  } else {
    name = fn.name;
  }

  if (opts.highlight || opts.source) src = fn.toString();

  var ret = {
      fn          : fn
    , name        : name
    , location    : location
    , anonymous   : anonymous
  }

  if (opts.highlight || opts.source) ret.source = fn.toString();
  if (opts.attachHandle) ret.handle = handle;

  return ret;
}

function resolveHandle(handle, opts) {
  var visited = {}
    , resolvedFns = {}
    , resolved = []
    , fn
    , addedInfo

  function addInfo(fn) {
    if (resolvedFns[fn]) return;
    resolvedFns[fn] = true;

    var info = functionInfo(fn, handle, opts);
    resolved.push(info);
    return info;
  }

  // timer handles created via setTimeout or setInterval
  for (var next = handle._idleNext; !!next && !visited[next]; next = next._idleNext) {
    visited[next] = true;
    var repeatIsFn = typeof next._repeat === 'function';
    var hasWrappedCallback = typeof next._wrappedCallback === 'function';

    if (!repeatIsFn && !hasWrappedCallback && !next.hasOwnProperty('_onTimeout')) continue;

    // starting with io.js 1.6.2 when using setInterval the timer handle's
    // _repeat property references the wrapped function so we prefer that
    fn = repeatIsFn
        ? next._repeat
        : hasWrappedCallback ? next._wrappedCallback : next._onTimeout;

    addedInfo = addInfo(fn, next);
    addedInfo.msecs = next._idleTimeout;
    addedInfo.type = hasWrappedCallback || repeatIsFn ? 'setInterval' : 'setTimeout';
  }

  function addHandleFn(key) {
    var value = handle._handle[key];
    if (typeof value !== 'function') return;
    var addedInfo = addInfo(value, handle._handle);
    if (handle._handle.fd) {
      addedInfo.fd = handle._handle.fd;

      switch (key) {
        case 'onconnection':
          addedInfo.type = 'net connection';
          break;
        case 'onread':
          addedInfo.type = 'net client connection';
          break;
        default:
          addInfo.type = 'unknown';

      }
    }
  }
  // handles created by the net module via direct use or of http/https
  if (handle._handle)
    Object.keys(handle._handle).forEach(addHandleFn);

  return resolved;
}

function resolveHandles(opts) {
  var tasks = opts.handles.length;
  var resolvedHandles = [];

  function pushHandle(h) {
    resolvedHandles.push(h);
  }

  function resolveCurrentHandle(handle) {
    var resolved = resolveHandle(handle, opts);
    resolved.forEach(pushHandle);
  }

  opts.handles.forEach(resolveCurrentHandle);
  return resolvedHandles;
}

var defaultOpts = {
  source: true, highlight: true, attachHandle: false
}

var exports = module.exports = function coreActiveHandles(opts) {
  opts = opts || defaultOpts;
  opts.handles = opts.handles || process._getActiveHandles();
  if (!opts.handles.length) return [];
  return resolveHandles(opts);
}

exports.defaultOpts = defaultOpts;
