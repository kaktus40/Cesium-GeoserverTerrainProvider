/* This file is automatically rebuilt by the Cesium build process. */
define(['./PrimitivePipeline-247fa72e', './createTaskProcessorWorker', './Transforms-323408fe', './Matrix2-69c32d33', './RuntimeError-c581ca93', './defaultValue-94c3e563', './ComponentDatatype-b1ea011a', './WebGLConstants-7dccdc96', './_commonjsHelpers-3aae1032-f55dc0c4', './combine-761d9c3f', './GeometryAttribute-cb73bb3f', './GeometryAttributes-7df9bef6', './GeometryPipeline-e27e35f8', './AttributeCompression-3cfab808', './EncodedCartesian3-b1f97f8a', './IndexDatatype-c4099fe9', './IntersectionTests-d5d945ac', './Plane-069b6800', './WebMercatorProjection-f88d3d05'], (function (PrimitivePipeline, createTaskProcessorWorker, Transforms, Matrix2, RuntimeError, defaultValue, ComponentDatatype, WebGLConstants, _commonjsHelpers3aae1032, combine, GeometryAttribute, GeometryAttributes, GeometryPipeline, AttributeCompression, EncodedCartesian3, IndexDatatype, IntersectionTests, Plane, WebMercatorProjection) { 'use strict';

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
