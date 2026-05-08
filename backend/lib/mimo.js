/**
 * MiMo-V2.5 视觉分析模块
 * 通过卡牌图片识别，直接推荐 SNKRDUNK/PriceCharting 搜索关键词
 * API: https://token-plan-cn.xiaomimimo.com/v1 (OpenAI 兼容)
 */

const MIMO_API_URL = process.env.MIMO_API_URL || 'https://token-plan-cn.xiaomimimo.com/v1';
const MIMO_API_KEY = process.env.MIMO_API_KEY ;
const MIMO_MODEL = process.env.MIMO_MODEL || 'mimo-v2.5';

/**
 * 分析卡牌图片，返回结构化信息 + 直接推荐搜索关键词
 * @param {string} cardName - Renaiss 卡牌名称（用于无图 fallback）
 * @param {string} frontImageUrl - 卡牌正面图 URL
 * @returns {Promise<object>} 包含卡牌信息和搜索关键词
 */

// 修复被截断的 JSON：补全未关闭的字符串、数组、对象
function repairTruncatedJson(json) {
  let s = json.trim();
  // 追踪未关闭的括号
  const stack = [];
  let inString = false;
  let escape = false;
  let lastStringEnd = -1;

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (escape) { escape = false; continue; }
    if (c === '\\' && inString) { escape = true; continue; }
    if (c === '"') {
      inString = !inString;
      if (!inString) lastStringEnd = i;
      continue;
    }
    if (inString) continue;
    if (c === '{' || c === '[') stack.push(c);
    if (c === '}' || c === ']') stack.pop();
  }

  // 补全未关闭的字符串
  if (inString) {
    // 检查是否在 snkrdunk_queries 数组内的字符串中被截断
    // 找到最后一个完整的 " 结束位置，截断到那里
    if (lastStringEnd > 0) {
      s = s.slice(0, lastStringEnd + 1);
    } else {
      s += '"';
    }
  }

  // 补全未关闭的数组和对象
  while (stack.length > 0) {
    const open = stack.pop();
    s += open === '{' ? '}' : ']';
  }

  // 清理尾部可能的逗号
  s = s.replace(/,\s*([\]}])/g, '$1');

  return s;
}

// 从损坏的 JSON 中正则提取关键字段
function extractFieldsFromBrokenJson(json) {
  const getField = (key) => {
    const m = json.match(new RegExp(`"${key}"\\s*:\\s*"([^"]*)"`));
    return m ? m[1] : '';
  };
  const result = {
    name_ja: getField('name_ja'),
    name_en: getField('name_en'),
    set_name: getField('set_name'),
    set_code: getField('set_code'),
    number: getField('number'),
    language: getField('language'),
    variant: getField('variant'),
    snkrdunk_queries: [],
    pc_queries: [],
  };
  // 提取 snkrdunk_queries 数组内的字符串
  const snkMatch = json.match(/"snkrdunk_queries"\s*:\s*\[([^\]]*)/);
  if (snkMatch) {
    const items = snkMatch[1].match(/"([^"]+)"/g);
    if (items) result.snkrdunk_queries = items.map(s => s.slice(1, -1));
  }
  const pcMatch = json.match(/"pc_queries"\s*:\s*\[([^\]]*)/);
  if (pcMatch) {
    const items = pcMatch[1].match(/"([^"]+)"/g);
    if (items) result.pc_queries = items.map(s => s.slice(1, -1));
  }
  console.log(`[MiMo] Extracted: ja="${result.name_ja}" en="${result.name_en}" set=${result.set_code} #${result.number}`);
  return result;
}

async function analyzeCardImage(cardInfo, frontImageUrl) {
  return doAnalyzeCardImage(cardInfo, frontImageUrl);
}

