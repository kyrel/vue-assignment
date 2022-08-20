<script setup lang="ts">
import { useDataStore } from './stores/data'
import ViriBar from './components/ViriBar.vue'
import ViriMap from './components/ViriMap.vue'

import ViriTimeChart from './components/ViriTimeChart.vue'
import { nextTick, ref } from 'vue';
import colorPool from '@/colorPool'

const HISTORY_TIME_WINDOW_MS = 1000 * 60 * 10

const dataStore = useDataStore()
function speedPercentage(val: number) {
  const max = 150
  if (val > max) return 100
  return val * 100 / max
}
const map = ref(null as null | InstanceType<typeof ViriMap>)
const speedChart = ref(null as null | InstanceType<typeof ViriTimeChart>)
const stateOfChargeChart = ref(null as null | InstanceType<typeof ViriTimeChart>)

dataStore.addDataHistoryListener((data)=>{
  speedChart.value?.addDataPoint(data.vehicleName, data.colorIndex, data.timestamp, data.speed)
  stateOfChargeChart.value?.addDataPoint(data.vehicleName, data.colorIndex, data.timestamp, data.stateOfCharge)
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
</script>

<template>
  <main class="dashboard__column" v-if="dataStore.activeVehicle">
    <div class="dashboard__row">
      <div class="dashboard__map">
        <ViriMap ref="map" :latitude="dataStore.activeVehicle.state.latitude"
          :longitude="dataStore.activeVehicle.state.longitude"
          :markers="dataStore.vehicles.map(v => ({ id: v.vehicleName, latitude: v.state.latitude, longitude: v.state.longitude, ymapColor: colorPool[v.colorIndex].ymapColor }))"
          :selected-marker-id="dataStore.activeVehicle?.vehicleName ||  null"
          :track-marker-id="dataStore.trackedVehicleName" @marker-click="setActiveVehicle" />
      </div>
      <div class="dashboard__column dashboard__selector-and-details">
        <div class="dashboard__vehicle-selector">
          <button v-for="vehicle of dataStore.vehicles" @click="setActiveVehicle(vehicle.vehicleName)"
            class="color-coded-button"
            :class="[{ 'color-coded-button--active': vehicle == dataStore.activeVehicle }, 'color-coded-button--' + vehicle.colorIndex]">
            {{ vehicle.vehicleName }}
          </button>
        </div>
        <Transition name="ease-in-out-" mode="out-in">
          <div v-if="showDetails" class="dashboard__column">
            <div class="dashboard__bar-item dashboard__vehicle-map-controls">
              <button @click="jumpToActiveVehicle">Jump to vehicle locaiton</button>
              <label>
                <input type="checkbox" :checked="dataStore.activeVehicle.vehicleName == dataStore.trackedVehicleName"
                  @change="dataStore.toggleActiveVehicleTrack()"> Track vehicle on map
              </label>
            </div>
            <div class="dashboard__bar-item">
              <label class="dashboard__item-label">Current Speed</label>
              <ViriBar :percentage-full="speedPercentage(dataStore.activeVehicle.state.speed)"
                :label="`${dataStore.activeVehicle.state.speed.toFixed(1)}&nbsp;km/h`" />
            </div>
            <div class="dashboard__bar-item">
              <label class="dashboard__item-label">State of charge</label>
              <ViriBar :percentage-full="dataStore.activeVehicle.state.stateOfCharge"
                :label="`${dataStore.activeVehicle.state.stateOfCharge.toFixed(1)}&nbsp;%`" />
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
    <div>
      <label class="dashboard__item-label">Speed profile</label>
      <ViriTimeChart :max="60" :max-grow-step="10" y-axis-title="Speed, km/h" ref="speedChart"
        :time-window-ms="HISTORY_TIME_WINDOW_MS" />
    </div>
    <div>
      <label class="dashboard__item-label">State of charge profile</label>
      <ViriTimeChart :max="100" :max-grow-step="10" y-axis-title="State of charge, %" ref="stateOfChargeChart"
        :time-window-ms="HISTORY_TIME_WINDOW_MS" />
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

.dashboard__vehicle-selector {
  border-bottom: 1px solid #bdbdbd;
  padding-bottom: 4px;
  display: flex;
  flex-wrap: wrap;
  column-gap: 10px;
  row-gap: 10px;
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

.dashboard__map {
  width: 496px;
}

.dashboard__selector-and-details {
  width: 380px;
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

.dashboard__row--items {
  column-gap: 0;
}

.dashboard__bar-item {
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


@media(max-width: 1023px) {
  .dashboard__row {
    flex-flow: row wrap;
  }

  .dashboard__map {
    width: 100%;
  }

  .dashboard__selector-and-details {
    width: 100%;
  }
}
</style>
