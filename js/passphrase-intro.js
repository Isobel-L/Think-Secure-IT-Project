/*
    Passphrase Maker intro effects

    Scroll reveals, counting numbers and the example passphrase building
    itself word by word. Everything is decoration: without this script the
    intro reads the same.
*/

(function () {

    const intro = document.getElementById("phrase-intro");
    const beginButton = document.getElementById("begin-button");

    if (!intro) {
        return;
    }


    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;


    // Content only starts hidden once we know it will be revealed
    intro.classList.add("pm-ready");


    /* ------------------------------
       Passphrase split into words
    ------------------------------ */

    intro.querySelectorAll("[data-word-split]").forEach(function (code) {

        const parts = code.textContent.trim().split("-");

        code.textContent = "";

        parts.forEach(function (part, index) {

            if (index > 0) {

                const dash = document.createElement("span");
                dash.className = "pm-dash";
                dash.textContent = "-";
                dash.style.setProperty("--i", index);
                code.appendChild(dash);

            }

            const word = document.createElement("span");
            word.className = "pm-word";
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

        const duration = 1100;
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

        }, { threshold: 0.2, rootMargin: "0px 0px -6% 0px" });

        revealItems.forEach(function (item) {
            observer.observe(item);
        });

    } else {

        revealItems.forEach(reveal);

    }


    /* ------------------------------
       Starting to build
    ------------------------------ */

    if (beginButton) {

        // The button in the hero does the same job as the one at the bottom
        intro.querySelectorAll("[data-begin]").forEach(function (button) {

            button.addEventListener("click", function () {
                beginButton.click();
            });

        });

        // The picker replaces a long page, so start it from the top
        beginButton.addEventListener("click", function () {

            window.scrollTo({ top: 0, behavior: "auto" });

        });

    }

})();
