function randomKey(len = 32) {
    const array = new Uint8Array(len);
    window.crypto.getRandomValues(array);
    return Array.from(array).map(b => ('0' + b.toString(16)).slice(-2)).join('');
}
const SESSION_KEY = randomKey();

// https://observablehq.com/@spencermountain/compromise-tags
const ALL_POS_TYPES = [
    'AtMention',
    'Date',
    'Demonym',
    'Email',
    'HashTag',
    'Organization',
    'Person',
    'PhoneNumber',
    'Place',
    'Url',
    'Value'
];

let enabledPOS = new Set(ALL_POS_TYPES);
let customWords = []; // Array of lowercase strings

function isSensitive(termObj) {
    const t = termObj.terms[0];
    const word = t.text;
    const tags = t.tags || [];
    const cleanWord = word.trim().toLowerCase();

    if (!cleanWord) return false;

    // Check custom dictionary
    if (customWords.includes(cleanWord)) return true;

    // Check NLP tags (English context)
    if (tags.some(tag => enabledPOS.has(tag))) return true;

    // Check French (Word-level)
    if (window.nlpFr) {
        const frDoc = window.nlpFr(word);
        const frJson = frDoc.json()[0];
        if (frJson && frJson.terms[0]) {
            if (frJson.terms[0].tags.some(tag => enabledPOS.has(tag))) return true;
        }
    }

    // Check German (Word-level)
    if (window.nlpDe) {
        const deDoc = window.nlpDe(word);
        const deJson = deDoc.json()[0];
        if (deJson && deJson.terms[0]) {
            if (deJson.terms[0].tags.some(tag => enabledPOS.has(tag))) return true;
        }
    }

    return false;
}

function encryptText(text) {
    if (!text) return '';
    const doc = nlp(text);
    const arr = doc.terms().data();

    return arr.map(termObj => {
        const t = termObj.terms[0];
        const word = t.text;

        // Handle Prefix (whitespace/punctuation)
        let chunk = (typeof t.pre === 'string' ? t.pre : '');

        if (isSensitive(termObj)) {
            // Encrypt
            const cipher = CryptoJS.AES.encrypt(word, SESSION_KEY).toString();
            chunk += `[ENC]${cipher}`;
        } else {
            chunk += word;
        }

        // Handle Suffix
        chunk += (typeof t.post === 'string' ? t.post : '');
        return chunk;
    }).join('');
}

function decryptText(text) {
    if (!text) return '';
    // Regex to find [ENC]...
    return text.replace(/\[ENC\]([A-Za-z0-9+/=]+)/g, (match, p1) => {
        try {
            const bytes = CryptoJS.AES.decrypt(p1, SESSION_KEY);
            const original = bytes.toString(CryptoJS.enc.Utf8);
            return original || match;
        } catch (e) {
            return match;
        }
    });
}

function generateHighlightHTML(text) {
    if (!text) return '<br/>';
    const doc = nlp(text);
    const arr = doc.terms().data();

    let html = '';
    arr.forEach(termObj => {
        const t = termObj.terms[0];
        const word = t.text;
        const pre = t.pre || '';
        const post = t.post || '';

        const esc = str => str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

        html += esc(pre);

        if (isSensitive(termObj)) {
            html += `<span class="highlight-word">${esc(word)}</span>`;
        } else {
            html += esc(word);
        }

        html += esc(post);
    });

    // Sync newlines for scroll/height match
    html = html.replace(/\n/g, '<br/>');
    if (text.endsWith('\n')) html += '<br/>';

    return html;
}

/**
 * UI & DOM
 */
