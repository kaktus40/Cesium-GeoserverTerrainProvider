//This file is automatically rebuilt by the Cesium build process.
export default "void geometryStage(inout ProcessedAttributes attributes, mat4 modelView, mat3 normal) \n\
{\n\
    // Compute positions in different coordinate systems\n\
    vec3 positionMC = attributes.positionMC;\n\
    v_positionMC = positionMC;\n\
    v_positionEC = (modelView * vec4(positionMC, 1.0)).xyz;\n\
    gl_Position = czm_projection * vec4(v_positionEC, 1.0);\n\
\n\
    // Sometimes the fragment shader needs this (e.g. custom shaders)\n\
    #ifdef COMPUTE_POSITION_WC\n\
    // Note that this is a 32-bit position which may result in jitter on small\n\
    // scales.\n\
    v_positionWC = (czm_model * vec4(positionMC, 1.0)).xyz;\n\
    #endif\n\
\n\
    #ifdef HAS_NORMALS\n\
    v_normalEC = normal * attributes.normalMC;\n\
    #endif\n\
\n\
    #ifdef HAS_TANGENTS\n\
    v_tangentEC = normalize(normal * attributes.tangentMC);    \n\
    #endif\n\
\n\
    #ifdef HAS_BITANGENTS\n\
    v_bitangentEC = normalize(normal * attributes.bitangentMC);\n\
    #endif\n\
\n\
    // All other varyings need to be dynamically generated in\n\
    // GeometryPipelineStage\n\
    setDynamicVaryings(attributes);\n\
}\n\
";
