// ============ 默认配置 ============
const DEFAULT_SYSTEM_PROMPT = `你是「智选助手」，一个客观、严谨、易理解的消费决策顾问。
你的任务是根据用户提供的预算、使用场景和纠结的产品型号，给出专业的对比分析和推荐。

输出必须包含三部分：
1. **参数对比表**（Markdown 表格）：列出用户关心的 5~8 个核心维度，逐项对比。
2. **优劣势白话解读**：用日常语言解释每款产品的实际体验差异，避免堆砌参数数字。
3. **最终推荐**：明确说出"我推荐 XX"，并给出 2~3 条针对该用户需求的不可替代理由。

规则：
- 如果你不确定某款产品的具体参数，诚实说明"该信息我无法确认，建议你查阅官方参数"。
- 优先从用户的实际使用场景出发，而不是罗列所有参数。
- 语言通俗，像朋友在帮你分析，不要过于学术化。
- 用户给的信息越详细，你的分析越精准。如果信息不足，可以反问用户补充。`;

// ============ 预设 ============
const PRESETS = {
    mimo:     { apiType:'openai',    baseUrl:'https://token-plan-cn.xiaomimimo.com/v1', modelName:'mimo-orbit' },
    openai:   { apiType:'openai',    baseUrl:'https://api.openai.com/v1',              modelName:'gpt-4o' },
    anthropic:{ apiType:'anthropic', baseUrl:'https://api.anthropic.com',             modelName:'claude-sonnet-4-6' },
};

const URL_OPTIONS = {
    openai: [
        'https://token-plan-cn.xiaomimimo.com/v1',
        'https://api.openai.com/v1',
        'https://api.moonshot.cn/v1',
        'https://api.deepseek.com/v1',
        'https://dashscope.aliyuncs.com/compatible-mode/v1',
    ],
    anthropic: ['https://api.anthropic.com'],
};

const MODEL_OPTIONS = {
    openai: [
        'mimo-orbit','mimo-v2.5-pro','gpt-4o','gpt-4-turbo','gpt-4o-mini','gpt-3.5-turbo',
        'deepseek-chat','deepseek-reasoner','moonshot-v1-8k','qwen-plus','qwen-max',
    ],
    anthropic: [
        'claude-sonnet-4-6','claude-opus-4-7','claude-haiku-4-5','claude-3-5-sonnet',
    ],
};

const API_DEFAULTS = {
    openai:    { baseUrl:'https://token-plan-cn.xiaomimimo.com/v1', model:'mimo-orbit' },
    anthropic: { baseUrl:'https://api.anthropic.com',             model:'claude-sonnet-4-6' },
};

function updateDatalists(apiType) {
    const urls = URL_OPTIONS[apiType] || URL_OPTIONS.openai;
    const models = MODEL_OPTIONS[apiType] || MODEL_OPTIONS.openai;
    const urlList = $('#baseUrlList');
    urlList.innerHTML = '';
    urls.forEach(u => { const o = document.createElement('option'); o.value = u; urlList.appendChild(o); });
    const modelList = $('#modelNameList');
    modelList.innerHTML = '';
    models.forEach(m => { const o = document.createElement('option'); o.value = m; modelList.appendChild(o); });
}

// ============ 设置管理 ============
function loadSettings() {
    const defaults = {
        apiType:'openai',
        baseUrl:'https://token-plan-cn.xiaomimimo.com/v1',
        apiKey:'',
        modelName:'mimo-orbit',
        systemPrompt: DEFAULT_SYSTEM_PROMPT,
        adminPwd:'0000',
    };
    try { return { ...defaults, ...JSON.parse(localStorage.getItem('smartbuy_settings')||'{}') }; }
    catch { return defaults; }
}
function saveSettings(s) { localStorage.setItem('smartbuy_settings', JSON.stringify(s)); }

function isConfigured() {
    const s = loadSettings();
    return s.apiKey.trim().length > 0;
}

// ============ DOM 引用 ============
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

