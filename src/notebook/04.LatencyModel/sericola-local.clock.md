

```js
// import {getDensities,exp,identity} from "/components/sericola.js"
import {sericolaDensity} from "/components/sericola.js"
import { dateGuesser, tipIterator, outGroup, processPaml,pamlTable} from "/components/utils.js";
import * as d3 from "npm:d3";
import {ImmutableTree as Tree,figtree,CircleNodes,Branches,rectangularLayout,NodeLabels,BranchLabels,Axis} from "@figtreejs/browser"

```



```js
const clocksClades = [
  ["KU182905|Kikwit-9510621|DRC|1995-05-04"],
  ["HQ613402|034-KS|DRC|2008-12-31","HQ613403|M-M|DRC|2007-08-31"],
  ["MH613311|Muembe.1|DRC|2017-05-15","MK007330|18FHV090-Beni|DRC|2018-07-28"],
  ["|22MBK-004|DRC|2022-04-25","OR084849|Mandaka|DRC|2020-05-31",
    "KP271018|Lomela-Lokolia16|DRC|2014-08-20","OR084846|MBK67|DRC|2020-06-12",
    "MH733477|BIK009-Bikoro|DRC|2018-05-10"],
  ["PP_003RXHG|25fhv173|DRC|2025-09-01"]] // add 1 to index to map to rates

```

```js
const novelRootTree = FileAttachment("/results/tipDater/set19_best.json")
  .json()
  .then((d) => {
    return d.filter(d=>d.analysis==="srdtStem").map((d) => ({
      ...d,
      trees: d.trees.map((t) => ({ ...t, tree: Tree.fromNewick(t.tree) })),
    }));
  })
  .then(d=>processPaml(d,true)[1]) 
  .then(d=>({...d,propsLatent:d.rate.map((d,i,all)=>1-(d/all[0]))}))
  .then(d=>{
    let tree = d.tree.orderNodesByDensity(true);
    // convert length to years
    for(let i=0;i<tree.getNodeCount();i++){
      const node = tree.getNode(i)
      if(!tree.isRoot(node)){
        const l = tree.getLength(node)
        tree = tree.setLength(node,l/(356))
      }

    }

  // annotate clades with proportion latent from rates

  for(let i=0;i<clocksClades.length;i++){
    const tips = clocksClades[i]
    const clade = tips.map(d=>tree.getNode(d))
    let node;
    if(clade.length===1){
       node = clade[0]
    }else{
      node = tree.getMRCA(clade) 
    }
      tree = tree.annotateNode(node,{LS:d.propsLatent[i+1]})
  }

  // annotate other nodes
      for(let i=0;i<tree.getNodeCount();i++){
      const node = tree.getNode(i)
      const has_ls = tree.hasAnnotation(node,"LS");
      if(!has_ls){
        tree = tree.annotateNode(node,{LS:0})
      }
    }

    return tree
  
  });

```

```js
const WAtree = FileAttachment("/results/tipDater/set19_best.json")
   .json()
  .then((d) => {
    return d.filter(d=>d.analysis==="srdtStem").map((d) => ({
      ...d,
      trees: d.trees.map((t) => ({ ...t, tree: Tree.fromNewick(t.tree) })),
    }));
  })
  .then(d=>processPaml(d,true)[0]) 
  .then(d=>({...d,propsLatent:d.rate.map((d,i,all)=>1-(d/all[0]))}))
  .then(d=>{
    let tree = d.tree.orderNodesByDensity(true);
    // convert length to years
    for(let i=0;i<tree.getNodeCount();i++){
      const node = tree.getNode(i)
      if(!tree.isRoot(node)){
        const l = tree.getLength(node)
        tree = tree.setLength(node,l/(356))
      }
    }

  // annotate clades with proportion latent from rates

  for(let i=0;i<clocksClades.length;i++){
    const tips = clocksClades[i]
    const clade = tips.map(d=>tree.getNode(d))
    let node;
    if(clade.length===1){
       node = clade[0]
    }else{
      node = tree.getMRCA(clade) 
    }
      tree = tree.annotateNode(node,{LS:d.propsLatent[i+1]})
  }

  // annotate other nodes
      for(let i=0;i<tree.getNodeCount();i++){
      const node = tree.getNode(i)
      const has_ls = tree.hasAnnotation(node,"LS");
      if(!has_ls){
        tree = tree.annotateNode(node,{LS:0})
      }
    }

    return tree
  
  });
```

```js
const data = novelRootTree.getNodes().filter(n=>!novelRootTree.isRoot(n)).map(n=>({length:novelRootTree.getLength(n),LS:novelRootTree.getAnnotation(n,"LS")}))
```

# Expectations


To get some idea of the rate and bias we might expect, we'll fit the sericola latency model conditioned on the rates and branchlengths estimated 
in the local clock paml analysis.  First we will look at the tree with the highest likelihood - the novel rooting. 

_The likelihood surfaces below are calculated on the fly and will populate as the page loads. The contours are spaced out every 2 log likelihood units and are smoothed (for better or worse) which leads to some wiggles_

## Novel rooting

