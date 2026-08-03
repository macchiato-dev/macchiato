# Editor surface budgeting

The editor has separate document, DOM-surface, memory, and bridge-operation
budgets. Tune them with browser workloads rather than treating typing speed as
a proxy for resource use.

## August 2026 profile

The standalone QuickJS CodeMirror example and the Resources playground were
exercised with slow (about 90–120 ms/key), typical (45–60 ms/key), fast
(8–15 ms/key), correction, selection, undo/redo, search, navigation, and large
replacement workloads.

- The same short edit cost 19,696 operations at each typing rate. Wall-clock
  speed did not amplify bridge work.
- Ordinary fast typing/correction peaked at 342 operations in one allocation
  and retained about 40 DOM elements.
- A compact 100-line highlighted document plus undo/search/navigation peaked at
  447 operations and stayed inside its 800-element surface.
- A deliberately repetitive 250-line JavaScript paste exercised 1,621 live
  elements: 1,260 syntax spans and 360 divs. Its largest allocation used 24,345
  bridge operations.
- The existing 5,000-line replacement regression needs more than 65,000 but
  fewer than 75,000 operations in its worst allocation. The default is
  therefore 75,000; 50,000 and 65,000 were tested and rejected as too tight.
- The Resources try page remained responsive across all three typing rates,
  search, and corrections. Container rejection remained local and did not stop
  its editor.

The resulting surface allows two elements per configured line plus 600, capped
at 10,000. Divs allow one per line plus 360. Syntax spans allow four per line
plus 256, capped by the total. The guest-assisted gutter retains at most 100
rows. These are ceilings for conservative transitional redraws; settled
viewport usage is usually much smaller.

## Future input recordings

A real input recording should store semantic input events and timestamps, not
raw private document content. Useful fields are event kind, input length,
selection length/direction, composition state, elapsed time, document size,
surface counts, and operation-allocation peak. Redact inserted text by default.
Replay recordings against candidate limits and require both the final document
and selection to match. A guest CodeMirror extension can additionally expose
remaining document capacity before a paste or generated edit reaches the hard
host limit.
