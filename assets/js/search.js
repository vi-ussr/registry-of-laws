const form = document.querySelector("#search-form");
const input = document.querySelector("#search-input");
const status = document.querySelector("#search-status");
const entries = document.querySelectorAll(".register-entry");

let documents = [];

function filterDocuments() {
  const query = input.value.trim().toLowerCase();
  const words = query ? query.split(/\s+/) : [];

  const matchingDocuments = documents.filter(function (document) {
    const searchableText = [
      document.title,
      document.number,
      document.type,
      document.authority,
      document.subject,
      document.text
    ].join(" ").toLowerCase();

    return words.every(function (word) {
      return searchableText.includes(word);
    });
  });

  const matchingIds = new Set(
    matchingDocuments.map(function (document) {
      return document.id;
    })
  );

  let visibleCount = 0;

  entries.forEach(function (entry) {
    const matches = matchingIds.has(entry.dataset.documentId);

    entry.hidden = !matches;

    if (matches) {
      visibleCount++;
    }
  });

  status.textContent = query
    ? visibleCount + " matching documents"
    : "Showing all " + visibleCount + " documents";
}

form.addEventListener("submit", function (event) {
  event.preventDefault();
  filterDocuments();
});

input.addEventListener("input", filterDocuments);

document.querySelector("#clear-search").addEventListener("click", function () {
  input.value = "";
  filterDocuments();
  input.focus();
});

async function loadSearch() {
  try {
    const response = await fetch(form.dataset.indexUrl);

    if (!response.ok) {
      throw new Error("Search data could not be loaded.");
    }

    documents = await response.json();

    if (!Array.isArray(documents)) {
      throw new Error("Invalid search data.");
    }

    form.hidden = false;
  } catch (error) {
    status.textContent = "Search is unavailable. You can still browse the register.";
    console.error(error);
  }
}

loadSearch();