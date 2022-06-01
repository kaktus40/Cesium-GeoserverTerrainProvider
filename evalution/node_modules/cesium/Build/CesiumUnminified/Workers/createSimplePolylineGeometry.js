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

define(['./defaultValue-81eec7ed', './Matrix2-d35cf4b5', './ArcType-fc72c06c', './Transforms-f0a54c7b', './Color-b81cce6d', './ComponentDatatype-9e86ac8f', './RuntimeError-8952249c', './GeometryAttribute-eeb38987', './GeometryAttributes-32b29525', './IndexDatatype-bed3935d', './PolylinePipeline-3b5d6486', './_commonjsHelpers-3aae1032-26891ab7', './combine-3c023bda', './WebGLConstants-508b9636', './EllipsoidGeodesic-924f7301', './EllipsoidRhumbLine-d049f903', './IntersectionTests-a25e058d', './Plane-24f22488'], (function (defaultValue, Matrix2, ArcType, Transforms, Color, ComponentDatatype, RuntimeError, GeometryAttribute, GeometryAttributes, IndexDatatype, PolylinePipeline, _commonjsHelpers3aae1032, combine, WebGLConstants, EllipsoidGeodesic, EllipsoidRhumbLine, IntersectionTests, Plane) { 'use strict';

  function interpolateColors(p0, p1, color0, color1, minDistance, array, offset) {
    const numPoints = PolylinePipeline.PolylinePipeline.numberOfPoints(p0, p1, minDistance);
    let i;

    const r0 = color0.red;
    const g0 = color0.green;
    const b0 = color0.blue;
    const a0 = color0.alpha;

    const r1 = color1.red;
    const g1 = color1.green;
    const b1 = color1.blue;
    const a1 = color1.alpha;

    if (Color.Color.equals(color0, color1)) {
      for (i = 0; i < numPoints; i++) {
        array[offset++] = Color.Color.floatToByte(r0);
        array[offset++] = Color.Color.floatToByte(g0);
        array[offset++] = Color.Color.floatToByte(b0);
        array[offset++] = Color.Color.floatToByte(a0);
      }
      return offset;
    }

    const redPerVertex = (r1 - r0) / numPoints;
    const greenPerVertex = (g1 - g0) / numPoints;
    const bluePerVertex = (b1 - b0) / numPoints;
    const alphaPerVertex = (a1 - a0) / numPoints;

    let index = offset;
    for (i = 0; i < numPoints; i++) {
      array[index++] = Color.Color.floatToByte(r0 + i * redPerVertex);
      array[index++] = Color.Color.floatToByte(g0 + i * greenPerVertex);
      array[index++] = Color.Color.floatToByte(b0 + i * bluePerVertex);
      array[index++] = Color.Color.floatToByte(a0 + i * alphaPerVertex);
    }

    return index;
  }

  /**
   * A description of a polyline modeled as a line strip; the first two positions define a line segment,
   * and each additional position defines a line segment from the previous position.
   *
   * @alias SimplePolylineGeometry
   * @constructor
   *
   * @param {Object} options Object with the following properties:
   * @param {Cartesian3[]} options.positions An array of {@link Cartesian3} defining the positions in the polyline as a line strip.
   * @param {Color[]} [options.colors] An Array of {@link Color} defining the per vertex or per segment colors.
   * @param {Boolean} [options.colorsPerVertex=false] A boolean that determines whether the colors will be flat across each segment of the line or interpolated across the vertices.
   * @param {ArcType} [options.arcType=ArcType.GEODESIC] The type of line the polyline segments must follow.
   * @param {Number} [options.granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude if options.arcType is not ArcType.NONE. Determines the number of positions in the buffer.
   * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid to be used as a reference.
   *
   * @exception {DeveloperError} At least two positions are required.
   * @exception {DeveloperError} colors has an invalid length.
   *
   * @see SimplePolylineGeometry#createGeometry
   *
   * @example
   * // A polyline with two connected line segments
   * const polyline = new Cesium.SimplePolylineGeometry({
   *   positions : Cesium.Cartesian3.fromDegreesArray([
   *     0.0, 0.0,
   *     5.0, 0.0,
   *     5.0, 5.0
   *   ])
   * });
   * const geometry = Cesium.SimplePolylineGeometry.createGeometry(polyline);
   */
  function SimplePolylineGeometry(options) {
    options = defaultValue.defaultValue(options, defaultValue.defaultValue.EMPTY_OBJECT);
    const positions = options.positions;
    const colors = options.colors;
    const colorsPerVertex = defaultValue.defaultValue(options.colorsPerVertex, false);

    //>>includeStart('debug', pragmas.debug);
    if (!defaultValue.defined(positions) || positions.length < 2) {
      throw new RuntimeError.DeveloperError("At least two positions are required.");
    }
    if (
      defaultValue.defined(colors) &&
      ((colorsPerVertex && colors.length < positions.length) ||
        (!colorsPerVertex && colors.length < positions.length - 1))
    ) {
      throw new RuntimeError.DeveloperError("colors has an invalid length.");
    }
    //>>includeEnd('debug');

    this._positions = positions;
    this._colors = colors;
    this._colorsPerVertex = colorsPerVertex;

    this._arcType = defaultValue.defaultValue(options.arcType, ArcType.ArcType.GEODESIC);
    this._granularity = defaultValue.defaultValue(
      options.granularity,
      ComponentDatatype.CesiumMath.RADIANS_PER_DEGREE
    );
    this._ellipsoid = defaultValue.defaultValue(options.ellipsoid, Matrix2.Ellipsoid.WGS84);
    this._workerName = "createSimplePolylineGeometry";

    let numComponents = 1 + positions.length * Matrix2.Cartesian3.packedLength;
    numComponents += defaultValue.defined(colors) ? 1 + colors.length * Color.Color.packedLength : 1;

    /**
     * The number of elements used to pack the object into an array.
     * @type {Number}
     */
    this.packedLength = numComponents + Matrix2.Ellipsoid.packedLength + 3;
  }

  /**
   * Stores the provided instance into the provided array.
   *
   * @param {SimplePolylineGeometry} value The value to pack.
   * @param {Number[]} array The array to pack into.
   * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
   *
   * @returns {Number[]} The array that was packed into
   */
  SimplePolylineGeometry.pack = function (value, array, startingIndex) {
    //>>includeStart('debug', pragmas.debug);
    if (!defaultValue.defined(value)) {
      throw new RuntimeError.DeveloperError("value is required");
    }
    if (!defaultValue.defined(array)) {
      throw new RuntimeError.DeveloperError("array is required");
    }
    //>>includeEnd('debug');

    startingIndex = defaultValue.defaultValue(startingIndex, 0);

    let i;

    const positions = value._positions;
    let length = positions.length;
    array[startingIndex++] = length;

    for (i = 0; i < length; ++i, startingIndex += Matrix2.Cartesian3.packedLength) {
      Matrix2.Cartesian3.pack(positions[i], array, startingIndex);
    }

    const colors = value._colors;
    length = defaultValue.defined(colors) ? colors.length : 0.0;
    array[startingIndex++] = length;

    for (i = 0; i < length; ++i, startingIndex += Color.Color.packedLength) {
      Color.Color.pack(colors[i], array, startingIndex);
    }

    Matrix2.Ellipsoid.pack(value._ellipsoid, array, startingIndex);
    startingIndex += Matrix2.Ellipsoid.packedLength;

    array[startingIndex++] = value._colorsPerVertex ? 1.0 : 0.0;
    array[startingIndex++] = value._arcType;
    array[startingIndex] = value._granularity;

    return array;
  };

  /**
   * Retrieves an instance from a packed array.
   *
   * @param {Number[]} array The packed array.
   * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
   * @param {SimplePolylineGeometry} [result] The object into which to store the result.
   * @returns {SimplePolylineGeometry} The modified result parameter or a new SimplePolylineGeometry instance if one was not provided.
   */
  SimplePolylineGeometry.unpack = function (array, startingIndex, result) {
    //>>includeStart('debug', pragmas.debug);
    if (!defaultValue.defined(array)) {
      throw new RuntimeError.DeveloperError("array is required");
    }
    //>>includeEnd('debug');

    startingIndex = defaultValue.defaultValue(startingIndex, 0);

    let i;

    let length = array[startingIndex++];
    const positions = new Array(length);

    for (i = 0; i < length; ++i, startingIndex += Matrix2.Cartesian3.packedLength) {
      positions[i] = Matrix2.Cartesian3.unpack(array, startingIndex);
    }

    length = array[startingIndex++];
    const colors = length > 0 ? new Array(length) : undefined;

    for (i = 0; i < length; ++i, startingIndex += Color.Color.packedLength) {
      colors[i] = Color.Color.unpack(array, startingIndex);
    }

    const ellipsoid = Matrix2.Ellipsoid.unpack(array, startingIndex);
    startingIndex += Matrix2.Ellipsoid.packedLength;

    const colorsPerVertex = array[startingIndex++] === 1.0;
    const arcType = array[startingIndex++];
    const granularity = array[startingIndex];

    if (!defaultValue.defined(result)) {
      return new SimplePolylineGeometry({
        positions: positions,
        colors: colors,
        ellipsoid: ellipsoid,
        colorsPerVertex: colorsPerVertex,
        arcType: arcType,
        granularity: granularity,
      });
    }

    result._positions = positions;
    result._colors = colors;
    result._ellipsoid = ellipsoid;
    result._colorsPerVertex = colorsPerVertex;
    result._arcType = arcType;
    result._granularity = granularity;

    return result;
  };

  const scratchArray1 = new Array(2);
  const scratchArray2 = new Array(2);
  const generateArcOptionsScratch = {
    positions: scratchArray1,
    height: scratchArray2,
    ellipsoid: undefined,
    minDistance: undefined,
    granularity: undefined,
  };

  /**
   * Computes the geometric representation of a simple polyline, including its vertices, indices, and a bounding sphere.
   *
   * @param {SimplePolylineGeometry} simplePolylineGeometry A description of the polyline.
   * @returns {Geometry|undefined} The computed vertices and indices.
   */
  SimplePolylineGeometry.createGeometry = function (simplePolylineGeometry) {
    const positions = simplePolylineGeometry._positions;
    const colors = simplePolylineGeometry._colors;
    const colorsPerVertex = simplePolylineGeometry._colorsPerVertex;
    const arcType = simplePolylineGeometry._arcType;
    const granularity = simplePolylineGeometry._granularity;
    const ellipsoid = simplePolylineGeometry._ellipsoid;

    const minDistance = ComponentDatatype.CesiumMath.chordLength(
      granularity,
      ellipsoid.maximumRadius
    );
    const perSegmentColors = defaultValue.defined(colors) && !colorsPerVertex;

    let i;
    const length = positions.length;

    let positionValues;
    let numberOfPositions;
    let colorValues;
    let color;
    let offset = 0;

    if (arcType === ArcType.ArcType.GEODESIC || arcType === ArcType.ArcType.RHUMB) {
      let subdivisionSize;
      let numberOfPointsFunction;
      let generateArcFunction;
      if (arcType === ArcType.ArcType.GEODESIC) {
        subdivisionSize = ComponentDatatype.CesiumMath.chordLength(
          granularity,
          ellipsoid.maximumRadius
        );
        numberOfPointsFunction = PolylinePipeline.PolylinePipeline.numberOfPoints;
        generateArcFunction = PolylinePipeline.PolylinePipeline.generateArc;
      } else {
        subdivisionSize = granularity;
        numberOfPointsFunction = PolylinePipeline.PolylinePipeline.numberOfPointsRhumbLine;
        generateArcFunction = PolylinePipeline.PolylinePipeline.generateRhumbArc;
      }

      const heights = PolylinePipeline.PolylinePipeline.extractHeights(positions, ellipsoid);

      const generateArcOptions = generateArcOptionsScratch;
      if (arcType === ArcType.ArcType.GEODESIC) {
        generateArcOptions.minDistance = minDistance;
      } else {
        generateArcOptions.granularity = granularity;
      }
      generateArcOptions.ellipsoid = ellipsoid;

      if (perSegmentColors) {
        let positionCount = 0;
        for (i = 0; i < length - 1; i++) {
          positionCount +=
            numberOfPointsFunction(
              positions[i],
              positions[i + 1],
              subdivisionSize
            ) + 1;
        }

        positionValues = new Float64Array(positionCount * 3);
        colorValues = new Uint8Array(positionCount * 4);

        generateArcOptions.positions = scratchArray1;
        generateArcOptions.height = scratchArray2;

        let ci = 0;
        for (i = 0; i < length - 1; ++i) {
          scratchArray1[0] = positions[i];
          scratchArray1[1] = positions[i + 1];

          scratchArray2[0] = heights[i];
          scratchArray2[1] = heights[i + 1];

          const pos = generateArcFunction(generateArcOptions);

          if (defaultValue.defined(colors)) {
            const segLen = pos.length / 3;
            color = colors[i];
            for (let k = 0; k < segLen; ++k) {
              colorValues[ci++] = Color.Color.floatToByte(color.red);
              colorValues[ci++] = Color.Color.floatToByte(color.green);
              colorValues[ci++] = Color.Color.floatToByte(color.blue);
              colorValues[ci++] = Color.Color.floatToByte(color.alpha);
            }
          }

          positionValues.set(pos, offset);
          offset += pos.length;
        }
      } else {
        generateArcOptions.positions = positions;
        generateArcOptions.height = heights;
        positionValues = new Float64Array(
          generateArcFunction(generateArcOptions)
        );

        if (defaultValue.defined(colors)) {
          colorValues = new Uint8Array((positionValues.length / 3) * 4);

          for (i = 0; i < length - 1; ++i) {
            const p0 = positions[i];
            const p1 = positions[i + 1];
            const c0 = colors[i];
            const c1 = colors[i + 1];
            offset = interpolateColors(
              p0,
              p1,
              c0,
              c1,
              minDistance,
              colorValues,
              offset
            );
          }

          const lastColor = colors[length - 1];
          colorValues[offset++] = Color.Color.floatToByte(lastColor.red);
          colorValues[offset++] = Color.Color.floatToByte(lastColor.green);
          colorValues[offset++] = Color.Color.floatToByte(lastColor.blue);
          colorValues[offset++] = Color.Color.floatToByte(lastColor.alpha);
        }
      }
    } else {
      numberOfPositions = perSegmentColors ? length * 2 - 2 : length;
      positionValues = new Float64Array(numberOfPositions * 3);
      colorValues = defaultValue.defined(colors)
        ? new Uint8Array(numberOfPositions * 4)
        : undefined;

      let positionIndex = 0;
      let colorIndex = 0;

      for (i = 0; i < length; ++i) {
        const p = positions[i];

        if (perSegmentColors && i > 0) {
          Matrix2.Cartesian3.pack(p, positionValues, positionIndex);
          positionIndex += 3;

          color = colors[i - 1];
          colorValues[colorIndex++] = Color.Color.floatToByte(color.red);
          colorValues[colorIndex++] = Color.Color.floatToByte(color.green);
          colorValues[colorIndex++] = Color.Color.floatToByte(color.blue);
          colorValues[colorIndex++] = Color.Color.floatToByte(color.alpha);
        }

        if (perSegmentColors && i === length - 1) {
          break;
        }

        Matrix2.Cartesian3.pack(p, positionValues, positionIndex);
        positionIndex += 3;

        if (defaultValue.defined(colors)) {
          color = colors[i];
          colorValues[colorIndex++] = Color.Color.floatToByte(color.red);
          colorValues[colorIndex++] = Color.Color.floatToByte(color.green);
          colorValues[colorIndex++] = Color.Color.floatToByte(color.blue);
          colorValues[colorIndex++] = Color.Color.floatToByte(color.alpha);
        }
      }
    }

    const attributes = new GeometryAttributes.GeometryAttributes();
    attributes.position = new GeometryAttribute.GeometryAttribute({
      componentDatatype: ComponentDatatype.ComponentDatatype.DOUBLE,
      componentsPerAttribute: 3,
      values: positionValues,
    });

    if (defaultValue.defined(colors)) {
      attributes.color = new GeometryAttribute.GeometryAttribute({
        componentDatatype: ComponentDatatype.ComponentDatatype.UNSIGNED_BYTE,
        componentsPerAttribute: 4,
        values: colorValues,
        normalize: true,
      });
    }

    numberOfPositions = positionValues.length / 3;
    const numberOfIndices = (numberOfPositions - 1) * 2;
    const indices = IndexDatatype.IndexDatatype.createTypedArray(
      numberOfPositions,
      numberOfIndices
    );

    let index = 0;
    for (i = 0; i < numberOfPositions - 1; ++i) {
      indices[index++] = i;
      indices[index++] = i + 1;
    }

    return new GeometryAttribute.Geometry({
      attributes: attributes,
      indices: indices,
      primitiveType: GeometryAttribute.PrimitiveType.LINES,
      boundingSphere: Transforms.BoundingSphere.fromPoints(positions),
    });
  };

  function createSimplePolylineGeometry(simplePolylineGeometry, offset) {
    if (defaultValue.defined(offset)) {
      simplePolylineGeometry = SimplePolylineGeometry.unpack(
        simplePolylineGeometry,
        offset
      );
    }
    simplePolylineGeometry._ellipsoid = Matrix2.Ellipsoid.clone(
      simplePolylineGeometry._ellipsoid
    );
    return SimplePolylineGeometry.createGeometry(simplePolylineGeometry);
  }

  return createSimplePolylineGeometry;

}));
//# sourceMappingURL=createSimplePolylineGeometry.js.map
