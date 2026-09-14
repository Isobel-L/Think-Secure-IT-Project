/*
    Sticker Studio

    Takes the four words picked in the Passphrase Maker and draws them onto a
    canvas: the place as a background picture, the other three as emoji in a
    row. The user can then download it as a PNG. No image generation service
    is involved.
*/


// Sections
const noPhraseSection = document.getElementById("no-phrase");
const studio = document.getElementById("studio");


// Panel elements
const studioWords = document.getElementById("studio-words");
const layoutOptions = document.getElementById("layout-options");
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


// The Passphrase Maker hands the words over in category order:
// place, animal, fruit, country. The place becomes the background picture
// and the rest sit in a row, left to right: country, fruit, animal.
const PLACE_INDEX = 0;
const ROW_ORDER = [3, 2, 1];


// One picture per place word, named after the word
const BACKGROUND_FOLDER = "../Images/BackGround/";


// Current options
let layout = "grid";


// The background picture for the current passphrase, once it has loaded
let backgroundImage = null;


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


    // A passphrase is good for one sticker. Clearing it as soon as it is
    // read means leaving this page and coming back always needs a freshly
    // built passphrase rather than quietly reusing the last one.
    sessionStorage.removeItem(PHRASE_STORAGE_NAME);


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

    loadBackgroundImage();

}


/*
    Fetch the picture for the chosen place, then redraw with it.
    Until it arrives, or if it is missing, the card stays plain navy.
*/
function loadBackgroundImage() {

    const image = new Image();

    image.addEventListener("load", function () {

        backgroundImage = image;

        drawSticker();

    });

    image.src = BACKGROUND_FOLDER + passphrase.words[PLACE_INDEX].word + ".png";

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
    try {

        downloadButton.href = canvas.toDataURL("image/png");
        downloadButton.download = buildFileName();

    } catch (error) {

        // Browsers refuse to export a canvas holding a picture loaded
        // straight from disk (file://). Served over http it works.
        downloadButton.removeAttribute("href");

    }

}


/*
    Fill the card with the place picture and draw its border
*/
function drawBackground() {

    const inset = 24;
    const radius = 60;


    context.save();

    roundedRectangle(0, 0, canvas.width, canvas.height, radius);
    context.clip();


    context.fillStyle = NAVY;
    context.fillRect(0, 0, canvas.width, canvas.height);


    if (backgroundImage) {

        drawImageCover(backgroundImage);

    }


    // Darken the top and bottom so the white text stays readable
    const top = context.createLinearGradient(0, 0, 0, 280);
    top.addColorStop(0, "rgba(11, 37, 69, 0.7)");
    top.addColorStop(1, "rgba(11, 37, 69, 0)");

    context.fillStyle = top;
    context.fillRect(0, 0, canvas.width, 280);


    const bottom = context.createLinearGradient(0, canvas.height - 320, 0, canvas.height);
    bottom.addColorStop(0, "rgba(11, 37, 69, 0)");
    bottom.addColorStop(1, "rgba(11, 37, 69, 0.75)");

    context.fillStyle = bottom;
    context.fillRect(0, canvas.height - 320, canvas.width, 320);

    context.restore();


    // Die-cut border
    context.strokeStyle = "#ffffff";
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
    Scale the picture to fill the whole card, cropping the overflow evenly
*/
function drawImageCover(image) {

    const scale = Math.max(
        canvas.width / image.naturalWidth,
        canvas.height / image.naturalHeight
    );

    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;

    context.drawImage(
        image,
        (canvas.width - width) / 2,
        (canvas.height - height) / 2,
        width,
        height
    );

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
    White text with a soft shadow, so it reads on any picture
*/
function withTextShadow(draw) {

    context.save();

    context.shadowColor = "rgba(0, 0, 0, 0.55)";
    context.shadowBlur = 12;
    context.shadowOffsetY = 3;

    draw();

    context.restore();

}


/*
    The wordmark across the top
*/
function drawHeading() {

    context.textAlign = "center";
    context.textBaseline = "middle";


    withTextShadow(function () {

        context.fillStyle = "#ffffff";
        context.font = "bold 52px " + TEXT_FONT;

        context.fillText("THINKSECURE", canvas.width / 2, 118);


        context.fillStyle = "#dbe9f7";
        context.font = "28px " + TEXT_FONT;

        context.fillText(I18n.t("sticker.canvasTitle"), canvas.width / 2, 172);

    });

}


/*
    Country, fruit and animal in a single row over the picture
*/
function drawEmoji() {

    const cells = buildCellPositions();


    ROW_ORDER.forEach(function (wordIndex, position) {

        const item = passphrase.words[wordIndex];
        const cell = cells[position];


        context.textAlign = "center";
        context.textBaseline = "middle";


        // A frosted disc behind the picture
        context.save();

        context.fillStyle = "rgba(255, 255, 255, 0.72)";
        context.shadowColor = "rgba(0, 0, 0, 0.3)";
        context.shadowBlur = 24;
        context.shadowOffsetY = 6;

        context.beginPath();
        context.arc(cell.x, cell.y, cell.size * 0.72, 0, Math.PI * 2);
        context.fill();

        context.restore();


        // The picture
        context.font = cell.size + "px " + EMOJI_FONT;

        context.fillText(item.emoji, cell.x, cell.y);


        // The word under it
        if (showLabels.checked) {

            const text = item.word.toUpperCase();
            const maxWidth = canvas.width / 3 - 40;

            let labelSize = cell.labelSize;

            context.font = "bold " + labelSize + "px " + TEXT_FONT;

            while (context.measureText(text).width > maxWidth && labelSize > 16) {

                labelSize = labelSize - 2;

                context.font = "bold " + labelSize + "px " + TEXT_FONT;

            }


            withTextShadow(function () {

                context.fillStyle = "#ffffff";

                context.fillText(text, cell.x, cell.labelY);

            });

        }

    });

}


/*
    Work out where each picture sits in the row for the current layout
*/
function buildCellPositions() {

    const wide = layout === "row";

    const size = wide ? 190 : 150;
    const y = wide ? 380 : 470;

    const spacing = canvas.width / ROW_ORDER.length;


    return ROW_ORDER.map(function (wordIndex, position) {

        return {
            x: spacing * position + (spacing / 2),
            y: y,
            size: size,
            labelSize: wide ? 36 : 34,
            labelY: y + (size * 0.72) + 44
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


    withTextShadow(function () {

        context.fillStyle = "#ffffff";

        context.fillText(
            passphrase.phrase,
            canvas.width / 2,
            canvas.height - 132
        );

    });

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

