#Example
```
var terrainProvider = new Cesium.GeoserverTerrainProvider({
			service: "WMS",	
	        url : "http://localhost:8080/geoserver/elevation/wms",
	        layerName: "SRTM90",
	        xml: xmlGetCapabilities,
	        proxy: proxy,
	        heightMapWidth: 64,
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
For the example the workspace in geoserver is "**elevation**", the layer name is "**SRTM90**", the url of geoserver is "**geoURL**" and the name of style is "**mySLD**".
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
  <td>*service*</td>
  <td>NO</td>
  <td>String</td>
  <td>"WMS"</td>
  <td>"WMS"</td>
  <td>"WMS"</td>
  <td>indicates type of service</td>
</tr>
<tr>
  <td>**layerName**</td>
  <td>YES</td>
  <td>String</td>
  <td>*undefined*</td>
  <td>"SRTM90"</td>
  <td>"elevation:SRTM90"</td>
  <td>name of the layer to use</td>
</tr>
<tr>
  <td>**url**</td>
  <td>NO (see comments)</td>
  <td>String</td>
  <td>*undefined*</td>
  <td>"geoURL/elevation/wms"</td>
  <td>"geoURL/gwc/service/wms"</td>
  <td>URL to acces to getCapabilities document (and ressources of the layer!!).** Either xml (see below) and url must be defined**</td>
</tr>
<tr>
  <td>**xml**</td>
  <td>NO (see comments)</td>
  <td>XMLDocument</td>
  <td>*undefined*</td>
  <td>XMLDocument of *geoURL/elevation/wms?SERVICE=WMS&REQUEST=GetCapabilities&tiled=true*</td>
  <td>XMLDocument of *geoURL/gwc/service/wms?SERVICE=WMS&REQUEST=GetCapabilities&tiled=true*</td>
  <td>xml that defines the metadata of the layer. **Either url (see above) and xml must be defined**</td>
</tr>
<tr>
  <td>*proxy*</td>
  <td>NO</td>
  <td>Cesium.DefaultProxy</td>
  <td>*undefined*</td>
  <td>new Cesium.DefaultProxy(urlProxy)</td>
  <td>new Cesium.DefaultProxy(urlProxy)</td>
  <td>a proxy to get data from geoserver</td>
</tr>
<tr>
  <td>*heightMapWidth*</td>
  <td>NO</td>
  <td>Integer</td>
  <td>65</td>
  <td>128</td>
  <td>128</td>
  <td>defines size of squared tile. It seems that Cesium can't work with tile bigger than a certain size (between 129 and 256).</td>
</tr>
<tr>
  <td>*offset*</td>
  <td>NO</td>
  <td>Number</td>
  <td>0</td>
  <td>300</td>
  <td>400</td>
  <td>offset of the data in meters. It's positive to decrease the altitude of data received and it's negative to increase the altitude of data received</td>
</tr>
<tr>
  <td>*highest*</td>
  <td>NO</td>
  <td>Number</td>
  <td>12000</td>
  <td>9000</td>
  <td>9000</td>
  <td>define highest altitude of the layer. If an elevation data is higher, it will be balanced with data of the same sample.</td>
</tr>
<tr>
  <td>*lowest*</td>
  <td>NO</td>
  <td>Number</td>
  <td>-500</td>
  <td>-800</td>
  <td>-800</td>
  <td>define lowest altitude of the layer. If an elevation data is lower, it will be balanced with data of the same sample.</td>
</tr>
<tr>
  <td>**styleName**</td>
  <td>NO</td>
  <td>String</td>
  <td>*undefined*</td>
  <td>"mySLD"</td>
  <td>"mySLD"</td>
  <td>Name of style to use for GeoserverTerrainProvider when it works with BILL/DDS or styled images (**required in both case**). **In case of converted images, this parameter must be undefined or parameter hasStyledImage must be false (see below)**</td>
</tr>
<tr>
  <td>*hasStyledImage*</td>
  <td>NO</td>
  <td>Boolean</td>
  <td>true if styleName is defined, otherwise it's false</td>
  <td>false</td>
  <td>true</td>
  <td>indicates if image type is styled or converted. see comments of styleName parameter above</td>
</tr>
<tr>
  <td>*waterMask*</td>
  <td>NO</td>
  <td>Boolean</td>
  <td>false</td>
  <td>false</td>
  <td>true</td>
  <td>Experimental. Indicates if GeoserverTerrainProvider should generate a water mask</td>
</tr>
<tr>
  <td>*maxLevel*</td>
  <td>NO</td>
  <td>Integer</td>
  <td>11</td>
  <td>10</td>
  <td>14</td>
  <td>Level maximum to request for the layer. For indication, with a 90 meters (or 3 seconds arc) precision data, level 11 is enough; with a 30 meters (or 1 second arc) precision data, level 13 should be enough. </td>
</tr>
<tr>
  <td>**formatImage**</td>
  <td>NO</td>
  <td>Object with members:<ul><li>format: mime of the image</li><li>extension: extension of the image</li></ul></td>
  <td>*undefined*</td>
  <td>{format : "image/jpeg",extension: "jpg"}</td>
  <td>{format : "image/png",extension: "png"}</td>
  <td>indicates the type of image to use. **If BIL/DDS was added to geoserver, in order to use converted images instead of BILL/DDS, this parameter must be defined**. To use styled images without BILL/DDS, formatImage must be defined,and either hasStyledImage is defined to true or styleName must be defined. **If BIL/DDS plugin is not inserted in geoserver, GeoserverTerrainProvider will use available image format**</td>
</tr>
<tr>
  <td>*formatArray*</td>
  <td>NO</td>
  <td>Object with members:<ul><li>format: mime of the data</li><li>postProcessArray: a function to process received arrayData</li></ul></td>
  <td>*undefined*</td>
  <td>*see example*</td>
  <td>*see example*</td>
  <td>Format array to use instead of default format array. This format is defined only if BIL/DDS is available in geoserver (*image/bil* MIME). If formatImage is an undefined parameter and *image/bil* MIME is available, GeoserverTerrain provider will use the default formatArray.</td>
</tr>
</table> 