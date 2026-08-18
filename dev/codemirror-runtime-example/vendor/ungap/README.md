# ungap collection ponyfills

These four files derive from the sole `esm/index.js` source file in each ISC
licensed ungap repository:

- `map.js`: `ungap/map` at `e711fb1dbe79a8507844d7efc3c4694b63068c71`
- `set.js`: `ungap/set` at `2b77b5361c6798ca697d3c3b9dcd536a7cf2a8b1`
- `weakmap.js`: `ungap/weakmap` at `61cab508017e1cfea513edd27c8a9409395eae75`
- `weakset.js`: `ungap/weakset` at `143d91db60e70c76b660c0910d8a2714e4fc4200`

They are ponyfills: importing them does not mutate globals. The MicroQuickJS
entry point installs one only when its host does not provide that collection.
The customized MicroQuickJS runtime supplies all four collections in C;
these sources remain useful to other deliberately small ES5 hosts. Changes remove
unsupported reflection, add Babel-compatible `@@iterator` objects, use
SameValueZero key matching, and keep the source ES5-readable.

The fallback weak collection ponyfills attach a non-enumerable generated property to
each object key. They do not retain keys in a side list, but they are not native
ephemeron tables: keys must be extensible, associations remain on a key until
deleted or until that key is collected, and reflective property inspection can
observe the generated slot. They are not used by the MicroQuickJS build: its
compacting collector owns native weak tables, applies ephemeron marking, prunes
dead keys, and relocates surviving entries without modifying key objects.
