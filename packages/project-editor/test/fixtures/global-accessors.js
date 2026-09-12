// These bare references are linked before the accessor is installed. A second
// bytecode file below is linked afterward; both must see the same property.
var accessorValue = 4;
var accessorReceivers = true;
function accessorRead() { return liveAccessor; }
function accessorAssert(condition, message) {
  if (!condition) throw Error(message);
}
Object.defineProperty(globalThis, "liveAccessor", {
  get: function () {
    gc();
    accessorReceivers = accessorReceivers && this === globalThis;
    return accessorValue;
  },
  set: function (value) {
    gc();
    accessorReceivers = accessorReceivers && this === globalThis;
    accessorValue = value;
  }
});
accessorAssert(accessorRead() === 4 && globalThis.liveAccessor === 4, "initial getter");
liveAccessor = 9;
accessorAssert(++liveAccessor === 10 && accessorValue === 10, "identifier setter");
globalThis.liveAccessor = 11;
accessorAssert(accessorRead() === 11, "property setter");
load("global-accessors-later.bin");
accessorAssert(accessorRead() === 33 && laterAccessorRead() === 33, "late module binding");
Object.defineProperty(globalThis, "liveAccessor", { get: function () { gc(); return accessorValue + 1; } });
accessorAssert(accessorRead() === 34 && laterAccessorRead() === 34, "updated getter");
var accessorErrors = 0;
Object.defineProperty(globalThis, "liveAccessor", { get: function () { gc(); throw Error("getter failure"); } });
try { accessorRead(); } catch (error) { if (error.message === "getter failure") accessorErrors++; }
try { laterAccessorRead(); } catch (laterError) { if (laterError.message === "getter failure") accessorErrors++; }
Object.defineProperty(globalThis, "liveAccessor", { get: function () { return accessorValue; } });
Object.defineProperty(globalThis, "liveAccessor", { set: function () { gc(); throw Error("setter failure"); } });
try { liveAccessor = 100; } catch (setterError) { if (setterError.message === "setter failure") accessorErrors++; }
accessorAssert(accessorRead() === 33, "throwing setter leaves its value unchanged");
Object.defineProperty(globalThis, "readOnlyAccessor", { get: function () { return liveAccessor; } });
try { readOnlyAccessor = 100; } catch (readOnlyError) { if (readOnlyError instanceof TypeError) accessorErrors++; }
accessorAssert(readOnlyAccessor === 33, "nested getter and missing setter");
Object.defineProperty(globalThis, "writeOnlyAccessor", { set: function (value) { accessorValue = value; } });
writeOnlyAccessor = 41;
accessorAssert(typeof writeOnlyAccessor === "undefined" && writeOnlyAccessor === undefined, "missing getter");
var ordinaryCaptured = (function () { var value = 7; return function () { return ++value; }; })();
gc();
accessorAssert(ordinaryCaptured() === 8 && ordinaryCaptured() === 9, "ordinary captured variables");
__wwcPostMessage(JSON.stringify({ live: accessorRead() === 41, late: laterAccessorRead() === 41,
  receivers: accessorReceivers, errors: accessorErrors, compacted: true }));
