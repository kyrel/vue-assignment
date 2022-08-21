import type { VehicleState } from "./stores/data"

/**
 * A data point received from the socket
 */
interface SocketDataPoint {
    vehicleName: string,
    time: number,
    energy: number,
    gps: string,
    odo: number,
    speed: number,
    soc: number
}

let wsUrl = import.meta.env.VITE_WS_ROOT
if (wsUrl == "/") {
    const wsProtocol = window.location.protocol == "https" ? "wss" : "ws"
    wsUrl = `${wsProtocol}://${window.location.host}/`
}

class DataListener {
    onData: (vehicleName: string, state: VehicleState) => void
    onClose: () => void
    constructor(onData: (vehicleName: string, state: VehicleState) => void, onClose: () => void) {
        this.onData = onData
        this.onClose = onClose
    }

    connect() {
        const socket = new WebSocket(wsUrl)
        socket.onmessage = (event) => {
            const socketData = JSON.parse(event.data) as SocketDataPoint
            const gps = socketData.gps.split("|")
            this.onData(socketData.vehicleName,
                {
                    time: socketData.time,
                    energy: +socketData.energy,
                    latitude: +gps[0],
                    longitude: +gps[1],
                    odometer: +socketData.odo,
                    speed: +socketData.speed,
                    stateOfCharge: +socketData.soc
                })
        }

        socket.onclose = (event) => {
            console.log('Connection is closed. Reconnect will be attempted in 1 second.');
            this.onClose()
            setTimeout(() => { this.connect() }, 1000);
        }

        socket.onerror = (error) => {
            console.log('Failed to establish data connection');
            socket.close()
        }
    }
}

export { DataListener }