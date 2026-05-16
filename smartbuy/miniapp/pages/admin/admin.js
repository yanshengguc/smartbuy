const app = getApp();

const PRESETS = {
  mimo:     { apiType: 0, baseUrl: 'https://token-plan-cn.xiaomimimo.com/v1', modelName: 'mimo-orbit' },
  openai:   { apiType: 0, baseUrl: 'https://api.openai.com/v1',              modelName: 'gpt-4o' },
  deepseek: { apiType: 0, baseUrl: 'https://api.deepseek.com/v1',            modelName: 'deepseek-chat' },
};

Page({
  data: {
    verified: false,
    pwdInput: '',
    apiTypes: ['OpenAI 兼容', 'Anthropic 兼容'],
    apiTypeIndex: 0,
    config: {
      apiType: 'openai',
      baseUrl: 'https://token-plan-cn.xiaomimimo.com/v1',
      apiKey: '',
      modelName: 'mimo-orbit',
      systemPrompt: '',
      adminPwd: '0000'
    }
  },

  onLoad() {
    app.loadConfig();
    const cfg = app.globalData.config;
    this.setData({
      config: { ...cfg },
      apiTypeIndex: cfg.apiType === 'anthropic' ? 1 : 0
    });
  },

  onPwdInput(e) {
    this.setData({ pwdInput: e.detail.value });
  },

  verifyPwd() {
    if (this.data.pwdInput === this.data.config.adminPwd) {
      this.setData({ verified: true, pwdInput: '' });
    } else {
      wx.showToast({ title: '密码错误', icon: 'none' });
    }
  },

  goBack() {
    wx.navigateBack();
  },

  onApiTypeChange(e) {
    const idx = parseInt(e.detail.value);
    this.setData({
      apiTypeIndex: idx,
      'config.apiType': idx === 1 ? 'anthropic' : 'openai'
    });
  },

  onFieldChange(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`config.${field}`]: e.detail.value });
  },

  applyPreset(e) {
    const preset = PRESETS[e.currentTarget.dataset.preset];
    if (!preset) return;
    this.setData({
      apiTypeIndex: preset.apiType,
      'config.apiType': preset.apiType === 1 ? 'anthropic' : 'openai',
      'config.baseUrl': preset.baseUrl,
      'config.modelName': preset.modelName
    });
  },

  saveConfig() {
    const cfg = this.data.config;
    if (!cfg.adminPwd || cfg.adminPwd.length < 4) {
      wx.showToast({ title: '管理密码至少4位', icon: 'none' });
      return;
    }
    app.saveConfig(cfg);
    wx.showToast({ title: '保存成功', icon: 'success' });
    setTimeout(() => wx.navigateBack(), 800);
  },

  resetConfig() {
    const def = {
      apiType: 'openai',
      baseUrl: 'https://token-plan-cn.xiaomimimo.com/v1',
      apiKey: '',
      modelName: 'mimo-orbit',
      systemPrompt: app.globalData.DEFAULT_PROMPT,
      adminPwd: '0000'
    };
    this.setData({ config: def, apiTypeIndex: 0 });
    app.saveConfig(def);
    wx.showToast({ title: '已恢复默认', icon: 'none' });
  }
});
