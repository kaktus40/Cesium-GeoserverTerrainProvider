/* This file is automatically rebuilt by the Cesium build process. */
define(['./BoxGeometry-4131a06c', './defaultValue-94c3e563', './GeometryOffsetAttribute-3e8c299c', './RuntimeError-c581ca93', './Transforms-323408fe', './Matrix2-69c32d33', './ComponentDatatype-b1ea011a', './WebGLConstants-7dccdc96', './_commonjsHelpers-3aae1032-f55dc0c4', './combine-761d9c3f', './GeometryAttribute-cb73bb3f', './GeometryAttributes-7df9bef6', './VertexFormat-e46f29d6'], (function (BoxGeometry, defaultValue, GeometryOffsetAttribute, RuntimeError, Transforms, Matrix2, ComponentDatatype, WebGLConstants, _commonjsHelpers3aae1032, combine, GeometryAttribute, GeometryAttributes, VertexFormat) { 'use strict';

  function createBoxGeometry(boxGeometry, offset) {
    if (defaultValue.defined(offset)) {
      boxGeometry = BoxGeometry.BoxGeometry.unpack(boxGeometry, offset);
    }
    return BoxGeometry.BoxGeometry.createGeometry(boxGeometry);
  }

  return createBoxGeometry;

}));
