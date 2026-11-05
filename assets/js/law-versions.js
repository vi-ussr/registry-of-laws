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
  const archiveLink = document.querySelector("#law-date-archive");
  const repealDate = dateForm.dataset.repealed;
  dateForm.hidden = false;

  dateForm.addEventListener("submit", function (event) {
    event.preventDefault();
    if (!dateForm.reportValidity()) return;
    dateStatus.textContent = "";
    archiveLink.hidden = true;

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

    // Keep the notice visible instead of silently opening wording that no longer applies.
    if (repealDate && dateInput.value >= repealDate) {
      dateStatus.textContent = "This law was repealed from " + repealDate + ". No text was in force on the selected date.";
      archiveLink.href = selectedVersion.value;
      archiveLink.hidden = false;
      return;
    }

    window.location.assign(selectedVersion.value);
  });

  dateInput.addEventListener("input", function () {
    archiveLink.hidden = true;
    dateStatus.textContent = "";
  });
}
