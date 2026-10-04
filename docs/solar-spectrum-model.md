# Clear-sky spectral display

Bird SPECTRL2, generated with pvlib 0.13.0. Runtime uses a bundled lookup, no network requests or location transmission. Regenerate with `scripts/generate-solar-spectrum.py` in a Python environment with pvlib 0.13.0. Model: https://pvlib-python.readthedocs.io/en/v0.13.0/reference/generated/pvlib.spectrum.spectrl2.html

Output is global horizontal irradiance (direct + diffuse), integrated by linear interpolation and trapezoidal quadrature at band edges. 171 solar-elevation nodes from 5 to 90 degrees, 0.5 degree increments. Runtime interpolates powers, applies Spencer Earth–Sun distance correction, then computes shares. Solar elevation uses existing NOAA astronomical equations (geometric angle; refraction not modeled). Each band trend compares absolute power 15 minutes ahead, not its percentage.

Fixed assumptions: pressure 101300 Pa, precipitable water 1.5 cm, ozone 0.3 atm-cm, AOD500 0.1, albedo 0.2; pvlib rural aerosol defaults. These are illustrative atmospheric assumptions, not locally observed weather. No claimed uncertainty interval, exposure dose or health outcome. Clouds, site altitude, obstacles and skin/eye orientation are not modeled.

Coverage: UVB 300–315 only (model omits 280–300); UVA315–400; visible400–750 divided into violet400–450, blue/cyan450–500, green500–570, yellow570–590, orange590–620, red620–750; NIR750–1400; remainingIR1400–4000. These bins are adjacent and exhaustive only for the modeled range. Color boundaries are approximate. Percentages are energy fractions, not photon fractions or biological weightings. Rounded numbers need not sum exactly to 100. No numbers below5°; twilight/night get guidance instead. No percentages without a valid saved location.

Day exploration is centered on today's local solar noon ±12h (solar day, can cross civil midnight). Live mode uses the parent clock; preview mode is explicitly labeled and can be reset. Polar conditions use the actual solar angle, without inventing sunrise/sunset events.
