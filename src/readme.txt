
# Analysis

make trees with iqtree3

```
nextflow run ./scripts/nextflow/main.nf -entry makeTrees -params-file ./scripts/params/iqtree.json 
```

Run tip dater

```
nextflow run ./scripts/nextflow/main.nf -entry tipDater -params-file ./scripts/params/tipDater.json
```

Run beasts