/**
 * Unburyme.LoanApp
 * The main controller for the application
 * @constructor
 */
Unburyme.LoanApp = function()   {

    // Initialize application   
    this.config = new Unburyme.Config();
    this.loanArray = [];
    this.initLoanArray = [];
    this.loanCount = 0;
    this.uidIterator = 0;
    this.paymentType = 'avalanche';
    this.totalPayment = 0;
    this.totalMinPayment = 0;
    this.validPayment = 0;
    this.possibleCalc = 1;
    this.autoCalc = 0;
    this.errorTimeout = 0;
    this.extraPayment = null;
    this.rollover = null;
    this.rolloverMonth = new Unburyme.Date();
    this.graph = new Unburyme.Graph(this);
    this.totalResults = new Unburyme.TotalResults(this);

};


/**
  * @param {number} uid Unique ID of a loan
  * @return {Unburyme.Loan} 
  */
Unburyme.LoanApp.prototype.getLoan = function(uid)  {
    
    var loanIndex = -1;
    for(var i=0;i<this.loanCount;i++)   {
        if(this.loanArray[i].uid==uid)
            loanIndex = i;
    }
    return this.loanArray[loanIndex];
};


/**
  * Converts a loan's Unique ID with its position in this.loanArray
  * @param {number} uid Unique ID of a loan
  * @return {number} Position in this.loanArray
  */    
Unburyme.LoanApp.prototype.getLoanIndex = function(uid) {
    
    var loanIndex = -1;
    for(var i=0;i<this.loanCount;i++)   {
        if(this.loanArray[i].uid==uid)
            loanIndex = i;
    }
    return loanIndex;
};


/**
 * Creates a new Loan object
 */
Unburyme.LoanApp.prototype.createLoan = function()  {

    this.loanArray.push(new Unburyme.Loan(this.uidIterator, this));
    this.loanCount++;
    this.uidIterator++;

};

    
/**
 * Destroys selected Unburyme.Loan object
 * @param {number} uid Unique ID of a loan
 */
Unburyme.LoanApp.prototype.destroyLoan = function(uid)  {

    this.getLoan(uid).destroy()
    this.loanArray.splice(this.getLoanIndex(uid),1);
    this.loanCount--;
    this.refreshInitLoanArray();
    
    if(this.autoCalc==1 && this.initLoanCount()==0) {
        this.clearData();
    }

};


/**
 * Update an Unburyme.Loan object's members
 * @param {number} uid Unique ID of a loan
 * @param {string} field Field that is to be modified
 * @param {number} value Update field to this value
 */
Unburyme.LoanApp.prototype.updateLoan = function(uid, field, value) {

    switch(field)   {
        case 'name':
            this.getLoan(uid).setName(value);
            break;
        case 'balance':
            this.getLoan(uid).setBalance(value);
            break;
        case 'minPayment':
            this.getLoan(uid).setMinPayment(value);
            this.updateTotalMinPayment();
            break;
        case 'interest':
            this.getLoan(uid).setInterest(value);
            break;
    }
    this.refreshInitLoanArray();

};
    

/**
 * Updates the total minimum payment
 */
Unburyme.LoanApp.prototype.updateTotalMinPayment = function()   {

    var totalMin = 0;
    for(var i=0;i<this.loanCount;i++)   {
        totalMin += this.loanArray[i].getMinPayment();
    }
    this.totalMinPayment = totalMin;
    if(this.totalMinPayment > this.totalPayment)    {
        this.totalPayment = this.totalMinPayment;
        $('#totalMonthlyPayment').val(this.totalPayment);
        $('#totalMonthlyPayment').removeClass('invalidField');
           this.validPayment = true;    
    }

};

/**
 * Updates monthly payment
 * @param {number} value Upate monthly payment to value
 */ 
Unburyme.LoanApp.prototype.updatePayment = function(value)  {

    this.totalPayment = value;
    this.updateTotalMinPayment(); 
    this.validPayment = true;
    this.validatePaymentDisplay(true);

};


/**
 * Check if the updated payment is valid
 * @param {number} value Value to check if valid
 * @return {boolean} Whether or not value is valid
 */
Unburyme.LoanApp.prototype.validatePayment = function(value)  {

    var validTest = !isNaN(Unburyme.parseAmount(value));
    this.validatePaymentDisplay(validTest);
    this.validPayment = validTest;
    return validTest;
};


/**
 * Update interface for validity
 * @param {boolean} valid Whether or not value is valid
 */
Unburyme.LoanApp.prototype.validatePaymentDisplay = function(valid)   {

    if(valid)
        $('#totalMonthlyPayment').removeClass('invalidField');
    else
        $('#totalMonthlyPayment').addClass('invalidField');

};
    

/**
 * Getter for payment validity
 * @return {boolean} Whether or not payment is valid
 */
Unburyme.LoanApp.prototype.isPaymentValid = function()   {

    return this.validPayment;

};


/**
 * Get selected loan's member
 * @param {number} uid Unique ID for loan
 * @param {string} field Name of parameter to get
 */
Unburyme.LoanApp.prototype.getInfo = function(uid, field)   {
        
    switch(field)   {
        case 'name':
            return this.getLoan(uid).getName();
            break;
        case 'balance':
            return this.getLoan(uid).getBalance();
            break;
        case 'minPayment':
            return this.getLoan(uid).getMinPayment();
            break;
        case 'interest':
            return this.getLoan(uid).getInterest();
            break;
    }       

};
    
