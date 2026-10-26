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
let tsAnswersHistory = [];
let tsInvestigated = new Set();
let tsTutorialShown = false;
let tsPendingStart = false;
 
 
 
 
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
 
 
    tsAnswersHistory = [];
    tsInvestigated.clear();
    if (!tsTutorialShown) {
        tsPendingStart = true;
        tsOpenTutorial();
        return;
    }
    showSection(scenarioSection);
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
    scenarioVisual.classList.remove('ts-successful-review');
 
    tsReviewMode = false;
    const priorReview = scenarioSection.querySelector('.ts-visual-feedback');
    if (priorReview) {
        const originalNextHost = feedbackSection.querySelector('.feedback-actions') || feedbackSection;
        originalNextHost.appendChild(nextButton);
        priorReview.remove();
    }
    tsInvestigated = new Set();
 
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
 
    // Visual-only: let CSS distinguish the devices by scenario type.
    // No translation strings or quiz logic are modified.
    scenarioVisual.dataset.scenarioType = question.type;
 
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
    tsAttachVisualClues(question);
}
 
 
 
/* ============================================================
   PHONE MESSAGE
============================================================ */
 
/* ============================================================
   IMMERSIVE SCENARIO INTERFACES
   Fictional, interactive simulations. Existing question data,
   answer selection, scoring and site i18n integration stay intact.
============================================================ */
 
function tsButton(label, cls = "ts-cta") {
    return `<button type="button" class="${cls} ts-inspect">${escapeHTML(label)} <span aria-hidden="true">↗</span></button>`;
}
 
function tsBrowser(title, address, theme, contents) {
    return `<div class="ts-browser ts-${theme}">
        <div class="ts-browser-tabbar"><span class="ts-lights"><i></i><i></i><i></i></span>
          <span class="ts-tab-title">${escapeHTML(title)}</span><span class="ts-newtab">＋</span></div>
        <div class="ts-browser-toolbar"><span>‹</span><span>›</span><span>↻</span>
          <div class="ts-address"><span class="ts-address-indicator">◈</span>${escapeHTML(address)}</div>
          <span>⋮</span></div>
        <div class="ts-browser-content">${contents}</div>
    </div>`;
}
 
function tsLaptop(contents) {
    return `<div class="ts-laptop"><div class="ts-laptop-screen"><div class="ts-camera"></div>${contents}</div>
       <div class="ts-laptop-hinge"></div><div class="ts-laptop-base"><span></span></div></div>`;
}
 
function tsMount(markup, handler) {
    scenarioVisual.innerHTML = `<div class="ts-experience">${markup}</div>`;
    scenarioVisual.querySelectorAll(".ts-inspect").forEach(button => {
        button.addEventListener("click", () => {
            if (handler) handler(button);
        });
    });
}
 
function tsShowInspection(question, instruction) {
    if (question.inspection) openSimulation(question);
    unlockDecision(instruction || question.instruction);
}
 
function tsPhone(inner, variant = "light") {
    return `<div class="ts-phone ts-phone-${variant}">
       <div class="ts-phone-inner"><div class="ts-island"></div>
       <div class="ts-phone-status"><span>9:41</span><span>●●●  ▰</span></div>
       ${inner}<div class="ts-home-pill"></div></div></div>`;
}
 
 
/*
   Asset URL resolved from the JS script location instead of guessing
   where the HTML page lives. Override window.THINKSECURE_QUIZ_ASSET_BASE
   before this script if your site uses a different folder structure.
*/
const tsQuizScriptUrl = document.currentScript && document.currentScript.src;
const tsQuizAssetBase = typeof window.THINKSECURE_QUIZ_ASSET_BASE === "string"
    ? window.THINKSECURE_QUIZ_ASSET_BASE
    : tsQuizScriptUrl
        ? new URL("../Images/", tsQuizScriptUrl).href
        : "../Images/";
 
function tsScenarioAsset(question) {
    const base = tsQuizAssetBase;
 
    if (question.type === "marketplace") {
        if (/NextGen Console/i.test(question.visual.product)) {
            return {
                src: base + "nextgen-console.jpg.png",
                alt: "Modern black gaming console with controller"
            };
        }
 
        if (/Adventure Quest/i.test(question.visual.product)) {
            return {
                src: base + "adventure-quest-cover.jpg.png",
                alt: "Adventure Quest video game cover art"
            };
        }
    }
 
    if (question.type === "gaming-store") {
        return {
            src: base + "galaxy-racers-cover.jpg.png",
            alt: "Galaxy Racers 4 game cover art"
        };
    }
 
    if (question.type === "investment") {
        return {
            src: base + "elite-growth-investments-banner.jpg.png",
            alt: "Investment advertisement banner"
        };
    }
 
    return null;
}
 
function tsFigure(asset, cls, fallbackText = "") {
    if (!asset) {
        return `<div class="${cls} ts-asset-fallback">${escapeHTML(fallbackText)}</div>`;
    }
 
    return `<img class="${cls}" loading="eager" decoding="async"
         src="${asset.src}" alt="${escapeHTML(asset.alt)}"
         onerror="this.onerror=null; this.style.display='none'; this.insertAdjacentHTML('afterend', '<div class=&quot;ts-photo-error&quot;>Image not found. Check the root Images/ folder and exact .jpg.png filename.</div>'); console.error('ThinkSecure quiz image missing:', this.src);">`;
}
 
function renderPhoneMessage(question) {
    const v = question.visual;
    const preview = `<div class="ts-lock"><div class="ts-lock-date">MONDAY · 24 AUGUST</div>
        <div class="ts-lock-clock">9:41</div><div class="ts-lock-spark"></div>
        <button type="button" class="ts-notification ts-inspect"><div class="ts-notification-top"><span class="ts-message-app-icon">●</span>
        <b>${escapeHTML(v.app)}</b><small>now</small></div><strong>${escapeHTML(v.sender)}</strong>
        <p>${escapeHTML(v.preview)}</p></button><div class="ts-lock-bottom"><span>◐</span><span>◎</span></div></div>`;
    tsMount(tsPhone(preview, "lock"), () => {
        const bubbles = (v.messages || []).map(message => `<div class="ts-bubble">
             ${escapeHTML(message.text)}${message.link && question.inspection ? `<button class="ts-message-link ts-inspect" type="button">${escapeHTML(message.link)}</button>` : ""}</div>`).join("");
        const messages = `<div class="ts-chat"><div class="ts-chat-nav"><span>‹</span><div class="ts-chat-contact"><div class="ts-chat-avatar">${escapeHTML((v.sender || "?").charAt(0))}</div>
            <b>${escapeHTML(v.sender)}</b><small>›</small></div><span>◉</span></div><div class="ts-chat-date">Today · 9:41 AM</div>
            <div class="ts-chat-thread">${bubbles}</div><div class="ts-chat-compose"><span>＋</span><div>Message</div><span>◉</span></div></div>`;
        const inner = scenarioVisual.querySelector('.ts-phone-inner');
        inner.querySelector('.ts-lock').remove();
        inner.insertAdjacentHTML('beforeend', messages);
        inner.querySelectorAll('.ts-message-link').forEach(b => b.addEventListener('click', () => tsShowInspection(question)));
        unlockDecision("Read the conversation carefully, then choose what you would do.");
        tsAttachVisualClues(question);
    });
}
 
