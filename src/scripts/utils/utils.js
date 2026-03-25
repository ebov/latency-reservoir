
import { rectangularLayout, postOrderIterator,ImmutableTree as Tree } from "@figtreejs/browser";
import * as Plot from "@observablehq/plot";
import { JSDOM } from "jsdom";

import { dateGuesser, decimalToDate } from "./dateGuesser.js";
import { max } from "d3-array"
import { format } from "d3-format"
import fs from "node:fs";
import path from "node:path";
import { extent, bin, ticks, mean } from "d3-array"
import { clusterScale } from "./colors.js";
import { tsvParse, autoType } from "d3-dsv";
import { fileURLToPath } from 'node:url';
import { hpd, kde, epanechnikov, normalizeDensity } from "./summarize.js";
import {svg} from 'htl'
import { inset } from "./saveFigure.js";
import { tickFormat } from "d3-scale";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tipFilePath = path.resolve(__dirname, '../../data/processed/latLong.tsv');
const tipData = tsvParse(fs.readFileSync(tipFilePath, 'utf8'), autoType);



const grey = clusterScale("F")
const black = clusterScale("C")

function getDensity(data, options = {}) {

    const hpd95 = hpd(data)
    const e = extent(data)
    const range = options && options.ticks ? options.ticks : Math.round(e[1] - e[0])
    const thresholds = ticks(...extent(data), range)
    const bw = options && options.bandwidth ? options.bandwidth : 5;
    const density = kde(epanechnikov(bw), thresholds, data)
    return ({ density: normalizeDensity(density), hpd95 })
}




export const xAxis = (opts) => Plot.axisX({ anchor: "bottom", 
                                        clamp: true, label: null, 
                                        fontSize: 8, 
                                        fontFamily: "HelveticaNeue-Light",
                                         ...opts });
export const yAxis = (opts) => Plot.axisY({ anchor: "left",
                                     grid: true, 
                                     labelAnchor: "center", 
                                     fontSize: 8, 
                                     fontFamily: "HelveticaNeue-Light",
                                     ...opts })



// image constants
const fullHeight = 1.5;
const cutOff = 0.50;


