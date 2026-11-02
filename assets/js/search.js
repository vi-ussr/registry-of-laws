const form = document.querySelector("#search-form");
const input = document.querySelector("#search-input");
const status = document.querySelector("#search-status");
const entries = document.querySelectorAll(".register-entry");

const typeFilter = document.querySelector("#type-filter");
const authorityFilter = document.querySelector("#authority-filter");

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

    const matchesWords = words.every(function (word) {
      return searchableText.includes(word);
    });

    const matchesType =
      typeFilter.value === "" ||
      document.type === typeFilter.value;

    const matchesAuthority =
      authorityFilter.value === "" ||
      document.authority === authorityFilter.value;

    return matchesWords && matchesType && matchesAuthority;
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

  const hasFilters =
    query !== "" ||
    typeFilter.value !== "" ||
    authorityFilter.value !== "";

  status.textContent = hasFilters
    ? visibleCount + " matching documents"
    : "Showing all " + visibleCount + " documents";
}

typeFilter.addEventListener("change", filterDocuments);
authorityFilter.addEventListener("change", filterDocuments);

form.addEventListener("submit", function (event) {
  event.preventDefault();
  filterDocuments();
});

input.addEventListener("input", filterDocuments);

document.querySelector("#clear-search").addEventListener("click", function () {
  input.value = "";
  typeFilter.value = "";
  authorityFilter.value = "";
  filterDocuments();
  input.focus();
});

function populateFilter(select, values) {
  const uniqueValues = [...new Set(values)]
    .filter(Boolean)
    .sort();

  uniqueValues.forEach(function (value) {
    const option = document.createElement("option");

    option.value = value;
    option.textContent = value;

    select.append(option);
  });
}

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

    populateFilter(
      typeFilter,
      documents.map(function (document) {
        return document.type;
      })
    );

    populateFilter(
      authorityFilter,
      documents.map(function (document) {
        return document.authority;
      })
    );

    form.hidden = false;
  } catch (error) {
    status.textContent = "Search is unavailable. You can still browse the register.";
    console.error(error);
  }
}

loadSearch();