document.addEventListener('DOMContentLoaded', function()    {

    var Dom = Unburyme.Dom,
        byId = Dom.byId;

    // Setup
    var loanApp = new Unburyme.LoanApp();
    loanApp.createLoan();

    byId('email').innerHTML = '<a href=\'mailto:jsantell@gmail.com\' title=\'email Jordan Santell\'>jsantell@gmail.com</a>';

    var markUninitializedInvalid = function()   {
        var inputs = document.querySelectorAll('input.uninitialized');
        for(var i=0;i<inputs.length;i++)
            inputs[i].classList.add('invalidField');
    };

    var calculate = function(firstCall) {

        if(firstCall || loanApp.autoCalc)
            loanApp.calculatePrep();
    };


    // Creating/destroying Loans, Payment Type

    var strategyHints = {
        'avalanche': 'Highest interest rate first. Saves the most money.',
        'snowball': 'Smallest balance first. Clears individual loans sooner.'
    };

    var setPaymentType = function(type) {

        var other = type == 'avalanche' ? 'snowball' : 'avalanche';
        byId(type).classList.remove('unselectedPaymentType');
        byId(type).classList.add('selectedPaymentType');
        byId(type).setAttribute('aria-pressed', 'true');
        byId(other).classList.remove('selectedPaymentType');
        byId(other).classList.add('unselectedPaymentType');
        byId(other).setAttribute('aria-pressed', 'false');
        byId('strategyHint').textContent = strategyHints[type];
        loanApp.paymentType = type;
    };
    setPaymentType(loanApp.paymentType);

    Dom.on(document, 'click', '.paymentTypeButtonLink', function(e, button)   {

        setPaymentType(button.classList.contains('avaLink') ? 'avalanche' : 'snowball');
        calculate();
    });

    Dom.on(document, 'click', '.createLoanPlus', function()   {

        loanApp.createLoan();
    });

    Dom.on(document, 'click', '.destroyLoan', function(e, link) {

        e.preventDefault();
        loanApp.destroyLoan(link.id.substr(6));
        calculate();
    });


    // Slider

    var slider = byId('paymentSlider'),
        sliderTimeout = null;

    slider.addEventListener('input', function()    {

        var payment = Number(slider.value);
        byId('totalMonthlyPayment').value = payment;
        loanApp.updatePayment(payment);

        if(sliderTimeout)
            clearTimeout(sliderTimeout);
        sliderTimeout = setTimeout(function()   {
            if(loanApp.autoCalc)
                markUninitializedInvalid();
            if(payment < loanApp.totalMinPayment)
                slider.value = loanApp.totalMinPayment;
            calculate();
        }, loanApp.config.sliderWaitToCalculate);
    });


    // Viewing Results

    Dom.on(document, 'click', '.resultBar', function(e, bar)  {

        loanApp.getLoan(bar.id.substr(9)).results.click();
    });

    Dom.on(document, 'keydown', '.resultBar', function(e, bar)  {

        if(e.key == 'Enter' || e.key == ' ')    {
            e.preventDefault();
            loanApp.getLoan(bar.id.substr(9)).results.click();
        }
    });

    Dom.on(document, 'click', '.graphView', function(e, link)  {

        loanApp.graph.draw(link.id.substr(6));
    });


    // Events

    byId('totalMonthlyPayment').addEventListener('change', function()  {

        var value = this.value;
        if(loanApp.validatePayment(value))   {
            value = Unburyme.parseAmount(value);
            loanApp.updatePayment(value);
            slider.value = value;
            calculate();
        }
    });

    Dom.on(byId('loanBarInputContainer'), 'change', 'input', function(e, input)    {

        var fields = ['name', 'balance', 'minPayment', 'interest'],
            field = null,
            value = input.value;
        for(var i=0;i<fields.length;i++)    {
            if(input.classList.contains(fields[i]))
                field = fields[i];
        }
        if(!field)
            return;
        var uid = input.id.substr(('loan' + field).length),
            loan = loanApp.getLoan(uid);

        // Validate input
        if(loan.validate(field, value))  {
            loanApp.updateLoan(uid, field, field == 'name' ? value : Unburyme.parseAmount(value));
            if(field == 'minPayment')
                slider.value = loanApp.totalPayment;
        }
        resetEmptyEntry(uid, field, value);

        // If it's an initialized loan, attempt to recalculate
        // and make all uninitialized inputs invalid
        if(loan.isInitialized['loan'] && loanApp.autoCalc)  {
            markUninitializedInvalid();
            calculate();
        }
    });

    var resetEmptyEntry = function(uid, field, value) {

        if(field != 'name')
            return;
        // An empty name falls back to the placeholder, e.g. "Loan 2"
        if(value.trim() == '')
            value = byId('loan' + field + uid).placeholder;
        loanApp.updateLoan(uid, field, value.trim());
    };


    // Calculate, Links, Tooltip

    byId('calculate').addEventListener('click', function()   {

        if(document.querySelector('input.uninitialized'))
            markUninitializedInvalid();
        else
            calculate(true);
    });

    Dom.on(document, 'click', '.link', function(e, link)    {

        var panels = document.querySelectorAll('.moreInfo');
        for(var i=0;i<panels.length;i++)    {
            var open = 'link_' + panels[i].id == link.id && !Dom.isShown(panels[i]);
            panels[i].style.display = open ? 'block' : 'none';
        }
    });

    document.body.addEventListener('click', function(e)    {

        if(e.target.closest('.link, .moreInfo'))
            return;
        var panels = document.querySelectorAll('.moreInfo');
        for(var i=0;i<panels.length;i++)
            panels[i].style.display = 'none';
    });

});
