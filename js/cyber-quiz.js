/* ============================================================
   ThinkSecure - Cyber Safety Quiz
   Realistic interactive scenarios
============================================================ */


const ALL_AGES = [

    "under-18",
    "18-24",
    "25-34",
    "35-44",
    "45-54",
    "55-64",
    "65-plus"

];


const ALL_GENDERS = [

    "woman",
    "man",
    "non-binary",
    "prefer-not"

];



/*
    Risky situations are based on the scam categories
    supplied for the ThinkSecure project.

    Safe scenarios are deliberately included so that
    users cannot assume every scenario is a scam.
*/


const quizQuestions = [


    /* =====================================================
       UNSAFE MARKETPLACE
    ===================================================== */

    {

        id:
            "unsafe-marketplace",

        targeted:
            false,

        safe:
            false,

        ages:
            ALL_AGES,

        genders:
            ALL_GENDERS,

        medium:
            "Laptop • Online marketplace",

        type:
            "marketplace",

        title:
            "A console at a very unusual price",

        intro:
            "You are shopping online and find a brand-new gaming console for much less than every other retailer.",

        instruction:
            "Open the product listing and inspect the seller's checkout instructions before you decide.",

        question:
            "What would you do?",


        visual: {

            store:
                "MarketLane",

            product:
                "NextGen Console",

            icon:
                "🎮",

            price:
                "$299",

            oldPrice:
                "$799",

            rating:
                "4.9 ★ · 21 reviews",

            seller:
                "TechDeals_AU",

            note:
                "Only 2 left. Seller says direct bank transfer is required to keep the sale price.",

            url:
                "marketlane.example/item/nextgen-console",

            action:
                "Open listing"

        },


        inspection: {

            title:
                "Seller checkout",

            url:
                "techdeals-payment.example/checkout",

            kind:
                "checkout",

            heading:
                "Complete your order",

            body:
                "To keep the discounted price, the seller asks you to make a direct bank transfer.",

            detail:
                "The page also asks you to upload a photo of your driver's licence for identity verification.",

            button:
                "Continue to bank transfer"

        },


        answers: [

            {

                id:
                    "pay",

                text:
                    "Pay quickly before the deal disappears"

            },

            {

                id:
                    "verify",

                text:
                    "Stop and independently research the seller before paying"

            },

            {

                id:
                    "id",

                text:
                    "Send my ID first so the seller knows I am genuine"

            }

        ],


        correctAnswer:
            "verify",


        feedback:
            "The listing contains several warning signs: an unusually low price, urgency, a request to move away from normal payment protections and a request for identity documents.",


        tips: [

            "Be cautious when an advertised price is unusually low.",

            "Use reputable payment services with consumer protection.",

            "Do not send identification documents to unfamiliar sellers.",

            "Research the seller independently instead of relying only on reviews shown on the listing."

        ]

    },



    /* =====================================================
       SAFE MARKETPLACE
    ===================================================== */

    {

        id:
            "safe-marketplace",

        targeted:
            false,

        safe:
            true,

        ages:
            ALL_AGES,

        genders:
            ALL_GENDERS,

        medium:
            "Laptop • Online retailer",

        type:
            "marketplace",

        title:
            "A normal sale from a retailer you use",

        intro:
            "You manually navigate to a retailer you regularly use and find a game on sale at a normal discount.",

        instruction:
            "Open the product listing and inspect how the checkout works.",

        question:
            "What would you do?",


        visual: {

            store:
                "GameHub AU",

            product:
                "Adventure Quest",

            icon:
                "🕹️",

            price:
                "$49",

            oldPrice:
                "$69",

            rating:
                "4.7 ★ · 1,284 reviews",

            seller:
                "Sold by GameHub AU",

            note:
                "Standard checkout with card and protected payment options. No request to move the transaction elsewhere.",

            url:
                "gamehub.example/games/adventure-quest",

            action:
                "Open listing"

        },


        inspection: {

            title:
                "GameHub checkout",

            url:
                "gamehub.example/checkout",

            kind:
                "checkout-safe",

            heading:
                "Secure checkout",

            body:
                "You reached this page through the retailer's normal website and the payment remains within its standard checkout.",

            detail:
                "The price is consistent with an ordinary sale and no unusual identity information is requested.",

            button:
                "Continue to payment"

        },


        answers: [

            {

                id:
                    "continue",

                text:
                    "Continue using the retailer's normal checkout if I want the game"

            },

            {

                id:
                    "report",

                text:
                    "Report the website as a scam because the item is discounted"

            },

            {

                id:
                    "transfer",

                text:
                    "Ask whether I can pay by direct bank transfer instead"

            }

        ],


        correctAnswer:
            "continue",


        feedback:
            "Nothing in this scenario automatically indicates a scam. You navigated to the retailer yourself, the sale price is reasonable and the transaction stays within the retailer's normal checkout.",


        tips: [

            "Not every online deal is fraudulent.",

            "Consider the source, payment method and context together.",

            "Keeping a purchase within a trusted platform generally provides more protection than moving it elsewhere."

        ]

    },



    /* =====================================================
       PHISHING EMAIL
    ===================================================== */

    {

        id:
            "phishing-email",

        targeted:
            false,

        safe:
            false,

        ages:
            ALL_AGES,

        genders:
            ALL_GENDERS,

        medium:
            "Laptop • Email",

        type:
            "email",

        title:
            "An urgent account security email",

        intro:
            "You open your laptop and notice an unread email saying your account will be suspended unless you act quickly.",

        instruction:
            "Open the unread email. If it contains a button or link, you can safely inspect the simulated page it opens.",

        question:
            "What would you do?",


        visual: {

            sender:
                "Account Security",

            address:
                "security-update@account-help.example",

            subject:
                "URGENT: Your account will be suspended",

            preview:
                "Verify your information within 30 minutes to prevent suspension.",

            body:
                "We noticed unusual activity. You must verify your account within 30 minutes or access will be suspended.",

            linkText:
                "Verify my account",

            time:
                "9:38"

        },


        inspection: {

            title:
                "Account verification",

            url:
                "account-security-check.example/login",

            kind:
                "login",

            heading:
                "Verify your identity",

            body:
                "The page asks for your email address and password.",

            detail:
                "It also requests the verification code sent to your phone.",

            button:
                "Verify account"

        },


        answers: [

            {

                id:
                    "login",

                text:
                    "Enter my details so the account is not suspended"

            },

            {

                id:
                    "official",

                text:
                    "Close it and access the service through its official app or website"

            },

            {

                id:
                    "reply",

                text:
                    "Reply to the email and ask whether it is genuine"

            }

        ],


        correctAnswer:
            "official",


        feedback:
            "Unexpected messages that create urgency and direct you to enter credentials through a link are important warning signs.",


        tips: [

            "Avoid entering account credentials through unexpected links.",

            "Navigate to the organisation's official app or website yourself.",

            "Do not provide passwords or authentication codes through suspicious pages."

        ]

    },



    /* =====================================================
       SAFE EMAIL
    ===================================================== */

    {

        id:
            "safe-email",

        targeted:
            false,

        safe:
            true,

        ages:
            ALL_AGES,

        genders:
            ALL_GENDERS,

        medium:
            "Laptop • Email",

        type:
            "email",

        title:
            "A password change confirmation",

        intro:
            "You have just changed your password in an account's official settings. A confirmation email arrives immediately afterwards.",

        instruction:
            "Open the email and check what it asks you to do.",

        question:
            "What would you do?",


        visual: {

            sender:
                "Account Security",

            address:
                "no-reply@service.example",

            subject:
                "Your password was changed",

            preview:
                "This confirms that your password was successfully changed.",

            body:
                "Your password was changed successfully. If you made this change, no further action is required.",

            linkText:
                null,

            time:
                "9:41"

        },


        inspection:
            null,


        answers: [

            {

                id:
                    "ignore",

                text:
                    "No action — I made the password change myself"

            },

            {

                id:
                    "panic",

                text:
                    "Assume my account has definitely been hacked"

            },

            {

                id:
                    "reply",

                text:
                    "Reply with my new password to confirm it"

            }

        ],


        correctAnswer:
            "ignore",


        feedback:
            "This message matches an action you just performed and does not ask you to provide credentials or urgently follow an unfamiliar link.",


        tips: [

            "Consider whether a message matches something you actually did.",

            "Legitimate confirmation messages often require no further action.",

            "Never send your password by email."

        ]

    },



    /* =====================================================
       SAFE GAMING STORE
    ===================================================== */

    {

        id:
            "safe-gaming-store",

        targeted:
            false,

        safe:
            true,

        ages: [

            "under-18",
            "18-24",
            "25-34",
            "35-44",
            "45-54"

        ],

        genders:
            ALL_GENDERS,

        medium:
            "Gaming system • Digital store",

        type:
            "gaming-store",

        title:
            "A game is discounted in the console store",

        intro:
            "You open the digital store directly from your gaming system and notice a game on sale.",

        instruction:
            "Open the game tile and inspect the purchase details.",

        question:
            "What would you do?",


        visual: {

            title:
                "Galaxy Racers 4",

            publisher:
                "Nova Games",

            icon:
                "🚀",

            price:
                "$34.95",

            oldPrice:
                "$59.95",

            note:
                "Digital purchase through the built-in console store.",

            action:
                "View game"

        },


        inspection: {

            title:
                "Console store listing",

            url:
                "Built-in console store",

            kind:
                "gaming-safe",

            heading:
                "Galaxy Racers 4",

            body:
                "The purchase remains inside the console's built-in store using your normal account payment method.",

            detail:
                "You are not being redirected to another website or asked to share your password.",

            button:
                "Purchase"

        },


        answers: [

            {

                id:
                    "purchase",

                text:
                    "Purchase it through the official console store if I want the game"

            },

            {

                id:
                    "scam",

                text:
                    "Assume the discount means it must be a scam"

            },

            {

                id:
                    "outside",

                text:
                    "Look on social media for someone selling it even cheaper"

            }

        ],


        correctAnswer:
            "purchase",


        feedback:
            "A discount alone is not evidence of a scam. In this situation you opened the official console store yourself and the purchase remains inside that platform.",


        tips: [

            "Use official stores and trusted platforms where possible.",

            "Judge a sale by the source and payment process, not the discount alone.",

            "Be more cautious when someone tries to move a transaction outside the official platform."

        ]

    },



    /* =====================================================
       GAMING MESSAGE SCAM
    ===================================================== */

    {

        id:
            "gaming-message-scam",

        targeted:
            false,

        safe:
            false,

        ages: [

            "under-18",
            "18-24",
            "25-34"

        ],

        genders:
            ALL_GENDERS,

        medium:
            "Gaming system • Player message",

        type:
            "gaming-message",

        title:
            "A player offers you a free rare item",

        intro:
            "Another player messages you after a game and says they can give you a valuable in-game cosmetic for free.",

        instruction:
            "Open the player message and inspect the website they sent you.",

        question:
            "What would you do?",


        visual: {

            player:
                "xXShadowWolfXx",

            avatar:
                "🐺",

            message:
                "I've got a spare legendary skin code. Sign in here and it will be added to your account.",

            link:
                "free-game-skins.example"

        },


        inspection: {

            title:
                "Free skin website",

            url:
                "free-game-skins.example/login",

            kind:
                "gaming-login",

            heading:
                "Claim your legendary skin",

            body:
                "The site asks you to sign in using your gaming account username and password.",

            detail:
                "It says the login is required to deliver the item to your account.",

            button:
                "Sign in and claim"

        },


        answers: [

            {

                id:
                    "login",

                text:
                    "Sign in because the player offered the item for free"

            },

            {

                id:
                    "avoid",

                text:
                    "Avoid the site and only use official game or console services"

            },

            {

                id:
                    "email",

                text:
                    "Give the player my account email instead"

            }

        ],


        correctAnswer:
            "avoid",


        feedback:
            "Unknown players can use fake login pages to steal gaming accounts. The promise of a free valuable item is designed to make the link feel worth the risk.",


        tips: [

            "Do not enter gaming credentials into websites sent by unknown players.",

            "Use official game and console services for account management.",

            "Treat valuable rewards offered for almost nothing with caution."

        ]

    },



    /* =====================================================
       EMPLOYMENT SCAM
    ===================================================== */

    {

        id:
            "employment-scam",

        targeted:
            true,

        safe:
            false,

        ages: [
            "18-24"
        ],

        genders:
            ALL_GENDERS,

        medium:
            "Laptop • Job website",

        type:
            "job",

        title:
            "An unusually easy remote job",

        intro:
            "You are looking for work online and find a remote job offering very high pay for simple online tasks.",

        instruction:
            "Open the job advertisement and inspect what the employer asks you to do next.",

        question:
            "What would you do?",


        visual: {

            site:
                "QuickCareers",

            role:
                "Remote Product Reviewer",

            pay:
                "$1,500 per week",

            company:
                "Bright Retail Solutions",

            description:
                "No experience required · Work from home · Immediate start",

            action:
                "Apply now"

        },


        inspection: {

            title:
                "Job application",

            url:
                "quickcareers.example/start",

            kind:
                "job",

            heading:
                "Activate your worker account",

            body:
                "Before you can access paid tasks, the employer asks you to send a $250 activation deposit.",

            detail:
                "The application also requests your bank account details and identification documents.",

            button:
                "Pay activation deposit"

        },


        answers: [

            {

                id:
                    "deposit",

                text:
                    "Pay the deposit because the weekly pay is high"

            },

            {

                id:
                    "verify",

                text:
                    "Stop and verify the employer through independent official sources"

            },

            {

                id:
                    "bank",

                text:
                    "Send my bank details first so they can pay me"

            }

        ],


        correctAnswer:
            "verify",


        feedback:
            "Employment scams can imitate genuine businesses and may ask applicants to send money before they can begin working.",


        tips: [

            "Be suspicious of employment opportunities that require you to send money to an employer.",

            "Verify organisations using contact details from their legitimate website.",

            "Be cautious of unusually high pay for very simple work."

        ]

    },



    /* =====================================================
       SEXTORTION
    ===================================================== */

    {

        id:
            "sextortion",

        targeted:
            true,

        safe:
            false,

        ages: [
            "18-24"
        ],

        genders: [
            "man"
        ],

        medium:
            "Phone • Direct messages",

        type:
            "phone-message",

        title:
            "A new online contact asks for a private image",

        intro:
            "Someone you recently met online starts messaging you privately and asks you to send an intimate image.",

        instruction:
            "Tap the notification and read the conversation before deciding what you would do.",

        question:
            "What would you do?",


        visual: {

            app:
                "Messages",

            sender:
                "New Contact",

            preview:
                "Come on... you can trust me.",


            messages: [

                {

                    text:
                        "You seem really nice 🙂"

                },

                {

                    text:
                        "Send me something private. I promise it stays between us."

                },

                {

                    text:
                        "No one else will ever see it."

                }

            ]

        },


        inspection:
            null,


        answers: [

            {

                id:
                    "send",

                text:
                    "Send the image because they promised it will remain private"

            },

            {

                id:
                    "refuse",

                text:
                    "Refuse, stop the conversation and protect my account"

            },

            {

                id:
                    "trade",

                text:
                    "Ask them to send an image first"

            }

        ],


        correctAnswer:
            "refuse",


        feedback:
            "Unknown people may use fake profiles to build trust and obtain intimate images that can later be used for blackmail.",


        tips: [

            "Be cautious about friend requests or private messages from people you do not know personally.",

            "Avoid sending intimate images to unknown online contacts.",

            "If someone threatens or blackmails you, do not send money and seek support."

        ]

    },



    /* =====================================================
       FAMILY IMPERSONATION
    ===================================================== */

    {

        id:
            "family-impersonation",

        targeted:
            true,

        safe:
            false,

        ages: [

            "55-64",
            "65-plus"

        ],

        genders: [
            "woman"
        ],

        medium:
            "Phone • Text message",

        type:
            "phone-message",

        title:
            "A message from a family member's 'new number'",

        intro:
            "Your phone vibrates and a message arrives from a number you do not recognise.",

        instruction:
            "Tap the notification and read the full conversation.",

        question:
            "What would you do?",


        visual: {

            app:
                "Messages",

            sender:
                "Unknown Number",

            preview:
                "Hey Mum, it's me. I broke my phone...",


            messages: [

                {

                    text:
                        "Hey Mum, it's me."

                },

                {

                    text:
                        "I broke my phone so this is my new number."

                },

                {

                    text:
                        "I'm really stuck and need some money urgently. Can you transfer it today?"

                }

            ]

        },


        inspection:
            null,


        answers: [

            {

                id:
                    "transfer",

                text:
                    "Transfer the money because my family member needs help"

            },

            {

                id:
                    "call",

                text:
                    "Call the family member using the number I already have saved"

            },

            {

                id:
                    "reply",

                text:
                    "Reply asking how much money they need"

            }

        ],


        correctAnswer:
            "call",


        feedback:
            "Family impersonation scams use urgency and emotion to convince people to transfer money before checking who is really messaging them.",


        tips: [

            "Do not allow urgency to pressure you into transferring money.",

            "Call the person's original saved phone number.",

            "Consider whether the wording and tone match the family member."

        ]

    },



    /* =====================================================
       REMOTE ACCESS
    ===================================================== */

    {

        id:
            "remote-access",

        targeted:
            true,

        safe:
            false,

        ages: [

            "55-64",
            "65-plus"

        ],

        genders:
            ALL_GENDERS,

        medium:
            "Desktop computer • System warning",

        type:
            "desktop",

        title:
            "Your computer suddenly shows a support warning",

        intro:
            "You are using your computer when a warning appears telling you there is a serious problem and that you need technical support.",

        instruction:
            "Open the warning and inspect what the support service tells you to do.",

        question:
            "What would you do?",


        visual: {

            heading:
                "Security warning",

            message:
                "A critical system issue has been detected. Contact Technical Support immediately.",

            phone:
                "1800 000 000",

            action:
                "View support instructions"

        },


        inspection: {

            title:
                "Technical support instructions",

            url:
                "Support call",

            kind:
                "support",

            heading:
                "Remote repair required",

            body:
                "The person on the phone asks you to download a remote access application so they can repair your computer.",

            detail:
                "They tell you not to turn the computer off and ask you to open your online banking.",

            button:
                "Download remote access app"

        },


        answers: [

            {

                id:
                    "download",

                text:
                    "Install the software so support can fix the computer"

            },

            {

                id:
                    "official",

                text:
                    "Stop and independently contact a trusted support service"

            },

            {

                id:
                    "bank",

                text:
                    "Open online banking while they investigate"

            }

        ],


        correctAnswer:
            "official",


        feedback:
            "Remote access software can give another person extensive control over your computer and access to sensitive information.",


        tips: [

            "Never download remote access software at the request of an unexpected caller.",

            "Contact the organisation using contact details you already trust.",

            "Do not allow technical language or urgency to pressure you."

        ]

    },



    /* =====================================================
       INVESTMENT SCAM
    ===================================================== */

    {

        id:
            "investment-scam",

        targeted:
            true,

        safe:
            false,

        ages: [
            "65-plus"
        ],

        genders:
            ALL_GENDERS,

        medium:
            "Laptop • Social media advertisement",

        type:
            "investment",

        title:
            "A sponsored investment advertisement",

        intro:
            "While browsing social media you see an advertisement promising strong investment returns with very little risk.",

        instruction:
            "Open the sponsored advertisement and inspect the investment website.",

        question:
            "What would you do?",


        visual: {

            profile:
                "Elite Growth Investments",

            headline:
                "Turn $500 into your financial future",

            description:
                "Join thousands of successful investors. High returns. Low risk. Expert support.",

            action:
                "Learn more"

        },


        inspection: {

            title:
                "Investment platform",

            url:
                "elite-invest.example/start",

            kind:
                "investment",

            heading:
                "Start investing today",

            body:
                "Customer Support offers to remotely access your device and help create cryptocurrency accounts.",

            detail:
                "The website describes the investment as low risk while promising unusually high returns.",

            button:
                "Start investing"

        },


        answers: [

            {

                id:
                    "small",

                text:
                    "Invest a small amount first to test whether it works"

            },

            {

                id:
                    "verify",

                text:
                    "Stop and independently investigate the investment"

            },

            {

                id:
                    "remote",

                text:
                    "Let Customer Support remotely set up my accounts"

            }

        ],


        correctAnswer:
            "verify",


        feedback:
            "Professional-looking websites, social media advertisements and apparent investment returns do not guarantee legitimacy.",


        tips: [

            "Be wary of investment opportunities advertised through social media.",

            "Never allow unfamiliar people remote access to your device.",

            "Treat promises of high returns with little or no risk as a warning sign."

        ]

    },



    /* =====================================================
       ARREST / GOVERNMENT THREAT
    ===================================================== */

    {

        id:
            "arrest-threat",

        targeted:
            false,

        safe:
            false,

        ages:
            ALL_AGES,

        genders:
            ALL_GENDERS,

        medium:
            "Phone • Incoming call",

        type:
            "phone-call",

        title:
            "A caller says you owe an urgent government debt",

        intro:
            "Your phone rings. The caller says they are from a government agency and that you must pay immediately or you may be arrested.",

        instruction:
            "Answer the simulated call to hear what the caller says before making your decision.",

        question:
            "What would you do?",


        visual: {

            sender:
                "Government Agency",

            number:
                "(08) 7000 0000",

            transcript:
                "You have an unpaid fine. You must purchase gift cards today and read the card numbers to me or enforcement action may begin."

        },


        inspection:
            null,


        answers: [

            {

                id:
                    "pay",

                text:
                    "Buy the gift cards so the issue is resolved immediately"

            },

            {

                id:
                    "verify",

                text:
                    "Hang up and contact the agency using an official number I find myself"

            },

            {

                id:
                    "details",

                text:
                    "Give the caller my details so they can confirm the debt"

            }

        ],


        correctAnswer:
            "verify",


        feedback:
            "Caller ID can be manipulated, and demands for immediate gift-card payments are a major warning sign.",


        tips: [

            "Hang up and contact the organisation using a known, reputable number.",

            "Police and reputable government agencies do not request payment using gift cards.",

            "Do not let threats or urgency pressure you into acting before checking."

        ]

    }

];



