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
let hasRendered = false

function formatAxisY(value) {
  if (value >= 10000) {
    const wan = value / 10000
    return Number.isInteger(wan) ? `${wan}万` : `${wan.toFixed(1)}万`
  }
  if (value >= 1000) return `${Math.round(value / 100) / 10}k`
  return String(value)
}

function seriesValues() {
  return props.values.length ? props.values.map(value => Number(value) || 0) : [0]
}

function yAxisMax(values) {
  const peak = Math.max(...values, 0)
  return peak <= 0 ? 1000 : Math.ceil(peak / 1000) * 1000
}

function buildFullOption({ animateUpdate = false } = {}) {
  const data = seriesValues()
  const max = yAxisMax(data)
  const enableMotion = props.animated
  const updateDuration = enableMotion && animateUpdate ? 720 : 0
  const initialDuration = enableMotion && !hasRendered ? 720 : 0

  return {
    animation: enableMotion,
    animationDuration: initialDuration,
    animationEasing: 'cubicOut',
    animationDurationUpdate: updateDuration,
    animationEasingUpdate: 'cubicOut',
    grid: { left: 6, right: 14, top: 18, bottom: 40, containLabel: true },
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
        margin: 16,
      },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max,
      splitNumber: 4,
      axisLabel: {
        show: true,
        color: '#7a8a82',
        fontSize: 11,
        fontWeight: 600,
        formatter: value => formatAxisY(value),
      },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#e8eeea', width: 1 } },
    },
    series: [{
      id: 'revenue-line',
      name: '营业收入',
      type: 'line',
      data,
      smooth: false,
      showSymbol: true,
      symbol: 'circle',
      symbolSize: 8,
      universalTransition: enableMotion,
      animationDurationUpdate: updateDuration,
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

function buildUpdatePatch() {
  const data = seriesValues()
  const max = yAxisMax(data)
  const updateDuration = props.animated ? 720 : 0

  return {
    animation: props.animated,
    animationDurationUpdate: updateDuration,
    animationEasingUpdate: 'cubicOut',
    xAxis: { data: props.labels },
    yAxis: { max },
    series: [{
      id: 'revenue-line',
      type: 'line',
      data,
      universalTransition: props.animated,
      animationDurationUpdate: updateDuration,
    }],
  }
}

function renderInitial() {
  if (!chart) return
  chart.setOption(buildFullOption({ animateUpdate: false }), { notMerge: true, lazyUpdate: false })
  hasRendered = true
}

function renderUpdate() {
  if (!chart) return
  chart.setOption(buildUpdatePatch(), { notMerge: false, lazyUpdate: false })
}

function refresh() {
  if (!chart) return
  if (!hasRendered) {
    renderInitial()
    return
  }
  renderUpdate()
}

onMounted(async () => {
  await nextTick()
  chart = echarts.init(chartEl.value, null, { renderer: 'svg' })
  renderInitial()
  resizeObserver = new ResizeObserver(() => chart?.resize())
  resizeObserver.observe(chartEl.value)
})

watch(
  () => `${props.labels.join('|')}::${props.values.join('|')}`,
  refresh,
  { flush: 'post' },
)

watch(() => props.animated, () => {
  if (!chart) return
  renderInitial()
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  chart?.dispose()
})
</script>

<template>
  <div ref="chartEl" class="echarts-container" role="img" aria-label="营业收入折线图" />
</template>
