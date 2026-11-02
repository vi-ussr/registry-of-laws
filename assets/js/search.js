// Loaded only by index.html; its control IDs are the contract with this script.
// TODO: Add a search-scope control for title, document text, or all searchable fields.
// TODO: Filter by legal status once the build exports effective/repealed status in search.json.
const form = document.querySelector("#search-form");
const input = document.querySelector("#search-input");
const status = document.querySelector("#search-status");
const entries = document.querySelectorAll(".register-entry");

const typeFilter = document.querySelector("#type-filter");
const authorityFilter = document.querySelector("#authority-filter");

const phraseFilter = document.querySelector("#phrase-filter");
const anyFilter = document.querySelector("#any-filter");
const excludeFilter = document.querySelector("#exclude-filter");

const publishedFrom = document.querySelector("#published-from");
const publishedTo = document.querySelector("#published-to");

let documents = [];

/** Apply all active filters to the server-rendered entries without replacing their links. */
function filterDocuments() {
  const fromDate = publishedFrom.value;
  const toDate = publishedTo.value;

  // Preserve the previous results while the reader corrects an invalid range.
  if (fromDate && toDate && fromDate > toDate) {
    status.textContent =
      "The start date must not follow the end date. Results are unchanged.";
    return;
  }

  const query = input.value.trim().toLowerCase();
  const words = query ? query.split(/\s+/) : [];

  const phrase = phraseFilter.value.trim().toLowerCase();

  const anyText = anyFilter.value.trim().toLowerCase();
  const anyWords = anyText ? anyText.split(/\s+/) : [];

  const excludeText = excludeFilter.value.trim().toLowerCase();
  const excludedWords = excludeText ? excludeText.split(/\s+/) : [];

  const matchingDocuments = documents.filter(function (document) {
    const searchableText = [
      document.title,
      document.number,
      document.type,
      document.authority,
      document.subject,
      document.text
    ].join(" ").toLowerCase();

    // Matching is case-insensitive substring matching, not whole-word or linguistic search.
    const matchesWords = words.every(function (word) {
      return searchableText.includes(word);
    });

    const matchesType =
      typeFilter.value === "" ||
      document.type === typeFilter.value;

    const matchesAuthority =
      authorityFilter.value === "" ||
      document.authority === authorityFilter.value;

    const matchesPhrase =
      phrase === "" ||
      searchableText.includes(phrase);

    const matchesAny =
      anyWords.length === 0 ||
      anyWords.some(function (word) {
        return searchableText.includes(word);
      });

    const matchesExclusions =
      excludedWords.every(function (word) {
        return !searchableText.includes(word);
      });

    // Quoted YYYY-MM-DD metadata and date-input values sort chronologically as strings.
    const matchesPublication =
      (!fromDate || document.published >= fromDate) &&
      (!toDate || document.published <= toDate);

    return matchesWords &&
      matchesType &&
      matchesAuthority &&
      matchesPhrase &&
      matchesAny &&
      matchesExclusions &&
      matchesPublication;
  });

  // Join results to HTML by document_id so titles can change without breaking filtering.
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
    authorityFilter.value !== "" ||
    phrase !== "" ||
    anyWords.length > 0 ||
    excludedWords.length > 0 ||
    fromDate !== "" ||
    toDate !== "";

  status.textContent = hasFilters
    ? visibleCount + " matching documents"
    : "Showing all " + visibleCount + " documents";
}

publishedFrom.addEventListener("change", filterDocuments);
publishedTo.addEventListener("change", filterDocuments);

phraseFilter.addEventListener("input", filterDocuments);
anyFilter.addEventListener("input", filterDocuments);
excludeFilter.addEventListener("input", filterDocuments);

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
  phraseFilter.value = "";
  anyFilter.value = "";
  excludeFilter.value = "";
  publishedFrom.value = "";
  publishedTo.value = "";
  filterDocuments();
  input.focus();
});

/** Populate each dropdown once from the catalogue, omitting duplicates and empty values. */
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

/** Reveal search only after its data is ready; the static register remains usable on failure. */
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