# examples/todo

Prototype of a guest-side DOM simulation with host-side rendering.

Open `index.html` in a browser to see the TodoMVC-style app built entirely on the guest DOM API, synced to the real DOM by the host renderer.

Features:
- Add, toggle, edit, delete todos
- Filter: All / Active / Completed
- Drag-to-reorder via handle (⋮⋮)
- Guest DOM tree synced to real DOM on every state change