function renderPhoneCall(question) {
    const v = question.visual;
    const call = `<div class="ts-call"><div class="ts-call-overline">incoming call</div>
       <div class="ts-call-avatar">☎</div><h3>${escapeHTML(v.sender)}</h3><p>${escapeHTML(v.number)}</p>
       <div class="ts-call-tools"><span>◻<small>remind me</small></span><span>◉<small>message</small></span></div>
       <div class="ts-call-actions"><button type="button" class="ts-call-decline ts-inspect" data-call="decline"><b>✕</b><small>Decline</small></button>
       <button type="button" class="ts-call-answer ts-inspect" data-call="answer"><b>☎</b><small>Answer</small></button></div>
       <div class="ts-call-transcript" aria-live="polite"></div></div>`;
    tsMount(tsPhone(call,"call"), button => {
        const answer = button.dataset.call === 'answer';
        const slot = scenarioVisual.querySelector('.ts-call-transcript');
        slot.innerHTML = answer ? `<b>Caller:</b> ${escapeHTML(v.transcript)}` : 'Call declined. You can still choose the safest next action.';
        scenarioVisual.querySelector('.ts-call-actions').classList.add('ts-call-ended');
        unlockDecision(answer ? "Read what the simulated caller says, then choose your response." : "You declined the call. Choose what you would do next.");
        tsAttachVisualClues(question);
    });
}
 
function renderMarketplace(question) {
    const v = question.visual;
    const asset = tsScenarioAsset(question);
 
    const content = `<div class="ts-shop-shell">
      <div class="ts-shop-nav"><div class="ts-shop-brand"><div class="ts-shop-mark">m<span>●</span></div><strong>${escapeHTML(v.store)}</strong></div>
        <div class="ts-shop-search">⌕ &nbsp; Search products, brands and more</div>
        <div class="ts-shop-actions"><span>Orders</span><span>Wishlist</span><span class="ts-shop-cart">🛒</span></div></div>
      <div class="ts-shop-categories"><span>Today's deals</span><span>Electronics</span><span>Gaming</span><span>Home</span><span>Support</span></div>
      <div class="ts-shop-breadcrumb">Home / Electronics / Gaming / ${escapeHTML(v.product)}</div>
      <div class="ts-shop-product">
        <section class="ts-shop-gallery">
          <div class="ts-shop-main-image">${tsFigure(asset, 'ts-product-photo', v.icon || v.product)}</div>
          <div class="ts-shop-thumb-row">
            <button type="button" class="ts-shop-thumb active">Main image</button>
            <button type="button" class="ts-shop-thumb">Side view</button>
            <button type="button" class="ts-shop-thumb">In the box</button>
          </div>
        </section>
        <section class="ts-shop-copy">
          <div class="ts-product-meta">${escapeHTML(v.store)} · Electronics · Featured deal</div>
          <h3>${escapeHTML(v.product)}</h3>
          <div class="ts-product-stars">★★★★★ <span>${escapeHTML(v.rating)}</span></div>
          <p class="ts-product-summary">Premium release with protected checkout, tracked delivery, and seller support information displayed below.</p>
          <div class="ts-feature-list">
            <span>✓ Fast dispatch</span><span>✓ Buyer protection</span><span>✓ Secure payment</span>
          </div>
          <div class="ts-buy-box">
            <div class="ts-product-price">${escapeHTML(v.price)} <s>${escapeHTML(v.oldPrice)}</s></div>
            <div class="ts-stock-indicator"><i></i> Available now</div>
            <div class="ts-seller-card"><small>Sold by</small><b>${escapeHTML(v.seller)}</b><p>${escapeHTML(v.note)}</p></div>
            <div class="ts-delivery-grid"><div><small>Delivery</small><b>Tracked shipping</b></div><div><small>Returns</small><b>30-day policy</b></div></div>
            ${tsButton(v.action, 'ts-cta ts-inspect ts-shop-cta')}
            <div class="ts-checkout-icons">Protected checkout · Order tracking · Support centre</div>
          </div>
        </section>
      </div></div>`;
 
    tsMount(tsLaptop(tsBrowser(v.product, v.url, 'shop', content)), () =>
        tsShowInspection(question, 'Inspect the checkout details, then choose your response.')
    );
 
    const gallery = scenarioVisual.querySelector('.ts-shop-gallery');
    const photo = gallery && gallery.querySelector('.ts-product-photo');
    if (gallery && photo) {
        const tabs = [...gallery.querySelectorAll('.ts-shop-thumb')];
        tabs[0].textContent = 'Full image';
        tabs[1].textContent = 'Close-up';
        tabs[2].textContent = 'Original size';
        tabs.forEach((tab, index) => tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.toggle('active', t === tab));
            photo.classList.toggle('ts-photo-closeup', index === 1);
            photo.classList.toggle('ts-photo-contain', index === 2);
        }));
    }
}
 
 
function renderEmail(question) {
    const v = question.visual;
    const content = `<div class="ts-mail"><div class="ts-mail-top"><div class="ts-mail-logo"><span>✉</span> Postbox</div>
       <div class="ts-mail-search">⌕ &nbsp; Search mail</div><div class="ts-mail-profile">I</div></div>
       <div class="ts-mail-grid"><aside class="ts-mail-side"><div class="ts-mail-compose">✎ &nbsp; Compose</div>
       <div class="ts-mail-folder active">▣ &nbsp; Inbox <small>1</small></div><div class="ts-mail-folder">☆ &nbsp; Starred</div>
       <div class="ts-mail-folder">◷ &nbsp; Snoozed</div><div class="ts-mail-folder">▤ &nbsp; Sent</div>
       <div class="ts-mail-folder">▱ &nbsp; Drafts</div><div class="ts-mail-divider"></div><small>LABELS</small>
       <div class="ts-mail-folder">● &nbsp; Important</div></aside>
       <main class="ts-mail-list"><div class="ts-mail-list-tools">☐ &nbsp; ⟳ &nbsp; ⋮ <span>1–3 of 3</span></div>
       <button type="button" class="ts-mail-row ts-inspect"><span class="ts-mail-check">□ ☆</span>
       <b>${escapeHTML(v.sender)}</b><span class="ts-mail-subject"><b>${escapeHTML(v.subject)}</b> — ${escapeHTML(v.preview)}</span>
       <time>${escapeHTML(v.time)}</time></button>
       <div class="ts-mail-row ts-mail-muted"><span>□ ☆</span><b>University updates</b><span>Welcome to this week's student bulletin</span><time>8:12</time></div>
       <div class="ts-mail-row ts-mail-muted"><span>□ ☆</span><b>Streaming</b><span>Recommended for you this month</span><time>Yesterday</time></div>
       <div class="ts-mail-placeholder"><span>✉</span><small>Choose a message to read</small></div></main></div></div>`;
    tsMount(tsLaptop(tsBrowser('Inbox — Postbox','mail.example/inbox','mail',content)), () => {
        const main = scenarioVisual.querySelector('.ts-mail-list');
        main.innerHTML = `<div class="ts-mail-list-tools"><span>← &nbsp; ▣ &nbsp; ◷ &nbsp; ⋮</span><span>1 of 3</span></div>
        <article class="ts-open-mail"><h3>${escapeHTML(v.subject)}</h3><div class="ts-open-mail-sender"><div class="ts-open-mail-avatar">${escapeHTML(v.sender.charAt(0))}</div>
        <div><strong>${escapeHTML(v.sender)}</strong><small>&lt;${escapeHTML(v.address)}&gt; · to me</small></div><time>${escapeHTML(v.time)}</time></div>
        <div class="ts-open-mail-body"><p>${escapeHTML(v.body)}</p>
        ${v.linkText ? `<button class="ts-mail-link ts-inspect" type="button">${escapeHTML(v.linkText)} ↗</button>` : ''}
        <div class="ts-mail-signoff">— ${escapeHTML(v.sender)}</div></div></article>`;
        main.querySelectorAll('.ts-mail-link').forEach(b => b.addEventListener('click',() => tsShowInspection(question)));
        unlockDecision(question.inspection ? 'You opened the email. You may safely inspect its simulated link before deciding.' : 'Read the email and decide what you would do.');
        tsAttachVisualClues(question);
    });
}
 
