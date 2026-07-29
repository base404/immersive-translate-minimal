// Antigravity Translate - Popup Script

document.addEventListener('DOMContentLoaded', () => {
  // 获取 UI 元素
  const toggle = document.getElementById('translation-toggle');
  const sourceLangSelect = document.getElementById('source-lang-select');
  const targetLangSelect = document.getElementById('target-lang-select');
  const engineSelect = document.getElementById('engine-select');
  
  const baiduConfig = document.getElementById('baidu-config');
  const baiduAppId = document.getElementById('baidu-appid');
  const baiduKey = document.getElementById('baidu-key');
  
  const deepseekConfig = document.getElementById('deepseek-config');
  const deepseekKey = document.getElementById('deepseek-key');
  const deepseekHost = document.getElementById('deepseek-host');
  const deepseekModel = document.getElementById('deepseek-model');
  
  const geminiConfig = document.getElementById('gemini-config');
  const geminiKey = document.getElementById('gemini-key');
  const geminiHost = document.getElementById('gemini-host');
  const geminiModel = document.getElementById('gemini-model');

  const claudeConfig = document.getElementById('claude-config');
  const claudeKey = document.getElementById('claude-key');
  const claudeHost = document.getElementById('claude-host');
  const claudeModel = document.getElementById('claude-model');
  
  const testBtn = document.getElementById('test-connection-btn');
  const saveBtn = document.getElementById('save-btn');
  const statusBar = document.getElementById('status-bar');

  // 直译首屏新增元素
  const settingsToggleBtn = document.getElementById('settings-toggle-btn');
  const translatePage = document.getElementById('translate-page');
  const settingsPage = document.getElementById('settings-page');
  
  const swapLangsBtn = document.getElementById('swap-langs-btn');
  const translateInput = document.getElementById('translate-input');
  const charCount = document.getElementById('char-count');
  const clearInputBtn = document.getElementById('clear-input-btn');
  const translateSubmitBtn = document.getElementById('translate-submit-btn');
  const translateOutput = document.getElementById('translate-output');
  const copyOutputBtn = document.getElementById('copy-output-btn');

  // ==========================================
  // 1. 初始化回显配置
  // ==========================================
  chrome.storage.local.get(['isEnabled', 'engine', 'config', 'sourceLang', 'targetLang'], (res) => {
    toggle.checked = res.isEnabled || false;
    sourceLangSelect.value = res.sourceLang || 'auto';
    targetLangSelect.value = res.targetLang || 'zh-CN';
    engineSelect.value = res.engine || 'google';
    
    const config = res.config || {};
    // 百度
    baiduAppId.value = config.baiduAppId || '';
    baiduKey.value = config.baiduKey || '';
    // DeepSeek
    deepseekKey.value = config.deepseekApiKey || '';
    deepseekHost.value = config.deepseekHost || '';
    deepseekModel.value = config.deepseekModel || 'deepseek-chat';
    // Gemini
    geminiKey.value = config.geminiApiKey || '';
    geminiHost.value = config.geminiHost || '';
    geminiModel.value = config.geminiModel || 'gemini-3.1-flash-lite';
    // Claude
    claudeKey.value = config.claudeApiKey || '';
    claudeHost.value = config.claudeHost || '';
    claudeModel.value = config.claudeModel || 'claude-3-5-haiku-20241022';

    // 渲染对应的面板展示
    updateConfigPanelsVisibility(engineSelect.value);
  });

  // ==========================================
  // 2. 面板隐藏/展示逻辑与校验错误消除
  // ==========================================
  function updateConfigPanelsVisibility(selectedEngine) {
    baiduConfig.style.display = 'none';
    deepseekConfig.style.display = 'none';
    geminiConfig.style.display = 'none';
    claudeConfig.style.display = 'none';

    if (selectedEngine === 'baidu') {
      baiduConfig.style.display = 'flex';
    } else if (selectedEngine === 'deepseek') {
      deepseekConfig.style.display = 'flex';
    } else if (selectedEngine === 'gemini') {
      geminiConfig.style.display = 'flex';
    } else if (selectedEngine === 'claude') {
      claudeConfig.style.display = 'flex';
    }
  }

  function clearValidationErrors() {
    baiduAppId.classList.remove('input-error');
    baiduKey.classList.remove('input-error');
    deepseekKey.classList.remove('input-error');
    geminiKey.classList.remove('input-error');
    claudeKey.classList.remove('input-error');
  }

  engineSelect.addEventListener('change', (e) => {
    updateConfigPanelsVisibility(e.target.value);
    clearValidationErrors();
    showStatus(''); // 切换引擎时清除测试状态
  });

  // 绑定 input 事件以消除输入框红色错误状态
  [baiduAppId, baiduKey, deepseekKey, geminiKey, claudeKey].forEach(input => {
    input.addEventListener('input', () => {
      input.classList.remove('input-error');
      const hasErrors = [baiduAppId, baiduKey, deepseekKey, geminiKey, claudeKey].some(el => el.classList.contains('input-error'));
      if (!hasErrors) {
        showStatus('');
      }
    });
  });

  // ==========================================
  // 3. 密码框显示/隐藏切换
  // ==========================================
  document.querySelectorAll('.password-toggle').forEach(el => {
    el.addEventListener('click', () => {
      const targetId = el.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (input.type === 'password') {
        input.type = 'text';
        el.textContent = '隐藏';
      } else {
        input.type = 'password';
        el.textContent = '显示';
      }
    });
  });

  // ==========================================
  // 4. 状态栏辅助逻辑
  // ==========================================
  function showStatus(message, type = '') {
    statusBar.className = 'status-bar';
    statusBar.innerHTML = '';
    statusBar.style.display = 'none';

    if (!message) return;

    statusBar.style.display = 'flex';
    if (type === 'loading') {
      statusBar.classList.add('status-loading');
      statusBar.innerHTML = `<div class="spinner"></div><span>${message}</span>`;
    } else if (type === 'success') {
      statusBar.classList.add('status-success');
      statusBar.textContent = message;
    } else if (type === 'error') {
      statusBar.classList.add('status-error');
      statusBar.textContent = message;
    }
  }

  // 获取当前表单的临时配置对象
  function getCurrentFormConfig() {
    return {
      baiduAppId: baiduAppId.value.trim(),
      baiduKey: baiduKey.value.trim(),
      deepseekApiKey: deepseekKey.value.trim(),
      deepseekHost: deepseekHost.value.trim(),
      deepseekModel: deepseekModel.value,
      geminiApiKey: geminiKey.value.trim(),
      geminiHost: geminiHost.value.trim(),
      geminiModel: geminiModel.value,
      claudeApiKey: claudeKey.value.trim(),
      claudeHost: claudeHost.value.trim(),
      claudeModel: claudeModel.value
    };
  }

  // 执行核心 API Key 校验逻辑
  function validateConfig(engine, config) {
    clearValidationErrors();
    let hasError = false;

    if (engine === 'baidu') {
      if (!config.baiduAppId) {
        baiduAppId.classList.add('input-error');
        hasError = true;
      }
      if (!config.baiduKey) {
        baiduKey.classList.add('input-error');
        hasError = true;
      }
    } else if (engine === 'deepseek') {
      if (!config.deepseekApiKey) {
        deepseekKey.classList.add('input-error');
        hasError = true;
      }
    } else if (engine === 'gemini') {
      if (!config.geminiApiKey) {
        geminiKey.classList.add('input-error');
        hasError = true;
      }
    } else if (engine === 'claude') {
      if (!config.claudeApiKey) {
        claudeKey.classList.add('input-error');
        hasError = true;
      }
    }

    return !hasError;
  }

  // ==========================================
  // 5. 连接测试
  // ==========================================
  testBtn.addEventListener('click', () => {
    const engine = engineSelect.value;
    const currentConfig = getCurrentFormConfig();
    
    if (!validateConfig(engine, currentConfig)) {
      showStatus('测试失败，请填写必填的 API 配置。', 'error');
      return;
    }
    
    showStatus('正在发起翻译测试...', 'loading');
    
    chrome.runtime.sendMessage({
      action: "testConnection",
      engine: engine,
      config: currentConfig,
      sourceLang: sourceLangSelect.value,
      targetLang: targetLangSelect.value
    }, (response) => {
      if (chrome.runtime.lastError) {
        showStatus(`通信错误: ${chrome.runtime.lastError.message}`, 'error');
        return;
      }

      if (response && response.success) {
        showStatus(`测试成功！译文: "${response.result}"`, 'success');
      } else {
        const errorMsg = response ? response.error : '未知后台错误';
        showStatus(`连接测试失败: ${errorMsg}`, 'error');
      }
    });
  });

  // ==========================================
  // 6. 保存配置并应用
  // ==========================================
  saveBtn.addEventListener('click', () => {
    const isEnabled = toggle.checked;
    const engine = engineSelect.value;
    const sourceLang = sourceLangSelect.value;
    const targetLang = targetLangSelect.value;
    const currentConfig = getCurrentFormConfig();

    // 强校验拦截：若没有填写对应的 key 则不应该能保存
    if (!validateConfig(engine, currentConfig)) {
      showStatus('保存失败，请填写必填的 API 配置后再保存。', 'error');
      return;
    }

    chrome.storage.local.set({
      isEnabled: isEnabled,
      engine: engine,
      sourceLang: sourceLang,
      targetLang: targetLang,
      config: currentConfig
    }, () => {
      showStatus('配置已保存并应用！', 'success');
      notifyActiveTab(isEnabled, engine, sourceLang, targetLang, currentConfig, false);
      
      setTimeout(() => {
        showStatus('');
        // 自动切回直译首屏
        settingsPage.classList.remove('active');
        settingsToggleBtn.classList.remove('active');
        translatePage.classList.add('active');
        settingsToggleBtn.title = "配置选项";
      }, 1200);
    });
  });

  // ==========================================
  // 7. 一键开关控制
  // ==========================================
  toggle.addEventListener('change', () => {
    const isEnabled = toggle.checked;
    const engine = engineSelect.value;
    const sourceLang = sourceLangSelect.value;
    const targetLang = targetLangSelect.value;
    const currentConfig = getCurrentFormConfig();

    if (isEnabled && !validateConfig(engine, currentConfig)) {
      toggle.checked = false;
      showStatus('开启失败，请先填写对应的 API 配置。', 'error');
      return;
    }

    chrome.storage.local.set({ isEnabled: isEnabled }, () => {
      notifyActiveTab(isEnabled, engine, sourceLang, targetLang, currentConfig, true);
      showStatus('');
    });
  });

  // 广播状态消息给当前 Tab 的 Content Script
  function notifyActiveTab(isEnabled, engine, sourceLang, targetLang, config, isExplicitToggle = false) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) {
        const activeTabId = tabs[0].id;
        if (activeTabId) {
          chrome.tabs.sendMessage(activeTabId, {
            action: "toggleTranslation",
            isEnabled: isEnabled,
            engine: engine,
            sourceLang: sourceLang,
            targetLang: targetLang,
            currentConfig: config,
            isExplicitToggle: isExplicitToggle
          }, () => {
            if (chrome.runtime.lastError) {
              console.log("Antigravity Translate: Content script not loaded on this tab yet.");
            }
          });
        }
      }
    });
  }

  // ==========================================
  // 8. 快捷键配置入口与刷新
  // ==========================================
  const shortcutsLink = document.getElementById('open-shortcuts-link');
  if (shortcutsLink) {
    shortcutsLink.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.runtime.sendMessage({ action: "openShortcuts" });
    });
    // 动态读取并显示当前的快捷键
    chrome.commands.getAll((commands) => {
      const cmd = commands.find(c => c.name === "toggle-translate");
      if (cmd && cmd.shortcut) {
        shortcutsLink.textContent = `点击自定义快捷键(${cmd.shortcut})`;
      } else {
        shortcutsLink.textContent = `点击自定义快捷键(Alt+Z)`;
      }
    });
  }

  // ==========================================
  // 9. 一键清空翻译本地缓存
  // ==========================================
  function updateCacheSizeDisplay() {
    const clearCacheLink = document.getElementById('clear-cache-link');
    if (clearCacheLink) {
      chrome.storage.local.getBytesInUse('translationCache', (bytes) => {
        if (chrome.runtime.lastError) {
          console.warn("Could not get bytes in use:", chrome.runtime.lastError);
          clearCacheLink.textContent = `清除翻译缓存 (0.0 KB)`;
          return;
        }
        const kb = (bytes / 1024).toFixed(1);
        clearCacheLink.textContent = `清除翻译缓存 (${kb} KB)`;
      });
    }
  }

  const clearCacheLink = document.getElementById('clear-cache-link');
  if (clearCacheLink) {
    clearCacheLink.addEventListener('click', (e) => {
      e.preventDefault();
      showStatus('正在清空缓存...', 'loading');
      chrome.runtime.sendMessage({ action: "clearCache" }, (response) => {
        if (response && response.success) {
          showStatus('翻译本地缓存已成功清空！', 'success');
          updateCacheSizeDisplay();
          setTimeout(() => showStatus(''), 1500);
        } else {
          showStatus('清空缓存失败。', 'error');
        }
      });
    });
  }

  // 初始化调用显示缓存大小
  updateCacheSizeDisplay();

  // ==========================================
  // 10. 配置一键导入/导出（点击极简）
  // ==========================================
  const btnConfigIo = document.getElementById('btn-config-io');
  if (btnConfigIo) {
    btnConfigIo.addEventListener('click', async () => {
      try {
        let clipboardText = '';
        try {
          clipboardText = await navigator.clipboard.readText();
        } catch (err) {
          showStatus('读取剪贴板失败，请检查扩展读取剪贴板权限', 'error');
          return;
        }

        clipboardText = clipboardText.trim();
        let configData = null;

        // 校验特定格式配置
        if (clipboardText.startsWith('{') && clipboardText.endsWith('}')) {
          try {
            const parsed = JSON.parse(clipboardText);
            if (parsed && parsed.signature === 'immersive-translate-minimal-config') {
              configData = parsed.data;
            }
          } catch (e) {
            // 解析出错，忽略它，接下来会走导出流程
          }
        }

        if (configData) {
          // ================= 导入流程 =================
          chrome.storage.local.set({
            isEnabled: configData.isEnabled,
            engine: configData.engine,
            sourceLang: configData.sourceLang,
            targetLang: configData.targetLang,
            config: configData.config
          }, () => {
            // 回显 UI 面板
            toggle.checked = configData.isEnabled || false;
            sourceLangSelect.value = configData.sourceLang || 'auto';
            targetLangSelect.value = configData.targetLang || 'zh-CN';
            engineSelect.value = configData.engine || 'google';

            const c = configData.config || {};
            baiduAppId.value = c.baiduAppId || '';
            baiduKey.value = c.baiduKey || '';
            deepseekKey.value = c.deepseekApiKey || '';
            deepseekHost.value = c.deepseekHost || '';
            deepseekModel.value = c.deepseekModel || 'deepseek-chat';
            geminiKey.value = c.geminiApiKey || '';
            geminiHost.value = c.geminiHost || '';
            geminiModel.value = c.geminiModel || 'gemini-3.1-flash-lite';
            claudeKey.value = c.claudeApiKey || '';
            claudeHost.value = c.claudeHost || '';
            claudeModel.value = c.claudeModel || 'claude-3-5-haiku-20241022';

            // 重新刷新面板可见性与消除错误状态
            updateConfigPanelsVisibility(engineSelect.value);
            clearValidationErrors();

            // 广播配置给网页
            notifyActiveTab(configData.isEnabled, configData.engine, configData.sourceLang, configData.targetLang, configData.config, false);

            showStatus('配置导入成功！', 'success');
            setTimeout(() => showStatus(''), 1500);
          });
        } else {
          // ================= 导出流程 =================
          const currentConfig = getCurrentFormConfig();
          const exportData = {
            signature: 'immersive-translate-minimal-config',
            version: '1.0.0',
            data: {
              isEnabled: toggle.checked,
              engine: engineSelect.value,
              sourceLang: sourceLangSelect.value,
              targetLang: targetLangSelect.value,
              config: currentConfig
            }
          };

          try {
            await navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
            showStatus('配置导出成功！已复制到剪贴板。', 'success');
            setTimeout(() => showStatus(''), 1500);
          } catch (err) {
            showStatus('复制到剪贴板失败，请重试', 'error');
          }
        }
      } catch (err) {
        showStatus('操作异常: ' + err.message, 'error');
      }
    });
  }

  // ==========================================
  // 11. 页面切换逻辑
  // ==========================================
  settingsToggleBtn.addEventListener('click', () => {
    const isSettingsActive = settingsPage.classList.contains('active');
    if (isSettingsActive) {
      // 切换到直译页面
      settingsPage.classList.remove('active');
      settingsToggleBtn.classList.remove('active');
      translatePage.classList.add('active');
      settingsToggleBtn.title = "配置选项";
    } else {
      // 切换到设置页面
      translatePage.classList.remove('active');
      settingsPage.classList.add('active');
      settingsToggleBtn.classList.add('active');
      settingsToggleBtn.title = "返回翻译";
      showStatus(''); // 切换到设置时清理状态栏
    }
  });

  // ==========================================
  // 12. 直译页面交互逻辑
  // ==========================================

  // 监听直译页面的源语言/目标语言变动，并自动同步保存
  sourceLangSelect.addEventListener('change', (e) => {
    chrome.storage.local.set({ sourceLang: e.target.value }, () => {
      chrome.storage.local.get(['isEnabled', 'engine', 'config'], (res) => {
        notifyActiveTab(res.isEnabled, res.engine, e.target.value, targetLangSelect.value, res.config, false);
      });
    });
  });

  targetLangSelect.addEventListener('change', (e) => {
    chrome.storage.local.set({ targetLang: e.target.value }, () => {
      chrome.storage.local.get(['isEnabled', 'engine', 'config'], (res) => {
        notifyActiveTab(res.isEnabled, res.engine, sourceLangSelect.value, e.target.value, res.config, false);
      });
    });
  });

  // 交换源/目标语言
  swapLangsBtn.addEventListener('click', () => {
    const sourceVal = sourceLangSelect.value;
    const targetVal = targetLangSelect.value;
    
    if (sourceVal === 'auto') {
      // 如果源语言是自动检测，交换后源语言设为目标语言，目标语言如果相同设为对应替代
      sourceLangSelect.value = targetVal;
      targetLangSelect.value = (targetVal === 'en' ? 'zh-CN' : 'en');
    } else {
      sourceLangSelect.value = targetVal;
      targetLangSelect.value = sourceVal;
    }

    // 手动触发 change 以便执行保存和通知
    sourceLangSelect.dispatchEvent(new Event('change'));
    targetLangSelect.dispatchEvent(new Event('change'));
  });

  // 输入字符数计数
  translateInput.addEventListener('input', () => {
    let val = translateInput.value;
    if (val.length > 5000) {
      val = val.substring(0, 5000);
      translateInput.value = val;
    }
    charCount.textContent = `${val.length} / 5000`;
  });

  // 一键清空输入
  clearInputBtn.addEventListener('click', () => {
    translateInput.value = '';
    charCount.textContent = '0 / 5000';
    translateInput.focus();
  });

  // 一键复制译文
  copyOutputBtn.addEventListener('click', async () => {
    const text = translateOutput.value.trim();
    if (!text || text === '翻译结果...' || text.startsWith('正在翻译') || text.startsWith('翻译失败') || text.startsWith('通信错误')) {
      return;
    }
    
    try {
      await navigator.clipboard.writeText(text);
      // 打勾视觉反馈
      const originalSVG = copyOutputBtn.innerHTML;
      copyOutputBtn.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      `;
      copyOutputBtn.style.pointerEvents = 'none';
      setTimeout(() => {
        copyOutputBtn.innerHTML = originalSVG;
        copyOutputBtn.style.pointerEvents = 'auto';
      }, 1500);
    } catch (err) {
      console.error('复制译文失败:', err);
    }
  });

  // 触发翻译
  translateSubmitBtn.addEventListener('click', () => {
    const text = translateInput.value.trim();
    if (!text) return;

    translateSubmitBtn.disabled = true;
    translateSubmitBtn.textContent = '翻译中...';
    translateOutput.value = '正在翻译中，请稍候...';

    // 实时读取最新的翻译配置
    chrome.storage.local.get(['engine', 'config'], (res) => {
      const engine = res.engine || 'google';
      const config = res.config || {};
      const from = sourceLangSelect.value;
      const to = targetLangSelect.value;

      chrome.runtime.sendMessage({
        action: "translate",
        texts: [text],
        engine: engine,
        from: from,
        to: to,
        config: config
      }, (response) => {
        translateSubmitBtn.disabled = false;
        translateSubmitBtn.textContent = '翻译';

        if (chrome.runtime.lastError) {
          translateOutput.value = `通信错误: ${chrome.runtime.lastError.message}`;
          return;
        }

        if (response && response.success) {
          translateOutput.value = response.translatedTexts[0] || '';
        } else {
          const errReason = response ? response.error : '未知后台错误';
          translateOutput.value = `翻译失败: ${errReason}`;
        }
      });
    });
  });

  // 打开 Popup 时通知后台刷新右键菜单中的快捷键绑定展示
  chrome.runtime.sendMessage({ action: "updateMenu" });
});
