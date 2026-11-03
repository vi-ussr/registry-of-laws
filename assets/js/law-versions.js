// TODO: Allow two preserved versions to be selected for an article-by-article comparison.

// History anchors remain usable without JavaScript; these controls add convenient navigation.
const versionSelect = document.querySelector("#law-version-select");
const dateForm = document.querySelector("#law-date-form");

if (versionSelect) {
  versionSelect.addEventListener("change", function () {
    window.location.assign(versionSelect.value);
  });
}

if (versionSelect && dateForm) {
  const dateInput = document.querySelector("#law-version-date");
  const dateStatus = document.querySelector("#law-date-status");
  dateForm.hidden = false;

  dateForm.addEventListener("submit", function (event) {
    event.preventDefault();
    if (!dateForm.reportValidity()) return;

    // Quoted ISO dates are validated at build time and sort in calendar order.
    // Choose the latest start date that does not come after the requested day.
    let selectedVersion = null;
    for (const option of versionSelect.options) {
      const effective = option.dataset.effective;
      if (effective <= dateInput.value &&
          (!selectedVersion || effective > selectedVersion.dataset.effective)) {
        selectedVersion = option;
      }
    }

    if (!selectedVersion) {
      dateStatus.textContent = "No text was effective on the selected date.";
      return;
    }

    // Repeal handling is a separate milestone; this currently selects complete text versions.
    window.location.assign(selectedVersion.value);
  });

  dateInput.addEventListener("input", function () {
    dateStatus.textContent = "";
  });
}
