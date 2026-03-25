<style>

.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-family: var(--sans-serif);
  margin: 4rem 0 2rem;
  text-wrap: balance;
  text-align: center;
}

.hero h1 {
  margin: 1rem 0;
  max-width: none;
  font-size: 24px;
  font-weight: 500;

}

.hero h2 {
  margin: 0;
  max-width: 34em;
  font-size: 20px;
  font-style: initial;
  font-weight: 500;
  line-height: 1.5;
  color: var(--theme-foreground-muted);
}

@media (min-width: 640px) {
  .hero h1 {
    font-size: 32px;
  };

}

.centered{
  max-width: 1080px; 
  margin:auto;
  padding:20px
}

p { 
  max-width:1080px;
  font-family: 'Helvetica', 'Arial', sans-serif;

 }

body{
    font-family: 'Helvetica', 'Arial', sans-serif;
}


</style>
```js
import * as d3 from "npm:d3";
import {
  ImmutableTree as Tree,
  figtree,
  radialLayout,
  rectangularLayout,
  Branches,
  CircleNodes,
  NodeLabels,
  Axis,
  NexusImporter,
  BranchLabels,
  postOrderIterator,
  preOrderIterator,
  tipIterator
} from "@figtreejs/browser";

import {require} from "npm:d3-require";

import {dateGuesser} from "../../scripts/utils/dateGuesser.js"
import {processTree} from "../../scripts/utils/processTree.js"
import {clusterScale} from "../../scripts/utils/colors.js"
import {getLoss,getTl,getLossAcrossTrees} from "../../components/ml.fit.js" 
import {format} from "d3-format"

const gamma = require("https://cdn.jsdelivr.net/gh/stdlib-js/stats-base-dists-gamma@umd/browser.js")
```

```js
import {nelderMead,conjugateGradient} from "npm:fmin"
```


# Identifiability and sensitivity

It seems that the temporal signal in the data is limited, and destabilized by the addition of a few long branches.

Here, we will explore the likelihood surface across various models and tips. 
We will use the ML tree from iqtree and scale it into time using a the model in Volz and Didelot's work, a gamma model with variance equal to it's mean.

${tex.block`
Gamma(\mu l_i,1)
`}

With the shape and scale parameterization.

## Maximum likelihood estimation on tree
Node heights are constrained which makes them tricky for standard mle. 
PAML uses a transformation to enable easier calculation. 
Let's work through that here so we can understand it and explore how sensitive our tree is to changes in node heights and rate estimates.

We will start with an example tree. 
With the number of mutations present on each branch.

```js

const nt= new Tree();
let {tree,nodes} = nt.addNodes(2)
const heights = [0.5,1.0]
const mu = 24;
for (const i of [0,1]){
    const root = tree.getRoot();
    const node = nodes[i]
    tree = tree.annotateNode(node,{h:1-heights[i]})
    tree = tree.addChild(root,node)
    tree = tree.setLength(node,Math.round(mu*(heights[i])))
   
}


```


<svg id="simpleTree" width=${width} height="300px"/>


```js
figure(tree,document.getElementById("simpleTree"));
```

In this example we have 2 parameters. The evolutionary rate ${tex`\mu`} and the height of the internal node ${tex`t_0`}. 
The height of ${tex`t_0`} has to be greater than ${heights[0]}.
So our parameter will be the height above this value and is defined on [0,${tex` \infty`}) .


```js
const ll = []

const llFunc = getLLfunction(tree,(a,n) => a.getAnnotation(n,'h'))

for(const rate of d3.range(0.1,35,0.11)){
    for(const height of d3.range(0.0,10,0.1)){
        const t = tree.setHeight(tree.getRoot(),height)
        const {l} = llFunc([rate,height])
        ll.push({rate,height,ll:l})
    }
}
const maxLL = ll[d3.maxIndex(ll,d=>d.ll)]
```


```js
Plot.plot({
  y:{label:"t0"},
    color: {type: "diverging"},
    marks: [Plot.contour(ll,{
        filter:d=>maxLL.ll - d.ll <50,
        x:"rate",
        y:"height",
      fill: "ll",
    //   stroke: "#fff",
    //   strokeOpacity: 0.5,
    //   thresholds: d3.range(0,10,2).map(d=>d3.max(ll,d=>d.ll)-d)
    }),
    Plot.dot(
        [maxLL],
        {
        x:"rate",
        y:"height"
    })
  ]
})
```

