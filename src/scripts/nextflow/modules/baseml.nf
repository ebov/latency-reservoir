
process baseml {
    tag "$key-$name"
    errorStrategy 'retry'
    maxRetries 15
    input: 
        tuple  val(key), path(alignment), val(name) , path(ctl), path(tree)
    output:
        tuple val(key), path("*mlb")
    script:
    """
   baseml $ctl
   mv *mlb ${key}.${name}.mlb
   if grep -q "check convergence" ${key}.${name}.mlb; then
         exit 1;
     fi
   """
}
  
