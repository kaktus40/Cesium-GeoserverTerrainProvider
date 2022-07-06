import { defaultArrayTerrainDataStructure, FormatArray, FormatImage, IDescription, IResult, CRS as CRSTab, intersectionRectangle, basicAssignResult, IFormatArray } from "./utils";
const C: typeof import('cesium') = (window as any).Cesium
const { fetchXML: loadXML } = C.Resource;

export async function generate(description: IDescription) {
    let resultat: IResult;
    if (description.url) {
        let urlofServer = description.url;
        let index = urlofServer.lastIndexOf("?");
        if (index > -1) {
            urlofServer = urlofServer.substring(0, index);
        }
        let urlGetCapabilities = urlofServer +
            '/ows?SERVICE=WMS&REQUEST=GetCapabilities&tiled=true';
        console.log(urlGetCapabilities);
        if (description.proxy) { urlGetCapabilities = description.proxy.getURL(urlGetCapabilities); }
        description.xml = await loadXML({ url: urlGetCapabilities });
        resultat = getMetaDatafromXML(description);
    } else if (description.xml) { resultat = getMetaDatafromXML(description); }
    else { throw new Error('either description.url or description.xml are required.'); }
    return resultat;
};

function getMetaDatafromXML(description: IDescription): IResult {
    if (!(description.xml instanceof XMLDocument)) { throw new Error('xml must be a XMLDocument'); }
    // get version of wms 1.1.X or 1.3.X=> for 1.3 use firstAxe for order of
    // CRS
    if (!description.layerName) { throw new Error('description.layerName is required.'); }
    const xml = description.xml;

    const resultat: Partial<IResult> = {};
    const layerName = description.layerName;
    const maxLevel = description.maxLevel;
    let version: string = null;
    const requestedSize = {
        width: 65,
        height: 65
    };
    let CRS: string = undefined;
    basicAssignResult(description, resultat);
    resultat.formatImage = description.formatImage;
    resultat.formatArray = description.formatArray;
    resultat.tilingScheme = undefined;
    let firstAxeIsLatitude: boolean = undefined;
    let isNewVersion: boolean = undefined;
    let styleName = description.styleName;
    // get version
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

    // get list of map format
    const nodeFormats = Array.from(xml.querySelectorAll("Request>GetMap>Format")).map(node => node.textContent);

    for (let j = 0; j < nodeFormats.length; j++) {
        if (!resultat.formatImage) resultat.formatImage = FormatImage.find(elt => elt.format === nodeFormats[j]);
        if (!resultat.formatArray) resultat.formatArray = FormatArray.find(elt => elt.format === nodeFormats[j]);
    }

    if (resultat.formatArray && typeof (resultat.formatArray.format) === "string" && typeof (resultat.formatArray.postProcessArray) === "function") {
        resultat.formatArray.terrainDataStructure = Object.assign({}, defaultArrayTerrainDataStructure);
    } else {
        delete resultat.formatArray;
    }

    // a formatImage should always exist !!
    if (!resultat.formatImage || typeof (resultat.formatImage.format) !== "string") {
        resultat.formatImage = undefined;
    }

    const layerNodes = xml
        .querySelectorAll("Layer[queryable='1'],Layer[queryable='true']");
    let layerNode: Element = null;
    for (let m = 0; m < layerNodes.length && layerNode === null; m++) {
        if (layerNodes[m].querySelector("Name").textContent === layerName) {
            layerNode = layerNodes[m];
            let fixedHeight: string | number = layerNode.getAttribute("fixedHeight");
            let fixedWidth: string | number = layerNode.getAttribute("fixedWidth");
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
        for (let n = 0; n < CRSTab.length && !found; n++) {
            const CRSSelected = CRSTab[n];
            const referentialName = CRSSelected.name;
            const nodeBBox = layerNode.querySelector("BoundingBox[SRS='" +
                referentialName + "'],BoundingBox[CRS='" +
                referentialName + "']");

            if (nodeBBox !== null) {
                CRS = referentialName;
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
                const rectReference = new C.Rectangle(west, south, east, north);
                resultat.getTileDataAvailable = function (x, y, level) {
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
        // style défini et existant?
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
        //changer resolution height et width si existence de tileset dans le xml!!
        const tileSets = xml.querySelectorAll("VendorSpecificCapabilities>TileSet");
        let out = false;
        for (let q = 0; q < tileSets.length && !out; q++) {
            const isGoodSRS = tileSets[q].querySelector("BoundingBox[SRS='" +
                CRS + "'],BoundingBox[CRS='" +
                CRS + "']") !== null;
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
        let URLtemplate = url + '?SERVICE=WMS&REQUEST=GetMap&layers=' + layerName + '&version=' + version + '&bbox=';
        if (isNewVersion && firstAxeIsLatitude) {
            URLtemplate += '{south},{west},{north},{east}';
        } else {
            URLtemplate += '{west},{south},{east},{north}';
        }
        URLtemplate += '&crs=' + CRS + '&srs=' + CRS;

        if (resultat.formatImage) {
            let URLtemplateImage = URLtemplate + '&format=' + resultat.formatImage.format + '&width=' + requestedSize.width + '&height=' + requestedSize.height;
            if (styleName) {
                URLtemplateImage += "&styles=" + styleName + "&style=" + styleName;
            }
            resultat.URLtemplateImage = () => URLtemplateImage;
            resultat.imageSize = requestedSize;
        }

        if (resultat.formatArray) {
            const URLtemplateArray = URLtemplate + '&format=' + (resultat.formatArray as IFormatArray).format + '&width=' +
                resultat.heightMapWidth + '&height=' + resultat.heightMapHeight;
            resultat.URLtemplateArray = () => URLtemplateArray;
        }
    }
    return resultat as IResult;
};