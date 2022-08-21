import { VehicleDataBuffer } from "./VehicleDataBuffer"

describe('Vehicle data buffer', () => {
    it("adds first item without flushing", () => {
        const buffer = new VehicleDataBuffer()
        const aggregate = buffer.add(new Date().getTime(), 20, 70)
        expect(aggregate).toBe(undefined)
    })

    it("adds close enough items without flushing", () => {
        const buffer = new VehicleDataBuffer()
        const date = Math.floor(new Date().getTime() / 5000) * 5000 //A value aligned with a 5-second tick
        const aggregate1 = buffer.add(date, 20, 70)
        const aggregate2 = buffer.add(date + 100, 30, 65)
        expect(aggregate1).toBe(undefined)
        expect(aggregate2).toBe(undefined)
    })

    it("adds lots of close enough items without flushing", () => {
        const buffer = new VehicleDataBuffer()
        const date = Math.floor(new Date().getTime() / 5000) * 5000 //A value aligned with a 5-second tick
        for (let delta = 0; delta <= 4000; delta += 10) { // All other values before the next tick
            const aggregate = buffer.add(date + delta, 20 + Math.floor((delta % 40) / 10), Math.floor(70 - (delta % 10) / 10))
            expect(aggregate).toBe(undefined)
        }
    })

    it ("flushes value when adding another distant value", () => {
        const buffer = new VehicleDataBuffer()
        const date = new Date().getTime()
        buffer.add(date, 20, 70)
        const aggregate = buffer.add(date + 6000, 30, 65)
        expect(aggregate).toStrictEqual({timestamp: date, speed: 20, stateOfCharge: 70})        
    })

    it("calculates average and uses final date when flushing", () => {
        const buffer = new VehicleDataBuffer()
        const date = Math.floor(new Date().getTime() / 5000) * 5000 //A value aligned with a 5-second tick
        buffer.add(date, 20, 70)
        buffer.add(date+100, 30, 60)
        const aggregate = buffer.add(date + 6000, 40, 58)
        expect(aggregate).toStrictEqual({ timestamp: date+100, speed: 25, stateOfCharge: 65 })
    })
})