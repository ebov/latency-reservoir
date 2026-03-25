#!/usr/bin/env node

import fs from "fs";
import { tsvParse,autoType } from "d3-dsv";
import { format } from "d3-format";
import {
    ImmutableTree as Tree,
    rectangularLayout,
    Branches,
    CircleNodes,
    NodeLabels,
    postOrderIterator,
    figtreeStatic
  } from "@figtreejs/browser";
import {clusterScale,black,grey} from "../utils/colors.js"
import {makeRTTPlot} from "../../components/rttPlot.js"
import { svgSizes,plotGrid,saveFigure } from "../utils/saveFigure.js";
import { processTree } from "../utils/processTree.js";
import { writeSummary } from "../utils/summarize.js";
//todo make this a function and import it
import {mlRateFig} from "./mlRates.js"

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
    default: 'medium', // optional default
  })
  .help()
  .argv;

const {treeFile, output, size} = argv


const treeString  = fs.readFileSync(treeFile,'utf8')// re-rename taxa. uncertainty in date fixed for paml
                      .replace("KC242791|Bonduni|DRC|1977-06-15","KC242791|Bonduni|DRC|1977-06")
                      .replace("KC242793|1Eko|Gabon|1996-02-15","KC242793|1Eko|Gabon|1996-02")
                      .replace("KF113529|Kelle_2|COG|2003-10-15","KF113529|Kelle_2|COG|2003-10")
                      .replace("MH613311|Muembe.1|DRC|2017-05-15","MH613311|Muembe.1|DRC|2017-05")
// Example: make a relative path based on script location
const relativePathToTipData = '../../data/processed/latLong.tsv';
const absolutePathToTipData = path.resolve(__dirname, relativePathToTipData);


const tipData = tsvParse(fs.readFileSync(absolutePathToTipData,'utf8'),autoType) // hardcoded metadata// console.log(tipData)


function annotateBranchesInRegression(t,taxa){
    let tree = t;
    for(const taxon of taxa){
      let node = tree.getNode(taxon);
      while(!tree.isRoot(node) && !tree.hasAnnotation(node,"selected")){
        tree = tree.annotateNode(node,{selected:true})
        node = tree.getParent(node);
      }
    }
    return tree;
}


function annotateTree(tree,taxa){
  return annotateBranchesInRegression(tree,taxa)
}


let tree = processTree(Tree.fromNewick(treeString),tipData)

function rootTree(tree,outgroup,proportion){
  const nodesOG = outgroup.map(d=>tree.getNode(d));
  const rootPosition = [tree.getMRCA(nodesOG),proportion]; // paml puts a length of 0 coming out of the root set11 srdt tree 1
  return tree.reroot(...rootPosition).orderNodesByDensity(true)
}

const oldOGTaxa = [
  "KR063671|Yambuku-Mayinga|DRC|1976-10-01",
  "KC242791|Bonduni|DRC|1977-06",
]
const newOGTaxa = [ 
  "HQ613402|034-KS|DRC|2008-12-31",
  "HQ613403|M-M|DRC|2007-08-31",
  "KJ660347|Makona-Gueckedou-C07|Guinea|2014-03-20",
  "KC242800|Ilembe|Gabon|2002-02-23",
  "KF113529|Kelle_2|COG|2003-10"
]
let oldTree = rootTree(tree,oldOGTaxa,0.99) // paml puts a length of 0 coming out of the root set11 srdt tree 1


const acceptedTemporalSignal = [
"KC242791|Bonduni|DRC|1977-06",
"HQ613402|034-KS|DRC|2008-12-31",
"HQ613403|M-M|DRC|2007-08-31",
"KR063671|Yambuku-Mayinga|DRC|1976-10-01",
"KC242792|Gabon|Gabon|1994-12-27",
"KC242793|1Eko|Gabon|1996-02",
"KC242798|1Ikot|Gabon|1996-10-27",
"KU182905|Kikwit-9510621|DRC|1995-05-04",
"KC242800|Ilembe|Gabon|2002-02-23",
"KF113529|Kelle_2|COG|2003-10",
"KJ660347|Makona-Gueckedou-C07|Guinea|2014-03-20",
]
const oldTaxaforRegression = acceptedTemporalSignal.map((n,i)=> {return oldTree.getTaxon(n)}) 
 
oldTree = annotateTree(oldTree,oldTaxaforRegression)



let newTree = rootTree(tree,newOGTaxa,3999/(3999+2332)); // paml puts length of 2332 and 3999 coming out the root in set8 srdt

const proposedTemporalSet = [
"KC242791|Bonduni|DRC|1977-06",
"KR063671|Yambuku-Mayinga|DRC|1976-10-01",
"KC242792|Gabon|Gabon|1994-12-27",
"KC242793|1Eko|Gabon|1996-02",
"KC242798|1Ikot|Gabon|1996-10-27",
"KC242800|Ilembe|Gabon|2002-02-23",
"KF113529|Kelle_2|COG|2003-10",
"KJ660347|Makona-Gueckedou-C07|Guinea|2014-03-20",
]


const newTaxaForRegression =  proposedTemporalSet.map(n=>newTree.getTaxon(n))

newTree = annotateTree(newTree,newTaxaForRegression);