/* ============================================================
   HTML ELEMENTS
============================================================ */


const startSection =
    document.getElementById(
        "quiz-start"
    );


const scenarioSection =
    document.getElementById(
        "quiz-scenario"
    );


const feedbackSection =
    document.getElementById(
        "quiz-feedback"
    );


const completeSection =
    document.getElementById(
        "quiz-complete"
    );


const quizNextStep =
    document.getElementById(
        "quiz-next-step"
    );


const ageRange =
    document.getElementById(
        "age-range"
    );


const gender =
    document.getElementById(
        "gender"
    );


const formError =
    document.getElementById(
        "form-error"
    );


const startButton =
    document.getElementById(
        "start-quiz-button"
    );


const nextButton =
    document.getElementById(
        "next-question-button"
    );


const restartButton =
    document.getElementById(
        "restart-button"
    );


const questionCounter =
    document.getElementById(
        "question-counter"
    );


const scenarioMedium =
    document.getElementById(
        "scenario-medium"
    );


const progressFill =
    document.getElementById(
        "progress-fill"
    );


const scenarioTitle =
    document.getElementById(
        "scenario-title"
    );


const scenarioIntroduction =
    document.getElementById(
        "scenario-introduction"
    );


const instructionText =
    document.getElementById(
        "instruction-text"
    );


