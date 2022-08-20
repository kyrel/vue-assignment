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
    const ctx = canvas.value?.getContext("2d")
    if (!ctx) return
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
            //  animations: {
            //       y: { duration: 0 },
            //       x: { duration: 150 },
            //   },
            scales: {
                x: {
                    type: 'time',
                    ticks: {
                        maxTicksLimit: 8,
                        autoSkip: false,
                        minRotation: 50,
                        maxRotation: 50,
                        sampleSize: 1,
                        includeBounds: true
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
        const indexToInsert = chart.data.datasets.findIndex(d => (d.label || "").localeCompare(datasetName) > 0)
        if (indexToInsert >= 0) {
            chart.data.datasets.splice(indexToInsert, 0, chartDs)
        }
        else {
            chart.data.datasets.push(chartDs)
        }
    }
    if (!chart.options.scales) chart.options.scales = {}
    if (!chart.options.scales["x"]) chart.options.scales["x"] = { max: 0 }
    if (!chart.options.scales["y"]) chart.options.scales["y"] = { max: 0 }
    const scaleX = chart.options.scales["x"]
    const scaleY = chart.options.scales["y"]
    if (x > (scaleX.max as number)) {
        scaleX.max = x
        scaleX.min = x - props.timeWindowMs
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
        while (lengthToChop < chartDs.data.length && chartDs.data[lengthToChop].x < (scaleX.min as number)) {
            lengthToChop++
        }
        if (lengthToChop) {
            chartDs.data.splice(0, lengthToChop)
        }
    }

    if (x >= (scaleX.min as number))
        chartDs.data.push({ x, y })

    const currentScaleYMax = scaleY.max as number
    if (y > currentScaleYMax) {
        const delta = y - currentScaleYMax
        const steps = Math.floor(delta / props.maxGrowStep) + 1
        scaleY.max = currentScaleYMax + steps * props.maxGrowStep
    }
    chart.update()
}

defineExpose({ addDataPoint })

</script>
<template>
    <div class="viri-chart">
        <canvas ref="canvas"></canvas>
    </div>
</template>

<style scoped lang="scss">
/* @define viri-chart */
.viri-chart {
    width: 100%;
    height: 300px;
}
</style>