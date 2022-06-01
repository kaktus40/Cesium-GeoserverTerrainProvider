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

define(['./defaultValue-81eec7ed', './Matrix2-d35cf4b5', './GeometryOffsetAttribute-2bff0974', './Transforms-f0a54c7b', './ComponentDatatype-9e86ac8f', './RuntimeError-8952249c', './GeometryAttribute-eeb38987', './GeometryAttributes-32b29525', './IndexDatatype-bed3935d', './PolygonPipeline-a3c0d57c', './RectangleGeometryLibrary-b5624ac4', './_commonjsHelpers-3aae1032-26891ab7', './combine-3c023bda', './WebGLConstants-508b9636', './EllipsoidRhumbLine-d049f903'], (function (defaultValue, Matrix2, GeometryOffsetAttribute, Transforms, ComponentDatatype, RuntimeError, GeometryAttribute, GeometryAttributes, IndexDatatype, PolygonPipeline, RectangleGeometryLibrary, _commonjsHelpers3aae1032, combine, WebGLConstants, EllipsoidRhumbLine) { 'use strict';

  const bottomBoundingSphere = new Transforms.BoundingSphere();
  const topBoundingSphere = new Transforms.BoundingSphere();
  const positionScratch = new Matrix2.Cartesian3();
  const rectangleScratch = new Matrix2.Rectangle();

  function constructRectangle(geometry, computedOptions) {
    const ellipsoid = geometry._ellipsoid;
    const height = computedOptions.height;
    const width = computedOptions.width;
    const northCap = computedOptions.northCap;
    const southCap = computedOptions.southCap;

    let rowHeight = height;
    let widthMultiplier = 2;
    let size = 0;
    let corners = 4;
    if (northCap) {
      widthMultiplier -= 1;
      rowHeight -= 1;
      size += 1;
      corners -= 2;
    }
    if (southCap) {
      widthMultiplier -= 1;
      rowHeight -= 1;
      size += 1;
      corners -= 2;
    }
    size += widthMultiplier * width + 2 * rowHeight - corners;

    const positions = new Float64Array(size * 3);

    let posIndex = 0;
    let row = 0;
    let col;
    const position = positionScratch;
    if (northCap) {
      RectangleGeometryLibrary.RectangleGeometryLibrary.computePosition(
        computedOptions,
        ellipsoid,
        false,
        row,
        0,
        position
      );
      positions[posIndex++] = position.x;
      positions[posIndex++] = position.y;
      positions[posIndex++] = position.z;
    } else {
      for (col = 0; col < width; col++) {
        RectangleGeometryLibrary.RectangleGeometryLibrary.computePosition(
          computedOptions,
          ellipsoid,
          false,
          row,
          col,
          position
        );
        positions[posIndex++] = position.x;
        positions[posIndex++] = position.y;
        positions[posIndex++] = position.z;
      }
    }

    col = width - 1;
    for (row = 1; row < height; row++) {
      RectangleGeometryLibrary.RectangleGeometryLibrary.computePosition(
        computedOptions,
        ellipsoid,
        false,
        row,
        col,
        position
      );
      positions[posIndex++] = position.x;
      positions[posIndex++] = position.y;
      positions[posIndex++] = position.z;
    }

    row = height - 1;
    if (!southCap) {
      // if southCap is true, we dont need to add any more points because the south pole point was added by the iteration above
      for (col = width - 2; col >= 0; col--) {
        RectangleGeometryLibrary.RectangleGeometryLibrary.computePosition(
          computedOptions,
          ellipsoid,
          false,
          row,
          col,
          position
        );
        positions[posIndex++] = position.x;
        positions[posIndex++] = position.y;
        positions[posIndex++] = position.z;
      }
    }

    col = 0;
    for (row = height - 2; row > 0; row--) {
      RectangleGeometryLibrary.RectangleGeometryLibrary.computePosition(
        computedOptions,
        ellipsoid,
        false,
        row,
        col,
        position
      );
      positions[posIndex++] = position.x;
      positions[posIndex++] = position.y;
      positions[posIndex++] = position.z;
    }

    const indicesSize = (positions.length / 3) * 2;
    const indices = IndexDatatype.IndexDatatype.createTypedArray(
      positions.length / 3,
      indicesSize
    );

    let index = 0;
    for (let i = 0; i < positions.length / 3 - 1; i++) {
      indices[index++] = i;
      indices[index++] = i + 1;
    }
    indices[index++] = positions.length / 3 - 1;
    indices[index++] = 0;

    const geo = new GeometryAttribute.Geometry({
      attributes: new GeometryAttributes.GeometryAttributes(),
      primitiveType: GeometryAttribute.PrimitiveType.LINES,
    });

    geo.attributes.position = new GeometryAttribute.GeometryAttribute({
      componentDatatype: ComponentDatatype.ComponentDatatype.DOUBLE,
      componentsPerAttribute: 3,
      values: positions,
    });
    geo.indices = indices;

    return geo;
  }

  function constructExtrudedRectangle(rectangleGeometry, computedOptions) {
    const surfaceHeight = rectangleGeometry._surfaceHeight;
    const extrudedHeight = rectangleGeometry._extrudedHeight;
    const ellipsoid = rectangleGeometry._ellipsoid;
    const minHeight = extrudedHeight;
    const maxHeight = surfaceHeight;
    const geo = constructRectangle(rectangleGeometry, computedOptions);

    const height = computedOptions.height;
    const width = computedOptions.width;

    const topPositions = PolygonPipeline.PolygonPipeline.scaleToGeodeticHeight(
      geo.attributes.position.values,
      maxHeight,
      ellipsoid,
      false
    );
    let length = topPositions.length;
    const positions = new Float64Array(length * 2);
    positions.set(topPositions);
    const bottomPositions = PolygonPipeline.PolygonPipeline.scaleToGeodeticHeight(
      geo.attributes.position.values,
      minHeight,
      ellipsoid
    );
    positions.set(bottomPositions, length);
    geo.attributes.position.values = positions;

    const northCap = computedOptions.northCap;
    const southCap = computedOptions.southCap;
    let corners = 4;
    if (northCap) {
      corners -= 1;
    }
    if (southCap) {
      corners -= 1;
    }

    const indicesSize = (positions.length / 3 + corners) * 2;
    const indices = IndexDatatype.IndexDatatype.createTypedArray(
      positions.length / 3,
      indicesSize
    );
    length = positions.length / 6;
    let index = 0;
    for (let i = 0; i < length - 1; i++) {
      indices[index++] = i;
      indices[index++] = i + 1;
      indices[index++] = i + length;
      indices[index++] = i + length + 1;
    }
    indices[index++] = length - 1;
    indices[index++] = 0;
    indices[index++] = length + length - 1;
    indices[index++] = length;

    indices[index++] = 0;
    indices[index++] = length;

    let bottomCorner;
    if (northCap) {
      bottomCorner = height - 1;
    } else {
      const topRightCorner = width - 1;
      indices[index++] = topRightCorner;
      indices[index++] = topRightCorner + length;
      bottomCorner = width + height - 2;
    }

    indices[index++] = bottomCorner;
    indices[index++] = bottomCorner + length;

    if (!southCap) {
      const bottomLeftCorner = width + bottomCorner - 1;
      indices[index++] = bottomLeftCorner;
      indices[index] = bottomLeftCorner + length;
    }

    geo.indices = indices;

    return geo;
  }

  /**
   * A description of the outline of a a cartographic rectangle on an ellipsoid centered at the origin.
   *
   * @alias RectangleOutlineGeometry
   * @constructor
   *
   * @param {Object} options Object with the following properties:
   * @param {Rectangle} options.rectangle A cartographic rectangle with north, south, east and west properties in radians.
   * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid on which the rectangle lies.
   * @param {Number} [options.granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
   * @param {Number} [options.height=0.0] The distance in meters between the rectangle and the ellipsoid surface.
   * @param {Number} [options.rotation=0.0] The rotation of the rectangle, in radians. A positive rotation is counter-clockwise.
   * @param {Number} [options.extrudedHeight] The distance in meters between the rectangle's extruded face and the ellipsoid surface.
   *
   * @exception {DeveloperError} <code>options.rectangle.north</code> must be in the interval [<code>-Pi/2</code>, <code>Pi/2</code>].
   * @exception {DeveloperError} <code>options.rectangle.south</code> must be in the interval [<code>-Pi/2</code>, <code>Pi/2</code>].
   * @exception {DeveloperError} <code>options.rectangle.east</code> must be in the interval [<code>-Pi</code>, <code>Pi</code>].
   * @exception {DeveloperError} <code>options.rectangle.west</code> must be in the interval [<code>-Pi</code>, <code>Pi</code>].
   * @exception {DeveloperError} <code>options.rectangle.north</code> must be greater than <code>rectangle.south</code>.
   *
   * @see RectangleOutlineGeometry#createGeometry
   *
   * @example
   * const rectangle = new Cesium.RectangleOutlineGeometry({
   *   ellipsoid : Cesium.Ellipsoid.WGS84,
   *   rectangle : Cesium.Rectangle.fromDegrees(-80.0, 39.0, -74.0, 42.0),
   *   height : 10000.0
   * });
   * const geometry = Cesium.RectangleOutlineGeometry.createGeometry(rectangle);
   */
  function RectangleOutlineGeometry(options) {
    options = defaultValue.defaultValue(options, defaultValue.defaultValue.EMPTY_OBJECT);

    const rectangle = options.rectangle;
    const granularity = defaultValue.defaultValue(
      options.granularity,
      ComponentDatatype.CesiumMath.RADIANS_PER_DEGREE
    );
    const ellipsoid = defaultValue.defaultValue(options.ellipsoid, Matrix2.Ellipsoid.WGS84);
    const rotation = defaultValue.defaultValue(options.rotation, 0.0);

    //>>includeStart('debug', pragmas.debug);
    if (!defaultValue.defined(rectangle)) {
      throw new RuntimeError.DeveloperError("rectangle is required.");
    }
    Matrix2.Rectangle.validate(rectangle);
    if (rectangle.north < rectangle.south) {
      throw new RuntimeError.DeveloperError(
        "options.rectangle.north must be greater than options.rectangle.south"
      );
    }
    //>>includeEnd('debug');

    const height = defaultValue.defaultValue(options.height, 0.0);
    const extrudedHeight = defaultValue.defaultValue(options.extrudedHeight, height);

    this._rectangle = Matrix2.Rectangle.clone(rectangle);
    this._granularity = granularity;
    this._ellipsoid = ellipsoid;
    this._surfaceHeight = Math.max(height, extrudedHeight);
    this._rotation = rotation;
    this._extrudedHeight = Math.min(height, extrudedHeight);
    this._offsetAttribute = options.offsetAttribute;
    this._workerName = "createRectangleOutlineGeometry";
  }

  /**
   * The number of elements used to pack the object into an array.
   * @type {Number}
   */
  RectangleOutlineGeometry.packedLength =
    Matrix2.Rectangle.packedLength + Matrix2.Ellipsoid.packedLength + 5;

  /**
   * Stores the provided instance into the provided array.
   *
   * @param {RectangleOutlineGeometry} value The value to pack.
   * @param {Number[]} array The array to pack into.
   * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
   *
   * @returns {Number[]} The array that was packed into
   */
  RectangleOutlineGeometry.pack = function (value, array, startingIndex) {
    //>>includeStart('debug', pragmas.debug);
    if (!defaultValue.defined(value)) {
      throw new RuntimeError.DeveloperError("value is required");
    }

    if (!defaultValue.defined(array)) {
      throw new RuntimeError.DeveloperError("array is required");
    }
    //>>includeEnd('debug');

    startingIndex = defaultValue.defaultValue(startingIndex, 0);

    Matrix2.Rectangle.pack(value._rectangle, array, startingIndex);
    startingIndex += Matrix2.Rectangle.packedLength;

    Matrix2.Ellipsoid.pack(value._ellipsoid, array, startingIndex);
    startingIndex += Matrix2.Ellipsoid.packedLength;

    array[startingIndex++] = value._granularity;
    array[startingIndex++] = value._surfaceHeight;
    array[startingIndex++] = value._rotation;
    array[startingIndex++] = value._extrudedHeight;
    array[startingIndex] = defaultValue.defaultValue(value._offsetAttribute, -1);

    return array;
  };

  const scratchRectangle = new Matrix2.Rectangle();
  const scratchEllipsoid = Matrix2.Ellipsoid.clone(Matrix2.Ellipsoid.UNIT_SPHERE);
  const scratchOptions = {
    rectangle: scratchRectangle,
    ellipsoid: scratchEllipsoid,
    granularity: undefined,
    height: undefined,
    rotation: undefined,
    extrudedHeight: undefined,
    offsetAttribute: undefined,
  };

  /**
   * Retrieves an instance from a packed array.
   *
   * @param {Number[]} array The packed array.
   * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
   * @param {RectangleOutlineGeometry} [result] The object into which to store the result.
   * @returns {RectangleOutlineGeometry} The modified result parameter or a new Quaternion instance if one was not provided.
   */
  RectangleOutlineGeometry.unpack = function (array, startingIndex, result) {
    //>>includeStart('debug', pragmas.debug);
    if (!defaultValue.defined(array)) {
      throw new RuntimeError.DeveloperError("array is required");
    }
    //>>includeEnd('debug');

    startingIndex = defaultValue.defaultValue(startingIndex, 0);

    const rectangle = Matrix2.Rectangle.unpack(array, startingIndex, scratchRectangle);
    startingIndex += Matrix2.Rectangle.packedLength;

    const ellipsoid = Matrix2.Ellipsoid.unpack(array, startingIndex, scratchEllipsoid);
    startingIndex += Matrix2.Ellipsoid.packedLength;

    const granularity = array[startingIndex++];
    const height = array[startingIndex++];
    const rotation = array[startingIndex++];
    const extrudedHeight = array[startingIndex++];
    const offsetAttribute = array[startingIndex];

    if (!defaultValue.defined(result)) {
      scratchOptions.granularity = granularity;
      scratchOptions.height = height;
      scratchOptions.rotation = rotation;
      scratchOptions.extrudedHeight = extrudedHeight;
      scratchOptions.offsetAttribute =
        offsetAttribute === -1 ? undefined : offsetAttribute;

      return new RectangleOutlineGeometry(scratchOptions);
    }

    result._rectangle = Matrix2.Rectangle.clone(rectangle, result._rectangle);
    result._ellipsoid = Matrix2.Ellipsoid.clone(ellipsoid, result._ellipsoid);
    result._surfaceHeight = height;
    result._rotation = rotation;
    result._extrudedHeight = extrudedHeight;
    result._offsetAttribute =
      offsetAttribute === -1 ? undefined : offsetAttribute;

    return result;
  };

  const nwScratch = new Matrix2.Cartographic();
  /**
   * Computes the geometric representation of an outline of a rectangle, including its vertices, indices, and a bounding sphere.
   *
   * @param {RectangleOutlineGeometry} rectangleGeometry A description of the rectangle outline.
   * @returns {Geometry|undefined} The computed vertices and indices.
   *
   * @exception {DeveloperError} Rotated rectangle is invalid.
   */
  RectangleOutlineGeometry.createGeometry = function (rectangleGeometry) {
    const rectangle = rectangleGeometry._rectangle;
    const ellipsoid = rectangleGeometry._ellipsoid;
    const computedOptions = RectangleGeometryLibrary.RectangleGeometryLibrary.computeOptions(
      rectangle,
      rectangleGeometry._granularity,
      rectangleGeometry._rotation,
      0,
      rectangleScratch,
      nwScratch
    );

    let geometry;
    let boundingSphere;

    if (
      ComponentDatatype.CesiumMath.equalsEpsilon(
        rectangle.north,
        rectangle.south,
        ComponentDatatype.CesiumMath.EPSILON10
      ) ||
      ComponentDatatype.CesiumMath.equalsEpsilon(
        rectangle.east,
        rectangle.west,
        ComponentDatatype.CesiumMath.EPSILON10
      )
    ) {
      return undefined;
    }

    const surfaceHeight = rectangleGeometry._surfaceHeight;
    const extrudedHeight = rectangleGeometry._extrudedHeight;
    const extrude = !ComponentDatatype.CesiumMath.equalsEpsilon(
      surfaceHeight,
      extrudedHeight,
      0,
      ComponentDatatype.CesiumMath.EPSILON2
    );
    let offsetValue;
    if (extrude) {
      geometry = constructExtrudedRectangle(rectangleGeometry, computedOptions);
      if (defaultValue.defined(rectangleGeometry._offsetAttribute)) {
        const size = geometry.attributes.position.values.length / 3;
        let offsetAttribute = new Uint8Array(size);
        if (rectangleGeometry._offsetAttribute === GeometryOffsetAttribute.GeometryOffsetAttribute.TOP) {
          offsetAttribute = GeometryOffsetAttribute.arrayFill(offsetAttribute, 1, 0, size / 2);
        } else {
          offsetValue =
            rectangleGeometry._offsetAttribute === GeometryOffsetAttribute.GeometryOffsetAttribute.NONE
              ? 0
              : 1;
          offsetAttribute = GeometryOffsetAttribute.arrayFill(offsetAttribute, offsetValue);
        }

        geometry.attributes.applyOffset = new GeometryAttribute.GeometryAttribute({
          componentDatatype: ComponentDatatype.ComponentDatatype.UNSIGNED_BYTE,
          componentsPerAttribute: 1,
          values: offsetAttribute,
        });
      }
      const topBS = Transforms.BoundingSphere.fromRectangle3D(
        rectangle,
        ellipsoid,
        surfaceHeight,
        topBoundingSphere
      );
      const bottomBS = Transforms.BoundingSphere.fromRectangle3D(
        rectangle,
        ellipsoid,
        extrudedHeight,
        bottomBoundingSphere
      );
      boundingSphere = Transforms.BoundingSphere.union(topBS, bottomBS);
    } else {
      geometry = constructRectangle(rectangleGeometry, computedOptions);
      geometry.attributes.position.values = PolygonPipeline.PolygonPipeline.scaleToGeodeticHeight(
        geometry.attributes.position.values,
        surfaceHeight,
        ellipsoid,
        false
      );

      if (defaultValue.defined(rectangleGeometry._offsetAttribute)) {
        const length = geometry.attributes.position.values.length;
        const applyOffset = new Uint8Array(length / 3);
        offsetValue =
          rectangleGeometry._offsetAttribute === GeometryOffsetAttribute.GeometryOffsetAttribute.NONE
            ? 0
            : 1;
        GeometryOffsetAttribute.arrayFill(applyOffset, offsetValue);
        geometry.attributes.applyOffset = new GeometryAttribute.GeometryAttribute({
          componentDatatype: ComponentDatatype.ComponentDatatype.UNSIGNED_BYTE,
          componentsPerAttribute: 1,
          values: applyOffset,
        });
      }

      boundingSphere = Transforms.BoundingSphere.fromRectangle3D(
        rectangle,
        ellipsoid,
        surfaceHeight
      );
    }

    return new GeometryAttribute.Geometry({
      attributes: geometry.attributes,
      indices: geometry.indices,
      primitiveType: GeometryAttribute.PrimitiveType.LINES,
      boundingSphere: boundingSphere,
      offsetAttribute: rectangleGeometry._offsetAttribute,
    });
  };

  function createRectangleOutlineGeometry(rectangleGeometry, offset) {
    if (defaultValue.defined(offset)) {
      rectangleGeometry = RectangleOutlineGeometry.unpack(
        rectangleGeometry,
        offset
      );
    }
    rectangleGeometry._ellipsoid = Matrix2.Ellipsoid.clone(rectangleGeometry._ellipsoid);
    rectangleGeometry._rectangle = Matrix2.Rectangle.clone(rectangleGeometry._rectangle);
    return RectangleOutlineGeometry.createGeometry(rectangleGeometry);
  }

  return createRectangleOutlineGeometry;

}));
//# sourceMappingURL=createRectangleOutlineGeometry.js.map
