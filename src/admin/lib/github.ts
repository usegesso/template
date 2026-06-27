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

export interface TreeEntry {
  path: string;
  sha: string;
  type: 'blob' | 'tree' | 'commit';
  mode: string;
}

/** What we last wrote to a path this session (the session working tree). */
interface OverlayEntry {
  content?: string;
  encoding?: 'utf-8' | 'base64';
  removed?: boolean;
}

export class GitHub {
  constructor(
    private token: string,
    public ref: RepoRef,
  ) {}

  /**
   * Session working tree. GitHub's read endpoints (contents API, raw CDN) lag
   * behind a just-pushed commit by seconds-to-a-minute — about the deploy window
   * — so re-reading a file we just wrote can return its PRE-write content. That
   * makes a save→edit→save burst merge edit 2 onto a stale snapshot of edit 1 and
   * silently drop edit 1 (a lost update; the git history stays linear, the artist
   * just sees their change vanish). The overlay records every successful write and
   * is served ahead of the network on reads, so the editor is read-after-write
   * consistent regardless of CDN lag. Only the artist edits this repo, so the
   * overlay can't go stale under us.
   */
  private overlay = new Map<string, OverlayEntry>();

  /**
   * Commits run one-at-a-time through this chain. Two rapid saves would otherwise
   * interleave their read-HEAD / write-ref steps; serializing also guarantees each
   * commit's overlay update lands before the next commit reads HEAD.
   */
  private commitChain: Promise<unknown> = Promise.resolve();

  /** SHA of the last commit this client pushed — what deploy status is polled for. */
  lastCommitSha: string | null = null;

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

  /**
   * True if GitHub Pages is enabled for this repo. The Pages REST endpoint 404s when
   * Pages was never turned on (i.e. a Netlify-hosted site), so a thrown error ⇒ false.
   * Used by the updater to decide whether to restore a missing Pages deploy workflow.
   */
  async pagesEnabled(): Promise<boolean> {
    try {
      await this.api(`${this.repoPath()}/pages`);
      return true;
    } catch {
      return false;
    }
  }

  /** List a directory (no file contents). Returns [] if the dir doesn't exist. */
  async listDir(dir: string): Promise<DirEntry[]> {
    let live: DirEntry[] = [];
    try {
      const data = await this.api(
        `${this.repoPath()}/contents/${dir}?ref=${this.ref.branch}`,
      );
      live = Array.isArray(data) ? data : [];
    } catch (e) {
      if (!(e instanceof Error && /\(404\)/.test(e.message))) throw e;
    }
    return this.applyOverlayToDir(dir, live);
  }

  /** Reconcile a live directory listing with the session working tree. */
  private applyOverlayToDir(dir: string, live: DirEntry[]): DirEntry[] {
    const byPath = new Map(live.map((e) => [e.path, e]));
    const prefix = `${dir}/`;
    for (const [path, ov] of this.overlay) {
      if (!path.startsWith(prefix)) continue;
      const name = path.slice(prefix.length);
      if (name.includes('/')) continue; // listDir is non-recursive — direct children only
      if (ov.removed) byPath.delete(path);
      else if (!byPath.has(path)) byPath.set(path, { name, path, sha: 'overlay', type: 'file' });
    }
    return [...byPath.values()];
  }

