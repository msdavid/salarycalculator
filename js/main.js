rowChangeTracker = [];

function suffixRenderer(instance, td, row, column, prop, value, cellProperties) {
    Handsontable.renderers.NumericRenderer.apply(this, arguments);
    if ('zerosuffix' in cellProperties) {
        zerosuffix = cellProperties.zerosuffix;
    } else { zerosuffix = '' };

    if (value !== undefined && value !== '') {
        if (value == 0 || Number.isNaN(value) || !value) {
            td.innerHTML = cellProperties.zero + zerosuffix;
            return;
        }
        if ('fraction' in cellProperties) {
            if (value == 0.5) {
                td.innerHTML = '1/2' + cellProperties.suffix;
                return
            }
            if (value == -0.5) {
                td.innerHTML = '-1/2' + cellProperties.suffix;
                return
            }
        }
        value = numbro(parseFloat(value)).format(cellProperties.numericFormat);
        td.innerHTML = value + cellProperties.suffix;
    } else {
        td.innerHTML = cellProperties.zero + zerosuffix;
    }
}

const dateCol = 0;
const dayCol = 1;
const daytypeCol = 2;
const serviceCol = 3;
const startCol = 4;
const endCol = 5;
const breakCol = 6;
const workedhoursCol = 7;
const overtimeCol = 8;
const payableCol = 9;
const restdayCol = 10;
const publicholidayCol = 11;
const remarksCol = 12;
const reasonCol = 13;
const payxCol = 14;
const carryoverCol = 15;
const detailsCol = 16;

const timesheetHeaders = [
    'Date',
    'Day',
    'Day type',
    'Service',
    'Start',
    'End',
    'Break',
    'Work hs',
    'Overtime',
    'Payable',
    'Restday',
    'P. holiday',
    'Remarks',
    '1/2d Reason',
    'PayX',
    'C Over',
    'Details'
];

[r, c] = [33, timesheetHeaders.length];
ChangeManager = Array(r).fill().map(() => Array(c).fill(false));

Handsontable.renderers.registerRenderer('suffixRenderer', suffixRenderer);
Handsontable.cellTypes.registerCellType('suffixnumeric', {
    renderer: 'suffixRenderer',
    editor: Handsontable.editors.NumericEditor
});

const timesheetColumns = [
    { readOnly: true }, //date
    { width: 40, readOnly: true }, //day
    { width: 128, type: 'dropdown', source: _.values(dayTypes), allowInvalid: false, }, // type
    { type: 'dropdown', source: _.values(workDayServices), allowInvalid: false, width: 138 }, //service
    { width: 80, type: 'time', timeFormat: 'h:mm a', correctFormat: true, className: 'required' }, // start
    { width: 80, type: 'time', timeFormat: 'h:mm a', correctFormat: true, className: 'required' }, //end
    { readOnly: false, type: 'suffixnumeric', numericFormat: '0[.]0', suffix: ' h', zero: '', className: 'required' }, // break
    { readOnly: true, type: 'suffixnumeric', numericFormat: '0[.]0', suffix: ' h', zero: '' }, // working hrs
    { readOnly: true, type: 'suffixnumeric', numericFormat: '0[.]0', suffix: ' h', zero: '' }, // overtime
    { width: 80, readOnly: true, type: 'suffixnumeric', numericFormat: '0[.]00', suffix: ' d', zero: '', fraction: true }, // payable
    { readOnly: true, type: 'suffixnumeric', numericFormat: '0[.]0', suffix: ' d', zero: '' }, // rest day
    { readOnly: true, type: 'suffixnumeric', numericFormat: '0[.]0', suffix: ' d', zero: '' }, // public holiday
    { readOnly: true }, //remarks
    //hiden columns
    {}, //reason
    { type: 'suffixnumeric', numericFormat: '0[.]00', suffix: 'x', zero: '', zerosuffix: '' }, // PayX
    { readOnly: true, type: 'suffixnumeric', numericFormat: '0[.]0', suffix: ' h', zero: '' }, // carryover
    {}
];

