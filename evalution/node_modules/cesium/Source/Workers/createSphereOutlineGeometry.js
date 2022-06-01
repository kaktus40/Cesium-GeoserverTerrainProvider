/* This file is automatically rebuilt by the Cesium build process. */
define(['./defaultValue-94c3e563', './Matrix2-69c32d33', './RuntimeError-c581ca93', './EllipsoidOutlineGeometry-50e0e9f1', './ComponentDatatype-b1ea011a', './WebGLConstants-7dccdc96', './GeometryOffsetAttribute-3e8c299c', './Transforms-323408fe', './_commonjsHelpers-3aae1032-f55dc0c4', './combine-761d9c3f', './GeometryAttribute-cb73bb3f', './GeometryAttributes-7df9bef6', './IndexDatatype-c4099fe9'], (function (defaultValue, Matrix2, RuntimeError, EllipsoidOutlineGeometry, ComponentDatatype, WebGLConstants, GeometryOffsetAttribute, Transforms, _commonjsHelpers3aae1032, combine, GeometryAttribute, GeometryAttributes, IndexDatatype) { 'use strict';

  /**
   * A description of the outline of a sphere.
   *
   * @alias SphereOutlineGeometry
   * @constructor
   *
   * @param {Object} [options] Object with the following properties:
   * @param {Number} [options.radius=1.0] The radius of the sphere.
   * @param {Number} [options.stackPartitions=10] The count of stacks for the sphere (1 greater than the number of parallel lines).
   * @param {Number} [options.slicePartitions=8] The count of slices for the sphere (Equal to the number of radial lines).
   * @param {Number} [options.subdivisions=200] The number of points per line, determining the granularity of the curvature .
   *
   * @exception {DeveloperError} options.stackPartitions must be greater than or equal to one.
   * @exception {DeveloperError} options.slicePartitions must be greater than or equal to zero.
   * @exception {DeveloperError} options.subdivisions must be greater than or equal to zero.
   *
   * @example
   * const sphere = new Cesium.SphereOutlineGeometry({
   *   radius : 100.0,
   *   stackPartitions : 6,
   *   slicePartitions: 5
   * });
   * const geometry = Cesium.SphereOutlineGeometry.createGeometry(sphere);
   */
  function SphereOutlineGeometry(options) {
    const radius = defaultValue.defaultValue(options.radius, 1.0);
    const radii = new Matrix2.Cartesian3(radius, radius, radius);
    const ellipsoidOptions = {
      radii: radii,
      stackPartitions: options.stackPartitions,
      slicePartitions: options.slicePartitions,
      subdivisions: options.subdivisions,
    };

    this._ellipsoidGeometry = new EllipsoidOutlineGeometry.EllipsoidOutlineGeometry(ellipsoidOptions);
    this._workerName = "createSphereOutlineGeometry";
  }

  /**
   * The number of elements used to pack the object into an array.
   * @type {Number}
   */
  SphereOutlineGeometry.packedLength = EllipsoidOutlineGeometry.EllipsoidOutlineGeometry.packedLength;

  /**
   * Stores the provided instance into the provided array.
   *
   * @param {SphereOutlineGeometry} value The value to pack.
   * @param {Number[]} array The array to pack into.
   * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
   *
   * @returns {Number[]} The array that was packed into
   */
  SphereOutlineGeometry.pack = function (value, array, startingIndex) {
    //>>includeStart('debug', pragmas.debug);
    RuntimeError.Check.typeOf.object("value", value);
    //>>includeEnd('debug');

    return EllipsoidOutlineGeometry.EllipsoidOutlineGeometry.pack(
      value._ellipsoidGeometry,
      array,
      startingIndex
    );
  };

  const scratchEllipsoidGeometry = new EllipsoidOutlineGeometry.EllipsoidOutlineGeometry();
  const scratchOptions = {
    radius: undefined,
    radii: new Matrix2.Cartesian3(),
    stackPartitions: undefined,
    slicePartitions: undefined,
    subdivisions: undefined,
  };

  /**
   * Retrieves an instance from a packed array.
   *
   * @param {Number[]} array The packed array.
   * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
   * @param {SphereOutlineGeometry} [result] The object into which to store the result.
   * @returns {SphereOutlineGeometry} The modified result parameter or a new SphereOutlineGeometry instance if one was not provided.
   */
  SphereOutlineGeometry.unpack = function (array, startingIndex, result) {
    const ellipsoidGeometry = EllipsoidOutlineGeometry.EllipsoidOutlineGeometry.unpack(
      array,
      startingIndex,
      scratchEllipsoidGeometry
    );
    scratchOptions.stackPartitions = ellipsoidGeometry._stackPartitions;
    scratchOptions.slicePartitions = ellipsoidGeometry._slicePartitions;
    scratchOptions.subdivisions = ellipsoidGeometry._subdivisions;

    if (!defaultValue.defined(result)) {
      scratchOptions.radius = ellipsoidGeometry._radii.x;
      return new SphereOutlineGeometry(scratchOptions);
    }

    Matrix2.Cartesian3.clone(ellipsoidGeometry._radii, scratchOptions.radii);
    result._ellipsoidGeometry = new EllipsoidOutlineGeometry.EllipsoidOutlineGeometry(scratchOptions);
    return result;
  };

  /**
   * Computes the geometric representation of an outline of a sphere, including its vertices, indices, and a bounding sphere.
   *
   * @param {SphereOutlineGeometry} sphereGeometry A description of the sphere outline.
   * @returns {Geometry|undefined} The computed vertices and indices.
   */
  SphereOutlineGeometry.createGeometry = function (sphereGeometry) {
    return EllipsoidOutlineGeometry.EllipsoidOutlineGeometry.createGeometry(
      sphereGeometry._ellipsoidGeometry
    );
  };

  function createSphereOutlineGeometry(sphereGeometry, offset) {
    if (defaultValue.defined(offset)) {
      sphereGeometry = SphereOutlineGeometry.unpack(sphereGeometry, offset);
    }
    return SphereOutlineGeometry.createGeometry(sphereGeometry);
  }

  return createSphereOutlineGeometry;

}));
