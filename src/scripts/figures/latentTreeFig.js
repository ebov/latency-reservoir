#!/usr/bin/env node

import fs from "node:fs";
import { ImmutableTree as Tree } from "@figtreejs/browser";
import { tsvParse,autoType } from "d3-dsv";
import { svgSizes,saveFigure,plotGrid} from "../utils/saveFigure.js";
import {mccTree} from "../utils/utils.js"
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const argv = yargs(hideBin(process.argv))
  .usage('Usage: $0 <logFile> <summaryJson> <output> [roots...]')
  .command('$0 <logFile> <summaryJson> <output> [roots...]', 'Process and make a figure', (yargs) => {
    yargs
      .positional('logFile', {
        describe: 'Path to the log file',
        type: 'string',
      })
      .positional('summaryJson', {
        describe: 'Path to the summary JSON file',
        type: 'string',
      })
      .positional('output', {
        describe: 'Output file path .png and .svg will be added',
        type: 'string',
      })
      .positional('roots', {
        describe: 'List of rooting to process sorted  0 is the most common. If it is not given all rootings will be used',
        type: 'number', // yargs will coerce to numbers
        array: true,    // allows multiple values
        default: [], // if none provided, roots = []
      });
  })
  .option('size', {
    alias: 's',
    describe: 'Figure size (small, medium, large)',
    choices: ['small', 'medium', 'large'], // restrict allowed values
    default: 'medium', // optional default
  })
    .option('height', {
    alias: 'h',
    describe: 'Figure height in cm',
 // optional default
  })
  .help()
  .argv;

// Example usage:
// makeFigure.js log.csv summary.json myFigure 0  3  --size medium

const { logFile, summaryJson, output, roots, size,height:figHeight } = argv;

let {width,height} = svgSizes[size]

if(figHeight){
  height = Math.round(figHeight*(1 / 2.54) * 96)
}
const scRoots = JSON.parse(fs.readFileSync(summaryJson, "utf8")).map(d=>({...d,mcc:Tree.fromNewick(d.mcc)}))
const scCombinedLog = tsvParse(fs.readFileSync(logFile,'utf8'),autoType)
const selectedRoots = roots.length>0?
                            roots:
                            scRoots.reduce((acc, rooting, i) => {
                                  if (rooting.posterior>0.05) acc.push(i); // only want roots with posterior> 5%
                                  return acc;
                              }, []);


const rows = selectedRoots.length;

const panelWidth = width;
const panelHeight = height/rows;


const rootFigures =  selectedRoots.map( d =>  mccTree(scRoots[d],scCombinedLog,{treeWidth:panelWidth,treeHeight:panelHeight}))

// ignore other plots
const panels = rootFigures.reduce((acc,rooting,i)=>{
  return acc.concat( // add panels for each rooting
    [
      { svg: rooting, row: i, col: 0, rowspan: 1, colspan: 1 },
    ]
  )
},[])

const scFigure =  plotGrid(panels, {totalHeight:height,totalWidth: width,labelOffsetY:14,labelOffsetX:10}) 
// console.log(mapTreeFigure)
saveFigure({content:scFigure,path:output})



