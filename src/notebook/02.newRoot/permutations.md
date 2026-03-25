```js
import {getP} from "/components/utils.js"
import {densityPlot} from "/components/densityPlot.js";
import {rttPlot} from "/components/rttPlot.js";
import {ImmutableTree as Tree,figtree,CircleNodes,Branches,rectangularLayout,NodeLabels} from "@figtreejs/browser"

```

```js

function makeDensityPlot(permutations,observation,pCriteria,testStat,width){
    return html`
        <div >
    <h2>${testStat}=${d3.format("0.4")( observation)} (${getP(permutations,observation,pCriteria)}) </h2>
     ${densityPlot(permutations,{width,height:200,truth:observation  })}
    </div>
    `
}
function makeRTT(tree,width){
 return html`${rttPlot(tree,{width })}`
}

function processData({permutationRMS,observationRMS,permutationCor,observationCor,corTree,rmsTree}){
    const output ={maxCorrelation:{
        tree:corTree,
        permutations:permutationCor.map(d=>d.rms),
        observation:observationCor.map(d=>d.rms)[0]
    },minRMS:{
        tree:rmsTree,
        permutations:permutationRMS.map(d=>d.r),
        observation:observationRMS.map(d=>d.r)[0]
    }}
return output;

}

function makePanel(data,incomingWidth){
    //data = {maxCorrelation:{permutations,observation,tree},minRMS:{permutations,observations,tree}}
    return html`
<div class="grid grid-cols-2">
    <div class="card">
        <h2> Maximizing correlation </h2>
        <h3>Root-to-tip</h3>
        ${makeRTT(data.maxCorrelation.tree,width)}
        <h3>Permutation Test</h3>
        ${makeDensityPlot(data.maxCorrelation.permutations,data.maxCorrelation.observation,"lesser","rms",width)}  
    </div>
    <div class="card">
        <h2> Minimizing residual mean squared </h2>
        <h3>Root-to-tip</h3>
        ${makeRTT(data.minRMS.tree,width)}
        <h3>Permutation Test</h3>
        ${makeDensityPlot(data.minRMS.permutations,data.minRMS.observation,"greater","r",width)}  
    </div>
</div>
    `
}
```

# Tip Permutations
We hypothesized that the lack of support for a molecular clock model in the 
first 11 outbreak dataset was due to rate heterogeneity in branches leading to 3 samples.

Here we have removed those samples and repeated the tip permutation tests on the remaining 
8 genomes. 




## GP

<div class="warning">
GP does not account for different codon sites. 
Might this affect the analyses?
</div>



### Full set
```js
const gpFullRMS = FileAttachment("/analyses/permutations/set8_gp.rms.tsv").tsv({typed: true});
const gpFullCor = FileAttachment("/analyses/permutations/set8_gp.cor.tsv").tsv({typed: true});

const gpObsRMS = FileAttachment("/analyses/permutations/set8_gp.obs.rms.tsv").tsv({typed: true});
const gpObsCor = FileAttachment("/analyses/permutations/set8_gp.obs.cor.tsv").tsv({typed: true});


const [gpCorTree,gpRmsTree] = await FileAttachment("/analyses/permutations/set8_gp.trees")
  .text()
  .then(d=>d.split("\n")
    .filter(d=>d.length>0)
    .map(d=>Tree.fromNewick(d))
    )
```

```js
const gpData = processData({permutationRMS:gpFullRMS,
                            observationRMS:gpObsRMS,
                            permutationCor:gpFullCor,
                            observationCor:gpObsCor,
                            corTree:gpCorTree,
                            rmsTree:gpRmsTree
                            })
```



Tip permutations on the GP partition find evidence for temporal signal by both rooting 
metrics; however, the metrics find different root positions.

<div class="card">
    <h2>Unrooted tree</h2>
    we will add nodes on this tree to represent the root positions for correlation/ rms rooting
</div>

<div >
${resize((width)=>makePanel(gpData,width))}
</div>


### Clustered permutations

