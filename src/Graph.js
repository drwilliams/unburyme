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

};


Unburyme.Graph.TITLES = {
    'princRemaining': 'Principle Remaining',
    'princPaid': 'Principle Paid',
    'totalInterestPaid': 'Total Interest Paid',
    'monthlyPayment': 'Monthly Payment'
};

Unburyme.Graph.WIDTH = 600;
Unburyme.Graph.HEIGHT = 300;
Unburyme.Graph.AXIS_FONT = '11px "Droid Sans", arial, sans-serif';
Unburyme.Graph.AXIS_COLOR = '#545454';
Unburyme.Graph.GRID = {stroke: 'rgba(0, 0, 0, 0.08)', width: 1};


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

    if(typeof uPlot == 'undefined')
        return;

    var loans = this.loanApp.initLoanArray,
        names = [],
        columns = [],
        months = 0,
        i, m;
    for(i=0;i<loans.length;i++) {
        names.push(loans[i].getName());
        columns.push(loans[i].results.getGraphData(field) || []);
        months = Math.max(months, columns[i].length);
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
    var key = JSON.stringify(names);
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
        series = [{
            label: 'Month',
            value: function(u, v)   {
                return v == null ? '' : self.monthLabel(v);
            }
        }];

    for(var i=0;i<names.length;i++) {
        series.push({
            label: names[i],
            stroke: this.colorSet[i % this.colorSet.length],
            width: 2,
            points: {show: false},
            value: function(u, v)   {
                return v == null ? '' : '$' + v.toFixed(2);
            }
        });
    }

    return {
        width: G.WIDTH,
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
                stroke: G.AXIS_COLOR,
                grid: G.GRID,
                ticks: G.GRID,
                splits: function()  {
                    return self.yearTicks;
                },
                values: function(u, splits) {
                    return splits.map(function(m) { return String(self.dateAt(m).getYear()); });
                }
            },
            {
                font: G.AXIS_FONT,
                stroke: G.AXIS_COLOR,
                grid: G.GRID,
                ticks: G.GRID,
                size: 60,
                values: function(u, splits) {
                    return splits.map(Unburyme.Graph.dollarFormatter);
                }
            }
        ],
        hooks: {
            // White-to-blue gradient behind the plot, and a dark outline around it
            drawClear: [function(u)    {
                var b = u.bbox,
                    ctx = u.ctx,
                    gradient = ctx.createLinearGradient(0, b.top, 0, b.top + b.height);
                gradient.addColorStop(0, '#ffffff');
                gradient.addColorStop(1, '#b0edf7');
                ctx.save();
                ctx.fillStyle = gradient;
                ctx.fillRect(b.left, b.top, b.width, b.height);
                ctx.restore();
            }],
            draw: [function(u)    {
                var b = u.bbox,
                    ctx = u.ctx;
                ctx.save();
                ctx.strokeStyle = G.AXIS_COLOR;
                ctx.lineWidth = 2 * uPlot.pxRatio;
                ctx.strokeRect(b.left, b.top, b.width, b.height);
                ctx.restore();
            }]
        }
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
        this.chart.destroy();
        this.chart = null;
        this.chartKey = '';
    }
    this.lastFieldGraphed = 'princRemaining';

};
