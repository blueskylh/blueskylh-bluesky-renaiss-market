/**
 * Jina AI Reader (r.jina.ai) 请求模块
 * 免费额度: 每分钟 20 次请求
 * 支持 HTTP 代理（可选）：设置 HTTP_PROXY_RENAISS 环境变量
 */

const RATE_LIMIT = 20; // 每分钟20次（无代理时）
const RATE_WINDOW = 60000; // 1分钟 = 60000ms
const MIN_INTERVAL = Math.ceil(RATE_WINDOW / RATE_LIMIT); // 每次请求最小间隔: 3000ms

// 代理支持（可选，使用 undici ProxyAgent 兼容 Node.js 原生 fetch）
// 有代理时跳过限速（旋转代理每请求不同IP，无需限速）
const proxyUrl = process.env.HTTP_PROXY_RENAISS || '';
let proxyDispatcher = null;
let useRateLimit = true;
if (proxyUrl) {
  try {
    const { ProxyAgent } = require('undici');
    proxyDispatcher = new ProxyAgent(proxyUrl);
    useRateLimit = false;
    console.log('[JINA] Proxy enabled (no rate limit):', proxyUrl.replace(/:\/\/.*@/, '://***@'));
  } catch (e) {
    console.log('[JINA] Proxy not available (undici not installed), running with rate limit');
  }
}

// 请求时间戳队列 - 用于跟踪实际请求时间
const requestTimestamps = [];
// 最后一次请求时间 - 用于严格间隔控制
let lastRequestTime = 0;
// 是否正在等待速率限制（防止多个请求同时计算等待时间）
let isWaitingForSlot = false;
const waitingResolvers = [];

// ========== 严格速率限制控制 ==========
// 关键修复：使用队列确保请求按顺序执行，避免并发导致的同时记录时间戳

async function acquireSlot() {
  // 有代理时跳过限速（旋转代理每请求不同IP）
  if (!useRateLimit) return;

  // 如果有人在等待，排队
  if (isWaitingForSlot) {
    await new Promise(resolve => waitingResolvers.push(resolve));
  }

  isWaitingForSlot = true;

  try {
    const now = Date.now();
    const cutoff = now - RATE_WINDOW;

    // 清理过期时间戳
    while (requestTimestamps.length > 0 && requestTimestamps[0] < cutoff) {
      requestTimestamps.shift();
    }

    // 检查是否需要等待（基于时间窗口）
    let waitTime = 0;
    if (requestTimestamps.length >= RATE_LIMIT) {
      // 窗口已满，等待最早的请求过期
      waitTime = requestTimestamps[0] + RATE_WINDOW - now;
    }

    // 同时检查最小间隔
    const timeSinceLast = now - lastRequestTime;
    const minIntervalWait = Math.max(0, MIN_INTERVAL - timeSinceLast);
    waitTime = Math.max(waitTime, minIntervalWait);

    if (waitTime > 0) {
      console.log(`[JINA] Rate limit wait: ${waitTime}ms (queue: ${requestTimestamps.length}/${RATE_LIMIT})`);
      await new Promise(resolve => setTimeout(resolve, Math.min(waitTime, 10000)));
    }

    // 记录请求时间戳
    const requestTime = Date.now();
    requestTimestamps.push(requestTime);
    lastRequestTime = requestTime;
  } finally {
    isWaitingForSlot = false;
    // 唤醒下一个等待者
    const next = waitingResolvers.shift();
    if (next) next();
  }
}

// 获取速率限制状态
function getRateLimitStatus() {
  const now = Date.now();
  const cutoff = now - RATE_WINDOW;

  // 清理过期
  while (requestTimestamps.length > 0 && requestTimestamps[0] < cutoff) {
    requestTimestamps.shift();
  }

  let nextAvailable = now;
  if (requestTimestamps.length >= RATE_LIMIT) {
    nextAvailable = requestTimestamps[0] + RATE_WINDOW;
  } else if (lastRequestTime > 0) {
    const minNext = lastRequestTime + MIN_INTERVAL;
    if (minNext > now) {
      nextAvailable = minNext;
    }
  }

  return {
    used: requestTimestamps.length,
    limit: RATE_LIMIT,
    remaining: Math.max(0, RATE_LIMIT - requestTimestamps.length),
    nextAvailable,
  };
}

