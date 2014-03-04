cesium-GeoserverTerrainProvider
================

GeoserverTerrainProvider: A terrain provider which works with geoserver providing elevation datas in bil, png, gif and jpeg formats. The bil format sholud be favour. 

#Cesium version 
Tested against b26 and geoserver 2.4.4.

License: Apache 2.0. Free for commercial and non-commercial use. See LICENSE.md.

#Usage

- Optional: import mySLD.xml as a new style in geoserver to render your layer (16 bit grayscale) in other color range.
- Import the GeoserverTerrainProvider.js file into your html codes after importing Cesium.js.
- Create a new instance of GeoserverTerrainProvider with url of your geoserver and name of elevation layer.
- It's possible to get altitude of a cartographic point with getHeight method.

After that, the GeoserverTerrainProvider will determine the capabilities of geoserver (WMS request getCapabilities) and will be ready to provide terrain data.

#Example

    <script src="/path/to/Cesium.js" type="text/javascript"></script>
    <script src="/path/to/GeoserverTerrainProvider.js" type="text/javascript"></script>
    <body>
	<canvas id="cesiumContainer"></canvas>
	<script>
		var canvas = document.getElementById('@conteneurCesium');
		var scene = new Cesium.Scene(canvas);
		var primitives = scene.getPrimitives();
		var centralBody = new Cesium.CentralBody(Cesium.Ellipsoid.WGS84);
		primitives.setCentralBody(centralBody);
		var terrainProvider = new Cesium.GeoserverTerrainProvider({
	        url : "http://localhost:8080/geoserver/elevation/wms",
	        layerName: "SRTM90",
	        heightmapWidth:64,
	        styleName:"grayToColor",
	        tagAltitudeProperty:"GRAY_INDEX",
	        waterMask:true
	    });
	  centralBody.terrainProvider = terrainProvider; 
	  var hand = new Cesium.ScreenSpaceEventHandler(canvas);
      hand.setInputAction(
    	            function (movement) {
    	            	if(movement.position != null) {
    	                    var cartesian = scene.getCamera().controller.pickEllipsoid(movement.position, ellipsoid);
    	                    if (cartesian) {
    	                    	var cartographic = ellipsoid.cartesianToCartographic(cartesian);
    	                    	terrainProvider.getHeight(cartographic,function(height){
    	                    		
    	                    		console.log("lat= "+(cartographic.latitude*180/Math.PI)+"°; long="+(cartographic.longitude*180/Math.PI)+"°; altitude="+height+"meters");});
    	                    }
    	                }
    	            }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
	</script>
    </body>
Where
- "http://localhost:8080/geoserver/elevation/wms" is the url to the "elevation" workspace stored in geoserver (mandatory)
- "SRTM90" is the name of the layer in "elevation" workspace (mandatory)
- "64" is size of terrain cells request by GeoserverTerrainProvider (optional)
- "waterMask" indicates that a water mask will be displayed (optional and experimental)
- "styleName" is the name of mySLD.xml imported style in geoserver (optional see chapter below)
- "tagAltitudeProperty" is the name of coverage band in geoserver. (optional see chapter below)
- terrainProvider.getHeight(cartographic, callBack) provides a height promise of a cartographic point. callBack is a function who consumes the promise. 

<img src="images/MountEverestWithGeoserver.jpg" width="400" height="300" />

Display created with bing map imagery provider and geoserverTerrainProvider. This last was configured with SRTM map of 90 meters resolution.

#More precisions on styleName and tagAltitudeProperty parameters
- You'll find "tagAltitudeProperty" parameter at the end of layer edit > data
<img src="images/layerTagAltitude.png" width="400" height="300" />
- You'll find "styleName" parameter after inserting mySLD.xml as a new style usable for the elevation layer (here it's grayToColor)
<img src="images/Style.png" width="400" height="300" />
 
The "styleName" parameter is useful when bil plugin can't provide good data...
 
#Little helps to use SRTM (elevation maps) in geoserver
- you can download SRTM data at http://srtm.csi.cgiar.org/  or http://www.viewfinderpanoramas.org/ (90 meters or 3 seconds arc resolution of map is better)
- install GDAL tools and python to work with SRTM http://trac.osgeo.org/gdal/wiki/DownloadingGdalBinaries 
- install geoserver image pyramid plugin 
- generate a pyramid from SRTM data with gdal_retile command from GDAL tools
- create a layer from generated pyramid

a guide is available at http://docs.geoserver.org/latest/en/user/tutorials/imagepyramid/imagepyramid.html 

