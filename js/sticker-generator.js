/*
    Sticker Studio

    Takes the four words picked in the Passphrase Maker and draws their emoji
    onto a canvas, which the user can then download as a PNG. No image
    generation service is involved, so this works offline.
*/


// Sections
const noPhraseSection = document.getElementById("no-phrase");
const studio = document.getElementById("studio");


// Panel elements
const studioWords = document.getElementById("studio-words");
const layoutOptions = document.getElementById("layout-options");
const backgroundOptions = document.getElementById("background-options");
const showLabels = document.getElementById("show-labels");
const showPhrase = document.getElementById("show-phrase");
const downloadButton = document.getElementById("download-button");


// Canvas
const canvas = document.getElementById("sticker-canvas");
const context = canvas.getContext("2d");


// Where the Passphrase Maker leaves the chosen words
const PHRASE_STORAGE_NAME = "thinksecure-passphrase";


// Fonts that cover colour emoji across the common platforms
const EMOJI_FONT = "\"Apple Color Emoji\", \"Segoe UI Emoji\", "
    + "\"Noto Color Emoji\", sans-serif";

const TEXT_FONT = 'Arial, "Microsoft YaHei", "PingFang SC", sans-serif';


// Colours, kept in step with the stylesheet
const NAVY = "#0b2545";
const BLUE = "#0b57a4";
const LIGHT = "#f4f6f8";


// Current options
let layout = "grid";
let background = "light";


// The words handed over by the Passphrase Maker
let passphrase = null;



/* ------------------------------
   Start Up
------------------------------ */

loadPassphrase();


/*
    Read the choices made in the Passphrase Maker
*/
function loadPassphrase() {

    const stored = sessionStorage.getItem(PHRASE_STORAGE_NAME);


    if (!stored) {

        noPhraseSection.classList.remove("hidden");

        return;
    }


    try {

        passphrase = JSON.parse(stored);

    } catch (error) {

        noPhraseSection.classList.remove("hidden");

        return;
    }


    // Anything other than four complete words means starting again
    if (!passphrase || typeof passphrase.phrase !== "string" || !Array.isArray(passphrase.words) || passphrase.words.length !== 4 || !passphrase.words.every(item => item && typeof item.word === "string" && item.word && typeof item.emoji === "string")) {

        noPhraseSection.classList.remove("hidden");

        return;
    }


    studio.classList.remove("hidden");

    drawWordList();

    drawSticker();

}


/*
    Show the four words down the side of the panel
*/
function drawWordList() {

    studioWords.innerHTML = "";


    passphrase.words.forEach(function (item) {

        const chip = document.createElement("div");

        chip.className = "studio-word";

        const emoji = document.createElement("span");
        emoji.className = "studio-emoji"; emoji.textContent = item.emoji;
        const label = document.createElement("span");
        const key = "passphrase.word." + item.word;
        const translated = window.ThinkSecureLocales[I18n.getLanguage()]?.[key];
        label.textContent = I18n.getLanguage() !== "en" && translated ? translated + " " + item.word : item.word;
        chip.append(emoji, label);


        studioWords.appendChild(chip);

    });

}



/* ------------------------------
   Options
------------------------------ */

/*
    Square or wide
*/
layoutOptions.addEventListener("click", function (event) {

    const button = event.target.closest(".option-button");

    if (!button) {
        return;
    }


    selectOption(layoutOptions, button);

    layout = button.dataset.layout;

    drawSticker();

});


/*
    Light, navy or transparent
*/
backgroundOptions.addEventListener("click", function (event) {

    const button = event.target.closest(".option-button");

    if (!button) {
        return;
    }


    selectOption(backgroundOptions, button);

    background = button.dataset.background;

    drawSticker();

});


/*
    Move the highlight within a group of option buttons
*/
function selectOption(group, button) {

    group.querySelectorAll(".option-button").forEach(function (item) {
        item.classList.remove("selected");
    });

    button.classList.add("selected");

}


// Redraw whenever the text options change
showLabels.addEventListener("change", drawSticker);
showPhrase.addEventListener("change", drawSticker);



/* ------------------------------
   Drawing The Sticker
------------------------------ */

/*
    Redraw the whole canvas from the current options
*/
function drawSticker() {

    // Wide stickers are a different shape to square ones
    if (layout === "row") {

        canvas.width = 1600;
        canvas.height = 800;

    } else {

        canvas.width = 1000;
        canvas.height = 1000;

    }


    context.clearRect(0, 0, canvas.width, canvas.height);

    drawBackground();

    drawHeading();

    drawEmoji();

    drawFooterText();


    // Point the download link at the picture just drawn
    downloadButton.href = canvas.toDataURL("image/png");
    downloadButton.download = buildFileName();

}


/*
    Fill the card and draw its border
*/
function drawBackground() {

    const inset = 24;
    const radius = 60;


    // A transparent sticker still needs its white die-cut edge
    if (background !== "transparent") {

        context.fillStyle = background === "navy" ? NAVY : LIGHT;

        roundedRectangle(0, 0, canvas.width, canvas.height, radius);

        context.fill();

    }


    // Die-cut border
    context.strokeStyle = background === "navy" ? "#ffffff" : NAVY;
    context.lineWidth = 14;

    roundedRectangle(
        inset,
        inset,
        canvas.width - (inset * 2),
        canvas.height - (inset * 2),
        radius - 10
    );

    context.stroke();


    drawChequeredBand();

}


