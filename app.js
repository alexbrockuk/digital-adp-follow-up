const STORE_KEY = "adp_follow_up_tool_v2";
const PERSON_ORDER = ["Alex", "Amit", "Ayesha", "Cliff", "Ed", "Stef"];
const SECTION_ORDER = [
  { key: "account_lead", title: "Accounts you lead" },
  { key: "service_lead", title: "Services you lead" },
  { key: "self_led", title: "You lead both" }
];
const state = loadState();

const refs = {
  tabButtons: document.getElementById("tab-buttons"),
  panels: document.getElementById("app-panels"),
  exportButton: document.getElementById("export-progress"),
  clearButton: document.getElementById("clear-progress"),
  errorBanner: document.getElementById("app-error"),
  dataProxy: document.getElementById("data-proxy")
};

let tasks = [];
let people = [];
let opportunities = [];
let currentTabId = "master";

document.addEventListener("DOMContentLoaded", init);

async function init() {
  try {
    tasks = await loadTasks();
    people = getPeople(tasks);
    opportunities = buildOpportunities(tasks);
    renderApp();
    bindEvents();
    showTab(currentTabId);
    updateProgressViews();
  } catch (error) {
    showError(error);
  }
}

async function loadTasks() {
  if (window.location.protocol === "file:") {
    try {
      return normalizeTasks(loadTasksFromEmbeddedData());
    } catch (embeddedError) {
      try {
        return normalizeTasks(await loadTasksFromFrame());
      } catch (frameError) {
        return normalizeTasks(await loadTasksFromFetch());
      }
    }
  }

  try {
    return normalizeTasks(await loadTasksFromFetch());
  } catch (fetchError) {
    try {
      return normalizeTasks(loadTasksFromEmbeddedData());
    } catch (embeddedError) {
      return normalizeTasks(await loadTasksFromFrame());
    }
  }
}

function loadTasksFromEmbeddedData() {
  if (Array.isArray(window.ADPOpportunitiesData) && window.ADPOpportunitiesData.length) {
    return window.ADPOpportunitiesData;
  }

  throw new Error("The embedded local data fallback was not found.");
}

