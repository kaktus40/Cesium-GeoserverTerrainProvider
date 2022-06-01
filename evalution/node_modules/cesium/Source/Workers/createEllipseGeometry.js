/* This file is automatically rebuilt by the Cesium build process. */
define(['./Matrix2-69c32d33', './defaultValue-94c3e563', './EllipseGeometry-ff9222ba', './RuntimeError-c581ca93', './ComponentDatatype-b1ea011a', './WebGLConstants-7dccdc96', './GeometryOffsetAttribute-3e8c299c', './Transforms-323408fe', './_commonjsHelpers-3aae1032-f55dc0c4', './combine-761d9c3f', './EllipseGeometryLibrary-84444adb', './GeometryAttribute-cb73bb3f', './GeometryAttributes-7df9bef6', './GeometryInstance-f69fd420', './GeometryPipeline-e27e35f8', './AttributeCompression-3cfab808', './EncodedCartesian3-b1f97f8a', './IndexDatatype-c4099fe9', './IntersectionTests-d5d945ac', './Plane-069b6800', './VertexFormat-e46f29d6'], (function (Matrix2, defaultValue, EllipseGeometry, RuntimeError, ComponentDatatype, WebGLConstants, GeometryOffsetAttribute, Transforms, _commonjsHelpers3aae1032, combine, EllipseGeometryLibrary, GeometryAttribute, GeometryAttributes, GeometryInstance, GeometryPipeline, AttributeCompression, EncodedCartesian3, IndexDatatype, IntersectionTests, Plane, VertexFormat) { 'use strict';

  function createEllipseGeometry(ellipseGeometry, offset) {
    if (defaultValue.defined(offset)) {
      ellipseGeometry = EllipseGeometry.EllipseGeometry.unpack(ellipseGeometry, offset);
    }
    ellipseGeometry._center = Matrix2.Cartesian3.clone(ellipseGeometry._center);
    ellipseGeometry._ellipsoid = Matrix2.Ellipsoid.clone(ellipseGeometry._ellipsoid);
    return EllipseGeometry.EllipseGeometry.createGeometry(ellipseGeometry);
  }

  return createEllipseGeometry;

}));
