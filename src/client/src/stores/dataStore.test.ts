import { setActivePinia, createPinia } from 'pinia'
import { useDataStore, type HistoryData } from './dataStore'
import { VehicleDataBuffer } from '@/VehicleDataBuffer'

vi.mock('@/VehicleDataBuffer', ()=>{
    const VehicleDataBuffer = vi.fn()
    VehicleDataBuffer.prototype.add = vi.fn()
    return { VehicleDataBuffer }
})

describe("Data store", () => {
    let buffer: VehicleDataBuffer

    beforeEach(() => { 
        buffer = new VehicleDataBuffer(10000)
        setActivePinia(createPinia()) 
    })

    afterEach(() => {
        vi.clearAllMocks()
    })

    it('starts with empty list of vehicles and no selected vehicle', () => {
        const store = useDataStore()
        expect(store.vehicles).toBeTruthy()
        expect(store.vehicles.length).toBe(0)
        expect(store.selectedVehicle).toBeNull()
    })

    it("adds a vehicle and makes it selected when data arrives", () => {
        const store = useDataStore()
        const time = new Date().getTime()
        const state = {
            time,
            energy: 100,
            odometer: 1000,
            speed: 20,
            stateOfCharge: 80,
            latitude: 51,
            longitude: 47
        }
        store.processDataPoint("Bus 1", state)
        expect(store.vehicles.length).toBe(1)
        expect(store.vehicles[0].vehicleName).toBe("Bus 1")
        expect(store.vehicles[0].colorIndex).toBe(0)
        expect(store.vehicles[0].state).toStrictEqual(state)
        expect(store.selectedVehicle?.vehicleName == "Bus 1")
    })

    it("adds a second vehicle but first one stays selected", () => {
        const store = useDataStore()
        const time = new Date().getTime()
        const state = {
            time,
            energy: 100,
            odometer: 1000,
            speed: 20,
            stateOfCharge: 80,
            latitude: 51,
            longitude: 47
        }
        const time2 = time + 100
        const state2 = {
            time: time2,
            energy: 120,
            odometer: 900,
            speed: 25,
            stateOfCharge: 81,
            latitude: 53,
            longitude: 42
        }
        store.processDataPoint("Bus 1", state)
        store.processDataPoint("Bus 2", state2)
        expect(store.vehicles.length).toBe(2)
        expect(store.vehicles[0].vehicleName).toBe("Bus 1")
        expect(store.vehicles[0].colorIndex).toBe(0)
        expect(store.vehicles[0].state).toStrictEqual(state)
        expect(store.vehicles[1].vehicleName).toBe("Bus 2")
        expect(store.vehicles[1].colorIndex).toBe(1)
        expect(store.vehicles[1].state).toStrictEqual(state2)
        expect(store.selectedVehicle?.vehicleName == "Bus 1")
    })

    it("can modify state of vehicle", () => {
        const store = useDataStore()
        const time = new Date().getTime()
        const state = {
            time,
            energy: 100,
            odometer: 1000,
            speed: 20,
            stateOfCharge: 80,
            latitude: 51,
            longitude: 47
        }
        const time2 = time + 100
        const state2 = {
            time: time2,
            energy: 120,
            odometer: 900,
            speed: 25,
            stateOfCharge: 81,
            latitude: 53,
            longitude: 42
        }
        store.processDataPoint("Bus 1", state)
        store.processDataPoint("Bus 1", state2)
        expect(store.vehicles.length).toBe(1)
        expect(store.vehicles[0].vehicleName).toBe("Bus 1")
        expect(store.vehicles[0].colorIndex).toBe(0)
        expect(store.vehicles[0].state).toStrictEqual(state2)
        expect(store.selectedVehicle?.vehicleName == "Bus 1")
    })

    it("can select vehicle", () => {
        const store = useDataStore()
        const time = new Date().getTime()
        const state = {
            time,
            energy: 100,
            odometer: 1000,
            speed: 20,
            stateOfCharge: 80,
            latitude: 51,
            longitude: 47
        }
        const time2 = time + 100
        const state2 = {
            time: time2,
            energy: 120,
            odometer: 900,
            speed: 25,
            stateOfCharge: 81,
            latitude: 53,
            longitude: 42
        }
        store.processDataPoint("Bus 1", state)
        store.processDataPoint("Bus 2", state2)
        expect(store.vehicles.length).toBe(2)
        expect(store.vehicles[0].vehicleName).toBe("Bus 1")
        expect(store.vehicles[0].colorIndex).toBe(0)
        expect(store.vehicles[0].state).toStrictEqual(state)
        expect(store.vehicles[1].vehicleName).toBe("Bus 2")
        expect(store.vehicles[1].colorIndex).toBe(1)
        expect(store.vehicles[1].state).toStrictEqual(state2)
        store.selectVehicle("Bus 2")
        expect(store.selectedVehicle?.vehicleName).toBe("Bus 2")
        expect(store.selectedVehicle?.colorIndex).toBe(1)
        expect(store.selectedVehicle?.state).toStrictEqual(state2)
    })

    it("does not emit aggregated data until the buffer says so", ()=> {
        const store = useDataStore()
        let capturedData = null as null | HistoryData
        store.addDataHistoryListener((historyData)=>{
            capturedData = historyData
        })
        const buffer = new VehicleDataBuffer(10000)
        const mockedBufferAdd = vi.mocked(buffer.add)
        mockedBufferAdd.mockReturnValueOnce(undefined)     
        mockedBufferAdd.mockReturnValueOnce(undefined)     
        const time = new Date().getTime()
        const state = {
            time,
            energy: 100,
            odometer: 1000,
            speed: 20,
            stateOfCharge: 80,
            latitude: 51,
            longitude: 47
        }
        const time2 = time + 1000
        const state2 = {
            time: time2,
            energy: 120,
            odometer: 900,
            speed: 25,
            stateOfCharge: 81,
            latitude: 53,
            longitude: 42
        }
        store.processDataPoint("Bus 1", state)
        store.processDataPoint("Bus 1", state2)
        expect(mockedBufferAdd).toBeCalledTimes(2)
        expect(capturedData).toBeNull()
    })

    it("emits aggregated data once the buffer says so", () => {
        const mockedBufferAdd = vi.mocked(buffer.add)
        mockedBufferAdd.mockReturnValueOnce({ time: 100, speed: 25, stateOfCharge: 75 })

        const store = useDataStore()
        let capturedData = null as null | HistoryData
        store.addDataHistoryListener((historyData) => {
            capturedData = historyData
        })
        const time =new Date().getTime()
        const state = {
            time,
            energy: 100,
            odometer: 1000,
            speed: 20,
            stateOfCharge: 80,
            latitude: 51,
            longitude: 47
        }        
        store.processDataPoint("Bus 1", state)
        expect(mockedBufferAdd).toBeCalledTimes(1)
        expect(capturedData).toEqual({ colorIndex: 0, time: 100, speed: 25, stateOfCharge: 75, vehicleName: "Bus 1" })
    })    

    it("emits aggregated data only once the buffer says so", () => {
        const mockedBufferAdd = vi.mocked(buffer.add)
        mockedBufferAdd.mockReturnValueOnce(undefined)
        mockedBufferAdd.mockReturnValueOnce({ time: 100, speed: 25, stateOfCharge: 75 })

        const store = useDataStore()
        let capturedData = null as null | HistoryData
        let capturedTimes = 0
        store.addDataHistoryListener((historyData) => {
            capturedData = historyData
            capturedTimes++
        })
        const time = new Date().getTime()
        const state = {
            time,
            energy: 100,
            odometer: 1000,
            speed: 20,
            stateOfCharge: 80,
            latitude: 51,
            longitude: 47
        }
        const time2 = time + 1000
        const state2 = {
            time: time2,
            energy: 120,
            odometer: 900,
            speed: 25,
            stateOfCharge: 81,
            latitude: 53,
            longitude: 42
        }
        store.processDataPoint("Bus 1", state)
        expect(capturedData).toBeNull()
        expect(capturedTimes).toBe(0)
        store.processDataPoint("Bus 1", state2)
        expect(mockedBufferAdd).toBeCalledTimes(2)
        expect(capturedData).toEqual({ colorIndex: 0, time: 100, speed: 25, stateOfCharge: 75, vehicleName: "Bus 1" })
        expect(capturedTimes).toBe(1)
    })

    it("emits aggregated data every time the buffer says so", () => {
        const mockedBufferAdd = vi.mocked(buffer.add)
        mockedBufferAdd.mockReturnValueOnce({ time: 109, speed: 24, stateOfCharge: 76 })
        mockedBufferAdd.mockReturnValueOnce({ time: 110, speed: 25, stateOfCharge: 75 })

        const store = useDataStore()
        let capturedData = null as null | HistoryData
        let capturedTimes = 0
        store.addDataHistoryListener((historyData) => {
            capturedData = historyData
            capturedTimes++
        })
        const time = new Date().getTime()
        const state = {
            time,
            energy: 100,
            odometer: 1000,
            speed: 20,
            stateOfCharge: 80,
            latitude: 51,
            longitude: 47
        }
        const time2 = time + 1000
        const state2 = {
            time: time2,
            energy: 120,
            odometer: 900,
            speed: 25,
            stateOfCharge: 81,
            latitude: 53,
            longitude: 42
        }
        store.processDataPoint("Bus 1", state)
        expect(capturedData).toEqual({ colorIndex: 0, time: 109, speed: 24, stateOfCharge: 76, vehicleName: "Bus 1" })
        expect(capturedTimes).toBe(1)
        store.processDataPoint("Bus 1", state2)
        expect(mockedBufferAdd).toBeCalledTimes(2)
        expect(capturedData).toEqual({ colorIndex: 0, time: 110, speed: 25, stateOfCharge: 75, vehicleName: "Bus 1" })
        expect(capturedTimes).toBe(2)
    })
})