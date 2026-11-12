/* Opens a folded block (<details>) when a link points at it or at something inside it, such as #go-further.
   A closed <details> does not open by itself. Plain JS, no dependencies. */
(function () {
  function openTarget() {
    var id = '';
    try { id = decodeURIComponent((location.hash || '').slice(1)); } catch (e) { return; }
    if (!id) return;
    var el = document.getElementById(id);
    if (!el) return;
    var d = el.tagName === 'DETAILS' ? el : el.closest('details');
    var changed = false;
    while (d) { if (!d.open) { d.open = true; changed = true; } d = d.parentElement ? d.parentElement.closest('details') : null; }
    if (changed) el.scrollIntoView();
  }
  window.addEventListener('hashchange', openTarget);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', openTarget); else openTarget();
})();
