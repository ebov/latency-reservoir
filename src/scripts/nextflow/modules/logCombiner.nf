process log_combiner{
    input:
    tuple val(key), path(logs), val(burnin), val(resample)
    output:
     tuple val(key), path("${key}.combined.log")
    script:
    """
    logcombiner -burnin $burnin -resample  $resample $logs ${key}.combined.log; 
    """
}
process tree_combiner{
    input:
    tuple val(key), path(trees), val(burnin), val(resample)
    output:
    tuple val(key), path("${key}.combined.trees")
    script:
    """
    logcombiner -trees -burnin $burnin -resample  $resample $trees ${key}.combined.trees; 
    """
}