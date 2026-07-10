// Immersive Translate Core - Background Service Worker

// ==========================================
// 1. 纯 JS MD5 算法（供百度翻译签名使用）
// ==========================================
function md5(str) {
  var k = [], i = 0;
  for (; i < 64; ) {
    k[i] = Math.sin(++i) * 4294967296 | 0;
  }
  
  function ff(a, b, c, d, x, s, ac) {
    a = a + ((b & c) | (~b & d)) + x + ac | 0;
    return ((a << s) | (a >>> (32 - s))) + b | 0;
  }
  function gg(a, b, c, d, x, s, ac) {
    a = a + ((b & d) | (c & ~d)) + x + ac | 0;
    return ((a << s) | (a >>> (32 - s))) + b | 0;
  }
  function hh(a, b, c, d, x, s, ac) {
    a = a + (b ^ c ^ d) + x + ac | 0;
    return ((a << s) | (a >>> (32 - s))) + b | 0;
  }
  function ii(a, b, c, d, x, s, ac) {
    a = a + (c ^ (b | ~d)) + x + ac | 0;
    return ((a << s) | (a >>> (32 - s))) + b | 0;
  }

  // 必须对字符串进行 UTF-8 编码，以便正确处理中文字符的字节序列
  str = unescape(encodeURIComponent(str));

  var word = [], j = 0;
  var strLength = str.length;
  for (j = 0; j < strLength; j++) {
    word[j >> 2] |= (str.charCodeAt(j) & 0xff) << ((j % 4) * 8);
  }
  word[j >> 2] |= 0x80 << ((j % 4) * 8);
  word[((j + 8) >> 6) * 16 + 14] = strLength * 8;
  var a = 0x67452301, b = 0xefcdab89, c = 0x98badcfe, d = 0x10325476;
  for (j = 0; j < word.length; j += 16) {
    var olda = a, oldb = b, oldc = c, oldd = d;
    a = ff(a, b, c, d, word[j+0], 7, k[0]);
    d = ff(d, a, b, c, word[j+1], 12, k[1]);
    c = ff(c, d, a, b, word[j+2], 17, k[2]);
    b = ff(b, c, d, a, word[j+3], 22, k[3]);
    a = ff(a, b, c, d, word[j+4], 7, k[4]);
    d = ff(d, a, b, c, word[j+5], 12, k[5]);
    c = ff(c, d, a, b, word[j+6], 17, k[6]);
    b = ff(b, c, d, a, word[j+7], 22, k[7]);
    a = ff(a, b, c, d, word[j+8], 7, k[8]);
    d = ff(d, a, b, c, word[j+9], 12, k[9]);
    c = ff(c, d, a, b, word[j+10], 17, k[10]);
    b = ff(b, c, d, a, word[j+11], 22, k[11]);
    a = ff(a, b, c, d, word[j+12], 7, k[12]);
    d = ff(d, a, b, c, word[j+13], 12, k[13]);
    c = ff(c, d, a, b, word[j+14], 17, k[14]);
    b = ff(b, c, d, a, word[j+15], 22, k[15]);

    a = gg(a, b, c, d, word[j+1], 5, k[16]);
    d = gg(d, a, b, c, word[j+6], 9, k[17]);
    c = gg(c, d, a, b, word[j+11], 14, k[18]);
    b = gg(b, c, d, a, word[j+0], 20, k[19]);
    a = gg(a, b, c, d, word[j+5], 5, k[20]);
    d = gg(d, a, b, c, word[j+10], 9, k[21]);
    c = gg(c, d, a, b, word[j+15], 14, k[22]);
    b = gg(b, c, d, a, word[j+4], 20, k[23]);
    a = gg(a, b, c, d, word[j+9], 5, k[24]);
    d = gg(d, a, b, c, word[j+14], 9, k[25]);
    c = gg(c, d, a, b, word[j+3], 14, k[26]);
    b = gg(b, c, d, a, word[j+8], 20, k[27]);
    a = gg(a, b, c, d, word[j+13], 5, k[28]);
    d = gg(d, a, b, c, word[j+2], 9, k[29]);
    c = gg(c, d, a, b, word[j+7], 14, k[30]);
    b = gg(b, c, d, a, word[j+12], 20, k[31]);

    a = hh(a, b, c, d, word[j+5], 4, k[32]);
    d = hh(d, a, b, c, word[j+8], 11, k[33]);
    c = hh(c, d, a, b, word[j+11], 16, k[34]);
    b = hh(b, c, d, a, word[j+14], 23, k[35]);
    a = hh(a, b, c, d, word[j+1], 4, k[36]);
    d = hh(d, a, b, c, word[j+4], 11, k[37]);
    c = hh(c, d, a, b, word[j+7], 16, k[38]);
    b = hh(b, c, d, a, word[j+10], 23, k[39]);
    a = hh(a, b, c, d, word[j+13], 4, k[40]);
    d = hh(d, a, b, c, word[j+0], 11, k[41]);
    c = hh(c, d, a, b, word[j+3], 16, k[42]);
    b = hh(b, c, d, a, word[j+6], 23, k[43]);
    a = hh(a, b, c, d, word[j+9], 4, k[44]);
    d = hh(d, a, b, c, word[j+12], 11, k[45]);
    c = hh(c, d, a, b, word[j+15], 16, k[46]);
    b = hh(b, c, d, a, word[j+2], 23, k[47]);

    a = ii(a, b, c, d, word[j+0], 6, k[48]);
    d = ii(d, a, b, c, word[j+7], 10, k[49]);
    c = ii(c, d, a, b, word[j+14], 15, k[50]);
    b = ii(b, c, d, a, word[j+5], 21, k[51]);
    a = ii(a, b, c, d, word[j+12], 6, k[52]);
    d = ii(d, a, b, c, word[j+3], 10, k[53]);
    c = ii(c, d, a, b, word[j+10], 15, k[54]);
    b = ii(b, c, d, a, word[j+1], 21, k[55]);
    a = ii(a, b, c, d, word[j+8], 6, k[56]);
    d = ii(d, a, b, c, word[j+15], 10, k[57]);
    c = ii(c, d, a, b, word[j+6], 15, k[58]);
    b = ii(b, c, d, a, word[j+13], 21, k[59]);
    a = ii(a, b, c, d, word[j+4], 6, k[60]);
    d = ii(d, a, b, c, word[j+11], 10, k[61]);
    c = ii(c, d, a, b, word[j+2], 15, k[62]);
    b = ii(b, c, d, a, word[j+9], 21, k[63]);

    a = a + olda | 0;
    b = b + oldb | 0;
    c = c + oldc | 0;
    d = d + oldd | 0;
  }
  return h16(a) + h16(b) + h16(c) + h16(d);
}

