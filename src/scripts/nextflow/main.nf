// include {processing} from './modules/processing'
include {MAKE_TREES} from './subworkflows/makeTrees'
include {baseml} from './modules/baseml'
include {iqtree3} from './modules/iqtree'
include {reformat_paml} from './modules/reformat_paml'
include {paml_trees} from './modules/paml_trees'
include {fix_dates} from './modules/fix_dates'
include {collatePAML} from './modules/collatePAML'
include {date_permutations} from './modules/datePermutations.nf'
include {ROOT_TREES_FOR_PAML} from './subworkflows/processTreesForPaml'
include {ADD_LOCAL_CLOCKS_FOR_PAML} from './subworkflows/processTreesForPaml'
include {BEAST} from './subworkflows/BEAST'

// this workflow takes a list of fasta files and 
// a list of partitions and a list of models
// and builds an iqtree for the cross of each entry.
params.NO_FILE="$projectDir/resources/NO_FILE"

workflow makeTrees{
    main:

    channel.fromList(params.analyses)
    |map{d -> 
        seqs: tuple(d.key,file(d.fasta), file(d.partition),"HKY") //(key, alignment, partition) // hard coded hky model
                                    // (key:key, tree, outgroups)
    }
    | set{analyses}

    fixed_dates= fix_dates(analyses) // just to keep all ml analyses the same
    iqtree3(fixed_dates).tree
}


workflow tipPermutations{
    main:
    channel.fromList(params.analyses)
    .map{d->tuple(d.key,file(d.tree))}
    | date_permutations
}


workflow ml{
    main:

    channel.fromList(params.analyses)
     .filter { d -> (d.paml?.size() ?: 0) > 0 }
    |multiMap{d -> 
        seqs: tuple(d.key,file(d.fasta), file(d.partition),"HKY") //(key, alignment, partition) // hard coded hky model
                                    // (key:key, tree, outgroups)
        // rooting: d.paml.collect(k -> tuple(d.key+':'+k.key,file(k.tree),k.outGroups?file(k.outGroups):file(params.NO_FILE))) // join names so we can recombine later 
        rooting: d.paml.collect{k -> tuple(d.key,d.key+':'+k.key,k.outGroups?file(k.outGroups):file(params.NO_FILE))} // join names so we can recombine later
                                        // (key:key,tips, clade). 
        localClocks:  d.paml.collect{k ->  k.localClock? tuple(d.key+':'+k.key, file(k.localClock.tips),file(k.localClock.clades))  : tuple(d.key+':'+k.key,file(params.NO_FILE),file(params.NO_FILE))     }
                                    // key:key, paml control file
        ctlr: d.paml.collect{k ->tuple(d.key+':'+k.key,file(k.cltr))}
    }
    | set{analyses}

    fixed_dates= fix_dates(analyses.seqs)

    trees = iqtree3(fixed_dates).tree
    
    localClocks = analyses.localClocks.flatMap()
    trees_rooting = analyses.rooting.flatMap().combine(trees,by:0).map{_key,longKey,outgroup,tree->tuple(longKey,tree,outgroup)} // drop original key and reorder for next pipeline.
    
    rooted_local = ROOT_TREES_FOR_PAML(trees_rooting) //process trees
     .combine(localClocks,by:0)

    ADD_LOCAL_CLOCKS_FOR_PAML(rooted_local)
    |paml_trees
    |combine(analyses.ctlr.flatMap(),by:0) // recombine with cltrs
    |map{key,tree,ctlr ->tuple(key.split(':')[0],key.split(':')[1],ctlr,tree)}
    | set{trees_cltrs}

    reformat_paml(fixed_dates.map{key,fasta,partition,_model->tuple(key,fasta,partition)})
    .combine(trees_cltrs,by:0 )
    | baseml
    | groupTuple
    | collatePAML

}
workflow BEAST_MCMC {
    main:

    channel.fromList(params.analyses)
    .filter { d -> (d.beast?.size() ?: 0) > 0 }
    |multiMap{d -> 
    runs:  tuple(d.key,file(d.fasta),file(d.beast.template),file(d.partition),file(d.beast.metadata),d.beast.chainLength,d.beast.logEvery,d.beast.n)
    processing: tuple(d.key,d.beast.burnin,d.beast.resample)
    }
    | set{analyses}
    
    BEAST(analyses.runs,analyses.processing)
}

workflow ALL{
    main:
    ml() // run the ml analyses
    BEAST_MCMC() // run the BEAST analyses
}