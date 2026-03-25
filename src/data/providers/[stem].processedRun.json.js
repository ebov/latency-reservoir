import {parseArgs} from "node:util";
import {getS3File} from "../../components/getS3.js"

const {
    values: {stem}
  } = parseArgs({
    options: {stem: {type: "string"}}
  });



const pathToProcessed = 'projects/latency-reservoir/beast/a5dbe6f/processed'
const bucket =  'fh-pi-mccrone-j-eco-public'
const fileKey = `${pathToProcessed}/${stem}.json`
const profile = "hutch-sso"; 

// console.log(`${bucket}/fileKey`)

const fileContent = await getS3File(bucket, fileKey, profile)
const roots = JSON.parse(fileContent)
// remove trees
const cleanedData = roots.map(d=>({bitSet:d.bitSet,indices:d.indices,mcc:d.mcc.replace("−","-"),posterior:d.posterior}))
process.stdout.write(JSON.stringify(cleanedData))
 