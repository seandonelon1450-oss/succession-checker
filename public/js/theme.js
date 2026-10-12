/* Arbor Law — dark theme: follows OS by default; the toggle choice is stored on this device. */
(function () {
  "use strict";
  var KEY = "arbor.theme";
  function apply(t) { document.documentElement.setAttribute("data-theme", t); }
  try {
    var saved = localStorage.getItem(KEY);
    if (saved === "dark" || saved === "light") { apply(saved); }
    else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) { apply("dark"); }
  } catch (e) { /* private mode */ }
  document.addEventListener("DOMContentLoaded", function () {
    var b = document.getElementById("theme-toggle");
    if (!b) return;
    b.addEventListener("click", function () {
      var cur = document.documentElement.getAttribute("data-theme");
      var next = cur === "dark" ? "light" : "dark";
      apply(next);
      try { localStorage.setItem(KEY, next); } catch (e) { /* private mode */ }
    });
  });
})();
