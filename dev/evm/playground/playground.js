const examples = [
  {
    name: "Add 2 + 3",
    description: "Arithmetic, memory, and RETURN",
    code: "60 02 60 03 01 60 00 52 60 20 60 00 f3",
    calldata: "",
  },
  {
    name: "Echo calldata",
    description: "CALLDATACOPY returns every supplied byte",
    code: "36 5f 5f 37 36 5f f3",
    calldata: "text:hello from calldata",
  },
  {
    name: "Keccak-256",
    description: "Hash calldata with Ethereum's legacy Keccak",
    code: "36 5f 5f 37 36 5f 20 5f 52 60 20 5f f3",
    calldata: "text:hello",
  },
  {
    name: "Read chain ID",
    description: "Use a block/transaction environment opcode",
    code: "46 5f 52 60 20 5f f3",
    calldata: "",
    environment: { chainId: "1" },
  },
  {
    name: "Transient storage",
    description: "TSTORE then TLOAD within one execution",
    code: "60 2a 60 01 5d 60 01 5c 5f 52 60 20 5f f3",
    calldata: "",
  },
  {
    name: "Bad jump",
    description: "A PUSH byte that looks like JUMPDEST is not a destination",
    code: "60 5b 60 01 56",
    calldata: "",
  },
];

const environmentFields = [
  ["address", "Address"], ["origin", "Transaction origin"],
  ["caller", "Caller"], ["callValue", "Call value"],
  ["gasPrice", "Gas price"], ["coinbase", "Coinbase"], ["timestamp", "Timestamp"],
  ["blockNumber", "Block number"], ["prevRandao", "Prev randao"],
  ["gasLimit", "Block gas limit"], ["chainId", "Chain ID"],
  ["baseFee", "Base fee"], ["blobBaseFee", "Blob base fee"],
  ["selfBalance", "Contract balance"],
];
const opcodeNames = {
  0x00: "STOP", 0x01: "ADD", 0x02: "MUL", 0x03: "SUB", 0x04: "DIV",
  0x05: "SDIV", 0x06: "MOD", 0x07: "SMOD", 0x08: "ADDMOD",
  0x09: "MULMOD", 0x0a: "EXP", 0x0b: "SIGNEXTEND",
  0x10: "LT", 0x11: "GT", 0x12: "SLT", 0x13: "SGT",
  0x14: "EQ", 0x15: "ISZERO", 0x16: "AND", 0x17: "OR", 0x18: "XOR",
  0x19: "NOT", 0x1a: "BYTE", 0x1b: "SHL", 0x1c: "SHR", 0x1d: "SAR",
  0x20: "SHA3", 0x30: "ADDRESS", 0x32: "ORIGIN", 0x33: "CALLER",
  0x31: "BALANCE",
  0x34: "CALLVALUE", 0x35: "CALLDATALOAD", 0x36: "CALLDATASIZE",
  0x37: "CALLDATACOPY", 0x38: "CODESIZE", 0x39: "CODECOPY", 0x3a: "GASPRICE",
  0x3b: "EXTCODESIZE", 0x3c: "EXTCODECOPY", 0x3d: "RETURNDATASIZE",
  0x3e: "RETURNDATACOPY", 0x3f: "EXTCODEHASH", 0x40: "BLOCKHASH",
  0x41: "COINBASE", 0x42: "TIMESTAMP", 0x43: "NUMBER", 0x44: "PREVRANDAO",
  0x45: "GASLIMIT", 0x46: "CHAINID", 0x47: "SELFBALANCE",
  0x48: "BASEFEE", 0x49: "BLOBHASH", 0x4a: "BLOBBASEFEE",
  0x50: "POP", 0x51: "MLOAD", 0x52: "MSTORE", 0x53: "MSTORE8",
  0x54: "SLOAD", 0x55: "SSTORE", 0x56: "JUMP", 0x57: "JUMPI",
  0x58: "PC", 0x59: "MSIZE", 0x5a: "GAS", 0x5b: "JUMPDEST",
  0x5c: "TLOAD", 0x5d: "TSTORE", 0x5e: "MCOPY", 0x5f: "PUSH0",
  0xa0: "LOG0", 0xa1: "LOG1", 0xa2: "LOG2", 0xa3: "LOG3", 0xa4: "LOG4",
  0xf0: "CREATE", 0xf1: "CALL", 0xf2: "CALLCODE", 0xf3: "RETURN",
  0xf4: "DELEGATECALL", 0xf5: "CREATE2", 0xfa: "STATICCALL",
  0xfd: "REVERT", 0xfe: "INVALID", 0xff: "SELFDESTRUCT",
};
const exits = ["Stopped", "Returned", "Reverted", "Out of gas", "Invalid opcode",
  "Stack underflow", "Stack overflow", "Bad jump", "Memory limit",
  "Storage limit", "Step limit", "Unsupported opcode", "Return data out of bounds",
  "Log limit", "Host error", "Write protection", "Init code limit"];
const $ = selector => document.querySelector(selector);
const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

function bytes(value) {
  if (value.startsWith("text:")) return encoder.encode(value.slice(5));
  const clean = value.replace(/(?:0x)|[^\da-f]/gi, "");
  if (clean.length % 2) throw new Error("Hex input must contain complete bytes.");
  return Uint8Array.from(clean.match(/../g) || [], byte => Number.parseInt(byte, 16));
}

