const configColumns = [
    { readOnly: true },
    { width: 130, type: 'numeric', className: 'required config' },
]

configCells = [
    { row: 0, col: 1, type: "numeric", },
    { row: 1, col: 3, type: "numeric", numericFormat: { pattern: '$ 0,0[.]00' }, className: 'required config' },
    { row: 1, col: 1, type: "numeric", numericFormat: { pattern: '$ 0,0[.]00' }, },
    { row: 2, col: 1, type: "numeric", },
    { row: 3, col: 1, type: "numeric", },
    { row: 3, col: 2, disableVisualSelection: true, },
]

const configSettings = {
    data: configDefaultData,
    comments: true,
    licenseKey: 'non-commercial-and-evaluation',
    columns: configColumns,
    cell: configCells,
    hiddenRows: { rows: [2, 3, 4, 5] },
    afterChange: function(changes, source) {
        if (changes) {
            startMonth = config.getDataAtCell(2, 1);
            startYear = config.getDataAtCell(3, 1);
            row = changes[0][0];
            col = changes[0][1];
            configCalculations();
            if ((row === 2 && col === 1) | (row === 3 && col === 1)) {
                if (source === 'edit') {
                    generateTimeSheet(startMonth, startYear);
                }
            }

        }
    },
}

const configContainer = document.getElementById('config');
const config = new Handsontable(configContainer, configSettings);

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
            if (value == 0.6667) {
                td.innerHTML = '2/3' + cellProperties.suffix;
                return;
            }
            if (value == 0.5) {
                td.innerHTML = '1/2' + cellProperties.suffix;
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
const workdayCol = 9;
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
    'Workday',
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
    { width: 130, type: 'dropdown', source: _.values(dayTypes), allowInvalid: false, }, // type
    { type: 'dropdown', source: _.values(workDayServices), allowInvalid: false, width: 138 }, //service
    { width: 80, type: 'time', timeFormat: 'h:mm a', correctFormat: true, className: 'required' }, // start
    { width: 80, type: 'time', timeFormat: 'h:mm a', correctFormat: true, className: 'required' }, //end
    { readOnly: false, type: 'suffixnumeric', numericFormat: '0[.]0', suffix: ' h', zero: '', className: 'required' }, // break
    { readOnly: true, type: 'suffixnumeric', numericFormat: '0[.]0', suffix: ' h', zero: '' }, // working hrs
    { readOnly: true, type: 'suffixnumeric', numericFormat: '0[.]0', suffix: ' h', zero: '' }, // overtime
    { readOnly: true, type: 'suffixnumeric', numericFormat: '0[.]00', suffix: ' d', zero: '', fraction: true }, // workday
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
    hiddenColumns: { columns: [detailsCol, reasonCol, carryoverCol] },
    beforeChange: function() { spinner(); },
    afterChange: timesheetChange,
    tabMoves: moves,
    enterMoves: moves,
}

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

let notChrome = !/Chrome/.test(navigator.userAgent)
let alertMessage = "Please use Google Chrome to access this site.\nSome key features do not work in other browsers."
if (notChrome) alert(alertMessage)