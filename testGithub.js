import { analyzeGithubRepo } from './lib/pre-interview/githubAnalyzer.js';
import dotenv from 'dotenv';
dotenv.config();

async function runTest() {
    console.log("Starting GitHub Repo Analysis...");
    try {
        // You can replace this with your own repo URL
        const repoUrl = 'https://github.com/PriyanshuSingh9/TEZ-TUNES';

        console.log(`Analyzing: ${repoUrl}`);
        const result = await analyzeGithubRepo(repoUrl);

        console.log("\n=== ANALYSIS RESULT ===");
        console.log(result);
        console.log("=======================\n");

    } catch (e) {
        console.error("Test failed:", e);
    }
}

runTest();
