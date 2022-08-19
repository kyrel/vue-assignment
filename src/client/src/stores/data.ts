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

export interface HistoryPoint {
  timestamp: number,
  speed: number,
  stateOfCharge: number
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
  longitude: number,
  historyPoint?: HistoryPoint
}

export interface Vehicle {
  vehicleName: string,
  colorIndex: number,
  state: VehicleState
}

class VehicleBuffer {
  timestamp: number = 0
  speed: number[] = []
  stateOfCharge: number[] = []

  reset() {
    this.timestamp = 0
    this.speed = []
    this.stateOfCharge = []
  }

  flush() {
    const avgSpeed = this.speed.reduce((prev, current) => prev + current) / this.speed.length
    const avgStateOfCharge = this.stateOfCharge.reduce((prev, current) => prev + current) / this.stateOfCharge.length
    const result = { timestamp: +this.timestamp, speed: avgSpeed, stateOfCharge: avgStateOfCharge }
    this.reset()
    return result
  }

  add(time: number, speed: number, stateOfCharge: number) {
    if (this.timestamp != 0 && Math.round(this.timestamp / 5000) != Math.round(time / 5000)) {
      return this.flush()
    }

    if (!this.timestamp) this.timestamp = time
    this.speed.push(speed)
    this.stateOfCharge.push(stateOfCharge)
  }
}

const vehicleBuffers = {} as Record<string, VehicleBuffer>

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
      vehicleBuffers[dataPoint.vehicleName] = new VehicleBuffer()
      vehicleIndex = indexToInsert >= 0 ? indexToInsert : vehicles.value.length - 1
    }
    const vehicle = vehicles.value[vehicleIndex]
    if (!activeVehicle.value) activeVehicle.value = vehicle
    const vehicleState = vehicle.state
    const vehicleBuffer = vehicleBuffers[dataPoint.vehicleName]
    //we won't process an exactly the same point in time
    if (+dataPoint.time == vehicleState.latestTime) return

    //This looks like a corrupt data point, let's skip it
    if (!dataPoint.time) return

    // the file is over and we have to restart
    if (+dataPoint.time < vehicleState.latestTime) {
      vehicleState.historyPoint = undefined
      vehicleState.latestTime = 0

      vehicleBuffer.reset()
    }
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
      vehicleState.historyPoint = aggregate
      history.dispatchEvent(new CustomEvent("data", { detail: { vehicleName: dataPoint.vehicleName, colorIndex: vehicle.colorIndex, ...aggregate} }))
    }

    vehicleState.latestTime = +dataPoint.time
  }

  function addDataListener(listener: (historyData: HistoryData) => void) {
    history.addEventListener("data", (e) => listener((e as CustomEvent).detail))
  }

  const socket = new WebSocket(import.meta.env.VITE_WS_ROOT)
  socket.onmessage = (event) => {
    const data = JSON.parse(event.data) as DataPoint
    processDataPoint(data)
  }

  return { vehicles, activeVehicle, trackedVehicleName, addDataListener, setActiveVehicle, trackActiveVehicle, untrackVehicle, toggleActiveVehicleTrack }
})