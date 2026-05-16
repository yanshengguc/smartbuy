const app = getApp();
let titleTapCount = 0;
let titleTapTimer = null;

Page({
  data: {
    configured: false,
    messages: [],
    loading: false,
    inputText: '',
    previewImage: '',
    scrollTo: '',
    pendingImage: null // { base64, tempPath }
  },

  onLoad() {
    app.loadConfig();
    this.setData({ configured: app.isConfigured() });
  },

  onShow() {
    app.loadConfig();
    this.setData({ configured: app.isConfigured() });
  },

  // 标题点击 5 次进管理端
  onTitleTap() {
    titleTapCount++;
    clearTimeout(titleTapTimer);
    titleTapTimer = setTimeout(() => { titleTapCount = 0; }, 2500);
    if (titleTapCount >= 5) {
      titleTapCount = 0;
      clearTimeout(titleTapTimer);
      this.goAdmin();
    }
  },

  goAdmin() {
    wx.navigateTo({ url: '/pages/admin/admin' });
  },

  onInput(e) {
    this.setData({ inputText: e.detail.value });
  },

  // 图片选择
  chooseImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempPath = res.tempFilePaths[0];
        // 转 base64
        wx.getFileSystemManager().readFile({
          filePath: tempPath,
          encoding: 'base64',
          success: (r) => {
            this.setData({
              previewImage: tempPath,
              pendingImage: { base64: r.data, tempPath }
            });
          }
        });
      }
    });
  },

  removeImage() {
    this.setData({ previewImage: '', pendingImage: null });
  },

  // 示例按钮
  useExample(e) {
    this.setData({ inputText: e.currentTarget.dataset.text });
  },

  // 发送消息
  async send() {
    const text = this.data.inputText.trim();
    const image = this.data.pendingImage;
    if (!text && !image) return;
    if (!app.isConfigured()) {
      wx.showToast({ title: '请先配置 API', icon: 'none' });
      return;
    }

    const msgId = Date.now();
    const newMsg = {
      id: msgId,
      role: 'user',
      content: text,
      image: image ? image.tempPath : null
    };

    const messages = [...this.data.messages, newMsg];
    this.setData({
      messages,
      inputText: '',
      previewImage: '',
      pendingImage: null,
      loading: true,
      scrollTo: `msg-${msgId}`
    });

    try {
      const reply = await this.callAPI(text, image, messages);
      const replyId = Date.now();
      this.setData({
        messages: [...this.data.messages, {
          id: replyId,
          role: 'assistant',
          content: reply,
          htmlContent: this.markdownToHTML(reply)
        }],
        loading: false,
        scrollTo: `msg-${replyId}`
      });
    } catch (err) {
      this.setData({ loading: false });
      wx.showToast({ title: err.message || '请求失败', icon: 'none' });
    }
  },

  // ====== API 调用 ======
  async callAPI(text, image, history) {
    const cfg = app.globalData.config;

    const buildVisionMsg = (content, img) => ({
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${img.base64}` } },
        { type: 'text', text: content || '请分析这张图片' }
      ]
    });

    let lastMsg;
    if (image) {
      lastMsg = buildVisionMsg(text, image);
    } else {
      lastMsg = { role: 'user', content: text };
    }

    const apiMessages = [
      { role: 'system', content: cfg.systemPrompt },
      ...history.slice(0, -1).map(m => ({ role: m.role, content: m.content })),
      lastMsg
    ];

    // 有图片时先尝试，失败降级
    const doRequest = async (msgs) => {
      return new Promise((resolve, reject) => {
        wx.request({
          url: `${cfg.baseUrl}/chat/completions`,
          method: 'POST',
          header: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${cfg.apiKey}`
          },
          data: {
            model: cfg.modelName,
            messages: msgs,
            temperature: 0.7,
            max_tokens: 4096
          },
          success: (res) => {
            if (res.statusCode === 200) {
              resolve(res.data.choices[0].message.content);
            } else {
              reject(new Error(this.parseError(res.statusCode, res.data)));
            }
          },
          fail: (err) => reject(new Error('网络请求失败：' + err.errMsg))
        });
      });
    };

    if (image) {
      try {
        return await doRequest(apiMessages);
      } catch (err) {
        if (err.message.includes('image_url') || err.message.includes('unknown variant')) {
          lastMsg = { role: 'user', content: `[用户上传了图片]\n${text}` };
          const fallback = [
            { role: 'system', content: cfg.systemPrompt },
            ...history.slice(0, -1).map(m => ({ role: m.role, content: m.content })),
            lastMsg
          ];
          return await doRequest(fallback);
        }
        throw err;
      }
    }

    return await doRequest(apiMessages);
  },

  parseError(status, data) {
    if (status === 401 || status === 403) return 'API Key 无效';
    if (status === 429) return '请求太频繁，稍后重试';
    if (status >= 500) return '服务器繁忙';
    const msg = (data && data.error && data.error.message) || (data && data.message) || String(status);
    return msg;
  },

  // ====== Markdown → HTML（rich-text 用） ======
  markdownToHTML(md) {
    if (!md) return '';
    let html = md
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // 代码块
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g,
      '<pre style="background:#2d2d2d;color:#f8f8f2;padding:8px;border-radius:6px;font-size:12px;overflow-x:auto;"><code>$2</code></pre>');
    html = html.replace(/`([^`]+)`/g,
      '<code style="background:#f0f0f0;padding:1px 4px;border-radius:3px;font-size:12px;">$1</code>');

    // 表格
    html = html.replace(/(\|[^\n]+\|\n\|[-| :]+\|\n((?:\|[^\n]+\|\n?)*))/g, (m) => {
      const lines = m.trim().split('\n');
      if (lines.length < 2) return m;
      const headers = lines[0].split('|').filter(c => c.trim());
      let t = '<table style="width:100%;border-collapse:collapse;margin:8px 0;font-size:12px;">';
      t += '<tr>';
      headers.forEach(h => {
        t += `<th style="border:1px solid #ddd;padding:4px 6px;background:#fff0e5;">${h.trim()}</th>`;
      });
      t += '</tr>';
      lines.slice(2).forEach(line => {
        const cells = line.split('|').filter(c => c.trim());
        t += '<tr>';
        cells.forEach(c => {
          t += `<td style="border:1px solid #ddd;padding:4px 6px;">${c.trim()}</td>`;
        });
        t += '</tr>';
      });
      t += '</table>';
      return t;
    });

    // 标题
    html = html.replace(/^### (.+)$/gm,
      '<h3 style="font-size:15px;margin:8px 0 4px;">$1</h3>');
    html = html.replace(/^## (.+)$/gm,
      '<h2 style="font-size:17px;margin:10px 0 6px;">$1</h2>');

    // 粗体
    html = html.replace(/\*\*(.+?)\*\*/g,
      '<strong style="color:#ff6900;">$1</strong>');

    // 列表
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/((?:<li>.*<\/li>\n?)+)/g,
      '<ul style="margin:4px 0;padding-left:18px;">$1</ul>');

    // 引用
    html = html.replace(/^> (.+)$/gm,
      '<blockquote style="border-left:3px solid #ff6900;padding:4px 8px;margin:4px 0;background:#fff0e5;border-radius:0 4px 4px 0;color:#666;">$1</blockquote>');

    // 分割线
    html = html.replace(/^---$/gm, '<hr style="border:none;border-top:1px solid #eee;margin:8px 0;">');

    // 换行
    html = html.replace(/\n\n/g, '<br><br>');
    html = html.replace(/\n/g, '<br>');

    return html;
  }
});
