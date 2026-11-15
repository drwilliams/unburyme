/**
 * Unburyme.Graph
 * Draws the payoff graph with Chart.js
 * @param {Unburyme.LoanApp} loanApp
 * @constructor
 */
Unburyme.Graph = function(loanApp)  {

    this.loanApp = loanApp;
    this.colorSet = this.loanApp.config.colorSet;
    this.lastFieldGraphed = 'princRemaining';
    this.chart = null;
    this.yearTicks = [];

};


Unburyme.Graph.TITLES = {
    'princRemaining': 'Principle Remaining',
    'princPaid': 'Principle Paid',
    'totalInterestPaid': 'Total Interest Paid',
    'monthlyPayment': 'Monthly Payment'
};


/**
 * Fills the plot area with the app's white-to-blue gradient and outlines it
 */
Unburyme.Graph.backgroundPlugin = {
    id: 'unburymeBackground',
    beforeDraw: function(chart) {
        var area = chart.chartArea,
            ctx = chart.ctx;
        if(!area)
            return;
        var gradient = ctx.createLinearGradient(0, area.top, 0, area.bottom);
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(1, '#b0edf7');
        ctx.save();
        ctx.fillStyle = gradient;
        ctx.fillRect(area.left, area.top, area.right - area.left, area.bottom - area.top);
        ctx.restore();
    },
    afterDraw: function(chart)  {
        var area = chart.chartArea,
            ctx = chart.ctx;
        if(!area)
            return;
        ctx.save();
        ctx.strokeStyle = '#545454';
        ctx.lineWidth = 2;
        ctx.strokeRect(area.left, area.top, area.right - area.left, area.bottom - area.top);
        ctx.restore();
    }
};


/**
 * Renders graph on screen
 * @param {string=} field Field in which to graph
 */
Unburyme.Graph.prototype.draw = function(field) {

    if(!field)
        field = this.lastFieldGraphed;
    this.lastFieldGraphed = field;

    var fadeSpeed = this.loanApp.config.fadeSpeed;
    Unburyme.Dom.fadeIn(Unburyme.Dom.byId('graph'), fadeSpeed);
    Unburyme.Dom.fadeIn(Unburyme.Dom.byId('graphViewOptions'), fadeSpeed);
    this.drawTitle(field);

    var datasets = this.makeDataSets(field),
        months = 0;
    for(var i=0;i<datasets.length;i++)
        months = Math.max(months, datasets[i].data.length);

    if(typeof Chart == 'undefined')
        return;
    if(!this.chart)
        this.chart = new Chart(this.getCanvas(), this.makeConfig());

    this.yearTicks = this.makeYearTicks(months);
    this.chart.options.scales.x.max = Math.max(months - 1, 1);
    this.chart.data.datasets = datasets;
    this.chart.update('none');

};


/**
 * @return {HTMLCanvasElement} The canvas inside #graph, created on first use
 */
Unburyme.Graph.prototype.getCanvas = function() {

    var container = Unburyme.Dom.byId('graph'),
        canvas = container.querySelector('canvas');
    if(!canvas) {
        canvas = document.createElement('canvas');
        canvas.setAttribute('role', 'img');
        canvas.setAttribute('aria-label', 'Graph of each loan over time');
        container.appendChild(canvas);
    }
    return canvas;

};


/**
 * @return {Object} Chart.js configuration
 */
