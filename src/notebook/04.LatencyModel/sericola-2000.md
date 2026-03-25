```js
import{exp,get_f,getF} from "/components/sericola.js"
```

# Working towards a latency model
For this example we will focus on the two state case but the functions should extend to the more general case.
This means that some of the results will be straight forward.

The parameters of our model are the the rate of state change and the bias of the rate (0.5 => equal rates between states).
 In this example we will set the first state to be latency and the second to be replicating. In beast latency is the second state.
 In both cases the higher the bias the more likely we are to leave the replicating state and stay in the latent state.

```js
const rate = view(Inputs.range([0, 1], { label: "rate", step: 0.1 }))
```
```js
const bias = view(Inputs.range([0, 1], { label: "bias", step: 0.1 }))

```
# The discrete case

We will build up our model by following the Sericola 2000, where we first 
deal with the cdf of the number of visits to our state of interest in the first _n_
transitions. 

Our markov chain is defined by the following instantaneous matrix Q as well as the uniformized markov chain with rate ${tex`\lambda`} and the transition probability matrix P.

The uniformized chain is a discrete time process. At each step we transition to another state according to P. Because lambda is set to equal max{ ${tex`-Q_{ii}`}} we always leave the state with the fastest rate if we find ourselves there and it's time for a jump.

```tex
Q= \begin{bmatrix}
    ${format(Qidx(0, 0))}       & ${format(Qidx(0, 1))}   \\
    ${format(Qidx(1, 0))}       & ${format(Qidx(1, 1))}
\end{bmatrix},  

\lambda = ${format(lambda)}, 

P= \begin{bmatrix}
    ${format(Pidx(0, 0))}       & ${format(Pidx(0, 1))}   \\
    ${format(Pidx(1, 0))}       & ${format(Pidx(1, 1))}
\end{bmatrix}

```
```js
// constants and utils of the model
const format = d3.format("0.2")
//opposite of beast indexing.
const Q = [  -rate * (1 - bias),rate * (1 - bias), rate * bias, -rate * bias]
const dim = Math.sqrt(Q.length)

function Qidx(i, j) {
  const dim = Math.sqrt(Q.length);
  return Q[i * dim + j];
}
function Pidx(i, j) {
  const dim = Math.sqrt(P.length);
  return P[i * dim + j];
}
const lambda = d3.max(
  Q.filter((d, i) => Math.floor(i / dim) === i % dim).map((d) => -d)
)
const identity = [1, 0, 0, 1]
const P = Q.map((d, i) => identity[i] + d / lambda)

```
When the rates are equal we can see we get a transition probability matrix that results in always leaving the given state. 
We can not transition to the current state.


Below we have the matrix F where ${tex`F_{i,j}(n,k)`} represents the probability of visiting our state of interest (latency) k or fewer times in the first _n_ transitions and ending in state j conditioned on starting in state i. Note there are n+1 states visited in the first _n_ transitions. We count the starting state as a visit.

```tex

F= \begin{bmatrix}
    ${format(Fmat[0])}       & ${format(Fmat[1])}   \\
    ${format(Fmat[2])}       & ${format(Fmat[3])}
\end{bmatrix}

```

```js
const n = view(Inputs.range([0, 10], { label: "n", step: 1,value: 6 }))
```
```js
const  k = view(Inputs.range([0, 10], { label: "k", step: 1 }))
```

In the case where the bias is 0.5 (i.e. same rate of transition between states) every event changes states and the number of times we visit the latent state is required to be ${tex`\frac{n+1}{2}`} if n is odd and either (n-1) or n if n is even depending on the starting state.. (n-1 - we start replicating and return there. n we start latent.)

We are most interested in position (1,1) which gives us the probability of visiting the latent state at most _k_ times and ending in the replicating state conditioned on starting in the replicating state. Below we condition on returning to this state. _Note this requires an even the number of transitions._



```js
const conditionalN = exp(P, n);
const cdfD = d3
    .range(n + 1)
    .map((d) => ({ k: d, cdf: F(n, d)[3] / conditionalN[3] }));
const pdfD = d3
    .range(n + 1)
    .map((d) => ({ k: d, cdf: f(n, d)[3] / conditionalN[3] }));
```


```js
const F =getF(P)
const f = get_f(F)

```
```js
const Fmat = F(n, k)
```


<div class="grid grid-cols-2">
<div class="card">
${Plot.plot({
    title: "CDF",
    marks: [
      Plot.ruleY([0]),
      Plot.ruleY([1.0]),
      Plot.lineY(cdfD, { x: "k", y: "cdf" }),
      Plot.dot(cdfD, { x: "k", y: "cdf", fill: "grey" })
    ]
  })}
</div>

<div class="card">
${Plot.plot({
    title: "PMF",
    marks: [
      Plot.ruleY([0]),
      Plot.ruleY([1.0]),
      Plot.barY(pdfD, { x: "k", y: "cdf" }),
      Plot.dot(pdfD, { x: "k", y: "cdf", fill: "grey" })
    ]
  })}
</div>

</div>