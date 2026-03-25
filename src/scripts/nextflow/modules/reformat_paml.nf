process reformat_paml {
    input:
        tuple val(key) ,path(alignment) ,path(partition)
    output:
        tuple val(key), path("seqs.paml")
    script:
    """
    partition.py --out-format paml ${alignment} ${partition} > seqs.paml
    """
}


