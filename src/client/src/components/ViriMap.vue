<script setup lang="ts">

import { YandexMap, YandexMarker } from 'vue-yandex-maps'
import { watch } from 'vue';

const props = defineProps<{
  latitude: number,
  longitude: number,
  markers: {
    id: string,
    latitude: number,
    longitude: number,
    preset: string
  }[],
  trackMarkerId: string | null
}>()

const yandexMapSettings = {
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

watch(() => props.markers, (markers) => {
  //remove markers that are no longer in props
  //add markers that are not here (BUT HOW)
  //set marker coords
  for (let propMarker of markers) {
    /*console.log("Got marker in props:")
    console.log(propMarker)
    console.log("local markers are")
    console.log(markerRefs)*/

    const markerRef = markerRefs.find(m => m.id == propMarker.id)
    if (!markerRef) return
    (markerRef.marker as any).geometry.setCoordinates([propMarker.latitude, propMarker.longitude])
    if (props.trackMarkerId == propMarker.id) {
      //console.log(map.getZoom())

      if (!map.action.getCurrentState().isTicking) map.setCenter([propMarker.latitude, propMarker.longitude], map.action.getCurrentState().zoom)

      //map.setZoom([propMarker.latitude, propMarker.longitude])
    }
  }
}, { deep: true })

// watch(() => [props.latitude, props.longitude], ([lat, long]) => {
//   if (marker.value) {
//     (marker.value as any).geometry.setCoordinates([lat, long])
//   }
//     // TODO: this is how we can track map but do we need it?
//   // if (map) {
//   //   map.setCenter([lat, long])
//   // }
// })

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

</script>

<template>
  <div class="map">
    <div class="map__ymap-wrapper">
      <YandexMap :settings="yandexMapSettings" :coordinates="[latitude, longitude]" @created="mapCreated">
        <YandexMarker v-for="marker of markers" :coordinates="[marker.latitude, marker.longitude]"
          :marker-id="marker.id" :properties="{ hintContent: marker.id }" :options="{ preset: marker.preset }"
          :ref="(el) => storeMarkerRef(marker.id, el as InstanceType<typeof YandexMarker>)">
          <!-- <template #component>
        <CustomBalloon v-model="name" />
      </template> -->
        </YandexMarker>
      </YandexMap>
    </div>
    <!-- <div class="map__controls">
      <label class="map__controls-label">Jump to:</label>
      <button @click="jumpTo">Vehicle #1</button>
    </div> -->
  </div>
</template>

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

/* .map__controls {
  margin-top: 4px;
}

.map__controls-label {
  display: inline-block;
  font-weight: 700;
} */
</style>
