/**
 * Cesium - https://github.com/CesiumGS/cesium
 *
 * Copyright 2011-2020 Cesium Contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Columbus View (Pat. Pend.)
 *
 * Portions licensed separately.
 * See https://github.com/CesiumGS/cesium/blob/main/LICENSE.md for full licensing details.
 */

define(['exports', './defaultValue-81eec7ed'], (function (exports, defaultValue) { 'use strict';

  /**
   * Merges two objects, copying their properties onto a new combined object. When two objects have the same
   * property, the value of the property on the first object is used.  If either object is undefined,
   * it will be treated as an empty object.
   *
   * @example
   * const object1 = {
   *     propOne : 1,
   *     propTwo : {
   *         value1 : 10
   *     }
   * }
   * const object2 = {
   *     propTwo : 2
   * }
   * const final = Cesium.combine(object1, object2);
   *
   * // final === {
   * //     propOne : 1,
   * //     propTwo : {
   * //         value1 : 10
   * //     }
   * // }
   *
   * @param {Object} [object1] The first object to merge.
   * @param {Object} [object2] The second object to merge.
   * @param {Boolean} [deep=false] Perform a recursive merge.
   * @returns {Object} The combined object containing all properties from both objects.
   *
   * @function
   */
  function combine(object1, object2, deep) {
    deep = defaultValue.defaultValue(deep, false);

    const result = {};

    const object1Defined = defaultValue.defined(object1);
    const object2Defined = defaultValue.defined(object2);
    let property;
    let object1Value;
    let object2Value;
    if (object1Defined) {
      for (property in object1) {
        if (object1.hasOwnProperty(property)) {
          object1Value = object1[property];
          if (
            object2Defined &&
            deep &&
            typeof object1Value === "object" &&
            object2.hasOwnProperty(property)
          ) {
            object2Value = object2[property];
            if (typeof object2Value === "object") {
              result[property] = combine(object1Value, object2Value, deep);
            } else {
              result[property] = object1Value;
            }
          } else {
            result[property] = object1Value;
          }
        }
      }
    }
    if (object2Defined) {
      for (property in object2) {
        if (
          object2.hasOwnProperty(property) &&
          !result.hasOwnProperty(property)
        ) {
          object2Value = object2[property];
          result[property] = object2Value;
        }
      }
    }
    return result;
  }

  exports.combine = combine;

}));
//# sourceMappingURL=combine-3c023bda.js.map
