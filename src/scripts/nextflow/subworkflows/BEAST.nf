include {make_xml} from '../modules/make_xml'
include {run_beast} from '../modules/run_beast'
include {log_combiner; tree_combiner} from '../modules/logCombiner'
include {process_beast} from '../modules/process_beast'

workflow BEAST{
    take:
        run_params //tuple val(key),fasta, template, partitions, metadata, chainLength,logEvery, n
        processing_params // tuple val(key), burnin, resample
    main:
    
    // metadata = "${workflow.projectDir}/../../data/processed/latLong.tsv"
    // template = "${workflow.projectDir}/resources/xml.template"


    params = run_params.map{key,fasta,template,partitions,metadata,chainLength,logEvery,_n -> tuple( key, fasta,template,partitions,metadata,chainLength,logEvery)}
    // [key,1] ,[key,2], ...
    runs =  run_params.map{key,_fasta,_template,_partitions,_metadata,_chainLength,_logEvery,n-> tuple(key,tuple(1..n))}
                        .map{key,iters->iters.collect{tuple(key,it)}}
                        .flatMap()
                    
    run_count_map = run_params.map{key,_fasta,_template,_partitions,_metadata,_chainLength,_logEvery,n-> tuple(key,n)} // [key, n]

    //hardcode location metadata
    xml =  make_xml(params) // key path

    run_beast(xml.combine(runs,by:0))

// use groupkey to provide the number of runs
    trees = run_beast.out.trees
    .combine(run_count_map,by:0)
    .map{key,trees,n ->tuple(groupKey(key,n),trees)}
    .groupTuple()
    .map { key, trees -> tuple(key.getGroupTarget(), trees) }
    .combine(processing_params,by:0)

    logs = run_beast.out.log
    .combine(run_count_map,by:0)
    .map{key,log,n ->tuple(groupKey(key,n),log)}
    .groupTuple()
    .map { key, log -> tuple(key.getGroupTarget(), log) }
    .combine(processing_params,by:0)

    //combine beast runs
    combined_logs = log_combiner(logs)
    combined_trees = tree_combiner(trees)
    // process beast runs 

    process_beast(combined_logs.combine(combined_trees,by:0))

    emit:
    trees = combined_trees
    logs = combined_logs
    output = process_beast.out.output
    // chkpt =run_beast.chkpt
}