async function loadTasksFromFetch() {
  const response = await fetch("data/opportunities.json", { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Could not load opportunities.json (${response.status})`);
  }

  return response.json();
}

function loadTasksFromFrame() {
  return new Promise((resolve, reject) => {
    const frame = refs.dataProxy;

    const cleanup = () => {
      frame.removeEventListener("load", handleLoad);
      frame.removeEventListener("error", handleError);
    };

    const handleLoad = () => {
      cleanup();

      try {
        const frameDocument = frame.contentDocument;
        const rawText = frameDocument && frameDocument.body
          ? frameDocument.body.textContent.trim()
          : frameDocument && frameDocument.documentElement
            ? frameDocument.documentElement.textContent.trim()
            : "";

        if (!rawText) {
          throw new Error("The local JSON file was empty.");
        }

        resolve(JSON.parse(rawText));
      } catch (error) {
        reject(error);
      }
    };

    const handleError = () => {
      cleanup();
      reject(new Error("Could not load the local opportunities data."));
    };

    frame.addEventListener("load", handleLoad);
    frame.addEventListener("error", handleError);
    frame.src = "data/opportunities.json";
  });
}

function normalizeTasks(rawTasks) {
  if (!Array.isArray(rawTasks)) {
    throw new Error("The opportunities data must be an array of task objects.");
  }

  const requiredKeys = [
    "id",
    "opportunityId",
    "account",
    "accountLead",
    "service",
    "serviceLead",
    "taskOwner",
    "taskType",
    "actionText"
  ];

  return rawTasks.map((task, index) => {
    const normalizedTask = {};

    requiredKeys.forEach((key) => {
      if (!task[key]) {
        throw new Error(`Task ${index + 1} is missing required field "${key}".`);
      }

      normalizedTask[key] = String(task[key]);
    });

    return normalizedTask;
  });
}

function getPeople(taskList) {
  const uniquePeople = [...new Set(taskList.map((task) => task.taskOwner))];
  const orderedPeople = PERSON_ORDER.filter((person) => uniquePeople.includes(person));
  const remainingPeople = uniquePeople
    .filter((person) => !orderedPeople.includes(person))
    .sort((left, right) => left.localeCompare(right));

  return [...orderedPeople, ...remainingPeople];
}

function buildOpportunities(taskList) {
  const byOpportunity = new Map();

  taskList.forEach((task) => {
    if (!byOpportunity.has(task.opportunityId)) {
      byOpportunity.set(task.opportunityId, {
        id: task.opportunityId,
        account: task.account,
        accountLead: task.accountLead,
        service: task.service,
        serviceLead: task.serviceLead,
        tasks: []
      });
    }

    byOpportunity.get(task.opportunityId).tasks.push(task);
  });

  return [...byOpportunity.values()];
}

function renderApp() {
  refs.tabButtons.innerHTML = renderTabs();
  refs.panels.innerHTML = [renderMasterPanel(), ...people.map(renderPersonPanel)].join("");
}

function renderTabs() {
  const tabs = [{ id: "master", label: "Master" }, ...people.map((person) => ({
    id: getPersonTabId(person),
    label: person
  }))];

  return tabs.map((tab) => `
    <button
      id="tab-${tab.id}"
      class="tabbtn"
      type="button"
      role="tab"
      aria-controls="${tab.id}"
      aria-selected="false"
      tabindex="-1"
      data-tab="${tab.id}"
    >
      ${escapeHtml(tab.label)}
    </button>
  `).join("");
}

function renderMasterPanel() {
  return `
    <section id="master" class="panel" role="tabpanel" aria-labelledby="tab-master">
      <div class="panel-heading">
        <div>
          <h2>Master opportunity list</h2>
          <p class="hint">Reference list of all opportunities marked Y in the new service columns only.</p>
        </div>
        <div class="progress-cluster">
          <div class="kpi" id="team-kpi">0 of 0 complete</div>
          <div class="progress-bar" aria-hidden="true">
            <div id="team-progress-bar" class="progress-fill"></div>
          </div>
          <p id="team-progress-copy" class="small">0 opportunities fully complete.</p>
        </div>
      </div>

      <div class="summary-grid" id="person-summary-grid">
        ${people.map((person) => `
          <article class="summary-card" data-person-summary="${escapeAttribute(person)}">
            <h3>${escapeHtml(person)}</h3>
            <p class="small" data-person-summary-copy="${escapeAttribute(person)}">0 of 0 complete</p>
            <div class="progress-bar compact" aria-hidden="true">
              <div class="progress-fill" data-person-summary-bar="${escapeAttribute(person)}"></div>
            </div>
          </article>
        `).join("")}
      </div>

      <div class="section-copy">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Account</th>
                <th>Account lead</th>
                <th>Service opportunity</th>
                <th>Service lead</th>
                <th>Progress</th>
                <th>Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${opportunities.map(renderOpportunityRow).join("")}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `;
}

function renderOpportunityRow(opportunity) {
  return `
    <tr data-opportunity-row="${escapeAttribute(opportunity.id)}">
      <td>${escapeHtml(opportunity.account)}</td>
      <td>${escapeHtml(opportunity.accountLead)}</td>
      <td>${escapeHtml(opportunity.service)}</td>
      <td>${escapeHtml(opportunity.serviceLead)}</td>
      <td>
        <div class="table-progress-copy" data-opportunity-progress-copy="${escapeAttribute(opportunity.id)}">0 of 0 complete</div>
        <div class="progress-bar compact" aria-hidden="true">
          <div class="progress-fill" data-opportunity-progress-bar="${escapeAttribute(opportunity.id)}"></div>
        </div>
      </td>
      <td>
        <span class="status-pill not-started" data-opportunity-status="${escapeAttribute(opportunity.id)}">Not started</span>
      </td>
      <td class="notes-summary" data-opportunity-notes="${escapeAttribute(opportunity.id)}">No notes yet.</td>
    </tr>
  `;
}

function renderPersonPanel(person) {
  const personTasks = tasks.filter((task) => task.taskOwner === person);

  return `
    <section
      id="${getPersonTabId(person)}"
      class="panel"
      role="tabpanel"
      aria-labelledby="tab-${getPersonTabId(person)}"
      data-person-panel="true"
      data-person="${escapeAttribute(person)}"
    >
      <div class="panel-heading">
        <div>
          <h2>${escapeHtml(person)}</h2>
          <p class="hint">Tick actions as you complete them. Progress is saved locally in this browser.</p>
        </div>
        <div class="progress-cluster">
          <div class="kpi" data-person-kpi="${escapeAttribute(person)}">0 of ${personTasks.length} complete</div>
          <div class="progress-bar" aria-hidden="true">
            <div class="progress-fill" data-person-progress-bar="${escapeAttribute(person)}"></div>
          </div>
          <p class="small" data-person-progress-copy="${escapeAttribute(person)}">0% complete</p>
        </div>
      </div>

      ${SECTION_ORDER.map((section) => renderTaskSection(section, personTasks)).join("")}
    </section>
  `;
}

function renderTaskSection(section, personTasks) {
  const sectionTasks = personTasks.filter((task) => task.taskType === section.key);

  return `
    <section>
      <h3>${escapeHtml(section.title)}</h3>
      ${sectionTasks.length
        ? sectionTasks.map(renderTaskCard).join("")
        : '<p class="empty">No actions in this section.</p>'}
    </section>
  `;
}

function renderTaskCard(task) {
  const isDone = getTaskState(task.id).done;
  const note = getTaskState(task.id).note;
  const checkboxId = `chk-${task.id}`;
  const noteId = `note-${task.id}`;

  return `
    <div class="task ${isDone ? "done" : ""}" data-task-card="${escapeAttribute(task.id)}">
      <div class="task-row">
        <input
          type="checkbox"
          id="${escapeAttribute(checkboxId)}"
          data-task-checkbox="${escapeAttribute(task.id)}"
          ${isDone ? "checked" : ""}
        >
        <label for="${escapeAttribute(checkboxId)}">${escapeHtml(task.actionText)}</label>
      </div>
      <label class="visually-hidden" for="${escapeAttribute(noteId)}">Optional notes for ${escapeHtml(task.actionText)}</label>
      <textarea
        id="${escapeAttribute(noteId)}"
        class="note"
        data-task-note="${escapeAttribute(task.id)}"
        placeholder="Optional notes"
      >${escapeHtml(note)}</textarea>
    </div>
  `;
}

function bindEvents() {
  refs.tabButtons.addEventListener("click", handleTabClick);
  refs.panels.addEventListener("change", handleTaskToggle);
  refs.panels.addEventListener("input", handleTaskNote);
  refs.exportButton.addEventListener("click", exportProgress);
  refs.clearButton.addEventListener("click", clearProgress);
}

function handleTabClick(event) {
  const button = event.target.closest("[data-tab]");

  if (!button) {
    return;
  }

  showTab(button.dataset.tab);
}

function handleTaskToggle(event) {
  const checkbox = event.target.closest("[data-task-checkbox]");

  if (!checkbox) {
    return;
  }

  const taskId = checkbox.dataset.taskCheckbox;
  state[taskId] = {
    ...getTaskState(taskId),
    done: checkbox.checked
  };

  const taskCard = refs.panels.querySelector(`[data-task-card="${cssEscape(taskId)}"]`);
  if (taskCard) {
    taskCard.classList.toggle("done", checkbox.checked);
  }

  saveState();
  updateProgressViews();
}

function handleTaskNote(event) {
  const noteField = event.target.closest("[data-task-note]");

  if (!noteField) {
    return;
  }

  const taskId = noteField.dataset.taskNote;
  state[taskId] = {
    ...getTaskState(taskId),
    note: noteField.value
  };

  saveState();
  updateProgressViews();
}

function showTab(tabId) {
  currentTabId = tabId;

  refs.panels.querySelectorAll(".panel").forEach((panel) => {
    const isActive = panel.id === tabId;
    panel.classList.toggle("active", isActive);
    panel.hidden = !isActive;
  });

  refs.tabButtons.querySelectorAll("[data-tab]").forEach((button) => {
    const isActive = button.dataset.tab === tabId;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
    button.tabIndex = isActive ? 0 : -1;
  });
}

function updateProgressViews() {
  updateTeamSummary();
  updatePersonSummaries();
  updateOpportunityRows();
}

function updateTeamSummary() {
  const completeCount = tasks.filter((task) => getTaskState(task.id).done).length;
  const percent = getPercent(completeCount, tasks.length);
  const completeOpportunities = opportunities.filter((opportunity) => {
    const doneCount = opportunity.tasks.filter((task) => getTaskState(task.id).done).length;
    return doneCount === opportunity.tasks.length;
  }).length;

  const teamKpi = document.getElementById("team-kpi");
  const teamBar = document.getElementById("team-progress-bar");
  const teamCopy = document.getElementById("team-progress-copy");

  teamKpi.textContent = `${completeCount} of ${tasks.length} complete`;
  teamBar.style.width = `${percent}%`;
  teamCopy.textContent = `${completeOpportunities} of ${opportunities.length} opportunities fully complete.`;
}

function updatePersonSummaries() {
  people.forEach((person) => {
    const personTasks = tasks.filter((task) => task.taskOwner === person);
    const completeCount = personTasks.filter((task) => getTaskState(task.id).done).length;
    const percent = getPercent(completeCount, personTasks.length);

    const personKpi = refs.panels.querySelector(`[data-person-kpi="${cssEscape(person)}"]`);
    const personBar = refs.panels.querySelector(`[data-person-progress-bar="${cssEscape(person)}"]`);
    const personCopy = refs.panels.querySelector(`[data-person-progress-copy="${cssEscape(person)}"]`);
    const masterCopy = refs.panels.querySelector(`[data-person-summary-copy="${cssEscape(person)}"]`);
    const masterBar = refs.panels.querySelector(`[data-person-summary-bar="${cssEscape(person)}"]`);

    if (personKpi) {
      personKpi.textContent = `${completeCount} of ${personTasks.length} complete`;
    }

    if (personBar) {
      personBar.style.width = `${percent}%`;
    }

    if (personCopy) {
      personCopy.textContent = `${percent}% complete`;
    }

    if (masterCopy) {
      masterCopy.textContent = `${completeCount} of ${personTasks.length} complete`;
    }

    if (masterBar) {
      masterBar.style.width = `${percent}%`;
    }
  });
}

function updateOpportunityRows() {
  opportunities.forEach((opportunity) => {
    const completeCount = opportunity.tasks.filter((task) => getTaskState(task.id).done).length;
    const percent = getPercent(completeCount, opportunity.tasks.length);
    const statusText = getStatusText(completeCount, opportunity.tasks.length);
    const notes = opportunity.tasks
      .map((task) => {
        const note = getTaskState(task.id).note.trim();
        return note ? `${task.taskOwner}: ${note}` : "";
      })
      .filter(Boolean);

    const progressCopy = refs.panels.querySelector(`[data-opportunity-progress-copy="${cssEscape(opportunity.id)}"]`);
    const progressBar = refs.panels.querySelector(`[data-opportunity-progress-bar="${cssEscape(opportunity.id)}"]`);
    const status = refs.panels.querySelector(`[data-opportunity-status="${cssEscape(opportunity.id)}"]`);
    const notesCell = refs.panels.querySelector(`[data-opportunity-notes="${cssEscape(opportunity.id)}"]`);

    if (progressCopy) {
      progressCopy.textContent = `${completeCount} of ${opportunity.tasks.length} complete`;
    }

    if (progressBar) {
      progressBar.style.width = `${percent}%`;
    }

    if (status) {
      status.textContent = statusText;
      status.className = `status-pill ${getStatusClass(completeCount, opportunity.tasks.length)}`;
    }

    if (notesCell) {
      notesCell.textContent = notes.length ? notes.join(" | ") : "No notes yet.";
    }
  });
}

function exportProgress() {
  const rows = [[
    "Task ID",
    "Opportunity ID",
    "Task owner",
    "Account",
    "Account lead",
    "Service",
    "Service lead",
    "Task type",
    "Action text",
    "Completion status",
    "Notes"
  ]];

  tasks.forEach((task) => {
    const taskState = getTaskState(task.id);

    rows.push([
      task.id,
      task.opportunityId,
      task.taskOwner,
      task.account,
      task.accountLead,
      task.service,
      task.serviceLead,
      task.taskType,
      task.actionText,
      taskState.done ? "Complete" : "Not complete",
      taskState.note
    ]);
  });

  const csvText = rows
    .map((row) => row.map((value) => `"${String(value).replace(/"/g, "\"\"")}"`).join(","))
    .join("\n");

  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
  const downloadLink = document.createElement("a");
  downloadLink.href = URL.createObjectURL(blob);
  downloadLink.download = "adp-follow-up-progress.csv";
  downloadLink.click();
  URL.revokeObjectURL(downloadLink.href);
}