// for latentTreeFig
export function mccTreeFigure(root, combinedLog, { treeWidth, treeHeight }) {
   let mccTree = root.mcc
  
      // annotate clusters
      for (const d of tipData) {
          try {
              const tip = mccTree.getNode(d.taxa);
              mccTree = mccTree.annotateNode(tip, d); // some analyses exclude makona
          } catch (error) {
              console.log(`Taxa not found: ${d.taxa}`);
          }
      }
  
  
      // annotate cluster mrca - assumes rooting does not break a cluster!
      // for each cluster get the mrca then annotate all nodes above mrca as cluster.
      for (const cluster of mccTree.getAnnotationSummary("cluster").domain) {
          const tips = mccTree.getNodes().filter(n => mccTree.hasAnnotation(n,"cluster") && mccTree.getAnnotation(n, "cluster") === cluster)
          if (tips.length > 1) {
              const mrca = mccTree.getMRCA(tips);
              mccTree = mccTree.annotateNode(mrca, { cluster })
              for (const node of postOrderIterator(mccTree, mrca)) {
                  mccTree = mccTree.annotateNode(node, { cluster })
              }
          }
  
      }
  
  
      const getLatentSupport = node => mccTree.getAnnotation(node, "latent_indicator_distribution").filter(d => d > 0).length / mccTree.getAnnotation(node, "latent_indicator_distribution").length;
      const getConditionalLatentProp = node => {
        const indicators = mccTree.getAnnotation(node, "latent_indicator_distribution");
        const proportions = mccTree.getAnnotation(node, "latent_prop_distribution");
        if(proportions.length!==indicators.length){
            throw Error("Proportions length does not equal length of indicator")
        }
        return proportions.map((d,i)=>d*indicators[i]).filter(d=>d>0)
      }
      // cut latent branches
      for (const node of mccTree.getNodes()) {
          if (mccTree.isRoot(node)) {
              continue;
          }
          const ls = getLatentSupport(node);
          if (ls > cutOff) {
              //second cut needs to account for the changes length
              // const first = ls/2;
              //second target is ls+ls/2
              // const second = 3/2

              const lp = mean( getConditionalLatentProp(node)); 

  
              const cuts = [(1 - lp) / 2, (1 + lp) / 2];
              for (const cut of cuts) {
                  mccTree = mccTree.insertNode(node, cut);
              }
              // annotate new nodes
              const insert1 = mccTree.getParent(node);
              const hasCluster = mccTree.hasAnnotation(node, "cluster")
              mccTree = mccTree.annotateNode(insert1,
                  {
                      inserted: true,
                      latent: true,
                      rate: mccTree.getAnnotation(node, "rate"),
                      latent_indicator_distribution: mccTree.getAnnotation(node, "latent_indicator"),
                      latent_prop_distribution: mccTree.getAnnotation(node, "latent_proportion")
                  });
  
              const insert2 = mccTree.getParent(insert1);
              mccTree = mccTree.annotateNode(insert2, { inserted: true, latent: false });
  
              if (hasCluster ) {
                  const cluster = mccTree.getAnnotation(node, "cluster")
                  mccTree = mccTree.annotateNode(insert1, { cluster })
                  mccTree = mccTree.annotateNode(insert2, { cluster })
              }
          }
      }
  
  
      const origin = max(mccTree.getExternalNodes().map(n => dateGuesser(mccTree.getTaxon(n).name)))
  
      const regLayout = rectangularLayout(mccTree)
  
      const layout = (node) => ({ ...regLayout(node), x: origin - mccTree.getHeight(node) })
      const edges = mccTree.getNodes()
          .filter(n => !mccTree.isRoot(n))
          .map(n => ({ child: layout(n), parent: layout(mccTree.getParent(n)), node: n }))
  
  
      const fullRootDates = combinedLog.map(d => origin - d.rootHeight)
      const { density: fullDensity, hpd95: fullQuantiles } = getDensity(fullRootDates,{ ticks: 500, bandwidth: 10 });
  
    //   let nkp = mccTree.getParent(mccTree.getNode("MK007330|18FHV090-Beni|DRC|2018-07-28"));
    //   // if we've inserted nodes here for latency vis then keep going until we hit the og parent
    //   while (mccTree.hasAnnotation(nkp, 'inserted')) {
    //       nkp = mccTree.getParent(nkp);
    //   }
  
    //   const nordKivuDates = mccTree.getAnnotation(nkp, "heights").map(h => origin - h);
    //   const { density: kivuDensity, hpd95: kivuQ } = getDensity(nordKivuDates);
  
      const rootDates = mccTree.getAnnotation(mccTree.getRoot(), "heights").map(h => origin - h);
      const { density, hpd95 } = getDensity(rootDates,{ticks:500,bandwidth:10})
  
      // rescale so max is X
      const rescale = (x) => x * treeHeight*0.5 * root.posterior;
      const fullRescale = (x) => x * treeHeight*0.5;
  
  
      const getBranchLabel = node => {
          if (!mccTree.hasAnnotation(node, "latent_indicator_distribution")) {
              return ''
          }
          const ls = getLatentSupport(node);
          if (ls < cutOff) {
              return '';
          }
          const mean_ls = mean(mccTree.getAnnotation(node, "latent_indicator_distribution").filter(d => d > 0))
          const mean_length = mccTree.getLength(node)
             return `${format("0.1f")(mean_ls)} (${format("0.2")(ls)})`
          // return `${format("0.2f")(ls)}`
  
      }
      const marginBottom = 40;
  
      const treeFig = Plot.plot({
          document: new JSDOM("").window.document,
          width: treeWidth,
          height: treeHeight,
          marginRight: 70,
          marginTop: 25,
          marginBottom,
          y: { axis: null},
          x: {
              transform: d => decimalToDate(d), grid: true,
              domain: [new Date(1875, 1, 1), new Date(2026, 1, 1)],
              clamp:true
              // ticks:5
          },
          marks: [
  
              Plot.ruleY([-0.5]),
              Plot.link(edges, {
                  filter: e => !mccTree.getAnnotation(e.node, "latent",false) ,
                  x2: e => e.child.x,
                  x1: e => e.parent.x,
                  y1: e => e.parent.y,
                  y2: e => e.child.y,
                  curve: "step-before",
                  strokeWidth: 2,
                  stroke: e => {
                      const n = e.node;
                      if ((!mccTree.isRoot(n) && mccTree.getChildCount(e.node)>0 && mccTree.hasAnnotation(mccTree.getParent(n), "cluster")) && !mccTree.getAnnotation(mccTree.getParent(n),"inserted",false) && mccTree.hasAnnotation(n, "cluster")) {
                          return clusterScale(mccTree.getAnnotation(e.node, "cluster"))
                      }else if(mccTree.getChildCount(e.node)==0){
                            return clusterScale(mccTree.getAnnotation(e.node, "cluster"))
                      }
                      return black
                  }
              }),
              Plot.link(edges, {
                  filter: e => mccTree.getAnnotation(e.node,"latent",false),
                  x2: e => e.child.x,
                  x1: e => e.parent.x,
                  y1: e => e.parent.y,
                  y2: e => e.child.y,
                  curve: "step-before",
                  strokeWidth: 1.5,
                  strokeDasharray: "6,3",
                  stroke: grey
                  // stroke:e=> colorScale(getLatentSupport(e.node))
              }),
              // branch Labels
              Plot.text(edges, {
                  filter: e => mccTree.hasAnnotation(e.node, "latent"),
                  x: e => (e.parent.x + e.child.x) / 2,
                  y: e => e.child.y,
                  dy: -5,
                  dx: -17,
                  text: e => getBranchLabel(e.node),
                  textAnchor: "middle",
                  fill: "black",
                  fontSize: 8,
                  fontWeight: 500,
                  fontFamily: "HelveticaNeue-Light",
              }
              ),
              // branch Labels
              //         Plot.text(edges,{
              //                 filter:e=>mccTree.getAnnotation(e.node,"latent"),
              //                 x:e=>(e.parent.x+e.child.x)/2, 
              //                 y:e=>e.child.y,
              //                 dy:10,
              //                 dx:-25,
              //                 text: e=> format("0.2e")(mccTree.getAnnotation(e.node,"rate")),
              //                 textAnchor:"middle" }),
              //tip labels
              Plot.text(mccTree.getExternalNodes(),{
                  x:n=>layout(n).x,
                  y:n=>layout(n).y, 
                
                  text: (n) => {
                      const parts = mccTree.getTaxon(n).name.split("|");
                      const year = parts[3].split("-")[0]
                      return `${parts[2]} (${year})`
                  },
                  dx:5,
                  fontSize: 8,
                  fontWeight: 500,
                  fontFamily: "HelveticaNeue-Light",
              }),
  
              // Plot.line(kivuDensity, { x: d => d[0], y: d => layout(nkp).y + (d[1] * 30), stroke: clusterScale(mccTree.getAnnotation(nkp, "cluster")) }),
              // Plot.areaY(kivuDensity, { filter: d => d[0] > kivuQ[0] && d[0] < kivuQ[1], x: d => d[0], y1: layout(nkp).y, y2: d => layout(nkp).y + (d[1] * 30), fill: clusterScale(mccTree.getAnnotation(nkp, "cluster")), opacity: 0.5 }),
  
  
              Plot.line(fullDensity, { x: d => d[0], y: d => fullRescale(d[1]), stroke: "grey" }),
              Plot.areaY(fullDensity, { filter: d => d[0] > fullQuantiles[0] && d[0] < fullQuantiles[1], x: d => d[0], y: d => fullRescale(d[1]), fill: grey, opacity: 0.5 }),
  
  
              Plot.line(density, { x: d => d[0], y: d => rescale(d[1]), stroke: black }),
              Plot.areaY(density, { filter: d => d[0] > hpd95[0] && d[0] < hpd95[1], x: d => d[0], y: d => rescale(d[1]), fill: black, opacity: 0.5 }),
              // Support annotations
              Plot.text([[layout(mccTree.getRoot()).x, layout(mccTree.getRoot()).y]], {
                  text: d => `${format("0.1%")(root.posterior)}`,
                  // attrs:{
                  fill: "black",
                  fontSize: 12,
                  fontWeight: 500,
                  fontFamily: "HelveticaNeue-Light",
                  textAnchor: "end",
                  dx: -10
                  // }
  
              }),
              xAxis({ ticks: 5, tickRotate: 0, grid:true})
          ]
      })
  
      treeFig.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns", "http://www.w3.org/2000/svg");
  
  
      return  treeFig.outerHTML
    
  

}




