#!/usr/bin/env node

import fs from "node:fs";
import {ImmutableTree as Tree,figtreeStatic,CircleNodes,Branches, RectangleNodes,NodeLabels, decimalToDate}  from "@figtreejs/browser";
import { tsvParse,autoType } from "d3-dsv";
import { svgSizes,saveFigure,plotGrid} from "../utils/saveFigure.js";
// import {mccFigures} from "../utils/utils.js"
import {processLS,getGeoPoint,getContour} from "../utils/geography.js"
import {processTree} from "../utils/processTree.js"
import {clusterScale} from "../utils/colors.js"
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import path from 'path';
import { fileURLToPath } from 'url';
import {max} from "d3-array"
import {JSDOM} from "jsdom";
import * as topojson from "topojson-client";
import * as Plot from "@observablehq/plot";
import{format} from "d3-format"

// two maps each with the mcc tree and the tree above.
// one map shows the location of old nodes 
// the other the route of long movements.


// remove arrow distribution replace with clade root hpd

const argv = yargs(hideBin(process.argv))
  .usage('Usage: $0 <mccTree> <output>')
  .command('$0 <mccTree> <output>', 'Process and make a figure', (yargs) => {
    yargs
      .positional('mccTree', {
        describe: 'Path to the mccTree newick file',
        type: 'string',
      })
      .positional('output', {
        describe: 'Output file path .png and .svg will be added',
        type: 'string',
      })
  })
  .option('size', {
    alias: 's',
    describe: 'Figure size (small, medium, large)',
    choices: ['small', 'medium', 'large'], // restrict allowed values
    default: 'medium', // optional default
  })
    .option('position', {
    alias: 'p',
    describe: 'map position',
    choices: ['noMakona', 'full'], // restrict allowed values
    default: 'noMakona', // optional default
  })
  .help()
  .argv;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tipFilePath = path.resolve(__dirname, '../../data/processed/latLong.tsv');
const tipData = tsvParse(fs.readFileSync(tipFilePath, 'utf8'), autoType);

const { mccTree, output, size,position } = argv;
let {width,height} = svgSizes[size]
height = width/2

const treeString = fs.readFileSync(mccTree, "utf8")
let tree = Tree.fromNewick(treeString,{parseAnnotations:true }).orderNodesByDensity(true)
tree = processTree(tree,tipData,null)// adds cluster annotations to nodes
tree = processLS(tree)  // convert ls distribution to useful metrics


const origin = max(tree.getExternalNodes(),d=>tree.getAnnotation(d,"date"))




// MCC tree figure.




// Map stuff
function makeMap({width,height,coordinates,marks}){
 const map= marks.plot({
  document:new JSDOM("").window.document,
  width: width,
  height: height,
  //  color: {legend: true,domain:[1900,2025]},
  projection:
  {
    type: "equirectangular",
    domain: {
      type: "MultiPoint",
      coordinates
    },
  }  
})
map.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns", "http://www.w3.org/2000/svg");
return map.outerHTML
}



function getCoords(long,lat,x,ar=1){
  // const x = 22
  const longM = 2*ar;
  const latM =2;
  const longs = [long-(x/longM),long+x/longM]
  const lats = [lat-(x/latM),lat+x/latM]
  return [
    [long,lats[0]], // left
    [longs[0],lat], // top
    [long,lats[1]], //right
    [longs[1],lat] // bottom
  ]
}


const relativePathToWorld = "../../data/raw/world-110m.json";
const absolutePathToWorld = path.resolve(__dirname, relativePathToWorld);


// load in the geo data
const world = JSON.parse(fs.readFileSync(absolutePathToWorld,'utf8'));
const land = topojson.feature(world, world.objects.land)
const countries = topojson.mesh(world, world.objects.countries, (a, b) => a !== b)


// Define clusters for mapping