async function doAnalyzeCardImage(cardInfo, frontImageUrl) {
  const ci = cardInfo || {};
  const prompt = `Identify this Pokemon card. Structured data from database is provided below. Use the image to confirm and extract info NOT in the database.

=== DATABASE FIELDS (confirmed, use directly) ===
Name: "${ci.name || 'N/A'}"
Set: "${ci.setName || 'N/A'}"
Pokemon: "${ci.pokemonName || 'N/A'}"
Number: "${ci.cardNumber || 'N/A'}"
Year: ${ci.year || 'N/A'}
Language: "${ci.language || 'N/A'}"
Grade: "${ci.gradingCompany || ''} ${ci.grade || ''}".trim()
Serial: "${ci.serial || 'N/A'}"

=== YOUR TASK (extract from IMAGE only) ===
The database already has name, number, set, language, year, grade.
You ONLY need to extract from the card image:
1. name_ja: The Japanese Pokemon name printed on the card (e.g. ルージュラ, リザードンex)
2. variant: Card rarity/variant type. Look at the bottom-left or bottom-right of the card for rarity symbols:
   - CHR = Character Rare (full art, no texture)
   - SAR = Special Art Rare (textured, illustration style)
   - SR = Super Rare (gold border or texture)
   - UR = Ultra Rare
   - HR = Hyper Rare
   - RRR = Triple Rare
   - RR = Double Rare
   - R = Rare
   - C = Common
   - HOLO = Holographic (shiny surface, standard layout)
   - SECRET = Secret Rare (number exceeds set total, e.g. 071/068)
   - none = standard card
   If the card number exceeds the set total (e.g. 071/068), it's likely SECRET or CHR/SAR.

Return ONLY this JSON:
{"name_ja":"","name_en":"","set_name":"","set_code":"","number":"","language":"","variant":"","snkrdunk_queries":[],"pc_queries":[]}

For fields from database, copy them directly:
- name_en: use "${ci.pokemonName || ''}"
- number: use "${ci.cardNumber || ''}"
- language: use "${ci.language || ''}"
- set_name: use "${ci.setName || ''}"

set_code: Map the set name to set code using this verified mapping:
- "M2a-Mega Dream Ex" → M2a
- "Sv7a-Paradise Dragona" → SV7a
- "Sv-P Promo" → Sv-P
- "Sv8a-Terastal Fest Ex" → Sv8a
- "Sv2a-Pokemon 151" → SV2a
- "Sm Promo" → SM-P
- "Sv9-Battle Partners" → Sv9
- "Sv4a-Shiny Treasure Ex" → SV4a
- "Sv2d-Clay Burst" → Sv2d
- "Sv11b-Black Bolt" → Sv11b
- "25th Anniversary Collection" → S8a
For other sets, use your knowledge. SwSh format: s+N+suffix, SV format: sv+N+suffix.

snkrdunk_queries (MUST be in Japanese, include [SET NUM/TOTAL]):
- Use name_ja from image + set_code + number from database
- If variant is "none", do NOT include it in snkrdunk_queries (just use name_ja, no variant prefix)
- Example: ["ルージュラ CHR[s11a 071/068]"], ["ピカチュウ[SV-P 242]"]

pc_queries (in English):
- Use name_en + number + set_name from database
- Example: ["Jynx 071 Incandescent Arcana", "Japanese Jynx 071"]`;

  try {
    // 准备消息内容 — 直接传 URL 给 MiMo（无需 base64 转换）
    let content;
    if (frontImageUrl) {
      content = [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: frontImageUrl } },
      ];
    }

    // 无图 fallback
    if (!content) {
      console.log('[MiMo] No image, using text-based analysis');
      content = [{ type: 'text', text: `${prompt}\n\nCard info from database: ${ci.name}` }];
    }

    console.log(`[MiMo] Calling API (model=${MIMO_MODEL}, hasImage=${!!frontImageUrl})`);

    const resp = await fetch(`${MIMO_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MIMO_API_KEY}`,
      },
      body: JSON.stringify({
        model: MIMO_MODEL,
        messages: [{ role: 'user', content }],
        max_tokens: 5000,
      }),
      signal: AbortSignal.timeout(90000),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      console.log(`[MiMo] API error: ${resp.status} ${errText.slice(0, 200)}`);
      return null;
    }

    const data = await resp.json();
    let text;
    if (data.choices && data.choices[0]) {
      text = data.choices[0].message?.content;
    } else if (data.result) {
      text = typeof data.result === 'string' ? data.result : JSON.stringify(data.result);
    }

    if (!text) {
      console.log('[MiMo] Empty response content');
      console.log('[MiMo] Response keys:', JSON.stringify(Object.keys(data)));
      if (data.choices && data.choices[0]) {
        console.log('[MiMo] Choice keys:', JSON.stringify(Object.keys(data.choices[0])));
        console.log('[MiMo] Message:', JSON.stringify(data.choices[0].message).slice(0, 500));
      }
      return null;
    }

    // 解析 JSON（兼容 ```json ... ``` 包裹）
    // 贪婪匹配：从第一个 { 到最后一个 }，支持嵌套对象
    let jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log(`[MiMo] OK: ja="${parsed.name_ja}" en="${parsed.name_en}" set=${parsed.set_code} #${parsed.number}`);
        console.log(`[MiMo] SNKRDUNK queries: ${(parsed.snkrdunk_queries || []).join(' | ')}`);
        console.log(`[MiMo] PC queries: ${(parsed.pc_queries || []).join(' | ')}`);
        return parsed;
      } catch (parseErr) {
        // 截断 JSON 修复：尝试补全未关闭的字符串、数组、对象
        console.log(`[MiMo] JSON parse error: ${parseErr.message}, attempting repair...`);
        const repaired = repairTruncatedJson(jsonMatch[0]);
        if (repaired) {
          try {
            const parsed = JSON.parse(repaired);
            console.log(`[MiMo] OK (repaired): ja="${parsed.name_ja}" en="${parsed.name_en}" set=${parsed.set_code} #${parsed.number}`);
            console.log(`[MiMo] SNKRDUNK queries: ${(parsed.snkrdunk_queries || []).join(' | ')}`);
            return parsed;
          } catch {}
        }
        // 最后手段：正则提取关键字段
        console.log(`[MiMo] Repair failed, extracting fields via regex`);
        return extractFieldsFromBrokenJson(jsonMatch[0]);
      }
    }

    console.log(`[MiMo] No JSON found in response (${text.length} chars)`);
    console.log(`[MiMo] Response preview: ${text.slice(0, 300)}`);
    return null;
  } catch (e) {
    console.log(`[MiMo] Error: ${e.message}`);
    return null;
  }
}