## Now let's introduce another tip

```js
let {tree:t3,nodes:n3} = tree.addNodes(2)
const oldRoot = t3.getRoot();
t3 = t3.setRoot(n3[0])

t3 = t3.annotateNode(oldRoot,{mutations:12})
t3 = t3.addChild(n3[0],oldRoot)
t3 = t3.setLength(oldRoot,12)


t3 = t3.annotateNode(n3[1],{h:1.0})
t3 = t3.addChild(n3[0],n3[1]);
t3 = t3.setLength(n3[1],12)
```
<svg id="simpleTree3" width=${width} height="300px"/>


```js
figure(t3,document.getElementById("simpleTree3"));
```
Now we have 3 parameters. The root height is still bound to be greater than the oldest tip which is now ${d3.format("0.2")(d3.max([...tipIterator(t3)],d=>t3.getAnnotation(d,"h")))}. 
The other internal node is bound between the root and its oldest descendent 0.5.

We now introduce a transformation so that we can optimize on a parameter bound on (0,1).
For internal node ${tex`t_i`} we define ${tex`x_i`} as its height as a proportion of the its ancestor's height (${tex`t_A`}) and its oldest fixed descendent (${tex`t_L`}) , 

${tex.block`
    x_i= \frac{(t_i - t_L)}{(t_A - t_L)}
`}

and

${tex.block`
    t_i= t_L + x_i (t_A - t_L)
`}

We'll fixed the root height to 1.5 and the rate to 24 and plot the likelihood function as a function of x_i


```js 
const ni = t3.getNode(0)
const llFunc3 = getLLfunction(t3, (tre,n)=>tre.getAnnotation(n,'h'))
const ll3 = []
for(const xi of d3.range(0,1.0,0.05)){
    const {l} =llFunc3([24,0.5,xi])
    ll3.push({xi,ll:l})
}
```

```js 
const {loss,transform,getInitial,getTimeTree} = getLoss(t3, (t,n)=>t.getAnnotation(n,'h'))
display(getInitial(24,3.5,0.5))
```
```js echo 
const solution = nelderMead(loss, getInitial(24,3.5,0.5));
display(solution)
display(transform(solution.x))
```

```js
Plot.plot({
    marks:[
    Plot.line(ll3,{
        x:"xi",
        y:"ll"
    })
    ]
})
```
Now we'll look over both node heights

```js
const ll3_2 = []
for(const t0 of d3.range(0.05,5,0.05)){
    for(const xi of d3.range(0,1.0,0.01)){
        const {l,heights} =llFunc3([24,t0,xi])
        ll3_2.push({xi,ll:l,t0,heights})
    }
}
```


```js
const maxHeights = ll3_2[d3.maxIndex(ll3_2,d=>d.ll)]

```

<svg id="simpleTreeBest" width=${width} height="300px"/>


```js
let bestTree= getTimeTree(solution.x);
for(const node of postOrderIterator(bestTree)){
  bestTree = bestTree.setHeight(node,maxHeights.heights[node.number])
}

figure(bestTree,document.getElementById("simpleTreeBest"));
display(bestTree)
```

<div class="grid grid-cols-2">
<div class="card">

```js
Plot.plot({
  color: {type: "diverging"},
    y:{domain:[0,3]},

    marks: [Plot.contour(ll3_2,{
        filter:d=>maxHeights.ll - d.ll <20,
        x:"xi",
        y:"t0",
      fill: "ll",
    //   stroke: "#fff",
    //   strokeOpacity: 0.5,
    //   thresholds: d3.range(0,10,2).map(d=>d3.max(ll,d=>d.ll)-d)
    }),
    Plot.dot(
        [maxHeights],
        {
        x:"xi",
        y:"t0"
    })
  ]
})
```

</div>
<div class="card">

```js
Plot.plot({
  color: {type: "diverging"},
  x:{domain:[0,3]},
  y:{domain:[0,3]},
    marks: [Plot.contour(ll3_2,{
        filter:d=>maxHeights.ll - d.ll <20,
        x:d=>d.heights[3],
        y:d=>d.heights[0],
      fill: "ll",
    //   stroke: "#fff",
    //   strokeOpacity: 0.5,
    //   thresholds: d3.range(0,10,2).map(d=>d3.max(ll,d=>d.ll)-d)
    }),
    Plot.dot(
        [maxHeights],
        {
        x:d=>d.heights[3],
        y:d=>d.heights[0],
    })
  ]
})
```
</div>
</div>

