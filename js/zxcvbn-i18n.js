// Message inventory: Dropbox zxcvbn v4.4.2 src/feedback.coffee
(()=>{
const keys={
  "Use a few words, avoid common phrases": "password.zxcvbn.message0",
  "No need for symbols, digits, or uppercase letters": "password.zxcvbn.message1",
  "Add another word or two. Uncommon words are better.": "password.zxcvbn.message2",
  "Straight rows of keys are easy to guess": "password.zxcvbn.message3",
  "Short keyboard patterns are easy to guess": "password.zxcvbn.message4",
  "Use a longer keyboard pattern with more turns": "password.zxcvbn.message5",
  "Repeats like \"aaa\" are easy to guess": "password.zxcvbn.message6",
  "Repeats like \"abcabcabc\" are only slightly harder to guess than \"abc\"": "password.zxcvbn.message7",
  "Avoid repeated words and characters": "password.zxcvbn.message8",
  "Sequences like abc or 6543 are easy to guess": "password.zxcvbn.message9",
  "Avoid sequences": "password.zxcvbn.message10",
  "Recent years are easy to guess": "password.zxcvbn.message11",
  "Avoid recent years": "password.zxcvbn.message12",
  "Avoid years that are associated with you": "password.zxcvbn.message13",
  "Dates are often easy to guess": "password.zxcvbn.message14",
  "Avoid dates and years that are associated with you": "password.zxcvbn.message15",
  "This is a top-10 common password": "password.zxcvbn.message16",
  "This is a top-100 common password": "password.zxcvbn.message17",
  "This is a very common password": "password.zxcvbn.message18",
  "This is similar to a commonly used password": "password.zxcvbn.message19",
  "A word by itself is easy to guess": "password.zxcvbn.message20",
  "Names and surnames by themselves are easy to guess": "password.zxcvbn.message21",
  "Common names and surnames are easy to guess": "password.zxcvbn.message22",
  "Capitalization doesn't help very much": "password.zxcvbn.message23",
  "All-uppercase is almost as easy to guess as all-lowercase": "password.zxcvbn.message24",
  "Reversed words aren't much harder to guess": "password.zxcvbn.message25",
  "Predictable substitutions like '@' instead of 'a' don't help very much": "password.zxcvbn.message26"
};
window.translateZxcvbn=(message)=>{ if(!message)return ""; const key=keys[message]; if(key)return I18n.t(key); console.warn("Unmapped zxcvbn feedback"); return I18n.getLanguage()==="en"?message:I18n.t("password.zxcvbn.fallback"); };
})();
