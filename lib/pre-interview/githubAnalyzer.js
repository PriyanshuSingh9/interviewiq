import { Octokit } from "@octokit/rest";

const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
});

/**
 * Analyzes a GitHub profile URL — fetches user info and top 3 non-fork repos
 * with metadata, file tree, README, and dependency files.
 * 
 * @param {string} profileUrl - GitHub profile URL (e.g. https://github.com/username)
 * @returns {Promise<{user: object, repos: object[]}>}
 */
export async function analyzeGithubProfile(profileUrl) {
    const username = extractUsername(profileUrl);
    if (!username) {
        throw new Error("Invalid GitHub URL. Expected https://github.com/username");
    }

    // 1. Fetch user info
    let userInfo = {};
    try {
        const { data } = await octokit.users.getByUsername({ username });
        userInfo = {
            login: data.login,
            name: data.name,
            bio: data.bio,
            publicRepos: data.public_repos,
            followers: data.followers,
            company: data.company,
            blog: data.blog,
        };
    } catch (err) {
        console.error(`Failed to fetch user info for ${username}:`, err.message);
        userInfo = { login: username, error: "Failed to fetch profile" };
    }

    // 2. Fetch repos — sorted by stars then recent push, filter forks
    let topRepos = [];
    try {
        const { data: repos } = await octokit.repos.listForUser({
            username,
            sort: "pushed",
            direction: "desc",
            per_page: 30,
        });

        // Filter out forks, sort by stars (tiebreak: recent push)
        const ownRepos = repos
            .filter(r => !r.fork)
            .sort((a, b) => {
                // Primary: star count descending
                if (b.stargazers_count !== a.stargazers_count) {
                    return b.stargazers_count - a.stargazers_count;
                }
                // Secondary: most recently pushed
                return new Date(b.pushed_at) - new Date(a.pushed_at);
            });

        // Take top 3
        const selected = ownRepos.slice(0, 3);

        // Analyze each repo in parallel
        topRepos = await Promise.all(
            selected.map(repo => analyzeRepo(repo.owner.login, repo.name, repo))
        );
    } catch (err) {
        console.error(`Failed to fetch repos for ${username}:`, err.message);
    }

    return { user: userInfo, repos: topRepos };
}

/**
 * Analyzes a single GitHub repository — deep dive with metadata, tree, README, deps.
 * @param {string} owner
 * @param {string} repoName
 * @param {object} repoData - GitHub API repo object (optional, avoids re-fetch)
 * @returns {Promise<object>}
 */
async function analyzeRepo(owner, repoName, repoData = null) {
    // Fetch repo details if not provided
    if (!repoData) {
        try {
            const { data } = await octokit.repos.get({ owner, repo: repoName });
            repoData = data;
        } catch (err) {
            return { name: repoName, error: "Failed to fetch repo details" };
        }
    }

    const result = {
        name: repoData.full_name,
        description: repoData.description || null,
        primaryLanguage: repoData.language || null,
        stars: repoData.stargazers_count,
        isFork: repoData.fork,
        lastPushed: repoData.pushed_at,
        topics: repoData.topics || [],
        languageBreakdown: null,
        rootTree: null,
        readmeExcerpt: null,
        dependencies: null,
    };

    // All sub-fetches in parallel for speed
    const [langResult, treeResult, readmeResult, depsResult] = await Promise.allSettled([
        fetchLanguageBreakdown(owner, repoName),
        fetchRootTree(owner, repoName, repoData.default_branch),
        fetchReadme(owner, repoName),
        fetchDependencyFiles(owner, repoName),
    ]);

    if (langResult.status === "fulfilled") result.languageBreakdown = langResult.value;
    if (treeResult.status === "fulfilled") result.rootTree = treeResult.value;
    if (readmeResult.status === "fulfilled") result.readmeExcerpt = readmeResult.value;
    if (depsResult.status === "fulfilled") result.dependencies = depsResult.value;

    return result;
}

// ─── Helper Fetchers ─────────────────────────────────────

