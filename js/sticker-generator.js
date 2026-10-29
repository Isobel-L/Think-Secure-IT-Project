/*
    Keychain Studio

    Takes the four words picked in the Passphrase Maker and draws them as one
    round picture: the place fills it, the country's flag flies at the top,
    and the animal and the fruit stand in the middle. The flag, the animal
    and the fruit can be dragged anywhere on it. The
    user then picks a keychain or a badge pin. Both print this same design,
    so only the preview changes: the print slips into a keychain casing, or
    is pressed into a button badge. The download is the flat design itself.
    No image generation service is involved.
*/


// Sections
const noPhraseSection = document.getElementById("no-phrase");
const studio = document.getElementById("studio");


// Panel elements
const studioWords = document.getElementById("studio-words");
const productInputs = document.querySelectorAll("input[name='product']");
const resetButton = document.getElementById("reset-positions");
const downloadButton = document.getElementById("download-button");


// Countdown elements
const timerBox = document.getElementById("kc-timer");
const timerTime = document.getElementById("kc-timer-time");
const toast = document.getElementById("kc-toast");
const toastText = document.getElementById("kc-toast-text");
const toastClose = document.getElementById("kc-toast-close");
const timeUpDialog = document.getElementById("kc-timeup");
const timeUpPreview = document.getElementById("kc-timeup-preview");
const timeUpDownload = document.getElementById("kc-timeup-download");
const timeUpNote = document.getElementById("kc-timeup-note");


// The preview canvas, and the design drawn off screen for printing
const canvas = document.getElementById("sticker-canvas");
const context = canvas.getContext("2d");

const design = document.createElement("canvas");
const designPen = design.getContext("2d");


// Where the Passphrase Maker leaves the chosen words
const PHRASE_STORAGE_NAME = "thinksecure-passphrase";


// Fonts that cover colour emoji across the common platforms
const EMOJI_FONT = "\"Apple Color Emoji\", \"Segoe UI Emoji\", "
    + "\"Noto Color Emoji\", sans-serif";


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


// The design is square, with the place running right to the edge. Whoever
// prints it sizes it to their keychain inserts and badge blanks.
const DESIGN_SIZE = 1200;

design.width = DESIGN_SIZE;
design.height = DESIGN_SIZE;

// How far out from the middle shows on the front of the keychain or badge.
// The rest is spare picture, for a badge to wrap round its edge.
const FACE = 0.44;

// How far from the middle a piece can be dragged, so none is lost off the front
const REACH = 0.38;


// The pieces the user can drag about, bottom to top: the fruit, the animal
// over it, and the flag over both. Each starts at home, in fractions of the
// design's side, and x and y follow it wherever it is dragged.
const pieces = [
    { word: FRUIT_INDEX, home: { x: 0.64, y: 0.72 }, box: 0.28, turn: 0 },
    { word: ANIMAL_INDEX, home: { x: 0.42, y: 0.5 }, box: 0.44, turn: 0 },
    { word: COUNTRY_INDEX, home: { x: 0.5, y: 0.19 }, box: 0.25, turn: -0.08 }
];

pieces.forEach(function (piece) {
    piece.x = piece.home.x;
    piece.y = piece.home.y;
});


// Each picture is shrunk to this many pixels a side to tell which parts of
// it can be grabbed and which are see-through
const MASK_SIZE = 128;


// The preview canvas for each product, and where its pieces sit on it
const PREVIEW_WIDTH = 760;
const PREVIEW_HEIGHT = { keychain: 1080, badge: 760 };

const RING = { x: 380, y: 118, radius: 86, width: 24 };
const CASING = { x: 380, y: 680, radius: 300, rim: 34 };
const BADGE = { x: 380, y: 368, radius: 318 };


// The picture for each word, once it has loaded. Missing ones stay null.
const wordImages = [null, null, null, null];


// A JPG cannot be transparent, so it is a whole photograph rather than a
// cut-out, and is shown as a round snapshot instead of standing free.
const wordImageFills = [false, false, false, false];


