import {parseArgs} from "node:util";
import { preOrderIterator,NexusImporter } from "@figtreejs/browser";
import {getS3Stream} from "../../components/getS3.js"
import {getCladeMap} from "../../scripts/utils/BEASTUtils.js"
// The goal of this script is to process all movements in a trees file.
// the movements should be labeled by node of source / dest by a taxa group so they can be registered across trees.

// https://gist.github.com/sjengle/2e58e83685f6d854aa40c7bc546aeb24

const {
    values: {stem}
  } = parseArgs({
    options: {stem: {type: "string"}}
  });



const pathToProcessed = 'projects/latency-reservoir/beast/a5dbe6f/logs/combined'
const bucket =  'fh-pi-mccrone-j-eco-public'
const fileKey = `${pathToProcessed}/${stem}.combined.trees`
const profile = "hutch-sso"; 

// console.log(`${bucket}/fileKey`)

const treeStream = await getS3Stream(bucket, fileKey, profile)
const treeImporter = new NexusImporter(treeStream);

const movements =[]; // [{source:{}, dest:{}}]

// For each tree (possibly thinned)
let i=0;

const taxaMap = new Map(); // one point per taxa since they are all the same
let taxonSet
for await (const tree of treeImporter.getTrees()){
  if(i%10==0) { // thin out trees
  const clades = getCladeMap(tree);
  const nodePointMap = new Map(); // store points from parents
  for(const node of preOrderIterator(tree)){
     let point = {};
      // get the points for each branch
      // store the points and links etc. in the branch's bundle
      // we only want to plot each tip once
      if (tree.hasTaxon(node) && taxaMap.has(tree.getTaxon(node))) {
        const taxon = tree.getTaxon(node);
        point = taxaMap.get(taxon);
      } else {
        // set point attrs.
        point.location = tree.getAnnotation(node,"location"); // [lat lon]
        point.clade = clades.get(node).toString();
        if (tree.hasTaxon(node)) {
          const taxon = tree.getTaxon(node);
          taxaMap.set(taxon, point);
          point.taxon = taxon;
        }
      }
      nodePointMap.set(node, point);
      if (!tree.isRoot(node)) {
        const dest = point;
        const source = nodePointMap.get(tree.getParent(node));
        movements.push({dest,source,treeIndex:i})
      }
  }
}
taxonSet = tree.taxonSet;
i+=1;
}

process.stdout.write(JSON.stringify({movements,taxonSet}))
// for each node but the root. 
    // get add the movement to the movement log 

// for each movement type
  // add 1 or 2 points on route
  // bundle all movements
