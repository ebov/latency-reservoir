process paml_trees {
    input:
     tuple val(key), path (trees)
    output:
    tuple val(key), path("paml.trees")
    script:
    """
    TREES=\$(cat $trees  | gotree stats | wc -l ); # some issues with % ending a tree file made by ape
    nT=\$(echo \${TREES}-1 | bc ) # first line from stats is header
    FT=\$(echo $trees |cut -f1);
    TIPS=\$(gotree stats -i $trees | cut -f3 | tail -n1);
    echo \$TIPS \$nT > paml.trees; 
    cat $trees >> paml.trees;
    """
}