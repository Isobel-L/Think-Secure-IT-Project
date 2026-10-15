/*
    Keychain Studio

    Takes the four words picked in the Passphrase Maker and draws them as a
    keychain on a canvas: a long acrylic bar hanging from a ring, with the
    place as its picture and the animal, the fruit and the country stacked
    down it. The user can then download it as a PNG with a transparent
    background. No image generation service is involved.
*/


// Sections
const noPhraseSection = document.getElementById("no-phrase");
const studio = document.getElementById("studio");


// Panel elements
const studioWords = document.getElementById("studio-words");
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


// The three pictures down the bar, top to bottom
const STACK_ORDER = [ANIMAL_INDEX, FRUIT_INDEX, COUNTRY_INDEX];


// Canvas size, and where each piece of the keychain sits on it
const CANVAS_WIDTH = 760;
const CANVAS_HEIGHT = 1720;

const RING = { x: 380, y: 118, radius: 86, width: 24 };

// The bar hangs from the hole in its tab, turned slightly about it
const BAR = { width: 460, height: 1250, holeX: 380, holeY: 344, turn: -0.03 };


// The picture for each word, once it has loaded. Missing ones stay null.
const wordImages = [null, null, null, null];


// A JPG cannot be transparent, so it is a whole photograph rather than a
// cut-out and fills its circle instead of sitting inside it.
const wordImageFills = [false, false, false, false];


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
        wordImageFills[index] = IMAGE_TYPES[typeIndex] === ".jpg";

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


    // Back to front: the bar, the chain that reaches its tab, the ring
    hangBar(buildBar());

    drawChain(BAR.holeX, BAR.holeY);

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
    Place the finished bar so its hole lands under the chain
*/
function hangBar(bar) {

    context.save();

    context.translate(BAR.holeX, BAR.holeY);
    context.rotate(BAR.turn);

    // A soft shadow under the whole bar, as if it lay on a table
    context.shadowColor = "rgba(30, 16, 90, 0.3)";
    context.shadowBlur = 40;
    context.shadowOffsetY = 20;

    context.drawImage(bar.canvas, -bar.holeX, -bar.holeY);

    context.restore();

}



/* ------------------------------
   The Bar
------------------------------ */

/*
    The long acrylic bar: the place as its picture, with the animal, the
    fruit and the country stacked down it. Drawn on its own canvas so the
    hole can be cut out.
*/
function buildBar() {

    const width = BAR.width;
    const height = BAR.height;

    const margin = 40;
    const tabRise = 70;

    const bar = document.createElement("canvas");

    bar.width = width + (margin * 2);
    bar.height = height + tabRise + (margin * 2);

    const pen = bar.getContext("2d");

    pen.translate(margin, margin + tabRise);


    // The picture sits inside a white acrylic edge
    const edge = 26;
    const radius = 80;

    const inner = {
        x: edge,
        y: edge,
        width: width - (edge * 2),
        height: height - (edge * 2)
    };

    const tab = { x: width / 2, y: -6, radius: 50 };
    const hole = { x: width / 2, y: -14, radius: 18 };


    // White acrylic: outline first, then the fill hides the inner strokes
    pen.lineWidth = 6;
    pen.strokeStyle = "rgba(46, 33, 119, 0.22)";

    pen.beginPath();
    pen.arc(tab.x, tab.y, tab.radius, 0, Math.PI * 2);
    pen.stroke();

    roundedRectangle(pen, 0, 0, width, height, radius);
    pen.stroke();

    pen.fillStyle = "#ffffff";

    pen.beginPath();
    pen.arc(tab.x, tab.y, tab.radius, 0, Math.PI * 2);
    pen.fill();

    roundedRectangle(pen, 0, 0, width, height, radius);
    pen.fill();


    // The picture
    pen.save();

    roundedRectangle(pen, inner.x, inner.y, inner.width, inner.height, radius - edge);
    pen.clip();

    drawPlace(pen, inner);

    drawStack(pen, inner);

    drawGloss(pen, inner);

    pen.restore();


    // A fine line where the picture meets the white edge
    pen.lineWidth = 3;
    pen.strokeStyle = "rgba(6, 41, 82, 0.14)";

    roundedRectangle(pen, inner.x, inner.y, inner.width, inner.height, radius - edge);
    pen.stroke();


    punchHole(pen, hole);


    return {
        canvas: bar,
        holeX: margin + hole.x,
        holeY: margin + tabRise + hole.y
    };

}


