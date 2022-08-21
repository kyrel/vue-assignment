import { VehicleDataBuffer } from '@/VehicleDataBuffer'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface HistoryData {
    vehicleName: string,
    colorIndex: number,
    timestamp: number,
    speed: number,
    stateOfCharge: number
}

export interface VehicleState {
    time: number,
    energy: number,
    odometer: number,
    speed: number,
    stateOfCharge: number,
    latitude: number,
    longitude: number
}

interface Vehicle {
    vehicleName: string,
    colorIndex: number,
    state: VehicleState
}

const vehicleBuffers = {} as Record<string, VehicleDataBuffer>

let nextColorIndex = 0

export const useDataStore = defineStore("data", () => {

    const vehicles = ref([] as Vehicle[])
    const activeVehicle = ref(null as null | Vehicle)
    const trackedVehicleName = ref(null as null | string)
    const history = new class extends EventTarget { }

    /**
     * Set a vehicle as being selected in the UI
     * @param name
     */
    function selectVehicle(name: string) {
        activeVehicle.value = vehicles.value.find(v => v.vehicleName == name) || null
    }

    function trackActiveVehicle() {
        trackedVehicleName.value = activeVehicle.value?.vehicleName || null
    }

    function untrackVehicle() {
        trackedVehicleName.value = null
    }

    function toggleActiveVehicleTrack() {
        if (!activeVehicle.value) return
        if (trackedVehicleName.value == activeVehicle.value.vehicleName) untrackVehicle()
        else trackActiveVehicle()
    }

    function getOrAddStoreVehicle(vehicleName: string) {
        let vehicleIndex = vehicles.value.findIndex(v => v.vehicleName == vehicleName)
        if (vehicleIndex < 0) {
            const indexToInsert = vehicles.value.findIndex(v => v.vehicleName.localeCompare(vehicleName) > 0)
            const newState: VehicleState = {
                time: 0,
                energy: 0,
                odometer: 0,
                speed: 0,
                stateOfCharge: 0,
                latitude: 0,
                longitude: 0
            }
            const newVehicle = { vehicleName: vehicleName, state: newState, colorIndex: nextColorIndex }
            nextColorIndex++
            if (nextColorIndex > 9) nextColorIndex = 0
            if (indexToInsert >= 0) vehicles.value.splice(indexToInsert, 0, newVehicle)
            else vehicles.value.push(newVehicle)
            vehicleBuffers[vehicleName] = new VehicleDataBuffer()
            vehicleIndex = indexToInsert >= 0 ? indexToInsert : vehicles.value.length - 1
        }
        return vehicles.value[vehicleIndex]
    }

    let resetHasToBeHandled = false

    /**
     * Process a data point that appeared out of an external source
     */
    function processDataPoint(vehicleName: string, newState: VehicleState) {
        //This looks like a corrupt data point, let's skip it
        if (!newState.time) return

        const vehicle = getOrAddStoreVehicle(vehicleName)

        if (!activeVehicle.value) activeVehicle.value = vehicle

        const currentState = vehicle.state
        const vehicleBuffer = vehicleBuffers[vehicleName]

        if (+newState.time < currentState.time) {
            if (!resetHasToBeHandled) return // we won't process data from the past unless a server was restarted. yes, even if it still fits the buffer
            // a server reset happened - let's allow 'data from the past' and rest all time's and vehicleBuffer's
            for(let v of vehicles.value) {
                v.state.time = 0
                vehicleBuffers[v.vehicleName] = new VehicleDataBuffer()
            }
            history.dispatchEvent(new CustomEvent("dataReset"))
            resetHasToBeHandled = false
        }

        // we won't process an exactly the same point in time
        if (+newState.time == currentState.time) return

        // set the current state
        Object.assign(currentState, newState)

        const aggregate = vehicleBuffer.add(+newState.time, newState.speed, newState.stateOfCharge)
        if (aggregate) {
            history.dispatchEvent(new CustomEvent("data", { detail: { vehicleName: vehicleName, colorIndex: vehicle.colorIndex, ...aggregate } }))
        }        
    }
    
    /**
     * A network error happened or server restarted!
     * Keep the current data intact, but be ready to reset them if the next data coming from the server is in the past
     */
    function beReadyToReset () {
        resetHasToBeHandled = true
    }

    /**
     * Add a listener that will be called once the throttled history data are flushed
     * @param listener 
     */
    function addDataHistoryListener(listener: (historyData: HistoryData) => void) {
        history.addEventListener("data", (e) => listener((e as CustomEvent).detail))
    }

    /**
     * Add a listener that will be called once new valid data started arriving after a server restart.
     * If it's called, the new data redard a time point in the past, so e.g. the charts have to be reset
     * @param listener 
     */
    function addDataResetListener(listener: () => void) {
        history.addEventListener("dataReset", (e) => listener())
    }
    
    return { 
        vehicles, 
        activeVehicle, 
        trackedVehicleName, 
        processDataPoint, 
        beReadyToReset, 
        addDataHistoryListener,
        addDataResetListener,
        selectVehicle,
        trackActiveVehicle,
        untrackVehicle,
        toggleActiveVehicleTrack 
    }
})