// The see-through parts of each picture, once it has loaded
const wordMasks = [null, null, null, null];


// The piece being dragged, and the frame waiting to show it moved
let drag = null;
let dragFrame = 0;


// The words handed over by the Passphrase Maker
let passphrase = null;


// What the design is being made into: "keychain" or "badge"
let product = "keychain";


// How long there is to customise the design, when the warning pops up,
// and how long that warning stays on screen
const COUNTDOWN_SECONDS = 45;
const WARNING_SECONDS = 30;
const TOAST_SECONDS = 6;

let countdownEnd = 0;
let countdownTicker = null;
let countdownWarned = false;
let toastSeconds = 0;
let toastTimer = null;



/* ------------------------------
   Start Up
------------------------------ */

loadPassphrase();


/*
    Read the choices made in the Passphrase Maker
*/
function loadPassphrase() {

    const stored = sessionStorage.getItem(PHRASE_STORAGE_NAME);


    // A passphrase is good for one design. Clearing it as soon as it is
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
    if (!passphrase || typeof passphrase.phrase !== "string" || !Array.isArray(passphrase.words) || passphrase.words.length !== 4 || !passphrase.words.every(item => item && typeof item.word === "string" && item.word && typeof item.emoji === "string" && (item.display === undefined || (typeof item.display === "string" && item.display)))) {

        noPhraseSection.classList.remove("hidden");

        return;
    }


    studio.classList.remove("hidden");

    drawWordList();


    // A browser coming back to the page may have kept the last choice
    chooseProduct(document.querySelector("input[name='product']:checked").value);

    drawStudio();

    loadWordPictures();

    startCountdown();

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
        wordMasks[index] = buildMask(image);

        drawWordList();

        drawStudio();

    });

    image.addEventListener("error", function () {

        tryPicture(index, word, typeIndex + 1);

    });

    image.src = IMAGE_FOLDERS[index] + word + IMAGE_TYPES[typeIndex];

}


/*
    How a word is spelled in the list: with any letters the user swapped
    for symbols in the Passphrase Maker. The picture always follows the word.
*/
function spelling(item) {

    return item.display || item.word;

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

        label.textContent = I18n.getLanguage() !== "en" && translated ? translated + " " + spelling(item) : spelling(item);


        row.append(thumb, label);

        studioWords.appendChild(row);

    });

}



/* ------------------------------
   Keychain Or Badge
------------------------------ */

// Both print the same design, so a change only redraws the preview
productInputs.forEach(function (input) {

    input.addEventListener("change", function () {

        chooseProduct(input.value);

        drawPreview();

    });

});


/*
    Remember what the design is being made into, and keep the panel, the
    preview's description and the download's name in step with it
*/
function chooseProduct(value) {

    product = value;

    productInputs.forEach(function (input) {
        input.checked = input.value === value;
    });


    const label = value === "badge" ? "sticker.canvasAltBadge" : "sticker.canvasAlt";

    canvas.setAttribute("data-i18n-aria-label", label);
    canvas.setAttribute("aria-label", I18n.t(label));

    canvas.dataset.product = value;

    downloadButton.download = buildFileName();

}



/* ------------------------------
   Moving The Pictures
------------------------------ */

canvas.addEventListener("pointerdown", function (event) {

    if (drag || event.button !== 0 || studio.classList.contains("kc-locked")) {
        return;
    }


    const point = designPoint(event);
    const piece = point.inside ? pieceAt(point) : null;

    if (!piece) {
        return;
    }


    // Hold the piece by the spot that was grabbed, not by its middle
    drag = {
        piece: piece,
        pointer: event.pointerId,
        offsetX: piece.x - (point.x / DESIGN_SIZE),
        offsetY: piece.y - (point.y / DESIGN_SIZE)
    };

    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add("kc-dragging");

    event.preventDefault();

});


// A touch that lands on a piece moves the piece rather than the page.
// Pointer events arrive first, so the drag has already begun by now.
canvas.addEventListener("touchstart", function (event) {

    if (drag) {
        event.preventDefault();
    }

}, { passive: false });


