/*
    Cyber Safety Sticker Studio

    Builds a sticker prompt from the options on the page and sends it to the
    OpenAI images endpoint using a key supplied by the user. The key is only
    ever held in this page (and in sessionStorage if the user asks for it).
*/


// API key elements
const apiKeyInput = document.getElementById("api-key");
const toggleKeyButton = document.getElementById("toggle-key-button");
const rememberKey = document.getElementById("remember-key");
const clearKeyButton = document.getElementById("clear-key-button");


// Design elements
const themeGrid = document.getElementById("theme-grid");
const subjectInput = document.getElementById("subject");
const captionInput = document.getElementById("caption");
const artStyle = document.getElementById("art-style");


// Output option elements
const modelSelect = document.getElementById("model");
const sizeSelect = document.getElementById("size");
const qualitySelect = document.getElementById("quality");
const transparentCheckbox = document.getElementById("transparent");


// Stage elements
const generateButton = document.getElementById("generate-button");
const stickerError = document.getElementById("sticker-error");
const stagePlaceholder = document.getElementById("stage-placeholder");
const stageLoading = document.getElementById("stage-loading");
const loadingMessage = document.getElementById("loading-message");
const stickerImage = document.getElementById("sticker-image");
const stageActions = document.getElementById("stage-actions");
const downloadButton = document.getElementById("download-button");
const regenerateButton = document.getElementById("regenerate-button");
const promptPreview = document.getElementById("prompt-preview");
const galleryBlock = document.getElementById("gallery-block");
const stickerGallery = document.getElementById("sticker-gallery");


// Where the key is kept when "remember" is ticked
const KEY_STORAGE_NAME = "thinksecure-openai-key";


// Stickers made during this visit
const sessionStickers = [];


// Timer used to rotate the loading messages
let loadingTimer = null;



/* ------------------------------
   Badge Themes
------------------------------ */

const themes = {

    "guardian": {
        subject: "a friendly cartoon shield mascot with a confident smile, "
            + "wearing a police style peaked cap and holding a small blue badge",
        caption: "CYBER GUARDIAN"
    },

    "scam-spotter": {
        subject: "a cheerful magnifying glass character inspecting a suspicious "
            + "text message bubble marked with a warning sign",
        caption: "SCAM SPOTTER"
    },

    "password-hero": {
        subject: "a heroic padlock character wearing a short cape, standing "
            + "proudly in front of a row of glowing key symbols",
        caption: "PASSWORD HERO"
    },

    "phishing-catcher": {
        subject: "a clever cartoon fish dodging a hook that is baited with a "
            + "fake email envelope",
        caption: "PHISHING CATCHER"
    },

    "privacy-protector": {
        subject: "a friendly detective character holding a shield over a "
            + "smartphone, keeping personal details hidden",
        caption: "PRIVACY PROTECTOR"
    },

    "custom": {
        subject: "",
        caption: ""
    }

};


// The theme that is currently selected
let selectedTheme = "guardian";



/* ------------------------------
   Art Styles
------------------------------ */

const artStyles = {

    "flat-vector": "clean flat vector illustration with bold simple shapes and "
        + "no gradients",

    "cartoon-mascot": "playful cartoon mascot illustration with soft rounded "
        + "shapes and expressive eyes",

    "retro-badge": "retro embroidered patch design with a stitched outline and "
        + "a classic emblem layout",

    "comic-outline": "bold comic book style with heavy black outlines and flat "
        + "cel shading",

    "kawaii": "cute kawaii chibi style with big eyes, rosy cheeks and soft "
        + "pastel accents",

    "pixel-art": "crisp 16 bit pixel art with a limited palette and clear "
        + "blocky edges"

};



/* ------------------------------
   Loading Messages
------------------------------ */

const loadingMessages = [
    "Drawing your sticker...",
    "Choosing the colours...",
    "Adding the sticker border...",
    "Almost there..."
];



/* ------------------------------
   Start Up
------------------------------ */

// Bring back a key that was remembered earlier in this tab
const storedKey = sessionStorage.getItem(KEY_STORAGE_NAME);

if (storedKey) {

    apiKeyInput.value = storedKey;
    rememberKey.checked = true;

}


// Fill in the default theme and show its prompt
applyTheme(selectedTheme);



/* ------------------------------
   API Key Handling
------------------------------ */

/*
    Show or hide the key so it can be checked for typing mistakes
*/
toggleKeyButton.addEventListener("click", function () {

    if (apiKeyInput.type === "password") {

        apiKeyInput.type = "text";
        toggleKeyButton.textContent = "Hide";

    } else {

        apiKeyInput.type = "password";
        toggleKeyButton.textContent = "Show";

    }

});


/*
    Save or forget the key whenever the tick box changes
*/
rememberKey.addEventListener("change", function () {

    if (rememberKey.checked) {

        sessionStorage.setItem(KEY_STORAGE_NAME, apiKeyInput.value.trim());

    } else {

        sessionStorage.removeItem(KEY_STORAGE_NAME);

    }

});


