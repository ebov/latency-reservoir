params.save_every = 1000000
process run_beast{
    input:
    tuple val(key),path(xml), val(n)
    output:
    tuple val(key), path("*log"), emit: log
    tuple val(key), path("*trees"), emit: trees
    tuple val(key), path("*chkpt"), emit: chkpt
    
    script:
    """
    beast -seed \${RANDOM} -prefix ${n}_ -save_state ${n}_${key}.chkpt -save_every ${params.save_every} $xml
    """
    
}