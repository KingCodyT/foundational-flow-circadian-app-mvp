"""Regenerate clear-sky lookup: Python + pvlib==0.13.0 + numpy.
No runtime Python dependency. Bird SPECTRL2, global horizontal irradiance.
"""
import json
from pathlib import Path
import numpy as np
import pvlib

edges = [300,315,400,450,500,570,590,620,750,1400,4000]
rows=[]
# Remove Spencer distance correction here; runtime applies the actual UTC day.
distance=float(pvlib.irradiance.get_extra_radiation(1, solar_constant=1, method='spencer'))
for elevation in np.arange(5,90.01,.5):
    z=90-elevation
    result=pvlib.spectrum.spectrl2(apparent_zenith=z,aoi=z,surface_tilt=0,ground_albedo=.2,
        surface_pressure=101300,relative_airmass=pvlib.atmosphere.get_relative_airmass(z),
        precipitable_water=1.5,ozone=.3,aerosol_turbidity_500nm=.1,dayofyear=1)
    wavelength=result['wavelength']
    energy=result['poa_global'][:,0]/distance
    powers=[]
    for lo,hi in zip(edges[:-1],edges[1:]):
        xs=np.concatenate(([lo],wavelength[(wavelength>lo)&(wavelength<hi)],[hi]))
        powers.append(round(float(np.trapezoid(np.interp(xs,wavelength,energy),xs)),8))
    rows.append(powers)
Path('lib/solar-spectrum-table.json').write_text(json.dumps(rows,separators=(',',':'))+'\n')
print('Generated',len(rows),'elevations; pvlib',pvlib.__version__)
