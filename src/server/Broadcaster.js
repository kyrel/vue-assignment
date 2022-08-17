const EventEmitter  = require("events").EventEmitter
const csvParse      = require ( "csv-parse")
const fs            = require ( "fs")
const Writable      = require ("stream").Writable

class Broadcaster extends EventEmitter {
	constructor(vehicleName, startFromRecord) {
		super()
		this.vehicleName = vehicleName
		this.startFromRecord = startFromRecord || 0		
	}

	start() {
		this.broadcasting = true
		this.recordsRead = -1
		const broadcast = () => {
			console.log(`${this.vehicleName} broadcasting...`)
			const fileStream = fs.createReadStream("./meta/route.csv")

			fileStream
				// Filestream piped to csvParse which accept nodejs readablestreams and parses each line to a JSON object
				.pipe(csvParse({ delimiter: ",", columns: true, cast: true }))
				// Then it is piped to a writable streams that will push it into nats
				.pipe(new Writable({
					objectMode: true,
					write: (obj, enc, cb) => {
						this.recordsRead++
						if (this.recordsRead < this.startFromRecord)
							return cb()
						this.startFromRecord = 0 //So than on every non-first run we start from the beginning
						if(!this.broadcasting)
							return cb()

						// setTimeout in this case is there to emulate real life situation
						// data that came out of the vehicle came in with irregular interval
						// Hence the Math.random() on the second parameter
						setTimeout(() => {
							this.emit("data", obj)
							cb()
						}, Math.ceil(Math.random() * 150))
					}
				}))
				.once("finish", () => {
					console.log(`${this.vehicleName} finished broadcasting`)
					if(this.broadcasting) {
						console.log(`${this.vehicleName} re-broadcast`)
						broadcast()
					} else {
						console.log(`${this.vehicleName} stopped broadcast`)
						return
					}
				})

		}
		broadcast()
	}

	end() {
		this.broadcasting = false
	}
}

module.exports = Broadcaster