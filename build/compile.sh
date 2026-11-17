#!/bin/bash

#Advanced option (needs an externs file for uPlot)
#java -jar compiler.jar --js=../src/Unburyme.js --js=../src/Config.js --js=../src/Date.js --js=../src/Dom.js --js=../src/Schedule.js --js=../src/Graph.js --js=../src/interface.js --js=../src/LoanApp.js --js=../src/Loan.js --js=../src/ResultBar.js --js=../src/TotalResults.js --js_output_file=../build/unburyme.js --compilation_level=ADVANCED_OPTIMIZATIONS --externs uplot.externs.js

java -jar compiler.jar \
--js_output_file=../js/unburyme.js \
--compilation_level=SIMPLE_OPTIMIZATIONS \
--js=../src/Unburyme.js \
--js=../src/Config.js \
--js=../src/Date.js \
--js=../src/Dom.js \
--js=../src/Schedule.js \
--js=../src/Graph.js \
--js=../src/interface.js \
--js=../src/LoanApp.js \
--js=../src/Loan.js \
--js=../src/ResultBar.js \
--js=../src/TotalResults.js

# Stamp content hashes onto the script and stylesheet links so browsers
# never pair a new index.html with a cached old js/css file
JS_VERSION=$(md5sum ../js/unburyme.js | cut -c1-8)
CSS_VERSION=$(md5sum ../css/main.css | cut -c1-8)
sed -i -E \
    -e "s#(js/unburyme\.js)(\?v=[0-9a-f]+)?'#\1?v=${JS_VERSION}'#" \
    -e "s#(css/main\.css)(\?v=[0-9a-f]+)?'#\1?v=${CSS_VERSION}'#" \
    ../index.html
