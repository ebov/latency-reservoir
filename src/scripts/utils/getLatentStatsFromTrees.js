#!/usr/bin/env node

import { ImmutableTree as Tree,NexusImporter } from "@figtreejs/browser";
import { fileToWebReadableStream } from "./fileToWebReadableStream.js";
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { mean,median} from "d3-array";
import { hpd } from "./summarize.js";


const argv = yargs(hideBin(process.argv))
  .usage('Usage: $0 <treesFile> ')
  .command('$0 <treesFile>' , 'Process and print tsv of latent stats', (yargs) => {
    yargs
      .positional('treesFile', {
        describe: 'Path to the trees file',
        type: 'string',
      })
  })
  .help()
  .argv;

const { treesFile } = argv

const treesImporter = new NexusImporter(fileToWebReadableStream(treesFile))

const latentDurations=[]
for await (const tree of treesImporter.getTrees()) {
    for(const node of tree.getNodes()){
        if(!tree.isRoot(node)){
            if(tree.getAnnotation(node,"latent_indicator",0)===1){
                latentDurations.push(tree.getLength(node)*tree.getAnnotation(node,"latent_prop"))
            }
        }
    }
}

const meanLD = mean(latentDurations)
const medianLD = median(latentDurations)
const hpdLD = hpd(latentDurations)

process.stdout.write("median\tmean\thpd\n")
process.stdout.write(`${medianLD}\t${meanLD}\t${hpdLD}\n`)
