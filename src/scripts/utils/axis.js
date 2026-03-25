import * as Plot from "@observablehq/plot";
export const xAxis = (opts) => Plot.axisX({ anchor: "bottom", 
                                        clamp: true, label: null, 
                                        fontSize: 8, 
                                        fontFamily: "HelveticaNeue-Light",
                                         ...opts });
export const yAxis = (opts) => Plot.axisY({ anchor: "left",
                                     grid: true, clamp: true, 
                                     labelAnchor: "center", 
                                     fontSize: 8, 
                                     fontFamily: "HelveticaNeue-Light",
                                     ...opts })