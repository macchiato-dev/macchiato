(() => {
  // node_modules/wordgard/dist/doc.js
  var TextOutput = class {
    blockSep;
    leafText;
    text = "";
    started = false;
    constructor(blockSep, leafText) {
      this.blockSep = blockSep;
      this.leafText = leafText;
    }
    serialize(node) {
      let nodeText = node.isPlot ? null : node.isText ? node.param : node.type.spec.toText ? node.type.spec.toText(node) : this.leafText ? this.leafText(node) : "";
      if (node.isLeaf ? node.type.isBlock && nodeText : node.isTextblock)
        this.openBlock();
      if (nodeText != null) {
        this.text += nodeText;
        this.started = true;
      }
      return nodeText != null;
    }
    openBlock() {
      if (this.started)
        this.text += this.blockSep;
      else
        this.started = true;
    }
  };
  var SchemaError = class extends Error {
  };
  var ValidationError = class extends Error {
  };
  var Token = /* @__PURE__ */ (function(Token2) {
    (function(Type) {
      Type[Type["Open"] = 0] = "Open";
      Type[Type["Close"] = 1] = "Close";
      Type[Type["Node"] = 2] = "Node";
    })(Token2.Type || (Token2.Type = {}));
    Token2.End = {
      tokenType: Token2.Type.Close,
      toString() {
        return "[end]";
      }
    };
    ;
    return Token2;
  })({});
  var Slice = class _Slice {
    content;
    length;
    constructor(content) {
      this.content = content;
      this.length = content.reduce((l, e) => l + (e.tokenType == Token.Type.Node ? e.length : 1), 0);
    }
    static of(content) {
      return new _Slice(content);
    }
    eq(other) {
      if (other.content.length != this.content.length)
        return false;
      for (let i = 0; i < this.content.length; i++) {
        let a = this.content[i], b = other.content[i];
        if (a == Token.End) {
          if (b != Token.End)
            return false;
        } else if (a.tokenType == Token.Type.Node) {
          if (!(b.tokenType == Token.Type.Node && a.eq(b)))
            return false;
        } else if (a.tokenType == Token.Type.Open) {
          if (!(b.tokenType == Token.Type.Open && a.eq(b)))
            return false;
        }
      }
      return true;
    }
    run(track, startPos = 0) {
      let pos = startPos;
      for (let elt of this.content) {
        if (elt.tokenType == Token.Type.Open)
          track.open(elt, pos++);
        else if (elt.tokenType == Token.Type.Node) {
          track.node(elt, pos);
          pos += elt.length;
        } else
          track.close(pos++);
      }
    }
    slice(from, to = this.length) {
      if (from == to)
        return _Slice.empty;
      let result = [], off = 0;
      for (let elt of this.content) {
        let start = off;
        off += elt.tokenType == Token.Type.Node ? elt.length : 1;
        if (off <= from)
          continue;
        if (start < from || off > to) {
          let inner = elt.sliceInner(Math.max(0, from - start), Math.min(elt.length, to - start));
          for (let elt2 of inner.content)
            result.push(elt2);
        } else {
          result.push(elt);
        }
        if (off >= to)
          break;
      }
      return new _Slice(result);
    }
    concat(other) {
      let content = this.content.slice();
      let i = 0;
      if (content.length && other.content.length && other.content[0].tokenType == Token.Type.Node && content[content.length - 1].tokenType == Token.Type.Node) {
        other.content[0].pushTo(content);
        i = 1;
      }
      for (; i < other.content.length; i++)
        content.push(other.content[i]);
      return new _Slice(content);
    }
    textContent(options = {}) {
      let { blockSeparator = "\n", leafText } = options;
      let out = new TextOutput(blockSeparator, leafText == null ? void 0 : typeof leafText == "string" ? () => leafText : leafText);
      for (let tok of this.content) {
        if (tok.tokenType == Token.Type.Open) {
          if (tok.isTextblock)
            out.openBlock();
        } else if (tok.tokenType == Token.Type.Node) {
          if (tok.isLeaf)
            out.serialize(tok);
          else
            tok.iterate((node) => !out.serialize(node));
        }
      }
      return out.text;
    }
    static empty = /* @__PURE__ */ (() => new _Slice([]))();
    toString() {
      return `<${this.content.join()}>`;
    }
    toJSON() {
      return this.content.map((e) => e.tokenType == Token.Type.Close ? "." : e.toJSON());
    }
    static fromJSON(schema, json) {
      if (!Array.isArray(json))
        throw new ValidationError("Invalid slice JSON");
      return new _Slice(json.map((value) => {
        if (value === ".")
          return Token.End;
        if (!value || typeof value.type != "string")
          throw new ValidationError("Invalid slice JSON");
        let type = schema.getNode(value.type);
        return type?.isLeaf || "content" in value ? schema.nodeFromJSON(value) : schema.tagFromJSON(value);
      }));
    }
  };
  var noChildren = [];
  var Elt = class _Elt {
    tagName;
    attrs;
    children;
    constructor(tagName, attrs, children) {
      this.tagName = tagName;
      this.attrs = attrs;
      this.children = children;
    }
    static create(tagName, attrs, children) {
      return new _Elt(tagName, attrs, children);
    }
    static mk(name, arg1, arg2) {
      let [attrs, children] = arg2 ? [Attributes.read(arg1), arg2] : !arg1 ? [Attributes.none, noChildren] : Array.isArray(arg1) ? [Attributes.none, arg1] : [Attributes.read(arg1), noChildren];
      if (children.length == 1 && children[0] === 0)
        children = _Elt.hole;
      return new _Elt(name, attrs, children);
    }
    get hasContent() {
      return this.children.some((ch) => ch === 0 || ch instanceof _Elt && ch.hasContent);
    }
    eqTag(elt) {
      return elt.tagName == this.tagName && Attributes.eq(this.attrs, elt.attrs);
    }
    eqChildren(elt) {
      if (elt.children == this.children)
        return true;
      if (this.children.length != elt.children.length)
        return false;
      for (let i = 0; i < this.children.length; i++) {
        let a = this.children[i], b = elt.children[i];
        if (a !== b && (!a || !b || typeof a != "object" || typeof b != "object" || a.constructor != b.constructor || !a.eq || !a.eq(b)))
          return false;
      }
      return true;
    }
    eq(other) {
      return other instanceof _Elt && this.eqTag(other) && this.eqChildren(other);
    }
    outerDOM(doc2 = document) {
      let { tagName: name, attrs } = this;
      let dom = /^svg:/.test(name) ? doc2.createElementNS("http://www.w3.org/2000/svg", name.slice(4)) : /^math:/.test(name) ? doc2.createElementNS("http://www.w3.org/1998/Math/MathML", name.slice(5)) : doc2.createElement(name);
      for (let i = 0; i < attrs.length; )
        dom.setAttribute(attrs[i++], attrs[i++]);
      return dom;
    }
    wrap(wrapper, target) {
      if (target) {
        let added = this.modifyBySelector(wrapper, target);
        if (added)
          return added;
      }
      return wrapper.fill([this]);
    }
    addAttrs(attrs, target) {
      if (target) {
        let added = this.modifyBySelector(attrs, target);
        if (added)
          return added;
      }
      return _Elt.create(this.tagName, Attributes.merge(this.attrs, attrs), this.children);
    }
    fill(content) {
      let children = [];
      for (let ch of this.children) {
        if (ch === 0) {
          for (let c of content)
            children.push(c);
        } else if (ch instanceof _Elt && ch.hasContent) {
          children.push(ch.fill(content));
        } else {
          children.push(ch);
        }
      }
      return new _Elt(this.tagName, this.attrs, children);
    }
    modifyBySelector(mod, target) {
      if (target.match(this))
        return mod instanceof _Elt ? mod.fill([this]) : this.addAttrs(mod);
      for (let i = 0; i < this.children.length; i++) {
        let ch = this.children[i], matched;
        if (ch instanceof _Elt && (matched = ch.modifyBySelector(mod, target))) {
          let copy2 = this.children.slice();
          copy2[i] = matched;
          return _Elt.create(this.tagName, this.attrs, copy2);
        }
      }
      return null;
    }
    toHTML() {
      return toHTML(this);
    }
    toDOM(doc2) {
      return toDOM(this, doc2);
    }
    static empty = [];
    static hole = [0];
  };
  var selfClosing = /* @__PURE__ */ (() => /* @__PURE__ */ new Set([
    "area",
    "base",
    "br",
    "col",
    "command",
    "embed",
    "frame",
    "hr",
    "img",
    "input",
    "keygen",
    "link",
    "meta",
    "param",
    "source",
    "track",
    "wbr",
    "menuitem"
  ]))();
  Elt = /* @__PURE__ */ (function(Elt2) {
    class Fragment {
      content;
      constructor(content) {
        this.content = content;
      }
      static create(content) {
        return new Fragment(content);
      }
      toHTML() {
        return toHTML(this);
      }
      toDOM(doc2) {
        let frag = getDoc(doc2).createDocumentFragment();
        for (let ch of this.content)
          frag.appendChild(toDOM(ch, doc2));
        return frag;
      }
    }
    Elt2.Fragment = Fragment;
    class Selector {
      tag;
      classes;
      constructor(tag, classes) {
        this.tag = tag;
        this.classes = classes;
      }
      eq(other) {
        return other.tag == this.tag && this.classes.length == other.classes.length && this.classes.every((c, i) => c == other.classes[i]);
      }
      match(elt) {
        if (this.tag && elt.tagName != this.tag)
          return false;
        if (this.classes.length) {
          let tagCls = Attributes.get(elt.attrs, "class");
          if (!tagCls)
            return false;
          let pieces = tagCls.split(/ +/);
          for (let cls of this.classes)
            if (!pieces.includes(cls))
              return false;
        }
        return true;
      }
      static parse(selector) {
        let m, tag = null, classes = [], txt = selector;
        if (m = /^[\w\d\-_\u0c00-\uffff]+/.exec(txt)) {
          tag = m[0];
          txt = txt.slice(m[0].length);
        }
        while (m = /^\.[\w\d\-_\u0c00-\uffff]+/.exec(txt)) {
          classes.push(m[0].slice(1));
          txt = txt.slice(m[0].length);
        }
        if (txt)
          throw new Error("Invalid element selector " + selector);
        return new Selector(tag, classes);
      }
    }
    Elt2.Selector = Selector;
    ;
    return Elt2;
  })(Elt);
  function toHTML(content) {
    let html = "";
    function scan(elt) {
      if (typeof elt == "string") {
        html += elt.replace(/[<&]/g, (ch) => ch == "<" ? "&lt;" : "&amp;");
        return;
      } else if (elt === 0) {
        return;
      }
      let { tagName: name, attrs } = elt, svg2, math;
      if (svg2 = /^svg:/.test(name))
        name = name.slice(4);
      if (math = /^math:/.test(name))
        name = name.slice(5);
      if (svg2 && name == "svg")
        html += `<svg xmlns="http://www.w3.org/2000/svg"`;
      if (math && name == "math")
        html += `<math xmlns="http://www.w3.org/1998/Math/MathML"`;
      else
        html += `<${name}`;
      for (let i = 0; i < attrs.length; ) {
        let name2 = attrs[i++], val = attrs[i++];
        html += ` ${name2}="${val.replace(/["&]/g, (ch) => ch == '"' ? "&quot;" : "&amp;")}"`;
      }
      if ((math || svg2) && !elt.children.length) {
        html += "/>";
      } else if (!math && !svg2 && selfClosing.has(name)) {
        html += ">";
      } else {
        html += ">";
        for (let ch of elt.children)
          scan(ch);
        html += `</${name}>`;
      }
    }
    if (content instanceof Elt.Fragment)
      for (let elt of content.content)
        scan(elt);
    else
      scan(content);
    return html;
  }
  function getDoc(doc2) {
    if (doc2)
      return doc2;
    if (typeof document != "object" || !document.createElement)
      throw new Error("No document available");
    return document;
  }
  function toDOM(elt, doc2) {
    doc2 = getDoc(doc2);
    if (typeof elt == "string") {
      return doc2.createTextNode(elt);
    } else {
      let dom = elt.outerDOM(doc2);
      for (let ch of elt.children)
        if (ch !== 0)
          dom.appendChild(toDOM(ch, doc2));
      return dom;
    }
  }
  var Attributes = /* @__PURE__ */ (function(Attributes2) {
    Attributes2.none = [];
    function eq(a, b) {
      if (a == b)
        return true;
      if (a.length != b.length)
        return false;
      for (let i = 0; i < a.length; i++)
        if (a[i] != b[i])
          return false;
      return true;
    }
    Attributes2.eq = eq;
    function compare(a, b) {
      for (let iA = 0, iB = 0, score = 0; ; ) {
        if (iA < a.length && iB < b.length && a[iA] == b[iB]) {
          if (a[iA + 1] != b[iB + 1])
            score--;
          iA += 2;
          iB += 2;
        } else if (iA < a.length && (iB == b.length || a[iA] < b[iB])) {
          score--;
          iA += 2;
        } else if (iB < b.length && iA < a.length) {
          score--;
          iB += 2;
        } else {
          return score;
        }
      }
    }
    Attributes2.compare = compare;
    function merge(a, b) {
      if (!a.length)
        return b;
      if (!b.length)
        return a;
      let result = [];
      for (let iA = 0, iB = 0; ; ) {
        let kA = iA < a.length ? a[iA] : null, kB = iB < b.length ? b[iB] : null;
        if (kA == kB) {
          if (kA == null)
            return result;
          let value = b[iB + 1];
          if (kA == "class")
            value = a[iA + 1] + " " + value;
          else if (kA == "style")
            value = a[iA + 1] + ";" + value;
          result.push(kA, value);
          iA += 2;
          iB += 2;
        } else if (kA != null && (kB == null || kA < kB)) {
          result.push(kA, a[iA + 1]);
          iA += 2;
        } else {
          result.push(kB, b[iB + 1]);
          iB += 2;
        }
      }
    }
    Attributes2.merge = merge;
    function push(a, name, value) {
      let i = 0;
      while (i < a.length && a[i] < name)
        i += 2;
      if (i < a.length && a[i] == name) {
        if (name == "class")
          a[i + 1] += " " + value;
        else if (name == "style")
          a[i + 1] += ";" + value;
        else
          a[i + 1] = value;
      } else {
        a.splice(i, 0, name, value);
      }
    }
    Attributes2.push = push;
    function read(obj) {
      let result = [];
      for (let prop in obj)
        if (prop != "_") {
          let value = obj[prop];
          if (value != null) {
            if (/^style\//.test(prop)) {
              value = prop.slice(6) + ": " + value;
              prop = "style";
            }
            Attributes2.push(result, prop, value);
          }
        }
      return result.length ? result : Attributes2.none;
    }
    Attributes2.read = read;
    function get(attrs, name) {
      for (let i = 0; i < attrs.length; i += 2)
        if (attrs[i] == name)
          return attrs[i + 1];
      return null;
    }
    Attributes2.get = get;
    ;
    return Attributes2;
  })({});
  var NodeShape = class _NodeShape {
    atom;
    create;
    constructor(atom, create) {
      this.atom = atom;
      this.create = create;
    }
    static from(name, leaf, spec) {
      let atom = spec.atom, create;
      if ("element" in spec) {
        if (atom == null)
          atom = leaf;
        let { element, attributes } = spec;
        if (typeof attributes == "function") {
          create = (param) => Elt.create(element, Attributes.read(attributes(param)), atom ? Elt.empty : Elt.hole);
        } else {
          let elt = Elt.create(element, attributes ? Attributes.read(attributes) : Attributes.none, atom ? Elt.empty : Elt.hole);
          create = () => elt;
        }
      } else {
        if (leaf)
          atom = true;
        let { structure } = spec;
        if (typeof structure == "function") {
          if (atom == null)
            throw new Error(`Dynamic structure for tag ${name} must define an \`atom\` field`);
          create = structure;
        } else {
          if (atom == null)
            atom = !structure.hasContent;
          else if (atom != !structure.hasContent)
            throw new Error(`Disagreement between \`atom\` field and structure for tag ${name}`);
          create = () => structure;
        }
      }
      if (atom == false && leaf)
        throw new Error(`Leaf tag ${name}'s shape must be atomic`);
      return new _NodeShape(atom, create);
    }
  };
  var none = [];
  function compareDeep(a, b) {
    if (a === b)
      return true;
    if (!a || !b || typeof a != "object" || typeof b != "object")
      return false;
    let array = Array.isArray(a);
    if (Array.isArray(b) != array)
      return false;
    if (array) {
      if (a.length != b.length)
        return false;
      for (let i = 0; i < a.length; i++)
        if (!compareDeep(a[i], b[i]))
          return false;
    } else {
      for (let p in a)
        if (!(p in b) || !compareDeep(a[p], b[p]))
          return false;
      for (let p in b)
        if (!(p in a))
          return false;
    }
    return true;
  }
  function eqArray(a, b) {
    if (a == b)
      return true;
    if (a.length != b.length)
      return false;
    for (let i = 0; i < a.length; i++)
      if (!a[i].eq(b[i]))
        return false;
    return true;
  }
  function validate(validator, value) {
    if (typeof validator == "string") {
      let types2 = validator.split("|");
      let name = value === null ? "null" : typeof value;
      if (types2.indexOf(name) < 0)
        throw new RangeError(`Expected value of type ${validator} got ${name}`);
    } else if (validator) {
      validator(value);
    }
    return value;
  }
  function remove(arr, index) {
    return arr.length == 1 ? none : arr.filter((_, i) => i != index);
  }
  function addSet(a, b, compare) {
    let result = [];
    for (let i = 0, j = 0; ; ) {
      if (i == a.length) {
        if (j == b.length)
          return result;
        result.push(b[j++]);
      } else if (j == b.length) {
        result.push(a[i++]);
      } else {
        let cmp = compare(a[i], b[j]);
        if (cmp == 0)
          i++;
        else if (cmp < 0)
          result.push(a[i++]);
        else
          result.push(b[j++]);
      }
    }
  }
  function subtractSet(a, b, compare) {
    let result = [];
    for (let i = 0, j = 0; ; ) {
      if (i == a.length)
        return result;
      if (j == b.length) {
        result.push(a[i++]);
      } else {
        let cmp = compare(a[i], b[j]);
        if (cmp == 0)
          i++;
        else if (cmp < 0)
          result.push(a[i++]);
        else
          j++;
      }
    }
  }
  var Mark = class _Mark {
    type;
    value;
    constructor(type, value) {
      this.type = type;
      this.value = value;
    }
    static create(type, value) {
      return new _Mark(type, value);
    }
    eq(other) {
      return this.type == other.type && compareDeep(this.value, other.value);
    }
    get name() {
      return this.type.name;
    }
    get rank() {
      return this.type.rank;
    }
    get spanning() {
      return this.type.spanning;
    }
    toString() {
      return this.value == null ? this.name : `${this.name}=${JSON.stringify(this.value)}`;
    }
    static define(name, spec) {
      return _Mark.Type.define(name, spec, true).default;
    }
    addToSet(set) {
      let placed = null, copy2 = [];
      for (let i = 0; i < set.length; i++) {
        let other = set[i];
        if (this.eq(other))
          return set;
        if (other.type != this.type) {
          if (!placed && this.type.compareRank(other.type) < 0)
            copy2.push(placed = this);
          copy2.push(other);
        } else if (this.type.set) {
          copy2.push(placed = new _Mark(this.type, addSet(other.value, this.value, this.type.set)));
        }
      }
      if (!placed)
        copy2.push(this);
      return copy2;
    }
    removeFromSet(set) {
      let type = this.type;
      for (var i = 0; i < set.length; i++)
        if (set[i].type == type) {
          let val = set[i], newSet;
          if (type.set) {
            let rest = subtractSet(val.value, this.value, type.set);
            if (!rest.length) {
              newSet = remove(set, i);
            } else {
              newSet = set.slice();
              newSet[i] = new _Mark(type, rest);
            }
          } else if (!val.eq(this)) {
            continue;
          } else {
            newSet = remove(set, i);
          }
          return newSet;
        }
      return set;
    }
    isInSet(set) {
      for (let v of set)
        if (v.eq(this))
          return v;
      return null;
    }
    static sameSet(a, b) {
      return eqArray(a, b);
    }
    static none = none;
  };
  Mark = /* @__PURE__ */ (function(Mark2) {
    class Type {
      name;
      rank;
      set;
      default;
      inclusive;
      element = null;
      attribute = null;
      spanning;
      spec;
      constructor(name, spec, isFlag) {
        this.name = name;
        this.spec = spec;
        this.rank = Math.max(0, Math.min(spec.rank ?? 100, 100));
        this.set = spec.set ? spec.set.compare : null;
        this.default = isFlag || "defaultParam" in spec ? Mark2.create(this, isFlag ? null : spec.defaultParam) : null;
        this.inclusive = spec.inclusive !== false;
        if ("element" in spec.shape)
          this.element = new ElementShape(spec.shape);
        else
          this.attribute = new AttributeShape(spec.shape, this);
        this.spanning = this.element ? spec.spanning !== false : !!spec.spanning;
      }
      of(value) {
        return Mark2.create(this, value);
      }
      compareRank(other) {
        return this.rank - other.rank || (other.name < this.name ? 1 : -1);
      }
      removeFromSet(set) {
        for (var i = 0; i < set.length; i++)
          if (set[i].type == this)
            return remove(set, i);
        return set;
      }
      isInSet(set) {
        for (let v of set)
          if (v.type == this)
            return v;
        return null;
      }
      get isElement() {
        return !!this.element;
      }
      static define(name, spec, isFlag = false) {
        return new Mark2.Type(name, spec, isFlag);
      }
    }
    Mark2.Type = Type;
    ;
    return Mark2;
  })(Mark);
  var ElementShape = class {
    name;
    attrs;
    constructor(spec) {
      this.name = spec.element;
      const { attributes } = spec;
      if (typeof attributes == "function") {
        this.attrs = (value) => Attributes.read(attributes(value));
      } else {
        let attrs = attributes ? Attributes.read(attributes) : Attributes.none;
        this.attrs = () => attrs;
      }
    }
  };
  var AttributeShape = class {
    get;
    target;
    constructor(spec, type) {
      if ("attribute" in spec) {
        const { value, attribute } = spec, style2 = /^style\//.test(attribute) ? attribute.slice(6) + ": " : null;
        if (value === 0) {
          if (type.default)
            throw new SchemaError("Attribute shapes for parameter-less marks cannot use 0 as value");
          if (style2)
            this.get = (param) => ["style", style2 + param];
          else
            this.get = (param) => [attribute, String(param)];
        } else if (typeof value == "function") {
          if (style2)
            this.get = (param) => {
              let val = value(param);
              return val == null ? Attributes.none : ["style", style2 + val];
            };
          else
            this.get = (param) => {
              let val = value(param);
              return val == null ? Attributes.none : [attribute, val];
            };
        } else {
          let attrs = style2 ? ["style", style2 + value] : [attribute, value];
          this.get = () => attrs;
        }
      } else {
        const { attributes } = spec;
        if (typeof attributes == "function") {
          this.get = (param) => Attributes.read(attributes(param));
        } else {
          let attrs = Attributes.read(attributes);
          this.get = () => attrs;
        }
      }
      this.target = spec.preferTarget ? Elt.Selector.parse(spec.preferTarget) : null;
    }
  };
  var Pos = class _Pos {
    parent;
    pos;
    index;
    inText;
    constructor(parent, pos, index, inText) {
      this.parent = parent;
      this.pos = pos;
      this.index = index;
      this.inText = inText;
    }
    static create(parent, pos, index, inText) {
      return new _Pos(parent, pos, index, inText);
    }
    matchingParent(pred) {
      for (let { parent } = this; ; ) {
        if (pred(parent.node))
          return parent;
        if (!parent.parent)
          return null;
        ({ parent } = parent);
      }
    }
    advance(distance, walk) {
      return distance ? advancePos(distance, this.parent, this.pos, this.index, this.inText, walk) : this;
    }
    walk(distance, walk) {
      return distance ? advancePos(distance, this.parent, this.pos, this.index, this.inText, walk, true) : this;
    }
    get nodeAfter() {
      if (this.index == this.parent.node.content.length)
        return null;
      let node = this.parent.node.content[this.index];
      return this.inText ? node.sliceText(this.inText) : node;
    }
    get nodeBefore() {
      if (this.inText)
        return this.parent.node.content[this.index].sliceText(0, this.inText);
      return this.index ? this.parent.node.content[this.index - 1] : null;
    }
    get textblockParent() {
      for (let p = this.parent; ; p = p.parent) {
        if (!p || !p.node.inlineContent)
          return null;
        if (p.node.isTextblock)
          return p;
      }
    }
    get depth() {
      return this.parent.depth;
    }
    parentAt(depth2) {
      let d = this.depth;
      if (depth2 > d)
        throw new RangeError("Asking for parent deeper than position depth");
      for (let d2 = this.depth, p = this.parent; ; p = p.parent)
        if (d2 == depth2)
          return p;
    }
    isAtStart(parent) {
      if (this.inText)
        return false;
      for (let p = this.parent, index = this.index; ; index = p.index, p = p.parent) {
        if (!p || index)
          return false;
        if (p.pos == parent.pos)
          return true;
      }
    }
    isAtEnd(parent) {
      if (this.inText)
        return false;
      for (let p = this.parent, index = this.index; ; index = p.index + 1, p = p.parent) {
        if (!p || index < p.node.content.length)
          return false;
        if (p.pos == parent.pos)
          return true;
      }
    }
    get doc() {
      return this.parent.doc;
    }
    marks(across) {
      if (this.inText && (!across || across.pos == this.pos))
        return this.parent.node.content[this.index].tag.marks;
      let [from, to] = !across ? [this, this] : across.pos > this.pos ? [this, across] : [across, this];
      if (!from.parent.node.inlineContent || !to.parent.node.inlineContent)
        return Mark.none;
      let before = from.nodeBefore, after = to.nodeAfter;
      let [main2, sec] = before ? [before.tag.marks, after ? after.tag.marks : none] : [after ? after.tag.marks : none, none];
      return main2.filter((p) => p.spanning && (p.type.inclusive || p.isInSet(sec)));
    }
    static resolve(doc2, pos) {
      if (pos < 0 || pos > doc2.length)
        throw new RangeError(`Resolving invalid position ${pos}`);
      let { top: top2, cache: cache2 } = cacheFor(doc2), nearest, nearestDist = 0, result;
      if (pos == 0)
        return _Pos.create(top2, 0, 0, 0);
      for (let elt of cache2) {
        if (elt.pos == pos)
          return elt;
        let dist2 = Math.abs(elt.pos - pos);
        if (!nearest || dist2 < nearestDist) {
          nearest = elt;
          nearestDist = dist2;
        }
      }
      if (nearest) {
        let { parent } = nearest;
        while (parent.start > pos || parent.end < pos)
          parent = parent.parent;
        result = advancePos(pos - parent.start, parent, parent.start, 0, 0);
      } else {
        result = advancePos(pos, top2, 0, 0, 0);
      }
      return cache2[cache2.length < cacheSize ? cache2.length : cachePos = (cachePos + 1) % cacheSize] = result;
    }
    static resolveNode(doc2, pos) {
      let base = this.resolve(doc2, pos);
      if (base.inText)
        return null;
      let after = base.nodeAfter;
      return !after || after.isText ? null : after.isLeaf ? _Pos.Node.create(base.parent, after, pos, base.index) : _Pos.Plot.create(base.parent, after, pos, base.index);
    }
  };
  Pos = /* @__PURE__ */ (function(Pos2) {
    class Node2 {
      parent;
      node;
      pos;
      index;
      constructor(parent, node, pos, index) {
        this.parent = parent;
        this.node = node;
        this.pos = pos;
        this.index = index;
      }
      static create(parent, node, pos, index) {
        return new Node2(parent, node, pos, index);
      }
      get before() {
        if (this.pos < 0)
          throw new RangeError("Accessing `before` on the top level node");
        return this.pos;
      }
      get after() {
        if (this.pos < 0)
          throw new RangeError("Accessing `after` on the top level node");
        return this.pos + this.node.length;
      }
      get depth() {
        let d = 0;
        for (let n = this; n.parent; n = n.parent)
          d++;
        return d;
      }
      get doc() {
        let n = this;
        while (n.parent)
          n = n.parent;
        if (!n.node.isDoc)
          throw new Error("Outer parent not a document");
        return n.node;
      }
      get isFirst() {
        return !this.parent || this.index == 0;
      }
      get isLast() {
        return !this.parent || this.index == this.parent.node.content.length - 1;
      }
      get nextSibling() {
        return this.isLast ? null : this.parent.node.content[this.index + 1];
      }
      get previousSibling() {
        return this.isFirst ? null : this.parent.node.content[this.index - 1];
      }
    }
    Pos2.Node = Node2;
    class Plot2 extends Pos2.Node {
      constructor(parent, node, pos, index) {
        super(parent, node, pos, index);
      }
      static create(parent, node, pos, index) {
        return new Plot2(parent, node, pos, index);
      }
      get start() {
        return this.pos + 1;
      }
      get end() {
        return this.pos + 1 + this.node.contentLength;
      }
    }
    Pos2.Plot = Plot2;
    ;
    return Pos2;
  })(Pos);
  var posCache = /* @__PURE__ */ (() => /* @__PURE__ */ new Map())();
  var cacheSize = 8;
  var cachePos = 0;
  function cacheFor(doc2) {
    let found = posCache.get(doc2);
    if (!found)
      posCache.set(doc2, found = { top: Pos.Plot.create(null, doc2, -1, 0), cache: [] });
    return found;
  }
  function advancePos(distance, parent, pos, index, inText, walk, full = false) {
    let target = pos + distance, { node } = parent;
    if (inText) {
      let text = node.content[index];
      let textStart = pos - inText, textEnd = textStart + text.length;
      if (walk)
        walk.skip(text.sliceText(inText, Math.min(text.length, target - textStart)), pos, parent, index);
      if (target < textEnd)
        return Pos.create(parent, target, index, target - textStart);
      pos = textEnd;
      index++;
    }
    while (pos < target) {
      if (index == node.content.length) {
        if (!parent.parent)
          throw new Error("Moving past end of document");
        if (walk)
          walk.leavePlot(node.tag, pos, parent.parent, parent.index);
        ({ index, parent } = parent);
        node = parent.node;
        index++;
        pos++;
      } else {
        let next = node.content[index], end = pos + next.length;
        if (next.isLeaf) {
          if (next.isText && target < end) {
            if (walk)
              walk.skip(next.sliceText(0, target - pos), pos, parent, index);
            return Pos.create(parent, target, index, target - pos);
          } else {
            if (walk)
              walk.skip(next, pos, parent, index);
            pos = end;
            index++;
          }
        } else {
          let enter2 = full || target < end;
          if (walk) {
            if (!enter2)
              walk.skip(next, pos, parent, index);
            else if (walk.enterPlot(next, pos, parent, index) === false && target >= end)
              enter2 = false;
          }
          if (enter2) {
            parent = Pos.Plot.create(parent, next, pos, index);
            pos++;
            node = next;
            index = 0;
          } else {
            pos = end;
            index++;
          }
        }
      }
    }
    return Pos.create(parent, pos, index, 0);
  }
  var BaseType = class {
    name;
    flags;
    shape;
    roles = /* @__PURE__ */ new Set();
    constructor(name, flags, spec, shape) {
      this.name = name;
      this.flags = flags;
      this.shape = shape;
      if (spec.role instanceof Node.Role)
        this.roles.add(spec.role);
      else if (spec.role)
        for (let role of spec.role)
          this.roles.add(role);
      if (this.shape.atom)
        this.flags |= 4;
    }
    hasRole(role) {
      return this.roles.has(role);
    }
    get isInline() {
      return (this.flags & 1) > 0;
    }
    get isBlock() {
      return (this.flags & 1) == 0;
    }
    get isAtom() {
      return (this.flags & 4) > 0;
    }
    get isSelectable() {
      return (this.flags & 32) > 0;
    }
  };
  var BaseTag = class {
    param;
    marks;
    constructor(param, marks) {
      this.param = param;
      this.marks = marks;
    }
    mark(mark) {
      for (let v of this.marks)
        if (v.type == mark)
          return v.value;
      return void 0;
    }
    get name() {
      return this.type.name;
    }
    get isText() {
      return this.type == Leaf.Text;
    }
    is(type) {
      return this.type == type;
    }
    toJSON() {
      let result = { type: this.name };
      if (this != this.type.default)
        result.param = this.param;
      if (this.marks.length) {
        result.marks = /* @__PURE__ */ Object.create(null);
        for (let { name, value } of this.marks)
          result.marks[name] = value;
      }
      return result;
    }
  };
  var Node = /* @__PURE__ */ (function(Node2) {
    (function(Type) {
      function get(ref) {
        return ref instanceof BaseType ? ref : ref.type;
      }
      Type.get = get;
    })(Node2.Type || (Node2.Type = {}));
    class Group {
      parent;
      constructor(parent) {
        this.parent = parent;
      }
      static define(parent) {
        return new Group(parent);
      }
      static All = Group.define();
      static Inline = Group.define();
      static Block = Group.define();
      static Leaf = Group.define();
      static Plot = Group.define();
      static Textblock = Group.define();
      static Content = Group.define();
      static TableCell = Group.define();
      static ListItem = Group.define();
      static builtin = [Group.All, Group.Inline, Group.Block, Group.Leaf, Group.Plot, Group.Textblock];
    }
    Node2.Group = Group;
    class Role {
      constructor() {
      }
      static define() {
        return new Role();
      }
      static Code = Role.define();
      static List = Role.define();
      static LineBreak = Role.define();
    }
    Node2.Role = Role;
    ;
    return Node2;
  })({});
  var Leaf = class _Leaf extends BaseTag {
    type;
    constructor(type, param, marks) {
      super(param, marks);
      this.type = type;
    }
    static new(type, param, marks) {
      return new _Leaf(type, param, marks);
    }
    get tag() {
      return this;
    }
    eq(other) {
      return this == other || other.isLeaf && this.type == other.type && compareDeep(this.param, other.param) && Mark.sameSet(this.marks, other.marks);
    }
    static define(name, spec) {
      return _Leaf.Type.new(name, flagsFor(spec) | 16, spec).default;
    }
    withMarks(marks) {
      return Mark.sameSet(this.marks, marks) ? this : this.type.of(this.param, marks);
    }
    get tokenType() {
      return Token.Type.Node;
    }
    get isLeaf() {
      return true;
    }
    get isPlot() {
      return false;
    }
    get length() {
      return this.is(_Leaf.Text) ? this.param.length : 1;
    }
    pushTo(nodes) {
      if (this.is(_Leaf.Text)) {
        let prevI = nodes.length - 1, prev = prevI >= 0 ? nodes[prevI] : null;
        if (prev && prev.is(_Leaf.Text) && Mark.sameSet(prev.marks, this.marks)) {
          nodes[prevI] = _Leaf.text(prev.param + this.param, this.marks);
          return;
        }
      }
      nodes.push(this);
    }
    sliceInner(from, to) {
      return from == to ? Slice.empty : Slice.of([this.is(_Leaf.Text) ? this.sliceText(from, to) : this]);
    }
    sliceText(from, to) {
      if (!this.is(_Leaf.Text))
        throw new Error("Calling sliceText on a non-text node");
      if (to == null)
        to = this.param.length;
      if (!from && to == this.param.length)
        return this;
      return _Leaf.Text.of(this.param.slice(Math.max(from, 0), Math.max(0, to)), this.marks);
    }
    static text(text, marks = Mark.none) {
      return _Leaf.Text.of(text, marks);
    }
    toString() {
      return (this.is(_Leaf.Text) ? JSON.stringify(this.param) : this.name) + markString(this.marks);
    }
  };
  Leaf = /* @__PURE__ */ (function(Leaf2) {
    class Type extends BaseType {
      default;
      spec;
      constructor(name, flags, spec) {
        super(name, flags, spec, NodeShape.from(name, true, spec.shape));
        this.spec = spec;
        this.default = "defaultParam" in spec ? Leaf2.new(this, spec.defaultParam, none) : flags & 16 ? Leaf2.new(this, null, none) : null;
      }
      static new(name, flags, spec) {
        return new Type(name, flags, spec);
      }
      static define(name, spec) {
        return new Leaf2.Type(name, flagsFor(spec), spec);
      }
      of(param, marks = Mark.none) {
        if (!marks.length && this.default && compareDeep(this.default.param, param))
          return this.default;
        return Leaf2.new(this, param, marks);
      }
      get isLeaf() {
        return true;
      }
      get isPlot() {
        return false;
      }
    }
    Leaf2.Type = Type;
    Leaf2.Text = Leaf2.Type.new("Text", 1, {
      shape: { element: "" }
    });
    ;
    return Leaf2;
  })(Leaf);
  var Plot = class _Plot {
    tag;
    content;
    constructor(tag, content) {
      this.tag = tag;
      this.content = content;
      this.tag = tag;
      this.contentLength = content.reduce((s, c) => s + c.length, 0);
    }
    contentLength;
    static create(tag, content) {
      return new _Plot(tag, content);
    }
    get name() {
      return this.tag.name;
    }
    get type() {
      return this.tag.type;
    }
    get marks() {
      return this.tag.marks;
    }
    get length() {
      return 2 + this.contentLength;
    }
    eq(other) {
      return this == other || other instanceof _Plot && this.tag.eq(other.tag) && this.contentEq(other);
    }
    contentEq(other) {
      return eqArray(this.content, other.content);
    }
    sliceInner(from, to) {
      if (from == to)
        return Slice.empty;
      let content = [];
      this.slicePlot(content, from, to);
      return Slice.of(content);
    }
    slicePlot(out, from, to) {
      if (from <= 0) {
        if (to >= this.length) {
          out.push(this);
          return;
        }
        out.push(this.tag);
      }
      sliceContent(out, this.content, from - 1, to - 1);
      if (to >= this.length)
        out.push(_Plot.End);
    }
    is(type) {
      return false;
    }
    get isText() {
      return false;
    }
    get inlineContent() {
      return this.type.inlineContent;
    }
    get isTextblock() {
      return this.type.isTextblock;
    }
    get isLeaf() {
      return false;
    }
    get isPlot() {
      return true;
    }
    get isDoc() {
      return this.type.isDoc;
    }
    get firstChild() {
      return this.content.length ? this.content[0] : null;
    }
    get lastChild() {
      let last = this.content.length - 1;
      return last < 0 ? null : this.content[last];
    }
    iterate(a, b, c) {
      let [from, to, f] = typeof a == "number" ? [a, b, c] : [0, this.length, a];
      if (this.isDoc || f(this, 0, null, 0) !== false)
        this.iterInner(0, from, to, f);
    }
    nodeAt(pos) {
      for (let node of this.content) {
        if (pos == 0)
          return node.isText ? null : node;
        if (pos < node.length)
          return node.isLeaf ? null : node.nodeAt(pos - 1);
        pos -= node.length;
      }
      return null;
    }
    plotAt(pos) {
      let node = this.nodeAt(pos);
      return node instanceof _Plot ? node : null;
    }
    textContent(options = {}) {
      let { from = 0, to = this.length, blockSeparator = "\n", leafText } = options;
      let out = new TextOutput(blockSeparator, leafText == null ? void 0 : typeof leafText == "string" ? () => leafText : leafText);
      this.iterate(from, to, (node, pos) => {
        return !out.serialize(node.is(Leaf.Text) ? node.sliceText(Math.max(0, from - pos), Math.min(node.length, to - pos)) : node);
      });
      return out.text;
    }
    iterInner(contentStart, from, to, f) {
      for (let pos = contentStart, i = 0; i < this.content.length; i++) {
        if (pos >= to)
          break;
        let node = this.content[i], start = pos;
        pos += node.length;
        if (pos <= from)
          continue;
        if (f(node, start, this, i) !== false && node.isPlot)
          node.iterInner(start + 1, from, to, f);
      }
    }
    toString() {
      return this.name + markString(this.tag.marks) + "(" + this.content.join() + ")";
    }
    toJSON() {
      let result = this.tag.toJSON();
      result.content = this.content.map((c) => c.toJSON());
      return result;
    }
    mark(mark) {
      return this.tag.mark(mark);
    }
    pushTo(nodes) {
      nodes.push(this);
    }
    withMarks(marks) {
      return Mark.sameSet(this.tag.marks, marks) ? this : this.tag.withMarks(marks).create(this.content);
    }
    get tokenType() {
      return Token.Type.Node;
    }
    static define(name, spec) {
      return _Plot.Type.new(name, flagsFor(spec) | 16, spec).default;
    }
    static defineDoc(spec) {
      if (!spec.inlineContent && !spec.blockContent)
        throw new SchemaError("Doc nodes must allow content");
      let flags = 16 | 8 | 16;
      if (spec.inlineContent)
        flags |= 2;
      if (spec.inlineContent || spec.canBeEmpty)
        flags |= 64;
      return _Plot.Type.new("Doc", flags, {
        ...spec,
        shape: { element: "" }
      });
    }
  };
  Plot = /* @__PURE__ */ (function(Plot2) {
    Plot2.End = Token.End;
    class Tag extends BaseTag {
      type;
      constructor(type, param, marks) {
        super(param, marks);
        this.type = type;
      }
      static new(type, param, marks) {
        return new Tag(type, param, marks);
      }
      eq(other) {
        return this == other || other instanceof Plot2.Tag && this.type == other.type && compareDeep(this.param, other.param) && Mark.sameSet(this.marks, other.marks);
      }
      create(content) {
        if (this.isDoc)
          throw new Error("Document nodes must be created with schema.doc()");
        return Plot2.create(this, content ? joinText(content) : none);
      }
      withMarks(marks) {
        return Mark.sameSet(this.marks, marks) ? this : this.type.of(this.param, marks);
      }
      split(atEnd) {
        return this.marks.length ? this.withMarks(this.marks.filter((p) => {
          let { keepOnSplit } = p.type.spec;
          return keepOnSplit && (keepOnSplit === true || keepOnSplit(this, atEnd));
        })) : this;
      }
      get tokenType() {
        return Token.Type.Open;
      }
      get inlineContent() {
        return this.type.inlineContent;
      }
      get isTextblock() {
        return this.type.isTextblock;
      }
      get isLeaf() {
        return false;
      }
      get isPlot() {
        return true;
      }
      get isDoc() {
        return this.type.isDoc;
      }
      toString() {
        return this.type.name + markString(this.marks);
      }
    }
    Plot2.Tag = Tag;
    class Type extends BaseType {
      default;
      isolating;
      defining;
      neutral;
      preserveWhitespace;
      orientation;
      spec;
      constructor(name, flags, spec) {
        super(name, flags, spec, NodeShape.from(name, false, spec.shape));
        this.spec = spec;
        if (!spec.inlineContent && !spec.blockContent)
          throw new SchemaError("Plot definitions must specify either inlineContent or blockContent");
        this.isolating = !!spec.isolating;
        this.defining = !!spec.defining;
        this.neutral = spec.neutral ?? !this.defining;
        this.preserveWhitespace = spec.preserveWhitespace ?? !!this.hasRole(Node.Role.Code);
        this.orientation = flags & 2 ? "row" : spec.orientation || "column";
        this.default = "defaultParam" in spec ? Plot2.Tag.new(this, spec.defaultParam, none) : flags & 16 ? Plot2.Tag.new(this, null, none) : null;
        if (!this.shape.atom && this.isInline && !this.inlineContent)
          throw new SchemaError("Inline tags with block content must be marked as atoms");
      }
      static new(name, flags, spec) {
        return new Type(name, flags, spec);
      }
      static define(name, spec) {
        return new Plot2.Type(name, flagsFor(spec), spec);
      }
      of(param, marks = Mark.none) {
        if (!marks.length && this.default && compareDeep(this.default.param, param))
          return this.default;
        return Plot2.Tag.new(this, param, marks);
      }
      get inlineContent() {
        return (this.flags & 2) > 0;
      }
      get isTextblock() {
        return this.isBlock && this.inlineContent;
      }
      get isDoc() {
        return (this.flags & 8) > 0;
      }
      get isLeaf() {
        return false;
      }
      get isPlot() {
        return true;
      }
      get canBeEmpty() {
        return (this.flags & 64) > 0;
      }
    }
    Plot2.Type = Type;
    let validate2 = true;
    class Doc2 extends Plot2 {
      schema;
      constructor(schema, children) {
        super(schema.docTag, children);
        this.schema = schema;
        if (validate2)
          schema.validate(this);
      }
      static new(schema, children) {
        return new Doc2(schema, children);
      }
      get length() {
        return this.contentLength;
      }
      slicePlot(content, from, to) {
        sliceContent(content, this.content, from, to);
      }
      resolve(pos) {
        return Pos.resolve(this, pos);
      }
      resolveNode(pos) {
        return Pos.resolveNode(this, pos);
      }
      resolvePlot(pos) {
        let r = this.resolveNode(pos);
        return r instanceof Pos.Plot ? r : null;
      }
      contextAt(pos, maxDepth) {
        for (let { parent } = this.resolve(pos), context = []; ; ) {
          if (!parent.parent || maxDepth != null && context.length == maxDepth)
            return context;
          context.push(parent.node.tag);
          parent = parent.parent;
        }
      }
      slice(from, to = this.length) {
        return this.sliceInner(from, to);
      }
      static noValidate(f) {
        let prev = validate2;
        validate2 = false;
        try {
          return f();
        } finally {
          validate2 = prev;
        }
      }
    }
    Plot2.Doc = Doc2;
    ;
    return Plot2;
  })(Plot);
  function flagsFor(spec) {
    let flags = spec.inline ? 1 : 0;
    if (spec.inlineContent && spec.blockContent)
      throw new SchemaError("A tag cannot have both block and inline content");
    if (spec.inlineContent)
      flags |= 2;
    if (spec.inlineContent || spec.canBeEmpty)
      flags |= 64;
    if (spec.selectable)
      flags |= 32;
    return flags;
  }
  function markString(marks) {
    let values = [];
    for (let mark of marks) {
      if (mark.type.default == mark)
        values.push(mark.type.name);
      else
        values.push(`${mark.type.name}=${mark.value}`);
    }
    return values.length ? `[${values.join()}]` : "";
  }
  function sliceContent(out, content, from, to) {
    let off = 0;
    for (let child of content) {
      if (off >= to)
        break;
      let start = off;
      off += child.length;
      if (off <= from)
        continue;
      if (child.isPlot) {
        child.slicePlot(out, from - start, to - start);
      } else if (child.isText) {
        out.push(child.sliceText(from - start, to - start));
      } else {
        out.push(child);
      }
    }
  }
  function joinText(nodes) {
    if (!nodes.length || nodes[0].type.isBlock)
      return nodes;
    let joined;
    for (let i = 0, last = null; i < nodes.length; i++) {
      let node = nodes[i];
      if (node.is(Leaf.Text)) {
        if (last && Mark.sameSet(last.marks, node.marks)) {
          if (!joined)
            joined = nodes.slice(0, i);
          last = joined[joined.length - 1] = Leaf.text(last.param + node.param, node.marks);
          continue;
        } else {
          last = node;
        }
      } else {
        last = null;
      }
      if (joined)
        joined.push(node);
    }
    return joined || nodes;
  }
  var Schema = class _Schema {
    elements;
    nodes;
    marks;
    plotContent;
    markTarget;
    nodeGroup;
    docTag;
    lineBreak;
    nodesByName = /* @__PURE__ */ Object.create(null);
    marksByName = /* @__PURE__ */ Object.create(null);
    wrappingCache = /* @__PURE__ */ Object.create(null);
    validated = /* @__PURE__ */ new WeakSet();
    constructor(elements, nodes, marks, plotContent, markTarget, nodeGroup, docTag, lineBreak2) {
      this.elements = elements;
      this.nodes = nodes;
      this.marks = marks;
      this.plotContent = plotContent;
      this.markTarget = markTarget;
      this.nodeGroup = nodeGroup;
      this.docTag = docTag;
      this.lineBreak = lineBreak2;
      for (let tag of nodes)
        this.nodesByName[tag.name] = tag;
      for (let mark of marks)
        this.marksByName[mark.name] = mark;
    }
    doc(children) {
      return Plot.Doc.new(this, children);
    }
    validate(node) {
      if (this.validated.has(node))
        return;
      if (node.isLeaf) {
        this.validateTag(node);
      } else {
        this.validateTag(node.tag);
        if (!node.type.canBeEmpty && node.content.length == 0)
          throw new ValidationError(`Node ${node.name} with block content may not be empty`);
        for (let ch of node.content) {
          if (!this.canContain(node.type, ch.type) || node.inlineContent != ch.type.isInline)
            throw new ValidationError(`Node type ${node.name} cannot contain child ${ch.name}`);
          this.validate(ch);
        }
      }
      this.validated.add(node);
    }
    validateTag(tag) {
      if (this.nodesByName[tag.name] != tag.type)
        throw new ValidationError(`Tag type ${tag.name} not in schema`);
      for (let mark of tag.marks)
        this.validateMark(mark, tag.type);
    }
    validateMark(mark, node) {
      if (this.marksByName[mark.name] != mark.type)
        throw new ValidationError(`Mark type ${mark.name} not in schema`);
      if (!this.markAllowed(mark.type, node))
        throw new ValidationError(`Mark type ${mark.name} cannot target node ${node.name}`);
    }
    has(elt) {
      if (elt instanceof Mark || elt instanceof BaseTag)
        elt = elt.type;
      return (elt instanceof Mark.Type ? this.marksByName : this.nodesByName)[elt.name] == elt;
    }
    matchNode(node, q) {
      if (q instanceof Node.Group) {
        let groups = this.nodeGroup.get(node);
        return groups ? groups.has(q) : false;
      }
      if (q instanceof BaseType)
        return q == node;
      if (q instanceof BaseTag)
        return q.type == node;
      if ("and" in q)
        return q.and.every((q2) => this.matchNode(node, q2));
      return q.some((q2) => this.matchNode(node, q2));
    }
    markAllowed(mark, node) {
      let target = this.markTarget.get(mark);
      return target ? this.matchNode(node, target) : false;
    }
    sharesContent(a, b) {
      for (let tp of this.nodes)
        if (this.canContain(a, tp) && this.canContain(b, tp))
          return true;
      return false;
    }
    withMarksFrom(from, to) {
      if (!from.marks.length)
        return to;
      let marks = to.marks;
      for (let mark of from.marks)
        if (this.markAllowed(mark.type, to.type) && (mark.type.set || !mark.isInSet(marks))) {
          let { keepOnTypeChange } = mark.type.spec;
          if (keepOnTypeChange && (keepOnTypeChange === true || keepOnTypeChange(from, to)))
            marks = mark.addToSet(marks);
        }
      return to.withMarks(marks);
    }
    canContain(parent, child) {
      if (child.isPlot && child.isDoc)
        return false;
      let content = this.plotContent.get(parent);
      return content ? this.matchNode(child, content) : false;
    }
    defaultContentTag(parent) {
      for (let tag of this.nodes)
        if (tag.default && this.canContain(parent, tag))
          return tag.default;
      return null;
    }
    defaultContentPlot(parent) {
      for (let tag of this.nodes)
        if (tag.default && tag.isPlot && this.canContain(parent, tag))
          return tag.default;
      return null;
    }
    createDefault(parent) {
      let child = this.defaultContentTag(parent);
      if (!child)
        throw new Error(`No defaultable child node for ${parent.name}`);
      return this.createAndFill(child);
    }
    createAndFill(parent) {
      if (parent.isLeaf)
        return parent;
      return parent.create(parent.type.canBeEmpty ? [] : [this.createDefault(parent.type)]);
    }
    findWrapping(parent, child) {
      let key = `${parent.name}-${child.name}`, cached = this.wrappingCache[key];
      if (cached !== void 0)
        return cached;
      return this.wrappingCache[key] = this.findWrappingInner(parent, child);
    }
    findWrappingInner(parent, child) {
      let seen = /* @__PURE__ */ new Set(), work = [[]];
      for (let i = 0; i < work.length; i++) {
        let path = work[i], at = path.length ? path[path.length - 1].type : parent;
        for (let tag of this.nodes)
          if (this.canContain(at, tag)) {
            if (tag == child)
              return path;
            if (!seen.has(tag) && !tag.isLeaf && tag.default) {
              seen.add(tag);
              work.push(path.concat(tag.default));
            }
          }
      }
      return null;
    }
    getMark(name) {
      return this.marksByName[name];
    }
    getNode(name) {
      return this.nodesByName[name];
    }
    static define(spec) {
      let cached = findCachedSchema(spec);
      if (cached)
        return cached;
      let tags = [Leaf.Text], marks = [];
      let defaultI = 0;
      let tagNames = /* @__PURE__ */ new Set(), markNames = /* @__PURE__ */ new Set();
      let plotContent = /* @__PURE__ */ new Map();
      let markTarget = /* @__PURE__ */ new Map();
      let nodeGroup = /* @__PURE__ */ new Map();
      nodeGroup.set(Leaf.Text, /* @__PURE__ */ new Set([Node.Group.Inline, Node.Group.Leaf, Node.Group.All]));
      let overrides = spec.filter((e) => e instanceof _Schema.Override).reverse();
      let elements = [];
      for (let e of spec) {
        let elt = normalizeElt(e);
        elements.push(elt);
        if (elt instanceof Plot.Type || elt instanceof Leaf.Type) {
          if (tags.includes(elt))
            continue;
          if (tagNames.has(elt.name))
            throw new SchemaError(`Duplicate use of tag name ${elt.name} in schema`);
          tagNames.add(elt.name);
          if (elt.isPlot) {
            let content = elt.spec.inlineContent === true ? Node.Group.Inline : elt.spec.inlineContent || elt.spec.blockContent;
            for (let o of overrides)
              if (o.type == elt && o.content)
                content = o.content(content);
            plotContent.set(elt, content);
          }
          if (elt.isPlot && elt.spec.defaultBlock)
            tags.splice(defaultI++, 0, elt);
          else
            tags.push(elt);
          let groups = /* @__PURE__ */ new Set();
          groups.add(Node.Group.All);
          groups.add(elt.isInline ? Node.Group.Inline : Node.Group.Block);
          groups.add(elt.isLeaf ? Node.Group.Leaf : Node.Group.Plot);
          if (elt.isPlot && elt.isBlock && elt.inlineContent)
            groups.add(Node.Group.Textblock);
          let given = elt.spec.group instanceof Node.Group ? [elt.spec.group] : elt.spec.group;
          for (let o of overrides)
            if (o.type == elt && o.group)
              given = o.group;
          if (given)
            for (let g of given)
              for (let cur = g; cur; cur = cur.parent) {
                if (!Node.Group.builtin.includes(cur))
                  groups.add(cur);
              }
          nodeGroup.set(elt, groups);
        } else if (elt instanceof Mark.Type) {
          if (marks.includes(elt))
            continue;
          if (markNames.has(elt.name))
            throw new SchemaError(`Duplicate use of mark name ${elt.name} in schema`);
          let target = elt.spec.target || { and: [Node.Group.Inline, Node.Group.Leaf] };
          for (let o of overrides)
            if (o.type == elt && o.target)
              target = o.target(target);
          markTarget.set(elt, target);
          markNames.add(elt.name);
          marks.push(elt);
        } else if (!(elt instanceof _Schema.Override)) {
          throw new SchemaError("Unexpected schema element type. You may have multiple versions of @wordgard/doc loaded");
        }
      }
      let docType = null;
      let lineBreak2 = null;
      for (let tag of tags) {
        if (tag.isLeaf) {
          if (tag.hasRole(Node.Role.LineBreak)) {
            if (tag.isBlock || !tag.default)
              throw new SchemaError("Line break tags must be inline leaves with a default param");
            if (lineBreak2)
              throw new SchemaError("Multiple line break tags provided");
            lineBreak2 = tag.default;
          }
        } else {
          if (tag.isDoc) {
            if (docType)
              throw new SchemaError("Multiple document types specified");
            docType = tag;
          }
        }
      }
      if (!docType)
        throw new SchemaError("A schema must define a document type");
      let schema = new _Schema(elements, tags, marks, plotContent, markTarget, nodeGroup, docType.default, lineBreak2);
      for (let tag of tags)
        if (tag.isPlot) {
          let sawDefaultable = false;
          for (let child of tags)
            if (schema.canContain(tag, child)) {
              if (child.default)
                sawDefaultable = true;
              if (child.isInline != tag.inlineContent)
                throw new SchemaError(`Node type ${tag.name} has ${tag.inlineContent ? "block" : "inline"} content, but allows ${child.name} as a child`);
            }
          if (!tag.canBeEmpty && !sawDefaultable)
            throw new SchemaError(`Node ${tag.name} has required content, but all possible children require non-default parameters`);
        }
      schemaCache.set(spec, new WeakRef(schema));
      return schema;
    }
    nodeFromJSON(json) {
      let tag = this.tagFromJSON(json), children = none;
      if (tag.isLeaf)
        return tag;
      if (json.content && Array.isArray(json.content))
        children = json.content.map((c) => this.nodeFromJSON(c));
      if (tag.type.isDoc)
        return this.doc(children);
      return tag.create(children);
    }
    tagFromJSON(json) {
      if (!json || typeof json != "object" || !(json.type in this.nodesByName))
        throw new ValidationError("Invalid tag JSON");
      let type = this.nodesByName[json.type];
      let marks = json.marks ? this.marksFromJSON(json.marks) : none;
      let tag = "param" in json ? type.of(validate(type.spec.validate, json.param), marks) : !type.default ? null : marks.length ? type.of(type.default.param, marks) : type.default;
      if (!tag)
        throw new ValidationError(`Missing param for tag type ${type.name}`);
      return tag;
    }
    marksFromJSON(json) {
      if (!json || typeof json != "object")
        throw new ValidationError("Invalid mark JSON");
      let marks = none;
      for (let name in json) {
        let mark = this.marksByName[name];
        if (!mark)
          throw new ValidationError(`Unrecognized mark ${name} in JSON`);
        marks = mark.of(validate(mark.spec.validate, json[name])).addToSet(marks);
      }
      return marks;
    }
    docFromJSON(json) {
      if (!json || json.type != this.docTag.name)
        throw new ValidationError("Invalid document JSON");
      return this.nodeFromJSON(json);
    }
  };
  var schemaCache = /* @__PURE__ */ (() => /* @__PURE__ */ new Map())();
  function findCachedSchema(spec) {
    search: for (let [elts, ref] of schemaCache) {
      let active = ref.deref();
      if (!active) {
        schemaCache.delete(elts);
      } else if (elts.length == spec.length) {
        for (let i = 0; i < spec.length; i++) {
          let a = normalizeElt(spec[i]), b = normalizeElt(elts[i]);
          if (a != b && !(a instanceof Schema.Override && b instanceof Schema.Override && a.eq(b)))
            continue search;
        }
        return active;
      }
    }
  }
  function normalizeElt(elt) {
    return elt instanceof Plot.Tag || elt instanceof Leaf || elt instanceof Mark ? elt.type : elt;
  }
  Schema = /* @__PURE__ */ (function(Schema2) {
    class Override {
      type;
      target;
      content;
      group;
      constructor(type, target, content, group) {
        this.type = type;
        this.target = target;
        this.content = content;
        this.group = group;
      }
      eq(other) {
        return this == other || this.type == other.type && this.target == other.target && this.content == other.content && this.group == other.group;
      }
      static markTarget(mark, target) {
        return new Schema2.Override(mark instanceof Mark.Type ? mark : mark.type, typeof target == "function" ? target : () => target);
      }
      static plotContent(plot, content) {
        return new Schema2.Override(plot instanceof Plot.Tag ? plot.type : plot, void 0, typeof content == "function" ? content : () => content);
      }
      static nodeGroup(node, group) {
        return new Schema2.Override(node instanceof BaseTag ? node.type : node, void 0, void 0, group instanceof Node.Group ? [group] : group);
      }
    }
    Schema2.Override = Override;
    ;
    return Schema2;
  })(Schema);
  var BuildContext = class {
    tag;
    parent;
    children = [];
    constructor(tag, parent) {
      this.tag = tag;
      this.parent = parent;
    }
  };
  var Builder = class {
    stack;
    modifications = null;
    schema;
    constructor(doc2) {
      this.schema = doc2.schema;
      this.stack = new BuildContext(doc2.tag, null);
    }
    add(node) {
      if (this.modifications) {
        if (node.isPlot)
          throw new ValidationError("Invalid modification on non-leaf node");
        node = node.withMarks(applyModifications(this.modifications, node.marks, node.type));
      }
      node.pushTo(this.stack.children);
    }
    enterPlot(plot) {
      this.open(plot.tag);
    }
    leavePlot() {
      if (this.modifications)
        throw new ValidationError("Invalid modification on close token");
      if (!this.stack.parent)
        throw new ValidationError("Surplus close token after " + this.stack.children);
      let top2 = this.stack;
      this.stack = this.stack.parent;
      this.add(top2.tag.create(top2.children));
    }
    skip(node) {
      this.add(node);
    }
    open(tag) {
      if (this.modifications)
        tag = tag.withMarks(applyModifications(this.modifications, tag.marks, tag.type));
      this.stack = new BuildContext(tag, this.stack);
    }
    close() {
      this.leavePlot();
    }
    node(node) {
      this.skip(node);
    }
    finish() {
      if (this.stack.parent)
        throw new ValidationError("Invalid change");
      return this.schema.doc(this.stack.children);
    }
  };
  function isAdd(m) {
    return !!m.add;
  }
  function isRemove(m) {
    return !!m.remove;
  }
  function applyModifications(modifications, marks, type) {
    for (const m of modifications) {
      if (isAdd(m)) {
        marks = m.add.addToSet(marks);
      } else {
        marks = m.remove.removeFromSet(marks);
      }
    }
    return marks;
  }
  function modificationToJSON(m) {
    return isAdd(m) ? { add: m.add.name, value: m.add.value } : { remove: m.remove.name, value: m.remove.value };
  }
  function modificationFromJSON(schema, json) {
    let { add: add2, remove: remove2 } = json;
    if (typeof add2 == "string" || typeof remove2 == "string") {
      let mark = schema.getMark(add2 || remove2);
      if (!mark)
        throw new ValidationError(`Unknown mark ${add2 || remove2}`);
      let value = mark.of(validate(mark.spec.validate, json.value));
      if (mark)
        return add2 ? { add: value } : { remove: value };
    }
    throw new ValidationError("Invalid modification JSON");
  }
  function compareModifications(a, b) {
    if (a == b)
      return true;
    if (a.length != b.length)
      return false;
    for (let i = 0; i < a.length; i++)
      if (!compareModification(a[i], b[i]))
        return false;
    return true;
  }
  function compareModification(a, b) {
    return isAdd(a) ? isAdd(b) && a.add.eq(b.add) : isRemove(b) && a.remove.eq(b.remove);
  }
  function isNatNum(value) {
    return typeof value == "number" && Math.floor(value) == value && value >= 0;
  }
  var applyCache = /* @__PURE__ */ (() => /* @__PURE__ */ new WeakMap())();
  var ChangeSet = class _ChangeSet {
    sections;
    data;
    _length = -1;
    _newLength = -1;
    constructor(sections, data) {
      this.sections = sections;
      this.data = data;
    }
    static new(sections, data) {
      return new _ChangeSet(sections, data);
    }
    get length() {
      if (this._length < 0) {
        this._length = 0;
        for (let i = 0; i < this.sections.length; i += 2)
          this._length += this.sections[i];
      }
      return this._length;
    }
    get newLength() {
      if (this._newLength < 0) {
        this._newLength = 0;
        for (let i = 0; i < this.sections.length; i += 2) {
          let ins = this.sections[i + 1];
          this._newLength += ins < 0 ? this.sections[i] : ins;
        }
      }
      return this._newLength;
    }
    get empty() {
      return this.sections.length == 0 || this.sections.length == 2 && this.sections[1] < 0;
    }
    eq(other) {
      if (other.sections.length != this.sections.length)
        return false;
      for (let i = 0; i < this.sections.length; i++)
        if (this.sections[i] != other.sections[i])
          return false;
      for (let i = 0; i < this.data.length; i++) {
        let a = this.data[i], b = other.data[i];
        if (a && !(this.sections[(i << 1) + 1] < 0 ? compareModifications(a, b) : a.eq(b)))
          return false;
      }
      return true;
    }
    apply(doc2) {
      if (this.length != doc2.length)
        throw new ValidationError(`Trying to apply change of length ${this.length} to doc of length ${doc2.length}`);
      if (this.empty)
        return doc2;
      let cached = applyCache.get(this);
      if (cached && doc2.eq(cached.a))
        return cached.b;
      let builder = new Builder(doc2);
      let cursor = doc2.resolve(0);
      for (let i = 0, iS = 0; i < this.data.length; i++) {
        let lenA = this.sections[iS++], lenB = this.sections[iS++];
        if (lenB < 0) {
          builder.modifications = this.data[i];
          cursor = cursor.advance(lenA, builder);
          builder.modifications = null;
        } else {
          cursor = cursor.advance(lenA);
          this.data[i].run(builder);
        }
      }
      if (cursor.pos != doc2.length)
        throw new ValidationError("Change doesn't cover the entire document");
      let newDoc = builder.finish();
      applyCache.set(this, { a: doc2, b: newDoc });
      return newDoc;
    }
    toJSON() {
      let result = [];
      for (let i = 0; i < this.data.length; i++) {
        let len = this.sections[i << 1], ins = this.sections[(i << 1) + 1];
        if (ins == -1)
          result.push(len);
        else if (ins == -2)
          result.push([len, this.data[i].map(modificationToJSON)]);
        else
          result.push([len, this.data[i].toJSON()]);
      }
      return result;
    }
    static fromJSON(schema, json) {
      if (!Array.isArray(json))
        throw new ValidationError("Invalid ChangeSet JSON");
      let sections = [], data = [];
      for (let elt of json) {
        if (isNatNum(elt)) {
          sections.push(elt, -1);
          data.push(null);
        } else {
          if (!Array.isArray(elt) || elt.length != 2 || !isNatNum(elt[0]) || !Array.isArray(elt[1]))
            throw new ValidationError("Invalid ChangeSet JSON");
          let [len, val] = elt;
          if (val.length && typeof val[0] == "object" && ("add" in val[0] || "remove" in val[0])) {
            sections.push(len, -2);
            data.push(val.map((m) => modificationFromJSON(schema, m)));
          } else {
            let slice = Slice.fromJSON(schema, val);
            sections.push(len, slice.length);
            data.push(slice);
          }
        }
      }
      return new _ChangeSet(sections, data);
    }
    transform(doc2, other, before = false) {
      let { set, fix } = transform(this, other, doc2, before, true);
      return fix ? set.compose(fix) : set;
    }
    compose(other) {
      let { sections, data } = compose(this.sections, other.sections, this.data, other.data);
      return new _ChangeSet(sections, data);
    }
    invert(doc2) {
      let sections = [], data = [];
      for (let i = 0, iS = 0, pos = 0; iS < this.sections.length; iS += 2, i++) {
        let len = this.sections[iS], ins = this.sections[iS + 1];
        if (ins >= 0) {
          addSection(sections, data, ins, len, doc2.slice(pos, pos + len));
        } else {
          let mods = this.data[i];
          let at = pos, end = pos + len;
          if (mods)
            doc2.iterate(pos, end, (node, nodePos) => {
              if (node.isLeaf || nodePos >= pos && nodePos < end) {
                let [from, to] = node.isText ? [Math.max(at, nodePos), Math.min(end, nodePos + node.length)] : [nodePos, nodePos + 1];
                if (at < from)
                  addSection(sections, data, from - at, -1, null);
                addSection(sections, data, to - from, -2, invertMods(mods, node.tag));
                at = to;
              }
            });
          if (at < end)
            addSection(sections, data, end - at, -1, null);
        }
        pos += len;
      }
      return new _ChangeSet(sections, data);
    }
    correct(doc2, local = false) {
      let fitter = new ChangeFitter(doc2, local);
      for (let i = 0, iS = 0, pos = 0; i < this.data.length; i++) {
        let len = this.sections[iS++], ins = this.sections[iS++];
        if (ins < 0)
          fitter.preserved(pos, pos += len);
        else
          fitter.replaced(this.data[i], pos, pos += len);
      }
      let fit = fitter.finish();
      return fit ? this.compose(fit) : this;
    }
    mapPos(pos, assoc = -1, track) {
      let posA = 0, posB = 0;
      for (let i = 0; i < this.sections.length; ) {
        let len = this.sections[i++], type = this.sections[i++], endA = posA + len;
        if (type < 0) {
          if (endA > pos)
            return posB + (pos - posA);
          posB += len;
        } else {
          if (track && endA >= pos && (track == "around" && posA < pos && endA > pos || track == "before" && posA < pos || track == "after" && endA > pos))
            return null;
          if (endA > pos || endA == pos && assoc < 0 && !len)
            return pos == posA || assoc < 0 ? posB : posB + type;
          posB += type;
        }
        posA = endA;
      }
      if (pos > posA)
        throw new RangeError(`Position ${pos} is out of range for changeset of length ${posA}`);
      return posB;
    }
    findInserted(pred) {
      let found = null;
      this.iterChanges((_f, _t, pos, _to, inserted) => {
        if (found != null)
          return;
        for (let tok of inserted.content) {
          if (tok.tokenType == Token.Type.Node) {
            if (pred(tok.tag))
              return found = pos;
            pos += tok.length;
          } else {
            if (tok.tokenType == Token.Type.Open && pred(tok))
              return found = pos;
            pos++;
          }
        }
      });
      return found;
    }
    touchesRange(from, to) {
      for (let i = 0, pos = 0; i < this.sections.length && pos <= to; ) {
        let len = this.sections[i++], ins = this.sections[i++], end = pos + len;
        if (ins >= 0 && pos <= to && end >= from)
          return pos < from && end > to ? "cover" : true;
        pos = end;
      }
      return false;
    }
    iterChanges(replaced, preserved) {
      for (let posA = 0, posB = 0, i = 0, iS = 0; i < this.data.length; ) {
        let len = this.sections[iS++], ins = this.sections[iS++], data = this.data[i++];
        if (ins < 0) {
          if (preserved)
            preserved(posA, posA + len, posB, posB + len, data);
          posA += len;
          posB += len;
        } else {
          replaced(posA, posA += len, posB, posB += ins, data);
        }
      }
    }
    iterGaps(gap, change) {
      for (let i = 0, posA = 0, posB = 0; i < this.sections.length; ) {
        let len = this.sections[i++], ins = this.sections[i++];
        if (ins < 0) {
          while (i < this.sections.length && this.sections[i + 1] < 0) {
            len += this.sections[i];
            i += 2;
          }
          gap(posA, posA + len, posB, posB + len);
          posB += len;
        } else {
          while (i < this.sections.length && this.sections[i + 1] >= 0) {
            len += this.sections[i++];
            ins += this.sections[i++];
          }
          if (change)
            change(posA, posA + len, posB, posB + ins);
          posB += ins;
        }
        posA += len;
      }
    }
    iterChangedRanges(range) {
      for (let i = 0, posA = 0, posB = 0; i < this.sections.length; ) {
        let len = this.sections[i++], ins = this.sections[i++];
        if (ins == -1) {
          posB += len;
        } else {
          if (ins == -2)
            ins = len;
          while (i < this.sections.length && this.sections[i + 1] != -1) {
            let addLen = this.sections[i++], addIns = this.sections[i++];
            len += addLen;
            ins += addIns == -2 ? addLen : addIns;
          }
          range(posA, posA + len, posB, posB + ins);
          posB += ins;
        }
        posA += len;
      }
    }
    pad(before, after) {
      if (this.empty)
        return _ChangeSet.empty(this.length + before + after);
      let sections = this.sections.slice(), data = this.data.slice();
      if (before) {
        if (sections[1] == -1) {
          sections[0] += before;
        } else {
          sections.splice(0, 0, before, -1);
          data.splice(0, 0, null);
        }
      }
      if (after) {
        if (sections[sections.length - 1] == -1) {
          sections[sections.length - 2] += after;
        } else {
          sections.push(after, -1);
          data.push(null);
        }
      }
      return new _ChangeSet(sections, data);
    }
    clip(from, to) {
      let sections = [], data = [];
      for (let i = 0, pos = 0; i < this.sections.length && pos <= to; ) {
        let value = this.data[i >> 1], len = this.sections[i++], ins = this.sections[i++];
        let end = pos + len;
        if (ins > 0) {
          if (pos >= from && end <= to)
            addSection(sections, data, end - pos, ins, value);
          else if (end > from && pos < from)
            return null;
        } else if (pos < to && end > from) {
          addSection(sections, data, Math.min(end, to) - Math.max(pos, from), ins, value);
        }
        pos = end;
      }
      return new _ChangeSet(sections, data);
    }
    static create(doc2, spec) {
      return createChangeSet(doc2, spec);
    }
    static empty(length) {
      return length ? new _ChangeSet([length, -1], [null]) : new _ChangeSet([], []);
    }
    toString() {
      let result = "";
      for (let i = 0, iS = 0, pos = 0; i < this.data.length; i++) {
        let len = this.sections[iS++], ins = this.sections[iS++], data = this.data[i];
        let text = "";
        if (ins >= 0) {
          text += data;
        } else if (data) {
          text += `[${data.map((mod) => {
            return `${isAdd(mod) ? "+" + mod.add : "-" + mod.remove}`;
          })}]`;
        }
        if (text)
          result += `${result ? "," : ""}${pos}${len ? `-${pos + len}` : ""}${text}`;
        pos += len;
      }
      return result;
    }
    static composeSections(a, b) {
      return compose(a, b).sections;
    }
    static transform(doc2, a, b) {
      let { set: mA, fix } = transform(a, b, doc2, true, true);
      let mB = transform(b, a, doc2, false, false).set;
      return fix ? { a: mA.compose(fix), b: mB.compose(fix) } : { a: mA, b: mB };
    }
  };
  var ChangeSetBuilder = class {
    docLen;
    constructor(docLen) {
      this.docLen = docLen;
    }
    sections = [];
    data = [];
    pos = 0;
  };
  function createChangeSet(doc2, spec, mayCorrect = true) {
    let cur = null;
    let accum = null;
    let doCorrect = false;
    let flush = () => {
      if (cur) {
        if (cur.pos < cur.docLen)
          addSection(cur.sections, cur.data, cur.docLen - cur.pos, -1, null);
        push(ChangeSet.new(cur.sections, cur.data));
        cur = null;
      }
    };
    let push = (set) => {
      accum = accum ? accum.compose(transform(set, accum, doc2, false, false).set) : set;
    };
    let section = (from, to, ins, value) => {
      if (!cur || from < cur.pos) {
        flush();
        cur = new ChangeSetBuilder(doc2.length);
      }
      if (from > cur.pos)
        addSection(cur.sections, cur.data, from - cur.pos, -1, null);
      addSection(cur.sections, cur.data, to - from, ins, value);
      cur.pos = to;
    };
    let build = (spec2) => {
      if (Array.isArray(spec2)) {
        for (let elt of spec2)
          build(elt);
      } else if (spec2 instanceof ChangeSet) {
        flush();
        push(spec2);
      } else if ("correct" in spec2) {
        flush();
        let { correct, local } = spec2;
        let inner = createChangeSet(doc2, correct, false);
        push(mayCorrect || local ? inner.correct(doc2, local) : inner);
      } else {
        let { from, to, add: add2, remove: remove2, insert, fit } = spec2;
        let modifies = add2 || remove2;
        if (modifies) {
          if (insert)
            throw new ValidationError(`A Change object cannot both ${add2 ? "add" : "remove"} a mark and replace a range`);
          if (to == null)
            to = from + 1;
          if (add2) {
            let mods = [{ add: add2 }];
            markableSections(doc2, from, to, add2.type.spanning, (node, from2, to2) => {
              if (!doc2.schema.markAllowed(add2.type, node.type))
                return false;
              let has = add2.type.isInSet(node.tag.marks);
              if (add2.type.set) {
                let modsHere = mods;
                if (has) {
                  let left = subtractSet(add2.value, has.value, add2.type.set);
                  if (!left.length)
                    return false;
                  modsHere = [{ add: add2.type.of(left) }];
                }
                section(from2, to2, -2, modsHere);
              } else if (!has || !has.eq(add2)) {
                section(from2, to2, -2, mods);
              }
              return true;
            });
          }
          if (remove2) {
            let mods = [{ remove: remove2 }];
            markableSections(doc2, from, to, remove2.type.spanning, (node, from2, to2) => {
              const has = remove2.isInSet(node.tag.marks);
              if (!has || !doc2.schema.markAllowed(remove2.type, node.type))
                return false;
              let modsHere = mods;
              if (remove2.type.set) {
                let left = subtractSet(remove2.value, has.value, remove2.type.set);
                if (!left.length)
                  return false;
                modsHere = [{ remove: remove2.type.of(left) }];
              }
              section(from2, to2, -2, modsHere);
              return true;
            });
          }
        } else {
          if (to == null)
            to = from;
          insert = !insert ? Slice.empty : Array.isArray(insert) ? Slice.of(insert) : insert;
          if (to <= from)
            to = from;
          if (fit) {
            doCorrect = true;
            ({ from, to, slice: insert } = fitReplacement(doc2, doc2.resolve(from), doc2.resolve(to), insert, fit === true ? [] : fit));
          }
          if (insert.length || to != from)
            section(from, to, insert.length, insert);
        }
      }
    };
    build(spec);
    flush();
    return !accum ? ChangeSet.empty(doc2.length) : doCorrect && mayCorrect ? accum.correct(doc2) : accum;
  }
  function transform(setA, setB, doc2, before, fit) {
    if (setA.length != doc2.length || setB.length != doc2.length)
      throw new ValidationError("Transforming a change that doesn't match the start document");
    let sections = [], data = [];
    let fitter = fit ? new ChangeFitter(doc2, false) : null;
    let a = new SectionIter(setA.sections, setA.data), b = new SectionIter(setB.sections, setB.data), pos = 0;
    for (let inserted = -1; ; ) {
      if (a.keep && b.keep) {
        let len = Math.min(a.len, b.len);
        let mods = before ? a.mods : filterMods(a.mods, b.mods);
        addSection(sections, data, len, mods ? -2 : -1, mods);
        a.forward(len);
        b.forward(len);
        if (fitter)
          fitter.preserved(pos, pos + len);
        pos += len;
      } else if (b.ins >= 0 && (a.ins < 0 || inserted == a.i || a.off == 0 && (b.len < a.len || b.len == a.len && !before))) {
        let end = pos + b.len;
        addSection(sections, data, b.ins, -1, null);
        if (fitter)
          fitter.replaced(b.slice, pos, end, true);
        while (pos < end) {
          if (a.done)
            throw new ValidationError("Mismatched change sets");
          let piece = Math.min(a.len, end - pos);
          if (a.ins >= 0 && inserted < a.i && a.len <= piece) {
            addSection(sections, data, 0, a.ins, a.slice);
            if (fitter)
              fitter.replaced(a.slice, pos - a.off, pos + a.len);
            inserted = a.i;
          }
          a.forward(piece);
          pos += piece;
        }
        b.next();
      } else if (a.ins >= 0) {
        let start = pos, end = pos + a.len, len = 0;
        while (pos < end) {
          if (b.keep) {
            let piece = Math.min(end - pos, b.len);
            pos += piece;
            len += piece;
            b.forward(piece);
          } else if (b.ins == 0 && pos + b.len < end) {
            if (fitter)
              fitter.replaced(b.slice, pos, pos + b.len, true);
            pos += b.len;
            b.next();
          } else {
            break;
          }
        }
        if (inserted < a.i) {
          addSection(sections, data, len, a.ins, a.slice);
          if (fitter)
            fitter.replaced(a.slice, start - a.off, start + a.len);
          inserted = a.i;
        } else {
          addSection(sections, data, len, 0, Slice.empty);
        }
        a.forward(pos - start);
      } else {
        return {
          set: ChangeSet.new(sections, data),
          fix: fitter && fitter.finish()
        };
      }
    }
  }
  function compose(sectionsA, sectionsB, dataA, dataB) {
    let sections = [], data = dataA ? [] : null;
    let a = new SectionIter(sectionsA, dataA), b = new SectionIter(sectionsB, dataB);
    for (let open = false; ; ) {
      if (a.done && b.done) {
        return { sections, data };
      } else if (a.ins == 0) {
        addSection(sections, data, a.len, 0, a.slice, open);
        a.next();
      } else if (b.len == 0 && !b.done) {
        addSection(sections, data, 0, b.ins, b.slice, open);
        b.next();
      } else if (a.done || b.done) {
        throw new ValidationError("Mismatched change set lengths");
      } else {
        let len = Math.min(a.len2, b.len), sectionLen = sections.length;
        if (a.keep && b.keep) {
          let mods = combineMods(a.mods, b.mods);
          addSection(sections, data, len, (data ? mods : a.ins == -2 || b.ins == -2) ? -2 : -1, mods, open);
        } else if (a.keep) {
          addSection(sections, data, len, b.off ? 0 : b.ins, b.off ? Slice.empty : b.slice, open);
        } else if (b.keep) {
          addSection(sections, data, a.off ? 0 : a.len, len, data ? applyModsToSlice(a.slicePart(len), b.mods) : null, open);
        } else {
          addSection(sections, data, a.off ? 0 : a.len, b.off ? 0 : b.ins, b.off ? Slice.empty : b.slice, open);
        }
        open = (a.ins > len || b.ins >= 0 && b.len > len) && (open || sections.length > sectionLen);
        a.forward2(len);
        b.forward(len);
      }
    }
  }
  function combineMods(a, b) {
    return !a ? b : !b ? a : a.concat(b);
  }
  function filterMods(mods, against) {
    if (!mods || !against)
      return mods;
    return mods.filter((m) => !against.some((a) => modCancels(a, m)));
  }
  function modCancels(mod, other) {
    if (isAdd(other)) {
      return isAdd(mod) ? mod.add.type == other.add.type && !mod.add.type.set : mod.remove.eq(other.add);
    } else {
      return isAdd(mod) && mod.add.eq(isAdd(other) ? other.add : other.remove);
    }
  }
  function invertMods(mods, target) {
    return mods.map((mod) => {
      if (isRemove(mod))
        return { add: mod.remove };
      if (!mod.add.type.set) {
        let existed = mod.add.type.isInSet(target.marks);
        if (existed)
          return { add: existed };
      }
      return { remove: mod.add };
    });
  }
  function applyModsToSlice(slice, mods) {
    if (!mods)
      return slice;
    let content = [];
    for (let tok of slice.content) {
      if (tok.tokenType == Token.Type.Open) {
        content.push(tok.withMarks(applyModifications(mods, tok.marks, tok.type)));
      } else if (tok.tokenType == Token.Type.Node) {
        let node = tok.withMarks(applyModifications(mods, tok.marks, tok.type));
        if (content.length && content[content.length - 1].tokenType == Token.Type.Node)
          node.pushTo(content);
        else
          content.push(node);
      } else {
        content.push(tok);
      }
    }
    return Slice.of(content);
  }
  var FitLevel = class {
    tag;
    next;
    flags = 0;
    constructor(tag, next) {
      this.tag = tag;
      this.next = next;
      if (!this.tag.type.canBeEmpty)
        this.flags |= 1;
    }
  };
  var counter = {
    count: 0,
    skip() {
    },
    enterPlot() {
      this.count++;
    },
    leavePlot() {
      this.count--;
    },
    countDelta(pos, distance) {
      this.count = 0;
      return pos.advance(distance, this);
    }
  };
  var ChangeFitter = class {
    local;
    stack;
    inputPos;
    delInputPos;
    pos = 0;
    patches = [];
    stackDelta = 0;
    inputDelta = 0;
    inserting = false;
    activeContext = null;
    activeContextPos = -1;
    nextSync = -1;
    schema;
    constructor(doc2, local) {
      this.local = local;
      this.schema = doc2.schema;
      this.stack = new FitLevel(doc2.tag, null);
      this.inputPos = this.delInputPos = doc2.resolve(0);
    }
    getPos(at) {
      let { inputPos, delInputPos } = this;
      if (inputPos.pos == at)
        return inputPos;
      if (delInputPos.pos == at)
        return delInputPos;
      return inputPos.advance(at - inputPos.pos);
    }
    preserved(from, to) {
      let { nextSync } = this;
      if (nextSync >= from && nextSync <= to) {
        this.stackDelta = 0;
        this.nextSync = -1;
        if (nextSync > from)
          this.preserved(from, nextSync);
        this.syncToContext(this.inputPos);
        if (to > nextSync)
          this.preserved(nextSync, to);
        return;
      }
      let inputPos = this.getPos(from);
      if (!this.inputDelta && this.stackDelta) {
        this.syncToContext(inputPos);
        this.stackDelta = 0;
      }
      this.activeContext = inputPos;
      this.activeContextPos = this.pos;
      this.inputPos = inputPos.advance(to - from, this);
    }
    lastCoverFrom = -1;
    lastCoverTo = -1;
    doubleDeleteDelta = 0;
    replaced(slice, from, to, covering = false) {
      this.doubleDeleteDelta = 0;
      if (covering) {
        this.lastCoverFrom = from;
        this.lastCoverTo = to;
      } else if (slice.length) {
        let overlapFrom = Math.max(from, this.lastCoverFrom);
        let overlapTo = Math.min(to, this.lastCoverTo);
        if (overlapFrom < overlapTo) {
          counter.countDelta(this.getPos(overlapFrom), overlapTo - overlapFrom);
          this.doubleDeleteDelta = counter.count;
        }
      }
      if (from != to) {
        this.delInputPos = counter.countDelta(this.getPos(from), to - from);
        this.inputDelta -= counter.count;
      }
      this.inserting = true;
      slice.run(this, this.pos);
      this.inserting = false;
      if (this.local)
        this.nextSync = Math.max(this.nextSync, localSyncPosAfter(this.inputPos = this.getPos(to)));
    }
    fit(tag) {
      if (this.schema.canContain(this.stack.tag.type, tag.type))
        return true;
      let fix = null;
      let dDelta = this.stackDelta - this.inputDelta;
      for (let level = this.stack, leave = 0, leaveCost = 0; level; level = level.next, leave++) {
        if (fix && leaveCost > fix.cost)
          break;
        let enter2 = this.schema.findWrapping(level.tag.type, tag.type);
        if (enter2) {
          let cost = leaveCost + enter2.length * 2 - Math.max(0, Math.min(-dDelta, enter2.length));
          if (!fix || fix.cost > cost && !fix.context)
            fix = { leave, enter: enter2, cost, context: false };
        }
        if (this.activeContextPos == this.pos) {
          let top2 = this.activeContext?.parent || null;
          for (let cx = top2, i = 1; cx; cx = cx.parent, i++) {
            if (this.schema.canContain(level.tag.type, cx.node.type)) {
              let cost = leaveCost + i * 2 - Math.max(0, Math.min(-dDelta, i));
              if (!fix || fix.cost > cost || !fix.context) {
                let enter3 = [];
                for (let scan = top2; ; scan = scan.parent) {
                  enter3.unshift(scan.node.tag);
                  if (scan == cx)
                    break;
                }
                fix = { leave, enter: enter3, cost, context: true };
              }
              break;
            }
          }
        }
        leaveCost += level.flags & 2 ? 0 : dDelta > leave ? 1 : 2;
      }
      if (!fix)
        return false;
      for (let i = 0; i < fix.leave; i++) {
        this.insertClose();
        this.stackDelta--;
      }
      for (let wrapper of fix.enter) {
        this.patch(0, wrapper);
        this.stack.flags &= -2;
        this.stack = new FitLevel(wrapper, this.stack);
        this.stack.flags |= 2;
        this.stackDelta++;
      }
      return true;
    }
    syncToContext(context) {
      let cur = [], sync = [];
      for (let l = this.stack; l; l = l.next)
        cur.push(l);
      cur.reverse();
      for (let level = context.parent; level; level = level.parent)
        sync.push(level.node.tag);
      sync.reverse();
      while (cur.length > sync.length) {
        this.insertClose();
        cur.pop();
      }
      for (let d = 1; d < Math.min(sync.length, cur.length); d++) {
        if (!this.schema.sharesContent(sync[d].type, cur[d].tag.type)) {
          while (cur.length > d) {
            this.insertClose();
            cur.pop();
          }
          break;
        }
      }
      for (let i = cur.length; i < sync.length; i++) {
        let tag = sync[i];
        this.stack = new FitLevel(tag, this.stack);
        this.patch(0, tag);
      }
    }
    insertClose() {
      if (this.stack.flags & 1)
        this.patch(0, this.schema.createDefault(this.stack.tag.type), Plot.End);
      else
        this.patch(0, Plot.End);
      this.stack = this.stack.next;
    }
    patch(length, ...insert) {
      let prev = this.patches.length ? this.patches[this.patches.length - 1] : null;
      if (prev && prev.to == this.pos) {
        prev.to += length;
        for (let tok of insert)
          prev.insert.push(tok);
      } else {
        this.patches.push({ from: this.pos, to: this.pos + length, insert });
      }
    }
    open(tag) {
      this.enter(tag);
    }
    close() {
      this.leavePlot();
    }
    node(node) {
      this.skip(node);
    }
    skip(node) {
      if (this.fit(node.tag))
        this.stack.flags &= -2;
      else
        this.patch(node.length);
      this.pos += node.length;
    }
    enterPlot(node) {
      this.enter(node.tag);
    }
    enter(tag) {
      if (this.inserting)
        this.inputDelta++;
      if (this.doubleDeleteDelta > 0) {
        this.doubleDeleteDelta--;
        this.patch(1);
      } else if (this.fit(tag)) {
        this.stack.flags &= -2;
        this.stack = new FitLevel(tag, this.stack);
        if (this.inserting)
          this.stackDelta++;
      } else {
        this.patch(1);
      }
      this.pos++;
    }
    leavePlot() {
      if (this.inserting)
        this.inputDelta--;
      if (this.doubleDeleteDelta < 0) {
        this.doubleDeleteDelta++;
        this.patch(1);
      } else if (this.stack.next) {
        if (this.stack.flags & 1)
          this.patch(0, this.schema.createDefault(this.stack.tag.type));
        this.stack = this.stack.next;
        if (this.inserting)
          this.stackDelta++;
      } else {
        this.patch(1);
      }
      this.pos++;
    }
    finish() {
      while (this.stack.next || this.stack.flags && 1) {
        if (this.stack.flags & 1) {
          this.patch(0, this.schema.createDefault(this.stack.tag.type));
          this.stack.flags &= -2;
        } else {
          this.patch(0, Plot.End);
          this.stack = this.stack.next;
        }
      }
      if (!this.patches.length)
        return null;
      let sections = [], data = [], pos = 0;
      for (let { from, to, insert } of this.patches) {
        addSection(sections, data, from - pos, -1, null);
        let slice = Slice.of(insert);
        addSection(sections, data, to - from, slice.length, slice);
        pos = to;
      }
      addSection(sections, data, this.pos - pos, -1, null);
      return ChangeSet.new(sections, data);
    }
  };
  function localSyncPosAfter(pos) {
    let found = pos.pos;
    for (let cx = pos.parent, index = pos.index; ; index = cx.index, cx = cx.parent) {
      if (!cx.parent || !cx.node.inlineContent && index != cx.node.content.length - 1)
        break;
      found = cx.after;
    }
    return found;
  }
  function markableSections(doc2, from, to, spanning, f) {
    doc2.iterate(from, to, (node, pos) => {
      if (pos >= from && pos + (spanning ? node.length : 1) <= to || node.isText) {
        if (node.isText ? f(node, Math.max(pos, from), Math.min(pos + node.length, to)) : f(node, pos, pos + 1))
          return false;
      }
    });
  }
  var SectionIter = class {
    sections;
    data;
    i = 0;
    len;
    off;
    ins;
    constructor(sections, data) {
      this.sections = sections;
      this.data = data;
      this.next();
    }
    next() {
      let { sections } = this;
      if (this.i < sections.length) {
        this.len = sections[this.i++];
        this.ins = sections[this.i++];
      } else {
        this.len = 0;
        this.ins = -3;
      }
      this.off = 0;
    }
    get keep() {
      return this.ins == -1 || this.ins == -2;
    }
    get done() {
      return this.ins == -3;
    }
    get len2() {
      return this.ins < 0 ? this.len : this.ins;
    }
    get mods() {
      return this.data ? this.data[this.i - 2 >> 1] : null;
    }
    get slice() {
      return this.data ? this.data[this.i - 2 >> 1] : Slice.empty;
    }
    slicePart(len) {
      return this.slice.slice(this.off, len == null ? void 0 : this.off + len);
    }
    forward(len) {
      if (len == this.len)
        this.next();
      else {
        this.len -= len;
        this.off += len;
      }
    }
    forward2(len) {
      if (this.keep)
        this.forward(len);
      else if (len == this.ins)
        this.next();
      else {
        this.ins -= len;
        this.off += len;
      }
    }
  };
  function addSection(sections, data, len, ins, value, forceJoin = false) {
    if (len == 0 && ins <= 0)
      return;
    let last = sections.length - 2;
    if (last >= 0 && ins <= 0 && ins == sections[last + 1]) {
      let lastValue = data ? data[data.length - 1] : null;
      let match = ins == 0 ? true : value ? lastValue && compareModifications(lastValue, value) : !lastValue;
      if (match) {
        sections[last] += len;
        return;
      }
    }
    if (forceJoin || last >= 0 && len == 0 && sections[last] == 0) {
      sections[last] += len;
      sections[last + 1] += ins;
      if (data)
        data[data.length - 1] = data[data.length - 1].concat(value);
    } else {
      sections.push(len, ins);
      if (data)
        data.push(value);
    }
  }
  function finishCx(cx, schema) {
    return cx.tag.create(cx.children.length || cx.tag.type.canBeEmpty ? cx.children : [schema.createDefault(cx.tag.type)]);
  }
  function closeSlice(schema, slice, context, depth2, closeEnd = false) {
    let top2 = [], stack = null;
    for (let i = depth2 - 1; i >= 0; i--)
      stack = new BuildContext(context[i], stack);
    for (let token of slice.content) {
      if (token.tokenType == Token.Type.Close) {
        if (stack) {
          let node = finishCx(stack, schema);
          stack = stack.parent;
          (stack ? stack.children : top2).push(node);
        } else {
          top2.push(token);
        }
      } else if (token.tokenType == Token.Type.Open) {
        stack = new BuildContext(token, stack);
      } else {
        (stack ? stack.children : top2).push(token);
      }
    }
    if (closeEnd)
      while (stack) {
        let node = finishCx(stack, schema);
        stack = stack.parent;
        (stack ? stack.children : top2).push(node);
      }
    if (stack)
      splatContext(top2, stack);
    return Slice.of(top2);
  }
  function splatContext(top2, cx) {
    if (cx.parent)
      splatContext(top2, cx.parent);
    top2.push(cx.tag);
    for (let ch of cx.children)
      top2.push(ch);
  }
  function fitReplacement(doc2, from, to, slice, context) {
    if (!slice.length)
      return fitDeletion(doc2, from, to);
    let preferredContext = -1;
    for (let i = 0; i < context.length; i++) {
      let next = context[i];
      if (next.type.defining)
        preferredContext = i;
      else if (!next.isTextblock)
        break;
    }
    let firstType = null, closeCount = 0;
    for (let i = 0, opened = 0; i < slice.content.length; i++) {
      let tok = slice.content[i];
      if (tok.tokenType == Token.Type.Close) {
        if (opened)
          opened--;
        else
          closeCount++;
      } else {
        if (!i)
          firstType = tok.type;
        if (tok.tokenType == Token.Type.Open)
          opened++;
      }
    }
    let found, foundCost = 1e8;
    let neutral = true, toEnd = true;
    scan: for (let cxFrom = from.parent, cxTo = to.parent, fromDepth = from.depth, toDepth = to.depth, start = from.pos, end = to.pos; cxFrom.parent; cxFrom = cxFrom.parent, start--, fromDepth--) {
      if (cxFrom.start != start || cxFrom.node.type.isolating)
        break;
      while (toDepth > fromDepth) {
        if (cxTo.node.type.isolating)
          break scan;
        cxTo = cxTo.parent;
        toDepth--;
        end++;
      }
      if (cxTo.end != end) {
        if (!closeCount)
          break;
        toEnd = false;
      }
      if (!cxFrom.node.type.neutral)
        neutral = false;
      if (fromDepth == toDepth)
        for (let i = -1, type; i < context.length; i++) {
          if (i >= 0)
            type = context[i].type;
          else if (!firstType)
            continue;
          else
            type = firstType;
          if (doc2.schema.canContain(cxFrom.parent.node.type, type)) {
            let cost = (neutral ? 0 : 2) + (i < preferredContext ? context.length - i : i - preferredContext) + (toEnd ? 0 : 1e7);
            if (foundCost > cost) {
              found = {
                from: cxFrom.before,
                to: toEnd ? cxTo.after : to.pos,
                slice: i >= 0 ? closeSlice(doc2.schema, slice, context, i + 1, toEnd) : slice
              };
              foundCost = cost;
            }
          }
        }
    }
    if (found)
      return found;
    if (from.pos == to.pos && !from.inText) {
      let cx = from.parent, before = from.pos, after = from.pos;
      for (; cx.parent && !cx.node.type.isolating && (before == cx.start || after == cx.end); cx = cx.parent, before--, after++) {
        for (let i = -1; i < context.length; i++) {
          let type = i >= 0 ? context[i].type : firstType;
          if (!type)
            continue;
          if (doc2.schema.canContain(cx.parent.node.type, type)) {
            let pos = before == cx.start ? cx.before : cx.after;
            return { from: pos, to: pos, slice: i >= 0 ? closeSlice(doc2.schema, slice, context, i + 1, true) : slice };
          }
        }
      }
    }
    for (let i = 0; i < context.length; i++) {
      if (doc2.schema.canContain(from.parent.node.type, context[i].type)) {
        slice = closeSlice(doc2.schema, slice, context, i + 1, true);
        break;
      }
    }
    return { from: from.pos, to: to.pos, slice };
  }
  function fitDeletion(doc2, from, to) {
    let toDepth = to.depth;
    let covered;
    for (let cx = from.parent, cxTo = to.parent, depth2 = from.depth, start = from.pos, end = to.pos; cx.parent; start--, cx = cx.parent, depth2--) {
      if (cx.start != start || cx.node.type.isolating)
        break;
      while (toDepth > depth2) {
        cxTo = cxTo.parent;
        toDepth--;
        end++;
      }
      let toAtEnd = toDepth == depth2 && cxTo.end == end;
      if (cx.end < to.pos && cx.parent.end > to.pos && !toAtEnd)
        return { from: cx.before, to: to.pos, slice: Slice.empty };
      if (!cx.node.inlineContent && toAtEnd && cx.parent.start == cxTo.parent.start && !(from.parent.start == to.parent.start && from.parent.node.inlineContent))
        covered = { from: cx.before, to: cxTo.after, slice: Slice.empty };
    }
    return covered || { from: from.pos, to: to.pos, slice: Slice.empty };
  }
  function parse(schema, doc2, options = {}) {
    let top2 = new NodeContext(schema.docTag, 4, null);
    let cx = new ParseContext(schema, options, top2);
    cx.parseChildren(doc2, [], false);
    cx.sync(top2);
    return cx.finishNode(cx.top);
  }
  parse = /* @__PURE__ */ (function(parse2) {
    function slice(schema, doc2, options = {}) {
      let top2 = new NodeContext(guessParent(doc2, schema), 4 | 1 | 2, null);
      let cx = new ParseContext(schema, options, top2);
      cx.parseChildren(doc2, [], true);
      cx.sync(top2);
      let tokens = [], context = [];
      let emitTokens = (children, openStart, openEnd) => {
        for (let i = 0; i < children.length; i++) {
          let child = children[i];
          if (openStart && i == 0 && child.isPlot && (cx.open.get(child) || 0) & 1) {
            if (children.length == 1 && openEnd && (cx.open.get(child) || 0) & 2) {
              emitTokens(child.content, true, true);
            } else {
              emitTokens(child.content, true, false);
              tokens.push(Plot.End);
            }
            context.push(child.tag);
          } else if (openEnd && i == children.length - 1 && child.isPlot && (cx.open.get(child) || 0) & 2) {
            tokens.push(child.tag);
            emitTokens(child.content, false, true);
          } else {
            tokens.push(child);
          }
        }
      };
      emitTokens(top2.children, true, true);
      return { slice: Slice.of(tokens), context };
    }
    parse2.slice = slice;
    (function(Rule) {
      const schemaCache2 = /* @__PURE__ */ new WeakMap();
      function addByPrec(array, value) {
        let prec = value.precedence ?? 0, i = array.length;
        while (i > 0 && prec > (array[i - 1].precedence ?? 0))
          i--;
        array.splice(i, 0, value);
      }
      class Set2 {
        rules;
        elementRules = [];
        attributeRules = [];
        constructor(rules) {
          this.rules = rules;
          for (let rule of rules)
            addByPrec("selector" in rule ? this.elementRules : this.attributeRules, rule);
        }
        static of(rules) {
          return new Set2(rules);
        }
        static fromSchema(schema) {
          let cached = schemaCache2.get(schema);
          if (cached)
            return cached;
          let rules = [];
          for (let tag of schema.nodes) {
            let { spec: { shape, parseRules } } = tag;
            if ("element" in shape && shape.element && (shape.readElement || tag.default))
              rules.push({
                selector: shape.selector || shape.element,
                readElement: shape.readElement,
                tag
              });
            if (parseRules)
              for (let rule of parseRules)
                rules.push({
                  ...rule,
                  tag: rule.tag || tag
                });
          }
          for (let mark of schema.marks) {
            let { shape, parseRules } = mark.spec;
            if (parseRules)
              for (let rule of parseRules)
                rules.push({ ...rule, mark: rule.mark || mark });
            if ("element" in shape && (shape.readElement || mark.default)) {
              rules.push({
                selector: shape.selector || shape.element,
                readElement: shape.readElement,
                mark
              });
            } else if ("attribute" in shape) {
              if (shape.readAttribute) {
                rules.push({
                  attribute: shape.attribute,
                  readAttribute: shape.readAttribute,
                  mark
                });
              } else if (typeof shape.value == "string") {
                rules.push({
                  attribute: shape.attribute,
                  value: shape.value,
                  mark
                });
              } else if (shape.value === 0) {
                rules.push({
                  attribute: shape.attribute,
                  readAttribute: (param) => param,
                  mark
                });
              }
            }
          }
          let result = new Rule.Set(rules);
          schemaCache2.set(schema, result);
          return result;
        }
        matchElement(elt) {
          for (let rule of this.elementRules) {
            if (elt.matches(rule.selector)) {
              if (!rule.readElement)
                return Object.prototype.hasOwnProperty.call(rule, "param") ? { rule, value: rule.param } : { rule };
              let result = rule.readElement(elt);
              if (result === parse2.Reject)
                continue;
              return { rule, value: result };
            }
          }
          return null;
        }
      }
      Rule.Set = Set2;
    })(parse2.Rule || (parse2.Rule = {}));
    parse2.Reject = /* @__PURE__ */ Symbol("reject");
    ;
    return parse2;
  })(parse);
  var ParseContext = class {
    schema;
    options;
    top;
    rules;
    open = /* @__PURE__ */ new Map();
    constructor(schema, options, top2) {
      this.schema = schema;
      this.options = options;
      this.top = top2;
      this.rules = options.ruleSet || parse.Rule.Set.fromSchema(schema);
    }
    parseChildren(parent, marks, endOfSlice, ignore) {
      for (let ch = parent.firstChild; ch; ch = ch.nextSibling) {
        if (ch.nodeType == 1)
          this.parseElement(ch, marks, endOfSlice && !ch.nextSibling);
        else if (ch.nodeType == 3 && !(ignore && (typeof ignore == "string" ? ch.matches(ignore) : ignore(ch))))
          this.parseTextNode(ch, marks);
      }
    }
    ignoreElement(elt, marks) {
      if (elt.nodeName == "BR" && !this.top.tag.inlineContent)
        this.findPlace(Leaf.Text.of("-"), marks, false);
    }
    parseElement(elt, marks, endOfSlice) {
      let name = elt.nodeName.toLowerCase();
      if (name in normalizers)
        normalizers[name](elt);
      let match = this.rules.matchElement(elt);
      if (match ? match.rule.ignore === true : ignoreTags.has(name)) {
        this.ignoreElement(elt, marks);
      } else if (!match || match.rule.ignore === "skip") {
        let sync, top2 = this.top;
        if (blockTags.has(name)) {
          if (top2.children.length && top2.children[0].type.isInline)
            this.close();
          sync = true;
        }
        let innerMarks = match && match.rule.ignore ? marks : this.parseAttributes(elt, marks);
        if (innerMarks)
          this.parseChildren(elt, innerMarks, endOfSlice);
        if (sync)
          this.sync(top2);
      } else {
        let innerMarks = this.parseAttributes(elt, marks);
        if (innerMarks && match.rule.marksFrom) {
          let inner = elt.querySelector(match.rule.marksFrom);
          if (inner)
            innerMarks = this.parseAttributes(inner, innerMarks);
        }
        if (innerMarks)
          this.parseElementByRule(elt, match, innerMarks, endOfSlice);
      }
    }
    parseElementByRule(elt, match, marks, endOfSlice) {
      let sync, isLeaf = false, { rule } = match, hasValue = Object.prototype.hasOwnProperty.call(match, "value");
      if (rule.tag) {
        let tag = rule.tag instanceof BaseTag ? rule.tag : hasValue ? rule.tag.of(match.value) : rule.tag.default;
        if (!tag)
          throw new SchemaError(`Parse rule for ${rule.selector} is missing a parameter`);
        if (tag.isPlot) {
          let innerMarks = this.enter(tag, marks, endOfSlice, elt);
          if (innerMarks) {
            sync = true;
            marks = innerMarks;
          }
        } else {
          this.insertNode(tag, marks);
          isLeaf = true;
        }
      } else {
        let mark = rule.mark instanceof Mark ? rule.mark : rule.mark instanceof Mark.Type ? hasValue ? rule.mark.of(match.value) : rule.mark.default : null;
        if (!mark)
          throw new Error(`Parse rule for ${rule.selector} does not produce a mark`);
        marks = marks.concat(mark);
      }
      let startIn = this.top;
      if (!isLeaf) {
        let content = elt;
        if (typeof rule.contentElement == "string")
          content = elt.querySelector(rule.contentElement) || elt;
        else if (typeof rule.contentElement == "function")
          content = rule.contentElement(elt);
        this.parseChildren(content, marks, endOfSlice, rule.ignoreContent);
      }
      if (sync && this.sync(startIn))
        this.close();
    }
    parseTextNode(dom, marks) {
      let text = dom.nodeValue;
      if (!this.top.tag.type.preserveWhitespace && this.options.collapseWhiteSpace !== false) {
        if (!this.top.tag.inlineContent && !/[^ \t\r\n\u000c]/.test(text))
          return;
        text = text.replace(/[ \t\r\n\u000c]+/g, " ");
        if (/^ /.test(text)) {
          let nodeBefore = this.top.children[this.top.children.length - 1];
          if (nodeBefore ? nodeBefore == this.schema.lineBreak || nodeBefore.is(Leaf.Text) && / $/.test(nodeBefore.param) : !(this.top.flags & 1))
            text = text.slice(1);
        }
        if (text)
          this.insertNode(Leaf.text(text), marks);
      } else if (this.top.tag.type.preserveWhitespace && this.schema.lineBreak) {
        let lines = text.split(/\r?\n|\r/g);
        for (let i = 0; i < lines.length; i++) {
          if (i)
            this.insertNode(this.schema.lineBreak, marks);
          if (lines[i])
            this.insertNode(Leaf.text(lines[i]), marks);
        }
      } else {
        text = text.replace(/\r?\n|\r/g, " ");
        if (text)
          this.insertNode(Leaf.text(text), marks);
      }
    }
    parseAttributes(elt, marks) {
      let matched = /* @__PURE__ */ new Set(), style2 = elt.style, hasStyles = style2 && style2.length > 0;
      for (let rule of this.rules.attributeRules)
        if (!matched.has(rule.attribute)) {
          let isStyle = /^style\//.test(rule.attribute);
          let value = !isStyle ? elt.getAttribute(rule.attribute) : hasStyles ? style2.getPropertyValue(rule.attribute.slice(6)) : "";
          if (!value)
            continue;
          let hasParam = Object.prototype.hasOwnProperty.call(rule, "param"), param = rule.param;
          if (rule.readAttribute) {
            param = rule.readAttribute(value);
            hasParam = true;
            if (param == parse.Reject)
              continue;
          } else if (rule.value != null && rule.value != value) {
            continue;
          }
          if (rule.ignore)
            return null;
          if (rule.consuming !== false)
            matched.add(rule.attribute);
          if (rule.clearMark) {
            marks = marks.filter((p) => !rule.clearMark(p));
          } else {
            let mark = rule.mark instanceof Mark ? rule.mark : rule.mark instanceof Mark.Type ? hasParam ? rule.mark.of(param) : rule.mark.default : null;
            if (!mark)
              throw new Error(`Parse rule for ${rule.attribute} does not produce a mark (or have ignore/clearMark properties)`);
            marks = marks.concat(mark);
          }
        }
      return marks;
    }
    insertNode(node, marks) {
      let innerMarks = this.findPlace(node.tag, marks, false);
      if (innerMarks) {
        let top2 = this.top;
        for (let p of innerMarks)
          if (this.schema.markAllowed(p.type, node.type))
            node = node.withMarks(p.addToSet(node.marks));
        for (let p of node.tag.marks)
          node = node.withMarks(p.addToSet(node.marks));
        node.pushTo(top2.children);
        return true;
      }
      return false;
    }
    findPlace(tag, marks, endOfSlice) {
      let route, under;
      for (let cx = this.top; ; cx = cx.parent) {
        let found = this.schema.findWrapping(cx.tag.type, tag.type);
        if (found && (!route || route.length > found.length)) {
          route = found;
          under = cx;
          if (!found.length)
            break;
        }
        if (cx.flags & 4)
          break;
      }
      if (!route)
        return null;
      this.sync(under);
      for (let i = 0; i < route.length; i++)
        marks = this.enterInner(route[i], marks, endOfSlice, null);
      return marks;
    }
    enter(tag, marks, endOfSlice, elt) {
      let innerMarks = this.findPlace(tag, marks, endOfSlice);
      if (innerMarks)
        innerMarks = this.enterInner(tag, marks, endOfSlice, elt);
      return innerMarks;
    }
    enterInner(tag, marks, endOfSlice, element) {
      marks = marks.filter((p) => {
        if (!this.schema.markAllowed(p.type, tag.type))
          return true;
        tag = tag.withMarks(p.addToSet(tag.marks));
        return false;
      });
      let test, open = (this.top.children.length ? 0 : this.top.flags & 1) | (endOfSlice ? this.top.flags & 2 : 0);
      if (open && element && this.options.isOpen && (test = this.options.isOpen(element))) {
        open &= -4;
        if (test == "start")
          open |= 1;
        else if (test == "end")
          open |= 2;
        else if (test == "start end")
          open |= 1 | 2;
      }
      this.top = new NodeContext(tag, (element ? 4 : 0) | open, this.top);
      return marks;
    }
    sync(to) {
      if (!this.top.isIn(to))
        return false;
      while (this.top != to)
        this.close();
      return true;
    }
    close() {
      let parent = this.top.parent;
      parent.children.push(this.finishNode(this.top));
      this.top = parent;
    }
    finishNode(cx) {
      if (!(cx.flags & 2) && cx.children.length && !cx.tag.type.preserveWhitespace && this.options.collapseWhiteSpace !== false) {
        let last = cx.children[cx.children.length - 1].tag, m;
        if (last.is(Leaf.Text) && (m = /[ \t\r\n\u000c]+$/.exec(last.param))) {
          let len = last.length - m[0].length;
          if (!len)
            cx.children.pop();
          else
            cx.children[cx.children.length - 1] = last.sliceText(0, len);
        }
      }
      let open = cx.flags & (2 | 1);
      if (!open && !cx.tag.type.canBeEmpty && cx.tag.isPlot && !cx.children.length)
        cx.children.push(this.schema.createDefault(cx.tag.type));
      let node = cx.tag.isDoc ? this.schema.doc(cx.children) : cx.tag.create(cx.children);
      if (open)
        this.open.set(node, open);
      return node;
    }
  };
  var NodeContext = class {
    tag;
    flags;
    parent;
    children = [];
    constructor(tag, flags, parent) {
      this.tag = tag;
      this.flags = flags;
      this.parent = parent;
    }
    isIn(parent) {
      for (let cx = this; cx; cx = cx.parent)
        if (cx == parent)
          return true;
      return false;
    }
  };
  function normalizeList(dom) {
    for (let child = dom.firstChild, prevItem = null; child; child = child.nextSibling) {
      if (child.nodeType != 1)
        continue;
      let name = child.nodeName.toLowerCase();
      if (prevItem && (name == "ol" || name == "ul")) {
        prevItem.appendChild(child);
        child = prevItem;
      } else {
        prevItem = name == "li" ? child : null;
      }
    }
  }
  var normalizers = { ol: normalizeList, ul: normalizeList };
  var ignoreTags = /* @__PURE__ */ (() => /* @__PURE__ */ new Set(["head", "noscript", "object", "script", "style", "title"]))();
  var blockTags = /* @__PURE__ */ (() => /* @__PURE__ */ new Set([
    "address",
    "article",
    "aside",
    "blockquote",
    "canvas",
    "dd",
    "div",
    "dl",
    "fieldset",
    "figcaption",
    "figure",
    "footer",
    "form",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "header",
    "hgroup",
    "hr",
    "li",
    "noscript",
    "ol",
    "output",
    "p",
    "pre",
    "section",
    "table",
    "tfoot",
    "ul"
  ]))();
  function guessParent(content, schema) {
    let rules = parse.Rule.Set.fromSchema(schema);
    let tags = [];
    let explore = (node) => {
      if (node.nodeType == 3) {
        tags.push(Leaf.Text);
      } else if (node.nodeType == 1) {
        let match = rules.matchElement(node);
        if (match && match.rule.tag) {
          tags.push(Node.Type.get(match.rule.tag));
        } else if (!(match && match.rule.ignore)) {
          for (let ch = node.firstChild; ch; ch = ch.nextSibling)
            explore(ch);
        }
      }
    };
    explore(content);
    let best, bestCost = 0;
    for (let parent of schema.nodes)
      if (parent.isPlot && parent.default) {
        let cost = parent.isDoc ? -1 : 0;
        for (let child of tags) {
          let fit = schema.findWrapping(parent, child);
          cost += fit ? fit.length * 2 : 1e3;
        }
        if (!best || bestCost > cost) {
          best = parent.default;
          bestCost = cost;
        }
      }
    return best;
  }
  var SerializeContext = class {
    openAttr;
    emitNewlines;
    override;
    constructor(options, openAttr) {
      this.openAttr = openAttr;
      this.emitNewlines = options.emitNewlines !== false;
      this.override = options.override;
    }
  };
  function serialize(doc2, options = {}) {
    return Elt.Fragment.create(serializeChildren(doc2.content, new SerializeContext(options)));
  }
  serialize = /* @__PURE__ */ (function(serialize2) {
    function node(node2, options) {
      return serializeChildren([node2], new SerializeContext(options))[0];
    }
    serialize2.node = node;
    function slice(slice2, options) {
      return Elt.Fragment.create(serializeChildren(flattenSlice(slice2.content, options.context || [], options.includeContext || 0, !!options.openAttr), new SerializeContext(options, options.openAttr)));
    }
    serialize2.slice = slice;
    ;
    return serialize2;
  })(serialize);
  var genericTag = /* @__PURE__ */ (() => Plot.define("generic", {
    blockContent: Node.Group.All,
    shape: { element: "div" }
  }))();
  var openMark = /* @__PURE__ */ (() => Mark.Type.define("Open", {
    shape: { attribute: "wg-open", value: 0 },
    target: Node.Group.All
  }))();
  function flattenSlice(content, context, includeContext, markOpen) {
    let depth2 = 0, i = 0, scan = (inner) => {
      let result2 = [];
      for (; i < content.length; ) {
        let tok = content[i++];
        if (tok.tokenType == Token.Type.Close) {
          if (inner)
            break;
          let tag = depth2 < context.length ? context[depth2++] : genericTag;
          if (markOpen)
            tag = tag.withMarks(openMark.of("start").addToSet(tag.marks));
          result2 = [tag.create(result2)];
        } else if (tok.tokenType == Token.Type.Open) {
          let content2 = scan(true), tag = tok;
          if (markOpen)
            tag = tag.withMarks(openMark.of("end").addToSet(tag.marks));
          result2.push(tag.create(content2));
        } else {
          result2.push(tok);
        }
      }
      return result2;
    };
    let result = scan(false);
    while (depth2 < includeContext && depth2 < context.length) {
      let tag = context[depth2++];
      if (markOpen)
        tag = tag.withMarks(openMark.of("start end").addToSet(tag.marks));
      result = [tag.create(result)];
    }
    return result;
  }
  function serializeNodeInner(node, cx) {
    let markAttrs = Attributes.none, targeted;
    for (let mark of node.tag.marks)
      if (mark.type.attribute) {
        if (mark.type == openMark) {
          markAttrs = Attributes.merge(markAttrs, [cx.openAttr, mark.value]);
        } else {
          let { target, get } = mark.type.attribute, attrs = get(mark.value);
          if (target && !node.isText) {
            (targeted || (targeted = [])).push({ attrs, target });
          } else if (!node.isText || mark.spanning) {
            markAttrs = Attributes.merge(markAttrs, attrs);
          }
        }
      }
    if (node.is(Leaf.Text))
      return markAttrs.length ? Elt.create("span", markAttrs, [node.param]) : node.param;
    let children;
    if (node.isLeaf) {
      children = [];
    } else {
      let { content } = node;
      if (cx.emitNewlines && node.type.preserveWhitespace)
        content = lineBreaksToNewlines(content);
      children = serializeChildren(content, cx);
    }
    let elt = cx.override && cx.override(node.tag) || node.type.shape.create(node.tag.param);
    if (markAttrs.length)
      elt = elt.addAttrs(markAttrs);
    if (targeted)
      for (let { attrs, target } of targeted)
        elt = elt.addAttrs(attrs, target);
    return elt.hasContent ? withContent(elt, children) : elt;
  }
  function withContent(elt, content) {
    let children = [];
    for (let ch of elt.children) {
      if (ch === 0)
        for (let inner of content)
          children.push(inner);
      else if (typeof ch == "string")
        children.push(ch);
      else
        children.push(withContent(ch, content));
    }
    return Elt.create(elt.tagName, elt.attrs, children);
  }
  function lineBreaksToNewlines(nodes) {
    if (!nodes.some((n) => n.type.hasRole(Node.Role.LineBreak)))
      return nodes;
    let result = [], lastText = false;
    for (let node of nodes) {
      let next = node.type.hasRole(Node.Role.LineBreak) ? Leaf.text("\n", node.marks) : node;
      if (lastText && next instanceof Plot)
        next.pushTo(result);
      else
        result.push(next);
      lastText = next.isText;
    }
    return result;
  }
  var EltCx = class {
    tagName;
    attrs;
    parent;
    children = [];
    constructor(tagName, attrs, parent) {
      this.tagName = tagName;
      this.attrs = attrs;
      this.parent = parent;
    }
    pop() {
      let repr = Elt.create(this.tagName, this.attrs, this.children);
      let parent = this.parent;
      parent.children.push(repr);
      return parent;
    }
  };
  function serializeChildren(children, cx) {
    let active = [], top2 = new EltCx("", Attributes.none, null);
    for (let child of children) {
      if (active.length || child.marks.some((p) => p.type.element)) {
        let keep = 0, rendered = 0, eltMarks = [];
        for (let mark of child.marks)
          if (mark.type.element)
            eltMarks.push(mark);
        while (keep < active.length && rendered < eltMarks.length) {
          let next = eltMarks[rendered];
          if (!next.eq(active[keep]) || !next.type.spanning)
            break;
          keep++;
          rendered++;
        }
        while (keep < active.length) {
          top2 = top2.pop();
          active.pop();
        }
        while (rendered < eltMarks.length) {
          let add2 = eltMarks[rendered++];
          let repr = add2.type.element;
          top2 = new EltCx(repr.name, repr.attrs(add2.value), top2);
          active.push(add2);
        }
      }
      top2.children.push(serializeNodeInner(child, cx));
    }
    for (let i = 0; i < active.length; i++)
      top2 = top2.pop();
    return top2.children;
  }

  // node_modules/@marijn/find-cluster-break/src/index.js
  var rangeFrom = [];
  var rangeTo = [];
  (() => {
    let numbers = "lc,34,7n,7,7b,19,,,,2,,2,,,20,b,1c,l,g,,2t,7,2,6,2,2,,4,z,,u,r,2j,b,1m,9,9,,o,4,,9,,3,,5,17,3,3b,f,,w,1j,,,,4,8,4,,3,7,a,2,t,,1m,,,,2,4,8,,9,,a,2,q,,2,2,1l,,4,2,4,2,2,3,3,,u,2,3,,b,2,1l,,4,5,,2,4,,k,2,m,6,,,1m,,,2,,4,8,,7,3,a,2,u,,1n,,,,c,,9,,14,,3,,1l,3,5,3,,4,7,2,b,2,t,,1m,,2,,2,,3,,5,2,7,2,b,2,s,2,1l,2,,,2,4,8,,9,,a,2,t,,20,,4,,2,3,,,8,,29,,2,7,c,8,2q,,2,9,b,6,22,2,r,,,,,,1j,e,,5,,2,5,b,,10,9,,2u,4,,6,,2,2,2,p,2,4,3,g,4,d,,2,2,6,,f,,jj,3,qa,3,t,3,t,2,u,2,1s,2,,7,8,,2,b,9,,19,3,3b,2,y,,3a,3,4,2,9,,6,3,63,2,2,,1m,,,7,,,,,2,8,6,a,2,,1c,h,1r,4,1c,7,,,5,,14,9,c,2,w,4,2,2,,3,1k,,,2,3,,,3,1m,8,2,2,48,3,,d,,7,4,,6,,3,2,5i,1m,,5,ek,,5f,x,2da,3,3x,,2o,w,fe,6,2x,2,n9w,4,,a,w,2,28,2,7k,,3,,4,,p,2,5,,47,2,q,i,d,,12,8,p,b,1a,3,1c,,2,4,2,2,13,,1v,6,2,2,2,2,c,,8,,1b,,1f,,,3,2,2,5,2,,,16,2,8,,6m,,2,,4,,fn4,,kh,g,g,g,a6,2,gt,,6a,,45,5,1ae,3,,2,5,4,14,3,4,,4l,2,fx,4,ar,2,49,b,4w,,1i,f,1k,3,1d,4,2,2,1x,3,10,5,,8,1q,,c,2,1g,9,a,4,2,,2n,3,2,,,2,6,,4g,,3,8,l,2,1l,2,,,,,m,,e,7,3,5,5f,8,2,3,,,n,,29,,2,6,,,2,,,2,,2,6j,,2,4,6,2,,2,r,2,2d,8,2,,,2,2y,,,,2,6,,,2t,3,2,4,,5,77,9,,2,6t,,a,2,,,4,,40,4,2,2,4,,w,a,14,6,2,4,8,,9,6,2,3,1a,d,,2,ba,7,,6,,,2a,m,2,7,,2,,2,3e,6,3,,,2,,7,,,20,2,3,,,,9n,2,f0b,5,1n,7,t4,,1r,4,29,,f5k,2,43q,,,3,4,5,8,8,2,7,u,4,44,3,1iz,1j,4,1e,8,,e,,m,5,,f,11s,7,,h,2,7,,2,,5,79,7,c5,4,15s,7,31,7,240,5,gx7k,2o,3k,6o".split(",").map((s) => s ? parseInt(s, 36) : 1);
    for (let i = 0, n = 0; i < numbers.length; i++)
      (i % 2 ? rangeTo : rangeFrom).push(n = n + numbers[i]);
  })();
  function isExtendingChar(code2) {
    if (code2 < 768) return false;
    for (let from = 0, to = rangeFrom.length; ; ) {
      let mid = from + to >> 1;
      if (code2 < rangeFrom[mid]) to = mid;
      else if (code2 >= rangeTo[mid]) from = mid + 1;
      else return true;
      if (from == to) return false;
    }
  }
  function isRegionalIndicator(code2) {
    return code2 >= 127462 && code2 <= 127487;
  }
  var ZWJ = 8205;
  function findClusterBreak(str, pos, forward = true, includeExtending = true) {
    return (forward ? nextClusterBreak : prevClusterBreak)(str, pos, includeExtending);
  }
  function nextClusterBreak(str, pos, includeExtending) {
    if (pos == str.length) return pos;
    if (pos && surrogateLow(str.charCodeAt(pos)) && surrogateHigh(str.charCodeAt(pos - 1))) pos--;
    let prev = codePointAt(str, pos);
    pos += codePointSize(prev);
    while (pos < str.length) {
      let next = codePointAt(str, pos);
      if (prev == ZWJ || next == ZWJ || includeExtending && isExtendingChar(next)) {
        pos += codePointSize(next);
        prev = next;
      } else if (isRegionalIndicator(next)) {
        let countBefore = 0, i = pos - 2;
        while (i >= 0 && isRegionalIndicator(codePointAt(str, i))) {
          countBefore++;
          i -= 2;
        }
        if (countBefore % 2 == 0) break;
        else pos += 2;
      } else {
        break;
      }
    }
    return pos;
  }
  function prevClusterBreak(str, pos, includeExtending) {
    while (pos > 1) {
      let found = nextClusterBreak(str, pos - 2, includeExtending);
      if (found < pos) return found;
      pos--;
    }
    return 0;
  }
  function codePointAt(str, pos) {
    let code0 = str.charCodeAt(pos);
    if (!surrogateHigh(code0) || pos + 1 == str.length) return code0;
    let code1 = str.charCodeAt(pos + 1);
    if (!surrogateLow(code1)) return code0;
    return (code0 - 55296 << 10) + (code1 - 56320) + 65536;
  }
  function surrogateLow(ch) {
    return ch >= 56320 && ch < 57344;
  }
  function surrogateHigh(ch) {
    return ch >= 55296 && ch < 56320;
  }
  function codePointSize(code2) {
    return code2 < 65536 ? 1 : 2;
  }

  // node_modules/wordgard/dist/state.js
  function dec(str) {
    let result = [];
    for (let i = 0; i < str.length; i++)
      result.push(1 << +str[i]);
    return result;
  }
  var LowTypes = /* @__PURE__ */ dec("88888888888888888888888888888888888666888888787833333333337888888000000000000000000000000008888880000000000000000000000000088888888888888888888888888888888888887866668888088888663380888308888800000000000000000000000800000000000000000000000000000008");
  var ArabicTypes = /* @__PURE__ */ dec("4444448826627288999999999992222222222222222222222222222222222222222222222229999999999999999999994444444444644222822222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222999999949999999229989999223333333333");
  var Brackets = /* @__PURE__ */ (() => {
    let result = /* @__PURE__ */ Object.create(null);
    for (let p of ["()", "[]", "{}"]) {
      let l = p.charCodeAt(0), r = p.charCodeAt(1);
      result[l] = r;
      result[r] = -l;
    }
    return result;
  })();
  var BracketStack = [];
  function charType(ch) {
    return ch <= 247 ? LowTypes[ch] : 1424 <= ch && ch <= 1524 ? 2 : 1536 <= ch && ch <= 1785 ? ArabicTypes[ch - 1536] : 1774 <= ch && ch <= 2220 ? 4 : 8192 <= ch && ch <= 8204 ? 256 : 64336 <= ch && ch <= 65023 ? 4 : ch == 65532 ? 256 : 1;
  }
  var BidiRE = /[\u0590-\u05f4\u0600-\u06ff\u0700-\u08ac\ufb50-\ufdff]/;
  var BidiSpan = class {
    from;
    to;
    level;
    get ltr() {
      return this.level % 2 == 0;
    }
    constructor(from, to, level) {
      this.from = from;
      this.to = to;
      this.level = level;
    }
    side(end, ltr) {
      return this.ltr == ltr == end ? this.to : this.from;
    }
    forward(forward, ltr) {
      return forward == (this.ltr == ltr);
    }
    static find(order, index, assoc) {
      let maybe = -1;
      for (let i = 0; i < order.length; i++) {
        let span = order[i];
        if (span.from <= index && span.to >= index && (maybe < 0 || (assoc != 0 ? assoc < 0 ? span.from < index : span.to > index : order[maybe].level > span.level)))
          maybe = i;
      }
      if (maybe < 0)
        throw new RangeError("Index out of range");
      return maybe;
    }
    static strongDir(ch) {
      let type = charType(ch);
      if (type == 1)
        return true;
      if (type == 2 || type == 4)
        return false;
      return null;
    }
  };
  var types = [];
  function computeCharTypes(line, rFrom, rTo, isolates, outerType) {
    for (let iI = 0; iI <= isolates.length; iI++) {
      let from = iI ? isolates[iI - 1].to : rFrom, to = iI < isolates.length ? isolates[iI].from : rTo;
      let prevType = iI ? 256 : outerType;
      for (let i = from, prev = prevType, prevStrong = prevType; i < to; i++) {
        let type = charType(line.charCodeAt(i));
        if (type == 512)
          type = prev;
        else if (type == 8 && prevStrong == 4)
          type = 16;
        types[i] = type == 4 ? 2 : type;
        if (type & 7)
          prevStrong = type;
        prev = type;
      }
      for (let i = from, prev = prevType, prevStrong = prevType; i < to; i++) {
        let type = types[i];
        if (type == 128) {
          if (i < to - 1 && prev == types[i + 1] && prev & 24)
            type = types[i] = prev;
          else
            types[i] = 256;
        } else if (type == 64) {
          let end = i + 1;
          while (end < to && types[end] == 64)
            end++;
          let replace = i && prev == 8 || end < rTo && types[end] == 8 ? prevStrong == 1 ? 1 : 8 : 256;
          for (let j = i; j < end; j++)
            types[j] = replace;
          i = end - 1;
        } else if (type == 8 && prevStrong == 1) {
          types[i] = 1;
        }
        prev = type;
        if (type & 7)
          prevStrong = type;
      }
    }
  }
  function processBracketPairs(line, rFrom, rTo, isolates, outerType) {
    let oppositeType = outerType == 1 ? 2 : 1;
    for (let iI = 0, sI = 0, context = 0; iI <= isolates.length; iI++) {
      let from = iI ? isolates[iI - 1].to : rFrom, to = iI < isolates.length ? isolates[iI].from : rTo;
      for (let i = from, ch, br, type; i < to; i++) {
        if (br = Brackets[ch = line.charCodeAt(i)]) {
          if (br < 0) {
            for (let sJ = sI - 3; sJ >= 0; sJ -= 3) {
              if (BracketStack[sJ + 1] == -br) {
                let flags = BracketStack[sJ + 2];
                let type2 = flags & 2 ? outerType : !(flags & 4) ? 0 : flags & 1 ? oppositeType : outerType;
                if (type2)
                  types[i] = types[BracketStack[sJ]] = type2;
                sI = sJ;
                break;
              }
            }
          } else if (BracketStack.length == 189) {
            break;
          } else {
            BracketStack[sI++] = i;
            BracketStack[sI++] = ch;
            BracketStack[sI++] = context;
          }
        } else if ((type = types[i]) == 2 || type == 1) {
          let embed = type == outerType;
          context = embed ? 0 : 1;
          for (let sJ = sI - 3; sJ >= 0; sJ -= 3) {
            let cur = BracketStack[sJ + 2];
            if (cur & 2)
              break;
            if (embed) {
              BracketStack[sJ + 2] |= 2;
            } else {
              if (cur & 4)
                break;
              BracketStack[sJ + 2] |= 4;
            }
          }
        }
      }
    }
  }
  function processNeutrals(rFrom, rTo, isolates, outerType) {
    for (let iI = 0, prev = outerType; iI <= isolates.length; iI++) {
      let from = iI ? isolates[iI - 1].to : rFrom, to = iI < isolates.length ? isolates[iI].from : rTo;
      for (let i = from; i < to; ) {
        let type = types[i];
        if (type == 256) {
          let end = i + 1;
          for (; ; ) {
            if (end == to) {
              if (iI == isolates.length)
                break;
              end = isolates[iI++].to;
              to = iI < isolates.length ? isolates[iI].from : rTo;
            } else if (types[end] == 256) {
              end++;
            } else {
              break;
            }
          }
          let beforeL = prev == 1;
          let afterL = (end < rTo ? types[end] : outerType) == 1;
          let replace = beforeL == afterL ? beforeL ? 1 : 2 : outerType;
          for (let j = end, jI = iI, fromJ = jI ? isolates[jI - 1].to : rFrom; j > i; ) {
            if (j == fromJ) {
              j = isolates[--jI].from;
              fromJ = jI ? isolates[jI - 1].to : rFrom;
            }
            types[--j] = replace;
          }
          i = end;
        } else {
          prev = type;
          i++;
        }
      }
    }
  }
  function emitSpans(line, from, to, level, baseLevel, isolates, order) {
    let ourType = level % 2 ? 2 : 1;
    if (level % 2 == baseLevel % 2) {
      for (let iCh = from, iI = 0; iCh < to; ) {
        let sameDir = true, isNum = false;
        if (iI == isolates.length || iCh < isolates[iI].from) {
          let next = types[iCh];
          if (next != ourType) {
            sameDir = false;
            isNum = next == 16;
          }
        }
        let recurse = !sameDir && ourType == 1 ? [] : null;
        let localLevel = sameDir ? level : level + 1;
        let iScan = iCh;
        run: for (; ; ) {
          if (iI < isolates.length && iScan == isolates[iI].from) {
            if (isNum)
              break run;
            let iso = isolates[iI];
            if (!sameDir)
              for (let upto = iso.to, jI = iI + 1; ; ) {
                if (upto == to)
                  break run;
                if (jI < isolates.length && isolates[jI].from == upto)
                  upto = isolates[jI++].to;
                else if (types[upto] == ourType)
                  break run;
                else
                  break;
              }
            iI++;
            if (recurse) {
              recurse.push(iso);
            } else {
              if (iso.from > iCh)
                order.push(new BidiSpan(iCh, iso.from, localLevel));
              let dirSwap = iso.ltr != !(localLevel % 2);
              computeSectionOrder(line, dirSwap ? level + 1 : level, baseLevel, iso.inner, iso.from, iso.to, order);
              iCh = iso.to;
            }
            iScan = iso.to;
          } else if (iScan == to || (sameDir ? types[iScan] != ourType : types[iScan] == ourType)) {
            break;
          } else {
            iScan++;
          }
        }
        if (recurse)
          emitSpans(line, iCh, iScan, level + 1, baseLevel, recurse, order);
        else if (iCh < iScan)
          order.push(new BidiSpan(iCh, iScan, localLevel));
        iCh = iScan;
      }
    } else {
      for (let iCh = to, iI = isolates.length; iCh > from; ) {
        let sameDir = true, isNum = false;
        if (!iI || iCh > isolates[iI - 1].to) {
          let next = types[iCh - 1];
          if (next != ourType) {
            sameDir = false;
            isNum = next == 16;
          }
        }
        let recurse = !sameDir && ourType == 1 ? [] : null;
        let localLevel = sameDir ? level : level + 1;
        let iScan = iCh;
        run: for (; ; ) {
          if (iI && iScan == isolates[iI - 1].to) {
            if (isNum)
              break run;
            let iso = isolates[--iI];
            if (!sameDir)
              for (let upto = iso.from, jI = iI; ; ) {
                if (upto == from)
                  break run;
                if (jI && isolates[jI - 1].to == upto)
                  upto = isolates[--jI].from;
                else if (types[upto - 1] == ourType)
                  break run;
                else
                  break;
              }
            if (recurse) {
              recurse.push(iso);
            } else {
              if (iso.to < iCh)
                order.push(new BidiSpan(iso.to, iCh, localLevel));
              let dirSwap = iso.ltr != !(localLevel % 2);
              computeSectionOrder(line, dirSwap ? level + 1 : level, baseLevel, iso.inner, iso.from, iso.to, order);
              iCh = iso.from;
            }
            iScan = iso.from;
          } else if (iScan == from || (sameDir ? types[iScan - 1] != ourType : types[iScan - 1] == ourType)) {
            break;
          } else {
            iScan--;
          }
        }
        if (recurse)
          emitSpans(line, iScan, iCh, level + 1, baseLevel, recurse, order);
        else if (iScan < iCh)
          order.push(new BidiSpan(iScan, iCh, localLevel));
        iCh = iScan;
      }
    }
  }
  function computeSectionOrder(line, level, baseLevel, isolates, from, to, order) {
    let outerType = level % 2 ? 2 : 1;
    computeCharTypes(line, from, to, isolates, outerType);
    processBracketPairs(line, from, to, isolates, outerType);
    processNeutrals(from, to, isolates, outerType);
    emitSpans(line, from, to, level, baseLevel, isolates, order);
  }
  function computeOrder(line, ltr, isolates) {
    if (!line)
      return [new BidiSpan(0, 0, ltr ? 0 : 1)];
    if (ltr && !isolates.length && !BidiRE.test(line))
      return trivialOrder(line.length);
    if (isolates.length)
      while (line.length > types.length)
        types[types.length] = 256;
    let order = [], level = ltr ? 0 : 1;
    computeSectionOrder(line, level, level, isolates, 0, line.length, order);
    return order;
  }
  function trivialOrder(length) {
    return [new BidiSpan(0, length, 0)];
  }
  var cache = /* @__PURE__ */ (() => /* @__PURE__ */ new WeakMap())();
  var TextblockMap = class _TextblockMap {
    start;
    node;
    ltr;
    text;
    _order;
    config;
    sections;
    constructor(start, node, ltr, text, _order, config, sections) {
      this.start = start;
      this.node = node;
      this.ltr = ltr;
      this.text = text;
      this._order = _order;
      this.config = config;
      this.sections = sections;
    }
    get order() {
      return this._order || (this._order = computeOrder(this.text, this.ltr, []));
    }
    static get(cx, start, node) {
      let cached = cache.get(node);
      if (cached && cached.config == cx.config)
        return cached.start == start ? cached : new _TextblockMap(start, node, cached.ltr, cached.text, cached._order, cx.config, cached.sections);
      let result = _TextblockMap.create(start, node, cx.config);
      cache.set(node, result);
      return result;
    }
    static create(start, node, config) {
      let text = "", sections = [], sectionPos = 0;
      let flush = (upto) => {
        if (upto > sectionPos)
          sections.push(upto - sectionPos << 2);
      };
      let scan = (node2, pos) => {
        for (let ch of node2.content) {
          if (ch.is(Leaf.Text)) {
            text += ch.param;
          } else if (ch.isLeaf || config.isAtom(ch.type)) {
            text += "\uFFFC";
            if (ch.length > 1) {
              flush(pos);
              sections.push(ch.length << 2 | 1);
              sectionPos = pos + ch.length;
            }
          } else if (ch.type.spec.cursorInsideBounds) {
            text += " ";
            scan(ch, pos + 1);
            text += " ";
          } else {
            flush(pos);
            sections.push(1 << 2 | 3);
            scan(ch, sectionPos = pos + 1);
            flush(pos + ch.length - 1);
            sections.push(1 << 2 | 2);
            sectionPos = pos + ch.length;
          }
          pos += ch.length;
        }
      };
      scan(node, 0);
      flush(node.contentLength);
      return new _TextblockMap(start, node, config.textblockLTR(node), text, null, config, sections);
    }
    toIndex(pos) {
      if (pos < this.start)
        return 0;
      let off = pos - this.start, idx = 0;
      for (let n of this.sections) {
        let len = n >> 2, flag = n & 3;
        if (flag == 0) {
          if (off <= len)
            return idx + off;
          off -= len;
          idx += len;
        } else if (flag == 1) {
          off -= len;
          if (off < 0)
            return idx;
          idx++;
        } else {
          off--;
        }
      }
      return idx;
    }
    fromIndex(index) {
      let off = this.start;
      for (let n of this.sections) {
        let len = n >> 2, flag = n & 3;
        if (flag == 0) {
          if (len > index)
            return off + index;
          index -= len;
        } else if (flag == 1) {
          if (!index)
            return off;
          index--;
        } else {
          if (!index)
            return off + (flag == 2 ? 1 : 0);
        }
        off += len;
      }
      return off;
    }
    moveVisually(start, side, forward, skipped) {
      let startIndex = this.toIndex(start), { order, ltr } = this;
      let spanI = BidiSpan.find(order, startIndex, side);
      let span = order[spanI], spanEnd = span.side(forward, ltr);
      if (startIndex == spanEnd) {
        let nextI = spanI += forward ? 1 : -1;
        if (nextI < 0 || nextI >= order.length)
          return null;
        span = order[spanI = nextI];
        startIndex = span.side(!forward, ltr);
        spanEnd = span.side(forward, ltr);
      }
      let nextIndex = findClusterBreak(this.text, startIndex, span.forward(forward, ltr));
      if (nextIndex == startIndex)
        return null;
      if (nextIndex < span.from || nextIndex > span.to)
        nextIndex = spanEnd;
      if (skipped)
        skipped[0] = this.text.slice(Math.min(startIndex, nextIndex), Math.max(startIndex, nextIndex));
      let nextSpan = spanI == (forward ? order.length - 1 : 0) ? null : order[spanI + (forward ? 1 : -1)];
      if (nextSpan && nextIndex == spanEnd && nextSpan.level + (forward ? 0 : 1) < span.level)
        return { pos: this.fromIndex(nextSpan.side(!forward, ltr)), side: nextSpan.forward(forward, ltr) ? 1 : -1 };
      return { pos: this.fromIndex(nextIndex), side: nextIndex != spanEnd ? 1 : span.forward(forward, ltr) ? -1 : 1 };
    }
    skipWord(start, side, forward, visually) {
      let word = "", skipped = [""], cur = null;
      let history2 = /* @__PURE__ */ new Map();
      for (; ; ) {
        let next, char, from = cur ? cur.pos : start;
        if (visually) {
          next = this.moveVisually(from, cur ? cur.side : side, forward, skipped);
          char = skipped[0];
        } else {
          next = this.moveLogically(from, forward);
          char = next ? this.text.slice(Math.min(next.pos, from), Math.max(next.pos, from)) : "";
        }
        if (!next)
          break;
        if (/\p{L}|\p{N}/u.test(char)) {
          if (forward)
            word += char;
          else
            word = skipped[0] + word;
          history2.set(word.length, next);
        } else if (word) {
          break;
        }
        cur = next;
      }
      if (!word)
        return null;
      if (!Intl.Segmenter)
        return cur;
      let segments = [...new Intl.Segmenter(void 0, { granularity: "word" }).segment(word)];
      return history2.get(segments[forward ? 0 : segments.length - 1].segment.length) || cur;
    }
    visualSide(start) {
      let pos, side;
      if (start) {
        let span = this.order[0];
        [pos, side] = span.ltr == this.ltr ? [span.from, 1] : [span.to, -1];
      } else {
        let span = this.order[this.order.length - 1];
        [pos, side] = span.ltr == this.ltr ? [span.to, -1] : [span.from, 1];
      }
      return { pos: this.fromIndex(pos), side };
    }
    moveLogically(start, forward) {
      let index = this.toIndex(start);
      let next = findClusterBreak(this.text, index, forward);
      return next == index ? null : { pos: this.fromIndex(next), side: 1 };
    }
  };
  var SelectionType = class {
    tag;
    cls;
    toJSON;
    fromJSON;
    constructor(tag, cls, toJSON, fromJSON) {
      this.tag = tag;
      this.cls = cls;
      this.toJSON = toJSON;
      this.fromJSON = fromJSON;
    }
  };
  var GardSelection = class _GardSelection {
    anchor;
    head;
    goalColumn;
    constructor(anchor, head, goalColumn) {
      this.anchor = anchor;
      this.head = head;
      this.goalColumn = goalColumn;
    }
    get from() {
      return Math.min(this.anchor, this.head);
    }
    get to() {
      return Math.max(this.anchor, this.head);
    }
    get empty() {
      return this.anchor == this.head;
    }
    get isCursor() {
      return this.empty && this instanceof _GardSelection.Text;
    }
    get ranges() {
      return [this];
    }
    get replacementRange() {
      return this;
    }
    get domSelection() {
      return this;
    }
    get headSide() {
      return this.head > this.anchor ? -1 : 1;
    }
    get anchorSide() {
      return this.anchor > this.head ? -1 : 1;
    }
    eqPos(other) {
      return this.anchor == other.anchor && this.head == other.head;
    }
    check(config, doc2) {
      if (!config.staticFacet(_GardSelection.selectionType).some((t) => this instanceof t.cls))
        throw new RangeError("Unsupported selection type");
      for (let { from, to } of this.ranges)
        if (from < 0 || to > doc2.length)
          throw new RangeError(`Selection out of document range`);
    }
    resolve(doc2) {
      return _GardSelection.Resolved.create(doc2, this);
    }
    toJSON(state) {
      let type = state.facet(_GardSelection.selectionType).find((tp) => this instanceof tp.cls);
      if (!type)
        throw new Error("Selection type not enabled in state given to GardSelection.toJSON");
      let result = type.toJSON(this);
      result.type = type.tag;
      return result;
    }
    static fromJSON(cx, json) {
      let { doc: doc2, config } = cx, tag = json.type;
      let types2 = config.staticFacet(_GardSelection.selectionType);
      let type = types2.find((tp) => tp.tag == tag);
      if (!type)
        throw new Error(`Unknown selection type '${tag}' in GardSelection.fromJSON`);
      return type.fromJSON(doc2, json);
    }
    static cursor(pos, side, goalColumn) {
      return _GardSelection.Text.createInner(pos, pos, side, goalColumn);
    }
    static range(anchor, head, headSide, goalColumn) {
      return _GardSelection.Text.createInner(anchor, head ?? anchor, headSide, goalColumn);
    }
    static node(pos, node, goalColumn) {
      return _GardSelection.Node.create(pos, node, goalColumn);
    }
    nextNormalCursor(cx, forward = true) {
      let found = scanNormalFrom(cx, this.head, this.headSide, forward, true);
      return found && _GardSelection.cursor(found.pos, found.side);
    }
    normalCursorAtBound(cx, forward = true) {
      let found = scanNormalFrom(cx, forward ? this.to : this.from, forward ? -1 : 1, forward, false);
      return found && _GardSelection.cursor(found.pos, found.side);
    }
    skipWord(cx, forward = true) {
      let found = skipWord(cx, this.head, this.headSide, forward);
      return found && _GardSelection.cursor(found.pos, found.side);
    }
    static near(cx, pos, bias = 1) {
      let norm = scanNormalFrom(cx, pos, bias, bias > 0, false) ?? scanNormalFrom(cx, pos, -bias, bias < 0, false) ?? { pos, side: -1 };
      return _GardSelection.cursor(norm.pos, norm.side);
    }
    static atStart(cx, block) {
      return cursorAtStart(cx, block);
    }
    static atEnd(cx, block) {
      let found = block ? TextblockMap.get(cx, block.start, block.node).visualSide(false) : cx.doc.inlineContent ? TextblockMap.get(cx, 0, cx.doc).visualSide(false) : scanNormalFrom(cx, cx.doc.length, -1, false, false) ?? { pos: cx.doc.length, side: -1 };
      return _GardSelection.cursor(found.pos, found.side);
    }
  };
  GardSelection = /* @__PURE__ */ (function(GardSelection2) {
    function define(tag, cls, toJSON, fromJSON) {
      return GardSelection2.selectionType.of(new SelectionType(tag, cls, toJSON, fromJSON));
    }
    GardSelection2.define = define;
    class Text extends GardSelection2 {
      _headSide;
      marks;
      constructor(anchor, head, _headSide, goalColumn, marks) {
        super(anchor, head, goalColumn);
        this._headSide = _headSide;
        this.marks = marks;
      }
      static createInner(anchor, head, side, goalColumn, marks) {
        return new Text(anchor, head, side ?? (head > anchor ? -1 : 1), goalColumn, marks);
      }
      get headSide() {
        return this._headSide;
      }
      get anchorSide() {
        return this.anchor == this.head ? this._headSide : super.anchorSide;
      }
      static create(spec) {
        let { anchor, head = anchor } = spec;
        return Text.createInner(anchor, head, spec.headSide, spec.goalColumn, spec.marks);
      }
      map(change, cx, assoc = -1) {
        let from, to;
        if (this.empty) {
          from = to = change.mapPos(this.from, assoc);
        } else {
          from = change.mapPos(this.from, 1);
          to = Math.max(from, change.mapPos(this.to, -1));
        }
        return Text.createInner(from, to, this.headSide, this.goalColumn, this.marks);
      }
      eq(other) {
        return other instanceof Text && this.eqPos(other) && this.headSide == other.headSide && (this.marks == other.marks || !!(this.marks && other.marks && this.marks.length == other.marks.length && this.marks.every((p, i) => p.eq(other.marks[i]))));
      }
    }
    GardSelection2.Text = Text;
    (function(Text2) {
      Text2.type = new SelectionType("text", Text2, ((sel) => {
        let result = { anchor: sel.anchor };
        if (sel.headSide != (sel.head > sel.anchor ? -1 : 1))
          result.side = sel.headSide;
        if (!sel.empty)
          result.head = sel.head;
        if (sel.marks) {
          result.marks = {};
          for (let mark of sel.marks)
            result.marks[mark.name] = mark.value;
        }
        return result;
      }), ((doc2, json) => {
        if (!json || typeof json.anchor != "number")
          throw new ValidationError("Invalid JSON representation for GardSelection.Text");
        let anchor = json.anchor, head = typeof json.head == "number" ? json.head : anchor;
        let marks = json.marks ? doc2.schema.marksFromJSON(json.marks) : void 0;
        return Text2.createInner(anchor, head, json.side == 1 || json.side == -1 ? json.side : void 0, void 0, marks);
      }));
    })(Text = GardSelection2.Text || (GardSelection2.Text = {}));
    class Node2 extends GardSelection2 {
      node;
      constructor(from, to, node, goalColumn) {
        super(from, to, goalColumn);
        this.node = node;
      }
      static create(pos, node, goalColumn) {
        return new Node2(pos, pos + node.length, node, goalColumn);
      }
      map(change, cx, assoc = -1) {
        let newPos = change.mapPos(this.anchor, 1, "after");
        if (newPos == null)
          return GardSelection2.near(cx, change.mapPos(this.anchor, assoc), assoc);
        return Node2.create(newPos, cx.doc.nodeAt(newPos));
      }
      eq(other) {
        return other instanceof Node2 && other.anchor == this.anchor;
      }
    }
    GardSelection2.Node = Node2;
    (function(Node3) {
      Node3.type = new SelectionType("node", Node3, (sel) => ({ pos: sel.anchor }), (doc2, json) => {
        let node = json && typeof json.pos == "number" && doc2.nodeAt(json.pos);
        if (!node || node.isText || !node.type.isSelectable)
          throw new ValidationError("Invalid GardSelection.Node JSON representation");
        return Node3.create(json.pos, node);
      });
    })(Node2 = GardSelection2.Node || (GardSelection2.Node = {}));
    class Resolved {
      doc;
      selection;
      anchor;
      head;
      _ranges = null;
      constructor(doc2, selection) {
        this.doc = doc2;
        this.selection = selection;
        this.anchor = doc2.resolve(selection.anchor);
        this.head = selection.empty ? this.anchor : doc2.resolve(selection.head);
      }
      static create(doc2, selection) {
        return new Resolved(doc2, selection);
      }
      get from() {
        return this.anchor.pos < this.head.pos ? this.anchor : this.head;
      }
      get to() {
        return this.anchor.pos > this.head.pos ? this.anchor : this.head;
      }
      get ranges() {
        return this._ranges || (this._ranges = this.resolveRanges());
      }
      resolveRanges() {
        return this.selection.ranges.map(({ from, to }) => ({ from: this.doc.resolve(from), to: this.doc.resolve(to) }));
      }
      get replacementRange() {
        let repl = this.selection.replacementRange;
        if (repl.from == this.selection.from && repl.to == this.selection.to)
          return this;
        return { from: this.doc.resolve(repl.from), to: this.doc.resolve(repl.to) };
      }
      get activeMarks() {
        let repl = this.replacementRange;
        return this.selection instanceof GardSelection2.Text && this.selection.marks || repl.from.marks(repl.to);
      }
    }
    GardSelection2.Resolved = Resolved;
    ;
    return GardSelection2;
  })(GardSelection);
  function cursorAtStart(cx, block) {
    let found = block ? TextblockMap.get(cx, block.start, block.node).visualSide(true) : cx.doc.inlineContent ? TextblockMap.get(cx, 0, cx.doc).visualSide(true) : scanNormalFrom(cx, 0, 1, true, false) ?? { pos: 0, side: 1 };
    return GardSelection.cursor(found.pos, found.side);
  }
  function isBarrier(cx, node) {
    if (node.isLeaf)
      return node.type.isBlock;
    let override = node.type.spec.cursorBarrier;
    if (override != null)
      return override;
    return node.type.isolating || node.type.preserveWhitespace || node.type.isBlock && cx.config.isAtom(node.type);
  }
  function scanNormalFrom(cx, from, side, forward, mustMove) {
    let pos = cx.doc.resolve(from), pastBarrier = false;
    if (pos.parent.node.inlineContent) {
      if (!mustMove)
        return { pos: pos.pos, side };
      let block = pos.textblockParent;
      let map = TextblockMap.get(cx, block.start, block.node);
      let next = cx.config.visualCursorMotion ? map.moveVisually(pos.pos, side, forward) : map.moveLogically(pos.pos, forward);
      if (next != null)
        return next;
      if (!block.parent)
        return null;
      pos = Pos.create(block.parent, forward ? block.after : block.before, block.index + (forward ? 1 : 0), 0);
      pastBarrier = isBarrier(cx, block.node);
    } else {
      pastBarrier = !pos.parent.parent && pos.index == (forward ? 0 : pos.parent.node.content.length);
      for (let { parent: { node }, index } = pos; !pastBarrier && (forward ? index : index < node.content.length); ) {
        let next = node.content[forward ? index - 1 : index];
        if (isBarrier(cx, next))
          pastBarrier = true;
        if (next.isLeaf) {
          index += forward ? 1 : -1;
        } else {
          if (next.inlineContent)
            break;
          node = next;
          index = forward ? next.content.length : 0;
        }
      }
    }
    let bottom = pos.pos, step = forward ? 1 : -1;
    for (let { parent, index } = pos, p = pos.pos; ; ) {
      let { node, parent: next } = parent;
      if (node.inlineContent) {
        if (cx.config.visualCursorMotion)
          return TextblockMap.get(cx, parent.start, parent.node).visualSide(forward);
        return { pos: p, side: forward ? 1 : -1 };
      }
      if (index == (forward ? node.content.length : 0)) {
        let barrier = !next || isBarrier(cx, node);
        if ((bottom != from || !mustMove) && pastBarrier && barrier)
          return { pos: bottom, side: forward ? -1 : 1 };
        if (!next)
          return null;
        index = parent.index + (forward ? 1 : 0);
        parent = next;
        p += step;
        bottom = p;
        if (barrier)
          pastBarrier = true;
      } else {
        let nextNode = node.content[index - (forward ? 0 : 1)];
        let barrier = isBarrier(cx, nextNode);
        if (pastBarrier && (bottom != from || !mustMove) && barrier)
          return { pos: bottom, side: forward ? -1 : 1 };
        if (nextNode.isLeaf || cx.config.isAtom(nextNode.type)) {
          index += step;
          p += nextNode.length * step;
        } else {
          if (!forward)
            index--;
          parent = Pos.Plot.create(parent, nextNode, forward ? p : p - nextNode.length, index);
          p += step;
          index = forward ? 0 : nextNode.content.length;
        }
        if (barrier) {
          pastBarrier = true;
          bottom = p;
        }
      }
    }
  }
  function skipWord(cx, start, side, forward) {
    let last = null;
    for (let pos = start, visually = cx.config.visualCursorMotion; ; ) {
      let block = cx.doc.resolve(pos).textblockParent;
      if (!block) {
        let next = scanNormalFrom(cx, pos, side, forward, true);
        if (!next)
          return last;
        ({ pos, side } = next);
      } else {
        let map = TextblockMap.get(cx, block.start, block.node);
        let next = map.skipWord(pos, side, forward, visually);
        if (next)
          return next;
        if (!block.parent)
          return last;
        let end = visually ? map.visualSide(!forward) : forward ? { pos: block.end, side: -1 } : { pos: block.start, side: 1 };
        if (end.pos != start)
          last = end;
        pos = forward ? block.after : block.before;
      }
    }
  }
  function wordAt(state, pos, bias) {
    let res = state.doc.resolve(pos);
    if (!res.parent.node.inlineContent)
      return GardSelection.cursor(pos, bias);
    let start = pos, end = pos, text = "";
    scanBack: for (let i = res.index - (res.inText ? 0 : 1), cur = res.nodeBefore; cur; ) {
      if (!cur.is(Leaf.Text))
        break;
      for (let j = cur.length; j > 0; ) {
        let next = findClusterBreak(cur.param, j, false);
        let ch = cur.param.slice(next, j);
        if (!/\p{L}|\p{N}/u.test(ch))
          break scanBack;
        text = ch + text;
        start -= j - next;
        j = next;
      }
      if (!i)
        break;
      cur = res.parent.node.content[--i];
    }
    scanForward: for (let i = res.index + 1, cur = res.nodeAfter; cur; ) {
      if (!cur.is(Leaf.Text))
        break;
      for (let j = 0; j < cur.length; ) {
        let next = findClusterBreak(cur.param, j, true);
        let ch = cur.param.slice(j, next);
        if (!/\p{L}|\p{N}/u.test(ch))
          break scanForward;
        text += ch;
        end += next - j;
        j = next;
      }
      if (i == res.parent.node.content.length)
        break;
      cur = res.parent.node.content[i++];
    }
    if (!Intl.Segmenter)
      return GardSelection.range(start, end);
    let best = null, local = pos - start;
    for (let segment of new Intl.Segmenter(void 0, { granularity: "word" }).segment(text)) {
      if (segment.isWordLike && segment.index <= local && segment.index + segment.segment.length >= local && (!best || bias > 0))
        best = segment;
    }
    return best ? GardSelection.range(start + best.index, start + best.index + best.segment.length) : GardSelection.cursor(pos, bias);
  }
  var Transaction = class _Transaction {
    startState;
    changes;
    selection;
    effects;
    annotations;
    scrollIntoView;
    _state = null;
    constructor(startState, changes, selection, effects, annotations, scrollIntoView2) {
      this.startState = startState;
      this.changes = changes;
      this.selection = selection;
      this.effects = effects;
      this.annotations = annotations;
      this.scrollIntoView = scrollIntoView2;
      if (!annotations.some((a) => a.type == _Transaction.time))
        this.annotations = annotations.concat(_Transaction.time.of(Date.now()));
      this.newDoc = this.changes.apply(this.startState.doc);
      this.newSelection = selection || startState.selection.map(changes, { doc: this.newDoc, config: this.startState.config });
      this.newSelection.check(startState.config, this.newDoc);
    }
    newSelection;
    newDoc;
    static create(startState, spec) {
      return new _Transaction(startState, spec.changes, spec.selection, spec.effects, spec.annotations, spec.scrollIntoView);
    }
    get state() {
      if (!this._state)
        this.startState.applyTransaction(this);
      return this._state;
    }
    annotation(type) {
      for (let ann of this.annotations)
        if (ann.type == type)
          return ann.value;
      return void 0;
    }
    get docChanged() {
      return !this.changes.empty;
    }
    get reconfigured() {
      return this.startState.config != this.state.config;
    }
    isUserEvent(event) {
      let e = this.annotation(_Transaction.userEvent);
      return !!(e && (e == event || e.length > event.length && e.startsWith(event) && e[event.length] == "."));
    }
  };
  Transaction = /* @__PURE__ */ (function(Transaction2) {
    function merge(state, a, b) {
      let rA = resolveTransactionInner(state, null, a);
      return mergeTransaction(state, rA, resolveTransactionInner(state, rA.changes, b));
    }
    Transaction2.merge = merge;
    function append(tr) {
      let result = [tr], top2 = tr.state;
      let appenders = tr.startState.facet(Transaction2.appender);
      if (!appenders.length)
        return result;
      for (let seen = appenders.map(() => 0); ; ) {
        let done = true;
        for (let i = 0; i < appenders.length; i++) {
          let from = seen[i];
          if (from < result.length) {
            let add2 = appenders[i](from ? result.slice(from) : result, top2);
            if (add2) {
              let tr2 = top2.update(Transaction2.merge(top2, add2, { annotations: Transaction2.appended.of(true) }));
              result.push(tr2);
              top2 = tr2.state;
              done = false;
            }
            seen[i] = result.length;
          }
        }
        if (done)
          return result;
      }
    }
    Transaction2.append = append;
    class Annotation {
      type;
      value;
      constructor(type, value) {
        this.type = type;
        this.value = value;
      }
      static define() {
        return new Transaction2.Annotation.Type();
      }
    }
    Transaction2.Annotation = Annotation;
    (function(Annotation2) {
      class Type {
        of(value) {
          return new Transaction2.Annotation(this, value);
        }
      }
      Annotation2.Type = Type;
    })(Annotation = Transaction2.Annotation || (Transaction2.Annotation = {}));
    Transaction2.time = Transaction2.Annotation.define();
    Transaction2.userEvent = Annotation.define();
    Transaction2.addToHistory = Annotation.define();
    Transaction2.remote = Annotation.define();
    Transaction2.appended = Annotation.define();
    class Effect {
      type;
      value;
      constructor(type, value) {
        this.type = type;
        this.value = value;
      }
      map(mapping) {
        let mapped = this.type.map(this.value, mapping);
        return mapped === void 0 ? void 0 : mapped == this.value ? this : new Transaction2.Effect(this.type, mapped);
      }
      is(type) {
        return this.type == type;
      }
      static define(spec = {}) {
        return new Transaction2.Effect.Type(spec.map || ((v) => v));
      }
    }
    Transaction2.Effect = Effect;
    (function(Effect2) {
      function mapEffects(effects, mapping) {
        if (!effects.length)
          return effects;
        let result = [];
        for (let effect of effects) {
          let mapped = effect.map(mapping);
          if (mapped)
            result.push(mapped);
        }
        return result;
      }
      Effect2.mapEffects = mapEffects;
      class Type {
        map;
        constructor(map) {
          this.map = map;
        }
        of(value) {
          return new Transaction2.Effect(this, value);
        }
      }
      Effect2.Type = Type;
    })(Effect = Transaction2.Effect || (Transaction2.Effect = {}));
    ;
    return Transaction2;
  })(Transaction);
  function selCx(config, doc2, changes) {
    let newDoc;
    return { get doc() {
      return newDoc || (newDoc = changes.apply(doc2));
    }, config };
  }
  function mergeTransaction(state, a, b) {
    let changes = a.changes.compose(b.changes);
    return {
      changes,
      selection: b.selection || a.selection && a.selection.map(b.changes, selCx(state.config, state.doc, changes)),
      effects: Transaction.Effect.mapEffects(a.effects, b.changes).concat(b.effects),
      annotations: a.annotations.length ? a.annotations.concat(b.annotations) : b.annotations,
      scrollIntoView: a.scrollIntoView || b.scrollIntoView
    };
  }
  function resolveTransactionInner(state, after, spec) {
    let { changes, sequential } = spec;
    if (after && after.empty)
      after = null;
    let doc2 = after && sequential ? after.apply(state.doc) : state.doc;
    if (!(changes instanceof ChangeSet))
      changes = ChangeSet.create(doc2, changes || []);
    let effects = asArray(spec.effects), annotations = asArray(spec.annotations);
    if (spec.userEvent)
      annotations = annotations.concat(Transaction.userEvent.of(spec.userEvent));
    let selection = !spec.selection ? void 0 : spec.selection instanceof GardSelection ? spec.selection : typeof spec.selection == "function" ? spec.selection({ doc: changes.apply(doc2), config: state.config }, changes) ?? void 0 : GardSelection.Text.create(spec.selection);
    if (after && !sequential) {
      if (selection) {
        let { a, b } = ChangeSet.transform(state.doc, after, changes);
        selection = selection.map(a, selCx(state.config, doc2, changes));
        changes = b;
      } else {
        changes = changes.transform(state.doc, after);
      }
      effects = Transaction.Effect.mapEffects(effects, after);
    }
    return { changes, selection, effects, annotations, scrollIntoView: !!spec.scrollIntoView };
  }
  function resolveTransaction(state, spec) {
    let s = resolveTransactionInner(state, null, spec);
    let extenders = state.facet(Transaction.extender), tr = Transaction.create(state, s);
    for (let i = extenders.length - 1; i >= 0; i--) {
      let extension = extenders[i](tr);
      if (extension) {
        s = mergeTransaction(state, s, resolveTransactionInner(state, tr.changes, extension));
        tr = Transaction.create(state, s);
      }
    }
    return tr;
  }
  var none$1 = [];
  function asArray(value) {
    return value == null ? none$1 : Array.isArray(value) ? value : [value];
  }
  var nextID = 0;
  var none2 = [];
  function readHTML(html) {
    if (typeof document != "object" || !document.implementation)
      throw new Error("Trying to parse an HTML string in a non-browser context.");
    let detachedDoc2 = document.implementation.createHTMLDocument("title");
    let trustedTypes = window.trustedTypes;
    if (trustedTypes) {
      html = trustedTypes.createPolicy("detachedDocument", { createHTML: (s) => s }).createHTML(html);
    }
    let elt = detachedDoc2.createElement("div");
    elt.innerHTML = html;
    return elt;
  }
  function readDoc(schema, doc2) {
    if (!doc2)
      return schema.doc(schema.docTag.type.canBeEmpty ? [] : [
        schema.createAndFill(schema.defaultContentTag(schema.docTag.type))
      ]);
    if (doc2 instanceof Plot.Doc)
      return doc2.schema == schema ? doc2 : schema.doc(doc2.content);
    if (typeof doc2 == "function")
      return doc2(schema);
    if (typeof doc2 == "string")
      doc2 = readHTML(doc2);
    let { nodeType } = doc2;
    if (nodeType === 1 || nodeType === 11)
      return parse(schema, doc2);
    return schema.docFromJSON(doc2);
  }
  var GardState = class _GardState {
    config;
    _doc;
    _selection;
    values;
    status;
    computeSlot;
    resolvedSel = null;
    trackAccess = null;
    static create(spec) {
      let config = spec.config instanceof _GardState.Configuration ? spec.config : _GardState.Configuration.resolve(spec.config || [], /* @__PURE__ */ new Map());
      let schema = config.schema;
      if (!schema) {
        if (spec.doc instanceof Plot.Doc)
          schema = spec.doc.schema;
        else
          throw new SchemaError(`No document plot provided, unable to create schema`);
      }
      let doc2 = readDoc(schema, spec.doc);
      let selection = !spec.selection ? cursorAtStart({ doc: doc2, config }) : typeof spec.selection == "function" ? spec.selection({ doc: doc2, config }) : spec.selection instanceof GardSelection ? spec.selection : GardSelection.Text.create(spec.selection);
      return _GardState.fromConfig(config, doc2, selection);
    }
    constructor(config, _doc, _selection, values, computeSlot, tr) {
      this.config = config;
      this._doc = _doc;
      this._selection = _selection;
      this.values = values;
      this.status = config.statusTemplate.slice();
      this.computeSlot = computeSlot;
      if (tr)
        tr._state = this;
      for (let i = 0; i < this.config.dynamicSlots.length; i++)
        ensureAddr(this, i << 1);
      this.computeSlot = null;
    }
    get doc() {
      if (this.trackAccess)
        addValue(this.trackAccess, "doc");
      return this._doc;
    }
    get schema() {
      if (this.trackAccess)
        addValue(this.trackAccess, "schema");
      return this._doc.schema;
    }
    get selection() {
      if (this.trackAccess)
        addValue(this.trackAccess, "selection");
      return this._selection;
    }
    get sel() {
      return this.resolvedSel || (this.resolvedSel = this.selection.resolve(this.doc));
    }
    field(field, require2 = true) {
      let addr = this.config.address[field.id];
      if (addr == null) {
        if (require2)
          throw new RangeError("Field is not present in this state");
        return void 0;
      }
      let track = this.trackAccess;
      if (track) {
        addValue(track, field);
        track = null;
      }
      ensureAddr(this, addr);
      if (track)
        this.trackAccess = track;
      return getAddr(this, addr);
    }
    facet(facet) {
      if (this.trackAccess)
        addValue(this.trackAccess, facet);
      let addr = this.config.address[facet.id];
      if (addr == null)
        return facet.default;
      ensureAddr(this, addr);
      return getAddr(this, addr);
    }
    update(spec) {
      return resolveTransaction(this, spec);
    }
    applyTransaction(tr) {
      let conf = this.config, { base, compartments } = conf;
      for (let effect of tr.effects) {
        if (effect.is(_GardState.Compartment.reconfigureCompartment)) {
          if (conf) {
            compartments = /* @__PURE__ */ new Map();
            conf.compartments.forEach((val, key) => compartments.set(key, val));
            conf = null;
          }
          compartments.set(effect.value.compartment, effect.value.extension);
        } else if (effect.is(_GardState.reconfigure)) {
          conf = null;
          base = effect.value;
        } else if (effect.is(_GardState.appendConfig)) {
          conf = null;
          base = asArray(base).concat(effect.value);
        }
      }
      let startValues, doc2 = tr.newDoc;
      if (!conf) {
        conf = _GardState.Configuration.resolve(base, compartments, this);
        let intermediateState = new _GardState(conf, this.doc, this.selection, conf.dynamicSlots.map(() => null), (state, slot) => slot.reconfigure(state, this), null);
        startValues = intermediateState.values;
        if (conf.staticFacet(_GardState.schemaElement) != this.facet(_GardState.schemaElement)) {
          let schema = conf.schema;
          if (schema)
            doc2 = schema.doc(doc2.content);
        }
      } else {
        startValues = tr.startState.values.slice();
      }
      new _GardState(conf, doc2, tr.newSelection, startValues, (state, slot) => slot.update(state, tr), tr);
    }
    recordAccess(slots, f) {
      let prev = this.trackAccess;
      this.trackAccess = slots;
      let result = f(this);
      this.trackAccess = prev;
      return result;
    }
    textblockMap(node) {
      return TextblockMap.get(this, node.start, node.node);
    }
    toJSON(fields) {
      let result = {
        doc: this.doc.toJSON(),
        selection: this.selection.toJSON(this)
      };
      if (fields)
        for (let prop in fields) {
          let value = fields[prop];
          if (value instanceof _GardState.Field && this.config.address[value.id] != null)
            result[prop] = value.spec.toJSON(this.field(fields[prop]), this);
        }
      return result;
    }
    static fromJSON(json, extensions, fields) {
      if (!json)
        throw new ValidationError("Invalid JSON representation for GardState");
      let fieldInit = [];
      if (fields)
        for (let prop in fields) {
          if (Object.prototype.hasOwnProperty.call(json, prop)) {
            let field = fields[prop], value = json[prop];
            fieldInit.push(field.init((state) => field.spec.fromJSON(value, state)));
          }
        }
      let config = _GardState.Configuration.create([extensions, fieldInit]);
      let schema = config.schema;
      if (!schema)
        throw new SchemaError("No document plot provided to GardState.fromJSON");
      let doc2 = schema.docFromJSON(json.doc);
      return _GardState.fromConfig(config, doc2, GardSelection.fromJSON({ config, doc: doc2 }, json.selection));
    }
    static fromConfig(config, doc2, selection) {
      selection.check(config, doc2);
      return new _GardState(config, doc2, selection, config.dynamicSlots.map(() => null), (state, slot) => slot.create(state), null);
    }
    get readOnly() {
      return this.facet(_GardState.readOnly);
    }
    get textLTR() {
      return this.config.textLTR;
    }
    textblockLTR(plot) {
      return this.config.textblockLTR(plot);
    }
    isAtom(type) {
      return this.config.isAtom(type);
    }
    wordAt(pos, bias = 1) {
      return wordAt(this, pos, bias);
    }
    static reconfigure = /* @__PURE__ */ Transaction.Effect.define();
    static appendConfig = /* @__PURE__ */ Transaction.Effect.define();
  };
  GardState = /* @__PURE__ */ (function(GardState2) {
    class Field {
      id;
      createF;
      updateF;
      compareF;
      spec;
      provides = void 0;
      constructor(id, createF, updateF, compareF, spec) {
        this.id = id;
        this.createF = createF;
        this.updateF = updateF;
        this.compareF = compareF;
        this.spec = spec;
      }
      static define(config) {
        let field = new GardState2.Field(nextID++, config.create, config.update, config.compare || ((a, b) => a === b), config);
        if (config.provide)
          field.provides = config.provide(field);
        return field;
      }
      create(state) {
        let init = state.facet(initField).find((i) => i.field == this);
        return (init?.create || this.createF)(state);
      }
      slot(addresses) {
        let idx = addresses[this.id] >> 1;
        return {
          create: (state) => {
            state.values[idx] = this.create(state);
            return 1;
          },
          update: (state, tr) => {
            let oldVal = state.values[idx];
            let value = this.updateF(oldVal, tr);
            if (this.compareF(oldVal, value))
              return 0;
            state.values[idx] = value;
            return 1;
          },
          reconfigure: (state, oldState) => {
            if (oldState.config.address[this.id] != null) {
              state.values[idx] = oldState.field(this);
              return 0;
            }
            state.values[idx] = this.create(state);
            return 1;
          }
        };
      }
      get extension() {
        return this;
      }
      init(create) {
        return [this, initField.of({ field: this, create })];
      }
    }
    GardState2.Field = Field;
    class Facet {
      combine;
      compareInput;
      compare;
      isStatic;
      id = nextID++;
      default;
      extensions;
      constructor(combine, compareInput, compare, isStatic, enables) {
        this.combine = combine;
        this.compareInput = compareInput;
        this.compare = compare;
        this.isStatic = isStatic;
        this.default = combine(none2);
        this.extensions = typeof enables == "function" ? enables(this) : enables;
      }
      get reader() {
        return this;
      }
      static define(config = {}) {
        return new GardState2.Facet(config.combine || ((a) => a), config.compareInput || ((a, b) => a === b), config.compare || (!config.combine ? sameArray : (a, b) => a === b), !!config.static, config.enables);
      }
      of(value) {
        return new FacetProvider(none2, this, 1, value);
      }
      compute(get) {
        if (this.isStatic)
          throw new Error("Can't compute a static facet");
        return new FacetProvider([], this, 4, get);
      }
      computeN(get) {
        if (this.isStatic)
          throw new Error("Can't compute a static facet");
        return new FacetProvider([], this, 2 | 4, get);
      }
      from(field, get) {
        if (this.isStatic)
          throw new Error("Can't compute a static facet");
        if (!get)
          get = (x) => x;
        return new FacetProvider([field], this, 0, (state) => get(state.field(field)));
      }
      tag;
    }
    GardState2.Facet = Facet;
    (function(Facet2) {
      function combineConfig(configs, defaults, combine = {}) {
        let result = {};
        for (let config of configs)
          for (let key of Object.keys(config)) {
            let value = config[key], current = result[key];
            if (current === void 0)
              result[key] = value;
            else if (current === value || value === void 0) ;
            else if (Object.hasOwnProperty.call(combine, key))
              result[key] = combine[key](current, value);
            else
              throw new Error("Config merge conflict for field " + key);
          }
        for (let key in defaults)
          if (result[key] === void 0)
            result[key] = defaults[key];
        return result;
      }
      Facet2.combineConfig = combineConfig;
    })(Facet = GardState2.Facet || (GardState2.Facet = {}));
    class Configuration {
      base;
      compartments;
      dynamicSlots;
      address;
      staticValues;
      facets;
      statusTemplate = [];
      constructor(base, compartments, dynamicSlots, address, staticValues, facets) {
        this.base = base;
        this.compartments = compartments;
        this.dynamicSlots = dynamicSlots;
        this.address = address;
        this.staticValues = staticValues;
        this.facets = facets;
        while (this.statusTemplate.length < dynamicSlots.length)
          this.statusTemplate.push(0);
      }
      staticFacet(facet) {
        if (!facet.isStatic)
          throw new Error("Only static facets can be accessed from a configuration");
        let addr = this.address[facet.id];
        return addr == null ? facet.default : this.staticValues[addr >> 1];
      }
      static resolve(base, compartments, oldState) {
        let fields = [];
        let facets = /* @__PURE__ */ Object.create(null);
        let newCompartments = /* @__PURE__ */ new Map();
        for (let ext of flatten(base, compartments, newCompartments)) {
          if (ext instanceof FacetProvider)
            (facets[ext.facet.id] || (facets[ext.facet.id] = [])).push(ext);
          else
            fields.push(ext);
        }
        let address = /* @__PURE__ */ Object.create(null);
        let staticValues = [];
        let dynamicSlots = [];
        for (let field of fields) {
          address[field.id] = dynamicSlots.length << 1;
          dynamicSlots.push((a) => field.slot(a));
        }
        let oldFacets = oldState?.config.facets;
        for (let id in facets) {
          let providers = facets[id], facet = providers[0].facet;
          let oldProviders = oldFacets && oldFacets[id] || none2;
          if (providers.every((p) => p.flags & 1)) {
            address[facet.id] = staticValues.length << 1 | 1;
            if (sameArray(oldProviders, providers)) {
              staticValues.push(oldState.facet(facet));
            } else {
              let value = facet.combine(providers.map((p) => p.value));
              staticValues.push(oldState && facet.compare(value, oldState.facet(facet)) ? oldState.facet(facet) : value);
            }
          } else {
            for (let p of providers) {
              if (p.flags & 1) {
                address[p.id] = staticValues.length << 1 | 1;
                staticValues.push(p.value);
              } else {
                address[p.id] = dynamicSlots.length << 1;
                dynamicSlots.push((a) => p.dynamicSlot(a));
              }
            }
            address[facet.id] = dynamicSlots.length << 1;
            dynamicSlots.push((a) => dynamicFacetSlot(a, facet, providers));
          }
        }
        let dynamic = dynamicSlots.map((f) => f(address));
        return new GardState2.Configuration(base, newCompartments, dynamic, address, staticValues, facets);
      }
      static create(extensions) {
        return GardState2.Configuration.resolve(extensions, /* @__PURE__ */ new Map());
      }
      get schema() {
        let elts = this.staticFacet(GardState2.schemaElement);
        if (!elts.some((elt) => elt instanceof Plot.Type && elt.isDoc))
          return null;
        return Schema.define(elts);
      }
      get textLTR() {
        return this.staticFacet(GardState2.textLTR);
      }
      textblockLTR(plot) {
        for (let f of this.staticFacet(GardState2.textblockLTR)) {
          let result = f(plot);
          if (result != null)
            return result;
        }
        return this.textLTR;
      }
      get visualCursorMotion() {
        return this.staticFacet(GardState2.visualCursorMotion);
      }
      isAtom(type) {
        return type.isLeaf || (this.staticFacet(GardState2.isAtom).get(type) ?? type.isAtom);
      }
    }
    GardState2.Configuration = Configuration;
    function flatten(extension, compartments, newCompartments) {
      let result = [[], [], [], [], []];
      let seen = /* @__PURE__ */ new Map();
      function inner(ext, prec) {
        let known = seen.get(ext);
        if (known != null) {
          if (known <= prec)
            return;
          let found = result[known].indexOf(ext);
          if (found > -1)
            result[known].splice(found, 1);
          if (ext instanceof CompartmentInstance)
            newCompartments.delete(ext.compartment);
        }
        seen.set(ext, prec);
        if (Array.isArray(ext)) {
          for (let e of ext)
            inner(e, prec);
        } else if (ext instanceof CompartmentInstance) {
          if (newCompartments.has(ext.compartment))
            throw new RangeError(`Duplicate use of compartment in extensions`);
          let content = compartments.get(ext.compartment) || ext.inner;
          newCompartments.set(ext.compartment, content);
          inner(content, prec);
        } else if (ext instanceof PrecExtension) {
          inner(ext.inner, ext.prec);
        } else if (ext instanceof GardState2.Field) {
          result[prec].push(ext);
          if (ext.provides)
            inner(ext.provides, prec);
        } else if (ext instanceof FacetProvider) {
          result[prec].push(ext);
          if (ext.facet.extensions)
            inner(ext.facet.extensions, 2);
        } else {
          let content = ext.extension;
          if (!content)
            throw new Error(`Unrecognized extension value in extension set (${ext}). This sometimes happens because multiple instances of wordgard/state are loaded, breaking instanceof checks.`);
          inner(content, prec);
        }
      }
      inner(extension, 2);
      return result.reduce((a, b) => a.concat(b));
    }
    GardState2.prec = {
      highest: mkPrec(0),
      high: mkPrec(1),
      default: mkPrec(2),
      low: mkPrec(3),
      lowest: mkPrec(4)
    };
    class Compartment {
      constructor() {
      }
      static define() {
        return new Compartment();
      }
      of(ext) {
        return new CompartmentInstance(this, ext);
      }
      reconfigure(content) {
        return GardState2.Compartment.reconfigureCompartment.of({ compartment: this, extension: content });
      }
      get(state) {
        return state.config.compartments.get(this);
      }
      static reconfigureCompartment = Transaction.Effect.define();
    }
    GardState2.Compartment = Compartment;
    GardState2.schemaElement = GardState2.Facet.define({
      combine: (values) => values.reduce((set, elt) => set.concat(elt), none2),
      static: true
    });
    GardState2.readOnly = GardState2.Facet.define({
      combine: (values) => values.length ? values[0] : false
    });
    GardState2.textLTR = GardState2.Facet.define({
      combine: (values) => values.length ? values[0] : true,
      static: true
    });
    GardState2.textblockLTR = GardState2.Facet.define({
      static: true
    });
    GardState2.visualCursorMotion = GardState2.Facet.define({
      combine(values) {
        return !values.length ? true : values[0];
      },
      static: true
    });
    GardState2.isAtom = GardState2.Facet.define({
      static: true,
      combine(inputs) {
        let map = /* @__PURE__ */ new Map();
        for (let i = inputs.length - 1; i >= 0; i--)
          map.set(inputs[i][0], inputs[i][1]);
        return map;
      }
    });
    ;
    return GardState2;
  })(GardState);
  var initField = /* @__PURE__ */ GardState.Facet.define({ static: true });
  function addValue(set, value) {
    if (set.indexOf(value) < 0)
      set.push(value);
  }
  function mkPrec(value) {
    return (ext) => new PrecExtension(ext, value);
  }
  var PrecExtension = class {
    inner;
    prec;
    constructor(inner, prec) {
      this.inner = inner;
      this.prec = prec;
    }
    extension;
  };
  function sameArray(a, b) {
    return a == b || a.length == b.length && a.every((e, i) => e === b[i]);
  }
  var DependencySet = class {
    doc = false;
    sel = false;
    schema = false;
    addrs = [];
    count = 0;
    update(deps, addresses) {
      while (this.count < deps.length) {
        let dep = deps[this.count++];
        if (dep === "doc")
          this.doc = true;
        else if (dep === "selection")
          this.sel = true;
        else if (dep === "schema")
          this.schema = true;
        else if (((addresses[dep.id] ?? 1) & 1) == 0)
          this.addrs.push(addresses[dep.id]);
      }
    }
  };
  var FacetProvider = class {
    facet;
    flags;
    value;
    id = nextID++;
    extension;
    dependencies;
    constructor(dependencies, facet, flags, value) {
      this.facet = facet;
      this.flags = flags;
      this.value = value;
      this.dependencies = dependencies;
    }
    dynamicSlot(addresses) {
      let getter = this.value;
      let compare = this.facet.compareInput;
      let id = this.id, idx = addresses[id] >> 1;
      let multi = this.flags & 2;
      let dependencies = this.dependencies;
      let auto = this.flags & 4 ? dependencies : null;
      let depSet = new DependencySet();
      return {
        create(state) {
          state.values[idx] = state.recordAccess(auto, getter);
          return 1;
        },
        update(state, tr) {
          depSet.update(dependencies, addresses);
          if (depSet.doc && tr.docChanged || depSet.sel && (tr.docChanged || tr.selection) || depSet.schema && tr.startState.schema != state.schema || ensureAll(state, depSet.addrs)) {
            let newVal = state.recordAccess(auto, getter);
            if (multi ? !compareArray(newVal, state.values[idx], compare) : !compare(newVal, state.values[idx])) {
              state.values[idx] = newVal;
              return 1;
            }
          }
          return 0;
        },
        reconfigure(state, oldState) {
          let newVal, oldAddr = oldState.config.address[id];
          if (oldAddr != null) {
            let oldVal = getAddr(oldState, oldAddr);
            if (dependencies.every((dep) => {
              return dep instanceof GardState.Facet ? oldState.facet(dep) === state.facet(dep) : dep instanceof GardState.Field ? oldState.field(dep, false) == state.field(dep, false) : true;
            }) || (multi ? compareArray(newVal = getter(state), oldVal, compare) : compare(newVal = getter(state), oldVal))) {
              state.values[idx] = oldVal;
              return 0;
            }
          } else {
            newVal = state.recordAccess(auto, getter);
          }
          state.values[idx] = newVal;
          return 1;
        }
      };
    }
  };
  function compareArray(a, b, compare) {
    if (a.length != b.length)
      return false;
    for (let i = 0; i < a.length; i++)
      if (!compare(a[i], b[i]))
        return false;
    return true;
  }
  function ensureAll(state, addrs) {
    let changed = false;
    for (let addr of addrs)
      if (ensureAddr(state, addr) & 1)
        changed = true;
    return changed;
  }
  function dynamicFacetSlot(addresses, facet, providers) {
    let providerAddrs = providers.map((p) => addresses[p.id]);
    let dynamic = providerAddrs.filter((p) => !(p & 1));
    let idx = addresses[facet.id] >> 1;
    function get(state) {
      let values = [];
      for (let i = 0; i < providerAddrs.length; i++) {
        let value = getAddr(state, providerAddrs[i]);
        if (providers[i].flags & 2)
          for (let val of value)
            values.push(val);
        else
          values.push(value);
      }
      return facet.combine(values);
    }
    return {
      create(state) {
        for (let addr of providerAddrs)
          ensureAddr(state, addr);
        state.values[idx] = get(state);
        return 1;
      },
      update(state, tr) {
        if (!ensureAll(state, dynamic))
          return 0;
        let value = get(state);
        if (facet.compare(value, state.values[idx]))
          return 0;
        state.values[idx] = value;
        return 1;
      },
      reconfigure(state, oldState) {
        let depChanged = ensureAll(state, providerAddrs);
        let oldProviders = oldState.config.facets[facet.id], oldValue = oldState.facet(facet);
        if (oldProviders && !depChanged && sameArray(providers, oldProviders)) {
          state.values[idx] = oldValue;
          return 0;
        }
        let value = get(state);
        if (facet.compare(value, oldValue)) {
          state.values[idx] = oldValue;
          return 0;
        }
        state.values[idx] = value;
        return 1;
      }
    };
  }
  function ensureAddr(state, addr) {
    if (addr & 1)
      return 2;
    let idx = addr >> 1;
    let status2 = state.status[idx];
    if (status2 == 4)
      throw new Error("Cyclic dependency between fields and/or facets");
    if (status2 & 2)
      return status2;
    state.status[idx] = 4;
    let changed = state.computeSlot(state, state.config.dynamicSlots[idx]);
    return state.status[idx] = 2 | changed;
  }
  function getAddr(state, addr) {
    return addr & 1 ? state.config.staticValues[addr >> 1] : state.values[addr >> 1];
  }
  var CompartmentInstance = class {
    compartment;
    inner;
    constructor(compartment, inner) {
      this.compartment = compartment;
      this.inner = inner;
    }
    extension;
  };
  GardSelection = /* @__PURE__ */ ((GardSelection2) => {
    GardSelection2.selectionType = GardState.Facet.define({
      combine(values) {
        let types2 = [GardSelection2.Text.type, GardSelection2.Node.type, ...values];
        for (let i = 0; i < types2.length; i++)
          for (let j = i + 1; j < types2.length; j++) {
            if (types2[i].tag == types2[j].tag)
              throw new Error("Duplicate selection JSON tag: " + types2[i].tag);
          }
        return types2;
      },
      static: true
    });
    return GardSelection2;
  })(GardSelection);
  Transaction = /* @__PURE__ */ ((Transaction2) => {
    Transaction2.extender = GardState.Facet.define();
    return Transaction2;
  })(Transaction);
  Transaction = /* @__PURE__ */ ((Transaction2) => {
    Transaction2.appender = GardState.Facet.define();
    return Transaction2;
  })(Transaction);

  // node_modules/wordgard/dist/phrases.js
  var phraseOverride = /* @__PURE__ */ GardState.Facet.define({
    combine(records) {
      let map = /* @__PURE__ */ new Map();
      for (let i = records.length - 1; i >= 0; i--) {
        let { set, phrases: phrases2 } = records[i];
        let known = map.get(set);
        map.set(set, known ? { ...known, ...phrases2 } : phrases2);
      }
      return map;
    }
  });
  var PhraseSet = class _PhraseSet {
    phrases;
    constructor(phrases2) {
      this.phrases = phrases2;
    }
    get(state, tag, ...insert) {
      let override = state.facet(phraseOverride).get(this);
      let phrase = (override && override[tag]) ?? this.phrases[tag];
      if (insert.length)
        phrase = phrase.replace(/\$(\$|\d*)/g, (m, i) => {
          if (i == "$")
            return "$";
          let n = +(i || 1);
          return !n || n > insert.length ? m : insert[n - 1];
        });
      return phrase;
    }
    ref(tag) {
      return (state, ...insert) => this.get(state, tag, ...insert);
    }
    translate(phrases2) {
      return phraseOverride.of({ set: this, phrases: phrases2 });
    }
    translatePartial(phrases2) {
      return phraseOverride.of({ set: this, phrases: phrases2 });
    }
    static define(phrases2) {
      return new _PhraseSet(phrases2);
    }
    static didChange(a, b) {
      return a.facet(phraseOverride) != b.facet(phraseOverride);
    }
  };
  var phrases = /* @__PURE__ */ PhraseSet.define({
    dialog_close: "close",
    overflow_more: "More",
    block_style: "Block style",
    toggle_strong: "Toggle strong emphasis",
    toggle_em: "Toggle emphasis",
    toggle_code: "Toggle code font",
    toggle_underline: "Toggle underline",
    toggle_strikethrough: "Toggle strikethrough",
    toggle_super: "Toggle superscript",
    toggle_sub: "Toggle subscript",
    link_target: "Link target",
    create_link: "Create link",
    text_color: "Text color",
    background_color: "Background color",
    undo: "Undo",
    redo: "Redo",
    paragraph: "Paragraph",
    code_block: "Code block",
    heading_1: "Heading 1",
    heading_2: "Heading 2",
    heading_3: "Heading 3",
    toggle_bullet_list: "Toggle bullet list",
    toggle_ordered_list: "Toggle ordered list",
    toggle_quote: "Toggle blockquote",
    alignment: "Alignment",
    align_start: "Align text to block start",
    align_end: "Align text to block end",
    align_center: "Center text",
    text_dir: "Text direction",
    text_dir_ltr: "Left-to-right text",
    text_dir_rtl: "Right-to-left text",
    text_dir_auto: "Automatic text direction"
  });
  var imagePhrases = /* @__PURE__ */ PhraseSet.define({
    insert_image: "Insert image",
    update_image: "Update image",
    update: "Update",
    insert: "Insert",
    cancel: "Cancel",
    inline: "Inline",
    figure: "Figure",
    figure_center: "Centered figure",
    figure_end: "Figure aligned to end",
    captioned: "Captioned",
    image_style: "Image style",
    uploading: "Uploading...",
    upload_failed: "Image upload failed",
    width: "Width in pixels",
    upload_image: "Upload an image",
    image_source: "Image source",
    alt_text: "Alternative text",
    describe_image: "Describe the image",
    auto: "automatic"
  });
  var colorNames = /* @__PURE__ */ PhraseSet.define({
    none: "none",
    black: "black",
    white: "white",
    grey: "grey",
    red_berry: "red berry",
    red: "red",
    orange: "orange",
    yellow: "yellow",
    green: "green",
    cyan: "cyan",
    cornflower: "cornflower",
    blue: "blue",
    purple: "purple",
    magenta: "magenta",
    dark: "dark",
    darker: "darker",
    darkest: "very dark",
    light: "light",
    lighter: "lighter",
    lightest: "very light"
  });

  // node_modules/wordgard/dist/types.js
  var G = /* @__PURE__ */ (() => Node.Group)();
  var Paragraph = /* @__PURE__ */ (() => Plot.define("Paragraph", {
    inlineContent: true,
    group: G.Content,
    defaultBlock: true,
    shape: { element: "p" }
  }))();
  var Heading = /* @__PURE__ */ (() => Plot.Type.define("Heading", {
    defaultParam: 1,
    validate: (value) => {
      if (typeof value != "number" || Math.floor(value) != value || value < 1 || value > 6)
        throw new ValidationError(`Invalid heading level: ${value}`);
    },
    inlineContent: true,
    group: G.Content,
    shape: { structure: (level) => Elt.mk("h" + level, [0]), atom: false },
    defining: true,
    parseRules: [
      { selector: "h1", param: 1 },
      { selector: "h2", param: 2 },
      { selector: "h3", param: 3 },
      { selector: "h4", param: 4 },
      { selector: "h5", param: 5 },
      { selector: "h6", param: 6 }
    ]
  }))();
  var CodeBlock = /* @__PURE__ */ (() => Plot.define("CodeBlock", {
    inlineContent: true,
    group: G.Content,
    role: Node.Role.Code,
    shape: { element: "pre" }
  }))();
  var Blockquote = /* @__PURE__ */ (() => Plot.define("Blockquote", {
    blockContent: G.Content,
    group: G.Content,
    shape: { element: "blockquote" },
    autoJoin: true
  }))();
  var ListItem = /* @__PURE__ */ (() => Plot.define("ListItem", {
    blockContent: G.Content,
    shape: { element: "li" },
    defining: true
  }))();
  var InlineListItem = /* @__PURE__ */ Plot.define("ListItem", {
    inlineContent: true,
    shape: { element: "li" },
    defining: true
  });
  var OrderedList = /* @__PURE__ */ (() => Plot.Type.define("OrderedList", {
    defaultParam: 1,
    validate: "number",
    blockContent: [ListItem, InlineListItem],
    group: G.Content,
    role: Node.Role.List,
    defining: true,
    shape: {
      element: "ol",
      attributes: (start) => start == 1 ? {} : { start: String(start) },
      readElement: (elt) => Number(elt.getAttribute("start") || "1")
    },
    autoJoin: (_a, b) => b.param == 1
  }))();
  var BulletList = /* @__PURE__ */ (() => Plot.define("BulletList", {
    blockContent: [ListItem, InlineListItem],
    group: G.Content,
    role: Node.Role.List,
    defining: true,
    shape: { element: "ul" },
    autoJoin: true
  }))();
  var HorizontalRule = /* @__PURE__ */ (() => Leaf.define("HorizontalRule", {
    group: G.Content,
    shape: { element: "hr" },
    toText: () => "---",
    selectable: true
  }))();
  var LineBreak = /* @__PURE__ */ (() => Leaf.define("LineBreak", {
    inline: true,
    role: Node.Role.LineBreak,
    toText: () => "\n",
    shape: { element: "br" }
  }))();
  var Image = /* @__PURE__ */ Leaf.Type.define("Image", {
    inline: true,
    validate: "string",
    shape: { element: "img", attributes: (src) => ({ src }) },
    selectable: true,
    parseRules: [{
      selector: "img[src]",
      readElement: (elt) => elt.src
    }]
  });
  var Figure = /* @__PURE__ */ (() => Leaf.Type.define("Figure", {
    validate: "string",
    shape: { structure: (src) => Elt.mk("figure", [Elt.mk("img", { src })]) },
    selectable: true,
    group: G.Content,
    parseRules: [{
      selector: "figure:has(img[src])",
      marksFrom: "img[src]",
      readElement: (elt) => elt.querySelector("img[src]").src,
      precedence: 2
    }]
  }))();
  var CaptionedFigure = /* @__PURE__ */ (() => Plot.Type.define("CaptionedFigure", {
    inlineContent: true,
    validate: "string",
    shape: { structure: (src) => Elt.mk("figure", [Elt.mk("img", { src }), Elt.mk("figcaption", [0])]), atom: false },
    group: G.Content,
    parseRules: [{
      selector: "figure:has(img[src]):has(figcaption)",
      marksFrom: "img[src]",
      readElement: (elt) => elt.querySelector("img[src]").src,
      contentElement: "figcaption",
      precedence: 4
    }]
  }))();
  var ImageAlt = /* @__PURE__ */ Mark.Type.define("ImageAlt", {
    target: [Image, Figure, CaptionedFigure],
    validate: "string",
    shape: { attribute: "alt", value: 0, preferTarget: "img" }
  });
  var ImageSize = /* @__PURE__ */ Mark.Type.define("ImageSize", {
    target: [Image, Figure, CaptionedFigure],
    validate: "number",
    shape: { attribute: "style", value: (size) => `width: ${size}px`, preferTarget: "img" }
  });
  var Alignment = /* @__PURE__ */ (() => Mark.Type.define("Alignment", {
    target: [G.Textblock, Figure],
    keepOnSplit: true,
    keepOnTypeChange: true,
    shape: { attribute: "style", value: (align) => `text-align: ${align}` },
    parseRules: [
      { attribute: "style/text-align", readAttribute: (value) => /^(end|center)$/.test(value) ? value : parse.Reject }
    ]
  }))();
  var Direction = /* @__PURE__ */ (() => Mark.Type.define("Direction", {
    target: G.Textblock,
    keepOnSplit: true,
    keepOnTypeChange: true,
    validate: (val) => {
      if (val != "ltr" && val != "rtl" && val != "auto")
        throw new ValidationError(`Invalid direction value: ${val}`);
    },
    shape: { attribute: "dir", value: 0 }
  }))();
  var Emphasis = /* @__PURE__ */ Mark.define("Emphasis", {
    rank: 50,
    shape: { element: "em" },
    parseRules: [
      { attribute: "style/font-style", value: "italic" },
      { attribute: "style/font-style", value: "normal", clearMark: (p) => p.name == "Emphasis" }
    ]
  });
  var Strong = /* @__PURE__ */ Mark.define("Strong", {
    rank: 60,
    shape: { element: "strong" },
    parseRules: [
      {
        attribute: "style/font-weight",
        readAttribute: (value) => /^(bold(er)?|[5-9]\d{2,})$/.test(value) ? null : parse.Reject
      },
      {
        attribute: "style/font-weight",
        readAttribute: (value) => /^(normal|lighter|[1-4]\d{2})$/.test(value) ? null : parse.Reject,
        clearMark: (p) => p.name == "Strong"
      }
    ]
  });
  var Underline = /* @__PURE__ */ Mark.define("Underline", {
    rank: 40,
    shape: { element: "u" },
    parseRules: [
      { attribute: "style/text-decoration", value: "underline" }
    ]
  });
  var Strikethrough = /* @__PURE__ */ Mark.define("Strikethrough", {
    rank: 42,
    shape: { element: "s" },
    parseRules: [
      { attribute: "style/text-decoration", value: "line-through" }
    ]
  });
  var Superscript = /* @__PURE__ */ Mark.define("Superscript", {
    rank: 45,
    shape: { element: "sup" }
  });
  var Subscript = /* @__PURE__ */ Mark.define("Subscript", {
    rank: 47,
    shape: { element: "sub" }
  });
  var Link = /* @__PURE__ */ Mark.Type.define("Link", {
    rank: 20,
    validate: "string",
    inclusive: false,
    shape: {
      element: "a",
      preferTarget: "a[href]",
      attributes: (href) => ({ href }),
      readElement: (dom) => dom.href
    }
  });
  var Code = /* @__PURE__ */ Mark.define("Code", {
    rank: 80,
    shape: { element: "code" }
  });
  var Color = /* @__PURE__ */ Mark.Type.define("Color", {
    rank: 30,
    shape: { attribute: "style/color", value: 0 },
    spanning: true
  });
  var BackgroundColor = /* @__PURE__ */ Mark.Type.define("BackgroundColor", {
    rank: 35,
    shape: { attribute: "style/background-color", value: 0 },
    spanning: true
  });
  var Doc = /* @__PURE__ */ (() => Plot.defineDoc({
    blockContent: G.Content
  }))();

  // node_modules/wordgard/dist/command.js
  var commandHandler = /* @__PURE__ */ GardState.Facet.define({
    combine(handlers) {
      let map = /* @__PURE__ */ new Map();
      for (let [cmd, handler] of handlers) {
        let list = map.get(cmd);
        if (!list)
          map.set(cmd, list = []);
        list.push(handler);
      }
      return map;
    }
  });
  var Command = /* @__PURE__ */ (function(Command2) {
    function handler(command, handler2) {
      return commandHandler.of([command, handler2]);
    }
    Command2.handler = handler;
    function bind2(command, param) {
      return { command, param };
    }
    Command2.bind = bind2;
    function dispatch(wg, command, p) {
      let { command: cmd, param } = typeof command == "object" ? command : { command, param: p ?? null };
      let handlers = wg.state.facet(commandHandler).get(cmd);
      if (handlers)
        for (let handler2 of handlers) {
          let result2 = handler2(wg, param);
          if (result2) {
            if (typeof result2 != "boolean")
              wg.dispatch(result2);
            return true;
          }
        }
      let result = cmd(wg, param);
      if (typeof result != "boolean")
        wg.dispatch(result);
      return !!result;
    }
    Command2.dispatch = dispatch;
    ;
    return Command2;
  })({});
  function liftEmptyBlock(state) {
    if (!state.selection.isCursor)
      return false;
    let sel = state.sel, block = sel.head.textblockParent;
    if (!block || !sel.head.isAtStart(block) || !sel.head.isAtEnd(block))
      return false;
    let start = block.before, end = block.after, before = [], after = [];
    for (let level = block.parent, index = block.index, atStart = true, atEnd = true, first = true; level; first = false, index = level.index, level = level.parent) {
      if (!first && state.schema.canContain(level.node.type, block.node.type))
        return {
          changes: [
            { from: start, to: block.before, insert: before },
            { from: block.after, to: end, insert: after }
          ],
          scrollIntoView: true,
          userEvent: "unwrap.empty"
        };
      if (level.node.type.isInline || level.node.type.isolating)
        break;
      if (index)
        atStart = false;
      if (atStart)
        start--;
      else
        before.push(Plot.End);
      if (index < level.node.content.length - 1)
        atEnd = false;
      if (atEnd)
        end++;
      else
        after.unshift(level.node.tag.split(false));
    }
    return false;
  }
  function splitTextblock(state, splitListItem = true) {
    let { from, to } = state.sel.replacementRange, { schema } = state.doc;
    let before = from.textblockParent;
    if (!before || !before.parent)
      return false;
    let tokens = [];
    for (let p = from.parent; ; p = p.parent) {
      tokens.push(Plot.End);
      if (p == before)
        break;
    }
    if (splitListItem && !before.parent.node.type.hasRole(Node.Role.List) && before.isFirst && before.parent.parent?.node.type.hasRole(Node.Role.List))
      tokens.push(Plot.End, before.parent.node.tag.split(false));
    let after = to.textblockParent;
    if (after) {
      let atEnd = true, insert = tokens.length;
      for (let p = to.parent, index = to.index; ; index = p.index + 1, p = p.parent) {
        if (index < p.node.content.length)
          atEnd = false;
        let tag = p.node.tag.split(atEnd), nextTag = atEnd && !p.node.type.spec.preserveOnSplitAtEnd ? null : tag;
        if (!nextTag || !schema.canContain(p.parent.node.type, tag.type)) {
          if (!atEnd)
            return false;
          let defaultType = schema.defaultContentPlot(p.parent.node.type);
          if (defaultType)
            tag = schema.withMarksFrom(tag, defaultType);
          else
            return false;
        }
        tokens.splice(insert, 0, tag);
        if (p == after)
          break;
      }
    }
    let changes = [{
      from: from.pos,
      to: to.pos,
      insert: tokens
    }];
    if (from.isAtStart(before)) {
      let deflt = schema.defaultContentPlot(before.parent.node.type);
      if (deflt && !deflt.eq(before.node.tag))
        changes.unshift({
          from: before.before,
          to: before.start,
          insert: [schema.withMarksFrom(before.node.tag, deflt)]
        });
    }
    let changeSet = ChangeSet.create(state.doc, { correct: changes, local: true });
    return {
      changes: changeSet,
      selection: GardSelection.cursor(changeSet.mapPos(to.pos, 1)),
      scrollIntoView: true,
      userEvent: "split.textblock"
    };
  }
  function deleteSelection(state) {
    let { ranges } = state.selection;
    if (ranges.every((r) => r.from == r.to))
      return false;
    return autoJoinBlocks(state, {
      changes: {
        correct: ranges.filter((r) => r.from < r.to).map((r) => ({ from: r.from, to: r.to, fit: true })),
        local: true
      },
      selection: (cx, changes) => state.selection instanceof GardSelection.Text ? GardSelection.near(cx, changes.mapPos(state.selection.head, -1), 1) : state.selection.map(changes, cx),
      scrollIntoView: true,
      userEvent: "delete.selection"
    });
  }
  function deleteEmptyTextblock(state, dir = -1) {
    if (!state.selection.isCursor)
      return false;
    let block = state.sel.head.textblockParent;
    if (!block || block.start < block.end || block.before == 0 && block.after == state.doc.length)
      return false;
    return {
      changes: { from: block.before, to: block.after, fit: true },
      selection: (cx, changes) => GardSelection.near(cx, changes.mapPos(state.selection.head), dir),
      scrollIntoView: true,
      userEvent: dir < 0 ? "delete.backward" : "delete.forward"
    };
  }
  function joinBackward(state) {
    if (!state.selection.isCursor)
      return false;
    let { head } = state.sel, block = head.textblockParent;
    if (!block || !head.isAtStart(block))
      return false;
    let scan = block, target = scan.node;
    while (!scan.index) {
      if (!scan.parent)
        return false;
      scan = scan.parent;
      if (scan.node.type.isolating || !scan.node.type.isBlock)
        return false;
    }
    let before = scan.previousSibling, parent = scan.parent.node, pos = scan.start - 1;
    while (before.isLeaf || !before.isTextblock) {
      if (before.isLeaf || state.isAtom(before.type) || before.type.isolating || !before.type.isBlock)
        return false;
      let last = before.content.length - 1;
      if (last < 0)
        return false;
      parent = before;
      before = before.content[last];
      pos--;
    }
    let { schema } = state.doc;
    let changes = [
      joinBlocks(state.doc.resolve(pos - 1).parent, block),
      clearNonFitting(schema, block, before.type)
    ];
    if (!before.content.length && !before.tag.eq(target.tag) && schema.canContain(parent.type, target.type))
      changes.push({
        from: pos - before.length,
        to: pos - before.length + 1,
        insert: [schema.withMarksFrom(before.tag, target.tag)]
      });
    let changeSet = ChangeSet.create(state.doc, changes);
    return {
      changes: changeSet,
      selection: GardSelection.cursor(changeSet.mapPos(head.pos), -1),
      scrollIntoView: true,
      userEvent: "join.backward"
    };
  }
  function joinListItems(state) {
    if (!state.selection.isCursor)
      return false;
    let { head } = state.sel;
    if (head.index || head.inText)
      return false;
    for (let scan = head.parent; ; ) {
      let next = scan.parent;
      if (!next)
        return false;
      if (scan.node.type.isBlock && next.node.type.hasRole(Node.Role.List)) {
        const prev = scan.previousSibling;
        if (!prev || !prev.isLeaf && scan.node.content.some((ch) => !state.schema.canContain(prev.type, ch.type)))
          return false;
        return {
          changes: { from: scan.before - 1, to: scan.before + 1 },
          userEvent: "join.backward.list",
          scrollIntoView: true
        };
      }
      if (scan.index)
        return false;
      scan = next;
    }
  }
  function joinForward(state) {
    if (!state.selection.isCursor)
      return false;
    let { head } = state.sel, block = head.textblockParent;
    if (!block || !head.isAtEnd(block))
      return false;
    let scan = block, target = scan.node;
    for (; ; ) {
      if (!scan.parent)
        return false;
      if (scan.index < scan.parent.node.content.length - 1)
        break;
      scan = scan.parent;
      if (scan.node.type.isolating || !scan.node.type.isBlock)
        return false;
    }
    let after = scan.nextSibling, parent = scan.parent.node, pos = scan.after;
    while (after.isLeaf || !after.isTextblock) {
      if (after.isLeaf || after.type.isolating || state.isAtom(after.type) || !after.type.isBlock || !after.content.length)
        return false;
      parent = after;
      after = after.content[0];
      pos++;
    }
    let blockAfter = state.doc.resolveNode(pos);
    let { schema } = state.doc;
    let changes = [
      joinBlocks(block, blockAfter),
      clearNonFitting(schema, blockAfter, target.type)
    ];
    if (!target.content.length && !target.tag.eq(after.tag) && schema.canContain(parent.type, after.type))
      changes.push({
        from: block.before,
        to: block.start,
        insert: [schema.withMarksFrom(target.tag, after.tag)]
      });
    return {
      changes,
      scrollIntoView: true,
      userEvent: "join.forward"
    };
  }
  function deleteBackward(state, word = false) {
    if (!state.selection.isCursor)
      return false;
    let sel = state.sel;
    let { parent: scan, index, pos } = sel.head;
    if (!sel.head.inText)
      while (!index) {
        if (scan.node.type.isolating || !scan.parent)
          return false;
        index = scan.index;
        scan = scan.parent;
        pos--;
      }
    let next = sel.head.inText ? sel.head.nodeBefore : scan.node.content[--index];
    for (; ; ) {
      if (next.isPlot && next.type.isolating)
        return false;
      if (next.isLeaf || state.isAtom(next.type))
        break;
      let last = next.content.length - 1;
      if (last < 0)
        return false;
      next = next.content[last];
      pos--;
    }
    if (next.is(Leaf.Text)) {
      let size = 0;
      if (word) {
        for (let i = next.param.length, type; ; ) {
          let ch = next.param[i - 1];
          if (/\s/.test(ch)) {
            if (type)
              break;
          } else {
            let next2 = /[\p{Alphabetic}\p{Number}]/u.test(ch) ? "a" : "p";
            if (!type)
              type = next2;
            else if (type != next2)
              break;
          }
          i--;
          size++;
          if (i == 0) {
            if (!index)
              break;
            next = scan.node.content[--index];
            if (!next.is(Leaf.Text))
              break;
            i = next.param.length;
          }
        }
      } else {
        size = next.length - findClusterBreak(next.param, next.length, false);
      }
      return {
        changes: { from: pos - size, to: pos },
        scrollIntoView: true,
        userEvent: "delete.backward"
      };
    }
    let from = pos - next.length, to = pos;
    let parent = state.doc.resolve(pos).parent;
    while (parent && parent.node.type.isBlock && parent.node.content.length == 1) {
      if (!parent.parent)
        return false;
      parent = parent.parent;
      from--;
      to++;
    }
    return {
      changes: { from, to },
      scrollIntoView: true,
      userEvent: "delete.backward"
    };
  }
  function deleteForward(state, word = false) {
    if (!state.selection.isCursor)
      return false;
    let sel = state.sel;
    let { parent: scan, index, pos } = sel.head;
    if (!sel.head.inText)
      while (index == scan.node.content.length) {
        if (scan.node.type.isolating || !scan.parent)
          return false;
        index = scan.index + 1;
        scan = scan.parent;
        pos++;
      }
    let next = sel.head.inText ? sel.head.nodeAfter : scan.node.content[index];
    for (; ; ) {
      if (next.isPlot && next.type.isolating)
        return false;
      if (next.isLeaf || state.isAtom(next.type))
        break;
      if (!next.content.length)
        return false;
      next = next.content[0];
      pos++;
    }
    if (next.is(Leaf.Text)) {
      let size = 0;
      if (word) {
        for (let i = 0, type; ; ) {
          let ch = next.param[i];
          if (/\s/.test(ch)) {
            if (type)
              break;
          } else {
            let next2 = /[\p{Alphabetic}\p{Number}]/u.test(ch) ? "a" : "p";
            if (!type)
              type = next2;
            else if (type != next2)
              break;
          }
          i++;
          size++;
          if (i == next.param.length) {
            if (index == scan.node.content.length - 1)
              break;
            next = scan.node.content[++index];
            if (!next.is(Leaf.Text))
              break;
            i = 0;
          }
        }
      } else {
        size = findClusterBreak(next.param, 0);
      }
      return {
        changes: { from: pos, to: pos + size },
        scrollIntoView: true,
        userEvent: "delete.forward"
      };
    }
    let from = pos, to = pos + next.length;
    let parent = state.doc.resolve(pos).parent;
    while (parent && parent.node.type.isBlock && parent.node.content.length == 1) {
      if (!parent.parent)
        return false;
      parent = parent.parent;
      from--;
      to++;
    }
    return {
      changes: { from, to },
      scrollIntoView: true,
      userEvent: "delete.forward"
    };
  }
  function selectedTextblocks(state) {
    let textblocks = [], lastBlock = -1;
    for (let { from, to } of state.selection.ranges) {
      state.doc.iterate(from, to, (node, pos, parent) => {
        if (node.isPlot && node.isTextblock && pos > lastBlock) {
          textblocks.push(state.doc.resolveNode(pos));
          lastBlock = pos;
        }
      });
    }
    return textblocks;
  }
  function clearNonFitting(schema, node, type) {
    let changes = [];
    for (let i = 0, pos = node.start; i < node.node.content.length; i++) {
      let child = node.node.content[i], end = pos + child.length;
      if (!schema.canContain(type, child.type))
        changes.push({ from: pos, to: end });
      pos = end;
    }
    return changes;
  }
  function findWrappable(from, to, wrapper) {
    let dFrom = from.depth, dTo = to.depth;
    let pFrom = from.parent, pTo = to.parent;
    while (dFrom > dTo) {
      pFrom = pFrom.parent;
      dFrom--;
    }
    while (dTo > dFrom) {
      pTo = pTo.parent;
      dTo--;
    }
    let { schema } = from.doc;
    for (; ; ) {
      if (!pFrom.parent || pFrom.node.type.isolating)
        return null;
      if (pFrom.parent.start == pTo.parent.start && schema.canContain(pFrom.parent.node.type, wrapper.type))
        break;
      pFrom = pFrom.parent;
      pTo = pTo.parent;
    }
    for (let i = pFrom.index; i < pTo.index + 1; i++) {
      let ch = pFrom.parent.node.content[i];
      if (!schema.findWrapping(wrapper.type, ch.type))
        return null;
    }
    return {
      from: Pos.create(pFrom.parent, pFrom.before, pFrom.index, 0),
      to: Pos.create(pFrom.parent, pTo.after, pTo.index + 1, 0)
    };
  }
  function wrapBlockRange(range, wrapper) {
    let changes = [], parent = range.from.parent.node;
    for (let i = range.from.index, openWrappers = 0, pos = range.from.pos; ; i++) {
      let tokens = [];
      for (let j = 0; j < openWrappers; j++)
        tokens.push(Plot.End);
      if (i == range.from.index) {
        tokens.push(wrapper);
      } else if (i == range.to.index) {
        tokens.push(Plot.End);
        changes.push({ from: pos, insert: tokens });
        break;
      }
      let child = parent.content[i];
      let { schema } = range.from.doc;
      let wrapping = schema.findWrapping(wrapper.type, child.type);
      for (let tag of wrapping)
        tokens.push(tag);
      openWrappers = wrapping.length;
      changes.push({ from: pos, insert: tokens });
      pos += child.length;
    }
    return changes;
  }
  function textblockChild(schema, type) {
    let wrap = schema.findWrapping(type, Leaf.Text);
    return wrap && wrap.length == 1 ? wrap[0] : null;
  }
  function findUnwrappable(schema, from, to, query) {
    let dFrom = from.depth, dTo = to.depth;
    let fromStart = from.parent.node.inlineContent ? from.parent.start : from.pos;
    let fromTextblock = from.textblockParent?.node.type;
    let toEnd = to.parent.node.inlineContent ? to.parent.end : to.pos;
    let innerCandidates = [];
    let outerCandidates = [];
    let { doc: doc2 } = from;
    doc2.iterate(fromStart, toEnd, (node, p, parent) => {
      if (node.type.isBlock && node.isPlot && !node.inlineContent && parent && (fromTextblock ? doc2.schema.canContain(parent.type, fromTextblock) : textblockChild(doc2.schema, parent.type)) && (!query || schema.matchNode(node.type, query))) {
        let pos = doc2.resolveNode(p), depth2 = pos.depth;
        if (pos.before >= fromStart - (dFrom - depth2 + 1) && pos.after <= toEnd + (dTo - depth2 + 1))
          innerCandidates.push(pos);
        else
          outerCandidates.push(pos);
      }
    });
    let candidates = innerCandidates.length ? innerCandidates.sort((a, b) => b.after - b.before - (a.after - a.before)) : outerCandidates.sort((a, b) => a.after - a.before - (b.after - b.before));
    if (!candidates.length)
      return null;
    for (let i = 1; i < candidates.length; i++) {
      let cur = candidates[i];
      for (let j = 0; j < i; j++) {
        let other = candidates[j];
        if (cur.after > other.before && cur.before < other.after) {
          candidates.splice(i--, 1);
          break;
        }
      }
    }
    return candidates;
  }
  function doUnwrapBlock(block, from, to) {
    let changes = [], { schema } = block.doc;
    let outer = block.parent.node, wrapText = textblockChild(schema, outer.type);
    let gapStart = block.before;
    let skippedDepth = 0;
    let replaceGap = (to2, tokens) => {
      for (let i = 0; i < skippedDepth; i++)
        tokens.unshift(Plot.End);
      skippedDepth = 0;
      if (to2 > gapStart || tokens.length)
        changes.push({ from: gapStart, to: to2, insert: tokens });
    };
    let parent = block, index = 0, pos = block.start;
    for (; ; ) {
      if (index == parent.node.content.length) {
        if (parent == block) {
          let tokens = [];
          if (gapStart == block.before && outer.content.length == 1) {
            let deflt = schema.createDefault(outer.type);
            if (deflt)
              tokens.push(deflt);
          }
          replaceGap(block.after, tokens);
          break;
        } else {
          if (gapStart == pos && skippedDepth > 0) {
            gapStart++;
            skippedDepth--;
          }
          pos++;
          index = parent.index + 1;
          parent = parent.parent;
        }
      } else {
        let next = parent.node.content[index];
        if (schema.canContain(outer.type, next.type) || wrapText && next.isPlot && next.inlineContent) {
          if (from != null && pos + next.length <= from) {
            pos += next.length;
            gapStart = pos;
            skippedDepth = 1;
            for (let cx = parent; cx != block; cx = cx.parent)
              skippedDepth++;
            index++;
          } else if (to != null && pos >= to) {
            let tokens = [], upto = pos;
            for (let cx = parent, i = tokens.length, atStart = !index; ; cx = cx.parent) {
              if (cx.index > 0)
                atStart = false;
              if (atStart)
                upto--;
              else
                tokens.splice(i, 0, cx.node.tag.split(false));
              if (cx == block)
                break;
            }
            replaceGap(upto, tokens);
            break;
          } else {
            if (schema.canContain(outer.type, next.type)) {
              replaceGap(pos, []);
            } else {
              replaceGap(pos + 1, [wrapText]);
              changes.push(clearNonFitting(schema, Pos.Plot.create(parent, next, pos, index), wrapText.type));
            }
            pos += next.length;
            index++;
            gapStart = pos;
          }
        } else if (next.isLeaf || next.type.isolating) {
          pos += next.length;
          index++;
        } else {
          parent = Pos.Plot.create(parent, next, pos, index);
          index = 0;
          pos++;
        }
      }
    }
    return changes;
  }
  function joinBlocks(before, after) {
    let changes = [{ from: before.end, to: after.start }];
    let dBefore = before.depth, dAfter = after.depth;
    let tokensAfter = [], posAfter = after.after, end = posAfter;
    if (dBefore > dAfter) {
      let extraContext = [];
      for (let i = dBefore - dAfter, level = before.parent; i > 0; i--, level = level.parent)
        extraContext.push(level.node.tag);
      let nodeAfter = after.nextSibling;
      for (let i = dBefore - dAfter - 1, joining = true; i >= 0; i--) {
        let context = extraContext[i];
        if (!joining || !nodeAfter || nodeAfter.isLeaf || nodeAfter.type != context.type || !context.type.spec.autoJoin || typeof context.type.spec.autoJoin == "function" && !context.type.spec.autoJoin(context, nodeAfter.tag))
          joining = false;
        if (joining)
          end++;
        else
          tokensAfter.push(Plot.End);
      }
    } else if (dAfter > dBefore) {
      for (let i = dAfter - dBefore, level = after, atEnd = true; i > 0; i--, level = level.parent) {
        if (level.nextSibling)
          atEnd = false;
        if (atEnd)
          end++;
        else
          tokensAfter.push(level.parent.node.tag);
      }
    }
    if (tokensAfter.length || end > posAfter)
      changes.push({ from: posAfter, to: end, insert: tokensAfter });
    return changes;
  }
  function canAddMarkInRange(doc2, from, to, mark) {
    let found = false, type = mark instanceof Mark.Type ? mark : mark.type;
    doc2.iterate(from, to, (node) => {
      if (found || mark.isInSet(node.tag.marks))
        return false;
      if (doc2.schema.markAllowed(type, node.type))
        found = true;
      return true;
    });
    return found;
  }
  function autoJoinBlocks(state, tr) {
    if (!tr.changes)
      return tr;
    let changes = ChangeSet.create(state.doc, tr.changes), doc2 = changes.apply(state.doc);
    if (changes.empty)
      return tr;
    let append = [];
    let cursor = doc2.resolve(0), check = (pos) => {
      cursor = cursor.advance(pos - cursor.pos);
      let before = cursor.nodeBefore, after = cursor.nodeAfter;
      if (before && after && before.isPlot && before.type.isBlock && after.isPlot && after.type == before.type) {
        let { autoJoin: autoJoin2 } = after.type.spec;
        if (autoJoin2 && (typeof autoJoin2 != "function" || autoJoin2(before.tag, after.tag))) {
          let from = pos - 1, to = pos + 1;
          for (; ; ) {
            let last = before.lastChild, first = after.firstChild;
            if (!first || !last || first.isLeaf || last.isLeaf || first.type != last.type || first.type.isInline)
              break;
            autoJoin2 = last.type.spec.autoJoin;
            if (!autoJoin2 || typeof autoJoin2 == "function" && !autoJoin2(last.tag, first.tag))
              break;
            from--, to++;
            before = last;
            after = first;
          }
          append.push({ from, to });
        }
      }
    };
    changes.iterGaps(() => {
    }, (_fromA, _toA, fromB, toB) => {
      check(fromB);
      if (toB > fromB)
        check(toB);
    });
    if (!append.length)
      return { ...tr, changes };
    return Transaction.merge(state, tr, { changes: append, sequential: true });
  }
  var insertText = ({ state }, { from, to, insert, userEvent }) => {
    if (state.readOnly)
      return false;
    let { selection } = state;
    let marks = from == selection.from && to == selection.to && state.sel.activeMarks || state.doc.resolve(from).marks(state.doc.resolve(to));
    return {
      changes: { from, to, insert: [Leaf.Text.of(insert, marks)], fit: true },
      scrollIntoView: true,
      selection: (cx, changes) => GardSelection.near(cx, changes.mapPos(to, 1), -1),
      userEvent
    };
  };
  var insertLineBreak = ({ state }) => {
    if (state.readOnly)
      return false;
    let { doc: doc2, sel } = state;
    let brk = doc2.schema.lineBreak, parent = sel.from.parent.node.type;
    let { from, to } = state.selection.replacementRange;
    let insertBreak = brk && doc2.schema.canContain(parent, brk.type);
    if (!(insertBreak || parent.preserveWhitespace && sel.to.parent.start == sel.from.parent.start))
      return false;
    let insert = insertBreak ? brk.withMarks(state.sel.activeMarks) : Leaf.text("\n", state.sel.activeMarks);
    let changes = ChangeSet.create(state.doc, { from, to, insert: [insert], fit: true });
    let pos = changes.findInserted((t) => insertBreak ? t.type == brk.type : t.isText);
    return {
      changes,
      selection: GardSelection.cursor(pos == null ? from : pos + 1, -1),
      scrollIntoView: true,
      userEvent: insertBreak ? "insert.linebreak" : "input"
    };
  };
  var enter = ({ state }) => {
    if (state.readOnly)
      return false;
    let { sel, doc: doc2 } = state;
    if (!sel.head.parent.node.inlineContent || !sel.anchor.parent.node.inlineContent) {
      let { from, to } = sel.replacementRange;
      let wrap = doc2.schema.findWrapping(from.parent.node.type, Leaf.Text);
      if (!wrap)
        return false;
      let content = [];
      for (let i = wrap.length - 1; i >= 0; i--)
        content = [wrap[i].create(content)];
      let changes = ChangeSet.create(state.doc, { from: from.pos, to: to.pos, insert: content, fit: true });
      let placed = content.length ? changes.findInserted((t) => t == content[0].tag) : null;
      return {
        changes,
        selection: placed != null ? ((cx) => GardSelection.near(cx, placed + wrap.length, -1)) : void 0,
        scrollIntoView: true,
        userEvent: "insert.textblock"
      };
    }
    return liftEmptyBlock(state) || splitTextblock(state);
  };
  var deleteUnit = ({ state }, dir) => {
    if (state.readOnly)
      return false;
    return deleteSelection(state) || (dir == "forward" ? joinForward(state) || deleteForward(state) || deleteEmptyTextblock(state, 1) : joinListItems(state) || joinBackward(state) || deleteBackward(state) || deleteEmptyTextblock(state, -1));
  };
  var deleteWord = ({ state }, dir) => {
    if (state.readOnly)
      return false;
    return deleteSelection(state) || (dir == "forward" ? joinForward(state) || deleteForward(state, true) || deleteEmptyTextblock(state, 1) : joinListItems(state) || joinBackward(state) || deleteBackward(state, true) || deleteEmptyTextblock(state, -1));
  };
  var deleteToLineEnd = (wg, dir) => {
    if (wg.state.readOnly)
      return false;
    let tr = deleteSelection(wg.state), { selection } = wg.state;
    if (tr)
      return wg.dispatch(tr), true;
    if (!(selection instanceof GardSelection.Text))
      return false;
    let end = wg.moveToLineBoundary(selection, dir == "forward");
    if (!end || end.head == selection.head)
      return false;
    return {
      changes: { correct: dir == "forward" ? { from: selection.head, to: end.head } : { from: end.head, to: selection.head } },
      scrollIntoView: true,
      userEvent: "delete." + dir
    };
  };
  var deleteLine = (wg) => {
    if (wg.state.readOnly)
      return false;
    let tr = deleteSelection(wg.state), { selection } = wg.state;
    if (tr)
      return wg.dispatch(tr), true;
    if (!(selection instanceof GardSelection.Text))
      return false;
    let start = wg.moveToLineBoundary(selection, false), end = wg.moveToLineBoundary(selection, true);
    if (!start || !end || start.head >= end.head)
      return false;
    return {
      changes: { correct: { from: start.head, to: end.head } },
      scrollIntoView: true,
      userEvent: "delete.line"
    };
  };
  var transposeChars = ({ state }) => {
    if (state.readOnly || !state.selection.isCursor)
      return false;
    let { sel } = state, head = state.selection.head;
    let before = sel.head.nodeBefore, after = sel.head.nodeAfter;
    if (!before || !before.is(Leaf.Text) || !after || !after.is(Leaf.Text))
      return false;
    let lenBefore = before.param.length - findClusterBreak(before.param, before.param.length, false);
    let lenAfter = findClusterBreak(after.param, 0);
    return {
      changes: [
        { from: head - lenBefore, to: head },
        { from: head + lenAfter, insert: [Leaf.text(before.param.slice(before.param.length - lenBefore))] }
      ],
      selection: GardSelection.cursor(head + lenAfter, -1),
      scrollIntoView: true,
      userEvent: "transpose"
    };
  };
  var setTextblockType = ({ state }, tag) => {
    if (state.readOnly)
      return false;
    let changes = [], { schema } = state.doc;
    for (let block of selectedTextblocks(state)) {
      if (!block.node.tag.eq(tag) && block.parent && schema.canContain(block.parent.node.type, tag.type)) {
        changes.push({ from: block.before, to: block.before + 1, insert: [schema.withMarksFrom(block.node.tag, tag)] });
        changes.push(clearNonFitting(schema, block, tag.type));
      }
    }
    if (!changes.length)
      return false;
    return autoJoinBlocks(state, { changes, scrollIntoView: true, userEvent: "settype" });
  };
  var unwrapBlock = ({ state }, query) => {
    if (state.readOnly)
      return false;
    let targets = [], changes = [];
    for (let { from, to } of state.selection.ranges) {
      if (!targets.some((t) => t.after > from && t.before < to)) {
        let result = findUnwrappable(state.schema, state.doc.resolve(from), state.doc.resolve(to), query ?? void 0);
        if (result)
          for (let node of result) {
            targets.push(node);
            changes.push(doUnwrapBlock(node, from, to));
          }
      }
    }
    if (!targets.length)
      return false;
    return autoJoinBlocks(state, {
      changes,
      scrollIntoView: true,
      userEvent: "unwrap"
    });
  };
  var wrapBlock = ({ state }, wrapper) => {
    if (state.readOnly)
      return false;
    let changes = [], lastTo = -1;
    for (let { from, to } of state.selection.ranges) {
      let range = findWrappable(state.doc.resolve(from), state.doc.resolve(to), wrapper);
      if (!range || range.from.pos < lastTo)
        continue;
      changes.push(wrapBlockRange(range, wrapper));
      lastTo = range.to.pos;
    }
    if (!changes.length)
      return false;
    return autoJoinBlocks(state, { changes, scrollIntoView: true, userEvent: "wrap" });
  };
  var toggleBlock = (target, tag) => {
    return unwrapBlock(target, tag) || wrapBlock(target, tag);
  };
  var toggleMark = ({ state }, mark) => {
    if (state.readOnly)
      return false;
    let { selection, doc: doc2 } = state;
    if (selection instanceof GardSelection.Text && selection.empty) {
      let selMarks = selection.marks || state.sel.head.marks(), add2 = !mark.isInSet(selMarks);
      let newMarks = add2 ? mark.addToSet(selMarks) : mark.removeFromSet(selMarks);
      return {
        selection: GardSelection.Text.create({
          anchor: selection.anchor,
          headSide: selection.headSide,
          goalColumn: selection.goalColumn,
          marks: newMarks
        }),
        userEvent: add2 ? "mark.add" : "mark.remove"
      };
    } else if (selection.ranges.some((r) => canAddMarkInRange(doc2, r.from, r.to, mark))) {
      return {
        changes: selection.ranges.map((r) => ({ from: r.from, to: r.to, add: mark })),
        userEvent: "mark.add"
      };
    } else {
      return {
        changes: selection.ranges.map((r) => ({ from: r.from, to: r.to, remove: mark })),
        userEvent: "mark.remove"
      };
    }
  };
  var toggleEmphasis = (target) => toggleMark(target, Emphasis);
  var toggleStrong = (target) => toggleMark(target, Strong);
  var toggleUnderline = (target) => toggleMark(target, Underline);
  var setAlignment = ({ state }, align) => {
    let { schema } = state.doc;
    if (state.readOnly || !schema.has(Alignment))
      return false;
    if (align == "start")
      align = null;
    if (align == "left" || align == "right")
      align = ltrAtCursor(state) == (align == "left") ? null : "end";
    let changes = [];
    for (let block of selectedTextblocks(state)) {
      let cur = block.node.tag.mark(Alignment);
      if (cur != align && schema.markAllowed(Alignment, block.node.type))
        changes.push(align ? { from: block.before, add: Alignment.of(align) } : { from: block.before, remove: Alignment.of(cur) });
    }
    if (!changes.length)
      return false;
    return {
      changes,
      userEvent: "mark.set.alignment"
    };
  };
  var setDirection = ({ state }, dir) => {
    let { schema } = state.doc;
    if (state.readOnly || !schema.has(Direction))
      return false;
    let changes = [];
    for (let block of selectedTextblocks(state)) {
      let cur = block.node.tag.mark(Direction);
      if (cur != dir && schema.markAllowed(Direction, block.node.type))
        changes.push(dir ? { from: block.before, add: Direction.of(dir) } : { from: block.before, remove: Direction.of(cur) });
    }
    if (!changes.length)
      return false;
    return {
      changes,
      userEvent: "mark.set.direction"
    };
  };
  var toggleList = ({ state }, listTag) => {
    if (state.readOnly)
      return false;
    let blocks = selectedTextblocks(state);
    if (!blocks.length)
      return false;
    return addList(state, blocks, listTag) || removeList(state, blocks, listTag);
  };
  var listIsActive = (listTag) => (state) => {
    return selectedTextblocks(state).every((b) => {
      let item = isListItem(b);
      return item && item.parent.node.type == listTag.type;
    });
  };
  function isListItem(node) {
    for (let first = true; ; ) {
      let { parent } = node;
      if (!parent)
        return null;
      if (parent.node.tag.type.hasRole(Node.Role.List))
        return first ? node : null;
      first = node.isFirst;
      node = parent;
    }
  }
  function autoJoin(a, b) {
    let { autoJoin: autoJoin2 } = a.type.spec;
    return typeof autoJoin2 == "function" ? autoJoin2(a, b) : typeof autoJoin2 == "boolean" ? autoJoin2 : a.eq(b);
  }
  function addList(state, blocks, listTag) {
    let plan = [];
    let chBefore = /* @__PURE__ */ new Set(), chAfter = /* @__PURE__ */ new Set();
    let lastItem = -1, { schema } = state.doc;
    for (let block of blocks) {
      let item = isListItem(block), wrap;
      if (!item && block.parent && schema.canContain(block.parent.node.type, listTag.type) && ((wrap = schema.findWrapping(listTag.type, block.node.type)) && wrap.length == 1 || (wrap = schema.findWrapping(listTag.type, Leaf.Text)) && wrap.length == 1)) {
        chAfter.add(block.before);
        chBefore.add(block.after);
        plan.push({ wrap: block, item: wrap[0] });
        lastItem = block.before;
      } else if (item?.parent && item.parent.node.tag.type != listTag.type && schema.canContain(listTag.type, item.node.type) && item.parent.parent && schema.canContain(item.parent.parent.node.type, listTag.type) && item.before != lastItem) {
        chAfter.add(item.before);
        chBefore.add(item.after);
        if (item.isFirst)
          chAfter.add(item.parent.before);
        if (item.isLast)
          chBefore.add(item.parent.after);
        plan.push({ change: block, item });
        lastItem = item.before;
      }
    }
    if (!plan.length)
      return false;
    let changes = [];
    for (let step of plan) {
      if ("wrap" in step) {
        let { wrap, item } = step, prev, next;
        let openTo = item.isTextblock ? wrap.start : wrap.before, openFrom = wrap.before, open = [item];
        if (chBefore.has(wrap.before)) ;
        else if ((prev = wrap.previousSibling) && prev.tag.eq(listTag))
          openFrom--;
        else
          open.unshift(listTag);
        changes.push({ from: openFrom, to: openTo, insert: open });
        let closeFrom = item.isTextblock ? wrap.end : wrap.after, closeTo = wrap.after, close = [Plot.End];
        if (chAfter.has(wrap.after)) ;
        else if ((next = wrap.nextSibling) && next.isPlot && next.type == listTag.type && autoJoin(next.tag, listTag))
          closeTo++;
        else
          close.push(Plot.End);
        changes.push({ from: closeFrom, to: closeTo, insert: close });
      } else {
        let { item } = step, prev, next;
        if (item.isFirst) {
          if (chBefore.has(item.before - 1)) changes.push({ from: item.before - 1, to: item.before });
          else if ((prev = item.parent.previousSibling) && prev.tag.type == listTag.type) changes.push({ from: item.before - 2, to: item.before });
          else changes.push({ from: item.before - 1, to: item.before, insert: [listTag] });
        } else if (!chBefore.has(item.before)) {
          changes.push({ from: item.before, insert: [Plot.End, listTag] });
        }
        if (item.isLast) {
          if (chAfter.has(item.after + 1)) {
            changes.push({ from: item.after, to: item.after + 1 });
          } else if ((next = item.parent.nextSibling) && next.isPlot && autoJoin(next.tag, listTag)) {
            changes.push({ from: item.after, to: item.after + 2 });
          }
        }
      }
    }
    return { changes, userEvent: "wrap.list" };
  }
  function removeList(state, blocks, listTag) {
    let plan = [], lastItem = -1;
    let chBefore = /* @__PURE__ */ new Set(), chAfter = /* @__PURE__ */ new Set();
    let { schema } = state.doc;
    for (let block of blocks) {
      let item = isListItem(block);
      if (!item)
        continue;
      let list = item.parent, parent = list.parent, rewrap = null;
      if (parent && list.node.isPlot && list.node.type == listTag.type && item.before != lastItem && (item.node.isTextblock ? (rewrap = schema.defaultContentPlot(parent.node.type)) && rewrap.isTextblock : schema.canContain(parent.node.type, block.node.type))) {
        lastItem = item.before;
        plan.push({ item, rewrap });
        chAfter.add(item.before);
        chBefore.add(item.after);
      }
    }
    if (!plan.length)
      return false;
    let changes = [];
    for (let { item, rewrap } of plan) {
      let openFrom = item.before, openTo = item.start, open = rewrap ? [rewrap] : [];
      if (item.isFirst)
        openFrom--;
      else if (!chBefore.has(item.before))
        open.unshift(Plot.End);
      changes.push({ from: openFrom, to: openTo, insert: open });
      let closeFrom = rewrap ? item.after : item.end, closeTo = item.after, close = [];
      if (item.isLast)
        closeTo++;
      else if (!chAfter.has(item.after))
        close.push(listTag);
      changes.push({ from: closeFrom, to: closeTo, insert: close });
    }
    return { changes, userEvent: "unwrap.list" };
  }
  function setSelection(selection) {
    return {
      selection,
      scrollIntoView: true,
      userEvent: "select"
    };
  }
  function ltrAtCursor(state) {
    let block = state.sel.head.textblockParent;
    return block ? state.textblockLTR(block.node) : state.textLTR;
  }
  function isForward(dir, state) {
    return dir == "forward" ? true : dir == "backward" ? false : dir == "right" == ltrAtCursor(state);
  }
  function asTextSel(sel, forward) {
    if (sel instanceof GardSelection.Text)
      return sel;
    let { from, to } = sel.replacementRange;
    return forward ? GardSelection.range(from, to) : GardSelection.range(to, from);
  }
  function extendSel(base, head) {
    return GardSelection.range(base.anchor, head.head, head.headSide, head.goalColumn);
  }
  var moveByUnit = ({ state }, { dir, extend }) => {
    let forward = isForward(dir, state), selection = asTextSel(state.selection, forward);
    if (!selection.empty && !extend) {
      let next = selection.normalCursorAtBound(state, forward);
      return next ? setSelection(next) : false;
    } else {
      let next = selection.nextNormalCursor(state, forward);
      if (!next)
        return false;
      if (!extend)
        state.doc.iterate(Math.min(selection.head, next.head), Math.max(selection.head, next.head), (node, pos) => {
          if (node.type.isSelectable && state.isAtom(node.type))
            next = GardSelection.node(pos, node);
          if (node.isPlot)
            return !node.type.isolating;
        });
      return setSelection(extend ? extendSel(selection, next) : next);
    }
  };
  var moveByWord = ({ state }, { dir, extend }) => {
    let forward = dir == "right" == ltrAtCursor(state);
    let selection = asTextSel(state.selection, forward);
    let moved = selection.skipWord(state, forward);
    return moved ? setSelection(extend ? extendSel(selection, moved) : moved) : false;
  };
  function nextVertical(wg, sel, forward, distance, allowNode) {
    let next = wg.moveVertically(sel, forward, distance, allowNode);
    if (next)
      return next;
    let end = (forward ? GardSelection.atEnd : GardSelection.atStart)(wg.state);
    return end.head == wg.state.selection.head ? null : end;
  }
  var moveByLine = (wg, { dir, extend }) => {
    let { state } = wg, { selection } = state, forward = dir == "down";
    if (state.selection instanceof GardSelection.Node) {
      let next = !extend && state.selection.normalCursorAtBound(state, forward);
      if (next && !state.doc.resolve(next.head).parent.node.inlineContent)
        return setSelection(GardSelection.cursor(next.head, next.headSide, state.selection.goalColumn));
      selection = GardSelection.cursor(forward ? selection.to : selection.from, void 0, selection.goalColumn);
    } else {
      selection = asTextSel(state.selection, forward);
    }
    let moved = nextVertical(wg, selection, forward, void 0, !extend);
    return moved ? setSelection(extend ? extendSel(selection, moved) : moved) : false;
  };
  function pageHeight(wg) {
    let marginTop = 0, marginBottom = 0;
    for (let source of wg.state.facet(wg.constructor.coveredMargins)) {
      let margins = source(wg);
      if (margins?.top)
        marginTop = Math.max(margins?.top, marginTop);
      if (margins?.bottom)
        marginBottom = Math.max(margins?.bottom, marginBottom);
    }
    return Math.max(10, Math.min(wg.scrollDOM.clientHeight - marginTop - marginBottom, (wg.dom.ownerDocument.defaultView || window).innerHeight) - 10);
  }
  var moveByPage = (wg, { dir, extend }) => {
    let { state } = wg, { selection } = state, forward = dir == "down";
    let moved = selection.empty || extend ? nextVertical(wg, selection, forward, pageHeight(wg), !extend) : forward ? GardSelection.cursor(selection.to, -1) : GardSelection.cursor(selection.from, 1);
    return moved ? setSelection(extend ? extendSel(selection, moved) : moved) : false;
  };
  var moveToLineSide = (wg, { dir, extend }) => {
    let pos = wg.moveToLineBoundary(wg.state.selection, isForward(dir, wg.state));
    return pos ? setSelection(extend ? extendSel(wg.state.selection, pos) : pos) : false;
  };
  var moveToTextblockSide = (wg, { dir, extend }) => {
    let { state } = wg, block = state.sel.head.textblockParent;
    if (!block)
      return false;
    let pos = isForward(dir, wg.state) ? GardSelection.atEnd(state, block) : GardSelection.atStart(state, block);
    return setSelection(extend ? extendSel(wg.state.selection, pos) : pos);
  };
  var moveToDocSide = (target, { side, extend }) => {
    let { state } = target;
    let pos = side == "start" ? GardSelection.atStart(state) : GardSelection.atEnd(state);
    if (state.selection.empty && pos.head == state.selection.head)
      return false;
    return setSelection(extend ? extendSel(state.selection, pos) : pos);
  };
  var selectAll = ({ state }) => {
    return {
      selection: GardSelection.range(0, state.doc.length),
      userEvent: "select.all"
    };
  };
  var undo = () => false;
  var redo = () => false;
  var Menu = /* @__PURE__ */ (function(Menu2) {
    let Item;
    (function(Item2) {
      class Base {
        select;
        enable;
        updateFor;
        parent;
        rank;
        description;
        extension;
        constructor(spec) {
          this.select = spec.select;
          this.enable = spec.enable;
          this.updateFor = spec.updateFor;
          this.parent = spec.parent;
          this.rank = spec.rank == null ? 100 : Math.max(0, Math.min(100, spec.rank));
          this.description = spec.description;
          let src = Menu2.Item.source.of(this);
          this.extension = this.parent ? [src, this.parent] : src;
        }
      }
      Item2.Base = Base;
      Item2.source = GardState.Facet.define();
    })(Item = Menu2.Item || (Menu2.Item = {}));
    class Button extends Item.Base {
      spec;
      label;
      run;
      active;
      constructor(spec) {
        super(spec);
        this.spec = spec;
        this.run = spec.run;
        this.active = spec.active;
        this.label = spec.label;
      }
      static define(spec) {
        return new Button(spec);
      }
    }
    Menu2.Button = Button;
    (function(Button2) {
      function toggleMark$1(config) {
        let { mark, parent, rank, description, label } = config;
        return Menu2.Button.define({
          run: Command.bind(toggleMark, mark),
          active(state) {
            let { selection } = state;
            if (selection.isCursor)
              return !!mark.isInSet(state.sel.activeMarks);
            else
              return !selection.ranges.some((r) => canAddMarkInRange(state.doc, r.from, r.to, mark));
          },
          enable: (s) => !s.readOnly,
          parent,
          rank,
          description,
          label
        });
      }
      Button2.toggleMark = toggleMark$1;
    })(Button = Menu2.Button || (Menu2.Button = {}));
    class CustomControl extends Item.Base {
      spec;
      render;
      setEnabled;
      constructor(spec) {
        super(spec);
        this.spec = spec;
        this.render = spec.render;
        this.setEnabled = spec.setEnabled;
      }
      static define(spec) {
        return new CustomControl(spec);
      }
    }
    Menu2.CustomControl = CustomControl;
    class Group {
      spec;
      margin;
      parent;
      rank;
      content;
      overflow;
      extension;
      constructor(spec) {
        this.spec = spec;
        this.margin = !!spec.margin;
        this.extension = Item.source.of(this);
        this.parent = spec.parent;
        this.rank = spec.rank == null ? 100 : Math.max(0, Math.min(100, spec.rank));
        this.content = spec.content;
        this.overflow = spec.overflow;
      }
      static define(spec = {}) {
        return new Group(spec);
      }
      template(...content) {
        return Template.new(this, content.length ? content : ["..."]);
      }
    }
    Menu2.Group = Group;
    (function(Group2) {
      Group2.top = Group2.define();
      Group2.commands = Group2.define({ parent: Group2.top, rank: 30 });
      Group2.inline = Group2.define({ parent: Group2.top, rank: 50, margin: true, overflow: { at: 5 } });
      Group2.block = Group2.define({ parent: Group2.top, rank: 70, margin: true });
      Group2.insert = Group2.define({ parent: Group2.top, rank: 90, margin: true });
    })(Group = Menu2.Group || (Menu2.Group = {}));
    class Submenu extends Item.Base {
      spec;
      label;
      defaultLabel;
      arrow;
      width;
      content;
      constructor(spec) {
        super(spec);
        this.spec = spec;
        this.label = spec.label;
        this.defaultLabel = spec.defaultLabel;
        this.arrow = spec.arrow !== false;
        this.width = spec.width;
        this.content = spec.content;
      }
      static define(spec) {
        return new Submenu(spec);
      }
      template(...content) {
        return Template.new(this, content.length ? content : ["..."]);
      }
    }
    Menu2.Submenu = Submenu;
    (function(Submenu2) {
      class Resolved {
        item;
        content;
        constructor(item, content) {
          this.item = item;
          this.content = content;
        }
        static new(item, content) {
          return new Resolved(item, content);
        }
      }
      Submenu2.Resolved = Resolved;
      Submenu2.textblockStyle = Menu2.Submenu.define({
        defaultLabel: phrases.ref("block_style"),
        description: phrases.ref("block_style"),
        parent: Group.top,
        rank: 10,
        width: 10
      });
    })(Submenu = Menu2.Submenu || (Menu2.Submenu = {}));
    class Template {
      item;
      content;
      parent;
      rank;
      constructor(item, content) {
        this.item = item;
        this.content = content;
        this.parent = item.parent ?? null;
        this.rank = item.rank ?? 100;
      }
      static new(item, content = []) {
        return new Template(item, content);
      }
    }
    Menu2.Template = Template;
    const defaultOverflow = Submenu.define({
      label: {
        icon: "M57 77a8 8 0 1 1-16 0 8 8 0 0 1 16 0m0-26a8 8 0 1 1-16 0 8 8 0 0 1 16 0m0-26a8 8 0 1 1-16 0 8 8 0 0 1 16 0"
      },
      description: phrases.ref("overflow_more"),
      arrow: false
    });
    function resolve(items, template = Group.top.template(), suppress) {
      let used = /* @__PURE__ */ new Map();
      if (suppress)
        for (let item of suppress)
          used.set(item, 2);
      function scan(template2) {
        used.set(template2.item, 1);
        for (let child of template2.content) {
          if (child instanceof Template)
            scan(child);
          else if (typeof child != "string")
            used.set(child, 1);
        }
      }
      function margin(target) {
        if (target.length && target[target.length - 1] !== "|")
          target.push("|");
      }
      function resolve2(template2, content, target, fromTemplate) {
        if (template2 instanceof Template) {
          resolve2(template2.item, template2.content, target, true);
        } else {
          let wasUsed = used.get(template2);
          if (fromTemplate ? wasUsed == 2 : wasUsed != null)
            return;
          used.set(template2, 2);
          if (template2 instanceof Submenu || template2 instanceof Group) {
            if (template2 instanceof Group && template2.margin)
              margin(target);
            let inner = [];
            for (let elt of content || template2.content || ["..."]) {
              if (elt === "...") {
                let found = items.filter((i) => i.parent == template2);
                for (let item of found.sort((a, b) => (a.rank ?? 100) - (b.rank ?? 100)))
                  resolve2(item, null, inner, false);
              } else {
                resolve2(elt, null, inner, fromTemplate);
              }
            }
            if (inner.length) {
              if (template2 instanceof Submenu) {
                if (inner[inner.length - 1] === "|")
                  inner.pop();
                if (inner.length)
                  target.push(Submenu.Resolved.new(template2, inner));
              } else {
                if (template2.overflow && inner.length > template2.overflow.at) {
                  let overflow = Submenu.Resolved.new(template2.overflow.wrap || defaultOverflow, inner.slice(template2.overflow.at - 1).filter((e) => e != "|"));
                  inner.length = template2.overflow.at - 1;
                  inner.push(overflow);
                }
                for (let elt of inner)
                  target.push(elt);
              }
            }
            if (template2 instanceof Group && template2.margin)
              margin(target);
          } else {
            target.push(template2);
          }
        }
      }
      let top2 = [];
      if (Array.isArray(template)) {
        for (let elt of template)
          scan(elt);
        for (let elt of template)
          resolve2(elt, null, top2, true);
      } else {
        scan(template);
        resolve2(template, null, top2, true);
      }
      if (top2.length && top2[top2.length - 1] === "|")
        top2.pop();
      return top2;
    }
    Menu2.resolve = resolve;
    ;
    return Menu2;
  })({});

  // node_modules/style-mod/src/style-mod.js
  var C = "\u037C";
  var COUNT = typeof Symbol == "undefined" ? "__" + C : Symbol.for(C);
  var SET = typeof Symbol == "undefined" ? "__styleSet" + Math.floor(Math.random() * 1e8) : /* @__PURE__ */ Symbol("styleSet");
  var top = typeof globalThis != "undefined" ? globalThis : typeof window != "undefined" ? window : {};
  var StyleModule = class {
    // :: (Object<Style>, ?{finish: ?(string) → string})
    // Create a style module from the given spec.
    //
    // When `finish` is given, it is called on regular (non-`@`)
    // selectors (after `&` expansion) to compute the final selector.
    constructor(spec, options) {
      this.rules = [];
      let { finish } = options || {};
      function splitSelector(selector) {
        return /^@/.test(selector) ? [selector] : selector.split(/,\s*/);
      }
      function render(selectors, spec2, target, isKeyframes) {
        let local = [], isAt = /^@(\w+)\b/.exec(selectors[0]), keyframes = isAt && isAt[1] == "keyframes";
        if (isAt && spec2 == null) return target.push(selectors[0] + ";");
        for (let prop in spec2) {
          let value = spec2[prop];
          if (/&/.test(prop)) {
            render(
              prop.split(/,\s*/).map((part) => selectors.map((sel) => part.replace(/&/, sel))).reduce((a, b) => a.concat(b)),
              value,
              target
            );
          } else if (value && typeof value == "object") {
            if (!isAt) throw new RangeError("The value of a property (" + prop + ") should be a primitive value.");
            render(splitSelector(prop), value, local, keyframes);
          } else if (value != null) {
            local.push(prop.replace(/_.*/, "").replace(/[A-Z]/g, (l) => "-" + l.toLowerCase()) + ": " + value + ";");
          }
        }
        if (local.length || keyframes) {
          target.push((finish && !isAt && !isKeyframes ? selectors.map(finish) : selectors).join(", ") + " {" + local.join(" ") + "}");
        }
      }
      for (let prop in spec) render(splitSelector(prop), spec[prop], this.rules);
    }
    // :: () → string
    // Returns a string containing the module's CSS rules.
    getRules() {
      return this.rules.join("\n");
    }
    // :: () → string
    // Generate a new unique CSS class name.
    static newName() {
      let id = top[COUNT] || 1;
      top[COUNT] = id + 1;
      return C + id.toString(36);
    }
    // :: (union<Document, ShadowRoot>, union<[StyleModule], StyleModule>, ?{nonce: ?string})
    //
    // Mount the given set of modules in the given DOM root, which ensures
    // that the CSS rules defined by the module are available in that
    // context.
    //
    // Rules are only added to the document once per root.
    //
    // Rule order will follow the order of the modules, so that rules from
    // modules later in the array take precedence of those from earlier
    // modules. If you call this function multiple times for the same root
    // in a way that changes the order of already mounted modules, the old
    // order will be changed.
    //
    // If a Content Security Policy nonce is provided, it is added to
    // the `<style>` tag generated by the library.
    static mount(root, modules, options) {
      let set = root[SET], nonce = options && options.nonce;
      if (!set) set = new StyleSet(root, nonce);
      else if (nonce) set.setNonce(nonce);
      set.mount(Array.isArray(modules) ? modules : [modules], root);
    }
  };
  var adoptedSet = /* @__PURE__ */ new Map();
  var StyleSet = class {
    constructor(root, nonce) {
      let doc2 = root.ownerDocument || root, win = doc2.defaultView;
      if (!root.head && root.adoptedStyleSheets && win.CSSStyleSheet) {
        let adopted = adoptedSet.get(doc2);
        if (adopted) return root[SET] = adopted;
        this.sheet = new win.CSSStyleSheet();
        adoptedSet.set(doc2, this);
      } else {
        this.styleTag = doc2.createElement("style");
        if (nonce) this.styleTag.setAttribute("nonce", nonce);
      }
      this.modules = [];
      root[SET] = this;
    }
    mount(modules, root) {
      let sheet = this.sheet;
      let pos = 0, j = 0;
      for (let i = 0; i < modules.length; i++) {
        let mod = modules[i], index = this.modules.indexOf(mod);
        if (index < j && index > -1) {
          this.modules.splice(index, 1);
          j--;
          index = -1;
        }
        if (index == -1) {
          this.modules.splice(j++, 0, mod);
          if (sheet) for (let k = 0; k < mod.rules.length; k++)
            sheet.insertRule(mod.rules[k], pos++);
        } else {
          while (j < index) pos += this.modules[j++].rules.length;
          pos += mod.rules.length;
          j++;
        }
      }
      if (sheet) {
        if (root.adoptedStyleSheets.indexOf(this.sheet) < 0)
          root.adoptedStyleSheets = [this.sheet, ...root.adoptedStyleSheets];
      } else {
        let text = "";
        for (let i = 0; i < this.modules.length; i++)
          text += this.modules[i].getRules() + "\n";
        this.styleTag.textContent = text;
        let target = root.head || root;
        if (this.styleTag.parentNode != target)
          target.insertBefore(this.styleTag, target.firstChild);
      }
    }
    setNonce(nonce) {
      if (this.styleTag && this.styleTag.getAttribute("nonce") != nonce)
        this.styleTag.setAttribute("nonce", nonce);
    }
  };

  // node_modules/wordgard/dist/history.js
  var fromHistory = /* @__PURE__ */ Transaction.Annotation.define();
  var historyConfig = /* @__PURE__ */ GardState.Facet.define({
    combine(configs) {
      return GardState.Facet.combineConfig(configs, {
        minDepth: 100,
        newGroupDelay: 500,
        joinToEvent: (_t, isAdjacent2) => isAdjacent2
      }, {
        minDepth: Math.max,
        newGroupDelay: Math.min,
        joinToEvent: (a, b) => (tr, adj) => a(tr, adj) || b(tr, adj)
      });
    }
  });
  var historyField_ = /* @__PURE__ */ GardState.Field.define({
    create() {
      return new HistoryState(null, null);
    },
    update(state, tr) {
      let config = tr.state.facet(historyConfig);
      let fromHist = tr.annotation(fromHistory);
      if (fromHist) {
        let from = fromHist.side, event2 = eventFromTransaction(tr);
        let other = from == 0 ? state.undone : state.done;
        if (event2)
          other = new Branch(event2.changes, event2.effects, null, tr.startState.selection, other);
        return new HistoryState(from == 0 ? fromHist.rest : other, from == 0 ? other : fromHist.rest);
      }
      let isolate = tr.annotation(history.isolate);
      if (isolate == true || isolate == "before")
        state = state.isolate();
      if (tr.annotation(Transaction.addToHistory) === false)
        return tr.changes.empty ? state : new HistoryState(state.done && state.done.addMapping(tr.changes, tr.startState.doc), state.undone && state.undone.addMapping(tr.changes, tr.startState.doc), state.prevTime, state.prevUserEvent);
      let event = eventFromTransaction(tr);
      let time = tr.annotation(Transaction.time), userEvent = tr.annotation(Transaction.userEvent);
      if (event)
        state = state.addChanges(event, time, userEvent, config, tr);
      if (isolate == true || isolate == "after")
        state = state.isolate();
      return state.clip(config.minDepth);
    },
    toJSON(value, state) {
      let mkJSON = (value2) => {
        let events = [];
        for (let cur = value2; cur; cur = cur.next)
          events.push({ changes: cur.changes.toJSON(), selection: cur.startSelection.toJSON(state) });
        return events;
      };
      return {
        done: mkJSON(value.done = value.done && value.done.resolveFully(state.config)),
        undone: mkJSON(value.undone = value.undone && value.undone.resolveFully(state.config))
      };
    },
    fromJSON(json, state) {
      if (!json || !Array.isArray(json.done) || !Array.isArray(json.undone))
        throw new RangeError("Invalid history JSON");
      let buildBranch = (json2) => {
        let result = null;
        for (let i = json2.length - 1; i >= 0; i--)
          result = new Branch(ChangeSet.fromJSON(state.schema, json2[i].changes), none3, null, GardSelection.fromJSON(state, json2[i].selection), result);
        return result;
      };
      return new HistoryState(buildBranch(json.done), buildBranch(json.undone));
    }
  });
  function history(config = {}) {
    return [
      historyField_,
      historyConfig.of(config),
      Command.handler(undo, undo2),
      Command.handler(redo, redo2),
      undoButton,
      redoButton
    ];
  }
  history = /* @__PURE__ */ (function(history2) {
    history2.field = historyField_;
    history2.isolate = Transaction.Annotation.define();
    history2.invertedEffects = GardState.Facet.define();
    ;
    return history2;
  })(history);
  var undo2 = ({ state }) => {
    let historyState = state.field(historyField_, false);
    if (state.readOnly || !historyState)
      return false;
    return historyState.pop(0, state);
  };
  var redo2 = ({ state }) => {
    let historyState = state.field(historyField_, false);
    if (state.readOnly || !historyState)
      return false;
    return historyState.pop(1, state);
  };
  function depth(branch) {
    return branch ? branch.depth : 0;
  }
  var undoDepth = (state) => depth(state.field(historyField_, false)?.done);
  var redoDepth = (state) => depth(state.field(historyField_, false)?.undone);
  var Branch = class _Branch {
    changes;
    effects;
    mapped;
    startSelection;
    next;
    depth;
    constructor(changes, effects, mapped, startSelection, next) {
      this.changes = changes;
      this.effects = effects;
      this.mapped = mapped;
      this.startSelection = startSelection;
      this.next = next;
      this.depth = depth(next) + 1;
    }
    addChanges(changes, effects) {
      return new _Branch(changes.compose(this.changes), conc(Transaction.Effect.mapEffects(effects, this.changes), this.effects), null, this.startSelection, this.next);
    }
    resolve(config) {
      if (!this.mapped)
        return this;
      let { mapped: { change, doc: doc2 }, next } = this;
      let { a: mappedMapping, b: mappedChanges } = ChangeSet.transform(doc2, change, this.changes);
      if (next)
        next = next.addMapping(mappedMapping, next.mapped ? null : this.changes.apply(doc2));
      if (mappedChanges.empty && !this.effects.length)
        return next && next.resolve(config);
      let selDoc, selCx2 = {
        get doc() {
          return selDoc || (selDoc = mappedChanges.apply(change.apply(doc2)));
        },
        config
      };
      return new _Branch(mappedChanges, Transaction.Effect.mapEffects(this.effects, change), null, this.startSelection.map(mappedMapping, selCx2), next);
    }
    resolveFully(config) {
      let stack = [];
      for (let head = this; head; head = head.next) {
        head = head.resolve(config);
        if (!head)
          break;
        stack.push(head);
      }
      let result = null;
      for (let i = stack.length - 1; i >= 0; i--) {
        let next = stack[i];
        if (next.next == result)
          result = next;
        else
          result = new _Branch(next.changes, next.effects, null, next.startSelection, result);
      }
      return result;
    }
    addMapping(change, startDoc) {
      return new _Branch(this.changes, this.effects, this.mapped ? { change: this.mapped.change.compose(change), doc: this.mapped.doc } : { change, doc: startDoc }, this.startSelection, this.next);
    }
    clip(depth2) {
      let stack = [];
      for (let i = 0, cur = this; i < depth2 && cur; i++, cur = cur.next)
        stack.push(cur);
      let result = null;
      for (let i = stack.length - 1; i >= 0; i--) {
        let event = stack[i];
        result = new _Branch(event.changes, event.effects, event.mapped, event.startSelection, result);
      }
      return result;
    }
  };
  function eventFromTransaction(tr) {
    let effects = none3;
    for (let invert of tr.startState.facet(history.invertedEffects)) {
      let result = invert(tr);
      if (result.length)
        effects = effects.concat(result);
    }
    if (!effects.length && tr.changes.empty)
      return null;
    return { changes: tr.changes.invert(tr.startState.doc), effects };
  }
  function isAdjacent(a, b) {
    let ranges = [], isAdjacent2 = false;
    a.iterChangedRanges((f, t) => ranges.push(f, t));
    b.iterChangedRanges((_f, _t, f, t) => {
      for (let i = 0; i < ranges.length; ) {
        let from = ranges[i++], to = ranges[i++];
        if (t >= from && f <= to)
          isAdjacent2 = true;
      }
    });
    return isAdjacent2;
  }
  function conc(a, b) {
    return !a.length ? b : !b.length ? a : a.concat(b);
  }
  var none3 = [];
  var joinableUserEvent = /^(input\.type|delete)($|\.)/;
  var HistoryState = class _HistoryState {
    done;
    undone;
    prevTime;
    prevUserEvent;
    constructor(done, undone, prevTime = 0, prevUserEvent = void 0) {
      this.done = done;
      this.undone = undone;
      this.prevTime = prevTime;
      this.prevUserEvent = prevUserEvent;
    }
    isolate() {
      return this.prevTime ? new _HistoryState(this.done, this.undone) : this;
    }
    addChanges(event, time, userEvent, config, tr) {
      let done = this.done && this.done.resolve(tr.startState.config);
      if (done && !done.changes.empty && (!userEvent || joinableUserEvent.test(userEvent) || tr.annotation(Transaction.appended)) && (time - this.prevTime < config.newGroupDelay && config.joinToEvent(tr, isAdjacent(done.changes, event.changes)) || userEvent == "input.type.compose")) {
        done = done.addChanges(event.changes, event.effects);
      } else {
        done = new Branch(event.changes, event.effects, null, tr.startState.selection, done);
      }
      return new _HistoryState(done, null, time, userEvent);
    }
    pop(side, state) {
      let branch = side == 0 ? this.done : this.undone;
      if (!branch || !(branch = branch.resolve(state.config)))
        return false;
      return {
        changes: branch.changes,
        selection: branch.startSelection,
        effects: branch.effects,
        annotations: fromHistory.of({ side, rest: branch.next }),
        userEvent: side == 0 ? "undo" : "redo",
        scrollIntoView: true
      };
    }
    clip(minDepth) {
      let max = minDepth * 1.3;
      let done = depth(this.done) > max ? this.done.clip(minDepth) : this.done;
      let undone = depth(this.undone) > max ? this.undone.clip(minDepth) : this.undone;
      if (done != this.done || undone != this.undone)
        return new _HistoryState(done, undone, this.prevTime, this.prevUserEvent);
      return this;
    }
  };
  var undoButton = /* @__PURE__ */ (() => Menu.Button.define({
    run: undo2,
    label: {
      icon: "M69 90c9-16 10-41-24-40v20l-30-30 30-30v19c42-1 46 37 24 61z"
    },
    description: phrases.ref("undo"),
    enable: (s) => !s.readOnly && undoDepth(s) > 0,
    parent: Menu.Group.commands,
    rank: 10
  }))();
  var redoButton = /* @__PURE__ */ (() => Menu.Button.define({
    run: redo2,
    label: {
      icon: "M55 29v-19l30 30-30 30v-20c-35-1-33 24-24 40-22-24-17-62 24-61z"
    },
    description: phrases.ref("redo"),
    enable: (s) => !s.readOnly && redoDepth(s) > 0,
    parent: Menu.Group.commands,
    rank: 20
  }))();

  // node_modules/wordgard/dist/editor.js
  var Widget = class _Widget {
    value;
    constructor(type, value) {
      this.value = value;
      this.type = type;
    }
    static new(type, value) {
      return new _Widget(type, value);
    }
    eq(other) {
      return other instanceof _Widget && other.type == this.type && this.type.eq(this.value, other.value);
    }
    static define(spec) {
      return _Widget.Type.new(spec);
    }
    static create(spec) {
      return _Widget.Type.new(spec).of(null);
    }
    type;
    get hasContent() {
      return false;
    }
  };
  Widget = /* @__PURE__ */ (function(Widget2) {
    class Type {
      render;
      eq;
      handleEvent;
      connect;
      disconnect;
      constructor(render, eq, handleEvent, connect, disconnect) {
        this.render = render;
        this.eq = eq;
        this.handleEvent = handleEvent;
        this.connect = connect;
        this.disconnect = disconnect;
      }
      static new(spec) {
        return new Type(spec.render, spec.eq || ((a, b) => a === b), spec.handleEvent || (() => false), spec.connect ?? null, spec.disconnect ?? null);
      }
      of(value) {
        return Widget2.new(this, value);
      }
    }
    Widget2.Type = Type;
    Widget2.Text = Widget2.define({
      render: (s) => document.createTextNode(s)
    });
    Widget2.EditableText = Widget2.define({
      render: (s) => document.createTextNode(s)
    });
    ;
    return Widget2;
  })(Widget);
  var Decoration = /* @__PURE__ */ (function(Decoration2) {
    (function(Tag) {
      function shape(type, shape2, config) {
        let tp = Node.Type.get(type);
        let shapeFunc = typeof shape2 == "function" ? (tag) => addMarkAttributes(shape2(tag), tag) : (tag) => addMarkAttributes(shape2, tag);
        let atom = typeof shape2 == "function" ? config?.atom : !shape2.hasContent;
        let ext = tagShape.of({ type: tp, shape: memo(shapeFunc) });
        if (tp.isPlot && atom != null)
          ext = [ext, GardState.isAtom.of([tp, atom])];
        return ext;
      }
      Tag.shape = shape;
      (function(shape_1) {
        function dynamic(type, shape2, config) {
          let tp = Node.Type.get(type);
          let ext = tagShape.compute((state) => {
            let s = shape2(state);
            return { type: tp, shape: typeof s == "function" ? memo(s) : () => s };
          });
          let atom = config?.atom;
          if (tp.isPlot && atom != null)
            ext = [ext, GardState.isAtom.of([tp, atom])];
          return ext;
        }
        shape_1.dynamic = dynamic;
      })(shape = Tag.shape || (Tag.shape = {}));
      function wrapper(type, wrapper2, options) {
        if (!wrapper2.hasContent)
          throw new Error("Wrapper elements should have a content hole");
        return tagWrapper.of({
          type: Node.Type.get(type),
          elt: wrapper2,
          target: options && options.target ? Elt.Selector.parse(options.target) : null
        });
      }
      Tag.wrapper = wrapper;
      function getPlace(place) {
        return place == "before" ? 0 : place == "after" ? 1 : place == "end" ? 3 : 2;
      }
      function widget(type, place, widget2) {
        return tagWidget.of({
          type: Node.Type.get(type),
          place: getPlace(place),
          widget: typeof widget2 == "function" ? memo(widget2) : (() => widget2)
        });
      }
      Tag.widget = widget;
      (function(widget_1) {
        function dynamic(type, place, widget2) {
          let tp = Node.Type.get(type);
          let p = getPlace(place);
          return tagWidget.compute((state) => {
            let w = widget2(state);
            return {
              type: tp,
              place: p,
              widget: typeof w == "function" ? memo(w) : (() => w)
            };
          });
        }
        widget_1.dynamic = dynamic;
      })(widget = Tag.widget || (Tag.widget = {}));
      function attribute(type, attr, value, options) {
        let tp = Node.Type.get(type);
        return tagAttribute.of({
          type: tp,
          attr,
          value: typeof value == "string" ? () => value : value,
          target: options?.target ? Elt.Selector.parse(options.target) : null
        });
      }
      Tag.attribute = attribute;
    })(Decoration2.Tag || (Decoration2.Tag = {}));
    class Point {
      constructor() {
      }
      static widget(widget, options) {
        return new WidgetDecoration(widget, options?.side || 0, options && "trackMode" in options ? options.trackMode : "around");
      }
      static attributes(attrs, options) {
        return new AttributeDecoration(Attributes.read(attrs), options?.target ? Elt.Selector.parse(options.target) : null);
      }
      static shape(shape) {
        return new ShapeDecoration(shape);
      }
      static wrapper(wrapper, spec) {
        if (!wrapper.hasContent)
          throw new Error("Wrapper decoration elements must have a content hole");
        return new WrapperDecoration(wrapper, spec?.target ? Elt.Selector.parse(spec.target) : null);
      }
      static source = GardState.Facet.define({
        combine: (sources) => sources.concat(nodeSelection)
      });
    }
    Decoration2.Point = Point;
    class Range {
      query;
      scope;
      inc;
      constructor(spec) {
        let { query, inclusive } = spec;
        this.query = query || null;
        this.scope = spec.scope == "inlineatom" ? 2 : spec.scope == "all" ? 4 : 1;
        this.inc = inclusive === "start" ? 1 : inclusive === "end" ? 2 : inclusive ? 1 | 2 : 0;
      }
      get inclusiveStart() {
        return (this.inc & 1) > 0;
      }
      get inclusiveEnd() {
        return (this.inc & 2) > 0;
      }
      static wrapper(tagName, spec) {
        return new WrapperRangeDecoration(tagName, spec);
      }
      static attribute(attr, value, options = {}) {
        return new AttributeRangeDecoration(attr, value, options);
      }
      static source = GardState.Facet.define();
    }
    Decoration2.Range = Range;
    ;
    return Decoration2;
  })({});
  var tagShape = /* @__PURE__ */ GardState.Facet.define();
  var tagWrapper = /* @__PURE__ */ GardState.Facet.define();
  var tagWidget = /* @__PURE__ */ GardState.Facet.define();
  var tagAttribute = /* @__PURE__ */ GardState.Facet.define();
  function memo(f) {
    let map = /* @__PURE__ */ new WeakMap();
    return (arg) => {
      let found = map.get(arg);
      if (found === void 0)
        map.set(arg, found = f(arg));
      return found;
    };
  }
  function addMarkAttributes(shape, tag) {
    let attrs;
    for (let mark of tag.marks) {
      if (mark.type.attribute && (mark.spanning || !tag.isText)) {
        let { get, target } = mark.type.attribute;
        let markAttrs = get(mark.value);
        if (markAttrs.length) {
          if (target && shape instanceof Elt)
            shape = shape.addAttrs(markAttrs, target);
          else
            attrs = attrs ? Attributes.merge(attrs, markAttrs) : markAttrs;
        }
      }
    }
    return attrs ? addAttrs(shape, attrs, tag.type.isInline) : shape;
  }
  function addAttrs(shape, attrs, inline) {
    return shape instanceof Elt ? shape.addAttrs(attrs) : Elt.create(inline ? "span" : "div", attrs, [shape]);
  }
  function applyDeco(shape, deco, tag) {
    if (deco instanceof AttributeDecoration) {
      return deco.selector && shape instanceof Elt ? shape.addAttrs(deco.attrs, deco.selector) : addAttrs(shape, deco.attrs, tag.type.isInline);
    } else if (deco instanceof WrapperDecoration) {
      return deco.selector && shape instanceof Elt ? shape.wrap(deco.elt, deco.selector) : deco.elt.fill([shape]);
    }
    return shape;
  }
  var baseTagShape = /* @__PURE__ */ memo((tag) => {
    return addMarkAttributes(tag.is(Leaf.Text) ? Widget.EditableText.of(tag.param) : tag.type.shape.create(tag.param), tag);
  });
  var AttributeRangeDecoration = class _AttributeRangeDecoration extends Decoration.Range {
    attribute;
    value;
    constructor(attribute, value, options) {
      super(options);
      this.attribute = attribute;
      this.value = value;
    }
    eq(other) {
      return this == other || other instanceof _AttributeRangeDecoration && other.attribute == this.attribute && other.value == this.value && other.inc == this.inc;
    }
  };
  var WrapperRangeDecoration = class _WrapperRangeDecoration extends Decoration.Range {
    elt;
    rank;
    spanning;
    constructor(element, spec) {
      super(spec);
      let { attributes } = spec;
      this.rank = Math.max(0, Math.min(spec.rank ?? 100));
      this.spanning = spec.spanning !== false;
      this.elt = Elt.create(element, attributes ? Attributes.read(attributes) : Attributes.none, Elt.hole);
    }
    eq(other) {
      return this == other || other instanceof _WrapperRangeDecoration && other.elt.eq(this.elt) && other.rank == this.rank && other.spanning == this.spanning && other.inc == this.inc;
    }
  };
  var ShapeDecoration = class _ShapeDecoration extends Decoration.Point {
    shape;
    constructor(shape) {
      super();
      this.shape = shape;
    }
    eq(other) {
      return this == other || other instanceof _ShapeDecoration && other.shape.eq(this.shape);
    }
    get trackMode() {
      return "after";
    }
    get side() {
      return 1e9;
    }
  };
  var WidgetDecoration = class _WidgetDecoration extends Decoration.Point {
    widget;
    side;
    trackMode;
    constructor(widget, side, trackMode) {
      super();
      this.widget = widget;
      this.side = side;
      this.trackMode = trackMode;
      if (side >= 1e9)
        throw new Error("Invalid widget side");
    }
    eq(other) {
      return this == other || other instanceof _WidgetDecoration && other.widget.eq(this.widget) && other.side == this.side && other.trackMode == this.trackMode;
    }
  };
  function selectorEq(a, b) {
    return a ? !!b && a.eq(b) : !b;
  }
  var AttributeDecoration = class _AttributeDecoration extends Decoration.Point {
    attrs;
    selector;
    constructor(attrs, selector) {
      super();
      this.attrs = attrs;
      this.selector = selector;
    }
    eq(other) {
      return this == other || other instanceof _AttributeDecoration && Attributes.eq(other.attrs, this.attrs) && selectorEq(other.selector, this.selector);
    }
    get trackMode() {
      return "after";
    }
    get side() {
      return 1e9;
    }
  };
  var WrapperDecoration = class _WrapperDecoration extends Decoration.Point {
    elt;
    selector;
    constructor(elt, selector) {
      super();
      this.elt = elt;
      this.selector = selector;
    }
    eq(other) {
      return this == other || other instanceof _WrapperDecoration && other.elt.eq(this.elt) && selectorEq(other.selector, this.selector);
    }
    get trackMode() {
      return "after";
    }
    get side() {
      return 1e9;
    }
  };
  var nodeSelectionDeco = /* @__PURE__ */ Decoration.Point.attributes({ class: "wg-selected-node" });
  function nodeSelection(state) {
    if (state.selection instanceof GardSelection.Node)
      return PointSet.create([[state.selection.from, nodeSelectionDeco]]);
    return PointSet.empty;
  }
  function findAbove(array, start, n) {
    let from = start, to = array.length;
    for (; ; ) {
      if (from == to)
        return from;
      let mid = from + to >> 1;
      if (array[mid] > n)
        to = mid;
      else
        from = mid + 1;
    }
  }
  var none4 = [];
  var PointSet = class _PointSet {
    values;
    positions;
    constructor(values, positions) {
      this.values = values;
      this.positions = positions;
    }
    get length() {
      return this.positions.length;
    }
    map(changes) {
      if (changes.empty)
        return this;
      let positions = this.positions.slice();
      let pos = 0, i = 0;
      let deleted = [], deletions = 0;
      changes.iterGaps((fromA, toA, fromB) => {
        let off = fromB - fromA, end = toA - 1;
        if (end > pos) {
          let nextI = findAbove(positions, i, end);
          if (off)
            for (; i < nextI; i++)
              positions[i] += off;
          else
            i = nextI;
          pos = end;
        }
      }, (_fromA, toA) => {
        let nextI = findAbove(positions, i, toA + 1);
        for (; i < nextI; i++) {
          let mapped = changes.mapPos(positions[i], this.values[i].side < 0 ? -1 : 1, this.values[i].trackMode);
          if (mapped == null) {
            addDel(deleted, i);
            deletions++;
          } else
            positions[i] = mapped;
        }
        pos = toA + 1;
      });
      if (!deletions)
        return new _PointSet(this.values, positions);
      return new _PointSet(applyDel(deleted, deletions, this.values), applyDel(deleted, deletions, positions));
    }
    merge(other) {
      if (!this.length)
        return other;
      if (!other.length)
        return this;
      let posA = this.positions, posB = other.positions;
      let pos = new Array(posA.length, posB.length), values = new Array(pos.length);
      for (let i = 0, a = 0, b = 0; ; ) {
        let nextA = a < posA.length ? posA[a] : 1e9;
        let nextB = b < posB.length ? posB[b] : 1e9;
        let cmp = nextA - nextB || this.values[a].side - other.values[b].side;
        if (cmp < 0) {
          pos[i] = posA[a];
          values[i++] = this.values[a++];
        } else if (nextB < 1e9) {
          pos[i] = posB[b];
          values[i++] = other.values[b++];
        } else {
          return new _PointSet(values, pos);
        }
      }
    }
    compareRange(fromA, b, fromB, len, change) {
      let a = this, endB = fromB + len;
      if (a != b || fromA != fromB) {
        let iA = findAbove(a.positions, 0, fromA - 1), lA = a.positions.length;
        let iB = findAbove(b.positions, 0, fromB - 1), lB = b.positions.length;
        let off = fromB - fromA;
        let sameVal = a.values == b.values;
        for (; ; ) {
          let nextA = iA < lA ? a.positions[iA] + off : 1e9;
          let nextB = iB < lB ? b.positions[iB] : 1e9;
          let next = Math.min(nextA, nextB);
          if (next > endB)
            break;
          if (nextA == nextB) {
            if (!sameVal && !a.values[iA].eq(b.values[iB]))
              change(next, a.values[iA]);
            iA++;
            iB++;
          } else if (nextA < nextB) {
            change(nextA, a.values[iA++]);
          } else {
            change(nextB, b.values[iB++]);
          }
        }
      }
    }
    iter() {
      return new PointIterator(this);
    }
    at(pos) {
      let index = findAbove(this.positions, 0, pos - 1);
      return index < this.positions.length && this.positions[index] == pos ? this.values[index] : void 0;
    }
    static create(source) {
      if (typeof source != "function") {
        let array = source;
        source = (add2) => {
          for (let [pos, value] of array)
            add2(pos, value);
        };
      }
      let positions = [], values = [], curPos = -1, curVal;
      source((pos, value) => {
        if (curPos > pos || curPos == pos && curVal.side > value.side) {
          for (let i = positions.length; ; ) {
            positions[i] = positions[i - 1];
            values[i] = values[i - 1];
            if (--i < 0)
              break;
            if (!i-- || (positions[i] - pos || values[i].side - value.side) <= 0) {
              positions[i] = pos;
              values[i] = value;
              break;
            }
          }
        } else {
          positions.push(pos);
          values.push(value);
          curPos = pos;
          curVal = value;
        }
      });
      return new _PointSet(values, positions);
    }
    static empty = /* @__PURE__ */ (() => new _PointSet(none4, none4))();
  };
  var PointIterator = class {
    set;
    done = false;
    constructor(set) {
      this.set = set;
      this.fill(0);
    }
    fill(i) {
      this.i = i;
      if (i < this.set.positions.length) {
        this.pos = this.set.positions[i];
        this.value = this.set.values[i];
      } else {
        this.pos = 1e8;
        this.value = null;
        this.done = true;
      }
    }
    next() {
      if (!this.done)
        this.fill(this.i + 1);
    }
    get side() {
      return this.done ? 1 : this.value.side;
    }
    goto(pos) {
      this.done = false;
      this.fill(findAbove(this.set.positions, 0, pos - 1));
    }
  };
  function addDel(deleted, i) {
    let last = deleted.length - 1;
    if (last >= 0 && deleted[last] == i)
      deleted[last] = i + 1;
    else
      deleted.push(i, i + 1);
  }
  function applyDel(deleted, deletions, array) {
    let result = new Array(array.length - deletions);
    for (let iA = 0, iR = 0, iD = 0; ; ) {
      let last = iD == deleted.length, from = last ? array.length : deleted[iD++];
      while (iA < from)
        result[iR++] = array[iA++];
      if (last)
        return result;
      let to = deleted[iD++];
      iA += to - from;
    }
  }
  function getDecoSet(state) {
    let set = { points: /* @__PURE__ */ new Map(), ranges: /* @__PURE__ */ new Map() };
    for (let src of state.facet(Decoration.Point.source))
      set.points.set(src, src(state));
    for (let src of state.facet(Decoration.Range.source))
      set.ranges.set(src, src(state));
    return set;
  }
  var RangeSet = class _RangeSet {
    values;
    from;
    to;
    constructor(values, from, to) {
      this.values = values;
      this.from = from;
      this.to = to;
    }
    get length() {
      return this.from.length;
    }
    map(changes) {
      if (changes.empty || !this.length)
        return this;
      let from = this.from.slice(), to = this.to.slice();
      let pos = 0, i = 0;
      let deleted = [], deletions = 0;
      changes.iterGaps((fromA, toA, fromB) => {
        let off = fromB - fromA, end = toA - 1;
        if (end > pos) {
          let nextI = findAbove(from, i, end);
          if (off)
            for (; i < nextI; i++) {
              from[i] += off;
              to[i] += off;
            }
          else
            i = nextI;
          pos = end;
        }
      }, (_fromA, toA) => {
        let nextI = findAbove(to, i, toA + 1);
        for (; i < nextI; i++) {
          let value = this.values[i];
          let mappedFrom = changes.mapPos(from[i], value.inclusiveStart ? -1 : 1);
          let mappedTo = changes.mapPos(to[i], value.inclusiveEnd ? 1 : -1);
          if (mappedFrom >= mappedTo) {
            addDel(deleted, i);
            deletions++;
          } else {
            from[i] = mappedFrom;
            to[i] = mappedTo;
          }
        }
        pos = toA + 1;
      });
      if (!deletions)
        return new _RangeSet(this.values, from, to);
      return new _RangeSet(applyDel(deleted, deletions, this.values), applyDel(deleted, deletions, from), applyDel(deleted, deletions, to));
    }
    iter() {
      return new RangeIterator(this);
    }
    compareRange(fromA, b, fromB, len, change) {
      let a = this, toB = fromB + len;
      if (a != b || fromA != fromB) {
        let iA = findAbove(a.from, 0, fromA - 1), lA = a.from.length;
        let iB = findAbove(b.from, 0, fromB - 1), lB = b.from.length;
        let off = fromB - fromA;
        let sameVals = a.values == b.values;
        for (; ; ) {
          let [startA, endA] = iA < lA ? [a.from[iA] + off, a.to[iA] + off] : [1e9, 1e9];
          let [startB, endB] = iB < lB ? [b.from[iB], b.to[iB]] : [1e9, 1e9];
          let start = Math.min(startA, startB);
          if (start > toB)
            break;
          if (startA == startB) {
            if (endA != endB || !sameVals && !a.values[iA].eq(b.values[iB]))
              change(start, Math.max(endA, endB));
            iA++;
            iB++;
          } else if (startA < startB) {
            change(startA, endA);
            iA++;
          } else {
            change(startB, endB);
            iB++;
          }
        }
      }
    }
    static create(source) {
      if (typeof source != "function") {
        let array = source;
        source = (add2) => {
          for (let [from2, to2, value] of array)
            add2(from2, to2, value);
        };
      }
      let from = [], to = [], values = [], curPos = -1;
      source((f, t, value) => {
        if (f >= t)
          throw new Error("Ranges cannot be empty");
        if (f < curPos)
          throw new Error("Ranges must be added in order and cannot overlap");
        from.push(f);
        to.push(t);
        values.push(value);
      });
      return new _RangeSet(values, from, to);
    }
    static empty = /* @__PURE__ */ (() => new _RangeSet(none4, none4, none4))();
  };
  var RangeIterator = class {
    set;
    done = false;
    constructor(set) {
      this.set = set;
      this.fill(0);
    }
    fill(i) {
      this.i = i;
      if (i < this.set.from.length) {
        this.from = this.set.from[i];
        this.to = this.set.to[i];
        this.value = this.set.values[i];
      } else {
        this.from = this.to = 1e8;
        this.value = null;
        this.done = true;
      }
    }
    next() {
      if (!this.done)
        this.fill(this.i + 1);
    }
    goto(pos) {
      this.done = false;
      this.fill(findAbove(this.set.to, 0, pos));
    }
  };
  function addRange(ranges, from, to) {
    let last = ranges.length - 1;
    if (last < 0 || ranges[last] < from)
      ranges.push(from, to);
    else
      ranges[last] = Math.max(to, ranges[last]);
  }
  function joinRanges(ranges) {
    if (ranges.length == 1)
      return ranges[0];
    let result = [], index = ranges.map(() => 0);
    for (; ; ) {
      let minI = -1, minFrom = -1;
      for (let i = 0; i < ranges.length; i++) {
        let idx2 = index[i], set2 = ranges[i];
        if (idx2 < set2.length && (minI < 0 || set2[idx2] < minFrom)) {
          minI = i;
          minFrom = set2[idx2];
        }
      }
      if (minI < 0)
        return result;
      let idx = index[minI], set = ranges[minI];
      addRange(result, set[idx], set[idx + 1]);
      index[minI] += 2;
    }
  }
  function compareDecoSet(setA, setB, cmp) {
    for (let [srcA, valA] of setA)
      cmp(valA, setB.get(srcA) || null);
    for (let [srcB, valB] of setB)
      if (!setA.has(srcB))
        cmp(null, valB);
  }
  function compareGlobal(stateA, stateB, facet) {
    return stateA.facet(facet) != stateB.facet(facet);
  }
  function findChangedRanges(prevState, prevDeco, state, deco, sections) {
    let result = [];
    let globalChange = compareGlobal(prevState, state, tagShape) || compareGlobal(prevState, state, tagWidget) || compareGlobal(prevState, state, tagWrapper) || compareGlobal(prevState, state, tagAttribute);
    let shapeChanges = [];
    for (let i = 0, posA = 0, posB = 0; i < sections.length; ) {
      let len = sections[i++], ins = sections[i++];
      if (ins == -1 && globalChange) {
        addSection2(result, len, -2);
      } else if (ins == -1) {
        let endB = posB + len;
        let cur = [], curPos = 0, ranges = [cur];
        let add2 = (from, to) => {
          if (from < curPos) {
            ranges.push(cur = []);
            curPos = 0;
          }
          addRange(cur, from, to);
          curPos = to;
        };
        compareDecoSet(prevDeco.ranges, deco.ranges, (a, b) => {
          (a || RangeSet.empty).compareRange(posA, b || RangeSet.empty, posB, len, add2);
        });
        compareDecoSet(prevDeco.points, deco.points, (a, b) => {
          (a || PointSet.empty).compareRange(posA, b || PointSet.empty, posB, len, (pos2, val) => {
            add2(pos2, Math.min(pos2 + (val instanceof WidgetDecoration ? 0 : 1), endB));
            if (val instanceof ShapeDecoration && !globalChange)
              shapeChanges.push(pos2);
          });
        });
        let joined = joinRanges(ranges), pos = posB, end = pos + len, j = 0;
        if (joined.length && joined[0] == pos && joined[1] == pos && result.length && result[result.length - 1] != -1)
          j = 2;
        for (; j < joined.length; ) {
          let from = Math.max(pos, joined[j++]), to = Math.min(end, joined[j++]);
          if (from > pos)
            addSection2(result, from - pos, -1);
          if (from <= to)
            addSection2(result, to - from, -2);
          pos = to;
        }
        if (pos < end)
          addSection2(result, end - pos, -1);
        posA += len;
        posB = endB;
      } else {
        posA += len;
        posB += ins < 0 ? len : ins;
        if (ins >= 0 && result.length && result[result.length - 2] == 0 && result[result.length - 1] == -2) {
          result.pop();
          result.pop();
        }
        addSection2(result, len, ins);
      }
    }
    if (shapeChanges.length)
      return addAtomicityChanges(result, prevState, shapeChanges);
    return result;
  }
  function addAtomicityChanges(sections, prev, changes) {
    let added = [];
    let scan = prev.doc.resolve(0), last = -1, sectionPos = 0, sectionI = 0, off = 0;
    for (let posB of changes.sort()) {
      if (posB == last)
        continue;
      last = posB;
      while (posB >= sectionPos) {
        let len = sections[sectionI++], ins = sections[sectionI++];
        if (ins < 0) {
          sectionPos += len;
        } else {
          sectionPos += ins;
          off += len - ins;
        }
      }
      let posA = posB - off;
      if (scan.pos < posA)
        scan = scan.advance(posA - scan.pos);
      let node = scan.nodeAfter;
      if (!node)
        continue;
      added.push(posA, posA + node.length);
    }
    if (!added.length)
      return sections;
    let changedSections = [], pos = 0;
    for (let i = 0; i < added.length; ) {
      let from = added[i++], to = added[i++];
      if (from > pos)
        changedSections.push(from - pos, -1);
      changedSections.push(to - from, to - from);
      pos = to;
    }
    if (pos < prev.doc.length)
      changedSections.push(prev.doc.length - pos, -1);
    return ChangeSet.composeSections(changedSections, sections);
  }
  function addSection2(sections, len, ins) {
    let last = sections.length - 1;
    if (last >= 0) {
      let lastIns = sections[last];
      if (lastIns >= 0 && ins >= 0) {
        sections[last - 1] += len;
        sections[last] += ins;
        return;
      }
      if (lastIns < 0 && lastIns == ins) {
        sections[last - 1] += len;
        return;
      }
    }
    sections.push(len, ins);
  }
  var HeapIterator = class {
    rangeHeap;
    pointHeap;
    end;
    active = [];
    from;
    to;
    point = null;
    done = false;
    constructor(rangeHeap, pointHeap, start, end) {
      this.rangeHeap = rangeHeap;
      this.pointHeap = pointHeap;
      this.end = end;
      for (let i = rangeHeap.length >> 1; i >= 0; i--)
        bubble(rangeHeap, i, cmpRangeFrom);
      for (let i = pointHeap.length >> 1; i >= 0; i--)
        bubble(pointHeap, i, cmpPoint);
      this.from = this.to = start;
    }
    next() {
      if (this.done)
        return this;
      if (this.point) {
        this.point.next();
        if (this.point.done)
          popHeap(this.pointHeap, cmpPoint);
        else
          bubble(this.pointHeap, 0, cmpPoint);
        this.point = null;
      }
      let { rangeHeap, pointHeap, active } = this;
      while (true) {
        let [startPos, startSide] = rangeHeap.length ? [rangeHeap[0].from, rangeHeap[0].value.inclusiveStart ? -1 : 1] : [1e9, 0];
        let [endPos, endSide] = active.length ? [active[0].to, active[0].value.inclusiveEnd ? 1 : -1] : [1e9, 0];
        let { pos: pointPos, side: pointSide } = pointHeap.length ? pointHeap[0] : { pos: 1e9, side: 1 };
        let nextPos = Math.min(startPos, endPos, pointPos);
        if (this.to == this.end && nextPos > this.to) {
          this.done = true;
          break;
        } else if (nextPos > this.to) {
          this.from = this.to;
          this.to = Math.min(this.end, nextPos);
          break;
        } else if (pointPos == nextPos && (startPos > pointPos || pointSide < 0) && (endPos > pointPos || pointSide < 0)) {
          this.point = this.pointHeap[0];
          this.from = this.to = pointPos;
          break;
        } else if ((startPos - endPos || startSide - endSide) < 0) {
          let first = rangeHeap[0];
          sink(active, active.push(first) - 1, cmpRangeTo);
          popHeap(rangeHeap, cmpRangeFrom);
        } else {
          let first = active[0];
          first.next();
          if (!first.done)
            sink(rangeHeap, rangeHeap.push(first) - 1, cmpRangeFrom);
          popHeap(active, cmpRangeTo);
        }
      }
      return this;
    }
  };
  function bubble(heap, index, cmp) {
    for (let cur = heap[index]; ; ) {
      let childIndex = (index << 1) + 1;
      if (childIndex >= heap.length)
        break;
      let child = heap[childIndex];
      if (childIndex + 1 < heap.length && cmp(child, heap[childIndex + 1]) >= 0) {
        child = heap[childIndex + 1];
        childIndex++;
      }
      if (cmp(cur, child) < 0)
        break;
      heap[childIndex] = cur;
      heap[index] = child;
      index = childIndex;
    }
  }
  function sink(heap, index, cmp) {
    let elt = heap[index];
    while (index > 0) {
      let parent = index - 1 >> 1;
      if (cmp(heap[parent], elt) < 0)
        break;
      heap[index] = heap[parent];
      heap[parent] = elt;
      index = parent;
    }
  }
  function popHeap(heap, cmp) {
    let last = heap.pop();
    if (heap.length) {
      heap[0] = last;
      bubble(heap, 0, cmp);
    }
  }
  function cmpBool(a, b) {
    return a ? b ? 0 : 1 : b ? -1 : 0;
  }
  function cmpRangeFrom(a, b) {
    return a.from - b.from || cmpBool(b.value.inclusiveStart, a.value.inclusiveStart);
  }
  function cmpRangeTo(a, b) {
    return a.to - b.to || cmpBool(a.value.inclusiveEnd, b.value.inclusiveEnd);
  }
  function cmpPoint(a, b) {
    return a.pos - b.pos || a.side - b.side;
  }
  function nodeWrappers(schema, tag, active, atom) {
    let wrappers;
    for (let mark of tag.marks)
      if (mark.type.element)
        (wrappers || (wrappers = [])).push(mark);
    if (active.length) {
      for (let cur of active) {
        let val = cur.value;
        if (val instanceof WrapperRangeDecoration && tagScope(tag, atom) & val.scope && (!val.query || schema.matchNode(tag.type, val.query)))
          (wrappers || (wrappers = [])).push(val);
      }
    }
    if (!wrappers)
      return none4;
    if (wrappers.length > 1)
      wrappers.sort((a, b) => (a.spanning == b.spanning ? 0 : a.spanning ? -1 : 1) || a.rank - b.rank);
    return wrappers;
  }
  function tagScope(tag, atom) {
    return 4 | (atom ? 1 | (tag.type.isInline ? 2 : 0) : 0);
  }
  function renderWrapper(src) {
    if (src instanceof WrapperRangeDecoration)
      return src.elt;
    return renderMarkWrapper(src);
  }
  var renderMarkWrapper = /* @__PURE__ */ memo((mark) => {
    let shape = mark.type.element;
    return Elt.create(shape.name, shape.attrs(mark.value), Elt.hole);
  });
  var DecoIterator = class {
    state;
    decoSet;
    tagShapes;
    globalWidgets;
    globalWrappers;
    globalAttrs;
    schema;
    pos;
    rangeIter = [];
    pointIter = [];
    constructor(state, decoSet) {
      this.state = state;
      this.decoSet = decoSet;
      this.tagShapes = state.facet(tagShape);
      this.globalWidgets = state.facet(tagWidget);
      this.globalWrappers = state.facet(tagWrapper);
      this.globalAttrs = state.facet(tagAttribute);
      this.pos = state.doc.resolve(0);
      this.schema = state.schema;
      for (let s of state.facet(Decoration.Range.source)) {
        let set = decoSet.ranges.get(s);
        if (set?.length)
          this.rangeIter.push(set.iter());
      }
      for (let s of state.facet(Decoration.Point.source)) {
        let set = decoSet.points.get(s);
        if (set?.length)
          this.pointIter.push(set.iter());
      }
    }
    widgets(tag, place, walker) {
      for (let src of this.globalWidgets) {
        if (src.place == place && tag.type == src.type) {
          let widget = src.widget(tag);
          if (widget)
            walker.widget(widget, place == 0 || place == 3 ? 1 : -1);
        }
      }
    }
    walk(from, inclusiveStart, to, walker) {
      for (let i of this.rangeIter)
        i.goto(from);
      for (let i of this.pointIter)
        i.goto(inclusiveStart ? from : from + 1);
      let iter = new HeapIterator(this.rangeIter.filter((i) => !i.done), this.pointIter.filter((i) => !i.done), from, to);
      let pos = this.pos.advance(from - this.pos.pos), started = inclusiveStart;
      let atomParent;
      for (let p = pos.parent; p; p = p.parent)
        if (this.state.isAtom(p.node.type))
          atomParent = p;
      let pendingDeco = [], pendingPos = -1;
      let pendingShape = null, pendingShapeSet = null;
      let wrap = {
        skip: (node, pos2) => {
          if (started)
            this.widgets(node.tag, 0, walker);
          else
            started = true;
          let hasPending = pendingPos == pos2 && !node.isText;
          let shape = hasPending && pendingShape ? pendingShape.shape : this.tagShape(node.tag, iter.active);
          if (hasPending)
            for (let deco of pendingDeco)
              shape = applyDeco(shape, deco, node.tag);
          if (shape.hasContent)
            throw new Error("Leaf nodes shapes shouldn't have a content hole");
          walker.node(node, shape, nodeWrappers(this.schema, node.tag, iter.active, true), void 0);
          this.widgets(node.tag, 1, walker);
        },
        enterPlot: (node, pos2) => {
          if (started)
            this.widgets(node.tag, 0, walker);
          else
            started = true;
          let shape = pendingShape && pendingPos == pos2 ? pendingShape.shape : this.tagShape(node.tag, iter.active);
          if (pendingPos == pos2)
            for (let deco of pendingDeco)
              shape = applyDeco(shape, deco, node.tag);
          let wrappers = nodeWrappers(this.schema, node.tag, iter.active, !shape.hasContent);
          let atom = !shape.hasContent;
          if (atom)
            walker.node(node, shape, wrappers, pos2 + node.length > to ? to - pos2 : void 0);
          else
            walker.enter(node, shape, wrappers);
          this.widgets(node.tag, 2, walker);
          return !atom;
        },
        leavePlot: (tag) => {
          if (started)
            this.widgets(tag, 3, walker);
          else
            started = true;
          walker.leave();
          this.widgets(tag, 1, walker);
        }
      };
      if (inclusiveStart) {
        let before = pos.nodeBefore;
        if (before)
          this.widgets(before.tag, 1, walker);
        else
          this.widgets(pos.parent.node.tag, 2, walker);
      }
      for (; !iter.next().done; ) {
        if (atomParent) {
          let end = Math.min(to, atomParent.after), done = atomParent.after <= to;
          walker.nodePart(atomParent.node, end - pos.pos, done);
          pos = pos.advance(end - pos.pos);
          if (done)
            this.widgets(atomParent.node.tag, 1, walker);
          atomParent = void 0;
          while (iter.point && iter.from < end)
            iter.next();
        } else if (iter.point) {
          let value = iter.point.value;
          if (value instanceof WidgetDecoration) {
            walker.widget(value.widget, value.side);
          } else {
            if (pendingPos < pos.pos) {
              pendingDeco.length = 0;
              pendingShape = null;
              pendingPos = pos.pos;
            }
            if (value instanceof ShapeDecoration && (!pendingShape || compareSetPrec(pendingShapeSet, iter.point.set, this.pointIter))) {
              pendingShape = value;
              pendingShapeSet = iter.point.set;
            } else {
              pendingDeco.push(value);
            }
          }
        } else {
          pos = pos.walk(iter.to - iter.from, wrap);
        }
      }
      if (pos.pos < to)
        pos = pos.walk(to - pos.pos, wrap);
      if (atomParent) {
        walker.nodePart(atomParent.node, 0, atomParent.after == to);
      } else {
        let after = pos.nodeAfter;
        if (after)
          this.widgets(after.tag, 0, walker);
        else
          this.widgets(pos.parent.node.tag, 3, walker);
      }
      this.pos = pos;
    }
    tagShape(tag, active) {
      let shape;
      if (!tag.is(Leaf.Text)) {
        for (let src of this.tagShapes)
          if (src.type == tag.type) {
            shape = src.shape(tag);
            break;
          }
      }
      if (!shape)
        shape = baseTagShape(tag);
      let add2;
      for (let src of this.globalAttrs)
        if (tag.type == src.type) {
          if (src.target && shape instanceof Elt)
            shape = shape.addAttrs([src.attr, src.value(tag)], src.target);
          else
            Attributes.push(add2 || (add2 = []), src.attr, src.value(tag));
        }
      let scope = tagScope(tag, !shape.hasContent);
      for (let { type, elt, target } of this.globalWrappers)
        if (tag.type == type) {
          shape = target && shape instanceof Elt ? shape.wrap(elt, target) : elt.fill([shape]);
        }
      for (let iter of active) {
        let deco = iter.value;
        if (deco instanceof AttributeRangeDecoration && scope & deco.scope && (!deco.query || this.schema.matchNode(tag.type, deco.query)))
          Attributes.push(add2 || (add2 = []), deco.attribute, deco.value);
      }
      if (add2) {
        if (shape instanceof Elt)
          shape = Elt.create(shape.tagName, Attributes.merge(shape.attrs, add2), shape.children);
        else
          shape = Elt.create(tag.type.isBlock ? "div" : "span", add2, [shape]);
      }
      return shape;
    }
  };
  function compareSetPrec(setA, setB, array) {
    if (setA != setB)
      for (let i of array) {
        if (i.set == setA)
          return -1;
        if (i.set == setB)
          return 1;
      }
    return 0;
  }
  function eqArray2(a, b) {
    if (!a || !b)
      return a == b;
    if (a == b)
      return true;
    if (a.length != b.length)
      return false;
    for (let i = 0; i < a.length; i++)
      if (!a[i].eq(b[i]))
        return false;
    return true;
  }
  var exceptionSink = /* @__PURE__ */ GardState.Facet.define();
  function logException(state, exception, context) {
    let handler = state.facet(exceptionSink);
    if (handler.length)
      handler[0](exception);
    else if (window.onerror)
      window.onerror(String(exception), context, void 0, void 0, exception);
    else if (context)
      console.error(context + ":", exception);
    else
      console.error(exception);
  }
  function getSelection(root) {
    let target;
    if (root.nodeType == 11) {
      target = root.getSelection ? root : root.ownerDocument;
    } else {
      target = root;
    }
    return target.getSelection();
  }
  function hasSelection(dom, selection) {
    if (!selection.focusNode)
      return false;
    try {
      return dom.contains(selection.focusNode);
    } catch (_) {
      return false;
    }
  }
  function isEquivalentPosition(node, off, targetNode, targetOff) {
    return targetNode ? scanFor(node, off, targetNode, targetOff, -1) || scanFor(node, off, targetNode, targetOff, 1) : false;
  }
  function domIndex(node) {
    for (var index = 0; ; index++) {
      node = node.previousSibling;
      if (!node)
        return index;
    }
  }
  function rmDOM(dom) {
    let next = dom.nextSibling;
    dom.remove();
    return next;
  }
  function isBlockElement(node) {
    let tile = node.wgTile;
    if (tile?.node)
      return tile.node.type.isBlock;
    return node.nodeType == 1 && /^(DIV|P|LI|UL|OL|BLOCKQUOTE|DD|DT|H\d|SECTION|PRE)$/.test(node.nodeName);
  }
  function isBlocking(node) {
    let tile = node.wgTile;
    if (tile)
      return !tile.isText && (tile.isNodeOuter || tile.isPoint && tile.flags & 96);
    return node.nodeType == 1 && node.contentEditable == "false";
  }
  function scanFor(node, off, targetNode, targetOff, dir) {
    for (; ; ) {
      if (node == targetNode && off == targetOff)
        return true;
      if (off == (dir < 0 ? 0 : maxOffset(node))) {
        if (isBlockElement(node))
          return false;
        let parent = node.parentNode;
        if (!parent || parent.nodeType != 1)
          return false;
        off = domIndex(node) + (dir < 0 ? 0 : 1);
        node = parent;
      } else if (node.nodeType == 1) {
        node = node.childNodes[off + (dir < 0 ? -1 : 0)];
        if (isBlocking(node))
          return false;
        off = dir < 0 ? maxOffset(node) : 0;
      } else {
        return false;
      }
    }
  }
  function maxOffset(node) {
    return node.nodeType == 3 ? node.nodeValue.length : node.childNodes.length;
  }
  function windowRect(win) {
    let vp = win.visualViewport;
    return new DOMRect(0, 0, vp ? vp.width : win.innerWidth, vp ? vp.height : win.innerHeight);
  }
  function getScale(elt, rect2) {
    let scaleX = rect2.width / elt.offsetWidth;
    let scaleY = rect2.height / elt.offsetHeight;
    if (scaleX > 0.995 && scaleX < 1.005 || !isFinite(scaleX) || Math.abs(rect2.width - elt.offsetWidth) < 1)
      scaleX = 1;
    if (scaleY > 0.995 && scaleY < 1.005 || !isFinite(scaleY) || Math.abs(rect2.height - elt.offsetHeight) < 1)
      scaleY = 1;
    return { scaleX, scaleY };
  }
  function scrollRectIntoView(dom, rect2, side, x, y, xMargin, yMargin, ltr) {
    let doc2 = dom.ownerDocument, win = doc2.defaultView || window;
    for (let cur = dom, stop = false; cur && !stop; ) {
      if (cur.nodeType == 1) {
        let bounding, top2 = cur == doc2.body;
        let scaleX = 1, scaleY = 1;
        if (top2) {
          bounding = windowRect(win);
        } else {
          if (/^(fixed|sticky)$/.test(getComputedStyle(cur).position))
            stop = true;
          if (cur.scrollHeight <= cur.clientHeight && cur.scrollWidth <= cur.clientWidth) {
            cur = cur.assignedSlot || cur.parentNode;
            continue;
          }
          let rect3 = cur.getBoundingClientRect();
          ({ scaleX, scaleY } = getScale(cur, rect3));
          bounding = new DOMRect(rect3.left, rect3.top, cur.clientWidth * scaleX, cur.clientHeight * scaleY);
        }
        let moveX = 0, moveY = 0;
        if (y == "nearest") {
          if (rect2.top < bounding.top) {
            moveY = -(bounding.top - rect2.top + yMargin);
            if (side > 0 && rect2.bottom > bounding.bottom + moveY)
              moveY = rect2.bottom - bounding.bottom + moveY + yMargin;
          } else if (rect2.bottom > bounding.bottom) {
            moveY = rect2.bottom - bounding.bottom + yMargin;
            if (side < 0 && rect2.top - moveY < bounding.top)
              moveY = -(bounding.top + moveY - rect2.top + yMargin);
          }
        } else {
          let rectHeight = rect2.bottom - rect2.top, boundingHeight = bounding.bottom - bounding.top;
          let targetTop = y == "center" && rectHeight <= boundingHeight ? rect2.top + rectHeight / 2 - boundingHeight / 2 : y == "start" || y == "center" && side < 0 ? rect2.top - yMargin : rect2.bottom - boundingHeight + yMargin;
          moveY = targetTop - bounding.top;
        }
        if (x == "nearest") {
          if (rect2.left < bounding.left) {
            moveX = -(bounding.left - rect2.left + xMargin);
            if (side > 0 && rect2.right > bounding.right + moveX)
              moveX = rect2.right - bounding.right + moveX + xMargin;
          } else if (rect2.right > bounding.right) {
            moveX = rect2.right - bounding.right + xMargin;
            if (side < 0 && rect2.left < bounding.left + moveX)
              moveX = -(bounding.left + moveX - rect2.left + xMargin);
          }
        } else {
          let targetLeft = x == "center" ? rect2.left + (rect2.right - rect2.left) / 2 - (bounding.right - bounding.left) / 2 : x == "start" == ltr ? rect2.left - xMargin : rect2.right - (bounding.right - bounding.left) + xMargin;
          moveX = targetLeft - bounding.left;
        }
        if (moveX || moveY) {
          if (top2) {
            win.scrollBy(moveX, moveY);
          } else {
            let movedX = 0, movedY = 0;
            if (moveY) {
              let start = cur.scrollTop;
              cur.scrollTop += moveY / scaleY;
              movedY = (cur.scrollTop - start) * scaleY;
            }
            if (moveX) {
              let start = cur.scrollLeft;
              cur.scrollLeft += moveX / scaleX;
              movedX = (cur.scrollLeft - start) * scaleX;
            }
            rect2 = {
              left: rect2.left - movedX,
              top: rect2.top - movedY,
              right: rect2.right - movedX,
              bottom: rect2.bottom - movedY
            };
            if (movedX && Math.abs(movedX - moveX) < 1)
              x = "nearest";
            if (movedY && Math.abs(movedY - moveY) < 1)
              y = "nearest";
          }
        }
        if (top2)
          break;
        cur = cur.assignedSlot || cur.parentNode;
      } else if (cur.nodeType == 11) {
        cur = cur.host;
      } else {
        break;
      }
    }
  }
  function scrollableParents(dom) {
    let doc2 = dom.ownerDocument, x, y;
    for (let cur = dom.parentNode; cur; ) {
      if (cur == doc2.body || x && y) {
        break;
      } else if (cur.nodeType == 1) {
        if (!y && cur.scrollHeight > cur.clientHeight)
          y = cur;
        if (!x && cur.scrollWidth > cur.clientWidth)
          x = cur;
        cur = cur.assignedSlot || cur.parentNode;
      } else if (cur.nodeType == 11) {
        cur = cur.host;
      } else {
        break;
      }
    }
    return { x, y };
  }
  var DOMSelectionState = class {
    anchorNode = null;
    anchorOffset = 0;
    focusNode = null;
    focusOffset = 0;
    eq(domSel) {
      return this.anchorNode == domSel.anchorNode && this.anchorOffset == domSel.anchorOffset && this.focusNode == domSel.focusNode && this.focusOffset == domSel.focusOffset;
    }
    get empty() {
      return this.anchorNode == this.focusNode && this.anchorOffset == this.focusOffset;
    }
    setRange(range) {
      let { anchorNode, focusNode } = range;
      this.set(anchorNode, Math.min(range.anchorOffset, anchorNode ? maxOffset(anchorNode) : 0), focusNode, Math.min(range.focusOffset, focusNode ? maxOffset(focusNode) : 0));
    }
    set(anchorNode, anchorOffset, focusNode, focusOffset) {
      this.anchorNode = anchorNode;
      this.anchorOffset = anchorOffset;
      this.focusNode = focusNode;
      this.focusOffset = focusOffset;
    }
  };
  var scratchRange;
  function textRange(node, from, to = from) {
    let range = scratchRange || (scratchRange = document.createRange());
    range.setEnd(node, to);
    range.setStart(node, from);
    return range;
  }
  function clearScratchRange() {
    if (scratchRange) {
      scratchRange.detach();
      scratchRange = null;
    }
  }
  function nonZero(rect2) {
    return rect2.top < rect2.bottom || rect2.left < rect2.right;
  }
  function singleRect(target, bias, preferWide = false) {
    let rects = target.getClientRects();
    for (let i = bias < 0 ? 0 : rects.length - 1; bias < 0 ? i < rects.length : i >= 0; i -= bias) {
      let rect2 = rects[i];
      if (nonZero(rect2) && (!preferWide || rect2.width))
        return rect2;
    }
    return Array.prototype.find.call(rects, nonZero) || target.getBoundingClientRect();
  }
  function getRoot(node) {
    while (node) {
      if (node && (node.nodeType == 9 || node.nodeType == 11 && node.host))
        return node;
      node = node.assignedSlot || node.parentNode;
    }
    return null;
  }
  function textNodeBefore(startNode, startOffset) {
    for (let node = startNode, offset = startOffset; ; ) {
      if (node.nodeType == 3 && offset > 0) {
        return node;
      } else if (node.nodeType == 1 && offset > 0) {
        if (node.contentEditable == "false")
          return null;
        node = node.childNodes[offset - 1];
        offset = maxOffset(node);
      } else if (node.parentNode && !isBlockElement(node)) {
        offset = domIndex(node);
        node = node.parentNode;
      } else {
        return null;
      }
    }
  }
  function textNodeAfter(startNode, startOffset) {
    for (let node = startNode, offset = startOffset; ; ) {
      if (node.nodeType == 3 && offset < node.nodeValue.length) {
        return node;
      } else if (node.nodeType == 1 && offset < node.childNodes.length) {
        if (node.contentEditable == "false")
          return null;
        node = node.childNodes[offset];
        offset = 0;
      } else if (node.parentNode && !isBlockElement(node)) {
        offset = domIndex(node) + 1;
        node = node.parentNode;
      } else {
        return null;
      }
    }
  }
  var CoordPos = class _CoordPos {
    pos;
    target;
    side;
    vertOutside;
    constructor(pos, target, side, vertOutside) {
      this.pos = pos;
      this.target = target;
      this.side = side;
      this.vertOutside = vertOutside;
    }
    map(mapping) {
      let target = this.target == null ? null : mapping.mapPos(this.target, 1, "after");
      return new _CoordPos(mapping.mapPos(this.pos), target, this.side, this.vertOutside);
    }
    static create(pos, side, target = null, vertOutside = false) {
      return new _CoordPos(pos, target, side, vertOutside);
    }
  };
  var TilePos = class {
    tile;
    offset;
    pos;
    constructor(tile, offset, pos) {
      this.tile = tile;
      this.offset = offset;
      this.pos = pos;
    }
    get dom() {
      return this.tile.dom;
    }
  };
  var Tile = class {
    dom;
    parent = null;
    length = 0;
    flags;
    constructor(dom, flags) {
      this.dom = dom;
      this.flags = flags & -257;
      dom.wgTile = this;
    }
    get isAtom() {
      return false;
    }
    get isNodeOuter() {
      return false;
    }
    get isNodeInner() {
      return (this.flags & 1) > 0;
    }
    get isNode() {
      return this.isNodeOuter || (this.flags & 1) > 0;
    }
    get isPlotContent() {
      return (this.flags & 2) > 0;
    }
    get isText() {
      return false;
    }
    get isDoc() {
      return false;
    }
    get isWrapper() {
      return (this.flags & 8) > 0;
    }
    get isSpanning() {
      return false;
    }
    get isComposition() {
      return (this.flags & 128) > 0;
    }
    get isPoint() {
      return (this.flags & 16) > 0;
    }
    get node() {
      return null;
    }
    posBeforeChild(child, ownStart = this.posAtStart) {
      for (let i = 0, pos = ownStart; ; i++) {
        let cur = this.children[i];
        if (cur == child)
          return pos;
        pos += cur.length;
      }
    }
    get posBefore() {
      return this.parent.posBeforeChild(this);
    }
    get posAtStart() {
      return this.parent ? this.parent.posBeforeChild(this) + this.boundary : 0;
    }
    get posAfter() {
      return this.posBefore + this.length;
    }
    get posAtEnd() {
      return this.posAtStart + this.length - 2 * this.boundary;
    }
    get boundary() {
      return 0;
    }
    get firstChild() {
      return this.children.length ? this.children[0] : null;
    }
    get lastChild() {
      let last = this.children.length - 1;
      return last < 0 ? null : this.children[last];
    }
    handleEvent(event, wg) {
      return false;
    }
    get ignoreMutations() {
      return false;
    }
    toString() {
      return this.dom.nodeName + (this.children.length ? `(${this.children})` : "");
    }
    sync() {
    }
    connect() {
      for (let ch of this.children)
        ch.connect();
    }
    disconnect(reused) {
      if (!reused || reused.get(this) != 1)
        for (let ch of this.children)
          ch.disconnect(reused);
    }
    nearestNode() {
      let tile = this;
      while (!tile.node)
        tile = tile.parent;
      return tile;
    }
    posAtCoords(state, x, y) {
      let nodeTile = this.nearestNode();
      return nodeTile.posAtCoordsInner(nodeTile.posAtStart, state, x, y, null, 1);
    }
    static get(node) {
      return node.wgTile;
    }
  };
  var CompositeTile = class extends Tile {
    children = [];
    addChild(child) {
      if (this.flags & 256)
        throw new Error("Cannot add to a synced tile");
      if (this.flags & 4096 && !(child.flags & 2048)) {
        let i = this.children.length;
        while (i > 0 && this.children[i - 1].flags & 2048)
          i--;
        this.children.splice(i, 0, child);
      } else {
        this.children.push(child);
      }
      child.parent = this;
    }
    sync() {
      if (this.flags & 256)
        return;
      this.flags |= 256;
      let len = this.boundary * 2;
      for (let ch of this.children) {
        ch.sync();
        len += ch.length;
      }
      if (!(this.flags & 512))
        this.length = len;
      this.syncChildren();
    }
    syncChildren() {
      let prev = null, next = this.dom.firstChild;
      for (let child of this.children) {
        if (child.dom.parentNode == this.dom) {
          while (next && next != child.dom)
            next = rmDOM(next);
        } else {
          this.dom.insertBefore(child.dom, next);
        }
        prev = child.dom;
        next = prev.nextSibling;
      }
      while (next)
        next = rmDOM(next);
    }
    posAtCoordsInner(start, state, x, y, textblock, orientation) {
      let { node } = this, outerOrientation = orientation;
      if (node && node.isPlot) {
        orientation = node.type.orientation == "row" ? 0 : 1;
        if (node.isTextblock)
          textblock = TextblockMap.get(state, start, node);
        else if (node.type.isBlock)
          textblock = null;
      } else if (node && node.isText) {
        orientation = 0;
      }
      let result = this.isAtom || !this.children.length ? null : orientation == 1 ? this.posAtCoordsCol(start, state, x, y, textblock) : this.posAtCoordsRow(start, state, x, y, textblock);
      if (result)
        return result;
      let rect2 = this.dom.getBoundingClientRect();
      let after = outerOrientation == 0 ? x > (rect2.left + rect2.right) / 2 : y > (rect2.top + rect2.bottom) / 2;
      let target = this.node && this.node.type.isSelectable && x >= rect2.left && x <= rect2.right && y >= rect2.top && y <= rect2.bottom ? start : null;
      return CoordPos.create(start + (after ? this.length - 2 * this.boundary : 0), after ? -1 : 1, target);
    }
    posAtCoordsRow(start, state, x, y, textblock) {
      let result = rowScan(x, y, (add2) => {
        for (let child of this.children) {
          if (child.isPoint)
            continue;
          let rects, { dom } = child;
          if (dom.nodeType == 1)
            rects = dom.getClientRects();
          else if (dom.nodeType == 3)
            rects = textRange(dom, 0, dom.nodeValue.length).getClientRects();
          else
            continue;
          for (let i = 0; i < rects.length; i++)
            if (add2(rects[i], child))
              return;
        }
      });
      if (!result)
        return null;
      let { closest, rect: rect2 } = result;
      let pos = this.posBeforeChild(closest, start);
      return closest.posAtCoordsInner(pos + closest.boundary, state, x, Math.max(rect2.top, Math.min(rect2.bottom, y)), textblock, 0);
    }
    posAtCoordsCol(start, state, x, y, textblock) {
      let lastBot = -1;
      for (let child of this.children) {
        if (child.isPoint || child.dom.nodeType != 1)
          continue;
        let rect2 = child.dom.getBoundingClientRect();
        if (rect2.top > y)
          return CoordPos.create(this.posBeforeChild(child, start), y > (lastBot + rect2.top) / 2 ? 1 : -1);
        if (rect2.bottom >= y)
          return child.posAtCoordsInner(this.posBeforeChild(child, start) + child.boundary, state, x, y, textblock, 1);
      }
      return CoordPos.create(start + this.length - 2 * this.boundary, -1);
    }
  };
  function rowScan(x, y, scan) {
    let closest = null, closestDx = 1e8, closestRect = null;
    let above = null, below = null;
    scan((rect2, value) => {
      if (rect2.bottom < y) {
        if (!above || above.bottom < rect2.bottom)
          above = rect2;
      } else if (rect2.top > y) {
        if (!below || below.top > rect2.top)
          below = rect2;
      } else {
        let dx = rect2.left > x ? rect2.left - x : rect2.right < x ? x - rect2.right : 0;
        if (dx < closestDx) {
          closest = value;
          closestDx = dx;
          closestRect = rect2;
          return !dx;
        }
      }
      return false;
    });
    if (closestRect) {
      if (closestDx) {
        if (above && above.bottom > closestRect.top)
          return rowScan(x, above.bottom - 1, scan);
        if (below && below.top < closestRect.bottom)
          return rowScan(x, below.top + 1, scan);
      }
      return { closest, rect: closestRect };
    }
    let side = above && (!below || y - above.bottom < below.top - y) ? above : below;
    if (!side)
      return null;
    return rowScan(x, (side.top + side.bottom) / 2, scan);
  }
  function ltrAt(state, pos, assoc, textblock) {
    if (textblock === void 0) {
      let { textblockParent: block } = state.doc.resolve(pos);
      textblock = block ? TextblockMap.get(state, block.start, block.node) : null;
    }
    if (!textblock)
      return state.textLTR;
    let found = BidiSpan.find(textblock.order, textblock.toIndex(pos), assoc);
    return textblock.order[found].ltr;
  }
  var DocTile = class _DocTile extends CompositeTile {
    state;
    cursorWrapper;
    decoSet;
    constructor(state, dom, cursorWrapper, decoSet) {
      super(dom, 2);
      this.state = state;
      this.cursorWrapper = cursorWrapper;
      this.decoSet = decoSet;
    }
    static create(state, dom) {
      return new _DocTile(state, dom, null, { points: /* @__PURE__ */ new Map(), ranges: /* @__PURE__ */ new Map() }).updateRanges(state, getDecoSet(state), [0, state.doc.length], false);
    }
    get isDoc() {
      return true;
    }
    get node() {
      return this.state.doc;
    }
    update(state, changes, connected = false, composition) {
      let decoSet = getDecoSet(state);
      let changed = findChangedRanges(this.state, this.decoSet, state, decoSet, changes);
      return this.updateRanges(state, decoSet, changed, connected, composition);
    }
    updateRanges(state, decoSet, sections, connected, composition) {
      let wrapper = composition?.wrapCursor || null;
      if ((!sections.length || sections.length == 2 && sections[1] == -1) && eqArray2(wrapper, this.cursorWrapper))
        return this;
      if (composition) {
        let separated = separateComposition(sections, composition);
        if (!separated)
          composition = null;
        else
          sections = separated;
      }
      let builder = new ContentUpdate(state, this, new DecoIterator(state, decoSet), wrapper);
      for (let i = 0, posB = 0, startCovered = false; i < sections.length; ) {
        let len = sections[i++], ins = sections[i++];
        if (composition && posB == composition.fromB && ins >= 0) {
          if (!startCovered)
            builder.update(0, false);
          builder.composition(composition, len);
          if (ins && (startCovered = i == sections.length || sections[i + 1] == -1))
            builder.update(0, false);
        } else if (ins == -1) {
          builder.keep(len, !startCovered, i == sections.length);
          startCovered = false;
        } else if (ins == -2) {
          builder.update(len, !startCovered);
          startCovered = true;
        } else {
          builder.replace(len, ins, !startCovered);
          startCovered = true;
        }
        posB += ins >= 0 ? ins : len;
      }
      let result = builder.finish();
      result.sync();
      if (connected) {
        for (let ch of this.children)
          ch.disconnect(builder.reused);
        for (let tile of builder.toConnect)
          tile.widget.type.connect(tile.widget.value, tile.dom);
      }
      return result;
    }
    nearest(dom, requireNode = false) {
      for (let cur = dom; cur; cur = cur.parentNode) {
        let elt = cur.wgTile;
        if (elt && (!requireNode || elt.node) && this.owns(elt))
          return elt;
      }
      return null;
    }
    owns(elt) {
      for (; ; ) {
        if (elt == this)
          return true;
        let { parent } = elt;
        if (!parent)
          return false;
        elt = parent;
      }
    }
    nodeTile(pos) {
      let off = 0, parent = this;
      search: for (; ; ) {
        for (let ch of parent.children) {
          let end = off + ch.length;
          if (pos < end) {
            if (off == pos && ch.node || ch instanceof TextTile)
              return ch;
            parent = ch;
            off += ch.boundary;
            continue search;
          }
          off = end;
        }
        return null;
      }
    }
    resolve(pos, side = -1) {
      let parent = this, i = 0;
      search: for (let scan = this, off = 0; ; ) {
        for (let j = 0; j < scan.children.length && off <= pos; j++) {
          let ch = scan.children[j], end = off + ch.length;
          if (scan == parent) {
            if (off == pos)
              i = j;
            else if (pos == end)
              i = j + 1;
          }
          if (ch.isPlotContent && !ch.boundary ? pos >= off && pos <= end : pos > off && pos < end) {
            if (ch instanceof TextTile)
              return new TilePos(ch, pos - off, pos);
            else if (ch.isAtom) {
              i = j;
              break search;
            }
            scan = ch;
            off += ch.boundary;
            if (ch.isPlotContent || ch.isWrapper)
              parent = ch;
            continue search;
          }
          off = end;
        }
        break;
      }
      adjust: for (; ; ) {
        if (i) {
          let before = parent.children[i - 1], parentBefore = parent, beforeI = i - 1;
          while (before.isWrapper) {
            parentBefore = before;
            before = before.children[beforeI = before.children.length - 1];
          }
          if (before.isNodeInner && before.flags & 2048 || before.flags & 64) {
            parent = parentBefore;
            i = beforeI;
            continue adjust;
          }
        }
        if (i < parent.children.length) {
          let after = parent.children[i], parentAfter = parent, afterI = i;
          while (after.isWrapper) {
            parentAfter = after;
            after = after.children[afterI = 0];
          }
          if (after.isNodeInner && !(after.flags & 2048) || after.flags & 32) {
            parent = parentAfter;
            i = afterI + 1;
            continue adjust;
          }
        }
        break;
      }
      if (side < 0) {
        while (!i && parent.isWrapper) {
          i = parent.parent.children.indexOf(parent);
          parent = parent.parent;
        }
        while (i) {
          let before = parent.children[i - 1];
          if (before.isPoint && !(before.flags & 96) && !before.isNodeInner) {
            i--;
          } else if (before.isWrapper) {
            parent = before;
            i = parent.children.length;
          } else {
            if (before instanceof TextTile) {
              parent = before;
              i = parent.length;
            }
            break;
          }
        }
      } else {
        while (parent.isWrapper && i == parent.children.length) {
          i = parent.parent.children.indexOf(parent) + 1;
          parent = parent.parent;
        }
        while (i < parent.children.length) {
          let after = parent.children[i];
          if (after.isPoint && !(after.flags & 96) && !after.isNodeInner) {
            i++;
          } else if (after.isWrapper) {
            parent = after;
            i = 0;
          } else {
            if (after instanceof TextTile) {
              parent = after;
              i = 0;
            }
            break;
          }
        }
      }
      return new TilePos(parent, i, pos);
    }
    posFromDOM(dom, offset, bias = -1) {
      let elt = this.nearest(dom);
      if (!elt)
        return this.dom.compareDocumentPosition(dom) & 4 ? this.length : 0;
      if (elt.isText)
        return elt.posAtStart + Math.min(offset, elt.length);
      if (elt.isAtom)
        return elt.posAtStart + (bias > 0 ? elt.length : 0);
      let domBefore, eltBefore;
      if (dom == elt.dom) {
        domBefore = dom.childNodes[offset - 1];
      } else {
        while (dom.parentNode != elt.dom)
          dom = dom.parentNode;
        domBefore = dom.previousSibling;
      }
      while (domBefore && !((eltBefore = domBefore.wgTile) && eltBefore.parent == elt))
        domBefore = domBefore.previousSibling;
      return domBefore ? elt.posBeforeChild(eltBefore) + eltBefore.length : elt.posAtStart;
    }
    posBeforeDOM(dom) {
      let tile = this.nearest(dom);
      if (!tile)
        return null;
      let pos = tile.posAtStart;
      if (tile.dom != dom)
        for (let ch of tile.children) {
          if (ch.dom.compareDocumentPosition(dom) & 2)
            break;
          pos += ch.length;
        }
      return pos;
    }
    coordsForElement(pos) {
      let tile = this.nodeTile(pos);
      if (!tile)
        return null;
      if (tile instanceof TextTile)
        return textTileRect(tile, pos - tile.posBefore);
      return tile.dom.getBoundingClientRect();
    }
  };
  function textTileRect(tile, offset) {
    return textRange(tile.dom, offset, findClusterBreak(tile.text, offset)).getBoundingClientRect();
  }
  var EltTile = class _EltTile extends CompositeTile {
    elt;
    _node;
    constructor(elt, _node, flags, length, dom) {
      super(dom, flags);
      this.elt = elt;
      this._node = _node;
      this.length = length;
    }
    get isSpanning() {
      return (this.flags & 4) > 0;
    }
    get isNodeOuter() {
      return !!this.node;
    }
    get isAtom() {
      return !!this._node && (this.flags & 512) > 0;
    }
    get boundary() {
      return this._node && !(this.flags & 512) ? 1 : 0;
    }
    get node() {
      return this._node;
    }
    get contentTile() {
      if (!(this.flags & 1024))
        return null;
      for (let ch of this.children)
        if (ch.isNodeInner && ch.flags & 1024)
          return ch.contentTile;
      return this;
    }
    static of(elt, node, flags, length, dom) {
      if (elt.hasContent) {
        flags |= 1024;
        if (elt.children.length > 1) {
          let zero = elt.children.indexOf(0);
          if (zero > -1 && zero < elt.children.length - 1)
            flags |= 4096;
        }
      }
      return new _EltTile(elt, node, flags, length, dom || elt.outerDOM());
    }
  };
  var WidgetTile = class extends Tile {
    widget;
    _node;
    constructor(widget, _node, flags, length = 0, dom) {
      super(dom || widget.type.render(widget.value), flags);
      this.widget = widget;
      this._node = _node;
      this.length = length;
    }
    get isNodeOuter() {
      return !!this._node;
    }
    get isAtom() {
      return true;
    }
    get node() {
      return this._node;
    }
    get children() {
      return noChildren2;
    }
    handleEvent(event, wg) {
      return this.widget.type.handleEvent(event, wg);
    }
    connect() {
      this.widget.type.connect?.(this.widget.value, this.dom);
    }
    disconnect(reused) {
      if (!reused || reused.get(this) != 1)
        this.widget.type.disconnect?.(this.widget.value, this.dom);
    }
    toString() {
      return this.widget.type == Widget.EditableText || this.widget.type == Widget.Text ? JSON.stringify(this.widget.value) : super.toString();
    }
    posAtCoordsInner(start, state, x, y, textblock, orientation) {
      if (!this.node)
        return CoordPos.create(start, 1);
      let rect2 = this.dom.nodeType == 1 ? this.dom.getBoundingClientRect() : textRange(this.dom, 0, this.length).getBoundingClientRect();
      let after = orientation == 1 ? y > (rect2.top + rect2.bottom) / 2 : x < (rect2.left + rect2.right) / 2 == ltrAt(state, start, 1, textblock);
      return after ? CoordPos.create(start + this.length - 2 * this.boundary, -1, start) : CoordPos.create(start, 1, start);
    }
  };
  var TextTile = class _TextTile extends Tile {
    text;
    constructor(text, dom, flags = 0) {
      super(dom, flags);
      this.text = text;
      this.length = text.length;
    }
    get children() {
      return noChildren2;
    }
    get isText() {
      return true;
    }
    get isNodeOuter() {
      return true;
    }
    get isAtom() {
      return true;
    }
    sync() {
      if (this.flags & 256)
        return;
      this.flags |= 256;
      if (this.dom.nodeValue != this.text)
        this.dom.nodeValue = this.text;
    }
    toString() {
      return JSON.stringify(this.text);
    }
    posAtCoordsInner(start, state, x, y, textblock, orientation) {
      let { closest, rect: rect2 } = rowScan(x, y, (add2) => {
        for (let i = 0; i < this.length; ) {
          let end = findClusterBreak(this.text, i);
          let rect3 = singleRect(textRange(this.dom, i, end), 1, true);
          if (rect3.top == rect3.bottom)
            continue;
          if (add2(rect3, i))
            break;
          i = end;
        }
      });
      let pos = start + closest;
      let after = x > (rect2.left + rect2.right) / 2 == ltrAt(state, pos, 1, textblock);
      if (after)
        return CoordPos.create(start + findClusterBreak(this.text, closest), -1);
      else
        return CoordPos.create(pos, 1);
    }
    static of(text) {
      return new _TextTile(text, document.createTextNode(text));
    }
  };
  var noChildren2 = [];
  var TilePointer = class _TilePointer {
    tile;
    index;
    parent;
    constructor(tile, index, parent) {
      this.tile = tile;
      this.index = index;
      this.parent = parent;
    }
    walk(dist2, side, walker) {
      let { tile, index, parent } = this, nodeBoundary = 0;
      for (; ; ) {
        if (!dist2 && side < 0 && !nodeBoundary)
          break;
        if (tile.isAtom) {
          if (!dist2)
            break;
          nodeBoundary = 0;
          let left = tile.length - index;
          if (dist2 >= left) {
            dist2 -= left;
            if (left && walker)
              walker.skip(tile, index, tile.length);
            ({ tile, index, parent } = parent);
            index++;
          } else {
            if (walker)
              walker.skip(tile, index, index + dist2);
            index += dist2;
            dist2 = 0;
          }
        } else if (index == tile.children.length) {
          if (!dist2 && (tile.isDoc || nodeBoundary != 2 && tile.isNode))
            break;
          if (walker)
            walker.leave(tile);
          nodeBoundary = tile.isNodeInner ? 2 : 0;
          dist2 -= tile.boundary;
          ({ tile, index, parent } = parent);
          index++;
        } else {
          let next = tile.children[index];
          if (nodeBoundary == 1 && !next.isNodeInner) {
            nodeBoundary = 0;
            if (side < 0 && !dist2)
              break;
          }
          if (!dist2 && next.isNodeInner && !nodeBoundary)
            break;
          if (next.length <= dist2) {
            if (walker)
              walker.skip(next, 0, next.length);
            dist2 -= next.length;
            index++;
            if (!next.isNodeInner)
              nodeBoundary = 0;
          } else {
            if (next.isNodeOuter && !dist2)
              break;
            if (walker && !next.isAtom)
              walker.enter(next);
            dist2 -= next.boundary;
            parent = tile == this.tile && index == this.index ? this : new _TilePointer(tile, index, parent);
            tile = next;
            index = 0;
            nodeBoundary = next.isNode ? 1 : 0;
          }
        }
      }
      return tile == this.tile && index == this.index ? this : new _TilePointer(tile, index, parent);
    }
    tileAfter() {
      let { tile, index } = this;
      if (tile.isText)
        return tile;
      return index < tile.children.length ? tile.children[index] : null;
    }
    matchingWrapper(elt, spanning, reused) {
      let best, bestScore = 0;
      let start = this.tile.isText ? this.parent : this;
      for (let { tile, parent } = start; !(tile.isNode || tile.isDoc); { tile, parent } = parent) {
        let wrap = tile;
        if (reused.has(wrap) || wrap.elt.tagName != elt.tagName || wrap.isSpanning != spanning)
          continue;
        let score = Attributes.compare(wrap.elt.attrs, elt.attrs);
        if (!best || bestScore < score) {
          best = wrap;
          bestScore = score;
        }
      }
      if (!best)
        return null;
      if (bestScore < 0)
        updateAttributes(best.dom, best.elt.attrs, elt.attrs);
      reused.set(best, 2);
      return best.dom;
    }
    matchingWidget(widget, sideFlag, reused) {
      let { index, tile, parent } = this;
      for (; ; ) {
        if (!index) {
          if (!parent || (tile instanceof EltTile ? tile.node : !(tile instanceof TextTile)))
            break;
          ({ index, tile, parent } = parent);
        } else {
          if (tile instanceof TextTile)
            break;
          let before = tile.children[--index];
          if (!before.isPoint)
            break;
          if (!reused.has(before) && before instanceof WidgetTile && before.widget.eq(widget) && (before.flags & 96) == sideFlag && !(before.flags & 8192)) {
            reused.set(before, 1);
            return before;
          }
        }
      }
      return null;
    }
  };
  var ContentUpdate = class {
    state;
    deco;
    old;
    new;
    posB = 0;
    reused = /* @__PURE__ */ new Map();
    keepWalker;
    toConnect = [];
    partialNode = null;
    constructor(state, old, deco, cursorWrapper) {
      this.state = state;
      this.deco = deco;
      this.old = new TilePointer(old, 0, null);
      this.new = new DocTile(state, old.dom, cursorWrapper, deco.decoSet);
      this.keepWalker = {
        enter: (tile) => {
          let span = tile.isSpanning && this.enterSpanning(tile.elt);
          if (span) {
            this.new = span;
          } else {
            this.reused.set(tile, 2);
            let inner = EltTile.of(tile.elt, tile.node, tile.flags, tile.boundary * 2, tile.dom);
            this.new.addChild(inner);
            this.new = inner;
          }
        },
        leave: (tile) => {
          if (tile.isWrapper) {
            for (let scan = this.new, i = 0; ; ) {
              if (!scan.isWrapper)
                break;
              if (scan.elt.eq(tile.elt) && scan.isSpanning == tile.isSpanning) {
                for (let j = 0; j <= i; j++)
                  this.up();
                break;
              }
              if (!scan.parent)
                break;
              scan = scan.parent;
            }
          } else if (tile.isNodeOuter) {
            this.leaveNode();
            this.leaveWrappers();
          }
        },
        skip: (tile, from, to) => {
          if (!(tile instanceof TextTile)) {
            if (!from && to == tile.length) {
              this.reused.set(tile, 1);
              this.new.addChild(tile);
            } else if (from == 0) {
              let wrappers = 0;
              for (let w = this.new; w && w.isWrapper; w = w.parent)
                wrappers++;
              let shape = tile instanceof EltTile ? tile.elt : tile instanceof WidgetTile ? tile.widget : null;
              if (!shape || !tile.node)
                throw new Error("Unexpected atom tile");
              this.partialNode = { node: tile.node, reuse: tile, shape, wrappers };
            } else {
              if (!this.partialNode)
                throw new Error("Missing partial node");
              if (to == tile.length) {
                let { node, shape, reuse } = this.partialNode;
                this.partialNode = null;
                this.new.addChild(this.buildNodeShape(node, shape, reuse));
              }
            }
          } else if (this.new.lastChild instanceof TextTile && !this.new.lastChild.isComposition) {
            this.addText(tile.text.slice(from, to));
          } else if (!from && to == tile.text.length && !(tile.flags & 8192) && !this.reused.has(tile)) {
            this.reused.set(tile, 1);
            this.new.addChild(tile);
          } else if (!this.reused.has(tile)) {
            this.reused.set(tile, 2);
            this.new.addChild(new TextTile(tile.text.slice(from, to), tile.dom));
          } else {
            this.new.addChild(TextTile.of(tile.text.slice(from, to)));
          }
        }
      };
    }
    keep(len, includeStart, includeEnd) {
      if (!includeStart) {
        this.old = this.old.walk(0, 1);
        this.openOldWrappers();
      }
      this.old = this.old.walk(len, includeEnd ? 1 : -1, this.keepWalker);
      this.posB += len;
    }
    replace(len, ins, includeStart) {
      let start = this.old.walk(0, 1), end = this.old = start.walk(len, 1);
      this.build(ins, false, includeStart, start, end);
    }
    update(len, includeStart) {
      this.old = this.old.walk(0, 1);
      this.build(len, true, includeStart);
    }
    composition(composition, lenA) {
      this.leaveWrappers();
      if (!composition.target) {
        for (let mark of composition.wrapCursor)
          if (mark.type.element) {
            this.openWrapper(renderMarkWrapper(mark), mark.spanning, false);
          }
        this.new.addChild(new WidgetTile(imgHack, null, 16 | 32));
        return;
      }
      let found = [];
      for (let parent = composition.target.parentNode; parent; parent = parent.parentNode) {
        let tile = parent.wgTile;
        if (!tile) {
          let elt = Elt.create(parent.nodeName.toLowerCase(), takeAttributes(parent), Elt.hole);
          tile = new EltTile(elt, null, 0, 0, parent);
        } else if (tile.isNode || tile.isDoc) {
          break;
        }
        found.push(tile);
      }
      for (let i = found.length - 1; i >= 0; i--) {
        let tile = found[i];
        if (tile.isSpanning && this.enterSpanning(tile.elt)) ;
        else {
          if (tile.isSpanning && this.reused.has(tile)) {
            let owner = tile.dom.wgTile;
            if (owner && owner != tile)
              owner.dom = owner.elt.outerDOM();
          } else {
            this.reused.set(tile, 2);
          }
          tile = EltTile.of(tile.elt, null, tile.flags, 0, tile.dom);
          this.new.addChild(tile);
          this.new = tile;
        }
      }
      this.new.addChild(new TextTile(composition.text, composition.target, 128));
      this.old = this.old.walk(lenA, 1);
      this.posB += composition.text.length;
    }
    build(len, reuse, includeStart, startOld, endOld) {
      this.leaveWrappers();
      let start = this.posB, end = this.posB + len;
      this.deco.walk(start, includeStart, end, {
        enter: (node, elt, wrappers) => {
          this.openWrappers(wrappers, reuse);
          let tile = this.buildNodeShape(node, elt, reuse ? this.old.tileAfter() : null);
          this.new.addChild(tile);
          this.new = tile.contentTile;
          if (!this.new)
            throw new Error("Non-atom node rendered without hole");
          if (reuse)
            this.old = this.old.walk(1, 1);
          this.posB++;
        },
        leave: () => {
          this.leaveNode();
          if (reuse)
            this.old = this.old.walk(1, 1);
          this.posB++;
        },
        node: (node, shape, wrappers, partial) => {
          this.openWrappers(wrappers, reuse);
          let wrapCount = wrappers.length;
          if (node.is(Leaf.Text)) {
            while (shape instanceof Elt) {
              this.openWrapper(Elt.create(shape.tagName, shape.attrs, Elt.hole), true, reuse);
              wrapCount++;
              shape = shape.children[0];
            }
            let next = (reuse || this.posB == start) && !(this.new.lastChild instanceof TextTile) && this.old.tileAfter();
            if (!(next instanceof TextTile) || this.reused.has(next)) {
              this.addText(node.param);
            } else if (next.text == node.param && !(next.flags & 8192)) {
              this.reused.set(next, 1);
              this.new.addChild(next);
            } else {
              this.reused.set(next, 2);
              this.new.addChild(new TextTile(node.param, next.dom));
            }
          } else if (partial != null) {
            this.partialNode = { node, shape, wrappers: wrapCount, reuse: reuse ? this.old.tileAfter() : null };
            if (reuse)
              this.old = this.old.walk(partial, 1);
            this.posB += partial;
            return;
          } else {
            this.new.addChild(this.buildNodeShape(node, shape, reuse ? this.old.tileAfter() : null));
          }
          for (let i = 0; i < wrapCount; i++)
            this.up();
          if (reuse)
            this.old = this.old.walk(node.length, 1);
          this.posB += node.length;
        },
        nodePart: (node, length, done) => {
          if (!this.partialNode)
            throw new Error("Continuing unknown partial node");
          this.posB += length;
          this.partialNode.node = node;
          if (reuse)
            this.old = this.old.walk(length, 1);
          if (done) {
            let { node: node2, shape, wrappers, reuse: reuse2 } = this.partialNode;
            this.partialNode = null;
            this.new.addChild(this.buildNodeShape(node2, shape, reuse2));
            for (let i = 0; i < wrappers; i++)
              this.up();
          }
        },
        widget: (widget, side) => {
          let sideFlag = side < 0 ? 32 : side > 0 ? 64 : 0;
          let tile = reuse ? this.old.matchingWidget(widget, sideFlag, this.reused) : startOld && this.posB == start ? startOld.matchingWidget(widget, sideFlag, this.reused) : endOld && this.posB == end ? endOld.matchingWidget(widget, sideFlag, this.reused) : null;
          if (!tile) {
            tile = new WidgetTile(widget, null, 16 | sideFlag, 0);
            if (widget.type.connect)
              this.toConnect.push(tile);
          }
          this.new.addChild(tile);
        }
      });
    }
    findReusableTile(shape, reuse, strict) {
      if (reuse instanceof EltTile) {
        if (shape instanceof Elt && reuse.elt.tagName == shape.tagName && !this.reused.has(reuse) && (!strict || Attributes.eq(reuse.elt.attrs, shape.attrs)))
          return reuse;
        for (let ch of reuse.children)
          if (ch instanceof EltTile && ch.isNodeInner) {
            let found = this.findReusableTile(shape, ch, strict);
            if (found)
              return found;
          }
        return this.findReusableTile(shape, reuse.children, strict);
      } else if (reuse instanceof WidgetTile && shape instanceof Widget && !this.reused.has(reuse) && shape.eq(reuse.widget)) {
        return reuse;
      } else if (Array.isArray(reuse)) {
        for (let tile of reuse)
          if (tile.isNodeInner) {
            let found = this.findReusableTile(shape, tile, strict);
            if (found)
              return found;
          }
      }
      return null;
    }
    buildNodeShape(node, shape, reuse, afterContent = 0) {
      if (shape instanceof Elt) {
        let reusable, dom, strict = true;
        if (reusable = this.findReusableTile(shape, reuse, strict) || this.findReusableTile(shape, reuse, strict = false)) {
          this.reused.set(reusable, 2);
          dom = reusable.dom;
          if (reusable.flags & 8192)
            updateAttributes(dom, takeAttributes(reusable.dom), shape.attrs);
          else if (!strict)
            updateAttributes(dom, reusable.elt.attrs, shape.attrs);
        }
        let flags = (node ? shape.hasContent ? 0 : 512 : 1 | (shape.hasContent ? 0 : 16)) | afterContent;
        let tile = EltTile.of(shape, node, flags, node ? node.length : 0, dom);
        let afterContentInner = 0;
        for (let ch of shape.children) {
          if (ch === 0) {
            afterContentInner = 2048;
            tile.flags |= 2;
          } else {
            tile.addChild(this.buildNodeShape(null, typeof ch == "string" ? Widget.Text.of(ch) : ch, reusable ? reusable.children : reuse, afterContentInner));
          }
        }
        return tile;
      } else {
        let reusable, dom;
        if (reusable = this.findReusableTile(shape, reuse, false)) {
          this.reused.set(reusable, 2);
          dom = reusable.dom;
        }
        let flags = (node ? 512 : 16 | 1) | afterContent;
        let tile = new WidgetTile(shape, node, flags, node ? node.length : 0, dom);
        if (shape.type.connect)
          this.toConnect.push(tile);
        return tile;
      }
    }
    addBR() {
      let node = this.new.node;
      if (node && node.isPlot && node.isTextblock) {
        let i = this.new.children.length - 1;
        let last = i < 0 ? null : this.new.children[i];
        if (last instanceof WidgetTile && last.widget.type == brHack.type) {
          let prev = i ? this.new.children[i - 1] : null;
          if (prev && prev.dom.nodeName != "BR")
            this.new.children.pop();
        } else if (!last || last.dom.nodeName == "BR") {
          this.new.addChild(new WidgetTile(brHack, null, 16 | 64, 0));
        }
      }
    }
    up() {
      this.addBR();
      this.new = this.new.parent;
    }
    leaveNode() {
      for (let inNode = true; ; ) {
        if (!inNode && (this.new.isNode || this.new.isDoc))
          break;
        if (inNode && this.new.isNodeOuter)
          inNode = false;
        this.up();
      }
    }
    leaveWrappers() {
      while (!(this.new.isNode || this.new.isDoc))
        this.up();
    }
    openWrappers(wrappers, reuse) {
      for (let src of wrappers) {
        this.openWrapper(renderWrapper(src), src.spanning, reuse);
      }
    }
    openOldWrappers() {
      let found;
      let start = this.old.tile.isText ? this.old.parent : this.old;
      for (let { tile, parent } = start; !tile.isNode && !tile.isDoc; { tile, parent } = parent) {
        (found || (found = [])).push(tile);
      }
      if (found)
        for (let i = found.length - 1; i >= 0; i--) {
          this.openWrapper(found[i].elt, found[i].isSpanning, true);
        }
    }
    openWrapper(elt, spanning, reuse) {
      let span = spanning && this.enterSpanning(elt);
      if (span) {
        this.new = span;
      } else {
        let match = reuse ? this.old.matchingWrapper(elt, spanning, this.reused) : null;
        let tile = EltTile.of(elt, null, 8 | (spanning ? 4 : 0), 0, match);
        this.new.addChild(tile);
        this.new = tile;
      }
    }
    enterSpanning(elt) {
      let cur = this.new;
      for (let i = cur.children.length - 1; i >= 0; i--) {
        let prev = cur.children[i];
        if (prev.isPoint)
          continue;
        if (!prev.isSpanning || !prev.elt.eq(elt))
          break;
        if (prev.flags & 256) {
          let copy2 = cur.children[i] = EltTile.of(elt, null, prev.flags, 0, prev.dom);
          for (let ch of prev.children)
            copy2.addChild(ch);
          prev = copy2;
          prev.parent = cur;
        }
        for (let j = i + 1; j < cur.children.length; j++)
          prev.addChild(cur.children[j]);
        return prev;
      }
      return null;
    }
    addText(text) {
      let last = this.new.lastChild;
      if (!(last instanceof TextTile) || last.isComposition) {
        this.new.addChild(TextTile.of(text));
      } else if (last.flags & 256) {
        this.new.children.pop();
        this.new.addChild(new TextTile(last.text + text, last.dom));
        this.reused.set(last, 2);
      } else {
        last.text += text;
        last.length += text.length;
      }
    }
    finish() {
      while (!(this.new instanceof DocTile))
        this.up();
      this.addBR();
      return this.new;
    }
  };
  function takeAttributes(elt) {
    let attrs = [];
    for (let i = 0; i < elt.attributes.length; i++) {
      let { name, value } = elt.attributes[i];
      Attributes.push(attrs, name, value);
    }
    return attrs.length ? attrs : Attributes.none;
  }
  function updateAttributes(dom, a, b) {
    let changed = false;
    for (let iA = 0, iB = 0; ; ) {
      let match = false;
      if (iA < a.length && iB < b.length && a[iA] == b[iB]) {
        if (a[iA + 1] != b[iB + 1])
          dom.setAttribute(b[iB], b[iB + 1]);
        else
          match = true;
        iA += 2;
        iB += 2;
      } else if (iA < a.length && (iB == b.length || a[iA] < b[iB])) {
        dom.removeAttribute(a[iA]);
        iA += 2;
      } else if (iB < b.length) {
        dom.setAttribute(b[iB], b[iB + 1]);
        iB += 2;
      } else {
        break;
      }
      if (!match)
        changed = true;
    }
    return changed;
  }
  var brHack = /* @__PURE__ */ Widget.create({
    render() {
      return document.createElement("br");
    }
  });
  var imgHack = /* @__PURE__ */ Widget.create({
    render() {
      return document.createElement("img");
    }
  });
  function separateComposition(sections, comp) {
    let result = [], { fromB, toB } = comp;
    let lenI = 0, dLen = 0;
    for (let posB = 0, done = false, i = 0; i < sections.length; ) {
      let len = sections[i++], ins = sections[i++], endB = posB + (ins < 0 ? len : ins);
      if (fromB > endB || toB < posB) {
        result.push(len, ins);
      } else {
        if (ins >= 0) {
          if (posB < fromB || endB > toB)
            return null;
          dLen = len - ins;
        }
        if (posB < fromB)
          result.push(fromB - posB, ins);
        if (!done) {
          lenI = result.length;
          result.push(0, comp.text.length);
          done = true;
        }
        if (endB > toB)
          result.push(endB - toB, ins);
      }
      posB = endB;
    }
    result[lenI] = comp.text.length + dLen;
    return result;
  }
  function coordsAtPos(wg, pos, assoc) {
    let tile = wg.docTile.resolve(pos, assoc);
    let node = tile.dom, { offset } = tile;
    if (node.nodeType == 3) {
      let len = node.nodeValue.length;
      if (!len)
        return singleRect(textRange(node, 0, 0), 1);
      let from = offset, to = offset, side = assoc < 0 && from || from == len ? 1 : -1;
      if (side < 0)
        to++;
      else
        from--;
      return flattenV(singleRect(textRange(node, from, to), side, true), side < 0 == ltrAt(wg.state, pos, assoc));
    }
    let tagTile = tile.tile;
    while (!tagTile.node)
      tagTile = tagTile.parent;
    if (tagTile.node.isPlot && tagTile.node.type.orientation == "column") {
      if (offset && (assoc < 0 || offset == maxOffset(node))) {
        let before = node.childNodes[offset - 1];
        if (before.nodeType == 1)
          return flattenH(before.getBoundingClientRect(), false);
      }
      if (offset < maxOffset(node)) {
        let after = node.childNodes[offset];
        if (after.nodeType == 1)
          return flattenH(after.getBoundingClientRect(), true);
      }
      return flattenH(node.getBoundingClientRect(), assoc > 0);
    }
    if (offset && (assoc < 0 || offset == maxOffset(node))) {
      let before = node.childNodes[offset - 1];
      let target = before.nodeType == 3 ? textRange(before, Math.max(0, maxOffset(before)), maxOffset(before)) : before.nodeType == 1 && (before.nodeName != "BR" || !before.nextSibling) ? before : null;
      if (target)
        return flattenV(singleRect(target, 1, true), !ltrAt(wg.state, pos, assoc));
    }
    if (offset < maxOffset(node)) {
      let after = node.childNodes[offset];
      let target = !after ? null : after.nodeType == 3 ? textRange(after, 0, Math.min(1, maxOffset(after))) : after.nodeType == 1 ? after : null;
      if (target)
        return flattenV(singleRect(target, -1, true), ltrAt(wg.state, pos, assoc));
    }
    return flattenV(singleRect(node.nodeType == 3 ? textRange(node, 0, node.nodeValue.length) : node, -assoc, true), assoc > 0);
  }
  function flattenV(rect2, left) {
    return rect2.width ? new DOMRect(left ? rect2.left : rect2.right, rect2.top, 0, rect2.height) : rect2;
  }
  function flattenH(rect2, top2) {
    return rect2.height ? new DOMRect(rect2.left, top2 ? rect2.top : rect2.bottom, rect2.width, 0) : rect2;
  }
  var nav = typeof navigator != "undefined" ? navigator : { userAgent: "", vendor: "", platform: "" };
  var doc = typeof document != "undefined" ? document : { documentElement: { style: {} } };
  var edge = /* @__PURE__ */ (() => /Edge\/(\d+)/.exec(nav.userAgent))();
  var gecko = /* @__PURE__ */ (() => !edge && /gecko\/(\d+)/i.test(nav.userAgent))();
  var chrome = /* @__PURE__ */ (() => !edge && /Chrome\/(\d+)/.exec(nav.userAgent))();
  var webkit = /* @__PURE__ */ (() => "webkitFontSmoothing" in doc.documentElement.style)();
  var safari = /* @__PURE__ */ (() => !edge && /Apple Computer/.test(nav.vendor))();
  var ios = /* @__PURE__ */ (() => safari && (/Mobile\/\w+/.test(nav.userAgent) || nav.maxTouchPoints > 2))();
  var browser = /* @__PURE__ */ (() => ({
    mac: ios || /Mac/.test(nav.platform),
    windows: /Win/.test(nav.platform),
    linux: /Linux|X11/.test(nav.platform),
    gecko_version: gecko ? +(/Firefox\/(\d+)/.exec(nav.userAgent) || [0, 0])[1] : 0,
    chrome: !!chrome,
    chrome_version: chrome ? +chrome[1] : 0,
    ios,
    android: /Android\b/.test(nav.userAgent),
    webkit,
    webkit_version: webkit ? +(/\bAppleWebKit\/(\d+)/.exec(nav.userAgent) || [0, 0])[1] : 0,
    safari,
    safari_version: safari ? +(/\bVersion\/(\d+(\.\d+)?)/.exec(nav.userAgent) || [0, 0])[1] : 0
  }))();
  var clipboardOutputFilter = /* @__PURE__ */ GardState.Facet.define();
  var clipboardOutputHTMLFilter = /* @__PURE__ */ GardState.Facet.define();
  var clipboardTextSerializer = /* @__PURE__ */ GardState.Facet.define();
  var clipboardOutputTextFilter = /* @__PURE__ */ GardState.Facet.define();
  var clipboardInputFilter = /* @__PURE__ */ GardState.Facet.define();
  var clipboardInputHTMLFilter = /* @__PURE__ */ GardState.Facet.define();
  var clipboardTextParser = /* @__PURE__ */ GardState.Facet.define();
  var clipboardInputTextFilter = /* @__PURE__ */ GardState.Facet.define();
  function writeClipboard(state, slice, context, data) {
    for (let filter of state.facet(clipboardOutputFilter))
      slice = filter(slice, state);
    let includeContext = 0;
    for (let i = 0; i < context.length; i++) {
      let next = context[i];
      if (next.type.defining && (!includeContext || next.type != context[includeContext - 1].type))
        includeContext = i + 1;
      else if (next.type.defining || !next.isTextblock)
        break;
    }
    let doc2 = detachedDoc(), dom = serialize.slice(slice, {
      context,
      includeContext,
      openAttr: "wg-open"
    }).toDOM();
    let needsWrap;
    while (dom.firstChild && dom.firstChild.nodeType == 1 && (needsWrap = wrapMap[dom.firstChild.nodeName.toLowerCase()])) {
      for (let i = needsWrap.length - 1; i >= 0; i--) {
        let wrapper = doc2.createElement(needsWrap[i]);
        wrapper.setAttribute("wg-wrap", "true");
        while (dom.firstChild)
          wrapper.appendChild(dom.firstChild);
        dom.appendChild(wrapper);
      }
    }
    if (dom.firstChild && dom.firstChild.nodeType == 1)
      dom.firstChild.setAttribute("wg-content", "true");
    let wrap = doc2.createElement("div");
    wrap.appendChild(dom);
    let html = wrap.innerHTML;
    for (let filter of state.facet(clipboardOutputHTMLFilter))
      html = filter(html, state);
    data.setData("text/html", html);
    let text;
    for (let serialize2 of state.facet(clipboardTextSerializer)) {
      if ((text = serialize2(slice, context, state)) != null)
        break;
    }
    if (text == null)
      text = slice.textContent({ blockSeparator: "\n\n" });
    for (let filter of state.facet(clipboardOutputTextFilter))
      text = filter(text, state);
    data.setData("text/plain", text);
  }
  function isOpen(elt) {
    return elt.getAttribute("wg-open") || null;
  }
  function readClipboard(state, data, targetContext, plain) {
    let html = data.getData("text/html");
    let text = data.getData("text/plain") || data.getData("Text") || data.getData("text/uri-list").replace(/\r?\n/g, " ");
    let slice, context = [];
    if (text && (targetContext.parent.node.type.hasRole(Node.Role.Code) || !html || plain)) {
      for (let filter of state.facet(clipboardInputTextFilter))
        text = filter(text, state);
      slice = readClipboardText(state, text, targetContext, plain);
    } else if (!html) {
      return null;
    } else {
      for (let filter of state.facet(clipboardInputHTMLFilter))
        html = filter(html, state);
      let dom = readHTML2(html);
      if (browser.webkit)
        restoreReplacedSpaces(dom);
      let fromWordgard = dom.querySelector("[wg-content=true]");
      ({ slice, context } = parse.slice(state.schema, dom, {
        collapseWhiteSpace: !fromWordgard,
        isOpen: fromWordgard ? isOpen : void 0
      }));
    }
    for (let filter of state.facet(clipboardInputFilter))
      slice = filter(slice, state);
    return { slice, context };
  }
  function readClipboardText(state, text, context, plain) {
    if (!plain)
      for (let parser of state.facet(clipboardTextParser)) {
        let slice = parser(text, state);
        if (slice)
          return slice;
      }
    let marks = plain ? [] : context.marks();
    if (context.parent.node.type.hasRole(Node.Role.Code))
      return Slice.of([Leaf.text(text.replace(/\r?\n|\r/g, "\n"), marks)]);
    let lines = text.split(/(?:\r\n?|\n)+/);
    let content = lines[0] ? [Leaf.text(lines[0], marks)] : [];
    if (lines.length == 1)
      return Slice.of(content);
    let parent = (context.parent.node.inlineContent ? context.parent.parent || context.parent : context.parent).node.tag;
    let wrapping = state.schema.findWrapping(parent.type, Leaf.Text);
    if (!wrapping || !wrapping.length)
      return Slice.of([Leaf.text(text.replace(/\r?\n|\r/g, " "), marks)]);
    let wrapper = wrapping[wrapping.length - 1];
    content.push(Plot.End);
    for (let i = 1; i < lines.length - 1; i++)
      content.push(wrapper.create(lines[i] ? [Leaf.text(lines[i], marks)] : []));
    content.push(wrapper);
    let last = lines[lines.length - 1];
    if (last)
      content.push(Leaf.text(last, marks));
    return Slice.of(content);
  }
  var wrapMap = {
    thead: ["table"],
    tbody: ["table"],
    tfoot: ["table"],
    caption: ["table"],
    colgroup: ["table"],
    col: ["table", "colgroup"],
    tr: ["table", "tbody"],
    td: ["table", "tbody", "tr"],
    th: ["table", "tbody", "tr"]
  };
  var _detachedDoc = null;
  function detachedDoc() {
    return _detachedDoc || (_detachedDoc = document.implementation.createHTMLDocument("title"));
  }
  function maybeWrapTrusted(html) {
    let trustedTypes = window.trustedTypes;
    if (!trustedTypes)
      return html;
    return trustedTypes.createPolicy("detachedDocument", { createHTML: (s) => s }).createHTML(html);
  }
  function readHTML2(html) {
    let metas = /^(\s*<meta [^>]*>)*/.exec(html);
    if (metas)
      html = html.slice(metas[0].length);
    let elt = detachedDoc().createElement("div");
    let firstTag = /<([a-z][^>\s]+)/i.exec(html), wrap;
    if (wrap = firstTag && wrapMap[firstTag[1].toLowerCase()])
      html = wrap.map((n) => "<" + n + ">").join("") + html + wrap.map((n) => "</" + n + ">").reverse().join("");
    elt.innerHTML = maybeWrapTrusted(html);
    if (wrap)
      for (let i = 0; i < wrap.length; i++)
        elt = elt.querySelector(wrap[i]) || elt;
    return elt;
  }
  function restoreReplacedSpaces(dom) {
    let nodes = dom.querySelectorAll(browser.chrome ? "span:not([class]):not([style])" : "span.Apple-converted-space");
    for (let i = 0; i < nodes.length; i++) {
      let node = nodes[i];
      if (node.childNodes.length == 1 && node.textContent == "\xA0" && node.parentNode)
        node.parentNode.replaceChild(dom.ownerDocument.createTextNode(" "), node);
    }
  }
  var theme$1 = /* @__PURE__ */ GardState.Facet.define({ combine: (strs) => strs.join(" ") });
  var colorScheme = /* @__PURE__ */ GardState.Facet.define({
    combine: (values) => values.length ? values[0] : "light"
  });
  var styleID = /* @__PURE__ */ StyleModule.newName();
  var baseLightID = /* @__PURE__ */ StyleModule.newName();
  var baseDarkID = /* @__PURE__ */ StyleModule.newName();
  var lightDarkIDs = { "&light": "." + baseLightID, "&dark": "." + baseDarkID };
  function buildTheme(main2, spec, scopes) {
    return new StyleModule(spec, {
      finish(sel) {
        return /&/.test(sel) ? sel.replace(/&\w*/, (m) => {
          if (m == "&")
            return main2;
          if (!scopes || !scopes[m])
            throw new RangeError(`Unsupported selector: ${m}`);
          return scopes[m];
        }) : main2 + " " + sel;
      }
    });
  }
  var baseStyles = /* @__PURE__ */ buildTheme("." + styleID, {
    "&": {
      "--wg-highlight-color": "#6af",
      "--wg-dialog-font": "90% sans-serif",
      position: "relative",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      border: "1px solid var(--wg-border-color)"
    },
    "&:has(> wg-scroller > wg-content:focus)": {
      outline: "1px solid var(--wg-highlight-color)",
      "& > wg-scroller > wg-cursor-layer": {
        animation: "steps(1) wg-blink 1.2s infinite"
      },
      "& > wg-scroller > wg-cursor-layer wg-cursor": {
        display: "block"
      }
    },
    "&light": {
      "--wg-panel-color": "white",
      "--wg-border-color": "#cacacb"
    },
    "&dark": {
      "--wg-panel-color": "#030303",
      "--wg-border-color": "#444"
    },
    "wg-scroller": {
      display: "block",
      height: "100%",
      overflowX: "auto",
      position: "relative",
      zIndex: 0
    },
    "wg-content": {
      display: "block",
      margin: 0,
      whiteSpace: "pre-wrap",
      overflowWrap: "anywhere",
      wordBreak: "break-word",
      boxSizing: "border-box",
      minHeight: "100%",
      padding: "4px 12px",
      outline: "none",
      caretColor: "transparent"
    },
    "wg-cursor-layer": {
      display: "block",
      position: "absolute",
      left: 0,
      top: 0,
      contain: "size style",
      "& > *": {
        position: "absolute"
      },
      pointerEvents: "none",
      zIndex: 150
    },
    "@keyframes wg-blink": { "0%": {}, "50%": { opacity: 0 }, "100%": {} },
    "@keyframes wg-blink2": { "0%": {}, "50%": { opacity: 0 }, "100%": {} },
    "wg-cursor": {
      pointerEvents: "none",
      display: "none"
    },
    ".wg-cursor-v": {
      borderLeft: "1.8px solid currentColor",
      marginLeft: "-0.9px"
    },
    ".wg-cursor-h": {
      borderTop: "1.8px solid currentColor",
      marginTop: "-0.9px"
    },
    ".wg-selected-node": {
      outline: "2px solid #68f",
      "&::selection, & *::selection": {
        backgroundColor: "transparent"
      }
    },
    "wg-placeholder": {
      opacity: "0.6",
      display: "inline-block",
      verticalAlign: "top",
      userSelect: "none"
    },
    "wg-dropcursor": {
      pointerEvents: "none",
      position: "absolute",
      "&.wg-vertical": {
        borderLeft: "1.2px solid black",
        marginLeft: "-0.6px"
      },
      "&.wg-horizontal": {
        borderTop: "1.2px solid black",
        marginTop: "-0.6px"
      }
    },
    "wg-announced": {
      position: "fixed",
      top: "-10000px"
    },
    "@media print": {
      "wg-announced": { display: "none" }
    },
    "wg-panels": {
      display: "block",
      boxSizing: "border-box",
      position: "sticky",
      left: 0,
      right: 0,
      zIndex: 300,
      backgroundColor: "var(--wg-panel-color)",
      font: "var(--wg-dialog-font)"
    },
    ".wg-panels-top": { top: "0" },
    ".wg-panels-bottom": { bottom: "0" },
    "wg-dialog": {
      display: "block",
      padding: "5px 19px 5px 6px",
      position: "relative",
      "& label, & .wg-label": {
        fontSize: "90%"
      },
      borderBottom: "1px solid var(--wg-border-color)"
    },
    ".wg-dialog-close": {
      position: "absolute",
      top: "3px",
      right: "4px",
      backgroundColor: "inherit",
      border: "none",
      font: "inherit",
      fontSize: "14px",
      padding: "0"
    },
    ".wg-dialog-button": {
      color: "inherit",
      padding: "3px 9px",
      border: "none",
      borderRadius: "3px"
    },
    "&light .wg-dialog-button": {
      backgroundColor: "#eaeaea",
      "&:active": {
        backgroundColor: "#ddd"
      }
    },
    "&dark .wg-dialog-button": {
      backgroundColor: "#333",
      "&:active": {
        backgroundColor: "#222"
      }
    }
  }, lightDarkIDs);
  function setDOMSelection(wg) {
    let { anchor, head, anchorSide, headSide } = wg.state.selection.domSelection;
    let anchorDOM = wg.docTile.resolve(anchor, anchorSide);
    let headDOM = head == anchor ? anchorDOM : wg.docTile.resolve(head, headSide);
    let domSel = getSelection(wg.root);
    if (!domSel)
      return;
    if (domSel.focusNode && isEquivalentPosition(anchorDOM.dom, anchorDOM.offset, domSel.anchorNode, domSel.anchorOffset) && isEquivalentPosition(headDOM.dom, headDOM.offset, domSel.focusNode, domSel.focusOffset))
      return;
    domSel.collapse(anchorDOM.dom, anchorDOM.offset);
    let failed = false;
    if (anchor != head)
      try {
        domSel.extend(headDOM.dom, headDOM.offset);
      } catch (_) {
        failed = true;
      }
    if (!failed)
      wg.observer.setSelectionRange(anchorDOM, headDOM);
  }
  function readDOMSelection(wg, range) {
    let anchor = wg.docTile.posFromDOM(range.anchorNode, range.anchorOffset, -1);
    let head = range.anchorNode == range.focusNode && range.anchorOffset == range.focusOffset ? anchor : wg.docTile.posFromDOM(range.focusNode, range.focusOffset, -1);
    return GardSelection.range(wg.viewState.mapPosPending(anchor, 1), wg.viewState.mapPosPending(head, 1));
  }
  var Y_STEP = 5;
  function moveVertically(wg, start, forward, distance = 0, selectNode = false) {
    let editorRect = wg.contentDOM.getBoundingClientRect();
    let coords = wg.coordsAtPos(start.head, start.headSide);
    let baseLTR = wg.state.textLTR;
    let goalColumn = start.goalColumn ?? (baseLTR ? coords.left - editorRect.left : editorRect.right - coords.left);
    let x = baseLTR ? editorRect.left + goalColumn : editorRect.right - goalColumn;
    let y = forward ? coords.bottom + distance : coords.top - distance;
    for (let scan = start.head; ; ) {
      let pos = wg.state.doc.resolve(scan), block = pos.textblockParent;
      if (block) {
        let blockTile = block.parent ? wg.docTile.nodeTile(block.before) : wg.docTile;
        let rect2 = blockTile.dom.getBoundingClientRect();
        if (forward ? y < rect2.top : y > rect2.bottom)
          y = forward ? rect2.top : rect2.bottom;
        while (forward ? rect2.bottom >= y : rect2.top <= y) {
          let found = blockTile.posAtCoords(wg.state, x, y);
          if (!found.vertOutside && found.pos != start.head)
            return GardSelection.cursor(found.pos, found.side, goalColumn);
          y += forward ? Y_STEP : -Y_STEP;
        }
        if (!block.parent)
          return null;
        scan = forward ? block.after : block.before;
      }
      let nextCursor = GardSelection.cursor(scan).nextNormalCursor(wg.state, forward);
      if (!nextCursor)
        return null;
      let nextNode = findTargetVertically(wg, scan, forward, x, selectNode);
      if (!nextNode || (forward ? nextCursor.head <= nextNode.before : nextCursor.head >= nextNode.after) && wg.state.doc.resolve(nextCursor.head).depth < nextNode.depth) {
        let coords2 = wg.coordsAtPos(nextCursor.head, nextCursor.headSide);
        if (forward ? coords2.bottom > y : coords2.top < y)
          return GardSelection.cursor(nextCursor.head, nextCursor.headSide, goalColumn);
        if (!nextNode)
          return null;
      }
      if (nextNode instanceof Pos.Plot) {
        scan = forward ? nextNode.start : nextNode.end;
      } else {
        let coords2 = wg.coordsForElement(nextNode.before);
        if (forward ? coords2.bottom > y : coords2.top < y)
          return GardSelection.node(nextNode.before, nextNode.node, goalColumn);
        scan = forward ? nextNode.after : nextNode.before;
      }
    }
  }
  function findTargetVertically(wg, from, forward, x, allowNode) {
    let { parent, index, pos } = wg.state.doc.resolve(from), entering = false;
    for (; ; ) {
      if ((forward ? index == parent.node.content.length : !index) || parent.node.type.orientation == "row" && !entering) {
        if (!parent.parent)
          return null;
        index = parent.index + (forward ? 1 : 0);
        pos = forward ? parent.after : parent.before;
        parent = parent.parent;
        entering = false;
      } else {
        let next = parent.node.content[index - (forward ? 0 : 1)];
        let nextPos = pos - (forward ? 0 : next.length);
        if (next.isLeaf || wg.state.isAtom(next.type)) {
          if (allowNode && next.type.isSelectable && wg.state.isAtom(next.type))
            return Pos.Node.create(parent, next, nextPos, index - (forward ? 0 : 1));
          index += forward ? 1 : -1;
          pos += (forward ? 1 : -1) * next.length;
          continue;
        }
        let node = Pos.Plot.create(parent, next, nextPos, index - (forward ? 0 : 1));
        if (!next.inlineContent && next.type.orientation == "row") {
          let closest = -1, closestPos = -1, closestDist = -1;
          for (let chPos = nextPos + 1, i = 0; i < next.content.length; i++) {
            let ch = next.content[i];
            let tile = wg.docTile.nodeTile(chPos);
            let rect2 = tile.dom.getBoundingClientRect();
            let dist2 = x < rect2.left ? rect2.left - x : x > rect2.right ? x - rect2.right : 0;
            if (closestDist < 0 || dist2 < closestDist) {
              closestDist = dist2;
              closest = i + (forward ? 0 : 1);
              closestPos = chPos + (forward ? 0 : ch.length);
            }
            chPos += ch.length;
          }
          parent = node;
          index = closest;
          pos = closestPos;
          entering = true;
        } else if (next.isTextblock) {
          return node;
        } else {
          parent = node;
          index = forward ? 0 : next.content.length;
          pos += forward ? 1 : -1;
        }
      }
    }
  }
  function moveToLineBoundary(wg, start, forward) {
    let block = wg.state.doc.resolve(start.head).textblockParent;
    if (!block)
      return null;
    let startCoords = wg.coordsAtPos(start.head, start.headSide);
    let ltr = wg.state.textblockLTR(block.node);
    let y = (startCoords.top + startCoords.bottom) / 2, left = forward != ltr;
    let { pos } = wg.posAtCoords({ x: left ? -1e7 : 1e7, y });
    if (pos < block.start || pos > block.end) {
      let blockRect = wg.docTile.nodeTile(block.before).dom.getBoundingClientRect();
      pos = wg.posAtCoords({ x: left ? blockRect.left : blockRect.right, y }).pos;
    }
    return GardSelection.cursor(pos, forward ? -1 : 1);
  }
  var observeOptions = {
    childList: true,
    characterData: true,
    subtree: true,
    attributes: true,
    characterDataOldValue: true
  };
  var DOMObserver = class {
    wg;
    dom;
    win = null;
    observer;
    active = false;
    selectionRange = new DOMSelectionState();
    selectionChanged = false;
    resizeTimeout = -1;
    queue = [];
    dirty = null;
    scrollTargets = [];
    resizeScroll = null;
    darkThemeQuery = null;
    constructor(wg) {
      this.wg = wg;
      this.dom = wg.contentDOM;
      this.observer = new MutationObserver((mutations) => {
        for (let mut of mutations)
          this.queue.push(mut);
        this.wg.scheduleFlush();
      });
      this.onSelectionChange = this.onSelectionChange.bind(this);
      this.onResize = this.onResize.bind(this);
      this.onScroll = this.onScroll.bind(this);
      this.onColorSchemeChange = this.onColorSchemeChange.bind(this);
      if (typeof ResizeObserver == "function") {
        let lastFlushSeen = 0;
        this.resizeScroll = new ResizeObserver(() => {
          if (this.wg.lastFlush != lastFlushSeen) {
            lastFlushSeen = this.wg.lastFlush;
            this.onResize();
          }
        });
      }
      this.readSelectionRange();
    }
    connect() {
      this.observer.observe(this.dom, observeOptions);
      this.resizeScroll?.observe(this.dom);
      for (let dom = this.dom; dom; ) {
        if (dom.nodeType == 1) {
          this.scrollTargets.push(dom);
          dom.addEventListener("scroll", this.onScroll);
          dom = dom.assignedSlot || dom.parentNode;
        } else if (dom.nodeType == 11) {
          dom = dom.host;
        } else {
          break;
        }
      }
      let win = this.win = this.wg.win;
      win.addEventListener("resize", this.onResize);
      win.addEventListener("scroll", this.onScroll);
      win.document.addEventListener("selectionchange", this.onSelectionChange);
      if (typeof win.matchMedia == "function") {
        this.darkThemeQuery = win.matchMedia("(prefers-color-scheme: dark)");
        this.onColorSchemeChange();
        this.darkThemeQuery.addEventListener("change", this.onColorSchemeChange);
      }
    }
    disconnect() {
      this.observer.disconnect();
      this.resizeScroll?.disconnect();
      for (let dom of this.scrollTargets)
        dom.removeEventListener("scroll", this.onScroll);
      this.scrollTargets = [];
      clearTimeout(this.resizeTimeout);
      if (this.win) {
        this.win.removeEventListener("scroll", this.onScroll);
        this.win.removeEventListener("resize", this.onResize);
        this.win.document.removeEventListener("selectionchange", this.onSelectionChange);
        this.win = null;
      }
      if (this.darkThemeQuery) {
        this.darkThemeQuery.removeEventListener("change", this.onColorSchemeChange);
        this.darkThemeQuery = null;
      }
    }
    onScroll(e) {
      this.wg.inputState.runHandlers("scroll", e);
    }
    onResize() {
      if (this.resizeTimeout < 0)
        this.resizeTimeout = setTimeout(() => {
          this.resizeTimeout = -1;
          this.wg.scheduleFlush();
        }, 50);
    }
    onColorSchemeChange() {
      this.wg.configureColorScheme(this.darkThemeQuery.matches ? "dark" : "light");
    }
    onSelectionChange() {
      this.readSelectionRange();
      if (this.selectionChanged) {
        if (this.wg.inputState.lastTouchTime > Date.now() - 100 || !this.wg.focusable)
          this.pollSelection("select.pointer");
        else
          this.wg.scheduleFlush();
      }
    }
    pollSelection(userEvent = "select") {
      if (this.selectionChanged && !this.wg.inputState.pendingComposition && (this.wg.hasFocus || !this.wg.focusable) && hasSelection(this.wg.contentDOM, this.selectionRange)) {
        this.selectionChanged = false;
        let sel = readDOMSelection(this.wg, this.selectionRange);
        if (!sel.eqPos(this.wg.state.selection))
          this.wg.dispatch({ selection: sel, userEvent });
      }
    }
    readSelectionRange() {
      let { wg } = this;
      let selection = getSelection(wg.root);
      if (!selection)
        return false;
      let range = selection;
      if (browser.safari && wg.root.nodeType == 11 && wg.root.activeElement == this.dom) {
        let selRange = selection.getComposedRanges(wg.root)[0];
        if (selRange)
          range = buildSelectionRangeFromRange(wg, selRange);
      }
      if (!range || this.selectionRange.eq(range))
        return false;
      let context = range.anchorNode && wg.docTile.nearest(range.anchorNode);
      if (context instanceof WidgetTile)
        return false;
      this.selectionRange.setRange(range);
      return this.selectionChanged = true;
    }
    setSelectionRange(anchor, head) {
      this.selectionRange.set(anchor.dom, anchor.offset, head.dom, head.offset);
      this.selectionChanged = false;
    }
    clearSelectionRange() {
      this.selectionRange.set(null, 0, null, 0);
      this.selectionChanged = false;
    }
    ignore(f) {
      let result = f();
      this.clear();
      return result;
    }
    clear() {
      this.takeRecords();
      this.readSelectionRange();
    }
    takeRecords() {
      for (let mut of this.observer.takeRecords())
        this.queue.push(mut);
      let records = this.queue;
      if (records.length)
        this.queue = [];
      return records;
    }
    addDirtyRange(from, to) {
      let sections = from ? [from, -1] : [], len = this.wg.flushedState.doc.length;
      sections.push(to - from, -2);
      if (to < len)
        sections.push(len - to, -1);
      this.dirty = this.dirty ? ChangeSet.composeSections(this.dirty, sections) : sections;
    }
    processRecords(records) {
      for (let record of records) {
        let range = this.findMutation(record);
        if (range)
          this.addDirtyRange(range[0], range[1]);
      }
    }
    findMutation(record) {
      let tile = this.wg.docTile.nearest(record.target);
      if (!tile || tile.ignoreMutations)
        return null;
      tile.flags |= 8192;
      if (record.type == "attributes" || record.type == "characterData") {
        if (tile.dom == record.target) {
          return [tile.posBefore, tile.posAfter];
        } else {
          return childRange(tile, record);
        }
      } else if (record.type == "childList") {
        return childRange(tile, record);
      } else {
        return null;
      }
    }
    takeDirty() {
      this.processRecords(this.takeRecords());
      let { dirty } = this;
      this.dirty = null;
      return dirty;
    }
  };
  function childRange(tile, record) {
    let childBefore = findChild$1(tile, record.previousSibling || record.target.previousSibling, -1);
    let childAfter = findChild$1(tile, record.nextSibling || record.target.nextSibling, 1);
    return [
      childBefore ? tile.posBeforeChild(childBefore) + childBefore.length : tile.posAtStart,
      childAfter ? tile.posBeforeChild(childAfter) : tile.posAtEnd
    ];
  }
  function findChild$1(elt, dom, dir) {
    while (dom) {
      let cur = Tile.get(dom);
      if (cur && cur.parent == elt)
        return cur;
      let parent = dom.parentNode;
      dom = parent != elt.dom ? parent : dir > 0 ? dom.nextSibling : dom.previousSibling;
    }
    return null;
  }
  function buildSelectionRangeFromRange(wg, range) {
    let anchorNode = range.startContainer, anchorOffset = range.startOffset;
    let focusNode = range.endContainer, focusOffset = range.endOffset;
    let curAnchor = wg.docTile.resolve(wg.state.selection.anchor, -1);
    if (isEquivalentPosition(curAnchor.dom, curAnchor.offset, focusNode, focusOffset))
      [anchorNode, anchorOffset, focusNode, focusOffset] = [focusNode, focusOffset, anchorNode, anchorOffset];
    return { anchorNode, anchorOffset, focusNode, focusOffset };
  }
  var KeyBinding = class _KeyBinding {
    spec;
    extension;
    constructor(spec) {
      this.spec = spec;
      this.extension = _KeyBinding.source.of(this);
    }
    static of(spec) {
      return new _KeyBinding(spec);
    }
  };
  KeyBinding = /* @__PURE__ */ (function(KeyBinding2) {
    function runScopeHandlers(wg, event, scope) {
      let map = getKeymap(wg.state.facet(KeyBinding2.source), wg.state.facet(KeyBinding2.useDefaultKeymap));
      return runHandlers(map, event, wg, scope);
    }
    KeyBinding2.runScopeHandlers = runScopeHandlers;
    KeyBinding2.source = GardState.Facet.define();
    KeyBinding2.useDefaultKeymap = GardState.Facet.define({
      combine: (input) => input.length ? input[0] : true
    });
    KeyBinding2.defaultKeymap = [
      { key: "Enter", run: enter },
      { key: "Shift-Enter", run: insertLineBreak },
      { key: "Backspace", run: Command.bind(deleteUnit, "backward") },
      { key: "Delete", run: Command.bind(deleteUnit, "forward") },
      { key: "Ctrl-Backspace", mac: "Alt-Backspace", run: Command.bind(deleteWord, "backward") },
      { key: "Ctrl-Delete", mac: "Alt-Delete", run: Command.bind(deleteWord, "forward") },
      { mac: "Cmd-Backspace", run: Command.bind(deleteToLineEnd, "backward") },
      { mac: "Cmd-Delete", run: Command.bind(deleteToLineEnd, "forward") },
      {
        key: "ArrowLeft",
        run: Command.bind(moveByUnit, { dir: "left" }),
        shift: Command.bind(moveByUnit, { dir: "left", extend: true })
      },
      {
        key: "ArrowRight",
        run: Command.bind(moveByUnit, { dir: "right" }),
        shift: Command.bind(moveByUnit, { dir: "right", extend: true })
      },
      {
        key: "ArrowDown",
        run: Command.bind(moveByLine, { dir: "down" }),
        shift: Command.bind(moveByLine, { dir: "down", extend: true })
      },
      {
        key: "ArrowUp",
        run: Command.bind(moveByLine, { dir: "up" }),
        shift: Command.bind(moveByLine, { dir: "up", extend: true })
      },
      {
        key: "Mod-ArrowLeft",
        run: Command.bind(moveByWord, { dir: "left" }),
        shift: Command.bind(moveByWord, { dir: "left", extend: true })
      },
      {
        key: "Mod-ArrowRight",
        run: Command.bind(moveByWord, { dir: "right" }),
        shift: Command.bind(moveByWord, { dir: "right", extend: true })
      },
      {
        mac: "Cmd-ArrowLeft",
        run: Command.bind(moveToLineSide, { dir: "left" }),
        shift: Command.bind(moveToLineSide, { dir: "left", extend: true })
      },
      {
        mac: "Cmd-ArrowRight",
        run: Command.bind(moveToLineSide, { dir: "right" }),
        shift: Command.bind(moveToLineSide, { dir: "right", extend: true })
      },
      {
        mac: "Cmd-ArrowUp",
        run: Command.bind(moveToDocSide, { side: "start" }),
        shift: Command.bind(moveToDocSide, { side: "start", extend: true })
      },
      {
        mac: "Cmd-ArrowDown",
        run: Command.bind(moveToDocSide, { side: "end" }),
        shift: Command.bind(moveToDocSide, { side: "end", extend: true })
      },
      {
        mac: "Ctrl-ArrowUp",
        run: Command.bind(moveByPage, { dir: "up" }),
        shift: Command.bind(moveByPage, { dir: "up", extend: true })
      },
      {
        mac: "Ctrl-ArrowDown",
        run: Command.bind(moveByPage, { dir: "down" }),
        shift: Command.bind(moveByPage, { dir: "down", extend: true })
      },
      {
        key: "PageUp",
        run: Command.bind(moveByPage, { dir: "up" }),
        shift: Command.bind(moveByPage, { dir: "up", extend: true })
      },
      {
        key: "PageDown",
        run: Command.bind(moveByPage, { dir: "down" }),
        shift: Command.bind(moveByPage, { dir: "down", extend: true })
      },
      {
        key: "Home",
        run: Command.bind(moveToLineSide, { dir: "backward" }),
        shift: Command.bind(moveToLineSide, { dir: "backward", extend: true })
      },
      {
        key: "End",
        run: Command.bind(moveToLineSide, { dir: "forward" }),
        shift: Command.bind(moveToLineSide, { dir: "forward", extend: true })
      },
      {
        key: "Mod-Home",
        run: Command.bind(moveToDocSide, { side: "start" }),
        shift: Command.bind(moveToDocSide, { side: "start", extend: true })
      },
      {
        key: "Mod-End",
        run: Command.bind(moveToDocSide, { side: "end" }),
        shift: Command.bind(moveToDocSide, { side: "end", extend: true })
      },
      { key: "Mod-a", run: selectAll },
      { key: "Mod-z", run: undo },
      { key: "Mod-y", mac: "Mod-Shift-z", run: redo },
      { linux: "Ctrl-Shift-z", run: redo },
      {
        mac: "Ctrl-b",
        run: Command.bind(moveByUnit, { dir: "backward" }),
        shift: Command.bind(moveByUnit, { dir: "backward", extend: true })
      },
      {
        mac: "Ctrl-f",
        run: Command.bind(moveByUnit, { dir: "forward" }),
        shift: Command.bind(moveByUnit, { dir: "forward", extend: true })
      },
      {
        mac: "Ctrl-p",
        run: Command.bind(moveByLine, { dir: "up" }),
        shift: Command.bind(moveByLine, { dir: "up", extend: true })
      },
      {
        mac: "Ctrl-n",
        run: Command.bind(moveByLine, { dir: "down" }),
        shift: Command.bind(moveByLine, { dir: "down", extend: true })
      },
      {
        mac: "Ctrl-a",
        run: Command.bind(moveToTextblockSide, { dir: "backward" }),
        shift: Command.bind(moveToTextblockSide, { dir: "backward", extend: true })
      },
      {
        mac: "Ctrl-e",
        run: Command.bind(moveToTextblockSide, { dir: "forward" }),
        shift: Command.bind(moveToTextblockSide, { dir: "forward", extend: true })
      },
      { mac: "Ctrl-d", run: Command.bind(deleteUnit, "forward") },
      { mac: "Ctrl-h", run: Command.bind(deleteUnit, "backward") },
      { mac: "Ctrl-k", run: Command.bind(deleteToLineEnd, "forward") },
      { mac: "Ctrl-Alt-h", run: Command.bind(deleteWord, "backward") },
      { mac: "Ctrl-o", run: insertLineBreak },
      { mac: "Ctrl-t", run: transposeChars },
      { mac: "Ctrl-v", run: Command.bind(moveByPage, { dir: "down" }) }
    ].map(KeyBinding2.of);
    ;
    return KeyBinding2;
  })(KeyBinding);
  var currentPlatform = /* @__PURE__ */ (() => browser.mac ? "mac" : browser.windows ? "win" : browser.linux ? "linux" : "key")();
  function normalizeKeyName(name, platform) {
    const parts = name.split(/-(?!$)/);
    let result = parts[parts.length - 1];
    if (result == "Space")
      result = " ";
    else if (/^[A-Z]$/.test(result))
      result = result.toLowerCase();
    let alt, ctrl, shift, meta;
    for (let i = 0; i < parts.length - 1; ++i) {
      const mod = parts[i];
      if (/^(cmd|meta|m)$/i.test(mod))
        meta = true;
      else if (/^a(lt)?$/i.test(mod))
        alt = true;
      else if (/^(c|ctrl|control)$/i.test(mod))
        ctrl = true;
      else if (/^s(hift)?$/i.test(mod))
        shift = true;
      else if (/^mod$/i.test(mod)) {
        if (platform == "mac")
          meta = true;
        else
          ctrl = true;
      } else
        throw new Error("Unrecognized modifier name: " + mod);
    }
    if (alt)
      result = "Alt-" + result;
    if (ctrl)
      result = "Ctrl-" + result;
    if (meta)
      result = "Meta-" + result;
    if (shift)
      result = "Shift-" + result;
    return result;
  }
  function modifiers(name, event) {
    if (event.altKey)
      name = "Alt-" + name;
    if (event.ctrlKey)
      name = "Ctrl-" + name;
    if (event.metaKey)
      name = "Meta-" + name;
    if (event.shiftKey)
      name = "Shift-" + name;
    return name;
  }
  var NormalizedBinding = class {
    flags;
    name;
    command;
    constructor(flags, name, command) {
      this.flags = flags;
      this.name = name;
      this.command = command;
    }
  };
  var keymapCache = /* @__PURE__ */ (() => /* @__PURE__ */ new WeakMap())();
  function getKeymap(bindings, addDefault) {
    let found = keymapCache.get(bindings);
    if (!found || found.deflt != addDefault) {
      found = {
        map: buildKeymap(addDefault ? bindings.concat(KeyBinding.defaultKeymap) : bindings, currentPlatform),
        deflt: addDefault
      };
      keymapCache.set(bindings, found);
    }
    return found.map;
  }
  function bind(run) {
    return (wg) => Command.dispatch(wg, run);
  }
  function buildKeymap(bindings, platform) {
    let scopes = /* @__PURE__ */ Object.create(null);
    for (let { spec: b } of bindings) {
      let baseFlags = b.allowDefault ? 8 : 0;
      for (let scope of b.scope ? b.scope.split(" ") : ["editor"]) {
        let array = scopes[scope] || (scopes[scope] = []);
        let key = b[platform] || b.key;
        if (b.char) {
          if (key)
            throw new Error("A key binding may not provide both a char and a key field");
          if (b.shift)
            throw new Error("Shift-modified bindings are not supported for char bindings");
          array.push(new NormalizedBinding(baseFlags | 1, b.char, bind(b.run)));
        }
        if (key)
          array.push(new NormalizedBinding(baseFlags | 2, normalizeKeyName(key, platform), bind(b.run)));
        if (key && b.shift)
          array.push(new NormalizedBinding(baseFlags | 2, normalizeKeyName("Shift-" + key, platform), bind(b.shift)));
        if (b.any)
          array.push(new NormalizedBinding(4, "", b.any));
      }
    }
    return scopes;
  }
  function runHandlers(map, event, wg, scope) {
    let handlers = map[scope];
    if (!handlers)
      return false;
    let key = event.key, charCode = key.codePointAt(0);
    let altGr = event.getModifierState("AltGraph"), fromCode = charKeyCodes[event.keyCode];
    let isChar = codePointSize2(charCode) == key.length;
    let char = isChar ? String.fromCodePoint(charCode) : null;
    let base = modifiers(key, event);
    let fallback = isChar && !altGr && fromCode && fromCode != base ? modifiers(fromCode, event) : null;
    let handled = false, didMatch = false, allowDefault = false;
    for (let binding of handlers) {
      let matched = binding.flags & 1 && (altGr || !event.ctrlKey && !event.metaKey) && binding.name == char || binding.flags & 2 && (binding.name == base || binding.name == fallback) || binding.flags & 4;
      if (matched) {
        didMatch = true;
        if (!handled && binding.command(wg, event)) {
          handled = true;
        } else if (binding.flags & 8) {
          allowDefault = true;
        }
      }
    }
    if (didMatch && !allowDefault)
      event.preventDefault();
    return handled;
  }
  function codePointSize2(code2) {
    return code2 < 65536 ? 1 : 2;
  }
  function buildCharKeyCodes() {
    let result = {
      32: " ",
      59: ";",
      61: "=",
      106: "*",
      107: "+",
      108: ",",
      109: "-",
      110: ".",
      111: "/",
      173: "-",
      186: ";",
      187: "=",
      188: ",",
      189: "-",
      190: ".",
      191: "/",
      192: "`",
      219: "[",
      220: "\\",
      221: "]",
      222: "'"
    };
    for (var i = 0; i < 10; i++)
      result[48 + i] = String(i);
    for (var i = 1; i <= 24; i++)
      result[i + 111] = "F" + i;
    for (var i = 65; i <= 90; i++)
      result[i] = String.fromCharCode(i + 32);
    return result;
  }
  var charKeyCodes = /* @__PURE__ */ buildCharKeyCodes();
  var eventHandler = /* @__PURE__ */ GardState.Facet.define({
    combine: (handlers) => {
      let result = /* @__PURE__ */ Object.create(null);
      for (let { event, handler } of handlers)
        (result[event] || (result[event] = [])).push(handler);
      return result;
    }
  });
  var eventObserver = /* @__PURE__ */ GardState.Facet.define({
    combine: (observers) => {
      let result = /* @__PURE__ */ Object.create(null);
      for (let { event, observer } of observers)
        (result[event] || (result[event] = [])).push(observer);
      return result;
    }
  });
  var InputState = class {
    wg;
    shiftKey = false;
    lastKeyCode = 0;
    lastKeyTime = 0;
    lastTouchTime = 0;
    lastScrollTop = 0;
    lastScrollLeft = 0;
    lastContextMenu = 0;
    scrollHandlers = [];
    handlers = /* @__PURE__ */ Object.create(null);
    composing = null;
    compositionEndedAt = 0;
    compositionPendingKey = false;
    pendingComposition = null;
    pendingDeletion = null;
    modifiedTextNodes = /* @__PURE__ */ new Set();
    wrappingComposition = null;
    mouseSelection = null;
    draggedContent = null;
    notifiedFocused;
    constructor(wg) {
      this.wg = wg;
      this.handleEvent = this.handleEvent.bind(this);
      this.notifiedFocused = wg.hasFocus;
      if (browser.safari)
        wg.contentDOM.addEventListener("input", () => null);
    }
    handleEvent(event) {
      if (!eventBelongsToEditor(this.wg, event) || this.ignoreDuringComposition(event))
        return;
      if (event.type == "keydown" && this.keydown(event))
        return;
      if (event.type == "keyup" && event.keyCode == 16)
        this.shiftKey = false;
      this.runHandlers(event.type, event);
    }
    runHandlers(type, event) {
      let handlers = this.handlers[type];
      if (handlers) {
        for (let observer of handlers.observers)
          observer(this.wg, event);
        for (let handler of handlers.handlers) {
          if (event.defaultPrevented)
            break;
          if (handler(this.wg, event)) {
            event.preventDefault();
            break;
          }
        }
      }
    }
    ensureHandlers(state) {
      let handlers = computeHandlers(state), prev = this.handlers, dom = this.wg.contentDOM;
      for (let type in handlers)
        if (type != "scroll") {
          let passive = !handlers[type].handlers.length;
          let exists = prev[type];
          if (exists && passive != !exists.handlers.length) {
            dom.removeEventListener(type, this.handleEvent);
            exists = null;
          }
          if (!exists)
            dom.addEventListener(type, this.handleEvent, { passive });
        }
      for (let type in prev)
        if (type != "scroll" && !handlers[type])
          dom.removeEventListener(type, this.handleEvent);
      this.handlers = handlers;
    }
    keydown(event) {
      this.lastKeyCode = event.keyCode;
      this.lastKeyTime = Date.now();
      this.shiftKey = event.keyCode == 16 || event.shiftKey;
      return false;
    }
    ignoreDuringComposition(event) {
      if (!/^key/.test(event.type))
        return false;
      if (this.composing && this.composing.changes)
        return true;
      if (browser.safari && !browser.ios && this.compositionPendingKey && Date.now() - this.compositionEndedAt < 100) {
        this.compositionPendingKey = false;
        return true;
      }
      return false;
    }
    startMouseSelection(mouseSelection) {
      if (this.mouseSelection)
        this.mouseSelection.disconnect();
      this.mouseSelection = mouseSelection;
    }
    update(update) {
      if (this.mouseSelection)
        this.mouseSelection.update(update);
      if (this.draggedContent && update.docChanged)
        this.draggedContent = this.draggedContent.map(update.changes, update.state);
      if (update.transactions.length)
        this.lastKeyCode = 0;
      this.modifiedTextNodes.clear();
      if (this.composing) {
        this.composing.targetPos = update.changes.mapPos(this.composing.targetPos, -1);
        if (this.composing.target)
          this.modifiedTextNodes.add(this.composing.target);
      }
    }
    findComposition() {
      let comp = this.composing;
      if (!comp)
        return null;
      let { focusNode, focusOffset } = this.wg.observer.selectionRange;
      if (!focusNode)
        return null;
      let before = textNodeBefore(focusNode, focusOffset), after = textNodeAfter(focusNode, focusOffset);
      let newTarget;
      if (!before || !after || before == after) {
        newTarget = before || after;
      } else {
        let tileBefore = Tile.get(before), tileAfter = Tile.get(after);
        newTarget = !tileBefore || tileBefore.text != before.nodeValue ? before : !tileAfter || tileAfter.text != after.nodeValue ? after : comp.target == after ? after : before;
      }
      if (!newTarget)
        return comp.target = null;
      if (newTarget != comp.target) {
        let pos = this.wg.docTile.posBeforeDOM(newTarget);
        if (pos == null)
          return comp.target = null;
        comp.target = newTarget;
        this.modifiedTextNodes.add(newTarget);
        comp.targetPos = this.wg.viewState.mapPosPending(pos, -1);
      }
      return comp;
    }
    markModifiedNodes(range) {
      let { startContainer: start, startOffset: startOff, endContainer: end, endOffset: endOff } = range;
      for (; ; ) {
        if (start.nodeType == 3 && !this.modifiedTextNodes.has(start))
          this.modifiedTextNodes.add(start);
        if (start == end && (start.nodeType != 1 || startOff == endOff))
          break;
        if (start.nodeType != 1 || startOff == start.childNodes.length) {
          startOff = domIndex(start) + 1;
          start = start.parentNode;
        } else {
          start = start.childNodes[startOff];
          startOff = 0;
        }
      }
    }
    connect() {
      this.ensureHandlers(this.wg.state);
    }
    disconnect() {
      if (this.mouseSelection)
        this.mouseSelection.disconnect();
    }
  };
  function bindHandler(handler) {
    return (wg, event) => {
      try {
        return handler(event, wg);
      } catch (e) {
        logException(wg.state, e);
      }
    };
  }
  function computeHandlers(state) {
    let result = /* @__PURE__ */ Object.create(null);
    function record(type) {
      return result[type] || (result[type] = { observers: [], handlers: [] });
    }
    let h = state.facet(eventHandler), o = state.facet(eventObserver);
    for (let type in h)
      for (let handler of h[type])
        record(type).handlers.push(bindHandler(handler));
    for (let type in o)
      for (let observer of o[type])
        record(type).observers.push(bindHandler(observer));
    for (let type in baseHandlers)
      record(type).handlers.push(baseHandlers[type]);
    for (let type in baseObservers)
      record(type).observers.push(baseObservers[type]);
    return result;
  }
  var dragScrollMargin = 6;
  var mouseSelectionStyle = /* @__PURE__ */ GardState.Facet.define();
  function dragScrollSpeed(dist2) {
    return Math.max(0, dist2) * 0.7 + 8;
  }
  function dist(a, b) {
    return Math.max(Math.abs(a.clientX - b.clientX), Math.abs(a.clientY - b.clientY));
  }
  var MouseSelection = class {
    wg;
    startEvent;
    style;
    mustSelect;
    dragging;
    extend;
    lastEvent;
    scrollParents;
    scrollSpeed = { x: 0, y: 0 };
    scrolling = -1;
    constructor(wg, startEvent, style2, mustSelect) {
      this.wg = wg;
      this.startEvent = startEvent;
      this.style = style2;
      this.mustSelect = mustSelect;
      this.lastEvent = startEvent;
      this.scrollParents = scrollableParents(wg.contentDOM);
      let doc2 = wg.contentDOM.ownerDocument;
      doc2.addEventListener("mousemove", this.move = this.move.bind(this));
      doc2.addEventListener("mouseup", this.up = this.up.bind(this));
      this.extend = startEvent.shiftKey;
      this.dragging = isInPrimarySelection(wg, startEvent) && startEvent.detail == 1 ? null : false;
    }
    start(event) {
      if (this.dragging === false)
        this.select(event);
    }
    move(event) {
      if (event.buttons == 0)
        return this.disconnect();
      if (this.dragging || this.dragging == null && dist(this.startEvent, event) < 10)
        return;
      this.select(this.lastEvent = event);
      let sx = 0, sy = 0;
      let left = 0, top2 = 0, right = this.wg.win.innerWidth, bottom = this.wg.win.innerHeight;
      if (this.scrollParents.x)
        ({ left, right } = this.scrollParents.x.getBoundingClientRect());
      if (this.scrollParents.y)
        ({ top: top2, bottom } = this.scrollParents.y.getBoundingClientRect());
      let margins = this.wg.getScrollMargins();
      if (event.clientX - margins.left <= left + dragScrollMargin)
        sx = -dragScrollSpeed(left - event.clientX);
      else if (event.clientX + margins.right >= right - dragScrollMargin)
        sx = dragScrollSpeed(event.clientX - right);
      if (event.clientY - margins.top <= top2 + dragScrollMargin)
        sy = -dragScrollSpeed(top2 - event.clientY);
      else if (event.clientY + margins.bottom >= bottom - dragScrollMargin)
        sy = dragScrollSpeed(event.clientY - bottom);
      this.setScrollSpeed(sx, sy);
    }
    up(event) {
      if (this.dragging == null)
        this.select(this.lastEvent);
      if (!this.dragging)
        event.preventDefault();
      this.disconnect();
    }
    disconnect() {
      this.setScrollSpeed(0, 0);
      let doc2 = this.wg.dom.ownerDocument;
      doc2.removeEventListener("mousemove", this.move);
      doc2.removeEventListener("mouseup", this.up);
      this.wg.inputState.mouseSelection = this.wg.inputState.draggedContent = null;
    }
    setScrollSpeed(sx, sy) {
      this.scrollSpeed = { x: sx, y: sy };
      if (sx || sy) {
        if (this.scrolling < 0)
          this.scrolling = setInterval(() => this.scroll(), 50);
      } else if (this.scrolling > -1) {
        clearInterval(this.scrolling);
        this.scrolling = -1;
      }
    }
    scroll() {
      let { x, y } = this.scrollSpeed;
      if (x && this.scrollParents.x) {
        this.scrollParents.x.scrollLeft += x;
        x = 0;
      }
      if (y && this.scrollParents.y) {
        this.scrollParents.y.scrollTop += y;
        y = 0;
      }
      if (x || y)
        this.wg.win.scrollBy(x, y);
      if (this.dragging === false)
        this.select(this.lastEvent);
    }
    select(event) {
      let { wg } = this, selection = this.style.get(event, this.extend);
      if (this.mustSelect || !selection.eqPos(wg.state.selection))
        this.wg.dispatch({
          selection,
          userEvent: "select.pointer"
        });
      this.mustSelect = false;
    }
    update(update) {
      if (update.transactions.some((tr) => tr.isUserEvent("input.type")))
        this.disconnect();
      else if (this.style.update(update))
        setTimeout(() => this.select(this.lastEvent), 20);
    }
  };
  var dragBehavior = /* @__PURE__ */ GardState.Facet.define();
  function dragMovesSelection(wg, event) {
    let facet = wg.state.facet(dragBehavior);
    return facet.length ? facet[0](event) : browser.mac ? !event.altKey : !event.ctrlKey;
  }
  function isInPrimarySelection(wg, event) {
    let { selection } = wg.state;
    if (selection.empty)
      return false;
    let sel = getSelection(wg.root);
    if (!sel || sel.rangeCount == 0)
      return true;
    let rects = sel.getRangeAt(0).getClientRects();
    for (let i = 0; i < rects.length; i++) {
      let rect2 = rects[i];
      if (rect2.left <= event.clientX && rect2.right >= event.clientX && rect2.top <= event.clientY && rect2.bottom >= event.clientY)
        return true;
    }
    return false;
  }
  function eventBelongsToEditor(wg, event) {
    if (!event.bubbles)
      return true;
    if (event.defaultPrevented)
      return false;
    for (let node = event.target, tile; node != wg.contentDOM; node = node.parentNode)
      if (!node || node.nodeType == 11 || (tile = Tile.get(node)) && tile.handleEvent(event, wg))
        return false;
    return true;
  }
  function queryPos(wg, event) {
    return wg.posAtCoords({ x: event.clientX, y: event.clientY });
  }
  function rangeForClick(wg, pos, type) {
    if (type < 3 && pos.target != null) {
      let target = wg.state.doc.nodeAt(pos.target);
      if (target && target.type.isSelectable && wg.state.isAtom(target.type))
        return GardSelection.node(pos.target, target);
    }
    if (type == 1) {
      return GardSelection.near(wg.state, pos.pos, pos.side || -1);
    } else if (type == 2) {
      return wg.state.wordAt(pos.pos, pos.side || 1);
    } else {
      let cx = wg.state.doc.resolve(pos.pos), block = cx.textblockParent;
      if (block)
        return GardSelection.range(block.start, block.end);
      else
        return GardSelection.near(wg.state, pos.pos, pos.side || -1);
    }
  }
  function basicMouseSelection(wg, event) {
    let start = queryPos(wg, event), type = event.detail;
    let startSel = wg.state.selection;
    return {
      update(update) {
        if (update.docChanged) {
          start = start.map(update.changes);
          startSel = startSel.map(update.changes, update.state);
        }
      },
      get(event2, extend) {
        let cur = queryPos(wg, event2), range = rangeForClick(wg, cur, type), { from, to } = range;
        if (extend) {
          if (from < startSel.anchor)
            return GardSelection.range(startSel.anchor, from, from < to ? 1 : cur.side);
          else
            return GardSelection.range(startSel.anchor, to, from < to ? -1 : cur.side);
        }
        if (start.pos != cur.pos) {
          let startRange = rangeForClick(wg, start, type);
          from = Math.min(startRange.from, from);
          to = Math.max(startRange.to, to);
        }
        return from == range.from && to == range.to ? range : GardSelection.range(from, to, cur.side);
      }
    };
  }
  var dropHandler = /* @__PURE__ */ GardState.Facet.define();
  var pasteHandler = /* @__PURE__ */ GardState.Facet.define();
  function selectionSlice(state) {
    return {
      slice: state.doc.slice(state.selection.from, state.selection.to),
      context: state.doc.contextAt(state.selection.from)
    };
  }
  function copy(wg, event) {
    let { state } = wg;
    if (!state.selection.empty && event.clipboardData) {
      let { slice, context } = selectionSlice(state);
      writeClipboard(state, slice, context, event.clipboardData);
      if (event.type == "cut" && !state.readOnly)
        wg.dispatch({
          changes: state.selection.ranges.map((r) => ({ from: r.from, to: r.to, fit: true })),
          selection: (cx, changes) => GardSelection.near(cx, changes.mapPos(state.selection.from, -1), 1),
          scrollIntoView: true,
          userEvent: "delete.cut"
        });
    }
    return true;
  }
  var isFocusChange = /* @__PURE__ */ Transaction.Annotation.define();
  function updateForFocusChange(wg) {
    setTimeout(() => {
      let focus = wg.hasFocus;
      if (focus != wg.inputState.notifiedFocused) {
        wg.inputState.notifiedFocused = focus;
        wg.dispatch({ annotations: isFocusChange.of(focus) });
      }
    }, 10);
  }
  function getCompositionInfo(wg) {
    let wrap = wg.inputState.wrappingComposition;
    if (wrap) {
      let sel = wg.state.selection.head;
      return {
        fromB: sel,
        toB: sel,
        text: "",
        target: null,
        wrapCursor: wrap
      };
    }
    let comp = wg.inputState.findComposition();
    if (!comp)
      return null;
    let value = comp.target.nodeValue;
    return {
      fromB: comp.targetPos,
      toB: comp.targetPos + value.length,
      text: value,
      target: comp.target
    };
  }
  function findCompositionSelection(node, offset, target, targetPos) {
    if (node == target)
      return targetPos + offset;
    if (node.compareDocumentPosition(target) & 2)
      return targetPos + target.nodeValue.length;
    return targetPos;
  }
  function compositionEnd(wg) {
    let comp = wg.inputState.composing;
    wg.inputState.composing = null;
    wg.inputState.compositionEndedAt = Date.now();
    if (comp && comp.target) {
      wg.observer.addDirtyRange(comp.targetPos, comp.targetPos + comp.target.nodeValue.length);
      wg.flush();
    }
  }
  function compositionUpdate(wg, event) {
    if (!wg.inputState.composing) {
      wg.inputState.composing = { changes: 0, target: null, targetPos: 0 };
      let wrap = null;
      if (!wg.inputState.composing.changes && !event.data) {
        let sel = wg.state.selection, rSel = wg.state.sel;
        if (sel.empty && (sel instanceof GardSelection.Text && sel.marks || !rSel.head.inText && rSel.head.index) && !eqArray2(rSel.head.nodeBefore?.tag.marks, rSel.activeMarks))
          wrap = rSel.activeMarks;
      }
      if (wrap)
        try {
          wg.inputState.wrappingComposition = wrap;
          wg.flush();
        } finally {
          wg.inputState.wrappingComposition = null;
        }
    }
  }
  var inputTypeCommands = /* @__PURE__ */ (() => ({
    historyUndo: undo,
    historyRedo: redo,
    insertLineBreak,
    insertParagraph: enter,
    deleteContentBackward: Command.bind(deleteUnit, "backward"),
    deleteContentForward: Command.bind(deleteUnit, "forward"),
    deleteWordBackward: Command.bind(deleteWord, "backward"),
    deleteWordForward: Command.bind(deleteWord, "forward"),
    deleteSoftLineBackward: Command.bind(deleteToLineEnd, "backward"),
    deleteSoftLineForward: Command.bind(deleteToLineEnd, "forward"),
    deleteHardLineBackward: Command.bind(deleteToLineEnd, "backward"),
    deleteHardLineForward: Command.bind(deleteToLineEnd, "forward"),
    deleteContent: (wg) => {
      let tr = deleteSelection(wg.state);
      if (tr)
        wg.dispatch(tr);
      return !!tr;
    },
    insertTranspose: transposeChars,
    deleteEntireSoftLine: deleteLine,
    formatBold: toggleStrong,
    formatItalic: toggleEmphasis,
    formatUnderline: toggleUnderline,
    formatJustifyCenter: Command.bind(setAlignment, "center"),
    formatJustifyLeft: Command.bind(setAlignment, "left"),
    formatJustifyRight: Command.bind(setAlignment, "right")
  }))();
  function interpretDOMPosition(wg, node, offset, bias) {
    if (node.nodeType == 3 && wg.viewState.pending.length && wg.inputState.modifiedTextNodes.has(node)) {
      let parent = wg.docTile.nearest(node);
      if (parent?.isText && parent.dom == node) {
        let start = parent.posAtStart;
        return wg.viewState.mapPosPending(start, bias) + offset;
      }
    }
    let pos = wg.docTile.posFromDOM(node, offset);
    return wg.viewState.mapPosPending(pos, bias);
  }
  function inputEventRange(event, wg, preferSel = false) {
    let range = event.getTargetRanges()[0];
    let from = interpretDOMPosition(wg, range.startContainer, range.startOffset, -1);
    let to = interpretDOMPosition(wg, range.endContainer, range.endOffset, -1);
    let { pending } = wg.viewState;
    if (pending.length && preferSel && !wg.inputState.composing && from == to) {
      let fromMax = interpretDOMPosition(wg, range.startContainer, range.startOffset, 1);
      if (from <= wg.state.selection.from && fromMax >= wg.state.selection.to)
        return wg.state.selection;
    }
    return { from, to };
  }
  var baseHandlers = {
    keydown(wg, event) {
      return KeyBinding.runScopeHandlers(wg, event, "editor");
    },
    mousedown(wg, event) {
      wg.inputState.shiftKey = event.shiftKey;
      if (wg.inputState.lastTouchTime > Date.now() - 500 || !wg.focusable)
        return false;
      let style2 = null;
      for (let makeStyle of wg.state.facet(mouseSelectionStyle)) {
        style2 = makeStyle(wg, event);
        if (style2)
          break;
      }
      if (!style2 && event.button == 0)
        style2 = basicMouseSelection(wg, event);
      if (style2) {
        let mustFocus = !wg.hasFocus;
        wg.inputState.startMouseSelection(new MouseSelection(wg, event, style2, mustFocus));
        if (mustFocus)
          wg.observer.ignore(() => {
            wg.contentDOM.focus({ preventScroll: true });
            let active = wg.root.activeElement;
            if (active && !active.contains(wg.contentDOM))
              active.blur();
          });
        let mouseSel = wg.inputState.mouseSelection;
        if (mouseSel) {
          mouseSel.start(event);
          return mouseSel.dragging === false;
        }
      }
      return false;
    },
    dragstart(wg, event) {
      let { selection } = wg.state;
      let { inputState } = wg;
      if (inputState.mouseSelection)
        inputState.mouseSelection.dragging = true;
      inputState.draggedContent = selection;
      if (event.dataTransfer) {
        let { slice, context } = selectionSlice(wg.state);
        writeClipboard(wg.state, slice, context, event.dataTransfer);
        event.dataTransfer.effectAllowed = "copyMove";
      }
      return false;
    },
    dragend(wg) {
      wg.inputState.draggedContent = null;
      return false;
    },
    copy,
    cut: copy,
    drop(wg, event) {
      if (!event.dataTransfer || wg.state.readOnly)
        return true;
      let content = readClipboard(wg.state, event.dataTransfer, wg.state.sel.head, false);
      if (!content)
        return false;
      let dropPos = wg.posAtCoords({ x: event.clientX, y: event.clientY }).pos;
      let { draggedContent } = wg.inputState;
      let del = draggedContent && dragMovesSelection(wg, event) ? { from: draggedContent.from, to: draggedContent.to } : null;
      if (wg.state.facet(dropHandler).some((f) => f(wg, event, dropPos, del, content.slice, content.context)))
        return true;
      let ins = { from: dropPos, insert: content.slice, fit: content.context };
      let changes = ChangeSet.create(wg.state.doc, del ? [del, ins] : ins);
      wg.focus();
      wg.dispatch({
        changes,
        selection: GardSelection.range(changes.mapPos(dropPos, -1), changes.mapPos(dropPos, 1)),
        userEvent: del ? "move.drop" : "input.drop"
      });
      wg.inputState.draggedContent = null;
      return true;
    },
    paste(wg, event) {
      if (wg.state.readOnly || !event.clipboardData)
        return true;
      let { state } = wg;
      let content = readClipboard(state, event.clipboardData, state.sel.head, wg.inputState.shiftKey);
      if (wg.state.facet(pasteHandler).some((h) => h(wg, event, content ? content.slice : Slice.empty, content ? content.context : [])))
        return true;
      if (content) {
        wg.dispatch({
          changes: {
            from: state.selection.from,
            to: state.selection.to,
            insert: content.slice,
            fit: content.context
          },
          selection: (cx, changes) => GardSelection.near(cx, changes.mapPos(state.selection.to, 1), -1),
          userEvent: "input.paste",
          scrollIntoView: true
        });
      }
      return true;
    },
    beforeinput(wg, event) {
      let type = event.inputType;
      let command = inputTypeCommands[type];
      if (command) {
        if (browser.android && browser.chrome && (type == "deleteContentBackward" || type == "deleteContentForward")) {
          wg.inputState.pendingDeletion = inputEventRange(event, wg);
          wg.inputState.markModifiedNodes(event.getTargetRanges()[0]);
          return false;
        }
        Command.dispatch(wg, command);
        return true;
      }
      if (type == "insertText") {
        if (browser.safari && wg.inputState.composing)
          compositionEnd(wg);
        let insert = event.data.replace(/\r\n?|\n/g, " ");
        let { from, to } = inputEventRange(event, wg, true);
        Command.dispatch(wg, insertText, { from, to, insert, userEvent: "input.type" });
        return true;
      } else if (type == "insertReplacementText" || type == "insertFromYank") {
        let slice = readClipboard(wg.state, event.dataTransfer, wg.state.sel.head, true)?.slice;
        if (slice) {
          let { from, to } = inputEventRange(event, wg);
          let sel = wg.state.selection, touchesSel = from <= sel.to && to >= sel.from;
          wg.dispatch({
            changes: { from, to, insert: slice, fit: true },
            selection: touchesSel ? (cx, changes) => {
              return GardSelection.near(cx, changes.mapPos(to, 1), -1);
            } : void 0,
            scrollIntoView: touchesSel,
            userEvent: "insert.replacementText"
          });
          return true;
        }
      } else if (type == "insertCompositionText") {
        if (!wg.inputState.composing)
          wg.inputState.composing = { changes: 0, target: null, targetPos: 0 };
        let range = inputEventRange(event, wg);
        wg.inputState.pendingComposition = { from: range.from, to: range.to, text: event.data };
      } else if (type == "formatSetBlockTextDirection") {
        if (event.data == "ltr" || event.data == "rtl") {
          Command.dispatch(wg, setDirection, event.data);
          return true;
        }
      }
      return false;
    },
    input(wg, event) {
      let type = event.inputType;
      if (type == "insertCompositionText" && wg.inputState.pendingComposition) {
        if (wg.state.readOnly)
          return true;
        let { from, to, text } = wg.inputState.pendingComposition;
        wg.inputState.pendingComposition = null;
        let start = !wg.inputState.composing.changes;
        wg.inputState.composing.changes++;
        wg.observer.readSelectionRange();
        let sel = wg.observer.selectionRange;
        if (!sel.focusNode)
          return false;
        let comp = wg.inputState.findComposition();
        let userEvent = "input.type.compose" + (start ? ".start" : "");
        if (comp && sel.focusNode) {
          let anchor = findCompositionSelection(sel.anchorNode, sel.anchorOffset, comp.target, comp.targetPos);
          let head = sel.empty ? anchor : findCompositionSelection(sel.focusNode, sel.focusOffset, comp.target, comp.targetPos);
          if (head != anchor || head != from + text.length) {
            let { selection } = wg.state;
            let marks = from == selection.from && to == selection.to && wg.state.sel.activeMarks || wg.state.doc.resolve(from).marks(wg.state.doc.resolve(to));
            wg.dispatch({
              changes: { from, to, insert: [Leaf.Text.of(text, marks)], fit: true },
              selection: GardSelection.range(anchor, head),
              userEvent
            });
            return false;
          }
        }
        Command.dispatch(wg, insertText, { from, to, insert: text, userEvent });
        return false;
      } else if (browser.android && browser.chrome && (type == "deleteContentBackward" || type == "deleteContentForward") && wg.inputState.pendingDeletion) {
        if (wg.state.readOnly)
          return true;
        let { from, to } = wg.inputState.pendingDeletion;
        wg.inputState.pendingDeletion = null;
        wg.dispatch({
          changes: { from, to, fit: true },
          userEvent: "delete"
        });
        return false;
      }
      return true;
    }
  };
  var baseObservers = {
    scroll(wg) {
      wg.inputState.lastScrollTop = wg.scrollDOM.scrollTop;
      wg.inputState.lastScrollLeft = wg.scrollDOM.scrollLeft;
    },
    touchstart(wg, e) {
      wg.inputState.lastTouchTime = Date.now();
    },
    touchmove(wg) {
      wg.inputState.lastTouchTime = Date.now();
    },
    focus(wg) {
      if (!wg.scrollDOM.scrollTop && (wg.inputState.lastScrollTop || wg.inputState.lastScrollLeft)) {
        wg.scrollDOM.scrollTop = wg.inputState.lastScrollTop;
        wg.scrollDOM.scrollLeft = wg.inputState.lastScrollLeft;
      }
      updateForFocusChange(wg);
    },
    blur(wg) {
      wg.observer.clearSelectionRange();
      updateForFocusChange(wg);
    },
    compositionstart: compositionUpdate,
    compositionupdate: compositionUpdate,
    compositionend(wg) {
      compositionEnd(wg);
    },
    contextmenu(wg) {
      wg.inputState.lastContextMenu = Date.now();
    }
  };
  var scrollIntoView = /* @__PURE__ */ Transaction.Effect.define({ map: (t, ch) => t.map(ch) });
  var selectionScrollSpec = {
    x: "nearest",
    y: "nearest",
    xMargin: 5,
    yMargin: 5
  };
  var ScrollTarget = class _ScrollTarget {
    from;
    to;
    assoc;
    spec;
    constructor(from, to, assoc, spec) {
      this.from = from;
      this.to = to;
      this.assoc = assoc;
      this.spec = spec;
    }
    map(changes) {
      if (changes.empty)
        return this;
      let from, to;
      if (this.from == this.to) {
        from = to = changes.mapPos(this.from, this.assoc);
      } else {
        from = changes.mapPos(this.from, 1);
        to = Math.max(from, changes.mapPos(this.to, -1));
      }
      return new _ScrollTarget(from, to, this.assoc, this.spec);
    }
    clip(state) {
      let len = state.doc.length;
      return this.to <= len ? this : new _ScrollTarget(Math.min(len, this.from), Math.min(len, this.to), this.assoc, this.spec);
    }
  };
  var ViewState = class {
    state;
    initialized = false;
    contentDOMWidth = 0;
    contentDOMHeight = 0;
    editorHeight = 0;
    editorOffset = 0;
    editorWidth = 0;
    scrollTarget = null;
    styleLTR = true;
    flushedState;
    pending = [];
    constructor(state) {
      this.state = state;
      this.flushedState = state;
    }
    update(tr) {
      if (this.scrollTarget)
        this.scrollTarget = this.scrollTarget.map(tr.changes);
      if (tr.scrollIntoView) {
        let { selection: sel } = tr.state;
        this.scrollTarget = new ScrollTarget(sel.head, sel.head, sel.headSide, selectionScrollSpec);
      }
      for (let e of tr.effects)
        if (e.is(scrollIntoView))
          this.scrollTarget = e.value.clip(this.state);
      if (tr.startState != this.state)
        throw new Error("Mismatched transaction");
      this.pending = this.pending.concat(tr);
      this.state = tr.state;
    }
    flush() {
      this.flushedState = this.state;
      this.pending = [];
    }
    measure(wg) {
      let dom = wg.contentDOM, style2 = window.getComputedStyle(dom);
      this.styleLTR = style2.direction == "ltr";
      let domRect = dom.getBoundingClientRect();
      this.contentDOMHeight = domRect.height;
      let result = 0;
      if (this.editorWidth != wg.scrollDOM.clientWidth) {
        this.editorWidth = wg.scrollDOM.clientWidth;
        result |= 2;
      }
      let contentWidth = domRect.width;
      if (this.contentDOMWidth != contentWidth || this.editorHeight != wg.scrollDOM.clientHeight || this.editorOffset != wg.scrollDOM.offsetTop) {
        this.contentDOMWidth = domRect.width;
        this.editorHeight = wg.scrollDOM.clientHeight;
        this.editorOffset = wg.scrollDOM.offsetTop;
        result |= 2;
      }
      return result;
    }
    initialMeasure(wg) {
      this.initialized = true;
      let domRect = wg.contentDOM.getBoundingClientRect();
      this.contentDOMWidth = domRect.width;
      this.contentDOMHeight = domRect.height;
      this.editorHeight = wg.scrollDOM.clientHeight;
      this.editorWidth = wg.scrollDOM.clientWidth;
    }
    mapPosPending(pos, assoc) {
      for (let tr of this.pending)
        pos = tr.changes.mapPos(pos, assoc);
      return pos;
    }
  };
  var cursorBlinkRate = /* @__PURE__ */ GardState.Facet.define({
    combine: (inputs) => inputs.length ? Math.min(...inputs) : 1200
  });
  var cursorLayer = class {
    layer;
    pos = null;
    constructor(wg) {
      this.layer = wg.scrollDOM.appendChild(document.createElement("wg-cursor-layer"));
      this.positionCursor = this.positionCursor.bind(this);
      wg.scheduleDOMRead(this.positionCursor);
      setBlinkRate(wg.state, this.layer);
    }
    update(update) {
      if (update.transactions.some((tr) => tr.selection))
        this.layer.style.animationName = this.layer.style.animationName == "wg-blink" ? "wg-blink2" : "wg-blink";
      if (update.state.facet(cursorBlinkRate) != update.startState.facet(cursorBlinkRate))
        setBlinkRate(update.state, this.layer);
      if ((update.docChanged || update.selectionSet || update.geometryChanged) && (update.startState.selection.isCursor || update.state.selection.isCursor))
        update.editor.scheduleDOMRead(this.positionCursor);
    }
    docUpdate(wg) {
      wg.scheduleDOMRead(this.positionCursor);
    }
    remove() {
      this.layer.remove();
    }
    positionCursor(wg) {
      let pos = cursorPos(wg), cur = this.pos;
      if (!pos ? cur : !cur || cur.left != pos.left || cur.top != pos.top || cur.size != pos.size) {
        this.pos = pos;
        wg.scheduleDOMWrite(() => {
          let cursor = this.layer.firstChild;
          if (!pos) {
            if (cursor)
              cursor.remove();
          } else {
            if (!cursor)
              cursor = this.layer.appendChild(document.createElement("wg-cursor"));
            cursor.className = "wg-cursor-" + (pos.horiz ? "h" : "v");
            cursor.style.top = pos.top + "px";
            cursor.style.left = pos.left + "px";
            cursor.style.width = pos.horiz ? pos.size + "px" : "";
            cursor.style.height = pos.horiz ? "" : pos.size + "px";
          }
        });
      }
    }
  };
  var VertWidth = 30;
  var VertGap = 5;
  function cursorPos(wg) {
    let { state } = wg;
    if (!state.selection.isCursor)
      return null;
    let { head, headSide } = state.selection;
    let { left, right, top: top2, bottom } = wg.coordsAtPos(head, headSide);
    let horiz = top2 == bottom, size = horiz ? right - left : bottom - top2;
    if (horiz && size > VertWidth) {
      size = VertWidth;
      if (!wg.state.textLTR)
        left = right - size;
      let other = wg.coordsAtPos(head, headSide > 0 ? -1 : 1);
      if (other.top == other.bottom && other.top != top2) {
        let move = Math.min(VertGap, Math.abs(other.top - top2) / 2);
        top2 = bottom = top2 + move * (other.top < top2 ? -1 : 1);
      }
    }
    let doc2 = wg.contentDOM.getBoundingClientRect();
    return { left: left - doc2.left, top: top2 - doc2.top, size, horiz };
  }
  function setBlinkRate(state, dom) {
    dom.style.animationDuration = state.facet(cursorBlinkRate) + "ms";
  }
  var dirCompartment = /* @__PURE__ */ GardState.Compartment.define();
  var Wordgard = class _Wordgard {
    static create(spec) {
      return new _Wordgard(spec);
    }
    get state() {
      return this.viewState.state;
    }
    get flushedState() {
      return this.viewState.flushedState;
    }
    get composing() {
      return !!this.inputState.composing;
    }
    get compositionStarted() {
      return this.inputState.composing && this.inputState.composing.changes > 0;
    }
    get editable() {
      return this.state.facet(_Wordgard.editable);
    }
    get focusable() {
      return this.editable || this.contentDOM.tabIndex > -1;
    }
    root = document;
    get win() {
      return this.dom.ownerDocument.defaultView || window;
    }
    dom;
    scrollDOM;
    contentDOM;
    announceDOM;
    id = "wordgard-" + Math.floor(Math.random() * 16777215).toString(16);
    inputState;
    viewState;
    docTile;
    plugins = [];
    pluginMap = /* @__PURE__ */ new Map();
    editorAttrs = Attributes.none;
    contentAttrs = Attributes.none;
    styleModules;
    connected = false;
    flushing = 0;
    willFlush = false;
    flushFunc;
    lastFlush = Date.now();
    autoColorScheme = "light";
    observer;
    domReaders = [];
    domWriters = [];
    pendingTransactionListeners = /* @__PURE__ */ new Map();
    constructor(spec) {
      this.flushFunc = () => {
        if (this.willFlush)
          this.flush();
      };
      this.dispatch = this.dispatch.bind(this);
      this.dom = createWrapElement(this);
      this.contentDOM = document.createElement("wg-content");
      this.scrollDOM = document.createElement("wg-scroller");
      this.scrollDOM.tabIndex = -1;
      this.scrollDOM.appendChild(this.contentDOM);
      this.announceDOM = document.createElement("wg-announced");
      this.announceDOM.setAttribute("aria-live", "polite");
      this.dom.appendChild(this.announceDOM);
      this.dom.appendChild(this.scrollDOM);
      this.viewState = new ViewState(spec.state || GardState.create(spec));
      if (spec.scrollTo && spec.scrollTo.is(scrollIntoView))
        this.viewState.scrollTarget = spec.scrollTo.value.clip(this.viewState.state);
      this.plugins = [cursorPlugin, ...this.state.facet(editorPlugin)].map((spec2) => new PluginInstance(spec2));
      for (let plugin of this.plugins)
        plugin.update(this);
      this.inputState = new InputState(this);
      this.docTile = DocTile.create(this.state, this.contentDOM);
      this.updateAttrs();
      this.observer = new DOMObserver(this);
      if (spec.parent)
        spec.parent.appendChild(this.dom);
    }
    setConnected(value) {
      if (value == this.connected)
        return;
      this.connected = value;
      if (value) {
        this.root = getRoot(this.dom.parentNode) || document;
        this.mountStyles();
        this.inputState.connect();
        if (!this.viewState.initialized)
          this.viewState.initialMeasure(this);
        for (let plugin of this.plugins)
          plugin.connect(this);
        this.observer.connect();
        if (this.viewState.pending.length || this.domReaders.length || this.domWriters.length)
          this.scheduleFlush();
        this.docTile.connect();
      } else {
        this.root = document;
        this.observer.disconnect();
        for (let plugin of this.plugins)
          plugin.disconnect(this);
        this.inputState.disconnect();
        this.docTile.disconnect();
        clearScratchRange();
      }
    }
    dispatch(tr) {
      if (this.flushing != 0)
        throw new Error("Cannot dispatch new updates during the editor flush phase");
      if (!(tr instanceof Transaction))
        tr = this.state.update(tr);
      else if (tr.startState != this.state)
        throw new Error("Dispatching a transaction starting from the wrong state");
      let trs = Transaction.append(tr);
      for (let t of trs)
        this.viewState.update(t);
      this.runTransactionListeners(trs);
      this.scheduleFlush();
    }
    scheduleFlush() {
      if (!this.willFlush && this.flushing == 0 && this.connected) {
        this.win.requestAnimationFrame(this.flushFunc);
        this.willFlush = true;
      }
    }
    flush() {
      if (!this.connected || this.inputState.pendingComposition || this.inputState.pendingDeletion)
        return;
      if (!this.viewState.pending.some((tr) => tr.selection))
        this.observer.pollSelection();
      let { flushedState, state } = this.viewState;
      let update = _Wordgard.Update.create(this, flushedState, state, this.viewState.pending);
      this.willFlush = false;
      this.flushing = 1;
      this.lastFlush = Date.now();
      let domChanges = this.observer.takeDirty();
      this.viewState.flush();
      try {
        this.observer.ignore(() => this.runUpdate(update, domChanges));
        domChanges = null;
        for (let i = 0; ; i++) {
          if (i > 5) {
            console.warn("Editor flush loop restarted more than 5 times");
            break;
          }
          let write = this.domWriters;
          this.domWriters = [];
          for (let f of write)
            f(this);
          let flags = this.viewState.measure(this);
          let read = this.domReaders;
          this.domReaders = [];
          this.flushing = 2;
          for (let f of read)
            f(this);
          this.flushing = 1;
          if (!flags && !this.domWriters.length)
            break;
          update.flags |= flags;
          if (flags)
            this.runUpdate(_Wordgard.Update.create(this, state, state, [], flags), null);
        }
      } finally {
        this.flushing = 0;
      }
      if (this.viewState.scrollTarget) {
        this.scrollTo(this.viewState.scrollTarget);
        this.viewState.scrollTarget = null;
      }
      if (!update.empty)
        for (let listener of this.state.facet(_Wordgard.updateListener)) {
          try {
            listener(update);
          } catch (e) {
            logException(this.state, e, "update listener");
          }
        }
      this.checkDir();
    }
    scrollTo(target) {
      for (let handler of this.state.facet(_Wordgard.scrollHandler)) {
        try {
          if (handler(this, target))
            return true;
        } catch (e) {
          logException(this.state, e, "scroll handler");
        }
      }
      let { from, to, assoc } = target;
      let rect2 = this.coordsAtPos(from, from == to ? assoc : 1);
      if (from != to) {
        let other = this.coordsAtPos(to, -1);
        let left = Math.min(rect2.left, other.left), top2 = Math.min(rect2.top, other.top);
        rect2 = new DOMRect(left, top2, Math.max(rect2.right, other.right) - left, Math.max(rect2.bottom, other.bottom) - top2);
      }
      let margins = this.getScrollMargins();
      let targetRect = new DOMRect(rect2.left + margins.left, rect2.top + margins.top, rect2.width - margins.left - margins.right, rect2.height - margins.top - margins.bottom);
      let { offsetWidth, offsetHeight } = this.scrollDOM;
      scrollRectIntoView(this.scrollDOM, targetRect, assoc, target.spec.x, target.spec.y, Math.max(Math.min(target.spec.xMargin, offsetWidth), -offsetWidth), Math.max(Math.min(target.spec.yMargin, offsetHeight), -offsetHeight), this.state.textLTR);
    }
    runUpdate(update, domChanges) {
      let composition = this.composing ? getCompositionInfo(this) : null;
      let changes = domChanges ? ChangeSet.composeSections(domChanges, update.changes.sections) : update.changes.sections;
      let prevDocTile = this.docTile;
      if (!update.empty) {
        this.updatePlugins(update);
        this.inputState.update(update);
        this.showAnnouncements(update.transactions);
        if (this.state.facet(_Wordgard.styleModule) != this.styleModules)
          this.mountStyles();
        this.updateAttrs();
      }
      this.docTile = prevDocTile.update(update.state, changes, this.connected, composition);
      if ((composition?.wrapCursor || !composition && (prevDocTile != this.docTile || update.selectionSet)) && this.hasFocus)
        setDOMSelection(this);
      this.observer.clear();
      if (this.docTile != prevDocTile)
        for (let plugin of this.plugins)
          plugin.docUpdate(this);
    }
    updatePlugins(update) {
      let specs = update.state.facet(editorPlugin);
      let configChange = specs != update.startState.facet(editorPlugin);
      if (configChange) {
        let newPlugins = [];
        for (let spec of [cursorPlugin, ...specs]) {
          let found = this.plugins.findIndex((p) => p.spec == spec);
          if (found < 0) {
            let plugin = new PluginInstance(spec);
            newPlugins.push(plugin);
            if (this.connected)
              plugin.connect(this);
          } else {
            let plugin = this.plugins[found];
            plugin.mustUpdate = update;
            newPlugins.push(plugin);
          }
        }
        for (let plugin of this.plugins)
          if (!newPlugins.includes(plugin))
            plugin.remove(this);
        this.plugins = newPlugins;
        this.pluginMap.clear();
      } else {
        for (let p of this.plugins)
          p.mustUpdate = update;
      }
      for (let i = 0; i < this.plugins.length; i++)
        this.plugins[i].update(this);
      if (configChange)
        this.inputState.ensureHandlers(update.state);
    }
    updateAttrs() {
      let editorAttrs = attrsFromFacet(this, _Wordgard.editorAttributes, [
        "class",
        this.themeClasses
      ]);
      let contentAttrs = attrsFromFacet(this, _Wordgard.contentAttributes, [
        "aria-multiline",
        "true",
        ...this.state.readOnly ? ["aria-readonly", "true"] : [],
        "contenteditable",
        String(this.state.facet(_Wordgard.editable)),
        "role",
        "textbox",
        "translate",
        "no",
        "id",
        this.id
      ]);
      let changedContent = updateAttributes(this.contentDOM, this.contentAttrs, contentAttrs);
      this.contentAttrs = contentAttrs;
      let changedEditor = updateAttributes(this.dom, this.editorAttrs, editorAttrs);
      this.editorAttrs = editorAttrs;
      return changedContent || changedEditor;
    }
    checkDir() {
      if (this.viewState.styleLTR != this.state.textLTR) {
        let value = GardState.textLTR.of(this.viewState.styleLTR);
        this.dispatch({
          effects: dirCompartment.get(this.state) == null ? GardState.appendConfig.of(GardState.prec.highest(dirCompartment.of(value))) : dirCompartment.reconfigure(value)
        });
      }
    }
    showAnnouncements(trs) {
      let first = true;
      for (let tr of trs)
        for (let effect of tr.effects)
          if (effect.is(_Wordgard.announce)) {
            if (first)
              this.announceDOM.textContent = "";
            first = false;
            let div = this.announceDOM.appendChild(document.createElement("div"));
            div.textContent = effect.value;
          }
    }
    mountStyles() {
      this.styleModules = this.state.facet(_Wordgard.styleModule);
      let nonce = this.state.facet(_Wordgard.cspNonce);
      StyleModule.mount(this.root, this.styleModules.concat(baseStyles).reverse(), nonce ? { nonce } : void 0);
    }
    scheduleDOMRead(read) {
      this.scheduleFlush();
      if (this.domReaders.indexOf(read) < 0)
        this.domReaders.push(read);
    }
    scheduleDOMWrite(write) {
      this.scheduleFlush();
      if (this.domWriters.indexOf(write) < 0)
        this.domWriters.push(write);
    }
    plugin(plugin) {
      let known = this.pluginMap.get(plugin);
      if (known === void 0 || known && known.spec != plugin)
        this.pluginMap.set(plugin, known = this.plugins.find((p) => p.spec == plugin && !p.deactivated) || null);
      return known && known.update(this).value;
    }
    ensureFlushed() {
      if (!this.connected)
        throw new Error("Editor is not connected to the DOM");
      if (this.willFlush && (this.viewState.pending.some((tr) => tr.docChanged) || this.observer.dirty)) {
        if (this.flushing == 1)
          throw new Error("Trying to read from unflushed editor during flush");
        if (this.inputState.pendingComposition || this.inputState.pendingDeletion)
          throw new Error("Trying to read editor DOM between beforeinput and input for composition");
        if (this.flushing == 0)
          this.flush();
      }
    }
    moveToLineBoundary(start, forward) {
      this.ensureFlushed();
      return moveToLineBoundary(this, start, forward);
    }
    moveVertically(start, forward, distance, allowNode) {
      this.ensureFlushed();
      return moveVertically(this, start, forward, distance, allowNode);
    }
    domAtPos(pos, assoc = -1) {
      this.ensureFlushed();
      let tilePos = this.docTile.resolve(pos, assoc);
      return { node: tilePos.tile.dom, offset: tilePos.offset };
    }
    nodeDOM(pos) {
      this.ensureFlushed();
      let tile = this.docTile.nodeTile(pos);
      if (!tile || tile.dom.nodeType != 1)
        return null;
      return tile.dom;
    }
    posAtDOM(node, offset = 0) {
      this.ensureFlushed();
      return this.docTile.posFromDOM(node, offset, 1);
    }
    nodeFromDOM(node) {
      this.ensureFlushed();
      let tile = this.docTile.nearest(node, true);
      return tile && tile != this.docTile ? { pos: tile.posBefore, node: tile.node } : null;
    }
    posAtCoords(coords) {
      this.ensureFlushed();
      let elt = (this.root.elementFromPoint ? this.root : this.dom.ownerDocument).elementFromPoint(coords.x, coords.y);
      let tile = elt && this.docTile.nearest(elt) || this.docTile;
      return tile.posAtCoords(this.state, coords.x, coords.y);
    }
    coordsAtPos(pos, assoc = -1) {
      this.ensureFlushed();
      return coordsAtPos(this, pos, assoc);
    }
    coordsForElement(pos) {
      this.ensureFlushed();
      return this.docTile.coordsForElement(pos);
    }
    get hasFocus() {
      return (this.dom.ownerDocument.hasFocus() || browser.safari && this.inputState?.lastContextMenu > Date.now() - 3e4) && this.root.activeElement == this.contentDOM;
    }
    focus() {
      if (this.connected)
        this.observer.ignore(() => {
          this.contentDOM.focus({ preventScroll: true });
          if (this.willFlush && this.flushing == 0)
            this.flush();
          setDOMSelection(this);
        });
    }
    get themeClasses() {
      let scheme = this.state.facet(colorScheme);
      if (scheme == "auto")
        scheme = this.autoColorScheme;
      return styleID + " " + (scheme == "dark" ? baseDarkID : baseLightID) + " " + this.state.facet(theme$1);
    }
    static scrollIntoView(pos, options = {}) {
      let [from, to, assoc] = typeof pos == "number" ? [pos, pos, -1] : [pos.from, pos.to, pos.empty ? pos.headSide : pos.head < pos.anchor ? -1 : 1];
      return scrollIntoView.of(new ScrollTarget(from, to, assoc, {
        y: options.y || "nearest",
        x: options.x || "nearest",
        yMargin: options.yMargin ?? 5,
        xMargin: options.xMargin ?? 5
      }));
    }
    static label(label) {
      return _Wordgard.editorAttributes.of(typeof label == "string" ? { "aria-label": label } : ((wg) => ({ "aria-label": label(wg.state) })));
    }
    static clipboardOutputFilter = clipboardOutputFilter;
    static clipboardOutputHTMLFilter = clipboardOutputHTMLFilter;
    static clipboardTextSerializer = clipboardTextSerializer;
    static clipboardOutputTextFilter = clipboardOutputTextFilter;
    static clipboardInputFilter = clipboardInputFilter;
    static clipboardInputHTMLFilter = clipboardInputHTMLFilter;
    static clipboardTextParser = clipboardTextParser;
    static clipboardInputTextFilter = clipboardInputTextFilter;
    static pasteHandler = pasteHandler;
    static dropHandler = dropHandler;
    static isFocusChange = isFocusChange;
    static styleModule = /* @__PURE__ */ GardState.Facet.define();
    static domEventHandler(event, handler) {
      return eventHandler.of({ event, handler });
    }
    static domEventObserver(event, observer) {
      return eventObserver.of({ event, observer });
    }
    static scrollHandler = /* @__PURE__ */ GardState.Facet.define();
    static exceptionSink = exceptionSink;
    static transactionListener = /* @__PURE__ */ GardState.Facet.define();
    runTransactionListeners(trs) {
      for (let l of this.state.facet(_Wordgard.transactionListener)) {
        let has = this.pendingTransactionListeners.get(l);
        this.pendingTransactionListeners.set(l, has ? has.concat(trs) : trs);
      }
      for (; ; ) {
        let next = this.pendingTransactionListeners.keys().next();
        if (next.done)
          break;
        let trs2 = this.pendingTransactionListeners.get(next.value);
        this.pendingTransactionListeners.delete(next.value);
        next.value(trs2, this);
      }
    }
    static updateListener = /* @__PURE__ */ GardState.Facet.define();
    static editable = /* @__PURE__ */ GardState.Facet.define({ combine: (values) => values.length ? values[0] : true });
    static cursorBlinkRate = cursorBlinkRate;
    static mouseSelectionStyle = mouseSelectionStyle;
    static dragMovesSelection = dragBehavior;
    getScrollMargins() {
      let left = 0, right = 0, top2 = 0, bottom = 0;
      for (let source of this.state.facet(_Wordgard.coveredMargins)) {
        let m = source(this);
        if (m) {
          if (m.left != null)
            left = Math.max(left, m.left);
          if (m.right != null)
            right = Math.max(right, m.right);
          if (m.top != null)
            top2 = Math.max(top2, m.top);
          if (m.bottom != null)
            bottom = Math.max(bottom, m.bottom);
        }
      }
      return { left, right, top: top2, bottom };
    }
    static theme(spec) {
      let prefix = StyleModule.newName();
      return [theme$1.of(prefix), _Wordgard.styleModule.of(buildTheme(`.${prefix}`, spec, {
        "&dark": `.${prefix}.${baseDarkID}`,
        "&light": `.${prefix}.${baseLightID}`
      }))];
    }
    static colorScheme = colorScheme;
    configureColorScheme(scheme) {
      if (this.autoColorScheme == scheme)
        return;
      this.autoColorScheme = scheme;
      if (!this.state.facet(colorScheme))
        this.observer.ignore(() => this.updateAttrs());
    }
    static styles(spec) {
      return GardState.prec.lowest(_Wordgard.styleModule.of(buildTheme("." + styleID, spec, lightDarkIDs)));
    }
    static scrolling(height) {
      return _Wordgard.theme({
        "&": {
          height: typeof height == "number" ? `${height}px` : height
        },
        "wg-scroller": {
          overflowY: "auto"
        }
      });
    }
    static cspNonce = /* @__PURE__ */ GardState.Facet.define({ combine: (values) => values.length ? values[0] : "" });
    static contentAttributes = /* @__PURE__ */ GardState.Facet.define();
    static editorAttributes = /* @__PURE__ */ GardState.Facet.define();
    static announce = /* @__PURE__ */ Transaction.Effect.define();
    static DocTile = DocTile;
    static coveredMargins = /* @__PURE__ */ GardState.Facet.define();
  };
  var _wrapElement = null;
  function wrapElementConstructor() {
    let ctor = class extends HTMLElement {
      wg;
      constructor(wg) {
        super();
        this.wg = wg;
      }
      connectedCallback() {
        this.wg && this.wg.setConnected(true);
      }
      disconnectedCallback() {
        this.wg && this.wg.setConnected(false);
      }
    };
    for (let i = 0; ; i++) {
      let name = "wordgard-editor" + (i ? "-" + i : "");
      if (!customElements.get(name)) {
        customElements.define(name, ctor);
        break;
      }
    }
    return ctor;
  }
  function createWrapElement(wg) {
    if (!_wrapElement)
      _wrapElement = wrapElementConstructor();
    return new _wrapElement(wg);
  }
  function attrsFromFacet(wg, facet, base) {
    for (let sources = wg.state.facet(facet), i = sources.length - 1; i >= 0; i--) {
      let source = sources[i], value = typeof source == "function" ? source(wg) : source;
      for (let attr in value) {
        let attrVal = value[attr];
        if (attrVal != null)
          Attributes.push(base, attr, attrVal);
      }
    }
    return base;
  }
  Wordgard = /* @__PURE__ */ (function(Wordgard2) {
    function logException2(state, exception, context) {
    }
    Wordgard2.logException = logException2;
    class Plugin {
      create;
      extension;
      constructor(create, buildExtensions) {
        this.create = create;
        this.extension = buildExtensions(this);
      }
      static define(create, provide) {
        return new Wordgard2.Plugin(create, (plugin) => {
          let ext = [editorPlugin.of(plugin)];
          if (provide)
            ext.push(provide(plugin));
          return ext;
        });
      }
      static fromClass(cls, provide) {
        return Wordgard2.Plugin.define((wg) => new cls(wg), provide);
      }
      eventHandler(event, handler) {
        return eventHandler.of({ event, handler: (event2, wg) => {
          let value = wg.plugin(this);
          return value ? handler(event2, wg, value) : false;
        } });
      }
      eventObserver(event, observer) {
        return eventObserver.of({ event, observer: (event2, wg) => {
          let value = wg.plugin(this);
          if (value)
            observer(event2, wg, value);
        } });
      }
    }
    Wordgard2.Plugin = Plugin;
    class Update {
      editor;
      startState;
      state;
      transactions;
      flags;
      changes;
      constructor(editor2, startState, state, transactions, flags) {
        this.editor = editor2;
        this.startState = startState;
        this.state = state;
        this.transactions = transactions;
        this.flags = flags;
        if (transactions.length) {
          this.changes = transactions[0].changes;
          for (let i = 1; i < transactions.length; i++)
            this.changes = this.changes.compose(transactions[i].changes);
        } else {
          this.changes = ChangeSet.empty(startState.doc.length);
        }
      }
      static create(wg, startState, state, transactions, flags = 0) {
        return new Wordgard2.Update(wg, startState, state, transactions, flags);
      }
      get geometryChanged() {
        return this.docChanged || (this.flags & 2) > 0;
      }
      get focusChanged() {
        return (this.flags & 1) > 0;
      }
      get docChanged() {
        return !this.changes.empty;
      }
      get selectionSet() {
        return this.transactions.some((tr) => tr.selection);
      }
      get empty() {
        return this.flags == 0 && this.transactions.length == 0;
      }
    }
    Wordgard2.Update = Update;
    ;
    return Wordgard2;
  })(Wordgard);
  var editorPlugin = /* @__PURE__ */ GardState.Facet.define();
  var cursorPlugin = /* @__PURE__ */ Wordgard.Plugin.fromClass(cursorLayer);
  var PluginInstance = class {
    spec;
    mustUpdate = null;
    value = null;
    deactivated = false;
    constructor(spec) {
      this.spec = spec;
    }
    update(wg) {
      if (!this.value) {
        if (!this.deactivated) {
          try {
            this.value = this.spec.create(wg);
          } catch (e) {
            logException(wg.state, e, "Wordgard plugin crashed");
            this.deactivate(null);
          }
        }
      } else if (this.mustUpdate) {
        let update = this.mustUpdate;
        this.mustUpdate = null;
        if (this.value.update) {
          try {
            this.value.update(update);
          } catch (e) {
            logException(update.state, e, "Wordgard plugin crashed");
            if (wg.connected && this.value.disconnect)
              try {
                this.value.disconnect(wg);
              } catch {
              }
            this.deactivate(wg);
          }
        }
      }
      return this;
    }
    docUpdate(wg) {
      if (this.value?.docUpdate) {
        try {
          this.value.docUpdate(wg);
        } catch (e) {
          logException(wg.state, e, "doc update listener");
        }
      }
    }
    connect(wg) {
      if (this.value?.connect) {
        try {
          this.value.connect(wg);
        } catch (e) {
          logException(wg.state, e, "Wordgard plugin crashed");
          this.deactivate(wg);
        }
      }
    }
    disconnect(wg) {
      if (!this.value?.disconnect)
        return;
      try {
        this.value.disconnect(wg);
      } catch (e) {
        logException(wg.state, e, "Wordgard plugin crashed");
        this.deactivate(wg);
      }
    }
    remove(wg) {
      if (wg.connected)
        this.disconnect(wg);
      if (this.value?.remove)
        try {
          this.value.remove(wg);
        } catch (e) {
          logException(wg.state, e, "Wordgard plugin crashed");
        }
    }
    deactivate(remove2) {
      if (remove2 && this.value?.remove)
        try {
          this.value.remove(remove2);
        } catch {
        }
      this.deactivated = true;
      this.value = null;
    }
  };
  var panelConfig = /* @__PURE__ */ GardState.Facet.define({
    combine(configs) {
      let topContainer, bottomContainer;
      for (let c of configs) {
        topContainer ||= c.topContainer;
        bottomContainer ||= c.bottomContainer;
      }
      return { topContainer, bottomContainer };
    }
  });
  var panelPlugin = /* @__PURE__ */ Wordgard.Plugin.fromClass(class {
    input;
    specs;
    panels;
    top;
    bottom;
    constructor(wg) {
      this.input = wg.state.facet(Panel.show);
      this.specs = this.input.filter((s) => s);
      this.panels = this.specs.map((spec) => spec(wg));
      for (let p of this.panels)
        p.dom.classList.add("wg-panel");
      let conf = wg.state.facet(panelConfig);
      this.top = new PanelGroup(wg, true, conf.topContainer);
      this.bottom = new PanelGroup(wg, false, conf.bottomContainer);
      this.top.sync(this.panels.filter((p) => p.top), wg);
      this.bottom.sync(this.panels.filter((p) => !p.top), wg);
    }
    update(update) {
      let conf = update.state.facet(panelConfig);
      if (this.top.container != conf.topContainer) {
        this.top.sync([], update.editor);
        this.top = new PanelGroup(update.editor, true, conf.topContainer);
      }
      if (this.bottom.container != conf.bottomContainer) {
        this.bottom.sync([], update.editor);
        this.bottom = new PanelGroup(update.editor, false, conf.bottomContainer);
      }
      this.top.syncClasses();
      this.bottom.syncClasses();
      let input = update.state.facet(Panel.show);
      if (input != this.input) {
        let specs = input.filter((x) => x);
        let panels = [], top2 = [], bottom = [], mount = [];
        for (let spec of specs) {
          let known = this.specs.indexOf(spec), panel;
          if (known < 0) {
            panel = spec(update.editor);
            mount.push(panel);
          } else {
            panel = this.panels[known];
            if (panel.update)
              panel.update(update);
          }
          panels.push(panel);
          (panel.top ? top2 : bottom).push(panel);
        }
        this.specs = specs;
        this.panels = panels;
        this.top.sync(top2, update.editor);
        this.bottom.sync(bottom, update.editor);
        for (let p of mount) {
          p.dom.classList.add("wg-panel");
          if (p.connect && update.editor.connected)
            p.connect(update.editor);
        }
      } else {
        for (let p of this.panels)
          if (p.update)
            p.update(update);
      }
    }
    connect(wg) {
      for (let p of this.panels)
        p.connect?.(wg);
    }
    disconnect(wg) {
      for (let p of this.panels)
        p.disconnect?.(wg);
    }
    remove(wg) {
      this.top.sync([], wg);
      this.bottom.sync([], wg);
    }
  }, (plugin) => Wordgard.coveredMargins.of((wg) => {
    let value = wg.plugin(plugin);
    return value && { top: value.top.scrollMargin(), bottom: value.bottom.scrollMargin() };
  }));
  var Panel = /* @__PURE__ */ (function(Panel2) {
    Panel2.show = GardState.Facet.define({
      enables: panelPlugin
    });
    function get(wg, constructor) {
      let plugin = wg.plugin(panelPlugin);
      let index = plugin ? plugin.specs.indexOf(constructor) : -1;
      return index > -1 ? plugin.panels[index] : null;
    }
    Panel2.get = get;
    function configure(config) {
      return config ? [panelConfig.of(config)] : [];
    }
    Panel2.configure = configure;
    ;
    return Panel2;
  })({});
  var PanelGroup = class {
    wg;
    top;
    container;
    dom = void 0;
    classes = "";
    panels = [];
    constructor(wg, top2, container) {
      this.wg = wg;
      this.top = top2;
      this.container = container;
      this.syncClasses();
    }
    sync(panels, wg) {
      for (let p of this.panels)
        if (!panels.includes(p)) {
          if (wg.connected)
            p.disconnect?.(wg);
          p.remove?.(wg);
        }
      this.panels = panels;
      this.syncDOM();
    }
    syncDOM() {
      if (this.panels.length == 0) {
        if (this.dom) {
          this.dom.remove();
          this.dom = void 0;
        }
        return;
      }
      if (!this.dom) {
        this.dom = document.createElement("wg-panels");
        this.dom.className = this.top ? "wg-panels-top" : "wg-panels-bottom";
        let parent = this.container || this.wg.dom;
        parent.insertBefore(this.dom, this.top ? parent.firstChild : null);
      }
      let curDOM = this.dom.firstChild;
      for (let panel of this.panels) {
        if (panel.dom.parentNode == this.dom) {
          while (curDOM != panel.dom)
            curDOM = rmDOM(curDOM);
          curDOM = curDOM.nextSibling;
        } else {
          this.dom.insertBefore(panel.dom, curDOM);
        }
      }
      while (curDOM)
        curDOM = rmDOM(curDOM);
    }
    scrollMargin() {
      return !this.dom || this.container ? 0 : Math.max(0, this.top ? this.dom.getBoundingClientRect().bottom - Math.max(0, this.wg.scrollDOM.getBoundingClientRect().top) : Math.min(innerHeight, this.wg.scrollDOM.getBoundingClientRect().bottom) - this.dom.getBoundingClientRect().top);
    }
    syncClasses() {
      if (!this.container || this.classes == this.wg.themeClasses)
        return;
      for (let cls of this.classes.split(" "))
        if (cls)
          this.container.classList.remove(cls);
      for (let cls of (this.classes = this.wg.themeClasses).split(" "))
        if (cls)
          this.container.classList.add(cls);
    }
  };
  var Dialog = /* @__PURE__ */ (function(Dialog2) {
    function show(wg, config) {
      let resolve;
      let promise = new Promise((r) => resolve = r);
      let panelCtor = (wg2) => createDialog(wg2, config, resolve);
      if (wg.state.field(dialogField, false)) {
        wg.dispatch({ effects: openDialogEffect.of(panelCtor) });
      } else {
        wg.dispatch({ effects: GardState.appendConfig.of(dialogField.init(() => [panelCtor])) });
      }
      let close2 = closeDialogEffect.of(panelCtor);
      return { close: close2, result: promise.then((form) => {
        let queue = wg.win.queueMicrotask || ((f) => wg.win.setTimeout(f, 10));
        queue(() => {
          if (wg.state.field(dialogField).indexOf(panelCtor) > -1)
            wg.dispatch({ effects: close2 });
        });
        return form;
      }) };
    }
    Dialog2.show = show;
    function get(wg, className) {
      let dialogs = wg.state.field(dialogField, false) || [];
      for (let open of dialogs) {
        let panel = Panel.get(wg, open);
        if (panel && panel.dom.classList.contains(className))
          return panel;
      }
      return null;
    }
    Dialog2.get = get;
    function close(wg, className) {
      let dialogs = wg.state.field(dialogField, false) || [];
      for (let open of dialogs) {
        let panel = Panel.get(wg, open);
        if (panel && panel.dom.classList.contains(className)) {
          wg.dispatch({ effects: closeDialogEffect.of(open) });
          return true;
        }
      }
      return false;
    }
    Dialog2.close = close;
    ;
    return Dialog2;
  })({});
  var dialogField = /* @__PURE__ */ GardState.Field.define({
    create() {
      return [];
    },
    update(dialogs, tr) {
      for (let e of tr.effects) {
        if (e.is(openDialogEffect))
          dialogs = [e.value].concat(dialogs);
        else if (e.is(closeDialogEffect))
          dialogs = dialogs.filter((d) => d != e.value);
      }
      return dialogs;
    },
    provide: (f) => Panel.show.computeN((state) => state.field(f))
  });
  var openDialogEffect = /* @__PURE__ */ Transaction.Effect.define();
  var closeDialogEffect = /* @__PURE__ */ Transaction.Effect.define();
  function createDialog(wg, config, result) {
    let content = config.content ? config.content(wg, () => done(null)) : null;
    if (!content) {
      content = document.createElement("form");
      content.className = "wg-form";
      if (config.input) {
        let input = document.createElement("input");
        for (let attr in config.input) {
          if (attr == "style")
            input.style.cssText = config.input[attr];
          else
            input.setAttribute(attr, config.input[attr]);
        }
        if (/^(text|password|number|email|tel|url)$/.test(input.type))
          input.classList.add("wg-textfield");
        if (!input.name)
          input.name = "input";
        let label = content.appendChild(document.createElement("label"));
        if (config.label)
          label.append(config.label + ": ");
        label.append(input);
      } else if (config.label) {
        content.append(document.createTextNode(config.label));
      }
      let button = document.createElement("button");
      button.className = "wg-dialog-button";
      button.type = "submit";
      content.append(" ", button);
      button.append(config.submitLabel ?? "OK");
    }
    let forms = content.nodeName == "FORM" ? [content] : content.querySelectorAll("form");
    for (let i = 0; i < forms.length; i++) {
      let form = forms[i];
      form.addEventListener("keydown", (event) => {
        if (event.keyCode == 27) {
          event.preventDefault();
          done(null);
        } else if (event.keyCode == 13) {
          event.preventDefault();
          done(form);
        }
      });
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        done(form);
      });
    }
    let close = document.createElement("button");
    close.onclick = () => done(null);
    close.setAttribute("aria-label", phrases.get(wg.state, "dialog_close"));
    close.className = "wg-dialog-close";
    close.type = "button";
    close.append("\xD7");
    let panel = document.createElement("wg-dialog");
    panel.append(content, close);
    if (config.class)
      panel.className = config.class;
    function done(form) {
      if (panel.contains(panel.ownerDocument.activeElement))
        wg.focus();
      result(form);
    }
    let mustFocus = config.focus;
    return {
      dom: panel,
      top: config.top !== false,
      connect: () => {
        if (mustFocus) {
          mustFocus = false;
          let focus;
          if (typeof config.focus == "string")
            focus = content.querySelector(config.focus);
          else
            focus = content.querySelector("input") || content.querySelector("button");
          if (focus && "select" in focus)
            focus.select();
          else if (focus && "focus" in focus)
            focus.focus();
        }
      }
    };
  }
  var Outside = "-10000px";
  var TooltipViewManager = class {
    facet;
    createTooltipView;
    removeTooltipView;
    input;
    tooltips;
    tooltipViews;
    constructor(wg, facet, createTooltipView, removeTooltipView) {
      this.facet = facet;
      this.createTooltipView = createTooltipView;
      this.removeTooltipView = removeTooltipView;
      this.input = wg.state.facet(facet);
      this.tooltips = this.input.filter((t) => t);
      let prev = null;
      this.tooltipViews = this.tooltips.map((t) => prev = createTooltipView(t, prev));
    }
    update(update, above) {
      let input = update.state.facet(this.facet);
      let tooltips = input.filter((x) => x);
      if (input === this.input) {
        for (let t of this.tooltipViews)
          if (t.update)
            t.update(update);
        return false;
      }
      let tooltipViews = [], newAbove = above ? [] : null;
      for (let i = 0; i < tooltips.length; i++) {
        let tip = tooltips[i], known = -1;
        if (!tip)
          continue;
        for (let i2 = 0; i2 < this.tooltips.length; i2++) {
          let other = this.tooltips[i2];
          if (other && other.create == tip.create)
            known = i2;
        }
        if (known < 0) {
          tooltipViews[i] = this.createTooltipView(tip, i ? tooltipViews[i - 1] : null);
          if (newAbove)
            newAbove[i] = !!tip.above;
        } else {
          let tooltipView = tooltipViews[i] = this.tooltipViews[known];
          if (newAbove)
            newAbove[i] = above[known];
          if (tooltipView.update)
            tooltipView.update(update);
        }
      }
      for (let t of this.tooltipViews)
        if (tooltipViews.indexOf(t) < 0) {
          this.removeTooltipView(t);
          if (update.editor.connected)
            t.disconnect?.(update.editor);
          t.remove?.(update.editor);
        }
      if (above) {
        newAbove.forEach((val, i) => above[i] = val);
        above.length = newAbove.length;
      }
      this.input = input;
      this.tooltips = tooltips;
      this.tooltipViews = tooltipViews;
      return true;
    }
  };
  var tooltipConfig = /* @__PURE__ */ GardState.Facet.define({
    combine: (values) => ({
      position: browser.ios ? "absolute" : values.find((conf) => conf.position)?.position || "fixed",
      parent: values.find((conf) => conf.parent)?.parent || null,
      tooltipSpace: values.find((conf) => conf.tooltipSpace)?.tooltipSpace || ((wg) => windowRect(wg.win))
    })
  });
  var knownHeight = /* @__PURE__ */ (() => /* @__PURE__ */ new WeakMap())();
  var tooltipPlugin = /* @__PURE__ */ Wordgard.Plugin.fromClass(class {
    wg;
    manager;
    above = [];
    inView = true;
    position;
    madeAbsolute = false;
    parent;
    classes;
    intersectionObserver;
    resizeObserver;
    lastTransaction = 0;
    measureTimeout = -1;
    constructor(wg) {
      this.wg = wg;
      let config = wg.state.facet(tooltipConfig);
      this.position = config.position;
      this.parent = config.parent;
      this.classes = wg.themeClasses;
      this.createContainer();
      this.measure = this.measure.bind(this);
      this.resizeObserver = typeof ResizeObserver == "function" ? new ResizeObserver(() => this.measureSoon()) : null;
      this.manager = new TooltipViewManager(wg, Tooltip.show, (t, p) => this.createTooltip(t, p), (t) => {
        if (this.resizeObserver)
          this.resizeObserver.unobserve(t.dom);
        t.dom.remove();
      });
      this.above = this.manager.tooltips.map((t) => !!t.above);
      this.intersectionObserver = typeof IntersectionObserver == "function" ? new IntersectionObserver((entries) => {
        if (Date.now() > this.lastTransaction - 50 && entries.length > 0 && entries[entries.length - 1].intersectionRatio < 1)
          this.measureSoon();
      }, { threshold: [1] }) : null;
      this.observeIntersection();
      this.maybeMeasure();
    }
    createContainer() {
      if (this.parent) {
        this.container = document.createElement("wg-tooltip-root");
        this.container.style.position = "relative";
        this.container.className = this.wg.themeClasses;
        this.parent.appendChild(this.container);
      } else {
        this.container = this.wg.dom;
      }
    }
    observeIntersection() {
      if (this.intersectionObserver && this.wg.connected) {
        this.intersectionObserver.disconnect();
        for (let tooltip of this.manager.tooltipViews)
          this.intersectionObserver.observe(tooltip.dom);
      }
    }
    measureSoon() {
      if (this.measureTimeout < 0)
        this.measureTimeout = setTimeout(() => {
          this.measureTimeout = -1;
          this.maybeMeasure();
        }, 50);
    }
    update(update) {
      if (update.transactions.length)
        this.lastTransaction = Date.now();
      let updated = this.manager.update(update, this.above);
      if (updated)
        this.observeIntersection();
      let shouldMeasure = updated || update.geometryChanged;
      let newConfig = update.state.facet(tooltipConfig);
      if (newConfig.position != this.position && !this.madeAbsolute) {
        this.position = newConfig.position;
        for (let t of this.manager.tooltipViews)
          t.dom.style.position = this.position;
        shouldMeasure = true;
      }
      if (newConfig.parent != this.parent) {
        if (this.parent)
          this.container.remove();
        this.parent = newConfig.parent;
        this.createContainer();
        for (let t of this.manager.tooltipViews)
          this.container.appendChild(t.dom);
        shouldMeasure = true;
      } else if (this.parent && this.wg.themeClasses != this.classes) {
        this.classes = this.container.className = this.wg.themeClasses;
      }
      if (shouldMeasure)
        this.maybeMeasure();
    }
    createTooltip(tooltip, prev) {
      let tooltipView = tooltip.create(this.wg);
      let before = prev ? prev.dom : null;
      tooltipView.dom.classList.add("wg-tooltip");
      if (tooltip.arrow && !tooltipView.dom.querySelector(".wg-tooltip > wg-tooltip-arrow")) {
        let arrow = document.createElement("wg-tooltip-arrow");
        tooltipView.dom.appendChild(arrow);
      }
      tooltipView.dom.style.position = this.position;
      tooltipView.dom.style.top = Outside;
      tooltipView.dom.style.left = "0px";
      this.container.insertBefore(tooltipView.dom, before);
      if (this.wg.connected)
        tooltipView.connect?.(this.wg);
      if (this.resizeObserver && this.wg.connected)
        this.resizeObserver.observe(tooltipView.dom);
      return tooltipView;
    }
    connect(wg) {
      wg.win.addEventListener("resize", this.measureSoon = this.measureSoon.bind(this));
      for (let t of this.manager.tooltipViews) {
        t.connect?.(wg);
        if (this.resizeObserver)
          this.resizeObserver.observe(t.dom);
      }
      this.observeIntersection();
    }
    disconnect(wg) {
      this.wg.win.removeEventListener("resize", this.measureSoon);
      for (let t of this.manager.tooltipViews) {
        t.disconnect?.(wg);
        if (this.resizeObserver)
          this.resizeObserver.unobserve(t.dom);
      }
      if (this.intersectionObserver)
        this.intersectionObserver.disconnect();
    }
    remove() {
      for (let tooltipView of this.manager.tooltipViews) {
        tooltipView.dom.remove();
        if (this.wg.connected)
          tooltipView.disconnect?.(this.wg);
        tooltipView.remove?.(this.wg);
      }
      if (this.parent)
        this.container.remove();
      clearTimeout(this.measureTimeout);
    }
    measure() {
      let measure = this.readMeasure();
      this.wg.scheduleDOMWrite(() => this.writeMeasure(measure));
    }
    readMeasure() {
      let scaleX = 1, scaleY = 1, makeAbsolute = false;
      if (this.position == "fixed" && this.manager.tooltipViews.length) {
        let { dom } = this.manager.tooltipViews[0];
        if (browser.safari) {
          let rect2 = dom.getBoundingClientRect();
          makeAbsolute = Math.abs(rect2.top + 1e4) > 1 || Math.abs(rect2.left) > 1;
        } else {
          makeAbsolute = !!dom.offsetParent && dom.offsetParent != this.container.ownerDocument.body;
        }
      }
      if (makeAbsolute || this.position == "absolute") {
        let measure = this.parent || this.container, rect2 = measure.getBoundingClientRect();
        if (rect2.width && rect2.height) {
          scaleX = rect2.width / measure.offsetWidth;
          scaleY = rect2.height / measure.offsetHeight;
        }
      }
      let visible = this.wg.scrollDOM.getBoundingClientRect(), margins = this.wg.getScrollMargins();
      let visLeft = visible.left + margins.left, visTop = visible.top + margins.top;
      return {
        visible: new DOMRect(visLeft, visTop, visible.right - margins.right - visLeft, visible.bottom - margins.bottom - visTop),
        parent: this.parent ? this.container.getBoundingClientRect() : this.wg.dom.getBoundingClientRect(),
        pos: this.manager.tooltips.map((t, i) => {
          let tv = this.manager.tooltipViews[i];
          return tv.getCoords ? tv.getCoords(t.pos) : this.wg.coordsAtPos(t.pos);
        }),
        size: this.manager.tooltipViews.map(({ dom }) => dom.getBoundingClientRect()),
        space: this.wg.state.facet(tooltipConfig).tooltipSpace(this.wg),
        scaleX,
        scaleY,
        makeAbsolute
      };
    }
    writeMeasure(measured) {
      if (measured.makeAbsolute) {
        this.madeAbsolute = true;
        this.position = "absolute";
        for (let t of this.manager.tooltipViews)
          t.dom.style.position = "absolute";
      }
      let { visible, space, scaleX, scaleY } = measured;
      let others = [];
      for (let i = 0; i < this.manager.tooltips.length; i++) {
        let tooltip = this.manager.tooltips[i], tView = this.manager.tooltipViews[i], { dom } = tView;
        let pos = measured.pos[i], size = measured.size[i];
        if (!pos || tooltip.clip !== false && (pos.bottom <= Math.max(visible.top, space.top) || pos.top >= Math.min(visible.bottom, space.bottom) || pos.right < Math.max(visible.left, space.left) - 0.1 || pos.left > Math.min(visible.right, space.right) + 0.1)) {
          dom.style.top = Outside;
          continue;
        }
        let arrow = tooltip.arrow ? tView.dom.querySelector("wg-tooltip-arrow") : null;
        let arrowHeight = arrow ? 7 : 0;
        let width = size.right - size.left, height = knownHeight.get(tView) ?? size.bottom - size.top;
        let offset = tView.offset || noOffset, ltr = this.wg.state.textLTR;
        let left = size.width > space.right - space.left ? ltr ? space.left : space.right - size.width : ltr ? Math.max(space.left, Math.min(pos.left - (arrow ? 14 : 0) + offset.x, space.right - width)) : Math.min(Math.max(space.left, pos.left - width + (arrow ? 14 : 0) - offset.x), space.right - width);
        let above = this.above[i];
        if (!tooltip.strictSide && (above ? pos.top - height - arrowHeight - offset.y < space.top : pos.bottom + height + arrowHeight + offset.y > space.bottom) && above == space.bottom - pos.bottom > pos.top - space.top)
          above = this.above[i] = !above;
        let spaceVert = (above ? pos.top - space.top : space.bottom - pos.bottom) - arrowHeight;
        if (spaceVert < height && tView.resize !== false) {
          if (spaceVert < 15) {
            dom.style.top = Outside;
            continue;
          }
          knownHeight.set(tView, height);
          dom.style.height = (height = spaceVert) / scaleY + "px";
        } else if (dom.style.height) {
          dom.style.height = "";
        }
        let top2 = above ? pos.top - height - arrowHeight - offset.y : pos.bottom + arrowHeight + offset.y;
        let right = left + width;
        if (tView.overlap !== true) {
          for (let r of others)
            if (r.left < right && r.right > left && r.top < top2 + height && r.bottom > top2)
              top2 = above ? r.top - height - 2 - arrowHeight : r.bottom + arrowHeight + 2;
        }
        if (this.position == "absolute") {
          dom.style.top = (top2 - measured.parent.top) / scaleY + "px";
          setLeftStyle(dom, (left - measured.parent.left) / scaleX);
        } else {
          dom.style.top = top2 / scaleY + "px";
          setLeftStyle(dom, left / scaleX);
        }
        if (arrow) {
          let arrowLeft = pos.left + (ltr ? offset.x : -offset.x) - (left + 14 - 7);
          arrow.style.left = arrowLeft / scaleX + "px";
        }
        if (tView.overlap !== true)
          others.push({ left, top: top2, right, bottom: top2 + height });
        dom.classList.toggle("wg-tooltip-above", above);
        dom.classList.toggle("wg-tooltip-below", !above);
        if (tView.positioned)
          tView.positioned(measured.space);
      }
    }
    maybeMeasure() {
      if (this.manager.tooltips.length)
        this.wg.scheduleDOMRead(this.measure);
    }
  }, (plugin) => plugin.eventObserver("scroll", (event, wg, value) => value.maybeMeasure()));
  function setLeftStyle(elt, value) {
    let current = parseInt(elt.style.left, 10);
    if (isNaN(current) || Math.abs(value - current) > 1)
      elt.style.left = value + "px";
  }
  var styles = /* @__PURE__ */ Wordgard.styles({
    ".wg-tooltip": {
      zIndex: 500,
      boxSizing: "border-box",
      backgroundColor: "var(--wg-panel-color)",
      boxShadow: "0 0 8px 0 rgba(128, 128, 128, 0.2)",
      font: "var(--wg-dialog-font)"
    },
    ".wg-tooltip-section:not(:first-child)": {
      borderTop: "1px solid var(--wg-border-color)"
    },
    "wg-tooltip-arrow": {
      display: "block",
      height: `${7}px`,
      width: `${7 * 2}px`,
      position: "absolute",
      zIndex: -1,
      overflow: "hidden",
      "&:before, &:after": {
        content: "''",
        position: "absolute",
        width: 0,
        height: 0,
        borderLeft: `${7}px solid transparent`,
        borderRight: `${7}px solid transparent`
      },
      ".wg-tooltip-above &": {
        bottom: `-${7}px`,
        "&:before": {
          borderTop: `${7}px solid var(--wg-border-color)`
        },
        "&:after": {
          borderTop: `${7}px solid var(--wg-panel-color)`,
          bottom: "1px"
        }
      },
      ".wg-tooltip-below &": {
        top: `-${7}px`,
        "&:before": {
          borderBottom: `${7}px solid var(--wg-border-color)`
        },
        "&:after": {
          borderBottom: `${7}px solid var(--wg-panel-color)`,
          top: "1px"
        }
      }
    }
  });
  var closeHoverTooltipEffect = /* @__PURE__ */ Transaction.Effect.define();
  var Tooltip = /* @__PURE__ */ (function(Tooltip2) {
    function configure(config = {}) {
      return tooltipConfig.of(config);
    }
    Tooltip2.configure = configure;
    Tooltip2.show = GardState.Facet.define({
      enables: [tooltipPlugin, styles]
    });
    function get(wg, tooltip) {
      let plugin = wg.plugin(tooltipPlugin);
      if (!plugin)
        return null;
      let found = plugin.manager.tooltips.findIndex(typeof tooltip == "function" ? (p) => p.create == tooltip : (p) => p == tooltip);
      return found < 0 ? null : plugin.manager.tooltipViews[found];
    }
    Tooltip2.get = get;
    function reposition(wg) {
      let plugin = wg.plugin(tooltipPlugin);
      if (plugin)
        plugin.maybeMeasure();
    }
    Tooltip2.reposition = reposition;
    function hover(source, options = {}) {
      let setHover = Transaction.Effect.define();
      let hoverState = GardState.Field.define({
        create() {
          return [];
        },
        update(value, tr) {
          if (value.length) {
            if (options.hideOnChange && (tr.docChanged || tr.selection))
              value = [];
            else if (options.hideOn)
              value = value.filter((v) => !options.hideOn(tr, v));
            if (tr.docChanged) {
              let mapped = [];
              for (let tooltip of value) {
                let newPos = tr.changes.mapPos(tooltip.pos, -1, "around");
                if (newPos != null) {
                  let copy2 = Object.assign(/* @__PURE__ */ Object.create(null), tooltip);
                  copy2.pos = newPos;
                  if (copy2.end != null)
                    copy2.end = tr.changes.mapPos(copy2.end);
                  mapped.push(copy2);
                }
              }
              value = mapped;
            }
          }
          for (let effect of tr.effects) {
            if (effect.is(setHover))
              value = effect.value;
            if (effect.is(closeHoverTooltipEffect))
              value = [];
          }
          return value;
        },
        provide: (f) => showHoverTooltip.from(f)
      });
      return {
        active: hoverState,
        extension: [
          hoverState,
          Wordgard.Plugin.define((wg) => new HoverPlugin(wg, source, hoverState, setHover, options.hoverTime || 300)),
          showHoverTooltipHost
        ]
      };
    }
    Tooltip2.hover = hover;
    (function(hover2) {
      function has(state) {
        return state.facet(showHoverTooltip).some((x) => x);
      }
      hover2.has = has;
      hover2.closeAll = closeHoverTooltipEffect.of(null);
    })(hover = Tooltip2.hover || (Tooltip2.hover = {}));
    ;
    return Tooltip2;
  })({});
  var noOffset = { x: 0, y: 0 };
  var showHoverTooltip = /* @__PURE__ */ GardState.Facet.define({
    combine: (inputs) => inputs.reduce((a, i) => a.concat(i), [])
  });
  var HoverTooltipHost = class _HoverTooltipHost {
    wg;
    manager;
    dom;
    connected = false;
    static create(wg) {
      return new _HoverTooltipHost(wg);
    }
    constructor(wg) {
      this.wg = wg;
      this.dom = document.createElement("wg-tooltip-hover");
      this.manager = new TooltipViewManager(wg, showHoverTooltip, (t, p) => this.createHostedView(t, p), (t) => t.dom.remove());
    }
    createHostedView(tooltip, prev) {
      let hostedView = tooltip.create(this.wg);
      hostedView.dom.classList.add("wg-tooltip-section");
      this.dom.insertBefore(hostedView.dom, prev ? prev.dom.nextSibling : this.dom.firstChild);
      if (this.connected && hostedView.connect)
        hostedView.connect(this.wg);
      return hostedView;
    }
    connect(wg) {
      for (let t of this.manager.tooltipViews)
        t.connect?.(wg);
      this.connected = true;
    }
    disconnect(wg) {
      for (let t of this.manager.tooltipViews)
        t.disconnect?.(wg);
      this.connected = false;
    }
    positioned(space) {
      for (let hostedView of this.manager.tooltipViews) {
        if (hostedView.positioned)
          hostedView.positioned(space);
      }
    }
    update(update) {
      this.manager.update(update);
    }
    remove(wg) {
      for (let t of this.manager.tooltipViews)
        t.remove?.(wg);
    }
    passProp(name) {
      let value = void 0;
      for (let view of this.manager.tooltipViews) {
        let given = view[name];
        if (given !== void 0) {
          if (value === void 0)
            value = given;
          else if (value !== given)
            return void 0;
        }
      }
      return value;
    }
    get offset() {
      return this.passProp("offset");
    }
    get getCoords() {
      return this.passProp("getCoords");
    }
    get overlap() {
      return this.passProp("overlap");
    }
    get resize() {
      return this.passProp("resize");
    }
  };
  var showHoverTooltipHost = /* @__PURE__ */ Tooltip.show.compute((state) => {
    let tooltips = state.facet(showHoverTooltip);
    if (tooltips.length === 0)
      return null;
    return {
      pos: Math.min(...tooltips.map((t) => t.pos)),
      end: Math.max(...tooltips.map((t) => t.end ?? t.pos)),
      create: HoverTooltipHost.create,
      above: tooltips[0].above,
      arrow: tooltips.some((t) => t.arrow)
    };
  });
  var HoverPlugin = class {
    wg;
    source;
    field;
    setHover;
    hoverTime;
    lastMove;
    hoverTimeout = -1;
    restartTimeout = -1;
    pending = null;
    constructor(wg, source, field, setHover, hoverTime) {
      this.wg = wg;
      this.source = source;
      this.field = field;
      this.setHover = setHover;
      this.hoverTime = hoverTime;
      this.lastMove = { x: 0, y: 0, target: wg.dom, time: 0 };
      this.checkHover = this.checkHover.bind(this);
      wg.dom.addEventListener("mouseleave", this.mouseleave = this.mouseleave.bind(this));
      wg.dom.addEventListener("mousemove", this.mousemove = this.mousemove.bind(this));
    }
    update() {
      if (this.pending) {
        this.pending = null;
        clearTimeout(this.restartTimeout);
        this.restartTimeout = setTimeout(() => this.startHover(), 20);
      }
    }
    get active() {
      return this.wg.state.field(this.field);
    }
    checkHover() {
      this.hoverTimeout = -1;
      if (this.active.length)
        return;
      let hovered = Date.now() - this.lastMove.time;
      if (hovered < this.hoverTime)
        this.hoverTimeout = setTimeout(this.checkHover, this.hoverTime - hovered);
      else
        this.startHover();
    }
    startHover() {
      clearTimeout(this.restartTimeout);
      let { wg, lastMove } = this;
      let { pos, side } = wg.posAtCoords(lastMove);
      let open = this.source(wg, pos, side || -1);
      if (open?.then) {
        let pending = this.pending = { pos };
        open.then((result) => {
          if (this.pending == pending) {
            this.pending = null;
            if (result && !(Array.isArray(result) && !result.length))
              wg.dispatch({ effects: this.setHover.of(Array.isArray(result) ? result : [result]) });
          }
        }, (e) => logException(wg.state, e, "hover tooltip"));
      } else if (open && !(Array.isArray(open) && !open.length)) {
        wg.dispatch({ effects: this.setHover.of(Array.isArray(open) ? open : [open]) });
      }
    }
    get tooltip() {
      let plugin = this.wg.plugin(tooltipPlugin);
      let index = plugin ? plugin.manager.tooltips.findIndex((t) => t.create == HoverTooltipHost.create) : -1;
      return index > -1 ? plugin.manager.tooltipViews[index] : null;
    }
    mousemove(event) {
      this.lastMove = { x: event.clientX, y: event.clientY, target: event.target, time: Date.now() };
      if (this.hoverTimeout < 0)
        this.hoverTimeout = setTimeout(this.checkHover, this.hoverTime);
      let { active, tooltip } = this;
      if (active.length && tooltip && !isInTooltip(tooltip.dom, event) || this.pending) {
        let { pos } = active[0] || this.pending, end = active[0]?.end ?? pos;
        if (pos == end ? this.wg.posAtCoords(this.lastMove).pos != pos : !isOverRange(this.wg, pos, end, event.clientX, event.clientY)) {
          this.wg.dispatch({ effects: this.setHover.of([]) });
          this.pending = null;
        }
      }
    }
    mouseleave(event) {
      clearTimeout(this.hoverTimeout);
      this.hoverTimeout = -1;
      let { active } = this;
      if (active.length) {
        let { tooltip } = this;
        let inTooltip = tooltip && tooltip.dom.contains(event.relatedTarget);
        if (!inTooltip)
          this.wg.dispatch({ effects: this.setHover.of([]) });
        else
          this.watchTooltipLeave(tooltip.dom);
      }
    }
    watchTooltipLeave(tooltip) {
      let watch = (event) => {
        tooltip.removeEventListener("mouseleave", watch);
        if (this.active.length && !this.wg.dom.contains(event.relatedTarget))
          this.wg.dispatch({ effects: this.setHover.of([]) });
      };
      tooltip.addEventListener("mouseleave", watch);
    }
    remove() {
      clearTimeout(this.hoverTimeout);
      this.wg.dom.removeEventListener("mouseleave", this.mouseleave);
      this.wg.dom.removeEventListener("mousemove", this.mousemove);
    }
  };
  var tooltipMargin = 4;
  function isInTooltip(tooltip, event) {
    let { left, right, top: top2, bottom } = tooltip.getBoundingClientRect(), arrow;
    if (arrow = tooltip.querySelector(".wg-tooltip-arrow")) {
      let arrowRect = arrow.getBoundingClientRect();
      top2 = Math.min(arrowRect.top, top2);
      bottom = Math.max(arrowRect.bottom, bottom);
    }
    return event.clientX >= left - tooltipMargin && event.clientX <= right + tooltipMargin && event.clientY >= top2 - tooltipMargin && event.clientY <= bottom + tooltipMargin;
  }
  function isOverRange(wg, from, to, x, y, margin) {
    let rect2 = wg.contentDOM.getBoundingClientRect();
    if (rect2.left > x || rect2.right < x || rect2.top > y || rect2.bottom < y)
      return false;
    let pos = wg.posAtCoords({ x, y }).pos;
    return pos >= from && pos <= to;
  }
  var inputRule = /* @__PURE__ */ GardState.Facet.define();
  var appender = /* @__PURE__ */ Transaction.appender.of(applyInputRules);
  var InputRule = class _InputRule {
    expr;
    apply;
    extension;
    lookahead;
    inCode;
    constructor(expr, apply, spec) {
      this.expr = expr;
      this.apply = apply;
      this.lookahead = spec.lookahead;
      this.inCode = !!spec.inCode;
      this.extension = [inputRule.of(this), appender];
    }
    static define(spec) {
      return new _InputRule(ensureAnchor(spec.expr), typeof spec.apply == "string" ? applyString(spec.apply) : spec.apply, spec);
    }
    static wrapping(expr, tag, empty = false) {
      return _InputRule.define({
        expr,
        apply: (state, match) => {
          let wrapper = typeof tag == "function" ? tag(match) : tag;
          let { from, to } = match[0];
          let changes = [{ from: from.pos, to: to.pos }];
          let range = findWrappable(from, from, wrapper);
          if (!range)
            return null;
          changes.push(wrapBlockRange(range, wrapper));
          return autoJoinBlocks(state, {
            changes,
            annotations: history.isolate.of(true)
          });
        },
        lookahead: empty ? /^$/ : void 0
      });
    }
    static textblockType(expr, tag, empty = false) {
      return _InputRule.define({
        expr,
        apply: (state, match) => {
          let { from, to } = match[0];
          let block = typeof tag == "function" ? tag(match) : tag;
          let outer = from.parent.parent;
          if (!outer || !state.schema.canContain(outer.node.type, block.type))
            return null;
          return {
            changes: [{ from: from.pos - 1, to: to.pos, insert: [block] }],
            annotations: history.isolate.of(true)
          };
        },
        lookahead: empty ? /^$/ : void 0
      });
    }
  };
  InputRule = /* @__PURE__ */ (function(InputRule2) {
    InputRule2.emDash = InputRule2.define({ expr: /--$/, apply: "\u2014" });
    InputRule2.ellipsis = InputRule2.define({ expr: /\.\.\.$/, apply: "\u2026" });
    InputRule2.openDoubleQuote = InputRule2.define({ expr: /(?:^|[\s\{\[\(\<'"\u2018\u201C])(")$/, apply: "\u201C" });
    InputRule2.closeDoubleQuote = InputRule2.define({ expr: /"$/, apply: "\u201D" });
    InputRule2.openSingleQuote = InputRule2.define({ expr: /(?:^|[\s\{\[\(\<'"\u2018\u201C])(')$/, apply: "\u2018" });
    InputRule2.closeSingleQuote = InputRule2.define({ expr: /'$/, apply: "\u2019" });
    InputRule2.smartQuotes = [InputRule2.openDoubleQuote, InputRule2.closeDoubleQuote, InputRule2.openSingleQuote, InputRule2.closeSingleQuote];
    ;
    return InputRule2;
  })(InputRule);
  function ensureAnchor(regexp) {
    let needsIndex = regexp.hasIndices === false, needsAnchor = !/\$$/.test(regexp.source);
    if (!needsIndex && !needsAnchor)
      return regexp;
    return new RegExp(needsAnchor ? "(?:" + regexp.source + ")$" : regexp.source, regexp.flags + (needsIndex ? "d" : ""));
  }
  function applyString(text) {
    return (state, match) => ({
      changes: { from: match[0].from.pos, to: match[0].to.pos, insert: [Leaf.text(text)] },
      annotations: history.isolate.of(true)
    });
  }
  function getGroupIndices(match) {
    if (match.indices)
      return match.indices;
    let result = [[0, match[0].length]];
    for (let i = 1, pos = 0; i < match.length; i++) {
      let found = match[i] ? match[0].indexOf(match[i], pos) : -1;
      result.push(found < 0 ? void 0 : [found, pos = found + match[i].length]);
    }
    return result;
  }
  function applyInputRules(trs, state) {
    let typed = -1;
    for (let i = trs.length - 1; i >= 0; i--) {
      if (trs[i].isUserEvent("input.type")) {
        for (let j = i + 1; j < trs.length; j++)
          if (trs[j].selection)
            return null;
        typed = i;
        break;
      }
    }
    if (typed < 0)
      return null;
    let cursor = state.sel.head, block = cursor.textblockParent;
    if (!block)
      return null;
    let map = state.textblockMap(block);
    let curIndex = map.toIndex(cursor.pos), textBefore = map.text.slice(0, curIndex), textAfter;
    rules: for (let rule of state.facet(inputRule)) {
      if (!rule.inCode && block.node.type.hasRole(Node.Role.Code))
        continue;
      let match = rule.expr.exec(textBefore);
      if (!match || rule.lookahead && !rule.lookahead.test(textAfter ?? (textAfter = map.text.slice(curIndex))))
        continue;
      let indices = getGroupIndices(match);
      let docMatch = [], parent = -1;
      for (let i = 0; i < match.length; i++) {
        let text = match[i];
        if (text == null) {
          docMatch.push(null);
        } else {
          let is = indices[i];
          let from = state.doc.resolve(map.fromIndex(is[0]));
          let to = state.doc.resolve(map.fromIndex(is[1]));
          if (parent < 0)
            parent = from.parent.before;
          if (parent != from.parent.before || parent != to.parent.before)
            continue rules;
          if (!rule.inCode && from.parent.node.type.hasRole(Node.Role.Code))
            continue rules;
          docMatch.push({ from, to, text });
        }
      }
      let spec = rule.apply(state, docMatch);
      if (spec)
        return spec;
    }
    return null;
  }

  // node_modules/crelt/index.js
  function crelt() {
    var elt = arguments[0];
    if (typeof elt == "string") elt = document.createElement(elt);
    var i = 1, next = arguments[1];
    if (next && typeof next == "object" && next.nodeType == null && !Array.isArray(next)) {
      for (var name in next) if (Object.prototype.hasOwnProperty.call(next, name)) {
        var value = next[name];
        if (typeof value == "string") elt.setAttribute(name, value);
        else if (value != null) elt[name] = value;
      }
      i++;
    }
    for (; i < arguments.length; i++) add(elt, arguments[i]);
    return elt;
  }
  function add(elt, child) {
    if (typeof child == "string") {
      elt.appendChild(document.createTextNode(child));
    } else if (child == null) {
    } else if (child.nodeType != null) {
      elt.appendChild(child);
    } else if (Array.isArray(child)) {
      for (var i = 0; i < child.length; i++) add(elt, child[i]);
    } else {
      throw new RangeError("Unsupported child node: " + child);
    }
  }

  // node_modules/wordgard/dist/schema.js
  function blockDoc() {
    return GardState.schemaElement.of(Doc);
  }
  function selectionInType(tag) {
    return (state) => {
      let { sel } = state, block = sel.head.textblockParent;
      return !!block && block.start == sel.anchor.textblockParent?.start && block.node.tag.eq(tag);
    };
  }
  function paragraph() {
    return [GardState.schemaElement.of(Paragraph), paragraph.button, paragraph.keyBinding];
  }
  paragraph = /* @__PURE__ */ (function(paragraph2) {
    paragraph2.keyBinding = KeyBinding.of({
      key: "Ctrl-Shift-0",
      run: Command.bind(setTextblockType, Paragraph)
    });
    paragraph2.button = Menu.Button.define({
      run: Command.bind(setTextblockType, Paragraph),
      active: selectionInType(Paragraph),
      label: phrases.ref("paragraph"),
      enable: (s) => !s.readOnly,
      parent: Menu.Submenu.textblockStyle,
      rank: 10
    });
    ;
    return paragraph2;
  })(paragraph);
  function heading() {
    return [
      GardState.schemaElement.of(Heading),
      heading.button1,
      heading.button2,
      heading.button3,
      heading.keyBindings,
      heading.createOnHash
    ];
  }
  heading = /* @__PURE__ */ (function(heading2) {
    heading2.keyBindings = [
      KeyBinding.of({ key: "Ctrl-Shift-1", run: Command.bind(setTextblockType, Heading.of(1)) }),
      KeyBinding.of({ key: "Ctrl-Shift-2", run: Command.bind(setTextblockType, Heading.of(2)) }),
      KeyBinding.of({ key: "Ctrl-Shift-3", run: Command.bind(setTextblockType, Heading.of(3)) }),
      KeyBinding.of({ key: "Ctrl-Shift-4", run: Command.bind(setTextblockType, Heading.of(4)) }),
      KeyBinding.of({ key: "Ctrl-Shift-5", run: Command.bind(setTextblockType, Heading.of(5)) }),
      KeyBinding.of({ key: "Ctrl-Shift-6", run: Command.bind(setTextblockType, Heading.of(6)) })
    ];
    heading2.button1 = Menu.Button.define({
      run: Command.bind(setTextblockType, Heading.of(1)),
      active: selectionInType(Heading.of(1)),
      label: phrases.ref("heading_1"),
      enable: (s) => !s.readOnly,
      parent: Menu.Submenu.textblockStyle,
      rank: 50
    });
    heading2.button2 = Menu.Button.define({
      run: Command.bind(setTextblockType, Heading.of(2)),
      active: selectionInType(Heading.of(2)),
      label: phrases.ref("heading_2"),
      enable: (s) => !s.readOnly,
      parent: Menu.Submenu.textblockStyle,
      rank: 51
    });
    heading2.button3 = Menu.Button.define({
      run: Command.bind(setTextblockType, Heading.of(3)),
      active: selectionInType(Heading.of(3)),
      label: phrases.ref("heading_3"),
      enable: (s) => !s.readOnly,
      parent: Menu.Submenu.textblockStyle,
      rank: 52
    });
    heading2.createOnHash = InputRule.textblockType(/^(#{1,6}) $/, (m) => Heading.of(m[1].to.pos - m[1].from.pos), true);
    ;
    return heading2;
  })(heading);
  function codeBlock() {
    return [
      GardState.schemaElement.of(CodeBlock),
      codeBlock.button,
      codeBlock.keyBinding,
      codeBlock.createOnBackticks
    ];
  }
  codeBlock = /* @__PURE__ */ (function(codeBlock2) {
    codeBlock2.keyBinding = KeyBinding.of({
      key: "Ctrl-Shift-\\",
      run: Command.bind(setTextblockType, CodeBlock)
    });
    codeBlock2.button = Menu.Button.define({
      run: Command.bind(setTextblockType, CodeBlock),
      active: selectionInType(CodeBlock),
      label: phrases.ref("code_block"),
      enable: (s) => !s.readOnly,
      parent: Menu.Submenu.textblockStyle,
      rank: 30
    });
    codeBlock2.createOnBackticks = InputRule.textblockType(/^```$/, CodeBlock);
    ;
    return codeBlock2;
  })(codeBlock);
  function alignment() {
    return [GardState.schemaElement.of(Alignment), alignment.button, alignment.keyBindings];
  }
  function alignmentAtCursor(state) {
    let block = state.sel.head.textblockParent;
    return block && block.node.tag.mark(Alignment) || null;
  }
  alignment = /* @__PURE__ */ (function(alignment2) {
    alignment2.keyBindings = [
      KeyBinding.of({ key: "Mod-Shift-l", run: Command.bind(setAlignment, "left") }),
      KeyBinding.of({ key: "Mod-Shift-r", run: Command.bind(setAlignment, "right") }),
      KeyBinding.of({ key: "Mod-Shift-e", run: Command.bind(setAlignment, "center") })
    ];
    alignment2.buttonStart = Menu.Button.define({
      run: Command.bind(setAlignment, null),
      active: (state) => alignmentAtCursor(state) == null,
      label: {
        icon: "M16 81a3 3 0 0 1 0-6h44a3 3 0 0 1 0 6h-44m0-19a3 3 0 0 1 0-6h69a3 3 0 0 1 0 6h-69m0-19a3 3 0 0 1 0-6h44a3 3 0 0 1 0 6h-44m0-19a3 3 0 0 1 0-6h69a3 3 0 0 1 0 6h-69",
        directional: true
      },
      description: phrases.ref("align_start")
    });
    alignment2.buttonEnd = Menu.Button.define({
      run: Command.bind(setAlignment, "end"),
      active: (state) => alignmentAtCursor(state) == "end",
      label: {
        icon: "M41 81a3 3 0 0 1 0-6h44a3 3 0 0 1 0 6h-44m-25-19a3 3 0 0 1 0-6h69a3 3 0 0 1 0 6h-69m25-19a3 3 0 0 1 0-6h44a3 3 0 0 1 0 6h-44m-25-19a3 3 0 0 1 0-6h69a3 3 0 0 1 0 6h-69",
        directional: true
      },
      description: phrases.ref("align_end")
    });
    alignment2.buttonCenter = Menu.Button.define({
      run: Command.bind(setAlignment, "center"),
      active: (state) => alignmentAtCursor(state) == "center",
      label: {
        icon: "M29 81a3 3 0 0 1 0-6h44a3 3 0 0 1 0 6h-44m-13-19a3 3 0 0 1 0-6h69a3 3 0 0 1 0 6h-69m13-19a3 3 0 0 1 0-6h44a3 3 0 0 1 0 6h-44m-13-19a3 3 0 0 1 0-6h69a3 3 0 0 1 0 6h-69"
      },
      description: phrases.ref("align_center")
    });
    alignment2.button = Menu.Submenu.define({
      description: phrases.ref("alignment"),
      parent: Menu.Group.block,
      arrow: false,
      enable: (s) => !s.readOnly,
      rank: 10,
      content: [alignment2.buttonStart, alignment2.buttonEnd, alignment2.buttonCenter]
    });
    ;
    return alignment2;
  })(alignment);
  function direction() {
    return [GardState.schemaElement.of(Direction), direction.textblockDir, direction.button];
  }
  function autoDir(plot) {
    for (let ch of plot.content)
      if (ch.is(Leaf.Text)) {
        for (let i = 0; i < ch.param.length; i++) {
          let dir = BidiSpan.strongDir(ch.param.charCodeAt(i));
          if (dir != null)
            return dir;
        }
      }
    return null;
  }
  function directionAtCursor(state) {
    let block = state.sel.head.textblockParent;
    return block && block.node.mark(Direction) || (state.textLTR ? "ltr" : "rtl");
  }
  direction = /* @__PURE__ */ (function(direction2) {
    direction2.textblockDir = GardState.textblockLTR.of((plot) => {
      let dir = plot.mark(Direction);
      return !dir ? null : dir == "auto" ? autoDir(plot) : dir == "ltr";
    });
    direction2.buttonLTR = Menu.Button.define({
      run: Command.bind(setDirection, "ltr"),
      active: (state) => directionAtCursor(state) == "ltr",
      label: {
        icon: "M70 35l20 15l-20 15l0-30M45 83v-63h-5v63a3 3 0 0 1-6 0v-28h-4a20 20 0 1 1 0-40h28a3 3 0 0 1 0 6h-7v62a3 3 0 0 1-6 0"
      },
      description: phrases.ref("text_dir_ltr")
    });
    direction2.buttonRTL = Menu.Button.define({
      run: Command.bind(setDirection, "rtl"),
      active: (state) => directionAtCursor(state) == "rtl",
      label: {
        icon: "M30 35l-20 15l20 15l0-30M75 83v-63h-5v63a3 3 0 0 1-6 0v-28h-4a20 20 0 1 1 0-40h28a3 3 0 0 1 0 6h-7v62a3 3 0 0 1-6 0"
      },
      description: phrases.ref("text_dir_rtl")
    });
    direction2.buttonAuto = Menu.Button.define({
      run: Command.bind(setDirection, "auto"),
      active: (state) => directionAtCursor(state) == "auto",
      label: {
        icon: "M35 30l-23 20l23 20l0-40M60 30l23 20l-23 20l0-40"
      },
      description: phrases.ref("text_dir_auto")
    });
    direction2.button = Menu.Submenu.define({
      description: phrases.ref("text_dir"),
      parent: Menu.Group.block,
      arrow: false,
      enable: (s) => !s.readOnly,
      rank: 20,
      content: [direction2.buttonLTR, direction2.buttonRTL, direction2.buttonAuto]
    });
    ;
    return direction2;
  })(direction);
  function blockquote() {
    return [GardState.schemaElement.of(Blockquote), blockquote.button, blockquote.createOnGT, blockquote.theme];
  }
  blockquote = /* @__PURE__ */ (function(blockquote2) {
    blockquote2.button = Menu.Button.define({
      run: Command.bind(toggleBlock, Blockquote),
      active: (state) => {
        for (let cur = state.sel.head.parent; cur; cur = cur.parent)
          if (cur.node.type == Blockquote.type)
            return true;
        return false;
      },
      label: {
        icon: "M75 75a6 6 0 0 0 6-6V53a6 6 0 0 0-6-6h-9q0-3 0-7 1-3 2-6t3-4q2-2 5-2V19q-5 0-9 2a21 21 0 0 0-7 6 31 31 0 0 0-4 9A48 48 0 0 0 56 47V69a5 5 0 0 0 6 6zm-37 0a6 6 0 0 0 6-6V53a6 6 0 0 0-6-6H29q0-3 0-7 1-3 2-6 1-3 3-4 2-2 5-2V19q-5 0-9 2a21 21 0 0 0-7 6 31 31 0 0 0-4 9A48 48 0 0 0 19 47V69a6 6 0 0 0 6 6z"
      },
      description: phrases.ref("toggle_quote"),
      enable: (s) => !s.readOnly,
      parent: Menu.Group.block,
      rank: 40
    });
    blockquote2.createOnGT = InputRule.wrapping(/^> $/, Blockquote, true);
    blockquote2.theme = Wordgard.theme({
      blockquote: {
        marginInline: "3px",
        paddingInlineStart: "12px",
        borderInlineStart: "4px solid silver"
      }
    });
    ;
    return blockquote2;
  })(blockquote);
  function horizontalRule() {
    return [GardState.schemaElement.of(HorizontalRule), horizontalRule.createOnDashes];
  }
  horizontalRule = /* @__PURE__ */ (function(horizontalRule2) {
    horizontalRule2.createOnDashes = InputRule.define({
      expr: /^---$/,
      lookahead: /^$/,
      apply: (state, m) => {
        let changes = ChangeSet.create(state.doc, {
          from: m[0].from.pos,
          to: m[0].to.pos,
          insert: [HorizontalRule],
          fit: true
        });
        let hr = changes.findInserted((t) => t == HorizontalRule);
        if (hr == null)
          return null;
        return {
          changes,
          selection: (cx) => GardSelection.near(cx, hr + 1, 1),
          annotations: history.isolate.of(true),
          userEvent: "insert.horizontalrule"
        };
      }
    });
    ;
    return horizontalRule2;
  })(horizontalRule);
  function bulletList(config = {}) {
    return [
      GardState.schemaElement.of(BulletList),
      GardState.schemaElement.of(config.blockItems == false ? InlineListItem : ListItem),
      bulletList.toggleButton,
      bulletList.createOnDash
    ];
  }
  bulletList = /* @__PURE__ */ (function(bulletList2) {
    bulletList2.createOnDash = InputRule.wrapping(/^ ?- $/, BulletList, true);
    bulletList2.toggleButton = Menu.Button.define({
      run: Command.bind(toggleList, BulletList),
      active: listIsActive(BulletList),
      label: {
        icon: "M34 75a3 3 0 0 1 0-6h56a3 3 0 0 1 0 6h-56m0-25a3 3 0 0 1 0-6h56a3 3 0 0 1 0 6h-56m0-25a3 3 0 0 1 0-6h56a3 3 0 0 1 0 6h-56m-22 3a6 6 0 1 0 0-12 6 6 0 0 0 0 12m0 25a6 6 0 1 0 0-12 6 6 0 0 0 0 12m0 25a6 6 0 1 0 0-12 6 6 0 0 0 0 12",
        directional: true
      },
      description: phrases.ref("toggle_bullet_list"),
      enable: (s) => !s.readOnly,
      parent: Menu.Group.block,
      rank: 20
    });
    ;
    return bulletList2;
  })(bulletList);
  function orderedList(config = {}) {
    return [
      GardState.schemaElement.of(OrderedList),
      GardState.schemaElement.of(config.blockItems == false ? InlineListItem : ListItem),
      orderedList.toggleButton,
      orderedList.createOnNumber
    ];
  }
  orderedList = /* @__PURE__ */ (function(orderedList2) {
    orderedList2.createOnNumber = InputRule.wrapping(/^ ?(\d+)\. $/, (match) => OrderedList.of(+match[1].text), true);
    orderedList2.toggleButton = Menu.Button.define({
      run: Command.bind(toggleList, OrderedList.default),
      active: listIsActive(OrderedList.default),
      label: {
        icon: "M34 75a3 3 0 0 1 0-6h56a3 3 0 0 1 0 6h-56m0-25a3 3 0 0 1 0-6h56a3 3 0 0 1 0 6h-56m0-25a3 3 0 0 1 0-6h56a3 3 0 0 1 0 6h-56M11 74v-3H13c1 0 2-1 2-2 0-1-1-2-2-2-1 0-2 1-2 2h-4c0-3 2-5 6-5 4 0 6 2 6 4a4 4 0 0 1-3 4v0a4 4 0 0 1 4 4c0 3-3 5-7 5-4 0-6-2-6-5h4c0 1 1 2 3 2 2 0 3-1 3-2 0-1-1-2-3-2h-2zm0-29h-4v0c0-3 2-5 6-5 4 0 6 2 6 5 0 2-2 4-3 5l-3 4h7V57H7v-3l6-6c1-1 2-2 2-3 0-1-1-2-2-2a2 2 0 0 0-2 2zM16 31h-4V18h0l-4 3v-4l4-3h4z",
        directional: true
      },
      description: phrases.ref("toggle_ordered_list"),
      enable: (s) => !s.readOnly,
      parent: Menu.Group.block,
      rank: 30
    });
    ;
    return orderedList2;
  })(orderedList);
  function strong() {
    return [GardState.schemaElement.of(Strong), strong.button, strong.keyBinding];
  }
  strong = /* @__PURE__ */ (function(strong2) {
    strong2.keyBinding = KeyBinding.of({
      key: "Mod-b",
      run: Command.bind(toggleMark, Strong)
    });
    strong2.button = Menu.Button.toggleMark({
      mark: Strong,
      parent: Menu.Group.inline,
      rank: 10,
      description: phrases.ref("toggle_strong"),
      label: {
        icon: "M51 81c13 0 21-7 21-18 0-8-6-14-14-15v0a14 14 0 0 0 12-13c0-9-7-15-19-15H24V81zM37 29h11c6 0 10 3 10 8 0 5-4 8-11 8H37V29zm0 42V54h11c8 0 12 3 12 9 0 6-4 9-11 9H37z"
      }
    });
    ;
    return strong2;
  })(strong);
  function emphasis() {
    return [GardState.schemaElement.of(Emphasis), emphasis.button, emphasis.keyBinding];
  }
  emphasis = /* @__PURE__ */ (function(emphasis2) {
    emphasis2.keyBinding = KeyBinding.of({
      key: "Mod-i",
      run: Command.bind(toggleMark, Emphasis)
    });
    emphasis2.button = Menu.Button.toggleMark({
      mark: Emphasis,
      parent: Menu.Group.inline,
      rank: 15,
      description: phrases.ref("toggle_em"),
      label: {
        icon: "M50 73 60 28c1-4 2-4 8-5l1-3H45l-1 3c7 1 7 1 6 5L41 73c-1 4-2 4-8 5l-1 3h24l1-3c-7-1-7-1-7-5z"
      }
    });
    ;
    return emphasis2;
  })(emphasis);
  function code() {
    return [GardState.schemaElement.of(Code), code.button, code.keyBinding];
  }
  code = /* @__PURE__ */ (function(code2) {
    code2.keyBinding = KeyBinding.of({
      key: "Mod-`",
      run: Command.bind(toggleMark, Code)
    });
    code2.button = Menu.Button.toggleMark({
      mark: Code,
      parent: Menu.Group.inline,
      rank: 30,
      description: phrases.ref("toggle_code"),
      label: {
        icon: "M37 30a2 2 0 1 0-4-4l-22 22a3 3 0 0 0 0 4l22 22a2 2 0 0 0 4-4L17 50zm27 0a2 2 0 0 1 4-4l22 22a3 3 0 0 1 0 4l-22 22a2 2 0 0 1-4-4L83 50z"
      }
    });
    ;
    return code2;
  })(code);
  function underline() {
    return [GardState.schemaElement.of(Underline), underline.button, underline.keyBinding];
  }
  underline = /* @__PURE__ */ (function(underline2) {
    underline2.keyBinding = KeyBinding.of({
      key: "Mod-u",
      run: Command.bind(toggleMark, Underline)
    });
    underline2.button = Menu.Button.toggleMark({
      mark: Underline,
      parent: Menu.Group.inline,
      rank: 60,
      description: phrases.ref("toggle_underline"),
      label: {
        icon: "M33 20h-8V60c0 13 9 23 24 23s24-9 24-23V20h-8v40c0 9-6 16-17 16s-15-7-15-16M78 94h-56v-6h56z"
      }
    });
    ;
    return underline2;
  })(underline);
  function strikethrough() {
    return [GardState.schemaElement.of(Strikethrough), strikethrough.button, strikethrough.keyBinding];
  }
  strikethrough = /* @__PURE__ */ (function(strikethrough2) {
    strikethrough2.keyBinding = KeyBinding.of({
      key: "Mod-/",
      run: Command.bind(toggleMark, Strikethrough)
    });
    strikethrough2.button = Menu.Button.toggleMark({
      mark: Strikethrough,
      parent: Menu.Group.inline,
      rank: 65,
      description: phrases.ref("toggle_strikethrough"),
      label: {
        icon: "M38 37c0 2 0 3 2 5H31a17 17 0 0 1-1-5c0-10 9-16 21-16 12 0 20 7 20 17h-7c-1-6-6-10-13-10-7 0-13 4-13 10zm13 44c-13 0-21-7-22-17h7c1 6 7 10 15 10c8 0 14-4 14-10c0-5-3-8-11-10L48 53h20c3 3 4 6 4 10 0 11-9 18-22 18M11 50v-6h75v6H11"
      }
    });
    ;
    return strikethrough2;
  })(strikethrough);
  function superscript() {
    return [GardState.schemaElement.of(Superscript), superscript.button, superscript.keyBinding];
  }
  superscript = /* @__PURE__ */ (function(superscript2) {
    superscript2.keyBinding = KeyBinding.of({
      key: "Mod-.",
      run: Command.bind(toggleMark, Superscript)
    });
    superscript2.button = Menu.Button.toggleMark({
      mark: Superscript,
      parent: Menu.Group.inline,
      rank: 70,
      description: phrases.ref("toggle_super"),
      label: {
        icon: "m27 78 6-18H55l6 18H69L48 19H40L19 78zm17-50 9 26h-18l9-26zm32-11v0c4 -10 12 0 5 6l-11 11V38h22v-6h-12v0l6-6c3-3 5-5 5-10 0-5-4-9-11-9C72 6 69 11 69 16v0z"
      }
    });
    ;
    return superscript2;
  })(superscript);
  function subscript() {
    return [GardState.schemaElement.of(Subscript), subscript.button, subscript.keyBinding];
  }
  subscript = /* @__PURE__ */ (function(subscript2) {
    subscript2.keyBinding = KeyBinding.of({
      key: "Mod-,",
      run: Command.bind(toggleMark, Subscript)
    });
    subscript2.button = Menu.Button.toggleMark({
      mark: Subscript,
      parent: Menu.Group.inline,
      rank: 75,
      description: phrases.ref("toggle_sub"),
      label: {
        icon: "m21 78 6-18H49l6 18H63L41 19H34L13 78zm17-50 9 26h-18l9-26zm38 45v0c4 -10 12 0 5 6l-11 11V94h22v-6h-12v0l6-6c3-3 5-5 5-10 0-5-4-9-11-9-8 0-11 5-11 10v0z"
      }
    });
    ;
    return subscript2;
  })(subscript);
  var imageUploader = /* @__PURE__ */ GardState.Facet.define();
  var imageTypes = [Image, Figure, CaptionedFigure];
  function activeImage(sel) {
    if (sel.selection instanceof GardSelection.Node && imageTypes.includes(sel.selection.node.type))
      return sel.selection.node.tag;
    if (sel.head.parent.start == sel.anchor.parent.start && sel.head.parent.node.type == CaptionedFigure)
      return sel.head.parent.node.tag;
    return null;
  }
  var svg = "http://www.w3.org/2000/svg";
  function rect(x, y, w, h, cls) {
    let elt = document.createElementNS(svg, "rect");
    elt.setAttribute("x", String(x));
    elt.setAttribute("y", String(y));
    elt.setAttribute("width", String(w));
    elt.setAttribute("height", String(h));
    elt.setAttribute("class", cls);
    return elt;
  }
  function imageTypeButtons(state, active) {
    let hasImg = state.schema.has(Image), hasFig = state.schema.has(Figure), hasCap = state.schema.has(CaptionedFigure);
    let align = (hasFig || hasCap) && state.schema.markAllowed(Alignment, hasFig ? Figure : CaptionedFigure);
    if (!align && !(hasImg && (hasFig || hasCap)))
      return null;
    let buttons = [];
    function button(type, label, active2) {
      let labelText = imagePhrases.get(state, label);
      let icon = document.createElementNS(svg, "svg");
      icon.setAttribute("viewbox", "0 0 24 22");
      icon.setAttribute("width", "24");
      icon.setAttribute("height", "22");
      icon.appendChild(rect(1, 1, 22, 3, "wg-img-icon-text"));
      let flip = !state.textLTR;
      icon.appendChild(rect(type == "start" ? flip ? 12 : 2 : type == "end" ? flip ? 2 : 12 : 7, 6, 10, 10, "wg-img-icon-image"));
      if (type == "inline") {
        icon.appendChild(rect(1, 12, 5, 3, "wg-img-icon-text"));
        icon.appendChild(rect(18, 12, 5, 3, "wg-img-icon-text"));
      }
      icon.appendChild(rect(1, 18, 22, 3, "wg-img-icon-text"));
      return crelt("label", { class: "wg-img-radio", title: labelText }, crelt("input", {
        type: "radio",
        "aria-label": labelText,
        name: "type",
        value: type,
        checked: active2 ? "checked" : null
      }), icon);
    }
    let aligned = !active || active.type == Image ? null : active.mark(Alignment) || "start";
    if (hasImg)
      buttons.push(button("inline", "inline", aligned == null));
    buttons.push(button("start", "figure", aligned == "start"));
    if (align) {
      buttons.push(button("center", "figure_center", aligned == "center"));
      buttons.push(button("end", "figure_end", aligned == "end"));
    }
    if (hasFig && hasCap) {
      let caption = crelt("label", " ", crelt("input", {
        type: "checkbox",
        name: "caption",
        checked: active && active.type == CaptionedFigure ? "checked" : null
      }), " ", imagePhrases.get(state, "captioned"));
      if (hasImg) {
        let imageRadio = buttons[0].querySelector("input");
        for (let b of buttons)
          b.querySelector("input").addEventListener("change", () => {
            caption.style.display = imageRadio.checked ? "none" : "";
          });
        if (!aligned)
          caption.style.display = "none";
      }
      buttons.push(caption);
    }
    return [crelt("span", { class: "wg-label" }, imagePhrases.get(state, "image_style"), ":"), crelt("span", buttons)];
  }
  var setImageDialog = /* @__PURE__ */ Transaction.Effect.define();
  var createImagePanel = (wg) => {
    let dom = buildImagePanel(wg), mustFocus = true;
    return {
      top: true,
      dom,
      connect() {
        if (mustFocus) {
          mustFocus = false;
          let target = dom.querySelector("input[name=src]");
          if (target)
            target.focus();
        }
      }
    };
  };
  function startUpload(wg, file, set) {
    let imageFile = file.files?.[0], handler = wg.state.facet(imageUploader)[0];
    if (!imageFile || !handler)
      return;
    let promise = handler(imageFile, wg, (percent) => {
      progress.lastChild.textContent = Math.round(percent) + "%";
    });
    let progress = crelt("span", { class: "wg-img-upload", style: `width: ${file.offsetWidth}px` }, imagePhrases.get(wg.state, "uploading"), " ", crelt("span"));
    file.parentNode.replaceChild(progress, file);
    function reset() {
      if (progress.parentNode)
        progress.parentNode.replaceChild(file, progress);
    }
    promise.then((url) => {
      reset();
      set(url);
    }, (err) => {
      reset();
      Dialog.show(wg, { label: imagePhrases.get(wg.state, "upload_failed") + ": " + err });
    });
  }
  function buildImagePanel(wg) {
    let { state } = wg;
    let sel = (state.field(imageDialog) || state.selection).resolve(state.doc);
    let active = activeImage(sel);
    let size = !wg.state.schema.has(ImageSize) ? null : [
      crelt("label", { for: "wg-img-size" }, imagePhrases.get(state, "width"), ":"),
      crelt("input", {
        type: "number",
        id: "wg-img-size",
        name: "size",
        value: active && active.mark(ImageSize) || "",
        placeholder: imagePhrases.get(state, "auto")
      })
    ];
    let src = crelt("input", {
      type: "text",
      id: "wg-img-src",
      name: "src",
      required: "required",
      value: active ? active.param : "",
      placeholder: "https://..."
    });
    let file = null;
    if (wg.state.facet(imageUploader).length) {
      file = crelt("input", {
        type: "file",
        id: "wg-img-file",
        name: "file",
        "aria-label": imagePhrases.get(state, "upload_image"),
        onchange: (e) => startUpload(wg, e.target, (url) => src.value = url)
      });
    }
    let form = crelt("form", { class: "wg-img-form", onkeydown }, crelt("div", { class: "wg-dialog-title" }, imagePhrases.get(state, active ? "update_image" : "insert_image")), crelt("label", { for: "wg-img-src" }, imagePhrases.get(state, "image_source"), ":"), crelt("span", { class: "wg-img-src-line" }, src, file), crelt("label", { for: "wg-img-alt" }, imagePhrases.get(state, "alt_text"), ":"), crelt("input", {
      type: "text",
      id: "wg-img-alt",
      name: "alt",
      value: active && active.mark(ImageAlt) || "",
      placeholder: imagePhrases.get(state, "describe_image")
    }), imageTypeButtons(state, active), size, crelt("div", { class: "wg-img-buttons" }, crelt("button", { type: "submit", class: "wg-dialog-button" }, imagePhrases.get(state, active ? "update" : "insert")), " ", crelt("button", { type: "button", class: "wg-dialog-button", onclick: close }, imagePhrases.get(state, "cancel"))));
    function onsubmit(e) {
      e.preventDefault();
      let { state: state2 } = wg, sel2 = (state2.field(imageDialog) || state2.selection).resolve(state2.doc);
      let data = new FormData(form);
      let src2 = data.get("src");
      if (!src2)
        return;
      let type = data.get("type") ?? (state2.schema.has(Image) ? "inline" : "start");
      let cap = !!data.get("caption") || !state2.schema.has(Figure);
      let marks = [];
      if (type == "center" || type == "end")
        marks = Alignment.of(type).addToSet(marks);
      if (data.get("alt"))
        marks = ImageAlt.of(data.get("alt")).addToSet(marks);
      if (data.get("size"))
        marks = ImageSize.of(Number(data.get("size"))).addToSet(marks);
      let tag = type == "inline" ? Image.of(src2, marks) : cap ? CaptionedFigure.of(src2, marks) : Figure.of(src2, marks);
      let change;
      if (sel2.from.parent.node.type == CaptionedFigure && sel2.to.parent.start == sel2.from.parent.start) {
        let from = sel2.from.parent.before;
        if (tag instanceof Plot.Tag)
          change = { from, to: from + 1, insert: [tag] };
        else
          change = { from, to: sel2.from.parent.after, insert: [tag], fit: true };
      } else {
        change = { from: sel2.from.pos, to: sel2.to.pos, insert: [tag instanceof Plot.Tag ? tag.create() : tag], fit: true };
      }
      wg.focus();
      let changes = ChangeSet.create(state2.doc, change), pos = changes.findInserted((t) => t == tag) ?? change.from;
      wg.dispatch({
        changes: change,
        effects: setImageDialog.of(false),
        userEvent: "insert.image",
        selection: tag instanceof Plot.Tag ? { anchor: pos + 1 } : GardSelection.node(pos, tag)
      });
    }
    function close() {
      wg.focus();
      wg.dispatch({ effects: setImageDialog.of(false) });
    }
    function onkeydown(e) {
      if (e.key == "Escape") {
        e.preventDefault();
        close();
      }
    }
    return crelt("wg-dialog", { class: "wg-img-dialog", onsubmit }, form);
  }
  var insertImage = (wg) => {
    let val = wg.state.field(imageDialog, false);
    if (val) {
      wg.dispatch({ effects: setImageDialog.of(false) });
    } else {
      let effects = [setImageDialog.of(true)];
      if (val === void 0)
        effects.push(GardState.appendConfig.of(imageDialog));
      wg.dispatch({ effects });
    }
    return true;
  };
  var imageDialogTheme = /* @__PURE__ */ Wordgard.styles({
    ".wg-img-dialog": {
      borderBottom: "1px solid var(--wg-border-color)"
    },
    ".wg-img-form": {
      padding: "5px 3px",
      display: "grid",
      gap: "8px",
      alignItems: "center",
      gridTemplateColumns: "max-content auto",
      "& label, & .wg-label": {
        textAlign: "right"
      }
    },
    ".wg-dialog-title": {
      gridColumn: "span 2",
      fontSize: "90%",
      fontWeight: "bold",
      textAlign: "center"
    },
    ".wg-img-buttons": {
      gridColumn: "2"
    },
    ".wg-img-src-line": {
      display: "flex",
      gap: "7px",
      "& [type=text]": {
        flex: "1"
      }
    },
    ".wg-img-radio": {
      display: "inline-block",
      verticalAlign: "middle",
      "& input[type=radio]": {
        opacity: "0",
        position: "absolute",
        pointerEvents: "none"
      },
      "& svg": {
        marginRight: "6px",
        width: "24px",
        "& .wg-img-icon-text": { fill: "#bbb" },
        "& .wg-img-icon-image": { fill: "#888" }
      },
      "& input:checked + svg .wg-img-icon-image": {
        fill: "var(--wg-highlight-color)"
      },
      "& input:focus + svg": {
        borderRadius: "2px",
        outline: "2px solid var(--wg-highlight-color)"
      }
    },
    ".wg-img-upload": {
      boxSizing: "border-box",
      padding: "4px",
      fontSize: "80%"
    }
  });
  var imageDialog = /* @__PURE__ */ GardState.Field.define({
    create: () => null,
    update(value, tr) {
      for (let e of tr.effects)
        if (e.is(setImageDialog))
          return e.value ? tr.state.selection : null;
      return value && value.map(tr.changes, tr.state);
    },
    provide: (f) => [
      GardState.prec.lowest(Panel.show.from(f, (val) => val && createImagePanel)),
      imageDialogTheme
    ]
  });
  function baseSupport() {
    return [GardState.schemaElement.of(ImageAlt), image.button, imageDialog, image.keyBinding, image.dropHandler];
  }
  function image() {
    return [GardState.schemaElement.of(Image), baseSupport()];
  }
  function imageResizing() {
    return [GardState.schemaElement.of(ImageSize), imageResizing.keyBindings, imageResizing.dragHandle];
  }
  var resizeTheme = /* @__PURE__ */ Wordgard.theme({
    ".wg-resize-hover": {
      display: "inline-block",
      lineHeight: "0.1",
      position: "relative"
    },
    ".wg-resize-handle": {
      position: "absolute",
      right: "1px",
      bottom: "1px",
      width: "min(60%, 20px)",
      height: "min(60%, 20px)"
    },
    ".wg-resize-handle-active": {
      cursor: "nwse-resize"
    }
  });
  var setResizing = /* @__PURE__ */ Transaction.Effect.define({
    map: (value, mapping) => {
      let newPos = mapping.mapPos(value.target, 1, "after");
      return newPos == null ? void 0 : { target: newPos, resizing: value.resizing };
    }
  });
  var handleElt = /* @__PURE__ */ (() => Elt.mk("svg:svg", { class: "wg-resize-handle", viewBox: "0 0 20 20" }, [
    Elt.mk("svg:path", { d: "M20 0L0 20M20 5L5 20M20 10L10 20", stroke: "#000000aa", "stroke-width": "1.5" }),
    Elt.mk("svg:polygon", { points: "0,20 20,20 20,0", fill: "transparent", class: "wg-resize-handle-active" })
  ]))();
  var resizeWrapper = /* @__PURE__ */ (() => Decoration.Point.wrapper(Elt.mk("span", { class: "wg-resize-hover" }, [handleElt, 0]), { target: "img" }))();
  var resizeState = /* @__PURE__ */ GardState.Field.define({
    create: () => ({ target: -1, resizing: -1, deco: PointSet.empty }),
    update: (value, tr) => {
      for (let e of tr.effects) {
        if (e.is(setResizing)) {
          let { target, resizing } = e.value;
          if (target < 0)
            return { target: -1, resizing: -1, deco: PointSet.empty };
          let deco = [[target, resizeWrapper]];
          if (resizing > -1)
            deco.push([target, Decoration.Point.attributes({ style: `width: ${resizing}px` }, { target: "img" })]);
          return { target, resizing, deco: PointSet.create(deco) };
        }
      }
      return value.target < 0 || !tr.docChanged ? value : { target: value.target, resizing: value.resizing, deco: value.deco.map(tr.changes) };
    }
  });
  var MIN_SIZE = 10;
  function imageNode(wg, pos) {
    let dom = wg.nodeDOM(pos);
    return dom.nodeName == "IMG" ? dom : dom.querySelector("img[src]");
  }
  var resizeHandlers = /* @__PURE__ */ (() => [
    Wordgard.domEventHandler("mousedown", (event, wg) => {
      let resizing = wg.state.field(resizeState);
      if (resizing.target < 0)
        return;
      for (let dom = event.target; ; ) {
        if (dom.classList.contains("wg-resize-handle-active"))
          break;
        let next = dom.parentNode;
        if (!next || next == wg.contentDOM)
          return;
        dom = next;
      }
      let node = wg.state.doc.nodeAt(resizing.target);
      let width = node.tag.mark(ImageSize) ?? imageNode(wg, resizing.target).getBoundingClientRect().width;
      wg.dispatch({ effects: setResizing.of({ target: resizing.target, resizing: width }) });
      event.preventDefault();
    }),
    Wordgard.domEventHandler("mousemove", (event, wg) => {
      let resizing = wg.state.field(resizeState);
      if (resizing.resizing > -1) {
        let dom = imageNode(wg, resizing.target);
        let width = event.clientX - dom.getBoundingClientRect().left;
        if (width >= MIN_SIZE && Math.abs(width - resizing.resizing) >= 1)
          wg.dispatch({ effects: setResizing.of({ target: resizing.target, resizing: width }) });
      } else {
        let elt = event.target.closest("img, .wg-resize-handle");
        let node = elt && wg.nodeFromDOM(elt);
        let target = node && wg.state.schema.markAllowed(ImageSize, node.node.type) ? node.pos : -1;
        if (target != resizing.target)
          wg.dispatch({ effects: setResizing.of({ target, resizing: -1 }) });
      }
    }),
    Wordgard.domEventHandler("mouseup", (event, wg) => {
      let resizing = wg.state.field(resizeState);
      if (resizing.resizing < 0)
        return;
      wg.dispatch({
        effects: setResizing.of({ target: resizing.target, resizing: -1 }),
        changes: { from: resizing.target, add: ImageSize.of(Math.round(resizing.resizing)) }
      });
    })
  ])();
  imageResizing = /* @__PURE__ */ (function(imageResizing2) {
    imageResizing2.resizeCommand = (by, relative = false) => (wg) => {
      let { selection } = wg.state;
      if (selection instanceof GardSelection.Node && wg.state.schema.markAllowed(ImageSize, selection.node.type)) {
        let curWidth = selection.node.mark(ImageSize) ?? imageNode(wg, wg.state.selection.from).getBoundingClientRect().width;
        let newWidth = Math.max(MIN_SIZE, relative ? curWidth * by : curWidth + by);
        if (newWidth != curWidth) {
          wg.dispatch({
            changes: { from: wg.state.selection.from, add: ImageSize.of(newWidth) },
            userEvent: "image.resize"
          });
          return true;
        }
      }
      return false;
    };
    imageResizing2.keyBindings = [
      KeyBinding.of({ key: "Ctrl-Alt-l", mac: "Ctrl-Cmd-l", run: imageResizing2.resizeCommand(1.1, true) }),
      KeyBinding.of({ key: "Ctrl-Alt-k", mac: "Ctrl-Cmd-k", run: imageResizing2.resizeCommand(0.9091, true) })
    ];
    imageResizing2.dragHandle = [
      GardState.prec.high(resizeHandlers),
      resizeState,
      Decoration.Point.source.of((s) => s.field(resizeState).deco),
      resizeTheme
    ];
    ;
    return imageResizing2;
  })(imageResizing);
  image = /* @__PURE__ */ (function(image2) {
    image2.keyBinding = KeyBinding.of({ key: "Ctrl-Alt-i", mac: "Ctrl-Cmd-i", run: insertImage });
    image2.button = Menu.Button.define({
      run: insertImage,
      active: (state) => !!activeImage(state.sel),
      label: {
        icon: "M38 34a9 9 0 1 1-19 0 9 9 0 0 1 19 0M9 13A9 9 0 0 0 0 22v56A9 9 0 0 0 9 88h81a9 9 0 0 0 9-9v-56A9 9 0 0 0 91 13zm81 6a3 3 0 0 1 3 3v38l-24-12a3 3 0 0 0-4 1l-23 23-17-11a3 3 0 0 0-4 0L6 75v3L6 78v-56a3 3 0 0 1 3-3z"
      },
      description: imagePhrases.ref("insert_image"),
      enable: (s) => !s.readOnly,
      parent: Menu.Group.insert,
      rank: 30
    });
    image2.dropHandler = GardState.prec.lowest(Wordgard.domEventHandler("drop", (event, wg) => {
      let { state } = wg, upload = state.facet(imageUploader)[0];
      const type = state.schema.has(Image) ? Image : state.schema.has(Figure) ? Figure : null;
      if (state.readOnly || !type || !upload || !event.dataTransfer)
        return false;
      let files = event.dataTransfer.files, uploads = [];
      for (let i = 0; i < files.length; i++) {
        let file = files[i];
        if (/^image\//.test(file.type))
          uploads.push(upload(file, wg, () => {
          }));
      }
      if (!uploads.length)
        return false;
      let dropPos = { x: event.clientX, y: event.clientY };
      Promise.all(uploads).then((urls) => {
        wg.dispatch({
          changes: { from: wg.posAtCoords(dropPos).pos, insert: urls.map((u) => type.of(u)), fit: true },
          userEvent: "drop.image"
        });
      }, (err) => {
        Wordgard.logException(state, err, "Dropped image upload");
      });
      return true;
    }));
    image2.insert = insertImage;
    image2.uploader = imageUploader;
    ;
    return image2;
  })(image);
  function setColor(wg, mark, value) {
    let { state } = wg, { selection } = state;
    if (state.readOnly)
      return;
    if (selection instanceof GardSelection.Text && selection.empty) {
      let selMarks = selection.marks || state.sel.head.marks();
      let newMarks = value ? mark.of(value).addToSet(selMarks) : mark.removeFromSet(selMarks);
      wg.dispatch({
        selection: GardSelection.Text.create({
          anchor: selection.anchor,
          headSide: selection.headSide,
          goalColumn: selection.goalColumn,
          marks: newMarks
        }),
        userEvent: value ? "mark.add" : "mark.remove"
      });
    } else if (value) {
      wg.dispatch({
        changes: selection.ranges.map((r) => ({ from: r.from, to: r.to, add: mark.of(value) })),
        userEvent: "mark.add"
      });
    } else {
      let changes = [];
      for (let { from, to } of selection.ranges) {
        state.doc.iterate(from, to, (node, pos) => {
          let has = mark.isInSet(node.marks);
          if (has)
            changes.push({ from: Math.max(from, pos), to: Math.min(to, pos + node.length), remove: has });
        });
      }
      wg.dispatch({ changes, userEvent: "mark.remove" });
    }
  }
  var ColorPicker = class _ColorPicker {
    wg;
    finish;
    dom;
    width;
    selPos = 0;
    options;
    constructor(wg, finish) {
      this.wg = wg;
      this.finish = finish;
      this.width = wg.state.facet(_ColorPicker.width);
      this.dom = document.createElement("wg-color-picker");
      this.dom.role = "listbox";
      this.dom.style.gridTemplateColumns = `repeat(${this.width}, max-content)`;
      this.options = wg.state.facet(_ColorPicker.options).map(({ name, detail, value }, i) => {
        let option = this.dom.appendChild(document.createElement("wg-color-picker-color"));
        let label = name(wg.state);
        if (detail)
          label += ` (${detail(wg.state)})`;
        option.role = "option";
        option.setAttribute("aria-label", label);
        option.title = label;
        if (i == this.selPos)
          option.setAttribute("aria-selected", "true");
        if (value)
          option.style.backgroundColor = value;
        else
          option.className = "wg-no-color";
        option.setAttribute("data-value", value);
        return option;
      });
      this.dom.addEventListener("mousedown", (e) => {
        if (e.button == 0) {
          let target = e.target.closest("wg-color-picker-color");
          if (target)
            this.finish(target.getAttribute("data-value"));
        }
      });
      this.dom.addEventListener("keydown", (e) => {
        let ltr = this.wg.state.textLTR;
        if (e.key == (ltr ? "ArrowLeft" : "ArrowRight") && this.selPos > 0) {
          this.move(this.selPos - 1);
        } else if (e.key == (ltr ? "ArrowRight" : "ArrowLeft") && this.selPos < this.options.length - 1) {
          this.move(this.selPos + 1);
        } else if (e.key == "ArrowUp" || e.key == "ArrowDown") {
          let next = e.key == "ArrowUp" ? this.selPos - this.width : this.selPos + this.width;
          if (next < 0 || next >= this.options.length - 1) {
            let col = this.selPos % this.width;
            if (next < 0)
              next = (Math.ceil(this.options.length / this.width) - 1) * this.width + col - 1;
            else
              next = col + 1;
          }
          this.move(Math.max(0, Math.min(this.options.length - 1, next)));
        } else if (e.key == " " || e.key == "Enter") {
          this.finish(this.options[this.selPos].getAttribute("data-value"));
        } else {
          return;
        }
        e.preventDefault();
      });
    }
    static create(wg, finish) {
      return new _ColorPicker(wg, finish);
    }
    move(selPos) {
      if (selPos != this.selPos) {
        let prev = this.options[this.selPos];
        let cur = this.options[this.selPos = selPos];
        prev.removeAttribute("aria-selected");
        cur.setAttribute("aria-selected", "true");
      }
    }
  };
  ColorPicker = /* @__PURE__ */ (function(ColorPicker2) {
    function col(rgb, name, mod) {
      let detail = mod == 3 ? colorNames.ref("lightest") : mod == 2 ? colorNames.ref("lighter") : mod == 1 ? colorNames.ref("light") : mod == -1 ? colorNames.ref("dark") : mod == -2 ? colorNames.ref("darker") : mod ? colorNames.ref("darkest") : void 0;
      return { name: colorNames.ref(name), detail, value: rgb };
    }
    function defaultColors() {
      return [
        col("", "none"),
        col("#000000", "black"),
        col("#434343", "grey", -3),
        col("#666666", "grey", -2),
        col("#999999", "grey", -1),
        col("#cccccc", "grey"),
        col("#d9d9d9", "grey", 1),
        col("#efefef", "grey", 2),
        col("#f3f3f3", "grey", 3),
        col("#ffffff", "white"),
        col("#980000", "red_berry"),
        col("#ff0000", "red"),
        col("#ff9900", "orange"),
        col("#ffff00", "yellow"),
        col("#00ff00", "green"),
        col("#00ffff", "cyan"),
        col("#4a86e8", "cornflower"),
        col("#0000ff", "blue"),
        col("#9900ff", "purple"),
        col("#ff00ff", "magenta"),
        col("#e6b8af", "red_berry", 3),
        col("#f4cccc", "red", 3),
        col("#fce5cd", "orange", 3),
        col("#fff2cc", "yellow", 3),
        col("#d9ead3", "green", 3),
        col("#d0e0e3", "cyan", 3),
        col("#c9daf8", "cornflower", 3),
        col("#cfe2f3", "blue", 3),
        col("#d9d2e9", "purple", 3),
        col("#ead1dc", "magenta", 3),
        col("#dd7e6b", "red_berry", 2),
        col("#ea9999", "red", 2),
        col("#f9cb9c", "orange", 2),
        col("#ffe599", "yellow", 2),
        col("#b6d7a8", "green", 2),
        col("#a2c4c9", "cyan", 2),
        col("#a4c2f4", "cornflower", 2),
        col("#9fc5e8", "blue", 2),
        col("#b4a7d6", "purple", 2),
        col("#d5a6bd", "magenta", 2),
        col("#cc4125", "red_berry", 1),
        col("#e06666", "red", 1),
        col("#f6b26b", "orange", 1),
        col("#ffd966", "yellow", 1),
        col("#93c47d", "green", 1),
        col("#76a5af", "cyan", 1),
        col("#6d9eeb", "cornflower", 1),
        col("#6fa8dc", "blue", 1),
        col("#8e7cc3", "purple", 1),
        col("#c27ba0", "magenta", 1),
        col("#a61c00", "red_berry", -1),
        col("#cc0000", "red", -1),
        col("#e69138", "orange", -1),
        col("#f1c232", "yellow", -1),
        col("#6aa84f", "green", -1),
        col("#45818e", "cyan", -1),
        col("#3c78d8", "cornflower", -1),
        col("#3d85c6", "blue", -1),
        col("#674ea7", "purple", -1),
        col("#a64d79", "magenta", -1),
        col("#85200c", "red_berry", -2),
        col("#990000", "red", -2),
        col("#b45f06", "orange", -2),
        col("#bf9000", "yellow", -2),
        col("#38761d", "green", -2),
        col("#134f5c", "cyan", -2),
        col("#1155cc", "cornflower", -2),
        col("#0b5394", "blue", -2),
        col("#351c75", "purple", -2),
        col("#741b47", "magenta", -2),
        col("#5b0f00", "red_berry", -3),
        col("#660000", "red", -3),
        col("#783f04", "orange", -3),
        col("#7f6000", "yellow", -3),
        col("#274e13", "green", -3),
        col("#0c343d", "cyan", -3),
        col("#1c4587", "cornflower", -3),
        col("#073763", "blue", -3),
        col("#20124d", "purple", -3),
        col("#4c1130", "magenta", -3)
      ];
    }
    ColorPicker2.width = GardState.Facet.define({
      combine: (values) => values.length ? values[0] : 10
    });
    ColorPicker2.options = GardState.Facet.define({
      combine: (values) => values.length ? values[0] : defaultColors()
    });
    ColorPicker2.theme = Wordgard.styles({
      "wg-color-picker": {
        display: "grid",
        gap: "4px",
        padding: "3px"
      },
      "wg-color-picker-color": {
        borderRadius: "50%",
        border: "1px solid var(--wg-border-color)",
        width: "12px",
        height: "12px",
        "wg-color-picker:focus &[aria-selected], &:hover": {
          outline: "2px solid var(--wg-highlight-color)"
        },
        "&.wg-no-color": {
          border: "none",
          background: `${crossGradient(45)}, ${crossGradient(135)}`
        }
      }
    });
    ;
    return ColorPicker2;
  })(ColorPicker);
  function crossGradient(angle) {
    return `linear-gradient(${angle}deg, transparent, transparent 44%, currentColor 44%, currentColor 56%, transparent 56%)`;
  }
  var colorPicker = /* @__PURE__ */ Menu.CustomControl.define({
    render(wg, done) {
      return ColorPicker.create(wg, (color2) => {
        done();
        setColor(wg, Color, color2);
        wg.focus();
      });
    }
  });
  function color() {
    return [GardState.schemaElement.of(Color), color.button, ColorPicker.theme];
  }
  color = /* @__PURE__ */ (function(color2) {
    color2.button = Menu.Submenu.define({
      label: {
        icon: "M5 8A3 3 0 0 1 8 5h28a3 3 0 0 1 3 3v30l23-23a3 3 0 0 1 4 0l20 20a3 3 0 0 1 0 4L63 61H92a3 3 0 0 1 3 3v28a3 3 0 0 1-3 3H22a17 17 0 0 1-12-5A17 17 0 0 1 5 78m34-1 41-41-16-16L39 45zM30 78a8 8 0 1 0-17 0 8 8 0 0 0 17 0M89 89v-22H57l-23 23zM5 8v70zm0 70V78z"
      },
      description: phrases.ref("text_color"),
      arrow: false,
      parent: Menu.Group.inline,
      enable: (s) => !s.readOnly,
      rank: 80,
      content: [colorPicker]
    });
    ;
    return color2;
  })(color);
  function backgroundColor() {
    return [GardState.schemaElement.of(BackgroundColor), backgroundColor.button, ColorPicker.theme];
  }
  var backgroundPicker = /* @__PURE__ */ Menu.CustomControl.define({
    render(wg, done) {
      return ColorPicker.create(wg, (color2) => {
        done();
        setColor(wg, BackgroundColor, color2);
        wg.focus();
      });
    }
  });
  backgroundColor = /* @__PURE__ */ (function(backgroundColor2) {
    backgroundColor2.button = Menu.Submenu.define({
      label: {
        icon: "M67 9a11 11 0 0 1 16 0l8 8a11 11 0 0 1 0 16l-2 2-45 51a3 3 0 0 1-2 1h-17a3 3 0 0 1-1 0l-2 2A3 3 0 0 1 19 89h-11a3 3 0 0 1-2-5l8-8A3 3 0 0 1 13 75v-17a3 3 0 0 1 1-2l51-45zm-1 8L20 59l21 21 42-46zm20 12 0 0a6 6 0 0 0 0-8L79 13a6 6 0 0 0-8 0l0 0zM35 81 19 65v9L26 81z"
      },
      description: phrases.ref("background_color"),
      arrow: false,
      parent: Menu.Group.inline,
      enable: (s) => !s.readOnly,
      rank: 85,
      content: [backgroundPicker]
    });
    ;
    return backgroundColor2;
  })(backgroundColor);
  function toggleLink(wg) {
    if (wg.state.readOnly)
      return false;
    let open = Dialog.get(wg, "wg-link-dialog");
    if (open) {
      if (open.dom.contains(wg.contentDOM.ownerDocument.activeElement))
        wg.focus();
      Dialog.close(wg, "wg-link-dialog");
      return true;
    }
    let { selection, doc: doc2 } = wg.state;
    if (selection.empty)
      return false;
    let remove2 = [];
    for (let { from, to } of selection.ranges)
      doc2.iterate(from, to, (node, pos) => {
        let has = Link.isInSet(node.marks);
        if (has)
          remove2.push({ from: pos, to: pos + node.length, remove: has });
      });
    if (remove2.length) {
      wg.dispatch({ changes: remove2, userEvent: "mark.remove" });
    } else {
      Dialog.show(wg, {
        label: phrases.get(wg.state, "link_target"),
        input: { type: "text", name: "url" },
        submitLabel: phrases.get(wg.state, "create_link"),
        class: "wg-link-dialog",
        focus: true
      }).result.then((form) => {
        wg.focus();
        let url = form && form.elements.namedItem("url")?.value;
        if (url)
          wg.dispatch({
            changes: selection.ranges.map((r) => ({ from: r.from, to: r.to, add: Link.of(url) })),
            userEvent: "mark.add"
          });
      });
    }
    return true;
  }
  function computeLinkTooltip(state) {
    if (!state.selection.isCursor)
      return null;
    let { head } = state.sel, before = head.nodeBefore, link2 = before && Link.isInSet(before.marks);
    if (!link2)
      return null;
    let start = head.pos - before.length, end = head.pos, siblings = head.parent.node.content;
    for (let index = head.index - 1; index > 0 && link2.isInSet(siblings[index - 1].marks); )
      start -= siblings[--index].length;
    for (let index = head.index; index < siblings.length && link2.isInSet(siblings[index].marks); )
      end += siblings[index++].length;
    return {
      pos: start,
      end,
      above: false,
      create: () => renderLinkTooltip(link2.value)
    };
  }
  var closeLinkTooltip = /* @__PURE__ */ Transaction.Effect.define();
  var linkTooltipField = /* @__PURE__ */ GardState.Field.define({
    create: computeLinkTooltip,
    update(value, tr) {
      if (tr.effects.some((e) => e.is(closeLinkTooltip)))
        return null;
      let sel = tr.selection;
      if (!tr.docChanged && (!sel || value && sel.isCursor && sel.head >= value.pos && sel.head <= value.end))
        return value;
      return computeLinkTooltip(tr.state);
    },
    provide: (f) => Tooltip.show.from(f)
  });
  function renderLinkTooltip(target) {
    let dom = document.createElement("wg-link-tooltip");
    let link2 = dom.appendChild(document.createElement("a"));
    link2.href = target;
    link2.textContent = target;
    return { dom };
  }
  var linkTooltipTheme = /* @__PURE__ */ Wordgard.styles({
    "wg-link-tooltip": {
      maxWidth: "30em",
      fontSize: "90%",
      textOverflow: "ellipsis",
      whiteSpace: "pre",
      overflow: "hidden",
      borderRadius: "3px",
      padding: "2px 5px",
      marginTop: "1px",
      "& a": {
        textDecoration: "none",
        color: "inherit"
      }
    }
  });
  function link() {
    return [GardState.schemaElement.of(Link), link.button, link.keyBinding, link.tooltip, link.pasteOver];
  }
  link = /* @__PURE__ */ (function(link_1) {
    link_1.keyBinding = KeyBinding.of({
      key: "Mod-k",
      run: toggleLink
    });
    link_1.button = Menu.Button.define({
      run: toggleLink,
      active(state) {
        let { selection, doc: doc2 } = state, found = false;
        if (!selection.empty)
          for (let { from, to } of selection.ranges)
            doc2.iterate(from, to, (node) => {
              if (found)
                return false;
              if (Link.isInSet(node.marks))
                found = true;
            });
        return found;
      },
      enable(state) {
        return !state.readOnly && !state.selection.empty;
      },
      label: {
        icon: "M29 41 21 49a19 19 0 1 0 27 27l11-11A19 19 0 0 0 54 34L50 38a6 6 0 0 0-1 1 13 13 0 0 1 5 22L43 72a12 12 0 1 1-18-18l5-5a25 25 0 0 1-1-8zM41 29A19 19 0 0 0 46 59l5-5a13 13 0 0 1-6-21L57 22a12 12 0 1 1 18 18l-5 5c1 3 1 5 1 8l9-9a19 19 0 1 0-27-27z"
      },
      description: phrases.ref("create_link"),
      parent: Menu.Group.inline,
      rank: 50
    });
    link_1.tooltip = [
      linkTooltipField,
      GardState.prec.low(KeyBinding.of({
        key: "Escape",
        run: (wg) => {
          if (!wg.state.field(linkTooltipField))
            return false;
          wg.dispatch({ effects: closeLinkTooltip.of(null) });
          return true;
        }
      })),
      linkTooltipTheme
    ];
    link_1.pasteOver = Wordgard.pasteHandler.of((wg, event) => {
      let { selection } = wg.state, data = event.clipboardData;
      if (!data || selection.empty)
        return false;
      let text = data.getData("text/plain") || data.getData("Text") || data.getData("text/uri-list");
      if (!text || !/^(https?|mailto|xmpp|data):[^ ]+$/.test(text))
        return false;
      let link2 = Link.of(text);
      let changes = ChangeSet.create(wg.state.doc, { from: selection.from, to: selection.to, add: link2 });
      if (changes.empty)
        return false;
      wg.dispatch({
        changes,
        userEvent: "paste.link",
        scrollIntoView: true
      });
      return true;
    });
    ;
    return link;
  })(link);
  function lineBreak() {
    return GardState.schemaElement.of(LineBreak);
  }

  // dev/wasm-web-runtimes/examples/browser-editors/src/wordgard.js
  var style = document.createElement("style");
  style.textContent = `
  :root { font-family: ui-sans-serif, system-ui, sans-serif; }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; background: #171326; color: #f2eefe; padding: 32px; }
  main { width: min(760px, 100%); margin: 0 auto; }
  .eyebrow { color: #d4a5ff; font-size: 12px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
  h1 { margin: 8px 0 6px; font-size: clamp(30px, 6vw, 52px); letter-spacing: -.04em; }
  .lede { color: #b9accd; margin: 0 0 22px; }
  .toolbar { display: flex; gap: 7px; padding: 8px; background: #271e3c; border: 1px solid #55456f; border-bottom: 0; border-radius: 12px 12px 0 0; }
  button { min-width: 38px; min-height: 34px; border: 1px solid #66547f; border-radius: 7px; background: #36294e; color: #f2eefe; cursor: pointer; font-weight: 750; }
  button:hover { background: #493662; border-color: #d4a5ff; }
  #editor { min-height: 260px; background: #fcfaff; color: #241d31; border: 1px solid #55456f; border-radius: 0 0 12px 12px; padding: 24px; }
  wordgard-editor, wg-scroller, wg-content { display: block; }
  wordgard-editor { min-height: 210px; outline: none; line-height: 1.65; }
  wg-content p { margin: 0 0 1em; }
  #status { min-height: 1.4em; color: #b9accd; margin-top: 10px; font-size: 13px; }
`;
  document.head.appendChild(style);
  var main = document.createElement("main");
  main.innerHTML = `<div class="eyebrow">QuickJS \xB7 wasm-web-machine</div>
  <h1>Wordgard</h1><p class="lede">A semantic rich-text editor running directly inside the machine.</p>
  <div class="toolbar" aria-label="Formatting">
    <button type="button" data-command="strong" aria-label="Bold"><strong>B</strong></button>
    <button type="button" data-command="emphasis" aria-label="Italic"><em>I</em></button>
    <button type="button" data-command="code" aria-label="Code">&lt;/&gt;</button>
    <button type="button" data-command="undo" aria-label="Undo">Undo</button>
    <button type="button" data-command="redo" aria-label="Redo">Redo</button>
  </div><div id="editor"></div><div id="status" role="status"></div>`;
  document.body.replaceChildren(main);
  var status = document.getElementById("status");
  var editor = Wordgard.create({
    parent: document.getElementById("editor"),
    doc: { type: "Doc", content: [
      { type: "Paragraph", content: [
        { type: "Text", param: "Wordgard is executing inside QuickJS WebAssembly." }
      ] },
      { type: "Paragraph", content: [
        { type: "Text", param: "Type, format text, and use ordinary undo and redo shortcuts." }
      ] }
    ] },
    config: [
      blockDoc(),
      paragraph(),
      lineBreak(),
      strong(),
      emphasis(),
      code(),
      history(),
      Wordgard.label("Message"),
      Wordgard.updateListener.of((update) => {
        if (update.docChanged) {
          update.editor.flush();
          status.textContent = `${update.editor.state.doc.textContent({ blockSeparator: " " }).length} characters`;
        }
      })
    ]
  });
  editor.flush();
  var commands = { strong: strong.button.run, emphasis: emphasis.button.run, code: code.button.run, undo: undo2, redo: redo2 };
  editor.contentDOM.addEventListener("keydown", (event) => {
    if (!(event.ctrlKey || event.metaKey)) return;
    const command = event.key.toLowerCase() === "z" ? event.shiftKey ? redo2 : undo2 : event.key.toLowerCase() === "y" ? redo2 : null;
    if (!command) return;
    editor.flush();
    if (Command.dispatch(editor, command)) event.preventDefault();
  });
  Object.keys(commands).forEach((name) => {
    const button = document.querySelector(`[data-command="${name}"]`);
    button.addEventListener("mousedown", (event) => event.preventDefault());
    button.addEventListener("click", () => {
      const command = commands[name];
      editor.flush();
      Command.dispatch(editor, command);
      editor.focus();
    });
  });
  editor.focus();
  globalThis.__wwcResult = () => `Wordgard:${editor.state.doc.textContent({ blockSeparator: " " })}`;
})();
