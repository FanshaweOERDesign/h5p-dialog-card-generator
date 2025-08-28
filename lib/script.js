(async () => {

    const zip = new JSZip();
    const templateData = await fetch('./lib/template.zip').then(response => response.arrayBuffer());
    await zip.loadAsync(templateData);

    const contentJsonStr = await zip.file("content/content.json").async("string");
    const contentObj = JSON.parse(contentJsonStr);

    function clientSideLimits(input, maxLength = 1000) {
        return input
            .slice(0, maxLength)
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''); // Remove problematic chars
    }

    function extractKeyTermPairs(input) {
        let plainText;

        // Try to detect HTML by checking for tags
        if (typeof input === 'string' && /<\/?[a-z][\s\S]*>/i.test(input)) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(input, 'text/html');
            plainText = doc.body.innerText;
        } else {
            plainText = input;
        }

        // Normalize and split into lines
        const lines = plainText
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);

        // Pair up: term -> definition
        const pairs = [];
        for (let i = 0; i < lines.length - 1; i += 2) {
            pairs.push({
                term: lines[i],
                definition: lines[i + 1]
            });
        }

        return pairs;
    }

    async function processKeyTerms(keyTerms) {

        const keyTermPairs = extractKeyTermPairs(keyTerms);
        const dialogs = keyTermPairs.map(pair => {
            return {
                text: "<p style=\"text-align:center;\">" + pair.term + "</p>",
                answer: "<p style=\"text-align:center;\">" + pair.definition + "</p>",
                tips: {}
            };
        });
        contentObj.dialogs = dialogs;
        zip.file("content/content.json", JSON.stringify(contentObj, null, 2));

        for (const [path, entry] of Object.entries(zip.files)) {
            if (entry.dir) {
                delete zip.files[path];
            }
        }

        const blob = await zip.generateAsync({ type: "blob" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "dialog-cards.h5p";
        a.click();
    }

    document.getElementById('generate-btn').addEventListener('click', async () => {
        const keyTerms = clientSideLimits(document.getElementById('flashcard-input').value, 20000);
        if (keyTerms.trim() === '') {
            alert('Please enter some key terms.');
            return;
        }
        await processKeyTerms(keyTerms);
    });

    const flashcardInput = document.getElementById('flashcard-input');
    flashcardInput.addEventListener('focus', (e) => {
        //select all text when the input is focused
        e.target.select();
    }
    );

    flashcardInput.placeholder = "Enter key terms and definitions, one per line.\n\nExample:\n\nTerm 1\nDefinition 1\n\nTerm 2\nDefinition 2";

})();