package org.geotools.GeotiffTranslate;

import org.geotools.coverage.CoverageFactoryFinder;
import org.geotools.coverage.grid.GridCoverage2D;
import org.geotools.coverage.grid.GridCoverageFactory;
import org.geotools.coverage.grid.Interpolator2D;
import org.geotools.coverage.grid.io.imageio.GeoToolsWriteParams;
import org.geotools.gce.geotiff.GeoTiffFormat;
import org.geotools.gce.geotiff.GeoTiffReader;
import org.geotools.gce.geotiff.GeoTiffWriteParams;
import org.geotools.gce.geotiff.GeoTiffWriter;
import org.jaitools.imageutils.ImageUtils;
import org.opengis.parameter.GeneralParameterValue;
import org.opengis.parameter.ParameterValue;

import javax.media.jai.Interpolation;
import javax.media.jai.TiledImage;
import java.awt.image.Raster;
import java.awt.image.RenderedImage;
import java.io.File;
import java.io.FileFilter;
import java.io.IOException;

public class App {
	public static void main(String[] args) {
		GeoTiffWriteParams params = new GeoTiffWriteParams();
		params.setCompressionMode(GeoTiffWriteParams.MODE_EXPLICIT);
		// CCITT RLE CCITT T.4 CCITT T.6 LZW JPEG ZLib PackBits Deflate EXIF
		// JPEG
		params.setCompressionType("Deflate");
		params.setTilingMode(GeoTiffWriteParams.MODE_EXPLICIT);
		params.setTiling(256, 256);
		ParameterValue<GeoToolsWriteParams> value = GeoTiffFormat.GEOTOOLS_WRITE_PARAMS
				.createValue();
		value.setValue(params);
		GeneralParameterValue[] tabParametre = { value };

		File inputDirectory = null;
		File outputDirectory = null;
		String stringSortie = "output";
		String stringEntree = "input";
		String stringOffset = "offset";
		String typeParam = "";
		Integer offset = new Integer(0);
		boolean removeOrigine = false;
		Boolean deflate = Boolean.FALSE;
		for (int i = 0; i < args.length; i++) {
			switch (args[i]) {
			case "-i":
				if ("".equals(typeParam)) {
					typeParam = stringEntree;
				}
				break;
			case "-o":
				if ("".equals(typeParam)) {
					typeParam = stringSortie;
				}
				break;
			case "-s":
				if ("".equals(typeParam)) {
					typeParam = stringOffset;
				}
				break;
			case "-delete":
				removeOrigine = true;
				break;
			case "-deflate":
				deflate = true;
				try {
					Runtime.getRuntime().exec("gdal_translate");
				} catch (IOException e1) {
					System.err.println("gdal_translate is unreachable");
					deflate = null;
				}
				break;
			default:
				if (stringSortie.equals(typeParam)) {
					outputDirectory = new File(args[i]);
					typeParam = "";
					if (!outputDirectory.isDirectory()) {
						outputDirectory = null;
						System.err
								.println("the outputDirectory is not a directory");
					}
				}
				if (stringEntree.equals(typeParam)) {
					inputDirectory = new File(args[i]);
					typeParam = "";
					if (!inputDirectory.isDirectory()) {
						inputDirectory = null;
						System.err
								.println("the inputDirectory is not a directory");
					}
				}
				if (stringSortie.equals(typeParam)) {
					offset = null;
					try {
						offset = Integer.parseInt(args[i]);
					} catch (NumberFormatException ex) {
						System.err.println("offset is not an integer");
					}
				}
			}
		}
		if (outputDirectory == null || inputDirectory == null || offset == null
				|| deflate == null) {
			System.err
					.println("-i inputDirectory -o outputDirectory -s offset -delete -deflate\nwhere inputDirectory (mandatory) is a directory which contains tif images (extension tif or tiff)\nand outputDirectory (mandatory) is a directory where the application can write\noffset (optional) is an integer which offsets the altitude (in meters)\n-delete indicates if the original tifs should be deleted (need of space storage)\nand -deflate to deflate the generated tif (needs gdal_translate to be reachable)");
		} else {
			File[] listeFichiers = inputDirectory.listFiles(new FileFilter() {
				@Override
				public boolean accept(File pathname) {
					return pathname.getName().endsWith(".tiff")
							|| pathname.getName().endsWith(".tif");
				}
			});
			boolean isOK = true;
			if (listeFichiers.length == 0) {
				System.err
						.println("there is no file with extension tif or tiff");
				isOK = false;
			}
			if (!outputDirectory.canWrite()) {
				System.err.println("Can not write in "
						+ outputDirectory.getAbsolutePath());
				isOK = false;
			}

			if (isOK) {
				File entree;
				File sortie;
				String outputDirectoryString = outputDirectory
						.getAbsolutePath() + "/";
				int percentage, total = listeFichiers.length;
				for (int i = 0; i < total; i++) {
					System.out.print("\b\b\b\b\b\b\b\b\b\b\b\b\b\b\b\b");
					entree = listeFichiers[i];
					sortie = new File(outputDirectoryString + entree.getName());
					try {
						converterFile(entree, sortie, offset, removeOrigine,
								deflate, tabParametre);
					} catch (Exception e) {
						System.err.println(e.getMessage());
					}
					percentage = i * 100 / total;
					System.out.print(percentage + "%");
				}
				System.out.print("\b\b\b\b\b\b\b\b\b\b\b\b\b\b\b\b\b\b\b");
				System.out.print("100%");
			}
		}
	}