function h16(n) {
  var s = "", i = 0;
  for (; i < 4; i++) {
    s += ((n >> (i * 8 + 4)) & 0x0f).toString(16) + ((n >> (i * 8)) & 0x0f).toString(16);
  }
  return s;
}

// ==========================================
// 2. 翻译引擎实现
// ==========================================

// --- Google 免费翻译 ---
async function translateGoogle(texts, from, to) {
  console.log(`[Antigravity Translate] Calling Google Free API (from: ${from}, to: ${to})`);
  // 并发限制（每次最多并行 5 个）以防滥用
  const limit = 5;
  const results = [];
  
  for (let i = 0; i < texts.length; i += limit) {
    const chunk = texts.slice(i, i + limit);
    const chunkPromises = chunk.map(async (text) => {
      if (!text.trim()) return "";
      try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data && data[0]) {
          return data[0].map(item => item[0]).join("");
        }
        return text;
      } catch (err) {
        console.error("Google single translation error:", err);
        return text; // 降级返回原文
      }
    });
    const chunkResults = await Promise.all(chunkPromises);
    results.push(...chunkResults);
  }
  return results;
}

// --- Microsoft Edge 免费翻译 ---
let edgeToken = "";
let edgeTokenExpiry = 0;

async function getEdgeToken() {
  if (edgeToken && Date.now() < edgeTokenExpiry) {
    return edgeToken;
  }
  const res = await fetch("https://edge.microsoft.com/translate/auth");
  if (!res.ok) throw new Error("获取微软 Token 失败");
  const token = await res.text();
  if (!token) throw new Error("获取到的微软 Token 为空");
  edgeToken = token;
  edgeTokenExpiry = Date.now() + 15 * 60 * 1000; // 缓存 15 分钟
  return token;
}

