<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { SVGRenderer } from 'echarts/renderers'

echarts.use([LineChart, GridComponent, TooltipComponent, SVGRenderer])

const props = defineProps({
  values: { type: Array, required: true },
  labels: { type: Array, required: true },
  animated: { type: Boolean, default: true },
})

const chartEl = ref(null)
let chart
let resizeObserver
let chartTransition

function buildOption() {
  const max = Math.ceil(Math.max(...props.values) / 1000) * 1000
  return {
    animation: false,
    grid: { left: 18, right: 12, top: 22, bottom: 42, containLabel: false },
    tooltip: {
      trigger: 'axis',
      confine: true,
      backgroundColor: '#183323',
      borderWidth: 0,
      padding: [8, 12],
      textStyle: { color: '#fff', fontSize: 12, fontFamily: 'Inter, PingFang SC, sans-serif' },
      axisPointer: { type: 'line', lineStyle: { color: 'rgba(8,120,36,.18)', width: 1 } },
      formatter(params) {
        const point = params[0]
        return `${point.axisValue}<br/><strong style="font-size:14px">¥${Number(point.value).toLocaleString('zh-CN')}</strong>`
      },
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: props.labels,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: '#526159',
        fontSize: 12,
        fontWeight: 650,
        interval: props.labels.length === 7 ? 0 : props.labels.length === 14 ? 1 : 4,
        margin: 18,
      },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max,
      splitNumber: 3,
      axisLabel: { show: false },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#e8eeea', width: 1 } },
    },
    series: [{
      name: '营业收入',
      type: 'line',
      data: props.values,
      smooth: false,
      showSymbol: true,
      symbol: 'circle',
      symbolSize: 8,
      lineStyle: { color: '#087824', width: 4, cap: 'round', join: 'round', shadowColor: 'rgba(0,75,20,.18)', shadowBlur: 3 },
      itemStyle: { color: '#fff', borderColor: '#087824', borderWidth: 2 },
      emphasis: { scale: 1.5, itemStyle: { color: '#4caf50', borderColor: '#087824' } },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(86,183,96,.34)' },
          { offset: 1, color: 'rgba(86,183,96,.04)' },
        ]),
      },
    }],
  }
}

function render() {
  if (!chart) return
  chart.setOption(buildOption(), { notMerge: true })
}

function playTransition() {
  chartTransition?.cancel()
  chartTransition = undefined

  if (!props.animated || typeof chartEl.value?.animate !== 'function') return

  chartTransition = chartEl.value.animate([
    { opacity: 0.24, transform: 'translateY(8px) scaleY(.965)' },
    { opacity: 1, transform: 'translateY(0) scaleY(1)' },
  ], {
    duration: 420,
    easing: 'cubic-bezier(.22, 1, .36, 1)',
  })

  chartTransition.onfinish = () => {
    chartTransition = undefined
  }
}

function refresh() {
  if (!chart) return
  render()
  playTransition()
}

onMounted(async () => {
  await nextTick()
  chart = echarts.init(chartEl.value, null, { renderer: 'svg' })
  render()
  resizeObserver = new ResizeObserver(() => chart?.resize())
  resizeObserver.observe(chartEl.value)
})

watch(
  () => `${props.labels.join('|')}::${props.values.join('|')}`,
  refresh,
  { flush: 'post' },
)

watch(() => props.animated, enabled => {
  if (!enabled) {
    chartTransition?.cancel()
    chartTransition = undefined
  }
})

onBeforeUnmount(() => {
  chartTransition?.cancel()
  resizeObserver?.disconnect()
  chart?.dispose()
})
</script>

<template>
  <div ref="chartEl" class="echarts-container" role="img" aria-label="营业收入折线图" />
</template>