The correct answer is very close to the expected height of 1.5 and 1.
It is interesting to see how the transformation changes the likelihood surface such that we are more sensitive to the root height than the internal node height. 

---
# Ebola

Here is the ml ebola tree with clusters highlighted.

```js
const tipData = FileAttachment("/data/processed/latLong.tsv").tsv({ typed: true });
```

```js

const treeString  =  FileAttachment('/results/iqtree/set19_best.treefile').text()
                        .then(text => text.replace("KC242791|Bonduni|DRC|1977-06-15","KC242791|Bonduni|DRC|1977-06") // re-rename taxa. uncertainty in date fixed for paml
                                  .replace("KC242793|1Eko|Gabon|1996-02-15","KC242793|1Eko|Gabon|1996-02")
                                  .replace("KF113529|Kelle_2|COG|2003-10-15","KF113529|Kelle_2|COG|2003-10")
                                  .replace("MH613311|Muembe.1|DRC|2017-05-15","MH613311|Muembe.1|DRC|2017-05")
                        ) 
```
```js
function getProcessedTree(nw){
  let tree = processTree(Tree.fromNewick(treeString),tipData)
const newOG = [ 
      "HQ613402|034-KS|DRC|2008-12-31",
      "HQ613403|M-M|DRC|2007-08-31",
      "KJ660347|Makona-Gueckedou-C07|Guinea|2014-03-20",
      "KC242800|Ilembe|Gabon|2002-02-23",
      "KF113529|Kelle_2|COG|2003-10",
    ].map(d=>tree.getNode(d));

    const newRootPosition = [tree.getMRCA(newOG),3999/(3999+2332)]; // paml puts length of 2332 and 3999 coming out the root in set8 srdt

    tree = tree.reroot(...newRootPosition).orderNodesByDensity(true)

     for(const node of tree.getNodes()){
      if(node!==tree.getRoot()){
        const l = tree.getLength(node)* 17751; // scale to mutations length of best partition
       tree =  tree.setLength(node,l)
      }
    }

  return tree;
}
```

```js
const ebola = getProcessedTree(treeString)

```


<svg id="ebolaTree" width=${width} height="500px"/>


```js 
figtree({
    svg:document.getElementById("ebolaTree"),
    tree: ebola,
    width,
    height:500,
    animated:true,
    margins:{top:20,left:40,right:100,bottom:70},
     baubles: [
      Branches({
        attrs: { stroke: 'black', strokeWidth: 2.5},
      }),
      Branches({
        filter:n=> !ebola.isRoot(n) && ebola.hasAnnotation(ebola.getParent(n),"cluster") && ebola.hasAnnotation(n,"cluster"),
        attrs: { stroke: n=> clusterScale(ebola.getAnnotation(n,'cluster')), strokeWidth: 4.5},
      }),
        CircleNodes({
        filter: (n) => ebola.isExternal(n),
        attrs:{
          r:7,
          fill: "black"
        },
      }),
    CircleNodes({
        filter: (n) => ebola.isExternal(n),
        attrs:{
         r:5,
        fill: n=> clusterScale(ebola.getAnnotation(n,'cluster')),
        },
      }),
            NodeLabels({
         filter: (n) => ebola.isExternal(n),
        attrs: {
          fill: "black",
          fontSize: 16,
          fontWeight: 300,
          fontFamily: "HelveticaNeue-Light",
          dx:(n) => ebola.isExternal(n) ?15:0,
        },
        text: (n) => ebola.getTaxon(n)?ebola.getTaxon(n).name:""
      }),
      BranchLabels({
        attrs: {
          fill: "black",
          fontSize: 16,
          fontWeight: 300,
          fontFamily: "HelveticaNeue-Light",
          dx:15,
        },
        text: (n) => d3.format("0.2")(ebola.getLength(n))
      })
     ]

});

```
For each cluster we will explore the likelihood landscape of the evolutionary rate and nodes.
```js
let trees = []
for(const node of preOrderIterator(ebola)){
  if(!ebola.isExternal(node)){
    if(ebola.hasAnnotation(node,"cluster")&& ebola.getParent(node)&& !ebola.hasAnnotation(ebola.getParent(node),"cluster")){
      // const t = ebola.toNewick(node,{ includeAnnotations: true })
      trees.push(Tree.fromTree(ebola,node))
    }
  }
}
display(trees)
```
```js echo
const fits = trees.map(t=>getLoss(t, (tre,n) => d3.max(tre.getExternalNodes(),d=>tre.getAnnotation(d,'date') - tre.getAnnotation(n,'date') )))
  // .filter((d,i)=>i===3)
  .map((l,i)=>{
    // const solution = nelderMead(l.loss,l.getInitial(5.0,1.0,0.5)).x
    const solution = conjugateGradient(l.lossG,l.getInitial(10.0,1.0,0.5)).x
    const output = l.transform(solution)
    output.mu = output.mu/17751; // updating for persite
    output.ci = l.getMu(solution).ci.map(d=>d/17751)
    // this is where we will get the range
    const tree = l.getTimeTree(solution)
    return {...output,tree,functions:l,solution,i:`${i}`}
  })
display(fits)
```


