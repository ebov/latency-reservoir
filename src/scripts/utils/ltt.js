#!/usr/bin/env node

import { ImmutableTree as Tree,NexusImporter } from "@figtreejs/browser";
import { fileToWebReadableStream } from "./fileToWebReadableStream.js";
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { dateGuesser } from "./dateGuesser.js"
import { max,mean,range,median} from "d3-array";
import { hpd } from "./summarize.js";


const argv = yargs(hideBin(process.argv))
  .usage('Usage: $0 <treesFile> ')
  .command('$0 <treesFile>' , 'Process and print tsv of lineages through time', (yargs) => {
    yargs
      .positional('treesFile', {
        describe: 'Path to the trees file',
        type: 'string',
      })
  })
  .help()
  .argv;

const { treesFile } = argv



function ltt(tree){
    const origin = max(tree.getExternalNodes().map(d=>dateGuesser(tree.getTaxon(d).name))) 
    const nodes = [...tree.getNodes()].sort((a,b)=>tree.getHeight(a)-tree.getHeight(b)) // ascending order

    const intervals=[]
    let l=0
    let latentL=0;
    for(const node of nodes){
        const time = origin-tree.getHeight(node)
        const change = tree.isExternal(node)?1:-1; //assumes bifurcating tree
        let lChange = tree.getAnnotation(node,"latent_indicator",0) >0? 1:0; // are we added a lineage with latency?
        // do we need to remove lineages with latency;
        for(const child of tree.getChildren(node)){
            const childLatent = tree.getAnnotation(child,"latent_indicator",0) >0? 1:0
            lChange-=childLatent
        }
        const lineages = l+change;
        const latentLineages = latentL+=lChange;
        intervals.push({time,lineages,latentLineages})
        l+=change;
    }
    return intervals
}




const treesImporter = new NexusImporter(fileToWebReadableStream(treesFile))
let allIntervals =[]
const rootAges = []
let i=0
let origin;
for await (const tree of treesImporter.getTrees()) {
    origin = max(tree.getExternalNodes().map(d=>dateGuesser(tree.getTaxon(d).name))) 
   allIntervals.push(ltt(tree).map(d=>({...d,tree:i})))
   rootAges.push(origin-tree.getHeight(tree.getRoot()))
    i+=1;
}
const [minRoot,_maxRoot] = hpd(rootAges)

// grid time and get the number of lineages 

const times = range(minRoot,origin+0.45,0.5);
const lineages=[]
for(const time of times){
    const obs = []
    for(const interval of allIntervals){
        const i = interval.findLastIndex(d=>d.time>time) 
        if(interval[i]){
            obs.push(interval[i])
        }
        
    }
    if(obs.length>0){
    lineages.push({ time,
                    latent:{
                            mean:mean(obs,d=>d.latentLineages),
                            median:median(obs,d=>d.latentLineages),
                            hpd:hpd(obs.map(d=>d.latentLineages))
                        },
                    lineages:{
                        mean:mean(obs,d=>d.lineages),
                         median:median(obs,d=>d.lineages),
                        hpd:hpd(obs.map(d=>d.lineages))
                    }})
                }
}

process.stdout.write(JSON.stringify(lineages))


