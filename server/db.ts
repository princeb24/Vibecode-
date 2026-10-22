import * as fs from 'node:fs';
import * as path from 'node:path';
import bcrypt from 'bcryptjs';
import { User, Competition, Question, Submission, LeaderboardRow } from './types';
import { calculatePenalty, rankPlayers, PlayerScoreSummary } from '../src/utils/scoring';

interface DatabaseSchema {
  users: User[];
  competition: Competition;
  questions: Question[];
  submissions: Submission[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'codebattle.json');

class Database {
  private data: DatabaseSchema;

  constructor() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    this.data = this.loadOrInit();
  }

  private loadOrInit(): DatabaseSchema {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        // Ensure BLACKDRAGON admin exists and has updated password
        let hasAdmin = false;
        parsed.users.forEach((u: User) => {
          if (u.username.toUpperCase() === 'BLACKDRAGON' || u.role === 'admin') {
            hasAdmin = true;
            u.username = 'BLACKDRAGON';
            u.email = 'blackdragon@codebattle.dev';
            u.name = 'Grandmaster Administrator (BLACKDRAGON)';
            u.passwordHash = bcrypt.hashSync('BLACKDRAGON9025', 10);
            u.role = 'admin';
          }
        });
        if (!hasAdmin) {
          parsed.users.unshift({
            id: 'usr-admin-blackdragon',
            username: 'BLACKDRAGON',
            email: 'blackdragon@codebattle.dev',
            name: 'Grandmaster Administrator (BLACKDRAGON)',
            role: 'admin',
            passwordHash: bcrypt.hashSync('BLACKDRAGON9025', 10),
            createdAt: new Date().toISOString(),
          });
        }
        return parsed;
      } catch (err) {
        console.error('Failed to read db file, initializing seed:', err);
      }
    }

    const seeded = this.createSeedData();
    this.persist(seeded);
    return seeded;
  }

  private persist(data?: DatabaseSchema) {
    const toSave = data || this.data;
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(toSave, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  }

  private createSeedData(): DatabaseSchema {
    const salt = bcrypt.genSaltSync(10);
    const adminHash = bcrypt.hashSync('BLACKDRAGON9025', salt);
    const playerHash = bcrypt.hashSync('Player123!', salt);

    const users: User[] = [
      {
        id: 'usr-admin-blackdragon',
        username: 'BLACKDRAGON',
        email: 'blackdragon@codebattle.dev',
        name: 'Grandmaster Administrator (BLACKDRAGON)',
        role: 'admin',
        passwordHash: adminHash,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'usr-player-01',
        username: 'alex_coder',
        email: 'alex@codebattle.dev',
        name: 'Alex Chen',
        role: 'player',
        passwordHash: playerHash,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'usr-player-02',
        username: 'sarah_dev',
        email: 'sarah@codebattle.dev',
        name: 'Sarah Miller',
        role: 'player',
        passwordHash: playerHash,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'usr-player-03',
        username: 'dev_david',
        email: 'david@codebattle.dev',
        name: 'David Kim',
        role: 'player',
        passwordHash: playerHash,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'usr-player-04',
        username: 'maya_hacks',
        email: 'maya@codebattle.dev',
        name: 'Maya Patel',
        role: 'player',
        passwordHash: playerHash,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'usr-player-05',
        username: 'jordan_algo',
        email: 'jordan@codebattle.dev',
        name: 'Jordan Lee',
        role: 'player',
        passwordHash: playerHash,
        createdAt: new Date().toISOString(),
      },
    ];

    const now = Date.now();
    // Default initial question allocated time is 10 minutes (600 seconds)
    const initialQuestionDurationSec = 600;

    const competition: Competition = {
      id: 'comp-spring-2026',
      title: 'Code Battle: Grand Arena Tournament',
      description: 'Sequential competitive debugging championship managed by BLACKDRAGON. Each program is strictly timed by the administrator. When time expires, previous code is permanently locked and the arena advances to the next challenge!',
      status: 'active',
      durationMinutes: 90,
      startTime: new Date(now - 4 * 60 * 1000).toISOString(), // started 4 minutes ago
      endTime: new Date(now + 86 * 60 * 1000).toISOString(),
      freezeMinutesBeforeEnd: 15,
      isFrozen: false,
      currentQuestionId: 'q-01',
      currentQuestionIndex: 0,
      currentQuestionStartTime: new Date(now - 4 * 60 * 1000).toISOString(),
      currentQuestionDurationSeconds: initialQuestionDurationSec,
      currentQuestionEndTime: new Date(now - 4 * 60 * 1000 + initialQuestionDurationSec * 1000).toISOString(), // ~6 mins left
      autoAdvanceOnTimeOver: true,
      createdAt: new Date(now - 4 * 60 * 1000).toISOString(),
    };

    const questions: Question[] = [
      {
        id: 'q-01',
        slug: 'two-sum-array-bound',
        title: 'Two Sum: Array Bounds & Duplicate Index Fix',
        difficulty: 'Easy',
        category: 'Arrays & Hashing',
        points: 100,
        timeLimitMs: 3000,
        allocatedTimeMinutes: 10,
        memoryLimitMb: 128,
        description: `Given an array of integers \`nums\` and an integer \`target\`, return the **0-based indices** of the two numbers such that they add up to \`target\`.

Each input has exactly one solution, and you may not use the same element twice.
Input format: First line contains integer \`N\`, second line contains \`N\` space-separated integers, third line contains integer \`target\`.
Output format: Print the two 0-based indices separated by a space in ascending order.

### The Bug in Starter Code:
The provided starter code suffers from an off-by-one boundary error in the inner loop and accidentally compares the same index with itself. Fix the logic to return the correct indices.`,
        inputFormat: 'Line 1: N (array length)\nLine 2: N space-separated integers\nLine 3: target integer',
        outputFormat: 'Two space-separated indices: i j (i < j)',
        constraints: [
          '2 <= N <= 10^4',
          '-10^9 <= nums[i] <= 10^9',
          '-10^9 <= target <= 10^9',
          'Only one valid answer exists.',
        ],
        status: 'published',
        order: 1,
        starterCode: {
          python: `import sys

def solve():
    input_data = sys.stdin.read().split()
    if not input_data:
        return
    n = int(input_data[0])
    nums = [int(x) for x in input_data[1:n+1]]
    target = int(input_data[n+1])

    # BUGGY IMPLEMENTATION: Has duplicate index bug & off-by-one
    for i in range(n):
        for j in range(0, n): # BUG: Starts from 0, can pick i == j
            if nums[i] + nums[j] == target:
                print(f"{i} {j}")
                return

if __name__ == '__main__':
    solve()
`,
          c: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    long long *nums = (long long*)malloc(n * sizeof(long long));
    for (int i = 0; i < n; i++) {
        scanf("%lld", &nums[i]);
    }
    long long target;
    scanf("%lld", &target);

    // BUG: j loop includes i == j
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            if (nums[i] + nums[j] == target) {
                printf("%d %d\\n", i, j);
                free(nums);
                return 0;
            }
        }
    }
    free(nums);
    return 0;
}
`,
          cpp: `#include <iostream>
#include <vector>

using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    int n;
    if (!(cin >> n)) return 0;
    vector<long long> nums(n);
    for (int i = 0; i < n; i++) cin >> nums[i];
    long long target;
    cin >> target;

    // BUG: j starts at 0 instead of i + 1
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            if (nums[i] + nums[j] == target) {
                cout << i << " " << j << "\\n";
                return 0;
            }
        }
    }
    return 0;
}
`,
          java: `import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) return;
        int n = sc.nextInt();
        long[] nums = new long[n];
        for (int i = 0; i < n; i++) {
            nums[i] = sc.nextLong();
        }
        long target = sc.nextLong();

        // BUG: j should start at i + 1
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                if (nums[i] + nums[j] == target) {
                    System.out.println(i + " " + j);
                    return;
                }
            }
        }
    }
}
`,
        },
        solutionCode: {
          python: `import sys