/*
    Keep the stored key up to date while the user types
*/
apiKeyInput.addEventListener("input", function () {

    if (rememberKey.checked) {

        sessionStorage.setItem(KEY_STORAGE_NAME, apiKeyInput.value.trim());

    }

});


/*
    Remove the key from the page and from storage
*/
clearKeyButton.addEventListener("click", function () {

    apiKeyInput.value = "";
    rememberKey.checked = false;

    sessionStorage.removeItem(KEY_STORAGE_NAME);

    showError("");

});



/* ------------------------------
   Design Options
------------------------------ */

/*
    Choose a badge theme
*/
themeGrid.addEventListener("click", function (event) {

    const button = event.target.closest(".theme-button");

    if (!button) {
        return;
    }


    // Move the highlight to the button that was clicked
    const allButtons = themeGrid.querySelectorAll(".theme-button");

    allButtons.forEach(function (item) {
        item.classList.remove("selected");
    });

    button.classList.add("selected");


    selectedTheme = button.dataset.theme;

    applyTheme(selectedTheme);

});


/*
    Put the wording for a theme into the form
*/
function applyTheme(name) {

    const theme = themes[name];

    subjectInput.value = theme.subject;
    captionInput.value = theme.caption;

    updatePromptPreview();

}


// Rebuild the preview whenever any design option changes
const promptInputs = [
    subjectInput,
    captionInput,
    artStyle,
    transparentCheckbox
];

promptInputs.forEach(function (element) {

    element.addEventListener("input", updatePromptPreview);
    element.addEventListener("change", updatePromptPreview);

});


/*
    Transparency is only available on gpt-image-1
*/
modelSelect.addEventListener("change", function () {

    const isDallE = modelSelect.value === "dall-e-3";

    transparentCheckbox.disabled = isDallE;

    if (isDallE) {
        transparentCheckbox.checked = false;
    }

    updatePromptPreview();

});



/* ------------------------------
   Prompt Building
------------------------------ */

/*
    Turn the form options into a single description for the image model
*/
function buildPrompt() {

    const subject = subjectInput.value.trim();
    const caption = captionInput.value.trim();
    const style = artStyles[artStyle.value];


    let prompt = "A die-cut reward sticker for a community cyber safety "
        + "education program.";

    prompt += " Subject: " + subject + ".";

    prompt += " Art style: " + style + ".";

    prompt += " Use a police inspired colour palette of deep navy blue, bright "
        + "blue and white, with a small blue and white chequered accent band.";

    prompt += " The artwork sits inside a thick white die-cut sticker border, "
        + "centred, filling the frame, with no drop shadow.";


    if (caption) {

        prompt += " Include the short caption \"" + caption + "\" in a bold, "
            + "clearly legible upper case sans-serif, spelled exactly as given.";

    }


    if (transparentCheckbox.checked && !transparentCheckbox.disabled) {

        prompt += " Transparent background outside the sticker border.";

    } else {

        prompt += " Plain flat light background outside the sticker border.";

    }


    prompt += " Friendly and approachable, suitable for all ages. Do not use "
        + "any real police badges, crests, logos or force insignia.";


    return prompt;

}


/*
    Show the prompt so the user can see what will be sent
*/
function updatePromptPreview() {

    if (!subjectInput.value.trim()) {

        promptPreview.textContent =
            "Describe what should be on the sticker to build a prompt.";

        return;
    }

    promptPreview.textContent = buildPrompt();

}



/* ------------------------------
   Generating
------------------------------ */

generateButton.addEventListener("click", generateSticker);

regenerateButton.addEventListener("click", generateSticker);


