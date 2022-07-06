import type { CustomHeightmapTerrainProvider, Ellipsoid, GeographicTilingScheme, HeightmapTerrainData, Rectangle, WebMercatorTilingScheme } from 'cesium';

const C: typeof import('cesium') = (window as any).Cesium

export type Nullable<T> = T | null;

export function intersectionRectangle(rectangle0: Rectangle, rectangle1: Rectangle): Nullable<Rectangle> {
    const west = Math.max(rectangle0.west, rectangle1.west);
    const east = Math.min(rectangle0.east, rectangle1.east);
    const south = Math.max(rectangle0.south, rectangle1.south);
    const north = Math.min(rectangle0.north, rectangle1.north);
    let resultat;
    if ((east <= west) || (south >= north)) {
        resultat = null;
    } else {
        resultat = new C.Rectangle(west, south, east, north);
    }
    return resultat;
};

export interface ICRS {
    name: string;
    ellipsoid: Ellipsoid;
    firstAxeIsLatitude: boolean;
    supportedCRS: string;
    tilingScheme: typeof GeographicTilingScheme | typeof WebMercatorTilingScheme;
}
/**
 * static array where CRS availables for OGCHelper are defined
 */
export const CRS: ICRS[] = [{
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

export function addCRS(val: ICRS) {
    CRS.push(val);
}

export interface IFormatImage {
    format: string;
    extension: string;
    terrainDataStructure?: ITerrainDataStructure;
}

/**
 * static array where image formats available for OGCHelper are
 * defined
 */
export const FormatImage: IFormatImage[] = [{
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

export function addFormatImage(val: IFormatImage) {
    FormatImage.push(val);
}
export interface ITerrainDataStructure {
    heightScale: number;
    heightOffset: number;
    elementsPerHeight: number;
    stride: number;
    elementMultiplier: number;
    isBigEndian: boolean;
    lowestEncodedHeight: number;
    highestEncodedHeight: number;
}

export interface IFormatArray {
    format: string;
    postProcessArray: (bufferIn: ArrayBuffer, size: ISize, highest: number, lowest: number, offset: number) => Int16Array | Float32Array;
    terrainDataStructure?: ITerrainDataStructure;
}

export interface ISize {
    height: number;
    width: number
}

/**
 * static array where data array availables for OGCHelper are defined
 */
export const FormatArray: IFormatArray[] = [{
    format: "image/bil",
    /**
     * bufferIn : buffer to process (switch byte order and check the data limitations)
     * size: defines the dimension of the array (size.height* size.width cells)
     * highest: defines the highest altitude (without offset) of the data.
     * lowest: defines the lowest altitude (without offset) of the data.
     * offset: defines the offset of the data in order adjust the limitations
     */
    postProcessArray: function (bufferIn, size, highest, lowest, offset) {
        let resultat = null;
        const viewerIn = new DataView(bufferIn);
        const littleEndianBuffer = new ArrayBuffer(size.height * size.width * 2);
        const viewerOut = new DataView(littleEndianBuffer);
        if (littleEndianBuffer.byteLength === bufferIn.byteLength) {
            // time to switch bytes!!
            let temp: number, goodCell = 0, somme = 0;
            for (let i = 0; i < littleEndianBuffer.byteLength; i += 2) {
                temp = viewerIn.getInt16(i, false) - offset;
                if (temp > lowest && temp < highest) {
                    viewerOut.setInt16(i, temp, true);
                    somme += temp;
                    goodCell++;
                } else {
                    const val = (goodCell === 0 ? 1 : somme / goodCell);
                    viewerOut.setInt16(i, val, true);
                }
            }
            resultat = new Int16Array(littleEndianBuffer);
        }
        return resultat;
    }
}];


export function addFormatArray(val: IFormatArray) {
    FormatArray.push(val);
}

export type TService = 'WMS' | 'TMS' | 'WMTS';

/**
 * parse wms,TMS or WMTS url from an url and a layer. request metadata information on server.
 *
 *
 * @param {String}
 *            description.layerName the name of the layer.
 * @param {String}
 *            [description.url] The URL of the server providing wms.
 * @param {String}
 *            [description.xml] the xml after requesting "getCapabilities"
 *            from web map server.
 * @param {String}
 *            [description.service] the type of service requested (WMS,TMS,WMTS). WMS is default
 *            from web map server.
 * @param {Object}
 *            [description.proxy] A proxy to use for requests. This object
 *            is expected to have a getURL function which returns the
 *            proxied URL, if needed.
 * @param {Number}
 *            [description.heightMapWidth] width  of a tile in pixels
 * @param {Number}
 *            [description.heightMapHeight] height of a tile in pixels
 * @param {Number}
 *            [description.offset] offset of the tiles (in meters)
 * @param {Number}
 *            [description.highest] highest altitude in the tiles (in meters)
 * @param {Number}
 *            [description.lowest] lowest altitude in the tiles (in meters)
 * @param {String}
 *            [description.styleName] name of the Style used for images.
 * @param {boolean}
 *            [description.hasStyledImage] indicates if the requested images are styled with SLD
 * @param {Number}
 *            [description.maxLevel] maximum level to request
 * @param {Object}
 *            [description.formatImage] see OGCHelper.FormatImage
 * @param {Object}
 *            [description.formatArray] see OGCHelper.FormatArray
 * return a promise with:
 *	- ready : boolean which indicates that the parsing didn't have issue
 *	- [URLtemplateImage]: function which takes in parameters x,y,level and return the good URL template to request an image
 *	- [URLtemplateArray]: function which takes in parameters x,y,level and return the good URL template to request an typedArray
 *	- highest: integer indicates the highest elevation of the terrain provider
 *	- lowest: integer indicates the lowest elevation of the terrain provider
 *	- offset: integer indicates the offset of the terrain
 *	- hasStyledImage: boolean indicates if the images use a style (change the offset)
 *	- heightMapWidth: integer with of the hightMapTerrain
 *	- heightMapHeight: integer height of the hightMapTerrain
 *	- getTileDataAvailable: function determines whether data for a tile is available to be loaded
 *	- tilingScheme: the tiling scheme to use
 *	- [imageSize]: {width:integer, height:integer} dimension of the requested images
 */
export interface IDescription {
    layerName: string;
    url?: string;
    xml?: XMLDocument;
    service?: TService;
    proxy?: { getURL: (val: string) => string };
    heightMapWidth?: number;
    heightMapHeight?: number;
    offset?: number;
    highest?: number;
    lowest?: number;
    styleName?: string;
    maxLevel?: number;
    formatImage?: IFormatImage;
    formatArray?: IFormatArray;
    hasStyledImage?: boolean;
}

export const defaultDescription: Partial<IDescription> = {
    service: 'WMS',
    maxLevel: 11,
    heightMapWidth: 65,
    heightMapHeight: 65,
    offset: 0,
    highest: 12000,
    lowest: -500,
    hasStyledImage: false,
};

export interface IResult {
    levelZeroMaximumGeometricError: number;
    tilingScheme: GeographicTilingScheme | WebMercatorTilingScheme;
    URLtemplateImage?: (x: number, y: number, level: number) => string;
    getHeightmapTerrainDataImage?: (x: number, y: number, level: number) => Promise<HeightmapTerrainData>;
    getBufferImage?: CustomHeightmapTerrainProvider.GeometryCallback;
    offset?: number;
    highest?: number;
    lowest?: number;
    heightMapWidth?: number;
    heightMapHeight?: number;
    hasStyledImage?: boolean;
    formatImage?: IFormatImage;
    formatArray?: IFormatArray | string;
    URLtemplateArray?: (x: number, y: number, level: number) => string;
    getHeightmapTerrainDataArray?: (x: number, y: number, level: number) => Promise<HeightmapTerrainData>;
    getBufferArray?: CustomHeightmapTerrainProvider.GeometryCallback;
    ready: boolean;
    maximumLevel: number;
    GeometryCallback: CustomHeightmapTerrainProvider.GeometryCallback;
    getTileDataAvailable: (x: number, y: number, level: number) => boolean;
    imageSize: {
        width: number,
        height: number
    };
}


export const defaultArrayTerrainDataStructure: ITerrainDataStructure = {
    heightScale: 1.0,
    heightOffset: 0,
    elementsPerHeight: 1,
    stride: 1,
    elementMultiplier: 256.0,
    isBigEndian: false,
    lowestEncodedHeight: 0,
    highestEncodedHeight: 10000
};

export function basicAssignResult(description: IDescription, resultat: Partial<IResult>) {
    resultat.heightMapWidth = description.heightMapWidth;
    resultat.heightMapHeight = description.heightMapHeight;
    resultat.ready = false;
    resultat.maximumLevel = description.maxLevel;
    resultat.levelZeroMaximumGeometricError = undefined;
    resultat.offset = description.offset;
    resultat.highest = description.highest;
    resultat.lowest = description.lowest;
    resultat.hasStyledImage = description.hasStyledImage || typeof (description.styleName) === "string";
}

export interface ILimitation {
    highest: number;
    lowest: number;
    offset: number;
}

/**
 *
 * arrayBuffer: 	the arrayBuffer to process to have a HeightmapTerrainData
 * limitations: 	object which defines highest (limitations.highest), lowest (limitations.lowest) altitudes
 * 			   	and the offset (limitations.offset) of the terrain.
 * size: 		number defining the height and width of the tile (can be a int or an object with two attributs: height and width)
 * formatArray: 	object which defines the terrainDataStructure (formatArray.terrainDataStructure) and
 * 			   	the postProcessArray (formatArray.postProcessArray)
 * childrenMask: Number defining the childrenMask
 *
 */
export function arrayToBuffer(arrayBuffer: ArrayBuffer, limitations: ILimitation, size: { width: number, height: number }, formatArray: IFormatArray) {
    return formatArray.postProcessArray(arrayBuffer, size, limitations.highest, limitations.lowest, limitations.offset);
}

/**
 *
 * image: 					the image to process to have a HeightmapTerrainData
 * limitations: 				object which defines highest (limitations.highest), lowest (limitations.lowest) altitudes
 * 			   				and the offset (limitations.offset) of the terrain. The style defined in mySLD use an offset of 32768 meters
 * size: 					number defining the height and width of the tile
 * childrenMask: 			Number defining the childrenMask
 */
export function imageToBuffer(image: HTMLImageElement, limitations: ILimitation, size: { width: number, height: number }, hasStyledImage) {
    const dataPixels: Uint8ClampedArray = C.getImagePixels(image, size.width, size.height) as any;

    const buffer = new Int16Array(dataPixels.length / 4);
    let goodCell = 0,
        somme = 0;
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
            buffer[i / 4] = (goodCell === 0 ? 0 : somme / goodCell);
            //buffer[i / 4] = 0;
        }
    }
    return buffer;
}

/**
 *
 * arrayBuffer: 	the arrayBuffer to process to have a HeightmapTerrainData
 * limitations: 	object which defines highest (limitations.highest), lowest (limitations.lowest) altitudes
 * 			   	and the offset (limitations.offset) of the terrain.
 * size: 		number defining the height and width of the tile (can be a int or an object with two attributs: height and width)
 * formatArray: 	object which defines the terrainDataStructure (formatArray.terrainDataStructure) and
 * 			   	the postProcessArray (formatArray.postProcessArray)
 * childrenMask: Number defining the childrenMask
 *
 */
export function arrayToHeightmapTerrainData(arrayBuffer: ArrayBuffer, limitations: ILimitation, size: { width: number, height: number }, formatArray: IFormatArray, childrenMask: number) {
    const heightBuffer = arrayToBuffer(arrayBuffer, limitations, size, formatArray)
    if (heightBuffer === null) { throw new Error("no good size"); }
    const optionsHeihtmapTerrainData = {
        buffer: heightBuffer,
        width: size.width,
        height: size.height,
        childTileMask: childrenMask,
        structure: formatArray.terrainDataStructure,
    };
    return new C.HeightmapTerrainData(optionsHeihtmapTerrainData);
};

/**
 *
 * image: 					the image to process to have a HeightmapTerrainData
 * limitations: 				object which defines highest (limitations.highest), lowest (limitations.lowest) altitudes
 * 			   				and the offset (limitations.offset) of the terrain. The style defined in mySLD use an offset of 32768 meters
 * size: 					number defining the height and width of the tile
 * childrenMask: 			Number defining the childrenMask
 */
export function imageToHeightmapTerrainData(image: HTMLImageElement, limitations: ILimitation, size: { width: number, height: number }, childrenMask: number, hasStyledImage) {
    const buffer = imageToBuffer(image, limitations, size, hasStyledImage);
    const optionsHeihtmapTerrainData = {
        buffer: buffer,
        width: size.width,
        height: size.height,
        childTileMask: childrenMask,
        structure: {
            heightScale: 1.0,
            heightOffset: 0.0,
            elementsPerHeight: 1,
            stride: 1,
            elementMultiplier: 256.0,
            isBigEndian: false
        },
    };
    return new C.HeightmapTerrainData(optionsHeihtmapTerrainData);
};
