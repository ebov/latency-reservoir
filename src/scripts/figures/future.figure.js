#!/usr/bin/env node

import * as Plot from "@observablehq/plot";
import { JSDOM } from "jsdom";
import { svgSizes,saveFigure,plotGrid} from "../utils/saveFigure.js";
import { writeSummary } from "../utils/summarize.js";
import { xAxis,yAxis } from "../utils/axis.js";
// facet y (branch length)
// y (density)
//x proportion of branch spent lantent -[0,1)

import {getDensities,identity,exp} from "../../components/sericola.js"
import  poisson  from "@stdlib/stats-base-dists-poisson";
import {max,maxIndex,minIndex,range,rollups,sum} from "d3-array"
import { clusterScale } from "../utils/colors.js";
import { format } from "d3-format";
import fs from "fs";
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';



const usageString  ='$0 <summaryFile> <output> [options]'
const argv = yargs(hideBin(process.argv))
  .usage(`Usage: ${usageString}`)
  .command(usageString,'Plot an unrooted tree and map',(yargs)=>{
    yargs
    .positional('summaryFile',{
      describe:'Path to the csv with summary statistics from the analysis',
      type:'string'
    })
    .positional('output', {
      describe: 'Output file path .png and .svg  and csv will be added',
      type: 'string',
    })
  })
  .option('size', {
    alias: 's',
    describe: 'Figure size (small, medium, large)',
    choices: ['small', 'medium', 'large'], // restrict allowed values
    default: 'small', // optional default
  })
  .option('height', {
    alias: 'h',
    describe: 'Figure height in cm',
 // optional default
  })
  .help()
  .argv;

const {summaryFile, output, size,height:figHeight} = argv


const paramsData = fs.readFileSync(summaryFile, "utf8");

const latentStateBiasMean = parseFloat(
    paramsData
        .split("\n")
        .find(line => line.startsWith("latentStateBias_mean,"))
        .split(",")[1]
);
const latentStateRateMean = parseFloat(
    paramsData
        .split("\n")
        .find(line => line.startsWith("latentStateRate_mean,"))
        .split(",")[1]
);

const meanRate = parseFloat(
    paramsData
        .split("\n")
        .find(line => line.startsWith("clockRate_mean,"))
        .split(",")[1]
) *1e-4 // now getting parsed with 10^-4


const rootAge={
    mean: parseFloat(
        paramsData
        .split("\n")
        .find(line => line.startsWith("rootAge_mean,"))
        .split(",")[1]
    ),
    min:parseFloat(
        paramsData
        .split("\n")
        .find(line => line.startsWith("rootAge_hpd_min,"))
        .split(",")[1]
    ),
    max:parseFloat(
        paramsData
        .split("\n")
        .find(line => line.startsWith("rootAge_hpd_max,"))
        .split(",")[1]
    ),
}


const sites = 17751

let {width,height } = svgSizes[size];

if(figHeight){
  height = Math.round(figHeight*(1 / 2.54) * 96)
}
// opposite of beast indexing. does not account for uncertainty in the analysis
const rate = latentStateRateMean // mean of sc.noMakona
const bias = latentStateBiasMean // 
const Q = [  -rate * (1 - bias),rate * (1 - bias), rate * bias, -rate * bias]
const branchLengths = [5,10,25,50,100]
const proportions = range(0,1.01,0.01)
const tol = 1e-10;
const LL = (function(){
    const output=[];
    for(const bl of branchLengths){
        // doing this here allows us to cache results between samples
        const dim=Math.sqrt(Q.length)
        const lambda = max(
            Q.filter((d, i) => Math.floor(i / dim) === i % dim).map((d) => -d)
        )
        const P = Q.map((d, i) => identity[i] + d / lambda);
        const maxN  = poisson.quantile(1-tol, lambda * bl);

        const conditional = sum(
            range(maxN + 1).map((d) => exp(P, d)[3] * poisson.pmf(d, bl * lambda))
        );
        const {cdfWt,pdfWt} = getDensities(Q,maxN,bl)
        for (const s of proportions){
            let density =  pdfWt(s*bl)[3]/conditional; // if s===0 this calls the cdf
            if(s>0){
                density*=bl;
            }
            output.push({time:bl,proportion:s,density:density})
            // yield output;
        }
    }
    return output
})();