const timesheetSettings = {
        licenseKey: 'non-commercial-and-evaluation',
        colHeaders: timesheetHeaders,
        columns: timesheetColumns,
        hiddenColumns: { columns: [detailsCol, reasonCol, carryoverCol, restdayCol, publicholidayCol] },
        beforeChange: function() { spinner(); },
        afterChange: timesheetChange,
        tabMoves: moves,
        enterMoves: moves,
        width: '100%',
        height: '768px',

    }
    // beforeRefreshDimensions() { return false; }

const timesheetContainer = document.getElementById('timesheet');
timesheet = new Handsontable(timesheetContainer, timesheetSettings);

createSelects();
generateTimeSheet(currentMonth, currentYear);

//string translatios
$("*").each(function() {
    var text = $(this).text();
    if (text in strings) {
        var re = new RegExp(text, "g");
        text = text.replace(re, strings[text]);
        $(this).html(text);
    }
});

var tableHeight = $('.htCore').height();
var boxHeight = tableHeight + 1;
$('.resultbox').height(boxHeight);

let notChrome = !/Chrome/.test(navigator.userAgent)
let alertMessage = "Please use Google Chrome to access this site.\nSome key features do not work in other browsers."
if (notChrome) alert(alertMessage)

$('.string').each(function(index) {
    var str = $(this)[0].innerHTML;
    if (str in strings) {
        str = $(this)[0].innerHTML = strings[str];
    }
})

function configCalculations() {
    var data = config.getData();
    var monthly = data[1][1];
    var daysPerWeek = data[0][1];
    data[1][3] = getDailyPay(monthly, daysPerWeek);
    data[1][5] = getHourlyPay(monthly);
    data[1][7] = getOvertimePay(monthly);
    data[1][9] = getRestdayPay(monthly, daysPerWeek);
    data[1][11] = getPublicholidayPay(monthly, daysPerWeek);
}

function timesheetChange(changes, source) {
    if (changes !== null && (
            source === 'edit' |
            source === 'Autofill.fill' |
            source == 'CopyPaste.paste' |
            source == 'UndoRedo.undo')) {

        changes.forEach(change => {
            col = change[1];
            row = change[0];
            if (ChangeManager[row][col]) {
                ChangeManager[row][col] = false;
            } else {
                calculate();
                applyFormat();
                updateTotals();
            }
        });
    }
}

blockConfigChange = false;

function generateTimeSheet(month, year, resday = 'Sun', halfday = 'Sat', renew) {
    var days = getNumOfDays(year, month);
    var oldData = timesheet.getData();
    if (month < 10) month = "0" + month;
    var monthStr = moment(`${year}-${month}-01`).format('MMM');
    timesheetHeaders[0] = monthStr;
    var data = [];
    for (var day = 1; day <= days; day++) {
        rowIndex = day - 1;
        weekDay = dayOfTheWeek(year, month, day);
        dayType = dayTypes['payable'];
        service = services['worked'];

        if (isHoliday(year, month, day) !== '') {
            dayType = dayTypes['pholiday'];
            service = services['notworked'];

            cellSetSource(rowIndex, serviceCol, _.values(restdayServices));
        }
        if (weekDay === halfday) {
            dayType = dayTypes['halfday'];
            service = services['worked'];
        }
        if (weekDay === resday) {
            service = services['notworked'];
            dayType = dayTypes['restday'];
            var cell = timesheet.getCellMeta(rowIndex, serviceCol);
            cell.source = _.values(restdayServices);
        }
        var startVal = '';
        var endVal = '';
        if (oldData[rowIndex]) {
            if (oldData[rowIndex][startCol] !== null) startVal = oldData[rowIndex][startCol];
            if (oldData[rowIndex][endCol] !== null) endVal = oldData[rowIndex][endCol];
        }
        rowData = [day, weekDay, dayType, service, startVal, endVal, 0, 0, 0, 0, 0, 0, '', 'notset', 0, 0];
        data.push(rowData);
        rowChangeTracker[rowIndex] = rowData;
    }
    timesheet.updateData(data);
    calculate();
    applyFormat(forceRefresh = true);
}

