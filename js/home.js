// ===== Home page: sliding gallery in the red area + product grid =====
(function() {
    const K = window.KM,
        C = K.C,
        $ = K.$,
        el = K.el;

    // ----- hero slideshow -----
    // Desktop shows only gallery-N.jpg photos. Phones (window 760px wide or less) show only mobile-N.jpg photos.
    // Missing photos are skipped.
    const box = $("heroSlides");
    const exists = (src) => new Promise((done) => {
        if (!src) return done(null);
        const im = new Image();
        im.onload = () => done(src);
        im.onerror = () => done(null);
        im.src = src;
    });
    const wide = C.GALLERY_IMAGES || [],
        tall = C.GALLERY_MOBILE_IMAGES || [];
    const full = (src) => "url('" + new URL(src, document.baseURI).href + "')"; // full address, so it works from the css folder too
    const mq = window.matchMedia("(max-width: 760px)"); // same width the CSS uses for phones
    const dsk = [], mob = []; // desktop slides (gallery-N.jpg) and phone slides (mobile-N.jpg), kept separate
    const make = (src, cls, list, varName) => {
        const div = document.createElement("div");
        div.className = cls;
        div.style.setProperty(varName, full(src));
        box.appendChild(div);
        list.push(div);
    };
    let idx = 0;
    const active = () => {
        // phones use only mobile photos, desktop only gallery photos (if a whole set is empty, use the other so the hero is never blank)
        const l = mq.matches ? mob : dsk;
        return l.length ? l : (mq.matches ? dsk : mob);
    };
    const show = () => {
        [...dsk, ...mob].forEach((d) => d.classList.remove("on"));
        const l = active();
        if (l.length) l[idx % l.length].classList.add("on");
    };
    Promise.all([
        Promise.all(wide.map(exists)),
        Promise.all(tall.map(exists))
    ]).then(([w, t]) => {
        w.filter(Boolean).forEach((src) => make(src, "d", dsk, "--d"));
        t.filter(Boolean).forEach((src) => make(src, "m", mob, "--m"));
        // if one set is missing completely, reuse the other set's photos so the hero still shows something
        if (!mob.length) w.filter(Boolean).forEach((src) => make(src, "m", mob, "--m"));
        if (!dsk.length) t.filter(Boolean).forEach((src) => make(src, "d", dsk, "--d"));
        if (!dsk.length && !mob.length) return;
        show();
        if (mq.addEventListener) mq.addEventListener("change", () => { idx = 0; show(); });
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        setInterval(() => {
            const l = active();
            if (l.length < 2) return;
            idx = (idx + 1) % l.length;
            show();
        }, (C.SLIDE_SECONDS || 4) * 1000);
    });

    // ----- product grid -----
    let cat = "All",
        query = "";

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

    function renderGrid() {
        const list = K.products.filter((p) => (cat === "All" || p.category === cat) && p.name.toLowerCase().includes(query));
        $("grid").replaceChildren(...list.map((p, i) => K.card(p, i)));
        $("status").textContent = !K.products.length ? "No products yet. Please check back soon." :
            (!list.length ? "Nothing matches your search." : "");
    }
    $("search").addEventListener("input", (e) => {
        query = e.target.value.trim().toLowerCase();
        renderGrid();
    });

    // grey placeholder cards while the first load is in progress
    $("grid").replaceChildren(...[0, 1, 2, 3].map(() => el("div", { class: "skel" })));
    K.onFresh = () => {
        renderChips();
        renderGrid();
    }; // newer data arrived: redraw
    K.loadProducts().then(() => {
            renderChips();
            renderGrid();
        })
        .catch((err) => {
            $("grid").replaceChildren();
            $("status").textContent = err.message;
        });
})();