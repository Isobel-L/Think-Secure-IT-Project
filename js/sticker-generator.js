/*
    Keychain Studio

    Takes the four words picked in the Passphrase Maker and draws them as a
    keychain on a canvas: a ring, a main charm showing the animal and the
    fruit in their place, and a small round charm for the country. The user
    can then download it as a PNG with a transparent background. No image
    generation service is involved.
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

// The words on the keychain are always English, so the display face covers them
const TEXT_FONT = '"Fredoka", "Nunito", Arial, sans-serif';


// Colours, kept in step with the stylesheet
const NAVY = "#062952";


// The Passphrase Maker hands the words over in category order
const PLACE_INDEX = 0;
const ANIMAL_INDEX = 1;
const FRUIT_INDEX = 2;
const COUNTRY_INDEX = 3;


// One picture per word, named after the word, in its category folder.
// A folder with no picture for a word simply falls back to the emoji.
const IMAGE_FOLDERS = [
    "../Images/BackGround/",
    "../Images/Animal/",
    "../Images/Food/",
    "../Images/Country/"
];


// Cut-outs are saved as PNG, whole photographs as JPG
const IMAGE_TYPES = [".png", ".jpg"];


// Canvas size, and where each piece of the keychain sits on it
const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 1240;

const RING = { x: 560, y: 150, radius: 96, width: 26 };

// Each charm hangs from the hole in its tab, turned slightly about it
const MAIN_CHARM = { size: 720, holeX: 480, holeY: 404, turn: -0.05 };
const SIDE_CHARM = { radius: 162, holeX: 902, holeY: 448, turn: 0.17 };


// Current options
let shape = "square";


// The picture for each word, once it has loaded. Missing ones stay null.
const wordImages = [null, null, null, null];


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


    // A passphrase is good for one keychain. Clearing it as soon as it is
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

    drawKeychain();

    loadWordPictures();


    // The lettering is drawn again once the display face has arrived
    if (document.fonts && document.fonts.load) {

        document.fonts.load("600 40px Fredoka").then(drawKeychain, function () {});

    }

}


/*
    Fetch a picture for each chosen word, then redraw as they arrive.

    Each file type is tried in turn. A word with no picture at all keeps its
    emoji, so adding files to Images later needs no change here.
*/
function loadWordPictures() {

    passphrase.words.forEach(function (item, index) {

        tryPicture(index, item.word, 0);

    });

}


/*
    Try one file type for a word, moving on to the next if it is not there
*/
function tryPicture(index, word, typeIndex) {

    if (typeIndex >= IMAGE_TYPES.length) {
        return;
    }


    const image = new Image();

    image.addEventListener("load", function () {

        wordImages[index] = image;

        drawWordList();

        drawKeychain();

    });

    image.addEventListener("error", function () {

        tryPicture(index, word, typeIndex + 1);

    });

    image.src = IMAGE_FOLDERS[index] + word + IMAGE_TYPES[typeIndex];

}


/*
    Show the four words down the side of the panel, each with its picture
*/
function drawWordList() {

    studioWords.innerHTML = "";


    passphrase.words.forEach(function (item, index) {

        const row = document.createElement("div");

        row.className = "kc-word";


        const thumb = document.createElement("span");

        thumb.className = "kc-word-thumb";

        if (wordImages[index]) {

            const picture = document.createElement("img");

            picture.src = wordImages[index].src;
            picture.alt = "";

            thumb.appendChild(picture);

        } else {

            thumb.textContent = item.emoji;

        }


        const label = document.createElement("span");

        label.className = "kc-word-label";

        const key = "passphrase.word." + item.word;
        const translated = window.ThinkSecureLocales[I18n.getLanguage()]?.[key];

        label.textContent = I18n.getLanguage() !== "en" && translated ? translated + " " + item.word : item.word;


        row.append(thumb, label);

        studioWords.appendChild(row);

    });

}



/* ------------------------------
   Options
------------------------------ */

