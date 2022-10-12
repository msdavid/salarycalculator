bullet = "🞄"

const arrMin = arr => Math.min(...arr);
const arrMax = arr => Math.max(...arr);
const arrSum = arr => arr.reduce((a, b) => a + b, 0);
const arrAvg = arr => arr.reduce((a, b) => a + b, 0) / arr.length

const getNumOfDays = (year, month) => {
    return new Date(year, month, 0).getDate();
}

const dayOfTheWeek = (year, month, day) => {
    month = parseInt(month) - 1;
    var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dt = new Date(year, month, day);
    return days[dt.getDay()];
}


function cellSetReadOnly(row, cols) {
    cols.forEach(col => {
        cell = timesheet.getCellMeta(row, col)
        cell.readOnly = true;
    });
}

function cellUnSetReadOnly(row, cols) {
    cols.forEach(col => {
        cell = timesheet.getCellMeta(row, col)
        cell.readOnly = false;
    });
}

function cellAddClass(row, cols, className) {
    cols.forEach(col => {
        cell = timesheet.getCellMeta(row, col)
        if (typeof cell.className == 'undefined') {
            cell.className = className;
            return
        } else {
            if (!cell.className.includes(className)) {
                cell.className = cell.className + " " + className;
            }
        }

    });
}

function cellSetSource(row, col, source) {
    var cell = timesheet.getCellMeta(row, col);
    cell.source = source;
}

function cellRemoveClass(row, cols, className, except = '') {
    cols.forEach(col => {
        var cell = timesheet.getCellMeta(row, col)
        if (className == '*') {
            cell.className = except;
        }
        if (typeof cell.className != 'undefined') {
            if (cell.className.includes(className)) {
                cell.className = cell.className.replace(className, ' ')
            }
        }
    });
}

function rowAddClass(row, className) {
    cells = timesheet.getCellMetaAtRow(row);
    cells.forEach(function(item, index) {
        cellAddClass(row, [index], className)
    });
}

function rowSetClass(row, className) {
    cells = timesheet.getCellMetaAtRow(row);
    cells.forEach(function(cell, index) {
        cell.className = className
    });
}

function cellSetClass(row, cols, className) {
    cols.forEach(col => {
        timesheet.getCellMeta(row, col).className = className;
    });
}

function rowRemoveClass(row, className) {
    cells = timesheet.getCellMetaAtRow(row);
    cells.forEach(function(item, index) {
        cellRemoveClass(row, [index], className)
    });
}



function cellSetValue(row, cols, value, noChange = false) {
    cols.forEach(col => {
        ChangeManager[row][col] = noChange;
        timesheet.setDataAtCell(row, col, value);
    });
}

function cellGetValue(row, col) {
    return timesheet.getDataAtCell(row, col);
}



function cellRemoveError(row, cols) {
    cols.forEach(function(col) {
        cellRemoveClass(row, [col], 'error')

    });
}

function cellAddError(row, cols, note) {
    cols.forEach(col => {
        cellAddClass(row, [col], 'error');
    });
}

function removeItem(array, item) {
    for (var i in array) {
        if (array[i] == item) {
            array.splice(i, 1);
            break;
        }
    }
}

var spinnerTimeout = setTimeout(function() {}, );

function spinner() {
    $('.spinner').css('display', 'inline-block');
    clearTimeout(spinnerTimeout);
    spinnerTimeout = setTimeout(function() { $('.spinner').css('display', 'none') }, 500);
}

function isHoliday(year, month, day) {
    if (day < 10) day = "0" + day;
    dateStr = `${year}-${month}-${day}`
    dateStr = moment(dateStr).format("YYYY-MM-DD");
    if (dateStr in pholidays) {
        return pholidays[todaysDate];
    }
    return '';
}

function addReasonDropdown(rowIndex) {
    var item = timesheet.getCell(rowIndex, payableCol);
    if (item.boxattached) return;
    if (item && 'reasonbox' in item) return;
    var html = $('#reasonpopup')[0].outerHTML;
    html = html.replace('rownumber', rowIndex);
    html = html.replace('id="reasonpopup" ', '');
    html = html.replace('display:none;', '');
    html = html.replace('half_day_reason_explanation', getText('half_day_reason_explanation'));
    item.reasonbox = new jBox('Tooltip', {
        attach: $(item),
        content: html,
        closeOnMouseleave: false,
        closeButton: true,
        trigger: 'click',
    });
}

function cellAddTooltip(row, col, htmlContent, table = timesheet) {
    var html = getText(htmlContent);
    var item = table.getCell(row, col);
    if (html === "") {
        if (item && 'tooltip' in item) item.tooltip.destroy();
        cellRemoveClass(row, [remarksCol], 'hastooltip')
        return;
    }
    html = html.replace('<spc>', '&nbsp;')
    cellAddClass(row, [remarksCol], 'hastooltip')
    if (item && 'tooltip' in item) item.tooltip.destroy();
    item.tooltip = new jBox('Tooltip', {
        attach: $(item),
        content: html,
    });
}

var zoom = 1;
var zoomStep = 0.05;
var translate = 10;
var transStep = 10;

$('#zoomIn').on("click", function() {
    zoom += zoomStep;
    translate += transStep;
    $("#zoomtext").css({
        'transform': `scale(${zoom}) translateY(${translate}px)`

    });
    // $("#zoomtext").css({
    //     'transform': 'translateY(10px)'
    // });

});
$('#zoomOut').on("click", function() {
    if (zoom > zoomStep) {
        zoom -= zoomStep;
        translate -= transStep;
        $("#zoomtext").css({
            'transform': `scale(${zoom})`,
        });
    }
});
$('#zoomRestore').on("click", function() {
    zoom = 1;
    translate = 1;
    $("#zoomtext").css({
        'transform': '',
    });
});

function getText(key) {
    if (key in strings) {
        return strings[key];
    } else {
        return key;
    }
}

function colGetData(col, obj = timesheet) {
    var data = obj.getData();
    result = [];
    data.forEach(row => {
        result.push(row[col]);
    });
    return result;
}

function colSum(col) {
    return arrSum(colGetData(col));
}

var confPop = null;

function createSelects(year = currentYear,
    month = currentMonth, resday = "Sun", halfday = "Sat") {
    var years = _.range(year - 5, year + 3);
    years.forEach(item => {
        var selected = ((parseInt(item) === year) ? 'selected' : '');
        $(".yearselect").append(`<option ${selected} value="${item}">${item}</option>\n`);
    });
    _.keys(monthsOfTheYear).forEach(item => {
        var selected = ((parseInt(item) === month) ? 'selected' : '');
        var option = monthsOfTheYear[item];
        $(".monthselect").append(`<option ${selected} value="${item}">${option}</option>\n`);
    });
    _.keys(daysOfTheWeek).forEach(item => {
        var selected = ((item === resday) ? 'selected' : '');
        var option = daysOfTheWeek[item];
        $(".restdayselect").append(`<option ${selected} value="${item}">${option}</option>\n`);
    });
    _.keys(daysOfTheWeek).forEach(item => {
        var selected = ((item === halfday) ? 'selected' : '');
        var option = daysOfTheWeek[item];
        $(".halfdayselect").append(`<option ${selected} value="${item}">${option}</option>\n`);
    });

    var dayTypeEditHtml = $('#confpop')[0].outerHTML;
    if (confPop) {
        confPop.destroy();
    }
    confPop = new jBox('Tooltip', {
        attach: $(".confedit"),
        content: dayTypeEditHtml,
        trigger: 'click',
    });

    $("#monthyear").text(`${monthsOfTheYear[currentMonth]}, ${currentYear}`);

}