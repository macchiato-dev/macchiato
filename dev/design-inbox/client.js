const drop = document.querySelector("#drop");
const picker = document.querySelector("#picker");
const status = document.querySelector("#status");
let busy = false;
const size = bytes => bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024
  ? `${(bytes / 1024).toFixed(1)} KiB` : `${(bytes / 1024 / 1024).toFixed(1)} MiB`;
function message(text, error = false) {
  status.textContent = text;
  status.classList.toggle("error", error);
}
async function refresh() {
  const response = await fetch("./-/uploads/design");
  if (!response.ok) throw new Error("Could not load received files. Reload to sign in again.");
  const { files: entries } = await response.json();
  const list = document.querySelector("#files");
  list.replaceChildren();
  for (const entry of entries) {
    const row = document.createElement("li");
    row.textContent = entry.name;
    const detail = document.createElement("small");
    detail.textContent = `${size(entry.size)} · ${new Date(entry.uploaded).toLocaleString()}`;
    row.append(detail);
    list.append(row);
  }
  document.querySelector("#empty").hidden = entries.length !== 0;
}
async function upload(files) {
  if (busy || !files.length) return;
  busy = drop.disabled = true;
  let received = 0;
  try {
    for (const file of files) {
      if (file.size > 250 * 1024 * 1024) throw new Error(`${file.name} exceeds 250 MiB.`);
      message(`Uploading ${received + 1} of ${files.length}: ${file.name} (${size(file.size)})…`);
      const response = await fetch(`./-/uploads/design?name=${encodeURIComponent(file.name)}`, {
        method: "POST", body: file,
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || "Upload failed. Reload to sign in again, then retry.");
      }
      received++;
    }
    message(`Received ${received} ${received === 1 ? "file" : "files"}. You can return to the chat.`);
  } catch (error) { message(`${error.message} (${received} received in this upload.)`, true); }
  finally {
    busy = drop.disabled = false;
    picker.value = "";
    await refresh().catch(error => message(error.message, true));
  }
}
drop.addEventListener("click", () => picker.click());
picker.addEventListener("change", () => upload(Array.from(picker.files)));
document.addEventListener("dragover", event => {
  event.preventDefault();
  if (!busy) drop.classList.add("dragging");
});
document.addEventListener("dragleave", event => {
  if (!event.relatedTarget) drop.classList.remove("dragging");
});
document.addEventListener("drop", event => {
  event.preventDefault(); drop.classList.remove("dragging");
  if (Array.from(event.dataTransfer.items).some(item => item.webkitGetAsEntry?.()?.isDirectory)) {
    message("Please ZIP folders before uploading, so their structure is preserved.", true);
    return;
  }
  upload(Array.from(event.dataTransfer.files));
});
refresh().catch(error => message(error.message, true));
