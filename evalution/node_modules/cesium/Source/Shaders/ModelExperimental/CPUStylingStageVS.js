//This file is automatically rebuilt by the Cesium build process.
export default "void filterByPassType(inout vec3 positionMC, vec4 featureColor)\n\
{\n\
    bool styleTranslucent = (featureColor.a != 1.0);\n\
    // Only render translucent features in the translucent pass (if the style or the original command has translucency).\n\
    if (czm_pass == czm_passTranslucent && !styleTranslucent && !model_commandTranslucent)\n\
    {\n\
        positionMC *= 0.0;\n\
    }\n\
    // If the current pass is not the transluceny pass and the style is not translucent, don't rendeer the feature.\n\
    else if (czm_pass != czm_passTranslucent && styleTranslucent)\n\
    {\n\
        positionMC *= 0.0;\n\
    }\n\
}\n\
\n\
void cpuStylingStage(inout vec3 positionMC, inout SelectedFeature feature)\n\
{\n\
    float show = ceil(feature.color.a);\n\
    positionMC *= show;\n\
\n\
    #ifdef HAS_SELECTED_FEATURE_ID_ATTRIBUTE\n\
    filterByPassType(positionMC, feature.color);\n\
    #endif\n\
}\n\
";
