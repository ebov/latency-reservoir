#!/usr/bin/env python3
import click
from mako.template import Template
from datetime import datetime, timedelta
from Bio import SeqIO
import csv

class Partition:
    def __init__(self,name):
        self.name=name
        self.sites=[]
        
    def add_sites(self,sites):
        self.sites.extend(sites)
    def set_weight(self,w):
        self.weight=w

def parse_charset_file(file_path):
    charsets = []

    with open(file_path, 'r') as f:
        for line in f:
            if line.strip().startswith('charset'):
                line = line.strip().replace('charset', '').strip(';')
                charset_name, ranges = line.split('=')
                ranges = ranges.split()

                charset = Partition(charset_name.strip())

                for range_str in ranges:
                    if '-' in range_str:
                        start, end = range_str.split('-')
                        if '\\' in end:
                            end, step = end.split('\\')
                            step = int(step)
                            charset.add_sites(range(int(start)-1, int(end), step))
                        else:
                             charset.add_sites(range(int(start)-1, int(end)))
                    else:
                        charset.add_sites(range_str)
                charsets.append(charset)

    return charsets

    

class Taxon:
    def __init__(self, name):
        self.name = name
        (self.date, self.uncertainty) = self.guess_date(name)
        self.attrs ={}

    def add_attr(self,attr):
        self.attrs.update(attr)
    

    def add_seq(self,seq):
        self.seq= seq

    def guess_date(self,taxon):
        try:
            date_str = taxon.split('|')[-1]
            # Convert to YYYY-MM-DD format
            dash_count = date_str.count('-')
            uncertainty=0
            if dash_count == 1:
                date_str += "-15"  
                uncertainty = 0.08333333333
            elif dash_count == 0:
                date_str += "-06-15"  
                uncertainty = 1.0
            date_obj = datetime.strptime(date_str, "%Y-%m-%d")
                # Convert date to decimal year
            year_start = datetime(date_obj.year, 1, 1)
            next_year_start = datetime(date_obj.year + 1, 1, 1)
            decimal_year = date_obj.year + ((date_obj - year_start).total_seconds() / (next_year_start - year_start).total_seconds())
            return (decimal_year,uncertainty)
        except ValueError:
            raise ValueError(f"Invalid date format in record ID: {taxon}")





@click.command()
@click.argument('fasta', type=click.Path(exists=True))
@click.argument('template', type=click.Path(exists=True))
@click.option('--partitions', type=click.Path(exists=True), help="partition the alignment?")
@click.option('--metadata', type=click.Path(exists=True), help="metadata for tips?")
@click.option('--chain-length', type=int, default=500000000, help="How long should the chain be?")
@click.option('--log-every', type=int, default=10000, help="Logging cadence for trees and logs.")
@click.option('--base-name', type=str, default="beast", help="Basename for output files.")


def fill_template(fasta,template, partitions, metadata, chain_length, log_every, base_name):
    # print("Rendering with:")
    # print(f"local_clock={local_clock}, no_makona={no_makona}, sum_prior={sum_prior}, chain_length={chain_length}, log_every={log_every}, base_name={base_name}")

    beastTemplate = Template(filename=template)
    

    records = SeqIO.parse(fasta, "fasta")
    # handel the partition file

    if partitions is not None:
        charsets = parse_charset_file(partitions)
    else:
        start=1
        end = len(records[0].seq)
        charsets = [{name:"1",sites:[range(int(start)-1, int(end))]}]
    
    # add weights to partitions
    total_sites = 0
    for set in charsets:
        total_sites+=len(set.sites)
    for set in charsets:
       set.set_weight(total_sites/len(set.sites))

    # parse metadata tsv into a dict keyed by the taxa column
    
    if metadata is not None:
        metadata_dict = {}
        with open(metadata, newline='') as mfile:
            reader = csv.DictReader(mfile, delimiter='\t')
            headers = reader.fieldnames or []
            # choose key column: prefer common names, else first header
            key_col = None
            lower_headers = [h.lower() for h in headers]
            for candidate in ('taxa', 'taxon', 'id', 'name'):
                if candidate in lower_headers:
                    key_col = headers[lower_headers.index(candidate)]
                    break
            if not key_col and headers:
                key_col = headers[0]
            # read rows into dict keyed by key_col (strip keys)
            for row in reader:
                if not key_col:
                    continue
                key = (row.get(key_col) or "").strip()
                if not key:
                    continue
                # keep the full row (values stripped)
                metadata_dict[key] = {k: (v.strip() if v is not None else v) for k, v in row.items() if k != key_col}
        metadata = metadata_dict
    else:
        metadata = {}

    taxa = []
    for rec in records:
        taxon = Taxon(rec.id)
        taxon.add_seq(str(rec.seq))
        if metadata.get(rec.id) is not None:
            taxon.add_attr(metadata.get(rec.id))
        taxa.append(taxon)

    print(beastTemplate.render(
        taxa=taxa,
        template=template,
        partitions = charsets,
        chain_length=chain_length,
        log_every=log_every,
        base_name=base_name
    ))

if __name__ == "__main__":
    fill_template()
