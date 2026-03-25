# Sericola model


The code below is transcribed from the beast class 
`src/dr/inference/markovjumps/SericolaSeriesMarkovReward.java`, 
which implements the algorithms of [Bladt, Meini, Neuts, and  Sericola](https://doi.org/10.1142/9789812777164_0003)

The purpose of transcribing the model here to 1 - explain it to myself so I more fully
understand it, and explore it's behavior in our parameter regime. Hopefully,
it will also help others who find the original text a bit hard to parse on first pass.


## Overview

We are after the distribution of the proportion of time each branch spends in the latent state.
This is a specific case of the model proposed in the manuscript which is after 
_the distribution of the total reward accrued during [0, t) in a finite 
continuous-parameter Markov chain._ In this model _the reward grows linearly at a rate 
depending on the state visited_. There is also the possibility of accruing instantaneous rewards
upon state changes, which we ignore for now. In our hands, the reward will grow at a rate of 1.0 when 
in the latent state, and 0.0 when replicating. The distribution will then describe the 
amount of the time spent latent from which we can calculate the distribution over the 
proportion of time spent latent.

## Notation

* ${tex`{J(t)}`} is our markov chain that jumps between _m_ states. ${tex`J(t)=i`} indicates the 
chain is in the ${tex`i^{th}`} state at time _t_.
* R(t) - the total reward accumulated by time _t_
* ${tex`R_i(t)`} is the total reward accumlated by the ${tex`i^{th}`} state by time t.



## Total continuous reward distribution
We (mercifully) skip to section 4 of the paper. 
Where we are interesting the the matrix ${tex`W(x,t)`} which is made up of 
elements ${tex`W_{ij}(x,t)`} where
```tex
W_{ij}(x,t) = P\{R(t)\leq x,J(t)=j|J(0)=i\}
```
So each entry in the matrix give the probably of accumulating a reward
of less than or equal to x and ending in the _j_ state conditioned on 
starting in state _i_.

Here the manuscript combines states that have the same reward rate and 
orders the rates in increasing order. In the general sense there are
${tex`\phi+1`} distinct rewards ordered as
```tex
r_0<r_1<...r_{\phi-1}<r_\phi
```

In our case ${tex`\phi=1`} and there are two reward rates (one for each state).
${tex`r_0=0.0`} and ${tex`r_\phi=1.0`}. Rate 0 is for state 0 - replicating, 
rate 1 is for state 1 - latent.


_We will skip the bit about Bs and u,vs but not that the authors are just
combining states that have the same reward rate and simplifying the matrices
to reduce the number of reward-states_


Note that we are guaranteed to have ${tex`r_0t \leq R(t) \leq r_\phi t`} because the first term would mean spending the whole time in the lowest reward state and the late term represents the case where we spend the whole time in the highest
reward state.


Similarly note that _R(t)_ has the potential for ${tex`\phi+1`} possible "jumps" 
which each represent the chain spending the whole time in each reward-state.
In our case there are two such jumps 0 and t which represent and entirely replicating and an entirely latent branch.

<div class="warning">
Go back and adjust text to entertain not starting and ending in each state for now.
</div>

This gives equation (10) which I have edited to account for the fact that
in our case each state has it's own rate.

```tex
P\{R(t)=r_jt,J(t)=j|J(0)=i\} = \begin{cases}
      e^{Q_{ij}t}, & \text{if}\ i=j \\
      0, & \text{otherwise}
    \end{cases}
```
which is the probably of no jumps conditioned on starting in state _i_.
<!-- Qii would be -1* the rate of leaving the ith state which reduces to 1-cdf of the exponential of the same rate in our case 
In the alternative form this is the probabily of jumping n times (poisson distribution) times the probability of each jump being between 
acceptable states.
 -->
In the general case, equation 10 and its alternative form account for
all possible histories that stay in states with the same reward rate.


We now end up at out explicit formula which passes us on to another reference 
for the proof.