```js
const gpClusterRMS = FileAttachment("/analyses/permutations/set8_cluster_gp.rms.tsv").tsv({typed: true});
const gpClusterCor = FileAttachment("/analyses/permutations/set8_cluster_gp.cor.tsv").tsv({typed: true});
const gpClusterObsRMS = FileAttachment("/analyses/permutations/set8_cluster_gp.obs.rms.tsv").tsv({typed: true});
const gpClusterObsCor = FileAttachment("/analyses/permutations/set8_cluster_gp.obs.cor.tsv").tsv({typed: true});

const [gpCorTreeCluster,gpRmsTreeCluster] = await FileAttachment("/analyses/permutations/set8_cluster_gp.trees")
  .text()
  .then(d=>d.split("\n")
    .filter(d=>d.length>0)
    .map(d=>Tree.fromNewick(d))
    )
```

```js
const gpClusterData = processData({permutationRMS:gpClusterRMS,
                            observationRMS:gpClusterObsRMS,
                            permutationCor:gpClusterCor,
                            observationCor:gpClusterObsCor,
                            corTree:gpCorTreeCluster,
                            rmsTree:gpRmsTreeCluster
                            })
```
<div class="card">
    <h2>Unrooted tree</h2>
    we will add nodes on this tree to represent the root positions for correlation/ rms rooting
</div>

<div>
${resize((width)=>makePanel(gpClusterData,width))}
</div>

Removing the within clade dynamics results in the same root position observed when rooting for rms above, 
and maintains the signal despite the small dataset. 

## Third codon positions and intergenic regions
 
 As seen in previous analyses these sites show fastest evolutionary rate,
 however, that signal is not supported by the cluster analysis where the rooting does not reach significance.

### Full data set
```js
const cds3_igFullRMS = FileAttachment("/analyses/permutations/set8_cds3_ig.rms.tsv").tsv({typed: true});
const cds3_igFullCor = FileAttachment("/analyses/permutations/set8_cds3_ig.cor.tsv").tsv({typed: true});

const cds3_igObsRMS = FileAttachment("/analyses/permutations/set8_cds3_ig.obs.rms.tsv").tsv({typed: true});
const cds3_igObsCor = FileAttachment("/analyses/permutations/set8_cds3_ig.obs.cor.tsv").tsv({typed: true});


const [cds3_igCorTree,cds3_igRmsTree] = await FileAttachment("/analyses/permutations/set8_cds3_ig.trees")
  .text()
  .then(d=>d.split("\n")
    .filter(d=>d.length>0)
    .map(d=>Tree.fromNewick(d))
    )
```

```js
const cds3_igData = processData({permutationRMS:cds3_igFullRMS,
                            observationRMS:cds3_igObsRMS,
                            permutationCor:cds3_igFullCor,
                            observationCor:cds3_igObsCor,
                            corTree:cds3_igCorTree,
                            rmsTree:cds3_igRmsTree
                            })
```
<div class="card">
    <h2>Unrooted tree</h2>
    we will add nodes on this tree to represent the root positions for correlation/ rms rooting
</div>

<div >
${resize((width)=>makePanel(cds3_igData,width))}
</div>





### Clustered permutations

<div class="warning">
Are we getting the same number of permutations as above? 
There should be 24. Why does the p-value suggest 8?
</div>




```js
const cds3_igClusterRMS = FileAttachment("/analyses/permutations/set8_cluster_cds3_ig.rms.tsv").tsv({typed: true});
const cds3_igClusterCor = FileAttachment("/analyses/permutations/set8_cluster_cds3_ig.cor.tsv").tsv({typed: true});
const cds3_igClusterObsRMS = FileAttachment("/analyses/permutations/set8_cluster_cds3_ig.obs.rms.tsv").tsv({typed: true});
const cds3_igClusterObsCor = FileAttachment("/analyses/permutations/set8_cluster_cds3_ig.obs.cor.tsv").tsv({typed: true});

const [cds3_igCorTreeCluster,cds3_igRmsTreeCluster] = await FileAttachment("/analyses/permutations/set8_cluster_cds3_ig.trees")
  .text()
  .then(d=>d.split("\n")
    .filter(d=>d.length>0)
    .map(d=>Tree.fromNewick(d))
    )
```

