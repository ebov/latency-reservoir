import {timeParse, timeFormat} from "d3-time-format";
import {format} from "d3-format"
import {minIndex} from "d3-array"
import * as d3 from "d3"
import chisquare from 'https://cdn.jsdelivr.net/gh/stdlib-js/stats-base-dists-chisquare@esm/index.mjs';

import {tipIterator,Branches,rectangularLayout,NodeLabels,radialLayout,BranchLabels} from "@figtreejs/browser";

import { getCladeMap } from "../scripts/utils/BEASTUtils.js";
import {require} from "d3-require";
const ML = await require("https://www.lactame.com/lib/ml/6.0.0/ml.min.js")
import * as Plot from "@observablehq/plot";
import {black,grey} from "../scripts/utils/colors.js"

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

export function getP(data,stat,tail="greater"){
    const greater= data.filter(d=>d>stat)
    const lesser = data.filter(d=>d<stat)
    const array = tail==="greater"?greater:lesser;
    if(array.length===0){
      return `p<${format("0.1e")(1/data.length)}*`
    }else{
      return `p=${format("0.2")(array.length/data.length)}${array.length/data.length<0.05?'*':''}`
    }
  
  }

export function outGroup(tree) {
    const tips = [];
    for (const child of tree.getChildren(tree.getRoot())) {
      tips.push([...tipIterator(tree, child)]);
    }
  
    const minOG = minIndex(tips, (d) => d.length);
    return tips[minOG]
      .map((n) => tree.getTaxon(n).name.split("|")[3])
      .sort()
      .join(", ");
  }
  


  function getMeanRates(rates,partitions) {
    const lc =  rates.length/partitions.length; // one rate for each partition for each local clock
    const timeScale = 100; // in mlb files one unit of time is 100 years
    return d3
      .rollups(
        rates,
        (D) => d3.sum(D, (d, i) => d/timeScale * partitions[i]) / d3.sum(partitions),
        // rate is s/s/100 years this converts to years and gets mean rate
        (d, i) => i % lc // grouping
      )
      .map((d) => d[1]);
  }
  
  // processes all the paml analyses for a given dataset.
  // flat returns an entry for all trees in all analyses.
  // otherwise just the best tree is reported.
export function processPaml(data,flat=false) {
  
  // gets the best tree if there are multiple in the analysis.
    let processed;
  
      if(flat){
          processed = data.reduce((acc,curr)=>{
              const partitions = curr.partitions.length>0?curr.partitions:[curr.sites]
  
              const trees = curr.trees.map(d=>({
                  ...d,
                  rate:d.rate?getMeanRates(d.rate,partitions):null,
                  og:outGroup(d.tree),
                  np:d.np,
                  seqs:curr.seqs,
                  analysis:curr.analysis
              }))
              return acc.concat(trees);
          },[])
  
      }else{
          processed = data.map((d) => {
              const partitions = d.partitions.length>0?d.partitions:[d.sites]
              const bestTree = d3.maxIndex(d.trees, (d) => d.ll);
              return {
              ...d,
              ll: d3.max(d.trees, (d) => d.ll),
              bestTree,
              rate: d.trees[0].rate
              ? getMeanRates(d.trees[bestTree].rate,partitions)
              : null,
              og: outGroup(d.trees[bestTree].tree),
              np: d.trees[bestTree].np
              }
          });
      }
  
    const maxLL = d3.max(processed, (d) => d.ll);
    const maxNP = d3.max(processed, (d) => d.np);
  
  // TODO chisquared p value here based on diff and df.
    return processed.map((d) => {
      const diff = d.ll-maxLL
      const df = maxNP - d.np > 0 ? maxNP - d.np : null
      const p = df!==null? chisquare.cdf(df,-2*diff) :null
      return {
        ...d,
        diff,
        df,
        p
      }
    }
      );
  }
  


// see data/processed/paml/local-clocks for orders
const set19ClocksClades = [
  ["KU182905|Kikwit-9510621|DRC|1995-05-04"],
  ["HQ613402|034-KS|DRC|2008-12-31","HQ613403|M-M|DRC|2007-08-31"],
  ["MH613311|Muembe.1|DRC|2017-05-15","MK007330|18FHV090-Beni|DRC|2018-07-28"],
  ["|22MBK-004|DRC|2022-04-25","OR084849|Mandaka|DRC|2020-05-31",
    "KP271018|Lomela-Lokolia16|DRC|2014-08-20","OR084846|MBK67|DRC|2020-06-12",
    "MH733477|BIK009-Bikoro|DRC|2018-05-10"],
  ["PP_003RXHG|25fhv173|DRC|2025-09-01"]] // add 1 to index to map to rates

const set11ClockClades = [
  ["KU182905|Kikwit-9510621|DRC|1995-05-04"],
  ["HQ613402|034-KS|DRC|2008-12-31","HQ613403|M-M|DRC|2007-08-31"],
]
// clock rates implied by old rooting set 11 
const set19_11ClockClades = [
  ["PP_003RXHG|25fhv173|DRC|2025-09-01"],
  ["MH613311|Muembe.1|DRC|2017-05-15","MK007330|18FHV090-Beni|DRC|2018-07-28"],
  ["|22MBK-004|DRC|2022-04-25","OR084849|Mandaka|DRC|2020-05-31",
    "KP271018|Lomela-Lokolia16|DRC|2014-08-20","OR084846|MBK67|DRC|2020-06-12",
    "MH733477|BIK009-Bikoro|DRC|2018-05-10"]
]


