#Example
```
var terrainProvider = new Cesium.GeoserverTerrainProvider({
			service: "WMS",	
	        url : "http://localhost:8080/geoserver/elevation/wms",
	        layerName: "SRTM90",
	        xml: xmlGetCapabilities,
	        proxy: proxy,
	        heightMapWidth: 64,
          heightMapHeight: 64,
	        offset: 0,
	        highest: 12000,
	        lowest: -500,
	        styleName: "grayToColor",
	        hasStyledImage: true,
	        waterMask: true,
	        maxLevel: 11,
	        formatImage: {format : "image/png",extension: "png"},
	        formatArray: {
				format : "image/bil",
				/**
				* bufferIn : buffer to process (switch byte order and check the data limitations)
				* size: defines the dimension of the array (size.height* size.width cells)
				* highest: defines the highest altitude (without offset) of the data. 
				* lowest: defines the lowest altitude (without offset) of the data. 
				* offset: defines the offset of the data in order to adjust the limitations
				*/
				postProcessArray : function(bufferIn, size,highest,lowest,offset) {
					var resultat;
					var viewerIn = new DataView(bufferIn);
					var littleEndianBuffer = new ArrayBuffer(size.height * size.width * 2);
					var viewerOut = new DataView(littleEndianBuffer);
					if (littleEndianBuffer.byteLength === bufferIn.byteLength) {
						// time to switch bytes!!
						var temp, goodCell = 0, somme = 0;
						for (var i = 0; i < littleEndianBuffer.byteLength; i += 2) {
							temp = viewerIn.getInt16(i, false)-offset;
							if (temp > lowest && temp < highest) {
								viewerOut.setInt16(i, temp, true);
								somme += temp;
								goodCell++;
							} else {
								var val = (goodCell == 0 ? 1 : somme / goodCell);
								viewerOut.setInt16(i, val, true);
							}
						}
						resultat = new Int16Array(littleEndianBuffer);
					}
					return resultat;
				}
			}
	    });
```
	    
#Details
For the example the workspace in geoserver is "**elevation**", the layer name is "**SRTM90**", the url of geoserver is "**geoURL**" and the name of style is "**grayToColor**".
<table style="align:left;" border="1">
<tr style="center;">
  <th>parameter</th>
  <th>mandatory</th>
  <th>type</th>
  <th>default value</th>
  <th>geoserver example</th>
  <th>geoWebCache example</th>
  <th>comments</th>
</tr>
<tr>
  <td><i>service</i></td>
  <td>NO</td>
  <td>String</td>
  <td>"WMS"</td>
  <td>"WMS"</td>
  <td>"WMS"</td>
  <td>indicates type of service</td>
</tr>
<tr>
  <td><b>layerName</b></td>
  <td>YES</td>
  <td>String</td>
  <td><i>undefined</i></td>
  <td>"SRTM90"</td>
  <td>"elevation:SRTM90"</td>
  <td>name of the layer to use</td>
</tr>
<tr>
  <td><b>url</b></td>
  <td>NO (see comments)</td>
  <td>String</td>
  <td><i>undefined</i></td>
  <td>"geoURL/elevation/wms"</td>
  <td>"geoURL/gwc/service/wms"</td>
  <td>URL to acces to getCapabilities document (and ressources of the layer!!).<b> Either xml (see below) and url must be defined</b></td>
</tr>
<tr>
  <td><b>xml</b></td>
  <td>NO (see comments)</td>
  <td>XMLDocument</td>
  <td><i>undefined</i></td>
  <td>XMLDocument of <i>geoURL/elevation/wms?SERVICE=WMS&REQUEST=GetCapabilities&tiled=true</i></td>
  <td>XMLDocument of <i>geoURL/gwc/service/wms?SERVICE=WMS&REQUEST=GetCapabilities&tiled=true</i></td>
  <td>xml that defines the metadata of the layer. <b>Either url (see above) and xml must be defined</b></td>
</tr>
<tr>
  <td><i>proxy</i></td>
  <td>NO</td>
  <td>Cesium.DefaultProxy</td>
  <td><i>undefined</i></td>
  <td>new Cesium.DefaultProxy(urlProxy)</td>
  <td>new Cesium.DefaultProxy(urlProxy)</td>
  <td>a proxy to get data from geoserver</td>
