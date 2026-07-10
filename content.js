// Antigravity Translate - Content Script

let isTranslatingEnabled = false;
let config = {};
let translationEngine = "google";
let globalSourceLang = "auto";
let globalTargetLang = "zh-CN";

// 存储翻译队列中的节点和信息
let translationQueue = [];
let queueTimer = null;
const QUEUE_DELAY = 120; // 毫秒

function getBatchSize() {
  // 大模型 (deepseek, gemini, claude) 批次调大到 50 减少网络往返并增加上下文，免费版维持在 15 左右以防接口限制
  if (translationEngine === 'google' || translationEngine === 'microsoft') {
    return 15;
  }
  return 50;
}

// 排除标签
const EXCLUDE_TAGS = new Set([
  'SCRIPT', 'STYLE', 'CODE', 'PRE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 
  'SELECT', 'IFRAME', 'SVG', 'CANVAS', 'VIDEO', 'AUDIO', 'HEAD', 'TEMPLATE', 'BUTTON'
]);

// 适合进行对照翻译的目标容器标签
const TARGET_TAGS = new Set([
  'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'SPAN', 'DIV', 'A', 'TD', 'TH', 'BLOCKQUOTE', 'SECTION', 'ARTICLE'
]);

// ==========================================
// 1. 语言判定与过滤逻辑
// ==========================================

// 是否含有英文特征词
function hasEnglishText(text) {
  return /[a-zA-Z]{3,}/.test(text);
}

// 是否已经是中文
function isChineseText(text) {
  const chineseChars = text.match(/[\u4e00-\u9fa5]/g);
  if (chineseChars && (chineseChars.length / text.length) > 0.4) {
    return true;
  }
  return false;
}

// 核心多语言动态匹配
function matchSourceLanguage(text) {
  const clean = text.trim();
  if (clean.length < 2) return false;

  const toLang = globalTargetLang;
  const isTargetChinese = toLang === 'zh-CN' || toLang === 'zh-TW';

  // 情形A：中译外（目标是英文、日文、韩文等外文，需要翻译页面中的中文）
  if (toLang !== 'zh-CN' && toLang !== 'zh-TW') {
    return /[\u4e00-\u9fa5]/.test(clean);
  }

  // 情形B：外译中（目标是简体或繁体中文，需要过滤掉中文本身）
  if (globalSourceLang === 'en') {
    return hasEnglishText(clean) && !isChineseText(clean);
  } else if (globalSourceLang === 'ja') {
    return /[\u3040-\u309F\u30A0-\u30FF]/.test(clean);
  } else if (globalSourceLang === 'ko') {
    return /[\uAC00-\uD7AF]/.test(clean);
  } else if (globalSourceLang === 'fr' || globalSourceLang === 'es' || globalSourceLang === 'de' || globalSourceLang === 'it' || globalSourceLang === 'pt' || globalSourceLang === 'vi' || globalSourceLang === 'id' || globalSourceLang === 'tr' || globalSourceLang === 'nl' || globalSourceLang === 'pl' || globalSourceLang === 'sv' || globalSourceLang === 'da' || globalSourceLang === 'fi' || globalSourceLang === 'no' || globalSourceLang === 'cs' || globalSourceLang === 'hu' || globalSourceLang === 'ro' || globalSourceLang === 'ca' || globalSourceLang === 'gl' || globalSourceLang === 'eu' || globalSourceLang === 'is' || globalSourceLang === 'sq' || globalSourceLang === 'af' || globalSourceLang === 'sw' || globalSourceLang === 'cy') {
    // 基础和扩展拉丁字符（法语、德语、西班牙语、意大利语、葡萄牙语、越南语、印尼语、土耳其语、荷兰语、波兰语、瑞典语、丹麦语、芬兰语、挪威语、捷克语、匈牙利语、罗马尼亚语、加泰罗尼亚语、爱尔兰语、加利西亚语、巴斯克语、冰岛语、阿尔巴尼亚语、南非荷兰语、斯瓦希里语、威尔士语）
    return /[a-zA-ZÀ-ÿ\u1E00-\u1EFF]{3,}/.test(clean) && !isChineseText(clean);
  } else if (globalSourceLang === 'ru' || globalSourceLang === 'uk' || globalSourceLang === 'bg' || globalSourceLang === 'sr' || globalSourceLang === 'be' || globalSourceLang === 'mk') {
    // 西里尔字母语系（俄语、乌克兰语、保加利亚语、塞尔维亚语、白俄罗斯语、马其顿语）
    return /[\u0400-\u04FF]{2,}/.test(clean);
  } else if (globalSourceLang === 'th') {
    // 泰文字符
    return /[\u0E00-\u0E7F]/.test(clean);
  } else if (globalSourceLang === 'ar' || globalSourceLang === 'fa') {
    // 阿拉伯/波斯字符
    return /[\u0600-\u06FF]/.test(clean);
  } else if (globalSourceLang === 'el') {
    // 希腊字符
    return /[\u0370-\u03FF]/.test(clean);
  } else if (globalSourceLang === 'he') {
    // 希伯来字符
    return /[\u0590-\u05FF]/.test(clean);
  } else if (globalSourceLang === 'hi' || globalSourceLang === 'ne') {
    // 印地语/尼泊尔语（天城文）
    return /[\u0900-\u097F]/.test(clean);
  } else if (globalSourceLang === 'zh-CN' || globalSourceLang === 'zh-TW') {
    return /[\u4e00-\u9fa5]/.test(clean);
  } else {
    // 自动检测 (auto)：当目标是中文时，检测是否包含任一主要外文且并非已经是中文
    if (isTargetChinese) {
      return (/[a-zA-ZÀ-ÿ\u1E00-\u1EFF]{3,}/.test(clean) || 
              /[\u3040-\u309F\u30A0-\u30FF]/.test(clean) || 
              /[\uAC00-\uD7AF]/.test(clean) || 
              /[\u0400-\u04FF]/.test(clean) || 
              /[\u0E00-\u0E7F]/.test(clean) || 
              /[\u0600-\u06FF]/.test(clean) ||
              /[\u0370-\u03FF]/.test(clean) ||
              /[\u0590-\u05FF]/.test(clean) ||
              /[\u0900-\u0DFF]/.test(clean) ||
              /[\u1000-\u109F]/.test(clean) ||
              /[\u1780-\u17FF]/.test(clean) ||
              /[\u0E80-\u0EFF]/.test(clean)) && !isChineseText(clean);
    }
    return true;
  }
}

