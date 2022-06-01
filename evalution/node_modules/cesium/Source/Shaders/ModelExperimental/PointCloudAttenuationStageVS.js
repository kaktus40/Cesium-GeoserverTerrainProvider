//This file is automatically rebuilt by the Cesium build process.
export default "float pointCloudAttenuationStage(vec3 positionEC) {\n\
  // Variables are packed into a single vector to minimize gl.uniformXXX() calls\n\
  float pointSize = model_pointCloudAttenuation.x;\n\
  float geometricError = model_pointCloudAttenuation.y;\n\
  float depthMultiplier = model_pointCloudAttenuation.z;\n\
  float depth = -positionEC.z;\n\
  return min((geometricError / depth) * depthMultiplier, pointSize);\n\
}\n\
";
