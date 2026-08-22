// ==========================================
// Get HTML elements
// ==========================================

const passwordForm = document.getElementById("passwordForm");
const passwordInput = document.getElementById("passwordInput");
const resultPanel = document.getElementById("resultPanel");
const togglePassword = document.getElementById("togglePassword");
const clearButton = document.getElementById("clearButton");


// ==========================================
// Password strength labels
// zxcvbn returns a score from 0 to 4
// ==========================================

const strengthLabels = [
    "Very weak",
    "Weak",
    "Fair",
    "Strong",
    "Very strong"
];


// ==========================================
// Check Password
// ==========================================

passwordForm.addEventListener("submit", async (event) => {

    // Prevent the page from refreshing
    event.preventDefault();

    const password = passwordInput.value;

    // Check if the input is empty
    if (!password) {
        renderEmpty("Enter an example password first.");
        passwordInput.focus();
        return;
    }

    // Make sure zxcvbn has loaded
    if (typeof zxcvbn !== "function") {
        renderEmpty(
            "The strength checker is still loading. Try again in a moment."
        );
        return;
    }

    // --------------------------------------
    // Step 1: Check password strength
    // --------------------------------------

    const strength = zxcvbn(password);

    // Show the strength result immediately
    // while HIBP is still checking
    renderResult(strength, {
        status: "checking"
    });


    // --------------------------------------
    // Step 2: Check HIBP breach database
    // --------------------------------------

    try {

        const breach = await checkPwnedPassword(password);

        renderResult(strength, breach);

    } catch (error) {

        console.error("HIBP check failed:", error);

        // Strength checker still works
        // even if HIBP is unavailable
        renderResult(strength, {
            status: "error"
        });
    }
});


// ==========================================
// Show / Hide Password
// ==========================================

togglePassword.addEventListener("click", () => {

    const isHidden = passwordInput.type === "password";

    passwordInput.type =
        isHidden ? "text" : "password";

    togglePassword.textContent =
        isHidden ? "Hide" : "Show";
});


// ==========================================
// Clear Button
// ==========================================

clearButton.addEventListener("click", () => {

    passwordInput.value = "";

    passwordInput.type = "password";

    togglePassword.textContent = "Show";

    renderEmpty(
        "Enter an example password to see its strength, risks, and improvement tips."
    );

    passwordInput.focus();
});


// ==========================================
// Empty Result Panel
// ==========================================

function renderEmpty(message) {

    resultPanel.className =
        "result-panel is-empty";

    resultPanel.innerHTML = `
        <div class="empty-state">

            <h2>Ready to check</h2>

            <p>
                ${escapeHtml(message)}
            </p>

        </div>
    `;
}


// ==========================================
// Display Password Results
// ==========================================

function renderResult(strength, breach) {

    // zxcvbn score: 0 - 4
    const score = strength.score;

    const label =
        strengthLabels[score];


    // --------------------------------------
    // Decide the visual risk level
    // --------------------------------------

    const riskClass =
        score <= 1
            ? "risk-high"
            : score === 2
                ? "risk-medium"
                : "risk-low";


    // --------------------------------------
    // Strength bar width
    //
    // Score 0 = 20%
    // Score 1 = 40%
    // Score 2 = 60%
    // Score 3 = 80%
    // Score 4 = 100%
    // --------------------------------------

    const meterWidth =
        `${(score + 1) * 20}%`;


    // Build improvement advice
    const advice =
        buildAdvice(
            strength,
            passwordInput.value.length
        );


    // --------------------------------------
    // Render result
    // --------------------------------------

    resultPanel.className =
        `result-panel ${riskClass}`;

    resultPanel.innerHTML = `

        <div class="result-header">

            <div>

                <p class="score-label">
                    Password strength
                </p>

                <h2 class="strength-title">
                    ${label}
                </h2>

            </div>

        </div>


        <!-- Password Strength Bar -->

        <div
            class="meter"
            aria-label="Password strength: ${label}"
        >

            <div
                class="meter-fill"
                style="width: ${meterWidth}"
            ></div>

        </div>


        <!-- Strength Explanation -->

        <section class="feedback-section">

            <h3>What this means</h3>

            <p>
                ${escapeHtml(
                    getStrengthSummary(
                        score,
                        strength.guesses_log10
                    )
                )}
            </p>

        </section>


        <!-- HIBP Breach Check -->

        <section class="feedback-section">

            <h3>Breach check</h3>

            ${renderBreachStatus(breach)}

        </section>


        <!-- Improvement Advice -->

        <section class="feedback-section">

            <h3>How to improve it</h3>

            <ul>

                ${advice
                    .map(
                        (item) =>
                            `<li>${escapeHtml(item)}</li>`
                    )
                    .join("")}

            </ul>

        </section>
    `;
}


// ==========================================
// Explain Password Strength
// ==========================================

