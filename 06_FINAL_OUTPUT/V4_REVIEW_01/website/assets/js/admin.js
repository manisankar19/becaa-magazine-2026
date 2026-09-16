// Administrator dashboard (Sprint v3 Task 31). Everything shown here comes from /api/admin/*
// after a server-side login; the session lives in an HttpOnly cookie the script never sees.
// Data is inserted with textContent / createElement only — no innerHTML, no inline styles in
// markup (bar widths are set through the CSSOM, which the strict CSP permits).
(function () {
  "use strict";
  var $ = function (id) { return document.querySelector('[data-testid="' + id + '"]'); };
  var loginForm = $("login-form");
  var dashboard = $("dashboard");
  var notice = $("admin-notice");
  var loginError = $("login-error");
  var csrf = null;
  var state = { q: "", page: 1 };

  function show(el, on) { el.hidden = !on; }
  function setNotice(text) { notice.textContent = text || ""; show(notice, Boolean(text)); }
  function el(tag, text, attrs) {
    var node = document.createElement(tag);
    if (text !== undefined && text !== null) node.textContent = String(text);
    if (attrs) Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    return node;
  }
  function api(path, options) {
    options = options || {};
    var headers = Object.assign({ accept: "application/json" }, options.headers || {});
    if (options.body !== undefined) headers["content-type"] = "application/json";
    if (csrf && options.method && options.method !== "GET") headers["x-csrf-token"] = csrf;
    return fetch(path, { method: options.method || "GET", credentials: "same-origin", headers: headers, body: options.body !== undefined ? JSON.stringify(options.body) : undefined })
      .then(function (res) { return res.json().catch(function () { return {}; }).then(function (body) { return { status: res.status, body: body }; }); });
  }

  function showLogin(message) {
    show(dashboard, false);
    show(loginForm, true);
    csrf = null;
    loginError.textContent = message || "";
    show(loginError, Boolean(message));
    $("username").focus();
  }

  function renderBars(table, rows, labelKey) {
    var tbody = table.querySelector("tbody");
    tbody.textContent = "";
    var max = rows.reduce(function (m, r) { return Math.max(m, r.count); }, 0);
    rows.forEach(function (r) {
      var tr = el("tr");
      tr.appendChild(el("th", r[labelKey], { scope: "row" }));
      tr.appendChild(el("td", r.count));
      var cell = el("td");
      var bar = el("div", "", { class: "bar", "aria-hidden": "true" });
      bar.style.width = max ? Math.round((r.count / max) * 100) + "%" : "0%";
      cell.appendChild(bar);
      tr.appendChild(cell);
      tbody.appendChild(tr);
    });
    if (!rows.length) { var empty = el("tr"); empty.appendChild(el("td", "No data yet", { colspan: "3" })); tbody.appendChild(empty); }
  }

  function loadStats() {
    return api("/api/admin/stats").then(function (r) {
      if (r.status === 401) { showLogin(); return false; }
      if (r.status !== 200) { setNotice(r.body.error || "Could not load statistics."); return false; }
      $("stat-visitors").textContent = r.body.visitors_total;
      $("stat-visits").textContent = r.body.visits_total;
      $("stat-alumni").textContent = r.body.by_category.alumni;
      $("stat-sponsor").textContent = r.body.by_category.sponsor;
      $("stat-guest").textContent = r.body.by_category.guest;
      renderBars($("batch-table"), r.body.by_batch_year, "batch_year");
      renderBars($("department-table"), r.body.by_department, "department");
      return true;
    });
  }

  function loadVisitors() {
    var url = "/api/admin/visitors?page=" + encodeURIComponent(state.page) + (state.q ? "&q=" + encodeURIComponent(state.q) : "");
    return api(url).then(function (r) {
      if (r.status === 401) { showLogin(); return; }
      if (r.status !== 200) { setNotice(r.body.error || "Could not load registrations."); return; }
      var tbody = $("visitors-table").querySelector("tbody");
      tbody.textContent = "";
      r.body.rows.forEach(function (v) {
        var tr = el("tr");
        [v.name, v.email, v.category, v.batch_year, v.department === "Other" && v.department_other ? "Other: " + v.department_other : v.department, v.organisation, v.mobile, v.registered_at, v.visit_count].forEach(function (value) { tr.appendChild(el("td", value === null || value === undefined ? "" : value)); });
        var actions = el("td");
        var del = el("button", "Delete", { type: "button", class: "button button--danger", "data-testid": "delete-" + v.id });
        del.addEventListener("click", function () {
          if (!window.confirm("Delete this registration permanently?")) return;
          api("/api/admin/visitors/" + encodeURIComponent(v.id), { method: "DELETE" }).then(function (d) {
            if (d.status === 401) { showLogin(); return; }
            if (d.status !== 200) { setNotice(d.body.error || "Delete failed."); return; }
            setNotice("");
            loadStats();
            loadVisitors();
          });
        });
        actions.appendChild(del);
        tr.appendChild(actions);
        tbody.appendChild(tr);
      });
      if (!r.body.rows.length) { var empty = el("tr"); empty.appendChild(el("td", "No registrations match.", { colspan: "10" })); tbody.appendChild(empty); }
      var pages = Math.max(1, Math.ceil(r.body.total / r.body.per_page));
      $("page-info").textContent = "Page " + r.body.page + " of " + pages + " · " + r.body.total + " registration" + (r.body.total === 1 ? "" : "s");
      $("page-prev").disabled = r.body.page <= 1;
      $("page-next").disabled = r.body.page >= pages;
    });
  }

  function showDashboard() {
    show(loginForm, false);
    show(dashboard, true);
    setNotice("");
    return loadStats().then(function (ok) { if (ok) return loadVisitors(); });
  }

  loginForm.addEventListener("submit", function (event) {
    event.preventDefault();
    show(loginError, false);
    var button = $("login-submit");
    button.disabled = true;
    api("/api/admin/login", { method: "POST", body: { username: $("username").value, password: $("password").value } }).then(function (r) {
      button.disabled = false;
      $("password").value = "";
      if (r.status === 200 && r.body.ok) { csrf = r.body.csrf; showDashboard(); return; }
      loginError.textContent = r.body.error || "Sign-in failed. Please try again.";
      show(loginError, true);
    }).catch(function () { button.disabled = false; loginError.textContent = "We could not reach the server."; show(loginError, true); });
  });

  $("search-form").addEventListener("submit", function (event) { event.preventDefault(); state.q = $("search").value.trim(); state.page = 1; loadVisitors(); });
  $("page-prev").addEventListener("click", function () { if (state.page > 1) { state.page -= 1; loadVisitors(); } });
  $("page-next").addEventListener("click", function () { state.page += 1; loadVisitors(); });
  $("refresh").addEventListener("click", function () { loadStats(); loadVisitors(); });
  $("logout").addEventListener("click", function () {
    api("/api/admin/logout", { method: "POST", body: { csrf: csrf } }).then(function () { state = { q: "", page: 1 }; $("search").value = ""; showLogin(); });
  });

  // An existing (HttpOnly) session cannot be read by script; probe the API instead.
  api("/api/admin/stats").then(function (r) { if (r.status === 200) { setNotice("Session restored — reload after login if actions are refused."); showDashboard(); } else showLogin(); });
})();
