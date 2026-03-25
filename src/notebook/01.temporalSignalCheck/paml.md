```js

// import { dateGuesser, pamlTable,pamlTree} from "/components/utils.js";
import {processPaml,  outGroup} from "/scripts/utils/tableUtils.js"
import * as d3 from "npm:d3";
import {ImmutableTree,figtree} from "@figtreejs/browser"
import {format} from "d3-format"
import {pamlTree} from "/components/utils.js"
```

# Likelihood ratio tests for temporal signal

<!-- We saw previously that root-to-tip methods gave some indication of
a temporal signal in the classic dataset. However, the strength of this signal often
depended on the genome partition and was not well supported by permutations. -->

Here we will employ a statistical test developed by Rambaut, 2000 and implemented
in paml. We will compare the likelihood of a clock-free model (_dr - different rates for each branch_), with
those of two clock models : _sr-single rate (homochronous) and srdt-single rate dated tips(heterchronous sampling)_.
Previous models have assumed the _srdt_ model which has dated tips and an identifiable rate.

We will compare these models using a likelihood ratio test between nested models.
The p-val of this comparison is determined by the degrees of freedom (the difference in the number of parameters between models),
and the test statistic - twice the difference in log likelihoods.

All models use the same number of parameters for substitution models, and differ in the number of 
parameters which determine the branch lengths (expected substitution/site). 
The _dr_ model has a length for each branch in an unrooted tree (2n-3).
The _sr_ model has a parameter for each internal nodes on a rooted tree (n-1). 
The _srdt_ model has a parameter for each internal node and one more for the evolutionary rate (n). 
So long as the only difference is the clock rate model the degrees of freedom for the 
_dr_/_srdt_ test is (n-3) and that of _dr_/_sr_ is n-2.


In this analysis we will use the root positions suggested by the previous analysis.
This includes the 1970s root, the West African root, and the intermediate root suggested by the full set.
Some of the prior analyses preferred one of the 1970s tips and some preferred both as an outgroup. 
Here, we only use both as on outgroups since all give similar results below.


<div class="tip" label="P values">

We will reject the hypothesis that the _srdt_ model fits as well as the _dr_ 
model with a Type I error rate of 0.05 if the log likelihood difference is more than 7.75365.
The cutoff for an error rate of 0.01 is 10.0451.
We reject the _sr_ model with the same confidence if at log-likelihood differences of 8.4595 and 10.833.

We would reject the hypothesis that _sr_ fits as well as _srdt_  if the differences is 
greater than 1.92075 (p<0.05) or 3.31745 (p<0.01).
</div>

_We are currently shameless ignoring multi-hypthesis testing_
## GP

```js
const pamlGP = FileAttachment("/results/tipDater/set11_gp.json")
  .json()
  .then((d) => {
    return d.map((d) => ({
      ...d,
      trees: d.trees.map((t) => ({ ...t, tree: ImmutableTree.fromNewick(t.tree) })),
    }));
  });
```

GP is the fastest evolving coding region and has been used in past studies to 
support a temporal rooting in the 1970s. 


<div class="card">
<h2>GP tree</h2>
        <svg id="gpTree-fig" height="300px" width=${width}>
          </svg>
</div>

```js
const gpSelection = view(pamlTable(pamlGP,true))
```
```js
display(gpSelection)

```
```js
if(gpSelection){
figtree(pamlTree({pamlResults:gpSelection,width,height:300,id:"gpTree-fig"}));
}
```
In the table above we can see that we fail to reject the null model 
for one of the srdt rootings. This could be taken as evidence that
gp is evolving according to a molecular clock. But, the most likely
rooting has the West African outbreak as an outgroup. 

In fact, the 1970s root can be rejected with p<0.01.
It is the worse root position of all srdt roots tested here.

The difference between srdt and sr is not significant - 
suggesting that the evolutionary rate would not be identifiable if this dataset showed evidence of a molecular clock. 


## Third position and intergenic regions

```js
const pamlCds3_ig = FileAttachment("/results/tipDater/set11_cds3_ig.json")
  .json()
  .then((d) => {
    return d.map((d) => ({
      ...d,
      trees: d.trees.map((t) => ({ ...t, tree: ImmutableTree.fromNewick(t.tree) })),
    }));
  });
```

The rapidly evolving synonymous sites gave some indication of temporal signal in 
the permutation test. However, there is no evidence of either molecular clock model 
in this dataset.

However, there is evidence that within these two bad fitting models srdt fits better.
Take that with the grain of salt. 

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
const pamlBest = FileAttachment("/results/tipDater/set11_best.json")
  .json()
  .then((d) => {
    return d.filter(d=>!/Local/.test(d.analysis)).map((d) => ({
      ...d,
      trees: d.trees.map((t) => ({ ...t, tree: ImmutableTree.fromNewick(t.tree) })),
    }));
  });
```

Similar to what we saw, above , including the full genome (paritioned as 1,2, 3+intergenic)
does not support molecular clock model in this dataset of 11 genomes.


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



Also similar to what was seen in the cds3+ig analysis - srdt does better than sr 
even with the WA rooting. 

## Conclusions

These analyses do not offer support for the prevailing theory that
ebola emerged from a bottleneck near 1970 and evolved 
according to a strick clock until 2014.

The only dataset that fails to reject a molecular clock model is the gp partition, 
and that model does not fit significantly better than a homochronous sampling model, 
with unidentifiable rate and root age.

In the cds3+intergenic and full genome partitions, _srdt_ fits significantly bettern
than the _sr_ model.
How much of the preference for _srdt_ over _sr_ is due to within-cluster dynamics?
Might there be temporal signal within the geographic outbreak clusters that is 
diluted when we look at the whole dataset?

### Chi-squared table

Below is the Chi-squared table provided by paml.
The test statistic is twice the log-likelihood difference.
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