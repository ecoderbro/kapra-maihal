// ===== Product page: photo left, details right, same-category suits below =====
(function() {
    const K = window.KM,
        C = K.C,
        $ = K.$,
        el = K.el,
        img = K.img,
        money = K.money,
        price = K.price;
    const wanted = new URLSearchParams(location.search).get("id");
    let watcher = null; // shows the bottom "Add to cart" bar on phones once the main button scrolls out of view
    const BAG = '<span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8h12l1 12H5L6 8z"/><path d="M9 8a3 3 0 0 1 6 0"/></svg></span>';

    function removeBar() {
        document.querySelectorAll(".sticky").forEach((n) => n.remove());
        document.body.classList.remove("has-sticky", "sticky-on");
        if (watcher) { watcher.disconnect();
            watcher = null; }
    }

    function render(p) {
        removeBar();
        document.title = p.name + " — " + C.NAME;
        const sel = { size: p.sizes.length === 1 ? p.sizes[0] : "", colour: p.colours.length === 1 ? p.colours[0] : "", qty: 1 };

        // left: big photo (tap to zoom) + thumbnails (they change when a colour is picked)
        let photos = [],
            cur = 0;
        const zoomNow = () => K.zoom(photos, cur, pick);
        const main = el("div", {
            class: "main",
            role: "button",
            tabindex: "0",
            "aria-label": "Zoom photo",
            onclick: zoomNow,
            onkeydown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault();
                    zoomNow(); } }
        });
        const thumbs = el("div", { class: "thumbs" });

        function pick(i) {
            cur = i;
            main.replaceChildren(img(photos[i], p.name));
            thumbs.querySelectorAll("button").forEach((b, n) => b.classList.toggle("on", n === i));
        }

        function setPhotos(list) {
            photos = list;
            cur = 0;
            main.replaceChildren(img(list[0], p.name));
            thumbs.replaceChildren(...(list.length > 1 ? list.map((src, i) =>
                el("button", { type: "button", class: i ? "" : "on", "aria-label": "Photo " + (i + 1), onclick: () => pick(i) }, img(src, ""))) : []));
        }
        setPhotos(K.photosFor(p, sel.colour)); // single-colour products show that colour's photos straight away

        // right: options
        function group(label, values, key, extra) {
            if (!values.length) return null;
            const err = el("span", { class: "err" });
            const row = el("div", { class: "opts" }, values.map((v) =>
                el("button", {
                    type: "button",
                    class: "opt" + (sel[key] === v ? " on" : ""),
                    onclick: (ev) => {
                        sel[key] = v;
                        if (key === "colour") setPhotos(K.photosFor(p, v)); // show this colour's photos
                        err.textContent = "";
                        row.querySelectorAll(".opt").forEach((b) => b.classList.remove("on"));
                        ev.currentTarget.classList.add("on");
                    }
                }, v)));
            return el("div", { class: "grp" }, el("div", { class: "ghead" }, el("h4", {}, label), extra || null), row, err);
        }
        const guideLink = p.sizes.length && C.SIZE_GUIDE ? el("button", { type: "button", class: "linkbtn", onclick: () => K.sizeGuide() }, "Size guide") : null;
        const gSize = group("Size", p.sizes, "size", guideLink),
            gColour = group("Colour", p.colours, "colour");
        const qtyNum = el("strong", {}, "1");
        const maxQ = Math.min(C.MAX_QTY, Math.max(p.stock, 1));
        const setQty = (d) => {
            sel.qty = Math.min(maxQ, Math.max(1, sel.qty + d));
            qtyNum.textContent = sel.qty;
        };
        const soldOut = p.stock <= 0;

        // Add to cart button (one in the page, one in the phone bottom bar)
        const adds = [];
        let timer = null;
        const label = (b, text) => { b.innerHTML = BAG + "<span>" + text + "</span>"; };
        const mkAdd = () => {
            const b = el("button", { type: "button", class: "btn solid add", disabled: soldOut ? "disabled" : null, onclick: doAdd });
            label(b, soldOut ? "Sold out" : "Add to cart");
            adds.push(b);
            return b;
        };

        function flash() {
            adds.forEach((b) => { b.classList.add("done");
                label(b, "Added ✓"); });
            clearTimeout(timer);
            timer = setTimeout(() => adds.forEach((b) => { b.classList.remove("done");
                label(b, "Add to cart"); }), 1800);
        }

        function doAdd() {
            let bad = null;
            [
                [gSize, "size", "Please choose a size."],
                [gColour, "colour", "Please choose a colour."]
            ].forEach(([g, k, m]) => {
                if (g && !sel[k]) {
                    g.querySelector(".err").textContent = m;
                    bad = bad || g;
                }
            });
            if (bad) { bad.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
            K.addToCart(p, sel, maxQ);
            flash();
        }
        const addMain = mkAdd();

        // description: on phones a long one is shrunk to a few lines with a Read more / Show less button
        const descText = p.description || "";
        const longDesc = descText.length > 120;
        const descEl = el("p", { class: "desc" + (longDesc ? " clamp" : "") }, descText);
        const descMore = longDesc ? el("button", {
            type: "button",
            class: "more",
            "aria-expanded": "false",
            onclick: (ev) => {
                const open = descEl.classList.toggle("open");
                ev.currentTarget.textContent = open ? "Show less" : "Read more";
                ev.currentTarget.setAttribute("aria-expanded", String(open));
            }
        }, "Read more") : null;

        $("product").replaceChildren(
            el("div", { class: "gal" }, main, thumbs),
            el("div", { class: "det" },
                p.category ? el("span", { class: "cat" }, p.category) : null,
                el("h1", {}, p.name),
                el("div", { class: "price big" }, money(price(p)), p.salePrice > 0 ? el("s", {}, money(p.price)) : null),
                descEl, descMore,
                gSize, gColour,
                el("h4", {}, "Quantity"),
                el("div", { class: "qty" }, el("button", { type: "button", onclick: () => setQty(-1) }, "−"), qtyNum, el("button", { type: "button", onclick: () => setQty(1) }, "+")),
                el("div", { class: "addrow" }, addMain),
                el("p", { class: "polnote" }, "Cash on delivery. Replacement available; refund only if the product arrives damaged. ", el("a", { href: "policies.html#returns" }, "Read our policies"))));
        $("pStatus").textContent = "";

        // phone-only bar at the bottom: price + Add to cart, shown once the main button is out of view
        const bar = el("div", { class: "sticky" },
            el("div", { class: "sp" }, el("div", { class: "price" }, money(price(p)), p.salePrice > 0 ? el("s", {}, money(p.price)) : null)),
            mkAdd());
        document.body.appendChild(bar);
        document.body.classList.add("has-sticky");
        if ("IntersectionObserver" in window) {
            watcher = new IntersectionObserver((en) => {
                const show = !en[0].isIntersecting;
                bar.classList.toggle("show", show);
                document.body.classList.toggle("sticky-on", show);
            });
            watcher.observe(addMain);
        } else {
            bar.classList.add("show");
            document.body.classList.add("sticky-on");
        }
    }

    function show(list) {
        const p = list.find((x) => x.id === wanted);
        if (!p) {
            removeBar();
            $("product").replaceChildren();
            $("pStatus").textContent = "Sorry, we could not find this product.";
            return;
        }
        render(p);
        // more suits from the SAME category
        const rel = p.category ? list.filter((x) => x.id !== p.id && x.category === p.category) : [];
        if (rel.length) {
            $("relTitle").textContent = "More in " + p.category;
            $("relGrid").replaceChildren(...rel.slice(0, 12).map((x, i) => K.card(x, i)));
            $("related").hidden = false;
        } else { $("related").hidden = true; }
    }
    K.onFresh = () => show(K.products); // newer data arrived: redraw
    K.loadProducts().then(show).catch((err) => { $("pStatus").textContent = err.message; });
})();
