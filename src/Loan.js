/**
 * Unburyme.Loan
 * The loan object that stores individual loan information
 * @constructor
 * @param {number} uid Unique ID for the loan
 * @param {Unburyme.LoanApp} loanApp
 */
Unburyme.Loan   = function(uid, loanApp)    {

    this.uid = uid;
    this.loanApp = loanApp;
    this.name = 'Loan '+(this.uid+1);
    this.balance = 0;
    this.minPayment = 0;
    this.interest = 0;
    this.results = new Unburyme.ResultBar(this.uid, this, this.loanApp);
    this.create();
    this.isInitialized = {
        'loan' : 0,
        'name' : 0,
        'balance' : 0,
        'minPayment' : 0,
        'interest' : 0
    }
    this.isValid = {
        'loan' : 0,
        'name' : 0,
        'balance' : 0,
        'minPayment' : 0,
        'interest' : 0
    }
    this.deleted = 0;

};


/**
 * Set up loan in DOM
 */
Unburyme.Loan.prototype.create = function() {

    var uid = this.uid,
        field = function(name, label, extraClass, prefix, suffix, placeholder)  {
            var id = 'loan' + name + uid,
                input = '<input id=\'' + id + '\' class=\'' + name + extraClass + '\' autocomplete=\'off\' placeholder=\'' + placeholder + '\'' +
                    (name == 'name' ? '' : ' inputmode=\'decimal\'') + ' />';
            if(prefix || suffix)
                input = '<div class=\'affix\'>' + (prefix ? '<span aria-hidden=\'true\'>' + prefix + '</span>' : '') + input +
                    (suffix ? '<span aria-hidden=\'true\'>' + suffix + '</span>' : '') + '</div>';
            return '<div class=\'field' + (name == 'name' ? ' fieldName' : '') + '\'><label for=\'' + id + '\'>' + label + '</label>' + input + '</div>';
        };

    var html = '<div id=\'loanbar' + uid + '\' class=\'loanBarInput uninitialized\'><div class=\'loanRow\'>' +
        '<div class=\'loanFields\'>' +
            field('name', 'Name', '', '', '', 'Loan ' + (uid + 1)) +
            field('balance', 'Balance', ' uninitialized', '$', '', '0.00') +
            field('minPayment', 'Min. payment', ' uninitialized', '$', '', '0.00') +
            field('interest', 'Interest rate', ' uninitialized', '', '%', '0.0') +
        '</div>' +
        '<button type=\'button\' class=\'destroyLoan\' id=\'delete' + uid + '\' aria-label=\'Remove loan\' title=\'Remove loan\'>' +
            '<svg viewBox=\'0 0 16 16\' aria-hidden=\'true\'><path d=\'M4 4l8 8M12 4l-8 8\' /></svg></button>' +
        '</div></div>';

    var el = Unburyme.Dom.create(html);
    Unburyme.Dom.byId('loanBarInputContainer').appendChild(el);
    Unburyme.Dom.slideDown(el, this.loanApp.config.slideSpeed);

};


/**
 * Destroys loan object and DOM elements
 */
Unburyme.Loan.prototype.destroy = function()    {

    var el = Unburyme.Dom.byId('loanbar'+this.uid);
    Unburyme.Dom.slideUp(el, this.loanApp.config.slideSpeed, function()   {
        el.remove();
    });
    this.results.destroy();
    //Remove all uninitialization tags
    this.cleanField('bar');
    this.cleanField('name');
    this.cleanField('balance');
    this.cleanField('minPayment');
    this.cleanField('interest');
    
    // Should be removed from array; sanity check
    this.deleted = 1;

    for(var key in this.isInitialized)
        this.isInitialized[key] = 0;

};


Unburyme.Loan.prototype.setName = function(name)    {

    this.name = name;

};
    

Unburyme.Loan.prototype.setBalance = function(balance)  {

    this.initializeField('balance');
    this.balance = balance;

};

    
Unburyme.Loan.prototype.setMinPayment = function(minPayment)    {

    this.initializeField('minPayment');
    this.minPayment = minPayment;

};


Unburyme.Loan.prototype.setInterest = function(interest)    {

    this.initializeField('interest');
    this.interest = interest;

};


Unburyme.Loan.prototype.getName = function()    {

    return this.name;

};


Unburyme.Loan.prototype.getBalance = function() {

    return this.balance;

};


Unburyme.Loan.prototype.getMinPayment = function()  {

    return this.minPayment;

};


Unburyme.Loan.prototype.getInterest = function()        {

    return this.interest;

};

    
Unburyme.Loan.prototype.getValue = function(field)  {

    var value = '';
    switch(field)   {
        case 'name':
            value = this.getName();
            break;
        case 'balance':
            value = this.getBalance();
            break;
        case 'minPayment':
            value = this.getMinPayment();
            break;
        case 'interest':
            value = this.getInterest();
            break;
    }
    return value;

};


Unburyme.Loan.prototype.getUID = function() {

    return this.uid;

};


Unburyme.Loan.prototype.calculate = function()  {

    this.results.calculate();

};


Unburyme.Loan.prototype.validate = function(field, value)   {

    var validTest = field == 'name' || !isNaN(Unburyme.parseAmount(value));
    this.isValid[field] = validTest ? 1 : 0;
    this.isValid['loan'] = (this.isValid['balance'] && this.isValid['minPayment'] && this.isValid['interest']) ? 1 : 0;

    // Call validateDisplay to handle visual representation
    this.validateDisplay(field,validTest);
    return validTest;

};

    
Unburyme.Loan.prototype.validateDisplay = function(field, isFieldValid)  {

    var el = Unburyme.Dom.byId('loan'+field+this.uid);
    if(el)
        el.classList.toggle('invalidField', !isFieldValid);
};


Unburyme.Loan.prototype.cleanField = function(field)    {

    if(field=='loan')
        field = 'bar';
    var el = Unburyme.Dom.byId('loan'+field+this.uid);
    if(el)
        el.classList.remove('uninitialized', 'invalidField');
};


Unburyme.Loan.prototype.initializeField = function(field)   {

    this.isInitialized[field] = 1;
    this.cleanField(field);
    if(this.isInitialized['balance'] && this.isInitialized['minPayment'] && this.isInitialized['interest']) {
        this.isInitialized['loan'] = 1;
        this.cleanField('loan');
    }
};

