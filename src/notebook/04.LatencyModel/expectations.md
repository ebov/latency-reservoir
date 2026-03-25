```js
import {getDensities,identity,exp} from "/components/sericola.js"
import  poisson  from "@stdlib/stats-base-dists-poisson";
import  gamma  from "@stdlib/stats-base-dists-gamma";
import {format} from "d3-format"

```
# Expectations for the latent model

What is reasonable prior for the rate of latency?

I don't know that I have a prior for how much time a branch of length 
x should spend in latency. 
But it seems we might have some sense of whether or not
we expect any latency on a branch of length x?


```js
const rate = view(Inputs.range([0.002, 1], { label: "rate", step: 0.002 }))
```
```js
const bias = view(Inputs.range([0, 1], { label: "bias", step: 0.02 }))
```

```js 
// opposite of beast indexing. 
const Q = [  -rate * (1 - bias),rate * (1 - bias), rate * bias, -rate * bias]
```

```js
const branchLengths = d3.range(5,105,5)
const proportions = [0]// d3.range(0,1.0,0.02)
const tol = 1e-10;
```
```js
const LL = (function(){
    const output=[];
    for(const bl of branchLengths){
        // doing this here allows us to cache results between samples
        const dim=Math.sqrt(Q.length)
        const lambda = d3.max(
            Q.filter((d, i) => Math.floor(i / dim) === i % dim).map((d) => -d)
        )
        const P = Q.map((d, i) => identity[i] + d / lambda);
        const maxN  = poisson.quantile(1-tol, lambda * bl);

        const conditional = d3.sum(
            d3.range(maxN + 1).map((d) => exp(P, d)[3] * poisson.pmf(d, bl * lambda))
        );
        const {cdfWt,pdfWt} = getDensities(Q,maxN,bl)
        for (const s of proportions){
            let density =  pdfWt(s*bl)[3]/conditional; // if s===0 this calls the cdf
            if(s>0){
                density*=bl;
            }
            output.push({time:bl,proportion:s,LL:Math.log(density)})
            // yield output;
        }
    }
    return output
})();
```
<div class="card">
${Plot.plot({
    title: "Probability of no latency",
        color:{ legend:true,scheme:"Magma"},
    marks:[
        //Plot.cell(LL,{x:"time",y:"proportion",fill:"LL"})
        Plot.line(LL.filter(d=>d.proportion===0 && d.time>0),{x:"time",y:d=>Math.exp(d.LL),stroke:"black"}),
        Plot.areaY(LL.filter(d=>d.proportion===0  && d.time>0),{x:"time",y:d=>Math.exp(d.LL),fill:"grey"}),
        Plot.tip(LL.filter(d=>d.proportion===0  && d.time>0), Plot.pointerX({x: "time", y: d=>Math.exp(d.LL)}))
    ]
})}
</div>

A latent rate of 0.05 gives us about a 50% chance of no latency over 50 years while one around 0.1 does the same 
for a time period of 25 years, provided the bias is 0.5. 

## Prior exploration

What if we use a ctmc rate prior with the root height as the length. 
This would mean we expect half a transition between latency and replication in the duration of the tree. 
I think this makes more sense than the tree length since latency resets at each node.

```js
const step = 0.001
```

```js
const shape = 0.5
```
```js
const scale = view(Inputs.range([50, 150], { label: "Root Height", step: 10}))
```


```js
const g = gamma.Gamma(shape,1/scale)
```

```js
const gammaDist = d3.range(0,1+step,step)
                    .map(d=>({x:g.quantile(d),pdf:g.pdf(g.quantile(d))}))
                    .filter(d=>isFinite(d.pdf)&&isFinite(d.x))
                    //trapintegration
                    .map((d, i, all) => {
                        if (i < all.length - 1) { 
                        const x0 = d.x;
                        const x1 =all[i+1].x;

                        const area = g.cdf(x1)-g.cdf(x0);
                        return ({...d,x0,x1,area});
                        } else {
                        return d;
                        }
                    })
```


