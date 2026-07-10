// Antigravity Translate - Content Script

let isTranslatingEnabled = false;
let config = {};
let intersectionObserver = null;
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
function hasScript(text, lang) {
  if (lang === 'zh-CN' || lang === 'zh-TW' || lang === 'zh') {
    return /[\u4e00-\u9fa5]/.test(text);
  }
  if (lang === 'ja') {
    return /[\u3040-\u309F\u30A0-\u30FF]/.test(text) || /[\u4e00-\u9fa5]/.test(text);
  }
  if (lang === 'ko') {
    return /[\uAC00-\uD7AF]/.test(text);
  }
  if (['en', 'fr', 'es', 'de', 'it', 'pt', 'vi', 'id', 'tr', 'nl', 'pl', 'sv', 'da', 'fi', 'no', 'cs', 'hu', 'ro', 'ca', 'gl', 'eu', 'is', 'sq', 'af', 'sw', 'cy'].includes(lang)) {
    return /[a-zA-ZÀ-ÿ\u1E00-\u1EFF]/.test(text);
  }
  if (['ru', 'uk', 'bg', 'sr', 'be', 'mk'].includes(lang)) {
    return /[\u0400-\u04FF]/.test(text);
  }
  if (lang === 'th') {
    return /[\u0E00-\u0E7F]/.test(text);
  }
  if (lang === 'ar' || lang === 'fa') {
    return /[\u0600-\u06FF]/.test(text);
  }
  if (lang === 'el') {
    return /[\u0370-\u03FF]/.test(text);
  }
  if (lang === 'he') {
    return /[\u0590-\u05FF]/.test(text);
  }
  if (lang === 'hi' || lang === 'ne') {
    return /[\u0900-\u097F]/.test(text);
  }
  return false;
}

function isAlreadyTargetLanguage(text, targetLang) {
  if (targetLang === 'zh-CN' || targetLang === 'zh-TW' || targetLang === 'zh') {
    return isChineseText(text);
  }
  if (targetLang === 'ko') {
    return /[\uAC00-\uD7AF]/.test(text);
  }
  if (targetLang === 'ja') {
    if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return true;
    return false;
  }
  if (['en', 'fr', 'es', 'de', 'it', 'pt', 'vi', 'id', 'tr', 'nl', 'pl', 'sv', 'da', 'fi', 'no', 'cs', 'hu', 'ro', 'ca', 'gl', 'eu', 'is', 'sq', 'af', 'sw', 'cy'].includes(targetLang)) {
    const hasLatin = /[a-zA-ZÀ-ÿ\u1E00-\u1EFF]/.test(text);
    const hasOtherScripts = /[\u4e00-\u9fa5\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF\u0400-\u04FF\u0E00-\u0E7F\u0600-\u06FF\u0370-\u03FF\u0590-\u05FF]/.test(text);
    return hasLatin && !hasOtherScripts;
  }
  if (['ru', 'uk', 'bg', 'sr', 'be', 'mk'].includes(targetLang)) {
    return /[\u0400-\u04FF]/.test(text);
  }
  if (targetLang === 'th') {
    return /[\u0E00-\u0E7F]/.test(text);
  }
  if (targetLang === 'ar' || targetLang === 'fa') {
    return /[\u0600-\u06FF]/.test(text);
  }
  if (targetLang === 'el') {
    return /[\u0370-\u03FF]/.test(text);
  }
  if (targetLang === 'he') {
    return /[\u0590-\u05FF]/.test(text);
  }
  if (targetLang === 'hi' || targetLang === 'ne') {
    return /[\u0900-\u097F]/.test(text);
  }
  return false;
}

function matchSourceLanguage(text) {
  const clean = text.trim();
  if (clean.length < 2) return false;

  // 如果已经达到了目标语言，则跳过不翻译
  if (isAlreadyTargetLanguage(clean, globalTargetLang)) {
    return false;
  }

  if (globalSourceLang === 'auto') {
    // 检查是否包含任何支持语言的文字/字母
    return /[a-zA-ZÀ-ÿ\u1E00-\u1EFF\u4e00-\u9fa5\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF\u0400-\u04FF\u0E00-\u0E7F\u0600-\u06FF\u0370-\u03FF\u0590-\u05FF\u0900-\u097F]/.test(clean);
  }

  return hasScript(clean, globalSourceLang);
}

// ==========================================
// 2. DOM 扫描与节点匹配
// ==========================================

function getTranslateNodes(root) {
  const nodes = [];
  const visitedParents = new Set();
  
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
            !parent.hasAttribute('data-immersive-translate-queued') &&
            !visitedParents.has(parent)) {
          visitedParents.add(parent);
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

// 延迟实例化 IntersectionObserver 观测器
function getIntersectionObserver() {
  if (!intersectionObserver) {
    intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const node = entry.target;
          intersectionObserver.unobserve(node);
          queueNodeForTranslation(node);
        }
      });
    }, {
      rootMargin: "0px 0px 250px 0px" // 提前 250px 挂载加载以获得平滑滚动
    });
  }
  return intersectionObserver;
}