async function translateMicrosoft(texts, from, to) {
  const token = await getEdgeToken();
  console.log(`[Antigravity Translate] Calling Microsoft Edge Free API (from: ${from}, to: ${to})`);
  
  // 语言代码转换：微软简体中文代码为 zh-Hans，繁体为 zh-Hant
  let mTo = to;
  if (to === "zh" || to === "zh-CN") mTo = "zh-Hans";
  if (to === "zh-TW") mTo = "zh-Hant";
  let mFrom = from;
  if (from === "zh" || from === "zh-CN") mFrom = "zh-Hans";
  if (from === "zh-TW") mFrom = "zh-Hant";
  if (from === "auto") mFrom = "";

  const url = `https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&from=${mFrom}&to=${mTo}`;
  const body = texts.map(t => ({ Text: t }));
  
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`微软 API 返回状态码 ${res.status}: ${errorText}`);
  }

  const data = await res.json();
  return data.map((item, idx) => {
    if (item && item.translations && item.translations[0]) {
      return item.translations[0].text;
    }
    return texts[idx];
  });
}

// --- 百度官方 API 翻译 ---
async function translateBaidu(texts, from, to, appid, key) {
  if (!appid || !key) throw new Error("百度 AppID 或 Secret 密钥未配置");
  console.log(`[Antigravity Translate] Calling Baidu API (from: ${from}, to: ${to})`);
  
  const baiduLangMap = {
    "zh-CN": "zh",
    "zh-TW": "cht",
    "en": "en",
    "ja": "jp",
    "ko": "kor",
    "fr": "fra",
    "es": "spa",
    "ru": "ru",
    "de": "de",
    "it": "it",
    "pt": "pt",
    "vi": "vie",
    "th": "th",
    "ar": "ara"
  };
  let bTo = baiduLangMap[to] || to;
  let bFrom = baiduLangMap[from] || from;

  // 用换行符拼接批量翻译
  const q = texts.join("\n");
  const salt = Date.now().toString();
  const sign = md5(appid + q + salt + key);
  const url = "https://fanyi-api.baidu.com/api/trans/vip/translate";

  const params = new URLSearchParams({
    q,
    from: bFrom,
    to: bTo,
    appid,
    salt,
    sign
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params.toString()
  });

  if (!res.ok) throw new Error(`百度 API 返回状态码 ${res.status}`);
  const data = await res.json();

  if (data.error_code) {
    throw new Error(`百度翻译接口错误: ${data.error_msg} (错误码: ${data.error_code})`);
  }

  if (data.trans_result) {
    // 检查返回行数是否一致
    if (data.trans_result.length === texts.length) {
      return data.trans_result.map(item => item.dst);
    } else {
      // 若因排版合并造成行数不一致，则回退到串行请求（注意百度免费 QPS=1）
      console.warn("Baidu translation count mismatch, using sequential fallback...");
      const fallbackResults = [];
      for (const text of texts) {
        if (!text.trim()) {
          fallbackResults.push("");
          continue;
        }
        await new Promise(r => setTimeout(r, 1100)); // 延迟 1.1s 避免 54003 QPS 错误
        const singleSalt = Date.now().toString();
        const singleSign = md5(appid + text + singleSalt + key);
        const singleParams = new URLSearchParams({
          q: text,
          from: bFrom,
          to: bTo,
          appid,
          salt: singleSalt,
          sign: singleSign
        });
        const singleRes = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: singleParams.toString()
        });
        const singleData = await singleRes.json();
        if (singleData.trans_result) {
          fallbackResults.push(singleData.trans_result[0].dst);
        } else {
          fallbackResults.push(text);
        }
      }
      return fallbackResults;
    }
  }
  throw new Error("百度未返回有效翻译结果");
}

