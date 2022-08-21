import { mount } from '@vue/test-utils'
import type { Chart } from 'chart.js'
import ViriTimeChart from './ViriTimeChart.vue'

describe("The time chart", () => {
    it("can mount and draw something", () => {
        const wrapper = mount(ViriTimeChart, { props: { max: 20, maxGrowStep: 10, timeWindowMs: 10000, yAxisTitle: "speed" } })
        const time = new Date().getTime()
        wrapper.vm.addDataPoint("Set 1", 0, time, 15)
        const chart = wrapper.vm._getChart() as Chart<"line", { x: number, y: number }[], number>
        expect(chart).toBeTruthy()
        expect(chart.data.datasets.length).toBe(1)
        expect(chart.data.datasets[0].label).toBe("Set 1")
        expect(chart.data.datasets[0].data.length).toBe(1)
        expect(chart.data.datasets[0].data[0]).toStrictEqual({ x: time, y: 15 })
        expect(chart.scales["x"].max).toBe(time)
        expect(chart.scales["x"].min).toBe(time - 10000)
    })

    it("can adjust max y", () => {
        const wrapper = mount(ViriTimeChart, { props: { max: 20, maxGrowStep: 10, timeWindowMs: 10000, yAxisTitle: "speed" } })
        const time = new Date().getTime()
        wrapper.vm.addDataPoint("Set 1", 0, time, 31)
        const chart = wrapper.vm._getChart() as Chart<"line", { x: number, y: number }[], number>
        expect(chart).toBeTruthy()
        expect(chart.data.datasets.length).toBe(1)
        expect(chart.data.datasets[0].label).toBe("Set 1")
        expect(chart.data.datasets[0].data.length).toBe(1)
        expect(chart.data.datasets[0].data[0]).toStrictEqual({ x: time, y: 31 })
        expect(chart.scales["x"].max).toBe(time)
        expect(chart.scales["x"].min).toBe(time - 10000)
        expect(chart.scales["y"].max).toBe(40)
    })

    it("removes all but one data points outside the axis bounds", () => {
        const wrapper = mount(ViriTimeChart, { props: { max: 20, maxGrowStep: 10, timeWindowMs: 10000, yAxisTitle: "speed" } })
        const time = new Date().getTime()
        wrapper.vm.addDataPoint("Set 1", 0, time, 31)
        wrapper.vm.addDataPoint("Set 1", 0, time + 1000, 29)
        wrapper.vm.addDataPoint("Set 1", 0, time + 2000, 30)
        wrapper.vm.addDataPoint("Set 1", 0, time + 20000, 42)
        const chart = wrapper.vm._getChart() as Chart<"line", { x: number, y: number }[], number>
        expect(chart).toBeTruthy()
        expect(chart.data.datasets.length).toBe(1)
        expect(chart.data.datasets[0].label).toBe("Set 1")
        expect(chart.data.datasets[0].data.length).toBe(2)
        expect(chart.data.datasets[0].data[0]).toStrictEqual({ x: time + 2000, y: 30 })
        expect(chart.data.datasets[0].data[1]).toStrictEqual({ x: time + 20000, y: 42 })
        expect(chart.scales["x"].max).toBe(time + 20000)
        expect(chart.scales["x"].min).toBe(time + 20000 - 10000)
        expect(chart.scales["y"].max).toBe(50)
    })
})