const pLanent = (function(){
    const branchLengths = range(1,101,1);
    const proportions = [0]
    const output=[];
    for(const bl of branchLengths){
        // doing this here allows us to cache results between samples
        const dim=Math.sqrt(Q.length)
        const lambda = max(
            Q.filter((d, i) => Math.floor(i / dim) === i % dim).map((d) => -d)
        )
        const P = Q.map((d, i) => identity[i] + d / lambda);
        const maxN  = poisson.quantile(1-tol, lambda * bl);

        const conditional = sum(
            range(maxN + 1).map((d) => exp(P, d)[3] * poisson.pmf(d, bl * lambda))
        );
        const {cdfWt,pdfWt} = getDensities(Q,maxN,bl)
        for (const s of proportions){
            let density =  pdfWt(s*bl)[3]/conditional; // if s===0 this calls the cdf
            if(s>0){
                density*=bl;
            }
            output.push({time:bl,proportion:s,density:density})
            // yield output;
        }
    }
    return output
})();

const textLabels = rollups(LL.filter(d=>d.proportion>0),v=>v[maxIndex(v,d=>d.density)], g=>g.time).map(d=>d[1])

const ratePanel = Plot.plot({
     document: new JSDOM("").window.document,
    width:width/2,
    height:height,
    y:{grid:true},
    color:{range:clusterScale.range().reverse()},
    x:{label:"Proportion of branch in latency"},
    marks:[
        Plot.ruleY([0]),
        // Plot.ruleX([-0.02]),
        // Plot.rectY(LL.filter(d=>d.proportion===0),{x1:-0.01,x2:0.01,y:"density",fy:"time"}),
        Plot.line(LL,{filter:d=>d.proportion>0,x:"proportion",y:"density",stroke:"time"}),
        // Plot.areaY(LL,{filter:d=>d.proportion>0,x:"proportion",y:"density",fill:"time",opacity:0.3}),
        Plot.text(textLabels,{x:"proportion", y:"density",text:d=>`${d.time} years`,fill:'time',
                                fontSize: 8, 
                                fontFamily: "HelveticaNeue-Light",
                                fontWeight:400,
                            dx:7,
                            dy:-3}),
        yAxis({ticks:3, label:"Density",labelOffset:10,labelAnchor:"top"}),
        xAxis({label:"Proportion of branch in latency",ticks:5,labelArrow:'none'})
    ]
})

ratePanel.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns", "http://www.w3.org/2000/svg")

const rateSVG = ratePanel.outerHTML;

const latenFig = Plot.plot({
     document: new JSDOM("").window.document,
    width:width/2,
    height:height,
    y:{grid:true,domain:[0,1]},
    marks:[
        Plot.ruleY([0]),
        // Plot.ruleX([0]),
        Plot.line(pLanent,{y:d=>1-d.density,x:"time"}),
        yAxis({ticks:5,label:"Probability of latency",labelOffset:10,labelAnchor:"top"}),
        xAxis({label:"Branch length (years)",ticks:5,labelArrow:'none'})
    ]
})


latenFig.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns", "http://www.w3.org/2000/svg")

const latentSVG = latenFig.outerHTML;


const figurePanels = [
  { svg: latentSVG, row: 0, col: 0, rowspan: 1, colspan: 1 },
  { svg: rateSVG, row: 0, col: 1, rowspan: 1, colspan: 1 },
]


const probLatent =  plotGrid(figurePanels, {totalHeight:height,totalWidth: width,labelOffsetY:14,labelOffsetX:10}) 

saveFigure({content:probLatent,path:output})




// Summary 
const medianLP = pLanent[minIndex(pLanent,d=>Math.abs(0.5-d.density))]
const expLatentArray = (function(){
    const branchLengths = [medianLP.time];
    const proportions = range(0.001,1.001,0.001)
    const output=[];
    for(const bl of branchLengths){
        // doing this here allows us to cache results between samples
        const dim=Math.sqrt(Q.length)
        const lambda = max(
            Q.filter((d, i) => Math.floor(i / dim) === i % dim).map((d) => -d)
        )
        const P = Q.map((d, i) => identity[i] + d / lambda);
        const maxN  = poisson.quantile(1-tol, lambda * bl);

        const conditional = sum(
            range(maxN + 1).map((d) => exp(P, d)[3] * poisson.pmf(d, bl * lambda))
        );
        const {cdfWt,pdfWt} = getDensities(Q,maxN,bl)
        for (const s of proportions){
            let density =  pdfWt(s*bl)[3]/conditional; // if s===0 this calls the cdf
            if(s>0){
                density*=bl;
            }
            output.push({time:bl,proportion:s,density:density})
            // yield output;
        }
    }
    return output
})();

