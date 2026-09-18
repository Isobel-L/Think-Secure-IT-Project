/*
    Passphrase Maker intro effects

    Scroll reveals, counting numbers, the passphrase building itself word by
    word, a cursor spotlight on the point cards and a gentle hero parallax.
    Everything is decoration: without this script the intro reads the same.
*/

(function () {

    const intro = document.getElementById("phrase-intro");

    if (!intro) {
        return;
    }


    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;


    // Content only starts hidden once we know it will be revealed
    intro.classList.add("ai-ready");


    /* ------------------------------
       Passphrase split into words
    ------------------------------ */

    intro.querySelectorAll("[data-word-split]").forEach(function (code) {

        const parts = code.textContent.trim().split("-");

        code.textContent = "";

        parts.forEach(function (part, index) {

            if (index > 0) {

                const dash = document.createElement("span");
                dash.className = "ai-dash";
                dash.textContent = "-";
                dash.style.setProperty("--i", index);
                code.appendChild(dash);

            }

            const word = document.createElement("span");
            word.className = "ai-word";
            word.textContent = part;
            word.style.setProperty("--i", index);
            code.appendChild(word);

        });

    });


    /* ------------------------------
       Counting numbers
    ------------------------------ */

    function countUp(element) {

        const target = Number(element.dataset.countTo);

        if (reduceMotion) {
            element.textContent = target;
            return;
        }

        const duration = 1200;
        const start = performance.now();

        function step(now) {

            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);

            element.textContent = Math.round(target * eased);

            if (progress < 1) {
                requestAnimationFrame(step);
            }

        }

        element.textContent = "0";
        requestAnimationFrame(step);

    }


    /* ------------------------------
       Reveal on scroll
    ------------------------------ */

    function reveal(element) {

        element.classList.add("is-visible");

        element.querySelectorAll("[data-count-to]").forEach(countUp);

    }


    const revealItems = intro.querySelectorAll("[data-reveal]");

    if ("IntersectionObserver" in window && !reduceMotion) {

        const observer = new IntersectionObserver(function (entries) {

            entries.forEach(function (entry) {

                if (entry.isIntersecting) {

                    reveal(entry.target);

                    observer.unobserve(entry.target);

                }

            });

        }, { threshold: 0.25, rootMargin: "0px 0px -8% 0px" });

        revealItems.forEach(function (item) {
            observer.observe(item);
        });

    } else {

        revealItems.forEach(reveal);

    }


    /* ------------------------------
       Spotlight that follows the cursor
    ------------------------------ */

    intro.querySelectorAll("[data-spotlight]").forEach(function (card) {

        card.addEventListener("pointermove", function (event) {

            const box = card.getBoundingClientRect();

            card.style.setProperty("--x", (event.clientX - box.left) + "px");
            card.style.setProperty("--y", (event.clientY - box.top) + "px");

        });

    });


    /* ------------------------------
       Hero drifts and fades as you scroll away
    ------------------------------ */

    const hero = intro.querySelector("[data-hero-parallax]");

    if (hero && !reduceMotion) {

        let ticking = false;

        window.addEventListener("scroll", function () {

            if (ticking) {
                return;
            }

            ticking = true;

            requestAnimationFrame(function () {

                const progress = Math.min(window.scrollY / (window.innerHeight * 0.8), 1);

                hero.style.transform = "translateY(" + (progress * 60) + "px) scale(" + (1 - progress * 0.06) + ")";
                hero.style.opacity = String(1 - progress * 0.7);

                ticking = false;

            });

        }, { passive: true });

    }


    /* ------------------------------
       Starting to build: jump back to the top of the picker
    ------------------------------ */

    const beginButton = document.getElementById("begin-button");

    if (beginButton) {

        beginButton.addEventListener("click", function () {

            window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });

        });

    }

})();
