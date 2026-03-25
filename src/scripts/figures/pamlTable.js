#!/usr/bin/env node

import {processPaml,pFormat,rFormat, outGroup} from "../utils/tableUtils.js"
import fs from "fs";
import {format} from "d3-format"
import {
    ImmutableTree as Tree} from "@figtreejs/browser"

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';



const usageString  ='$0 <pathToTipDater> <outputPath> [options]'
const argv = yargs(hideBin(process.argv))
  .usage(`Usage: ${usageString}`)
  .command(usageString,'Plot an unrooted tree and map',(yargs)=>{
    yargs
    .positional('pathToTipDater',{
      describe:'Path to json files that contain the tipDater results',
      type:'string'
    })
    .positional('outputPath', {
      describe: 'Output file path where the table files will be written',
      type: 'string',
    })
  })
  .help()
  .argv;

const {pathToTipDater, outputPath} = argv


const ntaxa = 19 ; //full.replace('set','')
const pamlBest8 = JSON.parse(fs.readFileSync(`${pathToTipDater}/set8_best.json`,'utf8')).map((d) => ({
    ...d,
    trees: d.trees.map((t) => ({ ...t, tree: Tree.fromNewick(t.tree) })),
  }))
const pamlBest11 = JSON.parse(fs.readFileSync(`${pathToTipDater}/set11_best.json`,'utf8')).map((d) => ({
    ...d,
    trees: d.trees.map((t) => ({ ...t, tree: Tree.fromNewick(t.tree) })),
  }))

const pamlFull = JSON.parse(fs.readFileSync(`${pathToTipDater}/set19_best.json`,'utf8')).map((d) => ({
    ...d,
    trees: d.trees.map((t) => ({ ...t, tree: Tree.fromNewick(t.tree) })),
  }))
const set8Data = processPaml(pamlBest8,true);
const set11Data = processPaml(pamlBest11.filter(d=>!/Local/.test(d.analysis)) ,true);

const set11Base = pamlBest11.filter(d=>(d.analysis==="srdt"||d.analysis==="sr")).map(d=>({...d,trees:d.trees.filter(t=>outGroup(t.tree)==="1970s")})) // only want the 1970s root for these

const set11LocalData = processPaml(
                                pamlBest11.filter( d=> d.analysis!=="sr"&& d.analysis!=="srdt")
                                .map(d=>({...d,trees:d.trees.filter(t=>outGroup(t.tree)!=="1970s")}))
                                .concat(set11Base),
                                true);


const setFullLocalData = processPaml(pamlFull,true)
            .filter(d=>!/Clade|X|Limited/.test(d.analysis) && d.analysis!=="sr"&&d.analysis!=="srdt")
            .map(d=>({...d,analysis:d.analysis.replace("Stem11","Local")})) // rename analysis that used local clocks on 1970s model
            .map(d=>({...d,analysis:d.analysis.replace("Stem","Local")}))


const table1 = [{name:["Classic temporal set","11 taxa"],data:set11Data}]




const table2 = [{name:["Temporal set","8 taxa"],data:set8Data},
                {name:["Classic temporal set","11 taxa + Local clocks"],data:set11LocalData},
                {name:["Full data set",`${ntaxa} taxa + Local clocks`],data:setFullLocalData},
                    ]

                    
function getModelName(n){
  let name = n.toUpperCase();
  if (name.includes("LOCAL")){
    name = name.replace("LOCAL", "").trim();
    name  = "local"+name
  }
  return name;
}

function pamlTable(datasets){
    let latex = `
    \\begin{tabular}{lcrrrrrc}
    Data set & Model & LL & $\\Delta$LL & df & p & Base rate & Root  \\\\ \n`

let i = 0;
for (const dataset of datasets){
    latex += i===0?`\\toprule\n`:`\\midrule\n`
    let j=0;
    for(const model of dataset.data){
        
        let line = j< dataset.name.length?`${dataset.name[j]} & `:`  & `
        line += `${getModelName(model.analysis)} & \$${format("0.1f")(model.ll)}\$ & \$${model.diff=='-'?'-':format("0.1f")(model.diff)} \$ & \$${model.df} \$ & ${pFormat(model.p)} & ${rFormat(model.rate)} & ${model.og=='-'?'\$-\$':model.og} \\\\ \n`
        latex +=line
        j+=1;
    }
    i+=1;
}
latex += `\\bottomrule
\\end{tabular}`
return latex;
}
const table2Text = pamlTable(table2)
const table1Text = pamlTable(table1)


fs.writeFileSync(`${outputPath}/table2.tex`, table2Text,'utf8');
fs.writeFileSync(`${outputPath}/table1.tex`, table1Text,'utf8');


const setFullFullData = processPaml(pamlFull,true) // kinda full 
            .filter(d=>!/X|Limited/.test(d.analysis))



const supPamlText = pamlTable([{name:["Full data set",`${ntaxa} taxa`],data:setFullFullData}]);
fs.writeFileSync(`${outputPath}/supplementalTable.tex`, supPamlText,'utf8');