const clusters = tree.getAnnotationSummary("cluster").domain
const clusterNodes = new Map() // used to color tree
const clusterRoots = [];
for(const cluster of clusters){
  const nodes = tree.getNodes().filter(d=>tree.getAnnotation(d,"cluster","NOT FOUND")===cluster) // "NOT FOUND is not a cluster"
  let clusterRoot = tree.getMRCA(nodes) // mrca of nodes in a cluster
  let og;
  if(!tree.isExternal(clusterRoot)){ // don't need singleton slucsters here
    clusterRoots.push(clusterRoot)
  }
  // the 1970s will have two branches but the location of one node will be highlighted.
  if(cluster==="A"){ // go back one parent for 1970s (1970s direct parent is nearly same to both outbreaks)
    og = clusterRoot;
    clusterNodes.set(og,"A") // // add this node to the cluster nodes
    clusterRoot = tree.getParent(og)
    // only this node is in clusterRoots array
  }
  clusterNodes.set(clusterRoot,cluster) // add the root to the cluster nodes
}

const tipsData = tree.getExternalNodes().map(d=>getGeoPoint(d,tree))
const rootPoint = getGeoPoint(tree.getRoot(),tree)

// Branch data for the map
const branches = tree.getNodes().filter(d=>!tree.isRoot(d))
                  .map(d=>{
                    return {
                    parent:getGeoPoint(tree.getParent(d),tree),
                    child:getGeoPoint(d,tree),
                    stroke:clusterNodes.has(d)?clusterScale( clusterNodes.get(d)):'#696969',
                    strokeDasharray:tree.getAnnotation(d,"probLS",0)>0.5? "8 4":"10 0",
                    migration:clusterNodes.has(d)
                    }
                  })




// contour 
// this code assumes a single region is captured by the hpd. 
// the assumption can be checked by plotting the grid

//
const alpha = 0.5
const root = tree.getRoot() 

// cluster roots from the tree. 
// these are used to identify the ancestral nodes to highlight in the map

const clusterMRCA =  new Set(
                      [...tree.getNodes()]
                                    .filter(d=>tree.isInternal(d) && !tree.isRoot(d))
                                    .filter(d=> tree.hasAnnotation(d,"cluster")&& !tree.hasAnnotation(tree.getParent(d),"cluster"))
                                    .filter(d=>tree.getAnnotation(d,"cluster")!=="A") // don't want the little branch to the 1970s
                      )
// nodes ancestral to clusters to highlight
const otherSet = new Set()
clusterMRCA.forEach(node =>{
  for (const ancestor of tree.getPathToRoot(node)){
    if (!otherSet.has(ancestor) && !clusterMRCA.has(ancestor) && !tree.isRoot(ancestor)){
      otherSet.add(ancestor)
    }
  }
})

const others = [...otherSet.values()]


//[...other,other2,...rootChildren]
const rootContour = getContour([root],tree,{alpha})
// const rootChildrenContour = getContour(rootChildren,tree,{alpha:0.5})
const otherContour = getContour(others,tree,{alpha})

// get the contours for each node in clusterRoots 
const clusterRootContours =clusterRoots.map(d=>({cluster:tree.getAnnotation(d,"cluster"),contour:getContour([d],tree,{alpha})}))

const clusterRootLines = clusterRootContours.reduce((all,d)=>{
  return all.concat(d.contour.perimeter.map(k=>({...k,z:d.cluster})))
},[])

const contourForRoot = rootContour.perimeter
                      .map(d=>({...d,z:'root'}))

                      // .concat(
                      //   rootChildrenContour.perimeter.map(d=>({...d,z:'rootChildren'}))
                      // )
const contourForAncestral=otherContour.perimeter.map(d=>({...d,z:'other'}))
                      

const contourColour = new Map([["root","black"],["other",'#2F4F4F']])

