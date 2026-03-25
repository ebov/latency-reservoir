```js

// import { dateGuesser, pamlTable,pamlTree} from "/components/utils.js";
import {processPaml,  outGroup} from "/scripts/utils/tableUtils.js"
import * as d3 from "npm:d3";
import {ImmutableTree,figtree} from "@figtreejs/browser"
import {format} from "d3-format"
import {pamlTree} from "/components/utils.js"
```


# Likelihood ratio tests for temporal signal



<div class="tip" label="P values">
Below is the likelihood difference threshold for rejecting 
the test model. If the difference in likelihood in less than that
in the table then we can not reject the nested model in favor 
of the more complex one.

|Correct model | test model | p=0.05 | p=0.01 |
|--------------|-----------|---------|--------|
| dr           | srdt      | 5.535   | 7.543  |
| dr           | sr        |  6.296  |  8.406 |
|srdt          |     sr    | 1.921   |  3.317 |



</div>



Unlike what was seen in the set 11 analyses, here we find that we are not able 
to reject the srdt model in favor of the dr model in any data partition. 
We can also see that of the root positions tested - we find the novel root position
fits the best with the 1970s root always worse and increasingly so as we add more data
(gp→full genome).

We can also reject the sr model in favor of the dr and srdt models. 




_We are currently shameless ignoring multi-hypthesis testing_
## GP

```js
const pamlGP = FileAttachment("/results/tipDater/set8_gp.json")
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

Note that even though tip permutations favored the 1970s root position,
here the novel root position is significantly better. 
```js
const pamlCds3_ig = FileAttachment("/results/tipDater/set8_cds3_ig.json")
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
const pamlBest = FileAttachment("/results/tipDater/set8_best.json")
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

These finding support our hypothesis that there is temporal signal in a subset of the data
and that the evolutionary rate in this subset is identifiable. 

Note also that the West African root position is always worse than the novel position, 
but better than the accepted model that places the 1970s as an outgroup. 


### Chi-squared table

provided by paml
```
				Significance level

 DF    0.9950   0.9750   0.9000   0.5000   0.1000   0.0500   0.0100   0.0010

  1    0.0000   0.0010   0.0158   0.4549   2.7055   3.8415   6.6349  10.8276
  2    0.0100   0.0506   0.2107   1.3863   4.6052   5.9915   9.2103  13.8155
  3    0.0717   0.2158   0.5844   2.3660   6.2514   7.8147  11.3449  16.2662
  4    0.2070   0.4844   1.0636   3.3567   7.7794   9.4877  13.2767  18.4668
  5    0.4117   0.8312   1.6103   4.3515   9.2364  11.0705  15.0863  20.5150

  6    0.6757   1.2373   2.2041   5.3481  10.6446  12.5916  16.8119  22.4577
  7    0.9893   1.6899   2.8331   6.3458  12.0170  14.0671  18.4753  24.3219
  8    1.3444   2.1797   3.4895   7.3441  13.3616  15.5073  20.0902  26.1245
  9    1.7349   2.7004   4.1682   8.3428  14.6837  16.9190  21.6660  27.8772
 10    2.1559   3.2470   4.8652   9.3418  15.9872  18.3070  23.2093  29.5883

 11    2.6032   3.8157   5.5778  10.3410  17.2750  19.6751  24.7250  31.2641
 12    3.0738   4.4038   6.3038  11.3403  18.5493  21.0261  26.2170  32.9095
 13    3.5650   5.0088   7.0415  12.3398  19.8119  22.3620  27.6882  34.5282
 14    4.0747   5.6287   7.7895  13.3393  21.0641  23.6848  29.1412  36.1233
 15    4.6009   6.2621   8.5468  14.3389  22.3071  24.9958  30.5779  37.6973
  ```


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