canvas.addEventListener("pointermove", function (event) {

    const point = designPoint(event);


    // A mouse shows a hand over anything that can be picked up
    if (!drag) {

        if (event.pointerType === "mouse") {

            const free = !studio.classList.contains("kc-locked") && point.inside && pieceAt(point) !== null;

            canvas.classList.toggle("kc-grab", free);

        }

        return;
    }


    if (event.pointerId !== drag.pointer) {
        return;
    }

    placePiece(drag.piece, (point.x / DESIGN_SIZE) + drag.offsetX, (point.y / DESIGN_SIZE) + drag.offsetY);


    // Redraw at most once a frame however fast the pointer moves
    if (!dragFrame) {

        dragFrame = requestAnimationFrame(function () {

            dragFrame = 0;

            buildDesign();

            drawPreview();

        });

    }

});

canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", endDrag);
canvas.addEventListener("lostpointercapture", endDrag);


/*
    Let go of the piece, and offer the design with it in its new place
*/
function endDrag() {

    if (!drag) {
        return;
    }

    drag = null;

    canvas.classList.remove("kc-dragging");

    cancelAnimationFrame(dragFrame);
    dragFrame = 0;


    buildDesign();

    drawPreview();

    offerDownload();

    resetButton.disabled = piecesAtHome();

}


// Put every piece back where the design started it
resetButton.addEventListener("click", function () {

    pieces.forEach(function (piece) {
        piece.x = piece.home.x;
        piece.y = piece.home.y;
    });

    resetButton.disabled = true;

    buildDesign();

    drawPreview();

    offerDownload();

});


function piecesAtHome() {

    return pieces.every(function (piece) {
        return piece.x === piece.home.x && piece.y === piece.home.y;
    });

}


/*
    Move a piece, keeping its middle within reach of the middle of the design
*/
function placePiece(piece, x, y) {

    const deltaX = x - 0.5;
    const deltaY = y - 0.5;

    const distance = Math.hypot(deltaX, deltaY);
    const pull = distance > REACH ? REACH / distance : 1;

    piece.x = 0.5 + (deltaX * pull);
    piece.y = 0.5 + (deltaY * pull);

}


/*
    Where a pointer is on the design, in design pixels, and whether it is
    over the part of the print that shows
*/
function designPoint(event) {

    // offsetX and offsetY follow the canvas as it sways, unlike clientX
    const scale = canvas.width / canvas.clientWidth;

    const x = event.offsetX * scale;
    const y = event.offsetY * scale;

    const holder = product === "badge" ? BADGE : CASING;
    const shown = holder.radius / (FACE * DESIGN_SIZE);

    return {
        x: ((x - holder.x) / shown) + (DESIGN_SIZE / 2),
        y: ((y - holder.y) / shown) + (DESIGN_SIZE / 2),
        inside: Math.hypot(x - holder.x, y - holder.y) <= holder.radius
    };

}


/*
    The top piece under a point on the design, or null
*/
function pieceAt(point) {

    for (let layer = pieces.length - 1; layer >= 0; layer = layer - 1) {

        if (covers(pieces[layer], point)) {
            return pieces[layer];
        }

    }

    return null;

}


/*
    Whether a piece covers a point. A cut-out counts only where it is solid,
    so a see-through corner never hides the piece underneath.
*/
function covers(piece, point) {

    const box = piece.box * DESIGN_SIZE;


    // The point as the piece sees it: from its middle, turned with it
    const deltaX = point.x - (piece.x * DESIGN_SIZE);
    const deltaY = point.y - (piece.y * DESIGN_SIZE);

    const cos = Math.cos(-piece.turn);
    const sin = Math.sin(-piece.turn);

    const localX = (deltaX * cos) - (deltaY * sin);
    const localY = (deltaX * sin) + (deltaY * cos);


    const picture = wordImages[piece.word];

    // An emoji or a round snapshot is near enough a circle
    if (!picture || wordImageFills[piece.word]) {

        return Math.hypot(localX, localY) < box * 0.4;

    }


    const scale = Math.min(box / picture.naturalWidth, box / picture.naturalHeight);

    const across = (localX / (picture.naturalWidth * scale)) + 0.5;
    const down = (localY / (picture.naturalHeight * scale)) + 0.5;

    if (across < 0 || across > 1 || down < 0 || down > 1) {
        return false;
    }

    const mask = wordMasks[piece.word];

    return !mask || solidNear(mask, across, down);

}


