//This file is automatically rebuilt by the Cesium build process.
export default "void customShaderStage(\n\
    inout czm_modelMaterial material,\n\
    ProcessedAttributes attributes,\n\
    FeatureIds featureIds,\n\
    Metadata metadata\n\
) {\n\
    // FragmentInput and initializeInputStruct() are dynamically generated in JS, \n\
    // see CustomShaderPipelineStage.js\n\
    FragmentInput fsInput;\n\
    initializeInputStruct(fsInput, attributes);\n\
    fsInput.featureIds = featureIds;\n\
    fsInput.metadata = metadata;\n\
    fragmentMain(fsInput, material);\n\
}\n\
";
