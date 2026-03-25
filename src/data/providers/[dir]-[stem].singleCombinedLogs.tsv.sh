#!/bin/bash
# for word in "$@"; do echo "$word"; done
while [[ "$#" -gt 0 ]]; do
  case $1 in
    --dir=*) DIR="${1#*=}" ;;
    --stem=*) STEM="${1#*=}" ;;
    *) echo "Unknown parameter passed: $1"; exit 1 ;;
  esac
  shift
done

# echo "HELLO"
logcombiner -burnin 1000000  ./src/analyses/BEAST/${DIR}/${STEM}.log ./src/analyses/BEAST/${DIR}/${STEM}.combined.log  >./src/notebook/05.BEASTModel/providerLogs/${DIR}-${STEM}.combinedLogs.log 

cat ./src/analyses/BEAST/${DIR}/${STEM}.combined.log