</tr>
<tr>
  <td><i>heightMapWidth<i></td>
  <td>NO</td>
  <td>Integer</td>
  <td>65</td>
  <td>128</td>
  <td>defines width of tile. It seems that Cesium can't work with tile bigger than a certain size (between 129 and 256).</td>
</tr>
<tr>
  <td><i>heightMapHeight<i></td>
  <td>NO</td>
  <td>Integer</td>
  <td>65</td>
  <td>128</td>
  <td>defines height tile. It seems that Cesium can't work with tile bigger than a certain size (between 129 and 256).</td>
</tr>
<tr>
  <td><i>offset</i></td>
  <td>NO</td>
  <td>Number</td>
  <td>0</td>
  <td>300</td>
  <td>400</td>
  <td>offset of the data in meters. It's positive to decrease the altitude of data received and it's negative to increase the altitude of data received</td>
</tr>
<tr>
  <td><i>highest</i></td>
  <td>NO</td>
  <td>Number</td>
  <td>12000</td>
  <td>9000</td>
  <td>9000</td>
  <td>define highest altitude of the layer. If an elevation data is higher, it will be balanced with data of the same sample.</td>
</tr>
<tr>
  <td><i>lowest</i></td>
  <td>NO</td>
  <td>Number</td>
  <td>-500</td>
  <td>-800</td>
  <td>-800</td>
  <td>define lowest altitude of the layer. If an elevation data is lower, it will be balanced with data of the same sample.</td>
</tr>
<tr>
  <td><b>styleName</b></td>
  <td>NO</td>
  <td>String</td>
  <td><i>undefined</i></td>
  <td>"mySLD"</td>
  <td>"mySLD"</td>
  <td>Name of style to use for GeoserverTerrainProvider when it works with BILL/DDS or styled images (<b>required in both case</b>). <b>In case of converted images, this parameter must be undefined or parameter hasStyledImage must be false (see below)</b></td>
</tr>
<tr>
  <td><i>hasStyledImage</i></td>
  <td>NO</td>
  <td>Boolean</td>
  <td>true if styleName is defined, otherwise it's false</td>
  <td>false</td>
  <td>true</td>
  <td>indicates if image type is styled or converted. see comments of styleName parameter above</td>
</tr>
<tr>
  <td><i>waterMask</i></td>
  <td>NO</td>
  <td>Boolean</td>
  <td>false</td>
  <td>false</td>
  <td>true</td>
  <td>Experimental. Indicates if GeoserverTerrainProvider should generate a water mask</td>
</tr>
<tr>
  <td><i>maxLevel</i></td>
  <td>NO</td>
  <td>Integer</td>
  <td>11</td>
  <td>10</td>
  <td>14</td>
  <td>Level maximum to request for the layer. For indication, with a 90 meters (or 3 seconds arc) precision data, level 11 is enough; with a 30 meters (or 1 second arc) precision data, level 13 should be enough. </td>
</tr>
<tr>
  <td><b>formatImage</b></td>
  <td>NO</td>
  <td>Object with members:<ul><li>format: mime of the image</li><li>extension: extension of the image</li></ul></td>
  <td><i>undefined</i></td>
  <td>{format : "image/jpeg",extension: "jpg"}</td>
  <td>{format : "image/png",extension: "png"}</td>
  <td>indicates the type of image to use. <b>If BIL/DDS was added to geoserver, in order to use converted images instead of BILL/DDS, this parameter must be defined</b>. To use styled images without BILL/DDS, formatImage must be defined,and either hasStyledImage is defined to true or styleName must be defined. <b>If BIL/DDS plugin is not inserted in geoserver, GeoserverTerrainProvider will use available image format</b></td>
</tr>
<tr>
  <td><i>formatArray</i></td>
  <td>NO</td>
  <td>Object with members:<ul><li>format: mime of the data</li><li>postProcessArray: a function to process received arrayData</li></ul></td>
  <td><i>undefined</i></td>
  <td><i>see example</i></td>
  <td><i>see example</i></td>
  <td>Format array to use instead of default format array. This format is defined only if BIL/DDS is available in geoserver (<i>image/bil</i> MIME). If formatImage is an undefined parameter and <i>image/bil</i> MIME is available, GeoserverTerrain provider will use the default formatArray.</td>
</tr>
</table> 