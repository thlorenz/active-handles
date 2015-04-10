'use strict';

var cardinal            = require('cardinal')
  , xtend               = require('xtend')
  , colors              = require('ansicolors')
  , format              = require('util').format
  , getFunctionLocation = require('function-origin')
  , indexes

function highlightSource(s) {
  try {
    return cardinal.highlight(s, { lineno: true });
  } catch (e)  {
    return s;
  }
}

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

  if (opts.highlight || opts.source) {
    src = fn.toString();
    if (opts.highlight) {
      // function () { ... is not by itself parsable
      // x = function () { .. is
      highlighted = anonymous
        ? highlightSource(name + ' = ' + src)
        : highlightSource(src);
    }
  }

  var ret = {
      fn          : fn
    , name        : name
    , location    : location
  }

  if (opts.source) ret.source = src;
  if (opts.highlight) ret.highlighted = highlighted;
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

function versionGreaterEqualOneSixTwo(v) {
  var digits = v.slice(1).split('.');
  if (digits.length !== 3) return false; // can't be sure
  if (digits[0] < 1 || digits[1] < 6 || digits[2] < 2) return false;
  return true;
}

var defaultOpts = {
  source: true, highlight: true, attachHandle: false
}

/**
 * Gathers information about all currently active handles.
 * Active handles are obtained via `process._getActiveHandles`
 * and location and name of each is resolved.
 *
 * @name activeHandles
 * @function
 * @param  {Object}           options
 * @param  {Array.<Object>=}  opts.handles      handles to get info for (default: `process._getActiveHandles()`)
 * @param  {Boolean=}         opts.source       include source (default: `true`)
 * @param  {Boolean=}         opts.highlight    include highlighted source (default: `true`)
 * @param  {Boolean=}         opts.attachHandle attaches inspected handle for further inspection (default: `false`)
 * @return {Array.<Object>} handles each with the following properties
 * @return {Number}   handle.msecs         timeout specified for the handle
 * @return {Function} handle.fn            the handle itself
 * @return {String}   handle.name          the name of the function, for anonymous functions this is the name it was assigned to
 * @return {String}   handle.source        the raw function source
 * @return {String}   handle.highlighted   the highlighted source
 * @return {Object}   handle.location      location information about the handle
 * @return {String}   handle.location.file          full path to the file in which the handle was defined
 * @return {Number}   handle.location.line          line where the handle was defined
 * @return {Number}   handle.location.column        column where the handle was defined
 * @return {String}   handle.location.inferredName  name that is used when function declaration is anonymous
 */
exports = module.exports = function activeHandles(opts) {
  opts = xtend(defaultOpts, opts);
  opts.handles = opts.handles || process._getActiveHandles();
  if (!opts.handles.length) return [];
  return resolveHandles(opts);
}

/**
 * Convenience function that first calls @see activeHandles and
 * prints the information to stdout.
 *
 * @name activeHandles::print
 * @param  {Object}   options
 * @param  {Boolean=} opts.highlight print highlighted source (default: `true`)
 * @function
 */
exports.print = function print(opts) {
  var h, loc, locString, fdString, printed = {};
  var highlightString = '';

  opts = xtend(defaultOpts, opts);
  opts.source = false;

  var handles = exports(opts);
  for (var i = 0, len = handles.length; i < len; i++) {
    h = handles[i];
    loc = h.location;

    locString = loc
      ? format('%s:%d:%d', loc.file, loc.line, loc.column)
      : 'Unknown location';

    if (opts.highlight) {
      highlightString = printed[locString]
        ? 'Count: ' + (printed[locString] + 1) + '. Source printed above'
        : h.highlighted;
    }

    fdString = h.fd ? ', fd = ' + h.fd : '';

    console.log('\n%s %s (%s%s)\n%s'
      , colors.green(h.name + ':')
      , colors.brightBlack(locString)
      , h.type || 'unknown type'
      , fdString
      , highlightString);

    printed[locString] = (printed[locString] || 0) + 1;
  }
}

/**
 * Hooks `setInterval` calls in order to expose the passed handle.
 * NOTE: not needed in `io.js >=v1.6.2` and will not hook for those versions.
 *
 * The handle is wrapped. In older node versions it is not exposed.
 * The hooked version of `setInterval` will expose the wrapped callback
 * so its information can be retrieved later.
 *
 * @name activeHandles::hookSetInterval
 * @function
 */
exports.hookSetInterval = function () {
  // no need to hook things starting with io.js 1.6.2 (see resolveHandle)
  if (versionGreaterEqualOneSixTwo(process.version)) return;
  var timers = require('timers');
  var setInterval_ = timers.setInterval;

  function setIntervalHook() {
    var t = setInterval_.apply(timers, arguments);
    t._wrappedCallback = arguments[0];
    return t;
  }

  timers.setInterval = setIntervalHook;
}

// used for testing
exports._defaultOpts = defaultOpts;
