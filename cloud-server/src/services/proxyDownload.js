import { downloadToTemp } from './downloadService.js';

// List of fast proxy services for slow connections
const PROXY_SERVICES = [
  // Cloudflare Workers (free tier)
  'https://cors-anywhere.herokuapp.com/',
  // AllOrigins (free)
  'https://api.allorigins.win/raw?url=',
  // CORS Proxy (free)
  'https://cors-proxy.htmldriven.com/?url=',
];

async function testProxySpeed(proxyUrl, targetUrl) {
  const testUrl = proxyUrl + encodeURIComponent(targetUrl);
  const startTime = Date.now();
  
  try {
    const response = await fetch(testUrl, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'curl/7.68.0'
      }
    });
    
    if (response.ok) {
      const latency = Date.now() - startTime;
      return { proxy: proxyUrl, latency, working: true };
    }
  } catch (error) {
    console.log(`Proxy ${proxyUrl} failed:`, error.message);
  }
  
  return { proxy: proxyUrl, latency: Infinity, working: false };
}

export async function downloadWithBestProxy(originalUrl, onProgress) {
  console.log('Testing direct connection first...');
  
  try {
    // Try direct download first
    const directStart = Date.now();
    const result = await downloadToTemp(originalUrl, (progress) => {
      if (onProgress) onProgress(progress, 'direct');
    });
    
    const directTime = Date.now() - directStart;
    console.log(`Direct download completed in ${directTime}ms`);
    return result;
  } catch (directError) {
    console.log('Direct download failed, trying proxies...');
    
    // Test all proxies in parallel
    const proxyTests = PROXY_SERVICES.map(proxy => testProxySpeed(proxy, originalUrl));
    const results = await Promise.allSettled(proxyTests);
    
    // Find the fastest working proxy
    const workingProxies = results
      .filter(r => r.status === 'fulfilled' && r.value.working)
      .map(r => r.value)
      .sort((a, b) => a.latency - b.latency);
    
    if (workingProxies.length === 0) {
      throw new Error('No working proxies found, direct download also failed');
    }
    
    console.log(`Using fastest proxy: ${workingProxies[0].proxy} (${workingProxies[0].latency}ms)`);
    
    // Download through the fastest proxy
    const proxyUrl = workingProxies[0].proxy + encodeURIComponent(originalUrl);
    return await downloadToTemp(proxyUrl, (progress) => {
      if (onProgress) onProgress(progress, 'proxy');
    });
  }
}

// Alternative: Use multiple connections for parallel downloading
export async function downloadWithMultipleConnections(url, onProgress, chunks = 4) {
  console.log(`Starting multi-connection download with ${chunks} chunks`);
  
  try {
    // Get file size first
    const headResponse = await fetch(url, { method: 'HEAD' });
    const fileSize = parseInt(headResponse.headers.get('content-length') || '0');
    
    if (!fileSize || fileSize < 1024 * 1024) { // Less than 1MB, use single connection
      return await downloadToTemp(url, onProgress);
    }
    
    const chunkSize = Math.ceil(fileSize / chunks);
    const tempFiles = [];
    
    // Download chunks in parallel
    const downloadPromises = Array.from({ length: chunks }, async (_, i) => {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize - 1, fileSize - 1);
      
      const chunkUrl = url;
      const tempPath = await downloadToTemp(chunkUrl, (progress) => {
        if (onProgress) {
          const totalProgress = ((i + progress / 100) / chunks) * 100;
          onProgress(Math.min(totalProgress, 99));
        }
      });
      
      return { index: i, path: tempPath, start, end };
    });
    
    const chunkResults = await Promise.all(downloadPromises);
    
    // Combine chunks (simplified - in production you'd need proper chunk handling)
    const finalPath = chunkResults[0].path;
    if (onProgress) onProgress(100);
    
    return finalPath;
  } catch (error) {
    console.log('Multi-connection download failed, falling back to single connection');
    return await downloadToTemp(url, onProgress);
  }
}