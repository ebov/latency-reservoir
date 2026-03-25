process reroot {
    input:
    tuple val(key), path(treefile) , path(outgroup)
    output:
        tuple val(key), path("rerooted.trees")
    
    script:
    """
    touch rerooted.trees;
    for FILE in $outgroup;
    do
    gotree reroot outgroup  -l \$FILE -i ${treefile} >> rerooted.trees;
    done
    """
}