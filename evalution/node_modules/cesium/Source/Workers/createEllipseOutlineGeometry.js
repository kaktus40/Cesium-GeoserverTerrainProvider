/* This file is automatically rebuilt by the Cesium build process. */
define(['./Matrix2-69c32d33', './defaultValue-94c3e563', './EllipseOutlineGeometry-6390e496', './RuntimeError-c581ca93', './ComponentDatatype-b1ea011a', './WebGLConstants-7dccdc96', './GeometryOffsetAttribute-3e8c299c', './Transforms-323408fe', './_commonjsHelpers-3aae1032-f55dc0c4', './combine-761d9c3f', './EllipseGeometryLibrary-84444adb', './GeometryAttribute-cb73bb3f', './GeometryAttributes-7df9bef6', './IndexDatatype-c4099fe9'], (function (Matrix2, defaultValue, EllipseOutlineGeometry, RuntimeError, ComponentDatatype, WebGLConstants, GeometryOffsetAttribute, Transforms, _commonjsHelpers3aae1032, combine, EllipseGeometryLibrary, GeometryAttribute, GeometryAttributes, IndexDatatype) { 'use strict';

  function createEllipseOutlineGeometry(ellipseGeometry, offset) {
    if (defaultValue.defined(offset)) {
      ellipseGeometry = EllipseOutlineGeometry.EllipseOutlineGeometry.unpack(ellipseGeometry, offset);
    }
    ellipseGeometry._center = Matrix2.Cartesian3.clone(ellipseGeometry._center);
    ellipseGeometry._ellipsoid = Matrix2.Ellipsoid.clone(ellipseGeometry._ellipsoid);
    return EllipseOutlineGeometry.EllipseOutlineGeometry.createGeometry(ellipseGeometry);
  }

  return createEllipseOutlineGeometry;

}));
