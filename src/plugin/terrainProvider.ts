import type { Credit, Event, HeightmapTerrainData, Request, TerrainData, TerrainProvider, TileAvailability, TilingScheme } from "cesium";
import type { IResult } from "./utils";
const C: typeof import('cesium') = (window as any).Cesium
const { fetchArrayBuffer: loadArrayBuffer, fetchImage: loadImage } = C.Resource;


export class GeoserverTerrainProvider {
    errorEvent: Event<TerrainProvider.ErrorEvent> = new (C.Event)();
    credit: Credit;
    tilingScheme: TilingScheme;
    ready: boolean = false;
    hasVertexNormals: boolean = false;
    readyPromise: Promise<boolean>;
    hasWaterMask: boolean;
    heightMapHeight: number;
    heightMapWidth: number;
    availability: TileAvailability;

    public constructor(result: IResult, _credit: string = '') {
        this.credit = new C.Credit(_credit);
        this.tilingScheme = result.tilingScheme;
        this.getTileDataAvailable = result.getTileDataAvailable;
        this.hasWaterMask = false;
        this.heightMapHeight = result.heightMapHeight;
        this.heightMapWidth = result.heightMapWidth;
        this.availability = new C.TileAvailability(this.tilingScheme, result.maximumLevel);
        this.getLevelMaximumGeometricError = (level) => result.levelZeroMaximumGeometricError / (1 << level);

        this.requestTileGeometry = async (x, y, level) => {
            let retour: HeightmapTerrainData;
            const tmp = await result.GeometryCallback(x, y, level);

            const hasChildren = terrainChildrenMask(x, y, level, result);
            return new C.HeightmapTerrainData({
                buffer: tmp as Int16Array,
                width: result.heightMapWidth,
                height: result.heightMapHeight,
                childTileMask: hasChildren,
                // structure: resultat.formatImage.terrainDataStructure
            });
        }
        this.ready = result.ready;
        this.readyPromise = new Promise(r => true);
    }

    requestTileGeometry(x: number, y: number, level: number, request?: Request): Promise<TerrainData> | undefined {
        throw new Error("Method not implemented.");
    }
    getLevelMaximumGeometricError(level: number): number {
        throw new Error("Method not implemented.");
    }
    getTileDataAvailable(x: number, y: number, level: number): boolean {
        throw new Error("Method not implemented.");
    }
    loadTileDataAvailability(x: number, y: number, level: number): Promise<void> | undefined {
        throw new Error("Method not implemented.");
    }
}


function terrainChildrenMask(x: number, y: number, level: number, resultat: IResult) {
    let mask = 0;
    let childLevel = level + 1;
    mask |= resultat.getTileDataAvailable(2 * x, 2 * y, childLevel) ? 1 : 0;
    mask |= resultat.getTileDataAvailable(2 * x + 1, 2 * y, childLevel) ? 2 : 0;
    mask |= resultat.getTileDataAvailable(2 * x, 2 * y + 1, childLevel) ? 4 : 0;
    mask |= resultat.getTileDataAvailable(2 * x + 1, 2 * y + 1, childLevel) ? 8 : 0;
    return mask;
}