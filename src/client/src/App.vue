<script setup lang="ts">
import { useDataStore } from './stores/dataStore'
import ViriBar from './components/ViriBar.vue'
import ViriMap from './components/ViriMap.vue'

import ViriTimeChart from './components/ViriTimeChart.vue'
import { nextTick, ref } from 'vue';
import colorPool from '@/colorPool'
import '@/assets/color-coding.scss'
import { DataListener } from './DataListener';
import { storeToRefs } from 'pinia';

/** Range of milliseconds that fits in the X axes of the charts */
const HISTORY_TIME_WINDOW_MS = 1000 * 60 * 20

const dataStore = useDataStore()

/** Some simple logic to covert km/h speed to % of the bar */
function speedPercentage(val: number) {
    const max = 150
    if (val > max) return 100
    return val * 100 / max
}

const map = ref(null as null | InstanceType<typeof ViriMap>)
const speedChart = ref(null as null | InstanceType<typeof ViriTimeChart>)
const stateOfChargeChart = ref(null as null | InstanceType<typeof ViriTimeChart>)

dataStore.addDataHistoryListener((data) => {
    // A moving average has arrived, send it to graphs
    speedChart.value?.addDataPoint(data.vehicleName, data.colorIndex, data.time, data.speed)
    stateOfChargeChart.value?.addDataPoint(data.vehicleName, data.colorIndex, data.time, data.stateOfCharge)
})

dataStore.addDataResetListener(() => {
    // Looks like the server has been restared and we need to start all over
    speedChart.value?.reset()
    stateOfChargeChart.value?.reset()
})

const dataListener = new DataListener(
    (vehicleName, state) => {
        // Let the store process the data from the socket
        dataStore.processDataPoint(vehicleName, state)
    },
    () => {
        // Inform the store that there was an interruption in data transfer. From now on, if new data will appeat from the past, reset everything
        dataStore.beReadyToReset()
    })

dataListener.connect()

function jumpToSelectedVehicle() {
    if (!map.value) return
    if (!dataStore.selectedVehicle) return
    if (dataStore.trackSelectedVehicle) return
    map.value.jumpTo(dataStore.selectedVehicle.vehicleName)
}

const { selectedVehicle } = storeToRefs(dataStore)

const showDetails = ref(true)

async function selectVehicle(vehicleName: string) {
    // Show details helps us trigger the animation
    showDetails.value = false
    dataStore.selectVehicle(vehicleName)
    await nextTick()
    showDetails.value = true
}
</script>

<template>
    <main class="dashboard" v-if="selectedVehicle">
        <div class="dashboard__map-and-details">
            <div class="dashboard__map">
                <ViriMap ref="map" :latitude="selectedVehicle.state.latitude"
                    :longitude="selectedVehicle.state.longitude"
                    :markers="dataStore.vehicles.map(v => ({ id: v.vehicleName, latitude: v.state.latitude, longitude: v.state.longitude, ymapColor: colorPool[v.colorIndex].ymapColor }))"
                    :selected-marker-id="selectedVehicle.vehicleName" :track-selected="dataStore.trackSelectedVehicle"
                    @marker-click="selectVehicle" />
            </div>
            <div class="dashboard__details-with-selector">
                <div class="dashboard__vehicle-selector">
                    <button v-for="vehicle of dataStore.vehicles" :key="vehicle.vehicleName"
                        @click="selectVehicle(vehicle.vehicleName)" class="dashboard__vehicle-button color-coded-button"
                        :class="[{ 'color-coded-button--active': vehicle.vehicleName == selectedVehicle.vehicleName }, 'color-coded-button--' + vehicle.colorIndex]">
                        {{ vehicle.vehicleName }}
                    </button>
                </div>
                <Transition name="ease-in-out-" mode="out-in">
                    <div v-if="showDetails" class="dashboard__details">
                        <div class="dashboard__vehicle-map-controls">
                            <button @click="jumpToSelectedVehicle">Jump to vehicle locaiton</button>
                            <label>
                                <input type="checkbox" v-model="dataStore.trackSelectedVehicle"> Track vehicle on map
                            </label>
                        </div>
                        <div>
                            <label class="dashboard__item-label">Current Speed</label>
                            <ViriBar :percentage-full="speedPercentage(selectedVehicle.state.speed)"
                                :label="`${selectedVehicle.state.speed.toFixed(1)}&nbsp;km/h`" />
                        </div>
                        <div>
                            <label class="dashboard__item-label">State of charge</label>
                            <ViriBar :percentage-full="selectedVehicle.state.stateOfCharge"
                                :label="`${selectedVehicle.state.stateOfCharge.toFixed(1)}&nbsp;%`" />
                        </div>
                        <div class="dashboard__plain-values">
                            <div class="dashboard__plain-value-item">
                                <label class="dashboard__item-label">Energy</label>
                                <div>{{ selectedVehicle.state.energy.toFixed(1) }} kW</div>
                            </div>
                            <div class="dashboard__plain-value-item">
                                <label class="dashboard__item-label">Odometer</label>
                                <div>{{ selectedVehicle.state.odometer.toFixed(1) }} km</div>
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

@mixin flex-row($column-gap, $row-gap: 10px) {
    display: flex;
    flex-flow: row wrap;
    row-gap: $row-gap;
    column-gap: $column-gap;
}

/* @define dashboard */
.dashboard {
    @include flex-column;

    &__map-and-details {
        @include flex-row($column-gap: 20px);
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
        @include flex-row($column-gap: 10px);

        border-bottom: 1px solid var(--color-border);
        padding-bottom: 4px;
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
        @include flex-row($column-gap: 12px);
    }

    &__plain-values {
        @include flex-row($column-gap: 0);
    }

    &__plain-value-item {
        flex: 1;
    }

    &__item-label {
        display: block;
        margin-bottom: 4px;
        font-weight: 700;
        color: var(--color-heading);
    }
}
</style>
