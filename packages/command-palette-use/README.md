# command-palette-use

Declarative commands and combined instant search for a small native browser
dialog. The model accepts only same-origin route commands. The shared client
adds platform-aware ⌘ K/Ctrl K activation, filters commands locally, and turns
the final row into an explicit “search elsewhere” navigation.

The module owns no global search index. Applications supply their declared
commands and can later replace the search row with a schema-bound search
provider without changing the palette interaction.