document.addEventListener('DOMContentLoaded', () => {
    const els = {
        customInput: document.getElementById('custom-add-input'),
        addBtn: document.getElementById('custom-add-btn'),
        clearBtn: document.getElementById('clear-custom-btn'),
        selBtn: document.getElementById('add-selection-btn'),

        chipsDiv: document.getElementById('custom-list'),
        posDiv: document.getElementById('pos-list'),

        // Encrypt Mode
        plain1: document.getElementById('in-plain-1'),
        hl1: document.getElementById('hl-layer-1'),
        enc1: document.getElementById('out-enc-1'),
        copyEnc1: document.getElementById('copy-enc-1'),

        // Decrypt Mode
        enc2: document.getElementById('in-enc-2'),
        plain2: document.getElementById('out-plain-2'),
        copyPlain2: document.getElementById('copy-plain-2')
    };

    function renderPOS() {
        els.posDiv.innerHTML = '';
        ALL_POS_TYPES.forEach(type => {
            const el = document.createElement('div');
            el.className = `pos-chip ${enabledPOS.has(type) ? 'active' : ''}`;
            el.textContent = type;
            el.addEventListener('click', () => {
                if (enabledPOS.has(type)) enabledPOS.delete(type);
                else enabledPOS.add(type);
                renderPOS();
                updateEncryptionUI();
            });
            els.posDiv.appendChild(el);
        });
    }

    function renderChips() {
        els.chipsDiv.innerHTML = '';
        if (customWords.length === 0) {
            els.chipsDiv.innerHTML = '<span class="empty-state">No custom words added yet.</span>';
            return;
        }

        customWords.forEach((w, idx) => {
            const chip = document.createElement('div');
            chip.className = 'chip';
            chip.innerHTML = `
        <span>${w}</span>
        <span class="chip-remove" data-idx="${idx}">&times;</span>
      `;
            chip.querySelector('.chip-remove').addEventListener('click', () => {
                customWords.splice(idx, 1);
                renderChips();
                updateEncryptionUI();
            });
            els.chipsDiv.appendChild(chip);
        });
    }

    function addCustomWord(val) {
        const w = val.trim().toLowerCase();
        if (w && !customWords.includes(w)) {
            customWords.push(w);
            renderChips();
            updateEncryptionUI();
        }
        els.customInput.value = '';
    }

    els.addBtn.addEventListener('click', () => addCustomWord(els.customInput.value));
    els.customInput.addEventListener('keydown', e => { if (e.key === 'Enter') els.addBtn.click(); });

    els.clearBtn.addEventListener('click', () => {
        if (confirm('Clear all custom words?')) {
            customWords = [];
            renderChips();
            updateEncryptionUI();
        }
    });

    els.selBtn.addEventListener('click', () => {
        // Check active textareas
        const targets = [els.plain1, els.enc1, els.enc2, els.plain2];
        for (let box of targets) {
            if (box.selectionStart !== box.selectionEnd) {
                const text = box.value.substring(box.selectionStart, box.selectionEnd);
                addCustomWord(text);
                break;
            }
        }
    });

    function updateEncryptionUI() {
        const text = els.plain1.value;
        els.hl1.innerHTML = generateHighlightHTML(text);
        els.enc1.value = encryptText(text);
        syncScroll();
    }

    function syncScroll() {
        els.hl1.scrollTop = els.plain1.scrollTop;
        els.hl1.scrollLeft = els.plain1.scrollLeft;
    }

    els.plain1.addEventListener('input', updateEncryptionUI);
    els.plain1.addEventListener('scroll', syncScroll);
    window.addEventListener('resize', updateEncryptionUI);

    els.enc2.addEventListener('input', () => {
        els.plain2.value = decryptText(els.enc2.value);
    });

    function setupCopy(btn, target) {
        btn.addEventListener('click', () => {
            if (!target.value) return;
            navigator.clipboard.writeText(target.value).then(() => {
                const orig = btn.innerText;
                btn.innerText = 'Copied!';
                btn.classList.add('copied');
                setTimeout(() => {
                    btn.innerText = orig;
                    btn.classList.remove('copied');
                }, 1500);
            });
        });
    }
    setupCopy(els.copyEnc1, els.enc1);
    setupCopy(els.copyPlain2, els.plain2);

    // Initial Render
    renderPOS();
    renderChips();
    updateEncryptionUI();
});
