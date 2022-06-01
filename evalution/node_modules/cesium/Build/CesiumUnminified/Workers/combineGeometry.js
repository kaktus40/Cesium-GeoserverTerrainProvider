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

define(['./PrimitivePipeline-ed21cfbb', './createTaskProcessorWorker', './Transforms-f0a54c7b', './Matrix2-d35cf4b5', './RuntimeError-8952249c', './defaultValue-81eec7ed', './ComponentDatatype-9e86ac8f', './WebGLConstants-508b9636', './_commonjsHelpers-3aae1032-26891ab7', './combine-3c023bda', './GeometryAttribute-eeb38987', './GeometryAttributes-32b29525', './GeometryPipeline-55e02a41', './AttributeCompression-d0b97a83', './EncodedCartesian3-530d5328', './IndexDatatype-bed3935d', './IntersectionTests-a25e058d', './Plane-24f22488', './WebMercatorProjection-2d464b74'], (function (PrimitivePipeline, createTaskProcessorWorker, Transforms, Matrix2, RuntimeError, defaultValue, ComponentDatatype, WebGLConstants, _commonjsHelpers3aae1032, combine, GeometryAttribute, GeometryAttributes, GeometryPipeline, AttributeCompression, EncodedCartesian3, IndexDatatype, IntersectionTests, Plane, WebMercatorProjection) { 'use strict';

  function combineGeometry(packedParameters, transferableObjects) {
    const parameters = PrimitivePipeline.PrimitivePipeline.unpackCombineGeometryParameters(
      packedParameters
    );
    const results = PrimitivePipeline.PrimitivePipeline.combineGeometry(parameters);
    return PrimitivePipeline.PrimitivePipeline.packCombineGeometryResults(
      results,
      transferableObjects
    );
  }
  var combineGeometry$1 = createTaskProcessorWorker(combineGeometry);

  return combineGeometry$1;

}));
//# sourceMappingURL=combineGeometry.js.map
