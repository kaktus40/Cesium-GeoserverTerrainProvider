import { Resource } from "cesium";
import { basicAssignResult, CRS, FormatImage } from "./utils";
import type { ICRS, IDescription, IFormatImage, IResult } from "./utils";
const { fetchXML: loadXML } = Resource;

export async function generate(description: IDescription) {
    let resultat: IResult;
    if (description.url) {
        let urlofServer = description.url;
        const index = urlofServer.lastIndexOf("?");
        if (index > -1) urlofServer = urlofServer.substring(0, index);
        let urlGetCapabilities = urlofServer +
            "/gwc/service/wmts?REQUEST=GetCapabilities";
        if (description.proxy) {
            urlGetCapabilities = description.proxy.getURL(urlGetCapabilities);
        }

        console.log(urlGetCapabilities);
        description.xml = await loadXML({ url: urlGetCapabilities });
        resultat = getMetaDatafromXML(description);
    } else if (description.xml) {
        resultat = getMetaDatafromXML(description);
    } else {
        throw new Error(
            "either description.url or description.xml are required.",
        );
    }
    return resultat;
}

function getMetaDatafromXML(description: IDescription): IResult {
    const xml = description.xml;
    if (!(xml instanceof XMLDocument)) {
        throw new Error("xml must be a XMLDocument");
    }

    const resultat: Partial<IResult> = {};
    const layerName = description.layerName!;
    basicAssignResult(description, resultat);
    const maxLevel = description.maxLevel!;
    const proxy = description.proxy;
    let styleName = description.styleName!;
    let template: string = null!;
    let listTileMatrixSetLinkNode: Element[] = [];

    let urlKVP: string = null!, urlRESTful: string = null!;
    let formatImage: IFormatImage = null!;
    //KVP support for now

    Array.from(xml.querySelectorAll('Operation[name="GetTile"] HTTP Get'))
        .map((elt) => ({
            node: elt,
            type: elt.querySelector("Value")!.textContent,
        }))
        .forEach((item) => {
            if (item.type === "RESTful" && urlRESTful === null) {
                urlRESTful = item.node.getAttribute("xlink:href")!;
                if (proxy) urlRESTful = proxy.getURL(urlRESTful);
            }
            if (item.type === "KVP" && urlKVP === null) {
                urlKVP = item.node.getAttribute("xlink:href")!;
                if (proxy) urlKVP = proxy.getURL(urlKVP);
            }
        });

    const nodeIdentifiers = xml.querySelectorAll("Contents>Layer>Identifier");
    let layerNode: ParentNode = null!;
    for (let i = 0; i < nodeIdentifiers.length && layerNode === null; i++) {
        if (layerName === nodeIdentifiers[i].textContent) {
            layerNode = nodeIdentifiers[i].parentNode!;
        }
    }

    if (layerNode !== null) {
        //optionality of style in geoserver is not compliant with OGC requirements!!
        let defaultStyle: string = null!;
        let selectedStyle: string = null!;
        Array.from(layerNode.querySelectorAll("Style")).forEach((item) => {
            const style = item.querySelector("Identifier")!.textContent;
            if (item.getAttribute("isDefault") != null) defaultStyle = style!;
            if (style === styleName) selectedStyle = style;
        });
        //Work with attribute isDefault when no style was defined!!
        if (!styleName || styleName !== selectedStyle) {
            styleName = defaultStyle || "";
        }

        //format
        const nodeFormats = Array.from(layerNode.querySelectorAll("Format"));
        for (let l = 0; l < FormatImage.length && formatImage === null; l++) {
            const validFormats = nodeFormats.filter((elt) =>
                elt.textContent === FormatImage[l].format
            );
            if (validFormats.length > 0) formatImage = FormatImage[l];
        }
        //TileMatrixSetLink =>TileMatrixSet
        listTileMatrixSetLinkNode = Array.from(
            layerNode.querySelectorAll("TileMatrixSetLink"),
        );
    }

    const nodeMatrixSetIds = Array.from(
        xml.querySelectorAll("TileMatrixSet>Identifier"),
    );
    for (
        let a = 0; a < listTileMatrixSetLinkNode.length && !resultat.ready; a++
    ) {
        const matrixSetLinkNode = listTileMatrixSetLinkNode[a];
        const tileMatrixSetLinkName = matrixSetLinkNode.querySelector(
            "TileMatrixSet",
        )!.textContent!;
        let tileMatrixSetNode: ParentNode = null!;
        let CRSSelected: ICRS = null!;

        for (
            let i = 0;
            i < nodeMatrixSetIds.length && tileMatrixSetNode === null;
            i++
        ) {
            if (nodeMatrixSetIds[i].textContent === tileMatrixSetLinkName) {
                tileMatrixSetNode = nodeMatrixSetIds[i].parentNode!;
            }
        }

        const supportedCRS =
            tileMatrixSetNode.querySelector("SupportedCRS")!.textContent;
        for (let n = 0; n < CRS.length && CRSSelected === null; n++) {
            if (CRS[n].supportedCRS === supportedCRS) CRSSelected = CRS[n];
        }

        if (CRSSelected !== null) {
            const tileSets: {
                id: string;
                maxWidth: number;
                maxHeight: number;
                scaleDenominator: number;
                complete: boolean;
                tileWidth: number;
                tileHeight: number;
                bbox?: {
                    minTileRow: number;
                    maxTileRow: number;
                    minTileCol: number;
                    maxTileCol: number;
                };
            }[] = Array.from(tileMatrixSetNode.querySelectorAll("TileMatrix"))
                .map(function (noeud) {
                    let id = noeud.querySelector("Identifier")!.textContent!;
                    let maxWidth = parseInt(
                        noeud.querySelector("MatrixWidth")!.textContent!,
                        10,
                    );
                    let maxHeight = parseInt(
                        noeud.querySelector("MatrixHeight")!.textContent!,
                        10,
                    );
                    let tileWidth = parseInt(
                        noeud.querySelector("TileWidth")!.textContent!,
                        10,
                    );
                    let tileHeight = parseInt(
                        noeud.querySelector("TileHeight")!.textContent!,
                        10,
                    );
                    let scaleDenominator = parseFloat(
                        noeud.querySelector("ScaleDenominator")!.textContent!,
                    );
                    return {
                        id,
                        maxWidth,
                        maxHeight,
                        scaleDenominator,
                        complete: false,
                        tileWidth,
                        tileHeight,
                    };
                })
                .sort((a, b) => b.scaleDenominator - a.scaleDenominator);

            const listTileMatrixLimits = Array.from(
                matrixSetLinkNode.querySelectorAll(
                    "TileMatrixSetLimits>TileMatrixLimits",
                ),
            )
                .map((nodeLink) => ({
                    id: nodeLink.querySelector("TileMatrix")!.textContent!,
                    bbox: {
                        minTileRow: parseInt(
                            nodeLink.querySelector("MinTileRow")!.textContent!,
                            10,
                        ),
                        maxTileRow: parseInt(
                            nodeLink.querySelector("MaxTileRow")!.textContent!,
                            10,
                        ),
                        minTileCol: parseInt(
                            nodeLink.querySelector("MinTileCol")!.textContent!,
                            10,
                        ),
                        maxTileCol: parseInt(
                            nodeLink.querySelector("MaxTileCol")!.textContent!,
                            10,
                        ),
                    },
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
                    numberOfLevelZeroTilesY: tileSets[0].maxHeight,
                });
                const resourceURL = layerNode.querySelector(
                    "ResourceURL[format='" + formatImage.format + "']",
                );

                if (resourceURL !== null) {
                    template = resourceURL.getAttribute("template")!.replace(
                        "{TileRow}",
                        "{y}",
                    ).replace("{TileCol}", "{x}").replace("{style}", styleName)
                        .replace("{Style}", styleName)
                        .replace("{TileMatrixSet}", tileMatrixSetLinkName)
                        .replace("{layer}", layerName).replace(
                            "{infoFormatExtension}",
                            formatImage.extension,
                        );
                } else if (urlKVP !== null) {
                    template = urlKVP +
                        "service=WMTS&request=GetTile&version=1.0.0&layer=" +
                        layerName + "&style=" + styleName + "&format=" +
                        formatImage.format + "&TileMatrixSet=" +
                        tileMatrixSetLinkName +
                        "&TileMatrix={TileMatrix}&TileRow={y}&TileCol={x}";
                }

                if (template !== null) {
                    resultat.getTileDataAvailable = (x, y, level) => {
                        let retour = false;
                        if (level < maxLevel && level < tileSets.length) {
                            const tile = tileSets[level];
                            const bbox = tile.bbox!;
                            if (tile.complete) {
                                retour =
                                    (y <= bbox.maxTileRow &&
                                        y >= bbox.minTileRow) &&
                                    (x <= bbox.maxTileCol &&
                                        x >= bbox.minTileCol);
                            } else {
                                retour = x < tile.maxWidth &&
                                    y < tile.maxHeight;
                            }
                        }
                        return retour;
                    };
                    resultat.URLtemplateImage = function (x, y, level) {
                        let retour = "";
                        if (resultat.getTileDataAvailable!(x, y, level)) {
                            let tile = tileSets[level];
                            retour = template.replace("{TileMatrix}", tile.id);
                        }
                        return retour;
                    };

                    const imageSize = {
                        width: tileSets[0].tileWidth,
                        height: tileSets[0].tileHeight,
                    };
                    const checkSize = tileSets.filter((elt) =>
                        elt.tileWidth != imageSize.width ||
                        elt.tileHeight != imageSize.height
                    );
                    if (checkSize.length === 0) {
                        resultat.imageSize = imageSize;
                    }
                    resultat.ready = true;
                }
            }
        }
    }

    return resultat as IResult;
}