export function rateDensityInsert(root,combinedLog,ops){

    let {marginTop,marginRight,marginBottom,marginLeft,width,height} = {marginTop:10,marginBottom:20,marginLeft:10,marginRight:20,width:200,height:400,...ops}
      // Clock rate
      const fullClockRate = combinedLog.map(d => d[`clock.rate`]);
      const rootClockRate = fullClockRate.filter((d, i) => root.indices.includes(i))
      const fullClockRateDensity = getDensity(fullClockRate, { ticks: 100, bandwidth: 5e-5 })
      const rootClockRateDensity = getDensity(rootClockRate, { ticks: 100, bandwidth: 5e-5 })
      const rateFig = Plot.plot({
          document: new JSDOM("inset").window.document,
          marginTop,
          marginBottom,
          marginLeft,
          marginRight,
          height,
          width,
          //  x:{label:"Clock rate",tickFormat:format("0.1e"),ticks:3},
          y: {axis:null},//{ label: "Density", grid: true},
          marks: [
              Plot.ruleY([0]),
              Plot.line(fullClockRateDensity.density, { stroke: grey }),
              Plot.areaY(fullClockRateDensity.density, { filter: d => d[0] > fullClockRateDensity.hpd95[0] && d[0] < fullClockRateDensity.hpd95[1], x: d => d[0], y: d => d[1], fill: grey, opacity: 0.5 }),
  
              Plot.line(rootClockRateDensity.density, { x: d => d[0], y: d => d[1] * root.posterior, stroke: black }),
              Plot.areaY(rootClockRateDensity.density, { filter: d => d[0] > rootClockRateDensity.hpd95[0] && d[0] < rootClockRateDensity.hpd95[1], x: d => d[0], y: d => d[1] * root.posterior, fill: black, opacity: 0.5 }),
              xAxis({ tickFormat: format("0.1e"), tickRotate: 45, ticks: 4, label: "Rate", labelOffset:-5  }),
            //   yAxis({ dx:15,labelOffset:25})
          ]
  
      })
      

      rateFig.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns", "http://www.w3.org/2000/svg")
      return rateFig.outerHTML // just the string
    }





