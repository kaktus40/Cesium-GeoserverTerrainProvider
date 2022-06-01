//This file is automatically rebuilt by the Cesium build process.
export default "void legacyInstancingStage(inout vec3 positionMC, out mat4 instanceModelView, out mat3 instanceModelViewInverseTranspose)\n\
{\n\
    mat4 instancingTransform = getInstancingTransform();\n\
\n\
    mat4 instanceModel = instancingTransform * u_instance_nodeTransform;\n\
    instanceModelView = u_instance_modifiedModelView;\n\
    instanceModelViewInverseTranspose = mat3(u_instance_modifiedModelView * instanceModel);\n\
\n\
    positionMC = (instanceModel * vec4(positionMC, 1.0)).xyz;\n\
}\n\
";
