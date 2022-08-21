
# ViriCiti Vue Assignment Implementation
---
![](https://imgs.xkcd.com/comics/self_description.png)

Here comes a short description of how I interpreted and implemented the assignment at `https://github.com/viriciti/vue-assignment`.
Thanks for the opportunity to play with some fake e-vehicles! ;)

---

## Technologies used

I'll reason some of my choices in the following sections, the others mostly come as defaults for the modern Vue stack

* Vite 3
* Vue 3
* Pinia
* Yandex Maps
* Chart.js
* TypeScript
* SCSS (& some CSS)
* Vitest, 
* ESLint
* Stylelint / BEM


## Running the code

### Frontend development mode

In "frontend development" scenario the server and the cleint apps may be run separately on different ports by different web servers.
In this case the server app is used only to feed data to the client via web sockets. The server might be started via 

`npm start`

in the working copy directory. It uses port 3000 by default, being backed by node & express. The client is started running

`npm run dev`

in the the src/client subdirectory. It runs on port 5137 by default and uses Vite as the web server. It lets you enjoy Vite's blazing fast hot module replacement.

### Building the frontend app

Typically for a Vite setup, the client application might be built for deployment running

`npm run build`

in the the src/client subdirectory. The bundled frontend application assets are served by the "backend" as static files, so after performing the build one needs just the backend server to work. With the server launched locally the overall setup may be accessed by opening http://localhost:3000 in the browser.


## Changes to the backend

As I've made it possible to track multiple vehicles with the app, the backend changes focus mostly on that.

* The Broadcaster class accepts a unique vehicle name that will be reported to the client together with the data
* It also accepts a parameter for an offset in the CSV file - all Broadcasters use the same file but start from a different line, so the vehicles are going to endlessly chase each other %)
* Having such a multiple vehicle setup and wishing to display data from multiple vehicles on the same chart makes it inappropriate to re-broadcast vehicle data once it's over "jumping back in time". So instead once the end of the file is reached, data from the beginning are broadcasted with a time delta applied, so time only rolls forward. Additional corrections are applied to Broadcasters with offsets - thought they start with data from some line in the middle of the file, it's paried with time taken from the beginning of the file. Thus all broadcasters send data bound to similar points in time
* The initial setup was prone to errors when the client got disconnected during data transmission, and one might've killed the server by refreshing the page several times. An additional check for the client state has been introduced.
* Finally, the server is set up to serve static files from the /src/client/dist directory

## Frontend features

* Display all vehicles on a map with marker position refreshed in real-time
* One of the vehicles is considered selected, with its details visible on the right pane as real-time bars (speed, state of charge) and plain values (energy, odometer). The marker of the selected vehicle on the map contains a large dot in the center
* The user may change the selected vehicle clicking one of the selection buttons in the top-right or clicking a marker on the map
* The user may wish to track the selected vehicle, with the map automatically keeping in centered when it moves. One also may just jump to the vehicle location on the map without necessarily turning tracking on
* The history of speed and state of charge values for all vehicles are displayed on two corresponding linear charts. To keep the amount of dots sane, data is reduced to a moving average (see notes on optimizations below). Individual vehicle data display can be turned on & off clicking the series title
* Vehicles are color-coded across the charts, switch buttons & line markers

## Non-functional characteristics

* Responsive layout
* Support for the browser dark theme (comes as part of Vue3 scaffold project, so why not, hehe)
* Server restart or lost connection are handled

## Challenges and tough decisions
### The mapping component
### The charting component
### Hardcore reactivity vs. hydrid data flow


![](https://github.com/viriciti/vue-assignment/raw/master/sketch.png)


