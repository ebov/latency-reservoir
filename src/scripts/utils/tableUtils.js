import {max,maxIndex,minIndex,sum,rollups} from 'd3-array'
import {tipIterator} from "@figtreejs/browser";
import { format } from 'd3-format';
import chisquare from '@stdlib/stats-base-dists-chisquare';
import * as htl from "htl"
import * as Inputs from "@observablehq/inputs"


function getMeanRates(rates,partitions) {
    const lc =  rates.length/partitions.length; // one rate for each partition for each local clock
    const timeScale = 1000; // in mlb files one unit of time is 1000 years
    return rollups(
        rates,
        (D) => sum(D, (d, i) => d/timeScale * partitions[i]) / sum(partitions),
        // rate is s/s/1000 years this converts to years and gets mean rate
        (d, i) => i % lc // grouping
      )
      .map((d) => d[1]);
  }
export function outGroup(tree) {
    const tips = [];
    for (const child of tree.getChildren(tree.getRoot())) {
      tips.push([...tipIterator(tree, child)]);
    }
  
    const minOG = minIndex(tips, (d) => d.length);
    const dates = tips[minOG]
      .map((n) => tree.getTaxon(n).name.split("|")[3])
      .sort()
      if(dates.length===2){ // 1970s
        if(!/197[67]/.test(dates[0]) || !/197[6|7]/.test(dates[1]) ){
            console.warn(`Expected 1970s outgroup - found ${dates}\n Is this correct?`)
        }
        return '1970s'
      }else if(dates.length===1){ // WA or other
        if(/2014/.test(dates[0])){
            return "Midpoint"
        }else{
            return '-' // should just be for dr
      }
    }else{
        return 'Proposed'
  }
}

export const rateFormat= (rate)=>{
  const srate = format("0.2e")(rate);
  return srate.replace("e","$ \\times 10^{")+"}$" //TODO fix this
}

export const pFormat = (p)=>{
    if(p==='-'){
        return '\$-\$'
    }
    if(p<0.001){
        return '\$<0.001\$'
    }else{
        return format("0.2f")(p)
    }
}

export const rFormat = (rate)=>{
  if(rate==='-'){
      return '\$-\$'
  
  }else{
      return  rateFormat(rate[0])
  }
}



export function processPaml(data,flat=false) {
  
  // gets the best tree if there are multiple in the analysis.
    let processed;
  
      if(flat){
          processed = data.reduce((acc,curr)=>{
              const partitions = curr.partitions.length>0?curr.partitions:[curr.sites]
  
              const trees = curr.trees.map(d=>({
                  ...d,
                  rate:d.rate?getMeanRates(d.rate,partitions):'-',
                  og:outGroup(d.tree),
                  np:d.np,
                  seqs:curr.seqs,
                  analysis:curr.analysis
              }))
              return acc.concat(trees);
          },[])
  
      }else{
          processed = data.map((d) => {
              const partitions = d.partitions.length>0?d.partitions:[d.sites]
              const bestTree = maxIndex(d.trees, (d) => d.ll);
              return {
              ...d,
              ll: max(d.trees, (d) => d.ll),
              bestTree,
              rate: d.trees[0].rate
              ? getMeanRates(d.trees[bestTree].rate,partitions)
              : '-',
              og: outGroup(d.trees[bestTree].tree),
              np: d.trees[bestTree].np
              }
          });
      }
  
    const maxLL = max(processed, (d) => d.ll);
    const maxNP = max(processed, (d) => d.np);
  
  // TODO chisquared p value here based on diff and df.
    return processed.map((d) => {
      const diff = d.ll===maxLL?'-':d.ll-maxLL
      const df = maxNP - d.np > 0 ? maxNP - d.np : '-'
      const p = df!=='-'? chisquare.cdf(df,-2*diff) :'-'
      return {
        ...d,
        diff,
        df,
        p
      }
    }
      ).sort((a,b)=>b.ll-a.ll);
  }