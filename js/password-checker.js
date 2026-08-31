// ==========================================
// ThinkSecure Password Checker
// ==========================================


// ==========================================
// Get HTML elements
// ==========================================

const passwordForm = document.getElementById("passwordForm");
const passwordInput = document.getElementById("passwordInput");
const resultPanel = document.getElementById("resultPanel");
const togglePassword = document.getElementById("togglePassword");
const clearButton = document.getElementById("clearButton");

// Robot elements
const robotImage = document.getElementById("robotImage");
const crackerTitle = document.getElementById("crackerTitle");
const crackerMessage = document.getElementById("crackerMessage");


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

    // Prevent page refresh
    event.preventDefault();

    const password = passwordInput.value;


    // ======================================
    // Check empty input
    // ======================================

    if (!password) {

        renderEmpty("Enter an example password first.");

        passwordInput.focus();

        return;
    }


    // ======================================
    // Make sure zxcvbn has loaded
    // ======================================

    if (typeof zxcvbn !== "function") {

        renderEmpty(
            "The strength checker is still loading. Try again in a moment."
        );

        return;
    }


    // ======================================
    // Step 1: Password strength check
    // ======================================

    const strength = zxcvbn(password);


    // Change robot expression
    updateRobotExpression(strength.score);


    // Show strength result immediately
    // while HIBP is checking
    renderResult(
        strength,
        {
            status: "checking"
        }
    );


    // ======================================
    // Step 2: HIBP breach check
    // ======================================

    try {

        const breach =
            await checkPwnedPassword(password);


        renderResult(
            strength,
            breach
        );

    } catch (error) {

        console.error(
            "HIBP check failed:",
            error
        );


        // Password strength still works
        // even if HIBP fails
        renderResult(
            strength,
            {
                status: "error"
            }
        );
    }
});


// ==========================================
// Robot Expression
// ==========================================

function updateRobotExpression(score) {

    // --------------------------------------
    // Score 0
    // VERY WEAK
    // Angry
    // --------------------------------------

    if (score === 0) {

        robotImage.src =
            "../robotimage/angry.png";

        robotImage.alt =
            "Angry ThinkSecure Security Bot";

        crackerTitle.textContent =
            "Very Weak";

        crackerMessage.textContent =
            "That password is far too easy to guess. Try again!";

        return;
    }


    // --------------------------------------
    // Score 1
    // WEAK
    // Annoyed
    // --------------------------------------

    if (score === 1) {

        robotImage.src =
            "../robotimage/annoyed.png";

        robotImage.alt =
            "Annoyed ThinkSecure Security Bot";

        crackerTitle.textContent =
            "Weak";

        crackerMessage.textContent =
            "Still too predictable. Can you make it stronger?";

        return;
    }


    // --------------------------------------
    // Score 2
    // FAIR
    // Neutral
    // --------------------------------------

    if (score === 2) {

        robotImage.src =
            "../robotimage/neutral.png";

        robotImage.alt =
            "Neutral ThinkSecure Security Bot";

        crackerTitle.textContent =
            "Fair";

        crackerMessage.textContent =
            "Getting better, but I can still recognise some predictable patterns.";

        return;
    }


    // --------------------------------------
    // Score 3
    // STRONG
    // Happy
    // --------------------------------------

    if (score === 3) {

        robotImage.src =
            "../robotimage/happy.png";

        robotImage.alt =
            "Happy ThinkSecure Security Bot";

        crackerTitle.textContent =
            "Strong";

        crackerMessage.textContent =
            "Nice! This password is much harder to guess.";

        return;
    }


    // --------------------------------------
    // Score 4
    // VERY STRONG
    // Excited
    // --------------------------------------

    robotImage.src =
        "../robotimage/excited.png";

    robotImage.alt =
        "Excited ThinkSecure Security Bot";

    crackerTitle.textContent =
        "Very Strong";

    crackerMessage.textContent =
        "Excellent! You beat the password challenge!";
}


// ==========================================
// Show / Hide Password
// ==========================================

togglePassword.addEventListener("click", () => {

    const isHidden =
        passwordInput.type === "password";


    passwordInput.type =
        isHidden
            ? "text"
            : "password";


    togglePassword.textContent =
        isHidden
            ? "Hide"
            : "Show";
});


// ==========================================
// Clear Button
// ==========================================