```js
const cds3_igClusterData = processData({permutationRMS:cds3_igClusterRMS,
                            observationRMS:cds3_igClusterObsRMS,
                            permutationCor:cds3_igClusterCor,
                            observationCor:cds3_igClusterObsCor,
                            corTree:cds3_igCorTreeCluster,
                            rmsTree:cds3_igRmsTreeCluster
                            })
```
<div class="card">
    <h2>Unrooted tree</h2>
    we will add nodes on this tree to represent the root positions for correlation/ rms rooting
</div>

<div>
${resize((width)=>makePanel(cds3_igClusterData,width))}
</div>


## Full genome

As seen with GP - the full dataset (with codon partitioning) seems to support temporal signal 
with the root position depending on what metric is used. 

This signal disappears in the cluster analysis which needs more investigation.

### Full data set
```js
const bestFullRMS = FileAttachment("/analyses/permutations/set8_best.rms.tsv").tsv({typed: true});
const bestFullCor = FileAttachment("/analyses/permutations/set8_best.cor.tsv").tsv({typed: true});

const bestObsRMS = FileAttachment("/analyses/permutations/set8_best.obs.rms.tsv").tsv({typed: true});
const bestObsCor = FileAttachment("/analyses/permutations/set8_best.obs.cor.tsv").tsv({typed: true});


const [bestCorTree,bestRmsTree] = await FileAttachment("/analyses/permutations/set8_best.trees")
  .text()
  .then(d=>d.split("\n")
    .filter(d=>d.length>0)
    .map(d=>Tree.fromNewick(d))
    )
```

```js
const bestData = processData({permutationRMS:bestFullRMS,
                            observationRMS:bestObsRMS,
                            permutationCor:bestFullCor,
                            observationCor:bestObsCor,
                            corTree:bestCorTree,
                            rmsTree:bestRmsTree
                            })
```
<div class="card">
    <h2>Unrooted tree</h2>
    we will add nodes on this tree to represent the root positions for correlation/ rms rooting
</div>

<div >
${resize((width)=>makePanel(bestData,width))}
</div>




### Clustered permutations

<div class="warning">
Are we getting the same number of permutations as above? 
There should be 24. Why does the p-value suggest 8?
</div>

```js
const bestClusterRMS = FileAttachment("/analyses/permutations/set8_cluster_best.rms.tsv").tsv({typed: true});
const bestClusterCor = FileAttachment("/analyses/permutations/set8_cluster_best.cor.tsv").tsv({typed: true});
const bestClusterObsRMS = FileAttachment("/analyses/permutations/set8_cluster_best.obs.rms.tsv").tsv({typed: true});
const bestClusterObsCor = FileAttachment("/analyses/permutations/set8_cluster_best.obs.cor.tsv").tsv({typed: true});

const [bestCorTreeCluster,bestRmsTreeCluster] = await FileAttachment("/analyses/permutations/set8_cluster_best.trees")
  .text()
  .then(d=>d.split("\n")
    .filter(d=>d.length>0)
    .map(d=>Tree.fromNewick(d))
    )
```

```js
const bestClusterData = processData({permutationRMS:bestClusterRMS,
                            observationRMS:bestClusterObsRMS,
                            permutationCor:bestClusterCor,
                            observationCor:bestClusterObsCor,
                            corTree:bestCorTreeCluster,
                            rmsTree:bestRmsTreeCluster
                            })
```
<div class="card">
    <h2>Unrooted tree</h2>
    we will add nodes on this tree to represent the root positions for correlation/ rms rooting
</div>

<div>
${resize((width)=>makePanel(bestClusterData,width))}
</div>

## Conclusion 

We see stronger evidence for temporal signal in these 8 genomes; however, 
these tests are not able to distinguish between the 1970s root position 
and the novel root position mentioned above.