const chatArea = $('#chatArea');
const messagesEl = $('#messages');
const welcomeMsg = $('#welcomeMsg');
const guideMsg = $('#guideMsg');
const guideAdminBtn = $('#guideAdminBtn');
const inputArea = $('#inputArea');
const userInput = $('#userInput');
const sendBtn = $('#sendBtn');
const imageInput = $('#imageInput');
const uploadBtn = $('#uploadBtn');
const imagePreview = $('#imagePreview');
const previewImg = $('#previewImg');
const removeImageBtn = $('#removeImage');
const toastEl = $('#toast');
const titleEl = $('#title');

// Admin modal
const pwdOverlay = $('#pwdOverlay');
const pwdInput = $('#pwdInput');
const adminOverlay = $('#adminOverlay');
const shareLink = $('#shareLink');
const copyLinkBtn = $('#copyLink');

// ============ 状态 ============
let conversation = [];
let isStreaming = false;
let pendingImage = null;
let clickCount = 0;
let clickTimer = null;

// ============ Toast ============
let toastTimer;
function showToast(msg) {
    clearTimeout(toastTimer);
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2000);
}

// ============ 初始化用户端 UI ============
function updateUI() {
    if (isConfigured()) {
        guideMsg.classList.remove('show');
        guideMsg.style.display = 'none';
        welcomeMsg.style.display = '';
        inputArea.style.display = '';
        userInput.disabled = false;
        sendBtn.disabled = true;
    } else {
        guideMsg.classList.add('show');
        guideMsg.style.display = 'block';
        welcomeMsg.style.display = 'none';
        inputArea.style.display = 'none';
    }
}

// ============ 标题点击（5 次进管理端） ============
titleEl.addEventListener('click', () => {
    clickCount++;
    clearTimeout(clickTimer);
    clickTimer = setTimeout(() => { clickCount = 0; }, 2500);
    if (clickCount >= 5) {
        clickCount = 0;
        clearTimeout(clickTimer);
        openPwdModal();
    }
});

// ============ 密码弹窗 ============
function openPwdModal() {
    pwdInput.value = '';
    pwdOverlay.classList.add('show');
    pwdInput.focus();
}

function closePwdModal() {
    pwdOverlay.classList.remove('show');
}

$('#pwdCancel').addEventListener('click', closePwdModal);
pwdOverlay.addEventListener('click', e => { if (e.target === pwdOverlay) closePwdModal(); });

$('#pwdConfirm').addEventListener('click', () => {
    const settings = loadSettings();
    if (pwdInput.value === settings.adminPwd) {
        closePwdModal();
        openAdminModal();
    } else {
        showToast('密码错误');
        pwdInput.value = '';
        pwdInput.focus();
    }
});
pwdInput.addEventListener('keydown', e => { if (e.key==='Enter') $('#pwdConfirm').click(); });

// 未配置时引导页按钮
guideAdminBtn.addEventListener('click', () => openPwdModal());

// ============ 管理端弹窗 ============
function openAdminModal() {
    const s = loadSettings();
    $('#apiType').value = s.apiType;
    $('#baseUrl').value = s.baseUrl;
    $('#apiKey').value = s.apiKey;
    $('#modelName').value = s.modelName;
    $('#systemPrompt').value = s.systemPrompt;
    $('#adminPwd').value = s.adminPwd || '0000';
    updateDatalists(s.apiType);
    adminOverlay.classList.add('show');
}

function closeAdminModal() {
    adminOverlay.classList.remove('show');
    updateUI();
}

$('#apiType').addEventListener('change', () => {
    const type = $('#apiType').value;
    updateDatalists(type);
    const def = API_DEFAULTS[type];
    if (def) { $('#baseUrl').value = def.baseUrl; $('#modelName').value = def.model; }
});

$$('#adminOverlay .btn-preset').forEach(btn => {
    btn.addEventListener('click', () => {
        const p = PRESETS[btn.dataset.preset];
        if (!p) return;
        $('#apiType').value = p.apiType;
        $('#baseUrl').value = p.baseUrl;
        $('#modelName').value = p.modelName;
        updateDatalists(p.apiType);
    });
});