export function pamlTree({pamlResults,id,width,height=null}){
  let tree = pamlResults.tree.orderNodesByDensity(true)
// todo Annotate with rates here
  const layout = pamlResults.analysis==="dr"?radialLayout : rectangularLayout;
  const margins = pamlResults.analysis==="dr"?{ top: 80, left: 50, right: 50, bottom: 80 }:{ top: 10, left: 12, right: 200, bottom: 40 }
  
  
  if(/srdtLocal|srdtStem/.test(pamlResults.analysis)){
    let clockClades;
    if(pamlResults.seqs===11){
      clockClades= set11ClockClades;
    }else if(pamlResults.seqs===19){
      clockClades = set19ClocksClades;
      if(/Stem11/.test(pamlResults.analysis)){
        clockClades = set19_11ClockClades
      }
    }
    console.log(pamlResults)
    for(let i=0;i<clockClades.length;i++){
      const tips = clockClades[i]
      const clade = tips.map(d=>{console.log(d); return tree.getNode(d)})
      let node;
      if(clade.length===1){
          node = clade[0]
      }else{
        node = tree.getMRCA(clade) 
      }
        tree = tree.annotateNode(node,{rate:pamlResults.rate[i+1]})
    }

  }
  
   // handle set 18 stem,clade, stemX, limited
  
  // have to call this here bc the map is keyed by nodes, which change if they are annotated
  const cladeMap = getCladeMap(tree);

  const usedHeight = height===null?width:height;

  return {
    svg: document.getElementById(id),
  tree: tree,
  animated: true,
  layout: layout,
  width: width,
  height: usedHeight,
  margins: margins,
   axis: /srdt/.test(pamlResults.analysis)? {
      gap:10,
      offsetBy: d3.max(tree.getExternalNodes().map(n=>dateGuesser(tree.getTaxon(n).name))),
      scaleBy:1/365,
      ticks:{format:d=>timeFormat("%Y")(decimalToDate(d))},
      reverse:true,
      bars:{}
    }:null,
  baubles: [
   
    Branches({
      attrs: { stroke: n=> tree.hasAnnotation(n,"rate")?grey:black, strokeWidth: 2},
      keyBy:n=> { if(cladeMap.has(n)){
                return ""+cladeMap.get(n)
              }else{
                throw new Error(`node ${n} not in clade map - branches`)
              }}
    }),
    BranchLabels({
      filter:(n) => tree.hasAnnotation(n,"rate"),
      text: (n) => d3.format('0.3e')(tree.getAnnotation(n,"rate")),
      attrs: {
        fill: "black",
        fontSize: 10,
        fontWeight: 300,
        fontFamily: "HelveticaNeue-Light",
        dy:2
      },
    }),
    NodeLabels({
      filter: (n) => tree.isExternal(n),
      attrs: {
        fill: "black",
        fontSize: 12,
        fontWeight: 300,
        fontFamily: "HelveticaNeue-Light"
      },
      text: (n) => tree.getTaxon(n).name.split("|").filter((d,i)=>i>1).join("|"),
      keyBy:n=>""+cladeMap.get(n)

    })
  ].filter(d=>d), // remove axis if null
  opts: {}
}
}

// radial figures

export function getRadialCladeMap(postOrder,map=new Map()){
 
  for(const node of postOrder){
      let bitSet = new TypedFastBitSet();
      if(tree.isExternal(node)){
          bitSet.add(tree.getTaxon(node).number)
      }else{
          for(const child of tree.getChildren(node)){
              bitSet = bitSet.new_change(map.get(child))
          }
      }
      map.set(node,bitSet)
  }
  return map;
}

function getRttData(tree) {
  return tree.getExternalNodes().map((n) => ({
    div: tree.getDivergence(n),
    date: dateGuesser(tree.getTaxon(n).name),
    taxon: tree.getTaxon(n),
    cluster: tree.getAnnotation(n, "cluster")
  }));
}



export function makeRTTPlot({tree, title, selectedTaxa,clusterColor,width,height,hovered,addRate = false}) {
  const data = getRttData(tree);
 const figureHeight = height===null?width*9/16:height
  const slopes = d3
    .rollups(
      data,
      (d) => ({
        slope: new ML.SimpleLinearRegression(
          d.map((d) => d.date),
          d.map((d) => d.div)
        ).slope,
        x: d3.mean(d, (d) => d.date),
        y: d3.mean(d, (d) => d.div),
        data:d
      }),
      (g) => g.cluster
    )
    .map((d) => d[1])
    .filter((d) => d.data.length>1)

  const selectedData = data.filter((d) => selectedTaxa.includes(d.taxon));
  const fullModel = new ML.SimpleLinearRegression(
    selectedData.map((d) => d.date),
    selectedData.map((d) => d.div)
  );

  const fullModel_cor = fullModel.score(
    selectedData.map((d) => d.date),
    selectedData.map((d) => d.div)
  );

  if (addRate)
    title = `${title}  rate: ${d3.format("0.2e")(
      fullModel.slope
    )}, 𝘙 ² :${fullModel_cor.r2.toFixed(2)}`;
  return Plot.plot({
    title: title,
    width: width,
    height:figureHeight,
    y:{clamp:true,grid:true, label:"divergence"},
    x:{clamp:true,transform:decimalToDate},
    marks: [
      Plot.ruleY([0]),
      Plot.ruleX([1975]),
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
        filter: (d) => selectedTaxa.includes(d.taxon),
        x: "date",
        y: "div",
        fill:black,
        r: 6,
      }),
      Plot.dot(data, {
        x: "date",
        y: "div",
        fill: (d) => clusterColor(d.cluster),
        r: 4,
      }),
      Plot.dot(data, {
        filter:d=>d.taxon.name===hovered,
        x: "date",
        y: "div",
        fill: (d) => clusterColor(d.cluster),
        r: 7,
      }),
      Plot.text(slopes, {
        x: "x",
        y: "y",
        text: (d) => d3.format("0.2e")(d.slope),
        dy: -10
      })
    ]
  });
}