function calculate() {
    var data = timesheet.getData();
    data.forEach(function(rowData, rowIndex) {
        var daytypeVal = rowData[daytypeCol];
        var serviceVal = rowData[serviceCol];
        var startVal = rowData[startCol];
        var endVal = rowData[endCol];
        var breakVal = rowData[breakCol];
        var workedhoursVal = rowData[workedhoursCol]
        var payableVal = rowData[payableCol];
        var overtimeVal = rowData[overtimeCol];
        var restdayVal = rowData[restdayCol];
        var publicholidayVal = rowData[publicholidayCol];
        var remarksVal = rowData[remarksCol];
        var reasonVal = rowData[reasonCol];
        var dayxVal = rowData[payxCol];
        var carryoverVal = rowData[carryoverCol];
        var lastcarryoverVal = ((rowIndex > 0) ? data[rowIndex - 1][carryoverCol] : 0);
        var tooltips = [];
        var tooltipsVal = '';
        var payableMultiplier = 0.0;
        var restdayMultiplier = 0.0;
        var publicholidayMultiplier = 0.0;
        var dayxMultiplier = 0.0;
        var overtimeMultiplier = 1.0;

        function resetDataRow() {
            startVal = '';
            endVal = '';
            breakVal = 0;
            detailsVal = '';
            reasonVal = 'notset';
            if (lastcarryoverVal <= 0) {
                workedhoursVal = 0;
                payableVal = 0;
                overtimeVal = 0
                restdayVal = 0;
                pholiday = 0;
                remarksVal = 0;
                dayxVal = 0;
                carryoverVal = 0;
                tooltipsVal = '';
                payableVal = 0;
            }

        }

        function getWorkDayVal() {
            var payableVal = 1;
            if (workedhoursVal <= 0) return 0;
            if (daytypeVal === dayTypes['payable']) {
                if (serviceVal == services['worked']) {
                    if (workedhoursVal <= halfDayCutOver) {
                        payableVal = reasonMultiplier[reasonVal];
                        tooltips.push(`${bullet} ${strings[reasonTexts[reasonVal]]}`);
                    }
                }
            }
            return payableVal;
        }

        function getWorkingHours() {
            if (startVal === null |
                endVal === null |
                startVal === '' |
                endVal === '') return [0, 0, 0];
            if (breakVal === null | breakVal === '') breakVal = 0;
            breakVal = parseFloat(breakVal);

            var startMoment = moment(startVal, 'h:mm a');
            var endMoment = moment(endVal, 'h:mm a');
            var midnightMoment = moment('12:00 am', 'h:mm a');
            var dayHours = endMoment.diff(startMoment, 'hours', true)

            if (dayHours <= 0) {
                dayHours = (12 - startMoment.diff(midnightMoment, 'hours', true)) + 12;
                nextDayHours = endMoment.diff(midnightMoment, 'hours', true) - breakVal;
                if (nextDayHours < 0) nextDayHours = 0;
            } else {
                nextDayHours = 0;
            }
            if (breakVal >= dayHours) breakVal = 0;
            return [dayHours - breakVal, nextDayHours, breakVal];
        }

        function getOvertimeHours() {
            if (daytypeVal == dayTypes['halfday']) {
                var overtimeHours = workedhoursVal - (halfDayCutOver * overtimeMultiplier);
            } else {
                var overtimeHours = workedhoursVal - (dayWorkingHours * overtimeMultiplier);
            }
            if (overtimeHours <= 0) {
                return 0;
            } else {
                return overtimeHours;
            }
        }

        if (daytypeVal == dayTypes['payable']) {
            payableMultiplier = 1;
            restdayMultiplier = 0;
            publicholidayMultiplier = 0;
            dayxMultiplier = payableMultiplierBase;

        }
        if (daytypeVal == dayTypes['restday']) {
            payableMultiplier = 0;
            restdayMultiplier = 1;
            publicholidayMultiplier = 0;
            dayxMultiplier = 2;

        }
        if (daytypeVal == dayTypes['halfday']) {
            payableMultiplier = 0.5;
            restdayMultiplier = 0;
            publicholidayMultiplier = 0;
            dayxMultiplier = 0.5;
        }
        if (daytypeVal == dayTypes['pholiday']) {
            payableMultiplier = 2;
            restdayMultiplier = 0;
            publicholidayMultiplier = 1;
            dayxMultiplier = 2;

        }
        if (daytypeVal == dayTypes['noemployment']) {
            resetDataRow();
            serviceVal = '';
        }

        if (serviceVal == services['worked']) {
            var hours = getWorkingHours();
            breakVal = hours[2];
            workedhoursVal = hours[0] + lastcarryoverVal;
            payableTotal = getWorkDayVal();
            overtimeVal = getOvertimeHours() * overtimeMultiplier;
            carryoverVal = hours[1];
            if (carryoverVal > 0) {
                tooltips.push(`${bullet} ${'(overnight work)'}`);
            }
        }

        if (serviceVal == services['mcfullpay']) {
            resetDataRow();
            payableTotal = 0;
        }


        if (serviceVal == services['noworkavailable']) {
            resetDataRow();
            payableTotal = 1;
        }
        if (serviceVal == services['paidleave']) {
            resetDataRow();
            payableTotal = 1;
        }
        if (serviceVal == services['unpaidleave']) {
            resetDataRow();
            payableTotal = -1;
        }
        if (serviceVal == services['qarantine']) {
            resetDataRow();
            payableTotal = 1;
        }
        if (serviceVal == services['notworked']) {
            resetDataRow();
            payableTotal = 0;
            dayxVal = 0;
        }

        payableVal = payableTotal * payableMultiplier;
        restdayVal = payableTotal * restdayMultiplier;
        publicholidayVal = payableTotal * publicholidayMultiplier;
        dayxVal = payableTotal * dayxMultiplier;

        if (lastcarryoverVal > 0) {
            tooltips.push(`${bullet} +${lastcarryoverVal}h (overnight)`)
        }

        if (tooltips.length > 0) {
            remarksVal = tooltips.length;
            tooltipsVal = tooltips.join("||");

        } else {
            remarksVal = '';
        }

        data[rowIndex][daytypeCol] = daytypeVal;
        data[rowIndex][serviceCol] = serviceVal;
        data[rowIndex][startCol] = startVal;
        data[rowIndex][endCol] = endVal;
        data[rowIndex][breakCol] = breakVal;
        data[rowIndex][workedhoursCol] = workedhoursVal;
        data[rowIndex][payableCol] = payableVal;
        data[rowIndex][overtimeCol] = overtimeVal;
        data[rowIndex][restdayCol] = restdayVal;
        data[rowIndex][publicholidayCol] = publicholidayVal;
        data[rowIndex][remarksCol] = remarksVal;
        data[rowIndex][reasonCol] = reasonVal;
        data[rowIndex][payxCol] = dayxVal;
        data[rowIndex][carryoverCol] = carryoverVal;
        data[rowIndex][detailsCol] = tooltipsVal;
    });
    timesheet.updateData(data);
}

