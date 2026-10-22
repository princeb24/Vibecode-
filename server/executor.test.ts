import test from 'node:test';
import assert from 'node:assert/strict';
import { executor } from './executor';
import { db } from './db';

test('Python3 real execution works in sandbox', async () => {
  const pyCode = `
import sys
data = sys.stdin.read().split()
if data:
    a, b = int(data[0]), int(data[1])
    print(a + b)
`;
  const res = await executor.runSingle('python', pyCode, '25 17\n', 3000);
  assert.equal(res.verdict, 'ACCEPTED');
  assert.equal(res.stdout.trim(), '42');
});

test('C compilation and execution with gcc works in sandbox', async () => {
  const cCode = `
#include <stdio.h>
int main() {
    int a, b;
    if (scanf("%d %d", &a, &b) == 2) {
        printf("%d\\n", a * b);
    }
    return 0;
}
`;
  const res = await executor.runSingle('c', cCode, '6 7\n', 5000);
  assert.equal(res.verdict, 'ACCEPTED');
  assert.equal(res.stdout.trim(), '42');
});

test('C++ compilation and execution with g++ works in sandbox', async () => {
  const cppCode = `
#include <iostream>
using namespace std;
int main() {
    int x;
    if (cin >> x) {
        cout << (x * 2) << endl;
    }
    return 0;
}
`;
  const res = await executor.runSingle('cpp', cppCode, '50\n', 5000);
  assert.equal(res.verdict, 'ACCEPTED');
  assert.equal(res.stdout.trim(), '100');
});

test('Timeout detection triggers TIME_LIMIT_EXCEEDED on infinite loop', async () => {
  const infiniteLoop = `
while True:
    pass
`;
  const res = await executor.runSingle('python', infiniteLoop, '', 1000);
  assert.equal(res.verdict, 'TIME_LIMIT_EXCEEDED');
});

test('Admin BLACKDRAGON exists in database with admin role', () => {
  const admin = db.getUserByUsername('BLACKDRAGON');
  assert.ok(admin, 'Admin BLACKDRAGON must exist');
  assert.equal(admin?.role, 'admin');
});

test('Admin can add time to current program and question lock is verified', () => {
  const compBefore = db.getCompetition();
  const durBefore = compBefore.currentQuestionDurationSeconds;

  db.addTimeToCurrentQuestion(300); // add 5 mins
  const compAfter = db.getCompetition();
  assert.equal(compAfter.currentQuestionDurationSeconds, durBefore + 300);

  const activeCheck = db.isQuestionActiveForSubmissions(compAfter.currentQuestionId);
  assert.equal(activeCheck.active, true);
});
