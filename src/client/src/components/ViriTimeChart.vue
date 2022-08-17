<script setup lang="ts">
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

const props = defineProps<{
    timestamps: number[],
    data: number[],
    max: number,
    maxGrowStep: number,
    justifyEnd: boolean,
    timeWindowMs: number,
    yAxisTitle: string
}>()

let chart = null as null | Chart<"line", number[], number>

Chart.register(LineElement, PointElement, LinearScale, TimeScale, TimeSeriesScale, LineController, CategoryScale, Legend, Title, Tooltip, SubTitle)

const canvas = ref(null as null | HTMLCanvasElement)

let shallUpdate = true

watch(() => [props.timestamps, props.data], ([timestamps, data]) => {
    if (!chart) return
    if (timestamps.length != data.length) return
    //some timestamps may no longer be present on props
    let lengthToChop = 0
    while (lengthToChop < chart.data.labels!.length && chart.data.labels![lengthToChop] != timestamps[0]) {
        lengthToChop++
    }
    if (lengthToChop) {
        chart.data.labels!.splice(0, lengthToChop)
        chart.data.datasets[0].data.splice(0, lengthToChop)
    }
    //some timestamps may be completely new    
    /*let newDataIndex = 0
    while (newDataIndex < chart.data.labels!.length && newDataIndex < timestamps.length && chart.data.labels![newDataIndex] == timestamps[newDataIndex]) {
        newDataIndex++
    } */
    const currentLength = chart.data.labels!.length
    if (timestamps.length > currentLength) {
        chart.data.labels!.push(...timestamps.slice(currentLength))
        const dataAdded = data.slice(currentLength)
        const maxValue = dataAdded.reduce((prevMax, item)=>item > prevMax? item: prevMax)
        chart.data.datasets[0].data.push(...dataAdded)
        const currentScaleMax = +chart.options.scales!["y"]!.max!
        if (maxValue > currentScaleMax) {
            const delta = maxValue - currentScaleMax
            const steps = Math.floor(delta / props.maxGrowStep) + 1
            chart.options.scales!["y"]!.max = currentScaleMax + steps * props.maxGrowStep
        }
    }
    if (props.justifyEnd || true) {
        chart.options.scales!["x"]!.max = chart.data.labels![chart.data.labels!.length - 1]
        chart.options.scales!["x"]!.min = chart.data.labels![chart.data.labels!.length - 1] - props.timeWindowMs
    }
    else {
        chart.options.scales!["x"]!.min = chart.data.labels![0]
        chart.options.scales!["x"]!.max = chart.data.labels![0] + props.timeWindowMs
    }
    //if (!shallUpdate) return
    setTimeout(() => {shallUpdate = true; },  CHART_UPDATE_THROTTLE_MS)
    shallUpdate = false
    //if (chart!.options.animations .duration! == 0)
    //if (chart!.options.animations!.x?.duration == undefined)
    setTimeout(() => { chart!.options.animations!.x = { duration: undefined } }, 0)
    chart.update()    
}, { deep: true })

onMounted(() => {
    const ctx = canvas.value!.getContext("2d")!
    chart = new Chart(ctx, {        
        type: 'line',
        data: {
            labels: [...props.timestamps],
            datasets: [{
                label: 'Vehicle #1',
                data: [...props.data],
                borderWidth: 3,
                borderColor: "#b5e9cb",
                pointRadius: 0,
                pointHitRadius: 5,
                cubicInterpolationMode: "monotone"
                //parsing: false
                //pointStyle: 
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            normalized: true,
            //animation: false,                        
            // transitions: {
            //     show: false
            // },
            animations: {
                y: {
                    duration: 0
                },
                x: {
                    duration: 0
                }                
            },
            scales: {
                x: {
                    type: 'time',
                    ticks: {
                        autoSkip: true,
                        maxTicksLimit: 20
                    }
                },
                y: {
                    beginAtZero: true,
                    max: props.max,
                    title: {text: props.yAxisTitle, display: true}
                }
            }
        }
    });
})

onUnmounted(() => {

})

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