/**
 * 从 MiMo 结果获取 SNKRDUNK 搜索词
 * SNKRDUNK 产品名格式: "Pokemon Name CardType[SET NUM/TOTAL](Set Details)"
 * 例: "Zamazenta V SAR[s12a 232/172](High Class Pack "VSTAR Universe")"
 */
function getSnkrdunkQueries(mimoResult) {
  if (!mimoResult) return [];
  const queries = [];

  // 1. 优先加入 AI 推荐的日文搜索词（含 [SET NUM] 或 [SET NUM/TOTAL]）
  if (mimoResult.snkrdunk_queries) {
    for (let q of mimoResult.snkrdunk_queries) {
      // 去掉 MiMo 误加的 "none"（variant 为 none 时会拼进搜索词）
      q = q.replace(/\s*none\s*/gi, ' ').trim();
      if (q && q.length >= 2 && /\[[^\]]*\]/.test(q)) queries.push(q);
    }
  }

  // 2. 剔除 variant（去掉 [ 前的大写字母 token，如 SAR、CHR、R）
  let len2 = queries.length;
  for (let i = 0; i < len2; i++) {
    const modified = queries[i].replace(/\s+[A-Z]{1,5}(?=\[)/, '');
    if (modified !== queries[i] && modified.length >= 2) queries.push(modified);
  }

  // 3. 只保留 variant + [SET NUM]（去掉 variant 前面的内容，如 ピカチュウ SAR[x] → SAR[x]）
  let len3 = queries.length;
  for (let i = 0; i < len3; i++) {
    const m = queries[i].match(/[A-Z]{1,5}\[/);
    if (m) {
      const stripped = queries[i].slice(queries[i].indexOf(m[0]));
      if (stripped.length >= 2) queries.push(stripped);
    }
  }

  // 4. 从已有查询中去掉 set_code 数字后的尾字母（如 SV4A → SV4，SM-P 不受影响）
  let len4 = queries.length;
  for (let i = 0; i < len4; i++) {
    const modified = queries[i].replace(/\[([A-Za-z0-9-]+)\s/g, (match, code) => {
      if (/\d[A-Za-z]$/.test(code)) {
        return `[${code.slice(0, -1)} `;
      }
      return match; // 没有数字+尾字母模式（如 SM-P），保持不变
    });
    if (modified !== queries[i]) queries.push(modified);
  }

  return [...new Set(queries)].filter(q => q.length >= 2).slice(0, 6);
}

/**
 * 从 MiMo 结果获取 PriceCharting 搜索词
 */
function getPCQueries(mimoResult) {
  if (!mimoResult) return { queries: [], language: 'Japanese' };
  // 优先使用 AI 直接推荐的搜索词
  if (mimoResult.pc_queries && mimoResult.pc_queries.length > 0) {
    return {
      queries: mimoResult.pc_queries.slice(0, 5),
      language: mimoResult.language || 'Japanese',
      variant: mimoResult.variant || '',
    };
  }
  // Fallback: 从字段拼接
  const queries = [];
  if (mimoResult.name_en && mimoResult.number && mimoResult.set_code) {
    queries.push(`${mimoResult.name_en} ${mimoResult.number} ${mimoResult.set_code}`);
  }
  if (mimoResult.name_en && mimoResult.number) {
    queries.push(`${mimoResult.name_en} ${mimoResult.number}`);
  }
  if (mimoResult.name_en) queries.push(mimoResult.name_en);
  return {
    queries: queries.slice(0, 5),
    language: mimoResult.language || 'Japanese',
    variant: mimoResult.variant || '',
  };
}

exports.analyzeCardImage = analyzeCardImage;
exports.getSnkrdunkQueries = getSnkrdunkQueries;
exports.getPCQueries = getPCQueries;