$('#adminReset').addEventListener('click', () => {
    const def = {
        apiType:'openai', baseUrl:'https://token-plan-cn.xiaomimimo.com/v1', apiKey:'',
        modelName:'mimo-orbit', systemPrompt: DEFAULT_SYSTEM_PROMPT, adminPwd:'0000',
    };
    $('#apiType').value = def.apiType;
    $('#baseUrl').value = def.baseUrl;
    $('#apiKey').value = def.apiKey;
    $('#modelName').value = def.modelName;
    $('#systemPrompt').value = def.systemPrompt;
    $('#adminPwd').value = def.adminPwd;
    updateDatalists(def.apiType);
    saveSettings(def);
    showToast('已恢复默认，密码 0000');
});

$('#adminLogout').addEventListener('click', () => {
    if (confirm('确定要退出管理端吗？未保存的修改将丢失。')) {
        closeAdminModal();
    }
});

// ============ 分享链接 ============
function generateShareLink() {
    const s = loadSettings();
    const config = {
        t: s.apiType,
        u: s.baseUrl,
        k: s.apiKey,
        m: s.modelName,
        p: s.systemPrompt,
    };
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(config))));
    const url = new URL(window.location.href);
    url.hash = encoded;
    url.search = '';
    return url.toString();
}

$('#adminSave').addEventListener('click', () => {
    // ... existing save logic
    const newPwd = $('#adminPwd').value.trim();
    if (newPwd.length < 4) { showToast('管理密码至少 4 位'); return; }
    const s = {
        apiType:    $('#apiType').value,
        baseUrl:    $('#baseUrl').value.trim().replace(/\/+$/, ''),
        apiKey:     $('#apiKey').value.trim(),
        modelName:  $('#modelName').value.trim(),
        systemPrompt: $('#systemPrompt').value,
        adminPwd:   newPwd,
    };
    saveSettings(s);
    closeAdminModal();
    showToast('设置已保存');
    // Auto-generate share link
    shareLink.value = generateShareLink();
});

copyLinkBtn.addEventListener('click', () => {
    const link = shareLink.value || generateShareLink();
    shareLink.value = link;
    navigator.clipboard.writeText(link).then(() => {
        showToast('链接已复制，发送给用户即可');
    }).catch(() => {
        shareLink.select();
        showToast('请手动复制链接');
    });
});

// 打开管理端时自动生成分享链接
const origOpenAdmin = openAdminModal;
openAdminModal = function() {
    origOpenAdmin();
    const s = loadSettings();
    if (s.apiKey) shareLink.value = generateShareLink();
};

// ============ 从分享链接加载配置 ============
function loadFromHash() {
    const hash = window.location.hash.slice(1);
    if (!hash) return false;
    try {
        const config = JSON.parse(decodeURIComponent(escape(atob(hash))));
        if (!config.k) return false;
        const s = {
            apiType: config.t || 'openai',
            baseUrl: config.u || 'https://token-plan-cn.xiaomimimo.com/v1',
            apiKey: config.k,
            modelName: config.m || 'mimo-orbit',
            systemPrompt: config.p || DEFAULT_SYSTEM_PROMPT,
            adminPwd: '0000',
        };
        saveSettings(s);
        // 清除 URL 中的 hash，防止泄露 API Key
        history.replaceState(null, '', window.location.pathname);
        return true;
    } catch { return false; }
}

// ============ 聊天 ============
function addMessage(role, content, image) {
    const msg = { role, content };
    if (image) msg.image = image;
    conversation.push(msg);
    renderMessage(role, content, image);
    scrollToBottom();
}

function renderMessage(role, content, image) {
    welcomeMsg.style.display = 'none';
    guideMsg.style.display = 'none';

    const div = document.createElement('div');
    div.className = `message ${role}`;

    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = role === 'user' ? '我' : 'AI';

    const bubble = document.createElement('div');
    bubble.className = 'bubble';

    if (role === 'user' && image) {
        bubble.innerHTML = `<img src="data:${image.mimeType};base64,${image.base64}" alt="">${escapeHtml(content)}`;
    } else if (role === 'assistant') {
        bubble.innerHTML = parseMarkdown(content);
    } else {
        bubble.textContent = content;
    }

    div.appendChild(avatar);
    div.appendChild(bubble);
    messagesEl.appendChild(div);
    scrollToBottom();
}