const scenarioVisual =
    document.getElementById(
        "scenario-visual"
    );


const decisionArea =
    document.getElementById(
        "decision-area"
    );


const scenarioQuestion =
    document.getElementById(
        "scenario-question"
    );


const answerButtons =
    document.getElementById(
        "answer-buttons"
    );


const feedbackStatus =
    document.getElementById(
        "feedback-status"
    );


const feedbackIcon =
    document.getElementById(
        "feedback-icon"
    );


const feedbackLabel =
    document.getElementById(
        "feedback-label"
    );


const feedbackTitle =
    document.getElementById(
        "feedback-title"
    );


const feedbackMessage =
    document.getElementById(
        "feedback-message"
    );


const cyberTipList =
    document.getElementById(
        "cyber-tip-list"
    );


const scoreValue =
    document.getElementById(
        "score-value"
    );


const scoreMessage =
    document.getElementById(
        "score-message"
    );


const simulationModal =
    document.getElementById(
        "simulation-modal"
    );


const simulationTitle =
    document.getElementById(
        "simulation-title"
    );


const simulationContent =
    document.getElementById(
        "simulation-content"
    );


const closeSimulationButton =
    document.getElementById(
        "close-simulation"
    );



/* ============================================================
   QUIZ STATE
============================================================ */

