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

define(['./defaultValue-81eec7ed', './Transforms-f0a54c7b', './Matrix2-d35cf4b5', './RuntimeError-8952249c', './ComponentDatatype-9e86ac8f', './GeometryAttribute-eeb38987', './GeometryAttributes-32b29525', './VertexFormat-7df34ea5', './_commonjsHelpers-3aae1032-26891ab7', './combine-3c023bda', './WebGLConstants-508b9636'], (function (defaultValue, Transforms, Matrix2, RuntimeError, ComponentDatatype, GeometryAttribute, GeometryAttributes, VertexFormat, _commonjsHelpers3aae1032, combine, WebGLConstants) { 'use strict';

  /**
   * Describes geometry representing a plane centered at the origin, with a unit width and length.
   *
   * @alias PlaneGeometry
   * @constructor
   *
   * @param {Object} [options] Object with the following properties:
   * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
   *
   * @example
   * const planeGeometry = new Cesium.PlaneGeometry({
   *   vertexFormat : Cesium.VertexFormat.POSITION_ONLY
   * });
   */
  function PlaneGeometry(options) {
    options = defaultValue.defaultValue(options, defaultValue.defaultValue.EMPTY_OBJECT);

    const vertexFormat = defaultValue.defaultValue(options.vertexFormat, VertexFormat.VertexFormat.DEFAULT);

    this._vertexFormat = vertexFormat;
    this._workerName = "createPlaneGeometry";
  }

  /**
   * The number of elements used to pack the object into an array.
   * @type {Number}
   */
  PlaneGeometry.packedLength = VertexFormat.VertexFormat.packedLength;

  /**
   * Stores the provided instance into the provided array.
   *
   * @param {PlaneGeometry} value The value to pack.
   * @param {Number[]} array The array to pack into.
   * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
   *
   * @returns {Number[]} The array that was packed into
   */
  PlaneGeometry.pack = function (value, array, startingIndex) {
    //>>includeStart('debug', pragmas.debug);
    RuntimeError.Check.typeOf.object("value", value);
    RuntimeError.Check.defined("array", array);
    //>>includeEnd('debug');

    startingIndex = defaultValue.defaultValue(startingIndex, 0);

    VertexFormat.VertexFormat.pack(value._vertexFormat, array, startingIndex);

    return array;
  };

  const scratchVertexFormat = new VertexFormat.VertexFormat();
  const scratchOptions = {
    vertexFormat: scratchVertexFormat,
  };

  /**
   * Retrieves an instance from a packed array.
   *
   * @param {Number[]} array The packed array.
   * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
   * @param {PlaneGeometry} [result] The object into which to store the result.
   * @returns {PlaneGeometry} The modified result parameter or a new PlaneGeometry instance if one was not provided.
   */
  PlaneGeometry.unpack = function (array, startingIndex, result) {
    //>>includeStart('debug', pragmas.debug);
    RuntimeError.Check.defined("array", array);
    //>>includeEnd('debug');

    startingIndex = defaultValue.defaultValue(startingIndex, 0);

    const vertexFormat = VertexFormat.VertexFormat.unpack(
      array,
      startingIndex,
      scratchVertexFormat
    );

    if (!defaultValue.defined(result)) {
      return new PlaneGeometry(scratchOptions);
    }

    result._vertexFormat = VertexFormat.VertexFormat.clone(vertexFormat, result._vertexFormat);

    return result;
  };

  const min = new Matrix2.Cartesian3(-0.5, -0.5, 0.0);
  const max = new Matrix2.Cartesian3(0.5, 0.5, 0.0);

  /**
   * Computes the geometric representation of a plane, including its vertices, indices, and a bounding sphere.
   *
   * @param {PlaneGeometry} planeGeometry A description of the plane.
   * @returns {Geometry|undefined} The computed vertices and indices.
   */
  PlaneGeometry.createGeometry = function (planeGeometry) {
    const vertexFormat = planeGeometry._vertexFormat;

    const attributes = new GeometryAttributes.GeometryAttributes();
    let indices;
    let positions;

    if (vertexFormat.position) {
      // 4 corner points.  Duplicated 3 times each for each incident edge/face.
      positions = new Float64Array(4 * 3);

      // +z face
      positions[0] = min.x;
      positions[1] = min.y;
      positions[2] = 0.0;
      positions[3] = max.x;
      positions[4] = min.y;
      positions[5] = 0.0;
      positions[6] = max.x;
      positions[7] = max.y;
      positions[8] = 0.0;
      positions[9] = min.x;
      positions[10] = max.y;
      positions[11] = 0.0;

      attributes.position = new GeometryAttribute.GeometryAttribute({
        componentDatatype: ComponentDatatype.ComponentDatatype.DOUBLE,
        componentsPerAttribute: 3,
        values: positions,
      });

      if (vertexFormat.normal) {
        const normals = new Float32Array(4 * 3);

        // +z face
        normals[0] = 0.0;
        normals[1] = 0.0;
        normals[2] = 1.0;
        normals[3] = 0.0;
        normals[4] = 0.0;
        normals[5] = 1.0;
        normals[6] = 0.0;
        normals[7] = 0.0;
        normals[8] = 1.0;
        normals[9] = 0.0;
        normals[10] = 0.0;
        normals[11] = 1.0;

        attributes.normal = new GeometryAttribute.GeometryAttribute({
          componentDatatype: ComponentDatatype.ComponentDatatype.FLOAT,
          componentsPerAttribute: 3,
          values: normals,
        });
      }

      if (vertexFormat.st) {
        const texCoords = new Float32Array(4 * 2);

        // +z face
        texCoords[0] = 0.0;
        texCoords[1] = 0.0;
        texCoords[2] = 1.0;
        texCoords[3] = 0.0;
        texCoords[4] = 1.0;
        texCoords[5] = 1.0;
        texCoords[6] = 0.0;
        texCoords[7] = 1.0;

        attributes.st = new GeometryAttribute.GeometryAttribute({
          componentDatatype: ComponentDatatype.ComponentDatatype.FLOAT,
          componentsPerAttribute: 2,
          values: texCoords,
        });
      }

      if (vertexFormat.tangent) {
        const tangents = new Float32Array(4 * 3);

        // +z face
        tangents[0] = 1.0;
        tangents[1] = 0.0;
        tangents[2] = 0.0;
        tangents[3] = 1.0;
        tangents[4] = 0.0;
        tangents[5] = 0.0;
        tangents[6] = 1.0;
        tangents[7] = 0.0;
        tangents[8] = 0.0;
        tangents[9] = 1.0;
        tangents[10] = 0.0;
        tangents[11] = 0.0;

        attributes.tangent = new GeometryAttribute.GeometryAttribute({
          componentDatatype: ComponentDatatype.ComponentDatatype.FLOAT,
          componentsPerAttribute: 3,
          values: tangents,
        });
      }

      if (vertexFormat.bitangent) {
        const bitangents = new Float32Array(4 * 3);

        // +z face
        bitangents[0] = 0.0;
        bitangents[1] = 1.0;
        bitangents[2] = 0.0;
        bitangents[3] = 0.0;
        bitangents[4] = 1.0;
        bitangents[5] = 0.0;
        bitangents[6] = 0.0;
        bitangents[7] = 1.0;
        bitangents[8] = 0.0;
        bitangents[9] = 0.0;
        bitangents[10] = 1.0;
        bitangents[11] = 0.0;

        attributes.bitangent = new GeometryAttribute.GeometryAttribute({
          componentDatatype: ComponentDatatype.ComponentDatatype.FLOAT,
          componentsPerAttribute: 3,
          values: bitangents,
        });
      }

      // 2 triangles
      indices = new Uint16Array(2 * 3);

      // +z face
      indices[0] = 0;
      indices[1] = 1;
      indices[2] = 2;
      indices[3] = 0;
      indices[4] = 2;
      indices[5] = 3;
    }

    return new GeometryAttribute.Geometry({
      attributes: attributes,
      indices: indices,
      primitiveType: GeometryAttribute.PrimitiveType.TRIANGLES,
      boundingSphere: new Transforms.BoundingSphere(Matrix2.Cartesian3.ZERO, Math.sqrt(2.0)),
    });
  };

  function createPlaneGeometry(planeGeometry, offset) {
    if (defaultValue.defined(offset)) {
      planeGeometry = PlaneGeometry.unpack(planeGeometry, offset);
    }
    return PlaneGeometry.createGeometry(planeGeometry);
  }

  return createPlaneGeometry;

}));
//# sourceMappingURL=createPlaneGeometry.js.map
