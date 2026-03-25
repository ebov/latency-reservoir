#!/usr/bin/env node
import * as fs from 'fs';

//https://www.yaoyuyang.com/2017/01/20/nodejs-batch-file-processing.html

// make Promise version of fs.readFile()
function readFileAsync(filename, enc) {
    return new Promise(function(resolve, reject) {
        fs.readFile(filename, enc, function(err, data){
            if (err) 
                reject(err); 
            else
                resolve({text:data,filename});
        });
    });
};

// utility function, return Promise
function getFile(filename) {
    return readFileAsync(filename, 'utf8')
}


// After deleting gaps. 17068 sites
    //  19  17068

const seqsSites = /\s+(\d+)\s+(\d+)$/; 

const treeLine = /TREE #\s+(\d+):.*/;
const LLregex = /lnL\(ntime:\s+(\d+)\s+np:\s+(\d+)\):\s+([-,+]?\d+\.\d+).*/;
const multipleRates = /(\d.\d+)+/g;
const multipleRatesLocal = /Gene\s+\d+:\s+(\d+\.\d+)+/g;


const treeCompr = /(\d+)\s+([-,+]?\d+)\s+([-,+]?\d+)\s+([-,+]?\d+)\s+([-,+]?\d+)\s+([-,+]?\d+)\s+([-,+]?\d+)\s+/;
const rateflag = /Substitution rate is per time unit.*/;
const seqSitesFlag=/After deleting gaps.*/;
const fileNameRegex = /[.*\/]*([^\.]+)\.(([^\.]+))\.mlb/ // DATASET.ANALYSIS.MLB
const partitionRegex = /Gene\s+\d+\s+\(len\s+(\d+)\)$/;//Gene  1 (len 4839)

function parseMLB(x){
    const {text,filename} = x;
    const [dataset,analysis] = filename.match(fileNameRegex).splice(1)

    let tree =null;
    const trees =[];

    const lines = text.split('\n')
    let seqs,sites;
    if(lines[0].match(seqsSites)){
        [seqs,sites] = lines[0].match(seqsSites).splice(1).map(parseFloat)
    }
    // let [_,sitePatterns]=lines[8+seqs].match(seqsSitePattern).splice(1).map(parseFloat);
    let partitions = [];

    
    let inTreeCounter = 0;
    let expectRate = false;
    let expectSiteStats = false;
    let inTree = false;

    for(const line of lines){
        const treeId = line.match(treeLine)
        if(treeId){
            if(tree){
                trees.push(tree);
            }
            inTree = true;
            tree={};
            tree.id = parseInt(treeId[1])
            inTreeCounter = 0;
        }
        if(inTree && inTreeCounter==1){
            const [full,ntime,np,ll] = line.match(LLregex);
            if(!ll){
                throw new Error("Expected likelihood line but didn't find it")
            }
            tree.ll = parseFloat(ll);
            tree.ntime = parseFloat(ntime);
            tree.np = parseFloat(np);
        }
        if(inTree && (inTreeCounter===9 || inTreeCounter===10)){ // extra warning for local clock
            if(line.trim().length>0){
                tree.tree = line;
            }
        }
        if(line.match(rateflag)){
            expectRate = true
        }
        if(expectRate && (inTreeCounter == 17 ||inTreeCounter ==  19)){
            const mr = line.match(multipleRates)
            if(mr){
                tree['rate'] = mr.map(d=>parseFloat(d))
            expectRate = false;
            }
        }

        const partitionLine = line.match(partitionRegex)
        if(partitionLine){
            partitions = partitions.concat(partitionLine.splice(1).map(parseFloat))
        }
        
        const treeCompLine = line.match(treeCompr)
        if(treeCompLine){
            const [treeid,li,Dli,SE,pKH,pSH,pRELL] = treeCompLine.splice(1).map(parseFloat)
            let thisTree = trees[treeid-1]
            thisTree = {...thisTree,li,Dli,SE,pKH,pSH,pRELL}
        }
        if(expectSiteStats){//set on last past
            [seqs,sites] = line.match(seqsSites).splice(1).map(parseFloat)
        }
        expectSiteStats = line.match(seqSitesFlag);
        

        inTreeCounter++;
    }
    //get last tree;
    trees.push(tree)
    return({dataset,analysis,trees,sites,seqs,partitions});
}
const files = process.argv.slice(2)

Promise.all(files.map(getFile)).then(fileData=>process.stdout.write(JSON.stringify(fileData.map(parseMLB),null, 2)));




