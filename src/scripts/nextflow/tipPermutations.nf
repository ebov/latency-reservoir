include {build_tree} from './modules/processing.nf'
include {date_permutations} from './modules/processes.nf'
// run a tip permutation test on a tree. 
// Dates should be appended to the end of the taxa name and follow a | (pipe)
// if a tree is not given one will be made from an alignment.


workflow {
    if(params.treefile){
        tree = Channel.fromPath(params.treefile)
    }else{
        build_tree()
        tree= build_tree.out.tree
    }

    clusters = Channel.fromPath(params.clusters)

    date_permutations(clusters,tree)

}