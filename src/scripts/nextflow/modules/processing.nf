
include {make_partition; make_tree; get_splits; reformat_paml; cat_trees;get_outgroups;reroot;make_tree_constrained; rename_alignment} from './processes'

// a workflow which builds a tree with iqtree 
// optionally it can rename tips, take a partition file, and fix the topology of the tree search
workflow build_tree {
    main:
    if(params.nameMap){
            data = Channel.fromPath(params.alignment)
            nameMap = Channel.fromPath(params.nameMap)
            alignment = rename_alignment(data,nameMap)
        }else{
            alignment = Channel.fromPath(params.alignment)
        }
        
        if(params.partitions){
            partitions = Channel.fromPath(params.partitions)
        }else{
            partitions = make_partition(alignment)
        }

        
        if(params.topology){
            topology = Channel.fromPath(params.topology)
            make_tree_constrained(alignment,partitions,topology)
            tree = make_tree_constrained.out.tree
        }else{
            make_tree(alignment,partitions)
            tree = make_tree.out.tree
        }

        emit:
            tree = tree
            best_model = make_tree.out.model
            alignment = alignment
            partitions = partitions
}


// rename tips if map provided.
workflow paml_processing{
    main:

        build_tree()
        tree = build_tree.out.tree
        partitions = build_tree.out.partitions
        alignment = build_tree.out.alignment

        if(params.splits){
            splits = Channel.fromPath(params.splits)
        }else{
            splits =  get_splits(tree)
        }

        outgroups =
        get_outgroups(splits) \
        | flatten() 
        
        tree.combine(outgroups)\
        | reroot \
        | toSortedList({a,b -> a.getName().split("\\.")[1].toInteger() <=> b.getName().split("\\.")[1].toInteger()}) \
        | cat_trees


        reformat_paml(alignment.combine(partitions))  
      
    emit:
        iqtree = tree
        trees = cat_trees.out
        best_model = build_tree.out.best_model
        alignment = reformat_paml.out
}
       