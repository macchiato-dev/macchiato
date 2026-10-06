# Site typography

The regular Resources.co site uses Instrument Sans for its interface and
JetBrains Mono for code and identifiers, as specified in the supplied Claude
Design export. The project workspace retains Space Grotesk and its existing
editor fonts. These are local assets, embedded by `artifacts.js`; the browser
does not contact a font CDN.

Both Latin WOFF2 subsets were downloaded from Google Fonts on 2026-10-06.
They cover the English and Spanish interface. Their upstream SIL Open Font
Licenses are included beside the binaries.

- Instrument Sans: https://github.com/Instrument/instrument-sans
- JetBrains Mono: https://github.com/JetBrains/JetBrainsMono
- Font distribution and license source: https://github.com/google/fonts

The variable font files support the interface's regular, medium, and semibold
weights. Explicit face declarations retain compatibility with the existing
site stylesheet validator.