function addLoadingMessage() {
    welcomeMsg.style.display = 'none';
    guideMsg.style.display = 'none';
    const div = document.createElement('div');
    div.className = 'message assistant';
    div.id = 'loadingMsg';
    div.innerHTML = `<div class="avatar" style="background:#fff;border:1px solid var(--border);">AI</div>
        <div class="bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div>`;
    messagesEl.appendChild(div);
    scrollToBottom();
}

function removeLoadingMessage() {
    const el = document.getElementById('loadingMsg');
    if (el) el.remove();
}

function scrollToBottom() {
    chatArea.scrollTop = chatArea.scrollHeight;
}

// ============ Markdown ============
function parseMarkdown(md) {
    if (!md) return '';
    let html = md;

    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
        `<pre><code>${escapeHtml(code.trim())}</code></pre>`);
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    html = html.replace(/(\|[^\n]+\|\n\|[-| :]+\|\n((?:\|[^\n]+\|\n?)*))/g, match => {
        const lines = match.trim().split('\n');
        if (lines.length < 2) return match;
        const headers = lines[0].split('|').filter(c => c.trim());
        let t = '<table><thead><tr>';
        headers.forEach(h => { t += `<th>${h.trim()}</th>`; });
        t += '</tr></thead><tbody>';
        lines.slice(2).forEach(line => {
            const cells = line.split('|').filter(c => c.trim());
            t += '<tr>';
            cells.forEach(c => { t += `<td>${c.trim()}</td>`; });
            t += '</tr>';
        });
        t += '</tbody></table>';
        return t;
    });

    html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/^[\-\*] (.+)$/gm, '<li>$1</li>');
    html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
    html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
    html = html.replace(/^---$/gm, '<hr>');
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');
    html = '<p>' + html + '</p>';
    html = html.replace(/<p>\s*<\/p>/g, '');
    html = html.replace(/<p>(<ul>)/g, '$1').replace(/(<\/ul>)<\/p>/g, '$1');
    html = html.replace(/<p>(<table>)/g, '$1').replace(/(<\/table>)<\/p>/g, '$1');
    html = html.replace(/<p>(<blockquote>)/g, '$1').replace(/(<\/blockquote>)<\/p>/g, '$1');
    html = html.replace(/<p>(<pre>)/g, '$1').replace(/(<\/pre>)<\/p>/g, '$1');
    return html;
}

