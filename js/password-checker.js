const passwordForm = document.getElementById("passwordForm");
const passwordInput = document.getElementById("passwordInput");
const resultPanel = document.getElementById("resultPanel");
const togglePassword = document.getElementById("togglePassword");
const clearButton = document.getElementById("clearButton");

const strengthLabels = ["Very weak", "Weak", "Fair", "Strong", "Very strong"];

passwordForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const password = passwordInput.value;
    if (!password) {
        renderEmpty("Enter an example password first.");
        passwordInput.focus();
        return;
    }

    if (typeof zxcvbn !== "function") {
        renderEmpty("The strength checker is still loading. Try again in a moment.");
        return;
    }

    const strength = zxcvbn(password);
    renderResult(strength, { status: "checking" });

    try {
        const breach = await checkPwnedPassword(password);
        renderResult(strength, breach);
    } catch (error) {
        renderResult(strength, { status: "error" });
    }
});

togglePassword.addEventListener("click", () => {
    const isHidden = passwordInput.type === "password";
    passwordInput.type = isHidden ? "text" : "password";
    togglePassword.textContent = isHidden ? "Hide" : "Show";
});

clearButton.addEventListener("click", () => {
    passwordInput.value = "";
    passwordInput.type = "password";
    togglePassword.textContent = "Show";
    renderEmpty("Enter an example password to see its strength, risks, and improvement tips.");
    passwordInput.focus();
});

function renderEmpty(message) {
    resultPanel.className = "result-panel is-empty";
    resultPanel.innerHTML = `
        <div class="empty-state">
            <h2>Ready to check</h2>
            <p>${escapeHtml(message)}</p>
        </div>
    `;
}

function renderResult(strength, breach) {
    const score = strength.score;
    const label = strengthLabels[score];
    const riskClass = score <= 1 ? "risk-high" : score <= 2 ? "risk-medium" : "risk-low";
    const meterWidth = `${(score + 1) * 20}%`;
    const advice = buildAdvice(strength, passwordInput.value.length);

    resultPanel.className = `result-panel ${riskClass}`;
    resultPanel.innerHTML = `
        <div class="result-header">
            <div>
                <p class="score-label">Password strength</p>
                <h2 class="strength-title">${label}</h2>
            </div>
            <span class="score-badge">Score ${score}/4</span>
        </div>

        <div class="meter" aria-label="Strength score ${score} out of 4">
            <div class="meter-fill" style="width: ${meterWidth}"></div>
        </div>

        <section class="feedback-section">
            <h3>What this means</h3>
            <p>${escapeHtml(getStrengthSummary(score, strength.guesses_log10))}</p>
        </section>

        <section class="feedback-section">
            <h3>Breach check</h3>
            ${renderBreachStatus(breach)}
        </section>

        <section class="feedback-section">
            <h3>How to improve it</h3>
            <ul>
                ${advice.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
            </ul>
        </section>
    `;
}

function getStrengthSummary(score, guessesLog10) {
    if (score <= 1) {
        return "This password looks predictable and could be guessed quickly by modern cracking tools.";
    }

    if (score === 2) {
        return "This password has some useful complexity, but it still contains patterns that make it easier to guess.";
    }

    if (guessesLog10 >= 12) {
        return "This password is difficult to guess because it has enough length and less obvious structure.";
    }

    return "This password is stronger than common passwords, but it can still be improved with more length and uniqueness.";
}

function buildAdvice(strength, passwordLength) {
    const suggestions = strength.feedback.suggestions.filter(Boolean);
    const warning = strength.feedback.warning;
    const advice = [];

    if (warning) {
        advice.push(warning);
    }

    advice.push(...suggestions);

    if (passwordLength < 14) {
        advice.push("Make it longer. A passphrase with 4 or more unrelated words is easier to remember and harder to guess.");
    }

    advice.push("Use a unique password for every account.");
    advice.push("Consider using a password manager to create and store strong passwords.");

    return [...new Set(advice)].slice(0, 5);
}

function renderBreachStatus(breach) {
    if (breach.status === "checking") {
        return `
            <div class="breach-status">
                <span class="status-dot"></span>
                <p>Checking known breached-password data without sending your full password...</p>
            </div>
        `;
    }

    if (breach.status === "error") {
        return `
            <div class="breach-status">
                <span class="status-dot"></span>
                <p>The online breach check could not be completed. The strength result above still works.</p>
            </div>
        `;
    }

    if (breach.found) {
        return `
            <div class="breach-status">
                <span class="status-dot"></span>
                <p>This password appears in known breach data ${breach.count.toLocaleString()} times. Do not use it.</p>
            </div>
        `;
    }

    return `
        <div class="breach-status">
            <span class="status-dot"></span>
            <p>This exact password was not found in the Have I Been Pwned password data. It should still be long and unique.</p>
        </div>
    `;
}

async function checkPwnedPassword(password) {
    const hash = await sha1(password);
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
        headers: {
            "Add-Padding": "true"
        }
    });

    if (!response.ok) {
        throw new Error("HIBP request failed");
    }

    const text = await response.text();
    const match = text
        .split("\n")
        .map((line) => line.trim().split(":"))
        .find(([returnedSuffix, count]) => returnedSuffix === suffix && Number(count) > 0);

    return {
        status: "complete",
        found: Boolean(match),
        count: match ? Number(match[1]) : 0
    };
}

async function sha1(value) {
    const encoder = new TextEncoder();
    const data = encoder.encode(value);
    const digest = await crypto.subtle.digest("SHA-1", data);

    return [...new Uint8Array(digest)]
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase();
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "\"": "&quot;",
            "'": "&#39;"
        };

        return entities[char];
    });
}
