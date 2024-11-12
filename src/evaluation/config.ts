import type { WebMapServiceImageryProvider } from "cesium";
import type { IDescription } from "../plugin/utils";

export interface IConfiguration {
    terrains: { [name: string]: IDescription };
    images: { [name: string]: WebMapServiceImageryProvider.ConstructorOptions };
}
export const conf: IConfiguration = {
    terrains: {
        "WMS+Bil": {
            "url": "http://localhost:9999/geoserver",
            "layerName": "elevation:bil",
            "heightMapWidth": 65,
            "maxLevel": 12,
            "service": "WMS"
        },
        "WMS+Style": {
            "url": "http://localhost:9999/geoserver",
            "layerName": "elevation:bil",
            "heightMapWidth": 65,
            "styleName": "mySLD",
            "maxLevel": 12,
            "service": "WMS"
        },
     /*   "WMS+Colored": {
            "url": "http://localhost:9999/geoserver/",
            "layerName": "elevation:colored",
            "heightMapWidth": 65,
            "maxLevel": 12,
            "service": "WMS"
        },
        "TMS+Style": {
            "url": "http://localhost:9999/geoserver/",
            "layerName": "SRTM90",
            "heightMapWidth": 65,
            "styleName": "mySLD",
            "maxLevel": 12,
            "service": "TMS"
        },
        "TMS+Colored": {
            "url": "http://localhost:9999/geoserver/",
            "layerName": "colored",
            "heightMapWidth": 65,
            "maxLevel": 12,
            "service": "TMS"
        },*/
        "WMTS+Style": {
            "url": "http://localhost:9999/geoserver",
            "layerName": "elevation:bil",
            "heightMapWidth": 65,
            "styleName": "elevation:mySLD",
            "maxLevel": 12,
            "service": "WMTS"
        },
      /*  "WMTS+Colored": {
            "url": "http://localhost:9999/geoserver/",
            "layerName": "elevation:colored",
            "heightMapWidth": 65,
            "maxLevel": 12,
            "service": "WMTS"
        }*/
    },
    "images": {
        "main": {
            "url": "http://localhost:9999/geoserver/ows",
            "parameters": {
                "format": "image/png",
                "transparent": true
            },
            "layers": "raster:naturalEarthPyramid",
            "maximumLevel": 15
        }
    }
}