function applyFormat(forceRefresh = false) {
    var data = timesheet.getData();
    timesheet.batch(() => {
        data.forEach((rowData, rowIndex) => {
            if (_.isEqual(rowData, rowChangeTracker[rowIndex]) && !forceRefresh) return;
            var daytypeVal = rowData[daytypeCol];
            var serviceVal = rowData[serviceCol];
            var payableVal = rowData[payableCol];
            var reasonVal = rowData[reasonCol];
            var workedhoursVal = rowData[workedhoursCol];
            var remarksVal = rowData[remarksCol];
            var detailsVal = rowData[detailsCol];
            var rowCss = '';
            var inputCss = '';
            var reasonCss = '';
            var inputReadOnly = false;
            var serviceSource = null;
            var serviceReadOnly = false;

            // dayType conditions 
            if (daytypeVal === dayTypes['payable']) {
                rowCss = 'worday '
                inputCss = 'required '
                serviceSource = workDayServices;
            }
            if (daytypeVal === dayTypes['restday']) {
                rowCss = 'restday '
                serviceSource = restdayServices;
            }
            if (daytypeVal === dayTypes['halfday']) {
                rowCss = 'halfday ';
                serviceSource = workDayServices;
            }
            if (daytypeVal === dayTypes['pholiday']) {
                rowCss = 'pholiday ';
                serviceSource = restdayServices;
            }
            if (daytypeVal === dayTypes['noemployment']) {
                rowCss = 'noemployment ';
                serviceReadOnly = true;
                inputReadOnly = true;
            }

            // Service conditions
            if (serviceVal !== services['worked']) {
                rowCss += 'notworked'
                inputReadOnly = true;
            }
            if (serviceVal === services['worked']) {
                rowCss += 'worked'
                inputCss = 'required ';
            }

            if (serviceVal == services['worked'] &&
                workedhoursVal <= halfDayCutOver &&
                workedhoursVal > 0 &&
                daytypeVal !== dayTypes['pholiday']) {
                addReasonDropdown(rowIndex);
                reasonCss = 'clickme '
                if (reasonVal === 'notset') {
                    reasonCss = 'clickme-red ';
                }
            }

            // apply changes
            rowSetClass(rowIndex, rowCss);

            if (inputCss !== '') {
                cellSetClass(rowIndex, [startCol, endCol, breakCol], inputCss + rowCss)
            }

            if (inputReadOnly) {
                cellSetReadOnly(rowIndex, [startCol, endCol, breakCol]);
            } else {
                cellUnSetReadOnly(rowIndex, [startCol, endCol, breakCol]);
            }

            if (serviceReadOnly) {
                cellSetReadOnly(rowIndex, [serviceCol]);
            } else {
                cellUnSetReadOnly(rowIndex, [serviceCol]);
            }

            if (reasonCss !== '') {
                cellSetClass(rowIndex, [payableCol], reasonCss + rowCss);
            } else {
                var cell = timesheet.getCell(rowIndex, payableCol);
                if (cell && 'reasonbox' in cell) {
                    cell.reasonbox.destroy();
                    delete cell.reasonbox;
                }
            }

            if (remarksVal > 0) {
                cellAddTooltip(rowIndex, remarksCol, detailsVal.split('||').join('<br>'));
            } else {
                cellAddTooltip(rowIndex, remarksCol, '');
            }
            cellSetSource(rowIndex, serviceCol, _.values(serviceSource));


            rowChangeTracker[rowIndex] = rowData;
        });
    });
    timesheet.render();
}

