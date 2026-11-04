// No Drive frame is created until the reader explicitly requests a preview.
document.querySelectorAll(".attachment-preview-toggle").forEach(function (button) {
  const panel = document.getElementById(button.getAttribute("aria-controls"));
  if (!panel) return;
  button.hidden = false;

  button.addEventListener("click", function () {
    const opening = panel.hidden;
    if (opening) {
      const frame = document.createElement("iframe");
      frame.src = button.dataset.previewUrl;
      frame.title = "PDF preview: " + button.dataset.previewTitle;
      frame.referrerPolicy = "no-referrer";
      panel.append(frame);
    } else {
      // Removing the frame stops the embedded viewer when it is closed.
      panel.replaceChildren();
    }
    panel.hidden = !opening;
    button.setAttribute("aria-expanded", String(opening));
    button.textContent = opening ? "Hide PDF preview" : "Show PDF preview";
  });
});
