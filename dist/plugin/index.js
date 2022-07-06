"use strict";
(() => {
  // src/plugin/utils.ts
  var C = window.Cesium;
  function intersectionRectangle(rectangle0, rectangle1) {
    const west = Math.max(rectangle0.west, rectangle1.west);
    const east = Math.min(rectangle0.east, rectangle1.east);
    const south = Math.max(rectangle0.south, rectangle1.south);
    const north = Math.min(rectangle0.north, rectangle1.north);
    let resultat;
    if (east <= west || south >= north) {
      resultat = null;
    } else {
      resultat = new C.Rectangle(west, south, east, north);
    }
    return resultat;
  }
  var CRS = [{
    name: "CRS:84",
    ellipsoid: C.Ellipsoid.WGS84,
    firstAxeIsLatitude: false,
    tilingScheme: C.GeographicTilingScheme,
    supportedCRS: "urn:ogc:def:crs:OGC:2:84"
  }, {
    name: "EPSG:4326",
    ellipsoid: C.Ellipsoid.WGS84,
    firstAxeIsLatitude: true,
    tilingScheme: C.GeographicTilingScheme,
    supportedCRS: "urn:ogc:def:crs:EPSG::4326"
  }, {
    name: "EPSG:3857",
    ellipsoid: C.Ellipsoid.WGS84,
    firstAxeIsLatitude: false,
    tilingScheme: C.WebMercatorTilingScheme,
    supportedCRS: "urn:ogc:def:crs:EPSG::3857"
  }, {
    name: "OSGEO:41001",
    ellipsoid: C.Ellipsoid.WGS84,
    firstAxeIsLatitude: false,
    tilingScheme: C.WebMercatorTilingScheme,
    supportedCRS: "urn:ogc:def:crs:EPSG::3857"
  }];
  var FormatImage = [{
    format: "image/png",
    extension: "png"
  }, {
    format: "image/jpeg",
    extension: "jpg"
  }, {
    format: "image/jpeg",
    extension: "jpeg"
  }, {
    format: "image/gif",
    extension: "gif"
  }, {
    format: "image/png; mode=8bit",
    extension: "png"
  }];
  var FormatArray = [{
    format: "image/bil",
    postProcessArray: function(bufferIn, size, highest, lowest, offset) {
      let resultat = null;
      const viewerIn = new DataView(bufferIn);
      const littleEndianBuffer = new ArrayBuffer(size.height * size.width * 2);
      const viewerOut = new DataView(littleEndianBuffer);
      if (littleEndianBuffer.byteLength === bufferIn.byteLength) {
        let temp, goodCell = 0, somme = 0;
        for (let i = 0; i < littleEndianBuffer.byteLength; i += 2) {
          temp = viewerIn.getInt16(i, false) - offset;
          if (temp > lowest && temp < highest) {
            viewerOut.setInt16(i, temp, true);
            somme += temp;
            goodCell++;
          } else {
            const val = goodCell === 0 ? 1 : somme / goodCell;
            viewerOut.setInt16(i, val, true);
          }
        }
        resultat = new Int16Array(littleEndianBuffer);
      }
      return resultat;
    }
  }];
  var defaultDescription = {
    service: "WMS",
    maxLevel: 11,
    heightMapWidth: 65,
    heightMapHeight: 65,
    offset: 0,
    highest: 12e3,
    lowest: -500,
    hasStyledImage: false
  };
  var defaultArrayTerrainDataStructure = {
    heightScale: 1,
    heightOffset: 0,
    elementsPerHeight: 1,
    stride: 1,
    elementMultiplier: 256,
    isBigEndian: false,
    lowestEncodedHeight: 0,
    highestEncodedHeight: 1e4
  };
  function basicAssignResult(description, resultat) {
    resultat.heightMapWidth = description.heightMapWidth;
    resultat.heightMapHeight = description.heightMapHeight;
    resultat.ready = false;
    resultat.maximumLevel = description.maxLevel;
    resultat.levelZeroMaximumGeometricError = void 0;
    resultat.offset = description.offset;
    resultat.highest = description.highest;
    resultat.lowest = description.lowest;
    resultat.hasStyledImage = description.hasStyledImage || typeof description.styleName === "string";
  }
  function arrayToBuffer(arrayBuffer, limitations, size, formatArray) {
    return formatArray.postProcessArray(arrayBuffer, size, limitations.highest, limitations.lowest, limitations.offset);
  }
  function imageToBuffer(image, limitations, size, hasStyledImage) {
    const dataPixels = C.getImagePixels(image, size.width, size.height);
    const buffer = new Int16Array(dataPixels.length / 4);
    let goodCell = 0, somme = 0;
    for (let i = 0; i < dataPixels.length; i += 4) {
      const msb = dataPixels[i];
      const lsb = dataPixels[i + 1];
      const isCorrect = dataPixels[i + 2] > 128;
      const valeur = (msb << 8 | lsb) - limitations.offset - 32768;
      if (valeur > limitations.lowest && valeur < limitations.highest && (isCorrect || hasStyledImage)) {
        buffer[i / 4] = valeur;
        somme += valeur;
        goodCell++;
      } else {
        buffer[i / 4] = goodCell === 0 ? 0 : somme / goodCell;
      }
    }
    return buffer;
  }

  // src/plugin/tmsParser.ts
  var C2 = window.Cesium;
  var { fetchXML: loadXML } = C2.Resource;
  async function generate(description) {
    let resultat;
    if (description.url) {
      description.xml = await loadXML({ url: description.url + "/gwc/service/tms/1.0.0" });
      resultat = await parseXML(description);
    } else if (description.xml) {
      resultat = await parseXML(description);
    } else {
      throw new Error("either description.url or description.xml are required.");
    }
    return resultat;
  }
  async function parseXML(description) {
    const xml = description.xml;
    if (!(xml instanceof XMLDocument)) {
      throw new Error("xml must be a XMLDocument");
    }
    let resultat;
    if (xml.querySelector("TileMapService") !== null) {
      if (!description.layerName) {
        throw new Error("layerName is required.");
      }
      const promises = Array.from(xml.querySelectorAll("TileMap[title='" + description.layerName + "']")).map((elt) => {
        let url = elt.getAttribute("href");
        if (description.proxy) {
          url = description.proxy.getURL(url);
        }
        return loadXML({ url }).then((xml2) => {
          description.xml = xml2;
          return getMetaDatafromXML(description);
        });
      });
      resultat = await Promise.race(promises);
    } else {
      resultat = getMetaDatafromXML(description);
    }
    return resultat;
  }
  function getMetaDatafromXML(description) {
    const xml = description.xml;
    let resultat = {};
    basicAssignResult(description, resultat);
    const maxLevel = description.maxLevel;
    const proxy = description.proxy;
    const srs = xml.querySelector("SRS").textContent;
    const selectedCRS = CRS.find((elt) => elt.name === srs);
    if (selectedCRS) {
      resultat.tilingScheme = new selectedCRS.tilingScheme({ ellipsoid: selectedCRS.ellipsoid });
    }
    const format = xml.querySelector("TileFormat");
    const selectedFormatImage = FormatImage.find((elt) => elt.extension == format.getAttribute("extension"));
    if (selectedFormatImage) {
      resultat.formatImage = selectedFormatImage;
      resultat.imageSize = {
        width: parseInt(format.getAttribute("width"), 10),
        height: parseInt(format.getAttribute("height"), 10)
      };
    }
    const tilsetsNode = Array.from(xml.querySelectorAll("TileSets>TileSet"));
    let tileSets = [];
    if (resultat.formatImage) {
      tileSets = tilsetsNode.map(function(tileSet) {
        let url = tileSet.getAttribute("href") + "/{x}/{tmsY}." + resultat.formatImage.extension;
        if (proxy) {
          url = proxy.getURL(url);
        }
        const level = parseInt(tileSet.getAttribute("order"));
        return {
          url,
          level
        };
      });
      tileSets.sort((a, b) => a.level - b.level);
    }
    if (tileSets.length === 0 || !resultat.formatImage || !resultat.tilingScheme) {
      throw new Error("no tilesets, no formatImage and no formatArray");
    }
    resultat.URLtemplateImage = function(x, y, level) {
      let retour = "";
      if (level < tileSets.length) {
        retour = tileSets[level].url;
      }
      return retour;
    };
    const boundingBoxNode = xml.querySelector("BoundingBox");
    const miny = parseFloat(boundingBoxNode.getAttribute("miny"));
    const maxy = parseFloat(boundingBoxNode.getAttribute("maxy"));
    const minx = parseFloat(boundingBoxNode.getAttribute("minx"));
    const maxx = parseFloat(boundingBoxNode.getAttribute("maxx"));
    const limites = new C2.Rectangle(minx, miny, maxx, maxy);
    resultat.getTileDataAvailable = function(x, y, level) {
      const rect = resultat.tilingScheme.tileXYToNativeRectangle(x, y, level);
      const scratchRectangle = intersectionRectangle(limites, rect);
      return scratchRectangle !== null && level < maxLevel && level < tileSets.length;
    };
    resultat.ready = true;
    return resultat;
  }

  // src/plugin/wmsParser.ts
  var C3 = window.Cesium;
  var { fetchXML: loadXML2 } = C3.Resource;
  async function generate2(description) {
    let resultat;
    if (description.url) {
      let urlofServer = description.url;
      let index = urlofServer.lastIndexOf("?");
      if (index > -1) {
        urlofServer = urlofServer.substring(0, index);
      }
      let urlGetCapabilities = urlofServer + "/ows?SERVICE=WMS&REQUEST=GetCapabilities&tiled=true";
      console.log(urlGetCapabilities);
      if (description.proxy) {
        urlGetCapabilities = description.proxy.getURL(urlGetCapabilities);
      }
      description.xml = await loadXML2({ url: urlGetCapabilities });
      resultat = getMetaDatafromXML2(description);
    } else if (description.xml) {
      resultat = getMetaDatafromXML2(description);
    } else {
      throw new Error("either description.url or description.xml are required.");
    }
    return resultat;
  }
  function getMetaDatafromXML2(description) {
    if (!(description.xml instanceof XMLDocument)) {
      throw new Error("xml must be a XMLDocument");
    }
    if (!description.layerName) {
      throw new Error("description.layerName is required.");
    }
    const xml = description.xml;
    const resultat = {};
    const layerName = description.layerName;
    const maxLevel = description.maxLevel;
    let version = null;
    const requestedSize = {
      width: 65,
      height: 65
    };
    let CRS2 = void 0;
    basicAssignResult(description, resultat);
    resultat.formatImage = description.formatImage;
    resultat.formatArray = description.formatArray;
    resultat.tilingScheme = void 0;
    let firstAxeIsLatitude = void 0;
    let isNewVersion = void 0;
    let styleName = description.styleName;
    const versionNode = xml.querySelector("[version]");
    if (versionNode !== null) {
      version = versionNode.getAttribute("version");
      isNewVersion = /^1\.[3-9]\./.test(version);
    }
    let url = xml.querySelector("Request>GetMap OnlineResource").getAttribute("xlink:href");
    const index = url.indexOf("?");
    if (index > -1) {
      url = url.substring(0, index);
    }
    if (description.proxy) {
      url = description.proxy.getURL(url);
    }
    const nodeFormats = Array.from(xml.querySelectorAll("Request>GetMap>Format")).map((node) => node.textContent);
    for (let j = 0; j < nodeFormats.length; j++) {
      if (!resultat.formatImage)
        resultat.formatImage = FormatImage.find((elt) => elt.format === nodeFormats[j]);
      if (!resultat.formatArray)
        resultat.formatArray = FormatArray.find((elt) => elt.format === nodeFormats[j]);
    }
    if (resultat.formatArray && typeof resultat.formatArray.format === "string" && typeof resultat.formatArray.postProcessArray === "function") {
      resultat.formatArray.terrainDataStructure = Object.assign({}, defaultArrayTerrainDataStructure);
    } else {
      delete resultat.formatArray;
    }
    if (!resultat.formatImage || typeof resultat.formatImage.format !== "string") {
      resultat.formatImage = void 0;
    }
    const layerNodes = xml.querySelectorAll("Layer[queryable='1'],Layer[queryable='true']");
    let layerNode = null;
    for (let m = 0; m < layerNodes.length && layerNode === null; m++) {
      if (layerNodes[m].querySelector("Name").textContent === layerName) {
        layerNode = layerNodes[m];
        let fixedHeight = layerNode.getAttribute("fixedHeight");
        let fixedWidth = layerNode.getAttribute("fixedWidth");
        if (fixedHeight !== null) {
          fixedHeight = parseInt(fixedHeight, 10);
          resultat.heightMapHeight = fixedHeight > 0 && fixedHeight < resultat.heightMapHeight ? fixedHeight : resultat.heightMapHeight;
          requestedSize.height = fixedHeight > 0 ? fixedHeight : requestedSize.height;
        }
        if (fixedWidth !== null) {
          fixedWidth = parseInt(fixedWidth, 10);
          resultat.heightMapWidth = fixedWidth > 0 && fixedWidth < resultat.heightMapWidth ? fixedWidth : resultat.heightMapWidth;
          requestedSize.width = fixedWidth > 0 ? fixedWidth : requestedSize.width;
        }
      }
    }
    if (layerNode !== null && version !== null) {
      let found = false;
      for (let n = 0; n < CRS.length && !found; n++) {
        const CRSSelected = CRS[n];
        const referentialName = CRSSelected.name;
        const nodeBBox = layerNode.querySelector("BoundingBox[SRS='" + referentialName + "'],BoundingBox[CRS='" + referentialName + "']");
        if (nodeBBox !== null) {
          CRS2 = referentialName;
          firstAxeIsLatitude = CRSSelected.firstAxeIsLatitude;
          resultat.tilingScheme = new CRSSelected.tilingScheme({
            ellipsoid: CRSSelected.ellipsoid
          });
          let west, east, south, north;
          if (firstAxeIsLatitude && isNewVersion) {
            west = parseFloat(nodeBBox.getAttribute("miny"));
            east = parseFloat(nodeBBox.getAttribute("maxy"));
            south = parseFloat(nodeBBox.getAttribute("minx"));
            north = parseFloat(nodeBBox.getAttribute("maxx"));
          } else {
            west = parseFloat(nodeBBox.getAttribute("minx"));
            east = parseFloat(nodeBBox.getAttribute("maxx"));
            south = parseFloat(nodeBBox.getAttribute("miny"));
            north = parseFloat(nodeBBox.getAttribute("maxy"));
          }
          const rectReference = new C3.Rectangle(west, south, east, north);
          resultat.getTileDataAvailable = function(x, y, level) {
            let retour = false;
            let rectangleCalcul = resultat.tilingScheme.tileXYToNativeRectangle(x, y, level);
            if (level < maxLevel) {
              let scratchRectangle = intersectionRectangle(rectReference, rectangleCalcul);
              retour = scratchRectangle !== null;
            }
            return retour;
          };
          found = true;
        }
      }
      if (styleName) {
        const styleNodes = layerNode.querySelectorAll("Style>Name");
        let styleFound = false;
        for (let z = 0; z < styleNodes.length && !styleFound; z++) {
          if (styleName === styleNodes[z].textContent) {
            styleFound = true;
          }
        }
        if (!styleFound) {
          styleName = null;
        }
      }
      const tileSets = xml.querySelectorAll("VendorSpecificCapabilities>TileSet");
      let out = false;
      for (let q = 0; q < tileSets.length && !out; q++) {
        const isGoodSRS = tileSets[q].querySelector("BoundingBox[SRS='" + CRS2 + "'],BoundingBox[CRS='" + CRS2 + "']") !== null;
        const isGoodLayer = tileSets[q].querySelector("Layers").textContent === layerName;
        if (isGoodLayer && isGoodSRS) {
          requestedSize.width = parseInt(tileSets[q].querySelector("Width").textContent, 10);
          requestedSize.height = parseInt(tileSets[q].querySelector("Height").textContent, 10);
          out = true;
        }
      }
      resultat.ready = found && (resultat.formatImage || resultat.formatArray) && version !== null;
    }
    if (resultat.ready) {
      let URLtemplate = url + "?SERVICE=WMS&REQUEST=GetMap&layers=" + layerName + "&version=" + version + "&bbox=";
      if (isNewVersion && firstAxeIsLatitude) {
        URLtemplate += "{south},{west},{north},{east}";
      } else {
        URLtemplate += "{west},{south},{east},{north}";
      }
      URLtemplate += "&crs=" + CRS2 + "&srs=" + CRS2;
      if (resultat.formatImage) {
        let URLtemplateImage = URLtemplate + "&format=" + resultat.formatImage.format + "&width=" + requestedSize.width + "&height=" + requestedSize.height;
        if (styleName) {
          URLtemplateImage += "&styles=" + styleName + "&style=" + styleName;
        }
        resultat.URLtemplateImage = () => URLtemplateImage;
        resultat.imageSize = requestedSize;
      }
      if (resultat.formatArray) {
        const URLtemplateArray = URLtemplate + "&format=" + resultat.formatArray.format + "&width=" + resultat.heightMapWidth + "&height=" + resultat.heightMapHeight;
        resultat.URLtemplateArray = () => URLtemplateArray;
      }
    }
    return resultat;
  }

  // src/plugin/wmtsParser.ts
  var C4 = window.Cesium;
  var { fetchXML: loadXML3 } = C4.Resource;
  async function generate3(description) {
    let resultat;
    if (description.url) {
      let urlofServer = description.url;
      const index = urlofServer.lastIndexOf("?");
      if (index > -1) {
        urlofServer = urlofServer.substring(0, index);
      }
      let urlGetCapabilities = urlofServer + "/gwc/service/wmts?REQUEST=GetCapabilities";
      if (description.proxy) {
        urlGetCapabilities = description.proxy.getURL(urlGetCapabilities);
      }
      description.xml = await loadXML3({ url: urlGetCapabilities });
      resultat = getMetaDatafromXML3(description);
    } else if (description.xml) {
      resultat = getMetaDatafromXML3(description);
    } else {
      throw new Error("either description.url or description.xml are required.");
    }
    return resultat;
  }
  function getMetaDatafromXML3(description) {
    const xml = description.xml;
    if (!(xml instanceof XMLDocument)) {
      throw new Error("xml must be a XMLDocument");
    }
    const resultat = {};
    const layerName = description.layerName;
    basicAssignResult(description, resultat);
    const maxLevel = description.maxLevel;
    const proxy = description.proxy;
    let styleName = description.styleName;
    let template = null;
    let listTileMatrixSetLinkNode = [];
    let urlKVP = null, urlRESTful = null;
    let formatImage = null;
    Array.from(xml.querySelectorAll('Operation[name="GetTile"] HTTP Get')).map((elt) => ({ node: elt, type: elt.querySelector("Value").textContent })).forEach((item) => {
      if (item.type === "RESTful" && urlRESTful === null) {
        urlRESTful = item.node.getAttribute("xlink:href");
        if (proxy) {
          urlRESTful = proxy.getURL(urlRESTful);
        }
      }
      if (item.type === "KVP" && urlKVP === null) {
        urlKVP = item.node.getAttribute("xlink:href");
        if (proxy) {
          urlKVP = proxy.getURL(urlKVP);
        }
      }
    });
    const nodeIdentifiers = xml.querySelectorAll("Contents>Layer>Identifier");
    let layerNode = null;
    for (let i = 0; i < nodeIdentifiers.length && layerNode === null; i++) {
      if (layerName === nodeIdentifiers[i].textContent) {
        layerNode = nodeIdentifiers[i].parentNode;
      }
    }
    if (layerNode !== null) {
      let defaultStyle;
      let selectedStyle;
      Array.from(layerNode.querySelectorAll("Style")).forEach((item) => {
        const style = item.querySelector("Identifier").textContent;
        if (item.getAttribute("isDefault") != null) {
          defaultStyle = style;
        }
        if (style === styleName) {
          selectedStyle = style;
        }
      });
      if (!styleName || styleName !== selectedStyle) {
        styleName = defaultStyle || "";
      }
      const nodeFormats = Array.from(layerNode.querySelectorAll("Format"));
      for (let l = 0; l < FormatImage.length && formatImage === null; l++) {
        const validFormats = nodeFormats.filter((elt) => elt.textContent === FormatImage[l].format);
        if (validFormats.length > 0) {
          formatImage = FormatImage[l];
        }
      }
      listTileMatrixSetLinkNode = Array.from(layerNode.querySelectorAll("TileMatrixSetLink"));
    }
    const nodeMatrixSetIds = Array.from(xml.querySelectorAll("TileMatrixSet>Identifier"));
    for (let a = 0; a < listTileMatrixSetLinkNode.length && !resultat.ready; a++) {
      const matrixSetLinkNode = listTileMatrixSetLinkNode[a];
      const tileMatrixSetLinkName = matrixSetLinkNode.querySelector("TileMatrixSet").textContent;
      let tileMatrixSetNode = null;
      let CRSSelected = null;
      for (let i = 0; i < nodeMatrixSetIds.length && tileMatrixSetNode === null; i++) {
        if (nodeMatrixSetIds[i].textContent === tileMatrixSetLinkName) {
          tileMatrixSetNode = nodeMatrixSetIds[i].parentNode;
        }
      }
      const supportedCRS = tileMatrixSetNode.querySelector("SupportedCRS").textContent;
      for (let n = 0; n < CRS.length && CRSSelected === null; n++) {
        if (CRS[n].supportedCRS === supportedCRS) {
          CRSSelected = CRS[n];
        }
      }
      if (CRSSelected !== null) {
        const tileSets = Array.from(tileMatrixSetNode.querySelectorAll("TileMatrix")).map(function(noeud) {
          let id = noeud.querySelector("Identifier").textContent;
          let maxWidth = parseInt(noeud.querySelector("MatrixWidth").textContent, 10);
          let maxHeight = parseInt(noeud.querySelector("MatrixHeight").textContent, 10);
          let tileWidth = parseInt(noeud.querySelector("TileWidth").textContent, 10);
          let tileHeight = parseInt(noeud.querySelector("TileHeight").textContent, 10);
          let scaleDenominator = parseFloat(noeud.querySelector("ScaleDenominator").textContent);
          return {
            id,
            maxWidth,
            maxHeight,
            scaleDenominator,
            complete: false,
            tileWidth,
            tileHeight
          };
        }).sort((a2, b) => b.scaleDenominator - a2.scaleDenominator);
        const listTileMatrixLimits = Array.from(matrixSetLinkNode.querySelectorAll("TileMatrixSetLimits>TileMatrixLimits")).map((nodeLink) => ({
          id: nodeLink.querySelector("TileMatrix").textContent,
          bbox: {
            minTileRow: parseInt(nodeLink.querySelector("MinTileRow").textContent, 10),
            maxTileRow: parseInt(nodeLink.querySelector("MaxTileRow").textContent, 10),
            minTileCol: parseInt(nodeLink.querySelector("MinTileCol").textContent, 10),
            maxTileCol: parseInt(nodeLink.querySelector("MaxTileCol").textContent, 10)
          }
        }));
        tileSets.forEach((tile) => {
          listTileMatrixLimits.forEach((nodeLink) => {
            if (tile.id === nodeLink.id) {
              tile.bbox = nodeLink.bbox;
              tile.complete = true;
            }
          });
        });
        if (tileSets.length > 0) {
          resultat.tilingScheme = new CRSSelected.tilingScheme({
            ellipsoid: CRSSelected.ellipsoid,
            numberOfLevelZeroTilesX: tileSets[0].maxWidth,
            numberOfLevelZeroTilesY: tileSets[0].maxHeight
          });
          const resourceURL = layerNode.querySelector("ResourceURL[format='" + formatImage.format + "']");
          if (resourceURL !== null) {
            template = resourceURL.getAttribute("template").replace("{TileRow}", "{y}").replace("{TileCol}", "{x}").replace("{style}", styleName).replace("{Style}", styleName).replace("{TileMatrixSet}", tileMatrixSetLinkName).replace("{layer}", layerName).replace("{infoFormatExtension}", formatImage.extension);
          } else if (urlKVP !== null) {
            template = urlKVP + "service=WMTS&request=GetTile&version=1.0.0&layer=" + layerName + "&style=" + styleName + "&format=" + formatImage.format + "&TileMatrixSet=" + tileMatrixSetLinkName + "&TileMatrix={TileMatrix}&TileRow={y}&TileCol={x}";
          }
          if (template !== null) {
            resultat.getTileDataAvailable = (x, y, level) => {
              let retour = false;
              if (level < maxLevel && level < tileSets.length) {
                const tile = tileSets[level];
                const bbox = tile.bbox;
                if (tile.complete) {
                  retour = y <= bbox.maxTileRow && y >= bbox.minTileRow && (x <= bbox.maxTileCol && x >= bbox.minTileCol);
                } else {
                  retour = x < tile.maxWidth && y < tile.maxHeight;
                }
              }
              return retour;
            };
            resultat.URLtemplateImage = function(x, y, level) {
              let retour = "";
              if (resultat.getTileDataAvailable(x, y, level)) {
                let tile = tileSets[level];
                retour = template.replace("{TileMatrix}", tile.id);
              }
              return retour;
            };
            const imageSize = {
              width: tileSets[0].tileWidth,
              height: tileSets[0].tileHeight
            };
            const checkSize = tileSets.filter((elt) => elt.tileWidth != imageSize.width || elt.tileHeight != imageSize.height);
            if (checkSize.length === 0) {
              resultat.imageSize = imageSize;
            }
            resultat.ready = true;
          }
        }
      }
    }
    return resultat;
  }

  // src/plugin/terrainProvider.ts
  var C5 = window.Cesium;
  var { fetchArrayBuffer: loadArrayBuffer, fetchImage: loadImage } = C5.Resource;
  var GeoserverTerrainProvider = class {
    errorEvent = new C5.Event();
    credit;
    tilingScheme;
    ready = false;
    hasVertexNormals = false;
    readyPromise;
    hasWaterMask;
    heightMapHeight;
    heightMapWidth;
    availability;
    constructor(result, _credit = "") {
      this.credit = new C5.Credit(_credit);
      this.tilingScheme = result.tilingScheme;
      this.getTileDataAvailable = result.getTileDataAvailable;
      this.hasWaterMask = false;
      this.heightMapHeight = result.heightMapHeight;
      this.heightMapWidth = result.heightMapWidth;
      this.availability = new C5.TileAvailability(this.tilingScheme, result.maximumLevel);
      this.getLevelMaximumGeometricError = (level) => result.levelZeroMaximumGeometricError / (1 << level);
      this.requestTileGeometry = async (x, y, level) => {
        let retour;
        const tmp = await result.GeometryCallback(x, y, level);
        const hasChildren = terrainChildrenMask(x, y, level, result);
        return new C5.HeightmapTerrainData({
          buffer: tmp,
          width: result.heightMapWidth,
          height: result.heightMapHeight,
          childTileMask: hasChildren
        });
      };
      this.ready = result.ready;
      this.readyPromise = new Promise((r) => true);
    }
    requestTileGeometry(x, y, level, request) {
      throw new Error("Method not implemented.");
    }
    getLevelMaximumGeometricError(level) {
      throw new Error("Method not implemented.");
    }
    getTileDataAvailable(x, y, level) {
      throw new Error("Method not implemented.");
    }
  };
  function terrainChildrenMask(x, y, level, resultat) {
    let mask = 0;
    let childLevel = level + 1;
    mask |= resultat.getTileDataAvailable(2 * x, 2 * y, childLevel) ? 1 : 0;
    mask |= resultat.getTileDataAvailable(2 * x + 1, 2 * y, childLevel) ? 2 : 0;
    mask |= resultat.getTileDataAvailable(2 * x, 2 * y + 1, childLevel) ? 4 : 0;
    mask |= resultat.getTileDataAvailable(2 * x + 1, 2 * y + 1, childLevel) ? 8 : 0;
    return mask;
  }

  // src/plugin/index.ts
  var C6 = window.Cesium;
  var { fetchArrayBuffer: loadArrayBuffer2, fetchImage: loadImage2 } = C6.Resource;
  async function GeoserverTerrainProvider2(description) {
    description = Object.assign(defaultDescription, description);
    let resultat;
    switch (description.service) {
      case "TMS":
        resultat = generate(description);
        break;
      case "WMTS":
        resultat = generate3(description);
        break;
      default:
        resultat = generate2(description);
    }
    const end = await resultat;
    TerrainParser(end);
    if (description.service === "WMTS") {
      return new GeoserverTerrainProvider(end);
    } else {
      return new C6.CustomHeightmapTerrainProvider({ height: end.heightMapHeight, width: end.heightMapWidth, tilingScheme: end.tilingScheme, callback: end.GeometryCallback });
    }
  }
  window.Cesium.GeoserverTerrainProvider = GeoserverTerrainProvider2;
  function TerrainParser(resultat) {
    resultat.levelZeroMaximumGeometricError = C6.TerrainProvider.getEstimatedLevelZeroGeometricErrorForAHeightmap(resultat.tilingScheme.ellipsoid, resultat.heightMapWidth, resultat.tilingScheme.getNumberOfXTilesAtLevel(0));
    if (resultat.URLtemplateImage) {
      resultat.getBufferImage = async (x, y, level) => {
        let retour = null;
        if (!isNaN(x + y + level)) {
          const urlArray = templateToURL(resultat.URLtemplateImage(x, y, level), x, y, level, resultat);
          const limitations = {
            highest: resultat.highest,
            lowest: resultat.lowest,
            offset: resultat.offset
          };
          let promise = loadImage2({ url: urlArray });
          retour = await promise.then((image) => imageToBuffer(image, limitations, {
            width: resultat.heightMapWidth,
            height: resultat.heightMapHeight
          }, resultat.hasStyledImage)).catch(() => new Int16Array(resultat.heightMapWidth * resultat.heightMapHeight));
        }
        return retour;
      };
    }
    if (resultat.URLtemplateArray) {
      resultat.getBufferArray = async (x, y, level) => {
        let retour = null;
        if (!isNaN(x + y + level)) {
          const urlArray = templateToURL(resultat.URLtemplateArray(x, y, level), x, y, level, resultat);
          const limitations = {
            highest: resultat.highest,
            lowest: resultat.lowest,
            offset: resultat.offset
          };
          let promise = loadArrayBuffer2({ url: urlArray });
          retour = await promise.then((arrayBuffer) => arrayToBuffer(arrayBuffer, limitations, {
            width: resultat.heightMapWidth,
            height: resultat.heightMapHeight
          }, resultat.formatArray)).catch(() => new Int16Array(resultat.heightMapWidth * resultat.heightMapHeight));
        }
        return retour;
      };
    }
    resultat.GeometryCallback = async (x, y, level) => {
      let retour;
      if (resultat.getBufferArray) {
        retour = await resultat.getBufferArray(x, y, level);
      } else if (resultat.getBufferImage) {
        retour = await resultat.getBufferImage(x, y, level);
      }
      return retour;
    };
  }
  function templateToURL(urlParam, x, y, level, resultat) {
    const rect = resultat.tilingScheme.tileXYToNativeRectangle(x, y, level);
    const xSpacing = (rect.east - rect.west) / (resultat.heightMapWidth - 1);
    const ySpacing = (rect.north - rect.south) / (resultat.heightMapHeight - 1);
    rect.west -= xSpacing * 0.5;
    rect.east += xSpacing * 0.5;
    rect.south -= ySpacing * 0.5;
    rect.north += ySpacing * 0.5;
    const yTiles = resultat.tilingScheme.getNumberOfYTilesAtLevel(level);
    const tmsY = yTiles - y - 1;
    return urlParam.replace("{south}", rect.south.toString()).replace("{north}", rect.north.toString()).replace("{west}", rect.west.toString()).replace("{east}", rect.east.toString()).replace("{x}", x.toString()).replace("{y}", y.toString()).replace("{tmsY}", tmsY.toString());
  }
})();