// 计算需要等待的时间（用于429重试）
function getWaitTimeForRetry(retryAfterHeader) {
  if (retryAfterHeader) {
    const seconds = parseInt(retryAfterHeader, 10);
    if (!isNaN(seconds)) {
      return seconds * 1000;
    }
  }
  // 默认等待 5 秒
  return 5000;
}

// 带重试逻辑的 fetch
async function fetchWithRetry(jinaUrl, headers, timeout, signal, retries) {
  retries = retries ?? 3;
  let lastError = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    // 每次重试前都等待速率限制槽位
    if (attempt > 0) {
      console.log(`[JINA] Retry attempt ${attempt + 1}/${retries}, waiting for slot...`);
    }
    await acquireSlot();

    let controller;
    let timeoutId;

    try {
      // 创建 AbortController 仅在需要时
      if (!signal) {
        controller = new AbortController();
        timeoutId = setTimeout(() => controller.abort(), timeout);
      }

      const fetchOptions = {
        signal: signal || controller.signal,
        headers,
      };
      if (proxyDispatcher) fetchOptions.dispatcher = proxyDispatcher;

      const response = await fetch(jinaUrl, fetchOptions);

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // 处理 429 速率限制
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const waitMs = getWaitTimeForRetry(retryAfter);

        // 从时间戳队列中移除这个失败的请求记录（因为它实际上没有成功）
        requestTimestamps.pop();

        console.log(`[JINA] 429 Rate limited, server says wait ${retryAfter || '?'}s, waiting ${waitMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitMs));

        // 继续重试
        lastError = new Error(`Rate limited (429), retry after ${waitMs}ms`);
        continue;
      }

      if (!response.ok) {
        throw new Error(`Jina request failed: ${response.status}`);
      }

      return response;

    } catch (error) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      lastError = error;

      // 检查是否是超时
      if (error.name === 'AbortError') {
        console.log(`[JINA] Timeout on attempt ${attempt + 1}/${retries}`);
        // 从时间戳队列中移除失败的请求
        requestTimestamps.pop();
      } else if (error.message.includes('429')) {
        // 429 已经处理过了，继续重试
        continue;
      } else {
        // 其他错误，从队列中移除
        requestTimestamps.pop();
        throw error; // 非速率限制错误，直接抛出
      }

      // 非最后一次尝试，继续重试
      if (attempt < retries - 1) {
        const waitMs = 2000 * (attempt + 1);
        console.log(`[JINA] Will retry in ${waitMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitMs));
      }
    }
  }

  throw lastError || new Error('Jina fetch failed after retries');
}

// Fetch URL through r.jina.ai with rate limiting and retry
async function fetchJina(url, options) {
  const jinaUrl = `https://r.jina.ai/${encodeURIComponent(url)}`;
  const timeout = (options && options.timeout) || 30000;
  const retries = (options && options.retries != null) ? options.retries : 3;

  const response = await fetchWithRetry(
    jinaUrl,
    {
      'Accept': 'text/plain',
      'X-Return-Format': 'text',
    },
    timeout,
    options && options.signal,
    retries
  );

  return response.text();
}

// Fetch URL with HTML response (preserves full URLs)
async function fetchJinaHtml(url, options) {
  const jinaUrl = `https://r.jina.ai/${encodeURIComponent(url)}`;
  const timeout = (options && options.timeout) || 30000;
  const retries = (options && options.retries != null) ? options.retries : 3;

  const response = await fetchWithRetry(
    jinaUrl,
    {
      'Accept': 'text/html',
      'X-Return-Format': 'html',
      'X-Respond-With': 'html',
    },
    timeout,
    options && options.signal,
    retries
  );

  return response.text();
}

// Fetch with retry (legacy wrapper, now uses same logic)
async function fetchJinaWithRetry(url, options) {
  // fetchJina 内部已经处理了重试，直接调用即可
  return fetchJina(url, options);
}

exports.fetchJina = fetchJina;
exports.fetchJinaHtml = fetchJinaHtml;
exports.fetchJinaWithRetry = fetchJinaWithRetry;
exports.getRateLimitStatus = getRateLimitStatus;
