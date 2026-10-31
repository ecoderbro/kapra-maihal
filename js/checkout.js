// ===== Checkout page: order summary + customer details (the cart drawer only has a Checkout button) =====
(function() {
    const K = window.KM,
        C = K.C,
        $ = K.$,
        el = K.el,
        money = K.money,
        price = K.price,
        cart = K.cart;
    document.body.classList.add("page-checkout");
    const root = $("co");
    const vals = {}; // what the customer typed, kept if the page redraws (for example after editing the cart)
    let sending = false;

    function field(id, label, type, extra) {
        const attrs = Object.assign({ id, oninput: (e) => { vals[id] = e.target.value; } }, extra || {});
        const input = type === "area" ? el("textarea", Object.assign({ rows: "2" }, attrs)) : el("input", Object.assign({ type }, attrs));
        if (vals[id]) input.value = vals[id];
        return el("div", { class: "f" }, el("label", { for: id }, label), input, el("span", { class: "err", id: "e-" + id }));
    }

    function setErr(id, msg) {
        $(id).classList.toggle("bad", !!msg);
        $("e-" + id).textContent = msg || "";
        return !msg;
    }

    function validate() {
        let ok = true;
        const v = (id) => $(id).value.trim();
        ok = setErr("cName", v("cName").length >= 2 ? "" : "Please enter your full name.") && ok;
        ok = setErr("cPhone", /^\+?[0-9 ()\-]{7,20}$/.test(v("cPhone")) ? "" : "Enter a valid phone number.") && ok;
        ok = setErr("cEmail", !v("cEmail") || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v("cEmail")) ? "" : "Enter a valid email or leave it empty.") && ok;
        ok = setErr("cCity", v("cCity").length >= 2 ? "" : "Please enter your city.") && ok;
        ok = setErr("cAddr", v("cAddr").length >= 8 ? "" : "Please enter your full address.") && ok;
        return ok;
    }

    function banner(msg) {
        const b = $("banner");
        b.textContent = msg;
        b.hidden = !msg;
        if (msg) b.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    function render() {
        if (sending) return;
        const lines = cart.filter((l) => K.find(l.id));
        $("coStatus").textContent = "";
        if (!lines.length) {
            root.replaceChildren(el("div", { class: "empty" },
                el("h2", {}, "Your cart is empty"),
                el("p", { class: "note" }, "Add something you love, then come back to check out."),
                el("a", { class: "btn solid", href: "index.html#shop" }, "Start shopping")));
            return;
        }
        const t = K.totals();
        const items = lines.map((l) => {
            const p = K.find(l.id);
            return el("div", { class: "cs-line" }, K.img(K.photosFor(p, l.colour)[0], p.name),
                el("div", {}, el("strong", {}, p.name), el("small", {}, [l.size, l.colour].filter(Boolean).join(" · ") + (l.size || l.colour ? " · " : "") + "Qty " + l.qty)),
                el("div", { class: "price" }, money(price(p) * l.qty)));
        });
        const summary = el("aside", { class: "cosum" },
            el("h2", {}, "Order summary"), ...items,
            el("div", { class: "sum" },
                el("div", {}, el("span", {}, "Subtotal"), el("span", {}, money(t.sub))),
                t.fee ? el("div", {}, el("span", {}, "Delivery"), el("span", {}, money(t.fee))) : null,
                el("div", { class: "tot" }, el("span", {}, "Total to pay on delivery"), el("span", {}, money(t.total)))),
            el("button", { type: "button", class: "linkbtn", onclick: () => $("openCart").click() }, "Edit cart"));
        const form = el("form", { id: "co-form", novalidate: "novalidate", onsubmit: submit },
            el("h2", {}, "Your details"),
            el("div", { id: "banner", class: "banner", hidden: "hidden", role: "alert" }),
            field("cName", "Full name *", "text", { autocomplete: "name", maxlength: "100" }),
            field("cPhone", "Phone number *", "tel", { autocomplete: "tel", placeholder: "03xx xxxxxxx" }),
            field("cEmail", "Email (optional)", "email", { autocomplete: "email" }),
            field("cCity", "City *", "text", { autocomplete: "address-level2" }),
            field("cAddr", "Full delivery address *", "area", { autocomplete: "street-address", maxlength: "300" }),
            field("cNote", "Order note (optional)", "area", { maxlength: "500" }),
            el("div", { style: "position:absolute;left:-9999px", "aria-hidden": "true" }, el("input", { id: "cWeb", tabindex: "-1", autocomplete: "off" })),
            el("p", { class: "note" }, "Payment: cash on delivery. Prices are re-checked when you place the order. By placing your order you agree to our ", el("a", { href: "policies.html" }, "policies"), "."),
            el("button", { class: "btn solid", id: "placeBtn", type: "submit" }, "PLACE ORDER"),
            C.WHATSAPP ? el("p", { class: "note help" }, "Need help? ", el("a", { href: K.wa(K.hello), target: "_blank", rel: "noopener" }, "Chat with us on WhatsApp")) : null);
        root.replaceChildren(el("div", { class: "cogrid" }, el("div", { class: "cofm" }, form), summary));
    }

    async function submit(ev) {
        ev.preventDefault();
        banner("");
        if ($("cWeb").value) return; // honeypot
        if (!validate()) { // slide to the first wrong field
            const first = $("co-form").querySelector(".bad");
            if (first) {
                first.scrollIntoView({ behavior: "smooth", block: "center" });
                first.focus({ preventScroll: true });
            }
            return;
        }
        const btn = $("placeBtn");
        btn.disabled = true;
        btn.textContent = "SENDING…";
        sending = true;
        const v = (id) => $(id).value.trim();
        const body = {
            name: v("cName"),
            phone: v("cPhone"),
            email: v("cEmail"),
            city: v("cCity"),
            address: v("cAddr"),
            note: v("cNote"),
            items: cart.filter((l) => K.find(l.id)).map((l) => ({ id: l.id, size: l.size, colour: l.colour, qty: l.qty }))
        }; // no prices are sent
        try {
            const res = await fetch(C.APPS_SCRIPT_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(body) });
            const out = await res.json();
            if (!out.ok) throw new Error(out.error || "Could not save your order.");
            cart.length = 0;
            K.saveCart();
            K.renderBadge(); // success only after the sheet confirmed it
            const wa = C.WHATSAPP ? el("a", {
                class: "btn solid",
                style: "margin-top:1rem",
                target: "_blank",
                rel: "noopener",
                href: K.wa("Hello " + C.NAME + ", I placed order " + out.id + ".")
            }, "Message us on WhatsApp") : null;
            root.replaceChildren(el("div", { class: "ok" }, el("h3", {}, "Order received"),
                el("p", {}, "Your order number is "), el("strong", {}, out.id),
                el("p", { style: "margin-top:.6rem" }, "Total to pay on delivery: " + money(out.total) + ". We will contact you to confirm your order."),
                wa,
                el("a", { class: "btn outline", style: "margin-top:.8rem", href: "index.html#shop" }, "Continue shopping")));
            window.scrollTo({ top: 0, behavior: "smooth" });
            K.loadProducts(true).catch(() => {}); // refresh stock
        } catch (err) {
            sending = false;
            banner("Your order was NOT saved. " + err.message + " Please try again.");
            btn.disabled = false;
            btn.textContent = "PLACE ORDER";
        }
    }

    K.onCartChange = render; // editing the cart in the drawer updates this page
    $("coStatus").textContent = "Loading…";
    K.loadProducts().then(render).catch((err) => { $("coStatus").textContent = err.message; });
})();