Here we have the maximum likelihood time tree with local clocks on 4 slow-down branches. 

The color of the branch and labels represent the proportion of the branch spent in latency. 
Here calculated as 1 - the ratio of the branch's local clock and the underlying main rate.

<div class="card">
<h2>Novel root</h2>
        <svg id="tree-fig"height="400px" width=${width}>
          </svg>
</div>



Below we have the log likeloood surface across calculated as a grid search across a range of bias and rate parameters (10e-4,1) with 10 steps for each order of magnitude.

The surface forms a platue/ridge around a rate of 0.1, with a wide range of biases possible. 
Note the slope is steeper at higher rates than lower ones. 
All of this matches our preliminary analyses that found the model was sensitive to exponential priors which favored very low rates.

Currently, fixing the bias at 0.5 doesn't seem too bad, but it may make latency on other branches more likely. It seems we may have enough data to estimate both paramters.

```js 
const LL= (function*(){
 
const ticksFrom1 = [3, 2,]
  .map((d) => d3.range(1, 10, 1).map((k) => 1- (k * 10 ** -d)))
  .reduce((acc, cur) => acc.concat(cur), [])

const ticks = [4,3, 2, 1]
  .map((d) => d3.range(1, 10, 1).map((k) => k * 10 ** -d))
  .reduce((acc, cur) => acc.concat(cur), [])
  .concat(ticksFrom1)
  const output=[];
  for(const bias of ticks){
    for(const rate of ticks){
      //opposite indexing as beast
      const Q = [ -rate * (1 - bias), rate * (1 - bias),rate * bias, -rate * bias,]
      const tol =10e-10
      const ll =  data.reduce((sum,d)=>{
        return sum + Math.log(sericolaDensity(Q,d.length,d.LS))
      },0)
      output.push({rate,bias,ll})
      yield output;
    }
  }
})();
```


```js
const maxLL = LL.filter((d,i)=>i===d3.maxIndex(LL,d=>d.ll))[0]
```

<div class="card">

  ```js
  const scale = view(Inputs.radio(["linear", "log"], {
    label: "scale",
    value: "linear"
  }))
  ```

  ${Plot.plot({
    title:`Max (${d3.format("0.3")(maxLL.ll)}) at rate: ${maxLL.rate}, bias: ${maxLL.bias}`,
    color:{ legend:true,scheme:"Magma"},
    y:{type:scale},
    x:{type:scale},
    marks:[
      Plot.contour(LL, {x: "rate", y: "bias",fill:"ll",blur:7,thresholds: d3.range(...extent,2),stroke:"black"}),
    //Plot.raster(LL, {x: "rate", y: "bias", fill: "ll",interpolate: "barycentric"}),
          Plot.dot(LL.filter((d,i)=>i===d3.maxIndex(LL,d=>d.ll)),{x: "rate", y: "bias",fill:'grey'})
          ]
    })}

</div>

```js
const extent = d3.extent(LL,d=>d.ll)
```


```js
const lsScale =d3.interpolateLab("black", "steelblue")

const treeOptions = {
    svg: document.getElementById("tree-fig"),
  tree: novelRootTree,
  animated: true,
  layout: rectangularLayout,
  width: width,
  height: 400,
  margins: { top: 10, left: 40, right: 350, bottom: 40 },
      axis:{
      gap:10,
      offsetBy: d3.max(novelRootTree.getExternalNodes().map(n=>dateGuesser(novelRootTree.getTaxon(n).name))),
      reverse:true,
      bars:{}
    },
  baubles: [

    Branches({
      attrs: { stroke: "black", strokeWidth: 2, stroke: n=> lsScale(novelRootTree.getAnnotation(n,"LS"))
      },
    }),
    BranchLabels({
      filter:(n) => novelRootTree.getAnnotation(n,"LS")>0,
      text: (n) => d3.format('0.2%')(novelRootTree.getAnnotation(n,"LS"))
    }),
    NodeLabels({
      filter: (n) => novelRootTree.isExternal(n),
      attrs: {
        fill: "black",
        fontSize: 16,
        fontWeight: 300,
        fontFamily: "HelveticaNeue-Light"
      },
      text: (n) => novelRootTree.getTaxon(n).name
    })
  ],
  opts: {}
}
figtree(treeOptions)

```
## West African Root.
The west African root position is often also not rejected by log likelihood tests. 

Here we see the ML tree of this rooting with the same local clocks above is fairly similar to that above. 



<div class="card">
        <svg id="WA-fig"height="400px" width=${width}></svg>
</div>

```js
const WAOptions ={
  ...treeOptions,
      svg: document.getElementById("WA-fig"),
  tree: WAtree,
      axis:{
      gap:10,
      offsetBy: d3.max(WAtree.getExternalNodes().map(n=>dateGuesser(WAtree.getTaxon(n).name))),
      reverse:true,
      bars:{}
    },
  baubles: [

    Branches({
      attrs: { stroke: "black", strokeWidth: 2, stroke: n=> lsScale(WAtree.getAnnotation(n,"LS"))

      },
    }),
    BranchLabels({
      filter:(n) => WAtree.getAnnotation(n,"LS")>0,
      text: (n) => d3.format('0.2%')(WAtree.getAnnotation(n,"LS"))
    }),
    NodeLabels({
      filter: (n) => WAtree.isExternal(n),
      attrs: {
        fill: "black",
        fontSize: 16,
        fontWeight: 300,
        fontFamily: "HelveticaNeue-Light"
      },
      text: (n) => WAtree.getTaxon(n).name
    })
  ],
}
figtree(WAOptions)
```

