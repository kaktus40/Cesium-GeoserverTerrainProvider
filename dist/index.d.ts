import { Credit } from 'cesium';
import { CustomHeightmapTerrainProvider } from 'cesium';
import { Event as Event_2 } from 'cesium';
import { GeographicTilingScheme } from 'cesium';
import { HeightmapTerrainData } from 'cesium';
import { Request as Request_2 } from 'cesium';
import { TerrainData } from 'cesium';
import { TerrainProvider } from 'cesium';
import { TileAvailability } from 'cesium';
import { TilingScheme } from 'cesium';
import { WebMercatorTilingScheme } from 'cesium';

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
 *            [description.proxy] A proxy to use for requests. custom object
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
 * return a promise of GeoserverTerrainProvider:
 */
declare function GeoserverTerrainProvider(description: IDescription): Promise<GeoserverTerrainProvider_2 | CustomHeightmapTerrainProvider>;
export default GeoserverTerrainProvider;

declare class GeoserverTerrainProvider_2 {
    errorEvent: Event_2<TerrainProvider.ErrorEvent>;
    credit: Credit;
    tilingScheme: TilingScheme;
    ready: boolean;
    hasVertexNormals: boolean;
    readyPromise: Promise<boolean>;
    hasWaterMask: boolean;
    heightMapHeight: number;
    heightMapWidth: number;
    availability: TileAvailability;
    constructor(result: IResult, _credit?: string);
    requestTileGeometry(x: number, y: number, level: number, request?: Request_2): Promise<TerrainData> | undefined;
    getLevelMaximumGeometricError(level: number): number;
    getTileDataAvailable(x: number, y: number, level: number): boolean;
    loadTileDataAvailability(x: number, y: number, level: number): Promise<void> | undefined;
}

/**
 * parse wms,TMS or WMTS url from an url and a layer. request metadata information on server.
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
 * 	- ready : boolean which indicates that the parsing didn't have issue
 * 	- [URLtemplateImage]: function which takes in parameters x,y,level and return the good URL template to request an image
 * 	- [URLtemplateArray]: function which takes in parameters x,y,level and return the good URL template to request an typedArray
 * 	- highest: integer indicates the highest elevation of the terrain provider
 * 	- lowest: integer indicates the lowest elevation of the terrain provider
 * 	- offset: integer indicates the offset of the terrain
 * 	- hasStyledImage: boolean indicates if the images use a style (change the offset)
 * 	- heightMapWidth: integer with of the hightMapTerrain
 * 	- heightMapHeight: integer height of the hightMapTerrain
 * 	- getTileDataAvailable: function determines whether data for a tile is available to be loaded
 * 	- tilingScheme: the tiling scheme to use
 * 	- [imageSize]: {width:integer, height:integer} dimension of the requested images
 */
declare interface IDescription {
    layerName: string;
    url?: string;
    xml?: XMLDocument;
    service?: TService;
    proxy?: {
        getURL: (val: string) => string;
    };
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

declare interface IFormatArray {
    format: string;
    postProcessArray: (bufferIn: ArrayBuffer, size: ISize, highest: number, lowest: number, offset: number) => Int16Array | Float32Array;
    terrainDataStructure?: ITerrainDataStructure;
}

declare interface IFormatImage {
    format: string;
    extension: string;
    terrainDataStructure?: ITerrainDataStructure;
}

declare interface IResult {
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
        width: number;
        height: number;
    };
}

declare interface ISize {
    height: number;
    width: number;
}

declare interface ITerrainDataStructure {
    heightScale: number;
    heightOffset: number;
    elementsPerHeight: number;
    stride: number;
    elementMultiplier: number;
    isBigEndian: boolean;
    lowestEncodedHeight: number;
    highestEncodedHeight: number;
}

export declare function TerrainParser(resultat: IResult): void;

declare type TService = "WMS" | "TMS" | "WMTS";

export { }
