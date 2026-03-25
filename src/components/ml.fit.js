
import {
//   ImmutableTree as Tree,
  preOrderIterator,
  tipIterator,
  
} from "@figtreejs/browser";
// import * as tf from 'npm:@tensorflow/tfjs';

import  gamma  from "@stdlib/stats-base-dists-gamma";

  function gradient(loss, unboundedParams, epsilon = 1e-6){
    const grad = new Array(unboundedParams.length).fill(0);
    for (let i = 0; i < unboundedParams.length; i++) {
        const paramsPlus = [...unboundedParams];
        const paramsMinus = [...unboundedParams];

        paramsPlus[i] += epsilon;
        paramsMinus[i] -= epsilon;

        const lossPlus = loss(paramsPlus);
        const lossMinus = loss(paramsMinus);

        grad[i] = (lossPlus - lossMinus) / (2 * epsilon);
  }
  return grad;
  }

export function getTl(tree,node,heightGetter=(tree,node)=>0){
  let tl = -Infinity;

  for(const t of tipIterator(tree,node)){
    const h = heightGetter(tree,t)
    if (h>tl){
      tl =h
    }
  }
  return tl;
}

export function getLoss(tree, heightGetter = (tree,node) => 0) {
  const data = [];
  const tl = [];
  const externalHeights = [];

  // Precompute tl and external heights
  for (const n of preOrderIterator(tree, tree.getRoot())) {
    if (n !== tree.getRoot()) {
      data[n.number] = tree.getLength(n);
    }
    if (!tree.isExternal(n)) {
      tl[n.number] = getTl(tree, n, heightGetter);
    } else {
      externalHeights[n.number] = heightGetter(tree,n);
    }
  }

  // Transform from unbounded to real parameters
  // if fixedRate is set we don't estimate it.
  function transform(unboundedParams) {
    let mu, logRootDiff, ys,logMu;
   
    [logMu, logRootDiff, ...ys] = unboundedParams;
    mu = Math.exp(logMu);
  

    const rootDiff = Math.exp(logRootDiff);
    const xs = ys.map(y => 1 / (1 + Math.exp(-y))); // inverse logit

    const heights = [...externalHeights];
    heights[tree.getRoot().number] = tl[tree.getRoot().number] + rootDiff;

    let internalCount = 0;
    for (const node of preOrderIterator(tree, tree.getRoot())) {
      if (node === tree.getRoot()) continue;
      if (!tree.isExternal(node)) {
        const parentHeight = heights[tree.getParent(node).number];
        const h = tl[node.number] + xs[internalCount] * (parentHeight - tl[node.number]);
        heights[node.number] = h;
        internalCount += 1;
      }
    }
    return { mu, heights };
  }

  // Inverse transform: from real parameters to unbounded
  function getInitial(mu, rootDiff=1.0,xs=0.5) {
    const ys = [];
    for (const node of preOrderIterator(tree, tree.getRoot())) {
      if (node === tree.getRoot() || tree.isExternal(node)) continue;
      ys.push(xs);
    }

     const logRootDiff = Math.log(rootDiff);

    if(mu===null){ // we are not estimating the rate or it is handled elsewhere
        if(ys.length===0){
             return [logRootDiff]
        }
        return [logRootDiff,...ys]
    }else{ // estimating the rate
    const logMu = Math.log(mu);
    if(ys.length==0){
        return [logMu, logRootDiff]
        }
    return [logMu, logRootDiff, ...ys];
    }
   
  }

  // Loss function using transformed parameters
  function loss(unboundedParams) {

    const { mu, heights } = transform(unboundedParams);
    let ll = 0;

    for (const node of preOrderIterator(tree, tree.getRoot())) {
      if (node === tree.getRoot()) continue;
      const parent = tree.getParent(node);
      const length = heights[parent.number] - heights[node.number];
      ll += gamma.logpdf(data[node.number], mu * length, 1);
    }
    return -ll;
  }



  function lossG(unboundedParams,fprime){
    fprime = fprime || new Array(unboundedParams.length).fill(0);
    const grad = gradient(loss,unboundedParams)
    // console.log(grad)
    for(let i=0;i<fprime.length;i++){
        fprime[i] = grad[i]
    }
    return loss(unboundedParams);
  }

  function getTimeTree(unboundedParams){
    const {heights} = transform(unboundedParams)
    let bestTree = tree;
    for(const node of bestTree.getNodes()){
      if(node ===bestTree.getRoot()) continue;
      const parent = bestTree.getParent(node);
      bestTree = bestTree.setLength(node,heights[parent.number]-heights[node.number])
    }
    return bestTree;
  }

  function getMuCI(unboundedParams){ // [rate, heights]
    const negLL = loss(unboundedParams)

    const step = 0.1 // in log space
    const bound = negLL +1.92
    const ci = [];
    const logMu = unboundedParams[0]

    const params = unboundedParams.slice();
    // upper bound
    let ll = negLL
    let upperMu = logMu
    let i=0
    while(ll<bound){
      if(i>1000){
        throw new Error("Hit infinite loop looking for upper bound of mu");
        
      }
      upperMu+=step;
      params[0]=upperMu
      ll=loss(params)
      i+=1
    }
    ci[1]=upperMu
    // lowerBound - reset
     ll = negLL
     i=0;
    let lowerMu = logMu

    while(ll<bound){
      if(i>1000){
        throw new Error("Hit infinite loop looking for lower bound of mu");
        
      }
      lowerMu-=step;
      params[0]=lowerMu
      ll=loss(params)
      i+=1;
    }
    ci[0]=lowerMu

    return ci.map(d=>Math.exp(d)) // transform

  }
  function getMu(unbounded){
    const mu = transform(unbounded)
    const ci = getMuCI(unbounded)
    return {mu,ci}
  }
  
  return { loss, transform, getInitial,getTimeTree,lossG, gradient,getMu};
}