function renderDesktop(question) {
    const v = question.visual;
    const content = `<div class="ts-os-wallpaper"><div class="ts-os-icons"><span>▣<small>Files</small></span><span>◉<small>Browser</small></span>
    <span>▤<small>Recycle Bin</small></span></div><div class="ts-os-window"><div class="ts-os-top"><span>⚙ &nbsp; System notification</span><span>— &nbsp; □ &nbsp; ×</span></div>
    <div class="ts-os-body"><div class="ts-os-shield">!</div><small class="ts-os-risk">SYSTEM ATTENTION REQUIRED</small>
    <h3>${escapeHTML(v.heading)}</h3><p>${escapeHTML(v.message)}</p>
    <div class="ts-os-contact">Technical support &nbsp; <b>${escapeHTML(v.phone)}</b></div>
    ${tsButton(v.action)}</div></div><div class="ts-os-taskbar"><span>⊞</span><span>⌕</span><span>▣</span><span>◈</span><small>9:41 AM &nbsp; ◉</small></div></div>`;
    tsMount(`<div class="ts-monitor"><div class="ts-monitor-screen">${content}</div><div class="ts-monitor-neck"></div><div class="ts-monitor-foot"></div></div>`, () => tsShowInspection(question,'Inspect the simulated support instructions, then choose your response.'));
}
 
function renderGamingStore(question) {
    const v = question.visual;
    const asset = tsScenarioAsset(question);
 
    const content = `<div class="ts-game-shell">
       <div class="ts-game-top"><div class="ts-game-brand">◈ <b>GAMEROOM</b></div>
       <div class="ts-game-toplinks">Store · Library · Deals · <b>Player01</b></div></div>
       <div class="ts-game-nav"><span>Discover</span><span class="active">Store</span><span>Library</span><span>Community</span></div>
       <div class="ts-game-hero">
         <div class="ts-game-hero-art">${tsFigure(asset, 'ts-game-cover', v.title)}<span class="ts-game-art-label">FEATURED RELEASE</span></div>
         <div class="ts-game-hero-copy"><span class="ts-game-pill">WEEKEND DEAL</span><small>NOW FEATURED</small>
           <h3>${escapeHTML(v.title)}</h3><p>by ${escapeHTML(v.publisher)}</p>
           <div class="ts-game-price">${escapeHTML(v.price)} <s>${escapeHTML(v.oldPrice)}</s></div>
           <p class="ts-game-note">${escapeHTML(v.note)}</p>
           <div class="ts-game-feature-list"><span>Digital download</span><span>Instant delivery</span><span>Official store checkout</span></div>
           ${tsButton(v.action, 'ts-game-action ts-inspect')}
         </div>
       </div>
       <div class="ts-game-strip"><span>Top seller</span><span>Racing</span><span>Multiplayer</span><span>Wishlist</span></div>
    </div>`;
 
    tsMount(`<div class="ts-console">${content}</div>`, () =>
        tsShowInspection(question, 'Review how the purchase works before making your decision.')
    );
}
 
 
function renderGamingMessage(question) {
    const v=question.visual;
    const content = `<div class="ts-game-shell"><div class="ts-game-top"><div class="ts-game-brand">◈ <b>GAMEROOM</b></div>
       <div class="ts-game-toplinks">◉ &nbsp; Player01</div></div><div class="ts-game-nav"><span>Home</span><span>Store</span><span class="active">Messages</span><span>Friends</span></div>
       <div class="ts-game-chat"><aside class="ts-game-chat-side"><h4>Messages</h4><div class="ts-game-chat-player"><span>${escapeHTML(v.avatar)}</span>
       <div><b>${escapeHTML(v.player)}</b><small>New message</small></div><i></i></div><div class="ts-game-chat-placeholder">◉ &nbsp; Friends online <b>12</b></div></aside>
       <div class="ts-game-chat-main"><div class="ts-game-chat-header"><span>${escapeHTML(v.avatar)}</span><b>${escapeHTML(v.player)}</b><small>Online now ●</small></div>
       <div class="ts-game-chat-conversation"><small>Today · 9:41 AM</small>
       <div class="ts-game-chat-bubble">${escapeHTML(v.message)}
       <button type="button" class="ts-game-link ts-inspect">${escapeHTML(v.link)} ↗</button></div></div>
       <div class="ts-game-chat-input">＋ &nbsp; Message ${escapeHTML(v.player)}</div></div></div></div>`;
    tsMount(`<div class="ts-console">${content}</div>`,()=>tsShowInspection(question,'Examine the linked simulated site, then choose how you would respond.'));
}
 