export function mccTree(root, combinedLog, { treeWidth, treeHeight}) {
   let mccTree = root.mcc

      // annotate clusters
      for (const d of tipData) {
          try {
              const tip = mccTree.getNode(d.taxa);
              mccTree = mccTree.annotateNode(tip, d); // some analyses exclude makona
          } catch (error) {
              console.log(`Taxa not found: ${d.taxa}`);
          }
      }
      // annotate cluster mrca - assumes rooting does not break a cluster!
      // for each cluster get the mrca then annotate all nodes above mrca as cluster.
      for (const cluster of mccTree.getAnnotationSummary("cluster").domain) {
          const tips = mccTree.getNodes().filter(n => mccTree.hasAnnotation(n,"cluster") && mccTree.getAnnotation(n, "cluster") === cluster)
          if (tips.length > 1) {
              const mrca = mccTree.getMRCA(tips);
              mccTree = mccTree.annotateNode(mrca, { cluster })
              for (const node of postOrderIterator(mccTree, mrca)) {
                  mccTree = mccTree.annotateNode(node, { cluster })
              }
          }
      }

      const getLatentSupport = node => mccTree.getAnnotation(node, "latent_indicator_distribution").filter(d => d > 0).length / mccTree.getAnnotation(node, "latent_indicator_distribution").length;
      const getConditionalLatentProp = node => {
        const indicators = mccTree.getAnnotation(node, "latent_indicator_distribution");
        const proportions = mccTree.getAnnotation(node, "latent_prop_distribution");
        if(proportions.length!==indicators.length){
            throw Error("Proportions length does not equal length of indicator")
        }
        return proportions.map((d,i)=>d*indicators[i]).filter(d=>d>0)
      }
      // cut latent branches
      for (const node of mccTree.getNodes()) {
          if (mccTree.isRoot(node)) {
              continue;
          }
          const ls = getLatentSupport(node);
          if (ls > cutOff) {
              //second cut needs to account for the changes length
              // const first = ls/2;
              //second target is ls+ls/2
              // const second = 3/2
              const lp = mean( getConditionalLatentProp(node)); 
  
              const cuts = [(1 - lp) / 2, (1 + lp) / 2];
              for (const cut of cuts) {
                  mccTree = mccTree.insertNode(node, cut);
              }
              // annotate new nodes
              const insert1 = mccTree.getParent(node);
              const hasCluster = mccTree.hasAnnotation(node, "cluster")
              mccTree = mccTree.annotateNode(insert1,
                  {
                      inserted: true,
                      latent: true,
                      rate: mccTree.getAnnotation(node, "rate"),
                      latent_indicator_distribution: mccTree.getAnnotation(node, "latent_indicator_distribution"),
                      latent_prop_distribution: mccTree.getAnnotation(node, "latent_prop_distribution")
                  });
  
              const insert2 = mccTree.getParent(insert1);
              mccTree = mccTree.annotateNode(insert2, { inserted: true, latent: false });
  
              if (hasCluster ) {
                  const cluster = mccTree.getAnnotation(node, "cluster")
                  mccTree = mccTree.annotateNode(insert1, { cluster })
                  mccTree = mccTree.annotateNode(insert2, { cluster })
              }
          }
      }
  
  
      const origin = max(mccTree.getExternalNodes().map(n => dateGuesser(mccTree.getTaxon(n).name)))
  
      const regLayout = rectangularLayout(mccTree)
  
      const layout = (node) => ({ ...regLayout(node), x: origin - mccTree.getHeight(node) })
      const edges = mccTree.getNodes()
          .filter(n => !mccTree.isRoot(n))
          .map(n => ({ child: layout(n), parent: layout(mccTree.getParent(n)), node: n }))
  
  
      const fullRootDates = combinedLog.map(d => origin - d.rootHeight)
      const { density: fullDensity, hpd95: fullQuantiles } = getDensity(fullRootDates,{ ticks: 500, bandwidth: 10 });
  
  
      const rootDates = mccTree.getAnnotation(mccTree.getRoot(), "heights").map(h => origin - h);
      const { density, hpd95 } = getDensity(rootDates,{ticks:500,bandwidth:10})
  
      // rescale so max is X
      const rescale = (x) => x * fullHeight *treeHeight* root.posterior;
      const fullRescale = (x) => x * fullHeight*treeHeight;
  
  
      const getBranchLabel = node => {
          if (!mccTree.hasAnnotation(node, "latent_indicator")) {
              return ''
          }
          const ls = getLatentSupport(node);
          if (ls < cutOff) {
              return '';
          }  
            //  return `${format("0.1f")(mean_ls)}  (${format("0.2")(ls)})`
          return `${format("0.2f")(ls)}`
  
      }
   
      const treeFig = Plot.plot({
          document: new JSDOM("").window.document,
          width: treeWidth,
          height: treeHeight,
          marginRight: 60,
          marginTop: 15,
          marginBottom:15,
          marginLeft:35,
          y: { axis: null},
          x: {
              transform: d => decimalToDate(d), grid: true,
              domain: [new Date(1850, 1, 1), new Date(2026, 1, 1)],
              clamp:true,
              ticks:8
          },
          marks: [
              Plot.ruleY([-0.5]),
                            //tip labels
              Plot.link(mccTree.getExternalNodes(),{
                  x2:n=>max(mccTree.getExternalNodes(),d=>layout(d).x),
                  x1:d=>layout(d).x,
                  y2:n=>layout(n).y,
                  y1:n=>layout(n).y, 
                  strokeWidth:0.5,
                  strokeDasharray:"1, 1"
              }),
                Plot.text(mccTree.getExternalNodes(),{
                  x:n=>max(mccTree.getExternalNodes(),d=>layout(d).x),
                  y:n=>layout(n).y, 
                  text: (n) => {
                      return  mccTree.getAnnotation(n,'outbreak')
                  },
                  dx:5,
                  fontSize: 7,
                  fontWeight: 300,
                  fontFamily: "HelveticaNeue-Light",
              }),
              Plot.link(edges, {
                  filter: e => !mccTree.getAnnotation(e.node, "latent",false) ,
                  x2: e => e.child.x,
                  x1: e => e.parent.x,
                  y1: e => e.parent.y,
                  y2: e => e.child.y,
                  curve: "step-before",
                  strokeWidth: 1.5,
                  stroke: e => {
                      const n = e.node;
                      if ((!mccTree.isRoot(n) && mccTree.getChildCount(e.node)>0 && mccTree.hasAnnotation(mccTree.getParent(n), "cluster")) && !mccTree.getAnnotation(mccTree.getParent(n),"inserted",false) && mccTree.hasAnnotation(n, "cluster")) {
                          return clusterScale(mccTree.getAnnotation(e.node, "cluster"))
                      }else if(mccTree.getChildCount(e.node)==0){
                            return clusterScale(mccTree.getAnnotation(e.node, "cluster"))
                      }
                      return black
                  }
              }),
              Plot.link(edges, {
                  filter: e => mccTree.getAnnotation(e.node,"latent",false),
                  x2: e => e.child.x,
                  x1: e => e.parent.x,
                  y1: e => e.parent.y,
                  y2: e => e.child.y,
                  curve: "step-before",
                  strokeWidth: 1,
                  strokeDasharray: "6,3",
                  stroke: grey
              }),
              // branch Labels
              Plot.text(edges, {
                  filter: e => mccTree.hasAnnotation(e.node, "latent") && mccTree.getAnnotation(e.node,'outbreak','none')!=="Kwilu/1995",
                  x: e => (e.parent.x + e.child.x) / 2,
                  y: e => e.child.y,
                  dy: -3,
                  dx: -7,
                  text: e => getBranchLabel(e.node),
                  textAnchor: "middle",
                  fill: "black",
                  fontSize: 7,
                  fontWeight: 300,
                  fontFamily: "HelveticaNeue-Light",
              }
              ),
            Plot.dot(mccTree.getExternalNodes(),{
                  x:n=>layout(n).x,
                  y:n=>layout(n).y, 
                fill:n=>clusterScale(mccTree.getAnnotation(n, "cluster")),
                r:2,
                stroke:black,
                strokeWidth:0.5
              }),

              // Root age distribution
              Plot.line(fullDensity, { x: d => d[0], y: d => fullRescale(d[1]), stroke: "grey" }),
              Plot.areaY(fullDensity, { filter: d => d[0] > fullQuantiles[0] && d[0] < fullQuantiles[1], x: d => d[0], y: d => fullRescale(d[1]), fill: grey, opacity: 0.5 }),
  
              Plot.line(density, { x: d => d[0], y: d => rescale(d[1]), stroke: black }),
              Plot.areaY(density, { filter: d => d[0] > hpd95[0] && d[0] < hpd95[1], x: d => d[0], y: d => rescale(d[1]), fill: black, opacity: 0.5 }),
              
              // Support annotations
              Plot.text([[layout(mccTree.getRoot()).x, layout(mccTree.getRoot()).y]], {
                  text: d => `${format("0.1%")(root.posterior)}`,
                  // attrs:{
                  fill: "black",
                  fontSize: 12,
                  fontWeight: 300,
                  fontFamily: "HelveticaNeue-Light",
                  textAnchor: "end",
                  dx: -10
                  // }
              }),
              xAxis({ ticks: 8, tickRotate: 0, grid:true}),
              
          ]
      })
  
      treeFig.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns", "http://www.w3.org/2000/svg");
      return treeFig.outerHTML;

}

