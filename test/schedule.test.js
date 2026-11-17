// Unit tests for the payoff calculation. Run with: npm test
var test = require('node:test');
var assert = require('node:assert');
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var ctx = {};
vm.createContext(ctx);
['Unburyme.js', 'Date.js', 'Schedule.js'].forEach(function(f)  {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8'), ctx, {filename: f});
});
var U = vm.runInContext('Unburyme', ctx);

function start()    {
    var d = new U.Date();
    d.setDate(2026, 0);
    return d;
}

function sum(rows, key) {
    return rows.reduce(function(t, r) { return t + r[key]; }, 0);
}

test('parseAmount handles separators and symbols', function()  {
    assert.strictEqual(U.parseAmount('1,000,000'), 1000000);
    assert.strictEqual(U.parseAmount('$1,500.25'), 1500.25);
    assert.strictEqual(U.parseAmount(' 4.5 %'), 4.5);
    assert.strictEqual(U.parseAmount('0'), 0);
    assert.strictEqual(U.parseAmount('.5'), 0.5);
    assert.ok(isNaN(U.parseAmount('')));
    assert.ok(isNaN(U.parseAmount('1.2.3')));
    assert.ok(isNaN(U.parseAmount('abc')));
    assert.ok(isNaN(U.parseAmount(',')));
    assert.ok(isNaN(U.parseAmount('-5')));
});

test('escapeHtml escapes markup', function()    {
    assert.strictEqual(U.escapeHtml('<b a="x">&\''), '&lt;b a=&quot;x&quot;&gt;&amp;&#39;');
});

test('single loan matches standard amortization', function()   {
    // $10,000 at 6% paid $200/month: 58 months, last payment ~$10.28
    var r = U.computeSchedule([{balance: 10000, interest: 6, minPayment: 200}], 200, start());
    assert.ok(r.possible);
    var rows = r.loans[0].rows;
    assert.strictEqual(rows.length, 58);
    assert.ok(Math.abs(rows[0].interest - 50) < 1e-9);
    assert.ok(Math.abs(rows[0].balance - 9850) < 1e-9);
    assert.strictEqual(rows[57].balance, 0);
    assert.ok(Math.abs(sum(rows, 'principal') - 10000) < 0.01);
});

test('never pays more than the monthly total, and balances reconcile', function()   {
    var loans = [
        {balance: 500, interest: 20, minPayment: 100},
        {balance: 10000, interest: 5, minPayment: 200},
        {balance: 3000, interest: 0, minPayment: 50}
    ];
    var r = U.computeSchedule(loans, 400, start());
    assert.ok(r.possible);
    for(var m = 0; m < r.months; m++)  {
        var paid = 0;
        r.loans.forEach(function(l) { if(l.rows[m]) paid += l.rows[m].payment; });
        assert.ok(paid <= 400 + 1e-9, 'month ' + m + ' paid ' + paid);
        if(m < r.months - 1)
            assert.ok(Math.abs(paid - 400) < 1e-6, 'month ' + m + ' only paid ' + paid);
    }
    r.loans.forEach(function(l, i)  {
        // Every dollar of principal reduction is backed by a payment
        assert.ok(Math.abs(sum(l.rows, 'principal') - loans[i].balance) < 0.01);
        var prev = loans[i].balance;
        l.rows.forEach(function(row)    {
            assert.ok(Math.abs(prev + row.interest - row.payment - row.balance) < 1e-6);
            prev = row.balance;
        });
    });
});

test('leftover from a paid-off loan rolls over in the same month', function()  {
    // Loan A needs only $50 in month 1; the other $150 of its share goes to B
    var r = U.computeSchedule([
        {balance: 50, interest: 0, minPayment: 100},
        {balance: 1000, interest: 0, minPayment: 100}
    ], 300, start());
    assert.strictEqual(r.loans[0].rows[0].payment, 50);
    assert.strictEqual(r.loans[1].rows[0].payment, 250);
    assert.strictEqual(r.loans[1].rows[0].balance, 750);
});

test('payoff dates are recorded per loan', function()  {
    var r = U.computeSchedule([
        {balance: 100, interest: 0, minPayment: 100},
        {balance: 300, interest: 0, minPayment: 100}
    ], 200, start());
    assert.strictEqual(r.loans[0].payOffDate.print(), 'Jan 2026');
    assert.strictEqual(r.loans[1].payOffDate.print(), 'Feb 2026');
});

test('payments below interest are reported as impossible', function()  {
    var r = U.computeSchedule([{balance: 100000, interest: 12, minPayment: 500}], 500, start());
    assert.strictEqual(r.possible, false);
});

function fakeLoan(name, balance, interest, minPayment)  {
    return {
        name: name,
        getBalance: function() { return balance; },
        getInterest: function() { return interest; },
        getMinPayment: function() { return minPayment || 0; }
    };
}

function names(loans)   {
    return loans.map(function(l) { return l.name; }).join(',');
}

test('avalanche keeps 0% loans and orders by highest interest', function()  {
    var loans = [fakeLoan('zero', 500, 0), fakeLoan('high', 100, 20), fakeLoan('mid', 900, 5)];
    assert.strictEqual(names(U.sortForPaymentType(loans, 'avalanche')), 'high,mid,zero');
});

test('snowball orders by lowest balance and is stable on ties', function()  {
    var loans = [fakeLoan('a', 500, 1), fakeLoan('b', 0, 1), fakeLoan('c', 500, 9), fakeLoan('d', 50, 1)];
    assert.strictEqual(names(U.sortForPaymentType(loans, 'snowball')), 'b,d,a,c');
});

test('cash flow orders by minimum payment relative to balance', function()  {
    var loans = [
        fakeLoan('mortgage', 20000, 4, 300),   // 1.5% of balance per month
        fakeLoan('car', 1500, 7, 500),         // 33%
        fakeLoan('card', 4000, 22, 200),       // 5%
        fakeLoan('done', 0, 10, 50),           // already paid off: first
        fakeLoan('tie', 3000, 1, 450)          // 15%
    ];
    assert.strictEqual(names(U.sortForPaymentType(loans, 'cashflow')), 'done,car,tie,card,mortgage');
    assert.ok(Math.abs(U.cashFlowRatio(loans[1]) - 1 / 3) < 1e-12);
});

test('cash flow is stable on equal ratios', function()  {
    var loans = [fakeLoan('a', 1000, 5, 100), fakeLoan('b', 2000, 9, 200), fakeLoan('c', 500, 1, 100)];
    assert.strictEqual(names(U.sortForPaymentType(loans, 'cashflow')), 'c,a,b');
});

test('cash flow frees up payments sooner than avalanche in the example case', function()  {
    // A $500 minimum on $1,500 vs. a $300 minimum on $20,000 at a higher rate
    var car = {balance: 1500, interest: 3, minPayment: 500},
        loan = {balance: 20000, interest: 8, minPayment: 300},
        start = new U.Date();
    start.setDate(2026, 0);
    var cash = U.computeSchedule([car, loan], 1000, start),
        aval = U.computeSchedule([loan, car], 1000, start);
    // Cash flow: the car gets $700/month and is gone in month 3; under avalanche it only gets its $500 minimum
    assert.strictEqual(cash.loans[0].rows.length, 3);
    assert.strictEqual(aval.loans[1].rows.length, 4);
});
