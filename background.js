// Immersive Translate Core - Background Service Worker

let translationCache = {};
chrome.storage.local.get(['translationCache'], (res) => {
  translationCache = res.translationCache || {};
});

// ==========================================
// 1. 纯 JS MD5 算法（供百度翻译签名使用）
// ==========================================
function md5(string) {
  function RotateLeft(lValue, iShiftBits) {
    return (lValue<<iShiftBits) | (lValue>>>(32-iShiftBits));
  }
  function AddUnsigned(lX,lY) {
    var lX4,lY4,lX8,lY8,lResult;
    lX8 = (lX & 0x80000000);
    lY8 = (lY & 0x80000000);
    lX4 = (lX & 0x40000000);
    lY4 = (lY & 0x40000000);
    lResult = (lX & 0x3FFFFFFF)+(lY & 0x3FFFFFFF);
    if (lX4 & lY4) {
      return (lResult ^ 0x80000000 ^ lX8 ^ lY8);
    }
    if (lX4 | lY4) {
      if (lResult & 0x40000000) {
        return (lResult ^ 0xC0000000 ^ lX8 ^ lY8);
      } else {
        return (lResult ^ 0x40000000 ^ lX8 ^ lY8);
      }
    } else {
      return (lResult ^ lX8 ^ lY8);
    }
  }
  function F(x,y,z) { return (x & y) | ((~x) & z); }
  function G(x,y,z) { return (x & z) | (y & (~z)); }
  function H(x,y,z) { return (x ^ y ^ z); }
  function I(x,y,z) { return (y ^ (x | (~z))); }
  function FF(a,b,c,d,x,s,ac) {
    a = AddUnsigned(a, AddUnsigned(AddUnsigned(F(b,c,d), x), ac));
    return AddUnsigned(RotateLeft(a, s), b);
  };
  function GG(a,b,c,d,x,s,ac) {
    a = AddUnsigned(a, AddUnsigned(AddUnsigned(G(b,c,d), x), ac));
    return AddUnsigned(RotateLeft(a, s), b);
  };
  function HH(a,b,c,d,x,s,ac) {
    a = AddUnsigned(a, AddUnsigned(AddUnsigned(H(b,c,d), x), ac));
    return AddUnsigned(RotateLeft(a, s), b);
  };
  function II(a,b,c,d,x,s,ac) {
    a = AddUnsigned(a, AddUnsigned(AddUnsigned(I(b,c,d), x), ac));
    return AddUnsigned(RotateLeft(a, s), b);
  };
  function ConvertToWordArray(string) {
    var lWordCount;
    var lMessageLength = string.length;
    var lNumberOfWords_temp1=lMessageLength + 8;
    var lNumberOfWords_temp2=(lNumberOfWords_temp1-(lNumberOfWords_temp1 % 64))/64;
    var lNumberOfWords = (lNumberOfWords_temp2+1)*16;
    var lWordArray=Array(lNumberOfWords);
    var lBytePosition = 0;
    var lByteCount = 0;
    while ( lByteCount < lMessageLength ) {
      lWordCount = (lByteCount - (lByteCount % 4))/4;
      lBytePosition = (lByteCount % 4)*8;
      lWordArray[lWordCount] = (lWordArray[lWordCount] | (string.charCodeAt(lByteCount)<<lBytePosition));
      lByteCount++;
    }
    lWordCount = (lByteCount - (lByteCount % 4))/4;
    lBytePosition = (lByteCount % 4)*8;
    lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80<<lBytePosition);
    lWordArray[lNumberOfWords-2] = lMessageLength<<3;
    lWordArray[lNumberOfWords-1] = lMessageLength>>>29;
    return lWordArray;
  };
  function WordToHex(lValue) {
    var WordToHexValue="",WordToHexValue_temp="",lByte,lCount;
    for (lCount = 0;lCount<=3;lCount++) {
      lByte = (lValue>>>(lCount*8)) & 255;
      WordToHexValue_temp = "0" + lByte.toString(16);
      WordToHexValue = WordToHexValue + WordToHexValue_temp.substr(WordToHexValue_temp.length-2,2);
    }
    return WordToHexValue;
  };
  function Utf8Encode(string) {
    return unescape(encodeURIComponent(string));
  };
  var x=Array();
  var k,S11=7, S12=12, S13=17, S14=22;
  var S21=5, S22=9 , S23=14, S24=20;
  var S31=4, S32=11, S33=16, S34=23;
  var S41=6, S42=10, S43=15, S44=21;
  string = Utf8Encode(string);
  x = ConvertToWordArray(string);
  var a = 0x67452301; var b = 0xEFCDAB89; var c = 0x98BADCFE; var d = 0x10325476;
  for (k=0;k<x.length;k+=16) {
    var AA=a; var BB=b; var CC=c; var DD=d;
    a=FF(a,b,c,d,x[k+0], S11,0xD76AA478);
    d=FF(d,a,b,c,x[k+1], S12,0xE8C7B756);
    c=FF(c,d,a,b,x[k+2], S13,0x242070DB);
    b=FF(b,c,d,a,x[k+3], S14,0xC1BDCEEE);
    a=FF(a,b,c,d,x[k+4], S11,0xF57C0FAF);
    d=FF(d,a,b,c,x[k+5], S12,0x4787C62A);
    c=FF(c,d,a,b,x[k+6], S13,0xA8304613);
    b=FF(b,c,d,a,x[k+7], S14,0xFD469501);
    a=FF(a,b,c,d,x[k+8], S11,0x698098D8);
    d=FF(d,a,b,c,x[k+9], S12,0x8B44F7AF);
    c=FF(c,d,a,b,x[k+10],S13,0xFFFF5BB1);
    b=FF(b,c,d,a,x[k+11],S14,0x895CD7BE);
    a=FF(a,b,c,d,x[k+12],S11,0x6B901122);
    d=FF(d,a,b,c,x[k+13],S12,0xFD987193);
    c=FF(c,d,a,b,x[k+14],S13,0xA679438E);
    b=FF(b,c,d,a,x[k+15],S14,0x49B40821);
    a=GG(a,b,c,d,x[k+1], S21,0xF61E2562);
    d=GG(d,a,b,c,x[k+6], S22,0xC040B340);
    c=GG(c,d,a,b,x[k+11],S23,0x265E5A51);
    b=GG(b,c,d,a,x[k+0], S24,0xE9B6C7AA);
    a=GG(a,b,c,d,x[k+5], S21,0xD62F105D);
    d=GG(d,a,b,c,x[k+10],S22,0x2441453);
    c=GG(c,d,a,b,x[k+15],S23,0xD8A1E681);
    b=GG(b,c,d,a,x[k+4], S24,0xE7D3FBC8);
    a=GG(a,b,c,d,x[k+9], S21,0x21E1CDE6);
    d=GG(d,a,b,c,x[k+14],S22,0xC33707D6);
    c=GG(c,d,a,b,x[k+3], S23,0xF4D50D87);
    b=GG(b,c,d,a,x[k+8], S24,0x455A14ED);
    a=GG(a,b,c,d,x[k+13],S21,0xA9E3E905);
    d=GG(d,a,b,c,x[k+2], S22,0xFCEFA3F8);
    c=GG(c,d,a,b,x[k+7], S23,0x676F02D9);
    b=GG(b,c,d,a,x[k+12],S24,0x8D2A4C8A);
    a=HH(a,b,c,d,x[k+5], S31,0xFFFA3942);
    d=HH(d,a,b,c,x[k+8], S32,0x8771F681);
    c=HH(c,d,a,b,x[k+11],S33,0x6D9D6122);
    b=HH(b,c,d,a,x[k+14],S34,0xFDE5380C);
    a=HH(a,b,c,d,x[k+1], S31,0xA4BEEA44);
    d=HH(d,a,b,c,x[k+4], S32,0x4BDECFA9);
    c=HH(c,d,a,b,x[k+7], S33,0xF6BB4B60);
    b=HH(b,c,d,a,x[k+10],S34,0xBEBFBC70);
    a=HH(a,b,c,d,x[k+13],S31,0x289B7EC6);
    d=HH(d,a,b,c,x[k+0], S32,0xEAA127FA);
    c=HH(c,d,a,b,x[k+3], S33,0xD4EF3085);
    b=HH(b,c,d,a,x[k+6], S34,0x4881D05);
    a=HH(a,b,c,d,x[k+9], S31,0xD9D4D039);
    d=HH(d,a,b,c,x[k+12],S32,0xE6DB99E5);
    c=HH(c,d,a,b,x[k+15],S33,0x1FA27CF8);
    b=HH(b,c,d,a,x[k+2], S34,0xC4AC5665);
    a=II(a,b,c,d,x[k+0], S41,0xF4292244);
    d=II(d,a,b,c,x[k+7], S42,0x432AFF97);
    c=II(c,d,a,b,x[k+14],S43,0xAB9423A7);
    b=II(b,c,d,a,x[k+5], S44,0xFC93A039);
    a=II(a,b,c,d,x[k+12],S41,0x655B59C3);
    d=II(d,a,b,c,x[k+3], S42,0x8F0CCC92);
    c=II(c,d,a,b,x[k+10],S43,0xFFEFF47D);
    b=II(b,c,d,a,x[k+1], S44,0x85845DD1);
    a=II(a,b,c,d,x[k+8], S41,0x6FA87E4F);
    d=II(d,a,b,c,x[k+15],S42,0xFE2CE6E0);
    c=II(c,d,a,b,x[k+6], S43,0xA3014314);
    b=II(b,c,d,a,x[k+13],S44,0x4E0811A1);
    a=II(a,b,c,d,x[k+4], S41,0xF7537E82);
    d=II(d,a,b,c,x[k+11],S42,0xBD3AF235);
    c=II(c,d,a,b,x[k+2], S43,0x2AD7D2BB);
    b=II(b,c,d,a,x[k+9], S44,0xEB86D391);
    a=AddUnsigned(a,AA); b=AddUnsigned(b,BB); c=AddUnsigned(c,CC); d=AddUnsigned(d,DD);
  }
  var temp = WordToHex(a)+WordToHex(b)+WordToHex(c)+WordToHex(d);
  return temp.toLowerCase();
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

