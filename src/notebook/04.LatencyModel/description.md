# A mechanistic model for latency

<div class="caution">
Needs work.
</div>

Tips in the ebola phylogeny represent active, sampled infections. 
Although these are human infections, 
they are sampled early in the outbreak and approximate spill-over events. 
We assume such events require an active infection in the reservoir (even if the spill-over passed through an intermediate host).
Internal nodes, represent branching events in the forward direction and so also represent active, replicating virus.
In order to model latency we allow each lineage to independently jump between latent and replicating states
conditioned on the fact that the lineage is in the replicating state at each node.
The rate of evolution along each branch is determined by some overall rate of evolution multiplied by the proportion of time
spent in the active / replicating state. The evolutionary rate of the latent period is assumed to be 0.

This will be more involved than it probably need to be but such is my curse. 

Let ${tex`\Tau`} represent our topology with branchlengths in years, 
${tex`\Omega`} the parameters of the nucleotide substitution model,
${tex`\Phi`} the parameters of our clock model - to be described below,
and ${tex`\Theta`} the parameters of out tree prior either a birth-death or coalescent model.
${tex`D`} is our data - a matrix of aligned sequences and their sample dates.

As in most Bayesian phylogenetics, the posterior distribution takes the following form
```tex
Pr(\Tau,\Omega,\Phi,\Theta|D) \propto Pr(D|\Tau,\Omega,\Phi)P(\Tau|\Theta)P(\Omega)P(\Phi)P(\Theta)
```
${tex`P(\Tau|\Theta)`} is the tree prior, while ${tex`P(\Omega)P(\Phi)P(\Theta)`} represents priors the other parameters.

${tex`Pr(D|\Tau,\Omega,\Phi)`} is the Felsenstein likelihood of the tree ${tex`\Tau`} with branches measured in years.
As in other clock models these branches are converted to units of substitutions by multiplying each length in time
by an evolutionary rate.

Let's let ${tex`\phi`} represent a vector of evolutionary rates for each branch, and rewrite the Felsenstein likelihood above to as 
```tex
Pr(D|\Tau,\Omega,\Phi) = Pr(D|\Tau,\Omega,\phi)Pr(\phi|\Phi)
```
In a relaxed clock model we would have ${tex`\phi \sim \text{LogNormal}(\mu,\sigma)`} and ${tex`\Phi=[\mu,\sigma]`}.
But here we want a model that accounts for possible jumps between a replicating and latent state along each branch.


## Clock model


The rate of each branch (${tex`\phi_i`}) is equal to the underlying evolutionary rate ${tex`\mu`} multiplied by the proportion of time
spent in the replicating state ${tex`(1-\rho)`} where ${tex`\rho`} is the proportion of time spent in the latent state.

We assume that the latent state of each branch in independent of that of the other branches. 
So
```tex
Pr(\phi|\Phi) = P(\mu)\prod^i{\mu(1-\rho_{i})}P(\rho_i|\Phi)
```
The first term is the prior probability of the base evolutionary rate. 
The first term  in the product is the base evolutionary rate adjusted by the proportion of time spent replicating,
and the last term is the probability of spending ${tex`\rho_i`} of the ith branch in the latent state.
We define this term below.


## Latent model
<div class="caution">
Tortured notation. fix it.
</div>

We model the state of each branch as a two state ctmc markov jump process conditioned on starting and stopping in the 
replicating state. We follow Sericola et al. who provide algorithms for ${tex`P(l|b,Q)`}.
The probability of spending ${tex`l`} time in the latent state conditioned on a total branchlength ${tex`b`} and the 
instantaneous rate matrix Q. In our case

```tex
P(\rho_i|\Phi) = \frac{l}{b_i}P(l|b_i,Q)
```
for cases where ${tex`l`} is >0 and 
```tex
P(\rho_i|\Phi) = P(0|b_i,Q)
```
Where no the fraction of time (and thus time spent latent) is 0.


There are two implementations of the probability of spending ${tex`t`} time in the latent 
state given a branch of length ${tex`l`}, a generating matrix of ${tex`Q`}, conditioned on 
starting and ending in the replicating state.

First we will look that a model that depends on a paper by [Sericola and collegues](https://www.worldscientific.com/doi/abs/10.1142/9789812777164_0003)
here refered to as the Sericola model.