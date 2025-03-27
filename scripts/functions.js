function stripHTML(html) {
    return html.replace(/<\/?[^>]+(>|$)/g, "");
}

function isKanji(char) {
	const kanjiRegex = /[\u4e00-\u9faf\u3400-\u4dbf\u20000-\u2a6df\u2a700-\u2b73f\u2b740-\u2b81f\u2b820-\u2ceaf]/;
	const alphanumericRegex = /^[a-zA-Z0-9]$/;
                const blackList = ['…'];
                return kanjiRegex.test(char) && !alphanumericRegex.test(char) && blackList.indexOf(char) == -1;
}

function fetchSamplesFromMassif(query, callback = null) {
	fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent(`https://massif.la/ja/search?q="${query}"`))
  .then(response => response.text())
  .then(html => {
	const parser = new DOMParser();
	const doc = parser.parseFromString(html, 'text/html');

	var result = Array.from(doc.querySelectorAll("ul li.text-japanese  > :first-child")).slice(0, 5).map(el => stripHTML(el.innerHTML).trim()); 

	callback && callback(result);
  })
  .catch(error => console.error('Error fetching HTML:', error));
}

function fetchKanjiDataFromUchisen(kanji, callback = null) {
fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent(`https://uchisen.com/kanji/${kanji}&order=demo`))
  .then(response => response.text())
  .then(html => {
	const parser = new DOMParser();
	const doc = parser.parseFromString(html, 'text/html');
	
	var imgUrl = doc.querySelector('.kanji_image_loader').getAttribute('data-large');
	var mnemonicStory = doc.querySelector("#mnemonic_hidden_story + span").innerHTML

	callback && callback({
        imgUrl, 
        mnemonicStory
    });
  })
  .catch(error => console.error('Error fetching HTML:', error));
}

function speak(text, lang = "ja-JP") {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.7;
    speechSynthesis.speak(utterance);
}

function generateTTSButtom(ttsExpression) {
	var button = `<button class="play-button" onclick="speak('${ttsExpression}'); return false;">🔊</button>`;
	return button;
}

 function renderSamples(rawSamples) {
     var splitSamples = rawSamples.split("<br>");

     var renderedSamples = [];
     splitSamples.forEach(function(sample){
         var currentKanji = "";
         var currentReading = '';
         var currentPlain = '';
         var isReading = false;
         var tokens = []

         for (let i = 0; i < sample.length; i++) {
             var currentChar = sample.charAt(i);
             if (isKanji(currentChar)) {
                 if (currentPlain.length > 0) {
                     tokens.push({
                         expression: currentKanji +currentPlain,
                         reading: false
                     });
                     currentPlain = currentKanji = currentReading = "";
                 }
                 switch(currentChar) 	{
                     case '[': isReading = true;  currentReading = ""; break;
                     case ']':
                         tokens.push({
                             expression: currentKanji,
                             reading: currentReading
                         });
                         currentKanji = currentReading = currentPlain = "";
                         isReading = false;
                         break;
                     default: currentKanji += currentChar;
                 }
             } else {
                 if(isReading){currentReading += currentChar;}
                 else {currentPlain += currentChar;}
             }
         }
         if (currentPlain.length > 0) {
             tokens.push({
                 expression: currentKanji + currentPlain,
                 reading: false
             });
         }

         var render = "";
         var ttsExpression = "";

         tokens.forEach(({expression, reading}) => {
             if (reading != false) {
                 var renderedExpression = "";
                 for (let i = 0; i < expression.length; i++) {
                     var currentKanji = expression.charAt(i);
                     renderedExpression += `<a class="tooltip external-definition-link" href="https://uchisen.com/kanji/${currentKanji}&order=demo">${currentKanji}<span class="tooltiptext">Uchisen.com</span></a>`
                 }
                 render += `<ruby>${renderedExpression}<rt><a class="tooltip external-definition-link" href="https://jisho.org/search/${reading}">${reading}<span class="tooltiptext">Jisho.org</span></a></rt></ruby>`;
             } else {
                 var renderedExpression = "";
                 for (let i = 0; i < expression.length; i++) {
                     var currentKanji = expression.charAt(i);

                     if (isKanji(currentKanji)) {
                         renderedExpression += `<a class="tooltip external-definition-link" href="https://uchisen.com/kanji/${currentKanji}&order=demo">${currentKanji}<span class="tooltiptext">Uchisen.com</span></a>`
                     } else {
                         renderedExpression += currentKanji;
                     }                     
                 }
                 render +=  renderedExpression;
             }
             ttsExpression += expression;
         });

         var ttsButton = generateTTSButtom(ttsExpression);
         renderedSamples.push(`${render}${ttsButton}`);
     });

     var rendered = '';

     renderedSamples.forEach(sample => rendered = rendered.concat(`<li>${sample}</li>`));

     return `<ol>${rendered}</ol>`;
 }