// --- DeepSeek API 翻译 ---
async function translateDeepSeek(texts, from, to, apiKey, apiHost, apiModel) {
  if (!apiKey) throw new Error("DeepSeek API Key 未设置");
  const host = (apiHost || "https://api.deepseek.com").replace(/\/$/, "");
  const model = apiModel || "deepseek-chat";
  
  console.log(`[Antigravity Translate] Calling DeepSeek API (${model}) for target language: ${to}`);
  
  const langMap = {
    "zh-CN": "Simplified Chinese",
    "zh-TW": "Traditional Chinese",
    "en": "English",
    "ja": "Japanese",
    "ko": "Korean",
    "fr": "French",
    "es": "Spanish",
    "de": "German",
    "ru": "Russian",
    "it": "Italian",
    "pt": "Portuguese",
    "vi": "Vietnamese",
    "th": "Thai",
    "ar": "Arabic"
  };
  const targetLangName = langMap[to] || "Simplified Chinese";

  // 构造高效率 JSON 翻译 Prompt
  const prompt = `You are a professional translator. Translate the following text segments into ${targetLangName}. Preserve the array format exactly and return ONLY a valid JSON array of strings containing the translated texts in the same order. Do not wrap the JSON in markdown code blocks like \`\`\`json. Do not add any conversational text or explanations.

Input array:
${JSON.stringify(texts)}`;

  let retries = 3;
  let delay = 2000;
  let res;
  while (retries > 0) {
    res = await fetch(`${host}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "user", content: prompt }
        ],
        temperature: 0.1
      })
    });
    
    if (res.status === 429) {
      console.warn(`[Antigravity Translate] DeepSeek API 429 Rate Limited. Retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
      retries--;
      delay *= 2;
      continue;
    }
    break;
  }

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`DeepSeek API 返回错误 ${res.status}: ${errorText}`);
  }

  const data = await res.json();
  if (!data.choices || !data.choices[0]) {
    throw new Error("DeepSeek 未返回聊天补全结果");
  }
  const content = data.choices[0].message.content.trim();

  try {
    const cleanContent = content.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    const parsed = JSON.parse(cleanContent);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (e) {
    console.error("Failed to parse DeepSeek JSON response:", content, e);
  }
  throw new Error("DeepSeek 返回的翻译格式无法解析为 JSON 数组");
}

