import * as Plot from "npm:@observablehq/plot";
import {extent,nice,ticks,mean} from "npm:d3-array"
//https://observablehq.com/@d3/kernel-density-estimation
function kde(kernel, thresholds, data) {
    return thresholds.map(t => [t, mean(data, d => kernel(t - d))]);
  }
  function epanechnikov(bandwidth) {
    return x => Math.abs(x /= bandwidth) <= 1 ? 0.75 * (1 - x * x) / bandwidth : 0;
  }

export function densityPlot(data, { width, height,truth,bandwidth} = {}) {
    const thresholds = ticks(...extent(data),  50)
    const bw = bandwidth?bandwidth:10;
    const density = kde(epanechnikov(bw), thresholds, data)
    console.log(density)
    return Plot.plot({
        width,
        y: { grid: true, label: "Densisty" },
        x:{label:"Test statistic"},
        marks: [
            Plot.dot(data, { y: 0, x: n => n, r: 1, fill: '#22b680' }),
            Plot.rectY(data, Plot.binX({y: "proportion"}, {thresholds, fill: "#bbb"})),
            // Plot.areaY(density, {curve: "basis"}),
            Plot.ruleX([truth],{stroke:"#CC3151"}),
            Plot.ruleY([0]),
        ]
    })
}