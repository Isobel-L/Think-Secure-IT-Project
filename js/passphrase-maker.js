/*
    Passphrase Maker

    Walks the user through four categories of twenty words. The four words
    they pick become a passphrase, and the emoji for those words are handed
    to the Sticker Studio through sessionStorage.
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


// Where the finished passphrase is left for the Sticker Studio
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
   State
------------------------------ */

// Which category the user is on
let currentStep = 0;

// The word chosen from each category so far
const chosenWords = [];



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


    pickerTitle.textContent = category.title;
    pickerHint.textContent = category.hint;


    // Progress bar
    const percent = (step / categories.length) * 100;

    progressFill.style.width = percent + "%";

    progressLabel.textContent =
        "Step " + (step + 1) + " of " + categories.length;


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
        label.textContent = item.word;


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
                + chosenWords[index].word
                + "</span>";

        } else {

            slot.innerHTML =
                "<span class=\"chosen-emoji\">?</span>"
                + "<span class=\"chosen-word\">"
                + category.key
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


    const phrase = buildPassphrase();


    passphraseText.textContent = phrase;

    statLength.textContent = phrase.length;


    // Big emoji row
    resultEmoji.innerHTML = "";

    chosenWords.forEach(function (item) {

        const span = document.createElement("span");

        span.textContent = item.emoji;

        resultEmoji.appendChild(span);

    });


    // Hand the choices to the Sticker Studio
    sessionStorage.setItem(PHRASE_STORAGE_NAME, JSON.stringify({
        phrase: phrase,
        words: chosenWords
    }));

}


/*
    Join the four words with hyphens
*/
function buildPassphrase() {

    return chosenWords.map(function (item) {
        return item.word;
    }).join("-");

}


/*
    Copy the passphrase to the clipboard
*/
copyButton.addEventListener("click", async function () {

    try {

        await navigator.clipboard.writeText(passphraseText.textContent);

        copyStatus.textContent = "Copied to your clipboard.";

    } catch (error) {

        copyStatus.textContent = "Could not copy automatically. "
            + "Select the text above and copy it yourself.";

    }

});


/*
    Clear everything and go back to the first category
*/
restartButton.addEventListener("click", function () {

    chosenWords.length = 0;

    sessionStorage.removeItem(PHRASE_STORAGE_NAME);

    copyStatus.textContent = "";

    resultSection.classList.add("hidden");
    pickerSection.classList.remove("hidden");

    showStep(0);

});