// --- Gemini API 翻译 ---
async function translateGemini(texts, from, to, apiKey, apiHost, apiModel) {
  if (!apiKey) throw new Error("Gemini API Key 未设置");
  const host = (apiHost || "https://generativelanguage.googleapis.com").replace(/\/$/, "");
  const model = apiModel || "gemini-3.1-flash-lite";
  
  console.log(`[Antigravity Translate] Calling Gemini API (${model}) for target language: ${to}`);

  const langMap = {
    "zh-CN": "Simplified Chinese",
    "zh-TW": "Traditional Chinese",
    "en": "English",
    "ja": "Japanese",
    "ko": "Korean",
    "fr": "French",
    "es": "Spanish",
    "de": "German",
    "ru": "Russian",
    "it": "Italian",
    "pt": "Portuguese",
    "vi": "Vietnamese",
    "th": "Thai",
    "ar": "Arabic"
  };
  const targetLangName = langMap[to] || "Simplified Chinese";

  const prompt = `You are a professional translator. Translate the following text segments into ${targetLangName}. Preserve the array format exactly and return ONLY a valid JSON array of strings containing the translated texts in the same order. Do not wrap the JSON in markdown code blocks like \`\`\`json. Do not add any conversational text or explanations.

Input array:
${JSON.stringify(texts)}`;

  const url = `${host}/v1beta/models/${model}:generateContent?key=${apiKey}`;
  
  let retries = 3;
  let delay = 2000;
  let res;
  while (retries > 0) {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    if (res.status === 429) {
      console.warn(`[Antigravity Translate] Gemini API 429 Rate Limited. Retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
      retries--;
      delay *= 2;
      continue;
    }
    break;
  }

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gemini API 返回错误 ${res.status}: ${errorText}`);
  }

  const data = await res.json();
  if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts[0]) {
    throw new Error("Gemini 未返回生成结果");
  }
  
  const content = data.candidates[0].content.parts[0].text.trim();

  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (e) {
    console.error("Failed to parse Gemini JSON response:", content, e);
  }
  throw new Error("Gemini 返回的翻译格式无法解析为 JSON 数组");
}

// --- Claude API 翻译 ---
async function translateClaude(texts, from, to, apiKey, apiHost, apiModel) {
  if (!apiKey) throw new Error("Claude API Key 未设置");
  const host = (apiHost || "https://api.anthropic.com").replace(/\/$/, "");
  const model = apiModel || "claude-3-5-haiku-20241022";
  console.log(`[Antigravity Translate] Calling Claude API (${model}) for target language: ${to}`);

  // 映射目标语言名称
  const langMap = {
    "zh-CN": "Simplified Chinese",
    "zh-TW": "Traditional Chinese",
    "en": "English",
    "ja": "Japanese",
    "ko": "Korean",
    "fr": "French",
    "es": "Spanish",
    "de": "German",
    "ru": "Russian",
    "it": "Italian",
    "pt": "Portuguese",
    "vi": "Vietnamese",
    "th": "Thai",
    "ar": "Arabic"
  };
  const targetLangName = langMap[to] || "Simplified Chinese";

  const prompt = `You are a professional translator. Translate the following text segments into ${targetLangName}. Preserve the array format exactly and return ONLY a valid JSON array of strings containing the translated texts in the same order. Do not wrap the JSON in markdown code blocks like \`\`\`json. Do not add any conversational text or explanations.

Input array:
${JSON.stringify(texts)}`;

  let retries = 3;
  let delay = 2000;
  let res;
  while (retries > 0) {
    res = await fetch(`${host}/v1/messages`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 4096,
        messages: [
          { role: "user", content: prompt }
        ]
      })
    });

    if (res.status === 429) {
      console.warn(`[Antigravity Translate] Claude API 429 Rate Limited. Retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
      retries--;
      delay *= 2;
      continue;
    }
    break;
  }

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Claude API 错误 ${res.status}: ${errorText}`);
  }

  const data = await res.json();
  if (!data.content || !data.content[0] || !data.content[0].text) {
    throw new Error("Claude 未返回有效翻译结果");
  }
  
  const content = data.content[0].text.trim();

  try {
    const cleanContent = content.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    const parsed = JSON.parse(cleanContent);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (e) {
    console.error("Failed to parse Claude JSON response:", content, e);
  }
  throw new Error("Claude 返回的翻译格式无法解析为 JSON 数组");
}


