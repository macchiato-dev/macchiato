const lists = [...document.querySelectorAll('.task-list')];
const search = document.querySelector('#search');
const total = document.querySelector('#task-total');
const modal = document.querySelector('#modal');
const form = document.querySelector('#task-form');
const clock = document.querySelector('#clock');

let tasks = [
  { id: 'GH-017', title: 'Map the undocumented API surface', owner: 'mira', status: 'backlog', priority: 'green' },
  { id: 'GH-018', title: 'Refactor auth middleware', owner: 'kai', status: 'backlog', priority: 'amber' },
  { id: 'GH-019', title: 'Build telemetry dashboard', owner: 'nova', status: 'progress', priority: 'green' },
  { id: 'GH-020', title: 'Write migration playbook', owner: 'mira', status: 'progress', priority: 'green' },
  { id: 'GH-021', title: 'Threat model edge worker', owner: 'kai', status: 'review', priority: 'amber' },
  { id: 'GH-022', title: 'Ship v0.7.3 to production', owner: 'nova', status: 'done', priority: 'green' },
];
let draggedId = null;

function render() {
  const query = search.value.trim().toLowerCase();
  lists.forEach((list) => {
    const status = list.dataset.list;
    const visible = tasks.filter((task) => task.status === status && (!query || `${task.title} ${task.owner} ${task.id}`.toLowerCase().includes(query)));
    list.innerHTML = visible.length ? visible.map(card).join('') : '<div class="empty">// NO PAYLOADS FOUND</div>';
    document.querySelector(`[data-count="${status}"]`).textContent = String(tasks.filter((task) => task.status === status).length).padStart(2, '0');
  });
  total.textContent = String(tasks.length).padStart(2, '0');
  document.querySelectorAll('.task').forEach((task) => {
    task.addEventListener('dragstart', () => { draggedId = task.dataset.id; task.style.opacity = '.45'; });
    task.addEventListener('dragend', () => { draggedId = null; task.style.opacity = ''; });
  });
}

function card(task) {
  const priority = task.priority === 'amber' ? '◆ BLOCKED' : '● ACTIVE';
  return `<div class="task" draggable="true" data-id="${task.id}"><div class="task-top"><span class="task-id">${task.id}</span><span class="priority ${task.priority}">${priority}</span></div><h3>${escapeHtml(task.title)}</h3><div class="task-bottom"><span>OWNER // <span class="avatar">${escapeHtml(task.owner)}</span></span><span>↕ MOVE</span></div></div>`;
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function openModal() { modal.hidden = false; form.title.focus(); }
function closeModal() { modal.hidden = true; form.reset(); }

document.querySelector('#add-task').addEventListener('click', openModal);
document.querySelector('#close-modal').addEventListener('click', closeModal);
modal.addEventListener('click', (event) => { if (event.target === modal) closeModal(); });
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(form);
  tasks.push({ id: `GH-${String(23 + tasks.length - 6).padStart(3, '0')}`, title: data.get('title'), owner: data.get('owner') || 'operator', priority: data.get('priority'), status: 'backlog' });
  closeModal(); render();
});
search.addEventListener('input', render);
lists.forEach((list) => {
  list.addEventListener('dragover', (event) => { event.preventDefault(); list.classList.add('drag-over'); });
  list.addEventListener('dragleave', () => list.classList.remove('drag-over'));
  list.addEventListener('drop', (event) => {
    event.preventDefault();
    list.classList.remove('drag-over');
    const task = tasks.find((item) => item.id === draggedId);
    if (task) { task.status = list.dataset.list; render(); }
  });
});

function tick() { clock.textContent = new Date().toLocaleTimeString('en-GB', { hour12: false }); }
tick();
setInterval(tick, 1000);
render();
