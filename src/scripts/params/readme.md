These parameter files hold the input parameters to reproduce the analysis.

run all analyses in main paper 

nextflow run ./scripts/nextflow/main.nf -entry ALL -params-file ./scripts/params/analyses.json -profile gizmo,server

test beast

nextflow run ./scripts/nextflow/main.nf -params-file ./scripts/params/test.json -profile test,docker -entry BEAST_MCMC
