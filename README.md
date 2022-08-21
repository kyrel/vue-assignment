
# ViriCiti Vue Assignment Implementation
---
![](https://imgs.xkcd.com/comics/self_description.png)

Here comes a short description of how I interpreted and implemented the assignment at https://github.com/viriciti/vue-assignment.
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
* Vitest
* ESLint
* Stylelint / BEM


## Running the code

### Frontend development mode

In "frontend development" scenario the server and the client apps may run separately on different ports backed by different web servers.
In this case the server app is used only to feed data to the client via web sockets. The server might be started executing 

`npm start`

in the working copy directory. It uses port 3000 by default, being backed by node & express. The client is started running

`npm run dev`

in the the src/client subdirectory. It runs on port 5137 by default and uses Vite as the web server. It lets you enjoy Vite's blazing fast hot module replacement.

### Building the frontend app

Typically for a Vite setup, the client application might be built for deployment running

`npm run build`

in the the src/client subdirectory. The bundled frontend application assets are then served by the "backend" as static files, so after performing the build one needs just the backend server for the application to work. With the server launched locally the overall setup may be accessed by opening `http://localhost:3000` in the browser.


## Changes to the backend

As I've made it possible to track multiple vehicles with the app, the backend changes focus mostly on that.

* The Broadcaster class accepts a unique vehicle name that will be reported to the client together with the data
* It also accepts a parameter for an offset in the CSV file - all Broadcasters use the same file but start from a different line, so the vehicles are going to endlessly chase each other %)
* Having such a multiple vehicle setup and wishing to display data from multiple vehicles on the same chart makes it inappropriate to re-broadcast vehicle data once it's over "jumping back in time". So instead once the end of the file is reached, data from the beginning are broadcasted with a time delta applied, so time only rolls forward. Additional corrections are applied to Broadcasters with offsets - thought they start with data from some line in the middle of the file, it's paired with time taken from the beginning of the file. Thus all broadcasters send data bound to similar points in time
* The initial setup was prone to errors when the client got disconnected during data transmission, and one might've killed the server by refreshing the page several times. An additional check for the client state has been introduced.
* Finally, the server is set up to serve static files from the /src/client/dist directory

## Frontend features

* Display all vehicles on a map with marker position refreshed in real-time
* One of the vehicles is considered selected, with its details visible on the right pane as real-time bars (speed, state of charge) and plain values (energy, odometer). The marker of the selected vehicle on the map contains a large dot in the center
* The user may change the selected vehicle clicking one of the selection buttons in the top-right or clicking a marker on the map
* The user may wish to track the selected vehicle, with the map automatically keeping it centered when it moves. One also may just jump to the vehicle location on the map without necessarily turning tracking on
* The history of speed and state of charge values for all vehicles are displayed on two corresponding linear charts. To keep the amount of dots sane, data is reduced to a moving average (see notes on optimizations below). Individual vehicle data display can be turned on & off clicking the series title
* Vehicles are color-coded across the charts, switch buttons & line markers

## Non-functional characteristics

* Responsive layout
* Support for the browser dark theme (comes as part of Vue3 scaffold project, so why not, hehe)
* Server restart or lost connection are handled

## Challenges and tough decisions

### The mapping component

Google Maps are currently not available to developers in Russia.
Out of the other solutions available, russian-based Yandex Maps seem like a popular full-featured mapping option, free for the current scenario (though not for real-life vehicle tracking) with a limit on the number of monthly displays.
There is a Vue wrapper component available for Yandex Maps, which is mostly functional. The several issues I've encountered are:
* Some internal HTML elements require better styling to properly support screen resizing and switching to fullscreen and back (fixed with in-project styles)
* Some props seemed not to be watched as reactive in the wrapper, so I had to watch them manually and send data to underlying Yandex Maps objects directly

It is possible that not using the vue-yandex-maps package and working with Yandex Maps directly would provide a comparable developer experience. However, it didn't end up too bad :)

### The charting component

The main peculiarity of the charts present in the assignment is them being live (real-time) and potentially containing a lot of points.
I've experimented with both SVG-based Apex charts and canvas-based Chart.js for the assignment. The animated real-time charts look good and smooth with Apex, but as expected, with the number of dots growing an SVG solution eats up resources faster than a canvas-based one.

To further improve the performance of Chart.js the following actions were done:
* The data in the CSV file stand 1 second from each other, but they come from the backend with a random interval of 0-150 ms (+overhead). This isn't all that importand, because all is relative and we may view it as peculiarity of our setup. But adding data and refreshing a chart more than 10 times a second average seems like on overkill in any situation. There are different ways to deal with it, starting from making the server send data at different intervals, but let's imagine the server is just like that - sending data a bit too often. And hey, refreshing bars, plain values and even the map that often isn't necessarily a bad thing. So I decided to fix that on the client, calculating averages for incoming speed and state of charge within 5-second intervals (of "fake time" coming from the file) and displaying the averages on the charts, not the original data. That makes the chart refresh 5 times more seldom.
* Unfortunately, things get much worse with animations turned on, so here we are with an uglier non-animaed display
* Pre-calculating the range for the x axis, the number of labels displayed and their rotation angle also helps a lot


### Hardcore reactivity vs. hydrid data flow

Using a Vue reactive array for data in a Chart.js dataset does not work nicely.
Chart.js does have a Vue wrapper implementation that knows that and smartly copies data from its props into the Chart.js dataset.
However, using this wrapper or trying to use a similar approach without it (having a reactive array "the Vue way" and synchronizing it with data in Chart.js) introduces a major overhead, with the application mainly busy maintaining a reactive source of data which is never needed by itself.
So after some consideration I've chosen to go "less Vue way", with the moving average data being emitted via events (event per point), consumed by the root component and being sent to the chart component. Thus the chart component has a method for accepting a data point as part of its interface, exposed via defineExpose. Performance has raised significantly, and the interfaces still seem pretty clean. But yeah, it's not a 100% reactivity-based application now, with some data flowing as event payload.

## Implementation details
### ViriBar
### ViriMap
### ViriChart
### The store
### The DataListener
### The App

## Code quality & tests

![](https://github.com/viriciti/vue-assignment/raw/master/sketch.png)


