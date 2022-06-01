/* This file is automatically rebuilt by the Cesium build process. */
define(['exports', './RuntimeError-c581ca93', './defaultValue-94c3e563'], (function (exports, RuntimeError, defaultValue) { 'use strict';

  /**
   * Fill an array or a portion of an array with a given value.
   *
   * @param {Array} array The array to fill.
   * @param {*} value The value to fill the array with.
   * @param {Number} [start=0] The index to start filling at.
   * @param {Number} [end=array.length] The index to end stop at.
   *
   * @returns {Array} The resulting array.
   * @private
   */
  function arrayFill(array, value, start, end) {
    //>>includeStart('debug', pragmas.debug);
    RuntimeError.Check.defined("array", array);
    RuntimeError.Check.defined("value", value);
    if (defaultValue.defined(start)) {
      RuntimeError.Check.typeOf.number("start", start);
    }
    if (defaultValue.defined(end)) {
      RuntimeError.Check.typeOf.number("end", end);
    }
    //>>includeEnd('debug');

    if (typeof array.fill === "function") {
      return array.fill(value, start, end);
    }

    const length = array.length >>> 0;
    const relativeStart = defaultValue.defaultValue(start, 0);
    // If negative, find wrap around position
    let k =
      relativeStart < 0
        ? Math.max(length + relativeStart, 0)
        : Math.min(relativeStart, length);
    const relativeEnd = defaultValue.defaultValue(end, length);
    // If negative, find wrap around position
    const last =
      relativeEnd < 0
        ? Math.max(length + relativeEnd, 0)
        : Math.min(relativeEnd, length);

    // Fill array accordingly
    while (k < last) {
      array[k] = value;
      k++;
    }
    return array;
  }

  /**
   * Represents which vertices should have a value of `true` for the `applyOffset` attribute
   * @private
   */
  const GeometryOffsetAttribute = {
    NONE: 0,
    TOP: 1,
    ALL: 2,
  };
  var GeometryOffsetAttribute$1 = Object.freeze(GeometryOffsetAttribute);

  exports.GeometryOffsetAttribute = GeometryOffsetAttribute$1;
  exports.arrayFill = arrayFill;

}));
