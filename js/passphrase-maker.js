/*
    Passphrase Maker

    Walks the user through four categories of twenty words. The four words
    they pick become a passphrase, and the emoji for those words are handed
    to the Keychain Studio through sessionStorage.
*/


// Sections
const introSection = document.getElementById("phrase-intro");
const pickerSection = document.getElementById("phrase-picker");
const resultSection = document.getElementById("phrase-result");


// Picker elements
const pickerTitle = document.getElementById("picker-title");
const pickerHint = document.getElementById("picker-hint");
const wordGrid = document.getElementById("word-grid");
const chosenStrip = document.getElementById("chosen-strip");
const progressFill = document.getElementById("progress-fill");
const progressLabel = document.getElementById("progress-label");


// Buttons
const beginButton = document.getElementById("begin-button");
const backButton = document.getElementById("back-button");
const shuffleButton = document.getElementById("shuffle-button");
const copyButton = document.getElementById("copy-button");
const restartButton = document.getElementById("restart-button");


// Result elements
const resultEmoji = document.getElementById("result-emoji");
const passphraseText = document.getElementById("passphrase-text");
const copyStatus = document.getElementById("copy-status");
const statLength = document.getElementById("stat-length");
const swapList = document.getElementById("swap-list");
const swapReset = document.getElementById("swap-reset");


// Where the finished passphrase is left for the Keychain Studio
const PHRASE_STORAGE_NAME = "thinksecure-passphrase";



/* ------------------------------
   Word Banks
------------------------------ */

const categories = [

    {
        key: "place",
        title: "Choose a place",
        hint: "Where does your passphrase happen?",
        words: [
            { word: "Ocean", emoji: "🌊" },
            { word: "Forest", emoji: "🌲" },
            { word: "Desert", emoji: "🏜️" },
            { word: "Space", emoji: "🌌" },
            { word: "Mountain", emoji: "⛰️" },
            { word: "Beach", emoji: "🏖️" },
            { word: "Volcano", emoji: "🌋" },
            { word: "Island", emoji: "🏝️" },
            { word: "Rainbow", emoji: "🌈" },
            { word: "Sunset", emoji: "🌅" },
            { word: "Glacier", emoji: "🧊" },
            { word: "Jungle", emoji: "🌴" },
            { word: "Meadow", emoji: "🌾" },
            { word: "Canyon", emoji: "🏞️" },
            { word: "City", emoji: "🏙️" },
            { word: "Cottage", emoji: "🏡" },
            { word: "Cloud", emoji: "☁️" },
            { word: "Storm", emoji: "⛈️" },
            { word: "Moon", emoji: "🌙" },
            { word: "Snowfield", emoji: "❄️" }
        ]
    },

    {
        key: "animal",
        title: "Choose an animal",
        hint: "Who lives there?",
        words: [
            { word: "Gorilla", emoji: "🦍" },
            { word: "Giraffe", emoji: "🦒" },
            { word: "Whale", emoji: "🐋" },
            { word: "Tiger", emoji: "🐅" },
            { word: "Elephant", emoji: "🐘" },
            { word: "Penguin", emoji: "🐧" },
            { word: "Koala", emoji: "🐨" },
            { word: "Panda", emoji: "🐼" },
            { word: "Dolphin", emoji: "🐬" },
            { word: "Eagle", emoji: "🦅" },
            { word: "Fox", emoji: "🦊" },
            { word: "Owl", emoji: "🦉" },
            { word: "Kangaroo", emoji: "🦘" },
            { word: "Octopus", emoji: "🐙" },
            { word: "Camel", emoji: "🐫" },
            { word: "Zebra", emoji: "🦓" },
            { word: "Turtle", emoji: "🐢" },
            { word: "Wolf", emoji: "🐺" },
            { word: "Butterfly", emoji: "🦋" },
            { word: "Crocodile", emoji: "🐊" }
        ]
    },

    {
        key: "fruit",
        title: "Choose a fruit",
        hint: "What is it eating?",
        words: [
            { word: "Watermelon", emoji: "🍉" },
            { word: "Tomato", emoji: "🍅" },
            { word: "Banana", emoji: "🍌" },
            { word: "Apple", emoji: "🍎" },
            { word: "Grapes", emoji: "🍇" },
            { word: "Strawberry", emoji: "🍓" },
            { word: "Pineapple", emoji: "🍍" },
            { word: "Mango", emoji: "🥭" },
            { word: "Peach", emoji: "🍑" },
            { word: "Cherry", emoji: "🍒" },
            { word: "Lemon", emoji: "🍋" },
            { word: "Orange", emoji: "🍊" },
            { word: "Kiwi", emoji: "🥝" },
            { word: "Coconut", emoji: "🥥" },
            { word: "Avocado", emoji: "🥑" },
            { word: "Blueberry", emoji: "🫐" },
            { word: "Pear", emoji: "🍐" },
            { word: "Melon", emoji: "🍈" },
            { word: "Olive", emoji: "🫒" },
            { word: "Chilli", emoji: "🌶️" }
        ]
    },

    {
        key: "country",
        title: "Choose a country",
        hint: "And where in the world is all of this?",
        words: [
            { word: "Japan", emoji: "🇯🇵" },
            { word: "Korea", emoji: "🇰🇷" },
            { word: "China", emoji: "🇨🇳" },
            { word: "Vietnam", emoji: "🇻🇳" },
            { word: "Australia", emoji: "🇦🇺" },
            { word: "Thailand", emoji: "🇹🇭" },
            { word: "India", emoji: "🇮🇳" },
            { word: "Singapore", emoji: "🇸🇬" },
            { word: "Malaysia", emoji: "🇲🇾" },
            { word: "Indonesia", emoji: "🇮🇩" },
            { word: "Brazil", emoji: "🇧🇷" },
            { word: "Canada", emoji: "🇨🇦" },
            { word: "France", emoji: "🇫🇷" },
            { word: "Germany", emoji: "🇩🇪" },
            { word: "Italy", emoji: "🇮🇹" },
            { word: "Spain", emoji: "🇪🇸" },
            { word: "Mexico", emoji: "🇲🇽" },
            { word: "Egypt", emoji: "🇪🇬" },
            { word: "Kenya", emoji: "🇰🇪" },
            { word: "NewZealand", emoji: "🇳🇿" }
        ]
    }

];



