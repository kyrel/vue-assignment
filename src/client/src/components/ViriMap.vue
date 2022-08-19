<script setup lang="ts">

import { YandexMap, YandexMarker } from 'vue-yandex-maps'
import { watch } from 'vue';
import type { MapSettings } from 'vue-yandex-maps/dist/types';

const props = defineProps<{
  latitude: number,
  longitude: number,
  markers: {
    id: string,
    latitude: number,
    longitude: number,
    ymapColor: string
  }[],
  selectedMarkerId: string | null
  trackMarkerId: string | null
}>()

const emits = defineEmits(["markerClick"])

const yandexMapSettings: MapSettings = {
  apiKey: '680bf2a4-9435-46be-99c5-be6e47b8d00f',
  lang: 'en_RU'
}

//const marker = ref<InstanceType<typeof YandexMarker> | null>(null)
let map: any | null = null;
const markerRefs = [] as { id: string, marker: InstanceType<typeof YandexMarker> }[]

function storeMarkerRef(id: string, component: InstanceType<typeof YandexMarker>) {
  const existingIndex = markerRefs.findIndex(m => m.id == id)
  if (existingIndex >= 0) markerRefs.splice(existingIndex, 1)
  markerRefs.push({ id, marker: component })
}

watch([() => props.markers, () => props.selectedMarkerId], ([markers, selectedMarkerId]) => {
  //remove markers that are no longer in props
  //add markers that are not here (BUT HOW)
  //set marker coords
  for (let propMarker of markers) {
    const markerRef = markerRefs.find(m => m.id == propMarker.id)
    if (!markerRef) return
    (markerRef.marker as any).geometry.setCoordinates([propMarker.latitude, propMarker.longitude])
    
    if (selectedMarkerId == propMarker.id) {
      (markerRef.marker as any).options.set({ preset: `islands#${propMarker.ymapColor}DotIcon` })
      //console.log(markerRef.marker)
      //      (markerRef.marker as any).geometry.setCoordinates([propMarker.latitude, propMarker.longitude])
    }
    else {
      (markerRef.marker as any).options.set({ preset: `islands#${propMarker.ymapColor}Icon` })
    }

    if (props.trackMarkerId == propMarker.id) {
      if (!map.action.getCurrentState().isTicking) map.setCenter([propMarker.latitude, propMarker.longitude], map.action.getCurrentState().zoom)
    }
  }
}, { deep: true })

function mapCreated(ymap: any) {
  map = ymap
  map.setZoom(13)
}

function jumpTo(markerId: string) {
  if (!map) return
  const marker = props.markers.find(m => m.id == markerId)
  if (marker) {
    map.setCenter([marker.latitude, marker.longitude])
  }
}

defineExpose({ jumpTo })

function markerClick(ev: any) {
  emits("markerClick", ev.originalEvent.target.properties._data.markerId)
}

</script>

<template>
  <div class="map">
    <div class="map__ymap-wrapper">
      <YandexMap :settings="yandexMapSettings" :coordinates="[latitude, longitude]" @created="mapCreated">
        <YandexMarker v-for="marker of markers" :coordinates="[marker.latitude, marker.longitude]" @click="markerClick"
          :marker-id="marker.id" :properties="{ hintContent: marker.id }"
          :options="{ preset: `islands#${marker.ymapColor}Icon` }"
          :ref="(el) => storeMarkerRef(marker.id, el as InstanceType<typeof YandexMarker>)">
        </YandexMarker>
      </YandexMap>
    </div>
  </div>
</template>

<style>
.yandex-container {
  height: 100%;
}

.yandex-container>div {
  max-height: 100%;
}

</style>

<style scoped>
.map__ymap-wrapper {
  height: 300px;
  position: relative;
}

@media (max-width: 480px) {
  .map__ymap-wrapper {
    height: 250px;
  }
}
</style>