```js
Plot.plot({
  y:{axis:null,clamp:true},
  x:{tickFormat:d3.format("0.2e")},
  height:100,
  width:width,
  marginTop:10,
  marks:[
    // Plot.ruleY([0]),
    Plot.tickX(fits,{x:"mu",y:"i",strokeWidth:3,stroke:d=> clusterScale(d.tree.getAnnotationSummary("cluster").domain[0])}),
    Plot.link(fits,{x1:d=>d.ci[0],y1:'i',x2:d=>d.ci[1],y2:'i'})
  ]
})
```

You can see most of the clades are consistent with an evolutionary rate of ~2e-4.
There are two exceptions, the 2017/18 Nord Kivu clade is much faster, and the original 1970s clade is slower.

The 1970s rate likely does not exclude the faster rate seen in other clades. We get a log likelihood difference of 
${d3.format("0.2")(-1*fits[2].functions.loss(fits[2].solution)+fits[2].functions.loss([1.6,...fits[2].solution.slice(1)]))} if we only change the rate.
This assumes the root height does not change but is fixed to ml value. Changing it would only make the difference smaller.

There are many mutations in the Nord Kivu clade, perhaps the clade is in a novel host, 
or maybe one of the branches (the later one) ended in a novel host with an accelerated rate which leads to the estimated high rate.


If we do the same comparison above we find a log likelihood difference of ${d3.format("0.2")(-1*fits[3].functions.loss(fits[3].solution)+fits[3].functions.loss([1.6,...fits[3].solution.slice(1)]) )}. 
Perhaps updating the root height would help, but if the branch subtending the 2017 branch evolved at ~5 mutations/year 
with the other clades we'd expect that branch to be ${ d3.format("0.3")(ebola.getLength(ebola.getNode("MH613311|Muembe.1|DRC|2017-05"))/5)} years long. 
That's potentially possible, but it seems the whole clade likely evolves under an elevated rate.

```js
const i = view(Inputs.select([0,1,2,3,4,5], {label: "Result"}))
```

<svg id="timeTrees" width=${width} height="500px"/>


```js
ebolaTimeFigure(fits[i],document.getElementById("timeTrees"));
```




## Exploring temporal signal. 
The main point of this exploration is to determine the strength of evidence for an identifiable rate of evolution and whether or not the
estimated rate is consistent with the slow rate often found when the tree is rooted with the west african outbreak as an outgroup.

Only two of these clades appear to have identifiable rates on their own. 
This is not too surprising since most only 1 internal node. 
However, the brown clade above passes a tip dater test as does the 2007/8 clade (peach).
This small two tip clade likely passes because the earlier tip falls almost exactly on the internal node and so isochrnous model has little flexibility 

```js echo
display(trees.map(t=>({...treeDater([t ]),tree:t,taxa:t.getAnnotationSummary("taxa").domain})).filter(d=>d.diff*2>3.83))
```
When we fit a clock model to the 5 clades that appear to have similar rates of evolution we find an evolutionary rate of ${d3.format("0.2e")(middleTest.het.rate)}. 
Comparing this to an isochronous sampling model for these clades we find a log likelihood difference of ${d3.format("0.4")(middleTest.diff)} well above the 1.92 required to reject the null hypothesis that 
the isochronous model fits as well as the heterochronous model. 

