/**
 * Unburyme.Config
 * Configuration for the Unburyme app
 * @constructor
 */
Unburyme.Config = function()    {
    
    this.slideSpeed = 500;
    this.sliderWaitToCalculate = 50;
    this.sliderMax = 5000;
    this.fadeSpeed = 200;
    this.colorSet = ['#0ea5c6', '#f59e0b', '#8b5cf6', '#10b981', '#ef4444', '#64748b'];

};


/**
 * For debugging
 * @constructor
 */
Unburyme.debug = function(s)    {
    if(typeof console == 'object')
        console.log(s);
};
