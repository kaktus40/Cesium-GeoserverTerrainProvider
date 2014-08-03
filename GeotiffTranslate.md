#Why GeotiffTranslate?
If you don't want to use BIL/DDS plug-in with geoserver, or if you don't want to use a style with your requested image, you can convert your geotiff images of 16 bits IntGray format into a classical format 8 bits Red Green Blue color. GeoserveTerrainProvider can work with BIL/DDS and images converted by GeotiffTranslate.

You can find the source code of GeotiffTranslate (1 file) [here](GeotiffTranslateSources/java/org/geotools/GeotiffTranslate/App.java) and its pom.xml [here](GeotiffTranslateSources/pom.xml)

#How to use GeotiffTranslate.jar
* Extract in the same directory GeotiffTranslate_lib and GeotiffTranslate.jar
* Use the command line 
```
java -jar GeotiffTranslate.jar -i inputDirectory -o outputDirectory -s offset -delete -deflate
```

where:
  * inputDirectory (mandatory) is a directory which contains tif images to convert(extension tif or tiff)
  * outputDirectory (mandatory) is a directory where the application can **write** the converted images
  * offset (optional with default value=0) is an integer which offsets the altitude (in meters)
  * delete (optional) indicates if the original tifs should be deleted (need of space storage)
  * deflate (optional) to deflate the converted tif with gdal\_translate (*gdal_translate must be reachable*)
