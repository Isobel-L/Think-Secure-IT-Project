/*
    Passphrase Handoff

    When someone arrives from the Passphrase Maker with ?check=passphrase,
    this drops the passphrase they just built into the checker and runs it,
    so they can see straight away how the four words score.

    Kept separate from password-checker.js so the checker itself stays
    independent of the rest of the game.
*/


// Where the Passphrase Maker leaves the chosen words
const PHRASE_STORAGE_NAME = "thinksecure-passphrase";


// Only act when the Passphrase Maker sent the visitor here
const wantsCheck =
    new URLSearchParams(window.location.search).get("check") === "passphrase";


if (wantsCheck) {

    fillInPassphrase();

}


/*
    Put the passphrase into the form and check it
*/
function fillInPassphrase() {

    const stored = sessionStorage.getItem(PHRASE_STORAGE_NAME);

    if (!stored) {
        return;
    }


    let passphrase = null;

    try {

        passphrase = JSON.parse(stored);

    } catch (error) {

        return;
    }


    if (!passphrase || !passphrase.phrase) {
        return;
    }


    const form = document.getElementById("passwordForm");
    const input = document.getElementById("passwordInput");

    if (!form || !input) {
        return;
    }


    showNote(form, passphrase.phrase);


    input.value = passphrase.phrase;


    // Run the same check the Check Password button would
    form.dispatchEvent(new Event("submit", {
        bubbles: true,
        cancelable: true
    }));

}


/*
    Explain why the field is already filled in
*/
function showNote(form, phrase) {

    const note = document.createElement("p");

    note.className = "handoff-note";

    note.textContent = "This is the passphrase you just built. "
        + "Compare it against a password you would normally choose.";


    form.parentNode.insertBefore(note, form);

}
