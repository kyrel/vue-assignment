
# ViriCiti Vue Assignment Implementation
---
![](https://github.com/kyrel/vue-assignment/raw/master/dark_mobile.png)

Here comes a short description of how I interpreted and implemented the assignment at https://github.com/viriciti/vue-assignment.
Thanks for the opportunity to play with some fake e-vehicles! ;)

---

## Technologies used

I'll reason some of my choices in the following sections, the others mostly come as defaults for the modern Vue stack

* Vite 3
* Vue 3 (SFCs / composition API / script setup)
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

![](https://github.com/kyrel/vue-assignment/raw/master/light.png)

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


### Hardcore reactivity vs. hybrid data flow

Using a Vue reactive array for data in a Chart.js dataset does not work nicely.
Chart.js does have a Vue wrapper implementation that knows that and smartly copies data from its props into the Chart.js dataset.
However, using this wrapper or trying to use a similar approach without it (having a reactive array "the Vue way" and synchronizing it with data in Chart.js) introduces a major overhead, with the application mainly busy maintaining a reactive source of data which is never needed by itself.

So after some consideration I've chosen to go "less Vue way", with the moving average data being emitted via events (event per data point), consumed by the root component and being sent to the chart component. Thus the chart component has a method for accepting a data point as part of its interface, exposed via defineExpose. No third-party view wrappers over Chart.js are used. Performance has raised significantly, and the interfaces still seem pretty clean. But yeah, it's not a 100% reactivity-based application now, with some data flowing as event payload.

## Implementation details

### ViriBar

A simple classic "dumb" Vue component with reactive props. Good to have it, considering the next two!

### ViriMap

Uses the Vue wrapper (`vue-yandex-maps`) to display a Yandex Maps component with a collection of markers corresponding to vehicles. 

Unfortunately, attempting to provide new values for the props of the third-party maps components does not cause the map to update, so instead I had to get hold of references to the underlying map and markers and manually update them watching the props of ViriMap.

The component also exposes the `jumpTo` method to immediately center the map around the given marker.

Yandex maps has a predefined set of marker colors, so one of such colors is passed as a property of each marker in props.

ViriMap is also "dumb" in the sense it's solely driven by its props and does not interact with other parts of the application.

### ViriTimeChart

Has a totally minimalistic template with just a canvas wrapped in a div and an exposed method (`addDataPoint`) to carefully add new data to the chart.

Initializes the canvas with a line chart sporting a time scale for X and supporting multiple color-coded datasets (we use them to display data about the different vehicles).

The most interesting prop would be `timeWindowMs`, allowing to specify the time range covered by the X axis.

`_getChart` is exposed for tests only.

The component is again "dumb", not interacting directly with the store, websockets or other parts of the application.

### The store

Strictly speaking, with the lack of any component interaction or data duplication between components, the application could survive without an external state store, having all the state inside the App root component. However, introducing a (Pinia) store is a nice chance to somewhat separate state and logic from the presentation.

While `vehicles`, `selectedVehicle` and `trackSelectedVehicle` are classic reactive properties, and `selectVehicle` seems like a common action, the other exported members are less typical to see in a store. For example, `addDataHistoryListener` allows calling code to subscribe to appearing of a new point of moving-average reduced data for the charts, and the `processDataPoint` action may emit such an event in addition to modifiying the reactive state. The store is implemented in the less-structured "setup" manner, which works better when the store's interface needs to have non-reactive data or we don't want to expose some of the functions and data members.

The store itself does not listen to websocket messages, but it handles incoming parsed data, keep the global application state, contains logic to manage it and emits events relevant to charts.

### The DataListener

DataListener is responsible for opening a connection to the websocket server, listening for incoming data and handling reconnection in case of server or network failure. The URL of the web socket server is based on the current .env file, meaning it could be both the same server where there frontend app is running (typical for our "production" environment) or a server running on a different port or machine (like in our development environment or some hypothetical deployments with different topologies).

### The App

The App root component contains the responsive layout for all the components (map, details with swiches, bars and plain values, charts).

It also starts the DataListener, ties events emitted by the store to the charts and does the usual Vue reactivity and action work.

### Styles

The application mostly uses scoped styles in Vue SFCs defined via SCSS and following the BEM convention. A tiny portion is externalized to SCSS files. Global styles/resets are kept as plain CSS and use CSS variables to support switching to the dark theme.

## Code quality & tests

* All client-side code is TypeScript, type checking may be run with `npm run type-check` or as part of `npm run build` in the /src/client directory
* TypeScript code is lintable via `npm run lint`
* CSS and SCSS styles in .vue, .css and .scss files may be checked via `npx stylelint "**/*.vue", "**/*.css", "**/*.scss"` or as part of `npm run build`. Both adherence to standard best practices and BEM conventions are performed
* Automated tests are run with `npm run test:unit`. Vitest does the job. Some notes on tests below.

At the moment tests do not cover the entire application, but rather demonstrate the different parts of it that are testable:
* `VehicleDataBuffer` is a class used internally by the store to calculate moving averages. It's a good example of code without external dependencies that may be tested easilty without mocking
* `dataStore` is the single Pinia store of the application. It depends on the `VehicleDataBuffer`, but not on anything else. Its test mock the `VehicleDataBuffer` with Vitest mechanisms to keep them being unit tests :)
* `ViriTimeChart` is a component with a very simple template an a canvas, which is a bit difficult to expect upon in tests. But the component has some important logic of adding a data point, and testing it seems like a good idea

