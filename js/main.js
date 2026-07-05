/* ============================================================
   APEX/DROP — site behaviour
   Handles: mobile nav, "My Garage" compare tool (localStorage),
   drop filtering/sorting, newsletter capture, and the two
   custom Google Analytics 4 events used for this project:
     1) add_to_garage   — fired when a visitor saves a car to compare
     2) newsletter_signup — fired on newsletter form submit
   ============================================================ */

/* ---- GA4 helper -------------------------------------------------
   In production this project is wired to Google Analytics 4 via
   gtag.js (see the snippet commented in index.html <head>).
   gaEvent() is a thin wrapper so the rest of the code doesn't care
   whether gtag is present (e.g. during local file:// testing). */
function gaEvent(name, params){
  if (typeof window.gtag === 'function'){
    window.gtag('event', name, params || {});
  } else {
    console.log('[GA4 event]', name, params || {});
  }
}

/* ---- Mobile nav ---- */
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.menu-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links){
    toggle.addEventListener('click', () => links.classList.toggle('open'));
  }
});

/* ---- Toast helper ---- */
function showToast(msg){
  let t = document.querySelector('.toast');
  if (!t){
    t = document.createElement('div');
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ============================================================
   MY GARAGE — save-to-compare tool
   Stored client-side in localStorage under 'apexdrop_garage'
   as an array of car IDs. This is the site's custom, trackable
   engagement action (mirrors the GA4 custom event requirement).
   ============================================================ */
const GARAGE_KEY = 'apexdrop_garage';

function getGarage(){
  try{
    return JSON.parse(localStorage.getItem(GARAGE_KEY)) || [];
  }catch(e){ return []; }
}

function saveGarage(list){
  localStorage.setItem(GARAGE_KEY, JSON.stringify(list));
}

function isInGarage(id){
  return getGarage().includes(id);
}

function addToGarage(id, name){
  const list = getGarage();
  if (!list.includes(id)){
    list.push(id);
    saveGarage(list);
    gaEvent('add_to_garage', { car_id: id, car_name: name });
    showToast(name + ' added to My Garage');
  } else {
    showToast(name + ' is already in My Garage');
  }
  refreshGarageButtons();
}

function removeFromGarage(id, name){
  const list = getGarage().filter(x => x !== id);
  saveGarage(list);
  gaEvent('remove_from_garage', { car_id: id, car_name: name || id });
  refreshGarageButtons();
  if (typeof renderGaragePage === 'function') renderGaragePage();
}

function refreshGarageButtons(){
  document.querySelectorAll('[data-garage-btn]').forEach(btn => {
    const id = btn.getAttribute('data-garage-btn');
    const name = btn.getAttribute('data-garage-name');
    if (isInGarage(id)){
      btn.textContent = '✓ In Garage';
      btn.classList.add('btn-ghost-blue');
    } else {
      btn.textContent = '+ Add to Garage';
      btn.classList.remove('btn-ghost-blue');
    }
  });
  const countEls = document.querySelectorAll('[data-garage-count]');
  countEls.forEach(el => el.textContent = getGarage().length);
}

document.addEventListener('DOMContentLoaded', () => {
  refreshGarageButtons();
  document.querySelectorAll('[data-garage-btn]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-garage-btn');
      const name = btn.getAttribute('data-garage-name');
      if (isInGarage(id)){
        removeFromGarage(id, name);
      } else {
        addToGarage(id, name);
      }
    });
  });
});

