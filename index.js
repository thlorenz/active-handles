'use strict';

var cardinal            = require('cardinal')
  , xtend               = require('xtend')
  , colors              = require('ansicolors')
  , format              = require('util').format
  , core                = require('./core')
  , indexes

function highlightSource(s) {
  try {
    return cardinal.highlight(s, { lineno: true });
  } catch (e)  {
    return s;
  }
}

function addHighlight(info) {
    // function () { ... is not by itself parsable
    // x = function () { .. is
   info.highlighted = info.anonymous
      ? highlightSource(info.name + ' = ' + info.source)
      : highlightSource(info.source);
}

function versionGreaterEqualOneSixTwo(v) {
  var digits = v.slice(1).split('.');
  if (digits.length !== 3) return false; // can't be sure
  if (digits[0] < 1 || digits[1] < 6 || digits[2] < 2) return false;
  return true;
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
 * @param  {Boolean=}         opts.source       include source (default: `true`), included either way if `highlight=true`
 * @param  {Boolean=}         opts.highlight    include highlighted source (default: `true`)
 * @param  {Boolean=}         opts.attachHandle attaches inspected handle for further inspection (default: `false`)
 * @return {Array.<Object>} handles each with the following properties
 * @return {Number}   handle.msecs         timeout specified for the handle
 * @return {Function} handle.fn            the handle itself
 * @return {String}   handle.name          the name of the function, for anonymous functions this is the name it was assigned to
 * @return {Boolean}  handle.anonymous     true if the function was anonymous 
 * @return {String}   handle.source        the raw function source
 * @return {String}   handle.highlighted   the highlighted source
 * @return {Object}   handle.location      location information about the handle
 * @return {String}   handle.location.file          full path to the file in which the handle was defined
 * @return {Number}   handle.location.line          line where the handle was defined
 * @return {Number}   handle.location.column        column where the handle was defined
 * @return {String}   handle.location.inferredName  name that is used when function declaration is anonymous
 */
exports = module.exports = function activeHandles(opts) {
  opts = xtend(core.defaultOpts, opts);
  var infos = core(opts);

  if (opts.highlight) infos.forEach(addHighlight);
  return infos;
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

  opts = xtend(core.defaultOpts, opts);
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