<div class="grid grid-cols-2">
    <div class="card">
    ${Plot.plot({
        title:`Gamma distribution : Mean: ${d3.format("0.3")(shape/scale)}`,
        x:{type:'log',tickFormat:d3.format("0.1e")},
        marks:[
            //Plot.rectY(gammaDist,{x1:d=>d.x0,x2:d=>d.x1, y:"y1",fill:"grey"}),
            Plot.line(gammaDist,{x:"x",y:'pdf',stroke:"black"}),
            Plot.areaY(gammaDist,{x:"x",y:'pdf',fill:"grey"})
        ]
    })}
    </div>
    <div class="card">
    ${Plot.plot({
        title: "Probability of no latency",
        marks:[
            Plot.line(integrated,{x:"time",y:"probability", stroke:"black"}),
            Plot.areaY(integrated,{x:"time",y:"probability", fill:"grey"}),
            Plot.tip(integrated, Plot.pointerX({x: "time", y:"probability", }))
        ]
    })}
    </div>
</div>




```js
// const integrated = (function* (){
const integrated = (function (){
    const output=[];
    const s=0;

    for(const bl of d3.range(0.1,2.1,0.1).map(d=>d*scale)){
            const r = shape/scale; // mean of the gamma
            const Q2 = [  -r * (1 - bias),r * (1 - bias), r * bias, -r * bias]
            // doing this here allows us to cache results between samples
            const dim=Math.sqrt(Q2.length)
            const lambda = d3.max(
            Q2.filter((d, i) => Math.floor(i / dim) === i % dim).map((d) => -d)
            )
            const P = Q2.map((d, i) => identity[i] + d / lambda);
            const maxN  = poisson.quantile(1-tol, lambda * bl);

            const conditional = d3.sum(
                d3.range(maxN + 1).map((d) => exp(P, d)[3] * poisson.pmf(d, bl * lambda))
            );
            const {cdfWt,pdfWt} = getDensities(Q2,maxN,bl)
            let density =  pdfWt(s*bl)[3]/conditional; // if s===0 this calls the cdf
        output.push({time:bl,probability:density})
        // yield output;
    }
    return output;
})();
```
```js
display(gammaDist)
```


It's not possible to have a branch longer than the root height.
The selector below goes above 1 to highlight how the distribution of time spent latent changes relative to the scale parameter in the prior.


```js
const length = view(Inputs.range([0.01,50], { label: "length relative to one above", step: 0.01}))
```

<div class="card">
${Plot.plot({
    title: "Density of proportion of time spent latent",
    marginLeft:50,
    y:{grid:true,tickFormat:format("0.1e")},
    marks:[
        Plot.rectY(fullLengthDistro,{filter:d=>d.s>-1,x1:d=>d.s-sStep/4,x2:d=>d.s+sStep/4,y:d=>d.pdf,fill:"grey"})
    ]
})}
</div>



```js
const fullLengthDistro = d3.rollups(fullDistribution, v=>d3.sum(v,d=>d.probability), g=>g.s).map(d=>({s:d[0],pdf:d[1]}))
```
```js
const sStep=0.05;
```
```js
const fullDistribution = (function (){
    const output=[];
    const bl =length*scale
        const r = shape/scale; // mean of the gamma
        const Q2 = [  -r * (1 - bias),r * (1 - bias), r * bias, -r * bias]
        // doing this here allows us to cache results between samples
        const dim=Math.sqrt(Q2.length)
        const lambda = d3.max(
        Q2.filter((d, i) => Math.floor(i / dim) === i % dim).map((d) => -d)
        )
        const P = Q2.map((d, i) => identity[i] + d / lambda);
        const maxN  = poisson.quantile(1-tol, lambda * bl);

        const conditional = d3.sum(
            d3.range(maxN + 1).map((d) => exp(P, d)[3] * poisson.pmf(d, bl * lambda))
        );
        const {cdfWt,pdfWt} = getDensities(Q2,maxN,bl)
        for(const s of d3.range(0,1,sStep)){
            let density =  pdfWt(s*bl)[3]/conditional; // if s===0 this calls the cdf
            if(s>0){
                density *=bl;
            }
            output.push({time:bl,probability:density,s})
        }

        // yield output;
    return output;
})();
```
```js
fullDistribution
```