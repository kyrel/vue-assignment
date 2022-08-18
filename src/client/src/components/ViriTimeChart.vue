<script setup lang="ts">
import colorPool from '@/colorPool';
import {
    Chart, LineElement, PointElement, LinearScale, TimeScale,
    TimeSeriesScale, LineController, CategoryScale, Legend,
    Title,
    Tooltip,
    SubTitle
} from 'chart.js';
import 'chartjs-adapter-date-fns'
import { onMounted, onUnmounted, ref, watch } from 'vue';

const CHART_UPDATE_THROTTLE_MS = 500
const HISTORY_TIME_WINDOW_MS = 1000 * 60 * 10

const props = defineProps<{
    //datasets: { datasetName: string, colorIndex: number, data: { x: number, y: number }[] }[],
    max: number,
    maxGrowStep: number,
    timeWindowMs: number,
    yAxisTitle: string
}>()

let chart = null as null | Chart<"line", { x: number, y: number }[], number>

Chart.register(LineElement, PointElement, LinearScale, TimeScale, TimeSeriesScale, LineController, CategoryScale, Legend, Title, Tooltip, SubTitle)

const canvas = ref(null as null | HTMLCanvasElement)

// let shallUpdate = true

// watch(() => props.datasets, (datasets) => {
//     if (!chart) return
//     let maxX = 0
//     for (let propsDs of datasets) {
//         let chartDs = chart.data.datasets.find(ds => ds.label == propsDs.datasetName)
//         if (!chartDs) {
//             chart.data.datasets.push({
//                 label: propsDs.datasetName,
//                 data: [],
//                 borderWidth: 3,
//                 borderColor: colorPool[propsDs.colorIndex].color,
//                 pointRadius: 0,
//                 pointHitRadius: 5,
//                 cubicInterpolationMode: "monotone",
//                 parsing: false
//             })
//             chartDs = chart.data.datasets[chart.data.datasets.length - 1]
//         }
//         //some timestamps may no longer be present on props
//         if (propsDs.data.length == 0) {
//             if (chartDs.data.length != 0) chartDs.data = []
//         }
//         else {
//             let lengthToChop = 0
//             while (lengthToChop < chartDs.data.length && chartDs.data[lengthToChop].x != propsDs.data[0].x) {
//                 lengthToChop++
//             }
//             if (lengthToChop) {
//                 //chart.data.labels!.splice(0, lengthToChop)
//                 chartDs.data.splice(0, lengthToChop)
//             }
//         }
//         //some timestamps may be completely new    
//         /*let newDataIndex = 0
//         while (newDataIndex < chart.data.labels!.length && newDataIndex < timestamps.length && chart.data.labels![newDataIndex] == timestamps[newDataIndex]) {
//             newDataIndex++
//         } */
//         const currentLength = chartDs.data.length
//         if (propsDs.data.length > currentLength) {
//             //chart.data.labels!.push(...timestamps.slice(currentLength))
//             const dataAdded = propsDs.data.slice(currentLength)
//             const maxValue = dataAdded.reduce((prevMax, item) => item.y > prevMax ? item.y : prevMax, 0)
//             chartDs.data.push(...dataAdded)
//             const currentScaleMax = +chart.options.scales!["y"]!.max!
//             if (maxValue > currentScaleMax) {
//                 const delta = maxValue - currentScaleMax
//                 const steps = Math.floor(delta / props.maxGrowStep) + 1
//                 chart.options.scales!["y"]!.max = currentScaleMax + steps * props.maxGrowStep
//             }
//         }
//         if (chartDs.data.length > 0 && chartDs.data[chartDs.data.length - 1].x > maxX) maxX = chartDs.data[chartDs.data.length - 1].x
//     }

//     chart.options.scales!["x"]!.max = maxX
//     chart.options.scales!["x"]!.min = maxX - props.timeWindowMs

//     //if (!shallUpdate) return
//     setTimeout(() => { shallUpdate = true; }, CHART_UPDATE_THROTTLE_MS)
//     shallUpdate = false
//     //if (chart!.options.animations .duration! == 0)
//     //if (chart!.options.animations!.x?.duration == undefined)
//     //setTimeout(() => { chart!.options.animations!.x = { duration: undefined } }, 0)
//     chart.update()
// }, { deep: true })