/*
    Fill the bar with the place, or a soft sky if there is no picture
*/
function drawPlace(pen, area) {

    const picture = wordImages[PLACE_INDEX];

    if (picture) {

        drawImageCover(pen, picture, area.x, area.y, area.width, area.height);

    } else {

        const sky = pen.createLinearGradient(0, area.y, 0, area.y + area.height);
        sky.addColorStop(0, "#b9a7f0");
        sky.addColorStop(1, "#f7a182");

        pen.fillStyle = sky;
        pen.fillRect(area.x, area.y, area.width, area.height);

        pen.textAlign = "center";
        pen.textBaseline = "middle";
        pen.font = (area.width * 0.3) + "px " + EMOJI_FONT;

        pen.fillText(passphrase.words[PLACE_INDEX].emoji, area.x + (area.width / 2), area.y + (area.height * 0.5));

    }


    // Shade the top and bottom a little, so the white tags stay readable
    const top = pen.createLinearGradient(0, area.y, 0, area.y + 220);
    top.addColorStop(0, "rgba(6, 20, 60, 0.38)");
    top.addColorStop(1, "rgba(6, 20, 60, 0)");

    pen.fillStyle = top;
    pen.fillRect(area.x, area.y, area.width, 220);

    const bottom = pen.createLinearGradient(0, area.y + area.height - 320, 0, area.y + area.height);
    bottom.addColorStop(0, "rgba(6, 20, 60, 0)");
    bottom.addColorStop(1, "rgba(6, 20, 60, 0.42)");

    pen.fillStyle = bottom;
    pen.fillRect(area.x, area.y + area.height - 320, area.width, 320);

}


/*
    The place's name, the three pictures and the passphrase, top to bottom
*/
function drawStack(pen, area) {

    const labels = showLabels.checked;
    const phrase = showPhrase.checked;

    const centreX = area.x + (area.width / 2);


    // The place is named at the top, in its own sky
    if (labels) {

        drawTag(pen, passphrase.words[PLACE_INDEX].word, centreX, area.y + 62, 36, area.width - 56);

    }


    // The passphrase takes the bottom, one word to a line
    let bottom = area.y + area.height - 40;

    if (phrase) {

        const block = drawPhraseBlock(pen, area);

        bottom = block.top - 26;

    }


    // The pictures share what is left equally
    const top = area.y + (labels ? 124 : 52);
    const slot = (bottom - top) / STACK_ORDER.length;

    const labelSpace = labels ? 66 : 0;

    const diameter = Math.min(slot - labelSpace - 26, area.width * 0.7, 300);

    STACK_ORDER.forEach(function (wordIndex, position) {

        const slotTop = top + (slot * position);

        const centreY = slotTop + ((slot - labelSpace) / 2);

        drawBadge(pen, wordIndex, centreX, centreY, diameter / 2);

        if (labels) {

            drawTag(pen, passphrase.words[wordIndex].word, centreX, centreY + (diameter / 2) + 38, 34, area.width - 56);

        }

    });

}