// ==========================================
// 2. DOM 扫描与节点匹配
// ==========================================

function getTranslateNodes(root) {
  const nodes = [];
  
  function walk(node) {
    if (!node) return;
    
    // 元素节点检查
    if (node.nodeType === Node.ELEMENT_NODE) {
      if (EXCLUDE_TAGS.has(node.tagName)) {
        return;
      }
      
      // 避免重复扫描我们已添加的翻译元素
      if (node.classList.contains('immersive-translate-translation') || 
          node.classList.contains('immersive-translate-translation-block')) {
        return;
      }
      
      // 如果该节点已翻译完成，跳过
      if (node.hasAttribute('data-immersive-translate-translated')) {
        return;
      }
    }
    
    // 文本节点检查
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.trim();
      const parent = node.parentElement;
      
      // 动态校验源语言并匹配合适的父元素
      if (parent && TARGET_TAGS.has(parent.tagName) && matchSourceLanguage(text)) {
        if (!parent.hasAttribute('data-immersive-translate-translated') && 
            !parent.hasAttribute('data-immersive-translate-queued')) {
          parent.setAttribute('data-immersive-translate-queued', 'true');
          nodes.push(parent);
        }
      }
      return;
    }
    
    // 递归子节点
    for (let child = node.firstChild; child; child = child.nextSibling) {
      walk(child);
    }
  }
  
  walk(root);
  return nodes;
}

// 清洗节点的文本内容
function getCleanText(node) {
  const clone = node.cloneNode(true);
  clone.querySelectorAll('.immersive-translate-translation, .immersive-translate-translation-block').forEach(el => el.remove());
  return clone.textContent.trim().replace(/\s+/g, ' ');
}

// ==========================================
// 3. 翻译队列管理与后台交互
// ==========================================

function queueNodeForTranslation(node) {
  translationQueue.push(node);
  
  if (translationQueue.length >= getBatchSize()) {
    flushQueue();
  } else {
    if (queueTimer) clearTimeout(queueTimer);
    queueTimer = setTimeout(flushQueue, QUEUE_DELAY);
  }
}

async function flushQueue() {
  if (translationQueue.length === 0) return;
  
  const currentBatch = [...translationQueue];
  translationQueue = [];
  if (queueTimer) clearTimeout(queueTimer);
  
  const textsToTranslate = currentBatch.map(node => getCleanText(node));
  
  // 调用 background 进行翻译，透传语言选择
  chrome.runtime.sendMessage({
    action: "translate",
    texts: textsToTranslate,
    engine: translationEngine,
    from: globalSourceLang,
    to: globalTargetLang,
    config: config
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error("Translation message sending error:", chrome.runtime.lastError);
      currentBatch.forEach(node => node.removeAttribute('data-immersive-translate-queued'));
      return;
    }
    
    if (response && response.success && response.translatedTexts) {
      currentBatch.forEach((node, index) => {
        node.removeAttribute('data-immersive-translate-queued');
        node.setAttribute('data-immersive-translate-translated', 'true');
        
        const translatedText = response.translatedTexts[index];
        const originalText = textsToTranslate[index];
        
        if (translatedText && translatedText.trim() !== originalText.trim()) {
          injectTranslation(node, translatedText);
        }
      });
    } else {
      console.error("Translation logic execution error:", response ? response.error : "Unknown background error");
      currentBatch.forEach(node => node.removeAttribute('data-immersive-translate-queued'));
    }
  });
}