/* ------------------------------
   Letter Swaps
------------------------------ */

// The symbols each letter can be swapped for. Only the spelling changes:
// the pictures, and the keychain's pictures, always follow the original words.
const SWAP_CHOICES = {
    a: ["@", "4"],
    b: ["8"],
    e: ["3"],
    g: ["9"],
    i: ["!", "1", "|"],
    l: ["1", "|"],
    o: ["0", "()"],
    s: ["$", "5"],
    t: ["7", "+"],
    v: ["()", "\\/"]
};



/* ------------------------------
   State
------------------------------ */

// Which category the user is on
let currentStep = 0;
let copyKey = "";
let copyVersion = 0;

// The word chosen from each category so far
const chosenWords = [];

// The swaps the user has picked, as letter → symbol
const swaps = {};



/* ------------------------------
   Moving Through The Steps
------------------------------ */

/*
    Leave the explanation and start picking words
*/
beginButton.addEventListener("click", function () {

    introSection.classList.add("hidden");
    pickerSection.classList.remove("hidden");

    showStep(0);

});


/*
    Draw the category the user is currently on
*/
function showStep(step) {

    currentStep = step;

    const category = categories[step];


    pickerTitle.textContent = I18n.t("passphrase.title." + category.key);
    pickerHint.textContent = I18n.t("passphrase.hint." + category.key);


    // Progress bar
    const percent = (step / categories.length) * 100;

    progressFill.style.width = percent + "%";

    progressLabel.textContent =
        I18n.t("passphrase.progress", { current: step + 1, total: categories.length });


    // The first category has nothing to go back to
    backButton.disabled = step === 0;


    drawChosenStrip();

    drawWordGrid(category);

}