/*
    Whether a picture is solid at a spot, or a hair away from it, so thin
    parts like legs and stems can still be grabbed
*/
function solidNear(mask, across, down) {

    const middleX = Math.floor(across * (MASK_SIZE - 1));
    const middleY = Math.floor(down * (MASK_SIZE - 1));

    for (let y = Math.max(0, middleY - 2); y <= Math.min(MASK_SIZE - 1, middleY + 2); y = y + 1) {

        for (let x = Math.max(0, middleX - 2); x <= Math.min(MASK_SIZE - 1, middleX + 2); x = x + 1) {

            if (mask[(((y * MASK_SIZE) + x) * 4) + 3] > 40) {
                return true;
            }

        }

    }

    return false;

}


/*
    A small copy of a picture to read its see-through parts from. Pictures
    loaded straight from disk cannot be read, and then any part grabs.
*/
function buildMask(image) {

    const mask = document.createElement("canvas");

    mask.width = MASK_SIZE;
    mask.height = MASK_SIZE;

    const pen = mask.getContext("2d", { willReadFrequently: true });

    pen.drawImage(image, 0, 0, MASK_SIZE, MASK_SIZE);

    try {

        return pen.getImageData(0, 0, MASK_SIZE, MASK_SIZE).data;

    } catch (error) {

        return null;

    }

}



/* ------------------------------
   The Printed Design
------------------------------ */

/*
    Draw the design from the pictures loaded so far, offer it for download,
    and show it in the preview
*/
function drawStudio() {

    buildDesign();

    offerDownload();

    drawPreview();

}


/*
    Point the download link at the design as it stands
*/
function offerDownload() {

    try {

        downloadButton.href = design.toDataURL("image/png");
        downloadButton.download = buildFileName();

    } catch (error) {

        // Browsers refuse to export a canvas holding a picture loaded
        // straight from disk (file://). Served over http it works.
        downloadButton.removeAttribute("href");

    }

}


/*
    The square that gets printed: the place, then the pieces wherever they
    have been dragged, the fruit first and the flag last, on top
*/
function buildDesign() {

    designPen.clearRect(0, 0, DESIGN_SIZE, DESIGN_SIZE);

    drawPlace(designPen, DESIGN_SIZE);

    pieces.forEach(function (piece) {

        if (piece.word === COUNTRY_INDEX) {

            drawFlag(designPen, piece, DESIGN_SIZE);

        } else {

            drawCutOut(designPen, piece, DESIGN_SIZE);

        }

    });

}


/*
    Fill the design with the place, or a soft sky if there is no picture
*/
function drawPlace(pen, size) {

    const picture = wordImages[PLACE_INDEX];

    if (picture) {

        drawImageCover(pen, picture, 0, 0, size, size);

        return;
    }


    const sky = pen.createLinearGradient(0, 0, 0, size);
    sky.addColorStop(0, "#b9a7f0");
    sky.addColorStop(1, "#f7a182");

    pen.fillStyle = sky;
    pen.fillRect(0, 0, size, size);


    // The place's emoji, large and faint behind everything else
    pen.save();

    pen.globalAlpha = 0.35;
    pen.textAlign = "center";
    pen.textBaseline = "middle";
    pen.font = (size * 0.7) + "px " + EMOJI_FONT;

    pen.fillText(passphrase.words[PLACE_INDEX].emoji, size / 2, size * 0.54);

    pen.restore();

}


