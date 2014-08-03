(function() {
	var OGCHelper = {};
	/**
	*
	* arrayBuffer: 	the arrayBuffer to process to have a HeightmapTerrainData
	* limitations: 	object which defines highest (limitations.highest), lowest (limitations.lowest) altitudes 
	* 			   	and the offset (limitations.offset) of the terrain.
	* size: 		number defining the height and width of the tile (can be a int or an object with two attributs: height and width)
	* formatArray: 	object which defines the terrainDataStructure (formatArray.terrainDataStructure) and 
	* 			   	the postProcessArray (formatArray.postProcessArray)
	* hasWaterMask: boolean to indicate to generate a waterMask
	* childrenMask: Number defining the childrenMask
	*
	*/
	OGCHelper.processArray=function(arrayBuffer,limitations,size,formatArray,hasWaterMask,childrenMask){
		if(typeof(size)=="number"){
			size={width:size,height:size};
		}
		var heightBuffer = formatArray.postProcessArray(arrayBuffer,size,limitations.highest,limitations.lowest,
			limitations.offset);
		if (!Cesium.defined(heightBuffer)) {
			throw "no good size";
		}
		var optionsHeihtmapTerrainData={
			buffer : heightBuffer,
			width : size.width,
			height : size.height,
			childTileMask : childrenMask,
			structure : formatArray.terrainDataStructure
		};
		if(hasWaterMask){
			var waterMask = new Uint8Array(
					heightBuffer.length);
			for (var i = 0; i < heightBuffer.length; i++) {
				if (heightBuffer[i] <= 0) {
					waterMask[i] = 255;
				}
			}
			optionsHeihtmapTerrainData.waterMask=waterMask;
		}
		return new Cesium.HeightmapTerrainData(optionsHeihtmapTerrainData);
	};

/**
	*
	* image: 					the image to process to have a HeightmapTerrainData
	* limitations: 				object which defines highest (limitations.highest), lowest (limitations.lowest) altitudes 
	* 			   				and the offset (limitations.offset) of the terrain. The style defined in mySLD use an offset of 32768 meters
	* size: 					number defining the height and width of the tile
	* hasWaterMask: 			boolean to indicate to generate a waterMask
	* childrenMask: 			Number defining the childrenMask
	*/
	OGCHelper.processImage=function(image,limitations,size,hasWaterMask,childrenMask){
		if(typeof(size)=="number"){
			size={width:size,height:size};
		}
		var dataPixels = Cesium.getImagePixels(image,size.width,size.height);
		var waterMask = new Uint8Array(dataPixels.length / 4);
		var buffer = new Int16Array(dataPixels.length / 4);
		var goodCell = 0, somme = 0;
		for (var i = 0; i < dataPixels.length; i += 4) {
			var valeur = (dataPixels[i] << 8 | dataPixels[i+1]) - limitations.offset;
			if (valeur > limitations.lowest && valeur < limitations.highest) {
				buffer[i / 4] = valeur;
				somme += valeur;
				goodCell++;
			} else {
				buffer[i / 4] = (goodCell == 0 ? 0 : somme / goodCell);
			}
		}

		var optionsHeihtmapTerrainData={
			buffer : buffer,
			width : size.width,
			height : size.height,
			childTileMask : childrenMask,
			structure : {heightScale : 1.0,
						heightOffset : 0.0,
						elementsPerHeight : 1,
						stride : 1,
						elementMultiplier : 256.0,
						isBigEndian : false}
		};
		if(hasWaterMask){
			var waterMask = new Uint8Array(
					heightBuffer.length);
			for (var i = 0; i < heightBuffer.length; i++) {
				if (heightBuffer[i] <= 0) {
					waterMask[i] = 255;
				}
			}
			optionsHeihtmapTerrainData.waterMask=waterMask;
		}
		return new Cesium.HeightmapTerrainData(optionsHeihtmapTerrainData);
	};

	/**
	 * static array where CRS availables for OGCHelper are defined
	 */
	OGCHelper.CRS = [ {
		name : "CRS:84",
		ellipsoid : Cesium.Ellipsoid.WGS84,
		firstAxeIsLatitude : false,
		tilingScheme : Cesium.GeographicTilingScheme
	}, {
		name : "EPSG:4326",
		ellipsoid : Cesium.Ellipsoid.WGS84,
		firstAxeIsLatitude : true,
		tilingScheme : Cesium.GeographicTilingScheme
	}, {
		name : "EPSG:3857",
		ellipsoid : Cesium.Ellipsoid.WGS84,
		firstAxeIsLatitude : false,
		tilingScheme : Cesium.WebMercatorTilingScheme
	} ];

	/**
	 * static array where image format availables for OGCHelper are
	 * defined
	 */
	OGCHelper.FormatImage = [ {
		format : "image/png",
		extension: "png"
	}, {
		format : "image/png; mode=8bit",
		extension: "png"
	}, {
		format : "image/jpeg",
		extension: "jpg"
	}, {
		format : "image/jpeg",
		extension: "jpeg"
	}, {
		format : "image/gif",
		extension: "gif"
	} ];

	/**
	 * static array where data array availables for OGCHelper are defined
	 */
	OGCHelper.FormatArray = [ {
		format : "image/bil",
		/**
		* bufferIn : buffer to process (switch byte order and check the data limitations)
		* size: defines the dimension of the array (size.height* size.width cells)
		* highest: defines the highest altitude (without offset) of the data. 
		* lowest: defines the lowest altitude (without offset) of the data. 
		* offset: defines the offset of the data in order adjust the limitations
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
	} ];

	OGCHelper.service=[{ name: "WMS",implementation: wmsParser}];

	/**
	 * parse wms url from an url and a layer. request metadata information.
	 * 
	 * @alias wmsParser
	 * @constructor
	 * 
	 * @param {String}
	 *            description.layerName the name of the layer.
	 * @param {String}
	 *            [description.url] The URL of the server providing wms.
	 * @param {String}
	 *            [description.xml] the xml after requesting "getCapabilities"
	 *            from web map server.
	 * @param {Object}
	 *            [description.proxy] A proxy to use for requests. This object
	 *            is expected to have a getURL function which returns the
	 *            proxied URL, if needed.
	 * @param {Number}
	 *            [description.heightMapWidth] width and height of a tile in
	 *            pixels
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
	 * @param {Boolean}
	 *            [description.waterMask] indicates if a water mask will be
	 *            displayed (experimental)
	 * @param {Number}
	 *            [description.maxLevel] maximum level to request
	 * @param {Object}
	 *            [description.formatImage] see OGCHelper.FormatImage
	 * @param {Object}
	 *            [description.formatArray] see OGCHelper.FormatArray
	 */
	function wmsParser(description){
		description = Cesium.defaultValue(description,
				Cesium.defaultValue.EMPTY_OBJECT);
		if (!Cesium.defined(description.layerName)) {
			throw new Cesium.DeveloperError(
					'description.layerName is required.');
		}
		this._layerName = description.layerName;
		this._ready = false;
		this.heightMapWidth = Cesium.defaultValue(description.heightMapWidth,65);
		this.maxLevel = Cesium.defaultValue(description.maxLevel, 11);
		this._ready=false;

		if (Cesium.defined(description.url)) {
			this.getMetaDatafromURL(description.url,
					description);
		} else if (Cesium.defined(description.xml)) {
			this.getMetaDatafromXML(description.xml, description);
		}else{
			throw new Cesium.DeveloperError(
					'description.url or  description.xml are required.');
		}
	};

	/**
	 * request getCapabilities from server and parse the response to collect
	 * metadata
	 * 
	 * @param {String}
	 *            urlofServer url of server
	 * @param {Object}
	 *            [description]
	 * @see wmsParser.getMetaDatafromXML
	 */
	wmsParser.prototype.getMetaDatafromURL = function(urlofServer, description) {
		if (typeof (urlofServer) !== "string") {
			throw new Cesium.DeveloperError('url must be a string');
		}
		var index=urlofServer.indexOf("?");
		if(index>-1){
			urlofServer=urlofServer.substring(0,index);
		}
		var urlGetCapabilities = urlofServer
				+ '?SERVICE=WMS&REQUEST=GetCapabilities&tiled=true';
		var that = this;
		if (Cesium.defined(description.proxy)) {
			urlGetCapabilities = description.proxy.getURL(urlGetCapabilities);
		}

		Cesium.when(Cesium.loadXML(urlGetCapabilities), function(xml) {
			that.getMetaDatafromXML(xml, description);
		});

	};
	/**
	 * analyse the getCapabilities of WMS server and prepare wmsParser. If
	 * formatImage and formatArray aren't defined, then this method chooses
	 * first a format defined in OGCHelper.formatArray (like BIL format)
	 * which is available in wms server. If it is not possible it will use a format
	 * define in wmsParser.formatImage and which is available in wms server.
	 * 
	 * @param {XMLDocument}
	 *            xml XML to analyse (getCapabilities request)
	 * @param {Object}
	 *            description can contains these attributs: - heightMapWidth<br>
	 *            -formatImage<br>
	 *            -formatArray<br>
	 *            -styleName
	 *			  -offset
	 *			  -hasStyledImage
	 * @see OGCHelper.formatImage for structure
	 * 
	 * @see OGCHelper.formatArray for structure
	 */
	wmsParser.prototype.getMetaDatafromXML = function(xml, description) {
		if (!(xml instanceof XMLDocument)) {
			throw new Cesium.DeveloperError('xml must be a XMLDocument');
		}
		// get version of wms 1.1.X or 1.3.X=> for 1.3 use firstAxe for order of
		// CRS
		description = Cesium.defaultValue(description,
				Cesium.defaultValue.EMPTY_OBJECT);
		this.version = undefined;
		this.heightMapWidth = Cesium.defaultValue(description.heightMapWidth,
				this.heightMapWidth);
		this.requestedSize={width:256,height:256};
		this.CRS = undefined;
		this.formatImage = description.formatImage;
		this.formatArray = description.formatArray;
		this.tilingScheme = undefined;
		this._firstAxeIsLatitude = undefined;
		this.isNewVersion = undefined;
		this._ready = false;
		this.levelZeroMaximumGeometricError = undefined;
		this.waterMask = Cesium.defaultValue(description.waterMask, false);
		if (typeof (this.waterMask) != "boolean") {
			this.waterMask = false;
		}
		this.offset=Cesium.defaultValue(description.offset,0);
		this.highest=Cesium.defaultValue(description.highest,12000);
		this.lowest=Cesium.defaultValue(description.lowest,-500);
		this.styleName = description.styleName;
		this.hasStyledImage=Cesium.defaultValue(description.hasStyledImage,typeof(description.styleName)==="string");

		// get version
		var versionNode = xml.querySelector("[version]");
		if (versionNode !== null) {
			this.version = versionNode.getAttribute("version");
			this.isNewVersion = /^1\.[3-9]\./.test(this.version);
		}

		this.url=xml.querySelector("Request>GetMap OnlineResource").getAttribute("xlink:href");
		var index=this.url.indexOf("?");
		if(index>-1){
			this.url=this.url.substring(0,index);
		}
		if (Cesium.defined(description.proxy)) {
			this.url = description.proxy.getURL(this.url);
		}

		// get list of map format
		var nodeFormats = xml.querySelectorAll("Request>GetMap>Format");

		if (!Cesium.defined(this.formatImage)) {
			for (var j = 0; j < OGCHelper.FormatArray.length
					&& !Cesium.defined(this.formatArray); j++) {
				for (var i = 0; i < nodeFormats.length
						&& !Cesium.defined(this.formatArray); i++) {
					if (nodeFormats[i].textContent === OGCHelper.FormatArray[j].format) {
						this.formatArray = OGCHelper.FormatArray[j];
					}
				}
			}
			
		}
		if (Cesium.defined(this.formatArray)
				&& typeof (this.formatArray.format) === "string"
				&& typeof (this.formatArray.postProcessArray) === "function") {
			this.formatArray.terrainDataStructure = {
				heightScale : 1.0,
				heightOffset : 0,
				elementsPerHeight : 1,
				stride : 1,
				elementMultiplier : 256.0,
				isBigEndian : false
			};
		} else {
			this.formatArray = undefined;
		}
		// a formatImage should always exist !!
		for (var l = 0; l < OGCHelper.FormatImage.length
				&& !Cesium.defined(this.formatImage); l++) {
			for (var k = 0; k < nodeFormats.length
					&& !Cesium.defined(this.formatImage); k++) {
				if (nodeFormats[k].textContent === OGCHelper.FormatImage[l].format) {
					this.formatImage = OGCHelper.FormatImage[l];
				}
			}
		}
		if (Cesium.defined(this.formatImage)
				&& typeof (this.formatImage.format) === "string") {
			this.formatImage.terrainDataStructure = {
				heightScale : 1.0,
				heightOffset : 0,
				elementsPerHeight : 2,
				stride : 4,
				elementMultiplier : 256.0,
				isBigEndian : true
			};
		} else {
			this.formatImage = undefined;
		}
		
		var layerNodes = xml
				.querySelectorAll("Layer[queryable='1'],Layer[queryable='true']");
		var layerNode;
		for (var m = 0; m < layerNodes.length && !Cesium.defined(layerNode); m++) {
			if (layerNodes[m].querySelector("Name").textContent === this._layerName) {
				layerNode = layerNodes[m];
			}
		}

		if (Cesium.defined(layerNode) && Cesium.defined(this.version)) {
			var found = false;
			for (var n = 0; n < OGCHelper.CRS.length && !found; n++) {
				var CRSSelected = OGCHelper.CRS[n];
				var referentialName = CRSSelected.name;
				var nodeBBox = layerNode.querySelector("BoundingBox[SRS='"
						+ referentialName + "'],BoundingBox[CRS='"
						+ referentialName + "']");

				if (nodeBBox !== null) {
					this.CRS = referentialName;
					this._firstAxeIsLatitude = CRSSelected.firstAxeIsLatitude;
					var west,south,east,north;
					if(this.isNewVersion && this._firstAxeIsLatitude ){
						south=parseFloat(nodeBBox.getAttribute("minx"));
						west=parseFloat(nodeBBox.getAttribute("miny"));
						north=parseFloat(nodeBBox.getAttribute("maxx"));
						east=parseFloat(nodeBBox.getAttribute("maxy"));
					}else{
						west=parseFloat(nodeBBox.getAttribute("minx"));
						south=parseFloat(nodeBBox.getAttribute("miny"));
						east=parseFloat(nodeBBox.getAttribute("maxx"));
						north=parseFloat(nodeBBox.getAttribute("maxy"));
					}
					var rectangle=new Cesium.Rectangle(west*Math.PI/180,south*Math.PI/180,east*Math.PI/180,north*Math.PI/180);
					var rectangleSouthwestInMeters=new Cesium.Cartesian2(west,south);
					var rectangleNortheastInMeters=new Cesium.Cartesian2(east,north);
					this.tilingScheme = new CRSSelected.tilingScheme({
						ellipsoid : CRSSelected.ellipsoid,
						rectangleSouthwestInMeters: rectangleSouthwestInMeters,
						rectangleNortheastInMeters: rectangleNortheastInMeters,
						rectangle: rectangle
					});
					found = true;
				}
			}
			// style défini et existant?
			if(Cesium.defined(this.styleName)){
				var styleNodes = layerNode.querySelectorAll("Style>Name");
				var styleFound = false;
				for (var z = 0; z < styleNodes.length && !styleFound; z++) {
					if (this.styleName === styleNodes[z].textContent) {
						styleFound = true;
					}
				}
				if (!styleFound) {
					this.styleName = undefined;
				}
			}
			//changer resolution height et width si existence de tileset dans le xml!!
			var tileSets=xml.querySelectorAll("VendorSpecificCapabilities>TileSet");
			var out=false;
			for (var q=0;q<tileSets.length&&!out;q++){
				var isGoodSRS=tileSets[q].querySelector("BoundingBox[SRS='"
							+ this.CRS + "'],BoundingBox[CRS='"
							+ this.CRS + "']")!==null;
				var isGoodLayer=tileSets[q].querySelector("Layers").textContent=== this._layerName;
				if(isGoodLayer&&isGoodSRS){
					this.requestedSize.width=parseInt(tileSets[q].querySelector("Width").textContent);
					this.requestedSize.height=parseInt(tileSets[q].querySelector("Height").textContent);
					out=true;
				}
			}

			this._ready = found
					&& (Cesium.defined(this.formatImage) || Cesium
							.defined(this.formatArray))
					&& Cesium.defined(this.version);
			this.levelZeroMaximumGeometricError = Cesium.TerrainProvider
					.getEstimatedLevelZeroGeometricErrorForAHeightmap(
							this.tilingScheme.ellipsoid, this.heightMapWidth,
							this.tilingScheme.getNumberOfXTilesAtLevel(0));
		}

	};

	/**
	 * Requests the geometry for a given tile.
	 */
	wmsParser.prototype.getHeightmapTerrainData = function(x, y, level) {
		var resultat;
		if (this._ready && Cesium.defined(x) && Cesium.defined(y) && Cesium.defined(level)) {
			var rectangleCalcul = this.tilingScheme.tileXYToNativeRectangle(x, y,level);
			// Each pixel in the heightmap represents the height at the center
			// of
			// that
			// pixel. So expand the Rectangle by half a sample spacing in each
			// direction
			// so that the first height is on the edge of the Rectangle we need
			// rather
			// than
			// half a sample spacing into the Rectangle.
			var xSpacing = (rectangleCalcul.east - rectangleCalcul.west)/ (this.heightMapWidth - 1);
			var ySpacing = (rectangleCalcul.north - rectangleCalcul.south)/ (this.heightMapWidth - 1);

			rectangleCalcul.west -= xSpacing * 0.5;
			rectangleCalcul.east += xSpacing * 0.5;
			rectangleCalcul.south -= ySpacing * 0.5;
			rectangleCalcul.north += ySpacing * 0.5;

			var url = this.url + '?SERVICE=WMS&REQUEST=GetMap&layers='
					+ this._layerName + '&version=' + this.version;

			if (this.isNewVersion) {
				// srs become CRS
				// use firstAxe for bbox
				var bbox;
				if (this._firstAxeIsLatitude) {
					bbox = rectangleCalcul.south + ',' + rectangleCalcul.west + ','
							+ rectangleCalcul.north + ',' + rectangleCalcul.east;
				} else {
					bbox = rectangleCalcul.west + ',' + rectangleCalcul.south + ','
							+ rectangleCalcul.east + ',' + rectangleCalcul.north;
				}
				url += '&bbox=' + bbox + '&crs=' + this.CRS;
			} else {
				var bbox2 = rectangleCalcul.west + ',' + rectangleCalcul.south + ','
						+ rectangleCalcul.east + ',' + rectangleCalcul.north;
				url += '&bbox=' + bbox2 + '&srs=' + this.CRS;
			}

			var that = this;
			var hasChildren = that.maxLevel > level ? 15 : 0;
			var limitations={highest:this.highest,lowest:this.lowest,offset:this.offset};

			if (Cesium.defined(this.formatArray)) {
				var urlArray = url + '&format=' + that.formatArray.format+ '&width='
					+ that.heightMapWidth + '&height=' + that.heightMapWidth;
				// case of arrayBuffer
				var promise = Cesium.throttleRequestByServer(urlArray,
						Cesium.loadArrayBuffer);
				if (Cesium.defined(promise)) {
					resultat = Cesium.when(promise,
										function(arrayBuffer) {
											return OGCHelper.processArray(arrayBuffer,limitations,that.heightMapWidth,
												that.formatArray,that.waterMask,hasChildren);
										}
									).otherwise(
										function() {
											if (Cesium.defined(that.formatImage)) {
												if (that.hasStyledImage) {
													limitations.offset=limitations.offset+32768;
												}
												url+= '&format=' + that.formatImage.format+'&width='+ that.requestedSize.width +
												'&height=' + that.requestedSize.height;
												if (Cesium.defined(that.styleName)) {
													url += "&styles=" + that.styleName+ "&style="+ that.styleName;
												}
												var promiseZero = Cesium.throttleRequestByServer(url,Cesium.loadImage);
												if (Cesium.defined(promiseZero)) {
													return Cesium
															.when(promiseZero,function(image){
																return OGCHelper.processImage(image,limitations,
																	that.heightMapWidth,that.waterMask,hasChildren);
															});}
											}else{
												return new Cesium.HeightmapTerrainData({
															buffer : new Uint16Array(
																	that.heightMapWidth
																			* that.heightMapWidth),
															width : that.heightMapWidth,
															height : that.heightMapWidth,
															childTileMask : hasChildren,
															waterMask : new Uint8Array(that.heightMapWidth
																			* that.heightMapWidth),
															structure : that.formatArray.terrainDataStructure
														});
											}
										}
								);
				}
			} else if (Cesium.defined(that.formatImage)) {
				//case of image
				if (that.hasStyledImage) {
					limitations.offset=limitations.offset+32768;
				}
				url+= '&format=' + that.formatImage.format+'&width='+ that.requestedSize.width +
												'&height=' + that.requestedSize.height;
				if (Cesium.defined(that.styleName)) {
					url += "&styles=" + that.styleName+ "&style="+ that.styleName;
				}
				var promise2 = Cesium.throttleRequestByServer(url,Cesium.loadImage);
				if (Cesium.defined(promise2)) {
					resultat = Cesium.when(promise2,function(image){
								return OGCHelper.processImage(image,limitations,
									that.heightMapWidth,that.waterMask,hasChildren);
							});}
			}
		}
		return resultat;
	};



	/**
	 * A {@link TerrainProvider} that produces geometry by tessellating height
	 * maps retrieved from a geoserver terrain server.
	 * 
	 * @alias GeoserverTerrainProvider
	 * @constructor
	 * 
	 * @param {String}
	 *            description.url The URL of the geoserver terrain server.
	 * @param {String}
	 *            description.layerName The layers to include, separated by
	 *            commas.
	 * @param {Proxy}
	 *            [description.proxy] A proxy to use for requests. This object
	 *            is expected to have a getURL function which returns the
	 *            proxied URL, if needed.
	 * @param {Credit|String}
	 *            [description.credit] A credit for the data source, which is
	 *            displayed on the canvas.
	 * @param {Number}
	 *            [description.heightMapWidth] width and height of the tiles
	 * @param {Number}
	 *            [description.maxLevel] max level of tiles
	 * @param {String}
	 *            [description.service] type of service to use (WMS, TMS or WMTS) 
	 * @param {String}
	 *            [description.xml] the xml after requesting "getCapabilities".
	 * @see TerrainProvider
	 */
	var GeoserverTerrainProvider = function GeoserverTerrainProvider(
			description) {
		if (!Cesium.defined(description)) {
			throw new Cesium.DeveloperError('description is required.');
		}
		description.service=Cesium.defaultValue(description.service,"WMS");
		this._parserHelper=undefined;
		var listeService="";
		for(index in OGCHelper.service){
			var service=OGCHelper.service[index];
			listeService+="'"+service.name+"' ";
			if(service.name==description.service){
				this._parserHelper=new service.implementation(description);
			}
		}

		if (!Cesium.defined(this._parserHelper)) {
			throw new Cesium.DeveloperError('description.service should be '+listeService);
		}
		this._errorEvent = new Cesium.Event();

		var credit = description.credit;
		if (typeof credit === 'string') {
			credit = new Cesium.Credit(credit);
		}
		this._credit = credit;
	};

	/**
	 * Requests the geometry for a given tile. This function should not be
	 * called before {@link GeoserverTerrainProvider#isReady} returns true. The
	 * result must include terrain data.
	 * 
	 * @memberof GeoserverTerrainProvider
	 * 
	 * @param {Number}
	 *            x The X coordinate of the tile for which to request geometry.
	 * @param {Number}
	 *            y The Y coordinate of the tile for which to request geometry.
	 * @param {Number}
	 *            level The level of the tile for which to request geometry.
	 * @returns {Promise|TerrainData} A promise for the requested geometry. If
	 *          this method returns undefined instead of a promise, it is an
	 *          indication that too many requests are already pending and the
	 *          request will be retried later.
	 */
	GeoserverTerrainProvider.prototype.requestTileGeometry = function(x, y,
			level) {
		return this._parserHelper.getHeightmapTerrainData(x, y,level);
	};

	/**
	 * Gets the maximum geometric error allowed in a tile at a given level.
	 * 
	 * @memberof GeoserverTerrainProvider
	 * 
	 * @param {Number}
	 *            level The tile level for which to get the maximum geometric
	 *            error.
	 * @returns {Number} The maximum geometric error.
	 */
	GeoserverTerrainProvider.prototype.getLevelMaximumGeometricError = function(
			level) {
		return this._parserHelper.levelZeroMaximumGeometricError/ (1 << level);
	};

	Cesium.defineProperties(GeoserverTerrainProvider.prototype, {
		/**
		 * Gets an event that is raised when the terrain provider encounters an
		 * asynchronous error. By subscribing to the event, you will be notified
		 * of the error and can potentially recover from it. Event listeners are
		 * passed an instance of {@link TileProviderError}.
		 * 
		 * @memberof GeoserverTerrainProvider.prototype
		 * @type {Event}
		 */
		errorEvent : {
			get : function() {
				return this._errorEvent;
			}
		},

		/**
		 * Gets a value indicating whether or not the provider includes a water
		 * mask. The water mask indicates which areas of the globe are water rather
		 * than land, so they can be rendered as a reflective surface with animated
		 * waves.
		 * 
		 * @memberof GeoserverTerrainProvider
		 * 
		 * @returns {Boolean} True if the provider has a water mask; otherwise,
		 *          false.
		 */
		hasWaterMask:{
			get : function() {
				return this._parserHelper.waterMask;
			}
		}, 

		/**
		 * Gets the credit to display when this terrain provider is active.
		 * Typically this is used to credit the source of the terrain. This
		 * function should not be called before
		 * {@link GeoserverTerrainProvider#ready} returns true.
		 * 
		 * @memberof GeoserverTerrainProvider.prototype
		 * @type {Credit}
		 */
		credit : {
			get : function() {
				return this._credit;
			}
		},

		/**
		 * Gets the tiling scheme used by this provider. This function should
		 * not be called before {@link GeoserverTerrainProvider#ready} returns
		 * true.
		 * 
		 * @memberof GeoserverTerrainProvider.prototype
		 * @type {GeographicTilingScheme}
		 */
		tilingScheme : {
			get : function() {
				return this._parserHelper.tilingScheme;
			}
		},

		/**
		 * Gets a value indicating whether or not the provider is ready for use.
		 * 
		 * @memberof GeoserverTerrainProvider.prototype
		 * @type {Boolean}
		 */
		ready : {
			get : function() {
				return this._parserHelper._ready;
			}
		},
		/**
         * Gets a value indicating whether or not the requested tiles includes vertex normals.
         * @type {Boolean}
         */
        hasVertexNormals : {
            get : function() {
                return false;
            }
        }
	});
	Cesium.GeoserverTerrainProvider = GeoserverTerrainProvider;
})();