function renderJobSite(question) {
    const v=question.visual;
    const content = `<div class="ts-jobs-top"><div class="ts-jobs-logo">◈ <b>${escapeHTML(v.site)}</b></div>
       <div class="ts-jobs-nav">Find jobs &nbsp; Companies &nbsp; Career advice</div><span class="ts-jobs-profile">Sign in</span></div>
       <div class="ts-jobs-search"><div>⌕ &nbsp; Job title or keyword</div><div>⌾ &nbsp; Anywhere in Australia</div><span>Search</span></div>
       <div class="ts-jobs-body"><aside class="ts-jobs-filters"><h4>Filters</h4><span>Job type</span><div>☑ Remote</div><span>Salary range</span>
       <div>□ Full-time</div><div>□ Part-time</div><span>Location</span><div>☑ Australia</div></aside>
       <article class="ts-jobs-card"><div class="ts-jobs-company-logo">B</div><div class="ts-jobs-badges"><span>REMOTE</span><span>NEW</span></div>
       <h3>${escapeHTML(v.role)}</h3><p>${escapeHTML(v.company)} · Australia</p>
       <div class="ts-jobs-salary">${escapeHTML(v.pay)}</div><div class="ts-jobs-feature">✦ Flexible hours</div>
       <p class="ts-jobs-description">${escapeHTML(v.description)}</p>${tsButton(v.action)}
       <div class="ts-jobs-footer">Posted today &nbsp; · &nbsp; Quick application</div></article></div>`;
    tsMount(tsLaptop(tsBrowser('Find jobs', 'quickcareers.example/jobs','jobs',content)),()=>tsShowInspection(question,'Inspect the job application and payment requirements, then decide.'));
}
 
function renderInvestmentAd(question) {
    const v = question.visual;
    const asset = tsScenarioAsset(question);
 
    const content = `<div class="ts-social-nav"><strong><span>social</span>circle</strong><div>⌕ Search posts</div><span>⌂ · Messages · Profile</span></div>
       <div class="ts-social-body"><aside class="ts-social-left"><div>⌂ Feed</div><div>◈ Discover</div><div>▣ Saved</div><div>◉ Profile</div></aside>
       <div class="ts-social-feed"><div class="ts-social-author"><div class="ts-social-avatar">EG</div>
       <div><b>${escapeHTML(v.profile)}</b><small>Sponsored · Just now · Public</small></div><span>•••</span></div>
       <div class="ts-social-banner">${tsFigure(asset, 'ts-social-banner-image', v.profile)}<div class="ts-social-banner-overlay"><div class="ts-social-graph"><span>+34.8% ↗</span><small>Portfolio growth</small></div><div class="ts-social-slogan">BUILD YOUR<br>FUTURE</div></div></div>
       <div class="ts-social-postcopy"><h3>${escapeHTML(v.headline)}</h3><p>${escapeHTML(v.description)}</p><div class="ts-social-badges"><span>Low risk</span><span>Expert support</span><span>Start today</span></div>${tsButton(v.action)}</div>
       <div class="ts-social-engagement">♡ 1.2K · Comments 84 · Share</div></div>
       <aside class="ts-social-right"><b>Trending</b><p>Finance</p><p>Technology</p><p>Markets</p></aside></div>`;
 
    tsMount(tsLaptop(tsBrowser('Social Circle', 'social.example/home', 'social', content)), () =>
        tsShowInspection(question, 'Inspect the investment claims and support instructions, then decide.')
    );
}
 
 
/* ============================================================
   IN-PLACE WEBSITE INSPECTION
   Replace the content inside the existing simulated browser,
   not the whole page or a separate modal. The previous DOM
   remains attached so Back restores its exact interactive state.
============================================================ */
 
let activeInlineInspection = null;
 
function openSimulation(question) {
    if (!question || !question.inspection) return;
 
    // Do not stack multiple inspection pages.
    if (activeInlineInspection) return;
 
    const browser = scenarioVisual.querySelector('.ts-browser');
    const viewport = scenarioVisual.querySelector('.ts-browser-content')
        || scenarioVisual.querySelector('.ts-console')
        || scenarioVisual.querySelector('.ts-monitor-screen')
        || scenarioVisual.querySelector('.ts-phone-inner')
        || scenarioVisual.querySelector('.ts-experience');
 
    if (!viewport) return;
 
    const inspection = question.inspection;
    const previous = Array.from(viewport.children).map(element => ({
        element,
        display: element.style.display
    }));
 
    // Hide rather than replace: listeners, scroll positions and an
    // already-opened email are preserved on the Back action.
    previous.forEach(({element}) => { element.style.display = 'none'; });
 
    const address = browser ? browser.querySelector('.ts-address') : null;
    const originalAddress = address ? address.innerHTML : null;
    if (address) {
        address.innerHTML = '<span class="ts-address-indicator">◈</span>'
            + escapeHTML(inspection.url);
    }
 
    const template = document.createElement('template');
    template.innerHTML = buildSimulationPage(inspection).trim();
    const simulatedPage = template.content.querySelector('.sim-page');
 
    const inlinePage = document.createElement('section');
    inlinePage.className = 'ts-inline-inspection ts-sim-'
        + String(inspection.kind).replace(/[^a-z0-9-]/gi, '');
    inlinePage.setAttribute('aria-label', inspection.title);
    inlinePage.innerHTML = `
        <div class="ts-inline-nav">
            <button class="ts-inline-back" type="button" aria-label="Back to previous screen">
                <span aria-hidden="true">←</span> Back
            </button>
            <span class="ts-inline-location">${escapeHTML(inspection.title)}</span>
            <span class="ts-inline-training">ThinkSecure simulation</span>
        </div>
    `;
    if (simulatedPage) inlinePage.appendChild(simulatedPage);
    viewport.appendChild(inlinePage);
 
    const previousScroll = viewport.scrollTop;
    viewport.scrollTop = 0;
 
    activeInlineInspection = {
        viewport, inlinePage, previous, address, originalAddress, previousScroll,
        returnFocus: document.activeElement
    };
 
    inlinePage.querySelector('.ts-inline-back').addEventListener(
        'click', closeSimulation
    );
    inlinePage.querySelector('.ts-inline-back').focus();
    if (tsCurrentQuestion && !tsReviewMode) tsAttachVisualClues(tsCurrentQuestion);
}
 