/*
    Square or round
*/
layoutOptions.addEventListener("click", function (event) {

    const button = event.target.closest(".option-button");

    if (!button) {
        return;
    }


    selectOption(layoutOptions, button);

    shape = button.dataset.layout;

    drawKeychain();

});


/*
    Move the highlight within a group of option buttons
*/
function selectOption(group, button) {

    group.querySelectorAll(".option-button").forEach(function (item) {
        item.classList.remove("selected");
        item.setAttribute("aria-pressed", "false");
    });

    button.classList.add("selected");
    button.setAttribute("aria-pressed", "true");

}


// Redraw whenever the text options change
showLabels.addEventListener("change", drawKeychain);
showPhrase.addEventListener("change", drawKeychain);



/* ------------------------------
   Drawing The Keychain
------------------------------ */

/*
    Redraw the whole canvas from the current options
*/
function drawKeychain() {

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    context.clearRect(0, 0, canvas.width, canvas.height);


    const main = buildMainCharm();
    const side = buildSideCharm();


    // Back to front: the charms, the chains that reach their tabs, the ring
    hangCharm(main, MAIN_CHARM);
    hangCharm(side, SIDE_CHARM);

    drawChain(MAIN_CHARM.holeX, MAIN_CHARM.holeY);
    drawChain(SIDE_CHARM.holeX, SIDE_CHARM.holeY);

    drawRing();


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
    Place a finished charm so its hole lands on the given point
*/
function hangCharm(charm, place) {

    context.save();

    context.translate(place.holeX, place.holeY);
    context.rotate(place.turn);

    // A soft shadow under the whole charm, as if it lay on a table
    context.shadowColor = "rgba(30, 16, 90, 0.3)";
    context.shadowBlur = 36;
    context.shadowOffsetY = 18;

    context.drawImage(charm.canvas, -charm.holeX, -charm.holeY);

    context.restore();

}



/* ------------------------------
   The Main Charm
------------------------------ */

/*
    The big charm: the place as a picture, with the animal and the fruit
    standing in it. Drawn on its own canvas so the hole can be cut out.
*/
function buildMainCharm() {

    const size = MAIN_CHARM.size;
    const round = shape === "round";

    const margin = 40;
    const tabRise = 78;

    const charm = document.createElement("canvas");

    charm.width = size + (margin * 2);
    charm.height = size + tabRise + (margin * 2);

    const pen = charm.getContext("2d");

    pen.translate(margin, margin + tabRise);


    // Outline of the body, and of the picture set inside its white edge
    const edge = 34;

    function bodyPath(inset) {

        if (round) {

            pen.beginPath();
            pen.arc(size / 2, size / 2, (size / 2) - inset, 0, Math.PI * 2);
            pen.closePath();

        } else {

            roundedRectangle(pen, inset, inset, size - (inset * 2), size - (inset * 2), 150 - inset);

        }

    }

    const tab = { x: size / 2, y: -16, radius: 56 };
    const hole = { x: size / 2, y: -26, radius: 19 };


    // White acrylic: outline first, then the fill hides the inner strokes
    pen.lineWidth = 6;
    pen.strokeStyle = "rgba(46, 33, 119, 0.22)";

    pen.beginPath();
    pen.arc(tab.x, tab.y, tab.radius, 0, Math.PI * 2);
    pen.stroke();

    bodyPath(0);
    pen.stroke();

    pen.fillStyle = "#ffffff";

    pen.beginPath();
    pen.arc(tab.x, tab.y, tab.radius, 0, Math.PI * 2);
    pen.fill();

    bodyPath(0);
    pen.fill();


    // The picture
    pen.save();

    bodyPath(edge);
    pen.clip();

    drawPlace(pen, size);

    drawStandingPictures(pen, size, round);

    drawGloss(pen, size);

    pen.restore();


    // A fine line where the picture meets the white edge
    pen.lineWidth = 3;
    pen.strokeStyle = "rgba(6, 41, 82, 0.14)";

    bodyPath(edge);
    pen.stroke();


    punchHole(pen, hole);


    return {
        canvas: charm,
        holeX: margin + hole.x,
        holeY: margin + tabRise + hole.y
    };

}


/*
    Fill the charm with the place, or a soft sky if there is no picture
*/
function drawPlace(pen, size) {

    const picture = wordImages[PLACE_INDEX];

    if (picture) {

        drawImageCover(pen, picture, 0, 0, size, size);

    } else {

        const sky = pen.createLinearGradient(0, 0, 0, size);
        sky.addColorStop(0, "#b9a7f0");
        sky.addColorStop(1, "#f7a182");

        pen.fillStyle = sky;
        pen.fillRect(0, 0, size, size);

        pen.textAlign = "center";
        pen.textBaseline = "middle";
        pen.font = (size * 0.34) + "px " + EMOJI_FONT;

        pen.fillText(passphrase.words[PLACE_INDEX].emoji, size * 0.5, size * 0.3);

    }


    // Ground the standing pictures and keep any lettering readable
    const shade = pen.createLinearGradient(0, size * 0.5, 0, size);
    shade.addColorStop(0, "rgba(6, 20, 60, 0)");
    shade.addColorStop(1, "rgba(6, 20, 60, 0.42)");

    pen.fillStyle = shade;
    pen.fillRect(0, size * 0.5, size, size * 0.5);

}


/*
    The animal and the fruit standing in the place, with any lettering
*/
function drawStandingPictures(pen, size, round) {

    const labels = showLabels.checked;
    const phrase = showPhrase.checked;


    // Work up from the bottom: the passphrase, the word tags, then the pictures
    let labelY;
    let baseline;

    const band = round
        ? { x: size * 0.23, y: size * 0.762, width: size * 0.54, height: size * 0.084 }
        : { x: size * 0.1, y: size * 0.826, width: size * 0.8, height: size * 0.09 };

    if (round) {

        labelY = phrase ? size * 0.712 : size * 0.8;
        baseline = labels ? labelY - (size * 0.042) : (phrase ? size * 0.745 : size * 0.86);

    } else {

        labelY = phrase ? size * 0.78 : size * 0.89;
        baseline = labels ? labelY - (size * 0.042) : (phrase ? size * 0.81 : size * 0.915);

    }

    const crowded = labels && phrase;

    const animal = {
        x: size * (round ? 0.37 : 0.335),
        size: size * (round ? (crowded ? 0.42 : 0.5) : (crowded ? 0.5 : 0.56))
    };

    const fruit = {
        x: size * (round ? 0.68 : 0.74),
        size: size * (round ? (crowded ? 0.25 : 0.3) : (crowded ? 0.3 : 0.34))
    };


    drawStanding(pen, ANIMAL_INDEX, animal.x, baseline, animal.size);
    drawStanding(pen, FRUIT_INDEX, fruit.x, baseline, fruit.size);


    if (labels) {

        const tagSize = size * 0.05;
        const tagWidth = size * (round ? 0.27 : 0.36);

        drawTag(pen, passphrase.words[ANIMAL_INDEX].word, animal.x, labelY, tagSize, tagWidth);
        drawTag(pen, passphrase.words[FRUIT_INDEX].word, fruit.x, labelY, tagSize, tagWidth);

        // The place is named at the top, where the sky is
        if (round) {

            drawTag(pen, passphrase.words[PLACE_INDEX].word, size * 0.5, size * 0.16, tagSize, size * 0.4);

        } else {

            drawTag(pen, passphrase.words[PLACE_INDEX].word, size * 0.115, size * 0.135, tagSize, size * 0.5, "left");

        }

    }


    if (phrase) {

        drawPhraseBand(pen, band);

    }

}


/*
    One cut-out standing on the ground, or its emoji
*/
function drawStanding(pen, wordIndex, centreX, baseline, box) {

    // The shadow it stands on
    pen.save();

    pen.translate(centreX, baseline - (box * 0.06));
    pen.scale(1, 0.2);

    const ground = pen.createRadialGradient(0, 0, 0, 0, 0, box * 0.38);
    ground.addColorStop(0, "rgba(6, 20, 60, 0.42)");
    ground.addColorStop(1, "rgba(6, 20, 60, 0)");

    pen.fillStyle = ground;

    pen.beginPath();
    pen.arc(0, 0, box * 0.38, 0, Math.PI * 2);
    pen.fill();

    pen.restore();


    const picture = wordImages[wordIndex];

    if (picture) {

        drawImageContain(pen, picture, centreX, baseline - (box / 2), box);

    } else {

        pen.textAlign = "center";
        pen.textBaseline = "middle";
        pen.font = (box * 0.78) + "px " + EMOJI_FONT;

        pen.fillText(passphrase.words[wordIndex].emoji, centreX, baseline - (box * 0.46));

    }

}


/*
    A word on a small white tag
*/
function drawTag(pen, word, x, y, fontSize, maxWidth, align) {

    const padding = fontSize * 0.62;

    let size = fontSize;

    pen.font = "600 " + size + "px " + TEXT_FONT;

    // Long words shrink rather than run off the charm
    while (pen.measureText(word).width + (padding * 2) > maxWidth && size > 14) {

        size = size - 1;

        pen.font = "600 " + size + "px " + TEXT_FONT;

    }


    const width = pen.measureText(word).width + (padding * 2);
    const height = fontSize * 1.7;

    const left = align === "left" ? x : x - (width / 2);


    pen.save();

    pen.shadowColor = "rgba(6, 20, 60, 0.28)";
    pen.shadowBlur = 10;
    pen.shadowOffsetY = 4;

    pen.fillStyle = "rgba(255, 255, 255, 0.96)";

    roundedRectangle(pen, left, y - (height / 2), width, height, height / 2);
    pen.fill();

    pen.restore();


    pen.fillStyle = NAVY;
    pen.textAlign = "center";
    pen.textBaseline = "middle";

    pen.fillText(word, left + (width / 2), y + (size * 0.04));

}


/*
    The full passphrase along the bottom, when the user asks for it
*/
function drawPhraseBand(pen, band) {

    pen.fillStyle = NAVY;

    roundedRectangle(pen, band.x, band.y, band.width, band.height, band.height / 2);
    pen.fill();


    // Shrink the text until the passphrase fits inside the band
    const maximum = band.width - (band.height * 0.9);

    let size = band.height * 0.52;

    pen.font = "600 " + size + "px " + TEXT_FONT;

    while (pen.measureText(passphrase.phrase).width > maximum && size > 12) {

        size = size - 1;

        pen.font = "600 " + size + "px " + TEXT_FONT;

    }


    pen.fillStyle = "#ffffff";
    pen.textAlign = "center";
    pen.textBaseline = "middle";

    pen.fillText(passphrase.phrase, band.x + (band.width / 2), band.y + (band.height / 2) + (size * 0.04));

}



/* ------------------------------
   The Country Charm
------------------------------ */

/*
    The small round charm: the country's landmark, or its flag
*/
function buildSideCharm() {

    const radius = SIDE_CHARM.radius;

    const margin = 36;
    const tabRise = 62;

    const charm = document.createElement("canvas");

    charm.width = (radius * 2) + (margin * 2);
    charm.height = (radius * 2) + tabRise + (margin * 2);

    const pen = charm.getContext("2d");

    pen.translate(margin, margin + tabRise);


    const edge = 24;

    const tab = { x: radius, y: -10, radius: 46 };
    const hole = { x: radius, y: -20, radius: 16 };


    // White acrylic
    pen.lineWidth = 6;
    pen.strokeStyle = "rgba(46, 33, 119, 0.22)";

    pen.beginPath();
    pen.arc(tab.x, tab.y, tab.radius, 0, Math.PI * 2);
    pen.stroke();

    pen.beginPath();
    pen.arc(radius, radius, radius, 0, Math.PI * 2);
    pen.stroke();

    pen.fillStyle = "#ffffff";

    pen.beginPath();
    pen.arc(tab.x, tab.y, tab.radius, 0, Math.PI * 2);
    pen.fill();

    pen.beginPath();
    pen.arc(radius, radius, radius, 0, Math.PI * 2);
    pen.fill();


    // The picture
    pen.save();

    pen.beginPath();
    pen.arc(radius, radius, radius - edge, 0, Math.PI * 2);
    pen.clip();

    const picture = wordImages[COUNTRY_INDEX];

    if (picture) {

        drawImageCover(pen, picture, 0, 0, radius * 2, radius * 2);

    } else {

        const sky = pen.createLinearGradient(0, 0, 0, radius * 2);
        sky.addColorStop(0, "#d2e6fa");
        sky.addColorStop(1, "#e4dcf8");

        pen.fillStyle = sky;
        pen.fillRect(0, 0, radius * 2, radius * 2);

        pen.textAlign = "center";
        pen.textBaseline = "middle";
        pen.font = (radius * 0.95) + "px " + EMOJI_FONT;

        pen.fillText(passphrase.words[COUNTRY_INDEX].emoji, radius, radius * 0.95);

    }

    if (showLabels.checked) {

        drawTag(pen, passphrase.words[COUNTRY_INDEX].word, radius, radius * 1.56, radius * 0.19, radius * 1.3);

    }

    drawGloss(pen, radius * 2);

    pen.restore();


    pen.lineWidth = 3;
    pen.strokeStyle = "rgba(6, 41, 82, 0.14)";

    pen.beginPath();
    pen.arc(radius, radius, radius - edge, 0, Math.PI * 2);
    pen.stroke();


    punchHole(pen, hole);


    return {
        canvas: charm,
        holeX: margin + hole.x,
        holeY: margin + tabRise + hole.y
    };

}



/* ------------------------------
   Ring And Chains
------------------------------ */

/*
    The split ring everything hangs from
*/
function drawRing() {

    context.save();

    context.shadowColor = "rgba(30, 16, 90, 0.25)";
    context.shadowBlur = 20;
    context.shadowOffsetY = 10;

    strokeMetal(context, RING.width, RING.x - RING.radius, RING.x + RING.radius, function () {

        context.beginPath();
        context.arc(RING.x, RING.y, RING.radius, 0, Math.PI * 2);

    });

    context.restore();


    // The light catching the top of the ring
    context.strokeStyle = "rgba(255, 255, 255, 0.85)";
    context.lineWidth = 5;
    context.lineCap = "round";

    context.beginPath();
    context.arc(RING.x, RING.y, RING.radius + 4, Math.PI * 1.12, Math.PI * 1.62);
    context.stroke();

}


/*
    A short run of links from the ring down to a charm's hole
*/
function drawChain(holeX, holeY) {

    const deltaX = holeX - RING.x;
    const deltaY = holeY - RING.y;

    const distance = Math.hypot(deltaX, deltaY);
    const angle = Math.atan2(deltaY, deltaX);

    // Start on the ring itself and finish through the hole
    const start = RING.radius - 6;
    const length = distance - start + 8;

    const count = Math.max(2, Math.round(length / 76));
    const step = length / count;


    context.save();

    context.translate(RING.x, RING.y);
    context.rotate(angle);

    context.shadowColor = "rgba(30, 16, 90, 0.22)";
    context.shadowBlur = 12;
    context.shadowOffsetY = 6;


    for (let index = 0; index < count; index = index + 1) {

        const centre = start + (step * index) + (step / 2);

        const long = (step * 1.22) / 2;

        // Links alternate face on and edge on, as they do in a real chain
        const wide = index % 2 === 0 ? 20 : 7;

        strokeMetal(context, 9, -wide, wide, function () {

            context.beginPath();
            context.ellipse(centre, 0, long, wide, 0, 0, Math.PI * 2);

        }, true);

    }

    context.restore();

}


/*
    Stroke a path as polished metal: a dark edge, then a silver sheen
*/
function strokeMetal(pen, width, from, to, path, across) {

    pen.lineCap = "round";
    pen.lineJoin = "round";


    path();

    pen.lineWidth = width + 5;
    pen.strokeStyle = "#7f8aa3";
    pen.stroke();


    // The sheen runs across the stroke: left to right, or top to bottom
    const sheen = across
        ? pen.createLinearGradient(0, from - width, 0, to + width)
        : pen.createLinearGradient(from, 0, to, 0);

    sheen.addColorStop(0, "#f6f8fc");
    sheen.addColorStop(0.3, "#c4ccda");
    sheen.addColorStop(0.55, "#fbfcfe");
    sheen.addColorStop(0.8, "#a9b3c6");
    sheen.addColorStop(1, "#e9edf4");

    pen.save();

    pen.shadowColor = "transparent";

    path();

    pen.lineWidth = width;
    pen.strokeStyle = sheen;
    pen.stroke();

    pen.restore();

}



/* ------------------------------
   Shared Drawing Helpers
------------------------------ */

/*
    A soft streak of light across a charm, so it reads as clear acrylic
*/
function drawGloss(pen, size) {

    const gloss = pen.createLinearGradient(0, 0, size * 0.7, size * 0.7);
    gloss.addColorStop(0, "rgba(255, 255, 255, 0.34)");
    gloss.addColorStop(0.32, "rgba(255, 255, 255, 0.08)");
    gloss.addColorStop(0.5, "rgba(255, 255, 255, 0)");

    pen.fillStyle = gloss;
    pen.fillRect(0, 0, size, size);

}


/*
    Cut the hole the chain passes through, and give it a rim
*/
function punchHole(pen, hole) {

    pen.save();

    pen.globalCompositeOperation = "destination-out";

    pen.beginPath();
    pen.arc(hole.x, hole.y, hole.radius, 0, Math.PI * 2);
    pen.fill();

    pen.restore();


    pen.lineWidth = 4;
    pen.strokeStyle = "rgba(46, 33, 119, 0.26)";

    pen.beginPath();
    pen.arc(hole.x, hole.y, hole.radius + 1, 0, Math.PI * 2);
    pen.stroke();

}


/*
    Scale a picture to fill a box, cropping the overflow evenly
*/
function drawImageCover(pen, image, x, y, width, height) {

    const scale = Math.max(
        width / image.naturalWidth,
        height / image.naturalHeight
    );

    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;

    pen.drawImage(
        image,
        x + ((width - drawWidth) / 2),
        y + ((height - drawHeight) / 2),
        drawWidth,
        drawHeight
    );

}


/*
    Fit the whole picture inside a box, centred, without distorting it
*/
function drawImageContain(pen, image, centreX, centreY, box) {

    const scale = Math.min(
        box / image.naturalWidth,
        box / image.naturalHeight
    );

    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;

    pen.drawImage(
        image,
        centreX - (width / 2),
        centreY - (height / 2),
        width,
        height
    );

}


/*
    A rounded rectangle path
*/
function roundedRectangle(pen, x, y, width, height, radius) {

    pen.beginPath();

    pen.moveTo(x + radius, y);

    pen.lineTo(x + width - radius, y);
    pen.quadraticCurveTo(x + width, y, x + width, y + radius);

    pen.lineTo(x + width, y + height - radius);
    pen.quadraticCurveTo(
        x + width,
        y + height,
        x + width - radius,
        y + height
    );

    pen.lineTo(x + radius, y + height);
    pen.quadraticCurveTo(x, y + height, x, y + height - radius);

    pen.lineTo(x, y + radius);
    pen.quadraticCurveTo(x, y, x + radius, y);

    pen.closePath();

}


/*
    Name the download after the words on the keychain
*/
function buildFileName() {

    const words = passphrase.words.map(function (item) {
        return item.word.toLowerCase();
    }).join("-");

    return "thinksecure-keychain-" + words + ".png";

}

window.addEventListener("languagechange", () => { if (!studio.classList.contains("hidden")) { drawWordList(); drawKeychain(); } });
