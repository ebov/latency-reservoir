library("tidyverse")
# Get the prior prob of latency and mean number of branches with latency
data <- read_tsv("./results/remote/sc.latency.prior.combined.log")
nrow(filter(data,nonZeroIndicators==0))/nrow(data)
mean(data$nonZeroIndicators)