function word(value) {
  let number = value.trim().startsWith("0x") ? BigInt(value.trim() || "0") :
    BigInt(value.trim() || "0");
  if (number < 0n || number >= 1n << 256n) throw new RangeError("Environment word is outside uint256.");
  const output = new Uint8Array(32);
  for (let index = 31; index >= 0; index--) { output[index] = Number(number & 255n); number >>= 8n; }
  return output;
}

function hex(value) { return `0x${Array.from(value, byte => byte.toString(16).padStart(2, "0")).join("")}`; }
function compactWord(value) { return value.slice(0, 30).every(byte => byte === 0) ? `0x${hex(value.slice(30)).slice(2).replace(/^0+(?=.)/, "")}` : hex(value); }
function opcodeName(opcode) {
  if (opcode >= 0x60 && opcode <= 0x7f) return `PUSH${opcode - 0x5f}`;
  if (opcode >= 0x80 && opcode <= 0x8f) return `DUP${opcode - 0x7f}`;
  if (opcode >= 0x90 && opcode <= 0x9f) return `SWAP${opcode - 0x8f}`;
  return opcodeNames[opcode] || `0x${opcode.toString(16).padStart(2, "0")}`;
}

for (const [name, label] of environmentFields) {
  const field = document.createElement("div");
  field.className = "field";
  field.innerHTML = `<label for="env-${name}">${label}</label><input id="env-${name}" value="0">`;
  $("#environment").append(field);
}
for (const [index, example] of examples.entries()) {
  const option = document.createElement("option");
  option.value = index;
  option.textContent = `${example.name} — ${example.description}`;
  $("#example").append(option);
}

function selectExample() {
  const example = examples[Number($("#example").value)];
  $("#code").value = example.code;
  $("#calldata").value = example.calldata;
  for (const [name] of environmentFields) $(`#env-${name}`).value = example.environment?.[name] || "0";
}
$("#example").addEventListener("change", selectExample);
selectExample();

const wasm = await WebAssembly.instantiateStreaming(fetch("./evm.wasm"));
const api = wasm.instance.exports;

function memory() { return new Uint8Array(api.memory.buffer); }
function renderTrace(count) {
  const view = new DataView(api.memory.buffer, api.evm_trace_ptr(), count * 48);
  const body = $("#trace");
  body.textContent = "";
  for (let index = 0; index < count; index++) {
    const at = index * 48;
    const pc = view.getUint32(at, true);
    const gas = view.getBigUint64(at + 4, true);
    const opcode = view.getUint8(at + 12);
    const height = view.getUint16(at + 14, true);
    const top = new Uint8Array(api.memory.buffer, api.evm_trace_ptr() + at + 16, 32);
    const row = document.createElement("tr");
    for (const value of [index, pc, opcodeName(opcode), gas, height,
      height ? compactWord(top) : "—"]) {
      const cell = document.createElement("td");
      cell.textContent = String(value);
      row.append(cell);
    }
    body.append(row);
  }
}

function run() {
  try {
    const code = bytes($("#code").value);
    const calldata = bytes($("#calldata").value);
    if (code.length > 65536 || calldata.length > 65536) throw new RangeError("Code and calldata are capped at 64 KiB each.");
    const linear = memory();
    linear.set(code, api.evm_code_ptr());
    linear.set(calldata, api.evm_calldata_ptr());
    const environment = api.evm_environment_ptr();
    for (const [index, [name]] of environmentFields.entries()) linear.set(word($(`#env-${name}`).value), environment + index * 32);
    const exit = api.evm_run(code.length, calldata.length, BigInt($("#gas").value), 100000);
    const output = new Uint8Array(api.memory.buffer, api.evm_output_ptr(), api.evm_output_len());
    const stack = new Uint8Array(api.memory.buffer, api.evm_stack_ptr(), api.evm_stack_len() * 32);
    $("#exit").textContent = exits[exit] || `Unknown ${exit}`;
    $("#exit").style.color = exit <= 1 ? "var(--lime)" : exit === 2 ? "var(--amber)" : "var(--red)";
    $("#gas-left").textContent = api.evm_gas_left().toLocaleString();
    $("#steps").textContent = api.evm_trace_len().toLocaleString();
    $("#output").textContent = output.length ? hex(output) : "0x";
    try { $("#output-text").textContent = output.length ? `UTF-8: ${decoder.decode(output)}` : ""; }
    catch { $("#output-text").textContent = ""; }
    $("#stack").textContent = "";
    for (let at = 0; at < stack.length; at += 32) {
      const item = document.createElement("li"); item.textContent = compactWord(stack.slice(at, at + 32)); $("#stack").append(item);
    }
    renderTrace(api.evm_trace_len());
    $("#trace-note").textContent = `${api.evm_trace_len()} recorded instructions · trace capped at 4,096`;
    $("#runtime-status").textContent = "Executed entirely inside WebAssembly.";
  } catch (error) {
    $("#runtime-status").textContent = error.message;
    $("#runtime-status").style.color = "var(--red)";
  }
}

$("#run").addEventListener("click", run);
$("#reset-storage").addEventListener("click", () => {
  api.evm_reset_storage();
  $("#runtime-status").textContent = "Persistent and transient storage cleared.";
});
$("#runtime-status").textContent = "Machine ready.";
run();
