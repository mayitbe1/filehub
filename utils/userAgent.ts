export function getAgentInfoString(userAgent: string): string {
  const browser = getBrowser(userAgent);
  const os = getOS(userAgent);
  if (browser && os) {
    return `${os} • ${browser}`;
  } else if (browser) {
    return browser;
  } else if (os) {
    return os;
  } else {
    return "Unknown";
  }
}

export function getBrowser(userAgent: string): string | null {
  if (userAgent.includes("Firefox")) {
    return "Firefox";
  } else if (userAgent.includes("Chrome")) {
    return "Chrome";
  } else if (userAgent.includes("Safari")) {
    return "Safari";
  } else if (userAgent.includes("Opera") || userAgent.includes("OPR")) {
    return "Opera";
  } else if (userAgent.includes("Edg")) {
    return "Edge";
  } else if (userAgent.includes("MSIE") || userAgent.includes("Trident")) {
    return "Internet Explorer";
  } else if (userAgent.includes("insomnia")) {
    return "Insomnia";
  } else {
    return null;
  }
}

export function getOS(userAgent: string): string | null {
  if (userAgent.includes("Win")) {
    return "Windows";
  } else if (userAgent.includes("Android")) {
    return "Android";
  } else if (userAgent.includes("Macintosh")) {
    return "macOS";
  } else if (
    userAgent.includes("iPhone") ||
    userAgent.includes("iPad") ||
    userAgent.includes("iPod")
  ) {
    return "iOS";
  } else if (userAgent.includes("X11")) {
    return "Linux";
  } else {
    return null;
  }
}

export interface UserAgentInfo {
  browserName: string;
  osName: string;
}

export function getUserAgent(): UserAgentInfo {
  if (typeof window === 'undefined') {
    return {
      browserName: 'Unknown',
      osName: 'Unknown'
    };
  }
  
  const userAgentString = window.navigator.userAgent;
  const browserName = getBrowser(userAgentString) || 'Unknown';
  const osName = getOS(userAgentString) || 'Unknown';
  
  return {
    browserName,
    osName
  };
}
