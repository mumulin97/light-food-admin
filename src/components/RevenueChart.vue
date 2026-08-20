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
  if (peak <= 0) return 100

  const rawStep = peak / 4
  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  const normalized = rawStep / magnitude
  const niceFactor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10
  const step = niceFactor * magnitude
  return Math.ceil(peak / step) * step
}

function buildFullOption({ animateUpdate = false } = {}) {
  const data = seriesValues()
  const max = yAxisMax(data)
  const enableMotion = props.animated
  const updateDuration = enableMotion && animateUpdate ? 720 : 0
  const initialDuration = enableMotion && !hasRendered ? 720 : 0
  const spectrum = new echarts.graphic.LinearGradient(0, 0, 1, 0, [
    { offset: 0, color: '#58a8f8' },
    { offset: 0.23, color: '#9a78ed' },
    { offset: 0.48, color: '#35ba82' },
    { offset: 0.72, color: '#f1ad55' },
    { offset: 1, color: '#48c8bd' },
  ])
  const spectrumArea = new echarts.graphic.LinearGradient(0, 0, 1, 0, [
    { offset: 0, color: 'rgba(88,168,248,.24)' },
    { offset: 0.23, color: 'rgba(154,120,237,.24)' },
    { offset: 0.48, color: 'rgba(53,186,130,.3)' },
    { offset: 0.72, color: 'rgba(241,173,85,.24)' },
    { offset: 1, color: 'rgba(72,200,189,.25)' },
  ])

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
      backgroundColor: 'rgba(218,239,246,.88)',
      borderColor: 'rgba(255,255,255,.84)',
      borderWidth: 1,
      padding: [0, 0],
      textStyle: { color: '#315963', fontSize: 12, fontFamily: 'Inter, PingFang SC, sans-serif' },
      extraCssText: 'border-radius:16px;box-shadow:0 16px 34px rgba(45,83,101,.18),0 1px 0 rgba(255,255,255,.98) inset;backdrop-filter:blur(20px) saturate(1.2);-webkit-backdrop-filter:blur(20px) saturate(1.2);',
      axisPointer: {
        type: 'line',
        lineStyle: { color: 'rgba(70,159,159,.28)', width: 1.5, type: 'dashed' },
      },
      formatter(params) {
        const point = params[0]
        return `<div class="revenue-tooltip">
          <div class="revenue-tooltip__date"><i></i><span>${point.axisValue}</span></div>
          <strong>¥${Number(point.value).toLocaleString('zh-CN')}</strong>
        </div>`
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
      interval: max / 4,
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
      smooth: 0.45,
      showSymbol: true,
      symbol: 'circle',
      symbolSize: 8,
      universalTransition: enableMotion,
      animationDurationUpdate: updateDuration,
      lineStyle: { color: spectrum, width: 4, cap: 'round', join: 'round', shadowColor: 'rgba(71,145,166,.25)', shadowBlur: 7 },
      itemStyle: { color: 'rgba(255,255,255,.92)', borderColor: '#36ad82', borderWidth: 2 },
      emphasis: { scale: 1.5, itemStyle: { color: '#fff', borderColor: '#49b995' } },
      areaStyle: {
        color: spectrumArea,
        opacity: 1,
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
    yAxis: { max, interval: max / 4 },
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
