
process date_permutations {
    tag "$key"
    input:
        tuple val(key),  path(tree)
    output:
        path '*.tsv'
        path '*trees'
    script:
    """
    ln -s ${workflow.projectDir}/resources/rFunctions.R ./
    permutations.R  ${tree} ${params.n} $key
    """
}