// 全局百度限速串行队列锁
let baiduLock = Promise.resolve();

// 内部核心带 54003 重试的百度 API 请求方法
async function translateBaiduLocked(texts, from, to, appid, key) {
  if (!appid || !key) throw new Error("百度 AppID 或 Secret 密钥未配置");
  
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

  const url = "https://fanyi-api.baidu.com/api/trans/vip/translate";
  
  // 执行带有 54003 限速超限重试的请求方法
  async function performRequest(queryTexts) {
    const q = queryTexts.join("\n").replace(/\r?\n/g, "\r\n");
    let retries = 3;
    let delay = 1500;
    
    while (retries > 0) {
      const salt = Date.now().toString();
      const sign = md5(appid + q + salt + key);
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
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString()
      });
      
      if (!res.ok) {
        throw new Error(`百度 API HTTP 错误 ${res.status}`);
      }
      
      const data = await res.json();
      if (data.error_code) {
        const errCode = parseInt(data.error_code, 10);
        if (errCode === 54003) {
          console.warn(`[Antigravity Translate] Baidu API 54003 Rate Limited. Retrying in ${delay}ms...`);
          await new Promise(r => setTimeout(r, delay));
          retries--;
          delay += 1000;
          continue;
        }
        throw new Error(`百度翻译接口错误: ${data.error_msg} (错误码: ${data.error_code})`);
      }
      
      return data;
    }
    throw new Error("百度翻译接口 54003 频限重试次数耗尽");
  }

  // 1. 发起批量翻译
  const data = await performRequest(texts);
  
  if (data.trans_result) {
    if (data.trans_result.length === texts.length) {
      return data.trans_result.map(item => item.dst);
    } else {
      // 2. 行数不匹配回退到逐句串行请求
      console.warn("Baidu translation count mismatch, using sequential fallback...");
      const fallbackResults = [];
      for (const text of texts) {
        if (!text.trim()) {
          fallbackResults.push("");
          continue;
        }
        // 逐句请求本身也要受到 54003 的校验和排队保护，所以用 performRequest 包裹，并等待冷却
        await new Promise(r => setTimeout(r, 1100));
        const singleData = await performRequest([text]);
        if (singleData.trans_result && singleData.trans_result[0]) {
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

// --- 百度官方 API 翻译 ---
async function translateBaidu(texts, from, to, appid, key) {
  const result = await new Promise((resolve, reject) => {
    baiduLock = baiduLock.then(async () => {
      try {
        console.log(`[Antigravity Translate] Baidu Request Queue Running (texts: ${texts.length})`);
        const res = await translateBaiduLocked(texts, from, to, appid, key);
        resolve(res);
      } catch (err) {
        reject(err);
      }
      // 每次百度 API 任务执行完，强制空闲等待 1100 毫秒
      await new Promise(r => setTimeout(r, 1100));
    });
  });
  return result;
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
    
    // O(1) 预查本地缓存
    const cachedResults = [];
    const uncachedIndices = [];
    const uncachedTexts = [];
    
    texts.forEach((text, idx) => {
      const cacheKey = `${engine}_${to}_${text}`;
      if (translationCache[cacheKey]) {
        cachedResults[idx] = translationCache[cacheKey];
      } else {
        uncachedIndices.push(idx);
        uncachedTexts.push(text);
      }
    });

    // 如果全部命中缓存，无须向翻译引擎发请求，直接返回
    if (uncachedTexts.length === 0) {
      console.log(`[Antigravity Translate] All ${texts.length} segments hit local cache (O(1)). 0 API requests consumed.`);
      sendResponse({ success: true, translatedTexts: cachedResults });
      return true;
    }

    // 打印部分命中缓存情况，透明显现节省了多少 API 额度
    if (cachedResults.filter(Boolean).length > 0) {
      console.log(`[Antigravity Translate] Cache hit: ${cachedResults.filter(Boolean).length}/${texts.length} segments retrieved from local cache. Consuming API for remaining ${uncachedTexts.length} segments.`);
    }

    let translatePromise;
    switch (engine) {
      case "google":
        translatePromise = translateGoogle(uncachedTexts, from, to);
        break;
      case "microsoft":
        translatePromise = translateMicrosoft(uncachedTexts, from, to);
        break;
      case "baidu":
        translatePromise = translateBaidu(uncachedTexts, from, to, config.baiduAppId, config.baiduKey);
        break;
      case "deepseek":
        translatePromise = translateDeepSeek(uncachedTexts, from, to, config.deepseekApiKey, config.deepseekHost, config.deepseekModel);
        break;
      case "gemini":
        translatePromise = translateGemini(uncachedTexts, from, to, config.geminiApiKey, config.geminiHost, config.geminiModel);
        break;
      case "claude":
        translatePromise = translateClaude(uncachedTexts, from, to, config.claudeApiKey, config.claudeHost, config.claudeModel);
        break;
      default:
        translatePromise = Promise.reject(new Error("不支持的翻译引擎: " + engine));
    }

    translatePromise
      .then(translatedTexts => {
        // 校验返回行数是否匹配
        if (translatedTexts.length !== uncachedTexts.length) {
          throw new Error("翻译服务返回结果数量与请求数量不符");
        }

        // 回填未缓存的译文，并写入本地缓存
        translatedTexts.forEach((translated, subIdx) => {
          const originalIdx = uncachedIndices[subIdx];
          const originalText = uncachedTexts[subIdx];
          cachedResults[originalIdx] = translated;

          const cacheKey = `${engine}_${to}_${originalText}`;
          translationCache[cacheKey] = translated;
        });

        // 缓存上限控制（例如 4000 条），超出时淘汰一部分以防 local storage 溢出
        const keys = Object.keys(translationCache);
        if (keys.length > 4000) {
          for (let j = 0; j < 1500; j++) {
            delete translationCache[keys[j]];
          }
        }

        // 异步存回 storage
        chrome.storage.local.set({ translationCache });

        sendResponse({ success: true, translatedTexts: cachedResults });
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

  if (request.action === "clearCache") {
    translationCache = {};
    chrome.storage.local.remove(['translationCache'], () => {
      console.log("[Antigravity Translate] Translation cache cleared successfully.");
      sendResponse({ success: true });
    });
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
