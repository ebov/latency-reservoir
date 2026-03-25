library(tidyverse)
library(ape)

outbreaks <-read_csv("./data/raw/ebolavirus/ebov/EBOV_Outbreaks.csv")
genomes <-read_csv("./data/raw/ebolavirus/ebov/EBOV_Outbreak_Genomes.csv")

fasta<-read.FASTA("./data/raw/fasta/set18.fasta")

genomes %>% filter(label %in% names(fasta)) %>%
  left_join(outbreaks,by='outbreak') %>%
  select(taxa=label, latitude,longitude) %>%
  write_tsv("./data/processed/latLong.tsv")
