/**
 * Unburyme.Graph
 * Draws the payoff graph with uPlot
 * @param {Unburyme.LoanApp} loanApp
 * @constructor
 */
Unburyme.Graph = function(loanApp)  {

    this.loanApp = loanApp;
    this.colorSet = this.loanApp.config.colorSet;
    this.lastFieldGraphed = 'princRemaining';
    this.chart = null;
    this.chartKey = '';
    this.yearTicks = [];

    // Follow the container's width, and redraw in the new colours when the theme changes
    var self = this,
        resizeTimeout = null;
    window.addEventListener('resize', function()    {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function()   {
            if(self.chart)
                self.chart.setSize({width: self.getWidth(), height: Unburyme.Graph.HEIGHT});
        }, 100);
    });
    if(window.matchMedia)   {
        var scheme = window.matchMedia('(prefers-color-scheme: dark)'),
            onSchemeChange = function()    {
                if(self.chart)  {
                    self.chartKey = '';
                    self.draw();
                }
            };
        if(scheme.addEventListener)
            scheme.addEventListener('change', onSchemeChange);
    }

};


Unburyme.Graph.TITLES = {
    'princRemaining': 'Balance remaining',
    'princPaid': 'Principal paid each month',
    'totalInterestPaid': 'Interest paid so far',
    'monthlyPayment': 'Monthly payment',
    'minimums': 'Required minimum payments'
};

Unburyme.Graph.HEIGHT = 300;
Unburyme.Graph.AXIS_FONT = '12px Inter, system-ui, sans-serif';


/**
 * @return {number} Width available for the chart
 */
Unburyme.Graph.prototype.getWidth = function()  {

    return Math.max(Unburyme.Dom.byId('graph').clientWidth, 260);

};


/**
 * Reads axis and grid colours from the page's CSS custom properties
 * @return {{text: string, grid: string}}
 */
Unburyme.Graph.prototype.getTheme = function()  {

    var style = getComputedStyle(document.documentElement),
        read = function(name, fallback) {
            return (style.getPropertyValue(name) || '').trim() || fallback;
        };
    return {
        text: read('--muted', '#5a6a74'),
        accent: read('--accent', '#077c93'),
        grid: read('--border', '#dfe5e9')
    };

};


/**
 * Renders graph on screen
 * @param {string=} field Field in which to graph
 */
Unburyme.Graph.prototype.draw = function(field) {

    if(!field)
        field = this.lastFieldGraphed;
    this.lastFieldGraphed = field;

    this.drawTitle(field);

    if(typeof uPlot == 'undefined')
        return;

    var loans = this.loanApp.initLoanArray,
        names = [],
        columns = [],
        months = 0,
        i, m;
    if(field == 'minimums') {
        names.push('Required minimums');
        columns.push(this.loanApp.getRequiredMinimums());
        months = columns[0].length;
    }
    else    {
        for(i=0;i<loans.length;i++) {
            names.push(loans[i].getName());
            columns.push(loans[i].results.getGraphData(field) || []);
            months = Math.max(months, columns[i].length);
        }
    }

    // uPlot wants one shared x array, with every series padded to its length
    var data = [[]];
    for(m=0;m<months;m++)
        data[0].push(m);
    for(i=0;i<columns.length;i++)  {
        var series = columns[i].slice();
        while(series.length < months)
            series.push(null);
        data.push(series);
    }
    this.yearTicks = this.makeYearTicks(months);

    // Rebuild only when the set of series changes; otherwise just swap the data
    var key = field + ':' + JSON.stringify(names);
    if(field != 'minimums')
        key = JSON.stringify(names);
    if(this.chart && key == this.chartKey)  {
        this.chart.setData(data);
        return;
    }
    if(this.chart)
        this.chart.destroy();
    this.chartKey = key;
    this.chart = new uPlot(this.makeOptions(names), data, Unburyme.Dom.byId('graph'));

};


/**
 * @param {string[]} names Loan names, in series order
 * @return {Object} uPlot options
 */
Unburyme.Graph.prototype.makeOptions = function(names)  {

    var self = this,
        G = Unburyme.Graph,
        theme = this.getTheme(),
        grid = {stroke: theme.grid, width: 1},
        noTicks = {show: false},
        series = [{
            label: 'Month',
            value: function(u, v)   {
                return v == null ? '' : self.monthLabel(v);
            }
        }];

    for(var i=0;i<names.length;i++) {
        series.push({
            label: names[i],
            stroke: this.lastFieldGraphed == 'minimums' ? theme.accent : this.colorSet[i % this.colorSet.length],
            // Minimums change only when a loan is paid off, so draw them as steps
            paths: this.lastFieldGraphed == 'minimums' && uPlot.paths && uPlot.paths.stepped ? uPlot.paths.stepped({align: 1}) : undefined,
            width: 2.5,
            points: {show: false},
            value: function(u, v)   {
                return v == null ? '' : Unburyme.formatMoney(v);
            }
        });
    }

    return {
        width: this.getWidth(),
        height: G.HEIGHT,
        series: series,
        cursor: {y: false, points: {size: 7}, drag: {x: false, y: false}},
        scales: {
            x: {
                time: false,
                range: function(u, min, max)    {
                    return [0, Math.max(max, 1)];
                }
            },
            y: {
                range: function(u, min, max)    {
                    return uPlot.rangeNum(0, max > 0 ? max : 1, 0.1, true);
                }
            }
        },
        axes: [
            {
                font: G.AXIS_FONT,
                stroke: theme.text,
                grid: {show: false},
                ticks: {stroke: theme.grid, width: 1, size: 6},
                splits: function()  {
                    return self.yearTicks;
                },
                values: function(u, splits) {
                    return splits.map(function(m) { return String(self.dateAt(m).getYear()); });
                }
            },
            {
                font: G.AXIS_FONT,
                stroke: theme.text,
                grid: grid,
                ticks: noTicks,
                gap: 8,
                size: 56,
                values: function(u, splits) {
                    return splits.map(Unburyme.Graph.dollarFormatter);
                }
            }
        ]
    };

};


/**
 * @param {number} offset Months after the first payment month
 * @return {Unburyme.Date}
 */
Unburyme.Graph.prototype.dateAt = function(offset)  {

    var date = new Unburyme.Date();
    for(var m=0;m<offset;m++)
        date.increment();
    return date;

};


/**
 * @param {number} offset Months after the first payment month
 * @return {string} e.g. "Feb 2027"
 */
Unburyme.Graph.prototype.monthLabel = function(offset)  {

    return this.dateAt(offset).print();

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

    var links = document.querySelectorAll('.graphView');
    for(var i=0;i<links.length;i++)
        links[i].setAttribute('aria-pressed', links[i].id == 'graph_' + field ? 'true' : 'false');

};


/**
 * Format an axis value compactly, e.g. "$12.5k"
 * @param {number} v Value to be formatted
 * @return {string} Formatted value
 */
Unburyme.Graph.dollarFormatter = function(v)  {

    var abs = Math.abs(v);
    if(abs >= 1e6)
        return '$' + Number((v / 1e6).toFixed(1)) + 'M';
    if(abs >= 1e3)
        return '$' + Number((v / 1e3).toFixed(1)) + 'k';
    return '$' + Number(v.toFixed(2));

};


/**
 * Removes the chart
 */
Unburyme.Graph.prototype.reset = function() {

    if(this.chart)  {
        this.chart.destroy();
        this.chart = null;
        this.chartKey = '';
    }
    this.lastFieldGraphed = 'princRemaining';

};
