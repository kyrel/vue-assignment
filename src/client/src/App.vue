<script setup lang="ts">
import { useDataStore, type HistoryPoint, type Vehicle } from './stores/data'
import ViriBar from './components/ViriBar.vue'
import ViriMap from './components/ViriMap.vue'

import ViriTimeChart from './components/ViriTimeChart.vue'
import { computed, nextTick, ref, watch } from 'vue';
import colorPool from '@/colorPool'
import { storeToRefs } from 'pinia';

const HISTORY_TIME_WINDOW_MS = 1000 * 60 * 10

const dataStore = useDataStore()
function speedPercentage(val: number) {
  const max = 150
  if (val > max) return 100
  return val * 100 / max
}

// const speedChartOptions = {
//   scales: {
//     x: {
//       type: 'time',
//       time: {
//         // Luxon format string
//         tooltipFormat: 'DD T'
//       },
//       title: {
//         display: true,
//         text: 'Date'
//       }
//     },
//     y: {
//       title: {
//         display: true,
//         text: 'speed'
//       }
//     }
//   }
// }

const map = ref(null as null | InstanceType<typeof ViriMap>)
const speedChart = ref(null as null | InstanceType<typeof ViriTimeChart>)
const stateOfChargeChart = ref(null as null | InstanceType<typeof ViriTimeChart>)
const watchedVehicleNames = [] as string[]

function processChange(vehicleName: string, colorIndex: number, historyPoint?: HistoryPoint) {
  if (!historyPoint) return
  //console.log("processChange")
  speedChart.value?.addDataPoint(vehicleName, colorIndex, historyPoint.timestamp, historyPoint.speed)
  stateOfChargeChart.value?.addDataPoint(vehicleName, colorIndex, historyPoint.timestamp, historyPoint.stateOfCharge)
}

function watchVehicle(vehicle: Vehicle) {  
  if (!watchedVehicleNames.includes(vehicle.vehicleName)) {
    watchedVehicleNames.push(vehicle.vehicleName)
    processChange(vehicle.vehicleName, vehicle.colorIndex, vehicle.state.historyPoint)
    watch(() => vehicle.state.historyPoint, historyPoint => {
      processChange(vehicle.vehicleName, vehicle.colorIndex, historyPoint)
    })
  }  
}

//THIS IS SOME UGLY EVENT EMULATION
const {vehicles : vehiclesRef} = storeToRefs(dataStore)
for (let vehicle of vehiclesRef.value) { 
  watchVehicle(vehicle)
}

watch(()=>vehiclesRef.value.length, len => {
  for (let vehicle of vehiclesRef.value) watchVehicle(vehicle)
})


function jumpToActiveVehicle() {
  if (dataStore.activeVehicle?.vehicleName == dataStore.trackedVehicleName) return
  dataStore.untrackVehicle()
  map.value!.jumpTo(dataStore.activeVehicle!.vehicleName)
}

const showDetails = ref(true)

async function setActiveVehicle(vehicleName: string) {
  showDetails.value = false
  dataStore.setActiveVehicle(vehicleName)
  await nextTick()
  showDetails.value = true
}

// const speedData = computed(() => dataStore.vehicles.map(v => ({
//   datasetName: v.vehicleName,
//   colorIndex: v.colorIndex,
//   data: v.state.history.map(h => ({ x: h.timestamp, y: h.speed }))
// })))

// const stateOfChargeData = computed(() => dataStore.vehicles.map(v => ({
//   datasetName: v.vehicleName,
//   colorIndex: v.colorIndex,
//   data: v.state.history.map(h => ({ x: h.timestamp, y: h.stateOfCharge }))
// })))

</script>

