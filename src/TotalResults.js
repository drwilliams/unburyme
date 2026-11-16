/**
 * Unburyme.TotalResults
 * The total results bar for the application
 * @constructor
 * @param {Unburyme.LoanApp} 
 */
Unburyme.TotalResults = function(loanApp)   {

    this.loanApp = loanApp;
    this.finalPayOffDate = new Unburyme.Date();
    this.totalInterest = 0;
    this.totalPrincipal = 0;

}


Unburyme.TotalResults.prototype.calculate = function()  {

    this.clearData();
    for(var i=0;i<this.loanApp.initLoanCount();i++) {
        this.finalPayOffDate = this.finalPayOffDate.getLatest(this.loanApp.initLoanArray[i].results.payOffDate);
        this.totalInterest += this.loanApp.initLoanArray[i].results.totalInterestPaid;
        this.totalPrincipal += this.loanApp.initLoanArray[i].getBalance();
    }
    this.draw();

};

Unburyme.TotalResults.prototype.draw = function()   {

    var money = Unburyme.formatMoney,
        html = '<div id=\'totalResultsBar\'>' +
            '<div class=\'stat statHero\'><span class=\'statLabel\'>Debt free by</span>' +
                '<strong class=\'payoffDate\'>' + this.finalPayOffDate.print() + '</strong>' +
                '<span class=\'statSub\'>' + Unburyme.TotalResults.describeDuration(this.monthsToPayOff()) + '</span></div>' +
            '<div class=\'stat\'><span class=\'statLabel\'>Total interest</span>' +
                '<strong class=\'totalInterest\'>' + money(this.totalInterest) + '</strong></div>' +
            '<div class=\'stat\'><span class=\'statLabel\'>Total paid</span>' +
                '<strong>' + money(this.totalPrincipal + this.totalInterest, true) + '</strong></div>' +
        '</div>';
    Unburyme.Dom.byId('totalResultsContainer').innerHTML = html;

};


/**
 * @return {number} Number of monthly payments until the last loan is paid off
 */
Unburyme.TotalResults.prototype.monthsToPayOff = function()    {

    var now = new Unburyme.Date();
    return (this.finalPayOffDate.getYear() - now.getYear()) * 12 + this.finalPayOffDate.getMonth() - now.getMonth() + 1;

};


/**
 * @param {number} months
 * @return {string} e.g. "in 2 years, 3 months"
 */
Unburyme.TotalResults.describeDuration = function(months)  {

    var years = Math.floor(months / 12),
        rest = months % 12,
        parts = [];
    if(years)
        parts.push(years + (years == 1 ? ' year' : ' years'));
    if(rest || !years)
        parts.push(rest + (rest == 1 ? ' month' : ' months'));
    return 'in ' + parts.join(', ');

};


Unburyme.TotalResults.prototype.clearData = function()  {

    this.finalPayOffDate.setCurrent();
    this.totalInterest = 0;
    this.totalPrincipal = 0;

};


/**
 * Clear data and remove DOM element
 */
Unburyme.TotalResults.prototype.reset = function()  {

    this.clearData();
    Unburyme.Dom.byId('totalResultsContainer').innerHTML = '';

}
