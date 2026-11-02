// History anchors remain usable without JavaScript; this selector adds convenient navigation.
const versionSelect = document.querySelector("#law-version-select");

if (versionSelect) {
  versionSelect.addEventListener("change", function () {
    window.location.assign(versionSelect.value);
  });
}
