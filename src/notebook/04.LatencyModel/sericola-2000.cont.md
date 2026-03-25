# Working towards the full model

Here we extend the previous developments to calculate the
cdf and pdf of time spent in the latent state.
These calculations use the number of latent periods determined on the pervious page.
This work represents reimplementation of the TwoStateOccupancyMarkovReward class in BEAST.


```js
import {require} from "npm:d3-require";
const poisson = require("https://cdn.jsdelivr.net/gh/stdlib-js/stats-base-dists-poisson@umd/browser.js")
import {getDensities,exp,identity} from "/components/sericola.js"
import * as d3 from "npm:d3";
```

```js
const branchLength = view(Inputs.range([1, 20], { label: "length", step: 1 }));
```

```js
const rate = view(Inputs.range([0, 2], { label: "rate", step: 0.01 }));
```
```js
const bias = view(Inputs.range([0, 1], { label: "bias", step: 0.1 }));
```

```js 
// opposite of beast indexing. 
const Q = [  -rate * (1 - bias),rate * (1 - bias), rate * bias, -rate * bias]
const tol =10e-10
const dim = Math.sqrt(Q.length)
const lambda = d3.max(
        Q.filter((d, i) => Math.floor(i / dim) === i % dim).map((d) => -d)
      )
const maxN  = poisson.quantile(1-tol, lambda * branchLength);
```

```js 
const {cdfWt,pdfWt} = getDensities(Q,maxN,branchLength)
```
```js 
const P = Q.map((d, i) => identity[i] + d / lambda)

const conditional = d3.sum(
    d3.range(maxN + 1).map((d) => exp(P, d)[3] * poisson.pmf(d, branchLength * lambda))
  );
```

```js
const cdf = d3
    .range(0,(branchLength + 1),0.1)
    .map((d) => ({ s: d ,prop: d/(branchLength), cdf: cdfWt(d )[3] / conditional }))
    .filter((d) => d.cdf > 0);
const pdf = d3
    .range(0,(branchLength + 1),0.1)
    .map((d) => ({ s: d, prop: d/(branchLength),pdf: pdfWt(d)[3] / conditional }));

```

<div class="grid grid-cols-2">
<div class="card">
${Plot.plot({
    title: "Normalized cdf",
    x: { label: "time spent latent" },
    marks: [
      Plot.ruleY([0]),
      Plot.lineY(cdf, { x: "s", y: "cdf" }),
      Plot.dot(cdf, { x: "s", y: "cdf", fill: "grey" })
    ]
  })}
</div>

<div class="card">
${ Plot.plot({
    title: "Normalized pdf",
    x: { label: "time spent latent" },
    // y: { type: "linear", ticks: 5 },
    marks: [
      Plot.ruleY([0]),
      Plot.lineY(pdf, { filter: (d) => d.s > 0, x: "s", y: "pdf" }),
      Plot.dot(pdf, { filter: (d) => d.s > 0, x: "s", y: "pdf", fill: "grey" }),
      Plot.rect(pdf, {
        filter: (d) => d.s === 0,
        x1: (d) => d.s - 0.05,
        x2: (d) => d.s + 0.05,
        y2: "pdf",
        y1: 0,
        fill: "grey"
      })
    ]
  })}
</div>

</div>

## Proportion of time spent latent

He we plot the cdf and pdf of proportion of time spent latent rather than the time itself. 
When converting the pdf we need to account for a jacobian and multiply the density of (proportion) by the branch length.
If we don't - then the integral, here approximated with trapezoidal integration does not approach 1.
```js
const includeJacobian = view(Inputs.radio(["yes", "no"], {
  label: "Include Jacobian",
  value: "yes"
}))
```

```js
const jacobian = includeJacobian==="yes"?branchLength:1;
```


```js
const allBut0 = pdf.filter((d,i)=>d.prop>0)
      .map((d, i, all) => {
        if (i < all.length - 1) {
          return (
            ((all[i+1].prop-d.prop)*
              (d.pdf*jacobian +
                (all[i+1].pdf * jacobian))) /
            2
          );
        } else {
          return 0;
        }
      })
      .filter((d) => !isNaN(d))
      .reduce((acc, curr) => acc + curr, 0);
const pointMass = cdf[0].cdf;
 
const trapIntegral = {allBut0, pointMass, all: allBut0 + pointMass };

```

<div class="grid grid-cols-2">
<div class="card">
${Plot.plot({
    title: "Normalized cdf",
    x: { label: "Proportion spent latent" },
    marks: [
      Plot.ruleY([0]),
      Plot.lineY(cdf, { x: "s", y: "cdf" }),
      Plot.dot(cdf, { x: "s", y: "cdf", fill: "grey" })
    ]
  })}
</div>

<div class="card">
${ Plot.plot({
    title: `Normalized pdf - integral: ${d3.format("0.2")(trapIntegral.all)}` ,
    x: { label: "Proportion spent latent" },
    // y: { type: "linear", ticks: 5 },
    marks: [
      Plot.ruleY([0]),
      Plot.lineY(pdf, { filter: (d) => d.prop > 0, x: d=>d.prop, y: d=>d.pdf*jacobian }),
      Plot.dot(pdf, { filter: (d) => d.prop > 0, x: d=>d.prop, y: d=>d.pdf*jacobian, fill: "grey" }),
      Plot.rect(pdf, {
        filter: (d) => d.prop === 0,
        x1: (d) => d.prop - 0.005,
        x2: (d) => d.prop + 0.005,
        y2: "pdf",
        y1: 0,
        fill: "grey"
      })
    ]
  })}
</div>

</div>


```js
// display(trapIntegral)
```