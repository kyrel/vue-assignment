import { defineStore } from 'pinia'
import { ref } from 'vue'

interface DataPoint {
  time: number,
  energy: number,
  gps: string,
  odo: number,
  speed: number,
  soc: number,
  vehicleName: string
}

export interface VehicleState {
  latestTime: number,
  energy: number,
  odometer: number,
  speed: number,
  stateOfCharge: number,
  latitude: number,
  longitude: number,
  historyTimestamps: number[],
  speedHistory: number[],
  stateOfChargeHistory: number[]
}

export interface Vehicle {
  vehicleName: string,
  colorIndex: number,
  state: VehicleState
}

interface VehicleBuffer {
  timestamp: number,
  speed: number[],
  stateOfCharge: number[]
}

const vehicleBuffers = {} as Record<string, VehicleBuffer>

const HISTORY_TIME_WINDOW_MS = 1000 * 60 * 10

let nextColorIndex = 0

export const useDataStore = defineStore("data", () => {
  // const latestTime = ref(0)
  // const energy = ref(0)
  // const odometer = ref(0)
  // const speed = ref(0)
  // const stateOfCharge = ref(0)
  // const latitude = ref(0)
  // const longitude = ref(0)
  // const historyTimestamps = ref([] as number[])
  // const speedHistory = ref([] as number[])
  // const stateOfChargeHistory = ref([] as number[])


  const vehicles = ref([] as Vehicle[])
  const activeVehicle = ref(null as null | Vehicle)
  const trackedVehicleName = ref(null as null | string)

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

  function flushBuffer(buffer: VehicleBuffer, state: VehicleState) {
    let itemsToRemove = 0
    while (itemsToRemove + 1 < state.historyTimestamps.length && state.historyTimestamps[itemsToRemove + 1] < +buffer.timestamp - HISTORY_TIME_WINDOW_MS)
      itemsToRemove++
    if (itemsToRemove) {
      state.historyTimestamps.splice(0, itemsToRemove)
      state.speedHistory.splice(0, itemsToRemove)
      state.stateOfChargeHistory.splice(0, itemsToRemove)      
    }
    state.historyTimestamps.push(+buffer.timestamp)
    const avgSpeed = buffer.speed.reduce((prev, current) => prev + current) / buffer.speed.length
    state.speedHistory.push(avgSpeed)
    const avgStateOfCharge = buffer.stateOfCharge.reduce((prev, current) => prev + current) / buffer.stateOfCharge.length
    state.stateOfChargeHistory.push(avgStateOfCharge)

    buffer.timestamp = 0
    buffer.speed = []
    buffer.stateOfCharge = []
  }

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
        longitude: 0,
        historyTimestamps: [],
        speedHistory: [],
        stateOfChargeHistory: []
      }
      const newVehicle = { vehicleName: dataPoint.vehicleName, state: newState, colorIndex: nextColorIndex }
      nextColorIndex++
      if (nextColorIndex > 9) nextColorIndex = 0
      if (indexToInsert >= 0) vehicles.value.splice(indexToInsert, 0, newVehicle)
      else vehicles.value.push(newVehicle)
      vehicleBuffers[dataPoint.vehicleName] = { timestamp: 0, speed: [], stateOfCharge: [] }
      vehicleIndex = indexToInsert >= 0 ? indexToInsert : vehicles.value.length - 1
    }
    if (!activeVehicle.value) activeVehicle.value = vehicles.value[vehicleIndex]
    const vehicleState = vehicles.value[vehicleIndex].state
    const vehicleBuffer = vehicleBuffers[dataPoint.vehicleName]
    //we won't process an exactly the same point in time
    if (+dataPoint.time == vehicleState.latestTime) return

    //This looks like a corrupt data point, let's skip it
    if (!dataPoint.time) return

    // the file is over and we have to restart
    if (+dataPoint.time < vehicleState.latestTime) {
      vehicleState.historyTimestamps = []
      vehicleState.speedHistory = []
      vehicleState.stateOfChargeHistory = []
      vehicleState.latestTime = 0
      
      vehicleBuffer.timestamp = 0
      vehicleBuffer.speed = []
      vehicleBuffer.stateOfCharge = []
    }
    // set the current state
    vehicleState.energy = +dataPoint.energy
    vehicleState.odometer = +dataPoint.odo
    vehicleState.speed = +dataPoint.speed
    vehicleState.stateOfCharge = +dataPoint.soc
    const gps = dataPoint.gps.split("|")
    vehicleState.latitude = +gps[0]
    vehicleState.longitude = +gps[1]

    // check if we need to flush the history buffer
    if (vehicleBuffer.timestamp != 0 && Math.round(vehicleBuffer.timestamp / 5000) != Math.round(+dataPoint.time / 5000)) {
      flushBuffer(vehicleBuffer, vehicleState)
    }

    if (!vehicleBuffer.timestamp) vehicleBuffer.timestamp = +dataPoint.time
    vehicleBuffer.speed.push(+dataPoint.speed)
    vehicleBuffer.stateOfCharge.push(+dataPoint.soc)

    vehicleState.latestTime = +dataPoint.time
  }

  const socket = new WebSocket(import.meta.env.VITE_WS_ROOT)
  socket.onmessage = (event) => {
    const data = JSON.parse(event.data) as DataPoint
    processDataPoint(data)
  }

  return { vehicles, activeVehicle, trackedVehicleName, setActiveVehicle, trackActiveVehicle, untrackVehicle, toggleActiveVehicleTrack }
})