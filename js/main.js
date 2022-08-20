rowChangeTracker = [];

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
            }
        });
    }
}

blockConfigChange = false;

function generateTimeSheet(month, year) {
    var days = getNumOfDays(year, month);
    timesheet.updateSettings(timesheetSettings);
    rowChangeTracker = [];
    if (month < 10) month = "0" + month;
    var monthStr = moment(`${year}-${month}-01`).format('MMM');
    timesheetHeaders[0] = monthStr;
    var data = [];
    for (var day = 1; day <= days; day++) {
        rowIndex = day - 1;
        weekDay = dayOfTheWeek(year, month, day);
        dayType = dayTypes['workday'];
        service = services['worked'];
        if (isHoliday(year, month, day) !== '') {
            dayType = dayTypes['pholiday'];
            service = services['notworked'];
            cellSetSource(rowIndex, serviceCol, _.values(restdayServices));
        }
        if (weekDay === "Sat") {
            dayType = dayTypes['halfday'];
            service = services['worked'];
        }
        if (weekDay === "Sun") {
            service = restdayServices['notworked'];
            dayType = dayTypes['restday'];
            var cell = timesheet.getCellMeta(rowIndex, serviceCol);
            cell.source = _.values(restdayServices);
        }
        rowData = [day, weekDay, dayType, service, '', '', 0, 0, 0, 0, 0, 0, '', 'notset', 0, 0]
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
        var workdayVal = rowData[workdayCol];
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
        var workdayMultiplier = 0.0;
        var restdayMultiplier = 0.0;
        var publicholidayMultiplier = 0.0;
        var dayxMultiplier = 0.0;
        var overtimeMultiplier = overtimeMultiplierBase;

        function resetDataRow() {
            startVal = '';
            endVal = '';
            breakVal = 0;
            detailsVal = '';
            reasonVal = 'notset';
            if (lastcarryoverVal <= 0) {
                workedhoursVal = 0;
                workdayVal = 0;
                overtimeVal = 0
                restdayVal = 0;
                pholiday = 0;
                remarksVal = 0;
                dayxVal = 0;
                carryoverVal = 0;
                tooltipsVal = '';
            }

        }

        function getWorkDayVal() {
            var workdayVal = 1;
            if (workedhoursVal <= 0) return 0;
            if (daytypeVal === dayTypes['workday']) {
                if (serviceVal == services['worked']) {
                    if (workedhoursVal <= halfDayCutOver) {
                        workdayVal = reasonMultiplier[reasonVal];
                        tooltips.push(`${bullet} ${strings[reasonTexts[reasonVal]]}`);
                    }
                }
            }
            return workdayVal;
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
            var overtimeHours = workedhoursVal - (dayWorkingHours * overtimeMultiplier);
            if (overtimeHours <= 0) {
                return 0;
            } else {
                return overtimeHours;
            }
        }

        if (daytypeVal == dayTypes['workday']) {
            workdayMultiplier = 1;
            restdayMultiplier = 0;
            publicholidayMultiplier = 0;
            dayxMultiplier = workdayMultiplierBase;

        }
        if (daytypeVal == dayTypes['restday']) {
            workdayMultiplier = 0;
            restdayMultiplier = 1;
            publicholidayMultiplier = 0;
            dayxMultiplier = 2;

        }
        if (daytypeVal == dayTypes['halfday']) {
            workdayMultiplier = 0.5;
            restdayMultiplier = 0;
            publicholidayMultiplier = 0;
            dayxMultiplier = 0.5;
        }
        if (daytypeVal == dayTypes['pholiday']) {
            workdayMultiplier = 0;
            restdayMultiplier = 0;
            publicholidayMultiplier = 1;
            dayxMultiplier = 1;

        }
        if (daytypeVal == dayTypes['noemployment']) {
            resetDataRow();
            serviceVal = '';
        }

        if (serviceVal == services['worked']) {
            var hours = getWorkingHours();
            breakVal = hours[2];
            workedhoursVal = hours[0] + lastcarryoverVal;
            workdayTotal = getWorkDayVal();
            overtimeVal = getOvertimeHours() * overtimeMultiplier;
            carryoverVal = hours[1];
            if (carryoverVal > 0) {
                tooltips.push(`${bullet} ${'(overnight work)'}`);
            }
        }

        if (serviceVal == services['mcfullpay']) {
            resetDataRow();
            workdayTotal = 1;
        }

        if (serviceVal == services['mctwotherds']) {
            resetDataRow();
            workdayTotal = twothirdMultiplierBase;
            dayxMultiplier = 1;
        }

        if (serviceVal == services['noworkavailable']) {
            resetDataRow();
            workdayTotal = 1;
        }
        if (serviceVal == services['paidleave']) {
            resetDataRow();
            workdayTotal = 1;
        }
        if (serviceVal == services['qarantine']) {
            resetDataRow();
            workdayTotal = 1;
        }
        if (serviceVal == services['notworked']) {
            resetDataRow();
            workdayTotal = 0;
            dayxVal = 0;
        }

        workdayVal = workdayTotal * workdayMultiplier;
        restdayVal = workdayTotal * restdayMultiplier;
        publicholidayVal = workdayTotal * publicholidayMultiplier;
        dayxVal = workdayTotal * dayxMultiplier;

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
        data[rowIndex][workdayCol] = workdayVal;
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
            var workdayVal = rowData[workdayCol];
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
            if (daytypeVal === dayTypes['workday']) {
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
                cellSetClass(rowIndex, [workdayCol], reasonCss + rowCss);
            } else {
                var cell = timesheet.getCell(rowIndex, workdayCol);
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

function setWorkday(row, selected) { // called by the reason dropdown
    var cell = timesheet.getCell(row, workdayCol);
    cell.reasonbox.close();
    cellSetValue(row, [workdayCol], reasonMultiplier[selected.value]);
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
    var configYear = $("#yearselect")[0].value;
    var configMonth = $("#monthselect")[0].value;
    var configRestday = $("#restdayselect")[0].value;
    var configHalfday = $("#halfdaySelect")[0].value;
}