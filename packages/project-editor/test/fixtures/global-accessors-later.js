function laterAccessorRead() { return liveAccessor; }
gc();
liveAccessor = 33;