/*
    The country's flag on a little pole
*/
function drawFlag(pen, piece, size) {

    const picture = wordImages[COUNTRY_INDEX];
    const box = piece.box * size;

    pen.save();

    pen.translate(piece.x * size, piece.y * size);
    pen.rotate(piece.turn);

    liftOff(pen, size);


    if (!picture) {

        pen.textAlign = "center";
        pen.textBaseline = "middle";
        pen.font = (box * 0.62) + "px " + EMOJI_FONT;

        pen.fillText(passphrase.words[COUNTRY_INDEX].emoji, 0, 0);

    } else if (wordImageFills[COUNTRY_INDEX]) {

        drawSnapshot(pen, picture, 0, 0, box * 0.34);

    } else {

        drawImageContain(pen, picture, 0, 0, box);


        // The pole runs up the flag's near edge, a little past it each end
        const poleX = -box * 0.45;
        const poleWidth = box * 0.036;

        pen.fillStyle = "#7b4a25";

        roundedRectangle(pen, poleX - (poleWidth / 2), -box * 0.38, poleWidth, box * 0.82, poleWidth / 2);
        pen.fill();

        pen.fillStyle = "#ffc94a";

        pen.beginPath();
        pen.arc(poleX, -box * 0.4, box * 0.036, 0, Math.PI * 2);
        pen.fill();

    }

    pen.restore();

}


/*
    The animal or the fruit, standing free on the design
*/
function drawCutOut(pen, piece, size) {

    const wordIndex = piece.word;
    const picture = wordImages[wordIndex];

    const x = piece.x * size;
    const y = piece.y * size;
    const box = piece.box * size;

    pen.save();

    liftOff(pen, size);


    if (picture && wordImageFills[wordIndex]) {

        drawSnapshot(pen, picture, x, y, box * 0.42);

    } else if (picture) {

        drawImageContain(pen, picture, x, y, box);

    } else {

        pen.textAlign = "center";
        pen.textBaseline = "middle";
        pen.font = (box * 0.7) + "px " + EMOJI_FONT;

        pen.fillText(passphrase.words[wordIndex].emoji, x, y);

    }

    pen.restore();

}


/*
    A soft shadow under whatever is drawn next, lifting it off the place
*/
function liftOff(pen, size) {

    pen.shadowColor = "rgba(14, 10, 50, 0.4)";
    pen.shadowBlur = size * 0.022;
    pen.shadowOffsetY = size * 0.01;

}


/*
    A photograph cannot stand free, so it sits in a round white frame
*/
function drawSnapshot(pen, picture, x, y, radius) {

    pen.fillStyle = "#ffffff";

    pen.beginPath();
    pen.arc(x, y, radius, 0, Math.PI * 2);
    pen.fill();


    pen.save();

    pen.shadowColor = "transparent";

    pen.beginPath();
    pen.arc(x, y, radius * 0.93, 0, Math.PI * 2);
    pen.clip();

    drawImageCover(pen, picture, x - radius, y - radius, radius * 2, radius * 2);

    pen.restore();

}



/* ------------------------------
   The Preview
------------------------------ */

/*
    Show the design made up as the chosen product
*/
function drawPreview() {

    // Resizing a canvas is slow, and this runs on every frame of a drag
    if (canvas.width !== PREVIEW_WIDTH || canvas.height !== PREVIEW_HEIGHT[product]) {

        canvas.width = PREVIEW_WIDTH;
        canvas.height = PREVIEW_HEIGHT[product];

    }

    context.clearRect(0, 0, canvas.width, canvas.height);

    context.imageSmoothingQuality = "high";


    if (product === "badge") {

        drawBadge();

    } else {

        drawKeychain();

    }

}


/*
    A round metal casing with the print under a clear dome, hanging from a
    short chain and a split ring
*/
function drawKeychain() {

    const loop = {
        x: CASING.x,
        y: CASING.y - CASING.radius - CASING.rim - 14,
        radius: 22
    };


    // Back to front: the casing and its loop, the chain, the ring
    drawCasing(loop);

    drawChain(loop.x, loop.y - loop.radius + 6);

    drawRing();

}


