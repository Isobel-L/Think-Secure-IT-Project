// Page-specific guidance; the component handles presentation and interaction.
(()=>{
 const copy={
  en:{help:'Need a hand?',name:'Security Bot',subtitle:'Your Password Checker guide',close:'Close tips',section:'A SMALL SECURITY TIP',next:'Next tip →',count:'Tip {n} of 4',tips:[
   ['Start with a made-up password','Type a fictional example into the checker. Never enter a password you use for a real account.'],
   ['Read the feedback','Try your example, then read the strength result and suggestions. The estimate is a learning aid, not a guarantee of security.'],
   ['Change one thing at a time','Make your example longer or replace predictable patterns. Test it again and compare the feedback.'],
   ['Try a passphrase next','Ready for another approach? Open Passphrase Maker using the Next step button and explore combining unrelated words.']
  ]},
  'zh-CN':{help:'需要帮忙吗？',name:'Security Bot 安全小助手',subtitle:'陪你体验密码检测器',close:'关闭提示',section:'一个安全小提示',next:'下一条提示 →',count:'第 {n} 条，共 4 条',tips:[
   ['先用一个虚构密码试试','在输入框里填写一个虚构的示例密码。不要输入你正在用于真实账户的密码。'],
   ['看看检测结果在说什么','检测后，阅读密码强度和改进建议。这里的估算用于帮助学习，并不代表安全保证。'],
   ['每次改一点，再比较','试着增加示例密码的长度，或替换容易预测的规律。再次检测，看看反馈有什么变化。'],
   ['接下来试试密码短语','想换一种方法？点击「下一步」进入密码短语生成器，试试把几个互不相关的词组合起来。']
  ]}
 };
 copy['zh-TW']={help:'需要幫忙嗎？',name:'Security Bot 安全小助手',subtitle:'陪你體驗密碼檢測器',close:'關閉提示',section:'一個安全小提示',next:'下一條提示 →',count:'第 {n} 條，共 4 條',tips:[
    ['先用一個虛構密碼試試','在輸入框裡填寫一個虛構的示例密碼。不要輸入你正在用於真實帳戶的密碼。'],
    ['看看檢測結果在說什麼','檢測後，閱讀密碼強度和改進建議。這裡的估算用於幫助學習，並不代表安全保證。'],
    ['每次改一點，再比較','試著增加示例密碼的長度，或替換容易預測的規律。再次檢測，看看回饋有什麼變化。'],
    ['接下來試試密碼短語','想換一種方法？點選「下一步」進入密碼短語生成器，試試把幾個互不相關的詞組合起來。']
   ]};
 copy.vi={"help":"Cần trợ giúp?","name":"Security Bot","subtitle":"Hướng dẫn kiểm tra mật khẩu","close":"Đóng mẹo","section":"MẸO AN TOÀN NHỎ","next":"Mẹo tiếp theo →","count":"Mẹo {n} / 4","tips":[["Thử bằng mật khẩu giả","Nhập một mật khẩu mẫu giả định vào công cụ. Không nhập mật khẩu bạn dùng cho tài khoản thật."],["Đọc phản hồi","Kiểm tra mật khẩu mẫu, rồi đọc kết quả độ mạnh và gợi ý. Đây là công cụ học tập, không phải bảo đảm an toàn."],["Mỗi lần thay đổi một chút","Tăng độ dài hoặc thay các mẫu dễ đoán trong mật khẩu mẫu. Kiểm tra lại và so sánh phản hồi."],["Tiếp theo, thử cụm mật khẩu","Bạn muốn thử cách khác? Nhấn nút Bước tiếp theo để mở trang tạo cụm mật khẩu và thử kết hợp các từ không liên quan."]]};
 copy.fr={"help":"Besoin d’aide ?","name":"Security Bot","subtitle":"Votre guide du test de mot de passe","close":"Fermer les conseils","section":"UN CONSEIL DE SÉCURITÉ","next":"Conseil suivant →","count":"Conseil {n} sur 4","tips":[["Commencez avec un exemple fictif","Saisissez un mot de passe inventé. Ne saisissez jamais celui d’un compte réel."],["Lisez les résultats","Testez votre exemple, puis lisez sa robustesse et les conseils. Cette estimation aide à apprendre, sans garantir la sécurité."],["Changez une chose à la fois","Allongez votre exemple ou remplacez les schémas prévisibles. Testez-le à nouveau et comparez les résultats."],["Essayez ensuite une phrase de passe","Prêt à essayer autre chose ? Le bouton Étape suivante ouvre le créateur de phrase de passe pour combiner des mots sans rapport."]]};
 copy.de={"help":"Brauchst du Hilfe?","name":"Security Bot","subtitle":"Dein Begleiter bei der Passwortprüfung","close":"Tipps schließen","section":"EIN KLEINER SICHERHEITSTIPP","next":"Nächster Tipp →","count":"Tipp {n} von 4","tips":[["Starte mit einem erfundenen Passwort","Gib ein erfundenes Beispiel ein. Verwende niemals ein Passwort eines echten Kontos."],["Lies die Rückmeldung","Teste dein Beispiel und lies das Ergebnis und die Tipps. Die Schätzung hilft beim Lernen und garantiert keine Sicherheit."],["Ändere jeweils eine Sache","Mache dein Beispiel länger oder ersetze vorhersehbare Muster. Teste es erneut und vergleiche die Rückmeldung."],["Probiere als Nächstes eine Passphrase","Bereit für einen anderen Ansatz? Öffne über Nächster Schritt die Passphrase-Erstellung und kombiniere unabhängige Wörter."]]};
 const dismissLabels={en:'Hide Security Bot','zh-CN':'收起安全机器人','zh-TW':'收起安全機器人',vi:'Ẩn Security Bot',fr:'Masquer Security Bot',de:'Security Bot ausblenden'};
 for(const [lang,label] of Object.entries(dismissLabels))copy[lang].dismiss=label;
 window.ThinkSecureGuidance=window.ThinkSecureGuidance||{};
 window.ThinkSecureGuidance.passwordChecker=copy;
 const pageCopy={
  "en": {
    "passphraseMaker": [
      "Your Passphrase Maker guide",
      "Choose four words",
      "Start Building, then choose a place, an animal, a fruit and a country.",
      "Use the translated labels",
      "Labels help you understand each choice. The generated words remain English when you switch languages.",
      "Picture a little story",
      "Imagine your four unrelated words in one scene to help you remember them.",
      "Try the next activity",
      "After choosing four words, test the example or turn it into a keychain. This small word list is a learning demo, not a real password generator."
    ],
    "stickerStudio": [
      "Your Keychain Studio guide",
      "Bring your four words",
      "First finish Passphrase Maker, then choose Make My Keychain to bring your words here.",
      "Arrange your pictures",
      "Drag the flag, the animal and the fruit wherever you like. Placing them yourself helps you remember their little story.",
      "Keychain or badge pin",
      "Pick which one to make. Both print the same design, and it shows only pictures, so your passphrase itself stays private.",
      "Download your design",
      "Use Download PNG when ready. If opening the HTML file directly prevents downloading, use the project’s local web preview."
    ],
    "cyberQuiz": [
      "Your Cyber Safety Quiz guide",
      "Start the challenge",
      "Select the requested age range and gender options, then start. Five situations will be selected.",
      "Explore before deciding",
      "Open the simulated message, email, call or listing and inspect its details.",
      "Choose your response",
      "Read all options and decide what you would do. This helper gives guidance, not the answer.",
      "Learn from the feedback",
      "Read the explanation after each answer, then continue. Switching language keeps your progress."
    ]
  },
  "zh-CN": {
    "passphraseMaker": [
      "陪你制作密码短语",
      "先选择四个词",
      "点击「开始创建」，依次选择一个地点、动物、水果和国家。",
      "参考双语标签",
      "翻译帮助你理解每个选项。切换语言时，生成短语里的英文单词不会改变。",
      "想象一个小故事",
      "把四个互不相关的词想象成一个场景，帮助自己记住它们。",
      "继续体验下一步",
      "选好四个词后，可以检测这个示例，或制作钥匙扣。这份小词表用于学习演示，不是真实密码生成器。"
    ],
    "stickerStudio": [
      "陪你制作记忆钥匙扣",
      "先带上你的四个词",
      "先完成密码短语生成器，再点击制作钥匙扣，把选好的词带到这里。",
      "摆放你的图片",
      "把国旗、动物和水果拖到你喜欢的位置。亲手摆一摆，更容易记住它们的小故事。",
      "钥匙扣还是徽章",
      "选择要做哪一种。两种都打印同一张设计图，图上只有图片，你的密码短语不会被别人看到。",
      "下载你的设计",
      "确认后点击下载 PNG。如果直接打开 HTML 导致无法下载，请使用项目的本地网页预览。"
    ],
    "cyberQuiz": [
      "陪你体验网络安全测验",
      "开始挑战",
      "选择要求的年龄段和性别选项后开始。系统会选出五个情境。",
      "先探索再决定",
      "打开模拟消息、邮件、来电或商品页面，仔细查看其中的细节。",
      "选择你的应对方式",
      "读完所有选项，再决定你会怎么做。小助手只提供操作提示，不透露答案。",
      "从反馈中学习",
      "每次作答后先阅读解释，再继续。切换语言会保留答题进度。"
    ]
  },
  "zh-TW": {
    "passphraseMaker": [
      "陪你製作密碼短語",
      "先選擇四個詞",
      "點選「開始建立」，依序選擇一個地點、動物、水果和國家。",
      "參考雙語標籤",
      "翻譯幫助你理解每個選項。切換語言時，產生短語裡的英文單字不會改變。",
      "想像一個小故事",
      "把四個互不相關的詞想像成一個場景，幫助自己記住它們。",
      "繼續體驗下一步",
      "選好四個詞後，可以檢測這個範例，或製作鑰匙圈。這份小詞表用於學習示範，不是真實密碼產生器。"
    ],
    "stickerStudio": [
      "陪你製作記憶鑰匙圈",
      "先帶上你的四個詞",
      "先完成密碼短語產生器，再點選製作鑰匙圈，把選好的詞帶到這裡。",
      "擺放你的圖片",
      "把國旗、動物和水果拖到你喜歡的位置。親手擺一擺，更容易記住它們的小故事。",
      "鑰匙圈還是徽章",
      "選擇要做哪一種。兩種都列印同一張設計圖，圖上只有圖片，你的密碼短語不會被別人看到。",
      "下載你的設計",
      "確認後點選下載 PNG。如果直接開啟 HTML 導致無法下載，請使用專案的本機網頁預覽。"
    ],
    "cyberQuiz": [
      "陪你體驗網路安全測驗",
      "開始挑戰",
      "選擇要求的年齡層和性別選項後開始。系統會選出五個情境。",
      "先探索再決定",
      "開啟模擬訊息、郵件、來電或商品頁面，仔細查看其中的細節。",
      "選擇你的應對方式",
      "讀完所有選項，再決定你會怎麼做。小助手只提供操作提示，不透露答案。",
      "從回饋中學習",
      "每次作答後先閱讀解釋，再繼續。切換語言會保留答題進度。"
    ]
  },
  "vi": {
    "passphraseMaker": [
      "Hướng dẫn tạo cụm mật khẩu",
      "Chọn bốn từ",
      "Bắt đầu tạo, rồi chọn một địa điểm, một con vật, một loại quả và một quốc gia.",
      "Dùng nhãn dịch",
      "Nhãn giúp bạn hiểu từng lựa chọn. Các từ trong cụm mật khẩu vẫn là tiếng Anh khi đổi ngôn ngữ.",
      "Tưởng tượng một câu chuyện",
      "Hình dung bốn từ không liên quan trong cùng một cảnh để dễ nhớ hơn.",
      "Thử hoạt động tiếp theo",
      "Sau khi chọn bốn từ, hãy kiểm tra ví dụ hoặc tạo móc khóa. Danh sách nhỏ này chỉ dùng để học, không phải công cụ tạo mật khẩu thực tế."
    ],
    "stickerStudio": [
      "Hướng dẫn tạo móc khóa",
      "Mang theo bốn từ",
      "Hoàn thành phần tạo cụm mật khẩu, rồi chọn tạo móc khóa để chuyển các từ sang đây.",
      "Sắp xếp hình ảnh",
      "Kéo lá cờ, con vật và trái cây đến bất cứ đâu bạn thích. Tự tay sắp xếp giúp bạn nhớ câu chuyện nhỏ của chúng.",
      "Móc khóa hay huy hiệu",
      "Chọn thứ bạn muốn làm. Cả hai đều in cùng một thiết kế chỉ có hình ảnh, nên cụm mật khẩu của bạn vẫn được giữ kín.",
      "Tải thiết kế",
      "Chọn tải PNG khi hoàn tất. Nếu mở trực tiếp tệp HTML khiến việc tải xuống bị chặn, hãy dùng bản xem trước web cục bộ của dự án."
    ],
    "cyberQuiz": [
      "Hướng dẫn trắc nghiệm an toàn mạng",
      "Bắt đầu thử thách",
      "Chọn nhóm tuổi và giới tính theo yêu cầu, rồi bắt đầu. Hệ thống sẽ chọn năm tình huống.",
      "Khám phá trước khi quyết định",
      "Mở tin nhắn, email, cuộc gọi hoặc trang sản phẩm mô phỏng và xem kỹ chi tiết.",
      "Chọn cách phản hồi",
      "Đọc mọi lựa chọn rồi quyết định bạn sẽ làm gì. Trợ lý hướng dẫn thao tác, không tiết lộ đáp án.",
      "Học từ phản hồi",
      "Đọc giải thích sau mỗi câu trả lời rồi tiếp tục. Đổi ngôn ngữ vẫn giữ tiến độ."
    ]
  },
  "fr": {
    "passphraseMaker": [
      "Votre guide de création de phrase de passe",
      "Choisissez quatre mots",
      "Commencez, puis choisissez un lieu, un animal, un fruit et un pays.",
      "Utilisez les traductions",
      "Les libellés traduits expliquent vos choix. Les mots générés restent en anglais lorsque vous changez de langue.",
      "Imaginez une petite histoire",
      "Imaginez les quatre mots sans rapport dans une même scène pour mieux les retenir.",
      "Essayez la suite",
      "Testez ensuite votre exemple ou créez un porte-clés. Cette petite liste sert à apprendre, pas à générer de vrais mots de passe."
    ],
    "stickerStudio": [
      "Votre guide de l’atelier de porte-clés",
      "Apportez vos quatre mots",
      "Terminez la création de la phrase de passe, puis choisissez de créer un porte-clés pour transférer vos mots ici.",
      "Disposez vos images",
      "Faites glisser le drapeau, l’animal et le fruit où vous voulez. Les placer vous-même aide à retenir leur petite histoire.",
      "Porte-clés ou badge",
      "Choisissez ce que vous fabriquez. Les deux impriment le même visuel, composé uniquement d’images : votre phrase de passe reste secrète.",
      "Téléchargez votre visuel",
      "Choisissez Télécharger le PNG. Si l’ouverture directe du fichier HTML bloque le téléchargement, utilisez l’aperçu web local du projet."
    ],
    "cyberQuiz": [
      "Votre guide du quiz de cybersécurité",
      "Commencez le défi",
      "Choisissez les options demandées pour l’âge et le genre, puis commencez. Cinq situations seront sélectionnées.",
      "Explorez avant de décider",
      "Ouvrez le message, l’e-mail, l’appel ou l’annonce simulés et examinez les détails.",
      "Choisissez votre réaction",
      "Lisez toutes les options avant de décider. L’assistant vous guide sans révéler la réponse.",
      "Apprenez des explications",
      "Après chaque réponse, lisez l’explication puis continuez. Changer de langue conserve votre progression."
    ]
  },
  "de": {
    "passphraseMaker": [
      "Dein Begleiter bei der Passphrase-Erstellung",
      "Wähle vier Wörter",
      "Starte und wähle einen Ort, ein Tier, eine Frucht und ein Land.",
      "Nutze die Übersetzungen",
      "Die übersetzten Beschriftungen erklären deine Auswahl. Die erzeugten Wörter bleiben beim Sprachwechsel Englisch.",
      "Stell dir eine Geschichte vor",
      "Stelle dir die vier unabhängigen Wörter in einer Szene vor, um sie leichter zu merken.",
      "Probiere den nächsten Schritt",
      "Prüfe anschließend dein Beispiel oder erstelle einen Schlüsselanhänger. Diese kleine Wortliste dient zum Lernen, nicht zur Erzeugung echter Passwörter."
    ],
    "stickerStudio": [
      "Dein Begleiter im Schlüsselanhänger-Studio",
      "Bring deine vier Wörter mit",
      "Erstelle zuerst eine Passphrase und wähle dann die Schlüsselanhänger-Erstellung, um deine Wörter hierher zu übertragen.",
      "Ordne deine Bilder an",
      "Zieh Flagge, Tier und Frucht dorthin, wo es dir gefällt. Wenn du sie selbst platzierst, merkst du dir ihre kleine Geschichte leichter.",
      "Schlüsselanhänger oder Anstecker",
      "Wähle, was du herstellen willst. Beide drucken dasselbe Design, das nur Bilder zeigt – deine Passphrase bleibt geheim.",
      "Lade dein Design herunter",
      "Wähle PNG herunterladen. Falls das direkte Öffnen der HTML-Datei den Download verhindert, nutze die lokale Webvorschau des Projekts."
    ],
    "cyberQuiz": [
      "Dein Begleiter beim Cybersicherheitsquiz",
      "Starte die Challenge",
      "Wähle die gefragten Angaben zu Alter und Geschlecht und starte. Fünf Situationen werden ausgewählt.",
      "Erkunde die Situation zuerst",
      "Öffne die simulierte Nachricht, E-Mail, den Anruf oder das Angebot und prüfe die Details.",
      "Wähle deine Reaktion",
      "Lies alle Möglichkeiten und entscheide dann. Der Assistent erklärt die Bedienung, verrät aber keine Antworten.",
      "Lerne aus der Rückmeldung",
      "Lies nach jeder Antwort die Erklärung und mache dann weiter. Ein Sprachwechsel behält deinen Fortschritt bei."
    ]
  }
};
 for(const profile of ['passphraseMaker','stickerStudio','cyberQuiz']) {
  const translations={};
  for(const [lang,pages] of Object.entries(pageCopy)) {
   const [subtitle,...text]=pages[profile];
   translations[lang]={...copy[lang],subtitle,tips:Array.from({length:4},(_,i)=>text.slice(i*2,i*2+2))};
  }
  window.ThinkSecureGuidance[profile]=translations;
 }
})();