const vectors =  Plot.marks([ 
                          Plot.graticule(),
                          Plot.geo(land, {fill: "#e0e0e0",stroke:"black"}),
                          Plot.geo(countries),
                          // Plot.sphere(),
                          Plot.line(clusterRootLines,{
                             x:"x",
                            y:"y",
                            z:"z",
                            strokeWidth:1,
                            curve:"basis-closed",
                            stroke:d=>"black",//clusterScale(d.z),
                            fill:d=>clusterScale(d.z),
                            opacity:0.7
                          }),
                          //TODO add branches from colored figure
                          //  Plot.dot(contour.grid,{
                          //   filter:d=>d.density,
                          //   x:"x",
                          //   y:"y",
                          //   fill:'density',
                          //   r:1
                          // }),
                          //  Plot.line(contour.perimeter,{
                          //    x:"x",
                          //   y:"y",
                          //   strokeWidth:1,
                          //   curve:"basis-closed"
                          // }),                           
                          Plot.line(contourForRoot,{
                             x:"x",
                            y:"y",
                            z:"z",
                            strokeWidth:1.5,
                            curve:"basis-closed",
                            stroke:d=>contourColour.get(d.z),
                            strokeDasharray:"1 5",
                          }),
                          Plot.line(contourForAncestral,{
                             x:"x",
                            y:"y",
                            z:"z",
                            strokeWidth:1.5,
                            curve:"basis-closed",
                            stroke:d=>contourColour.get(d.z),
                            // strokeDasharray:"1 5",
                          }),
                           Plot.dot(tipsData,{filter:d=>!tree.isRoot(d),r:3, y:"latitude",x:"longitude",fill:'#696969',}),
                           Plot.dot(tipsData,{r:2 , y:"latitude",x:"longitude",fill:d=>clusterScale(d.cluster)}),

                          Plot.link(branches,
                          {
                            filter:d=> d.migration && d.strokeDasharray==="8 4",
                            x1:d=>d.parent.longitude,
                            x2:d=>d.child.longitude,
                            y1:d=>d.parent.latitude,
                            y2:d=>d.child.latitude,
                            strokeWidth:1.5,
                            stroke:"black",
                            strokeDasharray:"8 4",
                            markerEnd: "arrow"
                          }),
                          Plot.link(branches,
                          {
                            filter:d=>d.migration && d.strokeDasharray==="10 0",
                            x1:d=>d.parent.longitude,
                            x2:d=>d.child.longitude,
                            y1:d=>d.parent.latitude,
                            y2:d=>d.child.latitude,
                            strokeWidth:1.5,
                            stroke:"black",
                            strokeDasharray:"10 0",
                            markerEnd: "arrow"
                          }),
                           Plot.link(branches,
                          {
                            filter:d=>d.migration && d.strokeDasharray==="8 4",
                            x1:d=>d.parent.longitude,
                            x2:d=>d.child.longitude,
                            y1:d=>d.parent.latitude,
                            y2:d=>d.child.latitude,
                            strokeWidth:1.0,
                            stroke:d=>d.stroke,
                            strokeDasharray:"8 4",
                            markerEnd: "arrow"
                          }),
                          Plot.link(branches,
                          {
                            filter:d=>d.migration && d.strokeDasharray==="10 0",
                            x1:d=>d.parent.longitude,
                            x2:d=>d.child.longitude,
                            y1:d=>d.parent.latitude,
                            y2:d=>d.child.latitude,
                            strokeWidth:1.0,
                            stroke:d=>d.stroke,
                            strokeDasharray:"10 0",
                            markerEnd: "arrow"
                          }),
                        Plot.dot([rootPoint],{r:3, y:"latitude",x:"longitude",fill:"black"}),
])

// const coordinates =  getCoords(18, -1, 24, 1) 
const coordinates =  position ==="noMakona"?getCoords(20, -1, 20, 1): getCoords(18, -1, 24, 1)  

const vectorMap = makeMap({marks:vectors,coordinates,width:width/2,height:height})
// const locationMap = makeMap({marks:ancestralLocations,coordinates,width:width/2,height:height/2})


const tickValues = position==="noMakona"?[1940,1960,1980,2000,2020]:[1925,1955,1985,2015]

