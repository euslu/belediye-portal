const { isIP } = require('net');

function parseBoolean(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return null;
}

function extractHostname(raw) {
  if (!raw) return null;
  try {
    return new URL(raw).hostname;
  } catch {
    return raw;
  }
}

function isPrivateHostname(hostname) {
  if (!hostname) return false;
  if (hostname === 'localhost') return true;
  if (hostname.endsWith('.local') || hostname.endsWith('.lcl')) return true;

  if (!isIP(hostname)) return false;

  if (hostname.startsWith('10.')) return true;
  if (hostname.startsWith('192.168.')) return true;

  const match = hostname.match(/^172\.(\d+)\./);
  if (match) {
    const secondOctet = Number(match[1]);
    return secondOctet >= 16 && secondOctet <= 31;
  }

  return false;
}

function shouldAllowInsecureTls(serviceName, rawHostOrUrl, trustedHosts = []) {
  const envValue = parseBoolean(process.env[`${serviceName}_INSECURE_TLS`]);
  if (envValue !== null) return envValue;

  const hostname = extractHostname(rawHostOrUrl);
  if (!hostname) return false;

  if (trustedHosts.includes(hostname)) return true;
  return isPrivateHostname(hostname);
}

function getTlsOptions(serviceName, rawHostOrUrl, trustedHosts = []) {
  const allowInsecure = shouldAllowInsecureTls(serviceName, rawHostOrUrl, trustedHosts);
  return { rejectUnauthorized: !allowInsecure };
}

module.exports = {
  getTlsOptions,
  shouldAllowInsecureTls,
};
