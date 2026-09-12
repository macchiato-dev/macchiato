// A HighlightStyle resolves a fixed palette against Lezer tag ancestry. Cache
// those class choices, not syntax-tree positions, decorations, or DOM state.
// Each palette owns its cache; weak keys let discarded language tags go away.
export function cacheHighlightStyle(highlighter) {
  const resolve = highlighter.style;
  // An `all` style is emitted once per group, not once per tag. Leave palettes
  // using it untouched rather than changing that combination rule.
  if (resolve([]) !== null) return highlighter;
  const cache = new WeakMap();
  highlighter.style = function (tags) {
    let result = null;
    for (let index = 0; index < tags.length; index++) {
      const tag = tags[index], parents = tag.set;
      let entry = cache.get(tag);
      let same = entry && entry.parents.length === parents.length;
      // Lezer normally finishes ancestry at construction. Also tolerate a
      // caller replacing or editing the exposed list without stale styling.
      for (let parent = 0; same && parent < parents.length; parent++) {
        if (entry.parents[parent] !== parents[parent]) same = false;
      }
      if (!same) {
        entry = { parents: parents.slice(), style: resolve([tag]) };
        cache.set(tag, entry);
      }
      if (entry.style) result = result ? result + " " + entry.style : entry.style;
    }
    return result;
  };
  return highlighter;
}
