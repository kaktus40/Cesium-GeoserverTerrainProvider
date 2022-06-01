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

define(['./defaultValue-81eec7ed'], (function (defaultValue) { 'use strict';

  /**
   * Formats an error object into a String.  If available, uses name, message, and stack
   * properties, otherwise, falls back on toString().
   *
   * @function
   *
   * @param {*} object The item to find in the array.
   * @returns {String} A string containing the formatted error.
   */
  function formatError(object) {
    let result;

    const name = object.name;
    const message = object.message;
    if (defaultValue.defined(name) && defaultValue.defined(message)) {
      result = `${name}: ${message}`;
    } else {
      result = object.toString();
    }

    const stack = object.stack;
    if (defaultValue.defined(stack)) {
      result += `\n${stack}`;
    }

    return result;
  }

  // createXXXGeometry functions may return Geometry or a Promise that resolves to Geometry
  // if the function requires access to ApproximateTerrainHeights.
  // For fully synchronous functions, just wrapping the function call in a Promise doesn't
  // handle errors correctly, hence try-catch
  function callAndWrap(workerFunction, parameters, transferableObjects) {
    let resultOrPromise;
    try {
      resultOrPromise = workerFunction(parameters, transferableObjects);
      return resultOrPromise; // errors handled by Promise
    } catch (e) {
      return Promise.reject(e);
    }
  }

  /**
   * Creates an adapter function to allow a calculation function to operate as a Web Worker,
   * paired with TaskProcessor, to receive tasks and return results.
   *
   * @function createTaskProcessorWorker
   *
   * @param {createTaskProcessorWorker.WorkerFunction} workerFunction The calculation function,
   *        which takes parameters and returns a result.
   * @returns {createTaskProcessorWorker.TaskProcessorWorkerFunction} A function that adapts the
   *          calculation function to work as a Web Worker onmessage listener with TaskProcessor.
   *
   *
   * @example
   * function doCalculation(parameters, transferableObjects) {
   *   // calculate some result using the inputs in parameters
   *   return result;
   * }
   *
   * return Cesium.createTaskProcessorWorker(doCalculation);
   * // the resulting function is compatible with TaskProcessor
   *
   * @see TaskProcessor
   * @see {@link http://www.w3.org/TR/workers/|Web Workers}
   * @see {@link http://www.w3.org/TR/html5/common-dom-interfaces.html#transferable-objects|Transferable objects}
   */
  function createTaskProcessorWorker(workerFunction) {
    let postMessage;

    return function (event) {
      const data = event.data;

      const transferableObjects = [];
      const responseMessage = {
        id: data.id,
        result: undefined,
        error: undefined,
      };

      return Promise.resolve(
        callAndWrap(workerFunction, data.parameters, transferableObjects)
      )
        .then(function (result) {
          responseMessage.result = result;
        })
        .catch(function (e) {
          if (e instanceof Error) {
            // Errors can't be posted in a message, copy the properties
            responseMessage.error = {
              name: e.name,
              message: e.message,
              stack: e.stack,
            };
          } else {
            responseMessage.error = e;
          }
        })
        .finally(function () {
          if (!defaultValue.defined(postMessage)) {
            postMessage = defaultValue.defaultValue(self.webkitPostMessage, self.postMessage);
          }

          if (!data.canTransferArrayBuffer) {
            transferableObjects.length = 0;
          }

          try {
            postMessage(responseMessage, transferableObjects);
          } catch (e) {
            // something went wrong trying to post the message, post a simpler
            // error that we can be sure will be cloneable
            responseMessage.result = undefined;
            responseMessage.error = `postMessage failed with error: ${formatError(
            e
          )}\n  with responseMessage: ${JSON.stringify(responseMessage)}`;
            postMessage(responseMessage);
          }
        });
    };
  }

  return createTaskProcessorWorker;

}));
//# sourceMappingURL=createTaskProcessorWorker.js.map
