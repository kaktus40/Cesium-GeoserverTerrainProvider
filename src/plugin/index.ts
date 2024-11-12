import { arrayToBuffer, defaultDescription,  imageToBuffer } from './utils';
import type {IDescription,  IFormatArray,  IResult, Nullable } from './utils';
import { generate as tmsParser } from './tmsParser';
import { generate as wmsParser } from './wmsParser';
import { generate as wmtsParser } from './wmtsParser';
import { GeoserverTerrainProvider as provider } from './terrainProvider';
import { CustomHeightmapTerrainProvider, Resource, TerrainProvider } from 'cesium';

const { fetchArrayBuffer: loadArrayBuffer, fetchImage: loadImage } = Resource;
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
export default async function GeoserverTerrainProvider(description: IDescription) {
    description = Object.assign(defaultDescription, description);
    let resultat: Promise<IResult>;
    switch (description.service) {
        case "TMS":
            resultat = tmsParser(description);
            break;
        case "WMTS":
            resultat = wmtsParser(description);
            break;
        default:
            resultat = wmsParser(description);
    }
    const end = await resultat;
 
    TerrainParser(end);
    if (description.service === 'WMTS') {
        return new provider(end);
    } else {
        return new CustomHeightmapTerrainProvider({ height: end.heightMapHeight!, width: end.heightMapWidth!, tilingScheme: end.tilingScheme, callback: end.GeometryCallback });
    }
}

(window as any).Cesium.GeoserverTerrainProvider = GeoserverTerrainProvider;


export function TerrainParser(resultat: IResult) {

    resultat.levelZeroMaximumGeometricError = TerrainProvider.getEstimatedLevelZeroGeometricErrorForAHeightmap(
        resultat.tilingScheme.ellipsoid, resultat.heightMapWidth!,
        resultat.tilingScheme.getNumberOfXTilesAtLevel(0));
    if (resultat.URLtemplateImage) {
        resultat.getBufferImage = async (x, y, level) => {
            let retour: Nullable<Int16Array> = null;
            if (!isNaN(x + y + level)) {
                const urlArray = templateToURL(resultat.URLtemplateImage!(x, y, level), x, y, level, resultat);
                const limitations = {
                    highest: resultat.highest!,
                    lowest: resultat.lowest!,
                    offset: resultat.offset!
                };
                let promise = loadImage({ url: urlArray })!;
                retour = await promise.then((image) => imageToBuffer(image as HTMLImageElement, limitations, {
                    width: resultat.heightMapWidth!,
                    height: resultat.heightMapHeight!
                }, resultat.hasStyledImage!))
                    .catch(() => new Int16Array(resultat.heightMapWidth! * resultat.heightMapHeight!));
            }
            return retour!;
        };
    }

    if (resultat.URLtemplateArray) {
        resultat.getBufferArray = async (x, y, level) => {
            let retour: Nullable<Int16Array | Float32Array> = null;
            if (!isNaN(x + y + level)) {
                const urlArray = templateToURL(resultat.URLtemplateArray!(x, y, level), x, y, level, resultat);
                const limitations = {
                    highest: resultat.highest!,
                    lowest: resultat.lowest!,
                    offset: resultat.offset!
                };

                let promise = loadArrayBuffer({ url: urlArray })!;
                retour = await promise.then((arrayBuffer) => arrayToBuffer(arrayBuffer, limitations, {
                    width: resultat.heightMapWidth!,
                    height: resultat.heightMapHeight!
                }, resultat.formatArray as IFormatArray))
                    .catch(() => new Int16Array(resultat.heightMapWidth! * resultat.heightMapHeight!));
            }
            return retour!;
        };
    }


    resultat.GeometryCallback = async (x: number, y: number, level: number) => {
        let retour: Nullable<Int16Array | Float32Array>;
        if (resultat.getBufferArray) {
            retour = await resultat.getBufferArray(x, y, level) as Int16Array | Float32Array;
        } else if (resultat.getBufferImage) {
            retour = await resultat.getBufferImage(x, y, level) as Int16Array | Float32Array;
        }
        return retour!;
    }
}

function templateToURL(urlParam: string, x: number, y: number, level: number, resultat: IResult) {
    const rect = resultat.tilingScheme.tileXYToNativeRectangle(x, y, level);
    const xSpacing = (rect.east - rect.west) / (resultat.heightMapWidth! - 1);
    const ySpacing = (rect.north - rect.south) / (resultat.heightMapHeight! - 1);
    rect.west -= xSpacing * 0.5;
    rect.east += xSpacing * 0.5;
    rect.south -= ySpacing * 0.5;
    rect.north += ySpacing * 0.5;

    const yTiles = resultat.tilingScheme.getNumberOfYTilesAtLevel(level);
    const tmsY = (yTiles - y - 1);

    return urlParam.replace("{south}", rect.south.toString()).replace("{north}", rect.north.toString()).replace("{west}", rect.west.toString())
        .replace("{east}", rect.east.toString()).replace("{x}", x.toString()).replace("{y}", y.toString()).replace("{tmsY}", tmsY.toString());
}