Unburyme.Graph.prototype.makeConfig = function()    {

    var self = this;
    var startDate = function()  {
        return new Unburyme.Date();
    };

    return {
        type: 'line',
        data: {datasets: []},
        plugins: [Unburyme.Graph.backgroundPlugin],
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            parsing: false,
            interaction: {mode: 'index', intersect: false},
            elements: {
                point: {radius: 0, hitRadius: 6, hoverRadius: 4},
                line: {borderWidth: 2, tension: 0}
            },
            scales: {
                x: {
                    type: 'linear',
                    min: 0,
                    grid: {color: 'rgba(0, 0, 0, 0.08)'},
                    afterBuildTicks: function(axis) {
                        axis.ticks = self.yearTicks.map(function(v) { return {value: v}; });
                    },
                    ticks: {
                        color: '#545454',
                        callback: function(value)   {
                            var date = startDate();
                            for(var m=0;m<value;m++)
                                date.increment();
                            return String(date.getYear());
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {color: 'rgba(0, 0, 0, 0.08)'},
                    ticks: {
                        color: '#545454',
                        maxTicksLimit: 8,
                        callback: Unburyme.Graph.dollarFormatter
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    align: 'end',
                    labels: {boxWidth: 14, boxHeight: 10, color: '#545454'}
                },
                tooltip: {
                    callbacks: {
                        title: function(items)  {
                            if(!items.length)
                                return '';
                            var date = startDate();
                            for(var m=0;m<items[0].parsed.x;m++)
                                date.increment();
                            return date.print();
                        },
                        label: function(item)   {
                            return ' ' + item.dataset.label + ': $' + item.parsed.y.toFixed(2);
                        }
                    }
                }
            }
        }
    };

};


/**
 * @param {string} field Field to display on graph
 * @return {Array.<Object>} One Chart.js dataset per calculated loan
 */
Unburyme.Graph.prototype.makeDataSets = function(field) {

    var datasets = [],
        loans = this.loanApp.initLoanArray;
    for(var i=0;i<loans.length;i++) {
        var values = loans[i].results.getGraphData(field) || [],
            points = [],
            color = this.colorSet[i % this.colorSet.length];
        for(var m=0;m<values.length;m++)
            points.push({x: m, y: values[m]});
        datasets.push({
            label: loans[i].getName(),
            data: points,
            borderColor: color,
            backgroundColor: color
        });
    }
    return datasets;

};


/**
 * X-axis ticks fall on each January, thinned out so there are at most about 8
 * @param {number} months Length of the longest schedule
 * @return {number[]} Month offsets from the first payment month
 */
Unburyme.Graph.prototype.makeYearTicks = function(months)  {

    var untilNewYear = (12 - new Unburyme.Date().getMonth()) % 12,
        yearsToPay = Math.ceil(months / 12),
        stride = yearsToPay > 8 ? Math.ceil(yearsToPay / 8) : 1,
        ticks = [];
    for(var m=untilNewYear;m<months;m+=12*stride)
        ticks.push(m);
    return ticks;

};


/**
 * @param {string} field Title of graph
 */
Unburyme.Graph.prototype.drawTitle = function(field)    {

    var title = Unburyme.Dom.byId('graphTitle');
    title.textContent = Unburyme.Graph.TITLES[field] || '';
    Unburyme.Dom.fadeIn(title, this.loanApp.config.fadeSpeed);

    var links = document.querySelectorAll('.graphView');
    for(var i=0;i<links.length;i++)
        links[i].setAttribute('aria-pressed', links[i].id == 'graph_' + field ? 'true' : 'false');

};


/**
 * Format the value with a $ sign
 * @param {number} v Value to be formatted
 * @return {string} Formatted value
 */
Unburyme.Graph.dollarFormatter = function(v)  {

    return '$' + v;

};


/**
 * Hides the graph and clears stored graph info
 */
Unburyme.Graph.prototype.reset = function() {

    var fadeSpeed = this.loanApp.config.fadeSpeed;
    Unburyme.Dom.fadeOut(Unburyme.Dom.byId('graph'), fadeSpeed);
    Unburyme.Dom.fadeOut(Unburyme.Dom.byId('graphViewOptions'), fadeSpeed);
    Unburyme.Dom.fadeOut(Unburyme.Dom.byId('graphTitle'), fadeSpeed);
    if(this.chart)  {
        this.chart.data.datasets = [];
        this.chart.update('none');
    }
    this.lastFieldGraphed = 'princRemaining';

};