// ==========================================
// 3. 核心消息传递分发
// ==========================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "translate") {
    const { texts, engine, from, to, config } = request;
    
    let translatePromise;
    
    switch (engine) {
      case "google":
        translatePromise = translateGoogle(texts, from, to);
        break;
      case "microsoft":
        translatePromise = translateMicrosoft(texts, from, to);
        break;
      case "baidu":
        translatePromise = translateBaidu(texts, from, to, config.baiduAppId, config.baiduKey);
        break;
      case "deepseek":
        translatePromise = translateDeepSeek(texts, from, to, config.deepseekApiKey, config.deepseekHost, config.deepseekModel);
        break;
      case "gemini":
        translatePromise = translateGemini(texts, from, to, config.geminiApiKey, config.geminiHost, config.geminiModel);
        break;
      case "claude":
        translatePromise = translateClaude(texts, from, to, config.claudeApiKey, config.claudeHost, config.claudeModel);
        break;
      default:
        translatePromise = Promise.reject(new Error("不支持的翻译引擎: " + engine));
    }

    translatePromise
      .then(translatedTexts => {
        sendResponse({ success: true, translatedTexts });
      })
      .catch(error => {
        console.error("Background translate error:", error);
        sendResponse({ success: false, error: error.message });
      });

    return true; // 声明异步响应
  }

  if (request.action === "testConnection") {
    const { engine, config, sourceLang, targetLang } = request;
    const from = sourceLang || "auto";
    const to = targetLang || "zh-CN";
    const testText = (to === "en") ? ["测试"] : ["Hello"];
    
    let translatePromise;
    switch (engine) {
      case "google":
        translatePromise = translateGoogle(testText, from, to);
        break;
      case "microsoft":
        translatePromise = translateMicrosoft(testText, from, to);
        break;
      case "baidu":
        translatePromise = translateBaidu(testText, from, to, config.baiduAppId, config.baiduKey);
        break;
      case "deepseek":
        translatePromise = translateDeepSeek(testText, from, to, config.deepseekApiKey, config.deepseekHost, config.deepseekModel);
        break;
      case "gemini":
        translatePromise = translateGemini(testText, from, to, config.geminiApiKey, config.geminiHost, config.geminiModel);
        break;
      case "claude":
        translatePromise = translateClaude(testText, from, to, config.claudeApiKey, config.claudeHost, config.claudeModel);
        break;
      default:
        translatePromise = Promise.reject(new Error("未知的测试引擎: " + engine));
    }

    translatePromise
      .then(translated => {
        if (translated && translated[0]) {
          sendResponse({ success: true, result: translated[0] });
        } else {
          sendResponse({ success: false, error: "未返回翻译内容" });
        }
      })
      .catch(error => {
        console.error("Test connection failed:", error);
        sendResponse({ success: false, error: error.message });
      });

    return true; // 异步响应
  }

  if (request.action === "openShortcuts") {
    chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
    sendResponse({ success: true });
    return true;
  }

  if (request.action === "updateMenu") {
    updateContextMenuTitle();
    sendResponse({ success: true });
    return true;
  }
});

// ==========================================
// 4. 右键菜单与快捷键管理
// ==========================================

const langNames = {
  "zh-CN": "简体中文", "zh-TW": "繁体中文", "en": "英语", "ja": "日语", "ko": "韩语",
  "fr": "法语", "es": "西班牙语", "de": "德语", "ru": "俄语", "it": "意大利语", "pt": "葡萄牙语",
  "vi": "越南语", "th": "泰语", "ar": "阿拉伯语", "id": "印尼语", "tr": "土耳其语", "nl": "荷兰语",
  "pl": "波兰语", "sv": "瑞典语", "da": "丹麦语", "fi": "芬兰语", "no": "挪威语", "cs": "捷克语",
  "hu": "匈牙利语", "ro": "罗马尼亚语", "el": "希腊语", "he": "希伯来语", "hi": "印地语", "uk": "乌克兰语",
  "ms": "马来语", "sk": "斯洛伐克语", "bg": "保加利亚语", "hr": "克罗地亚语", "lt": "立宛陶语", "lv": "拉脱维亚语",
  "et": "爱沙尼亚语", "sl": "斯洛文尼亚语", "fa": "波斯语", "bn": "孟加拉语", "tl": "菲律宾语", "sr": "塞尔维亚语",
  "ca": "加泰罗尼亚语", "ga": "爱尔兰语", "gl": "加利西亚语", "eu": "巴斯克语", "is": "冰岛语", "sq": "阿尔巴尼亚语",
  "mk": "马其顿语", "be": "白俄罗斯语", "hy": "亚美尼亚语", "ka": "格鲁吉亚语", "az": "阿塞拜疆语",
  "uz": "乌兹别克语", "kk": "哈萨克语", "ky": "吉尔吉斯语", "tg": "塔吉克语", "tk": "土库曼语", "mn": "蒙古语",
  "ne": "尼泊尔语", "si": "僧伽罗语", "ta": "泰米尔语", "te": "泰卢固语", "kn": "卡纳达语", "ml": "马拉雅拉姆语",
  "my": "缅甸语", "km": "高棉语", "lo": "老挝语", "mi": "毛利语", "zu": "祖鲁语", "xh": "科萨语",
  "af": "南非荷兰语", "sw": "斯瓦希里语", "cy": "威尔士语", "eo": "世界语"
};

