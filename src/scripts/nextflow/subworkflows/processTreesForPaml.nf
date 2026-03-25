include {paml_trees} from "../modules/paml_trees.nf"
include {reroot} from "../modules/reroot.nf"
include {unroot} from "../modules/unroot.nf"
include {add_local_clocks} from "../modules/localClocks.nf"
workflow ROOT_TREES_FOR_PAML{

    take:
    trees // tuple val(key) path(trees) path(outgroups) / or null // todo add local clocks
    
    main:
    trees.branch{_key,_tree,outGroups -> 
        unroot: outGroups.name=='NO_FILE'
        reroot:    outGroups.name!='NO_FILE'
    }.set{rooting}

    // normalized_rooting = rooting.reroot.map { key, treefile, outgroup ->
    // def outgroups =
    //     (outgroup instanceof List ) ? outgroup :[outgroup]

    // // produce tuples: (key, treefile, [one or more outgroups])
    // tuple(key, treefile, outgroups)
    // }

    // // Expand to one tuple per outgroup file
    // single_rooting = normalized_rooting.flatMap { key, treefile, outgroups ->
    //     outgroups.collect { og -> tuple(key, treefile, og) }
    // }


    processed_trees = rooting.unroot.map{key,tree,_NO_FILE->tuple(key,tree)}
    |unroot
    // | concat(reroot(single_rooting) )
    | concat(reroot(rooting.reroot)) 

    emit:
        processed_trees

}

workflow ADD_LOCAL_CLOCKS_FOR_PAML {
    take:
    trees // tuple key path(trees) , path(tips) path(clades)
    main:
        trees.branch{_key,_tree,tips,_clades -> 
        pass: tips.name=='NO_FILE'
        label:tips.name!='NO_FILE'
    }.set{lc}

    same = lc.pass.map{key,tree,_tips,_clades -> tuple(key,tree)}
    
    processed_trees=add_local_clocks(lc.label)
    .concat(same)
    // cat local files and same files // want key [files]
    emit:
    processed_trees
}

