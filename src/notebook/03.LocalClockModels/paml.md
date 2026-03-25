```js

// import { dateGuesser, pamlTable,pamlTree} from "/components/utils.js";
import {processPaml,  outGroup} from "/scripts/utils/tableUtils.js"
import * as d3 from "npm:d3";
import {ImmutableTree,figtree} from "@figtreejs/browser"
import {format} from "d3-format"
import {pamlTree} from "/components/utils.js"
```

<div class="warning">
Add trees here like on the local clock page in the latent section
</div>
# PAML analysis

This analysis places _a priori_ local clocks on several branches of the ebola tree.
We do not exhaustively search for the best model. Instead, we will look to see if 
the rooting identified above, and _srdt_ (now with more than 1 rate) still describes the data as well as the 
_dr_ model if we allow for dated tips and a few evolutionary rates. 
This analysis uses the whole genome in partitioned into 3 set. One for each codon position. 
Intergenic sites are added to the 3rd codon position.

# Set 11
We saw previously, that the classic dataset used to support a 1970s root failed tests of temporal signal.

Below we have added a local clock to the branches subtending the 2007/2008 outbreak as well as the 1995 outbreak.
We have included multiple rootings and the _sr_ model for comparison. 

```js
const paml11 = FileAttachment("/results/tipDater/set11_best.json")
  .json()
  .then((d) => {
    return d.map((d) => ({
      ...d,
      trees: d.trees.map((t) => ({ ...t, tree: ImmutableTree.fromNewick(t.tree) })),
    }));
  });
```

<div class="card">
<h2>Set 11 </h2>
        <svg id="set11Tree-fig" height="300px" width=${width}>
          </svg>
</div>

```js
const set11Selection = view(pamlTable(paml11,true))
```


```js
if(set11Selection){
figtree(pamlTree({pamlResults:set11Selection,width,height:300,id:"set11Tree-fig"}));
}
```

We fail to reject the local clock model with the novel root position. 
The West Aftrican outgroup would be rejected with p<0.05. 
All other models would also be rejected.

There is evidence of temporal signal in the classical set, but it required a different rooting and 
local clock model to capture the rate heterogeneity.

# Set 19

What if we include the full dataset now - all 19 genomes.

Here we have two local clock models. 
"clade"  places a local clock on the stem branch and external branches of each slow clade, while "stem" places them only on the branches
subtending the slow clades.

```js
const paml18 = FileAttachment("/results/tipDater/set19_best.json")
  .json()
  .then((d) => {
    return d.filter(d => d.analysis!=="srdtStem-x")
    .map((d) => ({
      ...d,
      trees: d.trees.map((t) => ({ ...t, tree: ImmutableTree.fromNewick(t.tree) })),
    }));
  });
```

<div class="card">
<h2>Set 19 </h2>
        <svg id="set18Tree-fig" height="300px" width=${width}>
          </svg>
</div>

```js
const set18Selection = view(pamlTable(paml18,true))
```


```js
if(set18Selection){
figtree(pamlTree({pamlResults:set18Selection,width,height:300,id:"set18Tree-fig"}));
}
```

<div class="warning" label="todo">
Add explanations for the other local clock models in the table
</div>

Two stem rooting and one clade rooting do not fit worse that the full _dr_ model - suggesting there is temporal signal in the data set
if we include local clocks. 
Interestingly stem models fit better than clade models suggesting the "slow-downs" are on the branches leading to the clades and
not within them. This is consistent with the trends in the root-to-tip plots. 

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