/*
    Send the prompt to OpenAI and show the picture that comes back
*/
async function generateSticker() {

    const apiKey = apiKeyInput.value.trim();


    // Check the form before spending anything
    if (!apiKey) {

        showError("Enter your OpenAI API key to generate a sticker.");
        apiKeyInput.focus();

        return;
    }

    if (!subjectInput.value.trim()) {

        showError("Describe what should be on the sticker.");
        subjectInput.focus();

        return;
    }


    showError("");

    setLoading(true);


    const prompt = buildPrompt();

    promptPreview.textContent = prompt;


    // Image requests can take a while, so allow plenty of time
    const controller = new AbortController();

    const timeout = setTimeout(function () {
        controller.abort();
    }, 180000);


    try {

        const response = await fetch(
            "https://api.openai.com/v1/images/generations",
            {
                method: "POST",
                headers: {
                    "Authorization": "Bearer " + apiKey,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(buildRequestBody(prompt)),
                signal: controller.signal
            }
        );


        const result = await response.json();


        if (!response.ok) {

            showError(describeApiError(response.status, result));

            return;
        }


        const imageData = result.data && result.data[0]
            ? result.data[0].b64_json
            : null;

        if (!imageData) {

            showError("OpenAI did not return an image. Please try again.");

            return;
        }


        showSticker("data:image/png;base64," + imageData);

    } catch (error) {

        if (error.name === "AbortError") {

            showError("The request took too long and was stopped. "
                + "Try a lower quality setting.");

        } else {

            showError("Could not reach OpenAI. Check your internet connection "
                + "and that the key is allowed to be used from a browser.");

        }

    } finally {

        clearTimeout(timeout);

        setLoading(false);

    }

}


/*
    Each model takes slightly different options
*/
function buildRequestBody(prompt) {

    const model = modelSelect.value;


    if (model === "dall-e-3") {

        return {
            model: "dall-e-3",
            prompt: prompt,
            n: 1,
            size: toDallESize(sizeSelect.value),
            quality: qualitySelect.value === "high" ? "hd" : "standard",
            response_format: "b64_json"
        };

    }


    return {
        model: "gpt-image-1",
        prompt: prompt,
        n: 1,
        size: sizeSelect.value,
        quality: qualitySelect.value,
        output_format: "png",
        background: transparentCheckbox.checked ? "transparent" : "opaque"
    };

}


/*
    dall-e-3 uses its own set of sizes
*/
function toDallESize(size) {

    if (size === "1024x1536") {
        return "1024x1792";
    }

    if (size === "1536x1024") {
        return "1792x1024";
    }

    return "1024x1024";

}


/*
    Turn an API failure into something a user can act on
*/
function describeApiError(status, result) {

    const detail = result && result.error && result.error.message
        ? result.error.message
        : "";


    if (status === 401) {

        return "That API key was rejected. Check it was copied in full and "
            + "has not been revoked.";
    }

    if (status === 403) {

        return "Your OpenAI organisation is not verified for this model. "
            + "Switch the model to dall-e-3, or verify your organisation in "
            + "the OpenAI dashboard.";
    }

    if (status === 429) {

        return "Rate limit or spending limit reached on this key. Wait a "
            + "moment, or check the billing page for your OpenAI account.";
    }

    if (status === 400 && detail.toLowerCase().includes("safety")) {

        return "The safety system blocked this prompt. Try rewording what "
            + "should be on the sticker.";
    }

    if (status >= 500) {

        return "OpenAI had a problem generating the image. Please try again.";
    }


    return detail || ("The request failed with status " + status + ".");

}



/* ------------------------------
   Stage Display
------------------------------ */

/*
    Swap the preview area between its empty, loading and finished states
*/
function setLoading(isLoading) {

    generateButton.disabled = isLoading;
    regenerateButton.disabled = isLoading;

    generateButton.textContent = isLoading
        ? "Generating..."
        : "Generate Sticker";


    if (isLoading) {

        stagePlaceholder.classList.add("hidden");
        stickerImage.classList.add("hidden");
        stageActions.classList.add("hidden");
        stageLoading.classList.remove("hidden");

        startLoadingMessages();

    } else {

        stageLoading.classList.add("hidden");

        stopLoadingMessages();


        // Go back to the empty state if nothing was produced
        if (stickerImage.classList.contains("hidden")
            && sessionStickers.length === 0) {

            stagePlaceholder.classList.remove("hidden");

        }

    }

}


/*
    Cycle the waiting message so the page does not look stuck
*/
function startLoadingMessages() {

    let index = 0;

    loadingMessage.textContent = loadingMessages[index];

    loadingTimer = setInterval(function () {

        index = (index + 1) % loadingMessages.length;

        loadingMessage.textContent = loadingMessages[index];

    }, 6000);

}


function stopLoadingMessages() {

    if (loadingTimer) {

        clearInterval(loadingTimer);
        loadingTimer = null;

    }

}


/*
    Show a finished sticker and make it downloadable
*/
function showSticker(dataUrl) {

    stagePlaceholder.classList.add("hidden");

    stickerImage.src = dataUrl;
    stickerImage.classList.remove("hidden");

    stageActions.classList.remove("hidden");

    downloadButton.href = dataUrl;
    downloadButton.download = buildFileName();


    addToGallery(dataUrl);

}


/*
    Name the download after the theme and the time it was made
*/
function buildFileName() {

    const stamp = new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[:T]/g, "-");

    return "thinksecure-" + selectedTheme + "-" + stamp + ".png";

}


/*
    Keep every sticker made during this visit
*/
function addToGallery(dataUrl) {

    sessionStickers.push(dataUrl);

    galleryBlock.classList.remove("hidden");


    const thumbnail = document.createElement("button");

    thumbnail.type = "button";
    thumbnail.className = "gallery-item";
    thumbnail.title = "Show this sticker";


    const image = document.createElement("img");

    image.src = dataUrl;
    image.alt = "Sticker made earlier in this session";

    thumbnail.appendChild(image);


    thumbnail.addEventListener("click", function () {

        stickerImage.src = dataUrl;
        stickerImage.classList.remove("hidden");

        stagePlaceholder.classList.add("hidden");
        stageActions.classList.remove("hidden");

        downloadButton.href = dataUrl;
        downloadButton.download = buildFileName();

    });


    stickerGallery.appendChild(thumbnail);

}


/*
    Show or clear the message under the generate button
*/
function showError(message) {

    stickerError.textContent = message;

}
