// TODO: Add a date input that opens the version effective on the selected date, including a no-effective-text result.
// TODO: Allow two preserved versions to be selected for an article-by-article comparison.

// History anchors remain usable without JavaScript; this selector adds convenient navigation.
const versionSelect = document.querySelector("#law-version-select");

if (versionSelect) {
  versionSelect.addEventListener("change", function () {
    window.location.assign(versionSelect.value);
  });
}
