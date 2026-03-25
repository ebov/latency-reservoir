process add_local_clocks{
    input:
    tuple val(key), path(trees), path(tips), path(clades)
    output:
    tuple val(key), path("local.trees")
    script:
    """
    gotree brlen clear -i  $trees | gotree rename -m $tips | gotree annotate  -m $clades > local.trees
    """
}