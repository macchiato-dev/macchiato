let notes = [];

globalThis.__notesReceive = function (json) {
  const message = JSON.parse(json);
  if (message.operation === "list") notes = message.value;
  if (message.operation === "create") notes.push(message.value);
  if (message.operation === "update") notes = notes.map((note) => note.id === message.value.id ? message.value : note);
  if (message.operation === "remove") notes = notes.filter((note) => note.id !== message.value.id);
  return JSON.stringify(notes);
};

globalThis.__notesAction = function (json) {
  const action = JSON.parse(json);
  if (action.type === "create") return JSON.stringify({ operation: "create", body: { title: action.title } });
  const note = notes.find((item) => item.id === action.id);
  if (!note) return JSON.stringify({});
  if (action.type === "toggle") return JSON.stringify({ operation: "update", body: { id: note.id, done: !note.done } });
  if (action.type === "rename") return JSON.stringify({ operation: "update", body: { id: note.id, title: action.title } });
  if (action.type === "remove") return JSON.stringify({ operation: "remove", body: { id: note.id } });
  return JSON.stringify({});
};