function closeSimulation() {
    if (activeInlineInspection) {
        const view = activeInlineInspection;
        activeInlineInspection = null;
        view.inlinePage.remove();
        view.previous.forEach(({element, display}) => {
            element.style.display = display;
        });
        if (view.address) view.address.innerHTML = view.originalAddress;
        view.viewport.scrollTop = view.previousScroll;
        if (tsCurrentQuestion && !tsReviewMode) {
            // Restored page retains its original DOM and listeners.
            queueMicrotask(() => tsAttachVisualClues(tsCurrentQuestion));
        }
        if (view.returnFocus && view.returnFocus.isConnected) {
            view.returnFocus.focus();
        }
    }
 
    // Keep the old modal hidden for compatibility with the existing HTML.
    simulationModal.classList.add('hidden');
    simulationContent.innerHTML = '';
    document.body.style.overflow = '';
}
 
closeSimulationButton.addEventListener('click', closeSimulation);
simulationModal.addEventListener('click', function(event) {
    if (event.target === simulationModal) closeSimulation();
});
 
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape' && activeInlineInspection) closeSimulation();
});
 
 
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
 
        <div class="sim-browser ts-sim-${escapeHTML(inspection.kind)}">
 
 
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
 
                <div class="ts-sim-identity">
                    <span class="ts-sim-brand-icon">◈</span>
                    <span>${escapeHTML(inspection.title)}</span>
                    <small>Training website preview</small>
                </div>
 
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
 
 
    if (correct) score += 1;
    tsAnswersHistory.push({
        id: question.id,
        title: question.title,
        safe: question.safe,
        correct,
        chosen: answerId,
        correctAnswer: question.correctAnswer,
        investigated: [...tsInvestigated],
        tips: [...question.tips],
        feedback: question.feedback
    });
 
    tsShowReviewOnScreen(question, correct);
 
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
 
 
    tsShowAnnotatedFeedback(question, correct);
 
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
 
 
    tsRenderPersonalReport();
    showSection(completeSection);
 
}
 
 
 
/* ============================================================
   RESTART
============================================================ */
 
