```js
import {processPaml,  outGroup} from "/scripts/utils/tableUtils.js"
import * as d3 from "npm:d3";
import {ImmutableTree,figtree} from "@figtreejs/browser"
import {format} from "d3-format"
import {pamlTree} from "/components/utils.js"
```


# Temporal signal between clusters
This analysis follows on a question raised at the end of the last analysis.

How much of the preference for srdt over sr is due to within cluster dynamics.
To my mind that is the main difference between the WA rooting of both models.

_Hypothesis: If we only use the first outbreak from each cluster we will find that the WA rooting is equivalent in both models_


<div class="tip" label="P values">

There are fewer parameters below because there are fewer branches in the tree.

The likelihood differences require to reject the null are 4.74385 and 6.63835 for _dr/srdt_
and 3.90735 and 5.67245 for _dr/sr_ (p<0.5 and p<0.01).

The degrees of freedom in _srdt/sr_ does not change.  
1.92075 (p<0.05) and 3.31745 (p<0.01).
</div>


## GP

```js
const pamlGP = FileAttachment("/results/tipDater/set11_gp_cluster.json")
  .json()
  .then((d) => {
    return d.map((d) => ({
      ...d,
      trees: d.trees.map((t) => ({ ...t, tree: ImmutableTree.fromNewick(t.tree) })),
    }));
  });
```


<div class="card">
<h2>GP tree</h2>
        <svg id="gpTree-fig" height="300px" width=${width}>
          </svg>
</div>

```js
const gpSelection = view(pamlTable(pamlGP,true))
```

```js
if(gpSelection){
figtree(pamlTree({pamlResults:gpSelection,width,height:300,id:"gpTree-fig"}));
}
```
This shows what we expect - very little difference between 
the _srdt_ and _sr_ models- with a slight preference for WA as an outgroup.
In fact here we do not reject the null for any model comparisons.

Again though, the 1970s root is the least supported of the roots.


## Third position and intergenic regions

```js
const pamlCds3_ig = FileAttachment("/results/tipDater/set11_cds3_ig_cluster.json")
  .json()
  .then((d) => {
    return d.map((d) => ({
      ...d,
      trees: d.trees.map((t) => ({ ...t, tree: ImmutableTree.fromNewick(t.tree) })),
    }));
  });
```

<div class="card">
<h2>CDS3+ig tree</h2>
        <svg id="cds3_igTree-fig" height="300px" width=${width}>
          </svg>
</div>

```js
const cds3_igSelection = view(pamlTable(pamlCds3_ig,true));
```
```js
if(cds3_igSelection){
figtree(pamlTree({pamlResults:cds3_igSelection,width,height:300,id:"cds3_igTree-fig"}));
}
```

Here we do see a little separation between the WA root in the _srdt_ and the _sr_ but still not enough
to reject the null with p<0.01.

## Full genome

```js
const pamlBest = FileAttachment("/results/tipDater/set11_best_cluster.json")
  .json()
  .then((d) => {
    return d.map((d) => ({
      ...d,
      trees: d.trees.map((t) => ({ ...t, tree: ImmutableTree.fromNewick(t.tree) })),
    }));
  });
```

Similar to what we saw, above, removing within-cluster clades removes
the distinction between the _srdt_ and _sr_ models. 

<div class="card">
<h2>Full genome tree</h2>
        <svg id="fullGenomeTree-fig" height="300px" width=${width}>
          </svg>
</div>

```js
const fullSelection = view(pamlTable(pamlBest,true));
```
```js
if(fullSelection){
figtree(pamlTree({pamlResults:fullSelection,width,height:300,id:"fullGenomeTree-fig"}));
}
```

## Conclusions

These findings do not support a molecular clock model for these data.
They  suggest that the between-cluster trend, which drives 
the root-to-tip analysis typically cited as evidence of temporal signal
is spurious. They also hint that there may be signal within outbreak clusters,
because without these clades _sr_ and _srdt_ are equivalent.

It is unlikely that the within-cluster trend matches the rate 
implied by the 1970s root-to-tip analysis.

```js
function pamlTable(data,flat=false){
    const processedData =  processPaml(data,flat)
      return Inputs.table(
        processedData,
    {
      columns: ["seqs", "analysis", "ll", "diff", "np", "df","p", "rate"],
      width:{
        rate:200
      },
      header: {
        seqs: "taxa",
        ll: "LL",
        diff: " Δ LL",
        rate: "rate",
        np: "nParams",
        df: "df",
        p:"p",
  
      },
      format: {
        rate: d=>Array.isArray(d)? d.map(k=>format("0.2e")(k)).join(", "): parseFloat(d)? format("0.2e")(d):d,
        p: d=>parseFloat(d)?highlight(d):d
      },
      sort: "ll",
      reverse: true,
      layout :"fixed",
      multiple: false,
      required:true,
      // rows:5,
      rows:18,
      value:processedData[0]
    }
  )
  }
  
  function highlight(x) {
    return htl.html`<div style="
      background: ${x < 0.01 ? 'var(--theme-red)' :  x > 0.05 ? 'var(--theme-green)': 'var(--theme-yellow)' };
      color: black;
      font: 10px/1.6 var(--sans-serif);
      width: 100%;
      float: right;
      padding-right: 3px;
      box-sizing: border-box;
      overflow: visible;
      display: flex;
      justify-content: end;">${format("0.2e")(x)}`
  }
```