export function getLossAcrossTrees(trees, heightGetter = t => 0,fixedRate=null){
    const fs = [];
    const treeSpecificParameters = []
    let currentIndex= fixedRate===null?1:0; // rate will be first and shared by all trees // if the rate is provided we use it and unbounded starts with the first tree root.
    for(const tree of trees){
        fs.push(getLoss(tree,heightGetter))
        const start = currentIndex;
        const endExclusive = currentIndex+tree.getInternalNodeCount();
        treeSpecificParameters.push({start,endExclusive})
        currentIndex = endExclusive;
    }
    
    function loss(unbounded){
        let negLL=0;
        // get parameters for this tree;
        const mu = fixedRate===null?unbounded[0]:Math.log(fixedRate);// if the rate is provided we use it and unbounded starts with the first tree root.
        let i = 0;
        
        for(const f of fs){
            // get parameters indexes for this tree;
            const {start,endExclusive} = treeSpecificParameters[i];
            const params = [mu,...unbounded.slice(start,endExclusive)]
            negLL+=f.loss(params)
            i+=1;
        }
        return negLL;
    }

  function lossG(unboundedParams,fprime){
    fprime = fprime || new Array(unboundedParams.length).fill(0);
    const grad = gradient(loss,unboundedParams)
    // console.log(grad)
    for(let i=0;i<fprime.length;i++){
        fprime[i] = grad[i]
    }
    return loss(unboundedParams);
  }
    function getInitial(mu, rootDiff=1.0,xs=0.5){
        let params = [];
        if(fixedRate==null){
            const logMu = Math.log(mu);
            params.push(logMu)
        }

        for(const f of fs){
            params = params.concat(f.getInitial(null,rootDiff,xs)); // The rate is shared by each tree so we don't want it transformed by each tree.
        }
        return params
    }
    function getTimeTrees(unbounded){
        const trees=[];
        const mu = fixedRate===null?unbounded[0]:Math.log(fixedRate);// if the rate is provided we use it and unbounded starts with the first tree root.
        let i = 0;
        for(const f of fs){
            // get parameters indexes for this tree;
            const {start,endExclusive} = treeSpecificParameters[i];
            const params = [mu,...unbounded.slice(start,endExclusive)]
            trees.push(f.getTimeTree(params))
            i+=1;
        }
        return trees;
    }
    function getMu(unbounded){
        const logMmu = fixedRate===null?unbounded[0]:Math.log(fixedRate);// if the rate is provided we use it and unbounded starts with the first tree root.
        const mu = Math.exp(logMmu)
        const ci  = getMuCI(unbounded)// all ready transformed
        return {mu,ci}
    }

    function getMuCI(unboundedParams){ // [rate, heights]
      if(fixedRate!==null){
        console.warn("No CI no fixed rate returning null")
        return null
      }

      const negLL = loss(unboundedParams)

      const step = 0.1 // in log space
      const bound = negLL +1.92
      const ci = [];
      const logMu = unboundedParams[0]

      const params = unboundedParams.slice();
      // upper bound
      let ll = negLL
      let upperMu = logMu
      let i=0
      while(ll<bound){
        if(i>1000){
          throw new Error("Hit infinite loop looking for upper bound of mu");
          
        }
        upperMu+=step;
        params[0]=upperMu
        ll=loss(params)
        i+=1
      }
      ci[1]=upperMu
      // lowerBound - reset
      ll = negLL
      i=0;
      let lowerMu = logMu

      while(ll<bound){
        if(i>1000){
          throw new Error("Hit infinite loop looking for lower bound of mu");
          
        }
        lowerMu-=step;
        params[0]=lowerMu
        ll=loss(params)
        i+=1;
      }
      ci[0]=lowerMu

      return ci.map(d=>Math.exp(d)) // transform

    }

    
    return {loss,getInitial,fs,getMu,getTimeTrees,lossG};
}