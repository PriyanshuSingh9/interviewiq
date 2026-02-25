import { Octokit } from "@octokit/rest";

// Ensure you have GITHUB_TOKEN in your environment variables
const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
});

/**
 * Analyzes a GitHub repository and generates an architectural summary string.
 * @param {string} repoUrl - The GitHub repository URL (e.g. https://github.com/owner/repo)
 * @returns {Promise<string>} - A summary string of the repository structure and key files
 */
export async function analyzeGithubRepo(repoUrl) {
    try {
        // Parse owner and repo from URL
        const urlParts = repoUrl.replace('https://github.com/', '').replace('http://github.com/', '').split('/');
        const owner = urlParts[0];
        const repo = urlParts[1];

        if (!owner || !repo) {
            throw new Error("Invalid GitHub URL format. Needs https://github.com/owner/repo");
        }

        let summary = `Repository: ${owner}/${repo}\n\n`;

        // 1. Fetch Repository Details
        try {
            const { data: repoData } = await octokit.repos.get({
                owner,
                repo,
            });
            summary += `Description: ${repoData.description || 'N/A'}\n`;
            summary += `Language: ${repoData.language || 'N/A'}\n\n`;

            // 2. Fetch File Tree (top level)
            try {
                const { data: treeData } = await octokit.git.getTree({
                    owner,
                    repo,
                    tree_sha: repoData.default_branch,
                });

                const topLevelFiles = treeData.tree.map(t => t.path).slice(0, 30); // limit to 30 items
                summary += `--- Top Level Files ---\n${topLevelFiles.join('\n')}\n\n`;
            } catch (treeErr) {
                summary += `--- Top Level Files ---\n(Failed to fetch tree)\n\n`;
            }

        } catch (repoErr) {
            summary += `Description: (Failed to fetch details, repository might be private or token missing)\n\n`;
            return summary; // Return early if we can't even get basic details
        }

        // 3. Fetch README (truncated)
        try {
            const { data: readmeData } = await octokit.repos.getReadme({
                owner,
                repo,
            });
            const readmeText = Buffer.from(readmeData.content, 'base64').toString('utf8');
            summary += `--- README Snippet ---\n${readmeText.substring(0, 500)}...\n\n`;
        } catch (readmeErr) {
            summary += `--- README Snippet ---\n(No README found)\n\n`;
        }

        // 4. Try to fetch a dependency file (package.json)
        try {
            const { data: packageJsonData } = await octokit.repos.getContent({
                owner,
                repo,
                path: 'package.json',
            });
            const packageJsonText = Buffer.from(packageJsonData.content, 'base64').toString('utf8');
            summary += `--- Dependencies (package.json) ---\n`;
            // Extract just the dependencies block if possible to save space
            const pkgObj = JSON.parse(packageJsonText);
            const deps = { ...pkgObj.dependencies, ...pkgObj.devDependencies };
            summary += JSON.stringify(deps, null, 2).substring(0, 1000) + '...\n\n';
        } catch (pkgErr) {
            // Ignore if no package.json
        }

        return summary;
    } catch (error) {
        console.error(`Error analyzing GitHub repo ${repoUrl}:`, error.message);
        return `Failed to analyze GitHub repository: ${repoUrl}`;
    }
}
