/* This file is automatically rebuilt by the Cesium build process. */
define(['./AttributeCompression-3cfab808', './Matrix2-69c32d33', './ComponentDatatype-b1ea011a', './createTaskProcessorWorker', './RuntimeError-c581ca93', './defaultValue-94c3e563', './WebGLConstants-7dccdc96'], (function (AttributeCompression, Matrix2, ComponentDatatype, createTaskProcessorWorker, RuntimeError, defaultValue, WebGLConstants) { 'use strict';

  const maxShort = 32767;

  const scratchBVCartographic = new Matrix2.Cartographic();
  const scratchEncodedPosition = new Matrix2.Cartesian3();

  const scratchRectangle = new Matrix2.Rectangle();
  const scratchEllipsoid = new Matrix2.Ellipsoid();
  const scratchMinMaxHeights = {
    min: undefined,
    max: undefined,
  };

  function unpackBuffer(packedBuffer) {
    packedBuffer = new Float64Array(packedBuffer);

    let offset = 0;
    scratchMinMaxHeights.min = packedBuffer[offset++];
    scratchMinMaxHeights.max = packedBuffer[offset++];

    Matrix2.Rectangle.unpack(packedBuffer, offset, scratchRectangle);
    offset += Matrix2.Rectangle.packedLength;

    Matrix2.Ellipsoid.unpack(packedBuffer, offset, scratchEllipsoid);
  }

  function createVectorTilePoints(parameters, transferableObjects) {
    const positions = new Uint16Array(parameters.positions);

    unpackBuffer(parameters.packedBuffer);
    const rectangle = scratchRectangle;
    const ellipsoid = scratchEllipsoid;
    const minimumHeight = scratchMinMaxHeights.min;
    const maximumHeight = scratchMinMaxHeights.max;

    const positionsLength = positions.length / 3;
    const uBuffer = positions.subarray(0, positionsLength);
    const vBuffer = positions.subarray(positionsLength, 2 * positionsLength);
    const heightBuffer = positions.subarray(
      2 * positionsLength,
      3 * positionsLength
    );
    AttributeCompression.AttributeCompression.zigZagDeltaDecode(uBuffer, vBuffer, heightBuffer);

    const decoded = new Float64Array(positions.length);
    for (let i = 0; i < positionsLength; ++i) {
      const u = uBuffer[i];
      const v = vBuffer[i];
      const h = heightBuffer[i];

      const lon = ComponentDatatype.CesiumMath.lerp(rectangle.west, rectangle.east, u / maxShort);
      const lat = ComponentDatatype.CesiumMath.lerp(rectangle.south, rectangle.north, v / maxShort);
      const alt = ComponentDatatype.CesiumMath.lerp(minimumHeight, maximumHeight, h / maxShort);

      const cartographic = Matrix2.Cartographic.fromRadians(
        lon,
        lat,
        alt,
        scratchBVCartographic
      );
      const decodedPosition = ellipsoid.cartographicToCartesian(
        cartographic,
        scratchEncodedPosition
      );
      Matrix2.Cartesian3.pack(decodedPosition, decoded, i * 3);
    }

    transferableObjects.push(decoded.buffer);

    return {
      positions: decoded.buffer,
    };
  }
  var createVectorTilePoints$1 = createTaskProcessorWorker(createVectorTilePoints);

  return createVectorTilePoints$1;

}));