function updateContextMenuTitle() {
  chrome.storage.local.get(['targetLang'], (res) => {
    const targetLang = res.targetLang || 'zh-CN';
    const name = langNames[targetLang] || '简体中文';
    
    chrome.commands.getAll((commands) => {
      const cmd = commands.find(c => c.name === "toggle-translate");
      const shortcutText = (cmd && cmd.shortcut) ? ` (${cmd.shortcut})` : "";
      chrome.contextMenus.update("translate-page", {
        title: `翻译为 ${name}${shortcutText}`
      }, () => {
        if (chrome.runtime.lastError) {
          console.log("Context menu update failed:", chrome.runtime.lastError.message);
        }
      });
    });
  });
}

// 初始化安装时注册右键菜单，标题根据当前目标语言生成
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "translate-page",
    title: "翻译为 简体中文",
    contexts: ["page"]
  }, () => {
    updateContextMenuTitle();
  });
});

// 监听目标语言设置变动，实时更新右键菜单的标题
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.targetLang) {
    updateContextMenuTitle();
  }
});

// 监听标签页激活与更新，以便在用户更换或刷新网页时同步最新的快捷键绑定到右键菜单
chrome.tabs.onActivated.addListener(() => {
  updateContextMenuTitle();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'complete') {
    updateContextMenuTitle();
  }
});

// 右键点击触发单页临时翻译
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "translate-page" && tab && tab.id) {
    chrome.storage.local.get(['engine', 'config', 'sourceLang', 'targetLang'], (res) => {
      const engine = res.engine || 'google';
      const config = res.config || {};
      const sourceLang = res.sourceLang || 'auto';
      const targetLang = res.targetLang || 'zh-CN';
      
      chrome.tabs.sendMessage(tab.id, {
        action: "toggleTranslation",
        isEnabled: true,
        engine: engine,
        currentConfig: config,
        sourceLang: sourceLang,
        targetLang: targetLang,
        isTempTranslation: true
      }, () => {
        if (chrome.runtime.lastError) {
          console.log("Context menu translation message delivery failed.");
        }
      });
    });
  }
});

// 快捷键触发（Alt+Z），反转全局始终自动翻译状态
chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-translate") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0] && tabs[0].id) {
        const tabId = tabs[0].id;
        
        chrome.storage.local.get(['engine', 'config', 'sourceLang', 'targetLang'], (res) => {
          const engine = res.engine || 'google';
          const config = res.config || {};
          const sourceLang = res.sourceLang || 'auto';
          const targetLang = res.targetLang || 'zh-CN';

          // 直接向 content 发送 shortcutToggle 消息，不在本地修改全局 isEnabled 标志
          chrome.tabs.sendMessage(tabId, {
            action: "shortcutToggle",
            engine: engine,
            currentConfig: config,
            sourceLang: sourceLang,
            targetLang: targetLang
          }, () => {
            if (chrome.runtime.lastError) {
              console.log("Shortcut toggle message delivery failed.");
            }
          });
        });
      }
    });
  }
});
