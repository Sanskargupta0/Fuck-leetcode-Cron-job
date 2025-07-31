// We use node-fetch because the standard fetch is not available in all Node.js versions by default.
const fetch = require('node-fetch');

// --- CONFIGURATION ---
// These secrets are read from GitHub Actions secrets.
const LEETCODE_SESSION = process.env.LEETCODE_SESSION;
const CSRF_TOKEN = process.env.CSRF_TOKEN;

// Hardcoded problem details for the first test (Problem 5: Longest Palindromic Substring)
const PROBLEM_SLUG = "longest-palindromic-substring";
const QUESTION_ID = "5";
const LANG = "cpp";
const TYPED_CODE = `class Solution {
public:
    string longestPalindrome(string s) {
        if (s.empty()) return "";
        int start = 0, maxLen = 1;

        for (int i = 0; i < s.length(); ++i) {
            int len1 = expandFromCenter(s, i, i);     // Odd length
            int len2 = expandFromCenter(s, i, i + 1); // Even length
            int len = max(len1, len2);

            if (len > maxLen) {
                maxLen = len;
                start = i - (len - 1) / 2;
            }
        }

        return s.substr(start, maxLen);
    }

private:
    int expandFromCenter(const string& s, int left, int right) {
        while (left >= 0 && right < s.length() && s[left] == s[right]) {
            --left;
            ++right;
        }
        return right - left - 1;
    }
};`;

// --- HELPER FUNCTIONS ---

// A simple sleep function to pause between checks.
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- MAIN LOGIC ---

/**
 * Main function to run the LeetCode submission process.
 */
const main = async () => {
  if (!LEETCODE_SESSION || !CSRF_TOKEN) {
    console.error("Error: LEETCODE_SESSION or CSRF_TOKEN secrets are not set.");
    process.exit(1);
  }

  try {
    // Step 1: Submit the solution
    console.log(`Submitting solution for "${PROBLEM_SLUG}"...`);
    const submissionId = await submitSolution();
    console.log(`✅ Solution submitted successfully! Submission ID: ${submissionId}`);

    // Step 2: Check the status until a result is received
    console.log("Checking submission status...");
    const result = await checkSubmissionStatus(submissionId);
    
    // Step 3: Log the final result
    console.log("\n--- Submission Result ---");
    console.log(`Status: ${result.status_display}`);
    console.log(`Runtime: ${result.status_runtime}`);
    console.log(`Memory: ${result.status_memory}`);
    console.log(`Language: ${result.lang}`);
    console.log("-------------------------\n");

    if (result.state === "SUCCESS") {
        console.log("🏆 Submission Accepted!");
    } else {
        console.log("❌ Submission Failed or Errored.");
    }

  } catch (error) {
    console.error("An error occurred:", error.message);
    process.exit(1);
  }
};

/**
 * Sends a POST request to LeetCode to submit the code.
 * @returns {Promise<number>} The submission ID.
 */
const submitSolution = async () => {
  const url = `https://leetcode.com/problems/${PROBLEM_SLUG}/submit/`;
  const headers = {
    "Content-Type": "application/json",
    "Referer": `https://leetcode.com/problems/${PROBLEM_SLUG}/`,
    "x-csrftoken": CSRF_TOKEN,
    "Cookie": `LEETCODE_SESSION=${LEETCODE_SESSION}; csrftoken=${CSRF_TOKEN};`,
    "User-Agent": "Mozilla/5.0",
  };
  const body = JSON.stringify({
    lang: LANG,
    question_id: QUESTION_ID,
    typed_code: TYPED_CODE,
  });

  const response = await fetch(url, { method: "POST", headers, body });
  const data = await response.json();

  if (!data.submission_id) {
    throw new Error(`Failed to submit. LeetCode API response: ${JSON.stringify(data)}`);
  }

  return data.submission_id;
};

/**
 * Polls the LeetCode API to check the status of a submission.
 * @param {number} submissionId - The ID of the submission to check.
 * @returns {Promise<object>} The final result object from the API.
 */
const checkSubmissionStatus = async (submissionId) => {
  const url = `https://leetcode.com/submissions/detail/${submissionId}/check/`;
  const headers = {
    "Cookie": `LEETCODE_SESSION=${LEETCODE_SESSION}; csrftoken=${CSRF_TOKEN};`,
    "User-Agent": "Mozilla/5.0",
  };

  while (true) {
    const response = await fetch(url, { headers });
    const data = await response.json();

    if (data.state === "PENDING" || data.state === "STARTED") {
      process.stdout.write("Status: PENDING... Retrying in 2 seconds.\r");
      await sleep(2000); // Wait for 2 seconds before checking again
    } else {
      process.stdout.write("\n"); // Clear the line
      return data; // Return the final result
    }
  }
};

// Run the main function
main();