// some of the tips have uncertain dates. paml is inconsistent in processing these. So we replace them here.
process fix_dates{
    input:
        tuple val(key), path(fasta), path(partition), val(model)
    output:
        tuple val(key), path("tidy.fasta"), path(partition), val(model)
    script:
    """
    sed -e 's/2003-10/2003-10-15/g' \
        -e 's/1996-02/1996-02-15/g' \
        -e 's/1977-06/1977-06-15/g' \
        -e 's/2017-05/2017-05-15/g' \
        ${fasta} > tidy.fasta
    """
}