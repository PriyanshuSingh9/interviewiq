import fs from 'fs';
import { parseResume } from './lib/pre-interview/resumeParser.js';

async function runTest() {
    console.log("Starting test parse on example resume...");
    try {
        const filePath = './resume/Priyanshu_Resume.pdf';
        const buffer = fs.readFileSync(filePath);
        const result = await parseResume(buffer);

        console.log("=== EXTRACED TEXT (First 200 chars) ===");
        console.log(result.text.substring(0, 200));
        console.log("=======================================");

        console.log("\n-> Extracted GitHub URL:", result.githubUrl);
    } catch (e) {
        console.error("Test failed:", e);
    }
}

runTest();
