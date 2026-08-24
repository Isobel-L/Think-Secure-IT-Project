// Get sections from the HTML
const startSection = document.getElementById("quiz-start");
const scenarioSection = document.getElementById("quiz-scenario");
const feedbackSection = document.getElementById("quiz-feedback");
const completeSection = document.getElementById("quiz-complete");


// Get form elements
const ageRange = document.getElementById("age-range");
const gender = document.getElementById("gender");
const formError = document.getElementById("form-error");


// Get buttons
const startButton = document.getElementById("start-quiz-button");
const safeButton = document.getElementById("safe-button");
const scamButton = document.getElementById("scam-button");
const finishButton = document.getElementById("finish-button");


// Get feedback elements
const feedbackTitle = document.getElementById("feedback-title");
const feedbackMessage = document.getElementById("feedback-message");


// Corner button through to the next activity
const quizNextStep = document.getElementById("quiz-next-step");



/*
    Start Quiz
*/
startButton.addEventListener("click", function () {

    // Make sure both options have been selected
    if (ageRange.value === "" || gender.value === "") {

        formError.textContent =
            "Please select your age range and gender before starting.";

        return;
    }


    // Remove any previous error
    formError.textContent = "";


    // Hide demographic section
    startSection.classList.add("hidden");


    // Show first scenario
    scenarioSection.classList.remove("hidden");

});



/*
    User selects "Looks Safe"
*/
safeButton.addEventListener("click", function () {

    showFeedback(false);

});



/*
    User selects "Looks Like a Scam"
*/
scamButton.addEventListener("click", function () {

    showFeedback(true);

});



/*
    Display feedback
*/
function showFeedback(correct) {

    // Hide scenario
    scenarioSection.classList.add("hidden");


    // Show feedback
    feedbackSection.classList.remove("hidden");


    if (correct) {

        feedbackTitle.textContent = "Correct!";

        feedbackMessage.textContent =
            "This message contains several warning signs of a potential scam, including an unexpected payment request and an unfamiliar web link.";

    } else {

        feedbackTitle.textContent = "Not Quite.";

        feedbackMessage.textContent =
            "This message could be a scam. Unexpected payment requests and unfamiliar links are common warning signs to look out for.";

    }

}



/*
    Finish Quiz
*/
finishButton.addEventListener("click", function () {

    feedbackSection.classList.add("hidden");

    completeSection.classList.remove("hidden");


    // Only offer the next activity once the quiz has been finished
    quizNextStep.classList.remove("hidden");

});