#!/usr/bin/env python

import click

"""
   1   │ Tree    KU182905_Kikwit_9510621_DRC_1995.337|KR063671_Yambuku_Mayinga_DRC_1976.749|KJ660347_Makona_Gueckedou_C07_Guinea_2014.214|KF113529_Kelle_2_COG_2003.786|KC242800_
       │ Ilembe_Gabon_2002.09|KC242794_2Nza_Gabon_1996.82|KC242793_1Eko_Gabon_1996.339|KC242792_Gabon_Gabon_1994.986|KC242791_Bonduni_DRC_1977.5|HQ613403_M_M_DRC_2007.663|HQ6134
       │ 02_034_KS_DRC_2008.997
   2   │ 0   00000000100.
   3   │ 0   10111111011.
   4   │ 0   00111000011.
   5   │ 0   00100000011.
   6   │ 0   00000000011.
   7   │ 0   00000000001.
   8   │ 0   00000000010.
   9   │ 0   00100000000.
  10   │ 0   00011000000.
  11   │ 0   00001000000.
  12   │ 0   00010000000.
  13   │ 0   10000111000.
  14   │ 0   00000111000.
  15   │ 0   00000011000.
  16   │ 0   00000001000.
  17   │ 0   00000010000.
  18   │ 0   00000100000.
  19   │ 0   10000000000.
  20   │ 0   01000000000.
"""


@click.command()
@click.argument('filename', type=click.Path(exists=True))
def parse_file(filename):
    i=0
    tips = []
    with open(filename, 'r') as f:
        for line in f:
            if i==0:
                first_line = line[5:].strip() # remove 'Tree\t'
                tips = first_line.split('|')
            # Process each line here
            else:
                split = [*line[2:-2]]
                out_group = [taxa for taxa in tips if split[tips.index(taxa)] == '1']
                with open(f'split.{i}.txt', 'w') as out:
                   for taxon in out_group:
                       out.write(f'{taxon}\n')
            i+=1        
if __name__ == '__main__':
    parse_file()