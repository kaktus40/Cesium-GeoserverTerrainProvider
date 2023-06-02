import { basicAssignResult, CRS, FormatImage, type IDescription, intersectionRectangle, type IResult } from "./utils";
const C: typeof import('cesium') = (window as any).Cesium
const { fetchXML: loadXML } = C.Resource;

export async function generate(description: IDescription) {
    let resultat: IResult;
    if (description.url) {
        description.xml = await loadXML({ url: description.url + '/gwc/service/tms/1.0.0' });
        resultat = await parseXML(description);
    } else if (description.xml) {
        resultat = await parseXML(description);
    } else {
        throw new Error('either description.url or description.xml are required.');
    }
    return resultat;
};

async function parseXML(description: IDescription) {
    const xml = description.xml;
    if (!(xml instanceof XMLDocument)) { throw new Error('xml must be a XMLDocument'); }
    let resultat: IResult;
    //description of a tile map service or of a tile map?
    if (xml.querySelector("TileMapService") !== null) {
        if (!description.layerName) { throw new Error('layerName is required.'); }
        const promises = Array.from(xml.querySelectorAll("TileMap[title='" + description.layerName + "']")).map(elt => {
            let url = elt.getAttribute("href");
            if (description.proxy) {
                url = description.proxy.getURL(url);
            }
            return loadXML({ url }).then(xml => { description.xml = xml; return getMetaDatafromXML(description) });
        });

        resultat = await Promise.race(promises);
    } else {
        resultat = getMetaDatafromXML(description);
    }
    return resultat;
};

function getMetaDatafromXML(description: IDescription): IResult {
    const xml = description.xml;

    let resultat: Partial<IResult> = {};

    basicAssignResult(description, resultat);
    const maxLevel = description.maxLevel;
    const proxy = description.proxy;

    const srs = xml.querySelector("SRS").textContent;
    const selectedCRS = CRS.find(elt => elt.name === srs);
    if (selectedCRS) { resultat.tilingScheme = new selectedCRS.tilingScheme({ ellipsoid: selectedCRS.ellipsoid }); }

    const format = xml.querySelector("TileFormat");
    const selectedFormatImage = FormatImage.find(elt => elt.extension == format.getAttribute("extension"));
    if (selectedFormatImage) {
        resultat.formatImage = selectedFormatImage;
        resultat.imageSize = {
            width: parseInt(format.getAttribute("width"), 10),
            height: parseInt(format.getAttribute("height"), 10)
        };
    }

    const tilsetsNode = Array.from(xml.querySelectorAll("TileSets>TileSet"));
    let tileSets: {
        url: string,
        level: number
    }[] = [];

    if (resultat.formatImage) {
        tileSets = tilsetsNode.map(function (tileSet) {
            let url = tileSet.getAttribute("href") + "/{x}/{tmsY}." + resultat.formatImage.extension;
            if (proxy) {
                url = proxy.getURL(url);
            }
            const level = parseInt(tileSet.getAttribute("order"));
            return {
                url: url,
                level: level
            };
        });
        tileSets.sort((a, b) => a.level - b.level);
    }

    if (tileSets.length === 0 || !resultat.formatImage || !resultat.tilingScheme) {
        throw new Error('no tilesets, no formatImage and no formatArray');
    }
    resultat.URLtemplateImage = function (x, y, level) {
        let retour = "";
        if (level < tileSets.length) {
            retour = tileSets[level].url;
        }
        return retour;
    }
    const boundingBoxNode = xml.querySelector("BoundingBox");
    const miny = parseFloat(boundingBoxNode.getAttribute("miny"));
    const maxy = parseFloat(boundingBoxNode.getAttribute("maxy"));
    const minx = parseFloat(boundingBoxNode.getAttribute("minx"));
    const maxx = parseFloat(boundingBoxNode.getAttribute("maxx"));
    const limites = new C.Rectangle(minx, miny, maxx, maxy);
    resultat.getTileDataAvailable = function (x, y, level) {
        const rect = resultat.tilingScheme.tileXYToNativeRectangle(x, y, level);
        const scratchRectangle = intersectionRectangle(limites, rect);
        return scratchRectangle !== null && level < maxLevel && level < tileSets.length;
    }
    resultat.ready = true;
    return resultat as IResult;
};