/*
    The casing: a polished rim round the print, with a loop on top for the
    chain to go through
*/
function drawCasing(loop) {

    const outer = CASING.radius + CASING.rim;


    // A soft shadow under the casing, as if it lay on a table
    context.save();

    context.shadowColor = "rgba(30, 16, 90, 0.3)";
    context.shadowBlur = 40;
    context.shadowOffsetY = 20;

    context.fillStyle = "#a9b3c6";

    context.beginPath();
    context.arc(CASING.x, CASING.y, outer, 0, Math.PI * 2);
    context.fill();

    context.restore();


    strokeMetal(context, 12, loop.x - loop.radius, loop.x + loop.radius, function () {

        context.beginPath();
        context.arc(loop.x, loop.y, loop.radius, 0, Math.PI * 2);

    });

    strokeMetal(context, CASING.rim, CASING.x - outer, CASING.x + outer, function () {

        context.beginPath();
        context.arc(CASING.x, CASING.y, CASING.radius + (CASING.rim / 2), 0, Math.PI * 2);

    });


    showDesign(CASING.x, CASING.y, CASING.radius);

    drawDome(CASING.x, CASING.y, CASING.radius);

}


/*
    A button badge: the print pressed over a domed shell, its edge rolled
    under out of sight
*/
function drawBadge() {

    context.save();

    context.shadowColor = "rgba(30, 16, 90, 0.32)";
    context.shadowBlur = 40;
    context.shadowOffsetY = 20;

    context.fillStyle = "#ffffff";

    context.beginPath();
    context.arc(BADGE.x, BADGE.y, BADGE.radius, 0, Math.PI * 2);
    context.fill();

    context.restore();


    showDesign(BADGE.x, BADGE.y, BADGE.radius);

    drawDome(BADGE.x, BADGE.y, BADGE.radius, true);

}


/*
    The middle of the design, as much as shows on the front, filling a circle
*/
function showDesign(x, y, radius) {

    const size = DESIGN_SIZE * (radius / (FACE * DESIGN_SIZE));

    context.save();

    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.clip();

    context.drawImage(design, x - (size / 2), y - (size / 2), size, size);

    context.restore();

}


/*
    The clear dome over the print: shaded where it curves away at the edge,
    with light caught across the top. A badge's edge is rolled, so it turns
    away more sharply and catches a line of light.
*/
function drawDome(x, y, radius, rolled) {

    const edge = context.createRadialGradient(x, y, radius * 0.78, x, y, radius);
    edge.addColorStop(0, "rgba(14, 10, 50, 0)");

    if (rolled) {
        edge.addColorStop(0.6, "rgba(14, 10, 50, 0.1)");
        edge.addColorStop(1, "rgba(14, 10, 50, 0.5)");
    } else {
        edge.addColorStop(1, "rgba(14, 10, 50, 0.32)");
    }

    context.fillStyle = edge;

    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();


    context.save();

    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.clip();

    const shine = context.createLinearGradient(x - radius, y - radius, x + (radius * 0.3), y + (radius * 0.3));
    shine.addColorStop(0, "rgba(255, 255, 255, 0.5)");
    shine.addColorStop(0.3, "rgba(255, 255, 255, 0.14)");
    shine.addColorStop(0.46, "rgba(255, 255, 255, 0)");

    context.fillStyle = shine;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);

    context.restore();


    // A short glint near the top left
    context.strokeStyle = "rgba(255, 255, 255, 0.5)";
    context.lineWidth = radius * 0.016;
    context.lineCap = "round";

    context.beginPath();
    context.arc(x, y, radius * 0.88, Math.PI * 1.17, Math.PI * 1.33);
    context.stroke();


    if (rolled) {

        context.strokeStyle = "rgba(255, 255, 255, 0.55)";
        context.lineWidth = radius * 0.012;

        context.beginPath();
        context.arc(x, y, radius * 0.975, Math.PI * 0.9, Math.PI * 1.6);
        context.stroke();

    }


    // A fine line where the dome meets whatever holds it
    context.strokeStyle = "rgba(14, 10, 50, 0.35)";
    context.lineWidth = 3;

    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.stroke();

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
    A short run of links from the ring down through the casing's loop
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
    Name the download after what it is for and the words in it, so whoever
    prints it can tell keychains from badges at a glance
