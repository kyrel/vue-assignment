export class VehicleDataBuffer {
    time = 0
    speed: number[] = []
    stateOfCharge: number[] = []

    reset() {
        this.time = 0
        this.speed = []
        this.stateOfCharge = []
    }

    flush() {
        const avgSpeed = this.speed.reduce((prev, current) => prev + current) / this.speed.length
        const avgStateOfCharge = this.stateOfCharge.reduce((prev, current) => prev + current) / this.stateOfCharge.length
        const result = { time: +this.time, speed: avgSpeed, stateOfCharge: avgStateOfCharge }
        this.reset()
        return result
    }

    add(time: number, speed: number, stateOfCharge: number) {
        if (this.time != 0 && Math.floor(this.time / 10000) != Math.floor(time / 10000)) {
            return this.flush()
        }

        this.time = time
        this.speed.push(speed)
        this.stateOfCharge.push(stateOfCharge)
    }
}