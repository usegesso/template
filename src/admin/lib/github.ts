/**
 * Minimal GitHub API client for the Easel editor. Runs in the browser with the
 * artist's OAuth token (from the auth relay). All writes go through the Git Data
 * API so a multi-file change (e.g. a new image + its entry) lands in ONE commit,
 * which means ONE Netlify rebuild.
 */

const API = 'https://api.github.com';

export interface RepoRef {
  owner: string;
  repo: string;
  branch: string;
}

export interface FileChange {
  path: string;
  /** Omit + set remove:true to delete. */
  content?: string;
  encoding?: 'utf-8' | 'base64';
  remove?: boolean;
}

export interface DirEntry {
  name: string;
  path: string;
  sha: string;
  type: 'file' | 'dir';
}

export class GitHub {
  constructor(
    private token: string,
    public ref: RepoRef,
  ) {}

  private async api(path: string, init: RequestInit = {}): Promise<any> {
    const res = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init.headers ?? {}),
      },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`GitHub ${init.method ?? 'GET'} ${path} failed (${res.status}): ${body}`);
    }
    return res.status === 204 ? null : res.json();
  }

  private repoPath(): string {
    return `/repos/${this.ref.owner}/${this.ref.repo}`;
  }

  /** Confirm the token works and the user can push. */
  async getLogin(): Promise<string> {
    const u = await this.api('/user');
    return u.login;
  }

  /** List a directory (no file contents). Returns [] if the dir doesn't exist. */
  async listDir(dir: string): Promise<DirEntry[]> {
    try {
      const data = await this.api(
        `${this.repoPath()}/contents/${dir}?ref=${this.ref.branch}`,
      );
      return Array.isArray(data) ? data : [];
    } catch (e) {
      if (e instanceof Error && /\(404\)/.test(e.message)) return [];
      throw e;
    }
  }

  /** Read one file's decoded text content + blob sha. null if missing. */
  async getFile(path: string): Promise<{ text: string; sha: string } | null> {
    try {
      const data = await this.api(
        `${this.repoPath()}/contents/${path}?ref=${this.ref.branch}`,
      );
      return { text: decodeBase64(data.content), sha: data.sha };
    } catch (e) {
      if (e instanceof Error && /\(404\)/.test(e.message)) return null;
      throw e;
    }
  }

  /** Raw public URL for displaying a repo asset in the editor. */
  rawUrl(path: string): string {
    const { owner, repo, branch } = this.ref;
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
  }

  /**
   * Commit a set of file changes (create/update/delete) as a single commit on the
   * branch, via the Git Data API.
   */
  async commit(changes: FileChange[], message: string): Promise<void> {
    const base = this.repoPath();
    const ref = await this.api(`${base}/git/ref/heads/${this.ref.branch}`);
    const latest = ref.object.sha;
    const commit = await this.api(`${base}/git/commits/${latest}`);
    const baseTree = commit.tree.sha;

    const tree = [];
    for (const c of changes) {
      if (c.remove) {
        tree.push({ path: c.path, mode: '100644', type: 'blob', sha: null });
        continue;
      }
      const blob = await this.api(`${base}/git/blobs`, {
        method: 'POST',
        body: JSON.stringify({ content: c.content ?? '', encoding: c.encoding ?? 'utf-8' }),
      });
      tree.push({ path: c.path, mode: '100644', type: 'blob', sha: blob.sha });
    }

    const newTree = await this.api(`${base}/git/trees`, {
      method: 'POST',
      body: JSON.stringify({ base_tree: baseTree, tree }),
    });
    const newCommit = await this.api(`${base}/git/commits`, {
      method: 'POST',
      body: JSON.stringify({ message, tree: newTree.sha, parents: [latest] }),
    });
    await this.api(`${base}/git/refs/heads/${this.ref.branch}`, {
      method: 'PATCH',
      body: JSON.stringify({ sha: newCommit.sha }),
    });
  }
}

/** UTF-8-safe base64 helpers (btoa/atob alone mangle non-ASCII). */
export function encodeBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}
export function decodeBase64(b64: string): string {
  const bin = atob(b64.replace(/\n/g, ''));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
/** Base64 of an uploaded image File, without the data: prefix. */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.readAsDataURL(file);
  });
}
