const comparisonForm = document.querySelector("#law-comparison-form");

if (comparisonForm) {
  const beforeSelect = document.querySelector("#compare-before");
  const afterSelect = document.querySelector("#compare-after");
  const comparisonStatus = document.querySelector("#comparison-status");
  const comparisonResults = document.querySelector("#comparison-results");
  comparisonForm.hidden = false;

  async function loadArticles(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Version file unavailable");
    const document = new DOMParser().parseFromString(await response.text(), "text/html");
    const article = document.querySelector("main > article");
    if (!article) throw new Error("Version text unavailable");
    const sections = new Map();
    let current = { title: "Introductory text", lines: [] };
    sections.set("__introduction", current);
    Array.from(article.children).forEach(function (element) {
      if (element.matches("h2[id]")) {
        if (sections.has(element.id)) throw new Error("Duplicate article identifier");
        current = { title: element.textContent.trim(), lines: [] };
        sections.set(element.id, current);
      } else {
        current.lines.push(element.textContent.trim());
      }
    });
    if (!sections.get("__introduction").lines.join("").trim()) sections.delete("__introduction");
    return sections;
  }

  function clearComparison() {
    comparisonResults.replaceChildren();
    comparisonResults.hidden = true;
    comparisonStatus.textContent = "";
  }
  beforeSelect.addEventListener("change", clearComparison);
  afterSelect.addEventListener("change", clearComparison);

  comparisonForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    clearComparison();
    const beforeDate = beforeSelect.selectedOptions[0].dataset.effective;
    const afterDate = afterSelect.selectedOptions[0].dataset.effective;
    if (beforeDate >= afterDate) {
      comparisonStatus.textContent = "Choose two different versions with the earlier date first.";
      return;
    }
    const controls = comparisonForm.querySelectorAll("select, button");
    controls.forEach(function (control) { control.disabled = true; });
    comparisonStatus.textContent = "Loading text versions...";
    try {
      const texts = await Promise.all([loadArticles(beforeSelect.value), loadArticles(afterSelect.value)]);
      const before = texts[0];
      const after = texts[1];
      const identifiers = new Set([...before.keys(), ...after.keys()]);
      let changes = 0;
      identifiers.forEach(function (id) {
        const left = before.get(id);
        const right = after.get(id);
        // Ignore whitespace differences introduced by Markdown rendering.
        const wording = function (section) {
          return section ? (section.title + " " + section.lines.join(" ")).replace(/\s+/g, " ").trim() : "";
        };
        const state = !left ? "Added" : !right ? "Removed" : wording(left) === wording(right) ? "Unchanged" : "Changed";
        if (state !== "Unchanged") changes++;
        const row = document.createElement("section");
        row.className = "comparison-row";
        const heading = document.createElement("h4");
        heading.textContent = (right || left).title + " - " + state;
        row.append(heading);
        const columns = document.createElement("div");
        columns.className = "comparison-columns";
        [left, right].forEach(function (section, index) {
          const column = document.createElement("div");
          const label = document.createElement("h5");
          label.textContent = index === 0 ? beforeDate : afterDate;
          const text = document.createElement("p");
          // Text-only output avoids importing scripts, IDs or interactive markup from the exports.
          text.textContent = section ? section.title + "\n\n" + section.lines.join("\n\n") : "Not present in this version.";
          column.append(label, text);
          columns.append(column);
        });
        row.append(columns);
        comparisonResults.append(row);
      });
      comparisonResults.hidden = false;
      comparisonStatus.textContent = changes + " changed, added or removed sections out of " + identifiers.size + ".";
    } catch (error) {
      comparisonResults.replaceChildren();
      comparisonStatus.textContent = "Comparison is unavailable. You can still open either version from the history links.";
    } finally {
      controls.forEach(function (control) { control.disabled = false; });
    }
  });
}