<template>
  <main class="dashboard__column" v-if="dataStore.activeVehicle">
    <div class="dashboard__row">
      <div class="dashboard__column dashboard__column--map">
        <ViriMap ref="map" :latitude="dataStore.activeVehicle.state.latitude"
          :longitude="dataStore.activeVehicle.state.longitude"
          :markers="dataStore.vehicles.map(v => ({ id: v.vehicleName, latitude: v.state.latitude, longitude: v.state.longitude, preset: colorPool[v.colorIndex].ymapPreset }))"
          :track-marker-id="dataStore.trackedVehicleName" />
      </div>
      <div class="dashboard__column dashboard__column--bars">
        <div class="dashboard__row dashboard__vehicle-buttons">
          <button v-for="vehicle of dataStore.vehicles" @click="setActiveVehicle(vehicle.vehicleName)"
            class="color-coded-button"
            :class="[{ 'color-coded-button--active': vehicle == dataStore.activeVehicle }, 'color-coded-button--' + vehicle.colorIndex]">
            {{ vehicle.vehicleName }}
          </button>
        </div>
        <Transition name="ease-in-out-" mode="out-in">
          <div v-if="showDetails" class="dashboard__column">
            <div class="dashboard__row">
              <div class="dashboard__bar-item dashboard__vehicle-map-controls">
                <button @click="jumpToActiveVehicle">Jump to vehicle locaiton</button>
                <label>
                  <input type="checkbox" :checked="dataStore.activeVehicle.vehicleName == dataStore.trackedVehicleName"
                    @change="dataStore.toggleActiveVehicleTrack()"> Track vehicle on map
                </label>
              </div>
            </div>
            <div class="dashboard__row">
              <div class="dashboard__bar-item">
                <label class="dashboard__item-label">Current Speed</label>
                <ViriBar :percentage-full="speedPercentage(dataStore.activeVehicle.state.speed)"
                  :label="`${dataStore.activeVehicle.state.speed.toFixed(1)}&nbsp;km/h`" />
              </div>
            </div>
            <div class="dashboard__row">
              <div class="dashboard__bar-item">
                <label class="dashboard__item-label">State of charge</label>
                <ViriBar :percentage-full="dataStore.activeVehicle.state.stateOfCharge"
                  :label="`${dataStore.activeVehicle.state.stateOfCharge.toFixed(1)}&nbsp;%`" />
              </div>
            </div>
            <div class="dashboard__row dashboard__row--items">
              <div class="dashboard__value-item">
                <label class="dashboard__item-label">Energy</label>
                <div>{{ dataStore.activeVehicle.state.energy.toFixed(1) }} kW</div>
              </div>
              <div class="dashboard__value-item">
                <label class="dashboard__item-label">Odometer</label>
                <div>{{ dataStore.activeVehicle.state.odometer.toFixed(1) }} km</div>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>
    <div class="dashboard__row dashboard__row--chart">
      <!-- <ViriChart
        :timestamps="[new Date(2022, 10, 11).getTime(), new Date(2022, 10, 12).getTime(), new Date(2022, 10, 13).getTime(), new Date(2022, 10, 14).getTime(), new Date(2022, 10, 15).getTime(), new Date(2022, 10, 16).getTime()]"
        :data="[12, 19, 3, 5, 2, 3]" /> -->
      <div class="dashboard__chart-item">
        <label class="dashboard__item-label">Speed profile</label>
        <ViriTimeChart :max="60" :max-grow-step="10" y-axis-title="Speed, km/h" ref="speedChart"
          :time-window-ms="HISTORY_TIME_WINDOW_MS" />
      </div>
    </div>
    <div class="dashboard__row dashboard__row--chart">
      <!-- <ViriChart
        :timestamps="[new Date(2022, 10, 11).getTime(), new Date(2022, 10, 12).getTime(), new Date(2022, 10, 13).getTime(), new Date(2022, 10, 14).getTime(), new Date(2022, 10, 15).getTime(), new Date(2022, 10, 16).getTime()]"
        :data="[12, 19, 3, 5, 2, 3]" /> -->
      <div class="dashboard__chart-item">
        <label class="dashboard__item-label">State of charge profile</label>
        <ViriTimeChart :max="100" :max-grow-step="10" y-axis-title="State of charge, %" ref="stateOfChargeChart"
          :time-window-ms="HISTORY_TIME_WINDOW_MS" />
      </div>
    </div>
  </main>
</template>

<style scoped>
.ease-in-out--enter-active,
.ease-in-out--leave-active {
  transition: opacity 0.128s ease;
}

.ease-in-out--enter-from,
.ease-in-out--leave-to {
  opacity: 0;
}

.dashboard__vehicle-buttons {
  border-bottom: 1px solid #bdbdbd;
  padding-bottom: 4px;
}

.dashboard__vehicle-map-controls {
  display: flex;
  column-gap: 12px;
  flex-flow: row wrap;
}

.color-coded-button {
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  padding: .375rem .75rem;
  transition: color .15s ease-in-out,
    background-color .15s ease-in-out,
    border-color .15s ease-in-out,
    box-shadow .15s ease-in-out;
}


.color-coded-button--0 {
  border-color: #007bff;
  color: #007bff;
}

.color-coded-button--0:hover,
.color-coded-button--0.color-coded-button--active {
  color: #fff;
  background-color: #007bff;
}

.color-coded-button--1 {
  border-color: #6c757d;
  color: #6c757d;
}

.color-coded-button--1:hover,
.color-coded-button--1.color-coded-button--active {
  color: #fff;
  background-color: #6c757d;
}

.color-coded-button--2 {
  border-color: #28a745;
  color: #28a745;
}

.color-coded-button--2:hover,
.color-coded-button--2.color-coded-button--active {
  color: #fff;
  background-color: #28a745;
}

.dashboard__column {
  display: flex;
  flex-direction: column;
  row-gap: 20px;
}

@media (max-width: 1024px) {
  .dashboard__row {
    row-gap: 10px;
  }
}

.dashboard__column--map {
  width: 496px;

}

.dashboard__column--bars {
  width: 380px;
}

.dashboard__column--map :deep(.yandex-container) {
  height: 100%;
}

.dashboard__row {
  display: flex;
  column-gap: 20px;
  row-gap: 20px;
}

@media (max-width: 1024px) {
  .dashboard__row {
    column-gap: 10px;
    row-gap: 10px;
  }
}

/* .dashboard__row--chart {
  height: 300px;
} */

.dashboard__row--items {
  column-gap: 0;
}

.dashboard__bar-item {
  flex-grow: 1;
}

.dashboard__chart-item {
  flex-grow: 1;
}

.dashboard__value-item {
  flex: 1;
}

.dashboard__item-label {
  display: block;
  margin-bottom: 4px;
  font-weight: 700;
}

/* .dashboard__vehicle-switch--active {
  border-width: 4px;
} */

@media(max-width: 1023px) {
  .dashboard__row {
    flex-flow: row wrap;
  }

  .dashboard__column--map {
    width: 100%;
  }

  .dashboard__column--bars {
    width: 100%;
  }

  .dashboard__chart-item {
    width: 100%;
  }
}
</style>