/*
    One picture on a round badge: a cut-out stands in front of a frosted
    disc, a photograph fills it
*/
function drawBadge(pen, wordIndex, centreX, centreY, radius) {

    const picture = wordImages[wordIndex];
    const photo = picture && wordImageFills[wordIndex];


    // The disc, lifted off the picture by its shadow
    pen.save();

    pen.shadowColor = "rgba(6, 20, 60, 0.35)";
    pen.shadowBlur = 22;
    pen.shadowOffsetY = 8;

    pen.fillStyle = photo ? "#ffffff" : "rgba(255, 255, 255, 0.82)";

    pen.beginPath();
    pen.arc(centreX, centreY, radius, 0, Math.PI * 2);
    pen.fill();

    pen.restore();


    if (photo) {

        pen.save();

        pen.beginPath();
        pen.arc(centreX, centreY, radius - 9, 0, Math.PI * 2);
        pen.clip();

        drawImageCover(pen, picture, centreX - radius, centreY - radius, radius * 2, radius * 2);

        pen.restore();

    } else if (picture) {

        // A cut-out may reach a little past its disc, like a sticker
        drawImageContain(pen, picture, centreX, centreY + (radius * 0.04), radius * 2.16);

    } else {

        pen.textAlign = "center";
        pen.textBaseline = "middle";
        pen.font = (radius * 1.15) + "px " + EMOJI_FONT;

        pen.fillText(passphrase.words[wordIndex].emoji, centreX, centreY + (radius * 0.06));

    }

}


/*
    A word on a small white tag
*/
function drawTag(pen, word, x, y, fontSize, maxWidth) {

    const padding = fontSize * 0.62;

    let size = fontSize;

    pen.font = "600 " + size + "px " + TEXT_FONT;

    // Long words shrink rather than run off the bar
    while (pen.measureText(word).width + (padding * 2) > maxWidth && size > 14) {

        size = size - 1;

        pen.font = "600 " + size + "px " + TEXT_FONT;

    }


    const width = pen.measureText(word).width + (padding * 2);
    const height = fontSize * 1.7;


    pen.save();

    pen.shadowColor = "rgba(6, 20, 60, 0.28)";
    pen.shadowBlur = 10;
    pen.shadowOffsetY = 4;

    pen.fillStyle = "rgba(255, 255, 255, 0.96)";

    roundedRectangle(pen, x - (width / 2), y - (height / 2), width, height, height / 2);
    pen.fill();

    pen.restore();


    pen.fillStyle = NAVY;
    pen.textAlign = "center";
    pen.textBaseline = "middle";

    pen.fillText(word, x, y + (size * 0.04));

}


/*
    The full passphrase at the foot of the bar, one word to a line, when
    the user asks for it. Returns where the block starts.
*/
function drawPhraseBlock(pen, area) {

    const words = passphrase.words.map(function (item) {
        return item.word;
    });

    const lines = words.map(function (word, index) {
        return index < words.length - 1 ? word + "-" : word;
    });


    // Shrink the text until the longest line fits across the bar
    const padding = 26;
    const maximum = area.width - 40 - (padding * 2);

    let size = 40;

    pen.font = "600 " + size + "px " + TEXT_FONT;

    while (Math.max.apply(null, lines.map(function (line) { return pen.measureText(line).width; })) > maximum && size > 14) {

        size = size - 1;

        pen.font = "600 " + size + "px " + TEXT_FONT;

    }


    const lineHeight = size * 1.24;

    const block = {
        x: area.x + 20,
        width: area.width - 40,
        height: (lineHeight * lines.length) + (padding * 2)
    };

    block.top = area.y + area.height - 26 - block.height;


    pen.fillStyle = NAVY;

    roundedRectangle(pen, block.x, block.top, block.width, block.height, 30);
    pen.fill();


    pen.fillStyle = "#ffffff";
    pen.textAlign = "center";
    pen.textBaseline = "middle";

    lines.forEach(function (line, index) {

        pen.fillText(line, block.x + (block.width / 2), block.top + padding + (lineHeight * index) + (lineHeight / 2) + (size * 0.04));

    });


    return block;

}



/* ------------------------------
   Ring And Chain
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
    A short run of links from the ring down to the bar's hole
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
    A soft streak of light across the bar, so it reads as clear acrylic
*/
function drawGloss(pen, area) {

    const gloss = pen.createLinearGradient(area.x, area.y, area.x + area.width, area.y + (area.width * 1.1));
    gloss.addColorStop(0, "rgba(255, 255, 255, 0.34)");
    gloss.addColorStop(0.32, "rgba(255, 255, 255, 0.08)");
    gloss.addColorStop(0.5, "rgba(255, 255, 255, 0)");

    pen.fillStyle = gloss;
    pen.fillRect(area.x, area.y, area.width, area.height);

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
