```js

// import { dateGuesser, pamlTable,pamlTree} from "/components/utils.js";
import {processPaml,  outGroup} from "/scripts/utils/tableUtils.js"
import * as d3 from "npm:d3";
import {ImmutableTree,figtree} from "@figtreejs/browser"
import {format} from "d3-format"
import {pamlTree} from "/components/utils.js"
```
# Temporal signal between clusters

Here we focus just on the between cluster trend, in order to better understand,
where the temporal signal seen in our and others analyses come from.


<div class="tip" label="P values">
Below is the likelihood difference threshold for rejecting 
the test model. If the difference in likelihood in less than that
in the table then we can not reject the nested model in favor 
of the more complex one.

|Correct model | test model | p=0.05 | p=0.01 |
|--------------|-----------|---------|--------|
| dr           | srdt      | 1.921   | 3.317  |
| dr           | sr        |  2.996  |  4.605 |
|srdt          |     sr    | 1.921   |  3.317 |



</div>


When we reduce the analyses to the between cluster trends 
we see that the 1970s root position is now preferred in the analyses.
There is little to distinguish the root position from the novel one
except in the 3rd positions and synonymous sites.

## GP

```js
const pamlGP = FileAttachment("/results/tipDater/set8_gp_cluster.json")
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



## Third position and intergenic regions

```js
const pamlCds3_ig = FileAttachment("/results/tipDater/set8_cds3_ig_cluster.json")
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

## Full genome

```js
const pamlBest = FileAttachment("/results/tipDater/set8_best_cluster.json")
  .json()
  .then((d) => {
    return d.map((d) => ({
      ...d,
      trees: d.trees.map((t) => ({ ...t, tree: ImmutableTree.fromNewick(t.tree) })),
    }));
  });
```


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


This analyses highlights that pervious studies, that have 
assumed or found the 1970s outgroup root, have been driven by the 
between cluster trend. 
However, the novel root position is no worse at accounting for these dynamics,
while also accounting for the with-in cluster dynamics. 
Because of this, it is supported by datasets that incorporate within and between cluster processes.

<div class='note'>
See "Rate exploration" for a within-cluster analysis
</div>

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