*/
function buildFileName() {

    const words = passphrase.words.map(function (item) {
        return item.word.toLowerCase();
    }).join("-");

    return "thinksecure-" + product + "-" + words + ".png";

}



/* ------------------------------
   Countdown
------------------------------ */

/*
    Give the user a set time to customise the design. The end time is fixed
    up front, so a tab left in the background still runs out on time.
*/
function startCountdown() {

    countdownEnd = Date.now() + COUNTDOWN_SECONDS * 1000;

    tickCountdown();

    countdownTicker = setInterval(tickCountdown, 250);

}


function tickCountdown() {

    const left = Math.max(0, Math.ceil((countdownEnd - Date.now()) / 1000));

    const text = Math.floor(left / 60) + ":" + String(left % 60).padStart(2, "0");

    if (timerTime.textContent !== text) {
        timerTime.textContent = text;
    }


    if (left <= WARNING_SECONDS && !countdownWarned) {

        countdownWarned = true;

        timerBox.classList.add("kc-timer-low");

        showToast(left);

    }


    if (left === 0) {
        finishCountdown();
    }

}


/*
    The small pop-up saying how many seconds are left
*/
function showToast(seconds) {

    toastSeconds = seconds;

    toastText.textContent = I18n.t("sticker.timer.warning", { seconds: seconds });

    toast.hidden = false;

    clearTimeout(toastTimer);

    toastTimer = setTimeout(hideToast, TOAST_SECONDS * 1000);

}


function hideToast() {

    clearTimeout(toastTimer);

    toast.hidden = true;

}

toastClose.addEventListener("click", hideToast);


/*
    Time is up: the options are locked and the user picks what happens next
*/
function finishCountdown() {

    clearInterval(countdownTicker);

    hideToast();

    // A piece still held is dropped where it is, and counts
    endDrag();

    timerBox.classList.add("kc-timer-done");

    studio.classList.add("kc-locked");

    canvas.classList.remove("kc-grab");

    productInputs.forEach(function (input) {
        input.disabled = true;
    });

    resetButton.disabled = true;


    // The dialog offers the design exactly as it was left
    const picture = downloadButton.getAttribute("href");

    if (picture && picture !== "#") {

        timeUpDownload.href = picture;

    } else {

        // Served from disk the canvas cannot be exported, as with the panel's button
        timeUpPreview.hidden = true;

        timeUpDownload.removeAttribute("href");
        timeUpDownload.setAttribute("aria-disabled", "true");

    }


    showChoice();

    timeUpDialog.showModal();

}


/*
    Mark what the design is being made into, show it made up, and say what
    happens to the print next
*/
function showChoice() {

    timeUpDialog.querySelectorAll("[data-product]").forEach(function (option) {
        option.setAttribute("aria-pressed", String(option.dataset.product === product));
    });


    const note = product === "badge" ? "sticker.timeup.pinNote" : "sticker.timeup.keychainNote";

    timeUpNote.setAttribute("data-i18n", note);
    timeUpNote.textContent = I18n.t(note);
    timeUpNote.hidden = false;


    timeUpDownload.download = buildFileName();

    if (!timeUpPreview.hidden) {
        timeUpPreview.src = canvas.toDataURL("image/png");
    }

}


// The other product can still be picked here. The print stays the same.
timeUpDialog.querySelectorAll("[data-product]").forEach(function (option) {

    option.addEventListener("click", function () {

        chooseProduct(option.dataset.product);

        drawPreview();

        showChoice();

    });

});


// The dialog is the end of the activity, so Escape does not close it
timeUpDialog.addEventListener("cancel", function (event) {
    event.preventDefault();
});

window.addEventListener("languagechange", () => { if (!studio.classList.contains("hidden")) { drawWordList(); } if (!toast.hidden) { showToast(toastSeconds); } });