/**
 * Does some tests before sending off to calculate
 */
Unburyme.LoanApp.prototype.calculatePrep = function()   {
        
    if(this.areLoansValid() && this.isPaymentValid())    {
        // Resort and reset
        var sortedLoans = this.sortLoans();
        this.extraPayment = this.totalPayment - this.totalMinPayment;
        this.rollover = 0;
        this.rolloverMonth = new Unburyme.Date();
   
        // Calculate, draw graph and results
        this.possibleCalc = true;
        this.calculate(sortedLoans);
        if(this.possibleCalc == true)  {
            this.graph.draw();
            this.totalResults.calculate();
    
            // Hide Calculate button
            if(!this.autoCalc)                                                                                   
                $('.calculate').fadeOut(this.config.fadeSpeed);
    
            // After first calculate, autocalculate subsequently if able
            this.autoCalc = 1; 
        }
    }

};
    

/**
 * Calculates the payoff schedule and hands each month's results to the ResultBars
 * @param {Unburyme.Loan[]} sortedLoans Initialized loans in payoff priority order
 */
Unburyme.LoanApp.prototype.calculate = function(sortedLoans)    {

    var input = [],
        i, j;
    for(i=0;i<sortedLoans.length;i++)  {
        input.push({
            balance: sortedLoans[i].getBalance(),
            interest: sortedLoans[i].getInterest(),
            minPayment: sortedLoans[i].getMinPayment()
        });
    }

    var schedule = Unburyme.computeSchedule(input, this.totalPayment, new Unburyme.Date());
    if(!schedule.possible)  {
        this.possibleCalc = false;
        this.impossibleCalcDisplay();
        return;
    }

    for(i=0;i<sortedLoans.length;i++)  {
        var results = sortedLoans[i].results,
            loanSchedule = schedule.loans[i];
        results.drawStart();
        for(j=0;j<loanSchedule.rows.length;j++)    {
            var row = loanSchedule.rows[j];
            results.totalInterestPaid = row.totalInterest;
            results.drawMain(j, row.date, row.payment, row.principal, row.interest, row.balance);
        }
        results.totalInterestPaid = loanSchedule.totalInterest;
        results.payOffDate.setDate(loanSchedule.payOffDate.getYear(), loanSchedule.payOffDate.getMonth());
        results.drawFinal();
    }

    // Order the result bars by payoff priority
    for(i=0;i<sortedLoans.length;i++)  {
        if(i==0)
            $('#allResultsContainer').prepend($('#resultsContainer'+sortedLoans[i].getUID()));
        else
            $('#resultsContainer'+sortedLoans[i].getUID()).insertAfter($('#resultsContainer'+sortedLoans[i-1].getUID()));
    }

};


/**
 * Sorts the initialized loans according to the payment type
 * @return {Unburyme.Loan[]} Loans in payoff priority order
 */
Unburyme.LoanApp.prototype.sortLoans = function()   {

    return Unburyme.sortForPaymentType(this.initLoanArray, this.paymentType);

};


/**
 * Count the loans that are ready to be calculated
 * @return {number} Number of loans that are ready to be calculated
 */
Unburyme.LoanApp.prototype.initLoanCount = function()   {

    return this.initLoanArray.length;

};


/**
 * Recheck to see which loans are ready to be calculated
 */
Unburyme.LoanApp.prototype.refreshInitLoanArray = function()    {

    this.initLoanArray = [];
    for(var i=0;i<this.loanCount;i++)   {
        if(this.loanArray[i].isInitialized['loan'] && !this.loanArray[i].deleted)
            this.initLoanArray.push(this.loanArray[i]);
    }

};


/**
 * Clear data, used when users delete the last valid loan
 */
Unburyme.LoanApp.prototype.clearData = function()   {

    this.autoCalc = 0;
    this.rolloverMonth.setCurrent();
    this.graph.reset();
    this.totalResults.reset();
    this.refreshInitLoanArray();                                                                                    
    $('.calculate').fadeIn(this.config.fadeSpeed);                                                            
    this.createLoan();     

};


/**
 * Sets up feedback when it is impossible to calculate given the parameters
 */
Unburyme.LoanApp.prototype.impossibleCalcDisplay = function() {
    
    var slideSpeed = this.config.slideSpeed;

    if($('#error').length == 0) {
        var html = '<div id=\'error\'>\n';
        html +=    '    <p>One or more of the current loans will take <strong>centuries</strong> to pay off.</p>';
        html +=    '    <p>Please use more reasonable loan information.</p>';
        html +=    '</div>';
        $('#enclosure').prepend(html);
        $('#error').css('display', 'none');
    }
    $('#error').slideDown(this.config.slideSpeed);
    if(this.errorTimeout)
        window.clearTimeout(this.errorTimeout);
    this.errorTimeout = window.setTimeout(function()    {
        $('#error').slideUp(slideSpeed);
    }, 3000);

};

/**
 * Checks to see if all the loans are valid or not
 * @return {boolean} Returns whether or not all the loans are valid
 */
Unburyme.LoanApp.prototype.areLoansValid = function() {
      
    var areLoansValid = true;
    for(var i=0;i<this.loanCount;i++)   {
        if(!this.loanArray[i].isValid['loan'])
            areLoansValid = false;
    }
    return areLoansValid;

};
