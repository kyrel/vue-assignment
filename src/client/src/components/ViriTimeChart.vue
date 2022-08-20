<script setup lang="ts">
import colorPool from '@/colorPool';
import {
    Chart, LineElement, PointElement, LinearScale, TimeScale,
    TimeSeriesScale, LineController, CategoryScale, Legend,
    Title,
    Tooltip,
    SubTitle,
} from 'chart.js';
import 'chartjs-adapter-date-fns'
import { onMounted, onUnmounted, ref } from 'vue';

const props = defineProps<{
    max: number,
    maxGrowStep: number,
    timeWindowMs: number,
    yAxisTitle: string
}>()

let chart = null as null | Chart<"line", { x: number, y: number }[], number>

Chart.register(LineElement, PointElement, LinearScale, TimeScale, TimeSeriesScale, LineController, CategoryScale, Legend, Title, Tooltip, SubTitle)

const canvas = ref(null as null | HTMLCanvasElement)

onMounted(() => {
    const ctx = canvas.value!.getContext("2d")!
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: []
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
                        maxTicksLimit: 20,
                        minRotation: 50,
                        maxRotation: 50,
                        sampleSize: 1
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
    chart?.destroy()
})

function addDataPoint(datasetName: string, colorIndex: number, x: number, y: number) {
    if (!chart) return
    let chartDs = chart.data.datasets.find(ds => ds.label == datasetName)
    if (!chartDs) {
        chartDs = {
            label: datasetName,
            data: [],
            borderWidth: 3,
            borderColor: colorPool[colorIndex].color,
            pointRadius: 0,
            pointHitRadius: 5,
            cubicInterpolationMode: "monotone",
            parsing: false
        }
        const indexToInsert = chart.data.datasets.findIndex(d => (d.label||"").localeCompare(datasetName) > 0)
        if (indexToInsert >= 0) {
            chart.data.datasets.splice(indexToInsert, 0, chartDs)            
        }
        else {
            chart.data.datasets.push(chartDs)                    
        }                
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