function getStrengthSummary(
    score,
    guessesLog10
) {

    if (score <= 1) {

        return (
            "This password looks predictable and could be guessed quickly by modern cracking tools."
        );
    }


    if (score === 2) {

        return (
            "This password has some useful complexity, but it still contains patterns that make it easier to guess."
        );
    }


    if (guessesLog10 >= 12) {

        return (
            "This password is difficult to guess because it has enough length and less obvious structure."
        );
    }


    return (
        "This password is stronger than common passwords, but it can still be improved with more length and uniqueness."
    );
}


// ==========================================
// Create Improvement Advice
// ==========================================

function buildAdvice(
    strength,
    passwordLength
) {

    const suggestions =
        strength.feedback?.suggestions
            ?.filter(Boolean) || [];

    const warning =
        strength.feedback?.warning;

    const advice = [];


    // zxcvbn warning
    if (warning) {
        advice.push(warning);
    }


    // zxcvbn suggestions
    advice.push(...suggestions);


    // ThinkSecure educational advice
    if (passwordLength < 14) {

        advice.push(
            "Make it longer. A passphrase with 4 or more unrelated words can be easier to remember and harder to guess."
        );
    }


    advice.push(
        "Use a unique password for every account."
    );


    advice.push(
        "Consider using a password manager to create and store strong passwords."
    );


    // Remove duplicates
    // Maximum 5 suggestions
    return [...new Set(advice)]
        .slice(0, 5);
}


// ==========================================
// Display HIBP Result
// ==========================================

function renderBreachStatus(breach) {


    // Still checking
    if (breach.status === "checking") {

        return `
            <div class="breach-status">

                <span class="status-dot"></span>

                <p>
                    Checking known breached-password data
                    without sending your full password...
                </p>

            </div>
        `;
    }


    // API error
    if (breach.status === "error") {

        return `
            <div class="breach-status">

                <span class="status-dot"></span>

                <p>
                    The online breach check could not be completed.
                    The password strength result above still works.
                </p>

            </div>
        `;
    }


    // Password found in breaches
    if (breach.found) {

        return `
            <div class="breach-status">

                <span class="status-dot"></span>

                <p>
                    This password appears in known breach data
                    ${breach.count.toLocaleString()} times.
                    Do not use it.
                </p>

            </div>
        `;
    }


    // Not found
    return `
        <div class="breach-status">

            <span class="status-dot"></span>

            <p>
                This exact password was not found in the
                Have I Been Pwned password data.
                This does not guarantee that the password is secure.
                It should still be long and unique.
            </p>

        </div>
    `;
}


// ==========================================
// HIBP Pwned Passwords API
// ==========================================

async function checkPwnedPassword(password) {


    // --------------------------------------
    // Convert password to SHA-1 locally
    // --------------------------------------

    const hash =
        await sha1(password);


    // First 5 characters
    const prefix =
        hash.slice(0, 5);


    // Remaining hash
    const suffix =
        hash.slice(5);


    // --------------------------------------
    // Send ONLY the first 5 hash characters
    // to HIBP
    // --------------------------------------

    const response =
        await fetch(
            `https://api.pwnedpasswords.com/range/${prefix}`,
            {
                headers: {
                    "Add-Padding": "true"
                }
            }
        );


    if (!response.ok) {

        throw new Error(
            "HIBP request failed"
        );
    }


    // --------------------------------------
    // Read API response
    // --------------------------------------

    const text =
        await response.text();


    // --------------------------------------
    // Find our hash suffix locally
    // --------------------------------------

    const match =
        text
            .split("\n")
            .map(
                (line) =>
                    line
                        .trim()
                        .split(":")
            )
            .find(
                ([returnedSuffix, count]) =>
                    returnedSuffix === suffix &&
                    Number(count) > 0
            );


    return {

        status: "complete",

        found: Boolean(match),

        count:
            match
                ? Number(match[1])
                : 0
    };
}


// ==========================================
// SHA-1 Hash
// ==========================================

async function sha1(value) {

    const encoder =
        new TextEncoder();

    const data =
        encoder.encode(value);


    const digest =
        await crypto.subtle.digest(
            "SHA-1",
            data
        );


    return [
        ...new Uint8Array(digest)
    ]
        .map(
            (byte) =>
                byte
                    .toString(16)
                    .padStart(2, "0")
        )
        .join("")
        .toUpperCase();
}


// ==========================================
// Escape HTML
// Prevent text from being interpreted as HTML
// ==========================================

function escapeHtml(value) {

    return String(value)
        .replace(
            /[&<>"']/g,
            (char) => {

                const entities = {

                    "&": "&amp;",

                    "<": "&lt;",

                    ">": "&gt;",

                    '"': "&quot;",

                    "'": "&#039;"
                };


                return entities[char];
            }
        );
}
