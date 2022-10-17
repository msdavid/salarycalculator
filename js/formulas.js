const todaysDate = new Date();
const currentYear = todaysDate.getFullYear();
const currentMonth = todaysDate.getMonth() + 1;
const currentDay = todaysDate.getDate();
const daysInAMonth = 31;
const decimals = 2;

const dayWorkingHours = 8;
const halfDayCutOver = 4;
const restdayMultiplierBase = 2.0;
const twothirdMultiplierBase = 0.6667;
const halfdayMultiplierBase = 0.5;
const publicholidayMultiplierBase = 1.0;
const payableMultiplierBase = 1.0;
const overtimeMultiplierBase = 1.5;

Anas = 10;

function getDailyPay(monthly, daysPerWeek) {
    var result = (monthly * 12) / (52 * daysPerWeek);
    return result;
}

function getHourlyPay(monthly) {
    var result = (monthly * 12) / (52 * 44);
    return result;
}

function getOvertimePay(monthly) {
    var result = getHourlyPay(monthly) * overtimeMultiplierBase;
    return result
}

function getRestdayPay(monthly, daysPerWeek) {
    var dailyValue = getDailyPay(monthly, daysPerWeek)
    var result = dailyValue * restdayMultiplierBase;
    return result
}

function getPublicholidayPay(monthly, daysPerWeek) {
    var result = getDailyPay(monthly, daysPerWeek) * publicholidayMultiplierBase;
    return result;
}


const reasonMultiplier = {
    noworkavailable: 1,
    unpaidleave: -0.5,
    notset: 0.5,

}

const reasonTexts = {
    noworkavailable: 'no_work_available_remark',
    unpaidleave: 'unpaid_leave_remark',
    notset: 'reason_not_set_remark',
}

const configDefaultData = [
    ['Days per week (per IPA)', 5.5],
    ['Basic monthly salary (per IPA)', 0],
    ['Time sheet month', currentMonth],
    ['Time sheet year', currentYear],
    ['Rest day', 'Sun'],
    ['Half day', 'Sat'],
];

const dayTypes = {
    payable: 'Work day',
    restday: 'Rest day',
    halfday: 'Half day',
    pholiday: 'P Holiday',
    noemployment: 'No Employment'
};

const workDayServices = {
    worked: 'Worked',
    mcfullpay: 'MC (full pay)',
    noworkavailable: 'No work available',
    paidleave: 'Paid leave',
    unpaidleave: 'Unpaid Leave',
    qarantine: 'Quarantine / SHN',
}

var services = _.clone(workDayServices);
services['notworked'] = 'Not Worked';


const restdayServices = {
    worked: 'Worked',
    notworked: 'Not Worked',
};

function getCfg() {
    var cfg = {
        configYear: parseInt($("#yearselect").val()),
        configMonth: parseInt($("#monthselect").val()),
        configRestday: $("#restdayselect").val(),
        configHalfday: $("#halfdayselect").val(),
        daysPerWeek: $("#daysperweek").val(),
        monthlySalary: $("#monthlysalary").val(),
    }
    return cfg;
}

daysOfTheWeek = {
    'Sun': 'Sunday',
    'Mon': 'Monday',
    'Tue': 'Tuesday',
    'Wed': 'Wednesday',
    'Thu': 'Thursday',
    'Fri': 'Friday',
    'Sat': 'Saturday'
}

monthsOfTheYear = {
    1: 'January',
    2: 'February',
    3: 'March',
    4: 'April',
    5: 'May',
    6: 'June',
    7: 'July',
    8: 'August',
    9: 'September',
    10: 'October',
    11: 'November',
    12: 'December',
}