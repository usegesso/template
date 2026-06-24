/**
 * GitHub sign-in for the Easel editor. Reuses the shared easel-sveltia-auth relay
 * (a Cloudflare Worker) with the standard Decap/Sveltia popup handshake:
 *   1. We open the relay's /auth in a popup.
 *   2. The popup finishes OAuth and posts us `authorizing:github`.
 *   3. We ping the popup back to complete the handshake.
 *   4. The popup posts `authorization:github:success:{"token":...}`.
 * The token is kept in localStorage so the artist stays signed in.
 */

const TOKEN_KEY = 'easel_gh_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function signIn(authBaseUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const base = authBaseUrl.replace(/\/$/, '');
    const authOrigin = new URL(base).origin;
    const url =
      `${base}/auth?provider=github&scope=public_repo&site_id=${encodeURIComponent(location.host)}`;

    const w = 720;
    const h = 760;
    const left = window.screenX + (window.outerWidth - w) / 2;
    const top = window.screenY + (window.outerHeight - h) / 2;
    const popup = window.open(
      url,
      'easel-auth',
      `width=${w},height=${h},left=${left},top=${top}`,
    );
    if (!popup) {
      reject(new Error('Pop-up blocked. Please allow pop-ups and try again.'));
      return;
    }

    let done = false;
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== authOrigin) return;
      const data = e.data;
      if (typeof data !== 'string') return;

      // Step 2 → 3: the popup is ready; ping it back to receive the result.
      if (data === 'authorizing:github') {
        popup.postMessage('authorizing:github', authOrigin);
        return;
      }
      // Step 4: the result.
      if (data.startsWith('authorization:github:success:')) {
        const payload = JSON.parse(data.slice('authorization:github:success:'.length));
        finish();
        if (payload.token) {
          setToken(payload.token);
          resolve(payload.token);
        } else {
          reject(new Error('No token returned.'));
        }
      } else if (data.startsWith('authorization:github:error:')) {
        const payload = JSON.parse(data.slice('authorization:github:error:'.length));
        finish();
        reject(new Error(payload.message ?? 'Sign-in failed.'));
      }
    };

    const poll = window.setInterval(() => {
      if (popup.closed && !done) {
        finish();
        reject(new Error('Sign-in was cancelled.'));
      }
    }, 500);

    function finish() {
      done = true;
      window.clearInterval(poll);
      window.removeEventListener('message', onMessage);
      try {
        popup && popup.close();
      } catch {
        /* ignore */
      }
    }

    window.addEventListener('message', onMessage);
  });
}