/*
    Show the twenty options for this category
*/
function drawWordGrid(category) {

    wordGrid.innerHTML = "";


    category.words.forEach(function (item) {

        const button = document.createElement("button");

        button.type = "button";
        button.className = "word-button";


        const emoji = document.createElement("span");

        emoji.className = "word-emoji";
        emoji.textContent = item.emoji;


        const label = document.createElement("span");

        label.className = "word-label";
        label.textContent = displayWord(item);


        button.appendChild(emoji);
        button.appendChild(label);


        button.addEventListener("click", function () {
            chooseWord(item);
        });


        wordGrid.appendChild(button);

    });

}


/*
    Show the words picked so far above the grid
*/
function drawChosenStrip() {

    chosenStrip.innerHTML = "";


    categories.forEach(function (category, index) {

        const slot = document.createElement("div");

        slot.className = "chosen-slot";


        if (chosenWords[index]) {

            slot.classList.add("filled");

            slot.innerHTML =
                "<span class=\"chosen-emoji\">"
                + chosenWords[index].emoji
                + "</span><span class=\"chosen-word\">"
                + escapePhraseLabel(displayWord(chosenWords[index]))
                + "</span>";

        } else {

            slot.innerHTML =
                "<span class=\"chosen-emoji\">?</span>"
                + "<span class=\"chosen-word\">"
                + escapePhraseLabel(I18n.t("passphrase.category." + category.key))
                + "</span>";

        }


        chosenStrip.appendChild(slot);

    });

}


/*
    Record a choice and move on
*/
function chooseWord(item) {

    chosenWords[currentStep] = item;


    if (currentStep < categories.length - 1) {

        showStep(currentStep + 1);

    } else {

        showResult();

    }

}


/*
    Step back to the previous category
*/
backButton.addEventListener("click", function () {

    if (currentStep > 0) {

        showStep(currentStep - 1);

    }

});


/*
    Pick something at random for the user
*/
shuffleButton.addEventListener("click", function () {

    const words = categories[currentStep].words;

    const pick = words[Math.floor(Math.random() * words.length)];

    chooseWord(pick);

});



/* ------------------------------
   Result
------------------------------ */

/*
    Build the passphrase and show it
*/
function showResult() {

    pickerSection.classList.add("hidden");
    resultSection.classList.remove("hidden");


    // A new passphrase starts with its letters as they are
    clearSwaps();

    drawSwaps();

    showPhrase();


    // Big emoji row
    resultEmoji.innerHTML = "";

    chosenWords.forEach(function (item) {

        const span = document.createElement("span");

        span.textContent = item.emoji;

        resultEmoji.appendChild(span);

    });

}


/*
    Write the passphrase out, marking the letters that became symbols,
    and hand the new spelling on
*/
function showPhrase() {

    passphraseText.innerHTML = "";


    chosenWords.forEach(function (item, index) {

        if (index > 0) {
            passphraseText.append("-");
        }

        for (const character of item.word) {

            const symbol = swaps[character.toLowerCase()];

            if (symbol) {

                const mark = document.createElement("mark");
                mark.className = "pm-swapped";
                mark.textContent = symbol;
                passphraseText.appendChild(mark);

            } else {

                passphraseText.append(character);

            }

        }

    });


    statLength.textContent = buildPassphrase().length;

    swapReset.disabled = Object.keys(swaps).length === 0;

    storePassphrase();

}


/*
    Hand the choices to the Keychain Studio and the Password Checker.

    The Keychain Studio clears this as soon as it reads it, so a passphrase
    only ever exists for as long as its result screen is in front of you.
*/
function storePassphrase() {

    // Each word keeps its own name, which picks its picture, and carries the
    // spelling to print on the keychain
    sessionStorage.setItem(PHRASE_STORAGE_NAME, JSON.stringify({
        phrase: buildPassphrase(),
        words: chosenWords.map(function (item) {
            return { word: item.word, emoji: item.emoji, display: spell(item.word) };
        })
    }));

}


/*
    Coming back to a result screen that is still on display, for example
    with the browser back button, puts the passphrase back so the buttons
    on it keep working.
*/
window.addEventListener("pageshow", function () {

    const onResult = !resultSection.classList.contains("hidden");

    if (onResult && chosenWords.length === categories.length) {

        storePassphrase();

    }

});


