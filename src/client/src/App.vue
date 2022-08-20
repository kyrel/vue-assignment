<script setup lang="ts">
import { useDataStore } from './stores/data'
import ViriBar from './components/ViriBar.vue'
import ViriMap from './components/ViriMap.vue'

import ViriTimeChart from './components/ViriTimeChart.vue'
import { nextTick, ref } from 'vue';
import colorPool from '@/colorPool'
import '@/assets/color-coding.css'

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

dataStore.addDataHistoryListener((data) => {
    speedChart.value?.addDataPoint(data.vehicleName, data.colorIndex, data.timestamp, data.speed)
    stateOfChargeChart.value?.addDataPoint(data.vehicleName, data.colorIndex, data.timestamp, data.stateOfCharge)
})

function jumpToActiveVehicle() {
    if (!map.value) return
    if (!dataStore.activeVehicle) return
    if (dataStore.activeVehicle.vehicleName == dataStore.trackedVehicleName) return
    dataStore.untrackVehicle()
    map.value.jumpTo(dataStore.activeVehicle.vehicleName)
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
    <main class="dashboard" v-if="dataStore.activeVehicle">
        <div class="dashboard__map-and-details">
            <div class="dashboard__map">
                <ViriMap ref="map" :latitude="dataStore.activeVehicle.state.latitude"
                    :longitude="dataStore.activeVehicle.state.longitude"
                    :markers="dataStore.vehicles.map(v => ({ id: v.vehicleName, latitude: v.state.latitude, longitude: v.state.longitude, ymapColor: colorPool[v.colorIndex].ymapColor }))"
                    :selected-marker-id="dataStore.activeVehicle?.vehicleName || null"
                    :track-marker-id="dataStore.trackedVehicleName" @marker-click="setActiveVehicle" />
            </div>
            <div class="dashboard__details-with-selector">
                <div class="dashboard__vehicle-selector">
                    <button v-for="vehicle of dataStore.vehicles" :key="vehicle.vehicleName"
                        @click="setActiveVehicle(vehicle.vehicleName)"
                        class="dashboard__vehicle-button color-coded-button"
                        :class="[{ 'color-coded-button--active': vehicle == dataStore.activeVehicle }, 'color-coded-button--' + vehicle.colorIndex]">
                        {{ vehicle.vehicleName }}
                    </button>
                </div>
                <Transition name="ease-in-out-" mode="out-in">
                    <div v-if="showDetails" class="dashboard__details">
                        <div class="dashboard__vehicle-map-controls">
                            <button @click="jumpToActiveVehicle">Jump to vehicle locaiton</button>
                            <label>
                                <input type="checkbox"
                                    :checked="dataStore.activeVehicle.vehicleName == dataStore.trackedVehicleName"
                                    @change="dataStore.toggleActiveVehicleTrack()"> Track vehicle on map
                            </label>
                        </div>
                        <div>
                            <label class="dashboard__item-label">Current Speed</label>
                            <ViriBar :percentage-full="speedPercentage(dataStore.activeVehicle.state.speed)"
                                :label="`${dataStore.activeVehicle.state.speed.toFixed(1)}&nbsp;km/h`" />
                        </div>
                        <div>
                            <label class="dashboard__item-label">State of charge</label>
                            <ViriBar :percentage-full="dataStore.activeVehicle.state.stateOfCharge"
                                :label="`${dataStore.activeVehicle.state.stateOfCharge.toFixed(1)}&nbsp;%`" />
                        </div>
                        <div class="dashboard__plain-values">
                            <div class="dashboard__plain-value-item">
                                <label class="dashboard__item-label">Energy</label>
                                <div>{{ dataStore.activeVehicle.state.energy.toFixed(1) }} kW</div>
                            </div>
                            <div class="dashboard__plain-value-item">
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

<style scoped lang="scss">
/* @define ease-in-out */
.ease-in-out {
    &--enter-active,
    &--leave-active {
        transition: opacity 0.128s ease;
    }

    &--enter-from,
    &--leave-to {
        opacity: 0;
    }
}

@mixin flex-column {
    display: flex;
    flex-direction: column;
    row-gap: 20px;
}

/* @define dashboard */
.dashboard {
    @include flex-column;

    &__map-and-details {
        display: flex;
        flex-flow: row wrap;
        column-gap: 20px;
        row-gap: 10px;
    }

    &__map {
        width: 496px;
    }

    &__details-with-selector {
        @include flex-column;

        width: 380px;
    }

    @media (max-width: 1023px) {
        &__map {
            width: 100%;
        }

        &__details-with-selector {
            width: 100%;
        }
    }

    &__vehicle-selector {
        border-bottom: 1px solid #bdbdbd;
        padding-bottom: 4px;
        display: flex;
        flex-wrap: wrap;
        column-gap: 10px;
        row-gap: 10px;
    }

    &__vehicle-button {
        border-radius: 4px;
        cursor: pointer;
        padding: 0.375rem 0.75rem;
    }

    &__details {
        @include flex-column;
    }

    &__vehicle-map-controls {
        display: flex;
        flex-flow: row wrap;
        column-gap: 12px;
    }

    &__plain-values {
        display: flex;
        flex-flow: row wrap;
        row-gap: 10px;
    }

    &__plain-value-item {
        flex: 1;
    }

    &__item-label {
        display: block;
        margin-bottom: 4px;
        font-weight: 700;
    }
}
</style>