let selectedQuestions = [];

let currentQuestionIndex = 0;

let score = 0;

let answerLocked = false;



/* ============================================================
   START QUIZ
============================================================ */

startButton.addEventListener(
    "click",
    startQuiz
);


function startQuiz() {

    if (
        !ageRange.value ||
        !gender.value
    ) {

        formError.textContent =
            "Please select your age range and gender before starting.";

        return;
    }


    formError.textContent =
        "";


    selectedQuestions =
        chooseQuestions(
            ageRange.value,
            gender.value
        );


    currentQuestionIndex =
        0;


    score =
        0;


    showSection(
        scenarioSection
    );


    renderQuestion();

}



/* ============================================================
   CHOOSE QUESTIONS
============================================================ */

function chooseQuestions(
    selectedAge,
    selectedGender
) {

    const eligible =
        quizQuestions.filter(
            function (question) {

                return (

                    question.ages.includes(
                        selectedAge
                    ) &&

                    question.genders.includes(
                        selectedGender
                    )

                );

            }
        );


    const targeted =
        shuffleArray(
            eligible.filter(
                function (question) {

                    return question.targeted;

                }
            )
        );


    const safeGeneral =
        shuffleArray(
            eligible.filter(
                function (question) {

                    return (
                        !question.targeted &&
                        question.safe
                    );

                }
            )
        );


    const threatGeneral =
        shuffleArray(
            eligible.filter(
                function (question) {

                    return (
                        !question.targeted &&
                        !question.safe
                    );

                }
            )
        );


    const chosen = [];


    /*
        Add up to two demographic-specific questions.
    */

    for (
        const question
        of targeted
    ) {

        if (
            chosen.length >= 2
        ) {

            break;

        }


        chosen.push(
            question
        );

    }


    /*
        Aim for two legitimate/safe situations.
    */

    for (
        const question
        of safeGeneral
    ) {

        if (
            chosen.filter(
                function (item) {

                    return item.safe;

                }
            ).length >= 2
        ) {

            break;

        }


        if (
            !chosen.some(
                function (item) {

                    return (
                        item.id ===
                        question.id
                    );

                }
            )
        ) {

            chosen.push(
                question
            );

        }

    }


    /*
        Fill remaining positions with threats.
    */

    for (
        const question
        of threatGeneral
    ) {

        if (
            chosen.length >= 5
        ) {

            break;

        }


        if (
            !chosen.some(
                function (item) {

                    return (
                        item.id ===
                        question.id
                    );

                }
            )
        ) {

            chosen.push(
                question
            );

        }

    }


    /*
        Fallback if fewer than five.
    */

    const remaining =
        shuffleArray(

            eligible.filter(
                function (question) {

                    return !chosen.some(
                        function (item) {

                            return (
                                item.id ===
                                question.id
                            );

                        }
                    );

                }
            )

        );


    for (
        const question
        of remaining
    ) {

        if (
            chosen.length >= 5
        ) {

            break;

        }


        chosen.push(
            question
        );

    }


    return shuffleArray(
        chosen.slice(
            0,
            5
        )
    );

}



/* ============================================================
   DISPLAY QUESTION
============================================================ */

function renderQuestion() {

    answerLocked =
        false;


    closeSimulation();


    decisionArea.classList.add(
        "hidden"
    );


    const question =
        selectedQuestions[
            currentQuestionIndex
        ];


    const number =
        currentQuestionIndex + 1;


    questionCounter.textContent =
        "Scenario " +
        number +
        " of 5";


    scenarioMedium.textContent =
        question.medium;


    progressFill.style.width =
        (
            number / 5
        ) *
        100 +
        "%";


    scenarioTitle.textContent =
        question.title;


    scenarioIntroduction.textContent =
        question.intro;


    instructionText.textContent =
        question.instruction;


    scenarioQuestion.textContent =
        question.question;


    renderScenario(
        question
    );


    renderAnswers(
        question
    );

}



/* ============================================================
   SCENARIO ROUTER
============================================================ */

function renderScenario(
    question
) {

    scenarioVisual.innerHTML =
        "";


    switch (
        question.type
    ) {


        case "phone-message":

            renderPhoneMessage(
                question
            );

            break;



        case "phone-call":

            renderPhoneCall(
                question
            );

            break;



        case "marketplace":

            renderMarketplace(
                question
            );

            break;



        case "email":

            renderEmail(
                question
            );

            break;



        case "desktop":

            renderDesktop(
                question
            );

            break;



        case "gaming-store":

            renderGamingStore(
                question
            );

            break;



        case "gaming-message":

            renderGamingMessage(
                question
            );

            break;



        case "job":

            renderJobSite(
                question
            );

            break;



        case "investment":

            renderInvestmentAd(
                question
            );

            break;



        default:

            scenarioVisual.textContent =
                "This scenario could not be displayed.";


            unlockDecision(
                "Review the situation above, then choose what you would do."
            );

    }

}



/* ============================================================
   PHONE MESSAGE
============================================================ */

function renderPhoneMessage(
    question
) {

    const phone =
        document.createElement(
            "div"
        );


    phone.className =
        "phone";


    phone.innerHTML = `

        <div class="phone-screen">

            <div class="dynamic-island"></div>


            <div class="phone-status light">

                <span>
                    9:41
                </span>


                <div class="phone-status-right">

                    <span>
                        ▮▮▮
                    </span>

                    <span>
                        ◔
                    </span>

                    <span class="battery">

                        <span></span>

                    </span>

                </div>

            </div>


            <div class="lock-screen">

                <div class="lock-date">

                    Monday, 24 August

                </div>


                <div class="lock-time">

                    9:41

                </div>


                <button
                    class="real-notification"
                    type="button"
                >

                    <div class="notification-topline">

                        <div class="notification-app">

                            <span class="message-app-icon">

                                ●

                            </span>

                            ${escapeHTML(
                                question.visual.app
                            )}

                        </div>


                        <span class="notification-time">

                            now

                        </span>

                    </div>


                    <strong>

                        ${escapeHTML(
                            question.visual.sender
                        )}

                    </strong>


                    <p>

                        ${escapeHTML(
                            question.visual.preview
                        )}

                    </p>

                </button>


                <div class="lock-actions">

                    <span class="lock-round-button">
                        ◐
                    </span>

                    <span class="lock-round-button">
                        ◎
                    </span>

                </div>

            </div>


            <div
                class="home-indicator"
                style="color:#fff"
            ></div>

        </div>

    `;


    scenarioVisual.appendChild(
        phone
    );


    phone
        .querySelector(
            ".real-notification"
        )
        .addEventListener(
            "click",
            function () {

                renderMessagesApp(

                    phone.querySelector(
                        ".phone-screen"
                    ),

                    question

                );


                unlockDecision(
                    "Read the conversation carefully. If a link appears, you can safely inspect it before answering."
                );

            }
        );

}



