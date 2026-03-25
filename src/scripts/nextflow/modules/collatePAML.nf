process collatePAML{
    input:
        tuple val(key), path(mlbs)
    output:
       tuple val(key), path("*.json")
    script:
    """
    processPAML.js ${mlbs} > ${key}.json
    """
}