Interestingly though we also see a heterchronous model wins out for the full tree!
(This is consistent with the PAML results and this rooting. )
While this model would not be preferred to the clock free one it does make sense that BEAST would find this rate and rooting during the MCMC. It is not approximating an isochronous tree, but does have an identifiable rate.

Let's see. Do the 4 clusters reject the the rate we find in the full tree ${d3.format("0.2e")(fullTreeFit.het.rate)}?
We find a rate of ${d3.format("0.2e")(middleTest.het.rate)} and logLikelihood of ${d3.format("0.4")(middleTest.het.LL)} in the free model. Fixing the rate to ${d3.format("0.2e")(fullTreeFit.het.rate)} and re-estimating node heights gives a loglikelihood of ${d3.format("0.4")(slowMiddleTrees.LL)}, which is worse but could be overcome by the increased data in the full dataset.


```js
const fullTreeFit = treeDater([ebola])
display(fullTreeFit)
```
```js
const middleTrees = trees.filter(t=>t.getAnnotationSummary("cluster").domain[0]!==7 && t.getAnnotationSummary("cluster").domain[0][0]!==1) // TODO update
```
```js
display(middleTrees)
```

```js
const middleTest = treeDater(middleTrees)
```

```js
const slowMiddleTrees = fitTrees(middleTrees,fullTreeFit.het.rate*17751) 
```

```js
function fitTrees(trees,rate){
    const hetModel = getLossAcrossTrees(trees,(tre,n) => d3.max(tre.getExternalNodes(),d=>tre.getAnnotation(d,'date') - tre.getAnnotation(n,'date') ),rate)
  const hetSolution = conjugateGradient(hetModel.lossG,hetModel.getInitial(null,Math.random()*3,Math.random()))
  const hetRate = hetModel.getMu(hetSolution.x)/17751
  const hetLL = -hetSolution.fx
  return {rate:hetRate,LL:hetLL}
}

function treeDater(trees){
  const hetModel = getLossAcrossTrees(trees,(tre,n) => d3.max(tre.getExternalNodes(),d=>tre.getAnnotation(d,'date') - tre.getAnnotation(n,'date') ))
  const hetSolution = conjugateGradient(hetModel.lossG,hetModel.getInitial(Math.random()*10,Math.random()*3,Math.random()))
  const hetRate = hetModel.getMu(hetSolution.x)/17751
  const hetLL = -hetSolution.fx

  const isoModel = getLossAcrossTrees(trees,(tre,n) => 1.0 , 1.0)
  const isoSolution = conjugateGradient(isoModel.lossG,isoModel.getInitial(null,Math.random()*3,Math.random()))
  const isoRate = isoModel.getMu(isoSolution.x)
  const isoLL = -isoSolution.fx

  const diff = hetLL - isoLL;
  return {het:{rate:hetRate,LL:hetLL},iso:{rate:isoRate,LL:isoLL},diff}
}
```


```js 
function getLLfunction(tree,heightGetter=(t,n)=>0.0){
  const data = [];
  const tl = [];
  const heights = []

  for(const n of preOrderIterator(tree,tree.getRoot())){
    if(n!==tree.getRoot()){ // don't have mutations on the root
        data[n.number]=tree.getLength(n)
    }
    if(!tree.isExternal(n)){
      tl[n.number] =(getTl(tree,n,heightGetter))
      
    }else{
    //save the external heights
    heights[n.number] = heightGetter(tree,n);
    }
  }
  
  
  // params is [mu, rootDiff, xs]
  return (params) => { // params are unconstrained
    let ll =0;
    // traversal to set all lengths and calculate ll
    const [mu,rootDiff,...xs]=params;

    heights[tree.getRoot().number] = tl[tree.getRoot().number]+rootDiff
    let internalCount = 0;
    
    for(const node of preOrderIterator(tree,tree.getRoot())){
        if(node === tree.getRoot()){
          continue;
        }
        if(!tree.isExternal(node)){
          const h = tl[node.number] + xs[internalCount]*(heights[tree.getParent(node).number]- tl[node.number])
          heights[node.number] = h;
          internalCount+=1;
        }
        const length =  heights[tree.getParent(node).number] - heights[node.number];
        ll+= gamma.logpdf(data[node.number],mu*length,1)
    }
  return {l:ll,heights:[...heights]} // so we don't overwrite the heights 
  }
}

```




<!-- Figures -->

