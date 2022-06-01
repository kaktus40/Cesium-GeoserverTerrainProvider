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

define(['./defaultValue-81eec7ed', './Matrix2-d35cf4b5', './ArcType-fc72c06c', './GeometryOffsetAttribute-2bff0974', './BoundingRectangle-4293898d', './Transforms-f0a54c7b', './RuntimeError-8952249c', './ComponentDatatype-9e86ac8f', './EllipsoidGeodesic-924f7301', './EllipsoidTangentPlane-2abe082d', './GeometryAttribute-eeb38987', './GeometryInstance-d60d0ef4', './GeometryPipeline-55e02a41', './IndexDatatype-bed3935d', './PolygonGeometryLibrary-6e68e6b6', './PolygonPipeline-a3c0d57c', './VertexFormat-7df34ea5', './_commonjsHelpers-3aae1032-26891ab7', './combine-3c023bda', './WebGLConstants-508b9636', './AxisAlignedBoundingBox-7b93960a', './IntersectionTests-a25e058d', './Plane-24f22488', './AttributeCompression-d0b97a83', './EncodedCartesian3-530d5328', './arrayRemoveDuplicates-1a15bd09', './EllipsoidRhumbLine-d049f903', './GeometryAttributes-32b29525'], (function (defaultValue, Matrix2, ArcType, GeometryOffsetAttribute, BoundingRectangle, Transforms, RuntimeError, ComponentDatatype, EllipsoidGeodesic, EllipsoidTangentPlane, GeometryAttribute, GeometryInstance, GeometryPipeline, IndexDatatype, PolygonGeometryLibrary, PolygonPipeline, VertexFormat, _commonjsHelpers3aae1032, combine, WebGLConstants, AxisAlignedBoundingBox, IntersectionTests, Plane, AttributeCompression, EncodedCartesian3, arrayRemoveDuplicates, EllipsoidRhumbLine, GeometryAttributes) { 'use strict';

  const scratchCarto1 = new Matrix2.Cartographic();
  const scratchCarto2 = new Matrix2.Cartographic();
  function adjustPosHeightsForNormal(position, p1, p2, ellipsoid) {
    const carto1 = ellipsoid.cartesianToCartographic(position, scratchCarto1);
    const height = carto1.height;
    const p1Carto = ellipsoid.cartesianToCartographic(p1, scratchCarto2);
    p1Carto.height = height;
    ellipsoid.cartographicToCartesian(p1Carto, p1);

    const p2Carto = ellipsoid.cartesianToCartographic(p2, scratchCarto2);
    p2Carto.height = height - 100;
    ellipsoid.cartographicToCartesian(p2Carto, p2);
  }

  const scratchBoundingRectangle = new BoundingRectangle.BoundingRectangle();
  const scratchPosition = new Matrix2.Cartesian3();
  const scratchNormal = new Matrix2.Cartesian3();
  const scratchTangent = new Matrix2.Cartesian3();
  const scratchBitangent = new Matrix2.Cartesian3();
  const p1Scratch = new Matrix2.Cartesian3();
  const p2Scratch = new Matrix2.Cartesian3();
  let scratchPerPosNormal = new Matrix2.Cartesian3();
  let scratchPerPosTangent = new Matrix2.Cartesian3();
  let scratchPerPosBitangent = new Matrix2.Cartesian3();

  const appendTextureCoordinatesOrigin = new Matrix2.Cartesian2();
  const appendTextureCoordinatesCartesian2 = new Matrix2.Cartesian2();
  const appendTextureCoordinatesCartesian3 = new Matrix2.Cartesian3();
  const appendTextureCoordinatesQuaternion = new Transforms.Quaternion();
  const appendTextureCoordinatesMatrix3 = new Matrix2.Matrix3();
  const tangentMatrixScratch = new Matrix2.Matrix3();

  function computeAttributes(options) {
    const vertexFormat = options.vertexFormat;
    const geometry = options.geometry;
    const shadowVolume = options.shadowVolume;
    const flatPositions = geometry.attributes.position.values;
    let length = flatPositions.length;
    const wall = options.wall;
    const top = options.top || wall;
    const bottom = options.bottom || wall;
    if (
      vertexFormat.st ||
      vertexFormat.normal ||
      vertexFormat.tangent ||
      vertexFormat.bitangent ||
      shadowVolume
    ) {
      // PERFORMANCE_IDEA: Compute before subdivision, then just interpolate during subdivision.
      // PERFORMANCE_IDEA: Compute with createGeometryFromPositions() for fast path when there's no holes.
      const boundingRectangle = options.boundingRectangle;
      const tangentPlane = options.tangentPlane;
      const ellipsoid = options.ellipsoid;
      const stRotation = options.stRotation;
      const perPositionHeight = options.perPositionHeight;

      const origin = appendTextureCoordinatesOrigin;
      origin.x = boundingRectangle.x;
      origin.y = boundingRectangle.y;

      const textureCoordinates = vertexFormat.st
        ? new Float32Array(2 * (length / 3))
        : undefined;
      let normals;
      if (vertexFormat.normal) {
        if (perPositionHeight && top && !wall) {
          normals = geometry.attributes.normal.values;
        } else {
          normals = new Float32Array(length);
        }
      }
      const tangents = vertexFormat.tangent
        ? new Float32Array(length)
        : undefined;
      const bitangents = vertexFormat.bitangent
        ? new Float32Array(length)
        : undefined;
      const extrudeNormals = shadowVolume ? new Float32Array(length) : undefined;

      let textureCoordIndex = 0;
      let attrIndex = 0;

      let normal = scratchNormal;
      let tangent = scratchTangent;
      let bitangent = scratchBitangent;
      let recomputeNormal = true;

      let textureMatrix = appendTextureCoordinatesMatrix3;
      let tangentRotationMatrix = tangentMatrixScratch;
      if (stRotation !== 0.0) {
        let rotation = Transforms.Quaternion.fromAxisAngle(
          tangentPlane._plane.normal,
          stRotation,
          appendTextureCoordinatesQuaternion
        );
        textureMatrix = Matrix2.Matrix3.fromQuaternion(rotation, textureMatrix);

        rotation = Transforms.Quaternion.fromAxisAngle(
          tangentPlane._plane.normal,
          -stRotation,
          appendTextureCoordinatesQuaternion
        );
        tangentRotationMatrix = Matrix2.Matrix3.fromQuaternion(
          rotation,
          tangentRotationMatrix
        );
      } else {
        textureMatrix = Matrix2.Matrix3.clone(Matrix2.Matrix3.IDENTITY, textureMatrix);
        tangentRotationMatrix = Matrix2.Matrix3.clone(
          Matrix2.Matrix3.IDENTITY,
          tangentRotationMatrix
        );
      }

      let bottomOffset = 0;
      let bottomOffset2 = 0;

      if (top && bottom) {
        bottomOffset = length / 2;
        bottomOffset2 = length / 3;

        length /= 2;
      }

      for (let i = 0; i < length; i += 3) {
        const position = Matrix2.Cartesian3.fromArray(
          flatPositions,
          i,
          appendTextureCoordinatesCartesian3
        );

        if (vertexFormat.st) {
          let p = Matrix2.Matrix3.multiplyByVector(
            textureMatrix,
            position,
            scratchPosition
          );
          p = ellipsoid.scaleToGeodeticSurface(p, p);
          const st = tangentPlane.projectPointOntoPlane(
            p,
            appendTextureCoordinatesCartesian2
          );
          Matrix2.Cartesian2.subtract(st, origin, st);

          const stx = ComponentDatatype.CesiumMath.clamp(st.x / boundingRectangle.width, 0, 1);
          const sty = ComponentDatatype.CesiumMath.clamp(st.y / boundingRectangle.height, 0, 1);
          if (bottom) {
            textureCoordinates[textureCoordIndex + bottomOffset2] = stx;
            textureCoordinates[textureCoordIndex + 1 + bottomOffset2] = sty;
          }
          if (top) {
            textureCoordinates[textureCoordIndex] = stx;
            textureCoordinates[textureCoordIndex + 1] = sty;
          }

          textureCoordIndex += 2;
        }

        if (
          vertexFormat.normal ||
          vertexFormat.tangent ||
          vertexFormat.bitangent ||
          shadowVolume
        ) {
          const attrIndex1 = attrIndex + 1;
          const attrIndex2 = attrIndex + 2;

          if (wall) {
            if (i + 3 < length) {
              const p1 = Matrix2.Cartesian3.fromArray(flatPositions, i + 3, p1Scratch);

              if (recomputeNormal) {
                const p2 = Matrix2.Cartesian3.fromArray(
                  flatPositions,
                  i + length,
                  p2Scratch
                );
                if (perPositionHeight) {
                  adjustPosHeightsForNormal(position, p1, p2, ellipsoid);
                }
                Matrix2.Cartesian3.subtract(p1, position, p1);
                Matrix2.Cartesian3.subtract(p2, position, p2);
                normal = Matrix2.Cartesian3.normalize(
                  Matrix2.Cartesian3.cross(p2, p1, normal),
                  normal
                );
                recomputeNormal = false;
              }

              if (Matrix2.Cartesian3.equalsEpsilon(p1, position, ComponentDatatype.CesiumMath.EPSILON10)) {
                // if we've reached a corner
                recomputeNormal = true;
              }
            }

            if (vertexFormat.tangent || vertexFormat.bitangent) {
              bitangent = ellipsoid.geodeticSurfaceNormal(position, bitangent);
              if (vertexFormat.tangent) {
                tangent = Matrix2.Cartesian3.normalize(
                  Matrix2.Cartesian3.cross(bitangent, normal, tangent),
                  tangent
                );
              }
            }
          } else {
            normal = ellipsoid.geodeticSurfaceNormal(position, normal);
            if (vertexFormat.tangent || vertexFormat.bitangent) {
              if (perPositionHeight) {
                scratchPerPosNormal = Matrix2.Cartesian3.fromArray(
                  normals,
                  attrIndex,
                  scratchPerPosNormal
                );
                scratchPerPosTangent = Matrix2.Cartesian3.cross(
                  Matrix2.Cartesian3.UNIT_Z,
                  scratchPerPosNormal,
                  scratchPerPosTangent
                );
                scratchPerPosTangent = Matrix2.Cartesian3.normalize(
                  Matrix2.Matrix3.multiplyByVector(
                    tangentRotationMatrix,
                    scratchPerPosTangent,
                    scratchPerPosTangent
                  ),
                  scratchPerPosTangent
                );
                if (vertexFormat.bitangent) {
                  scratchPerPosBitangent = Matrix2.Cartesian3.normalize(
                    Matrix2.Cartesian3.cross(
                      scratchPerPosNormal,
                      scratchPerPosTangent,
                      scratchPerPosBitangent
                    ),
                    scratchPerPosBitangent
                  );
                }
              }

              tangent = Matrix2.Cartesian3.cross(Matrix2.Cartesian3.UNIT_Z, normal, tangent);
              tangent = Matrix2.Cartesian3.normalize(
                Matrix2.Matrix3.multiplyByVector(tangentRotationMatrix, tangent, tangent),
                tangent
              );
              if (vertexFormat.bitangent) {
                bitangent = Matrix2.Cartesian3.normalize(
                  Matrix2.Cartesian3.cross(normal, tangent, bitangent),
                  bitangent
                );
              }
            }
          }

          if (vertexFormat.normal) {
            if (options.wall) {
              normals[attrIndex + bottomOffset] = normal.x;
              normals[attrIndex1 + bottomOffset] = normal.y;
              normals[attrIndex2 + bottomOffset] = normal.z;
            } else if (bottom) {
              normals[attrIndex + bottomOffset] = -normal.x;
              normals[attrIndex1 + bottomOffset] = -normal.y;
              normals[attrIndex2 + bottomOffset] = -normal.z;
            }

            if ((top && !perPositionHeight) || wall) {
              normals[attrIndex] = normal.x;
              normals[attrIndex1] = normal.y;
              normals[attrIndex2] = normal.z;
            }
          }

          if (shadowVolume) {
            if (wall) {
              normal = ellipsoid.geodeticSurfaceNormal(position, normal);
            }
            extrudeNormals[attrIndex + bottomOffset] = -normal.x;
            extrudeNormals[attrIndex1 + bottomOffset] = -normal.y;
            extrudeNormals[attrIndex2 + bottomOffset] = -normal.z;
          }

          if (vertexFormat.tangent) {
            if (options.wall) {
              tangents[attrIndex + bottomOffset] = tangent.x;
              tangents[attrIndex1 + bottomOffset] = tangent.y;
              tangents[attrIndex2 + bottomOffset] = tangent.z;
            } else if (bottom) {
              tangents[attrIndex + bottomOffset] = -tangent.x;
              tangents[attrIndex1 + bottomOffset] = -tangent.y;
              tangents[attrIndex2 + bottomOffset] = -tangent.z;
            }

            if (top) {
              if (perPositionHeight) {
                tangents[attrIndex] = scratchPerPosTangent.x;
                tangents[attrIndex1] = scratchPerPosTangent.y;
                tangents[attrIndex2] = scratchPerPosTangent.z;
              } else {
                tangents[attrIndex] = tangent.x;
                tangents[attrIndex1] = tangent.y;
                tangents[attrIndex2] = tangent.z;
              }
            }
          }

          if (vertexFormat.bitangent) {
            if (bottom) {
              bitangents[attrIndex + bottomOffset] = bitangent.x;
              bitangents[attrIndex1 + bottomOffset] = bitangent.y;
              bitangents[attrIndex2 + bottomOffset] = bitangent.z;
            }
            if (top) {
              if (perPositionHeight) {
                bitangents[attrIndex] = scratchPerPosBitangent.x;
                bitangents[attrIndex1] = scratchPerPosBitangent.y;
                bitangents[attrIndex2] = scratchPerPosBitangent.z;
              } else {
                bitangents[attrIndex] = bitangent.x;
                bitangents[attrIndex1] = bitangent.y;
                bitangents[attrIndex2] = bitangent.z;
              }
            }
          }
          attrIndex += 3;
        }
      }

      if (vertexFormat.st) {
        geometry.attributes.st = new GeometryAttribute.GeometryAttribute({
          componentDatatype: ComponentDatatype.ComponentDatatype.FLOAT,
          componentsPerAttribute: 2,
          values: textureCoordinates,
        });
      }

      if (vertexFormat.normal) {
        geometry.attributes.normal = new GeometryAttribute.GeometryAttribute({
          componentDatatype: ComponentDatatype.ComponentDatatype.FLOAT,
          componentsPerAttribute: 3,
          values: normals,
        });
      }

      if (vertexFormat.tangent) {
        geometry.attributes.tangent = new GeometryAttribute.GeometryAttribute({
          componentDatatype: ComponentDatatype.ComponentDatatype.FLOAT,
          componentsPerAttribute: 3,
          values: tangents,
        });
      }

      if (vertexFormat.bitangent) {
        geometry.attributes.bitangent = new GeometryAttribute.GeometryAttribute({
          componentDatatype: ComponentDatatype.ComponentDatatype.FLOAT,
          componentsPerAttribute: 3,
          values: bitangents,
        });
      }

      if (shadowVolume) {
        geometry.attributes.extrudeDirection = new GeometryAttribute.GeometryAttribute({
          componentDatatype: ComponentDatatype.ComponentDatatype.FLOAT,
          componentsPerAttribute: 3,
          values: extrudeNormals,
        });
      }
    }

    if (options.extrude && defaultValue.defined(options.offsetAttribute)) {
      const size = flatPositions.length / 3;
      let offsetAttribute = new Uint8Array(size);

      if (options.offsetAttribute === GeometryOffsetAttribute.GeometryOffsetAttribute.TOP) {
        if ((top && bottom) || wall) {
          offsetAttribute = GeometryOffsetAttribute.arrayFill(offsetAttribute, 1, 0, size / 2);
        } else if (top) {
          offsetAttribute = GeometryOffsetAttribute.arrayFill(offsetAttribute, 1);
        }
      } else {
        const offsetValue =
          options.offsetAttribute === GeometryOffsetAttribute.GeometryOffsetAttribute.NONE ? 0 : 1;
        offsetAttribute = GeometryOffsetAttribute.arrayFill(offsetAttribute, offsetValue);
      }

      geometry.attributes.applyOffset = new GeometryAttribute.GeometryAttribute({
        componentDatatype: ComponentDatatype.ComponentDatatype.UNSIGNED_BYTE,
        componentsPerAttribute: 1,
        values: offsetAttribute,
      });
    }

    return geometry;
  }

  const startCartographicScratch = new Matrix2.Cartographic();
  const endCartographicScratch = new Matrix2.Cartographic();
  const idlCross = {
    westOverIDL: 0.0,
    eastOverIDL: 0.0,
  };
  let ellipsoidGeodesic = new EllipsoidGeodesic.EllipsoidGeodesic();
  function computeRectangle(positions, ellipsoid, arcType, granularity, result) {
    result = defaultValue.defaultValue(result, new Matrix2.Rectangle());
    if (!defaultValue.defined(positions) || positions.length < 3) {
      result.west = 0.0;
      result.north = 0.0;
      result.south = 0.0;
      result.east = 0.0;
      return result;
    }

    if (arcType === ArcType.ArcType.RHUMB) {
      return Matrix2.Rectangle.fromCartesianArray(positions, ellipsoid, result);
    }

    if (!ellipsoidGeodesic.ellipsoid.equals(ellipsoid)) {
      ellipsoidGeodesic = new EllipsoidGeodesic.EllipsoidGeodesic(undefined, undefined, ellipsoid);
    }

    result.west = Number.POSITIVE_INFINITY;
    result.east = Number.NEGATIVE_INFINITY;
    result.south = Number.POSITIVE_INFINITY;
    result.north = Number.NEGATIVE_INFINITY;

    idlCross.westOverIDL = Number.POSITIVE_INFINITY;
    idlCross.eastOverIDL = Number.NEGATIVE_INFINITY;

    const inverseChordLength =
      1.0 / ComponentDatatype.CesiumMath.chordLength(granularity, ellipsoid.maximumRadius);
    const positionsLength = positions.length;
    let endCartographic = ellipsoid.cartesianToCartographic(
      positions[0],
      endCartographicScratch
    );
    let startCartographic = startCartographicScratch;
    let swap;

    for (let i = 1; i < positionsLength; i++) {
      swap = startCartographic;
      startCartographic = endCartographic;
      endCartographic = ellipsoid.cartesianToCartographic(positions[i], swap);
      ellipsoidGeodesic.setEndPoints(startCartographic, endCartographic);
      interpolateAndGrowRectangle(
        ellipsoidGeodesic,
        inverseChordLength,
        result,
        idlCross
      );
    }

    swap = startCartographic;
    startCartographic = endCartographic;
    endCartographic = ellipsoid.cartesianToCartographic(positions[0], swap);
    ellipsoidGeodesic.setEndPoints(startCartographic, endCartographic);
    interpolateAndGrowRectangle(
      ellipsoidGeodesic,
      inverseChordLength,
      result,
      idlCross
    );

    if (result.east - result.west > idlCross.eastOverIDL - idlCross.westOverIDL) {
      result.west = idlCross.westOverIDL;
      result.east = idlCross.eastOverIDL;

      if (result.east > ComponentDatatype.CesiumMath.PI) {
        result.east = result.east - ComponentDatatype.CesiumMath.TWO_PI;
      }
      if (result.west > ComponentDatatype.CesiumMath.PI) {
        result.west = result.west - ComponentDatatype.CesiumMath.TWO_PI;
      }
    }

    return result;
  }

  const interpolatedCartographicScratch = new Matrix2.Cartographic();
  function interpolateAndGrowRectangle(
    ellipsoidGeodesic,
    inverseChordLength,
    result,
    idlCross
  ) {
    const segmentLength = ellipsoidGeodesic.surfaceDistance;

    const numPoints = Math.ceil(segmentLength * inverseChordLength);
    const subsegmentDistance =
      numPoints > 0 ? segmentLength / (numPoints - 1) : Number.POSITIVE_INFINITY;
    let interpolationDistance = 0.0;

    for (let i = 0; i < numPoints; i++) {
      const interpolatedCartographic = ellipsoidGeodesic.interpolateUsingSurfaceDistance(
        interpolationDistance,
        interpolatedCartographicScratch
      );
      interpolationDistance += subsegmentDistance;
      const longitude = interpolatedCartographic.longitude;
      const latitude = interpolatedCartographic.latitude;

      result.west = Math.min(result.west, longitude);
      result.east = Math.max(result.east, longitude);
      result.south = Math.min(result.south, latitude);
      result.north = Math.max(result.north, latitude);

      const lonAdjusted =
        longitude >= 0 ? longitude : longitude + ComponentDatatype.CesiumMath.TWO_PI;
      idlCross.westOverIDL = Math.min(idlCross.westOverIDL, lonAdjusted);
      idlCross.eastOverIDL = Math.max(idlCross.eastOverIDL, lonAdjusted);
    }
  }

  const createGeometryFromPositionsExtrudedPositions = [];

  function createGeometryFromPositionsExtruded(
    ellipsoid,
    polygon,
    granularity,
    hierarchy,
    perPositionHeight,
    closeTop,
    closeBottom,
    vertexFormat,
    arcType
  ) {
    const geos = {
      walls: [],
    };
    let i;

    if (closeTop || closeBottom) {
      const topGeo = PolygonGeometryLibrary.PolygonGeometryLibrary.createGeometryFromPositions(
        ellipsoid,
        polygon,
        granularity,
        perPositionHeight,
        vertexFormat,
        arcType
      );

      const edgePoints = topGeo.attributes.position.values;
      const indices = topGeo.indices;
      let numPositions;
      let newIndices;

      if (closeTop && closeBottom) {
        const topBottomPositions = edgePoints.concat(edgePoints);

        numPositions = topBottomPositions.length / 3;

        newIndices = IndexDatatype.IndexDatatype.createTypedArray(
          numPositions,
          indices.length * 2
        );
        newIndices.set(indices);
        const ilength = indices.length;

        const length = numPositions / 2;

        for (i = 0; i < ilength; i += 3) {
          const i0 = newIndices[i] + length;
          const i1 = newIndices[i + 1] + length;
          const i2 = newIndices[i + 2] + length;

          newIndices[i + ilength] = i2;
          newIndices[i + 1 + ilength] = i1;
          newIndices[i + 2 + ilength] = i0;
        }

        topGeo.attributes.position.values = topBottomPositions;
        if (perPositionHeight && vertexFormat.normal) {
          const normals = topGeo.attributes.normal.values;
          topGeo.attributes.normal.values = new Float32Array(
            topBottomPositions.length
          );
          topGeo.attributes.normal.values.set(normals);
        }
        topGeo.indices = newIndices;
      } else if (closeBottom) {
        numPositions = edgePoints.length / 3;
        newIndices = IndexDatatype.IndexDatatype.createTypedArray(numPositions, indices.length);

        for (i = 0; i < indices.length; i += 3) {
          newIndices[i] = indices[i + 2];
          newIndices[i + 1] = indices[i + 1];
          newIndices[i + 2] = indices[i];
        }

        topGeo.indices = newIndices;
      }

      geos.topAndBottom = new GeometryInstance.GeometryInstance({
        geometry: topGeo,
      });
    }

    let outerRing = hierarchy.outerRing;
    let tangentPlane = EllipsoidTangentPlane.EllipsoidTangentPlane.fromPoints(outerRing, ellipsoid);
    let positions2D = tangentPlane.projectPointsOntoPlane(
      outerRing,
      createGeometryFromPositionsExtrudedPositions
    );

    let windingOrder = PolygonPipeline.PolygonPipeline.computeWindingOrder2D(positions2D);
    if (windingOrder === PolygonPipeline.WindingOrder.CLOCKWISE) {
      outerRing = outerRing.slice().reverse();
    }

    let wallGeo = PolygonGeometryLibrary.PolygonGeometryLibrary.computeWallGeometry(
      outerRing,
      ellipsoid,
      granularity,
      perPositionHeight,
      arcType
    );
    geos.walls.push(
      new GeometryInstance.GeometryInstance({
        geometry: wallGeo,
      })
    );

    const holes = hierarchy.holes;
    for (i = 0; i < holes.length; i++) {
      let hole = holes[i];

      tangentPlane = EllipsoidTangentPlane.EllipsoidTangentPlane.fromPoints(hole, ellipsoid);
      positions2D = tangentPlane.projectPointsOntoPlane(
        hole,
        createGeometryFromPositionsExtrudedPositions
      );

      windingOrder = PolygonPipeline.PolygonPipeline.computeWindingOrder2D(positions2D);
      if (windingOrder === PolygonPipeline.WindingOrder.COUNTER_CLOCKWISE) {
        hole = hole.slice().reverse();
      }

      wallGeo = PolygonGeometryLibrary.PolygonGeometryLibrary.computeWallGeometry(
        hole,
        ellipsoid,
        granularity,
        perPositionHeight,
        arcType
      );
      geos.walls.push(
        new GeometryInstance.GeometryInstance({
          geometry: wallGeo,
        })
      );
    }

    return geos;
  }

  /**
   * A description of a polygon on the ellipsoid. The polygon is defined by a polygon hierarchy. Polygon geometry can be rendered with both {@link Primitive} and {@link GroundPrimitive}.
   *
   * @alias PolygonGeometry
   * @constructor
   *
   * @param {Object} options Object with the following properties:
   * @param {PolygonHierarchy} options.polygonHierarchy A polygon hierarchy that can include holes.
   * @param {Number} [options.height=0.0] The distance in meters between the polygon and the ellipsoid surface.
   * @param {Number} [options.extrudedHeight] The distance in meters between the polygon's extruded face and the ellipsoid surface.
   * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
   * @param {Number} [options.stRotation=0.0] The rotation of the texture coordinates, in radians. A positive rotation is counter-clockwise.
   * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid to be used as a reference.
   * @param {Number} [options.granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
   * @param {Boolean} [options.perPositionHeight=false] Use the height of options.positions for each position instead of using options.height to determine the height.
   * @param {Boolean} [options.closeTop=true] When false, leaves off the top of an extruded polygon open.
   * @param {Boolean} [options.closeBottom=true] When false, leaves off the bottom of an extruded polygon open.
   * @param {ArcType} [options.arcType=ArcType.GEODESIC] The type of line the polygon edges must follow. Valid options are {@link ArcType.GEODESIC} and {@link ArcType.RHUMB}.
   *
   * @see PolygonGeometry#createGeometry
   * @see PolygonGeometry#fromPositions
   *
   * @demo {@link https://sandcastle.cesium.com/index.html?src=Polygon.html|Cesium Sandcastle Polygon Demo}
   *
   * @example
   * // 1. create a polygon from points
   * const polygon = new Cesium.PolygonGeometry({
   *   polygonHierarchy : new Cesium.PolygonHierarchy(
   *     Cesium.Cartesian3.fromDegreesArray([
   *       -72.0, 40.0,
   *       -70.0, 35.0,
   *       -75.0, 30.0,
   *       -70.0, 30.0,
   *       -68.0, 40.0
   *     ])
   *   )
   * });
   * const geometry = Cesium.PolygonGeometry.createGeometry(polygon);
   *
   * // 2. create a nested polygon with holes
   * const polygonWithHole = new Cesium.PolygonGeometry({
   *   polygonHierarchy : new Cesium.PolygonHierarchy(
   *     Cesium.Cartesian3.fromDegreesArray([
   *       -109.0, 30.0,
   *       -95.0, 30.0,
   *       -95.0, 40.0,
   *       -109.0, 40.0
   *     ]),
   *     [new Cesium.PolygonHierarchy(
   *       Cesium.Cartesian3.fromDegreesArray([
   *         -107.0, 31.0,
   *         -107.0, 39.0,
   *         -97.0, 39.0,
   *         -97.0, 31.0
   *       ]),
   *       [new Cesium.PolygonHierarchy(
   *         Cesium.Cartesian3.fromDegreesArray([
   *           -105.0, 33.0,
   *           -99.0, 33.0,
   *           -99.0, 37.0,
   *           -105.0, 37.0
   *         ]),
   *         [new Cesium.PolygonHierarchy(
   *           Cesium.Cartesian3.fromDegreesArray([
   *             -103.0, 34.0,
   *             -101.0, 34.0,
   *             -101.0, 36.0,
   *             -103.0, 36.0
   *           ])
   *         )]
   *       )]
   *     )]
   *   )
   * });
   * const geometry = Cesium.PolygonGeometry.createGeometry(polygonWithHole);
   *
   * // 3. create extruded polygon
   * const extrudedPolygon = new Cesium.PolygonGeometry({
   *   polygonHierarchy : new Cesium.PolygonHierarchy(
   *     Cesium.Cartesian3.fromDegreesArray([
   *       -72.0, 40.0,
   *       -70.0, 35.0,
   *       -75.0, 30.0,
   *       -70.0, 30.0,
   *       -68.0, 40.0
   *     ])
   *   ),
   *   extrudedHeight: 300000
   * });
   * const geometry = Cesium.PolygonGeometry.createGeometry(extrudedPolygon);
   */
  function PolygonGeometry(options) {
    //>>includeStart('debug', pragmas.debug);
    RuntimeError.Check.typeOf.object("options", options);
    RuntimeError.Check.typeOf.object("options.polygonHierarchy", options.polygonHierarchy);
    if (
      defaultValue.defined(options.perPositionHeight) &&
      options.perPositionHeight &&
      defaultValue.defined(options.height)
    ) {
      throw new RuntimeError.DeveloperError(
        "Cannot use both options.perPositionHeight and options.height"
      );
    }
    if (
      defaultValue.defined(options.arcType) &&
      options.arcType !== ArcType.ArcType.GEODESIC &&
      options.arcType !== ArcType.ArcType.RHUMB
    ) {
      throw new RuntimeError.DeveloperError(
        "Invalid arcType. Valid options are ArcType.GEODESIC and ArcType.RHUMB."
      );
    }
    //>>includeEnd('debug');

    const polygonHierarchy = options.polygonHierarchy;
    const vertexFormat = defaultValue.defaultValue(options.vertexFormat, VertexFormat.VertexFormat.DEFAULT);
    const ellipsoid = defaultValue.defaultValue(options.ellipsoid, Matrix2.Ellipsoid.WGS84);
    const granularity = defaultValue.defaultValue(
      options.granularity,
      ComponentDatatype.CesiumMath.RADIANS_PER_DEGREE
    );
    const stRotation = defaultValue.defaultValue(options.stRotation, 0.0);
    const perPositionHeight = defaultValue.defaultValue(options.perPositionHeight, false);
    const perPositionHeightExtrude =
      perPositionHeight && defaultValue.defined(options.extrudedHeight);
    let height = defaultValue.defaultValue(options.height, 0.0);
    let extrudedHeight = defaultValue.defaultValue(options.extrudedHeight, height);

    if (!perPositionHeightExtrude) {
      const h = Math.max(height, extrudedHeight);
      extrudedHeight = Math.min(height, extrudedHeight);
      height = h;
    }

    this._vertexFormat = VertexFormat.VertexFormat.clone(vertexFormat);
    this._ellipsoid = Matrix2.Ellipsoid.clone(ellipsoid);
    this._granularity = granularity;
    this._stRotation = stRotation;
    this._height = height;
    this._extrudedHeight = extrudedHeight;
    this._closeTop = defaultValue.defaultValue(options.closeTop, true);
    this._closeBottom = defaultValue.defaultValue(options.closeBottom, true);
    this._polygonHierarchy = polygonHierarchy;
    this._perPositionHeight = perPositionHeight;
    this._perPositionHeightExtrude = perPositionHeightExtrude;
    this._shadowVolume = defaultValue.defaultValue(options.shadowVolume, false);
    this._workerName = "createPolygonGeometry";
    this._offsetAttribute = options.offsetAttribute;
    this._arcType = defaultValue.defaultValue(options.arcType, ArcType.ArcType.GEODESIC);

    this._rectangle = undefined;
    this._textureCoordinateRotationPoints = undefined;

    /**
     * The number of elements used to pack the object into an array.
     * @type {Number}
     */
    this.packedLength =
      PolygonGeometryLibrary.PolygonGeometryLibrary.computeHierarchyPackedLength(polygonHierarchy) +
      Matrix2.Ellipsoid.packedLength +
      VertexFormat.VertexFormat.packedLength +
      12;
  }

  /**
   * A description of a polygon from an array of positions. Polygon geometry can be rendered with both {@link Primitive} and {@link GroundPrimitive}.
   *
   * @param {Object} options Object with the following properties:
   * @param {Cartesian3[]} options.positions An array of positions that defined the corner points of the polygon.
   * @param {Number} [options.height=0.0] The height of the polygon.
   * @param {Number} [options.extrudedHeight] The height of the polygon extrusion.
   * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
   * @param {Number} [options.stRotation=0.0] The rotation of the texture coordinates, in radians. A positive rotation is counter-clockwise.
   * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid to be used as a reference.
   * @param {Number} [options.granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
   * @param {Boolean} [options.perPositionHeight=false] Use the height of options.positions for each position instead of using options.height to determine the height.
   * @param {Boolean} [options.closeTop=true] When false, leaves off the top of an extruded polygon open.
   * @param {Boolean} [options.closeBottom=true] When false, leaves off the bottom of an extruded polygon open.
   * @param {ArcType} [options.arcType=ArcType.GEODESIC] The type of line the polygon edges must follow. Valid options are {@link ArcType.GEODESIC} and {@link ArcType.RHUMB}.
   * @returns {PolygonGeometry}
   *
   *
   * @example
   * // create a polygon from points
   * const polygon = Cesium.PolygonGeometry.fromPositions({
   *   positions : Cesium.Cartesian3.fromDegreesArray([
   *     -72.0, 40.0,
   *     -70.0, 35.0,
   *     -75.0, 30.0,
   *     -70.0, 30.0,
   *     -68.0, 40.0
   *   ])
   * });
   * const geometry = Cesium.PolygonGeometry.createGeometry(polygon);
   *
   * @see PolygonGeometry#createGeometry
   */
  PolygonGeometry.fromPositions = function (options) {
    options = defaultValue.defaultValue(options, defaultValue.defaultValue.EMPTY_OBJECT);

    //>>includeStart('debug', pragmas.debug);
    RuntimeError.Check.defined("options.positions", options.positions);
    //>>includeEnd('debug');

    const newOptions = {
      polygonHierarchy: {
        positions: options.positions,
      },
      height: options.height,
      extrudedHeight: options.extrudedHeight,
      vertexFormat: options.vertexFormat,
      stRotation: options.stRotation,
      ellipsoid: options.ellipsoid,
      granularity: options.granularity,
      perPositionHeight: options.perPositionHeight,
      closeTop: options.closeTop,
      closeBottom: options.closeBottom,
      offsetAttribute: options.offsetAttribute,
      arcType: options.arcType,
    };
    return new PolygonGeometry(newOptions);
  };

  /**
   * Stores the provided instance into the provided array.
   *
   * @param {PolygonGeometry} value The value to pack.
   * @param {Number[]} array The array to pack into.
   * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
   *
   * @returns {Number[]} The array that was packed into
   */
  PolygonGeometry.pack = function (value, array, startingIndex) {
    //>>includeStart('debug', pragmas.debug);
    RuntimeError.Check.typeOf.object("value", value);
    RuntimeError.Check.defined("array", array);
    //>>includeEnd('debug');

    startingIndex = defaultValue.defaultValue(startingIndex, 0);

    startingIndex = PolygonGeometryLibrary.PolygonGeometryLibrary.packPolygonHierarchy(
      value._polygonHierarchy,
      array,
      startingIndex
    );

    Matrix2.Ellipsoid.pack(value._ellipsoid, array, startingIndex);
    startingIndex += Matrix2.Ellipsoid.packedLength;

    VertexFormat.VertexFormat.pack(value._vertexFormat, array, startingIndex);
    startingIndex += VertexFormat.VertexFormat.packedLength;

    array[startingIndex++] = value._height;
    array[startingIndex++] = value._extrudedHeight;
    array[startingIndex++] = value._granularity;
    array[startingIndex++] = value._stRotation;
    array[startingIndex++] = value._perPositionHeightExtrude ? 1.0 : 0.0;
    array[startingIndex++] = value._perPositionHeight ? 1.0 : 0.0;
    array[startingIndex++] = value._closeTop ? 1.0 : 0.0;
    array[startingIndex++] = value._closeBottom ? 1.0 : 0.0;
    array[startingIndex++] = value._shadowVolume ? 1.0 : 0.0;
    array[startingIndex++] = defaultValue.defaultValue(value._offsetAttribute, -1);
    array[startingIndex++] = value._arcType;
    array[startingIndex] = value.packedLength;

    return array;
  };

  const scratchEllipsoid = Matrix2.Ellipsoid.clone(Matrix2.Ellipsoid.UNIT_SPHERE);
  const scratchVertexFormat = new VertexFormat.VertexFormat();

  //Only used to avoid inability to default construct.
  const dummyOptions = {
    polygonHierarchy: {},
  };

  /**
   * Retrieves an instance from a packed array.
   *
   * @param {Number[]} array The packed array.
   * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
   * @param {PolygonGeometry} [result] The object into which to store the result.
   */
  PolygonGeometry.unpack = function (array, startingIndex, result) {
    //>>includeStart('debug', pragmas.debug);
    RuntimeError.Check.defined("array", array);
    //>>includeEnd('debug');

    startingIndex = defaultValue.defaultValue(startingIndex, 0);

    const polygonHierarchy = PolygonGeometryLibrary.PolygonGeometryLibrary.unpackPolygonHierarchy(
      array,
      startingIndex
    );
    startingIndex = polygonHierarchy.startingIndex;
    delete polygonHierarchy.startingIndex;

    const ellipsoid = Matrix2.Ellipsoid.unpack(array, startingIndex, scratchEllipsoid);
    startingIndex += Matrix2.Ellipsoid.packedLength;

    const vertexFormat = VertexFormat.VertexFormat.unpack(
      array,
      startingIndex,
      scratchVertexFormat
    );
    startingIndex += VertexFormat.VertexFormat.packedLength;

    const height = array[startingIndex++];
    const extrudedHeight = array[startingIndex++];
    const granularity = array[startingIndex++];
    const stRotation = array[startingIndex++];
    const perPositionHeightExtrude = array[startingIndex++] === 1.0;
    const perPositionHeight = array[startingIndex++] === 1.0;
    const closeTop = array[startingIndex++] === 1.0;
    const closeBottom = array[startingIndex++] === 1.0;
    const shadowVolume = array[startingIndex++] === 1.0;
    const offsetAttribute = array[startingIndex++];
    const arcType = array[startingIndex++];
    const packedLength = array[startingIndex];

    if (!defaultValue.defined(result)) {
      result = new PolygonGeometry(dummyOptions);
    }

    result._polygonHierarchy = polygonHierarchy;
    result._ellipsoid = Matrix2.Ellipsoid.clone(ellipsoid, result._ellipsoid);
    result._vertexFormat = VertexFormat.VertexFormat.clone(vertexFormat, result._vertexFormat);
    result._height = height;
    result._extrudedHeight = extrudedHeight;
    result._granularity = granularity;
    result._stRotation = stRotation;
    result._perPositionHeightExtrude = perPositionHeightExtrude;
    result._perPositionHeight = perPositionHeight;
    result._closeTop = closeTop;
    result._closeBottom = closeBottom;
    result._shadowVolume = shadowVolume;
    result._offsetAttribute =
      offsetAttribute === -1 ? undefined : offsetAttribute;
    result._arcType = arcType;
    result.packedLength = packedLength;
    return result;
  };

  /**
   * Returns the bounding rectangle given the provided options
   *
   * @param {Object} options Object with the following properties:
   * @param {PolygonHierarchy} options.polygonHierarchy A polygon hierarchy that can include holes.
   * @param {Number} [options.granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude. Determines the number of positions sampled.
   * @param {ArcType} [options.arcType=ArcType.GEODESIC] The type of line the polygon edges must follow. Valid options are {@link ArcType.GEODESIC} and {@link ArcType.RHUMB}.
   * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid to be used as a reference.
   * @param {Rectangle} [result] An object in which to store the result.
   *
   * @returns {Rectangle} The result rectangle
   */
  PolygonGeometry.computeRectangle = function (options, result) {
    //>>includeStart('debug', pragmas.debug);
    RuntimeError.Check.typeOf.object("options", options);
    RuntimeError.Check.typeOf.object("options.polygonHierarchy", options.polygonHierarchy);
    //>>includeEnd('debug');

    const granularity = defaultValue.defaultValue(
      options.granularity,
      ComponentDatatype.CesiumMath.RADIANS_PER_DEGREE
    );
    const arcType = defaultValue.defaultValue(options.arcType, ArcType.ArcType.GEODESIC);
    //>>includeStart('debug', pragmas.debug);
    if (arcType !== ArcType.ArcType.GEODESIC && arcType !== ArcType.ArcType.RHUMB) {
      throw new RuntimeError.DeveloperError(
        "Invalid arcType. Valid options are ArcType.GEODESIC and ArcType.RHUMB."
      );
    }
    //>>includeEnd('debug');

    const polygonHierarchy = options.polygonHierarchy;
    const ellipsoid = defaultValue.defaultValue(options.ellipsoid, Matrix2.Ellipsoid.WGS84);

    return computeRectangle(
      polygonHierarchy.positions,
      ellipsoid,
      arcType,
      granularity,
      result
    );
  };

  /**
   * Computes the geometric representation of a polygon, including its vertices, indices, and a bounding sphere.
   *
   * @param {PolygonGeometry} polygonGeometry A description of the polygon.
   * @returns {Geometry|undefined} The computed vertices and indices.
   */
  PolygonGeometry.createGeometry = function (polygonGeometry) {
    const vertexFormat = polygonGeometry._vertexFormat;
    const ellipsoid = polygonGeometry._ellipsoid;
    const granularity = polygonGeometry._granularity;
    const stRotation = polygonGeometry._stRotation;
    const polygonHierarchy = polygonGeometry._polygonHierarchy;
    const perPositionHeight = polygonGeometry._perPositionHeight;
    const closeTop = polygonGeometry._closeTop;
    const closeBottom = polygonGeometry._closeBottom;
    const arcType = polygonGeometry._arcType;

    let outerPositions = polygonHierarchy.positions;
    if (outerPositions.length < 3) {
      return;
    }

    const tangentPlane = EllipsoidTangentPlane.EllipsoidTangentPlane.fromPoints(
      outerPositions,
      ellipsoid
    );

    const results = PolygonGeometryLibrary.PolygonGeometryLibrary.polygonsFromHierarchy(
      polygonHierarchy,
      tangentPlane.projectPointsOntoPlane.bind(tangentPlane),
      !perPositionHeight,
      ellipsoid
    );

    const hierarchy = results.hierarchy;
    const polygons = results.polygons;

    if (hierarchy.length === 0) {
      return;
    }

    outerPositions = hierarchy[0].outerRing;
    const boundingRectangle = PolygonGeometryLibrary.PolygonGeometryLibrary.computeBoundingRectangle(
      tangentPlane.plane.normal,
      tangentPlane.projectPointOntoPlane.bind(tangentPlane),
      outerPositions,
      stRotation,
      scratchBoundingRectangle
    );

    const geometries = [];

    const height = polygonGeometry._height;
    const extrudedHeight = polygonGeometry._extrudedHeight;
    const extrude =
      polygonGeometry._perPositionHeightExtrude ||
      !ComponentDatatype.CesiumMath.equalsEpsilon(height, extrudedHeight, 0, ComponentDatatype.CesiumMath.EPSILON2);

    const options = {
      perPositionHeight: perPositionHeight,
      vertexFormat: vertexFormat,
      geometry: undefined,
      tangentPlane: tangentPlane,
      boundingRectangle: boundingRectangle,
      ellipsoid: ellipsoid,
      stRotation: stRotation,
      bottom: false,
      top: true,
      wall: false,
      extrude: false,
      arcType: arcType,
    };

    let i;

    if (extrude) {
      options.extrude = true;
      options.top = closeTop;
      options.bottom = closeBottom;
      options.shadowVolume = polygonGeometry._shadowVolume;
      options.offsetAttribute = polygonGeometry._offsetAttribute;
      for (i = 0; i < polygons.length; i++) {
        const splitGeometry = createGeometryFromPositionsExtruded(
          ellipsoid,
          polygons[i],
          granularity,
          hierarchy[i],
          perPositionHeight,
          closeTop,
          closeBottom,
          vertexFormat,
          arcType
        );

        let topAndBottom;
        if (closeTop && closeBottom) {
          topAndBottom = splitGeometry.topAndBottom;
          options.geometry = PolygonGeometryLibrary.PolygonGeometryLibrary.scaleToGeodeticHeightExtruded(
            topAndBottom.geometry,
            height,
            extrudedHeight,
            ellipsoid,
            perPositionHeight
          );
        } else if (closeTop) {
          topAndBottom = splitGeometry.topAndBottom;
          topAndBottom.geometry.attributes.position.values = PolygonPipeline.PolygonPipeline.scaleToGeodeticHeight(
            topAndBottom.geometry.attributes.position.values,
            height,
            ellipsoid,
            !perPositionHeight
          );
          options.geometry = topAndBottom.geometry;
        } else if (closeBottom) {
          topAndBottom = splitGeometry.topAndBottom;
          topAndBottom.geometry.attributes.position.values = PolygonPipeline.PolygonPipeline.scaleToGeodeticHeight(
            topAndBottom.geometry.attributes.position.values,
            extrudedHeight,
            ellipsoid,
            true
          );
          options.geometry = topAndBottom.geometry;
        }
        if (closeTop || closeBottom) {
          options.wall = false;
          topAndBottom.geometry = computeAttributes(options);
          geometries.push(topAndBottom);
        }

        const walls = splitGeometry.walls;
        options.wall = true;
        for (let k = 0; k < walls.length; k++) {
          const wall = walls[k];
          options.geometry = PolygonGeometryLibrary.PolygonGeometryLibrary.scaleToGeodeticHeightExtruded(
            wall.geometry,
            height,
            extrudedHeight,
            ellipsoid,
            perPositionHeight
          );
          wall.geometry = computeAttributes(options);
          geometries.push(wall);
        }
      }
    } else {
      for (i = 0; i < polygons.length; i++) {
        const geometryInstance = new GeometryInstance.GeometryInstance({
          geometry: PolygonGeometryLibrary.PolygonGeometryLibrary.createGeometryFromPositions(
            ellipsoid,
            polygons[i],
            granularity,
            perPositionHeight,
            vertexFormat,
            arcType
          ),
        });
        geometryInstance.geometry.attributes.position.values = PolygonPipeline.PolygonPipeline.scaleToGeodeticHeight(
          geometryInstance.geometry.attributes.position.values,
          height,
          ellipsoid,
          !perPositionHeight
        );
        options.geometry = geometryInstance.geometry;
        geometryInstance.geometry = computeAttributes(options);

        if (defaultValue.defined(polygonGeometry._offsetAttribute)) {
          const length =
            geometryInstance.geometry.attributes.position.values.length;
          const applyOffset = new Uint8Array(length / 3);
          const offsetValue =
            polygonGeometry._offsetAttribute === GeometryOffsetAttribute.GeometryOffsetAttribute.NONE
              ? 0
              : 1;
          GeometryOffsetAttribute.arrayFill(applyOffset, offsetValue);
          geometryInstance.geometry.attributes.applyOffset = new GeometryAttribute.GeometryAttribute(
            {
              componentDatatype: ComponentDatatype.ComponentDatatype.UNSIGNED_BYTE,
              componentsPerAttribute: 1,
              values: applyOffset,
            }
          );
        }

        geometries.push(geometryInstance);
      }
    }

    const geometry = GeometryPipeline.GeometryPipeline.combineInstances(geometries)[0];
    geometry.attributes.position.values = new Float64Array(
      geometry.attributes.position.values
    );
    geometry.indices = IndexDatatype.IndexDatatype.createTypedArray(
      geometry.attributes.position.values.length / 3,
      geometry.indices
    );

    const attributes = geometry.attributes;
    const boundingSphere = Transforms.BoundingSphere.fromVertices(
      attributes.position.values
    );

    if (!vertexFormat.position) {
      delete attributes.position;
    }

    return new GeometryAttribute.Geometry({
      attributes: attributes,
      indices: geometry.indices,
      primitiveType: geometry.primitiveType,
      boundingSphere: boundingSphere,
      offsetAttribute: polygonGeometry._offsetAttribute,
    });
  };

  /**
   * @private
   */
  PolygonGeometry.createShadowVolume = function (
    polygonGeometry,
    minHeightFunc,
    maxHeightFunc
  ) {
    const granularity = polygonGeometry._granularity;
    const ellipsoid = polygonGeometry._ellipsoid;

    const minHeight = minHeightFunc(granularity, ellipsoid);
    const maxHeight = maxHeightFunc(granularity, ellipsoid);

    return new PolygonGeometry({
      polygonHierarchy: polygonGeometry._polygonHierarchy,
      ellipsoid: ellipsoid,
      stRotation: polygonGeometry._stRotation,
      granularity: granularity,
      perPositionHeight: false,
      extrudedHeight: minHeight,
      height: maxHeight,
      vertexFormat: VertexFormat.VertexFormat.POSITION_ONLY,
      shadowVolume: true,
      arcType: polygonGeometry._arcType,
    });
  };

  function textureCoordinateRotationPoints(polygonGeometry) {
    const stRotation = -polygonGeometry._stRotation;
    if (stRotation === 0.0) {
      return [0, 0, 0, 1, 1, 0];
    }
    const ellipsoid = polygonGeometry._ellipsoid;
    const positions = polygonGeometry._polygonHierarchy.positions;
    const boundingRectangle = polygonGeometry.rectangle;
    return GeometryAttribute.Geometry._textureCoordinateRotationPoints(
      positions,
      stRotation,
      ellipsoid,
      boundingRectangle
    );
  }

  Object.defineProperties(PolygonGeometry.prototype, {
    /**
     * @private
     */
    rectangle: {
      get: function () {
        if (!defaultValue.defined(this._rectangle)) {
          const positions = this._polygonHierarchy.positions;
          this._rectangle = computeRectangle(
            positions,
            this._ellipsoid,
            this._arcType,
            this._granularity
          );
        }

        return this._rectangle;
      },
    },
    /**
     * For remapping texture coordinates when rendering PolygonGeometries as GroundPrimitives.
     * @private
     */
    textureCoordinateRotationPoints: {
      get: function () {
        if (!defaultValue.defined(this._textureCoordinateRotationPoints)) {
          this._textureCoordinateRotationPoints = textureCoordinateRotationPoints(
            this
          );
        }
        return this._textureCoordinateRotationPoints;
      },
    },
  });

  function createPolygonGeometry(polygonGeometry, offset) {
    if (defaultValue.defined(offset)) {
      polygonGeometry = PolygonGeometry.unpack(polygonGeometry, offset);
    }
    polygonGeometry._ellipsoid = Matrix2.Ellipsoid.clone(polygonGeometry._ellipsoid);
    return PolygonGeometry.createGeometry(polygonGeometry);
  }

  return createPolygonGeometry;

}));
//# sourceMappingURL=createPolygonGeometry.js.map
