/* This file is automatically rebuilt by the Cesium build process. */
define(['./CylinderGeometry-953c0aaa', './defaultValue-94c3e563', './GeometryOffsetAttribute-3e8c299c', './RuntimeError-c581ca93', './Transforms-323408fe', './Matrix2-69c32d33', './ComponentDatatype-b1ea011a', './WebGLConstants-7dccdc96', './_commonjsHelpers-3aae1032-f55dc0c4', './combine-761d9c3f', './CylinderGeometryLibrary-1ace08dc', './GeometryAttribute-cb73bb3f', './GeometryAttributes-7df9bef6', './IndexDatatype-c4099fe9', './VertexFormat-e46f29d6'], (function (CylinderGeometry, defaultValue, GeometryOffsetAttribute, RuntimeError, Transforms, Matrix2, ComponentDatatype, WebGLConstants, _commonjsHelpers3aae1032, combine, CylinderGeometryLibrary, GeometryAttribute, GeometryAttributes, IndexDatatype, VertexFormat) { 'use strict';

  function createCylinderGeometry(cylinderGeometry, offset) {
    if (defaultValue.defined(offset)) {
      cylinderGeometry = CylinderGeometry.CylinderGeometry.unpack(cylinderGeometry, offset);
    }
    return CylinderGeometry.CylinderGeometry.createGeometry(cylinderGeometry);
  }

  return createCylinderGeometry;

}));
