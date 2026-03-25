
include {iqtree} from "../modules/iqtree"
workflow MAKE_TREES {
    take:
        fastas
        partitions
        models
    main:
    fastas
    .combine(partitions)
    .combine(models)
    .map{fasta,partition,model ->tuple( fasta.getBaseName()+'_'+partition.getBaseName()+'_'+model, fasta, partition, model)}
    | iqtree
    
    // emit:
    // trees = iqtree.out.tree
}