/* ============================================================
   MESSAGES APP
============================================================ */

function renderMessagesApp(
    screen,
    question
) {

    screen.innerHTML = `

        <div class="messages-app">

            <div class="dynamic-island"></div>


            <div class="phone-status dark">

                <span>
                    9:41
                </span>


                <div class="phone-status-right">

                    <span>
                        ▮▮▮
                    </span>

                    <span>
                        ◔
                    </span>

                    <span class="battery">

                        <span></span>

                    </span>

                </div>

            </div>


            <div class="messages-header">

                <div class="messages-back">

                    ‹ Messages

                </div>


                <div class="contact-block">

                    <div class="contact-avatar">

                        ◉

                    </div>


                    <div class="contact-name">

                        ${escapeHTML(
                            question.visual.sender
                        )}

                    </div>

                </div>

            </div>


            <div class="messages-body">

                <div class="message-date">

                    Today 9:41 AM

                </div>


                <div id="message-list"></div>

            </div>


            <div class="message-input-bar">

                <div class="message-plus">

                    +

                </div>


                <div class="message-input-fake">

                    Text Message

                </div>

            </div>


            <div
                class="home-indicator"
                style="color:#111"
            ></div>

        </div>

    `;


    const list =
        screen.querySelector(
            "#message-list"
        );


    question.visual.messages.forEach(
        function (message) {

            const row =
                document.createElement(
                    "div"
                );


            row.className =
                "message-row received";


            const bubble =
                document.createElement(
                    "div"
                );


            bubble.className =
                "message-bubble";


            if (
                message.link &&
                question.inspection
            ) {

                const text =
                    document.createElement(
                        "span"
                    );


                text.textContent =
                    message.text + " ";


                const link =
                    document.createElement(
                        "button"
                    );


                link.type =
                    "button";


                link.className =
                    "message-link";


                link.textContent =
                    message.link;


                link.addEventListener(
                    "click",
                    function () {

                        openSimulation(
                            question
                        );

                    }
                );


                bubble.append(
                    text,
                    link
                );

            }

            else {

                bubble.textContent =
                    message.text;

            }


            row.appendChild(
                bubble
            );


            list.appendChild(
                row
            );

        }
    );

}



/* ============================================================
   PHONE CALL
============================================================ */

function renderPhoneCall(
    question
) {

    const phone =
        document.createElement(
            "div"
        );


    phone.className =
        "phone";


    phone.innerHTML = `

        <div class="phone-screen">

            <div class="dynamic-island"></div>


            <div class="phone-status light">

                <span>
                    9:41
                </span>


                <div class="phone-status-right">

                    <span>
                        ▮▮▮
                    </span>

                    <span>
                        ◔
                    </span>

                    <span class="battery">

                        <span></span>

                    </span>

                </div>

            </div>


            <div class="call-screen">


                <div class="call-avatar">

                    ☎

                </div>


                <div class="call-name">

                    ${escapeHTML(
                        question.visual.sender
                    )}

                </div>


                <div class="call-number">

                    ${escapeHTML(
                        question.visual.number
                    )}

                </div>


                <div class="call-actions">


                    <button
                        class="call-action decline"
                        type="button"
                    >

                        <span class="call-action-circle">

                            ×

                        </span>

                        <span>
                            Decline
                        </span>

                    </button>


                    <button
                        class="call-action answer"
                        type="button"
                    >

                        <span class="call-action-circle">

                            ☎

                        </span>

                        <span>
                            Answer
                        </span>

                    </button>

                </div>


                <div id="call-transcript-slot"></div>

            </div>


            <div
                class="home-indicator"
                style="color:#fff"
            ></div>

        </div>

    `;


    scenarioVisual.appendChild(
        phone
    );


    const answer =
        phone.querySelector(
            ".call-action.answer"
        );


    const decline =
        phone.querySelector(
            ".call-action.decline"
        );


    const slot =
        phone.querySelector(
            "#call-transcript-slot"
        );


    answer.addEventListener(
        "click",
        function () {

            slot.innerHTML = `

                <div class="call-transcript">

                    <strong>
                        Caller:
                    </strong>

                    ${escapeHTML(
                        question.visual.transcript
                    )}

                </div>

            `;


            unlockDecision(
                "You answered the simulated call. Read what the caller says, then choose how you would respond."
            );

        }
    );


    decline.addEventListener(
        "click",
        function () {

            slot.innerHTML = `

                <div class="call-transcript">

                    You declined the simulated call.
                    You can still decide what the safest
                    next step would be.

                </div>

            `;


            unlockDecision(
                "You declined the call. Now choose what you would do next."
            );

        }
    );

}



/* ============================================================
   LAPTOP CREATOR
============================================================ */

function createLaptop(
    tabTitle,
    url
) {

    const laptop =
        document.createElement(
            "div"
        );


    laptop.className =
        "laptop";


    laptop.innerHTML = `

        <div class="laptop-lid">


            <div class="laptop-camera"></div>


            <div class="browser-chrome">


                <div class="browser-tab-row">


                    <div class="browser-dots">

                        <span class="browser-dot red"></span>

                        <span class="browser-dot yellow"></span>

                        <span class="browser-dot green"></span>

                    </div>


                    <div class="browser-tab">

                        ${escapeHTML(
                            tabTitle
                        )}

                    </div>

                </div>


                <div class="browser-toolbar">

                    <span class="browser-nav-button">
                        ←
                    </span>

                    <span class="browser-nav-button">
                        →
                    </span>

                    <span class="browser-nav-button">
                        ↻
                    </span>


                    <div class="address-bar">

                        🔒
                        ${escapeHTML(
                            url
                        )}

                    </div>


                    <span class="browser-nav-button">
                        ⋮
                    </span>

                </div>

            </div>


            <div class="browser-body"></div>

        </div>


        <div class="laptop-base"></div>

    `;


    return laptop;

}



/* ============================================================
   MARKETPLACE
============================================================ */

function renderMarketplace(
    question
) {

    const laptop =
        createLaptop(
            question.visual.product,
            question.visual.url
        );


    const body =
        laptop.querySelector(
            ".browser-body"
        );


    body.innerHTML = `

        <div class="store-nav">

            <div class="store-brand">

                ${escapeHTML(
                    question.visual.store
                )}

            </div>


            <div class="store-actions">

                Search
                &nbsp;&nbsp;
                Account
                &nbsp;&nbsp;
                Cart

            </div>

        </div>


        <div class="store-content">


            <div class="product-image">

                ${question.visual.icon}

            </div>


            <div class="product-copy">


                <div class="product-eyebrow">

                    Online listing

                </div>


                <h3>

                    ${escapeHTML(
                        question.visual.product
                    )}

                </h3>


                <div class="rating-line">

                    ${escapeHTML(
                        question.visual.rating
                    )}

                </div>


                <div class="price-line">

                    <span class="product-price">

                        ${escapeHTML(
                            question.visual.price
                        )}

                    </span>


                    <span class="old-price">

                        ${escapeHTML(
                            question.visual.oldPrice
                        )}

                    </span>

                </div>


                <p>

                    <strong>
                        Seller:
                    </strong>

                    ${escapeHTML(
                        question.visual.seller
                    )}

                </p>


                <p class="product-note">

                    ${escapeHTML(
                        question.visual.note
                    )}

                </p>


                <button
                    class="real-button blue listing-action"
                    type="button"
                >

                    ${escapeHTML(
                        question.visual.action
                    )}

                </button>

            </div>

        </div>

    `;


    scenarioVisual.appendChild(
        laptop
    );


    body
        .querySelector(
            ".listing-action"
        )
        .addEventListener(
            "click",
            function () {

                openSimulation(
                    question
                );


                unlockDecision(
                    "You opened the listing details. Inspect the checkout information, then choose what you would do."
                );

            }
        );

}



/* ============================================================
   EMAIL
============================================================ */

