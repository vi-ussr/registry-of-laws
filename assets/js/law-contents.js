const contents = document.querySelector(".law-contents");
const contentsList = document.querySelector("#law-contents-list");
const articleHeadings = document.querySelectorAll(".law-text h2[id]");

if (contents && contentsList && articleHeadings.length > 0) {
  articleHeadings.forEach(function (heading) {
    const item = document.createElement("li");
    const link = document.createElement("a");

    link.setAttribute("href", "#" + encodeURIComponent(heading.id));
    link.textContent = heading.textContent;
    heading.setAttribute("tabindex", "-1");

    item.append(link);
    contentsList.append(item);
  });

  contents.hidden = false;
}
