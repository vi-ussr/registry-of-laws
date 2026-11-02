// Loaded before law-tools.js so citation buttons do not enter the contents link text.
const contents = document.querySelector(".law-contents");
const contentsList = document.querySelector("#law-contents-list");
const articleHeadings = document.querySelectorAll(".law-text h2[id]");

if (contents && contentsList && articleHeadings.length > 0) {
  articleHeadings.forEach(function (heading) {
    const item = document.createElement("li");
    const link = document.createElement("a");

    link.setAttribute("href", "#" + encodeURIComponent(heading.id));
    link.textContent = heading.textContent;
    // Fragment navigation can focus the heading without adding it to the normal Tab order.
    heading.setAttribute("tabindex", "-1");

    item.append(link);
    contentsList.append(item);
  });

  // Leave empty navigation hidden when there are no article headings.
  contents.hidden = false;
}