  /** Read one file's decoded text content + blob sha. null if missing. */
  async getFile(path: string): Promise<{ text: string; sha: string } | null> {
    // Serve our own writes from the working tree — the network read may still be
    // stale. Only text (utf-8) entries; binary (base64, e.g. images) is never read
    // back through here, so let those fall through to the network.
    const ov = this.overlay.get(path);
    if (ov && (ov.removed || ov.encoding !== 'base64')) {
      return ov.removed ? null : { text: ov.content ?? '', sha: 'overlay' };
    }
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

  /**
   * Read a UTF-8 file from any repo (defaults to this one) via the contents API.
   * Returns null if the file is missing. Used by the update check to read the
   * upstream template's package.json + CHANGELOG.
   */
  async getFileFrom(over: RepoRef, path: string): Promise<string | null> {
    try {
      const data = await this.api(
        `/repos/${over.owner}/${over.repo}/contents/${path}?ref=${over.branch}`,
      );
      return decodeBase64(data.content);
    } catch (e) {
      if (e instanceof Error && /\(404\)/.test(e.message)) return null;
      throw e;
    }
  }

  /** Resolve a branch to its root tree SHA (defaults to this.ref). */
  private async treeShaForRef(over?: Partial<RepoRef>): Promise<string> {
    const owner = over?.owner ?? this.ref.owner;
    const repo = over?.repo ?? this.ref.repo;
    const branch = over?.branch ?? this.ref.branch;
    const ref = await this.api(`/repos/${owner}/${repo}/git/ref/heads/${branch}`);
    const commit = await this.api(`/repos/${owner}/${repo}/git/commits/${ref.object.sha}`);
    return commit.tree.sha;
  }

  /**
   * Every blob (path + content-addressed sha) under a ref, recursively. Defaults to
   * this.ref. Trees/submodules are filtered out — only files. The site-update merge
   * compares these blob shas across the artist repo and the upstream template.
   */
  async treeRecursive(over?: Partial<RepoRef>): Promise<TreeEntry[]> {
    const owner = over?.owner ?? this.ref.owner;
    const repo = over?.repo ?? this.ref.repo;
    const treeSha = await this.treeShaForRef(over);
    const data = await this.api(`/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`);
    const tree: TreeEntry[] = Array.isArray(data.tree) ? data.tree : [];
    return tree.filter((t) => t.type === 'blob');
  }

  /** A blob's base64 content (newlines stripped), from any repo. */
  async getBlobBase64(sha: string, over?: Partial<RepoRef>): Promise<string> {
    const owner = over?.owner ?? this.ref.owner;
    const repo = over?.repo ?? this.ref.repo;
    const data = await this.api(`/repos/${owner}/${repo}/git/blobs/${sha}`);
    return (data.content as string).replace(/\n/g, '');
  }

  /** Raw public URL for displaying a repo asset in the editor. */
  rawUrl(path: string): string {
    const { owner, repo, branch } = this.ref;
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
  }

  // ---------- Version history (G2) ----------

  /** Recent commits on the branch — the raw material for the editor's History view. */
  async listCommits(perPage = 25): Promise<{ sha: string; message: string; date: string }[]> {
    const data = await this.api(`${this.repoPath()}/commits?sha=${this.ref.branch}&per_page=${perPage}`);
    if (!Array.isArray(data)) return [];
    return data.map((c: any) => ({
      sha: c.sha,
      message: String(c.commit?.message ?? '').split('\n')[0],
      date: c.commit?.author?.date ?? c.commit?.committer?.date ?? '',
    }));
  }

  /** Every blob under the tree of a specific commit sha (not a branch). */
  private async treeAtCommit(sha: string): Promise<TreeEntry[]> {
    const base = this.repoPath();
    const commit = await this.api(`${base}/git/commits/${sha}`);
    const data = await this.api(`${base}/git/trees/${commit.tree.sha}?recursive=1`);
    const tree: TreeEntry[] = Array.isArray(data.tree) ? data.tree : [];
    return tree.filter((t) => t.type === 'blob');
  }

  /**
   * Roll the artist's content back to how it stood at `sha`, as a NEW commit on
   * top of the current tip (never a force-push, so nothing is lost — the rollback
   * is itself an entry in the history). Only artist content is touched
   * (src/content, src/assets, public/assets); template code and the deploy
   * workflow are left alone. Builds the tree from the old blobs' shas directly, so
   * no file contents are re-uploaded. Returns the number of files changed.
   */
  async restoreContentTo(sha: string, message: string): Promise<number> {
    const PREFIXES = ['src/content/', 'src/assets/', 'public/assets/'];
    const inScope = (p: string) => PREFIXES.some((x) => p.startsWith(x));
    const [atSha, atHead] = await Promise.all([this.treeAtCommit(sha), this.treeRecursive()]);

    const want = new Map<string, string>(); // path -> blob sha as it was at `sha`
    for (const t of atSha) if (inScope(t.path)) want.set(t.path, t.sha);
    const have = new Map<string, string>(); // path -> blob sha now
    for (const t of atHead) if (inScope(t.path)) have.set(t.path, t.sha);

    const tree: any[] = [];
    for (const [path, blobSha] of want) {
      if (have.get(path) !== blobSha) tree.push({ path, mode: '100644', type: 'blob', sha: blobSha });
    }
    for (const path of have.keys()) {
      if (!want.has(path)) tree.push({ path, mode: '100644', type: 'blob', sha: null });
    }
    if (!tree.length) return 0;

    const run = this.commitChain.then(() => this._pushTree(tree, message));
    this.commitChain = run.catch(() => {});
    await run;
    // Restored blobs are written by sha, so we can't seed the overlay with content;
    // drop any stale overlay entries for touched paths so later reads hit the network.
    for (const e of tree) this.overlay.delete(e.path);
    return tree.length;
  }

  /** Push a prebuilt git tree (entries already carry blob shas) as one commit. */
  private async _pushTree(treeEntries: any[], message: string): Promise<void> {
    const base = this.repoPath();
    let lastErr: unknown;
    for (let attempt = 0; attempt < 5; attempt++) {
      const ref = await this.api(`${base}/git/ref/heads/${this.ref.branch}`);
      const latest = ref.object.sha;
      const headCommit = await this.api(`${base}/git/commits/${latest}`);
      const newTree = await this.api(`${base}/git/trees`, {
        method: 'POST',
        body: JSON.stringify({ base_tree: headCommit.tree.sha, tree: treeEntries }),
      });
      const newCommit = await this.api(`${base}/git/commits`, {
        method: 'POST',
        body: JSON.stringify({ message, tree: newTree.sha, parents: [latest] }),
      });
      try {
        await this.api(`${base}/git/refs/heads/${this.ref.branch}`, {
          method: 'PATCH',
          body: JSON.stringify({ sha: newCommit.sha }),
        });
        this.lastCommitSha = newCommit.sha;
        return;
      } catch (e) {
        lastErr = e;
        if (e instanceof Error && /\(422\)/.test(e.message) && /fast forward/i.test(e.message)) {
          await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
          continue;
        }
        throw e;
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error('restore failed: branch kept moving');
  }

  /**
   * Commit a set of file changes (create/update/delete) as a single commit on the
   * branch, via the Git Data API.
   *
   * The branch tip can move between reading it and updating it — GitHub has
   * read-after-write lag on refs, and two saves in quick succession race — which
   * makes the ref update fail 422 "not a fast forward". Blobs are content-addressed
   * (safe to create once), so on a conflict we re-read the tip and rebuild the tree
   * + commit on top of it, then retry the ref update.
   */
  async commit(changes: FileChange[], message: string): Promise<void> {
    // Serialize: chain after whatever commit is in flight so two rapid saves can't
    // interleave. The chain swallows the prior result (errors are delivered to that
    // call's own awaiter) so one failed save doesn't poison the next.
    const run = this.commitChain.then(() => this._commit(changes, message));
    this.commitChain = run.catch(() => {});
    return run;
  }

  private async _commit(changes: FileChange[], message: string): Promise<void> {
    const base = this.repoPath();

    // Create blobs once — reused across retries.
    const treeEntries = [];
    for (const c of changes) {
      if (c.remove) {
        treeEntries.push({ path: c.path, mode: '100644', type: 'blob', sha: null });
        continue;
      }
      const blob = await this.api(`${base}/git/blobs`, {
        method: 'POST',
        body: JSON.stringify({ content: c.content ?? '', encoding: c.encoding ?? 'utf-8' }),
      });
      treeEntries.push({ path: c.path, mode: '100644', type: 'blob', sha: blob.sha });
    }

    let lastErr: unknown;
    for (let attempt = 0; attempt < 5; attempt++) {
      const ref = await this.api(`${base}/git/ref/heads/${this.ref.branch}`);
      const latest = ref.object.sha;
      const headCommit = await this.api(`${base}/git/commits/${latest}`);

      const newTree = await this.api(`${base}/git/trees`, {
        method: 'POST',
        body: JSON.stringify({ base_tree: headCommit.tree.sha, tree: treeEntries }),
      });
      const newCommit = await this.api(`${base}/git/commits`, {
        method: 'POST',
        body: JSON.stringify({ message, tree: newTree.sha, parents: [latest] }),
      });
      try {
        await this.api(`${base}/git/refs/heads/${this.ref.branch}`, {
          method: 'PATCH',
          body: JSON.stringify({ sha: newCommit.sha }),
        });
        // Record what we just wrote so later reads are consistent despite CDN lag.
        for (const c of changes) {
          if (c.remove) this.overlay.set(c.path, { removed: true });
          else this.overlay.set(c.path, { content: c.content ?? '', encoding: c.encoding ?? 'utf-8' });
        }
        this.lastCommitSha = newCommit.sha;
        return;
      } catch (e) {
        lastErr = e;
        // Only retry the fast-forward race; surface anything else immediately.
        if (e instanceof Error && /\(422\)/.test(e.message) && /fast forward/i.test(e.message)) {
          await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
          continue;
        }
        throw e;
      }
    }
    throw lastErr instanceof Error
      ? lastErr
      : new Error('commit failed: branch kept moving (not a fast forward)');
  }

  /**
   * Best-effort deploy state for a pushed commit, read from GitHub's commit
   * status + check-runs. The host's CI reports here: GitHub Pages writes an
   * Actions check; Netlify writes a commit status *if* it reports to GitHub.
   * Returns 'unknown' when nothing reports (e.g. the Netlify deploy-key path) so
   * the caller can fall back to a time-based estimate instead of hanging.
   */
  async deployState(sha: string): Promise<'building' | 'live' | 'error' | 'unknown'> {
    const base = this.repoPath();
    try {
      const [status, checks] = await Promise.all([
        this.api(`${base}/commits/${sha}/status`).catch(() => ({ total_count: 0, state: '' })),
        this.api(`${base}/commits/${sha}/check-runs`).catch(() => ({ check_runs: [] })),
      ]);
      const states: string[] = [];
      if (status.total_count > 0) states.push(status.state); // success | pending | failure | error
      for (const c of checks.check_runs ?? []) {
        states.push(c.status === 'completed' ? c.conclusion : 'pending');
      }
      if (!states.length) return 'unknown';
      if (states.some((s) => s === 'failure' || s === 'error' || s === 'timed_out')) return 'error';
      if (states.every((s) => s === 'success')) return 'live';
      return 'building';
    } catch {
      return 'unknown';
    }
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
