/**
 * Maps target roles to question bank tags.
 * Used to select appropriate coding questions based on the user's target role.
 */

const ROLE_TAG_MAP = {
    // Backend / SDE roles → DSA-heavy
    'backend engineer': ['sde', 'backend', 'algorithms'],
    'backend developer': ['sde', 'backend', 'algorithms'],
    'software engineer': ['sde', 'backend', 'algorithms'],
    'software developer': ['sde', 'backend', 'algorithms'],
    'sde': ['sde', 'backend', 'algorithms'],
    'swe': ['sde', 'backend', 'algorithms'],

    // Frontend roles → Bug-fix heavy
    'frontend engineer': ['frontend', 'fullstack'],
    'frontend developer': ['frontend', 'fullstack'],
    'ui engineer': ['frontend', 'fullstack'],
    'react developer': ['frontend', 'fullstack'],

    // Full-stack → Mix of both
    'full stack engineer': ['fullstack', 'backend', 'frontend'],
    'full stack developer': ['fullstack', 'backend', 'frontend'],
    'fullstack engineer': ['fullstack', 'backend', 'frontend'],
    'fullstack developer': ['fullstack', 'backend', 'frontend'],

    // DevOps / Infra → DSA
    'devops engineer': ['sde', 'backend'],
    'site reliability engineer': ['sde', 'backend'],
    'platform engineer': ['sde', 'backend'],
};

/**
 * Given a target role string, returns the matching question bank role tags.
 * Falls back to a general set if no exact match is found.
 */
export function getTagsForRole(targetRole) {
    const normalized = targetRole.toLowerCase().trim();

    // Exact match
    if (ROLE_TAG_MAP[normalized]) {
        return ROLE_TAG_MAP[normalized];
    }

    // Partial match — check if any key is contained in the role string
    for (const [key, tags] of Object.entries(ROLE_TAG_MAP)) {
        if (normalized.includes(key) || key.includes(normalized)) {
            return tags;
        }
    }

    // Default fallback: general SDE mix
    return ['sde', 'fullstack', 'backend'];
}
