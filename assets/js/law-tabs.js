// Plain fragment links and visible sections provide the fallback without JavaScript.
const tabNavigation = document.querySelector(".law-tabs");

if (tabNavigation) {
  const tabs = Array.from(tabNavigation.querySelectorAll("a"));
  const panels = tabs.map(function (tab) {
    return document.getElementById(tab.hash.slice(1));
  });

  if (panels.every(Boolean)) {
    tabNavigation.setAttribute("role", "tablist");
    tabNavigation.closest(".law").classList.add("law-tabs-ready");
    tabs.forEach(function (tab, index) {
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-controls", panels[index].id);
      panels[index].setAttribute("role", "tabpanel");
      panels[index].tabIndex = 0;
    });

    function activateTab(index) {
      tabs.forEach(function (tab, position) {
        const selected = position === index;
        tab.setAttribute("aria-selected", String(selected));
        tab.tabIndex = selected ? 0 : -1;
        panels[position].hidden = !selected;
      });
    }

    function followFragment() {
      let id;
      try {
        id = decodeURIComponent(window.location.hash.slice(1));
      } catch (error) {
        id = "";
      }
      const target = document.getElementById(id);
      const index = target ? panels.findIndex(function (panel) {
        return panel === target || panel.contains(target);
      }) : -1;
      activateTab(index >= 0 ? index : 0);
      // Article citation links may point into a panel that was hidden before navigation.
      if (target && index >= 0) {
        requestAnimationFrame(function () { target.scrollIntoView(); });
      }
    }

    tabs.forEach(function (tab, index) {
      tab.addEventListener("click", function (event) {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        activateTab(index);
        window.history.pushState(null, "", tab.hash);
      });

      tab.addEventListener("keydown", function (event) {
        let next = index;
        if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
        else if (event.key === "ArrowLeft") next = (index + tabs.length - 1) % tabs.length;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = tabs.length - 1;
        else if (event.key === " ") {
          event.preventDefault();
          tab.click();
          return;
        } else return;
        event.preventDefault();
        tabs[next].focus();
        tabs[next].click();
      });
    });

    window.addEventListener("hashchange", followFragment);
    window.addEventListener("popstate", followFragment);
    followFragment();
  }
}