// ==========================================
// 4. 双语对照译文渲染
// ==========================================

function injectTranslation(node, translatedText) {
  const blockTags = ['P', 'DIV', 'LI', 'BLOCKQUOTE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'SECTION', 'ARTICLE'];
  const isBlock = blockTags.includes(node.tagName);
  
  const span = document.createElement('span');
  span.className = isBlock ? 'immersive-translate-translation-block' : 'immersive-translate-translation';
  span.textContent = translatedText;
  
  node.appendChild(span);
}

// ==========================================
// 5. 动态监听 MutationObserver 增量扫描
// ==========================================

let observer = null;
let scanTimer = null;

function startObserver() {
  if (observer) return;
  
  observer = new MutationObserver((mutations) => {
    if (!isTranslatingEnabled) return;
    
    let needsScan = false;
    for (const mutation of mutations) {
      if (mutation.addedNodes && mutation.addedNodes.length > 0) {
        for (const addedNode of mutation.addedNodes) {
          if (addedNode.nodeType === Node.ELEMENT_NODE) {
            if (!addedNode.classList.contains('immersive-translate-translation') && 
                !addedNode.classList.contains('immersive-translate-translation-block')) {
              needsScan = true;
              break;
            }
          }
        }
      }
      if (needsScan) break;
    }
    
    if (needsScan) {
      triggerScan();
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function triggerScan() {
  if (scanTimer) clearTimeout(scanTimer);
  scanTimer = setTimeout(() => {
    if (!isTranslatingEnabled) return;
    const nodes = getTranslateNodes(document.body);
    nodes.forEach(node => queueNodeForTranslation(node));
  }, 250);
}

// ==========================================
// 6. 控制指令执行
// ==========================================

function startTranslation() {
  isTranslatingEnabled = true;
  const nodes = getTranslateNodes(document.body);
  nodes.forEach(node => queueNodeForTranslation(node));
  startObserver();
}

function stopTranslation() {
  isTranslatingEnabled = false;
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  
  translationQueue = [];
  if (queueTimer) clearTimeout(queueTimer);
  if (scanTimer) clearTimeout(scanTimer);
  
  document.querySelectorAll('.immersive-translate-translation, .immersive-translate-translation-block').forEach(el => el.remove());
  
  document.querySelectorAll('[data-immersive-translate-translated]').forEach(el => {
    el.removeAttribute('data-immersive-translate-translated');
  });
  document.querySelectorAll('[data-immersive-translate-queued]').forEach(el => {
    el.removeAttribute('data-immersive-translate-queued');
  });
}

// ==========================================
// 7. 初始化与配置变动监听
// ==========================================

// 初始化读取
chrome.storage.local.get(['isEnabled', 'engine', 'config', 'sourceLang', 'targetLang'], (result) => {
  isTranslatingEnabled = result.isEnabled || false;
  translationEngine = result.engine || 'google';
  config = result.config || {};
  globalSourceLang = result.sourceLang || 'auto';
  globalTargetLang = result.targetLang || 'zh-CN';
  
  if (isTranslatingEnabled) {
    startTranslation();
  }
});

// 监听指令
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggleTranslation") {
    const { isEnabled, engine, currentConfig, sourceLang, targetLang, isTempTranslation } = request;
    translationEngine = engine || 'google';
    config = currentConfig || {};
    globalSourceLang = sourceLang || 'auto';
    globalTargetLang = targetLang || 'zh-CN';
    
    // 只有在显式要求开启始终自动翻译，或者是由右键临时翻译触发时
    // 且当前尚未翻译该页面，才触发 startTranslation。已翻译的网页不打扰、不清除其译文。
    if (isEnabled || isTempTranslation) {
      if (!isTranslatingEnabled) {
        startTranslation();
      }
    }
    sendResponse({ success: true });
  }

  if (request.action === "shortcutToggle") {
    const { engine, currentConfig, sourceLang, targetLang } = request;
    translationEngine = engine || 'google';
    config = currentConfig || {};
    globalSourceLang = sourceLang || 'auto';
    globalTargetLang = targetLang || 'zh-CN';

    if (isTranslatingEnabled) {
      stopTranslation();
    } else {
      startTranslation();
    }
    sendResponse({ success: true });
  }
});