```js
const ebolaTimeFigure = (output,svg)=>{
  const tree = output.tree;
  //add the rate
  const d3SVG = d3.select("#timeTrees")
      //remove the existing rate if needed
  d3SVG.select("#rate")
        .remove()
      d3SVG
      .append('g')
      .attr('id',"rate")
      .append("text")
      .text(`Rate: ${d3.format("0.3e")(output.mu)}`)
      .attr("x",10)
      .attr("y",400)

      figtree({
    svg,
    tree: tree,
    rectangularLayout,
    margins:{top:20,left:140,right:350,bottom:70},
    height:500,
    width,
    animate:true,
    axis:{
      gap:10,
      ticks:{format:d3.format("0"),number:3},
      title:{text:"years"},
      bars:{},
      reverse:true,
      // scaleBy:-1,
      offsetBy:d3.max(tree.getExternalNodes(),n=>tree.getAnnotation(n,"date"))
    },
    baubles: [
     
           Branches({
        filter:n=> !tree.isRoot(n) && (tree.hasAnnotation(tree.getParent(n),"cluster")|| tree.isRoot(tree.getParent(n))),
        attrs: { stroke: n=> clusterScale(tree.getAnnotation(n,'cluster')), strokeWidth: 5.5},
      }),
      Branches({
        attrs: { stroke: 'black', strokeWidth: 1.0},
      }),

      CircleNodes({
        filter: (n) => tree.isExternal(n),
        attrs:{
          r:7,
          fill: "black"
        },
      }),
      CircleNodes({
        filter: (n) => tree.isExternal(n),
        attrs:{
         r:5,
        fill: n=> clusterScale(tree.getAnnotation(n,'cluster')),
        },
      }),
      NodeLabels({
         filter: (n) => tree.isExternal(n),
        attrs: {
          fill: "black",
          fontSize: 16,
          fontWeight: 300,
          fontFamily: "HelveticaNeue-Light",
          dx:(n) => tree.isExternal(n) ?15:0,
        },
        text: (n) => tree.getTaxon(n)?tree.getTaxon(n).name:""
      }),
      NodeLabels({
         filter: (n) => tree.isRoot(n),
        attrs: {
          fill: "black",
          fontSize: 16,
          fontWeight: 300,
          fontFamily: "HelveticaNeue-Light",
          // dx:(n) => tree.isExternal(n) ?15:0,
        },
        text: (n) =>`${format("0.6")(d3.max(tree.getExternalNodes(),n=>tree.getAnnotation(n,"date")) - tree.getHeight(tree.getRoot()))}`
      }),
      BranchLabels({
        attrs: {
          fill: "black",
          fontSize: 16,
          fontWeight: 300,
          fontFamily: "HelveticaNeue-Light",
          dx:15,
        },
        text: (n) => d3.format("0.2")(tree.getLength(n))
      })
    ],
    opts: {}
  });
}
```
```js
const figure = (tree,svg)=>{
      figtree({
    svg,
    tree: tree,
    rectangularLayout,
    margins:{top:20,left:40,right:30,bottom:70},
    height:300,
    width,
    baubles: [
    //   Axis({
    //   gap:10,
    //   ticks:{format:d3.format("0.1")},
    //   title:{text:"years"},
    //   bars:{},
    // //   reverse:true,
    // //   scaleBy:-1,
    // }),
      Branches({
        attrs: { stroke: 'black', strokeWidth: 2.5},
      }),
      CircleNodes({
        filter: (n) => tree.isExternal(n),
        attrs:{
          r:7,
          fill: "black"
        },
      }),
      CircleNodes({
        filter: (n) => tree.isExternal(n),
        attrs:{
         r:5,
          fill:"steelblue",
        },
      }),
      NodeLabels({
         filter: (n) => tree.isExternal(n),
        attrs: {
          fill: "black",
          fontSize: 16,
          fontWeight: 300,
          fontFamily: "HelveticaNeue-Light",
          dx:(n) => tree.isExternal(n) ?15:0,
        },
        text: (n) => d3.format("0.2")(tree.getAnnotation(n,"h"))
      }),
      BranchLabels({
        attrs: {
          fill: "black",
          fontSize: 16,
          fontWeight: 300,
          fontFamily: "HelveticaNeue-Light",
          dx:15,
        },
        text: (n) => d3.format("0.2")(tree.getLength(n))
      })
    ],
    opts: {}
  });
}
```

