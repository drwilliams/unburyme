/**
 * Unburyme.parseAmount
 * Parses a user-entered number such as "1,000,000", "$250" or "4.5%".
 * @param {string|number} s
 * @return {number} The parsed value, or NaN if the input is not a valid number
 */
Unburyme.parseAmount = function(s) {

    if(typeof s == 'number')
        return isFinite(s) && s >= 0 ? s : NaN;
    s = String(s).replace(/[\s,$%]/g, '');
    if(!/^(\d+\.?\d*|\.\d+)$/.test(s))
        return NaN;
    return parseFloat(s);

};


/**
 * @param {number} v
 * @return {number} v rounded to the nearest cent
 */
Unburyme.roundCents = function(v)   {

    return Math.round(v * 100) / 100;

};


/**
 * @param {number} v
 * @param {boolean=} noCents Round to whole dollars
 * @return {string} e.g. "$1,234.56"
 */
Unburyme.formatMoney = function(v, noCents)   {

    var digits = noCents ? 0 : 2;
    return '$' + Number(v).toLocaleString('en-US', {minimumFractionDigits: digits, maximumFractionDigits: digits});

};


/**
 * Unburyme.escapeHtml
 * @param {string} s
 * @return {string} s, safe to insert as HTML
 */
Unburyme.escapeHtml = function(s)  {

    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

};


/**
 * Unburyme.sortForPaymentType
 * Orders loans by payoff priority. The sort is stable, so ties keep their entry order.
 * @param {Array.<Object>} loans Objects exposing getInterest() and getBalance()
 * @param {string} paymentType 'avalanche' (highest interest first) or 'snowball' (lowest balance first)
 * @return {Array.<Object>} A new, sorted array
 */
Unburyme.sortForPaymentType = function(loans, paymentType)  {

    var indexed = [];
    for(var i=0;i<loans.length;i++)
        indexed.push({loan: loans[i], index: i});
    indexed.sort(function(a, b)    {
        var diff = paymentType == 'avalanche'
            ? b.loan.getInterest() - a.loan.getInterest()
            : a.loan.getBalance() - b.loan.getBalance();
        return diff || a.index - b.index;
    });
    var sorted = [];
    for(var j=0;j<indexed.length;j++)
        sorted.push(indexed[j].loan);
    return sorted;

};


/**
 * Unburyme.computeSchedule
 * Builds the month-by-month payoff schedule. Every month each unpaid loan gets its
 * minimum payment; whatever is left of totalPayment (including the minimums of loans
 * already paid off) goes to the unpaid loans in priority order.
 * @param {Array.<{balance: number, interest: number, minPayment: number}>} loans
 *     In priority order; interest is an annual percentage rate (e.g. 5 for 5%)
 * @param {number} totalPayment Amount available each month
 * @param {Unburyme.Date} startDate First payment month (not modified)
 * @param {number=} maxMonths Give up after this many months (default 1200)
 * @return {{possible: boolean, months: number, loans: Array.<{rows: Array, totalInterest: number, payOffDate: Unburyme.Date}>}}
 *     rows hold {date, payment, principal, interest, balance, totalInterest}
 */
Unburyme.computeSchedule = function(loans, totalPayment, startDate, maxMonths)  {

    var EPSILON = 0.005,
        date = new Unburyme.Date(),
        state = [],
        remaining = 0,
        month = 0,
        i;
    maxMonths = maxMonths || 1200;
    date.setDate(startDate.getYear(), startDate.getMonth());

    for(i=0;i<loans.length;i++)    {
        var payOffDate = new Unburyme.Date();
        payOffDate.setDate(date.getYear(), date.getMonth());
        state.push({
            balance: loans[i].balance,
            rate: loans[i].interest / 100 / 12,
            minPayment: loans[i].minPayment,
            rows: [],
            totalInterest: 0,
            payOffDate: payOffDate,
            done: !(loans[i].balance > EPSILON)
        });
        if(!state[i].done)
            remaining++;
    }

    while(remaining > 0 && month < maxMonths)  {
        var available = totalPayment,
            owed = [],
            paid = [],
            interest = [];

        // Accrue interest and pay each loan's minimum
        for(i=0;i<state.length;i++)    {
            if(state[i].done)
                continue;
            interest[i] = state[i].balance * state[i].rate;
            owed[i] = state[i].balance + interest[i];
            paid[i] = Math.min(state[i].minPayment, owed[i], Math.max(available, 0));
            available -= paid[i];
        }

        // Put whatever is left towards loans in priority order
        for(i=0;i<state.length && available > 0;i++)  {
            if(state[i].done)
                continue;
            var extra = Math.min(available, owed[i] - paid[i]);
            paid[i] += extra;
            available -= extra;
        }

        for(i=0;i<state.length;i++)    {
            var s = state[i];
            if(s.done)
                continue;
            s.balance = owed[i] - paid[i];
            if(s.balance < EPSILON) {
                s.balance = 0;
                s.done = true;
                remaining--;
                s.payOffDate.setDate(date.getYear(), date.getMonth());
            }
            s.totalInterest += interest[i];
            var rowDate = new Unburyme.Date();
            rowDate.setDate(date.getYear(), date.getMonth());
            s.rows.push({
                date: rowDate,
                payment: paid[i],
                principal: paid[i] - interest[i],
                interest: interest[i],
                balance: s.balance,
                totalInterest: s.totalInterest
            });
        }

        date.increment();
        month++;
    }

    return {
        possible: remaining == 0,
        months: month,
        loans: state
    };

};
