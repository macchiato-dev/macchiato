const count = document.getElementById("count");
const activity = document.getElementById("activity");
let value = 0;

document.getElementById("increment").addEventListener("click", () => {
  value += 1;
  count.textContent = String(value);
  activity.textContent = value === 1 ? "Added once." : `Added ${value} times.`;
});

document.getElementById("reset").addEventListener("click", () => {
  value = 0;
  count.textContent = "0";
  activity.textContent = "Reset.";
});