// 寻找或原地生成对照容器
function getOrCreateTransNode(node) {
  const blockTags = ['P', 'DIV', 'LI', 'BLOCKQUOTE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'SECTION', 'ARTICLE'];
  const isBlock = blockTags.includes(node.tagName);
  const className = isBlock ? 'immersive-translate-translation-block' : 'immersive-translate-translation';
  
  let transNode = node.querySelector(`.${className}`);
  if (!transNode) {
    transNode = document.createElement(isBlock ? 'div' : 'span');
    transNode.className = className;
    node.appendChild(transNode);
  }
  return transNode;
}

// 初始化状态并投入懒加载观测
function initiateNodeState(node) {
  if (node.hasAttribute('data-immersive-translate-queued') || 
      node.hasAttribute('data-immersive-translate-translated')) {
    return;
  }

  node.setAttribute('data-immersive-translate-queued', 'true');
  const transNode = getOrCreateTransNode(node);
  transNode.innerHTML = `<span class="immersive-translate-loading-spinner"></span>`;

  getIntersectionObserver().observe(node);
}

// 将节点转为失败并绑定重试机制
function markNodeAsFailed(node) {
  node.setAttribute('data-immersive-translate-queued', 'failed');
  const transNode = getOrCreateTransNode(node);
  transNode.innerHTML = `<span class="immersive-translate-retry-btn">翻译失败，点此重试</span>`;

  const btn = transNode.querySelector('.immersive-translate-retry-btn');
  if (btn) {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      node.setAttribute('data-immersive-translate-queued', 'true');
      transNode.innerHTML = `<span class="immersive-translate-loading-spinner"></span>`;
      
      // 重新触发
      queueNodeForTranslation(node);
    });
  }
}

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
      currentBatch.forEach(node => markNodeAsFailed(node));
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
        } else {
          // 若无需翻译则移除空占位 Loading
          const transNode = getOrCreateTransNode(node);
          transNode.remove();
        }
      });
    } else {
      console.error("Translation logic execution error:", response ? response.error : "Unknown background error");
      currentBatch.forEach(node => markNodeAsFailed(node));
    }
  });
}

// ==========================================
// 4. 双语对照译文渲染
// ==========================================

function injectTranslation(node, translatedText) {
  const transNode = getOrCreateTransNode(node);
  transNode.textContent = translatedText;
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
    nodes.forEach(node => initiateNodeState(node));
  }, 250);
}

// ==========================================
// 6. 控制指令执行
// ==========================================

function startTranslation() {
  isTranslatingEnabled = true;
  const nodes = getTranslateNodes(document.body);
  nodes.forEach(node => initiateNodeState(node));
  startObserver();
  chrome.runtime.sendMessage({ action: "updateTranslationState", isTranslating: true });
}

function stopTranslation() {
  isTranslatingEnabled = false;
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  if (intersectionObserver) {
    intersectionObserver.disconnect();
    intersectionObserver = null;
  }
  
  translationQueue = [];
  if (queueTimer) clearTimeout(queueTimer);
  queueTimer = null;
  if (scanTimer) clearTimeout(scanTimer);
  scanTimer = null;
  
  document.querySelectorAll('.immersive-translate-translation, .immersive-translate-translation-block').forEach(el => el.remove());
  
  document.querySelectorAll('[data-immersive-translate-translated]').forEach(el => {
    el.removeAttribute('data-immersive-translate-translated');
  });
  document.querySelectorAll('[data-immersive-translate-queued]').forEach(el => {
    el.removeAttribute('data-immersive-translate-queued');
  });
  chrome.runtime.sendMessage({ action: "updateTranslationState", isTranslating: false });
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
    const { isEnabled, engine, currentConfig, sourceLang, targetLang, isTempTranslation, isExplicitToggle } = request;
    
    const isTargetLangChanged = targetLang && targetLang !== globalTargetLang;
    
    translationEngine = engine || 'google';
    config = currentConfig || {};
    globalSourceLang = sourceLang || 'auto';
    globalTargetLang = targetLang || 'zh-CN';
    
    if (isTargetLangChanged) {
      if (isTranslatingEnabled) {
        stopTranslation();
      }
    } else {
      if (isEnabled || isTempTranslation) {
        if (!isTranslatingEnabled) {
          startTranslation();
        }
      } else if (isExplicitToggle) {
        if (isTranslatingEnabled) {
          stopTranslation();
        }
      }
    }
    sendResponse({ success: true });
  }

  if (request.action === "restoreOriginal") {
    if (isTranslatingEnabled) {
      stopTranslation();
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