// tree fig
const treeFigure = figtreeStatic({
    tree,
    width:width/2,
    height:height,
    margins:{right:50,top:20,left:20,bottom:40},
    axis:{
      offsetBy:origin,
      reverse:true,
      // bars:{},
      ticks:{style:{fontFamily:"HeveticaNeue-light"},format:format("0.0f"),values:tickValues}
      // ticks:{style:{fontFamily:"HeveticaNeue-light"},format:format("0.1f")} // use this to verify we are not rounding years away.
    },
    baubles:[
        Branches({
        attrs:{
          strokeWidth:1.5,
          stroke:d=> clusterNodes.has(d)? clusterScale( clusterNodes.get(d)):others.includes(d)?contourColour.get("other"):'#696969',
          strokeDasharray:d=>tree.getAnnotation(d,"probLS",0)>0.5? "8 4":"10 0",

        },
      }),
    //   BranchLabels({
    //     filter:d=>tree.getAnnotation(d,"probLS",0 )>0.5,
    //     text:d=>format("0.2%")(tree.getAnnotation(d,"probLS",0))
    //   }),
      NodeLabels({
        // aligned:true,
        filter: (n) => tree.isExternal(n) && !tree.getTaxon(n).name.includes("Guinea"),
        attrs: {
          fill: "black",
          fontSize: 8,
          fontWeight: 300,
          fontFamily: "HelveticaNeue-Light",
          dy:3 // position is done by translation so baseline doesn't work.
          // alignmentBaseline:"middle"
        },
        gap:2,
        text: (n) => {
          return  tree.getAnnotation(n,'outbreak') //`${parts[2]} (${year})`
        }
      }),
      CircleNodes({
        filter:d=> tree.isExternal(d),
        attrs:{
          r:3,
          fill:'#696969',
          cursor:"pointer"
        },
      }),
         CircleNodes({
        filter:d=>tree.isExternal(d),
        attrs:{
          r:2,
          fill:d=>clusterScale(tree.getAnnotation(d,"cluster")),
          cursor:"pointer"
        }
    }),
    RectangleNodes({
     filter:d=>tree.isRoot(d),
      attrs:{
        width:10,
        height:10,
        stroke:contourColour.get("root"),
        strokeDasharray:"2 2",
        strokeWidth:1.5,
        fill:"white",
         rx:1
      },
    }),
    //     RectangleNodes({
    //   filter:d=>rootChildren.includes(d),
    //   attrs:{
    //     width:6,
    //     height:6,
    //     fill:contourColour.get("rootChildren")
    //   }
    // }),
        CircleNodes({
        filter:d=>tree.isRoot(d),
        attrs:{
          r:3,
          fill:contourColour.get("root"),
        }
    }),
      RectangleNodes({
      filter:d=>others.includes(d) ,
      attrs:{
        width:5,
        height:5,
        fill:contourColour.get("other"),
         rx:1,
      },
      
    }), 
      RectangleNodes({
      filter:d=>tree.isInternal(d) && clusterRoots.includes(d) ,
      attrs:{
        width:5,
        height:5,
        fill:d=>clusterScale( clusterNodes.get(d)), // clusterNodes has all cluster roots plus clusterA parent
         rx:1,
         stroke:"696969",
         strokeWidth:0.5
      },
      
    }),
    // NodeLabels({
    //   filter:d=>tree.isInternal(d),
    //   text:d=> format("0.1%")(tree.getAnnotation(d,"posterior"))
    // })
    ]
 })
// output 
 const panels = [

   { svg: treeFigure, row: 0, col: 0, rowspan: 1, colspan: 1 },
  //  { svg: locationMap, row: 1, col: 0, rowspan: 1, colspan: 1 },
   { svg: vectorMap, row: 0, col: 1, rowspan: 1, colspan: 1 },
   
]
   
 
 const mapTreeFigure =  plotGrid(panels, {totalHeight:height,totalWidth: width,labelOffsetX:3,labelOffsetY:15}) 
 
 // console.log(mapTreeFigure)
 saveFigure({content:mapTreeFigure,path:output})
