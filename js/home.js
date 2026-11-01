// ===== Home page: sliding gallery in the red area + product grid =====
(function() {
    const K = window.KM,
        C = K.C,
        $ = K.$,
        el = K.el;

    // ----- hero slideshow -----
    // Desktop shows only gallery-N.jpg photos. Phones (window 760px wide or less) show only mobile-N.jpg photos.
    // FAST: the first photo shows as soon as it arrives; the other photos load one by one AFTER the page has finished loading.
    const box = $("heroSlides");
    const wide = C.GALLERY_IMAGES || [],
        tall = C.GALLERY_MOBILE_IMAGES || [];
    const full = (src) => "url('" + new URL(src, document.baseURI).href + "')"; // full address, so it works from the css folder too
    const mq = window.matchMedia("(max-width: 760px)"); // same width the CSS uses for phones
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const probe = (src) => new Promise((done) => { // downloads one photo; the browser keeps it, so showing it afterwards is instant
        if (!src) return done(null);
        const im = new Image();
        im.onload = () => done(src);
        im.onerror = () => done(null);
        im.src = src;
    });
    const afterLoad = () => new Promise((go) => {
        const wait = () => setTimeout(go, 1200);
        if (document.readyState === "complete") wait();
        else window.addEventListener("load", wait, { once: true });
    });
    let token = 0,
        timer = null;

    async function startHero() {
        const my = ++token;
        clearInterval(timer);
        box.replaceChildren();
        const kind = mq.matches ? "m" : "d"; // d = laptop photo, m = phone photo (the CSS shows the right one)
        const slides = [];
        let at = 0;
        const add = (src) => {
            const div = document.createElement("div");
            div.className = kind;
            div.style.setProperty(kind === "m" ? "--m" : "--d", full(src));
            box.appendChild(div);
            slides.push(div);
            if (slides.length === 1) div.classList.add("on");
        };
        if (!still) timer = setInterval(() => {
            if (slides.length < 2) return;
            slides[at].classList.remove("on");
            at = (at + 1) % slides.length;
            slides[at].classList.add("on");
        }, (C.SLIDE_SECONDS || 4) * 1000);
        const run = async(list) => { // add every photo that exists, in order
            for (const src of list) {
                if (my !== token) return;
                const ok = await probe(src);
                if (my !== token) return;
                if (ok) {
                    const first = !slides.length;
                    add(ok);
                    if (first) await afterLoad(); // the rest wait until the page is ready
                }
            }
        };
        await run(mq.matches ? tall : wide);
        if (my === token && !slides.length) await run(mq.matches ? wide : tall); // none of this device's photos exist: use the other set
    }
    startHero();
    if (mq.addEventListener) mq.addEventListener("change", startHero);

    // ----- product grid: categories first, then products, with search + sort + filters -----
    let cat = null, // null = showing the category boxes
        query = "";
    const f = { sort: "featured", min: null, max: null, sale: false, stock: false };
    const price = K.price;
    const shop = $("shop");

    // category boxes + "back" button (created here, so index.html is not changed)
    const catGrid = el("div", { class: "catgrid", id: "catGrid" });
    const back = el("button", {
        type: "button",
        class: "linkbtn catback",
        hidden: "hidden",
        onclick: () => {
            if (history.state && history.state.km) history.back();
            else showCats();
        }
    }, "← All categories");
    $("status").before(back, catGrid);

    function showCats() {
        cat = null;
        query = "";
        $("search").value = "";
        renderGrid();
    }

    function openCat(c) {
        cat = c;
        history.pushState({ km: 1, cat: c }, "");
        renderChips();
        renderGrid();
        shop.scrollIntoView({ behavior: "smooth" });
    }
    window.addEventListener("popstate", (e) => {
        if (e.state && e.state.km && e.state.cat) {
            cat = e.state.cat;
            renderChips();
            renderGrid();
        } else showCats();
    });

    function renderCats() {
        const names = [...new Set(K.products.map((p) => p.category).filter(Boolean))];
        catGrid.replaceChildren(...names.map((c, i) => {
            const list = K.products.filter((p) => p.category === c);
            return el("button", { type: "button", class: "catbox", style: "--i:" + i, onclick: () => openCat(c) },
                K.img(list[0].images[0], c, i < 4),
                el("span", { class: "catname" }, el("strong", {}, c), el("small", {}, list.length + (list.length === 1 ? " item" : " items"))));
        }));
    }

    function renderChips(centerActive) {
        const box = $("chips");
        const kept = box.scrollLeft; // redrawing the buttons must not throw the strip back to the start
        const cats = ["All"].concat([...new Set(K.products.map((p) => p.category).filter(Boolean))]);
        box.replaceChildren(...cats.map((c) =>
            el("button", {
                class: "chip" + (c === cat ? " on" : ""),
                onclick: () => {
                    cat = c;
                    renderChips(true);
                    renderGrid();
                }
            }, c)));
        box.scrollLeft = kept;
        if (centerActive) { // after a tap, glide the chosen category to the middle of the strip (sideways only, the page never jumps)
            const on = box.querySelector(".chip.on");
            if (on) box.scrollTo({ left: on.offsetLeft - (box.clientWidth - on.offsetWidth) / 2, behavior: "smooth" });
        }
    }

    const num = (v) => { v = String(v).trim(); if (v === "") return null; const n = Number(v); return isFinite(n) && n >= 0 ? n : null; };
    const filterCount = () => (f.min != null || f.max != null ? 1 : 0) + (f.sale ? 1 : 0) + (f.stock ? 1 : 0);

    function visible() {
        let lo = f.min,
            hi = f.max;
        if (lo != null && hi != null && lo > hi) { const t = lo;
            lo = hi;
            hi = t; } // typed the wrong way round: still works
        let list = K.products.filter((p) =>
            (cat === "All" || p.category === cat) && p.name.toLowerCase().includes(query) &&
            (lo == null || price(p) >= lo) && (hi == null || price(p) <= hi) &&
            (!f.sale || p.salePrice > 0) && (!f.stock || p.stock > 0));
        if (f.sort === "low") list = list.slice().sort((a, b) => price(a) - price(b));
        else if (f.sort === "high") list = list.slice().sort((a, b) => price(b) - price(a));
        else if (f.sort === "az") list = list.slice().sort((a, b) => a.name.localeCompare(b.name));
        else if (f.sort === "new") list = list.slice().reverse(); // newest = the last rows in your Products sheet
        return list;
    }

    function renderGrid() {
        const inCats = cat === null;
        shop.classList.toggle("cats-mode", inCats);
        back.hidden = inCats;
        catGrid.hidden = !inCats;
        if (inCats) { // category boxes
            renderCats();
            $("grid").replaceChildren();
            $("status").textContent = K.products.length ? "" : "No products yet. Please check back soon.";
            return;
        }
        const list = visible();
        $("grid").replaceChildren(...list.map((p, i) => K.card(p, i, i < 4)));
        const n = filterCount();
        $("filterBtn").textContent = n ? "Filters (" + n + ")" : "Filters";
        $("filterBtn").classList.toggle("on", n > 0);
        $("count").textContent = K.products.length ? list.length + (list.length === 1 ? " item" : " items") : "";
        $("status").textContent = !K.products.length ? "No products yet. Please check back soon." :
            (!list.length ? (n || query ? "Nothing matches your search or filters." : "Nothing here yet.") : "");
    }

    function priceHints() { // show the lowest and highest price in the empty boxes
        const prices = K.products.map(price).filter((x) => x > 0);
        if (!prices.length) return;
        $("pMin").placeholder = String(Math.min(...prices));
        $("pMax").placeholder = String(Math.max(...prices));
    }

    $("search").addEventListener("input", (e) => {
        query = e.target.value.trim().toLowerCase();
        if (query && cat === null) { // searching from the category boxes: search all products
            cat = "All";
            renderChips();
        }
        renderGrid();
    });
    $("sort").addEventListener("change", (e) => { f.sort = e.target.value;
        renderGrid(); });
    $("filterBtn").addEventListener("click", () => {
        const box = $("filters");
        box.hidden = !box.hidden;
        $("filterBtn").setAttribute("aria-expanded", String(!box.hidden));
    });
    $("pMin").addEventListener("input", (e) => { f.min = num(e.target.value);
        renderGrid(); });
    $("pMax").addEventListener("input", (e) => { f.max = num(e.target.value);
        renderGrid(); });
    $("fSale").addEventListener("change", (e) => { f.sale = e.target.checked;
        renderGrid(); });
    $("fStock").addEventListener("change", (e) => { f.stock = e.target.checked;
        renderGrid(); });
    $("fClear").addEventListener("click", () => {
        f.min = f.max = null;
        f.sale = f.stock = false;
        $("pMin").value = "";
        $("pMax").value = "";
        $("fSale").checked = false;
        $("fStock").checked = false;
        renderGrid();
    });

    // grey placeholder cards while the first load is in progress
    $("grid").replaceChildren(...[0, 1, 2, 3].map(() => el("div", { class: "skel" })));
    K.onFresh = () => {
        renderChips();
        priceHints();
        renderGrid();
    }; // newer data arrived: redraw
    K.loadProducts().then(() => {
            renderChips();
            priceHints();
            renderGrid();
        })
        .catch((err) => {
            $("grid").replaceChildren();
            $("status").textContent = err.message;
        });
})();
