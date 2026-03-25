#!/usr/bin/env node


import { fileToWebReadableStream } from "../../utils/fileToWebReadableStream.js";
import { rootAnalysis } from "../../utils/summarize.js";
import { hpd ,getSummary,writeSummary} from "../../utils/summarize.js";
import fs from "node:fs";
import { tsvParse,autoType } from "d3-dsv";
import { NexusImporter } from "@figtreejs/browser";
import { mcc } from "../../utils/mccTree.js";
import {max,median,mean} from "d3-array"
import { dateGuesser,decimalToDate } from "../../utils/dateGuesser.js";
import { timeFormat } from "d3-time-format";



const [,,log,trees,stub] = process.argv;
//get the log file trees files and output stub for analysis.
const runs = [ // left over from when this processed multiple runs
  [log,trees,stub]
];

// Process BEAST logs to prior to making figures
const cladeOfInterest =[
    "KC242793|1Eko|Gabon|1996-02",
    "KC242792|Gabon|Gabon|1994-12-27",
    "|22MBK-004|DRC|2022-04-25",
    "OR084849|Mandaka|DRC|2020-05-31",
    "KP271018|Lomela-Lokolia16|DRC|2014-08-20",
    "OR084846|MBK67|DRC|2020-06-12",
    "MH733477|BIK009-Bikoro|DRC|2018-05-10",
    "KU182905|Kikwit-9510621|DRC|1995-05-04",
    "KC242798|1Ikot|Gabon|1996-10-27",
    "'MH613311|Muembe.1|DRC|2017-05'",
    "MK007330|18FHV090-Beni|DRC|2018-07-28",
    "KC242791|Bonduni|DRC|1977-06",
    "KR063671|Yambuku-Mayinga|DRC|1976-10-01"
];

async function  getTreeStats(treesImporter){
      const trees = []
      for await (const plainTree of treesImporter.getTrees()) {
        trees.push(plainTree)
      }
      
      const mccTree = mcc(trees)
      // some analyses will be missing kivu and sibling
      const filteredCladeOfInterest = cladeOfInterest
            .filter(n=>{
              try{
                mccTree.getNode(n)
                return true;
              }catch(_e){
                return false
              }
            })
      const nodesOfInterest = filteredCladeOfInterest.map(d=>mccTree.getNode(d))
      
      const noiP = mccTree.getMRCA(nodesOfInterest);
        
      const origin = max(mccTree.getExternalNodes().map(n => dateGuesser(mccTree.getTaxon(n).name)))
     
      const cladeDates = mccTree.getAnnotation(noiP, "heights").map(h => origin - h)
      const congoBasinStats = {
                  congoBasinStats:{hpd: hpd(cladeDates).map(d=>timeFormat("%Y")(decimalToDate(d))),
                  mean: timeFormat("%Y")(decimalToDate(mean(cladeDates))),
                  median: timeFormat("%Y")(decimalToDate(median(cladeDates))),
                  posterior:mccTree.getAnnotation(noiP,"posterior")
                  }
              }
              console.log(congoBasinStats)
      return congoBasinStats
         
   }
    


async function  processBEAST(logFile,treesFile,stub){
    console.log(`Processing ${stub}`)
    const mccStats = getTreeStats(new NexusImporter(fileToWebReadableStream(treesFile)))
    const treeStream = fileToWebReadableStream(treesFile);
    const log = tsvParse(fs.readFileSync(logFile,'utf8'),autoType)
    // Pass to NexusImporter
    const treesImporter = new NexusImporter(treeStream);

    console.log("getting root positions")
    const roots = await rootAnalysis(treesImporter) 

    const summary = getSummary(log)
    summary.congoBasinStats = mccStats
    //Summarize Results
    writeSummary(summary,`${stub}.csv`)
    let i=0;
    console.log(`Found ${roots.length} different rootings`)
    for(const root of roots){
        process.stdout.write(`${0} roots processed\r`)
         writeSummary(getSummary(log,root),`${stub}_r${i}.csv`)
         i+=1;
    }
    console.log("") // clear the line
    console.log('writing output')
    fs.writeFileSync(
        `${stub}.json`,
        JSON.stringify(roots),
        "utf8"
    );
    console.log('done')
}



(async () => {
  const results = await Promise.allSettled(
     runs.map(([logFile,treeFile, stub]) => processBEAST(logFile,treeFile,stub))
  );
for (const r of results) {
  if (r.status === 'rejected') {
    console.error('Run failed:', r.reason);
  }
}
})();


