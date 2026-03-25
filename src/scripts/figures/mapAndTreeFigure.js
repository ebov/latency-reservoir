#!/usr/bin/env node

import fs from "fs";
import { tsvParse,autoType } from "d3-dsv";
import * as Plot from "@observablehq/plot";
import * as topojson from "topojson-client";
import {JSDOM} from "jsdom";
import {
    ImmutableTree as Tree,
    radialLayout,
    Branches,
    CircleNodes,
    NodeLabels,
    RectangleNodes,
figtreeStatic
  } from "@figtreejs/browser";
import {black,clusterScale,grey} from "../utils/colors.js"
import { saveFigure,plotGrid, svgSizes } from "../utils/saveFigure.js";
import { processTree } from "../utils/processTree.js";
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current script
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const usageString  ='$0 <treeFile> <output> [options]'
const argv = yargs(hideBin(process.argv))
  .usage(`Usage: ${usageString}`)
  .command(usageString,'Plot an unrooted tree and map',(yargs)=>{
    yargs
    .positional('treeFile',{
      describe:'Path to the tree file in newick format',
      type:'string'
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
    default: 'small', // optional default
  })
      .option('height', {
    alias: 'h',
    describe: 'Figure height in cm',
 // optional default
  })
  .help()
  .argv;

const {treeFile, output, size, height:figHeight} = argv

let {width,height} = svgSizes[size]

if(figHeight){
  height = Math.round(figHeight*(1 / 2.54) * 96)
}

const treeString  = fs.readFileSync(treeFile,'utf8')// re-rename taxa. uncertainty in date fixed for paml
                      .replace("KC242791|Bonduni|DRC|1977-06-15","KC242791|Bonduni|DRC|1977-06")
                      .replace("KC242793|1Eko|Gabon|1996-02-15","KC242793|1Eko|Gabon|1996-02")
                      .replace("KF113529|Kelle_2|COG|2003-10-15","KF113529|Kelle_2|COG|2003-10")
                      .replace("MH613311|Muembe.1|DRC|2017-05-15","MH613311|Muembe.1|DRC|2017-05")



// Example: make a relative path based on script location
const relativePathToTipData = '../../data/processed/latLong.tsv';
const absolutePathToTipData = path.resolve(__dirname, relativePathToTipData);


const tipData = tsvParse(fs.readFileSync(absolutePathToTipData,'utf8'),autoType) // hardcoded metadata

let tree = processTree(Tree.fromNewick(treeString),tipData);
tree = tree.reroot(tree.getNode("KC242798|1Ikot|Gabon|1996-10-27"),0.5)

const oldOG = [
    "KR063671|Yambuku-Mayinga|DRC|1976-10-01",
    "KC242791|Bonduni|DRC|1977-06",
  ].map(d=>tree.getNode(d));
  const newOG = [ 
    "HQ613402|034-KS|DRC|2008-12-31",
    "HQ613403|M-M|DRC|2007-08-31",
    "KJ660347|Makona-Gueckedou-C07|Guinea|2014-03-20",
    "KC242800|Ilembe|Gabon|2002-02-23",
    "KF113529|Kelle_2|COG|2003-10",
  ].map(d=>tree.getNode(d));
  //TODO color branches with local clocks

  const oldRootPosition = [tree.getMRCA(oldOG),0.99]; // paml puts a length of 0 coming out of the root set11 srdt tree 1
  const newRootPosition = [tree.getMRCA(newOG),3999/(3999+2332)]; // paml puts length of 2332 and 3999 coming out the root in set8 srdt
  const WARootPosition = [tree.getNode("KJ660347|Makona-Gueckedou-C07|Guinea|2014-03-20"), 8606/(8606+51913)]
tree = tree.reroot(...newRootPosition).insertNode(...oldRootPosition).insertNode(...WARootPosition);
const oldRoot = tree.getParent(tree.getMRCA(oldOG));
const proposedRoot = tree.getRoot();
const WARoot = tree.getParent(tree.getNode("KJ660347|Makona-Gueckedou-C07|Guinea|2014-03-20"));


const panelWidth = Math.round(width/2);
const panelHeight = height; 

const baseMargin=45;
const margins = {top:baseMargin,right:baseMargin,bottom:baseMargin,left:baseMargin};

// retroot for layout

const treeOptions = {
        title:"A",
        tree:tree,
        layout:radialLayout,
        margins,
        height:panelHeight,
        width:panelWidth,
        baubles: [
            CircleNodes({
            filter: (n) => tree.getParent(tree.getParent(tree.getNode('HQ613402|034-KS|DRC|2008-12-31')))==n,//||n===oldRoot || n ===proposedRoot,
            attrs:{
              r:20,
              fill: 'lightgrey'
            },
          }),
          Branches({
            attrs: { stroke: black,strokeWidth:1},///n=>tree.getAnnotation(n,branchKey)?grey:black, strokeWidth: 2.5},
          }),
          RectangleNodes({
            filter:(n) => n===oldRoot || n ===proposedRoot ,
            attrs:{
              height:10,
              width:2,
              fill:grey,
              stroke:black,
              cursor:"pointer"
            },
          }),
          RectangleNodes({
            filter:(n) => n===WARoot,
            attrs:{
              width:10,
              height:2,
              fill:grey,
              stroke:black,
              cursor:"pointer"
            },
          }),
          CircleNodes({
            filter: (n) => tree.isExternal(n),//||n===oldRoot || n ===proposedRoot,
            attrs:{
              r:3,
              fill: black
            },
          }),

          CircleNodes({
            filter: (n) => tree.isExternal(n),
            attrs:{
              r:2,
              fill: n=>clusterScale(tree.getAnnotation(n,"cluster"))
            },
          }),
          NodeLabels({
            filter: (n) =>  n===oldRoot || n ===proposedRoot|| n==WARoot,
            attrs: {
              fill: black,
              fontSize: 7,
              fontWeight: 300,
              fontFamily: "HelveticaNeue-Light",
              dy: n=> n===oldRoot?20:n===proposedRoot ?15:3, // mipoint root is last
              dx: n=> n===oldRoot?25:n===proposedRoot ?55:-30,
              rotation:0,

            },
            text: (n) =>  n===oldRoot? "1970s root": n===proposedRoot? "Proposed root" : "Midpoint"
          }),
          // tip labels // TODO - update rotation
           NodeLabels({
            // aligned:true,
            filter: (n) => tree.isExternal(n),
            attrs: {
              fill: black,
              fontSize: 6,
              fontWeight: 300,
              fontFamily: "HelveticaNeue-Light",
              dominantBaseline:"middle",
              alignmentBaseline:null,
              // dy:3 // position is done by translation so baseline doesn't work.
              gap:5
            },
           
            text: (n) => {
              return  tree.getAnnotation(n,'outbreak') //`${parts[2]} (${year})`
            }
          }),
        ],
        opts:{
          spread:25
        }
      }



const treeFigure = figtreeStatic(treeOptions);

// saveFigure({content:treeFigure,path:"../../../../doc/figures/figure1/unrootedTree",width:panelHeight,height:panelHeight})

// Map figure


function getCoords(long,lat,x){
  // const x = 22
  const longs = [long-(x/2),long+x/2]
  const lats = [lat-(x/2),lat+x/2]
  return [
    [long,lats[0]], // left
    [longs[0],lat], // top
    [long,lats[1]], //right
    [longs[1],lat] // bottom
  ]
}

// Example: make a relative path based on script location
const relativePathToWorld = "../../data/raw/world-110m.json";
const absolutePathToWorld = path.resolve(__dirname, relativePathToWorld);



const world = JSON.parse(fs.readFileSync(absolutePathToWorld,'utf8'));
const coordinates = getCoords(9,0,45)
// [
//         [7, -7], // bottom
//         [-15, 2], // left
//         [33, 2], // right
//         [7, 14] //top
//       ]

const land = topojson.feature(world, world.objects.land)
const countries = topojson.mesh(world, world.objects.countries, (a, b) => a !== b)

const outbreakLabels = tipData.filter(d=>["Sud-Ubangi/1977","Kivu/2018","Tshuapa/2014"].includes(d.outbreak))

const globe = Plot.marks([ 
    Plot.graticule(),
    Plot.geo(land, {fill: "lightgrey",stroke:"black"}),
    Plot.geo(countries, { strokeOpacity: 0.5 }),
    //  Plot.sphere(), 
     Plot.dot(tipData,{r:4, y:"latitude",x:"longitude",fill:black}),
     Plot.dot(tipData,{r:3 , y:"latitude",x:"longitude",fill:d=>clusterScale(d.cluster)}),
     Plot.text(outbreakLabels,{
      filter:d=>d.outbreak==="Sud-Ubangi/1977",
              y:"latitude",
              x:"longitude",
              text:d=>d.outbreak,
              fontSize: 6,
              fontWeight: 800,
              fontFamily: "HelveticaNeue-Light",
              textAnchor:"end",
              dx:-4,
             }),
    Plot.text(outbreakLabels,{
       filter:d=>d.outbreak==="Kivu/2018",
      y:"latitude",x:"longitude",
              text:d=>d.outbreak,
              fontSize: 6,
              fontWeight: 800,
              fontFamily: "HelveticaNeue-Light",
              dx:-4,
              textAnchor:"end"
              }),
    Plot.text(outbreakLabels,{
      filter:d=>d.outbreak==="Tshuapa/2014",
      y:"latitude",x:"longitude",
              text:d=>d.outbreak,
              fontSize: 6,
              fontWeight: 800,
              fontFamily: "HelveticaNeue-Light",
              textAnchor:"start",
              dy:6})
    //  Plot.dot(coordinates,{r:30}),
    //  Plot.text(coordinates,{text:(d,i)=>`${d.join(", ")}`})
    
     ])

const globeFigure = globe.plot({
        document:new JSDOM("").window.document,
        width: panelWidth,
        height: panelHeight,
        projection:
        {
          type: "equirectangular",
          domain: {
            type: "MultiPoint",
            coordinates
          },
        }  
      })
globeFigure.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns", "http://www.w3.org/2000/svg");
// const globeSVG = globeFigure.innerHTML;
// saveFigure({content:globeSVG,path:"../../../../doc/figures/figure1/map",width:panelHeight,height:panelHeight})

const panels = [
  { svg: globeFigure.outerHTML, row: 0, col: 0, rowspan: 1, colspan: 1 },
  { svg: treeFigure, row: 0, col: 1, rowspan: 1, colspan: 1 }]

const mapTreeFigure =  plotGrid(panels, {totalHeight:height,totalWidth: width}) 

// console.log(mapTreeFigure)
saveFigure({content:mapTreeFigure,path:output})
