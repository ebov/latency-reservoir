import { SimpleLinearRegression } from "ml-regression";
import { timeParse } from "d3-time-format";
import {format} from "d3-format";
import {rollups,max, extent} from "d3-array";
import * as Plot from "@observablehq/plot";
import {black} from "../scripts/utils/colors.js"
import {JSDOM} from "jsdom";
console.log(SimpleLinearRegression)

export function leapYear(year) {
    return ((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0);
}

export function decimalToDate(decimal){
    const year = Math.trunc(decimal);
    const totalNumberOfDays = leapYear(year)? 366:365;
    const day = Math.round(((decimal-year)*totalNumberOfDays))+1;// (.0 is jan first)

    return timeParse("%Y-%j")(`${year}-${day}`)
}

export function dateGuesser(string){
    let dateBit = string.split("|").pop().replace(/'/g, "");
    const dashCount = (dateBit.match(/-/g) || []).length;
    if(dashCount==0){
        dateBit = dateBit+"-6-15"
    }else if(dashCount==1){
        dateBit = dateBit+"-15"
    }else if(dashCount!==2){
        throw Error(`tried to parse ${dateBit} as a date`)
    }
    // copilot added
    const parsedDate = timeParse("%Y-%m-%d")(dateBit);
    const year = parsedDate.getFullYear();
    const startOfYear = new Date(year, 0, 0);
    const diff = parsedDate - startOfYear;
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    const totalNumberOfDays = leapYear(year) ? 366 : 365;
    return year + (dayOfYear / totalNumberOfDays);

}


function getRttData(tree) {
  return tree.getExternalNodes().map((n) => ({
    div: tree.getDivergence(n),
    date: dateGuesser(tree.getTaxon(n).name),
    taxon: tree.getTaxon(n),
    cluster: tree.getAnnotation(n, "cluster")
  }));
}

function predict(fit,x){
  const predictions =  x.map(d=>({date:d,div:d*fit.slope + fit.intercept}))
  if(predictions[0].div<0){// replace with x intercept
    const xIntercept = -1*fit.intercept/fit.slope
    predictions[0] = {date:xIntercept,div:0}
  }
  return predictions
}

export function makeRTTPlot({tree, title, selectedTaxa,clusterColor,width,height,hovered,addRate = false}) {
  const data = getRttData(tree);
  const figureHeight = height===null?width*9/16:height

  const dateExtent = extent(data,d=>d.date)
  const fits =rollups(
      data,
      (d) => ({
        fit: new SimpleLinearRegression(
          d.map((d) => d.date),
          d.map((d) => d.div)
        ),
        tips:d
      }),
      (g) => g.cluster
    )
    .filter((d) => d[1].tips.length > 1)
    .map((d) => {
        return predict(d[1].fit,dateExtent).map(k=>({...k,cluster:d[0]}))
      }
    ).reduce((acc,d)=>acc.concat(d),[]) // concat for plot



  const selectedData = data.filter((d) => selectedTaxa.includes(d.taxon));
  const fullModel = new SimpleLinearRegression(
    selectedData.map((d) => d.date),
    selectedData.map((d) => d.div)
  );

  const fullModel_cor = fullModel.score(
    selectedData.map((d) => d.date),
    selectedData.map((d) => d.div)
  );


  const titleOptions = {
    frameAnchor: "top-left",
    dy: 15,
    dx:10,
    fontSize: 8,
    fontWeight: "400",
    lineAnchor: "bottom",
    fontFamily: "HelveticaNeue-Light"
  };



  if (addRate)
    title = `${title}  Slope: ${format("0.2e")(
      fullModel.slope
    )}, 𝘙 ² :${fullModel_cor.r2.toFixed(2)}`;
  const plot = Plot.plot({
    document:new JSDOM("").window.document,
    width: width,
    height:figureHeight,
    marginTop:20,
    marginLeft:25,
    marginRight:20,
    marginBottom:25,
    x:{transform:decimalToDate},
    y:{grid:true,
      domain:[0,max(data,d=>d.div)],// so we constrain the clade regressions to the data range
      clamp:true
    },
    marks: [
      Plot.text([title],{...titleOptions,text:d=>d}),
      Plot.ruleY([0]),
      Plot.ruleX([1975]),
      Plot.line(fits,{
        x:"date",
        y:"div",
        stroke:d=>clusterColor(d.cluster),
        opacity:0.5,
        strokeDasharray:"4,2"
      }),
      Plot.linearRegressionY(data, {
        filter: (d) => selectedTaxa.includes(d.taxon),
        x: "date",
        y: "div",
        stroke: black
      }),
      Plot.linearRegressionY(
        data.filter((n) => n.cluster),
        {
          x: "date",
          y: "div",
          stroke: (d) => clusterColor(d.cluster)
        }
      ),
      Plot.dot(data, {
        // filter: (d) => selectedTaxa.includes(d.taxon),
        x: "date",
        y: "div",
        fill:black,
        r: 3,
      }),
      Plot.dot(data, {
        x: "date",
        y: "div",
        fill: (d) => clusterColor(d.cluster),
        r: 2,
      }),
      Plot.axisX({anchor: "bottom", clamp:true, label:null,fontSize:8, fontFamily:"HelveticaNeue-Light",fontWeight:600}),
      Plot.axisY({anchor: "left", grid:true,clamp:true, label:"Divergence", labelAnchor:"top", labelOffset:{x:-10,y:5}, fontSize:8,fontFamily:"HelveticaNeue-Light",fontWeight:600})
      // Plot.text(slopes, {
      //   x: "x",
      //   y: "y",
      //   lineAnchor:"bottom",
      //   textAnchor:"end",
      //   text: (d) => format("0.2e")(d.slope),
      // }),
      
    ]
  });

  plot.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns", "http://www.w3.org/2000/svg");

return plot;
}