```js
const dataWA = WAtree.getNodes().filter(n=>!WAtree.isRoot(n)).map(n=>({length:WAtree.getLength(n),LS:WAtree.getAnnotation(n,"LS")}))
```

```js 
const LLWA= (function*(){
const ticksFrom1 = [3, 2,]
  .map((d) => d3.range(1, 10, 1).map((k) => 1- (k * 10 ** -d)))
  .reduce((acc, cur) => acc.concat(cur), [])

const ticks = [4,3, 2, 1]
  .map((d) => d3.range(1, 10, 1).map((k) => k * 10 ** -d))
  .reduce((acc, cur) => acc.concat(cur), [])
  .concat(ticksFrom1)

  const output=[];
  for(const bias of ticks){
    for(const rate of ticks){
      //opposite indexing as beast
      const Q = [ -rate * (1 - bias), rate * (1 - bias),rate * bias, -rate * bias,]
      const tol =10e-10
      const ll =  dataWA.reduce((sum,d)=>{
        return sum + Math.log(sericolaDensity(Q,d.length,d.LS))
      },0)
      output.push({rate,bias,ll})
      yield output;
    }
  }
})();
```

```js
const maxLLWA = LLWA.filter((d,i)=>i===d3.maxIndex(LLWA,d=>d.ll))[0]
```

The likelihood surface is also similar although lower, and a slightly slower rate and  higher bias is preferred. 
It seems plausible that this root could be visited in a BEAST analysis.

<div class="card">

  ```js
  const scaleWA = view(Inputs.radio(["linear", "log"], {
    label: "scale",
    value: "linear"
  }))
  ```

  ${Plot.plot({
    title:`Max ((${d3.format("0.3")(maxLLWA.ll)}) ) at rate: ${maxLLWA.rate}, bias: ${maxLLWA.bias}`,
    color:{ legend:true,scheme:"Magma"},
    y:{type:scaleWA},
    x:{type:scaleWA},
    marks:[
      Plot.contour(LLWA, {x: "rate", y: "bias",fill:"ll",blur:7,thresholds: d3.range(...extent,2),stroke:"black"}),
    //Plot.raster(LLWA, {x: "rate", y: "bias", fill: "ll",interpolate: "barycentric"}),
          Plot.dot(LLWA.filter((d,i)=>i===d3.maxIndex(LLWA,d=>d.ll)),{x: "rate", y: "bias",fill:'grey'})
          ]
    })}

</div>



## Caveats 

Here we have conditioned on which branches are latent. 
Given these parameters it may be reasonable to expect latency on other branches as well. 

Below we plot the pdf of the proportion of time spent latent for branches of different lengths.
We really don't expect to see latency on branches less than 20 years long. As the branch length increases we expect 
more latency in the novel root case.

_Again Best to let the page load before making any interpretations as the maximum will change above._

```js
//opposite of beast
const novelQ  = [ -maxLL.rate * (1 - maxLL.bias), maxLL.rate * (1 - maxLL.bias), maxLL.rate * maxLL.bias, -maxLL.rate * maxLL.bias,]
const WAQ = [-maxLLWA.rate * (1 - maxLLWA.bias), maxLLWA.rate * (1 - maxLLWA.bias),maxLLWA.rate * maxLLWA.bias, -maxLLWA.rate * maxLLWA.bias]

const pdfs = []

for (const length of [10,20,40,80]){
  for(const s of d3.range(0,1,0.05)){
    pdfs.push({s,length,pdf:sericolaDensity(novelQ,length,s),root:"novel"})
    pdfs.push({s,length,pdf:sericolaDensity(WAQ,length,s),root:"wa"})
  }
}

```

<div class="card">

  ```js
  const scaleLines = view(Inputs.radio(["linear", "log"], {
    label: "scale",
    value: "linear"
  }))
  ```
${
  Plot.plot({
    color:{type:"categorical",legend:true},
    y:{type:scaleLines},
      grid: true,
    marks:[
      Plot.frame(),
      Plot.lineY(pdfs, { filter: (d) => d.s > 0, x: "s", y: "pdf",stroke:"root",fy:"length" }),
      Plot.dot(pdfs, { filter: (d) => d.s > 0, x: "s", y: "pdf", fill: "root",fy:"length" }),
      Plot.rect(pdfs, {
        filter: (d) => d.s === 0,
        x1: (d) => d.root==="novel"? d.s - 0.05:d.s,
        x2: (d) =>d.root==="novel"? d.s:d.s+0.05,
        y2: "pdf",
        y1: 0,
        fill: "root",
        opacity:0.5,
        fy:"length"
      })
    ]
  })
}
</div>