function renderEmail(
    question
) {

    const laptop =
        createLaptop(
            "Mail",
            "mail.example/inbox"
        );


    const body =
        laptop.querySelector(
            ".browser-body"
        );


    body.innerHTML = `

        <div class="mail-app">


            <aside class="mail-sidebar">


                <div class="mail-logo">
                    Mail
                </div>


                <button
                    class="mail-compose"
                    type="button"
                    disabled
                >
                    Compose
                </button>


                <div class="mail-folder active">
                    Inbox
                </div>

                <div class="mail-folder">
                    Starred
                </div>

                <div class="mail-folder">
                    Sent
                </div>

                <div class="mail-folder">
                    Drafts
                </div>

                <div class="mail-folder">
                    Trash
                </div>

            </aside>


            <section class="mail-main">


                <div class="mail-toolbar">

                    <div class="mail-search">

                        Search mail

                    </div>

                    <span>
                        ⚙
                    </span>

                </div>


                <button
                    class="mail-row unread"
                    type="button"
                >

                    <span>

                        ${escapeHTML(
                            question.visual.sender
                        )}

                    </span>


                    <span class="mail-subject">

                        ${escapeHTML(
                            question.visual.subject
                        )}

                        —

                        ${escapeHTML(
                            question.visual.preview
                        )}

                    </span>


                    <span class="mail-time">

                        ${escapeHTML(
                            question.visual.time
                        )}

                    </span>

                </button>


                <div
                    class="mail-row"
                    aria-hidden="true"
                >

                    <span>
                        University News
                    </span>

                    <span class="mail-subject">
                        Weekly campus update
                    </span>

                    <span class="mail-time">
                        8:12
                    </span>

                </div>


                <div
                    class="mail-row"
                    aria-hidden="true"
                >

                    <span>
                        Streaming Service
                    </span>

                    <span class="mail-subject">
                        Your monthly recommendations
                    </span>

                    <span class="mail-time">
                        Yesterday
                    </span>

                </div>

            </section>

        </div>

    `;


    scenarioVisual.appendChild(
        laptop
    );


    const main =
        body.querySelector(
            ".mail-main"
        );


    body
        .querySelector(
            "button.mail-row"
        )
        .addEventListener(
            "click",
            function () {

                renderOpenedEmail(
                    main,
                    question
                );


                unlockDecision(

                    question.inspection

                        ?

                        "You opened the email. You can safely inspect its button before making your decision."

                        :

                        "You opened the email. Read it carefully, then choose what you would do."

                );

            }
        );

}



/* ============================================================
   OPEN EMAIL
============================================================ */

function renderOpenedEmail(
    main,
    question
) {

    main.innerHTML = `

        <div class="mail-toolbar">

            <span>
                ← Back to inbox
            </span>

            <span>
                Archive
                &nbsp;
                Delete
                &nbsp;
                ⋮
            </span>

        </div>


        <div class="open-email">


            <h3>

                ${escapeHTML(
                    question.visual.subject
                )}

            </h3>


            <div class="email-meta">

                <strong>

                    ${escapeHTML(
                        question.visual.sender
                    )}

                </strong>

                <br>


                ${escapeHTML(
                    question.visual.address
                )}

                <br>

                to you

            </div>


            <div class="email-body-copy">

                <p>

                    ${escapeHTML(
                        question.visual.body
                    )}

                </p>


                ${
                    question.visual.linkText

                        ?

                        `

                        <button
                            class="email-link-button"
                            type="button"
                        >

                            ${escapeHTML(
                                question.visual.linkText
                            )}

                        </button>

                        `

                        :

                        ""
                }

            </div>

        </div>

    `;


    if (
        question.visual.linkText &&
        question.inspection
    ) {

        main
            .querySelector(
                ".email-link-button"
            )
            .addEventListener(
                "click",
                function () {

                    openSimulation(
                        question
                    );

                }
            );

    }

}



/* ============================================================
   DESKTOP COMPUTER
============================================================ */

function renderDesktop(
    question
) {

    const monitor =
        document.createElement(
            "div"
        );


    monitor.className =
        "desktop-monitor";


    monitor.innerHTML = `

        <div class="monitor-frame">


            <div class="desktop">


                <div class="desktop-icons">

                    <div class="desktop-icon-item">

                        <span>
                            🗂
                        </span>

                        Files

                    </div>


                    <div class="desktop-icon-item">

                        <span>
                            🌐
                        </span>

                        Browser

                    </div>


                    <div class="desktop-icon-item">

                        <span>
                            🗑
                        </span>

                        Recycle Bin

                    </div>

                </div>



                <div class="os-window">


                    <div class="os-window-titlebar">

                        <span>

                            ${escapeHTML(
                                question.visual.heading
                            )}

                        </span>


                        <span class="os-window-controls">

                            — □ ×

                        </span>

                    </div>


                    <div class="os-window-body">


                        <div class="warning-title">

                            <span class="warning-symbol">
                                !
                            </span>

                            <span>
                                Action required
                            </span>

                        </div>


                        <p>

                            ${escapeHTML(
                                question.visual.message
                            )}

                        </p>


                        <p>

                            <strong>

                                ${escapeHTML(
                                    question.visual.phone
                                )}

                            </strong>

                        </p>


                        <button
                            class="real-button blue desktop-action"
                            type="button"
                        >

                            ${escapeHTML(
                                question.visual.action
                            )}

                        </button>

                    </div>

                </div>



                <div class="desktop-taskbar">


                    <div class="taskbar-left">

                        <span>
                            ⊞
                        </span>

                        <span>
                            🔎
                        </span>

                        <span>
                            📁
                        </span>

                        <span>
                            🌐
                        </span>

                    </div>


                    <div class="taskbar-right">

                        ENG
                        &nbsp;
                        9:41 AM

                    </div>

                </div>

            </div>

        </div>


        <div class="monitor-stand"></div>

        <div class="monitor-base"></div>

    `;


    scenarioVisual.appendChild(
        monitor
    );


    monitor
        .querySelector(
            ".desktop-action"
        )
        .addEventListener(
            "click",
            function () {

                openSimulation(
                    question
                );


                unlockDecision(
                    "You opened the support instructions. Read what they are asking you to do, then choose your response."
                );

            }
        );

}



/* ============================================================
   GAMING STORE
============================================================ */

function renderGamingStore(
    question
) {

    const frame =
        document.createElement(
            "div"
        );


    frame.className =
        "console-frame";


    frame.innerHTML = `

        <div class="console-ui">


            <div class="console-top">

                <div class="console-brand">

                    GameStation Store

                </div>


                <div class="console-user">

                    Player01
                    ●
                    Online

                </div>

            </div>


            <div class="console-nav">

                <span>
                    Home
                </span>

                <span class="active">
                    Store
                </span>

                <span>
                    Library
                </span>

                <span>
                    Friends
                </span>

            </div>


            <div class="console-card">


                <div class="game-art">

                    ${question.visual.icon}

                </div>


                <div>


                    <div class="product-eyebrow">

                        Digital game

                    </div>


                    <h3>

                        ${escapeHTML(
                            question.visual.title
                        )}

                    </h3>


                    <p class="console-subtle">

                        ${escapeHTML(
                            question.visual.publisher
                        )}

                    </p>


                    <div class="console-price">

                        ${escapeHTML(
                            question.visual.price
                        )}

                        <span class="old-price">

                            ${escapeHTML(
                                question.visual.oldPrice
                            )}

                        </span>

                    </div>


                    <p class="console-subtle">

                        ${escapeHTML(
                            question.visual.note
                        )}

                    </p>


                    <button
                        class="real-button light console-action"
                        type="button"
                    >

                        ${escapeHTML(
                            question.visual.action
                        )}

                    </button>

                </div>

            </div>

        </div>

    `;


    scenarioVisual.appendChild(
        frame
    );


    frame
        .querySelector(
            ".console-action"
        )
        .addEventListener(
            "click",
            function () {

                openSimulation(
                    question
                );


                unlockDecision(
                    "You opened the game listing. Inspect how the purchase works, then choose what you would do."
                );

            }
        );

}