/*
    The navy and white chequered band along the bottom of the card
*/
function drawChequeredBand() {

    const square = 26;

    const top = canvas.height - 24 - (square * 2);

    const left = 24 + 7;
    const right = canvas.width - 24 - 7;

    const width = right - left;


    context.save();

    // Keep the band inside the rounded card
    roundedRectangle(24, 24, canvas.width - 48, canvas.height - 48, 50);
    context.clip();


    const columns = Math.ceil(width / square);

    for (let row = 0; row < 2; row = row + 1) {

        for (let column = 0; column < columns; column = column + 1) {

            const isDark = (row + column) % 2 === 0;

            context.fillStyle = isDark ? NAVY : "#ffffff";

            context.fillRect(
                left + (column * square),
                top + (row * square),
                square,
                square
            );

        }

    }

    context.restore();

}


/*
    The wordmark across the top
*/
function drawHeading() {

    context.fillStyle = background === "navy" ? "#ffffff" : NAVY;

    context.textAlign = "center";
    context.textBaseline = "middle";


    context.font = "bold 52px " + TEXT_FONT;

    context.fillText("THINKSECURE", canvas.width / 2, 118);


    context.fillStyle = background === "navy" ? "#9fc2e8" : BLUE;

    context.font = "28px " + TEXT_FONT;

    context.fillText(I18n.t("sticker.canvasTitle"), canvas.width / 2, 172);

}


/*
    The four pictures, either two by two or in a single row
*/
function drawEmoji() {

    const cells = buildCellPositions();


    passphrase.words.forEach(function (item, index) {

        const cell = cells[index];


        context.textAlign = "center";
        context.textBaseline = "middle";


        // The picture
        context.font = cell.size + "px " + EMOJI_FONT;

        context.fillText(item.emoji, cell.x, cell.y);


        // The word under it
        if (showLabels.checked) {

            context.fillStyle = background === "navy" ? "#ffffff" : NAVY;

            context.font = "bold " + cell.labelSize + "px " + TEXT_FONT;

            let labelSize = cell.labelSize;
            const maxWidth = layout === "row" ? canvas.width / 4 - 40 : canvas.width * 0.4 - 40;
            while (context.measureText(item.word.toUpperCase()).width > maxWidth && labelSize > 16) { labelSize -= 2; context.font = "bold " + labelSize + "px " + TEXT_FONT; }
            context.fillText(item.word.toUpperCase(), cell.x, cell.labelY);

        }

    });

}


/*
    Work out where each picture sits for the current layout
*/
function buildCellPositions() {

    if (layout === "row") {

        const size = 200;

        const spacing = canvas.width / 4;

        return passphrase.words.map(function (item, index) {

            return {
                x: spacing * index + (spacing / 2),
                y: 390,
                size: size,
                labelSize: 34,
                labelY: 390 + (size / 2) + 48
            };

        });

    }


    // Two by two
    const size = 160;

    const columnX = [canvas.width * 0.3, canvas.width * 0.7];
    const rowY = [360, 650];

    return passphrase.words.map(function (item, index) {

        const y = rowY[Math.floor(index / 2)];

        return {
            x: columnX[index % 2],
            y: y,
            size: size,
            labelSize: 36,
            labelY: y + (size / 2) + 45
        };

    });

}


/*
    The full passphrase along the bottom, when the user asks for it
*/
function drawFooterText() {

    if (!showPhrase.checked) {
        return;
    }


    context.fillStyle = background === "navy" ? "#ffffff" : BLUE;

    context.textAlign = "center";
    context.textBaseline = "middle";


    // Shrink the text until the passphrase fits inside the border
    const maximum = canvas.width - 160;

    let fontSize = 44;

    context.font = "bold " + fontSize + "px " + TEXT_FONT;

    while (context.measureText(passphrase.phrase).width > maximum
        && fontSize > 16) {

        fontSize = fontSize - 2;

        context.font = "bold " + fontSize + "px " + TEXT_FONT;

    }


    context.fillText(
        passphrase.phrase,
        canvas.width / 2,
        canvas.height - 132
    );

}


/*
    A rounded rectangle path, used for the card and its border
*/
function roundedRectangle(x, y, width, height, radius) {

    context.beginPath();

    context.moveTo(x + radius, y);

    context.lineTo(x + width - radius, y);
    context.quadraticCurveTo(x + width, y, x + width, y + radius);

    context.lineTo(x + width, y + height - radius);
    context.quadraticCurveTo(
        x + width,
        y + height,
        x + width - radius,
        y + height
    );

    context.lineTo(x + radius, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - radius);

    context.lineTo(x, y + radius);
    context.quadraticCurveTo(x, y, x + radius, y);

    context.closePath();

}


/*
    Name the download after the words on the sticker
*/
function buildFileName() {

    const words = passphrase.words.map(function (item) {
        return item.word.toLowerCase();
    }).join("-");

    return "thinksecure-" + words + ".png";

}

window.addEventListener("languagechange", () => { if (!studio.classList.contains("hidden")) { drawWordList(); drawSticker(); } });

