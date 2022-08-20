export default class VehicleDataBuffer {
    timestamp = 0
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