const margins = {top:20,right:10,bottom:40,left:10};

let {width,height} = svgSizes[size]

width = Math.round(12.1 * (1 / 2.54) * 96)
height = Math.round(10 * (1 / 2.54) * 96)

const panelWidth = width/2; //figureWidth/2 - 2*(margins.left+margins.right);
const panelHeight = height/6; //figureHeight/2 - 2*(margins.top+margins.bottom);

const treeHeight = panelHeight*3;

const slopeHeight = panelHeight*2

const treeOptions = (tree,guineaDx=-65)=> ({
        tree,
        layout:rectangularLayout,
        margins,
        height:treeHeight,
        width:panelWidth,
        baubles: [
         NodeLabels({
            // aligned:true,
            filter: (n) => tree.isExternal(n) && !tree.getTaxon(n).name.includes("Guinea"),
            attrs: {
              fill: black,
              fontSize: 8,
              fontWeight: 700,
              fontFamily: "HelveticaNeue-Light",
              dy:3 // position is done by translation so baseline doesn't work.
              // alignmentBaseline:"middle"
            },
            gap:2,
            text: (n) => {
              const parts = tree.getTaxon(n).name.split("|");
              const year = parts[3].split("-")[0]
              return  tree.getAnnotation(n,'outbreak') //`${parts[2]} (${year})`
            }
          }),
         NodeLabels({
            // aligned:true,
            filter: (n) => tree.isExternal(n) && tree.getTaxon(n).name.includes("Guinea"),
            attrs: {
              fill: black,
              fontSize: 8,
              fontWeight: 700,
              fontFamily: "HelveticaNeue-Light",
                          dx:guineaDx,
            dy:-2.5,
            },

            text: (n) => {
              const parts = tree.getTaxon(n).name.split("|");
              const year = parts[3].split("-")[0]
              return  tree.getAnnotation(n,'outbreak') //`${parts[2]} (${year})`
            }
          }),
          Branches({
            filter:n=> tree.hasAnnotation(n,"selected"), //&& tree.getAnnotation(n,"selected"),
            attrs: { stroke: grey,strokeWidth:4,strokeLinejoin:"round"},///n=>tree.getAnnotation(n,branchKey)?grey:black, strokeWidth: 2.5},
          }),
          Branches({
            attrs: { 
              stroke: n=>{
                if( (!tree.isRoot(n) && tree.hasAnnotation(tree.getParent(n),"cluster")) && tree.hasAnnotation(n,"cluster") ){
                  return clusterScale(tree.getAnnotation(n,"cluster"))
                }
                if(tree.hasAnnotation(n,"selected")){
                    return black
                } else{
                  return grey
                }
                  
              },
              strokeWidth:1.5,
              strokeLinejoin:"round",
              strokeDasharray: n=> {

              if( (!tree.isRoot(n) && tree.hasAnnotation(tree.getParent(n),"cluster")) && tree.hasAnnotation(n,"cluster") ){
                  return  "9999"
                }
                if(tree.hasAnnotation(n,"selected")){
                    return "9999"
                } else{
                  return "6,3"
                }     
            }
          }
          }),
          CircleNodes({
            filter: (n) => tree.isExternal(n),
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
          })
        ],
        axis:{
          gap:7,
          attrs:{
            stroke:black,
            strokeWidth:1
          },
          ticks:{
            format:format("0.2"), 
            number:4, 
            style: {
            fill: black,
            fontSize: 8,
            fontWeight: 600,
            fontFamily: "HelveticaNeue-Light",
            
          }
          },
          title:{text:"Divergence",
            style: {
              fill: black,
              fontSize: 8,
              fontWeight: 600,
              fontFamily: "HelveticaNeue-Light",
            dy:-10}
          },
          // bars:{}
        },
      })




// Render React SVG to a string
const panelA = figtreeStatic({...treeOptions(oldTree,-135)});
const panelC =figtreeStatic({...treeOptions(newTree,-170)});


const panelB = makeRTTPlot({tree:oldTree,title:"",addRate:true,selectedTaxa:oldTaxaforRegression,hovered:null,clusterColor:clusterScale,width:panelWidth,height:slopeHeight})
const panelD = makeRTTPlot({tree:newTree,title:"",addRate:true,selectedTaxa:newTaxaForRegression,hovered:null,clusterColor:clusterScale,width:panelWidth,height:slopeHeight})

const {figure:mlPanel,summary} = mlRateFig(newTree,{width:width,height:panelHeight})


const panels = [
  { svg: panelA, row: 0, col: 0, rowspan: 3, colspan: 1 },
  { svg: panelC, row: 0, col: 1, rowspan: 3, colspan: 1 },
  { svg: panelB.outerHTML, row: 3, col: 0, rowspan: 2, colspan: 1 },
  { svg: panelD.outerHTML, row: 3, col: 1, rowspan: 2, colspan: 1 },
  { svg: mlPanel.outerHTML, row: 5, col: 0, rowspan: 1, colspan: 2 },
]

const rttFigure =  plotGrid(panels, {totalHeight:height,totalWidth: width,labelOffsetY:14,labelOffsetX:10}) 

saveFigure({content:rttFigure,path:output})

writeSummary(summary,output+'.csv')