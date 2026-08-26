function GuestElement(reference) {
  this.reference = reference;
}

function immediate() {
  return ["r", 42];
}

function GuestDocument() {
  this._head = null;
}

Object.defineProperty(GuestDocument.prototype, "head", {
  get: function () {
    return new GuestElement(42);
  }
});

var document = new GuestDocument();
if (document.head.reference !== 42) throw 7;
return 42;
