# BEAST runs

These represent the first beast runs they explore the affect of coalescent prior on the results. 
The models estimate the bias parameter

- Constant pop (gamma prior) - Constant population size with a relaxed gamma(0.0001,1000) prior on the population size
    - Large bimodality in joint related to Makona rooting
- Exponential growth (gamma prior) - exponential growth with a relaxed gamma(0.001,1000) prior ont the population size
    - Large bimodality in joint related to Makona rooting
- Constant pop (exp prior) - exponential prior with mean of 1
    - small bimodality with a faster mode
- Exponential growth (exp prior) - exponential prior with mean of 1
    - looks like a reasonable run, but with a small Ne. Is the prior too small?


--- 

## Overview
Very little if anything affects the bimodality. 
It is verly likely an valid temporally informed model.
It is supported in the set 8 run both paml and beast. 

Eliminating Makona seems to do it. 
Forcing a rapid rate or small Ne does it too, but these are somewhat artificial. 
The coalescent model is probably misspecified. I doubt this is one panmictic population. 

Interesting updating the bitflip operator seems to do this but it may just be a plotting artifact. 
The traces seem to have the bimodal rate[notebook/05.BEASTModel/20250322-set18.sc.const+latency.noP.beastAnalysis] removed the bimodality. 
I need to validate that. 