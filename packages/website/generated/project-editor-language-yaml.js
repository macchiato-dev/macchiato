(function (require) {
  var l = require("@lezer/lr"),
    t = require("@lezer/highlight"),
    X = 63,
    D = 64,
    L = 1,
    B = 2,
    W = 3,
    u = 4,
    U = 5,
    E = 6,
    M = 7,
    y = 65,
    N = 66,
    j = 8,
    A = 9,
    H = 10,
    F = 11,
    I = 12,
    C = 13,
    K = 19,
    J = 20,
    OO = 29,
    eO = 33,
    aO = 34,
    rO = 47,
    tO = 0,
    T = 1,
    g = 2,
    i = 3,
    x = 4,
    Q = function Q(e, a, r) {
      this.parent = e, this.depth = a, this.type = r, this.hash = (e ? e.hash + e.hash << 8 : 0) + a + (a << 4) + r;
    };
  Q.top = new Q(null, -1, tO);
  function R(O, e) {
    for (var a = 0, r = e - O.pos - 1;; r--, a++) {
      var o = O.peek(r);
      if (s(o) || o == -1) return a;
    }
  }
  function p(O) {
    return O == 32 || O == 9;
  }
  function s(O) {
    return O == 10 || O == 13;
  }
  function Z(O) {
    return p(O) || s(O);
  }
  function f(O) {
    return O < 0 || Z(O);
  }
  var nO = new l.ContextTracker({
    start: Q.top,
    reduce: function reduce(O, e) {
      return O.type == i && (e == J || e == aO) ? O.parent : O;
    },
    shift: function shift(O, e, a, r) {
      if (e == W) return new Q(O, R(r, r.pos), T);
      if (e == y || e == U) return new Q(O, R(r, r.pos), g);
      if (e == X) return O.parent;
      if (e == K || e == eO) return new Q(O, 0, i);
      if (e == C && O.type == x) return O.parent;
      if (e == rO) {
        var o = /[1-9]/.exec(r.read(r.pos, a.pos));
        if (o) return new Q(O, O.depth + +o[0], x);
      }
      return O;
    },
    hash: function hash(O) {
      return O.hash;
    }
  });
  function d(O, e, a) {
    if (a === void 0) {
      a = 0;
    }
    return O.peek(a) == e && O.peek(a + 1) == e && O.peek(a + 2) == e && f(O.peek(a + 3));
  }
  var oO = new l.ExternalTokenizer(function (O, e) {
      if (O.next == -1 && e.canShift(D)) return O.acceptToken(D);
      var a = O.peek(-1);
      if ((s(a) || a < 0) && e.context.type != i) {
        if (d(O, 45)) if (e.canShift(X)) O.acceptToken(X);else return O.acceptToken(L, 3);
        if (d(O, 46)) if (e.canShift(X)) O.acceptToken(X);else return O.acceptToken(B, 3);
        var r = 0;
        for (; O.next == 32;) r++, O.advance();
        (r < e.context.depth || r == e.context.depth && e.context.type == T && (O.next != 45 || !f(O.peek(1)))) && O.next != -1 && !s(O.next) && O.next != 35 && O.acceptToken(X, -r);
      }
    }, {
      contextual: !0
    }),
    PO = new l.ExternalTokenizer(function (O, e) {
      if (e.context.type == i) {
        O.next == 63 && (O.advance(), f(O.next) && O.acceptToken(M));
        return;
      }
      if (O.next == 45) O.advance(), f(O.next) && O.acceptToken(e.context.type == T && e.context.depth == R(O, O.pos - 1) ? u : W);else if (O.next == 63) O.advance(), f(O.next) && O.acceptToken(e.context.type == g && e.context.depth == R(O, O.pos - 1) ? E : U);else {
        var a = O.pos;
        for (;;) if (p(O.next)) {
          if (O.pos == a) return;
          O.advance();
        } else if (O.next == 33) z(O);else if (O.next == 38) $(O);else if (O.next == 42) {
          $(O);
          break;
        } else if (O.next == 39 || O.next == 34) {
          if (h(O, !0)) break;
          return;
        } else if (O.next == 91 || O.next == 123) {
          if (!sO(O)) return;
          break;
        } else {
          _(O, !0, !1, 0);
          break;
        }
        for (; p(O.next);) O.advance();
        if (O.next == 58) {
          if (O.pos == a && e.canShift(OO)) return;
          var r = O.peek(1);
          f(r) && O.acceptTokenTo(e.context.type == g && e.context.depth == R(O, a) ? N : y, a);
        }
      }
    }, {
      contextual: !0
    });
  function QO(O) {
    return O > 32 && O < 127 && O != 34 && O != 37 && O != 44 && O != 60 && O != 62 && O != 92 && O != 94 && O != 96 && O != 123 && O != 124 && O != 125;
  }
  function q(O) {
    return O >= 48 && O <= 57 || O >= 97 && O <= 102 || O >= 65 && O <= 70;
  }
  function Y(O, e) {
    return O.next == 37 ? (O.advance(), q(O.next) && O.advance(), q(O.next) && O.advance(), !0) : QO(O.next) || e && O.next == 44 ? (O.advance(), !0) : !1;
  }
  function z(O) {
    if (O.advance(), O.next == 60) {
      for (O.advance();;) if (!Y(O, !0)) {
        O.next == 62 && O.advance();
        break;
      }
    } else for (; Y(O, !1););
  }
  function $(O) {
    for (O.advance(); !f(O.next) && k(O.next) != "f";) O.advance();
  }
  function h(O, e) {
    var a = O.next,
      r = !1,
      o = O.pos;
    for (O.advance();;) {
      var n = O.next;
      if (n < 0) break;
      if (O.advance(), n == a) {
        if (n == 39) {
          if (O.next == 39) O.advance();else break;
        } else break;
      } else if (n == 92 && a == 34) O.next >= 0 && O.advance();else if (s(n)) {
        if (e) return !1;
        r = !0;
      } else if (e && O.pos >= o + 1024) return !1;
    }
    return !r;
  }
  function sO(O) {
    for (var e = [], a = O.pos + 1024;;) if (O.next == 91 || O.next == 123) e.push(O.next), O.advance();else if (O.next == 39 || O.next == 34) {
      if (!h(O, !0)) return !1;
    } else if (O.next == 93 || O.next == 125) {
      if (e[e.length - 1] != O.next - 2) return !1;
      if (e.pop(), O.advance(), !e.length) return !0;
    } else {
      if (O.next < 0 || O.pos > a || s(O.next)) return !1;
      O.advance();
    }
  }
  var lO = "iiisiiissisfissssssssssssisssiiissssssssssssssssssssssssssfsfssissssssssssssssssssssssssssfif";
  function k(O) {
    return O < 33 ? "u" : O > 125 ? "s" : lO[O - 33];
  }
  function b(O, e) {
    var a = k(O);
    return a != "u" && !(e && a == "f");
  }
  function _(O, e, a, r) {
    if (k(O.next) == "s" || (O.next == 63 || O.next == 58 || O.next == 45) && b(O.peek(1), a)) O.advance();else return !1;
    var o = O.pos;
    for (;;) {
      var n = O.next,
        c = 0,
        S = r + 1;
      for (; Z(n);) {
        if (s(n)) {
          if (e) return !1;
          S = 0;
        } else S++;
        n = O.peek(++c);
      }
      if (!(n >= 0 && (n == 58 ? b(O.peek(c + 1), a) : n == 35 ? O.peek(c - 1) != 32 : b(n, a))) || !a && S <= r || S == 0 && !a && (d(O, 45, c) || d(O, 46, c))) break;
      if (e && k(n) == "f") return !1;
      for (var v = c; v >= 0; v--) O.advance();
      if (e && O.pos > o + 1024) return !1;
    }
    return !0;
  }
  var cO = new l.ExternalTokenizer(function (O, e) {
      if (O.next == 33) z(O), O.acceptToken(I);else if (O.next == 38 || O.next == 42) {
        var a = O.next == 38 ? H : F;
        $(O), O.acceptToken(a);
      } else O.next == 39 || O.next == 34 ? (h(O, !1), O.acceptToken(A)) : _(O, !1, e.context.type == i, e.context.depth) && O.acceptToken(j);
    }),
    fO = new l.ExternalTokenizer(function (O, e) {
      var a = e.context.type == x ? e.context.depth : -1,
        r = O.pos;
      O: for (;;) {
        var o = 0,
          n = O.next;
        for (; n == 32;) n = O.peek(++o);
        if (!o && (d(O, 45, o) || d(O, 46, o)) || !s(n) && (a < 0 && (a = Math.max(e.context.depth + 1, o)), o < a)) break;
        for (;;) {
          if (O.next < 0) break O;
          var c = s(O.next);
          if (O.advance(), c) continue O;
          r = O.pos;
        }
      }
      O.acceptTokenTo(C, r);
    }),
    XO = (0, t.styleTags)({
      DirectiveName: t.tags.keyword,
      DirectiveContent: t.tags.attributeValue,
      "DirectiveEnd DocEnd": t.tags.meta,
      QuotedLiteral: t.tags.string,
      BlockLiteralHeader: t.tags.special(t.tags.string),
      BlockLiteralContent: t.tags.content,
      Literal: t.tags.content,
      "Key/Literal Key/QuotedLiteral": t.tags.definition(t.tags.propertyName),
      "Anchor Alias": t.tags.labelName,
      Tag: t.tags.typeName,
      Comment: t.tags.lineComment,
      ": , -": t.tags.separator,
      "?": t.tags.punctuation,
      "[ ]": t.tags.squareBracket,
      "{ }": t.tags.brace
    }),
    V = l.LRParser.deserialize({
      version: 14,
      states: "5lQ!ZQgOOO#PQfO'#CpO#uQfO'#DOOOQR'#Dv'#DvO$qQgO'#DRO%gQdO'#DUO%nQgO'#DUO&ROaO'#D[OOQR'#Du'#DuO&{QgO'#D^O'rQgO'#D`OOQR'#Dt'#DtO(iOqO'#DbOOQP'#Dj'#DjO(zQaO'#CmO)YQgO'#CmOOQP'#Cm'#CmQ)jQaOOQ)uQgOOQ]QgOOO*PQdO'#CrO*nQdO'#CtOOQO'#Dw'#DwO+]Q`O'#CxO+hQdO'#CwO+rQ`O'#CwOOQO'#Cv'#CvO+wQdO'#CvOOQO'#Cq'#CqO,UQ`O,59[O,^QfO,59[OOQR,59[,59[OOQO'#Cx'#CxO,eQ`O'#DPO,pQdO'#DPOOQO'#Dx'#DxO,zQdO'#DxO-XQ`O,59jO-aQfO,59jOOQR,59j,59jOOQR'#DS'#DSO-hQcO,59mO-sQgO'#DVO.TQ`O'#DVO.YQcO,59pOOQR'#DX'#DXO#|QfO'#DWO.hQcO'#DWOOQR,59v,59vO.yOWO,59vO/OOaO,59vO/WOaO,59vO/cQgO'#D_OOQR,59x,59xO0VQgO'#DaOOQR,59z,59zOOQP,59|,59|O0yOaO,59|O1ROaO,59|O1aOqO,59|OOQP-E7h-E7hO1oQgO,59XOOQP,59X,59XO2PQaO'#DeO2_QgO'#DeO2oQgO'#DkOOQP'#Dk'#DkQ)jQaOOO3PQdO'#CsOOQO,59^,59^O3kQdO'#CuOOQO,59`,59`OOQO,59c,59cO4VQdO,59cO4aQdO'#CzO4kQ`O'#CzOOQO,59b,59bOOQU,5:Q,5:QOOQR1G.v1G.vO4pQ`O1G.vOOQU-E7d-E7dO4xQdO,59kOOQO,59k,59kO5SQdO'#DQO5^Q`O'#DQOOQO,5:d,5:dOOQU,5:R,5:ROOQR1G/U1G/UO5cQ`O1G/UOOQU-E7e-E7eO5kQgO'#DhO5xQcO1G/XOOQR1G/X1G/XOOQR,59q,59qO6TQgO,59qO6eQdO'#DiO6lQgO'#DiO7PQcO1G/[OOQR1G/[1G/[OOQR,59r,59rO#|QfO,59rOOQR1G/b1G/bO7_OWO1G/bO7dOaO1G/bOOQR,59y,59yOOQR,59{,59{OOQP1G/h1G/hO7lOaO1G/hO7tOaO1G/hO8POaO1G/hOOQP1G.s1G.sO8_QgO,5:POOQP,5:P,5:POOQP,5:V,5:VOOQP-E7i-E7iOOQO,59_,59_OOQO,59a,59aOOQO1G.}1G.}OOQO,59f,59fO8oQdO,59fOOQR7+$b7+$bP,XQ`O'#DfOOQO1G/V1G/VOOQO,59l,59lO8yQdO,59lOOQR7+$p7+$pP9TQ`O'#DgOOQR'#DT'#DTOOQR,5:S,5:SOOQR-E7f-E7fOOQR7+$s7+$sOOQR1G/]1G/]O9YQgO'#DYO9jQ`O'#DYOOQR,5:T,5:TO#|QfO'#DZO9oQcO'#DZOOQR-E7g-E7gOOQR7+$v7+$vOOQR1G/^1G/^OOQR7+$|7+$|O:QOWO7+$|OOQP7+%S7+%SO:VOaO7+%SO:_OaO7+%SOOQP1G/k1G/kOOQO1G/Q1G/QOOQO1G/W1G/WOOQR,59t,59tO:jQgO,59tOOQR,59u,59uO#|QfO,59uOOQR<<Hh<<HhOOQP<<Hn<<HnO:zOaO<<HnOOQR1G/`1G/`OOQR1G/a1G/aOOQPAN>YAN>Y",
      stateData: ";S~O!fOS!gOS^OS~OP_OQbORSOTUOWROXROYYOZZO[XOcPOqQO!PVO!V[O!cTO~O`cO~P]OVkOWROXROYeOZfO[dOcPOmhOqQO~OboO~P!bOVtOWROXROYeOZfO[dOcPOmrOqQO~OpwO~P#WORSOTUOWROXROYYOZZO[XOcPOqQO!PVO!cTO~OSvP!avP!bvP~P#|OWROXROYeOZfO[dOcPOqQO~OmzO~P%OOm!OOUzP!azP!bzP!dzP~P#|O^!SO!b!QO!f!TO!g!RO~ORSOTUOWROXROcPOqQO!PVO!cTO~OY!UOP!QXQ!QX!V!QX!`!QXS!QX!a!QX!b!QXU!QXm!QX!d!QX~P&aO[!WOP!SXQ!SX!V!SX!`!SXS!SX!a!SX!b!SXU!SXm!SX!d!SX~P&aO^!ZO!W![O!b!YO!f!]O!g!YO~OP!_O!V[OQaX!`aX~OPaXQaX!VaX!`aX~P#|OP!bOQ!cO!V[O~OP_O!V[O~P#|OWROXROY!fOcPOqQObfXmfXofXpfX~OWROXRO[!hOcPOqQObhXmhXohXphX~ObeXmlXoeX~ObkXokX~P%OOm!kO~Om!lObnPonP~P%OOb!pOo!oO~Ob!pO~P!bOm!sOosXpsX~OosXpsX~P%OOm!uOotPptP~P%OOo!xOp!yO~Op!yO~P#WOS!|O!a#OO!b#OO~OUyX!ayX!byX!dyX~P#|Om#QO~OU#SO!a#UO!b#UO!d#RO~Om#WOUzX!azX!bzX!dzX~O]#XO~O!b#XO!g#YO~O^#ZO!b#XO!g#YO~OP!RXQ!RX!V!RX!`!RXS!RX!a!RX!b!RXU!RXm!RX!d!RX~P&aOP!TXQ!TX!V!TX!`!TXS!TX!a!TX!b!TXU!TXm!TX!d!TX~P&aO!b#^O!g#^O~O^#_O!b#^O!f#`O!g#^O~O^#_O!W#aO!b#^O!g#^O~OPaaQaa!Vaa!`aa~P#|OP#cO!V[OQ!XX!`!XX~OP!XXQ!XX!V!XX!`!XX~P#|OP_O!V[OQ!_X!`!_X~P#|OWROXROcPOqQObgXmgXogXpgX~OWROXROcPOqQObiXmiXoiXpiX~Obkaoka~P%OObnXonX~P%OOm#kO~Ob#lOo!oO~Oosapsa~P%OOotXptX~P%OOm#pO~Oo!xOp#qO~OSwP!awP!bwP~P#|OS!|O!a#vO!b#vO~OUya!aya!bya!dya~P#|Om#xO~P%OOm#{OU}P!a}P!b}P!d}P~P#|OU#SO!a$OO!b$OO!d#RO~O]$QO~O!b$QO!g$RO~O!b$SO!g$SO~O^$TO!b$SO!g$SO~O^$TO!b$SO!f$UO!g$SO~OP!XaQ!Xa!V!Xa!`!Xa~P#|Obnaona~P%OOotapta~P%OOo!xO~OU|X!a|X!b|X!d|X~P#|Om$ZO~Om$]OU}X!a}X!b}X!d}X~O]$^O~O!b$_O!g$_O~O^$`O!b$_O!g$_O~OU|a!a|a!b|a!d|a~P#|O!b$cO!g$cO~O",
      goto: ",]!mPPPPPPPPPPPPPPPPP!nPP!v#v#|$`#|$c$f$j$nP%VPPP!v%Y%^%a%{&O%a&R&U&X&_&b%aP&e&{&e'O'RPP']'a'g'm's'y(XPPPPPPPP(_)e*X+c,VUaObcR#e!c!{ROPQSTUXY_bcdehknrtvz!O!U!W!_!b!c!f!h!k!l!s!u!|#Q#R#S#W#c#k#p#x#{$Z$]QmPR!qnqfPQThknrtv!k!l!s!u#R#k#pR!gdR!ieTlPnTjPnSiPnSqQvQ{TQ!mkQ!trQ!vtR#y#RR!nkTsQvR!wt!RWOSUXY_bcz!O!U!W!_!b!c!|#Q#S#W#c#x#{$Z$]RySR#t!|R|TR|UQ!PUR#|#SR#z#RR#z#SyZOSU_bcz!O!_!b!c!|#Q#S#W#c#x#{$Z$]R!VXR!XYa]O^abc!a!c!eT!da!eQnPR!rnQvQR!{vQ!}yR#u!}Q#T|R#}#TW^Obc!cS!^^!aT!aa!eQ!eaR#f!eW`Obc!cQxSS}U#SQ!`_Q#PzQ#V!OQ#b!_Q#d!bQ#s!|Q#w#QQ$P#WQ$V#cQ$Y#xQ$[#{Q$a$ZR$b$]xZOSU_bcz!O!_!b!c!|#Q#S#W#c#x#{$Z$]Q!VXQ!XYQ#[!UR#]!W!QWOSUXY_bcz!O!U!W!_!b!c!|#Q#S#W#c#x#{$Z$]pfPQThknrtv!k!l!s!u#R#k#pQ!gdQ!ieQ#g!fR#h!hSgPn^pQTkrtv#RQ!jhQ#i!kQ#j!lQ#n!sQ#o!uQ$W#kR$X#pQuQR!zv",
      nodeNames: "\u26A0 DirectiveEnd DocEnd - - ? ? ? Literal QuotedLiteral Anchor Alias Tag BlockLiteralContent Comment Stream BOM Document ] [ FlowSequence Item Tagged Anchored Anchored Tagged FlowMapping Pair Key : Pair , } { FlowMapping Pair Pair BlockSequence Item Item BlockMapping Pair Pair Key Pair Pair BlockLiteral BlockLiteralHeader Tagged Anchored Anchored Tagged Directive DirectiveName DirectiveContent Document",
      maxTerm: 74,
      context: nO,
      nodeProps: [["isolate", -3, 8, 9, 14, ""], ["openedBy", 18, "[", 32, "{"], ["closedBy", 19, "]", 33, "}"]],
      propSources: [XO],
      skippedNodes: [0],
      repeatNodeCount: 6,
      tokenData: "-Y~RnOX#PXY$QYZ$]Z]#P]^$]^p#Ppq$Qqs#Pst$btu#Puv$yv|#P|}&e}![#P![!]'O!]!`#P!`!a'i!a!}#P!}#O*g#O#P#P#P#Q+Q#Q#o#P#o#p+k#p#q'i#q#r,U#r;'S#P;'S;=`#z<%l?HT#P?HT?HU,o?HUO#PQ#UU!WQOY#PZp#Ppq#hq;'S#P;'S;=`#z<%lO#PQ#kTOY#PZs#Pt;'S#P;'S;=`#z<%lO#PQ#}P;=`<%l#P~$VQ!f~XY$Qpq$Q~$bO!g~~$gS^~OY$bZ;'S$b;'S;=`$s<%lO$b~$vP;=`<%l$bR%OX!WQOX%kXY#PZ]%k]^#P^p%kpq#hq;'S%k;'S;=`&_<%lO%kR%rX!WQ!VPOX%kXY#PZ]%k]^#P^p%kpq#hq;'S%k;'S;=`&_<%lO%kR&bP;=`<%l%kR&lUoP!WQOY#PZp#Ppq#hq;'S#P;'S;=`#z<%lO#PR'VUmP!WQOY#PZp#Ppq#hq;'S#P;'S;=`#z<%lO#PR'p[!PP!WQOY#PZp#Ppq#hq{#P{|(f|}#P}!O(f!O!R#P!R![)p![;'S#P;'S;=`#z<%lO#PR(mW!PP!WQOY#PZp#Ppq#hq!R#P!R![)V![;'S#P;'S;=`#z<%lO#PR)^U!PP!WQOY#PZp#Ppq#hq;'S#P;'S;=`#z<%lO#PR)wY!PP!WQOY#PZp#Ppq#hq{#P{|)V|}#P}!O)V!O;'S#P;'S;=`#z<%lO#PR*nUcP!WQOY#PZp#Ppq#hq;'S#P;'S;=`#z<%lO#PR+XUbP!WQOY#PZp#Ppq#hq;'S#P;'S;=`#z<%lO#PR+rUqP!WQOY#PZp#Ppq#hq;'S#P;'S;=`#z<%lO#PR,]UpP!WQOY#PZp#Ppq#hq;'S#P;'S;=`#z<%lO#PR,vU`P!WQOY#PZp#Ppq#hq;'S#P;'S;=`#z<%lO#P",
      tokenizers: [oO, PO, cO, fO, 0, 1],
      topRules: {
        Stream: [0, 15]
      },
      tokenPrec: 0
    });
  var P = require("@codemirror/language"),
    dO = require("@lezer/common"),
    m = require("@lezer/highlight"),
    G = require("@lezer/lr"),
    RO = G.LRParser.deserialize({
      version: 14,
      states: "!vOQOPOOO]OPO'#C_OhOPO'#C^OOOO'#Cc'#CcOpOPO'#CaQOOOOOO{OPOOOOOO'#Cb'#CbO!WOPO'#C`O!`OPO,58xOOOO-E6a-E6aOOOO-E6`-E6`OOOO'#C_'#C_OOOO1G.d1G.d",
      stateData: "!h~OXPOYROWTP~OWVXXRXYRX~OYVOXSP~OXROYROWTX~OXROYROWTP~OYVOXSX~OX[O~OXY~",
      goto: "vWPPX[beioRUOQQOR]XRXQTTOUQWQRZWSSOURYS",
      nodeNames: "\u26A0 Document Frontmatter DashLine FrontmatterContent Body",
      maxTerm: 10,
      skippedNodes: [0],
      repeatNodeCount: 2,
      tokenData: "$z~RXOYnYZ!^Z]n]^!^^}n}!O!i!O;'Sn;'S;=`!c<%lOn~qXOYnYZ!^Z]n]^!^^;'Sn;'S;=`!c<%l~n~On~~!^~!cOY~~!fP;=`<%ln~!lZOYnYZ!^Z]n]^!^^}n}!O#_!O;'Sn;'S;=`!c<%l~n~On~~!^~#bZOYnYZ!^Z]n]^!^^}n}!O$T!O;'Sn;'S;=`!c<%l~n~On~~!^~$WXOYnYZ$sZ]n]^$s^;'Sn;'S;=`!c<%l~n~On~~$s~$zOX~Y~",
      tokenizers: [0],
      topRules: {
        Document: [0, 1]
      },
      tokenPrec: 67
    }),
    iO = P.LRLanguage.define({
      name: "yaml",
      parser: V.configure({
        props: [P.indentNodeProp.add({
          Stream: function Stream(O) {
            for (var e = O.node.resolve(O.pos, -1); e && e.to >= O.pos; e = e.parent) {
              if (e.name == "BlockLiteralContent" && e.from < e.to) return O.baseIndentFor(e);
              if (e.name == "BlockLiteral") return O.baseIndentFor(e) + O.unit;
              if (e.name == "BlockSequence" || e.name == "BlockMapping") return O.column(e.firstChild.from, 1);
              if (e.name == "QuotedLiteral") return null;
              if (e.name == "Literal") {
                var a = O.column(e.from, 1);
                if (a == O.lineIndent(e.from, 1)) return a;
                if (e.to > O.pos) return null;
              }
            }
            return null;
          },
          FlowMapping: (0, P.delimitedIndent)({
            closing: "}"
          }),
          FlowSequence: (0, P.delimitedIndent)({
            closing: "]"
          })
        }), P.foldNodeProp.add({
          "FlowMapping FlowSequence": P.foldInside,
          "Item Pair BlockLiteral": function Item_Pair_BlockLiteral(O, e) {
            return {
              from: e.doc.lineAt(O.from).to,
              to: O.to
            };
          }
        })]
      }),
      languageData: {
        commentTokens: {
          line: "#"
        },
        indentOnInput: /^\s*[\]\}]$/
      }
    });
  function w() {
    return new P.LanguageSupport(iO);
  }
  var bO = P.LRLanguage.define({
    name: "yaml-frontmatter",
    parser: RO.configure({
      props: [(0, m.styleTags)({
        DashLine: m.tags.meta
      })]
    })
  });
  globalThis.__codeEditorRegisterLanguage("yaml", w);
})(globalThis.__codeMirrorRequire);