onMounted(() => {
    const ctx = canvas.value!.getContext("2d")!
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            //labels: [...props.timestamps],
            datasets: []/*props.datasets.map(ds => ({
                label: ds.datasetName,
                data: [...ds.data],
                borderWidth: 3,
                borderColor: colorPool[ds.colorIndex].color,
                pointRadius: 0,
                pointHitRadius: 5,
                cubicInterpolationMode: "monotone",
                parsing: false
            }))*/,

            /*[{
                label: 'Vehicle #1',
                data: [...props.data],
                borderWidth: 3,
                borderColor: "#b5e9cb",
                pointRadius: 0,
                pointHitRadius: 5,
                cubicInterpolationMode: "monotone",
                parsing: false
                //pointStyle: 
            }]*/
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            normalized: true,
            animation: false,
            // animations: {
            //      y: { duration: 0 },
            //      x: { duration: 100 },
            //  },
            scales: {
                x: {
                    type: 'time',
                    ticks: {
                        autoSkip: true,
                        maxTicksLimit: 20
                    },
                    max: 0            
                },
                y: {
                    beginAtZero: true,
                    max: props.max,
                    title: { text: props.yAxisTitle, display: true }
                }
            }
        }
    });
})

onUnmounted(() => {

})

function addDataPoint(datasetName: string, colorIndex: number, x: number, y: number) {
    if (!chart) return
    let chartDs = chart.data.datasets.find(ds => ds.label == datasetName)
    if (!chartDs) {
        chart.data.datasets.push({
            label: datasetName,
            data: [],
            borderWidth: 3,
            borderColor: colorPool[colorIndex].color,
            pointRadius: 0,
            pointHitRadius: 5,
            cubicInterpolationMode: "monotone",
            parsing: false
        })
        chartDs = chart.data.datasets[chart.data.datasets.length - 1]
    }
    if (x > (chart.options.scales!["x"]!.max as number)) {
        chart.options.scales!["x"]!.max = x
        chart.options.scales!["x"]!.min = x - props.timeWindowMs
    }
    //some timestamps may no longer be present on props
    if (chartDs.data.length > 0 && x < chartDs.data[0].x) {
        console.log("A timestamp is less than previous! ", x, y)
        chartDs.data = []
        //max-min may require adjestment
        // let newMax = 0
        // for (let ds of chart.data.datasets){
        //     if (ds.data)
        // }
    }
    else {
        let lengthToChop = 0
        while (lengthToChop < chartDs.data.length && chartDs.data[lengthToChop].x < (chart.options.scales!["x"]!.min as number)) {
            lengthToChop++
        }
        if (lengthToChop) {
            //chart.data.labels!.splice(0, lengthToChop)
            chartDs.data.splice(0, lengthToChop)
        }
    }

    //some timestamps may be completely new    
    /*let newDataIndex = 0
    while (newDataIndex < chart.data.labels!.length && newDataIndex < timestamps.length && chart.data.labels![newDataIndex] == timestamps[newDataIndex]) {
        newDataIndex++
    } */
    if (x >= (chart.options.scales!["x"]!.min as number))
        chartDs.data.push({ x, y })

    const currentScaleMax = +chart.options.scales!["y"]!.max!
    if (y > currentScaleMax) {
        const delta = y - currentScaleMax
        const steps = Math.floor(delta / props.maxGrowStep) + 1
        chart.options.scales!["y"]!.max = currentScaleMax + steps * props.maxGrowStep
    }
    // if (x > (chart.options.scales!["x"]!.max as number)) {
    //     chart.options.scales!["x"]!.max = x
    //     chart.options.scales!["x"]!.min = x - props.timeWindowMs
    // }
    //if (!shallUpdate) return
    //setTimeout(() => { shallUpdate = true; }, CHART_UPDATE_THROTTLE_MS)
    //shallUpdate = false
    //if (chart!.options.animations .duration! == 0)
    //if (chart!.options.animations!.x?.duration == undefined)
    //setTimeout(() => { chart!.options.animations!.x = { duration: undefined } }, 0)
    chart.update()
}

defineExpose({ addDataPoint })

</script>
<template>
    <div class="chart-container">
        <canvas ref="canvas" height="100" width="300"></canvas>
    </div>
</template>

<style scoped>
.chart-container {
    position: relative;
    width: 100%;
    height: 300px;
}
</style>