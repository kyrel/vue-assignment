import { VehicleDataBuffer } from '@/VehicleDataBuffer'
import { defineStore } from 'pinia'
import { readonly, ref } from 'vue'

export interface VehicleState {
    time: number,
    energy: number,
    odometer: number,
    speed: number,
    stateOfCharge: number,
    latitude: number,
    longitude: number
}

export interface Vehicle {
    vehicleName: string,
    colorIndex: number,
    state: VehicleState
}

export interface HistoryData {
    vehicleName: string,
    colorIndex: number,
    time: number,
    speed: number,
    stateOfCharge: number
}

const vehicleBuffers = {} as Record<string, VehicleDataBuffer>

export const useDataStore = defineStore("data", () => {
    /** A collection of all vehicles displayed on the dashboard  */
    const vehicles = ref([] as Vehicle[])
    
    /** The currently selected vehicle. Could be null if no vehicles are displayed  */
    const selectedVehicle = ref(null as null | Vehicle)
    
    /** True if map should be auto-centered around the currently selected vehicle */
    const trackSelectedVehicle = ref(false)

    const _history = new class extends EventTarget { }

    /**
     * Set a vehicle as being selected in the UI
     * @param name
     */
    function selectVehicle(name: string) {
        selectedVehicle.value = vehicles.value.find(v => v.vehicleName == name) || null
    }  

    let _nextColorIndex = 0

    function _getOrAddStoreVehicle(vehicleName: string) {
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
            const newVehicle = { vehicleName: vehicleName, state: newState, colorIndex: _nextColorIndex }
            _nextColorIndex++
            if (_nextColorIndex > 9) _nextColorIndex = 0
            if (indexToInsert >= 0) vehicles.value.splice(indexToInsert, 0, newVehicle)
            else vehicles.value.push(newVehicle)
            vehicleBuffers[vehicleName] = new VehicleDataBuffer()
            vehicleIndex = indexToInsert >= 0 ? indexToInsert : vehicles.value.length - 1
        }
        return vehicles.value[vehicleIndex]
    }

    let _resetHasToBeHandled = false

    /**
     * Process a data point that appeared out of an external source
     */
    function processDataPoint(vehicleName: string, newState: VehicleState) {
        //This looks like a corrupt data point, let's skip it
        if (!newState.time) return

        const vehicle = _getOrAddStoreVehicle(vehicleName)

        if (!selectedVehicle.value) selectedVehicle.value = vehicle

        const currentState = vehicle.state
        const vehicleBuffer = vehicleBuffers[vehicleName]

        if (+newState.time < currentState.time) {
            if (!_resetHasToBeHandled) return // we won't process data from the past unless a server was restarted. yes, even if it still fits the buffer
            // a server reset happened - let's allow 'data from the past' and rest all time's and vehicleBuffer's
            for(const v of vehicles.value) {
                v.state.time = 0
                vehicleBuffers[v.vehicleName] = new VehicleDataBuffer()
            }
            _history.dispatchEvent(new CustomEvent("dataReset"))
            _resetHasToBeHandled = false
        }

        // we won't process an exactly the same point in time
        if (+newState.time == currentState.time) return

        // set the current state
        Object.assign(currentState, newState)

        const aggregate = vehicleBuffer.add(+newState.time, newState.speed, newState.stateOfCharge)
        if (aggregate) {
            _history.dispatchEvent(new CustomEvent("data", { detail: { vehicleName: vehicleName, colorIndex: vehicle.colorIndex, ...aggregate } }))
        }        
    }
    
    /**
     * A network error happened or server restarted!
     * Keep the current data intact, but be ready to reset them if the next data coming from the server is in the past
     */
    function beReadyToReset () {
        _resetHasToBeHandled = true
    }

    /**
     * Add a listener that will be called once the throttled history data are flushed
     * @param listener 
     */
    function addDataHistoryListener(listener: (historyData: HistoryData) => void) {
        _history.addEventListener("data", (e) => listener((e as CustomEvent).detail))
    }

    /**
     * Add a listener that will be called once new valid data started arriving after a server restart.
     * If it's called, the new data redard a time point in the past, so e.g. the charts have to be reset
     * @param listener 
     */
    function addDataResetListener(listener: () => void) {
        _history.addEventListener("dataReset", () => listener())
    }

    return { 
        vehicles: readonly(vehicles), 
        selectedVehicle: readonly(selectedVehicle), 
        trackSelectedVehicle, 
        processDataPoint, 
        beReadyToReset, 
        addDataHistoryListener,
        addDataResetListener,
        selectVehicle
    }
})