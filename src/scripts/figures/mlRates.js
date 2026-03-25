
import {
    ImmutableTree as Tree,
        preOrderIterator,
        tipIterator
  } from "@figtreejs/browser";
import {black,clusterScale} from "../utils/colors.js"
import {getLoss,getLossAcrossTrees} from "../../components/ml.fit.js" 
import {max} from "d3-array"
import * as Plot from "@observablehq/plot";
import { format } from "d3-format";
import {JSDOM} from "jsdom";
import "fmin";
import { rateFormat } from "../utils/tableUtils.js";
const {fmin} = global

function scaleTree(t,s=17751){
    let tree = t;
      for(const node of tree.getNodes()){
      if(node!==tree.getRoot()){
        const l = tree.getLength(node)* 17751; // scale to mutations length of best partition
       tree =  tree.setLength(node,l)
      }
    }
    let origin = -Infinity
    for(const node of tipIterator(tree)){
      const date = tree.getAnnotation(node,"date")
      // tree = tree.annotateNode(node,{date})
      if(date>origin){
        origin = date
      }
    }
    for(const node of tipIterator(tree)){
      const height = origin - tree.getAnnotation(node,"date")
      tree = tree.annotateNode(node,{height})
    }
    return tree;
}

function treeDater(trees){
  const hetModel = getLossAcrossTrees(trees,(tre,n) => max(tre.getExternalNodes(),d=>tre.getAnnotation(d,'date') - tre.getAnnotation(n,'date') ))
  const hetSolution = fmin.conjugateGradient(hetModel.lossG,hetModel.getInitial(Math.random()*10,Math.random()*3,Math.random()))
  const hetMu = hetModel.getMu(hetSolution.x)
  const hetRate = hetMu.mu/17751
  const hetRateCI = hetMu.ci.map(d=>d/17751)
  const hetLL = -hetSolution.fx

  const isoModel = getLossAcrossTrees(trees,(tre,n) => 1.0 , 1.0)// fixed rate
  const isoSolution = fmin.conjugateGradient(isoModel.lossG,isoModel.getInitial(null,Math.random()*3,Math.random()))
  const isoRate = isoModel.getMu(isoSolution.x).mu
  const isoLL = -isoSolution.fx

  const diff = hetLL - isoLL;
  return {het:{rate:hetRate,LL:hetLL,rateCI:hetRateCI},iso:{rate:isoRate,LL:isoLL},diff}
}


export function mlRateFig(t,{width,height}){ // tree has been processed with process Tree
  const tree = scaleTree(t);
  let trees = []
  for(const node of preOrderIterator(tree)){
    if(!tree.isExternal(node)){
      if(tree.hasAnnotation(node,"cluster")&& !tree.isRoot(node)&& !tree.hasAnnotation(tree.getParent(node),"cluster")){
        // const t = ebola.toNewick(node,{ includeAnnotations: true })
        // console.log(`found cluster ${tree.getAnnotation(node,'cluster')}`)
        trees.push(Tree.fromTree(tree,node))
      }
    }
  }
  const clusterFit = treeDater(trees)
  const fits = trees.map(t=>getLoss(t, (tre,n) => max(tre.getExternalNodes(),d=>tre.getAnnotation(d,'date') - tre.getAnnotation(n,'date') )))
    // .filter((d,i)=>i===3)
    .map(l=>{
      // const solution = nelderMead(l.loss,l.getInitial(5.0,1.0,0.5)).x
      const solution = fmin.conjugateGradient(l.lossG,l.getInitial(10.0,1.0,0.5)).x
      const output = l.transform(solution)
      output.mu = output.mu/17751; // updating for persite
      output.ci = l.getMu(solution).ci.map(d=>d/17751)
      const tree = l.getTimeTree(solution)
      return {...output,tree,functions:l,solution}
    }).sort((a,b)=>a.ci[0]-b.ci[0])


  const figure = Plot.plot({
    document:new JSDOM("").window.document,
    y:{axis:null,clamp:true},
    x:{grid:true},
  //   x:{tickFormat:format("0.2e")},
    height:height,
    width:width,
    marginBottom:25,
    marginRight:10,
    marginTop:5,
  //   marginTop:10,
    marks:[
      // Plot.frame(),
      Plot.rect([clusterFit.het],{x1:d=>d.rateCI[0],y1:-1,x2:d=>d.rateCI[1],y2:fits.length,strokeWidth:0,fill:"lightgrey"}),
      Plot.ruleY([-1]),     
      Plot.axisX({grid:true,ticks:7,fontSize:8,tickFormat:format("0.2e"),fontFamily: "HelveticaNeue-Light",label:"Rate",fontWeight:600,labelOffset:22}),
      Plot.ruleX([clusterFit.het],{x:d=>d.rate,strokeWidth:2}), 
      Plot.link(fits,{x1:d=>d.ci[0],y1:(d,i)=>i,x2:d=>d.ci[1],y2:(d,i)=>i}),
      Plot.dot(fits,{x:d=>d.mu,r:3,fill:black,y:(d,i)=>i}),
      Plot.dot(fits,{x:d=>d.mu,r:2,fill:d=> clusterScale(d.tree.getAnnotationSummary("cluster").domain[0]),y:(d,i)=>i}),

    ]
  });
  figure.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns", "http://www.w3.org/2000/svg");

  const summary = {het:{...clusterFit.het},iso:{...clusterFit.iso}}
  summary.het.rate = rateFormat(summary.het.rate)
  return {figure, summary}
}