function updateTotals() {
    var basicSalary = parseFloat($("#monthlysalary").val());
    if (!basicSalary) return;
    var overtimeHours = colSum(overtimeCol);
    var workDays = colSum(payableCol);
    var restDays = colSum(restdayCol);
    var pholidays = colSum(publicholidayCol);
    var isPartialMonth = colGetData(daytypeCol).includes(dayTypes['noemployment']);
    var dailyRate = parseFloat($("#dailyrate").text());
    var basicPartialSalary = dailyRate * workDays;
    var unpaidLeave = arrSum(colGetData(payableCol).filter(x => x < 0));
    var mcfulldays = colGetData(serviceCol).filter(x => x === workDayServices['mcfullpay']).length;
    var mcMultiplier = 0;

    if (isPartialMonth) {
        var monthType = "Partial";
    } else {
        var monthType = "Full";
    }

    if (isPartialMonth) {
        basicSalary = basicPartialSalary;
        mcMultiplier = 1;
    }
    $("#basicsalary").text(basicSalary);
    $('#monthtype').text(monthType);
    if (!isPartialMonth) {
        $(".mcrow").hide();
    } else {
        $(".mcrow").show();
    }
    var overtimeRate = parseFloat($("#overtimerate").text());
    var restdayRate = parseFloat($("#restdayrate").text());
    var publicHolidayRate = parseFloat($("#publicholidayrate").text());
    var overtimeAmount = overtimeHours * overtimeRate;
    var restdayAmmount = restDays * restdayRate;
    var publicHolidayAmmount = pholidays * publicHolidayRate;
    var unpaidLeaveAmmount = dailyRate * unpaidLeave;
    var mcAmmount = -(dailyRate * mcfulldays * mcMultiplier);
    var grandTotal = overtimeAmount + restdayAmmount + publicHolidayAmmount + unpaidLeaveAmmount + mcAmmount + basicSalary;
    if (grandTotal < 0) grandTotal = 0;
    $('#overtimecount').text(overtimeHours.toFixed(1).toString() + 'h');
    $('#overtime').text(overtimeAmount.toFixed(2));
    $('#restdayscount').text(restDays.toFixed(1).toString() + 'd');
    $("#restdays").text(restdayAmmount.toFixed(2));
    $('#publicholidayscount').text(pholidays.toFixed(1).toString() + 'd');
    $('#publicholidays').text(publicHolidayAmmount.toFixed(2));
    $('#nonpayleavecount').text(unpaidLeave.toFixed(1).toString() + 'd');
    $('#unpaidleave').text(unpaidLeaveAmmount.toFixed(2));
    $('#mccount').text(mcfulldays.toFixed(1).toString() + 'd');
    $('#mc').text(mcAmmount.toFixed(2));
    $('#grandtotal').text(grandTotal.toFixed(1));
}