const expLatentSum = expLatentArray.reduce((acc,d) =>d.density+acc,0)
const expLatentP = expLatentArray.reduce((acc,d)=>acc+d.proportion*d.density/expLatentSum,0)


// Expectations on branch of 1976-2025 (50 years)
function sericola(time){
    const proportions = range(0.0,1.001,0.001)
    const output=[];
    for(const bl of time){
        // doing this here allows us to cache results between samples
        const dim=Math.sqrt(Q.length)
        const lambda = max(
            Q.filter((d, i) => Math.floor(i / dim) === i % dim).map((d) => -d)
        )
        const P = Q.map((d, i) => identity[i] + d / lambda);
        const maxN  = poisson.quantile(1-tol, lambda * bl);

        const conditional = sum(
            range(maxN + 1).map((d) => exp(P, d)[3] * poisson.pmf(d, bl * lambda))
        );
        const {cdfWt,pdfWt} = getDensities(Q,maxN,bl)
        for (const s of proportions){
            let density =  pdfWt(s*bl)[3]/conditional; // if s===0 this calls the cdf
            if(s>0){
                density*=bl;
            }
            let cdfDensity = cdfWt(s*bl)[3]/conditional

            output.push({time:bl,proportion:s,density:density,cdf:cdfDensity})
            // yield output;
        }
    }
    return output
};





const kasai = sericola([49]);

// find the 95% intervale of proportion of time spent latent.
const nolatency = kasai.find(d=>d.proportion===0).density;
const kasai_25 = kasai.find(d=>(d.cdf-nolatency)/(1-nolatency)>0.025)
const kasai_975 = kasai.find(d=>(d.cdf-nolatency)/(1-nolatency)>0.975)

console.log(kasai_25);
console.log(kasai_975);


const kasiaL = kasai.filter(d=>d.proportion>0)
const kasiaLSum = kasiaL.reduce((acc,d) =>d.density+acc,0)
const kasaiExpLatentP = kasiaL.reduce((acc,d)=>acc+d.proportion*d.density/kasiaLSum,0)

//WA
const Makona_time = 2014.213698630137;
const MakonaLengths =[Makona_time - rootAge.mean, Makona_time-rootAge.min, Makona_time - rootAge.max]


const makona = sericola(MakonaLengths);

const MakonaPL =makona.filter(d=>d.proportion===0).map(d=>d.density)

console.log(format("0.2e")((1-kasaiExpLatentP)*meanRate).replace("e","$ \\times 10^{")+"}$")


const summary = {median:format("0.0f")(medianLP.time),
                expP:format("0.1f")(expLatentP),
                expT:format("0.0f")(expLatentP*medianLP.time),
                kasai:format("0.1f")((1-kasai.find(d=>d.proportion===0).density)*100),
                kasaiExpP:format("0.1f")(kasaiExpLatentP),
                kasaiExpT:format("0.0f")(kasaiExpLatentP*49),
                kasaiExpT_min:format("0.0f")((1-kasai_975.proportion)*49),
                kasaiExpT_max:format("0.0f")((1-kasai_25.proportion)*49),
                kasaiExpRate:format("0.2e")((1-kasaiExpLatentP)*meanRate).replace("e","$ \\times 10^{")+"}$",
                kasaiExpRate_min:format("0.2e")((1-kasai_975.proportion)*meanRate).replace("e","$ \\times 10^{")+"}$",
                kasaiExpRate_max:format("0.2e")((1-kasai_25.proportion)*meanRate).replace("e","$ \\times 10^{")+"}$",
                kasaiExpMuts:format("0.0f")((1-kasaiExpLatentP)*meanRate*49*sites),
                kasaiExpMuts_max:format("0.0f")((1-kasai_25.proportion)*meanRate*49*sites),
                kasaiExpMuts_min:format("0.0f")((1-kasai_975.proportion)*meanRate*49*sites),
                makona_mean:format("0.0f")(MakonaLengths[0]),
                makona_max:format("0.0f")(MakonaLengths[1]),
                makona_min:format("0.0f")(MakonaLengths[2]),
                makona_PL_mean:format("0.2%")(MakonaPL[0]).replace("%","\\%"),
                makona_PL_min:format("0.2%")(MakonaPL[1]).replace("%","\\%"),
                makona_PL_max:format("0.2%")(MakonaPL[2]).replace("%","\\%"),
}

writeSummary(summary,output+`.csv`)