/* ============================================================
   GAMING MESSAGE
============================================================ */

function renderGamingMessage(
    question
) {

    const frame =
        document.createElement(
            "div"
        );


    frame.className =
        "console-frame";


    frame.innerHTML = `

        <div class="console-ui">


            <div class="console-top">

                <div class="console-brand">

                    GameStation

                </div>


                <div class="console-user">

                    Player01
                    ●
                    Online

                </div>

            </div>


            <div class="console-nav">

                <span>
                    Home
                </span>

                <span>
                    Store
                </span>

                <span class="active">
                    Messages
                </span>

                <span>
                    Friends
                </span>

            </div>


            <div class="console-message-card">


                <div class="player-row">

                    <div class="player-avatar">

                        ${question.visual.avatar}

                    </div>


                    <div>

                        <strong>

                            ${escapeHTML(
                                question.visual.player
                            )}

                        </strong>

                        <br>


                        <span class="console-subtle">

                            Sent just now

                        </span>

                    </div>

                </div>


                <p class="console-message">

                    ${escapeHTML(
                        question.visual.message
                    )}

                </p>


                <button
                    class="console-link"
                    type="button"
                >

                    ${escapeHTML(
                        question.visual.link
                    )}

                </button>

            </div>

        </div>

    `;


    scenarioVisual.appendChild(
        frame
    );


    frame
        .querySelector(
            ".console-link"
        )
        .addEventListener(
            "click",
            function () {

                openSimulation(
                    question
                );


                unlockDecision(
                    "You opened the player's link in the simulation. Inspect what the page asks for, then choose your response."
                );

            }
        );

}



/* ============================================================
   JOB WEBSITE
============================================================ */

function renderJobSite(
    question
) {

    const laptop =
        createLaptop(
            question.visual.role,
            "quickcareers.example/jobs"
        );


    const body =
        laptop.querySelector(
            ".browser-body"
        );


    body.innerHTML = `

        <div class="web-header">

            <div class="web-logo">

                ${escapeHTML(
                    question.visual.site
                )}

            </div>


            <div class="web-header-right">

                Jobs
                &nbsp;
                Companies
                &nbsp;
                Sign in

            </div>

        </div>


        <div class="job-page">


            <div class="job-card">


                <div class="product-eyebrow">

                    Remote opportunity

                </div>


                <h3>

                    ${escapeHTML(
                        question.visual.role
                    )}

                </h3>


                <p>

                    <strong>

                        ${escapeHTML(
                            question.visual.company
                        )}

                    </strong>

                </p>


                <div class="job-pay">

                    ${escapeHTML(
                        question.visual.pay
                    )}

                </div>


                <p class="job-meta">

                    ${escapeHTML(
                        question.visual.description
                    )}

                </p>


                <button
                    class="real-button blue job-action"
                    type="button"
                >

                    ${escapeHTML(
                        question.visual.action
                    )}

                </button>

            </div>

        </div>

    `;


    scenarioVisual.appendChild(
        laptop
    );


    body
        .querySelector(
            ".job-action"
        )
        .addEventListener(
            "click",
            function () {

                openSimulation(
                    question
                );


                unlockDecision(
                    "You opened the application. Inspect what the employer asks you to provide or pay, then choose your response."
                );

            }
        );

}



/* ============================================================
   INVESTMENT ADVERTISEMENT
============================================================ */

function renderInvestmentAd(
    question
) {

    const laptop =
        createLaptop(
            "Social Feed",
            "social.example/home"
        );


    const body =
        laptop.querySelector(
            ".browser-body"
        );


    body.innerHTML = `

        <div class="web-header">

            <div class="web-logo">

                Social

            </div>


            <div class="web-header-right">

                Home
                &nbsp;
                Messages
                &nbsp;
                Profile

            </div>

        </div>


        <div class="social-page">


            <div class="social-feed">


                <article class="social-post">


                    <div class="social-post-top">


                        <div class="social-profile">

                            <div class="social-avatar">

                                EG

                            </div>


                            <div>

                                <strong>

                                    ${escapeHTML(
                                        question.visual.profile
                                    )}

                                </strong>

                                <br>


                                <span class="console-subtle">

                                    Sponsored

                                </span>

                            </div>

                        </div>


                        <span>
                            •••
                        </span>

                    </div>


                    <div class="social-ad-card">


                        <div class="product-eyebrow">

                            Investment opportunity

                        </div>


                        <h3>

                            ${escapeHTML(
                                question.visual.headline
                            )}

                        </h3>


                        <p class="job-meta">

                            ${escapeHTML(
                                question.visual.description
                            )}

                        </p>


                        <button
                            class="real-button blue investment-action"
                            type="button"
                        >

                            ${escapeHTML(
                                question.visual.action
                            )}

                        </button>

                    </div>

                </article>

            </div>

        </div>

    `;


    scenarioVisual.appendChild(
        laptop
    );


    body
        .querySelector(
            ".investment-action"
        )
        .addEventListener(
            "click",
            function () {

                openSimulation(
                    question
                );


                unlockDecision(
                    "You opened the investment advertisement. Inspect the promises and support instructions, then choose your response."
                );

            }
        );

}



/* ============================================================
   OPEN SIMULATED LINK
============================================================ */

function openSimulation(
    question
) {

    if (
        !question.inspection
    ) {

        return;

    }


    simulationTitle.textContent =
        question.inspection.title;


    simulationContent.innerHTML =
        buildSimulationPage(
            question.inspection
        );


    simulationModal.classList.remove(
        "hidden"
    );


    document.body.style.overflow =
        "hidden";

}



/* ============================================================
   CLOSE SIMULATION
============================================================ */

function closeSimulation() {

    simulationModal.classList.add(
        "hidden"
    );


    simulationContent.innerHTML =
        "";


    document.body.style.overflow =
        "";

}



closeSimulationButton.addEventListener(
    "click",
    closeSimulation
);



simulationModal.addEventListener(
    "click",
    function (event) {

        if (
            event.target ===
            simulationModal
        ) {

            closeSimulation();

        }

    }
);



/* ============================================================
   BUILD SIMULATED PAGE
============================================================ */

function buildSimulationPage(
    inspection
) {

    const fields =
        getSimulationFields(
            inspection.kind
        );


    return `

        <div class="sim-browser">


            <div class="browser-chrome">


                <div class="browser-tab-row">


                    <div class="browser-dots">

                        <span class="browser-dot red"></span>

                        <span class="browser-dot yellow"></span>

                        <span class="browser-dot green"></span>

                    </div>


                    <div class="browser-tab">

                        ${escapeHTML(
                            inspection.heading
                        )}

                    </div>

                </div>


                <div class="browser-toolbar">

                    <span class="browser-nav-button">
                        ←
                    </span>

                    <span class="browser-nav-button">
                        →
                    </span>

                    <span class="browser-nav-button">
                        ↻
                    </span>


                    <div class="address-bar">

                        ${escapeHTML(
                            inspection.url
                        )}

                    </div>


                    <span class="browser-nav-button">
                        ⋮
                    </span>

                </div>

            </div>


            <div class="sim-page">


                <div class="sim-card">


                    <h3>

                        ${escapeHTML(
                            inspection.heading
                        )}

                    </h3>


                    <p>

                        ${escapeHTML(
                            inspection.body
                        )}

                    </p>


                    <p>

                        ${escapeHTML(
                            inspection.detail
                        )}

                    </p>


                    ${fields}


                    <button
                        class="real-button blue"
                        type="button"
                        disabled
                    >

                        ${escapeHTML(
                            inspection.button
                        )}

                    </button>


                    <div class="sim-note">

                        This page is a ThinkSecure simulation.
                        Nothing entered here is submitted or stored.

                    </div>

                </div>

            </div>

        </div>

    `;

}



/* ============================================================
   SIMULATED PAGE CONTENT
============================================================ */

