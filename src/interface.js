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

    Dom.on(document, 'click', '.paymentTypeButtonLink', function(e, link)   {

        var type = link.classList.contains('avaLink') ? 'avalanche' : 'snowball',
            other = type == 'avalanche' ? 'snowball' : 'avalanche';
        byId(type).classList.remove('unselectedPaymentType');
        byId(type).classList.add('selectedPaymentType');
        byId(other).classList.remove('selectedPaymentType');
        byId(other).classList.add('unselectedPaymentType');
        loanApp.paymentType = type;
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

    Dom.on(document, 'click', '.resultsContainer', function(e, container)  {

        loanApp.getLoan(container.id.substr(16)).results.click();
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
        var input = byId('loan' + field + uid);
        if(value == '')   {
            value = 'Loan ' + (parseInt(uid, 10) + 1);
            input.value = value;
            input.style.color = '#cccccc';
        }
        else
            input.style.color = '#444444';
        loanApp.updateLoan(uid, field, value);
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
        for(var i=0;i<panels.length;i++)
            panels[i].style.display = 'link_' + panels[i].id == link.id ? 'block' : 'none';
    });

    document.body.addEventListener('click', function(e)    {

        if(e.target.classList.contains('link'))
            return;
        var panels = document.querySelectorAll('.moreInfo');
        for(var i=0;i<panels.length;i++)
            panels[i].style.display = 'none';
    });

    var helpContent = {
        'totalMonthlyPaymentHelp': 'help_tmp',
        'paymentTypeHelp': 'help_pt'
    };

    Dom.on(document, 'mouseover', '.help', function(e, help)  {

        var popup = byId('helpPopup');
        popup.style.left = (e.pageX + 30) + 'px';
        popup.style.top = (e.pageY - 20) + 'px';
        if(helpContent[help.id])
            byId(helpContent[help.id]).style.display = 'block';
    });

    Dom.on(document, 'mouseout', '.help', function(e, help)  {

        if(helpContent[help.id])
            byId(helpContent[help.id]).style.display = 'none';
    });

});
