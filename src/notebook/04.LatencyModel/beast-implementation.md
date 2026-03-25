```js
import {sericolaDensity} from "/components/sericola.js"

```
```js
const Rate06Bias09 = FileAttachment("r0.6b0.9.json").json().then(d=>d.data)
const Rate06Bias05 = FileAttachment("r0.6b0.5.json").json().then(d=>d.data)
const Rate01Bias05 = FileAttachment("r0.1b0.5.json").json().then(d=>d.data)
```

```js
const rate=0.6;
const bias= Bias==="0.9"?0.9:0.5
//opposite of beast indexing
const Q = [ -rate * (1 - bias), rate * (1 - bias),rate * bias, -rate * bias]
const tol =1e-10;
const length=10;
const JS0609 = d3.range(0,length+1,0.1).map(d=>({time:d,s:d/length,pdf:sericolaDensity(Q,length,d/length)/(d===0?1:length)}));

```

```js
const Bias = view(Inputs.radio(["0.9", "0.5"], {
  label: "Bias",
  value: "0.9"
}))
```

```js
const BEAST = Bias==="0.9"?Rate06Bias09:Rate06Bias05
```
# Latent model exploration

Here we are comparing the multiple implementations of the latent model in BEAST with those derived on previous pages.
The BEAST implementations are colored according to the name of the MarkovReward class. 
My own javascript implementations are represented by the grey lines and blocks.
The CDFs are also shown below for classes that support that implementation. 
The CDF at 0 is also given. Note the discontinuity at 0. 
This was not accounted for in the original implementation of the branchrate model, 
which assumed the proportion of time spent latent was (0,1) and not [0,1).


<div class="card">
${ Plot.plot({
    title: "PDF",
    x: { label: "time spent latent" },
    y: { type: "linear", domain:d3.extent(JS0609,d=>d.pdf) },
   fy: { axis: null },
    marks: [
      Plot.ruleY([0]),
      Plot.lineY(BEAST, {  x: "time", y: d=>d.pdf/d.conditional,fy:"implementation", stroke:"implementation" }),
      Plot.dot(BEAST, {  x: "time", y: d=>d.pdf/d.conditional, fy:"implementation", fill: "implementation" }),
      Plot.lineY(JS0609.filter(d=>d.time>0), {  x: "time", y: d=>d.pdf,stoke:"grey"  }),
      Plot.rect(BEAST, {
        filter: (d) => d.time === 0,
        x1: (d) => -0.1,
        x2: (d) => 0.1,
        y2:  d=>d.cdf/d.conditional,
        y1: 0,
        fill: "implementation",
        fy:"implementation"
      }),
      Plot.rect(JS0609, {
        filter: (d) => d.time === 0,
        x1: (d) => -0.3,
        x2: (d) => -0.1,
        y2:  d=>d.pdf,
        y1: 0,
        fill: "grey",
      }),
      Plot.text(
      BEAST,
      Plot.selectFirst({
        fy: "implementation",
        text: "implementation",
        frameAnchor: "top-left",
      })
      )
      ]
  })}

</div>

<div class="card">
${Plot.plot({
    title: "CDF",
    x: { label: "time spent latent" },
    y:{domain:[0,1]},
    marks: [
      Plot.ruleY([0]),
      Plot.lineY(BEAST, { x: "time", y: d=>d.cdf/d.conditional ,stroke:"implementation"}),
      Plot.dot(BEAST, {x: "time", y: d=>d.cdf/d.conditional, fill: "implementation",r:d=>d.implementation==="twoStateSericolaSeriesMarkovReward"?4:1 }),
      Plot.ruleY([1])
    ]
  })}
</div>



For our analyses we will use the TwoStateOccupancyMarkovReward class and ensure the 
branch rate model  accounts for the following:
1) the discontinuity at 0  
2) the jacobian involved in sampling over [0,1)
