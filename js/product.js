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

    function render(p) {
        document.title = p.name + " — Kapra Maihal";
        const sel = { size: p.sizes.length === 1 ? p.sizes[0] : "", colour: p.colours.length === 1 ? p.colours[0] : "", qty: 1 };

        // left: big photo + thumbnails (they change when a colour is picked)
        const main = el("div", { class: "main" });
        const thumbs = el("div", { class: "thumbs" });
        function setPhotos(list) {
            main.replaceChildren(img(list[0], p.name));
            thumbs.replaceChildren(...(list.length > 1 ? list.map((src, i) =>
                el("button", {
                    class: i ? "" : "on",
                    "aria-label": "Photo " + (i + 1),
                    onclick: (ev) => {
                        main.replaceChildren(img(src, p.name));
                        thumbs.querySelectorAll("button").forEach((b) => b.classList.remove("on"));
                        ev.currentTarget.classList.add("on");
                    }
                }, img(src, ""))) : []));
        }
        setPhotos(K.photosFor(p, sel.colour)); // single-colour products show that colour's photos straight away

        // right: options
        function group(label, values, key) {
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
            return el("div", { class: "grp" }, el("h4", {}, label), row, err);
        }
        const gSize = group("Size", p.sizes, "size"),
            gColour = group("Colour", p.colours, "colour");
        const qtyNum = el("strong", {}, "1");
        const maxQ = Math.min(C.MAX_QTY, Math.max(p.stock, 1));
        const setQty = (d) => {
            sel.qty = Math.min(maxQ, Math.max(1, sel.qty + d));
            qtyNum.textContent = sel.qty;
        };
        const soldOut = p.stock <= 0;

        const add = el("button", {
            class: "btn solid",
            disabled: soldOut ? "disabled" : null,
            onclick: () => {
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
            }
        }, soldOut ? "Sold out" : "Add to cart");

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
                el("div", { class: "addrow" }, add)));
        $("pStatus").textContent = "";
    }

    function show(list) {
        const p = list.find((x) => x.id === wanted);
        if (!p) {
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