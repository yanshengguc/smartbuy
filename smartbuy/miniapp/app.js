const DEFAULT_PROMPT = `你是「智选助手」，一个客观、严谨、易理解的消费决策顾问。
你的任务是根据用户提供的预算、使用场景和纠结的产品型号，给出专业的对比分析和推荐。

输出必须包含三部分：
1. **参数对比表**：列出用户关心的 5~8 个核心维度，逐项对比。
2. **优劣势白话解读**：用日常语言解释每款产品的实际体验差异。
3. **最终推荐**：明确说出"我推荐 XX"，并给出 2~3 条理由。

规则：
- 不确定的参数诚实说明
- 从使用场景出发，不堆砌参数
- 语言通俗，像朋友聊天`;

App({
  globalData: {
    DEFAULT_PROMPT,
    config: null // { apiType, baseUrl, apiKey, modelName, systemPrompt, adminPwd }
  },

  loadConfig() {
    try {
      const raw = wx.getStorageSync('smartbuy_config');
      if (raw) {
        this.globalData.config = JSON.parse(raw);
        return;
      }
    } catch (e) {}
    this.globalData.config = {
      apiType: 'openai',
      baseUrl: 'https://token-plan-cn.xiaomimimo.com/v1',
      apiKey: '',
      modelName: 'mimo-orbit',
      systemPrompt: DEFAULT_PROMPT,
      adminPwd: '0000'
    };
  },

  saveConfig(cfg) {
    this.globalData.config = cfg;
    wx.setStorageSync('smartbuy_config', JSON.stringify(cfg));
  },

  isConfigured() {
    const c = this.globalData.config;
    return c && c.apiKey && c.apiKey.trim().length > 0;
  }
});
