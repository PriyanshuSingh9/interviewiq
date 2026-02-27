/**
 * Seed script for the QuestionBank table.
 * Run with: node lib/coding/seedQuestions.js
 * 
 * 25 JavaScript-only questions:
 * - 15 DSA (from NeetCode 150)
 * - 10 Bug Fix (practical JS debugging)
 */

import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { questionBank } from '../db/schema.js';

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

const questions = [
    // ═══════════════════════════════════════════════
    // DSA QUESTIONS (NeetCode 150)
    // ═══════════════════════════════════════════════

    {
        type: 'dsa',
        difficulty: 'easy',
        tags: ['arrays', 'hashmap'],
        roleTags: ['sde', 'backend', 'fullstack'],
        title: 'Contains Duplicate',
        description: `Given an integer array \`nums\`, return \`true\` if any value appears at least twice in the array, and return \`false\` if every element is distinct.

**Example 1:**
Input: nums = [1,2,3,1]
Output: true

**Example 2:**
Input: nums = [1,2,3,4]
Output: false

**Constraints:**
- 1 <= nums.length <= 10^5
- -10^9 <= nums[i] <= 10^9`,
        starterCode: `function containsDuplicate(nums) {
  // Your code here
}`,
        testCases: [
            { input: '[[1,2,3,1]]', expectedOutput: 'true' },
            { input: '[[1,2,3,4]]', expectedOutput: 'false' },
            { input: '[[1,1,1,3,3,4,3,2,4,2]]', expectedOutput: 'true' },
            { input: '[[1]]', expectedOutput: 'false' },
        ],
        sampleIO: [
            { input: 'nums = [1,2,3,1]', output: 'true' },
            { input: 'nums = [1,2,3,4]', output: 'false' },
        ],
        idealSolution: `function containsDuplicate(nums) {
  return new Set(nums).size !== nums.length;
}`,
    },

    {
        type: 'dsa',
        difficulty: 'easy',
        tags: ['arrays', 'hashmap'],
        roleTags: ['sde', 'backend', 'fullstack'],
        title: 'Two Sum',
        description: `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

**Example 1:**
Input: nums = [2,7,11,15], target = 9
Output: [0,1]

**Example 2:**
Input: nums = [3,2,4], target = 6
Output: [1,2]

**Constraints:**
- 2 <= nums.length <= 10^4
- -10^9 <= nums[i] <= 10^9`,
        starterCode: `function twoSum(nums, target) {
  // Your code here
}`,
        testCases: [
            { input: '[[2,7,11,15], 9]', expectedOutput: '[0,1]' },
            { input: '[[3,2,4], 6]', expectedOutput: '[1,2]' },
            { input: '[[3,3], 6]', expectedOutput: '[0,1]' },
        ],
        sampleIO: [
            { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]' },
            { input: 'nums = [3,2,4], target = 6', output: '[1,2]' },
        ],
        idealSolution: `function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) return [map.get(complement), i];
    map.set(nums[i], i);
  }
}`,
    },

    {
        type: 'dsa',
        difficulty: 'easy',
        tags: ['strings', 'hashmap'],
        roleTags: ['sde', 'frontend', 'fullstack'],
        title: 'Valid Anagram',
        description: `Given two strings \`s\` and \`t\`, return \`true\` if \`t\` is an anagram of \`s\`, and \`false\` otherwise.

An anagram is a word formed by rearranging the letters of another word.

**Example 1:**
Input: s = "anagram", t = "nagaram"
Output: true

**Example 2:**
Input: s = "rat", t = "car"
Output: false

**Constraints:**
- 1 <= s.length, t.length <= 5 * 10^4
- s and t consist of lowercase English letters`,
        starterCode: `function isAnagram(s, t) {
  // Your code here
}`,
        testCases: [
            { input: '["anagram", "nagaram"]', expectedOutput: 'true' },
            { input: '["rat", "car"]', expectedOutput: 'false' },
            { input: '["listen", "silent"]', expectedOutput: 'true' },
            { input: '["a", "ab"]', expectedOutput: 'false' },
        ],
        sampleIO: [
            { input: 's = "anagram", t = "nagaram"', output: 'true' },
            { input: 's = "rat", t = "car"', output: 'false' },
        ],
        idealSolution: `function isAnagram(s, t) {
  if (s.length !== t.length) return false;
  const count = {};
  for (const c of s) count[c] = (count[c] || 0) + 1;
  for (const c of t) {
    if (!count[c]) return false;
    count[c]--;
  }
  return true;
}`,
    },

    {
        type: 'dsa',
        difficulty: 'medium',
        tags: ['strings', 'hashmap', 'sorting'],
        roleTags: ['sde', 'backend'],
        title: 'Group Anagrams',
        description: `Given an array of strings \`strs\`, group the anagrams together. You can return the answer in any order.

**Example 1:**
Input: strs = ["eat","tea","tan","ate","nat","bat"]
Output: [["bat"],["nat","tan"],["ate","eat","tea"]]

**Example 2:**
Input: strs = [""]
Output: [[""]]

**Constraints:**
- 1 <= strs.length <= 10^4
- 0 <= strs[i].length <= 100`,
        starterCode: `function groupAnagrams(strs) {
  // Your code here
}`,
        testCases: [
            { input: '[["eat","tea","tan","ate","nat","bat"]]', expectedOutput: '[["eat","tea","ate"],["tan","nat"],["bat"]]' },
            { input: '[[""]]', expectedOutput: '[[""]]' },
            { input: '[["a"]]', expectedOutput: '[["a"]]' },
        ],
        sampleIO: [
            { input: 'strs = ["eat","tea","tan","ate","nat","bat"]', output: '[["bat"],["nat","tan"],["ate","eat","tea"]]' },
        ],
        idealSolution: `function groupAnagrams(strs) {
  const map = new Map();
  for (const s of strs) {
    const key = s.split('').sort().join('');
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(s);
  }
  return [...map.values()];
}`,
    },

    {
        type: 'dsa',
        difficulty: 'medium',
        tags: ['arrays', 'hashmap', 'sorting'],
        roleTags: ['sde', 'backend'],
        title: 'Top K Frequent Elements',
        description: `Given an integer array \`nums\` and an integer \`k\`, return the \`k\` most frequent elements. You may return the answer in any order.

**Example 1:**
Input: nums = [1,1,1,2,2,3], k = 2
Output: [1,2]

**Example 2:**
Input: nums = [1], k = 1
Output: [1]

**Constraints:**
- 1 <= nums.length <= 10^5
- -10^4 <= nums[i] <= 10^4
- k is in the range [1, number of unique elements]`,
        starterCode: `function topKFrequent(nums, k) {
  // Your code here
}`,
        testCases: [
            { input: '[[1,1,1,2,2,3], 2]', expectedOutput: '[1,2]' },
            { input: '[[1], 1]', expectedOutput: '[1]' },
            { input: '[[4,4,4,1,1,2,2,2,3], 2]', expectedOutput: '[4,2]' },
        ],
        sampleIO: [
            { input: 'nums = [1,1,1,2,2,3], k = 2', output: '[1,2]' },
        ],
        idealSolution: `function topKFrequent(nums, k) {
  const freq = {};
  for (const n of nums) freq[n] = (freq[n] || 0) + 1;
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)
    .map(e => Number(e[0]));
}`,
    },

    {
        type: 'dsa',
        difficulty: 'medium',
        tags: ['arrays'],
        roleTags: ['sde', 'backend'],
        title: 'Product of Array Except Self',
        description: `Given an integer array \`nums\`, return an array \`answer\` such that \`answer[i]\` is equal to the product of all the elements of \`nums\` except \`nums[i]\`.

You must write an algorithm that runs in O(n) time and **without using the division operation**.

**Example 1:**
Input: nums = [1,2,3,4]
Output: [24,12,8,6]

**Example 2:**
Input: nums = [-1,1,0,-3,3]
Output: [0,0,9,0,0]

**Constraints:**
- 2 <= nums.length <= 10^5`,
        starterCode: `function productExceptSelf(nums) {
  // Your code here
}`,
        testCases: [
            { input: '[[1,2,3,4]]', expectedOutput: '[24,12,8,6]' },
            { input: '[[-1,1,0,-3,3]]', expectedOutput: '[0,0,9,0,0]' },
            { input: '[[2,3]]', expectedOutput: '[3,2]' },
        ],
        sampleIO: [
            { input: 'nums = [1,2,3,4]', output: '[24,12,8,6]' },
        ],
        idealSolution: `function productExceptSelf(nums) {
  const n = nums.length;
  const result = new Array(n).fill(1);
  let prefix = 1;
  for (let i = 0; i < n; i++) { result[i] = prefix; prefix *= nums[i]; }
  let suffix = 1;
  for (let i = n - 1; i >= 0; i--) { result[i] *= suffix; suffix *= nums[i]; }
  return result;
}`,
    },

    {
        type: 'dsa',
        difficulty: 'easy',
        tags: ['strings', 'two-pointers'],
        roleTags: ['sde', 'frontend', 'fullstack'],
        title: 'Valid Palindrome',
        description: `A phrase is a palindrome if, after converting all uppercase letters into lowercase and removing all non-alphanumeric characters, it reads the same forward and backward.

Given a string \`s\`, return \`true\` if it is a palindrome, or \`false\` otherwise.

**Example 1:**
Input: s = "A man, a plan, a canal: Panama"
Output: true

**Example 2:**
Input: s = "race a car"
Output: false

**Constraints:**
- 1 <= s.length <= 2 * 10^5`,
        starterCode: `function isPalindrome(s) {
  // Your code here
}`,
        testCases: [
            { input: '["A man, a plan, a canal: Panama"]', expectedOutput: 'true' },
            { input: '["race a car"]', expectedOutput: 'false' },
            { input: '[" "]', expectedOutput: 'true' },
        ],
        sampleIO: [
            { input: 's = "A man, a plan, a canal: Panama"', output: 'true' },
            { input: 's = "race a car"', output: 'false' },
        ],
        idealSolution: `function isPalindrome(s) {
  const clean = s.toLowerCase().replace(/[^a-z0-9]/g, '');
  let l = 0, r = clean.length - 1;
  while (l < r) {
    if (clean[l] !== clean[r]) return false;
    l++; r--;
  }
  return true;
}`,
    },

    {
        type: 'dsa',
        difficulty: 'medium',
        tags: ['arrays', 'two-pointers', 'sorting'],
        roleTags: ['sde', 'backend'],
        title: '3Sum',
        description: `Given an integer array \`nums\`, return all the triplets \`[nums[i], nums[j], nums[k]]\` such that \`i != j\`, \`i != k\`, and \`j != k\`, and \`nums[i] + nums[j] + nums[k] == 0\`.

Notice that the solution set must not contain duplicate triplets.

**Example 1:**
Input: nums = [-1,0,1,2,-1,-4]
Output: [[-1,-1,2],[-1,0,1]]

**Example 2:**
Input: nums = [0,1,1]
Output: []

**Constraints:**
- 3 <= nums.length <= 3000`,
        starterCode: `function threeSum(nums) {
  // Your code here
}`,
        testCases: [
            { input: '[[-1,0,1,2,-1,-4]]', expectedOutput: '[[-1,-1,2],[-1,0,1]]' },
            { input: '[[0,1,1]]', expectedOutput: '[]' },
            { input: '[[0,0,0]]', expectedOutput: '[[0,0,0]]' },
        ],
        sampleIO: [
            { input: 'nums = [-1,0,1,2,-1,-4]', output: '[[-1,-1,2],[-1,0,1]]' },
        ],
        idealSolution: `function threeSum(nums) {
  nums.sort((a, b) => a - b);
  const result = [];
  for (let i = 0; i < nums.length - 2; i++) {
    if (i > 0 && nums[i] === nums[i - 1]) continue;
    let lo = i + 1, hi = nums.length - 1;
    while (lo < hi) {
      const sum = nums[i] + nums[lo] + nums[hi];
      if (sum === 0) {
        result.push([nums[i], nums[lo], nums[hi]]);
        while (lo < hi && nums[lo] === nums[lo + 1]) lo++;
        while (lo < hi && nums[hi] === nums[hi - 1]) hi--;
        lo++; hi--;
      } else if (sum < 0) lo++;
      else hi--;
    }
  }
  return result;
}`,
    },

    {
        type: 'dsa',
        difficulty: 'easy',
        tags: ['arrays', 'sliding-window'],
        roleTags: ['sde', 'backend', 'fullstack'],
        title: 'Best Time to Buy and Sell Stock',
        description: `You are given an array \`prices\` where \`prices[i]\` is the price of a given stock on the \`ith\` day.

You want to maximize your profit by choosing a single day to buy and another day in the future to sell. Return the maximum profit. If no profit is possible, return \`0\`.

**Example 1:**
Input: prices = [7,1,5,3,6,4]
Output: 5 (Buy on day 2, sell on day 5)

**Example 2:**
Input: prices = [7,6,4,3,1]
Output: 0

**Constraints:**
- 1 <= prices.length <= 10^5`,
        starterCode: `function maxProfit(prices) {
  // Your code here
}`,
        testCases: [
            { input: '[[7,1,5,3,6,4]]', expectedOutput: '5' },
            { input: '[[7,6,4,3,1]]', expectedOutput: '0' },
            { input: '[[2,4,1]]', expectedOutput: '2' },
            { input: '[[1]]', expectedOutput: '0' },
        ],
        sampleIO: [
            { input: 'prices = [7,1,5,3,6,4]', output: '5' },
            { input: 'prices = [7,6,4,3,1]', output: '0' },
        ],
        idealSolution: `function maxProfit(prices) {
  let min = Infinity, maxP = 0;
  for (const p of prices) {
    min = Math.min(min, p);
    maxP = Math.max(maxP, p - min);
  }
  return maxP;
}`,
    },

    {
        type: 'dsa',
        difficulty: 'medium',
        tags: ['strings', 'sliding-window', 'hashmap'],
        roleTags: ['sde', 'backend'],
        title: 'Longest Substring Without Repeating Characters',
        description: `Given a string \`s\`, find the length of the longest substring without repeating characters.

**Example 1:**
Input: s = "abcabcbb"
Output: 3 ("abc")

**Example 2:**
Input: s = "bbbbb"
Output: 1 ("b")

**Constraints:**
- 0 <= s.length <= 5 * 10^4`,
        starterCode: `function lengthOfLongestSubstring(s) {
  // Your code here
}`,
        testCases: [
            { input: '["abcabcbb"]', expectedOutput: '3' },
            { input: '["bbbbb"]', expectedOutput: '1' },
            { input: '["pwwkew"]', expectedOutput: '3' },
            { input: '[""]', expectedOutput: '0' },
        ],
        sampleIO: [
            { input: 's = "abcabcbb"', output: '3' },
            { input: 's = "bbbbb"', output: '1' },
        ],
        idealSolution: `function lengthOfLongestSubstring(s) {
  const seen = new Map();
  let start = 0, max = 0;
  for (let i = 0; i < s.length; i++) {
    if (seen.has(s[i]) && seen.get(s[i]) >= start) start = seen.get(s[i]) + 1;
    seen.set(s[i], i);
    max = Math.max(max, i - start + 1);
  }
  return max;
}`,
    },

    {
        type: 'dsa',
        difficulty: 'easy',
        tags: ['stack', 'strings'],
        roleTags: ['sde', 'backend', 'fullstack'],
        title: 'Valid Parentheses',
        description: `Given a string \`s\` containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.

A string is valid if:
- Open brackets must be closed by the same type
- Open brackets must be closed in the correct order
- Every close bracket has a corresponding open bracket

**Example 1:**
Input: s = "()"
Output: true

**Example 2:**
Input: s = "(]"
Output: false

**Constraints:**
- 1 <= s.length <= 10^4`,
        starterCode: `function isValid(s) {
  // Your code here
}`,
        testCases: [
            { input: '["()"]', expectedOutput: 'true' },
            { input: '["()[]{}"]', expectedOutput: 'true' },
            { input: '["(]"]', expectedOutput: 'false' },
            { input: '["{[]}"]', expectedOutput: 'true' },
        ],
        sampleIO: [
            { input: 's = "()"', output: 'true' },
            { input: 's = "(]"', output: 'false' },
        ],
        idealSolution: `function isValid(s) {
  const stack = [];
  const map = { ')': '(', ']': '[', '}': '{' };
  for (const c of s) {
    if ('([{'.includes(c)) stack.push(c);
    else if (stack.pop() !== map[c]) return false;
  }
  return stack.length === 0;
}`,
    },

    {
        type: 'dsa',
        difficulty: 'easy',
        tags: ['arrays', 'binary-search'],
        roleTags: ['sde', 'backend'],
        title: 'Binary Search',
        description: `Given a sorted array of distinct integers \`nums\` and a target value \`target\`, return the index if the target is found. If not, return \`-1\`.

You must write an algorithm with O(log n) runtime complexity.

**Example 1:**
Input: nums = [-1,0,3,5,9,12], target = 9
Output: 4

**Example 2:**
Input: nums = [-1,0,3,5,9,12], target = 2
Output: -1

**Constraints:**
- 1 <= nums.length <= 10^4
- All integers in nums are unique
- nums is sorted in ascending order`,
        starterCode: `function search(nums, target) {
  // Your code here
}`,
        testCases: [
            { input: '[[-1,0,3,5,9,12], 9]', expectedOutput: '4' },
            { input: '[[-1,0,3,5,9,12], 2]', expectedOutput: '-1' },
            { input: '[[5], 5]', expectedOutput: '0' },
            { input: '[[5], -5]', expectedOutput: '-1' },
        ],
        sampleIO: [
            { input: 'nums = [-1,0,3,5,9,12], target = 9', output: '4' },
            { input: 'nums = [-1,0,3,5,9,12], target = 2', output: '-1' },
        ],
        idealSolution: `function search(nums, target) {
  let lo = 0, hi = nums.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (nums[mid] === target) return mid;
    else if (nums[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}`,
    },

    {
        type: 'dsa',
        difficulty: 'medium',
        tags: ['arrays', 'dynamic-programming'],
        roleTags: ['sde', 'backend'],
        title: 'Maximum Subarray',
        description: `Given an integer array \`nums\`, find the subarray with the largest sum, and return its sum.

**Example 1:**
Input: nums = [-2,1,-3,4,-1,2,1,-5,4]
Output: 6 (subarray [4,-1,2,1])

**Example 2:**
Input: nums = [5,4,-1,7,8]
Output: 23

**Constraints:**
- 1 <= nums.length <= 10^5`,
        starterCode: `function maxSubArray(nums) {
  // Your code here
}`,
        testCases: [
            { input: '[[-2,1,-3,4,-1,2,1,-5,4]]', expectedOutput: '6' },
            { input: '[[1]]', expectedOutput: '1' },
            { input: '[[5,4,-1,7,8]]', expectedOutput: '23' },
            { input: '[[-1]]', expectedOutput: '-1' },
        ],
        sampleIO: [
            { input: 'nums = [-2,1,-3,4,-1,2,1,-5,4]', output: '6' },
        ],
        idealSolution: `function maxSubArray(nums) {
  let current = nums[0], max = nums[0];
  for (let i = 1; i < nums.length; i++) {
    current = Math.max(nums[i], current + nums[i]);
    max = Math.max(max, current);
  }
  return max;
}`,
    },

    {
        type: 'dsa',
        difficulty: 'easy',
        tags: ['dynamic-programming'],
        roleTags: ['sde', 'backend'],
        title: 'Climbing Stairs',
        description: `You are climbing a staircase. It takes \`n\` steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?

**Example 1:**
Input: n = 2
Output: 2 (1+1 or 2)

**Example 2:**
Input: n = 3
Output: 3 (1+1+1, 1+2, 2+1)

**Constraints:**
- 1 <= n <= 45`,
        starterCode: `function climbStairs(n) {
  // Your code here
}`,
        testCases: [
            { input: '[2]', expectedOutput: '2' },
            { input: '[3]', expectedOutput: '3' },
            { input: '[5]', expectedOutput: '8' },
            { input: '[1]', expectedOutput: '1' },
        ],
        sampleIO: [
            { input: 'n = 2', output: '2' },
            { input: 'n = 3', output: '3' },
        ],
        idealSolution: `function climbStairs(n) {
  if (n <= 2) return n;
  let a = 1, b = 2;
  for (let i = 3; i <= n; i++) { [a, b] = [b, a + b]; }
  return b;
}`,
    },

    {
        type: 'dsa',
        difficulty: 'medium',
        tags: ['arrays', 'hashmap'],
        roleTags: ['sde', 'backend'],
        title: 'Longest Consecutive Sequence',
        description: `Given an unsorted array of integers \`nums\`, return the length of the longest consecutive elements sequence.

You must write an algorithm that runs in O(n) time.

**Example 1:**
Input: nums = [100,4,200,1,3,2]
Output: 4 (sequence: [1,2,3,4])

**Example 2:**
Input: nums = [0,3,7,2,5,8,4,6,0,1]
Output: 9

**Constraints:**
- 0 <= nums.length <= 10^5`,
        starterCode: `function longestConsecutive(nums) {
  // Your code here
}`,
        testCases: [
            { input: '[[100,4,200,1,3,2]]', expectedOutput: '4' },
            { input: '[[0,3,7,2,5,8,4,6,0,1]]', expectedOutput: '9' },
            { input: '[[]]', expectedOutput: '0' },
            { input: '[[1]]', expectedOutput: '1' },
        ],
        sampleIO: [
            { input: 'nums = [100,4,200,1,3,2]', output: '4' },
        ],
        idealSolution: `function longestConsecutive(nums) {
  const set = new Set(nums);
  let longest = 0;
  for (const n of set) {
    if (!set.has(n - 1)) {
      let len = 1;
      while (set.has(n + len)) len++;
      longest = Math.max(longest, len);
    }
  }
  return longest;
}`,
    },

    // ═══════════════════════════════════════════════
    // BUG FIX QUESTIONS
    // ═══════════════════════════════════════════════

    {
        type: 'bugfix',
        difficulty: 'easy',
        tags: ['closures', 'scope', 'var'],
        roleTags: ['frontend', 'fullstack'],
        title: 'The Closure Loop Trap',
        description: `The following function should collect numbers 0 through 4 into an array using delayed callbacks, but it collects five \`5\`s instead. **Fix the bug** so that it correctly collects \`[0, 1, 2, 3, 4]\`.

**Hint:** The issue is related to how \`var\` behaves in loops with closures.

**Expected Output:**
\`[0, 1, 2, 3, 4]\``,
        starterCode: `function printNumbers() {
  const results = [];
  for (var i = 0; i < 5; i++) {
    setTimeout(function() {
      results.push(i);
    }, 100);
  }
  return new Promise(resolve => setTimeout(() => resolve(results), 200));
}`,
        testCases: [
            { input: '[]', expectedOutput: '[0,1,2,3,4]' },
        ],
        sampleIO: [
            { input: '(no arguments)', output: '[0, 1, 2, 3, 4]' },
        ],
        idealSolution: `function printNumbers() {
  const results = [];
  for (let i = 0; i < 5; i++) {
    setTimeout(function() {
      results.push(i);
    }, 100);
  }
  return new Promise(resolve => setTimeout(() => resolve(results), 200));
}`,
    },

    {
        type: 'bugfix',
        difficulty: 'easy',
        tags: ['closures', 'scope'],
        roleTags: ['frontend', 'fullstack'],
        title: 'The Broken Counter',
        description: `This counter factory should create **independent** counters, but all counters share the same count because of a global variable. **Fix the bug** so that each counter maintains its own independent count.

**Expected behavior:**
\`\`\`
const c1 = createCounter();
const c2 = createCounter();
c1.increment(); // returns 1
c1.increment(); // returns 2
c2.increment(); // returns 1 (independent!)
c1.getCount();  // returns 2
\`\`\``,
        starterCode: `let count = 0;
function createCounter() {
  return {
    increment: function() { count++; return count; },
    getCount: function() { return count; }
  };
}`,
        testCases: [
            { input: '[]', expectedOutput: 'true' },
        ],
        sampleIO: [
            { input: 'c1.increment() then c2.increment()', output: 'c1: 1, c2: 1 (independent)' },
        ],
        idealSolution: `function createCounter() {
  let count = 0;
  return {
    increment: function() { count++; return count; },
    getCount: function() { return count; }
  };
}`,
    },

    {
        type: 'bugfix',
        difficulty: 'medium',
        tags: ['async', 'promises'],
        roleTags: ['frontend', 'fullstack', 'backend'],
        title: 'Async Returns Undefined',
        description: `This function should fetch user data and return the user's name, but it always returns \`undefined\`. **Fix the bug** so that the function correctly returns the fetched data.

**Hint:** The issue is related to asynchronous execution — the function returns before the fetch completes.

**Expected:** The function should return a Promise that resolves to the user's name.`,
        starterCode: `function getData() {
  let result;
  fetch('https://jsonplaceholder.typicode.com/users/1')
    .then(res => res.json())
    .then(data => { result = data.name; });
  return result;
}`,
        testCases: [
            { input: '[]', expectedOutput: '"Leanne Graham"' },
        ],
        sampleIO: [
            { input: 'await getData()', output: '"Leanne Graham"' },
        ],
        idealSolution: `async function getData() {
  const res = await fetch('https://jsonplaceholder.typicode.com/users/1');
  const data = await res.json();
  return data.name;
}`,
    },

    {
        type: 'bugfix',
        difficulty: 'medium',
        tags: ['this', 'context'],
        roleTags: ['frontend', 'fullstack'],
        title: 'Lost this Context',
        description: `The \`greet\` method loses its \`this\` context when passed as a callback, so it returns "Hello, I'm undefined" instead of using the person's name. **Fix the bug** so \`getGreeting()\` returns "Hello, I'm Alice".

**Expected:** \`getGreeting()\` returns \`"Hello, I'm Alice"\``,
        starterCode: `const person = {
  name: 'Alice',
  greet: function() {
    return \`Hello, I'm \${this.name}\`;
  }
};

function runCallback(cb) {
  return cb();
}

function getGreeting() {
  return runCallback(person.greet);
}`,
        testCases: [
            { input: '[]', expectedOutput: '"Hello, I\'m Alice"' },
        ],
        sampleIO: [
            { input: 'getGreeting()', output: '"Hello, I\'m Alice"' },
        ],
        idealSolution: `const person = {
  name: 'Alice',
  greet: function() {
    return \`Hello, I'm \${this.name}\`;
  }
};

function runCallback(cb) {
  return cb();
}

function getGreeting() {
  return runCallback(person.greet.bind(person));
}`,
    },

    {
        type: 'bugfix',
        difficulty: 'easy',
        tags: ['objects', 'equality'],
        roleTags: ['frontend', 'fullstack'],
        title: 'Object Equality Trap',
        description: `This function should check if two objects have the same key-value pairs, but it always returns \`false\` because it uses reference equality (\`===\`). **Fix the bug** to perform a deep value comparison.

**Expected:**
\`\`\`
areEqual({a: 1, b: 2}, {a: 1, b: 2}) // true
areEqual({a: 1}, {a: 2}) // false
areEqual({}, {}) // true
\`\`\``,
        starterCode: `function areEqual(obj1, obj2) {
  return obj1 === obj2;
}`,
        testCases: [
            { input: '[{"a":1,"b":2}, {"a":1,"b":2}]', expectedOutput: 'true' },
            { input: '[{"a":1}, {"a":2}]', expectedOutput: 'false' },
            { input: '[{}, {}]', expectedOutput: 'true' },
            { input: '[{"a":1,"b":2}, {"a":1}]', expectedOutput: 'false' },
        ],
        sampleIO: [
            { input: '{a:1, b:2}, {a:1, b:2}', output: 'true' },
            { input: '{a:1}, {a:2}', output: 'false' },
        ],
        idealSolution: `function areEqual(obj1, obj2) {
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  if (keys1.length !== keys2.length) return false;
  return keys1.every(key => obj2.hasOwnProperty(key) && obj1[key] === obj2[key]);
}`,
    },

    {
        type: 'bugfix',
        difficulty: 'easy',
        tags: ['arrays', 'mutation'],
        roleTags: ['frontend', 'fullstack'],
        title: 'Array Mutation Bug',
        description: `This function should double all numbers and return a new array, **without modifying the original array**. But the original array is being mutated because the variable \`doubled\` is just a reference. **Fix the bug.**

**Expected:**
\`\`\`
const arr = [1, 2, 3];
const result = doubleValues(arr);
// result should be [2, 4, 6]
// arr should still be [1, 2, 3]
\`\`\``,
        starterCode: `function doubleValues(arr) {
  const doubled = arr;
  for (let i = 0; i < doubled.length; i++) {
    doubled[i] = doubled[i] * 2;
  }
  return doubled;
}`,
        testCases: [
            { input: '[[1,2,3]]', expectedOutput: '[2,4,6]' },
            { input: '[[0,5,10]]', expectedOutput: '[0,10,20]' },
            { input: '[[]]', expectedOutput: '[]' },
        ],
        sampleIO: [
            { input: '[1, 2, 3]', output: '[2, 4, 6] (original unchanged)' },
        ],
        idealSolution: `function doubleValues(arr) {
  return arr.map(n => n * 2);
}`,
    },

    {
        type: 'bugfix',
        difficulty: 'easy',
        tags: ['types', 'coercion'],
        roleTags: ['frontend', 'fullstack'],
        title: 'String-to-Number Coercion',
        description: `This function takes an array of string numbers and should return their sum. But it concatenates them as strings instead of adding them as numbers. **Fix the bug.**

**Expected:**
\`\`\`
sumStrings(["1", "2", "3"]) // returns 6, not "0123"
\`\`\``,
        starterCode: `function sumStrings(arr) {
  let total = 0;
  for (const num of arr) {
    total += num;
  }
  return total;
}`,
        testCases: [
            { input: '[["1","2","3"]]', expectedOutput: '6' },
            { input: '[["10","20"]]', expectedOutput: '30' },
            { input: '[["0","0","0"]]', expectedOutput: '0' },
        ],
        sampleIO: [
            { input: '["1", "2", "3"]', output: '6' },
        ],
        idealSolution: `function sumStrings(arr) {
  let total = 0;
  for (const num of arr) {
    total += Number(num);
  }
  return total;
}`,
    },

    {
        type: 'bugfix',
        difficulty: 'medium',
        tags: ['async', 'event-loop'],
        roleTags: ['frontend', 'fullstack', 'backend'],
        title: 'Disappearing Async Data',
        description: `This function processes items asynchronously and should return the results, but it returns an empty array because \`setTimeout\` callbacks run after the function returns. **Fix the bug** so it correctly waits for all results.

**Expected:**
\`\`\`
await collectResults([1, 2, 3]) // returns [2, 4, 6]
\`\`\``,
        starterCode: `function collectResults(items) {
  const results = [];
  items.forEach(item => {
    setTimeout(() => {
      results.push(item * 2);
    }, 10);
  });
  return results;
}`,
        testCases: [
            { input: '[[1,2,3]]', expectedOutput: '[2,4,6]' },
            { input: '[[5]]', expectedOutput: '[10]' },
            { input: '[[0,1]]', expectedOutput: '[0,2]' },
        ],
        sampleIO: [
            { input: '[1, 2, 3]', output: '[2, 4, 6]' },
        ],
        idealSolution: `function collectResults(items) {
  return items.map(item => item * 2);
}`,
    },

    {
        type: 'bugfix',
        difficulty: 'medium',
        tags: ['objects', 'deep-copy'],
        roleTags: ['frontend', 'fullstack'],
        title: 'Shallow Copy Gotcha',
        description: `This function should create an independent copy of a user object. But when you modify nested properties (like \`settings.theme\`), the original object is also affected because the spread operator only does a shallow copy. **Fix the bug** to create a true deep copy.

**Expected:**
\`\`\`
const original = { name: 'Alice', settings: { theme: 'dark' } };
const copy = copyUser(original);
copy.settings.theme = 'light';
original.settings.theme // should still be 'dark'
\`\`\``,
        starterCode: `function copyUser(user) {
  const copy = { ...user };
  return copy;
}`,
        testCases: [
            { input: '[{"name":"Alice","settings":{"theme":"dark"}}]', expectedOutput: 'true' },
        ],
        sampleIO: [
            { input: '{ name: "Alice", settings: { theme: "dark" } }', output: 'Deep independent copy' },
        ],
        idealSolution: `function copyUser(user) {
  return JSON.parse(JSON.stringify(user));
}`,
    },

    {
        type: 'bugfix',
        difficulty: 'medium',
        tags: ['arrays', 'math'],
        roleTags: ['fullstack', 'backend'],
        title: 'Off-By-One Pagination',
        description: `This pagination function should return the correct page of items, but it skips the first item and sometimes returns one too many. **Fix the off-by-one error.** Pages are 0-indexed.

**Expected:**
\`\`\`
paginate([1,2,3,4,5,6,7,8,9,10], 0, 3) // [1,2,3]
paginate([1,2,3,4,5,6,7,8,9,10], 1, 3) // [4,5,6]
paginate([1,2,3,4,5,6,7,8,9,10], 3, 3) // [10]
\`\`\``,
        starterCode: `function paginate(items, page, pageSize) {
  const start = page * pageSize + 1;
  const end = start + pageSize;
  return items.slice(start, end);
}`,
        testCases: [
            { input: '[[1,2,3,4,5,6,7,8,9,10], 0, 3]', expectedOutput: '[1,2,3]' },
            { input: '[[1,2,3,4,5,6,7,8,9,10], 1, 3]', expectedOutput: '[4,5,6]' },
            { input: '[[1,2,3,4,5,6,7,8,9,10], 3, 3]', expectedOutput: '[10]' },
        ],
        sampleIO: [
            { input: 'items=[1..10], page=0, pageSize=3', output: '[1,2,3]' },
        ],
        idealSolution: `function paginate(items, page, pageSize) {
  const start = page * pageSize;
  const end = start + pageSize;
  return items.slice(start, end);
}`,
    },
];

async function seed() {
    console.log('🌱 Seeding question bank with', questions.length, 'questions...');

    try {
        // Clear existing questions first
        await db.delete(questionBank);
        console.log('  Cleared existing questions');

        // Insert all questions
        await db.insert(questionBank).values(questions);
        console.log('✅ Successfully seeded', questions.length, 'questions');
    } catch (err) {
        console.error('❌ Seeding failed:', err);
        process.exit(1);
    }

    process.exit(0);
}

seed();
