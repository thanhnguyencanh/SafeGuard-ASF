// SafeGuard ASF project page: headline numbers, detection explorer, response-time breakdown, compute chart, tables,
// demo videos (one plays at a time), YouTube-free. No dependencies.
(function () {
  "use strict";
  var D = window.ASF;
  if (!D) return;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var el = function (tag, attrs, html) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (html !== undefined) e.innerHTML = html;
    return e;
  };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };

  var tip = el("div", { class: "tip", role: "tooltip", hidden: "" });
  document.body.appendChild(tip);
  var hideTip = function () { tip.hidden = true; };
  window.addEventListener("scroll", hideTip, { passive: true });
  function hover(node, html) {
    var show = function () {
      tip.innerHTML = html; tip.hidden = false;
      var r = node.getBoundingClientRect();
      tip.style.left = Math.min(window.innerWidth - tip.offsetWidth - 12, Math.max(12, r.left)) + "px";
      tip.style.top = (r.bottom + 8 + tip.offsetHeight > window.innerHeight ? r.top - tip.offsetHeight - 8 : r.bottom + 8) + "px";
    };
    node.addEventListener("mouseenter", show); node.addEventListener("focus", show);
    node.addEventListener("mouseleave", hideTip); node.addEventListener("blur", hideTip);
  }
  function bars(box, items, dg, unit, opts) {
    opts = opts || {};
    box.innerHTML = "";
    var max = opts.max || Math.max.apply(null, items.map(function (x) { return x.v; })) || 1;
    items.forEach(function (x) {
      var row = el("div", { class: "bar-row" + (x.ours ? " ours" : ""), tabindex: "0" },
        '<span class="bar-name">' + esc(x.name) + '</span><span class="bar-track"><span class="bar" style="width:' + Math.max(0.6, 100 * x.v / max).toFixed(1) + '%"></span></span><span class="bar-val">' + x.v.toFixed(dg) + (opts.suffix || "") + "</span>");
      hover(row, "<strong>" + esc(x.name) + "</strong>: " + x.v.toFixed(dg) + " " + unit + (x.note ? "<br>" + esc(x.note) : ""));
      box.appendChild(row);
    });
  }
  function chips(container, opts, get, set) {
    container.innerHTML = "";
    opts.forEach(function (o) {
      var b = el("button", { type: "button", class: "chip", "aria-pressed": String(get() === o[0]) }, esc(o[1]));
      b.addEventListener("click", function () { set(o[0]); });
      container.appendChild(b);
    });
  }
  var find = function (arr, key, val) { return arr.filter(function (r) { return r[key] === val; })[0]; };

  // ---- headline ----
  var fire = find(D.detection, "type", "Fire"), full = find(D.compute, "module", "Full Pipeline"), all = find(D.success, "scenario", "Overall");
  var nTools = D.tools.reduce(function (a, t) { return a + t.count; }, 0);
  [[(100 * fire.f1).toFixed(1) + "%", "fire detection F1, " + fire.latency_ms.toFixed(0) + " ms latency"],
   [all.success.toFixed(1) + "%", "end-to-end scenario success over fire, thermal and intruder trials"],
   [full.latency_ms.toFixed(0) + " ms", "full perception pipeline on Jetson Orin (" + full.fps.toFixed(1) + " FPS)"],
   [String(nTools), "tools the ReAct agent can call through ToolOrchestra"]].forEach(function (h) {
    $("#headline").appendChild(el("div", {}, "<dt>" + esc(h[0]) + "</dt><dd>" + esc(h[1]) + "</dd>"));
  });

  // ---- detection explorer (Table II) ----
  var METRICS = [["f1", "F1", 3, ""], ["precision", "Precision", 3, ""], ["recall", "Recall", 3, ""], ["latency_ms", "Latency", 0, "ms"]];
  var met = "f1";
  function drawDet() {
    chips($("#det-metrics"), METRICS.map(function (m) { return [m[0], m[1]]; }), function () { return met; }, function (v) { met = v; drawDet(); });
    var m = METRICS.filter(function (x) { return x[0] === met; })[0];
    bars($("#det-chart .bars"), D.detection.map(function (r) { return { name: r.type, v: r[met], ours: r.type === "Average" }; }), m[2], m[3] || "",
      { max: m[3] ? undefined : 1, suffix: m[3] ? " ms" : "" });
    $("#det-title").textContent = m[1] + " by hazard type";
    $("#det-sub").textContent = (m[3] ? "lower is faster" : "higher is better") + " · Table II";
  }
  drawDet();

  // ---- response time (Table III): one stacked row per scenario ----
  var phases = D.response.phases.filter(function (p) { return p.phase !== "Total"; });
  var totals = find(D.response.phases, "phase", "Total").s;
  var maxT = Math.max.apply(null, totals);
  var COLORS = ["#0072B2", "#E69F00", "#009E73", "#56B4E9", "#CC79A7"];
  var box = $("#resp-chart");
  D.response.scenarios.forEach(function (sc, k) {
    var segs = phases.map(function (p, j) {
      return '<span class="seg" style="width:' + (100 * p.s[k] / maxT).toFixed(2) + "%;background:" + COLORS[j] + '" title="' + esc(p.phase) + ": " + p.s[k].toFixed(2) + ' s"></span>';
    }).join("");
    var row = el("div", { class: "stack-row", tabindex: "0" }, '<span class="bar-name">' + esc(sc) + '</span><span class="stack-track">' + segs + '</span><span class="bar-val">' + totals[k].toFixed(2) + " s</span>");
    hover(row, "<strong>" + esc(sc) + "</strong>: " + totals[k].toFixed(2) + " s total<br>" + phases.map(function (p) { return esc(p.phase) + " " + p.s[k].toFixed(2) + " s"; }).join("<br>"));
    box.appendChild(row);
  });
  $("#resp-legend").innerHTML = phases.map(function (p, j) { return '<span><i style="background:' + COLORS[j] + '"></i>' + esc(p.phase) + "</span>"; }).join("");
  var nav = find(D.response.phases, "phase", "Navigation (avg)").s;
  var share = nav.map(function (v, k) { return 100 * v / totals[k]; });
  $("#resp-note").textContent = "Walking to the hazard dominates: navigation is " + Math.round(Math.min.apply(null, share)) + "–" + Math.round(Math.max.apply(null, share)) +
    "% of the response time. Detection itself takes " + Math.min.apply(null, phases[0].s).toFixed(2) + "–" + Math.max.apply(null, phases[0].s).toFixed(2) + " s.";

  // ---- compute (Table VI) ----
  bars($("#comp-chart .bars"), D.compute.map(function (r) { return { name: r.module, v: r.latency_ms, ours: r.module === "Full Pipeline", note: r.fps.toFixed(1) + " FPS · GPU " + r.gpu.toFixed(0) + "%" }; }), 0, "ms", { suffix: " ms" });

  // ---- tables ----
  $("#succ-table").innerHTML = "<caption>Table IV: end-to-end scenario outcomes, as reported (N=" + D.success_trials + " trials per scenario). Partial = correct detection but a suboptimal response.</caption><thead><tr><th>Scenario</th><th>Success</th><th>Partial</th><th>Failure</th></tr></thead><tbody>" +
    D.success.map(function (r) { return '<tr class="' + (r.scenario === "Overall" ? "group" : "") + '"><td>' + esc(r.scenario) + '</td><td class="numc">' + r.success.toFixed(r.success % 1 ? 1 : 0) + '%</td><td class="numc">' + r.partial.toFixed(r.partial % 1 ? 1 : 0) + '%</td><td class="numc">' + r.failure.toFixed(r.failure % 1 ? 1 : 0) + "%</td></tr>"; }).join("") + "</tbody>";
  $("#base-table").innerHTML = "<caption>Table V: comparison with a rule-based system.</caption><thead><tr><th>System</th><th>Coverage</th><th>Blind spots</th><th>Response</th><th>Success</th></tr></thead><tbody>" +
    D.baselines.map(function (r) { return '<tr class="' + (r.system === "SafeGuard ASF" ? "ours" : "") + '"><td>' + esc(r.system) + '</td><td class="numc">' + esc(r.coverage) + '</td><td class="numc">' + esc(r.blind) + '</td><td class="numc">' + r.response_s.toFixed(1) + ' s</td><td class="numc">' + r.success.toFixed(0) + "%</td></tr>"; }).join("") + "</tbody>";
  $("#tool-table").innerHTML = "<caption>Table I: ToolOrchestra tool categories (" + nTools + " tools).</caption><thead><tr><th>Category</th><th>Tools</th><th>Examples</th></tr></thead><tbody>" +
    D.tools.map(function (r) { return "<tr><td>" + esc(r.category) + '</td><td class="numc">' + r.count + "</td><td><code>" + esc(r.examples).replace(/, /g, "</code>, <code>") + "</code></td></tr>"; }).join("") + "</tbody>";

  // ---- demo videos: only one plays at a time ----
  var vids = [].slice.call(document.querySelectorAll(".demo video"));
  vids.forEach(function (v) { v.addEventListener("play", function () { vids.forEach(function (o) { if (o !== v) o.pause(); }); }); });

  var links = document.querySelectorAll(".toc a");
  if ("IntersectionObserver" in window) {
    var so = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) links.forEach(function (l) { l.classList.toggle("on", l.getAttribute("href") === "#" + e.target.id); }); });
    }, { rootMargin: "-40% 0px -55% 0px" });
    document.querySelectorAll("main section[id]").forEach(function (s) { so.observe(s); });
  }
  var copy = $("#copy-bib");
  copy.addEventListener("click", function () {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText($("#bibtex").textContent).then(function () { copy.textContent = "Copied"; setTimeout(function () { copy.textContent = "Copy"; }, 1600); }, function () {});
  });
})();