	public static void converterFile(File input, File output, int offset,
			boolean removeOrigine, boolean deflate,
			GeneralParameterValue[] values) throws Exception {
		GeoTiffReader reader = new GeoTiffReader(input);
		GridCoverage2D grilleEntree = reader.read(null);
		RenderedImage imageEntree = grilleEntree.getRenderedImage();
		if (imageEntree.getColorModel().getNumComponents() != 1
				|| imageEntree.getColorModel().getPixelSize() != 16) {
			throw new Exception(input.getAbsolutePath()
					+ " is not a int16 Gray image!!");
		}

		int width = imageEntree.getWidth();
		int height = imageEntree.getHeight();
		int[] tabTemp = { 0 };
		int valeurEntree;
		byte valeurRouge, valeurVerte;
        int nodataValue=(int)reader.getMetadata().getNoData();
        if(nodataValue==0){
            nodataValue=-32762;
        }
        nodataValue=nodataValue+32768;
        int high=9000+32768;
        int low=-500+32768;
		TiledImage imageSortie = ImageUtils.createConstantImage(width, height,
				new Byte[] { 0, 0, 0 });
		Raster raster = grilleEntree.getRenderedImage().getData();
		for (int x = 0; x < width; x++) {
			for (int y = 0; y < height; y++) {
				valeurEntree = raster.getPixel(x, y, tabTemp)[0] + offset+32768;
                valeurRouge = (byte) (valeurEntree >> 8);
                valeurVerte = (byte) (valeurEntree - (valeurRouge << 8));
                imageSortie.setSample(x, y, 0, valeurRouge);
                imageSortie.setSample(x, y, 1, valeurVerte);
                if(valeurEntree==nodataValue||valeurEntree<low||valeurEntree>high) {
                    imageSortie.setSample(x, y, 2, 0);
                }else{
                    imageSortie.setSample(x, y, 2, 255);
                }
			}
		}
		File temp;
		if (deflate) {
			temp = new File(output.getAbsolutePath() + "temp");
		} else {
			temp = output;
		}
		GridCoverageFactory gcf = CoverageFactoryFinder
				.getGridCoverageFactory(null);
		GridCoverage2D tmp = gcf.create("cov", imageSortie,
				grilleEntree.getEnvelope2D());
        GridCoverage2D coverage=Interpolator2D.create(tmp, Interpolation.getInstance(Interpolation.INTERP_BILINEAR));

		GeoTiffWriter writer = new GeoTiffWriter(temp);
		writer.write(coverage, values);
		writer.dispose();
		reader.dispose();
		if (removeOrigine) {
			boolean delete = input.delete();
			if (!delete) {
				throw new Exception(input.getAbsolutePath()
						+ " wasn't removed!!");
			}
		}
		if (deflate) {
			String[] commands = new String[3];
			commands[2] = "gdal_translate -co \"INTERLEAVE=BAND\" -co \"TILED=YES\" -co \"COMPRESS=DEFLATE\" -co \"ZLEVEL=7\" "
					+ temp.getAbsolutePath() + " " + output.getAbsolutePath();
			boolean isWindows = System.getProperties().getProperty("os.name")
					.toLowerCase().contains("window");
			if (isWindows) {
				commands[0] = "cmd";
				commands[1] = "/C";
			} else {
				commands[0] = "sh";
				commands[1] = "-c";
			}
			Process proc = Runtime.getRuntime().exec(commands);
			proc.waitFor();
			temp.delete();
		}
	}
}
