import * as d3 from "d3"

import {PointValue, SeriesModel} from "../../models/run"
import {OUTLIER_MARGIN} from "./constants"

export function getExtentWithoutOutliers(series: PointValue[], func: (d: PointValue) => number): [number, number] {
    let values = series.map(func)
    values.sort((a, b) => a - b)
    if (values.length === 0) {
        return [0, 0]
    }
    if (values.length < 10) {
        return [values[0], values[values.length - 1]]
    }
    let extent = [0, values.length - 1]
    let margin = Math.floor(values.length * OUTLIER_MARGIN)
    let stdDev = d3.deviation(values.slice(margin, values.length - margin))
    if (stdDev == null) {
        stdDev = (values[values.length - margin - 1] - values[margin]) / 2
    }
    for (; extent[0] < margin; extent[0]++) {
        if (values[extent[0]] + stdDev * 2 > values[margin]) {
            break
        }
    }
    for (; extent[1] > values.length - margin - 1; extent[1]--) {
        if (values[extent[1]] - stdDev * 2 < values[values.length - margin - 1]) {
            break
        }
    }

    return [values[extent[0]], values[extent[1]]]
}

export function getExtent(series: PointValue[][], func: (d: PointValue) => number, forceZero: boolean = false): [number, number] {
    let extent = getExtentWithoutOutliers(series[0], func)

    for (let s of series) {
        let e = getExtentWithoutOutliers(s, func)
        extent[0] = Math.min(e[0], extent[0])
        extent[1] = Math.max(e[1], extent[1])
    }

    if (forceZero || (extent[0] > 0 && extent[0] / extent[1] < 0.1)) {
        extent[0] = Math.min(0, extent[0])
    }

    return extent
}

export function getScale(extent: [number, number], size: number): d3.ScaleLinear<number, number> {
    return d3.scaleLinear<number, number>()
        .domain(extent).nice()
        .range([0, size])
}

export function defaultSeriesToPlot(series: SeriesModel[]) {
    let count = 0
    let plotIdx = []
    for (let s of series) {
        let name = s.name.split('.')
        if (name[0] === 'loss') {
            plotIdx.push(count)
            count++
        } else {
            plotIdx.push(-1)
        }
    }

    return plotIdx
}


export function toPointValues(track: SeriesModel[]) {
    let series: SeriesModel[] = [...track]
    for (let s of series) {
        let res: PointValue[] = []
        for (let i = 0; i < s.step.length; ++i) {
            res.push({step: s.step[i], value: s.value[i], smoothed: s.smoothed[i]})
        }
        s.series = res
    }

    return series
}


export function toLogPointValues(track: SeriesModel[]) {
    let series: SeriesModel[] = [...track]
    for (let s of series) {
        let res: PointValue[] = []
        for (let i = 0; i < s.step.length; ++i) {
            //TODO think about a better way to remove zeros in logValues
            if (s.value[i] > 0.0 && s.smoothed[i] > 0.0) {
                res.push({step: s.step[i], value: Math.log(s.value[i]), smoothed: Math.log(s.smoothed[i])})
            }
        }
        s.series = res
    }

    return series
}