async function fetchLanguageBreakdown(owner, repo) {
    const { data } = await octokit.repos.listLanguages({ owner, repo });
    const total = Object.values(data).reduce((a, b) => a + b, 0);
    if (total === 0) return {};
    // Convert bytes to percentages
    const breakdown = {};
    for (const [lang, bytes] of Object.entries(data)) {
        breakdown[lang] = `${((bytes / total) * 100).toFixed(1)}%`;
    }
    return breakdown;
}

async function fetchRootTree(owner, repo, defaultBranch) {
    const { data } = await octokit.git.getTree({
        owner,
        repo,
        tree_sha: defaultBranch,
    });
    return data.tree.map(t => `${t.type === "tree" ? "📁" : "📄"} ${t.path}`).slice(0, 40);
}

async function fetchReadme(owner, repo) {
    const { data } = await octokit.repos.getReadme({ owner, repo });
    const text = Buffer.from(data.content, "base64").toString("utf8");
    return text.substring(0, 1500);
}

async function fetchDependencyFiles(owner, repo) {
    // Try each common dependency file
    const candidates = [
        { path: "package.json", type: "node" },
        { path: "requirements.txt", type: "python" },
        { path: "pyproject.toml", type: "python" },
        { path: "go.mod", type: "go" },
        { path: "Cargo.toml", type: "rust" },
    ];

    for (const candidate of candidates) {
        try {
            const { data } = await octokit.repos.getContent({
                owner,
                repo,
                path: candidate.path,
            });
            const content = Buffer.from(data.content, "base64").toString("utf8");

            // For package.json, extract just deps to save tokens
            if (candidate.path === "package.json") {
                try {
                    const pkg = JSON.parse(content);
                    return {
                        file: candidate.path,
                        type: candidate.type,
                        content: JSON.stringify(
                            {
                                dependencies: pkg.dependencies,
                                devDependencies: pkg.devDependencies,
                                scripts: pkg.scripts,
                            },
                            null,
                            2
                        ).substring(0, 1500),
                    };
                } catch {
                    return { file: candidate.path, type: candidate.type, content: content.substring(0, 1500) };
                }
            }

            return { file: candidate.path, type: candidate.type, content: content.substring(0, 1500) };
        } catch {
            // File doesn't exist, try next
            continue;
        }
    }
    return null;
}

// ─── URL Parsing ──────────────────────────────────────────

function extractUsername(url) {
    if (!url) return null;
    const cleaned = url
        .replace(/^https?:\/\//, "")
        .replace(/^(www\.)?github\.com\//, "")
        .replace(/\/$/, "");
    // If it's just "username" with no slashes, it's a profile
    const parts = cleaned.split("/");
    return parts[0] || null;
}

/**
 * Legacy single-repo analysis — kept for backward compatibility.
 * @param {string} repoUrl - e.g. https://github.com/owner/repo
 * @returns {Promise<string>}
 */
export async function analyzeGithubRepo(repoUrl) {
    const parts = repoUrl
        .replace(/^https?:\/\//, "")
        .replace(/^(www\.)?github\.com\//, "")
        .split("/");
    const owner = parts[0];
    const repo = parts[1];
    if (!owner || !repo) throw new Error("Invalid repo URL");

    const result = await analyzeRepo(owner, repo);

    // Format as string for backward compat
    let summary = `Repository: ${result.name}\n\n`;
    summary += `Description: ${result.description || "N/A"}\n`;
    summary += `Language: ${result.primaryLanguage || "N/A"}\n`;
    summary += `Stars: ${result.stars} | Last pushed: ${result.lastPushed}\n\n`;

    if (result.languageBreakdown) {
        summary += `--- Language Breakdown ---\n`;
        for (const [lang, pct] of Object.entries(result.languageBreakdown)) {
            summary += `${lang}: ${pct}\n`;
        }
        summary += "\n";
    }

    if (result.rootTree) {
        summary += `--- Root File Tree ---\n${result.rootTree.join("\n")}\n\n`;
    }

    if (result.readmeExcerpt) {
        summary += `--- README Snippet ---\n${result.readmeExcerpt}\n\n`;
    }

    if (result.dependencies) {
        summary += `--- Dependencies (${result.dependencies.file}) ---\n${result.dependencies.content}\n\n`;
    }

    return summary;
}