/*
    Join the four words with hyphens, as the user has spelled them
*/
function buildPassphrase() {

    return chosenWords.map(function (item) {
        return spell(item.word);
    }).join("-");

}


/*
    A word with the chosen swaps applied, whatever the letter's case
*/
function spell(word) {

    return word.replace(/[a-z]/gi, function (character) {
        return swaps[character.toLowerCase()] || character;
    });

}


/*
    One choice for each swappable letter that appears in the passphrase
*/
function drawSwaps() {

    swapList.innerHTML = "";


    const letters = new Set();

    chosenWords.forEach(function (item) {

        for (const character of item.word.toLowerCase()) {

            if (SWAP_CHOICES[character]) {
                letters.add(character);
            }

        }

    });


    [...letters].sort().forEach(function (letter) {

        const choice = document.createElement("label");
        choice.className = "pm-swap";
        choice.classList.toggle("is-on", Boolean(swaps[letter]));

        const name = document.createElement("span");
        name.className = "pm-swap-letter";
        name.textContent = letter;

        const arrow = document.createElement("span");
        arrow.className = "pm-swap-arrow";
        arrow.setAttribute("aria-hidden", "true");
        arrow.textContent = "→";

        const select = document.createElement("select");
        select.dataset.letter = letter;
        select.setAttribute("aria-label", I18n.t("passphrase.swapLabel", { letter: letter }));

        const keep = document.createElement("option");
        keep.value = "";
        keep.textContent = I18n.t("passphrase.swapKeep", { letter: letter });
        select.appendChild(keep);

        SWAP_CHOICES[letter].forEach(function (symbol) {

            const option = document.createElement("option");
            option.value = symbol;
            option.textContent = symbol;
            select.appendChild(option);

        });

        select.value = swaps[letter] || "";

        choice.append(name, arrow, select);

        swapList.appendChild(choice);

    });

}


/*
    Use the symbol the user picked for a letter, or put the letter back
*/
swapList.addEventListener("change", function (event) {

    const select = event.target.closest("select[data-letter]");

    if (!select) {
        return;
    }


    const letter = select.dataset.letter;

    if (select.value) {
        swaps[letter] = select.value;
    } else {
        delete swaps[letter];
    }

    select.closest(".pm-swap").classList.toggle("is-on", Boolean(select.value));

    showPhrase();

});


/*
    Put every letter back
*/
swapReset.addEventListener("click", function () {

    clearSwaps();

    drawSwaps();

    showPhrase();

});


function clearSwaps() {

    Object.keys(swaps).forEach(function (letter) {
        delete swaps[letter];
    });

}


/*
    Copy the passphrase to the clipboard
*/
copyButton.addEventListener("click", async function () {

    const version = ++copyVersion;
    try {

        await navigator.clipboard.writeText(passphraseText.textContent);

        if (version !== copyVersion) return;
        copyKey = "passphrase.copySuccess";
        copyStatus.textContent = I18n.t(copyKey);

    } catch (error) {

        if (version !== copyVersion) return;
        copyKey = "passphrase.copyError";
        copyStatus.textContent = I18n.t(copyKey);

    }

});


/*
    Clear everything and go back to the first category
*/
restartButton.addEventListener("click", function () {

    chosenWords.length = 0;
    clearSwaps();
    ++copyVersion; copyKey = "";

    sessionStorage.removeItem(PHRASE_STORAGE_NAME);

    copyStatus.textContent = "";

    resultSection.classList.add("hidden");
    pickerSection.classList.remove("hidden");

    showStep(0);

});

function displayWord(item) { const label = I18n.t("passphrase.word." + item.word); return I18n.getLanguage() === "en" ? item.word : label + " " + item.word; }
function escapePhraseLabel(value) { return value.replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;", "'":"&#39;"}[char])); }
window.addEventListener("languagechange", () => { if (!pickerSection.classList.contains("hidden")) showStep(currentStep); if (!resultSection.classList.contains("hidden")) drawSwaps(); copyStatus.textContent = copyKey ? I18n.t(copyKey) : ""; });