/* ============================================================
   DROPS FILTER + SORT (drops.html)
   Data attributes on each .card:
     data-category  → "hypercar" | "sports" | "luxury-ev" | "grand-tourer"
     data-price     → numeric USD for sorting
     data-power     → numeric hp for sorting
     data-date      → ISO date for sorting by newest
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  const grid = document.querySelector('[data-drops-grid]');
  if (!grid) return;

  const chips = document.querySelectorAll('[data-filter]');
  const sortSelect = document.querySelector('[data-sort]');
  const cards = Array.from(grid.querySelectorAll('.card'));
  const emptyMsg = document.querySelector('[data-empty-msg]');
  let activeFilter = 'all';

  function applyFilterSort(){
    let visibleCount = 0;
    cards.forEach(card => {
      const cat = card.getAttribute('data-category');
      const show = activeFilter === 'all' || cat === activeFilter;
      card.style.display = show ? '' : 'none';
      if (show) visibleCount++;
    });

    if (sortSelect){
      const key = sortSelect.value;
      const sorted = cards.slice().sort((a,b) => {
        if (key === 'price-asc') return (+a.dataset.price) - (+b.dataset.price);
        if (key === 'price-desc') return (+b.dataset.price) - (+a.dataset.price);
        if (key === 'power-desc') return (+b.dataset.power) - (+a.dataset.power);
        if (key === 'newest') return new Date(b.dataset.date) - new Date(a.dataset.date);
        return 0;
      });
      sorted.forEach(card => grid.appendChild(card));
      gaEvent('sort_drops', { sort_by: key });
    }

    if (emptyMsg) emptyMsg.style.display = visibleCount === 0 ? 'block' : 'none';
  }

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeFilter = chip.getAttribute('data-filter');
      gaEvent('filter_drops', { category: activeFilter });
      applyFilterSort();
    });
  });

  if (sortSelect){
    sortSelect.addEventListener('change', applyFilterSort);
  }
});

/* ============================================================
   NEWSLETTER SIGNUP
   Custom GA4 event: newsletter_signup
   (This is the custom GA element documented in the midterm report.)
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-newsletter-form]').forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = form.querySelector('input[type=email]');
      const msg = form.parentElement.querySelector('.form-msg');
      const email = input ? input.value.trim() : '';
      if (!email){ return; }
      gaEvent('newsletter_signup', { source_page: window.location.pathname });
      if (msg){
        msg.textContent = "You're on the list — first drop alert lands in your inbox soon.";
        msg.classList.add('ok');
      }
      form.reset();
      showToast('Subscribed to Drop Alerts');
    });
  });
});

/* ============================================================
   GARAGE PAGE RENDER (garage.html only)
   Pulls from window.APEXDROP_CATALOG (defined per-page) to
   build the comparison table from saved IDs.
   ============================================================ */
function renderGaragePage(){
  const root = document.querySelector('[data-garage-root]');
  if (!root || !window.APEXDROP_CATALOG) return;
  const ids = getGarage();
  const items = ids.map(id => window.APEXDROP_CATALOG.find(c => c.id === id)).filter(Boolean);

  if (items.length === 0){
    root.innerHTML = `
      <div class="empty-state">
        <h3>Your garage is empty</h3>
        <p class="text-dim">Add cars from the Drops page to compare specs side by side.</p>
        <a class="btn btn-primary" href="drops.html">Browse Drops</a>
      </div>`;
    return;
  }

  const rows = [
    ['Category', c => c.category],
    ['Powertrain', c => c.powertrain],
    ['Power', c => c.power],
    ['0–60 mph', c => c.zeroSixty],
    ['Top speed', c => c.topSpeed],
    ['Est. price (USD)', c => c.priceLabel],
    ['Est. availability', c => c.availability],
  ];

  let html = '<div class="compare-scroll"><table class="compare-table"><thead><tr><th>Spec</th>';
  items.forEach(c => { html += `<th>${c.name}</th>`; });
  html += '</tr></thead><tbody>';
  rows.forEach(([label, fn]) => {
    html += `<tr><td>${label}</td>`;
    items.forEach(c => { html += `<td>${fn(c)}</td>`; });
    html += '</tr>';
  });
  html += '<tr><td>Remove</td>';
  items.forEach(c => {
    html += `<td class="remove"><button class="remove-btn" data-remove="${c.id}">Remove</button></td>`;
  });
  html += '</tr>';
  html += '</tbody></table></div>';
  root.innerHTML = html;

  root.querySelectorAll('[data-remove]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-remove');
      const item = items.find(c => c.id === id);
      removeFromGarage(id, item ? item.name : id);
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector('[data-garage-root]')) renderGaragePage();
});