clearButton.addEventListener("click", () => {

    // Clear input
    passwordInput.value = "";


    // Hide password again
    passwordInput.type = "password";


    togglePassword.textContent = "Show";


    // Reset robot to Neutral
    robotImage.src =
        "../robotimage/neutral.png";

    robotImage.alt =
        "Neutral ThinkSecure Security Bot";


    crackerTitle.textContent =
        "Password Challenge Ready";


    crackerMessage.textContent =
        "Think your example password is strong? Put it to the test.";


    // Reset result panel
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
    const score =
        strength.score;


    const label =
        strengthLabels[score];


    // ======================================
    // Visual risk level
    // ======================================

    const riskClass =
        score <= 1
            ? "risk-high"
            : score === 2
                ? "risk-medium"
                : "risk-low";


    // ======================================
    // Strength bar width
    //
    // Score 0 = 20%
    // Score 1 = 40%
    // Score 2 = 60%
    // Score 3 = 80%
    // Score 4 = 100%
    // ======================================

    const meterWidth =
        `${(score + 1) * 20}%`;


    // Build educational advice
    const advice =
        buildAdvice(
            strength,
            passwordInput.value.length
        );


    // ======================================
    // Render UI
    // ======================================

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

            <h3>
                What this means
            </h3>

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

            <h3>
                Breach check
            </h3>

            ${renderBreachStatus(breach)}

        </section>


        <!-- Improvement Advice -->

        <section class="feedback-section">

            <h3>
                How to improve it
            </h3>

            <ul>

                ${advice
                    .map(
                        (item) =>
                            `<li>${escapeHtml(item)}</li>`
                    )
                    .join("")}

            </ul>

        </section>


        <!-- Challenge -->

        <section class="challenge-next">

            ${
                score < 4

                    ? `
                        <h3>
                            🛠️ Your next challenge
                        </h3>

                        <p>
                            Change your example password
                            and test it again.
                            Can you make the Security Bot
                            excited?
                        </p>
                    `

                    : `
                        <h3>
                            🏆 Challenge Complete!
                        </h3>

                        <p>
                            Excellent!
                            You reached Very Strong.
                            Next, learn how a memorable
                            passphrase can also provide
                            strong security.
                        </p>

                        <p>
                            <a
                                href="passphrase-maker.html"
                                class="quiz-button"
                            >
                                Build a Passphrase →
                            </a>
                        </p>
                    `
            }

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

    // Very Weak / Weak
    if (score <= 1) {

        return (
            "This password looks predictable and could be guessed quickly by modern cracking tools."
        );
    }


    // Fair
    if (score === 2) {

        return (
            "This password has some useful complexity, but it still contains patterns that make it easier to guess."
        );
    }


    // Strong or Very Strong
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
            ?.filter(Boolean)
        || [];


    const warning =
        strength.feedback?.warning;


    const advice = [];


    // ======================================
    // zxcvbn warning
    // ======================================

    if (warning) {

        advice.push(warning);
    }


    // ======================================
    // zxcvbn suggestions
    // ======================================

    advice.push(
        ...suggestions
    );


    // ======================================
    // ThinkSecure educational advice
    // ======================================

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
    return [
        ...new Set(advice)
    ].slice(0, 5);
}


// ==========================================
// Display HIBP Result
// ==========================================

function renderBreachStatus(breach) {

    // ======================================
    // Still checking
    // ======================================

    if (breach.status === "checking") {

        return `
            <div class="breach-status">

                <span class="status-dot"></span>

                <p>
                    Checking known breached-password
                    data without sending your full
                    password...
                </p>

            </div>
        `;
    }


    // ======================================
    // API Error
    // ======================================

    if (breach.status === "error") {

        return `
            <div class="breach-status">

                <span class="status-dot"></span>

                <p>
                    The online breach check could not
                    be completed. The password strength
                    result above still works.
                </p>

            </div>
        `;
    }


    // ======================================
    // Password found
    // ======================================

    if (breach.found) {

        return `
            <div class="breach-status">

                <span class="status-dot"></span>

                <p>
                    This password appears in known
                    breach data
                    <strong>
                        ${breach.count.toLocaleString()}
                    </strong>
                    times.

                    Do not use it.
                </p>

            </div>
        `;
    }


    // ======================================
    // Password not found
    // ======================================

    return `
        <div class="breach-status">

            <span class="status-dot"></span>

            <p>
                This exact password was not found
                in the Have I Been Pwned password data.

                This does not guarantee that the
                password is secure.

                It should still be long and unique.
            </p>

        </div>
    `;
}


// ==========================================
// HIBP Pwned Passwords API
// ==========================================

async function checkPwnedPassword(password) {

    // ======================================
    // Convert password to SHA-1 locally
    // ======================================

    const hash =
        await sha1(password);


    // First 5 characters
    const prefix =
        hash.slice(0, 5);


    // Remaining hash
    const suffix =
        hash.slice(5);


    // ======================================
    // Send ONLY the first five hash
    // characters to HIBP
    // ======================================

    const response =
        await fetch(
            `https://api.pwnedpasswords.com/range/${prefix}`,
            {
                headers: {
                    "Add-Padding": "true"
                }
            }
        );


    // ======================================
    // Check API response
    // ======================================

    if (!response.ok) {

        throw new Error(
            "HIBP request failed"
        );
    }


    // ======================================
    // Read API response
    // ======================================

    const text =
        await response.text();


    // ======================================
    // Find our hash suffix locally
    // ======================================

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

                    returnedSuffix === suffix
                    &&
                    Number(count) > 0
            );


    // ======================================
    // Return result
    // ======================================

    return {

        status: "complete",

        found:
            Boolean(match),

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
// Prevent text from being interpreted
// as HTML
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