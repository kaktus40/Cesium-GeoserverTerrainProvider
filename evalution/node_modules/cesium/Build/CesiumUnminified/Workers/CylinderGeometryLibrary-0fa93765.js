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

define(['exports', './ComponentDatatype-9e86ac8f'], (function (exports, ComponentDatatype) { 'use strict';

  /**
   * @private
   */
  const CylinderGeometryLibrary = {};

  /**
   * @private
   */
  CylinderGeometryLibrary.computePositions = function (
    length,
    topRadius,
    bottomRadius,
    slices,
    fill
  ) {
    const topZ = length * 0.5;
    const bottomZ = -topZ;

    const twoSlice = slices + slices;
    const size = fill ? 2 * twoSlice : twoSlice;
    const positions = new Float64Array(size * 3);
    let i;
    let index = 0;
    let tbIndex = 0;
    const bottomOffset = fill ? twoSlice * 3 : 0;
    const topOffset = fill ? (twoSlice + slices) * 3 : slices * 3;

    for (i = 0; i < slices; i++) {
      const angle = (i / slices) * ComponentDatatype.CesiumMath.TWO_PI;
      const x = Math.cos(angle);
      const y = Math.sin(angle);
      const bottomX = x * bottomRadius;
      const bottomY = y * bottomRadius;
      const topX = x * topRadius;
      const topY = y * topRadius;

      positions[tbIndex + bottomOffset] = bottomX;
      positions[tbIndex + bottomOffset + 1] = bottomY;
      positions[tbIndex + bottomOffset + 2] = bottomZ;

      positions[tbIndex + topOffset] = topX;
      positions[tbIndex + topOffset + 1] = topY;
      positions[tbIndex + topOffset + 2] = topZ;
      tbIndex += 3;
      if (fill) {
        positions[index++] = bottomX;
        positions[index++] = bottomY;
        positions[index++] = bottomZ;
        positions[index++] = topX;
        positions[index++] = topY;
        positions[index++] = topZ;
      }
    }

    return positions;
  };

  exports.CylinderGeometryLibrary = CylinderGeometryLibrary;

}));
//# sourceMappingURL=CylinderGeometryLibrary-0fa93765.js.map