export function mccTreeWithInsert(root,combinedLog,{treeWidth,treeHeight,densityHeight,densityWidth,densityPos}){
    const tree = mccTree(root,combinedLog,{treeHeight,treeWidth})
    const rate = rateDensityInsert(root,combinedLog,{height:densityHeight,width:densityWidth})
    return inset(tree,rate,{pos:densityPos})
}

export function lineagesPlot(data,{width,height,marginBottom,marginTop}){
 const fakeLegend = [
            {x:1851,y:8,fill:"grey",label:"Total number of lineages"},
            {x:1851,y:5,fill:"#071455",label:"Lineages with latency"}
        ]
    const p  = Plot.plot({
        document: new JSDOM("").window.document,
          width,
          height,
          marginRight: 60, // must match tree fig
          marginTop,
          marginBottom,
          marginLeft:35,
          y:{grid:true,ticks:3},
         x: {
              transform: d=>decimalToDate(d), grid: false,
              domain: [new Date(1850, 1, 1), new Date(2026, 1, 1)],
              clamp:true,
              ticks:8,

            
          },
        marks:[
            Plot.ruleY([0]),
            Plot.ruleX([1850]),
            Plot.areaY(data,{x:"time",y1:d=>d.lineages.hpd[0],y2:d=>d.lineages.hpd[1],fill:"grey",opacity:0.3}),
             Plot.areaY(data,{x:"time",y1:d=>d.latent.hpd[0],y2:d=>d.latent.hpd[1],fill:"#071455",opacity:0.3}),
            Plot.lineY(data,{x:"time",y:d=>d.lineages.median}),
            Plot.lineY(data,{x:"time",y:d=>d.latent.median,stroke:"#071455"}),
             xAxis({ ticks: 8, tickRotate: 0, grid:false,labelAnchor:"left",label:"", labelArrow:"none"}),
             yAxis({grid:true,label:"",ticks:3,labelArrow:'none'}),
             Plot.text([{text:"↑ Lineages"}],{
                x:1850,
                y:0,
                text:"text",
                 fontSize: 8, 
                fontFamily: "HelveticaNeue-Light",
                dy:-height+(marginBottom+marginTop)-5
             }),
        // fake legend

        Plot.rect(fakeLegend,{
            x1:"x",y1:"y",fill:d=>d.fill,x2:d=>d.x+5,y2:d=>d.y+1
        }),
        Plot.text(fakeLegend,{
            x:d=>d.x+5,y:d=>d.y+0.5,text:d=>d.label, dx:2,  fontSize: 8, 
                fontFamily: "HelveticaNeue-Light",
        })


        ]
    })
      p.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns", "http://www.w3.org/2000/svg");
      return p.outerHTML;
}
