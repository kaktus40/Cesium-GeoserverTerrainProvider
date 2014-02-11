(function() {
	/**
	 * parse wms url from an url and a layer. request metadata information.
	 * 
	 * @alias WmsParserHelper
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
	 * @param {Object}
	 *            [description.heightmapWidth] width and height of a tile in
	 *            pixels
	 * @param {Boolean}
	 *            [description.waterMask] indicates if a water mask will be
	 *            displayed (experimental)
	 */

	var WmsParserHelper = function WmsParserHelper(description) {
		description = Cesium.defaultValue(description,
				Cesium.defaultValue.EMPTY_OBJECT);

		if (!Cesium.defined(description.layerName)) {
			throw new Cesium.DeveloperError(
					'description.layerName is required.');
		}
		this._layerName = description.layerName;
		this._ready = false;
		this.heightmapWidth = Cesium.defaultValue(description.heightmapWidth,
				65);
		this.maxLevel = Cesium.defaultValue(description.maxLevel, 11);

		if (Cesium.defined(description.url)) {
			this.getMetaDatafromURL(description.url, description.proxy,
					description);
		} else if (Cesium.defined(description.xml)) {
			this.getMetaDatafromXML(description.xml, description);
		}
	};
	/**
	 * request getCapabilities from server and parse the response to collect
	 * metadata
	 * 
	 * @param {String}
	 *            urlofServer url of server
	 * @param {Object}
	 *            [proxy] A proxy to use for requests. This object is expected
	 *            to have a getURL function which returns the proxied URL, if
	 *            needed.
	 * @param {Object}
	 *            [description]
	 * @see WmsParserHelper.getMetaDatafromXML
	 */
	WmsParserHelper.prototype.getMetaDatafromURL = function(urlofServer, proxy,
			description) {
		if (typeof (urlofServer) !== "string") {
			throw new Cesium.DeveloperError('url must be a string');
		}
		var urlGetCapabilities = urlofServer
				+ '?SERVICE=WMS&REQUEST=GetCapabilities';
		var that = this;
		if (Cesium.defined(proxy)) {
			urlGetCapabilities = proxy.getURL(urlGetCapabilities);
		}

		Cesium.when(Cesium.loadXML(urlGetCapabilities), function(xml) {
			that.getMetaDatafromXML(xml, description);
		});

	};
	/**
	 * analyse the getCapabilities of WMS server and prepare WmsParserHelper. If
	 * formatImage and formatArray aren't defined, then this methode choose
	 * first a format defined in WmsParserHelper.formatArray (like BIL format)
	 * and available in wms server. If it is not possible it will use a format
	 * define in WmsParserHelper.formatImage and available in wms server.
	 * 
	 * @param {XMLDocument}
	 *            xml XML to analyse (getCapabilities request)
	 * @param {Object}
	 *            description can contains these attributs: - heightmapWidth
	 *            <br>
	 *            -formatImage <br>
	 *            -tagAltitudeProperty
	 * @see WmsParserHelper.formatImage for structure<br>
	 *      -formatArray
	 * @see WmsParserHelper.formatArray for structure
	 */
	WmsParserHelper.prototype.getMetaDatafromXML = function(xml, description) {
		if (!(xml instanceof XMLDocument)) {
			throw new Cesium.DeveloperError('xml must be a XMLDocument');
		}
		// get version of wms 1.1.X or 1.3.X=> for 1.3 use firstAxe for order of
		// CRS
		description = Cesium.defaultValue(description,
				Cesium.defaultValue.EMPTY_OBJECT);
		this._numberRequest = 0;
		this.version = undefined;
		this.heightmapWidth = Cesium.defaultValue(description.heightmapWidth,
				this.heightmapWidth);
		this.CRS = undefined;
		this.formatImage = description.formatImage;
		this.formatArray = description.formatArray;
		this.tillingScheme = undefined;
		this._firstAxeIsLatitude = undefined;
		this.isNewVersion = undefined;
		this._ready = false;
		this.levelZeroMaximumGeometricError = undefined;
		this.waterMask = Cesium.defaultValue(description.waterMask, false);
		this.tagAltitudeProperty = Cesium.defaultValue(
				description.tagAltitudeProperty, "GRAY_INDEX");
		if (typeof (this.waterMask) != "boolean") {
			this.waterMask = false;
		}

		// get version
		var versionNode = xml.querySelector("[version]");
		if (versionNode !== null) {
			this.version = versionNode.getAttribute("version");
			this.isNewVersion = /^1\.[3-9]\./.test(this.version);
		}

		// get list of map format
		var nodeFormats = xml.querySelectorAll("GetMap>Format");

		if (!Cesium.defined(this.formatImage)) {
			for (var j = 0; j < WmsParserHelper.FormatArray.length
					&& !Cesium.defined(this.formatArray); j++) {
				for (var i = 0; i < nodeFormats.length
						&& !Cesium.defined(this.formatArray); i++) {
					if (nodeFormats[i].textContent === WmsParserHelper.FormatArray[j].format) {
						this.formatArray = WmsParserHelper.FormatArray[j];
					}
				}
			}
			if (Cesium.defined(this.formatArray)
					&& typeof (this.formatArray.format) === "string"
					&& typeof (this.formatArray.postProcessArray) === "function") {
				this.formatArray.terrainDataStructure = {
					heightScale : 1.0,
					heightOffset : 0.0,
					elementsPerHeight : 1,
					stride : 1,
					elementMultiplier : 256.0,
					isBigEndian : false
				};
			} else {
				this.formatArray = undefined;
			}
		}
		if (!Cesium.defined(this.formatArray)) {
			for (var l = 0; l < WmsParserHelper.FormatImage.length
					&& !Cesium.defined(this.formatImage); l++) {
				for (var k = 0; k < nodeFormats.length
						&& !Cesium.defined(this.formatImage); k++) {
					if (nodeFormats[k].textContent === WmsParserHelper.FormatImage[l].format) {
						this.formatImage = WmsParserHelper.FormatImage[l];
					}
				}
			}
			if (Cesium.defined(this.formatImage)
					&& typeof (this.formatImage.format) === "string") {
				this.formatImage.terrainDataStructure = {
					heightScale : 1.0 / 1000.0,
					heightOffset : -1000.0,
					elementsPerHeight : 3,
					stride : 4,
					elementMultiplier : 256.0,
					isBigEndian : true
				};
			} else {
				this.formatImage = undefined;
			}
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
			for (var n = 0; n < WmsParserHelper.CRS.length && !found; n++) {
				var CRSSelected = WmsParserHelper.CRS[n];
				var referentialName = CRSSelected.name;
				var nodeBBox = layerNode.querySelector("BoundingBox[SRS='"
						+ referentialName + "'],BoundingBox[CRS='"
						+ referentialName + "']");
				if (nodeBBox !== null) {
					this.CRS = referentialName;
					this.tillingScheme = new CRSSelected.tillingScheme({
						ellipsoid : CRSSelected.ellipsoid
					});
					this._firstAxeIsLatitude = CRSSelected.firstAxeIsLatitude;
					found = true;
				}
			}
			this._ready = found
					&& (Cesium.defined(this.formatImage) || Cesium
							.defined(this.formatArray))
					&& Cesium.defined(this.version);
			this.levelZeroMaximumGeometricError = Cesium.TerrainProvider
					.getEstimatedLevelZeroGeometricErrorForAHeightmap(
							this.tillingScheme.getEllipsoid(),
							this.heightmapWidth, this.tillingScheme
									.getNumberOfXTilesAtLevel(0));
		}

	};

	/**
	 * generate a altitude promise (in meters) of a cartographic point.
	 */
	WmsParserHelper.prototype.getHeight = function(urlOfServer, cartographic) {
		var resultat;
		if (this._ready && typeof (urlOfServer) === "string"
				&& cartographic instanceof Cesium.Cartographic) {
			if ("CRS:84" === this.CRS || "EPSG:4326" === this.CRS) {
				var rad2deg = 180 / Math.PI;
				var extentCalcul = new Cesium.Extent();
				var bbox = "";
				// 1 minute arc of extent!!
				extentCalcul.south = cartographic.latitude * rad2deg - 1 / 120;
				extentCalcul.north = cartographic.latitude * rad2deg + 1 / 120;
				extentCalcul.west = cartographic.longitude * rad2deg - 1 / 120;
				extentCalcul.east = cartographic.longitude * rad2deg + 1 / 120;
				var url = urlOfServer
						+ '?SERVICE=WMS&REQUEST=GetFeatureInfo&layers='
						+ this._layerName + '&version=' + this.version
						+ '&width=60&height=60&x=30&y=30'
						+ '&INFO_FORMAT=application/vnd.ogc.gml/3.1.1'
						+ '&QUERY_LAYERS=' + this._layerName;

				if (this.isNewVersion) {
					// srs become CRS
					// use firstAxe for bbox
					var bbox;
					if (this._firstAxeIsLatitude) {
						bbox = extentCalcul.south + ',' + extentCalcul.west
								+ ',' + extentCalcul.north + ','
								+ extentCalcul.east;
					} else {
						bbox = extentCalcul.west + ',' + extentCalcul.south
								+ ',' + extentCalcul.east + ','
								+ extentCalcul.north;
					}
					url += '&bbox=' + bbox + '&crs=' + this.CRS;
				} else {
					var bbox2 = extentCalcul.west + ',' + extentCalcul.south
							+ ',' + extentCalcul.east + ','
							+ extentCalcul.north;
					url += '&bbox=' + bbox2 + '&srs=' + this.CRS;
				}
				var that=this;
				resultat = Cesium.when(Cesium.loadXML(url), function(xml) {
					var retour;
					var node = xml.querySelector(that.tagAltitudeProperty);
					if (node != null) {
						retour = node.textContent;
					}
					return retour;
				});
			}
		}
		return resultat;
	}
	/**
	 * Requests the geometry for a given tile.
	 */
	WmsParserHelper.prototype.getHeightmapTerrainData = function(urlOfServer,
			x, y, level, proxy) {
		var resultat;
		if (this._ready && typeof (urlOfServer) === "string"
				&& Cesium.defined(x) && Cesium.defined(y)
				&& Cesium.defined(level)) {
			var extentCalcul = this.tillingScheme.tileXYToNativeExtent(x, y,
					level);
			// Each pixel in the heightmap represents the height at the center
			// of
			// that
			// pixel. So expand the Extent by half a sample spacing in each
			// direction
			// so that the first height is on the edge of the Extent we need
			// rather
			// than
			// half a sample spacing into the Extent.
			var xSpacing = (extentCalcul.east - extentCalcul.west)
					/ (this.heightmapWidth - 1);
			var ySpacing = (extentCalcul.north - extentCalcul.south)
					/ (this.heightmapWidth - 1);

			extentCalcul.west -= xSpacing * 0.5;
			extentCalcul.east += xSpacing * 0.5;
			extentCalcul.south -= ySpacing * 0.5;
			extentCalcul.north += ySpacing * 0.5;

			var url = urlOfServer + '?SERVICE=WMS&REQUEST=GetMap&layers='
					+ this._layerName + '&version=' + this.version + '&width='
					+ this.heightmapWidth + '&height=' + this.heightmapWidth;

			if (this.isNewVersion) {
				// srs become CRS
				// use firstAxe for bbox
				var bbox;
				if (this._firstAxeIsLatitude) {
					bbox = extentCalcul.south + ',' + extentCalcul.west + ','
							+ extentCalcul.north + ',' + extentCalcul.east;
				} else {
					bbox = extentCalcul.west + ',' + extentCalcul.south + ','
							+ extentCalcul.east + ',' + extentCalcul.north;
				}
				url += '&bbox=' + bbox + '&crs=' + this.CRS;
			} else {
				var bbox2 = extentCalcul.west + ',' + extentCalcul.south + ','
						+ extentCalcul.east + ',' + extentCalcul.north;
				url += '&bbox=' + bbox2 + '&srs=' + this.CRS;
			}
			// define format

			if (Cesium.defined(this.formatArray)) {
				url += '&format=' + this.formatArray.format;
			} else {
				url += '&format=' + this.formatImage.format;
			}

			if (Cesium.defined(proxy)) {
				url = proxy.getURL(url);
			}

			var that = this;
			var hasChildren = that.maxLevel > level ? 15 : 0;
			if (Cesium.defined(this.formatArray)
					&& Cesium.defined(this.formatArray.postProcessArray)) {
				// case of arrayBuffer
				var promise = Cesium.throttleRequestByServer(url,
						Cesium.loadArrayBuffer);
				if (Cesium.defined(promise)) {
					resultat = Cesium.when(promise, function(arrayBuffer) {
						var heightBuffer = that.formatArray.postProcessArray(
								arrayBuffer, that.heightmapWidth);
						var waterMask = new Uint8Array(heightBuffer.length);
						for (var i = 0; i < heightBuffer.length; i++) {
							if (heightBuffer[i] == 0) {
								waterMask[i] = 255;
							}
						}
						return new Cesium.HeightmapTerrainData({
							buffer : heightBuffer,
							width : that.heightmapWidth,
							height : that.heightmapWidth,
							childTileMask : hasChildren,
							waterMask : waterMask,
							structure : that.formatArray.terrainDataStructure
						});
					});
				}
			} else if (Cesium.defined(this.formatImage)) {
				// case of image
				if (level > 6) {
					return undefined;
				}
				var promise2 = Cesium.throttleRequestByServer(url,
						Cesium.loadImage);
				if (Cesium.defined(promise2)) {
					resultat = Cesium
							.when(
									promise2,
									function(image) {
										var dataPixels = Cesium
												.getImagePixels(image);
										var waterMask = new Uint8Array(
												dataPixels.length / 4);
										for (var i = 0; i < dataPixels.length; i += 4) {
											if (dataPixels[i] < 512) {
												waterMask[i / 4] = 255 - (dataPixels[i] * 255) / 512;
											}
										}
										return new Cesium.HeightmapTerrainData(
												{
													buffer : dataPixels,
													width : that.heightmapWidth,
													height : that.heightmapWidth,
													childTileMask : hasChildren,
													structure : that.formatImage.terrainDataStructure
												});
									});
				}
			}
		}
		return resultat;
	};

	/**
	 * become true after getMetaDatafromXML method didn't have problems.
	 * 
	 * @see WmsParserHelper.getMetaDatafromXML
	 */
	WmsParserHelper.prototype.isReady = function() {
		return this._ready;
	};

	/**
	 * static array where CRS availables for WmsParserHelper are defined
	 */
	WmsParserHelper.CRS = [ {
		name : "CRS:84",
		ellipsoid : Cesium.Ellipsoid.WGS84,
		firstAxeIsLatitude : false,
		tillingScheme : Cesium.GeographicTilingScheme
	}, {
		name : "EPSG:4326",
		ellipsoid : Cesium.Ellipsoid.WGS84,
		firstAxeIsLatitude : true,
		tillingScheme : Cesium.GeographicTilingScheme
	} ];

	/**
	 * static array where image format availables for WmsParserHelper are
	 * defined
	 */
	WmsParserHelper.FormatImage = [ {
		format : "image/png"
	}, {
		format : "image/png; mode=8bit"
	}, {
		format : "image/jpeg"
	}, {
		format : "image/gif"
	} ];
	/**
	 * static array where data array availables for WmsParserHelper are defined
	 */
	WmsParserHelper.FormatArray = [ {
		format : "image/bil",
		postProcessArray : function(bufferIn, height) {
			var resultat;
			var viewerIn = new DataView(bufferIn);
			var littleEndianBuffer = new ArrayBuffer(height * height * 2);
			var viewerOut = new DataView(littleEndianBuffer);
			if (littleEndianBuffer.byteLength === bufferIn.byteLength) {
				// time to switch bytes!!
				var temp, goodCell = 0, somme = 0;
				for (var i = 0; i < littleEndianBuffer.byteLength; i += 2) {
					temp = viewerIn.getUint16(i, false);
					if (temp < 20000) {
						viewerOut.setUint16(i, temp, true);
						somme += temp;
						goodCell++;
					} else {
						var val = (goodCell == 0 ? 1 : somme / goodCell);
						viewerOut.setUint16(i, val, true);
					}
				}
			} else {
				viewerOut.setInt16(0, 1);
			}
			resultat = new Uint16Array(littleEndianBuffer);
			return resultat;
		}
	} ];

	Cesium.WmsParserHelper = WmsParserHelper;

	// 1/f=(a-b)/a

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
	 *            [description.heightmapWidth] width and height of the tiles
	 * @param {Number}
	 *            [description.maxLevel] max level of tiles
	 * @see TerrainProvider
	 */
	var GeoserverTerrainProvider = function GeoserverTerrainProvider(
			description) {
		if (!Cesium.defined(description) || !Cesium.defined(description.url)
				|| !Cesium.defined(description.layerName)) {
			throw new Cesium.DeveloperError(
					'description.url and description.layerName are required.');
		}

		this._url = description.url;
		this._proxy = description.proxy;

		var that = this;

		this._wmsParserHelper = new WmsParserHelper(description);
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
		return this._wmsParserHelper.getHeightmapTerrainData(this._url, x, y,
				level, this._proxy);
	};

	/**
	 * Gets an event that is raised when the terrain provider encounters an
	 * asynchronous error. By subscribing to the event, you will be notified of
	 * the error and can potentially recover from it. Cesium.Event listeners are
	 * passed an instance of {@link TileProviderError}.
	 * 
	 * @memberof GeoserverTerrainProvider
	 * 
	 * @returns {Cesium.Event} The event.
	 */
	GeoserverTerrainProvider.prototype.getErrorEvent = function() {
		return this._errorEvent;
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
		return this._wmsParserHelper.levelZeroMaximumGeometricError
				/ (1 << level);
	};

	/**
	 * Gets the credit to display when this terrain provider is active.
	 * Typically this is used to credit the source of the terrain. This function
	 * should not be called before {@link GeoserverTerrainProvider#isReady}
	 * returns true.
	 * 
	 * @memberof GeoserverTerrainProvider
	 * 
	 * @returns {Credit} The credit, or undefined if no credix exists
	 */
	GeoserverTerrainProvider.prototype.getCredit = function() {
		return this._credit;
	};

	/**
	 * Gets the tiling scheme used by this provider. This function should not be
	 * called before {@link GeoserverTerrainProvider#isReady} returns true.
	 * 
	 * @memberof GeoserverTerrainProvider
	 * 
	 * @returns {TilingScheme} The tiling scheme.
	 * @see WebMercatorTilingScheme
	 * @see GeographicTilingScheme
	 * 
	 * @exception {DeveloperError}
	 *                <code>getTilingScheme</code> must not be called before
	 *                the terrain provider is ready.
	 */
	GeoserverTerrainProvider.prototype.getTilingScheme = function() {
		return this._wmsParserHelper.tillingScheme;
	};

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
	GeoserverTerrainProvider.prototype.hasWaterMask = function() {
		return this._wmsParserHelper.waterMask;
	};

	/**
	 * Gets a value indicating whether or not the provider is ready for use.
	 * 
	 * @memberof GeoserverTerrainProvider
	 * 
	 * @returns {Boolean} True if the provider is ready to use; otherwise,
	 *          false.
	 */
	GeoserverTerrainProvider.prototype.isReady = function() {
		return this._wmsParserHelper.isReady();
	};

	GeoserverTerrainProvider.prototype.getHeight = function(cartographic,
			callback) {
		var that = this;
		if (typeof (callback) === "function") {
			Cesium.when(that._wmsParserHelper
					.getHeight(that._url, cartographic), callback);
		} else {
			return this._wmsParserHelper.getHeight(that._url, cartographic);
		}
	};

	Cesium.GeoserverTerrainProvider = GeoserverTerrainProvider;
})();