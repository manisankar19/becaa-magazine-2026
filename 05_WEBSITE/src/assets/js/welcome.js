// Registration form behaviour (Sprint v3 Task 25). Progressive enhancement: without this
// script the form still posts to /api/register as a normal form and is redirected back.
// All server text is placed with textContent — never innerHTML.
(function () {
  "use strict";
  document.documentElement.classList.add("js");
  var form = document.querySelector('[data-testid="register-form"]');
  if (!form) return;
  var notice = document.querySelector('[data-testid="form-notice"]');
  var started = form.querySelector('input[name="form_started_at"]');
  started.value = String(Date.now());

  var groups = Array.prototype.slice.call(form.querySelectorAll("fieldset[data-for]"));
  var otherField = form.querySelector('[data-testid="field-department-other"]');
  var department = form.querySelector('[name="department"]');

  function currentCategory() {
    var checked = form.querySelector('input[name="category"]:checked');
    return checked ? checked.value : "";
  }

  function applyCategory() {
    var category = currentCategory();
    groups.forEach(function (group) {
      var applies = category !== "" && group.getAttribute("data-for").split(" ").indexOf(category) !== -1;
      group.hidden = !applies;
      group.disabled = !applies; // hidden groups are not submitted (JSON or classic post)
      Array.prototype.forEach.call(group.querySelectorAll("[data-required-for]"), function (input) {
        var requiredFor = input.getAttribute("data-required-for").split(" ");
        if (applies && requiredFor.indexOf(category) !== -1) input.setAttribute("required", "");
        else input.removeAttribute("required");
      });
    });
    applyDepartment();
  }

  function applyDepartment() {
    var isOther = currentCategory() === "alumni" && department.value === "Other";
    otherField.hidden = !isOther;
    var input = otherField.querySelector("input");
    input.disabled = !isOther;
    if (isOther) input.setAttribute("required", ""); else input.removeAttribute("required");
  }

  function clearErrors() {
    Array.prototype.forEach.call(form.querySelectorAll(".field-error"), function (el) { el.textContent = ""; el.hidden = true; });
    Array.prototype.forEach.call(form.querySelectorAll("[aria-invalid]"), function (el) { el.removeAttribute("aria-invalid"); });
    notice.textContent = "";
    notice.hidden = true;
  }

  function showNotice(text) {
    notice.textContent = text;
    notice.hidden = false;
    notice.focus && notice.setAttribute("tabindex", "-1");
    notice.scrollIntoView({ block: "center" });
  }

  // A message is only ever a non-empty string; anything else (an object, null, a number) gets a fixed text,
  // so a platform error such as {"error":{"code":"500","message":"…"}} never renders as "[object Object]".
  function asText(value, fallback) {
    return typeof value === "string" && value.trim() !== "" ? value : fallback;
  }

  function messageFor(status, body) {
    var error = body && body.error;
    if (typeof error === "string" && error.trim() !== "") return error;
    var detail = error && typeof error === "object" ? asText(error.message, "") : "";
    if (status === 429) return "Too many attempts. Please wait a few minutes and try again.";
    if (status >= 500) return "The server had a problem saving your registration (error " + status + (detail ? ": " + detail : "") + "). Please try again in a moment.";
    if (detail) return detail + " (error " + status + "). Please check the details you entered and try again.";
    return "Sorry, something went wrong (error " + status + "). Please try again in a moment.";
  }

  function showErrors(errors) {
    var first = null;
    Object.keys(errors).forEach(function (field) {
      var message = asText(errors[field], "Please check this field.");
      var el = form.querySelector('[data-testid="error-' + field + '"]');
      if (el) {
        el.textContent = message;
        el.hidden = false;
        var input = form.querySelector('[name="' + field + '"]');
        if (input) { input.setAttribute("aria-invalid", "true"); if (!first) first = input; }
      } else if (field === "form") {
        showNotice(message);
      }
    });
    if (first && first.focus) first.focus();
  }

  Array.prototype.forEach.call(form.querySelectorAll('input[name="category"]'), function (radio) { radio.addEventListener("change", applyCategory); });
  department.addEventListener("change", applyDepartment);
  applyCategory();

  // No-JS fallback lands here with ?error=…; show a generic message for that case.
  var errorParam = new URLSearchParams(location.search).get("error");
  if (errorParam === "rate") showNotice("Too many attempts. Please wait a few minutes and try again.");
  else if (errorParam) showNotice("Please check the details you entered and try again.");

  form.addEventListener("submit", function (event) {
    if (!window.fetch) return; // let the browser post the form normally
    event.preventDefault();
    clearErrors();
    var data = new FormData(form);
    var payload = {};
    data.forEach(function (value, key) { payload[key] = value; });
    payload.consent = data.get("consent") === "on";
    payload.form_started_at = Number(started.value);
    var button = form.querySelector('[type="submit"]');
    button.disabled = true;
    fetch(form.getAttribute("action"), {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(payload),
    }).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (body) { return { status: response.status, body: body && typeof body === "object" ? body : {} }; });
    }).then(function (result) {
      if (result.status === 200 && result.body.ok) { window.location.href = "/"; return; }
      if (result.status === 422 && result.body.errors && typeof result.body.errors === "object") { showErrors(result.body.errors); return; }
      showNotice(messageFor(result.status, result.body));
    }).catch(function () {
      showNotice("We could not reach the server. Please check your connection and try again.");
    }).then(function () { button.disabled = false; });
  });
})();