function clearProgress() {
  if (!window.confirm("Clear all saved checkboxes and notes in this browser?")) {
    return;
  }

  localStorage.removeItem(STORE_KEY);
  Object.keys(state).forEach((key) => delete state[key]);

  refs.panels.querySelectorAll("[data-task-checkbox]").forEach((checkbox) => {
    checkbox.checked = false;
  });

  refs.panels.querySelectorAll("[data-task-note]").forEach((noteField) => {
    noteField.value = "";
  });

  refs.panels.querySelectorAll("[data-task-card]").forEach((taskCard) => {
    taskCard.classList.remove("done");
  });

  updateProgressViews();
}

function getTaskState(taskId) {
  return {
    done: Boolean(state[taskId] && state[taskId].done),
    note: state[taskId] && typeof state[taskId].note === "string" ? state[taskId].note : ""
  };
}

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
  } catch (error) {
    return {};
  }
}

function saveState() {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}

function getPersonTabId(person) {
  return `person-${person.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function getPercent(numerator, denominator) {
  if (!denominator) {
    return 0;
  }

  return Math.round((numerator / denominator) * 100);
}

function getStatusText(completeCount, totalCount) {
  if (completeCount === 0) {
    return "Not started";
  }

  if (completeCount === totalCount) {
    return "Complete";
  }

  return "In progress";
}

function getStatusClass(completeCount, totalCount) {
  if (completeCount === 0) {
    return "not-started";
  }

  if (completeCount === totalCount) {
    return "complete";
  }

  return "in-progress";
}

function showError(error) {
  refs.errorBanner.hidden = false;
  refs.errorBanner.textContent = `The app could not load the opportunity data. ${error.message}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function cssEscape(value) {
  if (window.CSS && typeof window.CSS.escape === "function") {
    return window.CSS.escape(value);
  }

  return String(value).replace(/"/g, "\\\"");
}
