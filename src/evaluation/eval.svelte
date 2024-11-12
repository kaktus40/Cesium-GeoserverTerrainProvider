<script lang="ts">
  import type { TerrainProvider } from "cesium";
  import { ImageryLayer, Viewer, viewerDragDropMixin, WebMapServiceImageryProvider } from "cesium";
  import { onMount } from "svelte";
  import GeoserverTerrainProvider from "../plugin";
  import { conf as configuration } from "./config";
  let container: HTMLDivElement;

  let viewer: Viewer;
  const terrainProviders: { [name: string]: TerrainProvider } = $state({});
  let selectedTerrain: string = $state()!;
  const imageryLayers: { [name: string]: ImageryLayer } = $state({});
  let selectedImagery: string = $state()!;
  function updateTerrain() {
    if (viewer) {
      viewer.terrainProvider = terrainProviders[selectedTerrain];
    }
  }

  onMount(async () => {
    const terrainsC = configuration.terrains;
    for (let name in terrainsC) {
      terrainProviders[name] = await GeoserverTerrainProvider(terrainsC[name]);
    }
    const imageLayer = new ImageryLayer();
    const imageriesC = configuration.images;
    for (let name in imageriesC) {
      imageryLayers[name] = new ImageryLayer(
        new WebMapServiceImageryProvider(imageriesC[name])
      );
      selectedImagery = name;
    }

    const options = {
      baseLayer: imageryLayers[selectedImagery],
      baseLayerPicker: false,
      showRenderLoopErrors: true,
      animation: true,
      fullscreenButton: false,
      geocoder: false,
      homeButton: false,
      infoBox: false,
      sceneModePicker: true,
      selectionIndicator: false,
      timeline: false,
      navigationHelpButton: false,
      navigationInstructionsInitiallyVisible: false,
      targetFrameRate: 30,
      terrainExaggeration: 1.0,
    };

    viewer = new Viewer(container, options);
	viewer.extend(viewerDragDropMixin)
  });
</script>

<div class="command">
  <select bind:value={selectedTerrain} onchange={updateTerrain}>
    #{#each Object.keys(terrainProviders) as name, i}
      <option value={name}>{name}</option>
    {/each}
  </select>
</div>
<div class="cesiumContainer" bind:this={container}></div>

<style>
  .cesiumContainer {
    width: 90%;
    height: 100%;
  }
  .command {
    z-index: 3;
  }
</style>
