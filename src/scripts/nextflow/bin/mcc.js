#!/usr/bin/env node
import { mcc } from "../../utils/mccTree.js";
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { NexusImporter } from "@figtreejs/browser";
import { fileToWebReadableStream } from "../../utils/fileToWebReadableStream.js";

const argv = yargs(hideBin(process.argv))
  .usage('Usage: $0 <trees>')
  .command('$0 <trees>', 'Process and make a figure', (yargs) => {
    yargs
      .positional('trees', {
        describe: 'Path to the trees file',
        type: 'string',
      })
  })
  .help()
  .argv;

const { trees } = argv;
//get the log file trees files and output stub for analysis.
const treesImporter = new NexusImporter(fileToWebReadableStream(trees))

const allTrees =[]
for await (const plainTree of treesImporter.getTrees()) {
    allTrees.push(plainTree)
}

const mccTree = mcc(allTrees)

const treeString = mccTree.toNewick(mccTree.getRoot(),{includeAnnotations:true})
process.stdout.write(treeString)