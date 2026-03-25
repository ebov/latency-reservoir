#!/bin/bash
# for word in "$@"; do echo "$word"; done
while [[ "$#" -gt 0 ]]; do
  case $1 in
    --stem=*) STEM="${1#*=}" ;;
    *) echo "Unknown parameter passed: $1"; exit 1 ;;
  esac
  shift
done

./src/scripts/utils/ltt.js ./src/results/remote/${STEM}.combined.trees 