function getSimulationFields(
    kind
) {

    switch (
        kind
    ) {


        case "login":

        case "gaming-login":

            return `

                <div class="sim-field">

                    <label>
                        Email or username
                    </label>

                    <div class="sim-input"></div>

                </div>


                <div class="sim-field">

                    <label>
                        Password
                    </label>

                    <div class="sim-input"></div>

                </div>


                <div class="sim-field">

                    <label>
                        Verification code
                    </label>

                    <div class="sim-input"></div>

                </div>

            `;



        case "checkout":

            return `

                <div class="sim-warning">

                    Payment method:
                    direct bank transfer only

                </div>


                <div class="sim-field">

                    <label>
                        Upload identification
                    </label>

                    <div class="sim-input">

                        Choose driver's licence or passport...

                    </div>

                </div>

            `;



        case "checkout-safe":

            return `

                <div class="sim-field">

                    <label>
                        Payment method
                    </label>

                    <div class="sim-input">

                        Credit / debit card
                        ·
                        protected payment

                    </div>

                </div>


                <div class="sim-field">

                    <label>
                        Delivery
                    </label>

                    <div class="sim-input">

                        Standard delivery

                    </div>

                </div>

            `;



        case "job":

            return `

                <div class="sim-warning">

                    Activation payment required
                    before work can begin:
                    $250

                </div>


                <div class="sim-field">

                    <label>
                        Bank account
                    </label>

                    <div class="sim-input"></div>

                </div>


                <div class="sim-field">

                    <label>
                        Identity document
                    </label>

                    <div class="sim-input">

                        Upload document...

                    </div>

                </div>

            `;



        case "support":

            return `

                <div class="sim-warning">

                    Support asks you to install remote
                    access software and keep your computer
                    switched on.

                </div>


                <div class="sim-field">

                    <label>
                        Remote access tool
                    </label>

                    <div class="sim-input">

                        RemoteSupport_Setup.exe

                    </div>

                </div>

            `;



        case "investment":

            return `

                <div class="sim-warning">

                    Advertised return:
                    high return
                    ·
                    described as low risk

                </div>


                <div class="sim-field">

                    <label>
                        Initial investment
                    </label>

                    <div class="sim-input">

                        $500

                    </div>

                </div>


                <div class="sim-field">

                    <label>
                        Remote setup assistance
                    </label>

                    <div class="sim-input">

                        Allow support access to device

                    </div>

                </div>

            `;



        case "gaming-safe":

            return `

                <div class="sim-field">

                    <label>
                        Payment
                    </label>

                    <div class="sim-input">

                        Saved console payment method

                    </div>

                </div>


                <div class="sim-field">

                    <label>
                        Delivery
                    </label>

                    <div class="sim-input">

                        Add directly to your game library

                    </div>

                </div>

            `;



        default:

            return "";

    }

}



/* ============================================================
   UNLOCK ANSWERS
============================================================ */

function unlockDecision(
    message
) {

    instructionText.textContent =
        message;


    decisionArea.classList.remove(
        "hidden"
    );

}



/* ============================================================
   ANSWER BUTTONS
============================================================ */

function renderAnswers(
    question
) {

    answerButtons.innerHTML =
        "";


    question.answers.forEach(
        function (answer) {

            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


            button.className =
                "answer-button";


            button.textContent =
                answer.text;


            button.addEventListener(
                "click",
                function () {

                    submitAnswer(
                        answer.id
                    );

                }
            );


            answerButtons.appendChild(
                button
            );

        }
    );

}



/* ============================================================
   SUBMIT ANSWER
============================================================ */

function submitAnswer(
    answerId
) {

    if (
        answerLocked
    ) {

        return;

    }


    answerLocked =
        true;


    const question =
        selectedQuestions[
            currentQuestionIndex
        ];


    const correct =
        answerId ===
        question.correctAnswer;


    if (
        correct
    ) {

        score += 1;

    }


    showFeedback(
        question,
        correct
    );

}



/* ============================================================
   FEEDBACK
============================================================ */

function showFeedback(
    question,
    correct
) {

    closeSimulation();


    showSection(
        feedbackSection
    );


    feedbackStatus.className =
        "feedback-status " +
        (
            correct
                ?
                "correct"
                :
                "incorrect"
        );


    feedbackIcon.textContent =
        correct
            ?
            "✓"
            :
            "!";


    feedbackLabel.textContent =
        correct
            ?
            "Good decision"
            :
            "Safer option available";


    if (
        correct
    ) {

        feedbackTitle.textContent =
            question.safe

                ?

                "You correctly recognised a legitimate situation."

                :

                "You chose the safer response.";

    }

    else {

        feedbackTitle.textContent =
            question.safe

                ?

                "This situation was safer than it first appeared."

                :

                "There was a safer response.";

    }


    feedbackMessage.textContent =
        question.feedback;


    cyberTipList.innerHTML =
        "";


    question.tips.forEach(
        function (tip) {

            const item =
                document.createElement(
                    "li"
                );


            item.textContent =
                tip;


            cyberTipList.appendChild(
                item
            );

        }
    );


    nextButton.innerHTML =
        currentQuestionIndex === 4

            ?

            `See my score <span aria-hidden="true">→</span>`

            :

            `Next scenario <span aria-hidden="true">→</span>`;

}



/* ============================================================
   NEXT QUESTION
============================================================ */

nextButton.addEventListener(
    "click",
    function () {

        currentQuestionIndex +=
            1;


        if (
            currentQuestionIndex >= 5
        ) {

            finishQuiz();

            return;

        }


        showSection(
            scenarioSection
        );


        renderQuestion();

    }
);



/* ============================================================
   FINISH QUIZ
============================================================ */

function finishQuiz() {

    scoreValue.textContent =
        String(
            score
        );


    if (
        score === 5
    ) {

        scoreMessage.textContent =
            "Excellent work. You correctly recognised both genuine situations and cyber threats across all five scenarios.";

    }


    else if (
        score === 4
    ) {

        scoreMessage.textContent =
            "Great result. You recognised most warning signs without assuming that every digital situation was dangerous.";

    }


    else if (
        score >= 2
    ) {

        scoreMessage.textContent =
            "Good effort. Focus on checking the source, payment method, level of urgency and information being requested before acting.";

    }


    else {

        scoreMessage.textContent =
            "There are several warning signs worth reviewing. Familiarity with these patterns makes suspicious situations easier to recognise.";

    }


    showSection(
        completeSection
    );

}



/* ============================================================
   RESTART
============================================================ */

restartButton.addEventListener(
    "click",
    function () {

        selectedQuestions =
            [];


        currentQuestionIndex =
            0;


        score =
            0;


        ageRange.value =
            "";


        gender.value =
            "";


        formError.textContent =
            "";


        showSection(
            startSection
        );

    }
);



/* ============================================================
   SHOW ONE SECTION
============================================================ */

function showSection(
    section
) {

    [

        startSection,
        scenarioSection,
        feedbackSection,
        completeSection

    ].forEach(
        function (item) {

            item.classList.add(
                "hidden"
            );

        }
    );


    section.classList.remove(
        "hidden"
    );


    // Only offer the next activity once the quiz has been finished
    quizNextStep.classList.toggle(
        "hidden",
        section !== completeSection
    );


    window.scrollTo({

        top:
            0,

        behavior:
            "smooth"

    });

}



/* ============================================================
   SHUFFLE ARRAY
============================================================ */

function shuffleArray(
    array
) {

    const copy =
        [
            ...array
        ];


    for (
        let i =
            copy.length - 1;

        i > 0;

        i -= 1
    ) {

        const j =
            Math.floor(
                Math.random() *
                (
                    i + 1
                )
            );


        [
            copy[i],
            copy[j]
        ] =
        [
            copy[j],
            copy[i]
        ];

    }


    return copy;

}



/* ============================================================
   SAFE HTML OUTPUT
============================================================ */

function escapeHTML(
    value
) {

    return String(
        value
    )

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );

}