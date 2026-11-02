// Metadata comes from the law layout; no source text is changed by these controls.
// TODO: Load a Google Drive PDF preview only after the reader requests it, retaining an external-open fallback.
const law = document.querySelector(".law");

if (law) {
  const message = document.querySelector("#law-tools-status");
  const fallback = document.querySelector("#law-copy-fallback");
  // The layout supplies a preserved-version URL, even on the moving current-law page.
  const documentUrl = new URL(law.dataset.lawUrl, window.location.origin);
  const citation = law.dataset.lawType + " No. " + law.dataset.lawNumber +
    ", " + law.dataset.lawTitle + ", " + law.dataset.lawAuthority +
    ", effective " + law.dataset.lawEffective + ".";

  /** Copy a reference, or select it for manual copying when clipboard access is unavailable. */
  async function copyReference(text) {
    fallback.hidden = true;

    try {
      await navigator.clipboard.writeText(text);
      message.textContent = "Copied to clipboard.";
    } catch (error) {
      fallback.value = text;
      fallback.hidden = false;
      fallback.focus();
      fallback.select();
      message.textContent = "Automatic copying is unavailable. Copy the selected text manually.";
    }
  }

  const copyLink = document.querySelector("#copy-law-link");
  const copyCitation = document.querySelector("#copy-law-citation");
  const print = document.querySelector("#print-law");

  copyLink.hidden = false;
  copyCitation.hidden = false;
  print.hidden = false;

  copyLink.addEventListener("click", function () {
    copyReference(documentUrl.href);
  });

  copyCitation.addEventListener("click", function () {
    copyReference(citation + " " + documentUrl.href);
  });

  print.addEventListener("click", function () {
    window.print();
  });

  const headings = document.querySelectorAll(".law-text h2[id]");

  headings.forEach(function (heading, index) {
    // Read the title before adding the reference button to keep citations free of the § symbol.
    const articleTitle = heading.textContent.trim();
    const articleUrl = new URL(documentUrl.href);
    articleUrl.hash = heading.id;

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "article-reference-toggle";
    toggle.textContent = "§";
    toggle.setAttribute("aria-label", "Reference for " + articleTitle);
    toggle.setAttribute("aria-expanded", "false");

    const panel = document.createElement("div");
    panel.className = "article-reference";
    panel.id = "article-reference-" + index;
    panel.hidden = true;
    toggle.setAttribute("aria-controls", panel.id);

    const text = document.createElement("p");
    text.textContent = articleTitle + ". " + citation;

    const link = document.createElement("a");
    link.href = articleUrl.href;
    link.textContent = "Open article link";

    const copyArticle = document.createElement("button");
    copyArticle.type = "button";
    copyArticle.textContent = "Copy article link";
    copyArticle.addEventListener("click", function () {
      copyReference(articleUrl.href);
    });

    const citeArticle = document.createElement("button");
    citeArticle.type = "button";
    citeArticle.textContent = "Copy article citation";
    citeArticle.addEventListener("click", function () {
      copyReference(articleTitle + ". " + citation + " " + articleUrl.href);
    });

    function closePanel() {
      panel.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
    }

    const close = document.createElement("button");
    close.type = "button";
    close.textContent = "Close";
    close.addEventListener("click", function () {
      closePanel();
      toggle.focus();
    });

    toggle.addEventListener("click", function () {
      const shouldOpen = panel.hidden;
      // Keep only one reference panel open to avoid clutter in long instruments.
      document.querySelectorAll(".article-reference").forEach(function (item) {
        item.hidden = true;
      });
      document.querySelectorAll(".article-reference-toggle").forEach(function (item) {
        item.setAttribute("aria-expanded", "false");
      });
      panel.hidden = !shouldOpen;
      toggle.setAttribute("aria-expanded", String(shouldOpen));
    });

    panel.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closePanel();
        toggle.focus();
      }
    });

    panel.append(text, link, copyArticle, citeArticle, close);
    heading.append(toggle);
    heading.after(panel);
  });
}
