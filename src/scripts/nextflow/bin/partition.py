#!/usr/bin/env python

import click
from Bio import AlignIO
import numpy as np
"""
#NEXUS
begin sets;
	charset cds1 = 470-2689\3 3129-4151\3 4479-5459\3 6039-6923\3 6923-8068\3 8509-9375\3 10345-11100\3 11581-18219\3;
	charset cds2 = 471-2689\3 3130-4151\3 4480-5459\3 6040-6923\3 6924-8068\3 8510-9375\3 10346-11100\3 11582-18219\3;
	charset cds3_ig = 472-2689\3 3131-4151\3 4481-5459\3 6041-6923\3 6925-8068\3 8511-9375\3 10347-11100\3 11583-18219\3 2690-3128 4152-4478 5460-6038 8069-8508 9376-10344 11101-11580;
end;
"""



def parse_charset_file(file_path):
    charsets = []

    with open(file_path, 'r') as f:
        for line in f:
            if line.strip().startswith('charset'):
                line = line.strip().replace('charset', '').strip(';')
                charset_name, ranges = line.split('=')
                ranges = ranges.split()

                charset = {
                    'name': charset_name.strip(),
                    'sites': []
                }

                for range_str in ranges:
                    if '-' in range_str:
                        start, end = range_str.split('-')
                        if '\\' in end:
                            end, step = end.split('\\')
                            step = int(step)
                            charset['sites'].extend(range(int(start)-1, int(end), step))
                        else:
                            charset['sites'].extend(range(int(start)-1, int(end)))
                    else:
                        charset['sites'].append(int(range_str))

                charsets.append(charset)

    return charsets

@click.command()
@click.argument('fasta', type=click.Path(exists=True))
@click.argument('partition', type=click.Path(exists=True))
@click.option('--out-format', type=click.Choice(['paml', 'fa']), default='paml', help='Output file format')

def parse_file(fasta,partition,out_format):
    
# def parse_file(partition):
    alignment = AlignIO.read(fasta, "fasta")
    charsets = parse_charset_file(partition)
    align_array = np.array([list(rec) for rec in alignment], 'S1', order="F")

    final_length=0
    for charset in charsets:
        charset['columns']=align_array[:,charset['sites']]
        final_length+=charset['columns'].shape[1]
        # print(charset['columns'].shape)
        # print(len(charset['sites']))
        # print(charset['columns'][0].shape)


    if out_format=='paml' :
        print(f'{align_array.shape[0]} {final_length} G')
        print(f'G {len(charsets)} ' + format(' '.join([str(charset['columns'].shape[1]) for charset in charsets])))
        for i in range(align_array.shape[0]):
            # print(f'{alignment[i].id}\n {" ".join([str(charset['columns'][i]) for charset in charsets])}')
            
            print(f"""{alignment[i].id}\n{"".join(["".join(map(lambda x: x.decode("UTF-8"), charset["columns"][i])) for charset in charsets])}""")

    elif out_format=='fa':
        for i in range(align_array.shape[0]):
            # print(f'{alignment[i].id}\n {" ".join([str(charset['columns'][i]) for charset in charsets])}')
            print(f""">{alignment[i].id}\n{ "".join(["".join(map(lambda x :x.decode('UTF-8'),charset['columns'][i])) for charset in charsets])}""")
    # i=1
    # for charset in charsets:
    #     print(str(i)*charset['columns'].shape[1])
    #     i+=1


    # print(charsets)
       
if __name__ == '__main__':
    parse_file()