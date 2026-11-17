/**
 * Unburyme.ResultBar
 * Stores the values used in the resulting information bar for each loan
 * @constructor
 */
Unburyme.ResultBar = function(uid, loan, loanApp)   {

    this.uid = uid;
    this.loan = loan;
    this.loanApp = loanApp;
    this.totalInterestPaid = 0;
    this.payOffDate = new Unburyme.Date();
    this.graph = this.loanApp.graph;
    this.graphData_princData = [];
    this.graphData_princPaid = [];
    this.graphData_totalInterestPaid = [];
    this.graphData_monthlyPayment = [];
    this.htmlMain = '';
    this.htmlMonthly = '';

};


/**
 * Destroys this
 */
Unburyme.ResultBar.prototype.destroy = function()   {

    var el = Unburyme.Dom.byId('resultsContainer'+this.uid);
    Unburyme.Dom.slideUp(el, this.loanApp.config.slideSpeed, function()   {
        el.remove();
    });     

};


/*
 * Draws extended loan information
 */
Unburyme.ResultBar.prototype.drawStart = function() {

    //Reset graph data
    this.clearGraphData();
    this.totalInterestPaid = 0;

    this.htmlMonthly = '<div class=\'monthlyResults\' id=\'monthlyResults' + this.uid + '\'><table>' +
        '<thead><tr><th scope=\'col\'>Month</th><th scope=\'col\'>Payment</th><th scope=\'col\'>Principal</th>' +
        '<th scope=\'col\'>Interest</th><th scope=\'col\'>Balance</th><th scope=\'col\'>Total interest</th></tr></thead><tbody>';

};


/**
 * Adds one month to the schedule table and graph data
 */
Unburyme.ResultBar.prototype.drawMain = function(iterator,currentMonth,payment,princPaid,interestPaid,princRemaining)   {

    var money = Unburyme.formatMoney;
    this.htmlMonthly += '<tr><td>' + currentMonth.print() + '</td><td>' + money(payment) + '</td><td>' + money(princPaid) +
        '</td><td>' + money(interestPaid) + '</td><td>' + money(princRemaining) + '</td><td>' + money(this.totalInterestPaid) + '</td></tr>';

    //Store graph data
    this.graphData_princRemaining.push(Unburyme.roundCents(princRemaining));
    this.graphData_princPaid.push(Unburyme.roundCents(princPaid));
    this.graphData_totalInterestPaid.push(Unburyme.roundCents(this.totalInterestPaid));
    this.graphData_monthlyPayment.push(Unburyme.roundCents(payment));

};


/**
 * Draws the summary row for this loan, followed by its (collapsed) schedule
 * @param {number=} order Position in the payoff order, starting at 0
 */
Unburyme.ResultBar.prototype.drawFinal = function(order) {

    var colors = this.loanApp.config.colorSet,
        colorIndex = this.loanApp.initLoanArray.indexOf(this.loan),
        color = colors[Math.max(colorIndex, 0) % colors.length],
        orderText = typeof order == 'number' ? '<span class=\'resultOrder\'>Priority ' + (order + 1) + '</span>' : '';

    this.htmlMonthly += '</tbody></table></div>';
    this.htmlMain = '<div class=\'resultBar\' id=\'resultBar' + this.uid + '\' role=\'button\' tabindex=\'0\' aria-expanded=\'false\' aria-controls=\'monthlyResults' + this.uid + '\'>' +
        '<span class=\'seriesDot\' style=\'background:' + color + '\'></span>' +
        '<div class=\'resultName\'>' + Unburyme.escapeHtml(this.loan.getName()) + orderText + '</div>' +
        '<div class=\'resultStat resultPaidOff\'><span>Paid off</span><strong>' + this.payOffDate.print() + '</strong></div>' +
        '<div class=\'resultStat resultInterest\'><span>Interest</span><strong>' + Unburyme.formatMoney(this.totalInterestPaid) + '</strong></div>' +
        '<svg class=\'chevron\' viewBox=\'0 0 16 16\' aria-hidden=\'true\'><path d=\'M4 6l4 4 4-4\' /></svg>' +
        '</div>' + this.htmlMonthly;

    //Create the results container if it doesn't exist
    var container = Unburyme.Dom.byId('resultsContainer'+this.uid);
    if(!container)  {
        container = Unburyme.Dom.create('<div class=\'resultsContainer\' id=\'resultsContainer'+this.uid+'\'></div>');
        Unburyme.Dom.byId('allResultsContainer').appendChild(container);
    }
    container.innerHTML = this.htmlMain;
    Unburyme.Dom.byId('monthlyResults'+this.uid).style.display = 'none';
};


/**
 * Clears graph data
 */
Unburyme.ResultBar.prototype.clearGraphData = function()    {

    this.graphData_princRemaining = [];
    this.graphData_princPaid = [];
    this.graphData_totalInterestPaid = [];
    this.graphData_monthlyPayment = [];
};


/**
 * Return requested graph data for appropriate field
 * @param {string} field Graph information that's requested
 * @return {number[]} One value per month, starting with the first payment month
 */
Unburyme.ResultBar.prototype.getGraphData = function(field) {

    var dataToReturn;
    switch(field)   {
        case 'princRemaining':
            dataToReturn = this.graphData_princRemaining;
            break;
        case 'princPaid':
            dataToReturn = this.graphData_princPaid;
            break;
        case 'totalInterestPaid':
            dataToReturn = this.graphData_totalInterestPaid;
            break;
        case 'monthlyPayment':
            dataToReturn = this.graphData_monthlyPayment;
            break;
    }
    return dataToReturn;

};


/**
 * Display extended result information
 */
Unburyme.ResultBar.prototype.click = function() {

    var el = Unburyme.Dom.byId('monthlyResults'+this.uid),
        bar = Unburyme.Dom.byId('resultBar'+this.uid),
        open = !Unburyme.Dom.isShown(el);
    bar.setAttribute('aria-expanded', open ? 'true' : 'false');
    if(open)
        Unburyme.Dom.slideDown(el, this.loanApp.config.slideSpeed);
    else
        Unburyme.Dom.slideUp(el, this.loanApp.config.slideSpeed);

};
