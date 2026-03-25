process make_xml{
    input:
     tuple val(key),file(fasta),file(template),file(partitions),file(metadata),val(chainLength),val(logEvery)
     output:
     tuple val(key), path("*xml")
     script:
     """
     make_xml.py $fasta $template --partitions $partitions --metadata $metadata --chain-length $chainLength --log-every $logEvery --base-name $key > ${key}.xml
     """
}