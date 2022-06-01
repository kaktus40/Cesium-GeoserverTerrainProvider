//This file is automatically rebuilt by the Cesium build process.
export default "precision highp float;\n\
\n\
czm_modelVertexOutput defaultVertexOutput(vec3 positionMC) {\n\
    czm_modelVertexOutput vsOutput;\n\
    vsOutput.positionMC = positionMC;\n\
    vsOutput.pointSize = 1.0;\n\
    return vsOutput;\n\
}\n\
\n\
void main() \n\
{\n\
    // Initialize the attributes struct with all\n\
    // attributes except quantized ones.\n\
    ProcessedAttributes attributes;\n\
    initializeAttributes(attributes);\n\
\n\
    // Dequantize the quantized ones and add them to the\n\
    // attributes struct.\n\
    #ifdef USE_DEQUANTIZATION\n\
    dequantizationStage(attributes);\n\
    #endif\n\
\n\
    #ifdef HAS_MORPH_TARGETS\n\
    morphTargetsStage(attributes);\n\
    #endif\n\
\n\
    #ifdef HAS_SKINNING\n\
    skinningStage(attributes);\n\
    #endif\n\
\n\
    // Compute the bitangent according to the formula in the glTF spec.\n\
    // Normal and tangents can be affected by morphing and skinning, so\n\
    // the bitangent should not be computed until their values are finalized.\n\
    #ifdef HAS_BITANGENTS\n\
    attributes.bitangentMC = normalize(cross(attributes.normalMC, attributes.tangentMC) * attributes.tangentSignMC);\n\
    #endif\n\
\n\
    FeatureIds featureIds;\n\
    featureIdStage(featureIds, attributes);\n\
\n\
    #ifdef HAS_SELECTED_FEATURE_ID\n\
    SelectedFeature feature;\n\
    selectedFeatureIdStage(feature, featureIds);\n\
    cpuStylingStage(attributes.positionMC, feature);\n\
    #endif\n\
\n\
    mat4 modelView = czm_modelView;\n\
    mat3 normal = czm_normal;\n\
\n\
    // Update the position for this instance in place\n\
    #ifdef HAS_INSTANCING\n\
\n\
        // The legacy instance stage  is used when rendering I3DM models that \n\
        // encode instances transforms in world space, as opposed to glTF models\n\
        // that use EXT_mesh_gpu_instancing, where instance transforms are encoded\n\
        // in object space.\n\
        #ifdef USE_LEGACY_INSTANCING\n\
        mat4 instanceModelView;\n\
        mat3 instanceModelViewInverseTranspose;\n\
        \n\
        legacyInstancingStage(attributes.positionMC, instanceModelView, instanceModelViewInverseTranspose);\n\
\n\
        modelView = instanceModelView;\n\
        normal = instanceModelViewInverseTranspose;\n\
        #else\n\
        instancingStage(attributes.positionMC);\n\
        #endif\n\
\n\
        #ifdef USE_PICKING\n\
        v_pickColor = a_pickColor;\n\
        #endif\n\
\n\
    #endif\n\
\n\
    Metadata metadata;\n\
    metadataStage(metadata, attributes);\n\
\n\
    #ifdef HAS_CUSTOM_VERTEX_SHADER\n\
    czm_modelVertexOutput vsOutput = defaultVertexOutput(attributes.positionMC);\n\
    customShaderStage(vsOutput, attributes, featureIds, metadata);\n\
    #endif\n\
\n\
    // Compute the final position in each coordinate system needed.\n\
    // This also sets gl_Position.\n\
    geometryStage(attributes, modelView, normal);    \n\
\n\
    #ifdef PRIMITIVE_TYPE_POINTS\n\
        #ifdef HAS_CUSTOM_VERTEX_SHADER\n\
        gl_PointSize = vsOutput.pointSize;\n\
        #elif defined(USE_POINT_CLOUD_ATTENUATION)\n\
        gl_PointSize = pointCloudAttenuationStage(v_positionEC);\n\
        #else\n\
        gl_PointSize = 1.0;\n\
        #endif\n\
    #endif\n\
}\n\
";