def solve():
    input_data = sys.stdin.read().split()
    if not input_data:
        return
    n = int(input_data[0])
    nums = [int(x) for x in input_data[1:n+1]]
    target = int(input_data[n+1])

    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            print(f"{seen[complement]} {i}")
            return
        seen[num] = i

if __name__ == '__main__':
    solve()
`,
        },
        testCases: [
          {
            id: 'tc-01-1',
            input: '4\n2 7 11 15\n9',
            expectedOutput: '0 1',
            isPrivate: false,
            explanation: 'nums[0] + nums[1] == 2 + 7 == 9. Indices are 0 1.',
          },
          {
            id: 'tc-01-2',
            input: '3\n3 2 4\n6',
            expectedOutput: '1 2',
            isPrivate: false,
            explanation: 'nums[1] + nums[2] == 2 + 4 == 6. Indices are 1 2 (cannot use 0 twice).',
          },
          {
            id: 'tc-01-3',
            input: '2\n3 3\n6',
            expectedOutput: '0 1',
            isPrivate: true,
          },
          {
            id: 'tc-01-4',
            input: '5\n-3 4 3 90 2\n0',
            expectedOutput: '0 2',
            isPrivate: true,
          },
          {
            id: 'tc-01-5',
            input: '6\n1000000000 5 10 20 500 1000000000\n2000000000',
            expectedOutput: '0 5',
            isPrivate: true,
          },
        ],
        createdAt: new Date(now - 28 * 60 * 1000).toISOString(),
        updatedAt: new Date(now - 28 * 60 * 1000).toISOString(),
      },
      {
        id: 'q-02',
        slug: 'string-reverse-case-invert',
        title: 'String Inversion with Case Flipping',
        difficulty: 'Easy',
        category: 'Strings',
        points: 100,
        timeLimitMs: 3000,
        allocatedTimeMinutes: 10,
        memoryLimitMb: 128,
        description: `Given a single line string \`S\`, reverse the entire string while **inverting the case** of every alphabetical character (lowercase becomes UPPERCASE, and UPPERCASE becomes lowercase). Non-alphabetical characters (digits, symbols, punctuation) remain unchanged.

Input format: A single line string \`S\`.
Output format: The reversed string with inverted letter cases.

### The Bug in Starter Code:
The starter code reverses the string but omits the case inversion for lowercase letters and crashes on spaces. Fix it so all tests pass.`,
        inputFormat: 'A single line string S',
        outputFormat: 'Reversed string with inverted letter case',
        constraints: [
          '1 <= |S| <= 10^5',
          'S may contain letters, digits, punctuation, and spaces.',
        ],
        status: 'published',
        order: 2,
        starterCode: {
          python: `import sys

def solve():
    line = sys.stdin.read().rstrip('\\r\\n')
    if not line:
        return

    # BUG: Just reverses without inverting case
    result = line[::-1]
    print(result)

if __name__ == '__main__':
    solve()
`,
          c: `#include <stdio.h>
#include <string.h>
#include <ctype.h>

int main() {
    char s[100005];
    if (!fgets(s, sizeof(s), stdin)) return 0;
    int len = strlen(s);
    while (len > 0 && (s[len - 1] == '\\n' || s[len - 1] == '\\r')) {
        s[--len] = '\\0';
    }

    // BUG: Only prints reversed without flipping case
    for (int i = len - 1; i >= 0; i--) {
        putchar(s[i]);
    }
    putchar('\\n');
    return 0;
}
`,
          cpp: `#include <iostream>
#include <string>
#include <algorithm>
#include <cctype>

using namespace std;

int main() {
    string s;
    if (!getline(cin, s)) return 0;

    // BUG: Missing case swap
    reverse(s.begin(), s.end());
    cout << s << "\\n";
    return 0;
}
`,
          java: `import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextLine()) return;
        String s = sc.nextLine();

        // BUG: Only reverses
        StringBuilder sb = new StringBuilder(s).reverse();
        System.out.println(sb.toString());
    }
}
`,
        },
        solutionCode: {
          python: `import sys

def solve():
    line = sys.stdin.read().rstrip('\\r\\n')
    if not line:
        return
    reversed_str = line[::-1]
    print(reversed_str.swapcase())

if __name__ == '__main__':
    solve()
`,
        },
        testCases: [
          {
            id: 'tc-02-1',
            input: 'HelloWorld',
            expectedOutput: 'DLROwOLLEh',
            isPrivate: false,
            explanation: 'Reversed is "dlroWolleH", with inverted case is "DLROwOLLEh".',
          },
          {
            id: 'tc-02-2',
            input: 'CodeBattle 2026!',
            expectedOutput: '!6202 ELTTAbeDOc',
            isPrivate: false,
            explanation: 'Reversed order, letters case swapped, spaces and numbers unchanged.',
          },
          {
            id: 'tc-02-3',
            input: 'a',
            expectedOutput: 'A',
            isPrivate: true,
          },
          {
            id: 'tc-02-4',
            input: 'AbCdEfG123',
            expectedOutput: '321gFeDcBa',
            isPrivate: true,
          },
          {
            id: 'tc-02-5',
            input: '   Leading and Trailing Spaces   ',
            expectedOutput: '   SECAPs GNILIARt DNA GNIDAEl   ',
            isPrivate: true,
          },
        ],
        createdAt: new Date(now - 28 * 60 * 1000).toISOString(),
        updatedAt: new Date(now - 28 * 60 * 1000).toISOString(),
      },
      {
        id: 'q-03',
        slug: 'binary-search-overflow-guard',
        title: 'Binary Search: Midpoint Overflow & Loop Condition',
        difficulty: 'Medium',
        category: 'Binary Search',
        points: 200,
        timeLimitMs: 2500,
        allocatedTimeMinutes: 15,
        memoryLimitMb: 128,
        description: `Given a sorted array of \`N\` integers in non-decreasing order and a query value \`X\`, find the **first (leftmost) 0-based index** where \`nums[i] >= X\`.
If all elements are smaller than \`X\`, output \`N\`.

Input format:
Line 1: \`N\` (number of elements)
Line 2: \`N\` space-separated sorted integers
Line 3: \`Q\` (number of queries)
Line 4: \`Q\` space-separated integers representing query values \`X\`

Output format:
Print \`Q\` space-separated indices.`,
        inputFormat: 'N\nN sorted integers\nQ\nQ query integers',
        outputFormat: 'Q space-separated indices',
        constraints: [
          '1 <= N <= 10^5',
          '1 <= Q <= 10^5',
          '-10^9 <= nums[i], X <= 10^9',
        ],
        status: 'published',
        order: 3,
        starterCode: {
          python: `import sys

def lower_bound(nums, x):
    low = 0
    high = len(nums) - 1
    ans = len(nums)

    while low < high: # BUG: misses low == high case
        mid = (low + high) // 2
        if nums[mid] >= x:
            ans = mid
            high = mid - 1
        else:
            low = mid + 1
    return ans

def solve():
    data = sys.stdin.read().split()
    if not data:
        return
    n = int(data[0])
    nums = [int(x) for x in data[1:n+1]]
    q = int(data[n+1])
    queries = [int(x) for x in data[n+2:n+2+q]]

    results = [str(lower_bound(nums, q_val)) for q_val in queries]
    print(" ".join(results))

if __name__ == '__main__':
    solve()
`,
          c: `#include <stdio.h>
#include <stdlib.h>

int lower_bound(long long *nums, int n, long long x) {
    int low = 0, high = n - 1;
    int ans = n;
    while (low < high) { // BUG: low <= high
        int mid = (low + high) / 2;
        if (nums[mid] >= x) {
            ans = mid;
            high = mid - 1;
        } else {
            low = mid + 1;
        }
    }
    return ans;
}

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    long long *nums = (long long*)malloc(n * sizeof(long long));
    for (int i = 0; i < n; i++) scanf("%lld", &nums[i]);
    int q;
    scanf("%d", &q);
    for (int i = 0; i < q; i++) {
        long long x;
        scanf("%lld", &x);
        printf("%d%c", lower_bound(nums, n, x), (i == q - 1 ? '\\n' : ' '));
    }
    free(nums);
    return 0;
}
`,
          cpp: `#include <iostream>
#include <vector>

using namespace std;

int lower_bound_custom(const vector<long long>& nums, long long x) {
    int low = 0, high = nums.size() - 1;
    int ans = nums.size();
    while (low < high) { // BUG: should be low <= high
        int mid = low + (high - low) / 2;
        if (nums[mid] >= x) {
            ans = mid;
            high = mid - 1;
        } else {
            low = mid + 1;
        }
    }
    return ans;
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    int n;
    if (!(cin >> n)) return 0;
    vector<long long> nums(n);
    for (int i = 0; i < n; i++) cin >> nums[i];
    int q;
    cin >> q;
    for (int i = 0; i < q; i++) {
        long long x;
        cin >> x;
        cout << lower_bound_custom(nums, x) << (i == q - 1 ? "" : " ");
    }
    cout << "\\n";
    return 0;
}
`,
          java: `import java.util.*;

public class Solution {
    static int lowerBound(long[] nums, long x) {
        int low = 0, high = nums.length - 1;
        int ans = nums.length;
        while (low < high) { // BUG: should be low <= high
            int mid = low + (high - low) / 2;
            if (nums[mid] >= x) {
                ans = mid;
                high = mid - 1;
            } else {
                low = mid + 1;
            }
        }
        return ans;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) return;
        int n = sc.nextInt();
        long[] nums = new long[n];
        for (int i = 0; i < n; i++) nums[i] = sc.nextLong();
        int q = sc.nextInt();
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < q; i++) {
            long x = sc.nextLong();
            if (i > 0) sb.append(" ");
            sb.append(lowerBound(nums, x));
        }
        System.out.println(sb.toString());
    }
}
`,
        },
        solutionCode: {
          python: `import sys
import bisect

def solve():
    data = sys.stdin.read().split()
    if not data:
        return
    n = int(data[0])
    nums = [int(x) for x in data[1:n+1]]
    q = int(data[n+1])
    queries = [int(x) for x in data[n+2:n+2+q]]

    results = [str(bisect.bisect_left(nums, x)) for x in queries]
    print(" ".join(results))

if __name__ == '__main__':
    solve()
`,
        },
        testCases: [
          {
            id: 'tc-03-1',
            input: '5\n1 3 5 7 9\n3\n3 6 10',
            expectedOutput: '1 3 5',
            isPrivate: false,
            explanation: '3 is at index 1. First element >= 6 is 7 at index 3. 10 is greater than all, so output n=5.',
          },
          {
            id: 'tc-03-2',
            input: '4\n2 2 2 2\n2\n2 1',
            expectedOutput: '0 0',
            isPrivate: false,
            explanation: 'Leftmost index >= 2 is 0. Leftmost index >= 1 is 0.',
          },
          {
            id: 'tc-03-3',
            input: '1\n100\n3\n50 100 150',
            expectedOutput: '0 0 1',
            isPrivate: true,
          },
          {
            id: 'tc-03-4',
            input: '6\n-10 -5 0 5 10 15\n4\n-20 0 7 20',
            expectedOutput: '0 2 4 6',
            isPrivate: true,
          },
          {
            id: 'tc-03-5',
            input: '5\n1000000000 1000000000 1000000000 1000000000 1000000000\n2\n500000000 1000000001',
            expectedOutput: '0 5',
            isPrivate: true,
          },
        ],
        createdAt: new Date(now - 28 * 60 * 1000).toISOString(),
        updatedAt: new Date(now - 28 * 60 * 1000).toISOString(),
      },
      {
        id: 'q-04',
        slug: 'valid-nested-delimiters',
        title: 'Syntax Validator: Balanced Nested Delimiters',
        difficulty: 'Medium',
        category: 'Stacks & Parsing',
        points: 200,
        timeLimitMs: 2500,
        allocatedTimeMinutes: 15,
        memoryLimitMb: 128,
        description: `Given a string containing only brackets \`()\`, \`{}\`, \`[]\`, determine if the input string is valid.`,
        inputFormat: 'T\nT lines of bracket strings',
        outputFormat: 'T lines: VALID or INVALID',
        constraints: [
          '1 <= T <= 1000',
          '1 <= length of each string <= 10^4',
        ],
        status: 'published',
        order: 4,
        starterCode: {
          python: `import sys

def is_valid(s):
    stack = []
    mapping = {')': '(', '}': '{', ']': '['}

    for char in s:
        if char in mapping:
            top = stack.pop() # BUG: crashes if stack empty
            if mapping[char] != top:
                return False
        else:
            stack.append(char)
    return True # BUG: ignores unpopped brackets

def solve():
    lines = sys.stdin.read().split()
    if not lines:
        return
    t = int(lines[0])
    for i in range(1, t + 1):
        print("VALID" if is_valid(lines[i]) else "INVALID")

if __name__ == '__main__':
    solve()
`,
          c: `#include <stdio.h>\n#include <string.h>\n#include <stdbool.h>\nbool is_valid(const char *s) { char stack[10005]; int top = -1; for (int i = 0; s[i] != '\\0'; i++) { char c = s[i]; if (c == '(' || c == '{' || c == '[') { stack[++top] = c; } else { char match = stack[top--]; if ((c == ')' && match != '(') || (c == '}' && match != '{') || (c == ']' && match != '[')) return false; } } return true; } int main() { int t; if (scanf("%d", &t) != 1) return 0; char s[10005]; while (t--) { scanf("%s", s); printf("%s\\n", is_valid(s) ? "VALID" : "INVALID"); } return 0; }`,
          cpp: `#include <iostream>\n#include <stack>\n#include <string>\nusing namespace std;\nbool isValid(const string& s) { stack<char> st; for (char c : s) { if (c == '(' || c == '{' || c == '[') st.push(c); else { char top = st.top(); st.pop(); if ((c == ')' && top != '(') || (c == '}' && top != '{') || (c == ']' && top != '[')) return false; } } return true; } int main() { int t; if (!(cin >> t)) return 0; while (t--) { string s; cin >> s; cout << (isValid(s) ? "VALID" : "INVALID") << "\\n"; } return 0; }`,
          java: `import java.util.*;\npublic class Solution { static boolean isValid(String s) { Deque<Character> stack = new ArrayDeque<>(); for (char c : s.toCharArray()) { if (c == '(' || c == '{' || c == '[') stack.push(c); else { char top = stack.pop(); if ((c == ')' && top != '(') || (c == '}' && top != '{') || (c == ']' && top != '[')) return false; } } return true; } public static void main(String[] args) { Scanner sc = new Scanner(System.in); if (!sc.hasNextInt()) return; int t = sc.nextInt(); while (t-- > 0) { System.out.println(isValid(sc.next()) ? "VALID" : "INVALID"); } } }`,
        },
        solutionCode: {
          python: `import sys\ndef is_valid(s):\n    stack = []\n    mapping = {')': '(', '}': '{', ']': '['}\n    for char in s:\n        if char in mapping:\n            if not stack or stack.pop() != mapping[char]:\n                return False\n        else:\n            stack.append(char)\n    return len(stack) == 0\ndef solve():\n    lines = sys.stdin.read().split()\n    if not lines:\n        return\n    t = int(lines[0])\n    for i in range(1, t + 1):\n        print("VALID" if is_valid(lines[i]) else "INVALID")\nif __name__ == '__main__':\n    solve()`,
        },
        testCases: [
          { id: 'tc-04-1', input: '3\n()\n()[]{}\n(]', expectedOutput: 'VALID\nVALID\nINVALID', isPrivate: false },
          { id: 'tc-04-2', input: '2\n([)]\n{[]}', expectedOutput: 'INVALID\nVALID', isPrivate: false },
          { id: 'tc-04-3', input: '3\n)\n((\n))', expectedOutput: 'INVALID\nINVALID\nINVALID', isPrivate: true },
          { id: 'tc-04-4', input: '2\n{[()()]}\n{[(])}', expectedOutput: 'VALID\nINVALID', isPrivate: true },
          { id: 'tc-04-5', input: '1\n(((((((((())))))))))', expectedOutput: 'VALID', isPrivate: true },
        ],
        createdAt: new Date(now - 28 * 60 * 1000).toISOString(),
        updatedAt: new Date(now - 28 * 60 * 1000).toISOString(),
      },
      {
        id: 'q-05',
        slug: 'longest-palindromic-span',
        title: 'Longest Palindromic Span Debugger',
        difficulty: 'Hard',
        category: 'Dynamic Programming & Two Pointers',
        points: 300,
        timeLimitMs: 3000,
        allocatedTimeMinutes: 20,
        memoryLimitMb: 128,
        description: `Given a string \`S\`, return the length of the longest palindromic contiguous substring in \`S\`.`,
        inputFormat: 'A single line string S',
        outputFormat: 'Single integer length',
        constraints: ['1 <= |S| <= 2000', 'S consists of lowercase English letters only.'],
        status: 'published',
        order: 5,
        starterCode: {
          python: `import sys\ndef solve():\n    s = sys.stdin.read().strip()\n    if not s:\n        print(0)\n        return\n    n = len(s)\n    max_len = 1\n    for i in range(n):\n        l, r = i, i\n        while l >= 0 and r < n and s[l] == s[r]:\n            max_len = max(max_len, r - l + 1)\n            l -= 1\n            r += 1\n    print(max_len)\nif __name__ == '__main__':\n    solve()`,
          c: `#include <stdio.h>\n#include <string.h>\nint main() { char s[2005]; if (scanf("%s", s) != 1) return 0; int n = strlen(s), max_len = 1; for (int i = 0; i < n; i++) { int l = i, r = i; while (l >= 0 && r < n && s[l] == s[r]) { int len = r - l + 1; if (len > max_len) max_len = len; l--; r++; } } printf("%d\\n", max_len); return 0; }`,
          cpp: `#include <iostream>\n#include <string>\nusing namespace std;\nint main() { string s; if (!(cin >> s)) return 0; int n = s.size(), max_len = 1; for (int i = 0; i < n; i++) { int l = i, r = i; while (l >= 0 && r < n && s[l] == s[r]) { max_len = max(max_len, r - l + 1); l--; r++; } } cout << max_len << "\\n"; return 0; }`,
          java: `import java.util.*;\npublic class Solution { public static void main(String[] args) { Scanner sc = new Scanner(System.in); if (!sc.hasNext()) return; String s = sc.next(); int n = s.length(), maxLen = 1; for (int i = 0; i < n; i++) { int l = i, r = i; while (l >= 0 && r < n && s.charAt(l) == s.charAt(r)) { maxLen = Math.max(maxLen, r - l + 1); l--; r++; } } System.out.println(maxLen); } }`,
        },
        solutionCode: {
          python: `import sys\ndef solve():\n    s = sys.stdin.read().strip()\n    if not s:\n        print(0)\n        return\n    n = len(s)\n    def expand(l, r):\n        while l >= 0 and r < n and s[l] == s[r]:\n            l -= 1\n            r += 1\n        return r - l - 1\n    max_len = 1\n    for i in range(n):\n        max_len = max(max_len, expand(i, i), expand(i, i + 1))\n    print(max_len)\nif __name__ == '__main__':\n    solve()`,
        },
        testCases: [
          { id: 'tc-05-1', input: 'babad', expectedOutput: '3', isPrivate: false },
          { id: 'tc-05-2', input: 'cbbd', expectedOutput: '2', isPrivate: false },
          { id: 'tc-05-3', input: 'a', expectedOutput: '1', isPrivate: true },
          { id: 'tc-05-4', input: 'racecar', expectedOutput: '7', isPrivate: true },
          { id: 'tc-05-5', input: 'noonnoon', expectedOutput: '8', isPrivate: true },
        ],
        createdAt: new Date(now - 28 * 60 * 1000).toISOString(),
        updatedAt: new Date(now - 28 * 60 * 1000).toISOString(),
      },
      {
        id: 'q-06',
        slug: 'prime-factor-gcd-accelerator',
        title: 'Prime Factorization & GCD Accelerator',
        difficulty: 'Hard',
        category: 'Number Theory',
        points: 300,
        timeLimitMs: 2000,
        allocatedTimeMinutes: 20,
        memoryLimitMb: 128,
        description: `Given two positive 64-bit integers \`A\` and \`B\`, find the **Greatest Common Divisor (GCD)** of \`A\` and \`B\`, and print the **sum of distinct prime factors** of that GCD.`,
        inputFormat: 'A B',
        outputFormat: 'GCD Sum_Of_Distinct_Primes',
        constraints: ['1 <= A, B <= 10^12'],
        status: 'published',
        order: 6,
        starterCode: {
          python: `import sys, math\ndef sum_distinct_primes(n):\n    if n <= 1: return 0\n    total = 0\n    d = 2\n    while d * d <= n:\n        if n % d == 0:\n            total += d\n            while n % d == 0: n //= d\n        d += 1\n    return total\ndef solve():\n    d = sys.stdin.read().split()\n    if len(d) < 2: return\n    a, b = int(d[0]), int(d[1])\n    g = math.gcd(a, b)\n    print(f"{g} {sum_distinct_primes(g)}")\nif __name__ == '__main__': solve()`,
          c: `#include <stdio.h>\nlong long gcd(long long a, long long b) { while (b) { long long t = b; b = a % b; a = t; } return a; }\nlong long sum_distinct_primes(long long n) { if (n <= 1) return 0; long long total = 0; for (long long d = 2; d * d <= n; d++) { if (n % d == 0) { total += d; while (n % d == 0) n /= d; } } return total; }\nint main() { long long a, b; if (scanf("%lld %lld", &a, &b) != 2) return 0; long long g = gcd(a, b); printf("%lld %lld\\n", g, sum_distinct_primes(g)); return 0; }`,
          cpp: `#include <iostream>\n#include <numeric>\nusing namespace std;\nlong long sum_distinct_primes(long long n) { if (n <= 1) return 0; long long total = 0; for (long long d = 2; d * d <= n; d++) { if (n % d == 0) { total += d; while (n % d == 0) n /= d; } } return total; }\nint main() { long long a, b; if (!(cin >> a >> b)) return 0; long long g = std::gcd(a, b); cout << g << " " << sum_distinct_primes(g) << "\\n"; return 0; }`,
          java: `import java.util.*;\npublic class Solution { static long gcd(long a, long b) { while (b != 0) { long t = b; b = a % b; a = t; } return a; } static long sumDistinctPrimes(long n) { if (n <= 1) return 0; long total = 0; for (long d = 2; d * d <= n; d++) { if (n % d == 0) { total += d; while (n % d == 0) n /= d; } } return total; } public static void main(String[] args) { Scanner sc = new Scanner(System.in); if (!sc.hasNextLong()) return; long a = sc.nextLong(), b = sc.nextLong(); long g = gcd(a, b); System.out.println(g + " " + sumDistinctPrimes(g)); } }`,
        },
        solutionCode: {
          python: `import sys, math\ndef solve():\n    d = sys.stdin.read().split()\n    if len(d) < 2: return\n    a, b = int(d[0]), int(d[1])\n    g = math.gcd(a, b)\n    if g <= 1: print(f"{g} 0"); return\n    n, total, d = g, 0, 2\n    while d * d <= n:\n        if n % d == 0:\n            total += d\n            while n % d == 0: n //= d\n        d += 1\n    if n > 1: total += n\n    print(f"{g} {total}")\nif __name__ == '__main__': solve()`,
        },
        testCases: [
          { id: 'tc-06-1', input: '60 90', expectedOutput: '30 10', isPrivate: false },
          { id: 'tc-06-2', input: '17 31', expectedOutput: '1 0', isPrivate: false },
          { id: 'tc-06-3', input: '100 100', expectedOutput: '100 7', isPrivate: true },
          { id: 'tc-06-4', input: '999999999998 499999999999', expectedOutput: '499999999999 499999999999', isPrivate: true },
          { id: 'tc-06-5', input: '1000000000000 1000000000', expectedOutput: '1000000000 7', isPrivate: true },
        ],
        createdAt: new Date(now - 28 * 60 * 1000).toISOString(),
        updatedAt: new Date(now - 28 * 60 * 1000).toISOString(),
      },
    ];

    const submissions: Submission[] = [];

    return { users, competition, questions, submissions };
  }

  // --- Users ---
  getUsers(): User[] {
    return this.data.users;
  }

  getUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  getUserByUsername(username: string): User | undefined {
    return this.data.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  }

  getUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  addUser(user: User): User {
    this.data.users.push(user);
    this.persist();
    return user;
  }

  updateUser(id: string, updates: Partial<User>): User | null {
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    this.data.users[idx] = { ...this.data.users[idx], ...updates };
    this.persist();
    return this.data.users[idx];
  }

  // --- Competition & Timer Logic ---
  getCompetition(): Competition {
    this.checkAndAutoAdvanceQuestionTimer();
    return this.data.competition;
  }

  updateCompetition(updates: Partial<Competition>): Competition {
    this.data.competition = { ...this.data.competition, ...updates };
    this.persist();
    return this.data.competition;
  }

  /**
   * CRITICAL REQUIREMENT:
   * "for every code there should be a time the time should be only add by the admin
   * if the time over the next program should execute the previous program should not work if the time gets over"
   */
  checkAndAutoAdvanceQuestionTimer(): boolean {
    const comp = this.data.competition;
    if (comp.status !== 'active' || !comp.autoAdvanceOnTimeOver) {
      return false;
    }

    const now = Date.now();
    const endMs = new Date(comp.currentQuestionEndTime).getTime();

    if (now >= endMs) {
      // Time is over for current question!
      // Find the next published question in order
      const questions = this.getQuestions(false);
      const currentIndex = questions.findIndex(q => q.id === comp.currentQuestionId);
      const nextIndex = currentIndex + 1;

      if (nextIndex < questions.length) {
        // Advance to next program!
        const nextQ = questions[nextIndex];
        const durationSec = (nextQ.allocatedTimeMinutes || 10) * 60;
        const newStart = new Date().toISOString();
        const newEnd = new Date(now + durationSec * 1000).toISOString();

        this.data.competition.currentQuestionId = nextQ.id;
        this.data.competition.currentQuestionIndex = nextIndex;
        this.data.competition.currentQuestionStartTime = newStart;
        this.data.competition.currentQuestionDurationSeconds = durationSec;
        this.data.competition.currentQuestionEndTime = newEnd;

        this.persist();
        return true;
      } else {
        // All programs completed! Mark competition as ended
        this.data.competition.status = 'ended';
        this.persist();
        return true;
      }
    }
    return false;
  }

  /**
   * Admin-only: Add time to currently executing question
   */
  addTimeToCurrentQuestion(extraSeconds: number): Competition {
    const comp = this.data.competition;
    const currentEndMs = new Date(comp.currentQuestionEndTime).getTime();
    const now = Date.now();
    const baseMs = Math.max(now, currentEndMs);
    const newEndMs = baseMs + extraSeconds * 1000;

    comp.currentQuestionEndTime = new Date(newEndMs).toISOString();
    comp.currentQuestionDurationSeconds += extraSeconds;
    this.persist();
    return comp;
  }

  /**
   * Admin-only: Force advance to the next program immediately
   */
  advanceToNextQuestion(): Competition {
    const comp = this.data.competition;
    const questions = this.getQuestions(false);
    const currentIdx = questions.findIndex(q => q.id === comp.currentQuestionId);
    const nextIdx = currentIdx + 1;

    if (nextIdx < questions.length) {
      const nextQ = questions[nextIdx];
      const now = Date.now();
      const durationSec = (nextQ.allocatedTimeMinutes || 10) * 60;

      comp.currentQuestionId = nextQ.id;
      comp.currentQuestionIndex = nextIdx;
      comp.currentQuestionStartTime = new Date(now).toISOString();
      comp.currentQuestionDurationSeconds = durationSec;
      comp.currentQuestionEndTime = new Date(now + durationSec * 1000).toISOString();
      this.persist();
    } else {
      comp.status = 'ended';
      this.persist();
    }
    return comp;
  }

  /**
   * Admin-only: Start or set a specific question as active with custom duration
   */
  startQuestion(questionId: string, durationMinutes: number): Competition {
    const comp = this.data.competition;
    const questions = this.getQuestions(false);
    const idx = questions.findIndex(q => q.id === questionId);
    if (idx === -1) return comp;

    const now = Date.now();
    const durationSec = durationMinutes * 60;

    comp.currentQuestionId = questionId;
    comp.currentQuestionIndex = idx;
    comp.currentQuestionStartTime = new Date(now).toISOString();
    comp.currentQuestionDurationSeconds = durationSec;
    comp.currentQuestionEndTime = new Date(now + durationSec * 1000).toISOString();
    comp.status = 'active';

    this.persist();
    return comp;
  }

  /**
   * Checks if a question is currently open for submissions:
   * Previous questions whose time expired are LOCKED and cannot be worked on.
   */
  isQuestionActiveForSubmissions(questionId: string): { active: boolean; reason?: string } {
    this.checkAndAutoAdvanceQuestionTimer();
    const comp = this.data.competition;

    if (comp.status !== 'active') {
      return { active: false, reason: `Competition is currently ${comp.status}. Submissions are closed.` };
    }

    const questions = this.getQuestions(false);
    const currentIdx = questions.findIndex(q => q.id === comp.currentQuestionId);
    const targetIdx = questions.findIndex(q => q.id === questionId);

    if (targetIdx < 0) {
      return { active: false, reason: 'Question not found or unpublished.' };
    }

    if (targetIdx < currentIdx) {
      return {
        active: false,
        reason: 'Time is over for this program! The previous program is permanently locked. Please move to the next program.',
      };
    }

    if (targetIdx > currentIdx) {
      return {
        active: false,
        reason: 'This program has not started yet. Complete the active program first.',
      };
    }

    const now = Date.now();
    const endMs = new Date(comp.currentQuestionEndTime).getTime();
    if (now >= endMs) {
      return {
        active: false,
        reason: 'Time expired for this program! Submissions are locked. Advancing to the next program.',
      };
    }

    return { active: true };
  }

  // --- Questions ---
  getQuestions(includeDrafts: boolean = false): Question[] {
    if (includeDrafts) {
      return [...this.data.questions].sort((a, b) => a.order - b.order);
    }
    return this.data.questions
      .filter(q => q.status === 'published')
      .sort((a, b) => a.order - b.order);
  }

  getQuestionById(id: string): Question | undefined {
    return this.data.questions.find(q => q.id === id);
  }

  getQuestionBySlug(slug: string): Question | undefined {
    return this.data.questions.find(q => q.slug === slug);
  }

  addQuestion(question: Question): Question {
    this.data.questions.push(question);
    this.persist();
    return question;
  }

  updateQuestion(id: string, updates: Partial<Question>): Question | null {
    const idx = this.data.questions.findIndex(q => q.id === id);
    if (idx === -1) return null;
    this.data.questions[idx] = {
      ...this.data.questions[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.persist();
    return this.data.questions[idx];
  }

  deleteQuestion(id: string): boolean {
    const initialLen = this.data.questions.length;
    this.data.questions = this.data.questions.filter(q => q.id !== id);
    if (this.data.questions.length !== initialLen) {
      this.persist();
      return true;
    }
    return false;
  }

  // --- Submissions ---
  getSubmissions(filter?: { userId?: string; questionId?: string; verdict?: string }): Submission[] {
    let list = [...this.data.submissions];
    if (filter?.userId) {
      list = list.filter(s => s.userId === filter.userId);
    }
    if (filter?.questionId) {
      list = list.filter(s => s.questionId === filter.questionId);
    }
    if (filter?.verdict) {
      list = list.filter(s => s.verdict === filter.verdict);
    }
    return list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }

  getSubmissionById(id: string): Submission | undefined {
    return this.data.submissions.find(s => s.id === id);
  }

  addSubmission(sub: Submission): Submission {
    this.data.submissions.push(sub);
    this.persist();
    return sub;
  }

  // --- Leaderboard Calculation ---
  getLeaderboard(): LeaderboardRow[] {
    const players = this.data.users.filter(u => u.role === 'player' && !u.disabled);
    const questions = this.getQuestions(false);
    const comp = this.data.competition;
    const compStartMs = new Date(comp.startTime).getTime();
    const currentQIdx = questions.findIndex(q => q.id === comp.currentQuestionId);

    const summaries: PlayerScoreSummary[] = players.map(player => {
      const playerSubs = this.data.submissions
        .filter(s => s.userId === player.id)
        .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());

      let totalScore = 0;
      let problemsSolved = 0;
      let totalPenaltyMinutes = 0;
      const problemDetails: PlayerScoreSummary['problemDetails'] = {};

      questions.forEach((q, idx) => {
        const qSubs = playerSubs.filter(s => s.questionId === q.id);
        const isPastExpired = idx < currentQIdx;

        if (qSubs.length === 0) {
          problemDetails[q.id] = {
            solved: false,
            points: 0,
            attempts: 0,
            penaltyMinutes: 0,
            status: isPastExpired ? 'expired' : 'unattempted',
          };
          return;
        }

        let wrongBeforeAc = 0;
        let acSub: Submission | null = null;

        for (const sub of qSubs) {
          if (sub.verdict === 'ACCEPTED') {
            acSub = sub;
            break;
          } else {
            wrongBeforeAc++;
          }
        }

        if (acSub) {
          const subMs = new Date(acSub.submittedAt).getTime();
          const solvedAtMinutes = Math.max(0, Math.floor((subMs - compStartMs) / (60 * 1000)));
          const penalty = calculatePenalty(solvedAtMinutes, wrongBeforeAc);

          totalScore += q.points;
          problemsSolved += 1;
          totalPenaltyMinutes += penalty;

          problemDetails[q.id] = {
            solved: true,
            points: q.points,
            attempts: wrongBeforeAc + 1,
            solvedAtMinutes,
            penaltyMinutes: penalty,
            status: 'solved',
          };
        } else {
          const maxScore = Math.max(...qSubs.map(s => s.score));
          totalScore += maxScore;
          problemDetails[q.id] = {
            solved: false,
            points: maxScore,
            attempts: qSubs.length,
            penaltyMinutes: 0,
            status: isPastExpired ? 'expired' : 'attempted',
          };
        }
      });

      return {
        userId: player.id,
        username: player.username,
        name: player.name,
        totalScore,
        problemsSolved,
        totalPenaltyMinutes,
        problemDetails,
      };
    });

    const ranked = rankPlayers(summaries);

    return ranked.map(r => {
      const lastSub = this.data.submissions
        .filter(s => s.userId === r.userId)
        .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0];

      return {
        rank: r.rank,
        userId: r.userId,
        username: r.username,
        name: r.name,
        totalScore: r.totalScore,
        problemsSolved: r.problemsSolved,
        totalPenaltyMinutes: r.totalPenaltyMinutes,
        problemStats: r.problemDetails as any,
        lastSubmissionTime: lastSub?.submittedAt,
      };
    });
  }
}

export const db = new Database();