function escapeHtml(str) {
    const map = {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'};
    return str.replace(/[&<>"]/g, c => map[c]);
}

// ============ API 调用 ============
function buildVisionMessage(text, image, apiType) {
    if (apiType === 'anthropic') {
        return { role:'user', content: [
            { type:'image', source:{ type:'base64', media_type:image.mimeType, data:image.base64 }},
            { type:'text', text: text||'请分析这张图片' },
        ]};
    }
    return { role:'user', content: [
        { type:'image_url', image_url:{ url:`data:${image.mimeType};base64,${image.base64}` }},
        { type:'text', text: text||'请分析这张图片' },
    ]};
}

async function callAPI(userMessage, image) {
    const s = loadSettings();
    if (!s.apiKey) throw new Error('未设置 API Key，请联系管理员配置');

    const buildMessages = (withImage) => {
        const lastMsg = (withImage && image)
            ? buildVisionMessage(userMessage, image, s.apiType)
            : { role:'user', content: (image && !withImage)
                ? `[用户上传了一张图片，但当前模型不支持图片识别]\n${userMessage}`
                : userMessage };
        return [
            { role:'system', content: s.systemPrompt },
            ...conversation.slice(0,-1).map(m =>
                (m.image && withImage) ? buildVisionMessage(m.content, m.image, s.apiType) : { role:m.role, content:m.content }
            ),
            lastMsg,
        ];
    };

    const doCall = async (messages) => {
        if (s.apiType === 'anthropic') return callAnthropicAPI(s, messages);
        return callOpenAIAPI(s, messages);
    };

    // 如果没有图片，直接调用
    if (!image) return doCall(buildMessages(false));

    // 有图片：先尝试带图片的请求，失败则降级为纯文本
    try {
        return await doCall(buildMessages(true));
    } catch (err) {
        if (err.message.includes('image_url') || err.message.includes('unknown variant')) {
            return await doCall(buildMessages(false));
        }
        throw err;
    }
}

function parseApiError(status, body) {
    try {
        const j = JSON.parse(body);
        const msg = j.error?.message || j.message || body;
        if (status === 401 || status === 403) return 'API Key 无效或已过期，请检查设置';
        if (status === 429) return '请求太频繁，请稍后再试';
        if (status >= 500) return '服务器繁忙，请稍后重试';
        return `请求失败：${msg}`;
    } catch { return `请求失败（${status}）`; }
}

async function callOpenAIAPI(s, messages) {
    const resp = await fetch(`${s.baseUrl}/chat/completions`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${s.apiKey}` },
        body: JSON.stringify({ model:s.modelName, messages, temperature:0.7, max_tokens:4096 }),
    });
    if (!resp.ok) throw new Error(parseApiError(resp.status, await resp.text()));
    const data = await resp.json();
    return data.choices[0].message.content;
}

async function callAnthropicAPI(s, messages) {
    const systemMsg = messages.find(m => m.role==='system');
    const chatMessages = messages.filter(m => m.role!=='system');
    const body = { model:s.modelName, max_tokens:4096, messages:chatMessages };
    if (systemMsg) body.system = systemMsg.content;
    const resp = await fetch(`${s.baseUrl}/v1/messages`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'x-api-key':s.apiKey, 'anthropic-version':'2023-06-01' },
        body: JSON.stringify(body),
    });
    if (!resp.ok) throw new Error(parseApiError(resp.status, await resp.text()));
    const data = await resp.json();
    return data.content[0].text;
}

// ============ 发送 ============
async function sendMessage() {
    if (isStreaming) return;
    const text = userInput.value.trim();
    const hasImage = pendingImage !== null;
    if (!text && !hasImage) return;
    if (!isConfigured()) { showToast('请先由管理员配置 API'); return; }

    addMessage('user', text, pendingImage);
    const sentImage = pendingImage;
    userInput.value = '';
    userInput.style.height = 'auto';
    pendingImage = null;
    previewImg.src = '';
    imagePreview.classList.remove('show');
    sendBtn.disabled = true;
    isStreaming = true;
    addLoadingMessage();

    try {
        const reply = await callAPI(text, sentImage);
        removeLoadingMessage();
        addMessage('assistant', reply);
    } catch (err) {
        removeLoadingMessage();
        const msg = err.message || '未知错误';
        addMessage('assistant', `抱歉，回答问题时遇到了问题：${msg}`);
    } finally {
        isStreaming = false;
        userInput.focus();
    }
}

// ============ 图片上传 ============
uploadBtn.addEventListener('click', () => imageInput.click());
imageInput.addEventListener('change', () => {
    const file = imageInput.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('请选择图片文件'); imageInput.value=''; return; }
    const reader = new FileReader();
    reader.onload = () => {
        pendingImage = { base64: reader.result.split(',')[1], mimeType: file.type };
        previewImg.src = reader.result;
        imagePreview.classList.add('show');
    };
    reader.readAsDataURL(file);
    imageInput.value = '';
});
removeImageBtn.addEventListener('click', () => {
    pendingImage = null;
    previewImg.src = '';
    imagePreview.classList.remove('show');
});

// ============ 事件 ============
sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keydown', e => {
    if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});
userInput.addEventListener('input', () => {
    sendBtn.disabled = userInput.value.trim().length === 0;
    userInput.style.height = 'auto';
    userInput.style.height = Math.min(userInput.scrollHeight, 120) + 'px';
});

$$('.example-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        userInput.value = btn.textContent;
        userInput.style.height = 'auto';
        userInput.style.height = Math.min(userInput.scrollHeight, 120) + 'px';
        sendBtn.disabled = false;
        userInput.focus();
    });
});

// ============ 初始化 ============
if (loadFromHash()) {
    showToast('配置已自动导入，开始使用吧');
}
updateUI();
