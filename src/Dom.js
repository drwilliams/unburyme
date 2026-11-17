/**
 * Unburyme.Dom
 * Small DOM helpers used in place of jQuery
 */
Unburyme.Dom = {};


/**
 * @param {string} id
 * @return {Element}
 */
Unburyme.Dom.byId = function(id)    {

    return document.getElementById(id);

};


/**
 * Parses an HTML string into a single element
 * @param {string} html
 * @return {Element}
 */
Unburyme.Dom.create = function(html)   {

    var template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstElementChild;

};


/**
 * Calls handler for events of type on descendants of root matching selector
 * @param {Element|Document} root
 * @param {string} type
 * @param {string} selector
 * @param {function(Event, Element)} handler Called with the event and the matched element
 */
Unburyme.Dom.on = function(root, type, selector, handler)  {

    root.addEventListener(type, function(e) {
        var target = e.target.closest ? e.target.closest(selector) : null;
        if(target && root.contains(target))
            handler(e, target);
    });

};


Unburyme.Dom.isShown = function(el)    {

    return !!el && getComputedStyle(el).display != 'none';

};


/**
 * Runs a Web Animation, falling back to an instant change where unsupported
 */
Unburyme.Dom.animate_ = function(el, keyframes, duration, done)    {

    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(!el.animate || reduceMotion || !duration)  {
        if(done)
            done();
        return;
    }
    if(el.unburymeAnimation)
        el.unburymeAnimation.cancel();
    var animation = el.animate(keyframes, {duration: duration, easing: 'ease'});
    el.unburymeAnimation = animation;
    animation.onfinish = function()   {
        el.unburymeAnimation = null;
        if(done)
            done();
    };

};


Unburyme.Dom.fadeIn = function(el, duration)   {

    if(!el || Unburyme.Dom.isShown(el))
        return;
    el.style.display = 'block';
    Unburyme.Dom.animate_(el, [{opacity: 0}, {opacity: 1}], duration);

};


Unburyme.Dom.fadeOut = function(el, duration)  {

    if(!el || !Unburyme.Dom.isShown(el))
        return;
    Unburyme.Dom.animate_(el, [{opacity: 1}, {opacity: 0}], duration, function()   {
        el.style.display = 'none';
    });

};


Unburyme.Dom.slideDown = function(el, duration)    {

    if(!el)
        return;
    el.style.display = 'block';
    var height = el.scrollHeight + 'px';
    el.style.overflow = 'hidden';
    Unburyme.Dom.animate_(el, [{height: '0px'}, {height: height}], duration, function()    {
        el.style.overflow = '';
    });

};


/**
 * @param {Element} el
 * @param {number} duration
 * @param {function()=} done Called once the element is hidden
 */
Unburyme.Dom.slideUp = function(el, duration, done)    {

    if(!el)
        return;
    el.style.overflow = 'hidden';
    Unburyme.Dom.animate_(el, [{height: el.offsetHeight + 'px'}, {height: '0px'}], duration, function()    {
        el.style.display = 'none';
        el.style.overflow = '';
        if(done)
            done();
    });

};