function updateRates() {
    var monthlySalary = $("#monthlysalary").val();
    var daysPerWeek = $("#daysperweek").val();
    var dailyRate = getDailyPay(monthlySalary, daysPerWeek);
    var hourlyRate = getHourlyPay(monthlySalary);
    var overtimeRate = getOvertimePay(monthlySalary);
    var restdayRate = getRestdayPay(monthlySalary, daysPerWeek);
    var publicHolidayRate = getPublicholidayPay(monthlySalary, daysPerWeek);
    $("#dailyrate").text(dailyRate.toFixed(2));
    $("#hourlyrate").text(hourlyRate.toFixed(2));
    $("#overtimerate").text(overtimeRate.toFixed(2));
    $("#restdayrate").text(restdayRate.toFixed(2));
    $("#publicholidayrate").text(publicHolidayRate.toFixed(2));
    updateTotals();


}

function setPayable(row, selected) { // called by the reason dropdown
    var cell = timesheet.getCell(row, payableCol);
    cell.reasonbox.close();
    cellSetValue(row, [payableCol], reasonMultiplier[selected.value]);
    cellSetValue(row, [reasonCol], selected.value);
    applyFormat();
}

function exportTimesheet(filename) {
    const exportPlugin = timesheet.getPlugin('exportFile');
    exportPlugin.downloadFile('csv', {
        bom: false,
        columnDelimiter: ',',
        columnHeaders: true,
        exportHiddenColumns: true,
        exportHiddenRows: true,
        fileExtension: 'csv',
        filename: filename,
        mimeType: 'text/csv',
        rowDelimiter: '\r\n',
        rowHeaders: false
    });
}

function saveTimesheet(filename) {
    content = {
        config: getCfg(),
        data: data = timesheet.getData()
    }
    content = JSON.stringify(content);
    var dataStream = "text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(content));
    $('#savejson').append(`<a href='data:${dataStream}' id="savelink" download="${filename}.json">downlaod</a>`);
    $('#savelink')[0].click();
}

function loadTimesheet() {
    $('#fileloader')[0].click();
}

function uploadfile() {
    var fr = new FileReader()
    fr.readAsText($('#fileloader')[0].files[0]);
    fr.onload = function() {
        var content = JSON.parse(fr.result);
        content = JSON.parse(content);
        var configData = content['config'];
        var timesheetData = content['data'];
        var data = config.getData();
        data[0][1] = configData['daysPerWeek'];
        data[1][1] = configData['monthlySalary'];
        data[2][1] = configData['startingMonth'];
        data[3][1] = configData['startingYear'];
        config.updateData(data);
        configCalculations();
        timesheet.updateData(timesheetData);
        $('#fileloader')[0].value = null;
        applyFormat();
    };
}


function moves(event) {
    selected = timesheet.getSelected();
    column = selected[0][1];
    row = selected[0][0]
    if (column === startCol) { return { row: 0, col: 1 } }
    if (column === endCol) { return { row: 0, col: 1 } }
    if (column === breakCol) { return { row: 1, col: -2 } }
}

function updateTimeSheeConfig() {
    confPop.close();
    var configYear = parseInt($(".yearselect")[1].value);
    var configMonth = parseInt($(".monthselect")[1].value);
    var configRestday = $(".restdayselect")[1].value;
    var configHalfday = $(".halfdayselect")[1].value;
    generateTimeSheet(configMonth, configYear, configRestday, configHalfday);
    $("#monthyear").text(`${monthsOfTheYear[configMonth]}, ${configYear}`);

}