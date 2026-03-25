import {parseArgs} from "node:util";
import {getS3File} from "../../components/getS3.js"

const {
    values: {stem}
  } = parseArgs({
    options: {stem: {type: "string"}}
  });



const pathToProcessed = 'projects/latency-reservoir/beast/a5dbe6f/logs/combined'
const bucket =  'fh-pi-mccrone-j-eco-public'
const fileKey = `${pathToProcessed}/${stem}.combined.log`
const profile = "hutch-sso"; 

// console.log(`${bucket}/fileKey`)

const fileContent = await getS3File(bucket, fileKey, profile)
process.stdout.write(fileContent)
 