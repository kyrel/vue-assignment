export class VehicleDataBuffer {
    private time = 0
    private speed: number[] = []
    private stateOfCharge: number[] = []
    private readonly rangeInMs: number
    constructor(rangeInMs: number) {
        this.rangeInMs = rangeInMs
    }

    private reset() {
        this.time = 0
        this.speed = []
        this.stateOfCharge = []
    }

    private flush() {
        const avgSpeed = this.speed.reduce((prev, current) => prev + current) / this.speed.length
        const avgStateOfCharge = this.stateOfCharge.reduce((prev, current) => prev + current) / this.stateOfCharge.length
        const result = { time: +this.time, speed: avgSpeed, stateOfCharge: avgStateOfCharge }
        this.reset()
        return result
    }

    add(time: number, speed: number, stateOfCharge: number) {
        if (this.time != 0 && Math.floor(this.time / this.rangeInMs) != Math.floor(time / this.rangeInMs)) {
            return this.flush()
        }

        this.time = time
        this.speed.push(speed)
        this.stateOfCharge.push(stateOfCharge)
    }
}