restartButton.addEventListener(
    "click",
    function () {
 
        selectedQuestions = [];
        tsAnswersHistory = [];
        tsInvestigated = new Set();
 
 
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
   GUIDED INVESTIGATION + LEARNING EXPERIENCE
   Clues are real question metadata, not external links.
============================================================ */
const tsClues = {
 "unsafe-marketplace":[["price","Unusually low price","$299 instead of $799: consider whether the offer is believable."],["seller","Seller and payment method","TechDeals_AU demands a direct transfer outside normal protections."],["identity","Personal information","The checkout asks for a driver's licence or passport." ]],
 "safe-marketplace":[["origin","How you arrived","You visited your usual retailer yourself, rather than following a stranger's link."],["payment","Protected checkout","The seller uses the normal retailer checkout with familiar payment options."],["context","Realistic offer","A standard sale price alone does not mean the offer is a scam."]],
 "phishing-email":[["sender","Sender address","The sender uses account-help.example rather than an independently verified service address."],["urgency","Pressure to act","It claims account suspension within 30 minutes."],["link","Inspect the link","The login page asks for a password and verification code; never submit these here."]],
 "safe-email":[["context","Did you expect it?","You had just changed the password yourself."],["request","What does it request?","It confirms the change and requires no reply or credentials."],["sender","Check the context","Use the official app if you need to verify the change."]],
 "safe-gaming-store":[["origin","Official store","You opened the built-in console store yourself."],["payment","Purchase method","Checkout stays inside the console's existing payment system."],["discount","Discount context","A game sale is not automatically fraudulent."]],
 "gaming-message-scam":[["sender","Unknown player","The message is from a person you do not know."],["reward","Too-good-to-be-true reward","The stranger promises a rare item for nothing."],["link","Unexpected login","The linked site asks for gaming credentials."]],
 "employment-scam":[["salary","Unusually high pay","The job promises high pay for simple work and immediate hiring."],["deposit","Upfront deposit","The employer demands $250 before work begins."],["personal","Sensitive documents","The application asks for bank and identity details."]],
 "sextortion":[["contact","Unknown contact","This person has not established a trustworthy relationship."],["request","Intimate image request","They ask you to share sensitive images privately."],["promise","Unverifiable promise","A promise of secrecy cannot prevent later misuse."]],
 "family-impersonation":[["number","Unrecognised number","The sender claims to be family but uses a new number."],["urgency","Emotional urgency","They want money urgently and discourage verification."],["verify","Independent contact","Call the family member using an already saved number."]],
 "remote-access":[["popup","Unexpected warning","A scary pop-up is not reliable proof of a system problem."],["support","Remote access request","The supposed technician asks for remote-control software."],["banking","Banking request","They ask you to access online banking while connected."]],
 "investment-scam":[["returns","Unrealistic returns","High-return, low-risk guarantees deserve scrutiny."],["ad","Sponsored advertisement","A paid advertisement is not evidence of regulatory approval."],["remote","Remote assistance","Requests for device access can expose accounts and money."]],
 "arrest-threat":[["caller","Claimed identity","Caller ID and claimed government identity can be spoofed."],["threat","Arrest threat","Threats of urgent arrest create fear and reduce careful thinking."],["payment","Payment demand","Gift cards are not a normal way to pay government debts."]]
};
 
/* ============================================================
   ON-SCREEN, CONTEXTUAL RED FLAGS
   Each clue belongs to an element within the simulated app.
   Flags only reveal their full meaning when clicked, until the
   answer has been submitted. Safe cases use blue check markers.
============================================================ */
const tsVisualTargets = {
  "unsafe-marketplace": [".ts-product-price", ".ts-seller-card", ".ts-shop-cta"],
  "safe-marketplace": [".ts-shop-breadcrumb", ".ts-checkout-icons", ".ts-product-price"],
  "phishing-email": [".ts-open-mail-sender", ".ts-open-mail-body p", ".ts-mail-link"],
  "safe-email": [".ts-open-mail h3", ".ts-open-mail-body p", ".ts-open-mail-sender"],
  "safe-gaming-store": [".ts-game-brand", ".ts-game-action", ".ts-game-price"],
  "gaming-message-scam": [".ts-game-chat-header", ".ts-game-chat-bubble", ".ts-game-link"],
  "employment-scam": [".ts-jobs-salary", ".ts-jobs-card .ts-cta", ".ts-jobs-card"],
  "sextortion": [".ts-chat-contact", ".ts-chat-thread .ts-bubble:nth-child(2)", ".ts-chat-thread .ts-bubble:nth-child(3)"],
  "family-impersonation": [".ts-chat-contact", ".ts-chat-thread .ts-bubble:nth-child(3)", ".ts-chat-thread .ts-bubble:nth-child(2)"],
  "remote-access": [".ts-os-window", ".ts-os-contact", ".ts-os-body .ts-cta"],
  "investment-scam": [".ts-social-postcopy h3", ".ts-social-author", ".ts-social-postcopy .ts-cta"],
  "arrest-threat": [".ts-call h3", ".ts-call-transcript", ".ts-call-actions"]
};
 
const tsInspectionTargets = {
    "checkout": [".ts-inline-location", ".sim-warning", ".sim-field"],
    "checkout-safe": [".ts-inline-location", ".sim-field", ".sim-card p"],
    "login": [".ts-inline-location", ".sim-card p", ".sim-field"],
    "gaming-login": [".ts-inline-location", ".sim-card p", ".sim-field"],
    "job": [".sim-card p", ".sim-warning", ".sim-field"],
    "support": [".ts-inline-location", ".sim-warning", ".sim-field"],
    "investment": [".sim-warning", ".ts-inline-location", ".sim-field"],
    "gaming-safe": [".ts-inline-location", ".sim-field", ".sim-card p"]
};
let tsReviewMode = false;
let tsOpenClue = null;
let tsCurrentQuestion = null;
 
/*
 * During investigation the page looks normal: no flags or borders.
 * Clicking an inspectable detail opens one brief contextual explanation.
 * Clicking elsewhere, or the same detail again, dismisses it.
 * AFTER answering all clue targets receive numbered flag markers.
 */
let tsDismissClueInstalled = false;
let tsActiveClueAnchor = null;
 
let tsActiveCluePopover = null;
let tsCluePlacementListenersInstalled = false;
 
// Keep the explanation in the document's topmost layer rather than inside
// a phone, simulated browser, or any container with overflow: hidden.
function tsPositionCluePopup() {
    const pop = tsActiveCluePopover;
    const target = tsActiveClueAnchor;
    if (!pop || !target || !target.isConnected) {
        tsCloseCluePopup();
        return;
    }
    const rect = target.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight ||
        rect.right < 0 || rect.left > window.innerWidth) {
        tsCloseCluePopup();
        return;
    }
    const margin = 12;
    const gap = 12;
    const width = Math.min(320, Math.max(190, window.innerWidth - margin * 2));
    pop.style.width = width + 'px';
    // Using a fixed position on document.body prevents clipping by
    // the phone screen, scroll containers, border radius or transforms.
    const box = pop.getBoundingClientRect();
    const left = Math.max(margin, Math.min(
        rect.left + rect.width / 2 - width / 2,
        window.innerWidth - width - margin
    ));
    const roomBelow = window.innerHeight - rect.bottom;
    const roomAbove = rect.top;
    const below = roomBelow >= box.height + gap ||
        roomBelow >= roomAbove;
    const rawTop = below ? rect.bottom + gap : rect.top - box.height - gap;
    const top = Math.max(margin, Math.min(rawTop,
        window.innerHeight - box.height - margin));
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
}
 
function tsCloseCluePopup() {
    if (tsActiveCluePopover) tsActiveCluePopover.remove();
    tsActiveCluePopover = null;
    // Clean up popups from any previous implementation.
    scenarioVisual.querySelectorAll('.ts-flag-popover').forEach(el => el.remove());
    scenarioVisual.querySelectorAll('[aria-expanded="true"][data-ts-clue]')
        .forEach(el => el.setAttribute('aria-expanded', 'false'));
    tsActiveClueAnchor = null;
}
 
function tsClearVisualClues() {
    tsCloseCluePopup();
    scenarioVisual.querySelectorAll('.ts-flag-pin').forEach(pin => pin.remove());
    scenarioVisual.querySelectorAll('[data-ts-clue]').forEach(element => {
        if (element._tsClueClick) element.removeEventListener('click', element._tsClueClick);
        if (element._tsClueKey) element.removeEventListener('keydown', element._tsClueKey);
        delete element._tsClueClick; delete element._tsClueKey;
        element.classList.remove('ts-flag-anchor','ts-flag-anchor-safe','ts-flag-highlight','ts-clue-discoverable');
        element.removeAttribute('data-ts-clue');
        element.removeAttribute('aria-expanded');
        if (element.dataset.tsAddedTabindex === 'yes') {
            element.removeAttribute('tabindex');
            delete element.dataset.tsAddedTabindex;
        }
        if (element.dataset.tsOldTitle !== undefined) {
            element.title = element.dataset.tsOldTitle;
            delete element.dataset.tsOldTitle;
        }
    });
}
 
function tsClueTarget(selector) {
    const found = scenarioVisual.querySelector(selector);
    if (!found || found.closest('[hidden], .ts-inline-inspection[style*="display: none"]')) return null;
    return found;
}
 
function tsDisplayClue(target, clue, safe) {
    const alreadyOpen = tsActiveClueAnchor === target &&
        !!tsActiveCluePopover;
    tsCloseCluePopup();
    if (alreadyOpen) return;
    const pop = document.createElement('aside');
    pop.className = 'ts-flag-popover ts-clue-portal' +
        (safe ? ' ts-flag-popover-safe' : '');
    pop.setAttribute('role', 'status');
    pop.innerHTML = `<div class="ts-flag-popover-title"><span>${safe ? '✓ SAFETY CLUE' : '⚑ RED FLAG'}</span><b>${escapeHTML(clue[1])}</b></div><p>${escapeHTML(clue[2])}</p>`;
    // Portal directly to body so parent overflow cannot crop the popup.
    document.body.appendChild(pop);
    tsActiveCluePopover = pop;
    tsActiveClueAnchor = target;
    target.setAttribute('aria-expanded', 'true');
    tsInvestigated.add(clue[0]);
    tsPositionCluePopup();
 
    if (!tsCluePlacementListenersInstalled) {
        window.addEventListener('resize', tsPositionCluePopup);
        // Capture scroll inside nested simulated devices as well.
        window.addEventListener('scroll', tsPositionCluePopup, true);
        tsCluePlacementListenersInstalled = true;
    }
}
 
function tsAttachVisualClues(question) {
    if (!question || !scenarioVisual.isConnected) return;
    tsCurrentQuestion = question;
    tsClearVisualClues();
    const clues = tsClues[question.id] || [];
    const inspectionVisible = !!activeInlineInspection;
    const selectors = inspectionVisible
        ? (tsInspectionTargets[question.inspection?.kind] || [])
        : (tsVisualTargets[question.id] || []);
 
    clues.forEach((clue, index) => {
        const target = tsClueTarget(selectors[index]);
        if (!target || target.closest('[style*="display: none"]')) return;
        target.classList.add('ts-flag-anchor');
        if (question.safe) target.classList.add('ts-flag-anchor-safe');
        target.dataset.tsClue = String(index);
        target.setAttribute('aria-expanded','false');
 
        if (tsReviewMode) {
            target.classList.add('ts-flag-highlight');
            const pin = document.createElement('button');
            pin.type='button';
            pin.className='ts-flag-pin' + ((question.safe || scenarioVisual.classList.contains('ts-successful-review')) ? ' ts-flag-pin-safe' : '');
            pin.dataset.clueIndex=String(index);
            pin.setAttribute('aria-label',(question.safe ? 'Review safety clue ' : 'Review red flag ') + (index+1) + ': ' + clue[1]);
            pin.innerHTML=`<span aria-hidden="true">${index+1}</span>`;
            pin.addEventListener('click',event => {
                event.preventDefault(); event.stopPropagation();
                tsDisplayClue(target,clue,question.safe);
            });
            // Append to a parent if the target is a button (no nested buttons).
            if (target.matches('button,a')) target.parentElement.appendChild(pin);
            else target.appendChild(pin);
            return;
        }
 
        // Before answering, do not reveal any clue markers or outlines.
        target.classList.add('ts-clue-discoverable');
        if (!target.matches('button,a,input,select,textarea') && !target.hasAttribute('tabindex')) {
            target.setAttribute('tabindex','0');
            target.dataset.tsAddedTabindex='yes';
        }
        // Keep existing navigation behaviour on link/CTA buttons.
        // Non-action details (sender, subject, text, price) open an explanation.
        if (!target.matches('button,a') && !target.querySelector('button,a')) {
            target._tsClueClick = event => {
                if (event.target.closest('.ts-flag-popover')) return;
                event.stopPropagation();
                tsDisplayClue(target,clue,question.safe);
            };
            target._tsClueKey = event => {
                if ((event.key==='Enter' || event.key===' ') && event.target===target) {
                    event.preventDefault();
                    tsDisplayClue(target,clue,question.safe);
                }
            };
            target.addEventListener('click',target._tsClueClick);
            target.addEventListener('keydown',target._tsClueKey);
        }
    });
 
    if (!tsDismissClueInstalled) {
        document.addEventListener('click', event => {
            if (tsActiveClueAnchor && !tsActiveClueAnchor.contains(event.target) && !(tsActiveCluePopover && tsActiveCluePopover.contains(event.target))) tsCloseCluePopup();
        });
        document.addEventListener('keydown', event => {if(event.key==='Escape') tsCloseCluePopup();});
        tsDismissClueInstalled=true;
    }
}
 
function tsToggleVisualClue(pin,clue,safe) {
    tsDisplayClue(pin.parentElement,clue,safe);
}
 
function tsInstallInvestigation(question) {
    // Legacy entry point kept for compatibility with old code paths.
    tsAttachVisualClues(question);
}
 
function tsShowReviewOnScreen(question, correct) {
    tsReviewMode = true;
    closeSimulation(); // Return to original page while retaining open email state.
    tsAttachVisualClues(question);
    scenarioVisual.classList.toggle('ts-successful-review', correct);
 
    // The learner stays on the same simulated app. Feedback sits beneath it.
    const review = document.createElement('section');
    review.className = 'ts-visual-feedback ' + (correct ? 'ts-review-correct' : 'ts-review-incorrect');
    review.setAttribute('aria-live','polite');
    const intro = correct ? 'Good decision!' : 'There was a safer response.';
    // A browser window with a tick for a good decision, a warning mark otherwise.
    const art = `<svg class="ts-review-art" viewBox="0 0 200 160" aria-hidden="true" focusable="false">
        <path d="M44 62c8-30 46-42 70-28 26-14 66 0 70 34 14 12 12 48-14 58-12 22-58 24-78 12-32 8-62-6-66-30-14-14-8-40 18-46z" fill="${correct?'#CDEBDA':'#FAD6CB'}"/>
        <g transform="rotate(-8 112 88)"><rect x="56" y="40" width="116" height="96" rx="12" fill="#fff"/><path d="M68 40h92a12 12 0 0 1 12 12v6H56v-6a12 12 0 0 1 12-12z" fill="#15264C"/><circle cx="150" cy="49" r="3.5" fill="#fff"/><circle cx="161" cy="49" r="3.5" fill="#fff"/></g>
        <circle cx="114" cy="96" r="26" fill="${correct?'#1E8C62':'#E8402A'}"/>
        ${correct ? '<path d="M102 96l8 8 16-17" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>' : '<path d="M114 83v15" stroke="#fff" stroke-width="7" stroke-linecap="round"/><circle cx="114" cy="109" r="4.5" fill="#fff"/>'}
      </svg>`;
    review.innerHTML = `<div class="ts-visual-feedback-head"><span class="ts-review-result ${correct?'is-correct':'needs-review'}">${correct?'✓':'!'} ${intro}</span>
      <h3>${correct ? (question.safe ? 'You recognised a legitimate situation.' : 'You chose the safer response.') : 'Review the evidence on the screen above.'}</h3>
      <p>${escapeHTML(question.feedback)}</p>${art}</div>
      <div class="ts-visual-feedback-instruction"><span aria-hidden="true">i</span><b>${question.safe?'Safety clues revealed':'All red flags revealed'}</b><p>Every numbered point is attached to something in the simulated screen. You can inspect the highlighted parts again before continuing.</p></div>
      <div class="ts-review-anchor-list" aria-label="All ${question.safe ? 'safety clues' : 'red flags'}">${(tsClues[question.id]||[]).map((clue,index)=>`<button type="button" class="ts-review-jump ts-review-explanation" data-index="${index}" aria-label="Find clue ${index+1} on the simulation"><span class="ts-review-number">${index+1}</span><span class="ts-review-copy"><strong>${escapeHTML(clue[1])}</strong><small>${escapeHTML(clue[2])}</small></span><span class="ts-review-arrow" aria-hidden="true">↗</span></button>`).join('')}</div>
      <div class="ts-review-next"></div>`;
    const previous = scenarioSection.querySelector('.ts-visual-feedback');
    if (previous) previous.remove();
    scenarioVisual.insertAdjacentElement('afterend', review);
    const nextHost = review.querySelector('.ts-review-next');
    nextHost.appendChild(nextButton); // Existing event listener stays attached.
    nextButton.innerHTML = currentQuestionIndex === 4 ? 'See my score →' : 'Next scenario →';
    review.querySelectorAll('.ts-review-jump').forEach(button => button.addEventListener('click', () => {
        const pin = scenarioVisual.querySelector(`.ts-flag-pin[data-clue-index="${button.dataset.index}"]`);
        if (!pin) return;
        pin.parentElement.scrollIntoView({behavior:'smooth', block:'center'});
        pin.focus({preventScroll:true});
        const reviewClue = (tsClues[question.id] || [])[Number(button.dataset.index)];
        if (reviewClue) tsDisplayClue(pin.parentElement, reviewClue, question.safe);
    }));
    decisionArea.classList.add('hidden');
    review.scrollIntoView({behavior:'smooth', block:'nearest'});
}
 
function tsShowAnnotatedFeedback(question, correct) {
    // Retain original name for compatibility, but show annotations in-scene.
    tsShowReviewOnScreen(question, correct);
}
 
function tsReportData() {
    const good = tsAnswersHistory.filter(r => r.correct);
    const needs = tsAnswersHistory.filter(r => !r.correct);
    const safe = tsAnswersHistory.filter(r => r.safe && r.correct).length;
    const risky = tsAnswersHistory.filter(r => !r.safe && r.correct).length;
    const totalClues = tsAnswersHistory.reduce((n, r) => n + r.investigated.length, 0);
    const recommendations = [...new Set([...needs, ...tsAnswersHistory]
        .flatMap(r => r.tips))].slice(0, 3);
    return {good, needs, safe, risky, totalClues, recommendations};
}
 
function tsBuildReportContents(print = false) {
    const data = tsReportData();
    const pct = Math.round(data.good.length / 5 * 100);
    const status = data.good.length === 5 ? 'Excellent awareness' :
        data.good.length >= 4 ? 'Strong awareness' :
        data.good.length >= 3 ? 'Building confidence' : 'Keep practising';
    const reportRows = tsAnswersHistory.map((r, i) => `
       <div class="ts-report-row">
          <span class="ts-row-number">${String(i+1).padStart(2,'0')}</span>
          <b>${escapeHTML(r.title)}</b>
          <small class="${r.correct ? 'is-correct' : 'needs-review'}">${r.correct ? '✓ Safer response' : '↗ Review recommended'}</small>
       </div>`).join('');
    return `<div class="ts-report-topline"><span>THINKSECURE / CYBER SAFETY</span><span>SESSION SUMMARY</span></div>
      <header class="ts-report-hero">
        <div class="ts-report-hero-copy"><span class="ts-report-eyebrow">YOUR CYBER SAFETY REPORT</span>
        <h3>Five scenarios.<br><em>Stronger instincts.</em></h3>
        <p>A snapshot of your decisions and the practical skills to take away.</p>
        <span class="ts-report-status">${escapeHTML(status)}</span></div>
        <div class="ts-report-score" style="--report-progress:${pct}%"><strong>${data.good.length}<small>/5</small></strong><span>SAFER DECISIONS</span></div>
      </header>
      <div class="ts-report-stat-grid">
        <div><b>${data.safe}</b><span>Legitimate situations recognised</span></div>
        <div><b>${data.risky}</b><span>Scam scenarios handled safely</span></div>
        <div><b>${data.totalClues}</b><span>Details investigated</span></div>
      </div>
      <div class="ts-report-section-title"><h4>Scenario breakdown</h4><span>${data.good.length} of 5 correct</span></div>
      <div class="ts-report-rows">${reportRows}</div>
      <div class="ts-report-takeaway-card"><div class="ts-report-section-title"><h4>Your three safety takeaways</h4><span>KEEP THESE IN MIND</span></div>
        <ol class="ts-report-takeaways">${data.recommendations.map(t => `<li>${escapeHTML(t)}</li>`).join('')}</ol></div>
      <footer class="ts-report-footer"><strong>THINKSECURE</strong><span>Learn to pause. Inspect. Decide.</span><small>Educational results only. No identifying information is included.</small></footer>
      ${print ? '' : '<div class="ts-report-actions"><button type="button" id="ts-print-report" class="primary-action">Print / Save as PDF ↗</button><small>A clean A4 report opens in your browser’s print dialog.</small></div>'}`;
}
 
function tsPrintPersonalReport() {
    // Print a self-contained report instead of the full quiz page.
    const previous = document.getElementById('ts-print-sheet');
    if (previous) previous.remove();
    const sheet = document.createElement('section');
    sheet.id = 'ts-print-sheet';
    sheet.className = 'ts-personal-report ts-print-layout';
    sheet.innerHTML = tsBuildReportContents(true);
    document.body.appendChild(sheet);
    window.print();
}
 
window.addEventListener('afterprint', () => {
    const sheet = document.getElementById('ts-print-sheet');
    if (sheet) sheet.remove();
});
 
function tsRenderPersonalReport() {
    const host = document.getElementById('ts-personal-report');
    if (!host) return;
    host.innerHTML = tsBuildReportContents(false);
    host.querySelector('#ts-print-report').addEventListener('click', tsPrintPersonalReport);
}
 
const tsTutorialSteps = [
  {heading:'Explore the situation', body:'Each question includes a simulated phone, email, shopping site or other digital screen. Open the message or listing to see more.'},
  {heading:'Inspect clues and links', body:'Look for the sender, website address, urgency, requested payment and personal information. Click details within the simulated screen to investigate them. No warning signs are marked in advance.'},
  {heading:'Choose the safest response', body:'After investigating, pick one of the available answers. You will see an explanation and a breakdown of the warning signs.'}
];
let tsTutorialIndex = 0;
function tsOpenTutorial() {
    const overlay = document.getElementById('ts-tutorial');
    if (!overlay) { tsFinishTutorial(); return; }
    tsTutorialIndex = 0;
    overlay.classList.remove('hidden');
    tsRenderTutorial();
    overlay.querySelector('#ts-tutorial-next').focus();
}
function tsRenderTutorial() {
    const step = tsTutorialSteps[tsTutorialIndex];
    document.getElementById('ts-tutorial-step').textContent = `STEP ${tsTutorialIndex+1} OF ${tsTutorialSteps.length}`;
    document.getElementById('ts-tutorial-heading').textContent = step.heading;
    document.getElementById('ts-tutorial-body').textContent = step.body;
    document.getElementById('ts-tutorial-next').textContent = tsTutorialIndex===2?'Start challenge →':'Next →';
    document.getElementById('ts-tutorial-dots').innerHTML = tsTutorialSteps.map((_,i)=>`<span class="${i===tsTutorialIndex?'active':''}"></span>`).join('');
}
function tsFinishTutorial() {
    tsTutorialShown = true;
    document.getElementById('ts-tutorial')?.classList.add('hidden');
    if (tsPendingStart) {
        tsPendingStart = false;
        showSection(scenarioSection);
        renderQuestion();
    }
}
document.getElementById('ts-tutorial-next')?.addEventListener('click',()=>{
    if (tsTutorialIndex >= tsTutorialSteps.length-1) tsFinishTutorial();
    else { tsTutorialIndex++; tsRenderTutorial(); }
});
document.getElementById('ts-tutorial-skip')?.addEventListener('click',tsFinishTutorial);
document.getElementById('ts-reopen-tutorial')?.addEventListener('click',()=>tsOpenTutorial());
 
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

