/* This file is automatically rebuilt by the Cesium build process. */
define(['./defaultValue-94c3e563', './Transforms-323408fe', './Matrix2-69c32d33', './RuntimeError-c581ca93', './ComponentDatatype-b1ea011a', './GeometryAttribute-cb73bb3f', './GeometryAttributes-7df9bef6', './_commonjsHelpers-3aae1032-f55dc0c4', './combine-761d9c3f', './WebGLConstants-7dccdc96'], (function (defaultValue, Transforms, Matrix2, RuntimeError, ComponentDatatype, GeometryAttribute, GeometryAttributes, _commonjsHelpers3aae1032, combine, WebGLConstants) { 'use strict';

  /**
   * Describes geometry representing the outline of a plane centered at the origin, with a unit width and length.
   *
   * @alias PlaneOutlineGeometry
   * @constructor
   *
   */
  function PlaneOutlineGeometry() {
    this._workerName = "createPlaneOutlineGeometry";
  }

  /**
   * The number of elements used to pack the object into an array.
   * @type {Number}
   */
  PlaneOutlineGeometry.packedLength = 0;

  /**
   * Stores the provided instance into the provided array.
   *
   * @param {PlaneOutlineGeometry} value The value to pack.
   * @param {Number[]} array The array to pack into.
   *
   * @returns {Number[]} The array that was packed into
   */
  PlaneOutlineGeometry.pack = function (value, array) {
    //>>includeStart('debug', pragmas.debug);
    RuntimeError.Check.defined("value", value);
    RuntimeError.Check.defined("array", array);
    //>>includeEnd('debug');

    return array;
  };

  /**
   * Retrieves an instance from a packed array.
   *
   * @param {Number[]} array The packed array.
   * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
   * @param {PlaneOutlineGeometry} [result] The object into which to store the result.
   * @returns {PlaneOutlineGeometry} The modified result parameter or a new PlaneOutlineGeometry instance if one was not provided.
   */
  PlaneOutlineGeometry.unpack = function (array, startingIndex, result) {
    //>>includeStart('debug', pragmas.debug);
    RuntimeError.Check.defined("array", array);
    //>>includeEnd('debug');

    if (!defaultValue.defined(result)) {
      return new PlaneOutlineGeometry();
    }

    return result;
  };

  const min = new Matrix2.Cartesian3(-0.5, -0.5, 0.0);
  const max = new Matrix2.Cartesian3(0.5, 0.5, 0.0);

  /**
   * Computes the geometric representation of an outline of a plane, including its vertices, indices, and a bounding sphere.
   *
   * @returns {Geometry|undefined} The computed vertices and indices.
   */
  PlaneOutlineGeometry.createGeometry = function () {
    const attributes = new GeometryAttributes.GeometryAttributes();
    const indices = new Uint16Array(4 * 2);
    const positions = new Float64Array(4 * 3);

    positions[0] = min.x;
    positions[1] = min.y;
    positions[2] = min.z;
    positions[3] = max.x;
    positions[4] = min.y;
    positions[5] = min.z;
    positions[6] = max.x;
    positions[7] = max.y;
    positions[8] = min.z;
    positions[9] = min.x;
    positions[10] = max.y;
    positions[11] = min.z;

    attributes.position = new GeometryAttribute.GeometryAttribute({
      componentDatatype: ComponentDatatype.ComponentDatatype.DOUBLE,
      componentsPerAttribute: 3,
      values: positions,
    });

    indices[0] = 0;
    indices[1] = 1;
    indices[2] = 1;
    indices[3] = 2;
    indices[4] = 2;
    indices[5] = 3;
    indices[6] = 3;
    indices[7] = 0;

    return new GeometryAttribute.Geometry({
      attributes: attributes,
      indices: indices,
      primitiveType: GeometryAttribute.PrimitiveType.LINES,
      boundingSphere: new Transforms.BoundingSphere(Matrix2.Cartesian3.ZERO, Math.sqrt(2.0)),
    });
  };

  function createPlaneOutlineGeometry(planeGeometry, offset) {
    if (defaultValue.defined(offset)) {
      planeGeometry = PlaneOutlineGeometry.unpack(planeGeometry, offset);
    }
    return PlaneOutlineGeometry.createGeometry(planeGeometry);
  }

  return createPlaneOutlineGeometry;

}));
