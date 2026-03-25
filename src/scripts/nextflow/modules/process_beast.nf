process process_beast{
    input:
    tuple val(key), path(logFile), path(trees)
    output:
    tuple val(key), path("*csv"), emit: summaries
    tuple val(key), path("*json"), emit: output
    script:
    """
    processBEAST.bundle.cjs $logFile $trees $key
    """
}