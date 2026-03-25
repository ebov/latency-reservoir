# Evidence of latency reshapes our understanding of Ebola virus reservoir dynamics

This repo holds the scripts needed to reproduce the results presented in [McCrone et al.](https://www.biorxiv.org/content/10.1101/2025.10.17.683141v1).

BEAST log files are not tracked in this repo. They have been deposited in Zenodo [10.5281/zenodo.19224985 ](https://doi.org/10.5281/zenodo.19224985)along with an archive of this repo.
Some scripts expect these files to be stores in `./src/results/remote`

To install the javascript dependencies of this project run 
```
npm install
```

## Reproducing the analyses
The analyses presented in the manuscript can be run with the nextflow pipelines in 
`src/scripts/nextflow/`. A docker container is provided at `quay.io/mccronelab/latency-reservoir:a5dbe6f` to this end. 

The main analyses are run from the source directory with 

```
nextflow run ./scripts/nextflow/main.nf -params-file ./scripts/params/analyses.json  -profile docker -entry ALL
```

entry `ml` and entry `BEAST_MCMC` are provided to run just the maximum likelihood analyses and BEAST analyses respectively.

A Makefile is provided in `src/Makefile` to generate figures. 

## Repo structure

```
.
└── src
    ├── components - - - - - - - - - - - - - reusable figures for data exploration
    ├── containers - - - - - - - - - - - - - The dockerfile used to build the analysis container 
    ├── data
    │   ├── processed
    │   │   ├── paml - - - - - - - - - - - - Data files uses by the paml steps of the nextflow pipeline
    │   │   │   ├── cltr - - - - - - - - - - baseml control files
    │   │   │   ├── local-clocks
    │   │   │   └── outgroups
    │   │   │       ├── set11-partitions
    │   │   │       ├── set19-partitions
    │   │   │       └── set8-partitions
    │   │   └── xmlTemplates  - - - - - - - - xml templates used to generate the BEAST xmls used in the analysis
    │   │       └── geo
    │   │           ├── bd
    │   │           └── rrw
    │   ├── providers - - - - - - - - - - - - Data providers used in data exploration
    │   └── raw - - - - - - - - - - - - - - - Raw data used in the analyses
    │       ├── fasta
    │       └── partitions
    ├── doc - - - - - - - - - - - - - - - - - output figures, tables, and results
    │   ├── figures
    │   └── tables
    ├── notebook - - - - - - - - - - - - - - - exploratory data analysis
    │   ├── 01.temporalSignalCheck
    │   ├── 02.newRoot
    │   ├── 03.LocalClockModels
    │   ├── 04.LatencyModel
    │   └── 05.BEASTModel
    │       └── providerLogs
    ├── results - - - - - - - - - - - - - - - - intermediate results from the primary analyses
    │   ├── beast
    │   │   ├── processed - - - - - - - - - - - processed/summaries of BEAST runs
    │   │   └── xml - - - - - - - - - - - - - - the xmls used to run BEAST
    │   ├── iqtree
    │   ├── remote - - - - - - - - - - - - - - - this directory holds the combined trees and log files for further processing
    │   └── tipDater
    └── scripts 
        ├── figures - - - - - - - - - - - - - - - scripts to generate the figures in the manuscript
        ├── nextflow - - - - - - - - - - - - - -  nexflow pipelines for reproducible analysis
        │   ├── bin
        │   ├── modules
        │   ├── resources
        │   │   └── paml
        │   └── subworkflows
        ├── params - - - - - - - - - - - - - - - parameter files used to run the reproducible analyses
        │   └── tests
        └── utils

```





## A note regarding the observable notebook
Throughout the project, exploratory analyses were generated in using the observable framework. 
Building the notebook requires access to the log files and is not supported.
A version of the notebook in hosted on github pages (here) in case it is useful. 
_This is not meant as a supplement to the manuscript but as a log of exploratory analyses._
