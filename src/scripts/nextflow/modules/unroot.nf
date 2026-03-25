process unroot{
    input:
    tuple val(key), path(trees)
    output:
        tuple val(key), path("unrooted.trees")
    script:
    """
    gotree unroot -i $trees > unrooted.trees
    """
}