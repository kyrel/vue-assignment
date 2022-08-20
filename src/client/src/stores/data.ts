import VehicleDataBuffer from '@/VehicleDataBuffer'
import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * A data point received from the socket
 */
interface DataPoint {
  time: number,
  energy: number,
  gps: string,
  odo: number,
  speed: number,
  soc: number,
  vehicleName: string
}

export interface HistoryData {
  vehicleName: string,
  colorIndex: number,
  timestamp: number,
  speed: number,
  stateOfCharge: number
}

export interface VehicleState {
  latestTime: number,
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

const vehicleBuffers = {} as Record<string, VehicleDataBuffer>

let nextColorIndex = 0

export const useDataStore = defineStore("data", () => {

  const vehicles = ref([] as Vehicle[])
  const activeVehicle = ref(null as null | Vehicle)
  const trackedVehicleName = ref(null as null | string)
  const history = new class extends EventTarget { }

  function setActiveVehicle(name: string) {
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

  /**
   * Process a data point that appeared out of the WebSocket connection
   */
  function processDataPoint(dataPoint: DataPoint) {
    //This looks like a corrupt data point, let's skip it
    if (!dataPoint.time) return

    let vehicleIndex = vehicles.value.findIndex(v => v.vehicleName == dataPoint.vehicleName)
    if (vehicleIndex < 0) {
      const indexToInsert = vehicles.value.findIndex(v => v.vehicleName.localeCompare(dataPoint.vehicleName) > 0)
      const newState: VehicleState = {
        latestTime: 0,
        energy: 0,
        odometer: 0,
        speed: 0,
        stateOfCharge: 0,
        latitude: 0,
        longitude: 0
      }
      const newVehicle = { vehicleName: dataPoint.vehicleName, state: newState, colorIndex: nextColorIndex }
      nextColorIndex++
      if (nextColorIndex > 9) nextColorIndex = 0
      if (indexToInsert >= 0) vehicles.value.splice(indexToInsert, 0, newVehicle)
      else vehicles.value.push(newVehicle)
      vehicleBuffers[dataPoint.vehicleName] = new VehicleDataBuffer()
      vehicleIndex = indexToInsert >= 0 ? indexToInsert : vehicles.value.length - 1
    }
    const vehicle = vehicles.value[vehicleIndex]

    if (!activeVehicle.value) activeVehicle.value = vehicle

    const vehicleState = vehicle.state
    const vehicleBuffer = vehicleBuffers[dataPoint.vehicleName]

    // we won't process an exactly the same point in time
    if (+dataPoint.time == vehicleState.latestTime) return    

    // we won't process data from the past
    // TODO: still process it if it falls nicely in the buffer
    if (+dataPoint.time < vehicleState.latestTime) return

    // set the current state
    vehicleState.energy = +dataPoint.energy
    vehicleState.odometer = +dataPoint.odo
    vehicleState.speed = +dataPoint.speed
    vehicleState.stateOfCharge = +dataPoint.soc
    const gps = dataPoint.gps.split("|")
    vehicleState.latitude = +gps[0]
    vehicleState.longitude = +gps[1]

    const aggregate = vehicleBuffer.add(+dataPoint.time, +dataPoint.speed, +dataPoint.soc)
    if (aggregate) {
      history.dispatchEvent(new CustomEvent("data", { detail: { vehicleName: dataPoint.vehicleName, colorIndex: vehicle.colorIndex, ...aggregate} }))
    }

    vehicleState.latestTime = +dataPoint.time
  }

  function addDataHistoryListener(listener: (historyData: HistoryData) => void) {
    history.addEventListener("data", (e) => listener((e as CustomEvent).detail))
  }

  const socket = new WebSocket(import.meta.env.VITE_WS_ROOT)
  socket.onmessage = (event) => {
    const data = JSON.parse(event.data) as DataPoint
    processDataPoint(data)
  }

  return { vehicles, activeVehicle, trackedVehicleName, addDataHistoryListener, setActiveVehicle, trackActiveVehicle, untrackVehicle, toggleActiveVehicleTrack }
})