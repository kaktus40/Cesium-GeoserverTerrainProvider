//This file is automatically rebuilt by the Cesium build process.
export default "void instancingStage(inout vec3 positionMC) \n\
{\n\
    mat4 instancingTransform = getInstancingTransform();\n\
\n\
    positionMC = (instancingTransform * vec4(positionMC, 1.0)).xyz;\n\
}\n\
";
