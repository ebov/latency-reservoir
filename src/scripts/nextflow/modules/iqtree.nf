

process iqtree {
    input:
        tuple val(key), path(fasta), path(partition), val(model)

    output:
    path "*.treefile", emit: tree
    path "*.best_model.nex", emit: model
    path "*.iqtree", emit: iqtree

    script:
    """
    iqtree2 -s $fasta -m ${model}  -p $partition --prefix ${key} -o 'KR063671|Yambuku-Mayinga|DRC|1976-10-01'
    """
}

process iqtree3 {
    input:
        tuple val(key), path(fasta), path(partition), val(model)

    output:
    tuple val(key), path("*.treefile"), emit: tree
    path "*.best_model.nex", emit: model
    path "*.iqtree", emit: iqtree

    script:
    """
    iqtree3 -s $fasta -m ${model}  -p $partition --prefix ${key} -o 'KR063671|Yambuku-Mayinga|DRC|1976-10-01'
    """
}